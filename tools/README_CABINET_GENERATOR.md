# 📦 Генератор классов шкафов для 3DCabinet

Автоматический генератор JavaScript-классов шкафов на основе FreeCAD JSON-схем.

---

## 🎯 Что делает генератор

1. **Анализирует папку** с FreeCAD JSON-схемами компонентов
2. **Извлекает размеры** из названия папки (например, `TS_700_500_250` → 700×500×250 мм)
3. **Автоматически определяет компоненты**: читает ВСЕ `.json` файлы в папке (любые названия!)
4. **Генерирует JavaScript-класс** с методом `assemble()` для загрузки найденных компонентов
5. **Создаёт JSON-запись** для `catalog.json` с метаданными
6. **Обновляет каталог** автоматически

**🔥 Универсальность**: Генератор НЕ требует конкретных названий файлов (body, door, panel). Он анализирует ВСЕ JSON-файлы в папке и создаёт код загрузки для каждого найденного компонента.

---

## 📋 Требования

### Система
- **Python 3.7+** (проверка: `python --version`)
- Стандартные библиотеки: `os`, `json`, `re`, `argparse`, `pathlib`

### Структура проекта
```
c:\laragon\www\3dcabinet\
├── tools/
│   └── generate-cabinet-class.py          ← скрипт генератора
├── public/
│   ├── js/
│   │   └── cabinets/
│   │       └── TS_700_500_250/            ← сюда создаётся класс
│   │           └── TS_700_500_250.js
│   └── assets/
│       └── models/
│           ├── freecad/
│           │   └── TS_700_500_250/        ← исходные JSON-схемы (ЛЮБЫЕ названия!)
│           │       ├── body_700_500_250.json
│           │       ├── door_700_500_250.json
│           │       ├── panel_700_500_250.json
│           │       └── din_rail40_700_500_250.json
│           │   
│           │   └── CustomCabinet_1000_600_300/  ← пример с другими названиями
│           │       ├── корпус.json
│           │       ├── крышка.json
│           │       ├── задняя_стенка.json
│           │       └── рейка_монтажная.json
│           │
│           └── cabinets/
│               └── catalog.json           ← обновляется автоматически
```

---

## 🚀 Запуск генератора

### Базовый запуск

**Windows PowerShell** (из корня проекта `c:\laragon\www\3dcabinet\`):
```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250
```

**Git Bash / Linux / macOS**:
```bash
python3 tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250
```

### Параметры запуска

#### `--source` (обязательный)
Путь к папке с FreeCAD JSON-схемами **относительно корня проекта**.

```powershell
# ✅ Правильно (относительный путь от корня):
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400

# ❌ Неправильно (абсолютный путь):
python tools/generate-cabinet-class.py --source c:\laragon\www\3dcabinet\public\assets\models\freecad\TS_1200_800_400
```

#### `--no-catalog` (опционально)
Не обновлять `catalog.json` (только создать JavaScript-класс).

```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250 --no-catalog
```

---

## 📝 Подробная инструкция по использованию

### Шаг 1: Подготовка FreeCAD JSON-схем

Экспортируйте модель шкафа из FreeCAD в JSON-формат и сохраните в папку:

```
public/assets/models/freecad/TS_1200_800_400/
├── body_1200_800_400.json       ← корпус шкафа
├── door_1200_800_400.json       ← дверь
├── panel_1200_800_400.json      ← монтажная панель
└── din_rail40_1200_800_400.json ← DIN-рейка (40мм высота)
```

**🔥 Универсальность**: Названия файлов могут быть **ЛЮБЫМИ**! Генератор автоматически найдёт все `.json` файлы:

```
public/assets/models/freecad/CustomCabinet_1000_600_300/
├── корпус.json
├── дверь.json
├── задняя_панель.json
├── рейка1.json
└── рейка2.json
```

**Важно!** Название папки **должно содержать размеры** в формате `*_WIDTH_HEIGHT_DEPTH`:
- `TS_700_500_250` → ширина 700 мм, высота 500 мм, глубина 250 мм
- `CustomCabinet_1200_800_400` → 1200×800×400 мм
- `MyCabinet_1000_600_300` → 1000×600×300 мм

### Шаг 2: Запуск генератора

Откройте PowerShell в корне проекта (`c:\laragon\www\3dcabinet\`):

```powershell
# Перейти в корень проекта
cd c:\laragon\www\3dcabinet

# Запустить генератор
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400
```

**Вывод в консоль:**
```
🔍 Анализ папки: c:\laragon\www\3dcabinet\public\assets\models\freecad\TS_1200_800_400
📏 Размеры: 1200×800×400 мм
📦 Найдено компонентов: 4
   - body_1200_800_400.json → this.components.body
   - din_rail40_1200_800_400.json → this.components.din_rail40
   - door_1200_800_400.json → this.components.door
   - panel_1200_800_400.json → this.components.panel
✅ Создан класс: public\js\cabinets\TS_1200_800_400\TS_1200_800_400.js
✅ Обновлён каталог: public\assets\models\cabinets\catalog.json

🎉 Генерация завершена успешно!

💡 Для использования в коде:
   await cabinetManager.addCabinetById('TS_1200_800_400');
```

### Шаг 3: Проверка результата

**Созданный класс:** `public/js/cabinets/TS_1200_800_400/TS_1200_800_400.js`

```javascript
import * as THREE from '../../libs/three.module.js';
import { FreeCADGeometryLoader } from '../../loaders/FreeCADGeometryLoader.js';

/**
 * Класс шкафа TS_1200_800_400
 * Автоматически сгенерирован из FreeCAD JSON-схем
 * Размеры: 1200×800×400 мм
 * Компоненты: body, din_rail40, door, panel
 */
export class TS_1200_800_400 {
    constructor() {
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.components = {};
    }

    async assemble(options = {}) {
        const basePath = options.basePath || './assets/models/freecad';
        
        // BODY (body_1200_800_400.json)
        this.components.body = await this.loader.load(`${basePath}/TS_1200_800_400/body_1200_800_400.json`);
        this.components.body.name = 'body';
        this.components.body.scale.set(0.001, 0.001, 0.001);
        this.components.body.position.set(0, 0, 0);
        this.assembly.add(this.components.body);

        // DIN_RAIL40 (din_rail40_1200_800_400.json)
        this.components.din_rail40 = await this.loader.load(`${basePath}/TS_1200_800_400/din_rail40_1200_800_400.json`);
        this.components.din_rail40.name = 'din_rail40';
        // ... (и так для всех компонентов)
        
        this._alignAssemblyToFloor();
        console.log('✅ Шкаф TS_1200_800_400 собран успешно');
        console.log('📦 Компоненты:', Object.keys(this.components));
        return this.assembly;
    }

    // ... (методы управления)
}
```

**Обновлённый каталог:** `public/assets/models/cabinets/catalog.json`

```json
{
  "cabinets": [
    {
      "id": "TS_1200_800_400",
      "name": "Шкаф TS 1200 800 400",
      "className": "TS_1200_800_400",
      "modulePath": "../cabinets/TS_1200_800_400/TS_1200_800_400.js",
      "dimensions": {
        "width": 1200,
        "height": 800,
        "depth": 400
      },
      "mountingType": "din_rail",
      "description": "Шкаф 1200×800×400 мм (автоматически сгенерирован)"
    }
  ]
}
```

### Шаг 4: Использование в коде

```javascript
// В Assembler.js или другом коде
await cabinetManager.addCabinetById('TS_1200_800_400');
```

---

## 🔧 Примеры использования

### Пример 1: Стандартная генерация

```powershell
cd c:\laragon\www\3dcabinet
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250
```

**Результат:**
- Создан класс `TS_700_500_250.js` с компонентами: body, door, panel, din_rail40
- Обновлён `catalog.json`

---

### Пример 2: Шкаф с произвольными названиями компонентов

```powershell
# Папка: public/assets/models/freecad/CustomBox_1000_600_300/
#   ├── корпус.json
#   ├── крышка.json
#   └── задняя_стенка.json

python tools/generate-cabinet-class.py --source public/assets/models/freecad/CustomBox_1000_600_300
```

**Результат:**
- Класс с компонентами: `this.components.корпус`, `this.components.крышка`, `this.components.задняя_стенка`
- Все найденные JSON автоматически загружаются

---

### Пример 3: Только создать класс (без каталога)

```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250 --no-catalog
```

**Результат:**
- Создан только `TS_700_500_250.js`
- `catalog.json` **не изменён**

---

## 🛠️ Формат путей в Windows PowerShell

### ✅ Правильные пути (относительные от корня проекта)

```powershell
# Формат с прямыми слешами (кроссплатформенный)
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250

# Формат с обратными слешами (Windows)
python tools/generate-cabinet-class.py --source public\assets\models\freecad\TS_700_500_250

# Оба варианта работают одинаково
```

### ❌ Неправильные пути

```powershell
# Абсолютный путь (не используйте!)
python tools/generate-cabinet-class.py --source c:\laragon\www\3dcabinet\public\assets\models\freecad\TS_700_500_250

# Путь от tools/ (неправильная точка отсчёта)
python tools/generate-cabinet-class.py --source ../public/assets/models/freecad/TS_700_500_250
```

### 📍 Как правильно запускать

**Всегда запускайте из корня проекта:**

```powershell
# 1. Перейти в корень (если не там)
cd c:\laragon\www\3dcabinet

# 2. Проверить текущую директорию
pwd
# Вывод: c:\laragon\www\3dcabinet

# 3. Запустить генератор с относительным путём
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250
```

---

## 📐 Как работает анализ компонентов

### Алгоритм определения компонентов

Генератор сканирует папку и извлекает название компонента из имени файла:

```python
# Примеры парсинга:
body_700_500_250.json          → var_name: "body"
din_rail40_700_500_250.json    → var_name: "din_rail40"
door_700_500_250.json          → var_name: "door"
корпус.json                    → var_name: "корпус"
задняя_стенка.json             → var_name: "задняя_стенка"
mounting-panel.json            → var_name: "mounting_panel" (дефис → underscore)
```

### Regex-паттерн

```python
match = re.match(r'^([a-zA-Z_а-яА-Я]+\d*)', filename)
# Захватывает: буквы (латиница + кириллица) + подчёркивания + опциональные цифры
```

### Примеры структур шкафов

**Стандартный шкаф:**
```
TS_700_500_250/
├── body_700_500_250.json       → this.components.body
├── door_700_500_250.json       → this.components.door
├── panel_700_500_250.json      → this.components.panel
└── din_rail40_700_500_250.json → this.components.din_rail40
```

**Минималистичный шкаф:**
```
SmallBox_300_200_150/
├── корпус.json    → this.components.корпус
└── крышка.json    → this.components.крышка
```

**Сложный шкаф с множеством элементов:**
```
ComplexCabinet_1500_1000_600/
├── body.json
├── door_left.json
├── door_right.json
├── mounting_plate.json
├── din_rail1.json
├── din_rail2.json
├── din_rail3.json
├── back_panel.json
└── cooling_grille.json

→ 9 компонентов автоматически загружаются
```

---

## 🔍 Проверка компонентов

Генератор автоматически сканирует папку и показывает найденные компоненты:

```
✅ Найдены компоненты:
   - body_700_500_250.json → this.components.body
   - door_700_500_250.json → this.components.door
   - panel_700_500_250.json → this.components.panel
   - din_rail40_700_500_250.json → this.components.din_rail40

❌ В папке не найдено ни одного JSON-файла компонента
   (генерация прервана)
```

**Что считается компонентом:**
- Любой файл с расширением `.json` в папке
- Имя файла начинается с букв (латиница/кириллица) или `_`
- Генератор НЕ требует конкретных названий (body, door, panel и т.д.)

**Специальные случаи:**
- `mounting-panel.json` → `this.components.mounting_panel` (дефис заменяется на `_`)
- `корпус.json` → `this.components.корпус` (кириллица поддерживается)
- `din_rail40.json` → `this.components.din_rail40` (цифры в конце разрешены)

---

## ⚠️ Частые ошибки и решения

### Ошибка 1: `❌ Ошибка: Папка '...' не найдена`

**Причина:** Неправильный путь к папке.

**Решение:**
```powershell
# Проверьте, существует ли папка:
ls public\assets\models\freecad\TS_700_500_250

# Если нет, создайте или укажите правильный путь
```

---

### Ошибка 2: `❌ Не удалось извлечь размеры из названия 'CustomCabinet'`

**Причина:** Название папки не содержит размеры в формате `TS_WIDTH_HEIGHT_DEPTH`.

**Решение:**
```powershell
# Переименуйте папку в правильный формат:
Rename-Item public\assets\models\freecad\CustomCabinet TS_1000_600_300
```

---

### Ошибка 3: `❌ В папке не найдено ни одного JSON-файла компонента`

**Причина:** Папка пустая или содержит только не-JSON файлы.

**Решение:**
```powershell
# Проверьте содержимое:
ls public\assets\models\freecad\TS_700_500_250\*.json

# Должны быть хотя бы 1-2 JSON-файла компонентов
```

---

### Ошибка 4: `python: команда не найдена`

**Причина:** Python не установлен или не добавлен в PATH.

**Решение:**
```powershell
# Проверьте установку:
python --version

# Если не работает, попробуйте:
python3 --version

# Или переустановите Python с галочкой "Add to PATH"
```

---

## 🧪 Тестирование сгенерированного класса

После генерации протестируйте класс:

```javascript
// В Assembler.js
import { TS_1200_800_400 } from './cabinets/TS_1200_800_400/TS_1200_800_400.js';

const cabinet = new TS_1200_800_400();
const assembly = await cabinet.assemble();

scene.add(assembly);

// Открыть дверь на 90°
cabinet.setDoorRotation(Math.PI / 2);

// Проверить информацию
console.log(cabinet.getInfo());
```

---

## 📚 Справочная информация

### Структура сгенерированного класса

```javascript
export class TS_700_500_250 {
    // ========== Конструктор ==========
    constructor()  // Инициализация loader и assembly

    // ========== Основной метод ==========
    async assemble(options)  // Загрузка ВСЕХ найденных JSON компонентов

    // ========== Управление компонентами ==========
    setComponentPosition(name, x, y, z)
    getComponentPosition(name)
    getComponentWorldPosition(name)
    setComponentVisibility(name, visible)

    // ========== Утилиты ==========
    setAssemblyPosition(x, y, z)   // Переместить шкаф
    getInfo()                      // Информация о компонентах
    getComponents()                // Все компоненты
    getAssembly()                  // Корневая Group

    // ========== Внутренние методы ==========
    _alignAssemblyToFloor()        // Выравнивание по нижней грани
}
```

### Пример использования компонентов

```javascript
const cabinet = new TS_700_500_250();
await cabinet.assemble();

// Скрыть компонент
cabinet.setComponentVisibility('door', false);

// Переместить компонент
cabinet.setComponentPosition('panel', 0.1, 0.2, 0.05);

// Получить все компоненты
console.log(cabinet.getComponents());
// { body: Group, door: Group, panel: Group, din_rail40: Group, ... }
```

---

## 🔗 Связанная документация

- **`docs/configurator/JS_ARCHITECTURE_DIAGRAM.md`** — архитектура движка
- **`docs/MODEL_STRUCTURE.md`** — структура моделей FreeCAD
- **`docs/EQUIPMENT_LOADING_ARCHITECTURE.md`** — загрузка оборудования
- **`public/js/cabinets/TS_700_500_250/test_TS_700_500_250.js`** — пример класса

---

## 📞 Помощь и поддержка

Если столкнулись с проблемой:

1. **Проверьте пути** — используйте относительные пути от корня проекта
2. **Проверьте формат папки** — должно быть `TS_WIDTH_HEIGHT_DEPTH`
3. **Проверьте наличие JSON** — все 4 компонента должны быть в папке
4. **Посмотрите вывод** — генератор показывает подробные сообщения об ошибках

---

**Дата создания:** 15 ноября 2025  
**Версия:** 1.0.0  
**Автор:** 3DCabinet Team
