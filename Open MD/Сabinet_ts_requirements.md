# Техническое задание: Система адаптивного масштабирования и позиционирования модульной мебели в Three.js

**Проект:** Конфигуратор телекоммуникационного шкафа (Cabinet Configurator)  
**Стек:** TypeScript, Three.js  
**Версия ТЗ:** 2.0  
**Дата:** Декабрь 2025

---

## Оглавление

1. [Обзор](#обзор)
2. [Фундаментальные принципы Three.js](#фундаментальные-принципы-threejs)
3. [Структура 3D-сцены](#структура-3d-сцены)
4. [Требования к системе трансформаций](#требования-к-системе-трансформаций)
5. [Конфигурация трансформаций (Anchor + Action)](#конфигурация-трансформаций-anchor--action)
6. [Математическое описание](#математическое-описание)
7. [Алгоритмы и формулы](#алгоритмы-и-формулы)
8. [Интерфейсы и типы данных](#интерфейсы-и-типы-данных)
9. [Тестовые сценарии](#тестовые-сценарии)
10. [Критерии приемки](#критерии-приемки)

---

## Обзор

### Цель

Разработать систему трансформаций для Three.js, которая позволяет моделировать поведение реальной мебели при масштабировании. Система должна учитывать:
- Избирательное масштабирование отдельных компонентов
- Компенсацию растяжения геометрии при масштабировании родителя
- Наследование трансформаций без разрывов геометрии
- Адаптивное позиционирование вложенных элементов (петли, замки, ручки)

### Контекст проблемы

При простом масштабировании всех компонентов шкафа происходят визуальные искажения:
- Боковины растягиваются вместо смещения
- Между компонентами появляются разрывы
- Замки и ручки теряют свою геометрию и позиционирование
- Нарушается физическая логика мебельного дизайна

### Аналогия из реального мира

Представьте, что вы меняете размер шкафа, редактируя чертеж:
- **Задняя стенка (WALLS_BACK)** увеличивает размеры (растет в длину и высоту)
- **Боковины (WALLS_LEFT, WALLS_RIGHT)** не увеличиваются в толщину, но **сдвигаются** (чтобы расстояние между стенками было больше)
- **Основание (BOTTOM_SET) и крыша (ROOF_SET)** не вырастают в толщину, но сдвигаются и растягиваются
- **Замок на двери (LOCK_SET_01)** остается физически тем же размером, но движется вместе с краем двери

---

## Фундаментальные принципы Three.js

### Почему нужно понимать матрицы

Three.js использует **4×4 матрицы** для хранения трансформаций. Понимание того, как работают матрицы — ключ к правильным формулам.

### Почему 4×4, а не 3×3?

Матрица 3×3 может выразить только **вращение** и **масштаб**, но **не может** выразить **перемещение** (translation).

Для перемещения нужна 4-я координата — **гомогенная координата w**:
```
[x, y, z] → [x, y, z, 1]
```

Тогда матрица 4×4 выглядит так:
```
| Sx  0   0   Tx |   | x |   | Sx*x + Tx |
| 0   Sy  0   Ty | × | y | = | Sy*y + Ty |
| 0   0   Sz  Tz |   | z |   | Sz*z + Tz |
| 0   0   0   1  |   | 1 |   | 1         |
```

### Наследование трансформаций в иерархии

В Three.js каждый `Object3D` имеет:
- `object.position` — локальная позиция относительно родителя
- `object.scale` — локальный масштаб
- `object.rotation` — локальный поворот
- `object.matrix` — локальная матрица (position × rotation × scale)
- `object.matrixWorld` — **мировая** матрица (включает все трансформации предков)

**КЛЮЧЕВОЙ ПРИНЦИП:**
```
child.matrixWorld = parent.matrixWorld × child.matrix
```

### Что происходит при масштабировании родителя?

Когда мы устанавливаем `parent.scale.set(2, 1, 1)`:

1. Three.js обновляет `parent.matrix` и `parent.matrixWorld`
2. Для каждого ребёнка пересчитывается `child.matrixWorld`
3. **Локальная позиция ребёнка автоматически умножается на scale родителя!**

Пример:
```
child.position.x = 0.05
parent.scale.x = 2

→ child.worldPosition.x = 0.05 * 2 = 0.10
```

**Это означает:** Если мы хотим, чтобы мировая позиция осталась 0.05, нам нужно **компенсировать**:
```
child.position.x = 0.05 / 2 = 0.025
→ worldPos = 0.025 * 2 = 0.05 ✓
```

### Формула компенсации

Для сохранения **мировой позиции** при масштабировании родителя:
```
newLocalPos = origLocalPos / parentScale
```

Для сохранения **мировой геометрии** (чтобы объект не деформировался):
```
child.scale = origScale / parentScale
```

---

## Структура 3D-сцены

### Иерархия объектов (Scene Graph)

```
TSHM (Group)                                      [Корневой объект сцены]
├── BOTTOM_SET                                    [Дно и метизы]
│   ├── BOTTOM
│   ├── NUTS_BOTTOM.001 → NAUO47…NAUO98
│   └── NUTS_BOTTOM.002 → NAUO100…NAUO118
├── DOOR_FRAME                                    [Pivot в центре полотна, сюда resize/anchor]
│   └── DOOR_HINGE                                [Pivot на петле, rotation.y]
│       ├── DOOR                                  [Полотно двери]
│       │   ├── DOOR_NUTS → NAUO19…NAUO41
│       │   ├── LOCK_SET_01 → LOCK.001…LOCK.005
│       │   └── LOCK_SET_02 → NAUO11…NAUO15
│       ├── DOOR_AMPLIFER.001
│       ├── DOOR_AMPLIFER.002
│       ├── HINGE_DOOR.001
│       └── HINGE_DOOR.002
├── HATCH
├── PANEL_SET                                     [Внутренняя панель]
│   ├── DIN_RAIL.001
│   ├── DIN_RAIL.002
│   ├── NAUO43
│   └── PANEL
├── ROOF_SET                                      [Крыша и метизы]
│   ├── NUTS_TOP.001 → NAUO48…NAUO90
│   ├── NUTS_TOP.002 → ALUM_NAT.*, FLUSH_STUD.* 
│   └── ROOF
└── WALLS_SET                                     [Стенки]
    ├── HINGE_BODY.001
    ├── HINGE_BODY.002
    ├── NAUO140…NAUO149
    ├── WALLS_BACK
    ├── WALLS_LEFT
    └── WALLS_RIGHT
```

### Требования к origin/pivot

- Узлы, к которым применяются правила `resize/anchor`, должны иметь origin в центре их bbox (геометрический центр, pivot не смещён).
- Узлы, которые вращаются (петли), имеют origin на оси вращения. Для двери используем два уровня: центрированный контейнер и петлевой.
- Размеры, используемые в формулах anchors (`sizeDelta/2`), берутся из bbox родителя с центрированным pivot. Если pivot не по центру — добавляем центрированный контейнер.

### Рекомендуемая иерархия двери

```
DOOR_SET / DOOR_FRAME (origin в центре полотна; сюда вешаем resize/anchor)
└─ DOOR_HINGE (origin на петле; сюда rotation.y для открытия)
   ├─ DOOR_MESH (origin в центре полотна; наследует поворот)
   ├─ LOCK_SET_01
   └─ LOCK_SET_02
```

- Замки/ручки/болты — дети `DOOR_MESH`; их origin в центре детали (если элемент вращается, на своей оси).
- Если в модели pivot уже на петле, оберните дверь в центрированный контейнер (FRAME) и оставьте поворот на HINGE.

### Система координат

- **Ось X:** ширина (слева-направо), центр = 0
- **Ось Y:** высота (снизу-вверх), низ = 0
- **Ось Z:** глубина (сзади-вперед), перед > 0
- **Origin:** Центр основания шкафа (0, 0, 0) — нижняя точка, центр по XZ

---

## Требования к системе трансформаций

### Общие принципы

1. **Без разрывов геометрии:** При изменении размера все компоненты должны оставаться в контакте друг с другом без зазоров или пересечений.

2. **Сохранение толщины:** Толщина материала (для боковин, крышки, основания) должна оставаться константой.

3. **Правильная геометрия вложенных элементов:** Замки, ручки не должны деформироваться при масштабировании родителя.

4. **Наследование трансформаций:** Корректная обработка каскадных трансформаций (TSHM → DOOR_SET → LOCK_SET_01).

5. **Совместимость с поворотами:** Система должна корректно работать при вращении двери.

---

## Конфигурация трансформаций (Anchor + Action)

### Упрощённая система (вместо 6 параметров)

Вместо сложной системы `scaleX/moveX/scaleY/moveY/scaleZ/moveZ` используем **2 концепции**:

1. **Action (resize_x/y/z):** Что делать с объектом по этой оси?
   - `scale` — масштабировать вместе с родителем (по умолчанию)
   - `move` — НЕ масштабировать геометрию, только перемещать
   - `absolute` — НЕ масштабировать и НЕ перемещать (сохранить мировую позицию)

2. **Anchor (anchor_x/y/z):** К какому краю родителя привязан объект?
   - X: `left` | `center` | `right`
   - Y: `bottom` | `center` | `top`
   - Z: `front` | `center` | `back`

### Как это работает

**Anchor определяет, от какого края считается расстояние:**

```
anchor=left   → фиксированный отступ от левого края (origin)
anchor=right  → фиксированный отступ от правого края (который движется при scale)
anchor=center → пропорциональное положение (остаётся в центре)
```

### Таблица конфигов для шкафа

| Объект | resize_x | resize_y | resize_z | anchor_x | anchor_y | anchor_z | Описание |
|--------|----------|----------|----------|----------|----------|----------|----------|
| WALLS_BACK | scale | scale | scale | center | bottom | center | Растягивается полностью |
| WALLS_LEFT | move | scale | scale | left | bottom | center | Толщина фикс., привязан к левому краю |
| WALLS_RIGHT | move | scale | scale | right | bottom | center | Толщина фикс., привязан к правому краю |
| ROOF_SET | scale | move | scale | center | top | center | Толщина по Y фикс., привязан к верху |
| BOTTOM_SET | scale | move | scale | center | bottom | center | Толщина по Y фикс., привязан к низу |
| DOOR_SET | scale | scale | move | left | bottom | front | Масштаб по XY, привязан к левому переднему краю |
| LOCK_SET_01 | move | move | move | left | top | front | Не деформируется, привязан к левому верхнему углу двери |
| LOCK_SET_02 | move | move | move | left | bottom | front | Не деформируется, привязан к левому нижнему углу двери |
| DIN_RAIL.* | scale | move | move | center | center | front | Растягивается по X, позиция по YZ адаптивная |

### Хранение в glTF

Custom Properties в Blender (userData.extras в Three.js):
```json
{
  "resize_x": "move",
  "resize_y": "move", 
  "resize_z": "move",
  "anchor_x": "left",
  "anchor_y": "top",
  "anchor_z": "front"
}
```

Сокращённая форма для всех осей:
```json
{
  "resize_xyz": "move"
}
```

---

## Математическое описание

### Входные данные

- `origSize` — оригинальный размер родителя в метрах (из BBox модели)
- `newSize` — новый размер родителя в метрах
- `scale = newSize / origSize` — коэффициенты масштабирования по осям
- `origPos` — оригинальная локальная позиция ребёнка
- `origScale` — оригинальный локальный масштаб ребёнка (обычно 1,1,1)
- `rules` — конфигурация (resize_x/y/z, anchor_x/y/z)

### Формулы для resize = 'move' (объект НЕ масштабируется)

**1. Компенсация деформации геометрии:**
```
child.scale = origScale / parentScale
```

Пример: `parentScale = 2`, `origScale = 1` → `child.scale = 0.5`
Визуально объект остаётся того же размера.

**2. Компенсация позиции по anchor:**

| Anchor | Формула | Объяснение |
|--------|---------|------------|
| `left` / `bottom` / `front` | `newPos = origPos / scale - sizeDelta / 2 / scale` | Фиксированный отступ от origin (левый/нижний/передний край смещается на sizeDelta/2) |
| `right` / `top` / `back` | `newPos = origPos / scale + sizeDelta / 2 / scale` | Фиксированный отступ от противоположного края |
| `center` | `newPos = origPos` | Пропорционально (мировая позиция масштабируется вместе с родителем) |

**Где:**
- `sizeDelta = newSize - origSize` (изменение размера в метрах)
- `scale = newSize / origSize`

### Почему формулы работают

**Anchor = left (фиксированный отступ от origin):**
```
origWorldPos = origPos (позиция от левого края)
Левый край сместился на -sizeDelta/2 при росте размера.
Хотим: newWorldPos = origWorldPos - sizeDelta/2 (остаться на том же расстоянии от нового левого края)
Three.js делает: newWorldPos = newLocalPos * scale
Решаем: newLocalPos * scale = origPos - sizeDelta/2
        newLocalPos = origPos / scale - sizeDelta / (2 * scale) ✓
```

**Anchor = right (фиксированный отступ от правого края):**
```
Правый край в мировых координатах: origMax = origSize/2, newMax = newSize/2
Отступ от правого края: offset = origMax - origWorldPos = origSize/2 - origPos
Хотим: newWorldPos = newMax - offset = newSize/2 - (origSize/2 - origPos)
     = newSize/2 - origSize/2 + origPos
     = origPos + sizeDelta/2

Three.js делает: newWorldPos = newLocalPos * scale
Решаем: newLocalPos * scale = origPos + sizeDelta/2
        newLocalPos = origPos/scale + sizeDelta/2/scale ✓
```

**Anchor = center (пропорционально):**
```
Центр родителя не двигается (origin).
Объект должен "ехать" вместе с масштабом.
Хотим: newWorldPos = origPos * scale (пропорционально)
Three.js делает: newWorldPos = newLocalPos * scale
Решаем: newLocalPos * scale = origPos * scale
        newLocalPos = origPos ✓ (не меняем!)
```

### Примеры расчёта

**Пример 1: LOCK_SET_01 (замок на двери)**

```
Дано:
  origPos = (-0.275, -0.493, -0.248) [локальные, в DOOR_SET]
  origSize = (0.700, 1.000, 0.500)   [размер родителя DOOR_SET]
  newSize = (1.000, 1.200, 0.600)
  rules: resize_xyz = 'move', anchor = (left, top, front)

Расчёт:
  scale = (1.43, 1.20, 1.20)
  sizeDelta = (0.300, 0.200, 0.100)

  X (anchor=left): newPos.x = origPos.x / scale.x - sizeDelta.x / 2 / scale.x
                       = -0.275 / 1.43 - 0.300 / 2 / 1.43 = -0.297
  Y (anchor=top):  newPos.y = origPos.y / scale.y + sizeDelta.y / 2 / scale.y
                           = -0.493 / 1.20 + 0.200 / 2 / 1.20 = -0.328
  Z (anchor=front): newPos.z = origPos.z / scale.z - sizeDelta.z / 2 / scale.z
                           = -0.248 / 1.20 - 0.100 / 2 / 1.20 = -0.249   
  
  child.scale = (1/1.43, 1/1.20, 1/1.20) = (0.70, 0.83, 0.83)

Проверка мировых координат:
  worldPos.x = -0.297 * 1.43 = -0.425 (левый край ушёл на -0.15, отступ сохранён)
  worldPos.y = -0.328 * 1.20 = -0.393 (было -0.493, верхний край сдвинулся на +0.100)
  worldPos.z = -0.249 * 1.20 = -0.299 (смещение синхронизировано с передним краем)
```

**Пример 2: WALLS_LEFT (левая боковина)**

```
Дано:
  origPos = (-0.340, 0.500, -0.240)  [локальные, в WALLS_SET]
  origSize = (0.700, 1.000, 0.500)
  newSize = (1.000, 1.000, 0.500)    [только ширина растёт]
  rules: resize_x = 'move', resize_y = 'scale', resize_z = 'scale'
         anchor_x = 'left'

Расчёт:
  scale = (1.43, 1.00, 1.00)
  
  X (anchor=left, move): newPos.x = origPos.x / scale.x - sizeDelta.x / 2 / scale.x
                               = -0.340 / 1.43 - 0.300 / 2 / 1.43 = -0.449
  Y (scale): без изменений, Three.js масштабирует
  Z (scale): без изменений
  
  child.scale.x = 1 / 1.43 = 0.70 (компенсация толщины)
  child.scale.y = 1 (наследует)
  child.scale.z = 1 (наследует)

Проверка:
  worldPos.x = -0.449 * 1.43 = -0.642 (левый край ушёл влево на 0.150 = sizeDelta/2, отступ сохранён)
```

---

## Алгоритмы и формулы

### Главный алгоритм applyParametricResize

```typescript
function applyParametricResize(
  model: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  modelData: ModelOriginalData,
  originalSizeMm: THREE.Vector3,
  newSizeMm: THREE.Vector3
): void {
  // 1. Рассчитываем коэффициенты масштабирования
  const scale = new THREE.Vector3(
    newSizeMm.x / originalSizeMm.x,
    newSizeMm.y / originalSizeMm.y,
    newSizeMm.z / originalSizeMm.z
  );
  
  const sizeDelta = new THREE.Vector3(
    (newSizeMm.x - originalSizeMm.x) / 1000,  // в метрах
    (newSizeMm.y - originalSizeMm.y) / 1000,
    (newSizeMm.z - originalSizeMm.z) / 1000
  );
  
  // 2. Масштабируем корень модели
  model.scale.copy(scale);
  
  // 3. Обрабатываем дочерние узлы с нестандартными правилами
  model.traverse((child) => {
    const data = nodesData.get(child.name);
    if (!data || !needsProcessing(data.rules)) return;
    
    const rules = data.rules;
    const origPos = data.localPosition;
    const origScale = data.localScale;
    
    // Получаем effectiveScale (учитывая цепочку родителей)
    const effScale = getEffectiveScale(child, model, nodesData, scale);
    
    // --- Компенсация геометрии ---
    const newChildScale = new THREE.Vector3(
      rules.resize_x !== 'scale' ? origScale.x / scale.x : origScale.x,
      rules.resize_y !== 'scale' ? origScale.y / scale.y : origScale.y,
      rules.resize_z !== 'scale' ? origScale.z / scale.z : origScale.z
    );
    child.scale.copy(newChildScale);
    
    // --- Компенсация позиции ---
    const newPos = new THREE.Vector3();
    
    // X
    if (rules.resize_x === 'move' || rules.resize_x === 'absolute') {
      newPos.x = calculatePositionByAnchor(
        origPos.x, rules.anchor_x, effScale.x, sizeDelta.x
      );
    } else {
      newPos.x = origPos.x;
    }
    
    // Y
    if (rules.resize_y === 'move' || rules.resize_y === 'absolute') {
      newPos.y = calculatePositionByAnchor(
        origPos.y, rules.anchor_y, effScale.y, sizeDelta.y
      );
    } else {
      newPos.y = origPos.y;
    }
    
    // Z
    if (rules.resize_z === 'move' || rules.resize_z === 'absolute') {
      newPos.z = calculatePositionByAnchor(
        origPos.z, rules.anchor_z, effScale.z, sizeDelta.z
      );
    } else {
      newPos.z = origPos.z;
    }
    
    child.position.copy(newPos);
  });
}

function calculatePositionByAnchor(
  origPos: number,
  anchor: string,
  scale: number,
  sizeDelta: number
): number {
  switch (anchor) {
    case 'left':
    case 'bottom':
    case 'front':
      // Фиксированный отступ от origin
      return origPos / scale;
      
    case 'right':
    case 'top':
    case 'back':
      // Фиксированный отступ от противоположного края
      return origPos / scale + sizeDelta / 2 / scale;
      
    case 'center':
    default:
      // Пропорционально (не меняем)
      return origPos;
  }
}
```

### Порядок вычислений

1. Рассчитать корневой scale (TSHM) и применить к корню.
2. Traverse: для узлов с правилами `resize/anchor` пересчитать позицию/масштаб в их локальных координатах с центрированным pivot.
3. После этого применяются повороты на узлах с петлями (например, `DOOR_HINGE` rotation.y). Anchors не пересчитываются после поворота.

### Предохранители

- Запрет нулевых/отрицательных scale; при очень малых значениях подставлять эпсилон и логировать предупреждение.
- Защита от деления на 0 и NaN/Infinity; при ошибке — fallback к исходным значениям и лог.
- Если в userData нет правил — применять `DEFAULT_RULES` и логировать предупреждение.

### Учёт иерархии родителей

```typescript
function getEffectiveScale(
  child: THREE.Object3D,
  root: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  rootScale: THREE.Vector3
): THREE.Vector3 {
  const effScale = rootScale.clone();
  
  let parent = child.parent;
  while (parent && parent !== root) {
    const parentData = nodesData.get(parent.name);
    if (parentData) {
      // Если родитель по какой-то оси НЕ масштабируется,
      // то для ребёнка effectiveScale = 1 по этой оси
      if (parentData.rules.resize_x !== 'scale') effScale.x = 1;
      if (parentData.rules.resize_y !== 'scale') effScale.y = 1;
      if (parentData.rules.resize_z !== 'scale') effScale.z = 1;
    }
    parent = parent.parent;
  }
  
  return effScale;
}
```

---

## Интерфейсы и типы данных

### Основные типы (CabinetResizer.ts)

```typescript
/**
 * Действие при масштабировании
 * - scale: объект масштабируется вместе с родителем (по умолчанию)
 * - move: объект НЕ масштабируется, позиция пересчитывается от anchor
 * - absolute: объект НЕ масштабируется, мировая позиция НЕ меняется
 */
export type ResizeAction = 'scale' | 'move' | 'absolute';

/**
 * Anchor по оси X
 */
export type AnchorX = 'left' | 'center' | 'right';

/**
 * Anchor по оси Y
 */
export type AnchorY = 'bottom' | 'center' | 'top';

/**
 * Anchor по оси Z
 */
export type AnchorZ = 'front' | 'center' | 'back';

/**
 * Правила ресайза для узла
 */
export interface ResizeRules {
  resize_x: ResizeAction;
  resize_y: ResizeAction;
  resize_z: ResizeAction;
  anchor_x: AnchorX;
  anchor_y: AnchorY;
  anchor_z: AnchorZ;
}

/**
 * Оригинальные данные узла (сохраняются при загрузке модели)
 */
export interface NodeOriginalData {
  localPosition: THREE.Vector3;
  worldPosition: THREE.Vector3;
  localScale: THREE.Vector3;
  rules: ResizeRules;
}

/**
 * Оригинальные данные модели
 */
export interface ModelOriginalData {
  size: THREE.Vector3;    // Размер в метрах
  min: THREE.Vector3;     // BBox min
  max: THREE.Vector3;     // BBox max
  center: THREE.Vector3;  // Центр модели
}
```

### Значения по умолчанию

```typescript
const DEFAULT_RULES: ResizeRules = {
  resize_x: 'scale',
  resize_y: 'scale',
  resize_z: 'scale',
  anchor_x: 'center',
  anchor_y: 'bottom',
  anchor_z: 'center',
};
```

---

## Тестовые сценарии

### Сценарий 1: LOCK_SET_01 при масштабировании двери

**Исходное состояние:**
```
DOOR_SET:
  origSize = (700, 1000, 500) мм
  
LOCK_SET_01 (ребёнок DOOR_SET):
  localPos = (-0.275, -0.493, -0.248)
  rules: resize_xyz = 'move', anchor = (left, top, front)
```

**Действие:** Изменить размер на (1000, 1200, 600) мм

**Ожидаемый результат:**
```
scale = (1.43, 1.20, 1.20)

LOCK_SET_01:
  newLocalPos.x = -0.275 / 1.43 = -0.192 (anchor=left)
  newLocalPos.y = -0.493 / 1.20 + 0.1 / 1.20 = -0.328 (anchor=top, sizeDelta=0.2м)
  newLocalPos.z = -0.248 / 1.20 = -0.207 (anchor=front)
  
  child.scale = (0.70, 0.83, 0.83) (компенсация деформации)

Проверка worldPos:
  worldPos.x = -0.192 * 1.43 = -0.275 ✓ (отступ от левого края сохранён)
  worldPos.z = -0.207 * 1.20 = -0.248 ✓ (отступ от переда сохранён)
```

---

### Сценарий 2: WALLS_LEFT / WALLS_RIGHT при изменении ширины

**Исходное состояние:**
```
TSHM:
  origSize = (700, 1000, 500) мм

WALLS_LEFT:
  localPos = (-0.340, 0.500, -0.240)
  rules: resize_x = 'move', resize_y = 'scale', resize_z = 'scale'
         anchor_x = 'left'

WALLS_RIGHT:
  localPos = (+0.340, 0.500, -0.240)
  rules: resize_x = 'move', resize_y = 'scale', resize_z = 'scale'
         anchor_x = 'right'
```

**Действие:** Изменить ширину на 1000 мм (остальное без изменений)

**Ожидаемый результат:**
```
scale = (1.43, 1.00, 1.00)
sizeDelta.x = 0.300 м

WALLS_LEFT (anchor=left):
  newPos.x = -0.340 / 1.43 = -0.238
  worldPos.x = -0.238 * 1.43 = -0.340 ✓ (остался у левого края)
  child.scale.x = 1 / 1.43 = 0.70 (толщина не изменилась)

WALLS_RIGHT (anchor=right):
  newPos.x = 0.340 / 1.43 + 0.150 / 1.43 = 0.343
  worldPos.x = 0.343 * 1.43 = 0.490 ✓ (было 0.340, сдвинулся на 0.150 — половина sizeDelta)
  child.scale.x = 1 / 1.43 = 0.70
```

---

### Сценарий 3: Вложенная иерархия TSHM → DOOR_SET → LOCK_SET

**Исходное состояние:**
```
TSHM (scale = 1,1,1)
├── DOOR_SET
│   └── LOCK_SET_01
```

**Действие:** TSHM масштабируется на (1.5, 1.2, 1.0)

**Ожидаемый результат:**
- DOOR_SET наследует масштаб → растягивается
- LOCK_SET_01 компенсирует деформацию → `child.scale = 1/parentScale`
- Мировая позиция LOCK_SET_01 пересчитывается по anchor

---

### Сценарий 4: Открытие двери + масштабирование

**Исходное состояние:**
- DOOR_SET.rotation.y = 0

**Действие 1:** Открыть дверь `DOOR_SET.rotation.y = Math.PI / 2`

**Действие 2:** Масштабировать TSHM на (1.5, 1, 1)

**Ожидаемый результат:**
- ✅ Дверь остаётся открытой
- ✅ LOCK_SET_01 остаётся на двери в правильной позиции
- ✅ Геометрия замка не деформирована

---

## Критерии приёмки

### Функциональные требования (FR)

- [x] **FR1:** Правила читаются из glTF userData (Custom Properties Blender)
- [x] **FR2:** Поддержка shorthand `resize_xyz` для всех осей
- [ ] **FR3:** WALLS_LEFT/WALLS_RIGHT корректно смещаются при изменении ширины
- [ ] **FR4:** LOCK_SET_01 сохраняет отступ от левого/верхнего/переднего края
- [ ] **FR5:** Геометрия объектов с `resize=move` не деформируется
- [ ] **FR6:** Учитывается иерархия (effectiveScale для вложенных объектов)
- [ ] **FR7:** Работает с открытой дверью (rotation.y)

### Качественные требования (QR)

- [ ] **QR1:** Нет визуальных разрывов между компонентами
- [ ] **QR2:** Производительность: < 5ms на 100+ объектов
- [ ] **QR3:** Нет NaN/Infinity в расчётах

---

## Резюме изменений (v2.0)

### Что изменилось по сравнению с v1.0:

1. **Убрана путаница `fixed` vs `compensate`**
   - Теперь только `resize = 'move'` означает компенсацию (`child.scale = 1/parentScale`)

2. **Введена концепция Anchor вместо `moveX/moveY/moveZ`**
   - `anchor_x: 'left' | 'center' | 'right'`
   - Anchor определяет, к какому краю привязан объект

3. **Упрощены формулы**
   - `anchor=left`: `newPos = origPos / scale`
   - `anchor=right`: `newPos = origPos / scale + sizeDelta / 2 / scale`
   - `anchor=center`: `newPos = origPos` (пропорционально)

4. **Добавлен раздел "Фундаментальные принципы Three.js"**
   - Объяснение матриц 4×4, гомогенных координат
   - Как работает наследование трансформаций
   - Почему формулы компенсации именно такие

5. **Обновлена структура сцены с реальными именами**
   - TSHM, WALLS_SET, WALLS_LEFT, WALLS_RIGHT, DOOR_SET, LOCK_SET_01 и т.д.

6. **Добавлены примеры расчётов с реальными числами**
   - LOCK_SET_01: origPos, scale, newPos, проверка worldPos
   - WALLS_LEFT: компенсация толщины, привязка к левому краю