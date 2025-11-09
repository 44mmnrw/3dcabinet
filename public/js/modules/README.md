# 3D Конфигуратор шкафов — Документация

## Обзор архитектуры

Модульная система для интерактивной 3D-визуализации и конфигурации серверных шкафов с использованием Three.js.

### Структура файлов

```
public/js/
├── configurator.js                 # Главный модуль приложения
├── modules/
│   ├── SceneManager.js            # Управление 3D-сценой (комната, освещение, камера)
│   ├── CabinetModel.js            # Класс модели шкафа (GLTF, дверцы, оборудование)
│   ├── CabinetManager.js          # Менеджер коллекции шкафов (collision, snap-to-grid)
│   └── InteractionController.js   # Управление взаимодействием (клики, drag&drop)
├── three.module.js                # Three.js r167
├── OrbitControls.js               # Управление камерой
└── GLTFLoader.js                  # Загрузчик GLTF-моделей
```

## Основные компоненты

### 1. SceneManager

**Отвечает за:**
- Инициализация WebGL-рендерера и сцены
- Создание упрощённой комнаты (пол-сетка, стены-линии)
- Настройка освещения (ambient + directional lights)
- Управление камерой (PerspectiveCamera + OrbitControls)
- Анимационный цикл

**Параметры комнаты:**
- Ширина: 5000 мм
- Высота: 3000 мм
- Глубина: 4000 мм

**API:**
```javascript
sceneManager.addToScene(object);       // Добавить объект
sceneManager.removeFromScene(object);  // Удалить объект
sceneManager.dispose();                // Очистить ресурсы
```

---

### 2. CabinetModel

**Отвечает за:**
- Загрузку GLTF-модели шкафа
- Определение типа: `floor` (напольный) или `wall` (подвесной)
- Анимированное открытие/закрытие дверцы
- Изменение цвета и текстур
- Управление оборудованием на DIN-рейках

**Конфигурация:**
```javascript
const cabinet = new CabinetModel(modelPath, {
    type: 'floor',         // 'floor' или 'wall'
    width: 700,            // мм
    height: 500,           // мм
    depth: 240,            // мм
    name: 'TSH 700x500',
    color: 0xe0e0e0        // HEX цвет
});
```

**API:**
```javascript
await cabinet.loadPromise;              // Дождаться загрузки модели
cabinet.setPosition(new THREE.Vector3(x, y, z));
cabinet.setRotation(angleRadians);
cabinet.setColor(0xff0000);             // Изменить цвет
cabinet.setTexture('/path/to/texture.jpg');
cabinet.toggleDoor(animate = true);     // Открыть/закрыть дверцу
cabinet.addEquipment(model, railIndex); // Добавить оборудование на DIN-рейку
cabinet.setSelected(true);              // Визуально выделить
cabinet.getBoundingBox();               // Получить AABB
```

**Структура GLTF-модели:**

Для корректной работы модель должна содержать:
- Объект с именем `door` / `Door` / `дверь` — дверца
- Объекты с именем `din` / `rail` / `DIN_Rail` — DIN-рейки для оборудования

---

### 3. CabinetManager

**Отвечает за:**
- Управление коллекцией шкафов на сцене
- Collision detection (проверка пересечений)
- Snap-to-grid (примагничивание к сетке 100×100 мм)
- Snap-to-nearby (примагничивание к соседним шкафам)
- Автоматический поиск свободного места

**Параметры:**
```javascript
snapDistance: 50,   // мм — расстояние для примагничивания к соседним объектам
gridSize: 100       // мм — размер сетки выравнивания
```

**API:**
```javascript
await cabinetManager.addCabinet(cabinetModel);    // Добавить шкаф (с автопозиционированием)
cabinetManager.removeCabinet(cabinetId);          // Удалить шкаф
cabinetManager.selectCabinet(cabinetId);          // Выбрать шкаф
cabinetManager.deselectAll();                     // Снять выбор
cabinetManager.moveCabinet(id, newPosition);      // Переместить (с collision check)
cabinetManager.rotateCabinet(id, angle);          // Повернуть
cabinetManager.getAllCabinets();                  // Список всех шкафов
cabinetManager.getCabinetById(id);                // Получить шкаф по ID
cabinetManager.clear();                           // Удалить все шкафы
```

**Алгоритм автопозиционирования:**

1. **Напольные шкафы:**
   - Центр комнаты (если первый)
   - Справа от последнего шкафа (с отступом `snapDistance`)
   - Если коллизия → следующий ряд (+500мм по Z)
   - Если снова коллизия → спиральный перебор (до 100 попыток)

2. **Подвесные шкафы:**
   - Задняя стена (Z = -roomDepth/2 + depth/2 + 10мм)
   - Высота 1500 мм от пола
   - Справа от последнего подвесного (с отступом)

3. **Финальная обработка:**
   - Snap-to-grid (округление до 100 мм)
   - Snap-to-nearby (примагничивание к соседним в радиусе `snapDistance`)

---

### 4. InteractionController

**Отвечает за:**
- Обработку событий мыши (click, dblclick, drag)
- Raycasting для выбора объектов
- Drag&drop шкафов (Shift + MouseDown)
- Горячие клавиши

**События мыши:**
- **Click** → выбор шкафа
- **Double Click** → открыть/закрыть дверцу
- **Shift + MouseDown** → начать перетаскивание
- **MouseMove** (при drag) → перемещение с проверкой коллизий
- **MouseUp** → завершить перетаскивание

**Горячие клавиши:**
- **R** — повернуть выбранный шкаф на 90°
- **O** — открыть/закрыть дверцу
- **Delete / Backspace** — удалить выбранный шкаф
- **Escape** — снять выбор

**API:**
```javascript
interactionController.onCabinetSelected = (cabinetId) => { /* ... */ };
interactionController.onCabinetDeselected = () => { /* ... */ };
```

---

## Главное приложение (configurator.js)

### Инициализация

```javascript
const configurator = new CabinetConfigurator('#cabinet-3d-container');
```

### Публичный API (доступен через `window.configurator`)

```javascript
// Добавить шкаф
await configurator.addCabinet('floor');   // Напольный
await configurator.addCabinet('wall');    // Подвесной

// Удалить шкаф
configurator.removeCabinet(cabinetId);

// Получить список шкафов
const cabinets = configurator.getCabinets();

// Открыть/закрыть дверцу
configurator.toggleDoor(cabinetId);

// Повернуть шкаф
configurator.rotateCabinet(cabinetId);

// Изменить цвет
configurator.changeCabinetColor(cabinetId, '#ff0000');
```

### Callback-методы

При выборе шкафа автоматически обновляется правая панель (#cabinet-parameters) с:
- Название и ID шкафа
- Тип (напольный/подвесной)
- Размеры
- Состояние дверцы
- Количество оборудования
- Кнопки управления (открыть/закрыть, повернуть, удалить)
- Color picker для изменения цвета

---

## Использование

### 1. Подключение в Blade-шаблоне

```php
@push('scripts')
    <script type="module" src="{{ asset('js/configurator.js') }}"></script>
@endpush
```

### 2. HTML-контейнер

```html
<div id="cabinet-3d-container">
    <!-- 3D-сцена отрендерится здесь -->
</div>
```

### 3. Добавление шкафа из консоли

```javascript
// Напольный шкаф
await configurator.addCabinet('floor');

// Подвесной шкаф
await configurator.addCabinet('wall');
```

### 4. Управление через UI

- **Выбор:** клик по шкафу → появится фиолетовая рамка
- **Перемещение:** Shift + зажать левую кнопку мыши → перетащить
- **Открытие дверцы:** двойной клик ИЛИ кнопка "Открыть дверцу" в правой панели
- **Поворот:** клавиша R ИЛИ кнопка "Повернуть 90°"
- **Удаление:** Delete ИЛИ кнопка "Удалить"
- **Цвет:** Color picker в правой панели

---

## Требования к GLTF-моделям

### Обязательные объекты

1. **Дверца** — объект с именем `door`, `Door`, `DOOR`, `дверь`, `Дверь`
   - Точка вращения (pivot) должна быть на вертикальной оси петель
   - Анимация: rotation.y от 0 до Math.PI/2 (90°)

2. **DIN-рейки** (опционально) — объекты с именем `din`, `rail`, `DIN_Rail`
   - Mesh-объекты, на которые будет устанавливаться оборудование
   - Позиция определяет место монтажа

### Рекомендуемая структура

```
Cabinet_Root
├── Body (корпус)
│   ├── FrontPanel
│   ├── BackPanel
│   ├── LeftSide
│   └── RightSide
├── Door (дверца)
├── DIN_Rail_1 (рейка 1)
├── DIN_Rail_2 (рейка 2)
└── ...
```

### Масштаб

- **Единицы измерения:** миллиметры (мм)
- Модель должна быть в реальном масштабе (700×500×240 мм = 700×500×240 единиц в Blender/FreeCAD)

### Материалы

- Все mesh-объекты должны иметь материал (MeshStandardMaterial в Three.js)
- Для корпуса: `color`, `metalness`, `roughness`
- Для дверцы: отдельный материал (не будет менять цвет при `setColor()`)

---

## Расширение функционала

### Добавление нового типа оборудования

1. Создать класс `EquipmentModel` (аналогично `CabinetModel`)
2. Добавить в `CabinetModel.addEquipment(equipmentModel, railIndex)`
3. Реализовать drag&drop из каталога оборудования

### Добавление текстур

```javascript
const cabinet = configurator.getCabinets()[0];
cabinet.setTexture('/assets/textures/metal.jpg');
```

### Сохранение конфигурации

```javascript
const config = {
    cabinets: configurator.getCabinets().map(cab => ({
        id: cab.id,
        type: cab.config.type,
        position: cab.position.toArray(),
        rotation: cab.rotation,
        color: cab.config.color,
        doorOpen: cab.isDoorOpen,
        equipment: cab.equipment.map(eq => ({ /* ... */ }))
    }))
};

// Отправить на сервер
fetch('/api/configurations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
});
```

---

## Производительность

### Оптимизация

- **Shadows:** включены только для основного directional light
- **Shadow map size:** 2048×2048 (баланс качество/производительность)
- **DevicePixelRatio:** ограничен до 2 (не 3+ для Retina дисплеев)
- **Frustum culling:** автоматически (Three.js)
- **Geometry instancing:** не используется (для небольшого количества шкафов не критично)

### Рекомендации

- Не добавлять более 20-30 шкафов на сцену (иначе FPS упадёт)
- Для больших конфигураций: отключить тени (`renderer.shadowMap.enabled = false`)
- Использовать LOD (Level of Detail) для дальних объектов

---

## Отладка

### Консольные команды

```javascript
// Список всех шкафов
configurator.getCabinets();

// Выбрать шкаф по индексу
const cabinet = configurator.getCabinets()[0];

// Позиция шкафа
cabinet.model.position;

// Открыть дверцу
cabinet.toggleDoor(true);

// Получить bounding box
cabinet.getBoundingBox();
```

### Визуальная отладка

Раскомментировать в `SceneManager.js`:
```javascript
const axesHelper = new THREE.AxesHelper(1000);
this.scene.add(axesHelper);
```

---

## Известные ограничения

1. **Collision detection:** использует AABB (axis-aligned bounding box), не учитывает поворот геометрии
2. **Snap-to-grid:** работает только для X и Z, не для Y
3. **Drag&drop:** работает только на плоскости пола (Y=0 для напольных)
4. **GLTF-анимации:** не поддерживаются (только кастомная анимация дверцы)
5. **Материалы:** `setColor()` меняет цвет всех mesh, кроме дверцы и реек

---

## Лицензия

Собственная разработка для проекта 3Cabinet.
