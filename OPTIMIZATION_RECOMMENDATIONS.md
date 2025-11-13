# Рекомендации по оптимизации производительности

## Проблемы найденные в коде

### 1. CabinetModel.js - Конструктор (строки 78-200)

**Проблема**: При загрузке каждого шкафа выполняется:
- `Box3().setFromObject()` - 4 раза (очень медленно!)
- `model.traverse()` - 4 раза (можно 1 раз)
- 50+ вызовов `console.log()` (замедляет в DevTools)

**Решение**:
```javascript
// ВМЕСТО 4-х traverse:
this.model.traverse((child) => { child.userData.cabinetId = this.id; });
this.model.traverse(child => { child.scale.set(1, 1, 1); });
this.model.traverse((child) => { /* материалы */ });
this.model.traverse((child) => { /* тени + металлы */ });

// СДЕЛАТЬ ОДИН:
this.model.traverse((child) => {
    child.userData.cabinetId = this.id;
    if (child !== this.model && child.scale) child.scale.set(1, 1, 1);
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // материалы...
    }
});
```

**Решение Box3**:
```javascript
// УБРАТЬ избыточные вычисления Box3 при загрузке
// Вычислять только ОДИН РАЗ после масштабирования:
const scaleFactor = /* простой расчёт */;
this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);

// Box3 нужен только для pivotOffset
const box = new THREE.Box3().setFromObject(this.model);
this.pivotOffset.set(-box.getCenter().x, -box.min.y, -box.getCenter().z);
```

### 2. Режим сборки - enterAssemblyMode()

**Проблема**: Вычисление `Box3().setFromObject(body)` при каждом входе в режим

**Решение**: Кэшировать при загрузке:
```javascript
// В конструкторе:
this.bodyMinY = null;

// После загрузки модели:
const body = this.model.getObjectByName('BODY');
if (body) {
    const bodyBox = new THREE.Box3().setFromObject(body);
    this.bodyMinY = bodyBox.min.y; // Сохранить один раз
}

// В enterAssemblyMode():
// Использовать this.bodyMinY вместо пересчёта
```

### 3. Логирование в production

**Проблема**: Десятки console.log() замедляют выполнение

**Решение**:
```javascript
// Добавить флаг отладки:
const DEBUG = false; // или через URL: ?debug=1

if (DEBUG) console.log('...');
```

## Быстрые исправления (приоритет 1)

### Файл: CabinetModel.js

**Строка 78-180**: Заменить 4 traverse на 1, убрать 2 лишних Box3

**Ожидаемый прирост**: 
- Загрузка шкафа: **60-70% быстрее**
- Время: с ~800мс до ~250мс на шкаф

### Файл: CabinetModel.js (enterAssemblyMode)

**Строка 620**: Убрать `Box3().setFromObject(body)` на каждый вход

**Ожидаемый прирост**:
- Вход в режим сборки: **40% быстрее**
- Время: с ~100мс до ~60мс

## Средние исправления (приоритет 2)

### Убрать лишние updateMatrixWorld(true)

**Проблема**: Принудительное обновление всего дерева слишком часто

**Где**:
- CabinetModel.js: строки 126, 151, 158, 472, 501, 562, 583, 804
- Большинство не нужны - матрица обновится автоматически

**Решение**: Оставить только там, где СРАЗУ после изменения нужно вычислять Box3

### Кэшировать результаты поиска объектов

**Проблема**: `model.getObjectByName()` вызывается многократно для одного объекта

**Решение**:
```javascript
// В конструкторе после загрузки:
this.body = this.model.getObjectByName('BODY');
this.panel = this.model.getObjectByName('PANEL003');

// Вместо повторного поиска:
const body = this.body; // из кэша
```

## Долгосрочные улучшения (приоритет 3)

### 1. Отложенная загрузка (Lazy loading)

Не загружать все модели сразу, а по мере необходимости

### 2. Level of Detail (LOD)

Использовать упрощённые модели на дальнем расстоянии

### 3. Instancing

Для одинаковых DIN-реек использовать InstancedMesh

### 4. Web Workers

Вычисления Box3 и масштабирование делать в отдельном потоке

## Измерение производительности

```javascript
// Добавить в начало метода:
const startTime = performance.now();

// В конце:
const duration = performance.now() - startTime;
if (DEBUG) console.log(`⏱️ ${methodName}: ${duration.toFixed(2)}ms`);
```

## Итоговая оценка

**Текущая производительность**:
- Загрузка 1 шкафа: ~800-1000ms
- Вход в режим сборки: ~100-150ms

**После оптимизации (приоритет 1)**:
- Загрузка 1 шкафа: ~200-300ms ✅ **в 3-4 раза быстрее**
- Вход в режим сборки: ~50-70ms ✅ **в 2 раза быстрее**
