# Тип `unknown` в TypeScript

## 📚 Что такое `unknown`?

`unknown` — это **тип верхнего уровня** (top type) в TypeScript, который представляет **любое значение**, но с **строгой проверкой типов**.

## 🔍 `unknown` vs `any`

### `any` — "выключить проверку типов"
```typescript
let value: any = "hello";
value.foo.bar;        // ✅ Компилируется (но может упасть в runtime!)
value();              // ✅ Компилируется (но может упасть в runtime!)
value = 42;           // ✅ Компилируется
value.toUpperCase();  // ✅ Компилируется (но может упасть в runtime!)
```

**Проблема:** `any` отключает всю проверку типов, что может привести к ошибкам в runtime.

### `unknown` — "не знаю тип, но проверь перед использованием"
```typescript
let value: unknown = "hello";
value.foo.bar;        // ❌ Ошибка: Object is of type 'unknown'
value();              // ❌ Ошибка: Cannot invoke an object which is possibly 'unknown'
value = 42;           // ✅ OK (можно присваивать)
value.toUpperCase();  // ❌ Ошибка: Object is of type 'unknown'
```

**Преимущество:** `unknown` **требует проверки типа** перед использованием.

## ✅ Как работать с `unknown`?

### 1. Type Guards (проверки типов)
```typescript
function processValue(value: unknown) {
    // ❌ Нельзя использовать напрямую
    // value.toUpperCase(); // Ошибка!
    
    // ✅ Проверяем тип перед использованием
    if (typeof value === 'string') {
        value.toUpperCase(); // ✅ Теперь TypeScript знает, что это string
    }
    
    if (typeof value === 'number') {
        value.toFixed(2); // ✅ Теперь TypeScript знает, что это number
    }
    
    if (value instanceof Date) {
        value.getTime(); // ✅ Теперь TypeScript знает, что это Date
    }
}
```

### 2. Type Assertion (приведение типов)
```typescript
function processValue(value: unknown) {
    // ⚠️ Осторожно! Убедитесь, что знаете тип
    const str = value as string;
    str.toUpperCase();
    
    // Лучше с проверкой:
    if (typeof value === 'string') {
        const str = value; // Автоматическое сужение типа
        str.toUpperCase();
    }
}
```

### 3. Проверка структуры объекта
```typescript
function isUser(obj: unknown): obj is { name: string; age: number } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'name' in obj &&
        'age' in obj &&
        typeof (obj as { name: unknown }).name === 'string' &&
        typeof (obj as { age: unknown }).age === 'number'
    );
}

function processUser(data: unknown) {
    if (isUser(data)) {
        // ✅ TypeScript знает структуру объекта
        console.log(data.name); // string
        console.log(data.age);  // number
    }
}
```

## 🎯 Примеры из нашего проекта

### Пример 1: EventBus detail
```typescript
// ❌ Было (небезопасно):
emit(eventName: string, detail?: any): void {
    // Можно передать что угодно, ошибки не будет
}

// ✅ Стало (безопасно):
emit(eventName: string, detail?: unknown): void {
    // Можно передать что угодно, но нужно проверить тип при использовании
}

// Использование:
eventBus.emit('equipment:added', { id: '123', type: 'breaker' });

// В обработчике:
eventBus.on('equipment:added', (event) => {
    const detail = event.detail; // unknown
    
    // ❌ Нельзя использовать напрямую:
    // detail.id; // Ошибка!
    
    // ✅ Проверяем тип:
    if (detail && typeof detail === 'object' && 'id' in detail) {
        const equipment = detail as { id: string; type: string };
        console.log(equipment.id); // ✅ OK
    }
});
```

### Пример 2: Record<string, unknown>
```typescript
// ❌ Было:
calculations: Record<string, any>;

// ✅ Стало:
calculations: Record<string, unknown>;

// Использование:
const calc = pluginResult.calculations;
const power = calc['totalPower']; // unknown

// ✅ Проверяем тип перед использованием:
if (typeof power === 'number') {
    console.log(`Мощность: ${power} Вт`);
} else {
    console.log('Мощность не определена');
}
```

### Пример 3: Индексные сигнатуры
```typescript
// ❌ Было:
interface CabinetDimensions {
    width: number;
    height: number;
    depth: number;
}
// Проблема: не совместимо с Record<string, unknown>

// ✅ Стало:
interface CabinetDimensions {
    width: number;
    height: number;
    depth: number;
    [key: string]: unknown; // Для совместимости
}

// Теперь можно использовать:
const dims: CabinetDimensions | Record<string, unknown> = getDimensions();
// TypeScript понимает, что это совместимые типы
```

### Пример 4: Validation Rules
```typescript
// ❌ Было (небезопасно):
const heatOutput = equipment.specifications['heatDissipation'];
const newTotalHeat = currentHeat + heatOutput; // Может быть any!

// ✅ Стало (безопасно):
const heatOutputRaw = equipment.specifications['heatDissipation']; // unknown
const heatOutput = typeof heatOutputRaw === 'number' ? heatOutputRaw : 0;
const newTotalHeat = currentHeat + heatOutput; // ✅ Гарантированно number
```

## 📊 Сравнительная таблица

| Характеристика | `any` | `unknown` | Конкретный тип |
|----------------|-------|-----------|----------------|
| Проверка типов | ❌ Отключена | ✅ Включена | ✅ Включена |
| Можно присваивать | ✅ Любому типу | ✅ Любому типу | ❌ Только совместимым |
| Можно использовать | ✅ Сразу | ❌ Только после проверки | ✅ Сразу |
| Безопасность | ❌ Низкая | ✅ Высокая | ✅ Высокая |
| Когда использовать | Никогда* | Когда тип неизвестен | Когда тип известен |

*`any` следует использовать только в крайних случаях, когда действительно невозможно определить тип.

## 🎓 Лучшие практики

### ✅ Хорошо:
```typescript
// 1. Используйте unknown для данных извне (API, пользовательский ввод)
function parseJSON(json: string): unknown {
    return JSON.parse(json);
}

// 2. Проверяйте тип перед использованием
function processData(data: unknown) {
    if (typeof data === 'string') {
        // Работаем со string
    } else if (Array.isArray(data)) {
        // Работаем с массивом
    }
}

// 3. Используйте type guards
function isString(value: unknown): value is string {
    return typeof value === 'string';
}
```

### ❌ Плохо:
```typescript
// 1. Не используйте any
function badFunction(data: any) {
    data.foo.bar(); // Может упасть в runtime!
}

// 2. Не используйте unknown без проверки
function badFunction(data: unknown) {
    (data as any).foo.bar(); // Обходим проверку типов - плохо!
}

// 3. Не используйте type assertion без проверки
function badFunction(data: unknown) {
    const str = data as string; // Может быть не string!
    str.toUpperCase(); // Может упасть в runtime!
}
```

## 🔗 Связь с другими типами

```typescript
// Иерархия типов:
never < конкретные типы < unknown < any

// never - ничего нельзя присвоить
let n: never;
n = 1; // ❌ Ошибка

// unknown - можно присвоить что угодно, но нельзя использовать без проверки
let u: unknown;
u = 1; // ✅ OK
u = "hello"; // ✅ OK
u.toUpperCase(); // ❌ Ошибка

// any - можно всё
let a: any;
a = 1; // ✅ OK
a.toUpperCase(); // ✅ OK (но может упасть в runtime!)
```

## 📝 Резюме

**`unknown`** — это безопасная альтернатива `any`:
- ✅ Сохраняет проверку типов
- ✅ Требует явной проверки перед использованием
- ✅ Предотвращает ошибки в runtime
- ✅ Делает код более предсказуемым

**Используйте `unknown`**, когда:
- Тип значения неизвестен во время компиляции
- Данные приходят извне (API, пользовательский ввод, JSON)
- Нужна гибкость, но с безопасностью типов

**Избегайте `any`**, если только это не крайняя необходимость.

