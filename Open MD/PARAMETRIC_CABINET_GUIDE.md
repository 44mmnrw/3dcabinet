# 📐 Инструкция: Создание параметрической модели шкафа 42U в FreeCAD

## Содержание

1. [Введение](#1-введение)
2. [Структура параметрической модели](#2-структура-параметрической-модели)
3. [Подготовка FreeCAD](#3-подготовка-freecad)
4. [Создание базовых параметров](#4-создание-базовых-параметров)
5. [Создание корпуса шкафа](#5-создание-корпуса-шкафа)
6. [Добавление отверстий](#6-добавление-отверстий)
7. [Добавление крепежа](#7-добавление-крепежа)
8. [Тестирование масштабирования](#8-тестирование-масштабирования)
9. [Экспорт для Three.js](#9-экспорт-для-threejs)
10. [Загрузка в браузере](#10-загрузка-в-браузере)

---

## 1. Введение

### Что такое параметрическая модель?

Параметрическая модель — это модель, где размеры и позиции определяются **формулами**, а не фиксированными числами.

```
ОБЫЧНАЯ МОДЕЛЬ:                 ПАРАМЕТРИЧЕСКАЯ МОДЕЛЬ:
═══════════════                 ════════════════════════
Высота = 1866.9 мм              Высота = units × 44.45
Отверстие на Y = 1800 мм        Отверстие на Y = height - 50
Болт на Y = 1816.9 мм           Болт на Y = height - 50
```

### Почему это важно для шкафа?

| Проблема обычной модели | Решение параметрической |
|-------------------------|------------------------|
| При масштабировании отверстия растягиваются | Отверстия пересчитываются по формуле |
| Болты меняют размер | Болты остаются M8 (фиксированный размер) |
| Позиции крепежа съезжают | Позиции вычисляются относительно краёв |

### Стандарт 19" Rack

```
1U = 44.45 мм (1.75 дюйма)

Типичные размеры:
• 42U = 1866.9 мм (высота)
• 27U = 1200.15 мм
• 12U = 533.4 мм

Ширина стойки: 482.6 мм (19")
```

---

## 2. Структура параметрической модели

### Иерархия компонентов

```
📦 Cabinet_42U (Part Container)
│
├── 📊 Spreadsheet (параметры)
│   ├── units = 42
│   ├── height = units * 44.45
│   ├── width = 600
│   ├── depth = 800
│   └── ...
│
├── 📁 Scalable_Parts (масштабируются)
│   ├── Body_Left [SCALE]
│   ├── Body_Right [SCALE]
│   ├── Body_Back [SCALE]
│   └── Rails [SCALE]
│
├── 📁 Movable_Parts (перемещаются, не масштабируются)
│   ├── Top_Panel [FIXED_POS]
│   ├── Bottom_Panel [FIXED_POS]
│   ├── Hole_Top [FIXED_POS]
│   └── Hole_Bottom [FIXED_POS]
│
├── 📁 Fixed_Hardware (не меняются)
│   ├── Bolt_M8_01 [FIXED]
│   ├── Bolt_M8_02 [FIXED]
│   ├── Nut_M8_01 [FIXED]
│   ├── Washer_01 [FIXED]
│   └── Ground_Stud [FIXED]
│
└── 📁 Doors_Panels (высота масштабируется)
    ├── Door_Front [DOOR]
    └── Panel_Side [PANEL]
```

### Теги компонентов

| Тег | Поведение | Пример |
|-----|-----------|--------|
| `[SCALE]` | Масштабируется полностью | Боковые стенки |
| `[FIXED]` | Не меняется вообще | Болты, гайки |
| `[FIXED_POS]` | Не масштабируется, но перемещается | Замки, отверстия |
| `[DOOR]` | Масштабируется только по высоте | Дверь |
| `[PANEL]` | Масштабируется только по высоте | Боковые панели |

---

## 3. Подготовка FreeCAD

### 3.1 Создание нового документа

1. Откройте FreeCAD
2. **File → New**
3. **File → Save As** → `Cabinet_42U_Parametric.FCStd`

### 3.2 Создание контейнера Part

```
1. View → Panels → Model (если не открыта)
2. Part → Create Part
3. Переименуйте: "Cabinet_Assembly"
```

### 3.3 Создание Spreadsheet для параметров

```
1. Выделите "Cabinet_Assembly"
2. Spreadsheet → Create Spreadsheet
3. Переименуйте: "Parameters"
```

---

## 4. Создание базовых параметров

### 4.1 Заполнение Spreadsheet

Дважды кликните на `Parameters` и заполните:

| Ячейка | Имя (Alias) | Значение | Описание |
|--------|-------------|----------|----------|
| A1 | | `Параметры шкафа` | Заголовок |
| A2 | units | `42` | Количество юнитов |
| A3 | unit_height | `44.45` | Высота 1U (мм) |
| A4 | height | `=units * unit_height` | Общая высота |
| A5 | width | `600` | Ширина (мм) |
| A6 | depth | `800` | Глубина (мм) |
| A7 | | | |
| A8 | | `Толщины` | |
| A9 | wall_thickness | `1.5` | Толщина стенки |
| A10 | door_thickness | `2` | Толщина двери |
| A11 | | | |
| A12 | | `Отверстия` | |
| A13 | hole_diameter | `6` | Диаметр отверстий |
| A14 | hole_top_offset | `50` | Смещение от верха |
| A15 | hole_bottom_offset | `50` | Смещение от низа |
| A16 | | | |
| A17 | | `Крепёж` | |
| A18 | bolt_diameter | `8` | Диаметр болта M8 |
| A19 | bolt_length | `20` | Длина болта |
| A20 | nut_height | `6.5` | Высота гайки M8 |
| A21 | washer_diameter | `16` | Диаметр шайбы |
| A22 | washer_thickness | `1.6` | Толщина шайбы |

### 4.2 Установка Alias

Для каждой ячейки с числовым значением:

1. Кликните правой кнопкой на ячейку
2. **Properties...**
3. В поле **Alias** введите имя (например, `units`)
4. OK

### 4.3 Проверка формул

После заполнения ячейка `A4` (height) должна показывать:
```
= 42 × 44.45 = 1866.9
```

---

## 5. Создание корпуса шкафа

### 5.1 Создание левой стенки (параметрически)

**Вариант A: Через GUI**

```
1. Выделите "Cabinet_Assembly"
2. Part → Primitives → Box
3. В панели свойств (View → Panels → View) установите:
   - Label: "Body_Left_[SCALE]"
   - Length: кликните на поле, нажмите "=" и введите:
     Parameters.wall_thickness
   - Width: Parameters.depth
   - Height: Parameters.height
4. Placement → Position:
   - X: 0
   - Y: 0
   - Z: 0
```

**Вариант B: Через Python консоль**

```python
# Откройте: View → Panels → Python console

import FreeCAD as App
import Part

doc = App.ActiveDocument
params = doc.getObject("Parameters")

# Создаём левую стенку
left_wall = doc.addObject("Part::Box", "Body_Left_[SCALE]")
left_wall.Length = params.wall_thickness
left_wall.Width = params.depth
left_wall.Height = params.height

# Связываем параметры (чтобы обновлялись автоматически)
left_wall.setExpression('Length', 'Parameters.wall_thickness')
left_wall.setExpression('Width', 'Parameters.depth')
left_wall.setExpression('Height', 'Parameters.height')

doc.recompute()
```

### 5.2 Создание правой стенки

```python
# Правая стенка (зеркально)
right_wall = doc.addObject("Part::Box", "Body_Right_[SCALE]")
right_wall.setExpression('Length', 'Parameters.wall_thickness')
right_wall.setExpression('Width', 'Parameters.depth')
right_wall.setExpression('Height', 'Parameters.height')

# Позиция: ширина минус толщина стенки
right_wall.setExpression('Placement.Base.x', 'Parameters.width - Parameters.wall_thickness')

doc.recompute()
```

### 5.3 Создание задней стенки

```python
# Задняя стенка
back_wall = doc.addObject("Part::Box", "Body_Back_[SCALE]")
back_wall.setExpression('Length', 'Parameters.width')
back_wall.setExpression('Width', 'Parameters.wall_thickness')
back_wall.setExpression('Height', 'Parameters.height')

# Позиция: в глубине
back_wall.setExpression('Placement.Base.y', 'Parameters.depth - Parameters.wall_thickness')

doc.recompute()
```

### 5.4 Создание верхней панели

```python
# Верхняя панель (перемещается, не масштабируется)
top_panel = doc.addObject("Part::Box", "Top_Panel_[FIXED_POS]")
top_panel.setExpression('Length', 'Parameters.width')
top_panel.setExpression('Width', 'Parameters.depth')
top_panel.Length = 600  # Фиксированная ширина
top_panel.Width = 800   # Фиксированная глубина
top_panel.Height = 2    # Толщина панели

# Позиция по Z: высота шкафа
top_panel.setExpression('Placement.Base.z', 'Parameters.height')

doc.recompute()
```

### 5.5 Создание нижней панели

```python
# Нижняя панель (фиксирована)
bottom_panel = doc.addObject("Part::Box", "Bottom_Panel_[FIXED]")
bottom_panel.Length = 600
bottom_panel.Width = 800
bottom_panel.Height = 2

# Позиция: Z = 0 (на полу)
bottom_panel.Placement.Base.z = 0

doc.recompute()
```

---

## 6. Добавление отверстий

### 6.1 Создание параметрического отверстия (верхнее)

```python
# Верхнее вентиляционное отверстие
# Позиция: на 50мм ниже верха (параметрически!)

hole_top = doc.addObject("Part::Cylinder", "Hole_Top_[FIXED_POS]")

# Диаметр фиксированный (из параметров)
hole_top.setExpression('Radius', 'Parameters.hole_diameter / 2')
hole_top.Height = 10  # Глубина (для вычитания)

# Позиция: X - по центру, Z - относительно верха!
hole_top.setExpression('Placement.Base.x', 'Parameters.width / 2')
hole_top.Placement.Base.y = 0  # На передней стенке

# КЛЮЧЕВОЙ МОМЕНТ: Z вычисляется относительно верха!
hole_top.setExpression('Placement.Base.z', 'Parameters.height - Parameters.hole_top_offset')

doc.recompute()
```

### 6.2 Создание нижнего отверстия

```python
# Нижнее отверстие
hole_bottom = doc.addObject("Part::Cylinder", "Hole_Bottom_[FIXED_POS]")
hole_bottom.setExpression('Radius', 'Parameters.hole_diameter / 2')
hole_bottom.Height = 10

hole_bottom.setExpression('Placement.Base.x', 'Parameters.width / 2')
hole_bottom.Placement.Base.y = 0

# Z вычисляется относительно низа
hole_bottom.setExpression('Placement.Base.z', 'Parameters.hole_bottom_offset')

doc.recompute()
```

### 6.3 Вычитание отверстий из стенки (Part Design подход)

Для параметрического вычитания лучше использовать **Part Design**:

```
1. Создайте Body: Part Design → Create Body
2. Создайте Sketch на поверхности стенки
3. Нарисуйте круг для отверстия
4. Добавьте constraint: позиция от верхнего края = Parameters.hole_top_offset
5. Part Design → Pocket (вырез)
```

---

## 7. Добавление крепежа

### 7.1 Создание болта M8 (фиксированный размер!)

```python
# Болт M8 - НИКОГДА не масштабируется!
bolt = doc.addObject("Part::Cylinder", "Bolt_M8_01_[FIXED]")

# Размер фиксированный (из параметров, но не масштабируется!)
bolt.setExpression('Radius', 'Parameters.bolt_diameter / 2')
bolt.setExpression('Height', 'Parameters.bolt_length')

# Позиция: рядом с верхним отверстием (относительная!)
bolt.setExpression('Placement.Base.x', 'Parameters.width / 2 + 30')  # Смещение 30мм
bolt.Placement.Base.y = 5  # На стенке

# Z - рядом с верхним отверстием (параметрически!)
bolt.setExpression('Placement.Base.z', 'Parameters.height - Parameters.hole_top_offset')

doc.recompute()
```

### 7.2 Создание гайки M8

```python
# Гайка M8 - фиксированный размер
nut = doc.addObject("Part::Prism", "Nut_M8_01_[FIXED]")
nut.Polygon = 6  # Шестигранник
nut.setExpression('Circumradius', 'Parameters.bolt_diameter * 0.866')  # ≈ 7мм для M8
nut.setExpression('Height', 'Parameters.nut_height')

# Позиция: под болтом
nut.setExpression('Placement.Base.x', 'Parameters.width / 2 + 30')
nut.Placement.Base.y = -5  # С другой стороны стенки
nut.setExpression('Placement.Base.z', 'Parameters.height - Parameters.hole_top_offset')

doc.recompute()
```

### 7.3 Создание шайбы

```python
# Шайба - фиксированный размер
washer = doc.addObject("Part::Cylinder", "Washer_01_[FIXED]")
washer.setExpression('Radius', 'Parameters.washer_diameter / 2')
washer.setExpression('Height', 'Parameters.washer_thickness')

# Позиция
washer.setExpression('Placement.Base.x', 'Parameters.width / 2 + 30')
washer.Placement.Base.y = 5
washer.setExpression('Placement.Base.z', 'Parameters.height - Parameters.hole_top_offset - 1')

doc.recompute()
```

### 7.4 Шпилька заземления

```python
# Шпилька заземления - фиксированный размер, подвижная позиция!
ground_stud = doc.addObject("Part::Cylinder", "Ground_Stud_[FIXED_POS]")
ground_stud.Radius = 4  # M8 шпилька
ground_stud.Height = 30

# Позиция: внизу шкафа
ground_stud.Placement.Base.x = 50
ground_stud.setExpression('Placement.Base.y', 'Parameters.depth - 30')
ground_stud.Placement.Base.z = 100  # 100мм от низа (фиксировано)

doc.recompute()
```

---

## 8. Тестирование масштабирования

### 8.1 Изменение параметра

```python
# Меняем количество юнитов
params = App.ActiveDocument.getObject("Parameters")
params.set("units", "27")  # Было 42, стало 27

App.ActiveDocument.recompute()
```

### 8.2 Проверка результатов

```python
# Проверяем что изменилось
params = App.ActiveDocument.getObject("Parameters")

print(f"Units: {params.units}")
print(f"Height: {params.height} мм")  # Должно быть 27 × 44.45 = 1200.15

# Проверяем позиции
left_wall = App.ActiveDocument.getObject("Body_Left_[SCALE]")
print(f"Left wall height: {left_wall.Height}")  # Должно быть 1200.15

hole_top = App.ActiveDocument.getObject("Hole_Top_[FIXED_POS]")
print(f"Top hole Z: {hole_top.Placement.Base.z}")  # Должно быть 1200.15 - 50 = 1150.15

bolt = App.ActiveDocument.getObject("Bolt_M8_01_[FIXED]")
print(f"Bolt radius: {bolt.Radius}")  # Должно остаться 4 (M8)
```

### 8.3 Что должно измениться?

| Компонент | При 42U | При 27U | Изменение |
|-----------|---------|---------|-----------|
| Высота шкафа | 1866.9 мм | 1200.15 мм | ✅ Уменьшилась |
| Левая стенка (высота) | 1866.9 мм | 1200.15 мм | ✅ Уменьшилась |
| Верхнее отверстие (Z) | 1816.9 мм | 1150.15 мм | ✅ Переместилось |
| Болт M8 (диаметр) | 8 мм | 8 мм | ❌ Не изменился |
| Болт M8 (Z) | 1816.9 мм | 1150.15 мм | ✅ Переместился |
| Нижняя панель (Z) | 0 | 0 | ❌ Не изменилась |

---

## 9. Экспорт для Three.js

### 9.1 Скрипт экспорта

Используйте скрипт `tools/freecad/export_parametric_cabinet.py`:

```python
# В консоли FreeCAD:
exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\export_parametric_cabinet.py', encoding='utf-8').read())

# Экспорт текущей модели
export_parametric_cabinet(r"C:\laragon\www\3dcabinet\public\assets\models\freecad\cabinet_42u")

# Экспорт для нескольких размеров
export_for_different_sizes(r"C:\laragon\www\3dcabinet\public\assets\models\freecad", [42, 27, 12])
```

### 9.2 Структура экспортированного JSON

```json
{
  "metadata": {
    "generator": "FreeCAD Parametric Export",
    "baseUnits": 42,
    "baseHeight": 1866.9,
    "unitHeight": 44.45
  },
  "parameters": {
    "units": 42,
    "height": 1866.9,
    "width": 600,
    "depth": 800
  },
  "components": [
    {
      "name": "Body_Left_[SCALE]",
      "category": "scalable",
      "expressions": {
        "Height": "Parameters.height"
      },
      "geometry": {
        "vertices": [...],
        "indices": [...]
      }
    }
  ]
}
```

---

## 10. Загрузка в браузере

### 10.1 TypeScript загрузчик

```typescript
import * as THREE from 'three';

const UNIT_HEIGHT = 44.45;

export class ParametricCabinetLoader {
    async load(jsonPath: string, targetUnits: number): Promise<THREE.Group> {
        const response = await fetch(jsonPath);
        const data = await response.json();
        
        const baseUnits = data.metadata.baseUnits;
        const scaleFactor = targetUnits / baseUnits;
        
        const group = new THREE.Group();
        
        for (const component of data.components) {
            const mesh = this.createMesh(component);
            
            switch (component.category) {
                case 'scalable':
                    mesh.scale.set(1, 1, scaleFactor);
                    break;
                case 'fixed':
                    // Ничего не меняем
                    break;
                case 'fixed_position':
                    this.repositionComponent(mesh, component, data.metadata, targetUnits);
                    break;
            }
            
            group.add(mesh);
        }
        
        return group;
    }
}
```

### 10.2 Использование

```typescript
const loader = new ParametricCabinetLoader();

// Загружаем 42U модель и масштабируем до 27U
const cabinet = await loader.load(
    '/assets/models/freecad/cabinet_42u/cabinet_parametric.json',
    27
);

scene.add(cabinet);
```

---

## 📋 Чек-лист

### Подготовка модели в FreeCAD

- [ ] Создан Part Container "Cabinet_Assembly"
- [ ] Создан Spreadsheet "Parameters" с параметрами
- [ ] Все размеры связаны с параметрами через выражения
- [ ] Компоненты помечены тегами `[SCALE]`, `[FIXED]`, `[FIXED_POS]`
- [ ] Протестировано изменение параметра `units`
- [ ] Все компоненты пересчитываются корректно

### Экспорт

- [ ] Скрипт экспорта загружен в FreeCAD
- [ ] JSON файл создан
- [ ] Метаданные содержат `baseUnits` и параметры
- [ ] Каждый компонент имеет `category` и `expressions`

### Загрузка в браузере

- [ ] JSON файл доступен по URL
- [ ] ParametricCabinetLoader работает
- [ ] Масштабирование 42U → 27U работает корректно
- [ ] Болты и гайки не изменили размер
- [ ] Отверстия переместились, но не растянулись

---

## Связанные документы

- [STRUCTURE_EXAMPLE.md](../tools/freecad/STRUCTURE_EXAMPLE.md) — Пример структуры модели
- [PYTHON_CAD_OVERVIEW.md](../tools/freecad/PYTHON_CAD_OVERVIEW.md) — Обзор Python API FreeCAD
- [export_to_threejs.py](../tools/freecad/export_to_threejs.py) — Скрипт экспорта

---

**Автор**: 3DCabinet Team  
**Версия**: 1.0  
**Дата**: 2025-11-28

