# 📁 Структура JavaScript-кода проекта 3Cabinet

Организация кода следует принципам модульности и разделения ответственности.

---

## 📂 Структура директорий

```
public/js/
├── libs/                          # Внешние библиотеки (Three.js)
│   ├── three.module.js           # Three.js core (r167)
│   ├── OrbitControls.js          # Управление камерой
│   ├── GLTFLoader.js             # Загрузка 3D-моделей
│   └── BufferGeometryUtils.js    # Утилиты геометрии
├── modules/                       # Наши ES6-модули (3D-конфигуратор)
│   ├── SceneManager.js           # Управление 3D-сценой
│   ├── CabinetModel.js           # Модель шкафа
│   ├── CabinetManager.js         # Менеджер коллекции шкафов
│   ├── InteractionController.js  # Обработка взаимодействия
│   └── README.md                 # Документация модулей
├── pages/                         # Точки входа для страниц
│   ├── configurator.js           # Главный модуль 3D-конфигуратора (/app)
│   └── landing.js                # Форма выбора параметров (/)
└── utils/                         # Вспомогательные утилиты
    └── progress-animation.js     # Анимация прогресс-бара
```

---

## 🔌 Подключение в Blade-шаблонах

### Страница конфигуратора (`/app`)

**Файл**: `resources/views/configurator/index.blade.php`

```blade
@push('scripts')
    <script type="module" src="{{ asset('js/pages/configurator.js') }}"></script>
@endpush
```

### Лендинг (`/`)

**Файл**: `resources/views/landing/index.blade.php`

```blade
@push('scripts')
    <script src="{{ asset('js/pages/landing.js') }}"></script>
    <script src="{{ asset('js/utils/progress-animation.js') }}"></script>
@endpush
```

---

## 📦 Зависимости и импорты

### Библиотеки (libs/)

**Three.js** — главная библиотека 3D-графики:
```javascript
import * as THREE from '../libs/three.module.js';
```

**OrbitControls** — управление камерой (зум, вращение, панорама):
```javascript
import { OrbitControls } from '../libs/OrbitControls.js';
```

**GLTFLoader** — загрузка 3D-моделей в формате GLTF/GLB:
```javascript
import { GLTFLoader } from '../libs/GLTFLoader.js';
```

**BufferGeometryUtils** — утилиты для работы с геометрией (слияние mesh):
```javascript
import { BufferGeometryUtils } from '../libs/BufferGeometryUtils.js';
```

### Модули (modules/)

Все модули экспортируют классы через `export class`:

```javascript
// В pages/configurator.js
import { SceneManager } from '../modules/SceneManager.js';
import { CabinetModel } from '../modules/CabinetModel.js';
import { CabinetManager } from '../modules/CabinetManager.js';
import { InteractionController } from '../modules/InteractionController.js';
```

---

## 🎯 Описание модулей

### `libs/` — Внешние библиотеки

| Файл | Назначение | Версия |
|------|-----------|--------|
| `three.module.js` | Ядро Three.js (сцена, камера, рендерер, геометрия, материалы) | r167 |
| `OrbitControls.js` | Контроллер камеры (вращение мышью, зум колесом) | r167 |
| `GLTFLoader.js` | Загрузчик 3D-моделей в формате GLTF/GLB | r167 |
| `BufferGeometryUtils.js` | Утилиты для объединения геометрий (mergeGeometries) | r167 |

### `modules/` — Бизнес-логика 3D-конфигуратора

| Файл | Класс | Назначение |
|------|-------|-----------|
| `SceneManager.js` | `SceneManager` | Управление 3D-сценой (комната, освещение, камера, рендерер) |
| `CabinetModel.js` | `CabinetModel` | Модель одного шкафа (загрузка GLB, управление дверцей, цветом) |
| `CabinetManager.js` | `CabinetManager` | Менеджер коллекции шкафов (добавление, удаление, выбор) |
| `InteractionController.js` | `InteractionController` | Обработка кликов, drag&drop, выбор объектов |

### `pages/` — Точки входа

| Файл | Страница | Назначение |
|------|----------|-----------|
| `configurator.js` | `/app` | Главный модуль 3D-конфигуратора (объединяет все компоненты) |
| `landing.js` | `/` | Форма выбора параметров (место установки, тип монтажа) |

### `utils/` — Вспомогательные утилиты

| Файл | Назначение |
|------|-----------|
| `progress-animation.js` | Анимация прогресс-бара на лендинге (SVG stroke-dashoffset) |

---

## 🔄 Граф зависимостей

```
pages/configurator.js
  ├── modules/SceneManager.js
  │   ├── libs/three.module.js
  │   └── libs/OrbitControls.js
  ├── modules/CabinetModel.js
  │   ├── libs/three.module.js
  │   └── libs/GLTFLoader.js
  ├── modules/CabinetManager.js
  │   └── modules/CabinetModel.js
  └── modules/InteractionController.js
      └── libs/three.module.js

pages/landing.js
  └── (vanilla JS, без импортов)

utils/progress-animation.js
  └── (vanilla JS, без импортов)
```

---

## 🚀 Добавление нового модуля

### 1. Создать файл модуля

**Пример**: `modules/EquipmentManager.js`

```javascript
import * as THREE from '../libs/three.module.js';

export class EquipmentManager {
    constructor() {
        // Инициализация
    }
    
    addEquipment(type, position) {
        // Логика добавления оборудования
    }
}
```

### 2. Импортировать в pages/configurator.js

```javascript
import { EquipmentManager } from '../modules/EquipmentManager.js';
```

### 3. Использовать в классе CabinetConfigurator

```javascript
class CabinetConfigurator {
    async init() {
        this.equipmentManager = new EquipmentManager();
        // ...
    }
}
```

---

## 📝 Соглашения

### Именование файлов
- **Модули**: `PascalCase.js` (SceneManager.js, CabinetModel.js)
- **Страницы**: `camelCase.js` (configurator.js, landing.js)
- **Утилиты**: `kebab-case.js` (progress-animation.js)

### Именование классов
- **Классы**: `PascalCase` (class SceneManager, class CabinetModel)
- **Переменные**: `camelCase` (let sceneManager, const cabinet)
- **Константы**: `UPPER_SNAKE_CASE` (const MAX_CABINETS = 10)

### Экспорт/импорт
- **Используйте именованный экспорт**: `export class SceneManager { }`
- **Импортируйте с фигурными скобками**: `import { SceneManager } from '...'`
- **НЕ используйте default export** для совместимости

---

## 🔧 Обновление Three.js

### Вариант A: Через npm (рекомендуется)

```powershell
npm install three@latest

# Скопировать файлы в public/js/libs/
cp node_modules/three/build/three.module.js public/js/libs/
cp node_modules/three/examples/jsm/controls/OrbitControls.js public/js/libs/
cp node_modules/three/examples/jsm/loaders/GLTFLoader.js public/js/libs/
cp node_modules/three/examples/jsm/utils/BufferGeometryUtils.js public/js/libs/
```

### Вариант B: Скачать напрямую

1. Перейти на https://github.com/mrdoob/three.js/releases
2. Скачать архив последней версии
3. Извлечь файлы в `public/js/libs/`

### Проверка версии

```javascript
import * as THREE from './libs/three.module.js';
console.log('Three.js версия:', THREE.REVISION);
```

---

## 📚 Полезные ссылки

- **Three.js Docs**: https://threejs.org/docs/
- **Three.js Examples**: https://threejs.org/examples/
- **GLTF Specification**: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- **MDN ES6 Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

---

**Последнее обновление**: 8 ноября 2025 г.
