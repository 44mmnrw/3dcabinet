# Структура JavaScript-модулей проекта 3DCabinet

## 📁 Иерархия файлов

```
public/js/
├── assembler/              # Сборщики сцен (entry points)
│   └── test-assembler.js   # Универсальный assembler для шкафов + оборудование
│
├── cabinets/               # Классы шкафов (по типам)
│   └── TS_700_500_250/     # Термошкаф 700×500×250
│       ├── test_TS_700_500_250.js
│       └── TS_700_500_250.js (legacy)
│
├── equipment/              # Классы оборудования (модульные компоненты)
│   └── circuit_breaker/    # Автоматический выключатель
│       └── circuit_breaker.js
│
├── core/                   # Ядро (менеджеры, основная логика)
│   ├── DragDropController.js       # Контроллер drag & drop для оборудования
│   └── ContextMenuManager.js       # Контекстное меню (ПКМ) для удаления оборудования
│
├── strategies/             # Стратегии монтажа (паттерн Strategy)
│   └── MountingStrategies.js  # DINRailStrategy, RackUnitStrategy, MountingPlateStrategy
│
├── loaders/                # Загрузчики ассетов
│   ├── AssetLoader.js      # Универсальный загрузчик GLB/GLTF (с кешем)
│   └── FreeCADGeometryLoader.js  # Загрузчик из FreeCAD JSON
│
├── utils/                  # Утилиты
│   ├── SceneSetup.js       # Инициализация сцены (камера, свет, renderer)
│   ├── RailHighlighter.js  # Подсветка DIN-реек (dim/bright режимы)
│   ├── ShaderUtils.js      # Хелперы для шейдеров
│   ├── ModelSceneManager.js  # Менеджер сцен для моделей
│   └── progress-animation.js
│
├── libs/                   # Внешние библиотеки (Three.js, etc.)
│   ├── three.module.js
│   ├── OrbitControls.js
│   ├── GLTFLoader.js
│   ├── DRACOLoader.js
│   └── ...
│
├── pages/                  # Контроллеры страниц
│   ├── landing.js
│   └── configurator-freecad.js
│
├── shaders/                # GLSL-шейдеры
│
├── data/                   # ⚠️ УСТАРЕВШИЕ каталоги (миграция на JSON в /assets/)
│   ├── cabinets-catalog.js
│   └── equipment-catalog.js
│
└── debug.js                # Отладочные утилиты
```

---

## 🔄 Граф зависимостей (порядок загрузки)

### **1. Библиотеки (libs/)**
Базовые зависимости, не требующие других модулей:
```
three.module.js → OrbitControls.js, GLTFLoader.js, DRACOLoader.js, ...
```

### **2. Загрузчики (loaders/)**
Зависят только от `libs/`:
```
AssetLoader.js         → three.module.js, GLTFLoader.js, DRACOLoader.js
FreeCADGeometryLoader  → three.module.js
```

### **3. Утилиты (utils/)**
Зависят от `libs/`:
```
SceneSetup.js          → three.module.js, OrbitControls.js
RailHighlighter.js     → three.module.js
ShaderUtils.js         → three.module.js
ModelSceneManager.js   → three.module.js
```

### **4. Стратегии (strategies/)**
Зависят от `libs/`:
```
MountingStrategies.js  → three.module.js
```

### **5. Core модули (core/)**
Зависят от `libs/` и `utils/`:
```
DragDropController.js  → three.module.js, RailHighlighter.js
ContextMenuManager.js  → three.module.js
```

### **6. Классы шкафов (cabinets/)**
Зависят от `loaders/`:
```
test_TS_700_500_250.js → AssetLoader.js, FreeCADGeometryLoader
```

### **7. Классы оборудования (equipment/)**
Зависят от `loaders/`:
```
circuit_breaker.js     → AssetLoader.js
```

### **8. Assembler (assembler/)**
Объединяет всё:
```
test-assembler.js      → SceneSetup, AssetLoader, MountingStrategies, 
                          DragDropController, ContextMenuManager, 
                          cabinets/*, equipment/*
```

---

## 📋 Правила организации

### **Создание нового шкафа**
1. Создать папку `cabinets/<MODEL_NAME>/`
2. Добавить класс `cabinets/<MODEL_NAME>/<MODEL_NAME>.js`
3. Реализовать методы:
   - `async assemble()` — возвращает `THREE.Group`
   - `getComponents()` — возвращает объект с компонентами (`{ dinRail1, dinRail2, body, ... }`)
4. Обновить `/assets/models/cabinets/catalog.json`:
   ```json
   {
     "id": "MODEL_NAME",
     "name": "Отображаемое имя",
     "className": "ModelClassName",
     "modulePath": "../../js/cabinets/MODEL_NAME/ModelClassName.js",
     "mountingType": "din_rail" | "rack_unit" | "mounting_plate",
     "mounting": { ... }
   }
   ```

### **Создание нового оборудования**
1. Создать папку `equipment/<EQUIPMENT_TYPE>/`
2. Добавить класс `equipment/<EQUIPMENT_TYPE>/<EQUIPMENT_TYPE>.js`
3. Создать JSON-конфиг `/assets/models/equipment/<EQUIPMENT_TYPE>/<EQUIPMENT_TYPE>.json`:
   ```json
   {
     "id": "circuit_breaker",
     "name": "Автоматический выключатель",
     "model": "circuit_breaker.glb",
     "dimensions": { "width": 0.018, "height": 0.090, "depth": 0.075 },
     "mounting": {
       "type": "din_rail",
       "anchorPoint": { "offset": [0, 0, 0] }
     }
   }
   ```

### **Добавление новой стратегии монтажа**
1. Открыть `strategies/MountingStrategies.js`
2. Добавить класс, наследующий `MountingStrategy`:
   ```javascript
   export class CustomStrategy extends MountingStrategy {
       mount(equipmentMesh, equipmentConfig, position) {
           // Реализация позиционирования
       }
   }
   ```
3. Обновить фабрику в `CabinetManager.addCabinetById()`:
   ```javascript
   case 'custom_type':
       stored.instance.mountingStrategy = new CustomStrategy(stored.instance, cabinetDef);
       break;
   ```

---

## 🚀 Быстрый старт

### **Запуск тестовой сцены**
```bash
# Запустить Laravel-сервер
php artisan serve

# Открыть в браузере
http://localhost:8000/test-assembler.html
```

### **Консольные команды**
Откройте DevTools (F12) и используйте:
```javascript
// Шкафы
await cabinetManager.getAvailableCabinets()
await cabinetManager.addCabinetById('TS_700_500_250', 'my_cabinet')
cabinetManager.getAllCabinets()

// Оборудование
await equipmentManager.addEquipment('circuit_breaker', 0, 0, 'my_cabinet')
equipmentManager.removeLastEquipment()
equipmentManager.getAllEquipment()

// Отладка
dumpSceneHierarchy(6)  // Печать иерархии сцены ASCII-деревом
```

---

## 🔧 Технические детали

### **Импорты**
Все импорты — **относительные пути** от текущего файла:
```javascript
// ❌ Неправильно (абсолютные пути не работают в браузере без сборщика)
import * as THREE from '/js/libs/three.module.js';

// ✅ Правильно
import * as THREE from '../libs/three.module.js';
```

### **ES6-модули**
Все скрипты загружаются как `type="module"`:
```html
<script type="module" src="js/assembler/test-assembler.js"></script>
```

### **Кеширование**
`AssetLoader` автоматически кеширует загруженные GLB/GLTF:
```javascript
const loader = getAssetLoader();
const model = await loader.load('/assets/models/equipment/circuit_breaker/circuit_breaker.glb', {
    useCache: true,  // Кешировать
    clone: true      // Клонировать при повторной загрузке
});
```

---

## 📦 Соответствие файлам в `/assets/`

| JavaScript класс | JSON-конфиг | GLB-модель |
|-----------------|-------------|------------|
| `cabinets/TS_700_500_250/test_TS_700_500_250.js` | `/assets/models/cabinets/catalog.json` | `/assets/models/cabinets/TS_700_500_250/` |
| `equipment/circuit_breaker/circuit_breaker.js` | `/assets/models/equipment/circuit_breaker/circuit_breaker.json` | `/assets/models/equipment/circuit_breaker/circuit_breaker.glb` |

---

## 🧹 Миграция (TODO)

- [ ] Удалить устаревшую папку `public/js/models/` (уже перемещена в `cabinets/` и `equipment/`)
- [ ] Удалить `public/js/data/` после переноса всех каталогов на JSON в `/assets/`
- [ ] Удалить `public/js/modules/` (уже перемещены в `loaders/`, `utils/`, `strategies/`)
- [ ] Рефакторинг: вынести `CabinetManager` и `EquipmentManager` из `test-assembler.js` в отдельные файлы `core/`

---

## 📚 Документация

- **Стратегии монтажа**: см. `strategies/MountingStrategies.js` (примеры DIN-реек, rack-юнитов, монтажных пластин)
- **Загрузка ассетов**: см. `loaders/AssetLoader.js` (кеш, клонирование, DRACO)
- **Инициализация сцены**: см. `utils/SceneSetup.js` (камера, свет, renderer, controls)

---

**Последнее обновление**: 14.11.2025  
**Автор**: GitHub Copilot + 44mmnrw
