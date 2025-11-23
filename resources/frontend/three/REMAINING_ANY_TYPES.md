# Оставшиеся `any` типы в проекте

## 📊 Статистика
- **Всего найдено:** ~167 использований `any`
- **Критичных для исправления:** ~30
- **Допустимых (расширяемые объекты):** ~80
- **Legacy код:** ~57

## ✅ Исправлено в этой сессии
1. ✅ `ConfiguratorWizard.tsx` - `managers: any` → `ManagersInitResult | null`
2. ✅ `ConfiguratorWizard.tsx` - `managersRef: any` → `ManagersInitResult | null`
3. ✅ `StepContainer.tsx` - `onSelect: (option: any)` → `onSelect: (option: StepOption)`
4. ✅ `DragDropController.ts` - убран `as any` для `cabinet.instance`
5. ✅ `useConfiguratorStore.ts` - добавлен `type?: string` в `Recommendation`
6. ✅ `react/widgets.tsx` - убран `(rec as any).type`

---

## 🔴 Высокий приоритет (можно улучшить)

### 1. React компоненты ✅ **ЧАСТИЧНО ИСПРАВЛЕНО**
**Файлы:**
- `ConfiguratorWizard.tsx` (3 места)
  - ✅ `useState<any>(null)` - managers → `useState<ManagersInitResult | null>(null)`
  - ✅ `useRef<any>(null)` - managersRef → `useRef<ManagersInitResult | null>(null)`
  - ⏳ `(window as any).managers` - оставлено для отладки
- `StepContainer.tsx` (1 место)
  - ✅ `onSelect: (option: any) => void` → `onSelect: (option: StepOption) => void`

**Решение:** ✅ Созданы типы для managers и option

### 2. Материалы Three.js
**Файлы:**
- `EquipmentManager.ts` (12 мест)
  - `(mesh.material as any)?.name`
  - `const mat: any = mesh.material`
  - `(mat as any).transparent`, `(mat as any).opacity`
  - `(mat as any).isMeshStandardMaterial`
  - `(mat as any).metalness`, `(mat as any).roughness`
- `EquipmentMoveController.ts` (2 места)
  - `(material as any).emissive`
  - `(material as any).emissiveIntensity`

**Решение:** Использовать правильные типы материалов Three.js:
```typescript
import type { MeshStandardMaterial, MeshBasicMaterial } from 'three';
const mat = mesh.material as MeshStandardMaterial | MeshBasicMaterial;
```

### 3. Плагины логики (доступ к специфичным свойствам CabinetType)
**Файлы:**
- `ServerLogicPlugin.ts` (7 мест)
  - `(cabinetType as any).power?.maxPowerDensity`
  - `(cabinetType as any).cooling?.coolingCapacity`
  - `(cabinetType as any).cooling?.airflowType`
  - `(cabinetType as any).power?.redundancy`
  - `(eq.specifications as any).heatDissipation`
  - `(eq.mounting as any).rackUnits`
- `TelecomLogicPlugin.ts` (7 мест)
  - `(cabinetType as any).getRackUnits?.()`
  - `(cabinetType as any).power?.phases`
  - `(cabinetType as any).power?.maxCurrent`
  - `(cabinetType as any).cabling?.maxCableLoad`
  - `(eq.mounting as any).rackUnits`
  - `(eq.specifications as any).cableWeight`
- `ThermalLogicPlugin.ts` (6 мест)
  - `(cabinetType as any).thermal?.heatingPower`
  - `(cabinetType as any).thermal?.coolingPower`
  - `(cabinetType as any).thermal?.operatingTemp?.max`
  - `(cabinetType as any).thermal?.operatingTemp?.min`
  - `(cabinetType as any).climate?.hasHeater`
  - `(eq.specifications as any).heatDissipation`
  - `(eq.specifications as any).weight`

**Решение:** Создать type guards или использовать правильные типы:
```typescript
function isServerCabinetType(cabinetType: CabinetType): cabinetType is ServerCabinet {
  return cabinetType instanceof ServerCabinet;
}
```

### 4. EventBus detail параметр
**Файлы:**
- `EventBus.ts` (4 места)
  - `detail?: any` в методах `emit()`
  - `detail: any` в типах событий
- `useConfiguratorStore.ts` (7 мест)
  - `(event: CustomEvent | { type: string; detail: any })`

**Решение:** Создать union типы для разных событий или использовать generic:
```typescript
emit<T = unknown>(eventName: string, detail?: T): void;
```

### 5. Window глобальные переменные
**Файлы:**
- `init.ts` (13 мест)
  - `(window as any).THREE`
  - `(window as any).scene`
  - `(window as any).cabinetManager`
  - И другие...
- `legacy/Assembler.ts` (8 мест)
- `ConfiguratorWizard.tsx` (1 место)

**Решение:** Расширить интерфейс Window:
```typescript
declare global {
  interface Window {
    THREE?: typeof THREE;
    scene?: THREE.Scene;
    cabinetManager?: CabinetManager;
    // и т.д.
  }
}
```

### 6. StrategyRegistry конструкторы
**Файлы:**
- `StrategyRegistry.ts` (2 места)
  - `new (...args: any[]) => MountingStrategy`
  - `create(mountType: string, ...args: any[]): MountingStrategy | null`

**Решение:** Использовать generic или конкретные типы параметров

### 7. CabinetFactory модули
**Файлы:**
- `CabinetFactory.ts` (3 места)
  - `Record<string, any>` для `cabinetModules`
  - `(cabinetDef as any).mountingType`
  - `loadAndRegister(..., registry: any = null): Promise<any>`

**Решение:** Типизировать модули и registry

### 8. ValidationEngine интерфейсы
**Файлы:**
- `ValidationEngine.ts` (4 места)
  - `getCoolingSpec?: () => any`
  - `getMountingZones?: (type: string) => any[]`
  - `[key: string]: any` в интерфейсах

**Решение:** Использовать конкретные типы возвращаемых значений

### 9. DragDropController ✅ **ИСПРАВЛЕНО**
**Файлы:**
- `DragDropController.ts` (1 место)
  - ✅ `const instance = cabinet.instance as any;` → убран `as any`, используется правильный тип `CabinetBase`

**Решение:** ✅ Исправлено - используется правильный тип `CabinetBase`

### 10. Validation Rules
**Файлы:**
- `DimensionRule.ts` (2 места)
  - `(equipment.mounting as any).rackUnits`
- `ThermalRule.ts`, `WeightRule.ts`, `CompatibilityRule.ts`
  - `[key: string]: any` в интерфейсах

**Решение:** Расширить типы EquipmentMounting для rackUnits

### 11. CabinetBase door rotation
**Файлы:**
- `CabinetBase.ts` (2 места)
  - `(door.rotation as any)[this.doorRotationAxis]`

**Решение:** Использовать правильный способ доступа к свойству rotation

### 12. React widgets ✅ **ЧАСТИЧНО ИСПРАВЛЕНО**
**Файлы:**
- `react/widgets.tsx` (2 места)
  - ✅ `(rec as any).type` → убран `as any`, добавлен `type?: string` в `Recommendation`
  - ⏳ `(state.cabinetType as any)?.category` - требует изменения типа `cabinetType` в `ConfiguratorStoreState`

**Решение:** ✅ Частично исправлено - добавлен `type` в `Recommendation`. `cabinetType` требует рефакторинга типа состояния.

### 13. LogicEngine calculations
**Файлы:**
- `LogicEngine.ts` (1 место)
  - `calculations: Record<string, any>`

**Решение:** Создать конкретный тип для calculations

### 14. useConfiguratorState
**Файлы:**
- `useConfiguratorState.ts` (1 место)
  - `const params: Record<string, any> = {};`

**Решение:** Типизировать params

---

## 🟡 Средний приоритет (можно улучшить, но не критично)

### 15. CabinetFactory интерфейсы
**Файлы:**
- `CabinetFactory.ts`
  - `assemble: (options?: { basePath?: string; config?: any })`
  - `[key: string]: any` в интерфейсах

### 16. Legacy Assembler
**Файлы:**
- `legacy/Assembler.ts` (много мест)
  - `error: any` в catch блоках
  - `(cabinetDef as any).mountingType`
  - `(strategy as any).unmount`
  - `dimensions?: any`

**Примечание:** Это legacy код, можно оставить как есть или мигрировать постепенно

---

## 🟢 Низкий приоритет (допустимы)

### 17. Индексные сигнатуры `[key: string]: any`
Эти допустимы для расширяемых объектов:
- `CabinetTypeConfig[key: string]: any` - для дополнительных полей конфига
- `EquipmentSpecifications[key: string]: any` - для дополнительных характеристик
- `EquipmentConfig[key: string]: any` - для дополнительных полей
- `CabinetConfig[key: string]: any` - для дополнительных полей конфига
- `ValidationContext[key: string]: any` - для расширяемого контекста
- `ValidationError[key: string]: any` - для расширяемых ошибок
- `Recommendation[key: string]: any` - для расширяемых рекомендаций
- `Equipment[key: string]: any` - для расширяемого оборудования
- `ConfiguratorStoreState[key: string]: any` - для расширяемого состояния

**Примечание:** Эти допустимы, так как позволяют расширять объекты без изменения типов

### 18. Record<string, any> для расширяемых данных
- `calculations: Record<string, any>` - для динамических расчётов
- `defines?: Record<string, any>` - для шейдеров

**Примечание:** Допустимо для динамических данных

---

## 📋 План улучшений

### Фаза 1: React компоненты (быстро)
1. ✅ **ИСПРАВЛЕНО** Типизировать `managers` в ConfiguratorWizard → `ManagersInitResult`
2. ✅ **ИСПРАВЛЕНО** Типизировать `option` в StepContainer → `StepOption`
3. ✅ **ИСПРАВЛЕНО** Добавить `type?: string` в `Recommendation` интерфейс
4. ✅ **ИСПРАВЛЕНО** Убрать `(rec as any).type` в widgets.tsx

### Фаза 2: Материалы Three.js (средне)
5. ⏳ Использовать правильные типы материалов
6. ⏳ Создать type guards для проверки типов материалов

### Фаза 3: Плагины логики (сложно)
7. ⏳ Создать type guards для проверки типов CabinetType
8. ⏳ Расширить типы EquipmentMounting для rackUnits

### Фаза 4: EventBus и Window (средне)
9. ⏳ Типизировать EventBus через generic
10. ⏳ Расширить интерфейс Window

### Фаза 5: Остальное (по желанию)
11. ⏳ Улучшить типизацию в StrategyRegistry
12. ⏳ Улучшить типизацию в CabinetFactory
13. ⏳ Улучшить типизацию в ValidationEngine
14. ✅ **ИСПРАВЛЕНО** Убрать `as any` в DragDropController для `cabinet.instance`

---

## 🎯 Рекомендации

1. **Начните с React компонентов** - это быстро и даст немедленный эффект
2. **Материалы Three.js** - используйте правильные типы, это улучшит автодополнение
3. **Плагины логики** - создайте type guards для проверки типов CabinetType
4. **EventBus** - используйте generic для типизации detail
5. **Window** - расширьте интерфейс для глобальных переменных

**Индексные сигнатуры можно оставить** - они нужны для расширяемости объектов.

