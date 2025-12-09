# Поддержка GLTF/GLB шкафов

Система теперь поддерживает загрузку шкафов из GLTF/GLB моделей в дополнение к процедурным FreeCAD моделям.

## Архитектура

### Базовый класс `GLTFCabinetBase`

Универсальный базовый класс для всех GLTF/GLB шкафов, который:
- Автоматически загружает GLTF/GLB модели через `AssetLoader`
- Определяет компоненты (DIN-рейки, двери) из структуры модели
- Поддерживает параметрический ресайз через `CabinetResizer`
- Регистрирует компоненты для работы со стратегиями монтажа

### Создание нового GLTF шкафа

1. **Создайте класс шкафа**, наследуясь от `GLTFCabinetBase`:

```typescript
import { GLTFCabinetBase, type GLTFCabinetConfig } from '../GLTFCabinetBase.ts';

export class MyCabinet extends GLTFCabinetBase {
    constructor() {
        super();
        this.assembly.name = 'MyCabinet_Assembly';
    }

    protected getGLTFConfig(): GLTFCabinetConfig {
        return {
            modelPath: '/assets/models/cabinets/my_folder/my_cabinet.gltf',
            doorComponentName: 'DOOR', // Имя узла двери в GLTF
            doorRotationAxis: 'y',
            dinRailPatterns: ['DIN_RAIL', 'din_rail', 'DINRail'], // Паттерны для поиска DIN-реек
            componentPatterns: {
                // Дополнительные компоненты для регистрации
                'back_panel': ['BACK', 'back_panel'],
                'side_panel': ['SIDE', 'side_panel']
            }
        };
    }
}
```

2. **Добавьте запись в каталог** (`public/assets/models/cabinets/catalog.json`):

```json
{
  "id": "my_cabinet",
  "name": "Мой шкаф",
  "className": "MyCabinet",
  "modulePath": "my_cabinet/my_cabinet.ts",
  "category": "thermal",
  "modelType": "gltf",
  "modelPath": "my_folder/my_cabinet.gltf",
  "dimensions": {
    "width": 800,
    "height": 600,
    "depth": 250
  },
  "mountingCapabilities": ["din_rail"],
  "mountingZones": [
    {
      "type": "din_rail",
      "componentNames": ["din_rail_0", "din_rail_1"]
    }
  ],
  "mountingType": "din_rail",
  "description": "Описание шкафа"
}
```

## Поля каталога

### Обязательные поля:
- `id` - уникальный идентификатор
- `name` - название шкафа
- `className` - имя класса TypeScript
- `modulePath` - путь к модулю класса
- `category` - категория ('thermal', 'telecom', 'server')
- `dimensions` - размеры в мм
- `mountingCapabilities` - массив возможностей монтажа

### Поля для GLTF/GLB шкафов:
- `modelType` - тип модели: `'gltf'` или `'glb'` (по умолчанию `'freecad'`)
- `modelPath` - путь к GLTF/GLB файлу относительно `/assets/models/cabinets/`

### Поля для FreeCAD шкафов:
- `modelType` - не указывается или `'freecad'` (по умолчанию)
- `basePath` - определяется автоматически как `/assets/models/freecad`

## Автоматическое определение типа

`CabinetFactory` автоматически определяет тип модели по полю `modelType` в определении каталога:
- Если `modelType === 'gltf'` или `'glb'` → передаёт `modelPath` в `assemble()`
- Если `modelType === 'freecad'` или не указан → передаёт `basePath` в `assemble()`

## Пример: класс tshm

См. `resources/frontend/three/cabinets/tshm/tshm.ts` для примера реализации.

## Требования к GLTF модели

1. **Именование узлов:**
   - DIN-рейки должны содержать в имени: `DIN_RAIL`, `din_rail` или `DINRail`
   - Дверь должна иметь имя, указанное в `doorComponentName`

2. **Структура:**
   - Модель должна быть правильно ориентирована (Y вверх)
   - Система автоматически выравнивает модель по полу (minY = 0)

3. **Параметрический ресайз:**
   - Для поддержки ресайза модель должна иметь корректную структуру узлов
   - Используется `CabinetResizer` для масштабирования

## Совместимость

Система полностью совместима с существующими FreeCAD шкафами. Все существующие шкафы продолжают работать без изменений.

