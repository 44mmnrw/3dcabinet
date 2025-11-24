# 📦 Инструкция по использованию генератора классов шкафов

## 🎯 Что делает генератор

Генератор автоматически создаёт JavaScript-класс шкафа на основе FreeCAD JSON-схем компонентов:

1. **Анализирует папку** с FreeCAD JSON-схемами компонентов
2. **Вычисляет размеры** из геометрии компонентов (vertices в JSON)
3. **Автоматически определяет компоненты**: читает ВСЕ `.json` файлы в папке
4. **Генерирует JavaScript-класс** с методом `assemble()` для загрузки компонентов
5. **Создаёт конфиг-файл** `config.js` с позициями компонентов
6. **Обновляет каталог** `catalog.json` автоматически

**🔥 Универсальность**: Генератор НЕ требует конкретных названий файлов. Он анализирует ВСЕ JSON-файлы в папке и создаёт код загрузки для каждого найденного компонента.

---

## 📋 Требования

### Система
- **Python 3.7+** (проверка: `python --version` или `python3 --version`)
- Стандартные библиотеки Python (встроены)

### Структура проекта

```
c:\laragon\www\3dcabinet\
├── tools/
│   └── generate-cabinet-class.py          ← скрипт генератора
├── resources/
│   └── frontend/
│       └── three/
│           └── cabinets/                  ← сюда создаётся класс
│               └── {class_name}/
│                   ├── {class_name}.js
│                   └── config.js
└── public/
    └── assets/
        └── models/
            ├── freecad/                   ← исходные JSON-схемы
            │   └── {folder_name}/
            │       ├── body.json
            │       ├── door.json
            │       ├── panel.json
            │       └── din_rail.json
            └── cabinets/
                └── catalog.json           ← обновляется автоматически
```

---

## 🚀 Использование

### Шаг 1: Подготовка исходных данных

1. **Создайте папку** с JSON-схемами компонентов в `public/assets/models/freecad/`:
   ```
   public/assets/models/freecad/TS_1200_800_400/
   ├── body_1200_800_400.json
   ├── door_1200_800_400.json
   ├── panel_1200_800_400.json
   └── din_rail40_1200_800_400.json
   ```

   **Важно**: 
   - Название папки может быть любым (не обязательно с размерами)
   - Названия JSON-файлов могут быть любыми
   - Размеры шкафа вычисляются автоматически из `vertices` в JSON-файлах

### Шаг 2: Запуск генератора

**Windows PowerShell** (из корня проекта `c:\laragon\www\3dcabinet\`):

```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400
```

**Git Bash / Linux / macOS**:

```bash
python3 tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400
```

### Шаг 3: Результат

После успешного выполнения генератор создаст:

1. **Класс шкафа**: `resources/frontend/three/cabinets/TS_1200_800_400/TS_1200_800_400.js`
2. **Конфиг**: `resources/frontend/three/cabinets/TS_1200_800_400/config.js`
3. **Обновлённый каталог**: `public/assets/models/cabinets/catalog.json`

---

## 📝 Параметры запуска

### `--source` (обязательный)

Путь к папке с FreeCAD JSON-схемами **относительно корня проекта**.

```powershell
# ✅ Правильно (относительный путь):
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400

# ❌ Неправильно (абсолютный путь):
python tools/generate-cabinet-class.py --source c:\laragon\www\3dcabinet\public\assets\models\freecad\TS_1200_800_400
```

### `--no-catalog` (опционально)

Не обновлять `catalog.json` (только создать JavaScript-класс и конфиг).

```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400 --no-catalog
```

---

## 🔧 После генерации

### 1. Настройка позиций компонентов

Отредактируйте `config.js` для точной настройки позиций компонентов:

```javascript
export const config = {
  "name": "TS_1200_800_400",
  "components": {
    "body_1200_800_400": {
      "file": "body_1200_800_400.json",
      "scale": [0.001, 0.001, 0.001],
      "position": [0, 0, 0]  // ← Настройте позицию
    }
  },
  "rails": [
    {
      "id": "din_rail40_1200_800_400_1",
      "file": "din_rail40_1200_800_400.json",
      "scale": [0.001, 0.001, 0.001],
      "position": [0.15, 0, -0.056],      // ← Позиция первой рейки
      "rotation": [0, 0, 0]
    },
    {
      "id": "din_rail40_1200_800_400_2",
      "file": "din_rail40_1200_800_400.json",
      "position": [0.15, -0.2, -0.056],  // ← Позиция второй рейки (Y смещён на -0.2 м)
      "rotation": [0, 0, 0]
    }
  ],
  "door": {
    "componentName": "door_1200_800_400",
    "pivotOffset": {
      "x": -0.093,  // ← Настройте точку вращения двери
      "y": 0.0,
      "z": 0.172
    },
    "rotationAxis": "y"
  }
};
```

### 2. Настройка двери

В `config.js` настройте параметры двери:
- `componentName` - имя компонента двери (должно совпадать с ключом в `components`)
- `pivotOffset` - точка вращения двери (в метрах)
- `rotationAxis` - ось вращения (`'x'`, `'y'` или `'z'`)

### 3. Использование в коде

После генерации шкаф можно использовать:

```javascript
import { TS_1200_800_400 } from './cabinets/TS_1200_800_400/TS_1200_800_400.js';

const cabinet = new TS_1200_800_400();
const assembly = await cabinet.assemble();
```

---

## 📊 Примеры использования

### Пример 1: Базовый запуск

```powershell
# Генерация шкафа TS_700_500_250
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250
```

**Результат**:
- Класс: `resources/frontend/three/cabinets/TS_700_500_250/TS_700_500_250.js`
- Конфиг: `resources/frontend/three/cabinets/TS_700_500_250/config.js`
- Каталог обновлён

### Пример 2: Без обновления каталога

```powershell
# Только создать класс, не обновлять каталог
python tools/generate-cabinet-class.py --source public/assets/models/freecad/MyCustomCabinet --no-catalog
```

### Пример 3: Шкаф с произвольными названиями файлов

Структура папки:
```
public/assets/models/freecad/CustomCabinet/
├── корпус.json
├── крышка.json
├── задняя_стенка.json
└── рейка_монтажная.json
```

Запуск:
```powershell
python tools/generate-cabinet-class.py --source public/assets/models/freecad/CustomCabinet
```

Генератор автоматически:
- Определит все JSON-файлы
- Создаст переменные: `корпус`, `крышка`, `задняя_стенка`, `рейка_монтажная`
- Вычислит размеры из геометрии

---

## ⚠️ Важные замечания

1. **Размеры вычисляются автоматически** из `vertices` в JSON-файлах (FreeCAD экспортирует в метрах, генератор переводит в миллиметры)

2. **Название папки** используется как имя класса. Используйте валидные имена для JavaScript (без пробелов, спецсимволов)

3. **Рейки (rails)** автоматически определяются по ключевым словам `din` или `rail` в имени файла

4. **Дверь** автоматически определяется по ключевому слову `door` в имени файла, но можно настроить вручную в `config.js`

5. **Импорты** в сгенерированном классе используют TypeScript-расширения (`.ts`), но файл создаётся как `.js` для совместимости

---

## 🐛 Решение проблем

### Ошибка: "Папка не найдена"

Убедитесь, что путь указан **относительно корня проекта**:
```powershell
# ✅ Правильно
python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250

# ❌ Неправильно
python tools/generate-cabinet-class.py --source ./public/assets/models/freecad/TS_700_500_250
```

### Ошибка: "В папке не найдено ни одного JSON-файла"

Проверьте, что в папке есть файлы с расширением `.json`:
```powershell
# Проверка содержимого папки
ls public/assets/models/freecad/TS_700_500_250/
```

### Размеры шкафа = 0×0×0 мм

Проверьте, что JSON-файлы содержат поле `vertices` с геометрией:
```json
{
  "vertices": [0, 0, 0, 1, 0, 0, ...]
}
```

---

## 📚 Дополнительная информация

- **Исходный код генератора**: `tools/generate-cabinet-class.py`
- **Базовый класс**: `resources/frontend/three/cabinets/CabinetBase.ts`
- **Пример шкафа**: `resources/frontend/three/cabinets/tsh_700_500_250/`
- **Каталог шкафов**: `public/assets/models/cabinets/catalog.json`

---

## 💡 Советы

1. **Именование папок**: Используйте понятные имена, например `TS_700_500_250` или `ThermalCabinet_1200_800_400`

2. **Проверка результата**: После генерации откройте созданный класс и проверьте импорты

3. **Настройка реек**: Если реек несколько, отредактируйте `config.js` и добавьте нужное количество записей в массив `rails`

4. **Тестирование**: После генерации протестируйте загрузку шкафа в приложении

---

**Автор**: 3DCabinet Team  
**Дата**: 2025-11-16  
**Версия**: 2.0.0 (обновлено под новую структуру проекта)

> 📌 **Версионирование**: См. [`VERSIONING.md`](./VERSIONING.md) для информации о системе версионирования проекта.

