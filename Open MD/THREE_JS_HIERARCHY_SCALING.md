# Three.js: Иерархия и масштабирование объектов

## Основы иерархии в Three.js

В Three.js все объекты (`Object3D`) могут иметь родителей и детей, формируя древовидную структуру:

```
Scene (корень)
└── Model (корневой объект модели)
    ├── WALLS_SET (группа стен)
    │   ├── WALLS_LEFT (левая стена)
    │   ├── WALLS_RIGHT (правая стена)
    │   └── WALLS_BACK (задняя стена)
    └── DOOR_SET (группа двери)
        ├── DOOR_PANEL (панель)
        └── DOOR_HANDLE (ручка)
```

## Системы координат

Каждый объект имеет **две** системы координат:

### 1. Локальная система координат (Local Space)
- `object.position` — позиция относительно родителя
- `object.scale` — масштаб относительно родителя
- `object.rotation` — поворот относительно родителя

### 2. Мировая система координат (World Space)
- `object.getWorldPosition(target)` — абсолютная позиция в сцене
- `object.matrixWorld` — матрица трансформации из локальных координат в мировые

## Как работает масштабирование

### Базовый пример

```javascript
// Создаём иерархию
const parent = new THREE.Group();
const child = new THREE.Mesh(geometry, material);

parent.add(child);
scene.add(parent);

// Устанавливаем позиции
parent.position.set(10, 0, 0);  // Родитель на X=10
child.position.set(5, 0, 0);    // Ребёнок на X=5 от родителя

// Мировая позиция ребёнка:
const worldPos = new THREE.Vector3();
child.getWorldPosition(worldPos);
console.log(worldPos); // Vector3(15, 0, 0) — сумма 10+5
```

### Масштабирование родителя

Когда вы масштабируете родителя, **все дети автоматически масштабируются**:

```javascript
parent.position.set(10, 0, 0);
child.position.set(5, 0, 0);

// ДО масштабирования
child.getWorldPosition(worldPos); // (15, 0, 0)

// Масштабируем родителя в 2 раза
parent.scale.set(2, 2, 2);

// ПОСЛЕ масштабирования
child.getWorldPosition(worldPos); // (25, 0, 0) — НЕ 15!
```

**Почему 25?**
- Локальная позиция ребёнка: `x = 5`
- Масштаб родителя: `scaleX = 2`
- Позиция родителя: `x = 10`
- **Формула**: `worldX = parent.x + (child.x × parent.scaleX) = 10 + (5 × 2) = 20`

**Нет, не 20, а 25!** Потому что сама позиция родителя тоже участвует:

**Правильная формула**:
```
worldX = parent.x × parent.scaleX + child.x × parent.scaleX
       = 10 × 2 + 5 × 2
       = 20 + 10
       = 30
```

**Стоп! Тоже не верно.** Давайте точно:

## Точная формула трансформации

Three.js использует **матрицы 4×4** для трансформаций. Полная формула:

```
worldMatrix(child) = worldMatrix(parent) × localMatrix(child)
```

Где:
```
localMatrix = Translation × Rotation × Scale
```

### Пошаговый расчёт

```javascript
// Начальное состояние
parent.position.set(10, 0, 0);
parent.scale.set(1, 1, 1);
child.position.set(5, 0, 0);
child.scale.set(1, 1, 1);

// Мировая позиция ребёнка
worldPos = parent.position + child.position = (10, 0, 0) + (5, 0, 0) = (15, 0, 0) ✓

// Масштабируем родителя
parent.scale.set(2, 1, 1);

// Что происходит:
// 1. parent.matrix = Translate(10,0,0) × Scale(2,1,1)
// 2. child.matrix = Translate(5,0,0) × Scale(1,1,1)
// 3. child.matrixWorld = parent.matrix × child.matrix

// Результат:
// child.worldPosition = (10,0,0) + (5×2, 0, 0) = (10,0,0) + (10,0,0) = (20, 0, 0)
```

**Вывод**: При `parent.scale.x = 2` локальная позиция ребёнка `child.position.x = 5` превращается в смещение **10** в мировых координатах.

## Многоуровневая иерархия

```
Scene
└── Model (scale = 1.5)
    └── WALLS_SET (scale = 1.0, position = [0.089, -0.100, -0.298])
        └── WALLS_LEFT (scale = 1.0, position = [0.0, 0.128, 0.0])
```

### Расчёт мировой позиции WALLS_LEFT

```javascript
// Шаг 1: Model
modelWorld.x = 0 + 0 × 1.5 = 0
modelWorld.scale = 1.5

// Шаг 2: WALLS_SET (относительно Model)
wallsSetLocal.x = 0.089
wallsSetWorld.x = modelWorld.x + wallsSetLocal.x × modelWorld.scale
                = 0 + 0.089 × 1.5
                = 0.1335

// Шаг 3: WALLS_LEFT (относительно WALLS_SET)
wallsLeftLocal.x = 0.0
wallsLeftWorld.x = wallsSetWorld.x + wallsLeftLocal.x × (modelWorld.scale × wallsSetLocal.scale)
                 = 0.1335 + 0.0 × 1.5
                 = 0.1335
```

### Когда Model масштабируется до 2.0

```javascript
// Model.scale.x = 2.0 (было 1.5)

// WALLS_SET
wallsSetWorld.x = 0 + 0.089 × 2.0 = 0.178  // Было 0.1335, стало 0.178

// WALLS_LEFT
wallsLeftWorld.x = 0.178 + 0.0 × 2.0 = 0.178  // Сдвинулась вместе с WALLS_SET!
```

**Проблема**: Даже если `WALLS_LEFT.position.x = 0`, она всё равно сдвигается, потому что её родитель (WALLS_SET) сдвинулся.

## Проблема с `resize_x: "absolute"`

Когда мы хотим, чтобы WALLS_LEFT оставалась на **фиксированной мировой позиции**:

### Неправильный подход
```javascript
// Просто не трогаем child.position
child.position.x = data.localPosition.x; // Оставляем как было
```

**Не работает!** Потому что родитель уже отмасштабирован, и ребёнок автоматически сдвинется.

### Правильный подход (текущая реализация)

```javascript
// 1. Сохраняем оригинальную мировую позицию при загрузке
const worldPos = new THREE.Vector3();
child.getWorldPosition(worldPos);
data.worldPosition = worldPos.clone(); // Например, (0.1335, ...)

// 2. При масштабировании пересчитываем локальную позицию
const targetWorldPos = new THREE.Vector3(data.worldPosition.x, 0, 0);

// Получаем инверсную матрицу родителя
const parentWorldMatrix = new THREE.Matrix4();
child.parent.updateMatrixWorld(true);
parentWorldMatrix.copy(child.parent.matrixWorld).invert();

// Преобразуем: мировая позиция → локальная позиция
targetWorldPos.applyMatrix4(parentWorldMatrix);
child.position.x = targetWorldPos.x;
```

### Математика за кулисами

```
// Прямое преобразование (локальная → мировая)
worldPos = parent.matrixWorld × localPos

// Обратное преобразование (мировая → локальная)
localPos = parent.matrixWorld⁻¹ × worldPos
```

#### Пример расчёта

```javascript
// Дано:
// - WALLS_LEFT.worldPosition.x = 0.1335 (оригинал)
// - Model.scale.x = 2.0 (новый масштаб)
// - WALLS_SET.position.x = 0.089

// Мировая позиция WALLS_SET после масштабирования Model
wallsSetWorld.x = 0.089 × 2.0 = 0.178

// Чтобы WALLS_LEFT осталась на worldX = 0.1335:
// 0.1335 = wallsSetWorld.x + wallsLeftLocal.x × 2.0
// 0.1335 = 0.178 + wallsLeftLocal.x × 2.0
// wallsLeftLocal.x × 2.0 = 0.1335 - 0.178 = -0.0445
// wallsLeftLocal.x = -0.0445 / 2.0 = -0.02225
```

Именно это и делает `matrixWorld.invert()` автоматически!

## Альтернативные решения

### 1. Не масштабировать корень модели
```javascript
// Вместо model.scale.set(scaleX, scaleY, scaleZ)
// Масштабируем каждый узел индивидуально
model.traverse(child => {
  if (child.userData.resize_x === 'scale') {
    child.scale.x *= scaleX;
  }
});
```

**Минусы**: Сложнее, нужно обрабатывать каждый узел.

### 2. Выносить объекты с `absolute` в корень сцены
```javascript
if (child.userData.resize_x === 'absolute') {
  scene.attach(child); // Отвязываем от родителя
}
```

**Минусы**: Теряется логическая иерархия модели.

### 3. Использовать матричные вычисления (текущий подход)
```javascript
// Сохраняем worldPosition, пересчитываем localPosition
child.position.x = (worldPos - parentWorldPos) / parentScale.x;
```

**Плюсы**: 
- Работает с любой глубиной вложенности
- Сохраняет иерархию модели
- Точные математические вычисления

**Минусы**: 
- Сложнее для понимания
- Требует знания матричной алгебры

## Практические рекомендации

### Для дизайнеров моделей

1. **Минимизируйте вложенность**: Чем меньше уровней иерархии, тем проще расчёты
2. **Группируйте логично**: WALLS_SET должен содержать только стены, а не всю модель
3. **Используйте `absolute` аккуратно**: Только для объектов, которые действительно не должны двигаться

### Для разработчиков

1. **Всегда сохраняйте `worldPosition`** при загрузке модели
2. **Используйте `updateMatrixWorld(true)`** перед получением матриц
3. **Тестируйте на многоуровневых иерархиях**: Не только parent→child, но и parent→group→child
4. **Логируйте мировые позиции**: `console.log(child.getWorldPosition(new Vector3()))`

## Отладка

### Проверка иерархии
```javascript
function printHierarchy(obj, level = 0) {
  const indent = '  '.repeat(level);
  console.log(`${indent}${obj.name}`);
  console.log(`${indent}  pos: (${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)})`);
  console.log(`${indent}  scale: (${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`);
  
  const worldPos = new THREE.Vector3();
  obj.getWorldPosition(worldPos);
  console.log(`${indent}  world: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`);
  
  obj.children.forEach(child => printHierarchy(child, level + 1));
}

printHierarchy(model);
```

### Проверка матриц
```javascript
console.log('Parent matrix:', parent.matrixWorld.elements);
console.log('Child local matrix:', child.matrix.elements);
console.log('Child world matrix:', child.matrixWorld.elements);
```

## Заключение

Three.js использует **каскадные трансформации**: изменения в родителе автоматически влияют на всех детей через умножение матриц. Для `resize_x: "absolute"` нужно:

1. Сохранить мировую позицию до масштабирования
2. После масштабирования родителя пересчитать локальную позицию
3. Использовать инверсную матрицу родителя для обратного преобразования

Это единственный способ сохранить объект на фиксированной мировой позиции при изменении масштаба родителей.
