# 3Cabinet — AI Agent Guide

## Архитектура

**Backend**: Laravel 11 + Blade  
**Frontend**: Гибридная архитектура  
**БД**: MySQL через Eloquent ORM

### Два подхода во frontend

| Раздел | Технологии | Описание |
|--------|-----------|----------|
| **Landing** (`/`) | Blade + Vanilla JS + CSS | Традиционный серверный рендеринг |
| **Configurator** (`/configurator`) | React 19 + TypeScript + Vite + Three.js 0.181 | SPA с 3D-визуализацией |
| **Admin** (`/admin`) | Blade | Админ-панель |

### Ключевые технологии (Configurator)
- **Vite** для сборки (`npm run dev` — dev-сервер на порту 5174)
- **Three.js** для 3D-визуализации термошкафов
- **React** без StrictMode (для совместимости с Three.js)
- **TypeScript** со строгой типизацией

---

## Структура Frontend (Configurator)

```
resources/frontend/
├── app.tsx                    # Точка входа React
├── pages/ConfiguratorPage.tsx # Главная страница конфигуратора
├── components/Configurator/   # UI-компоненты (Wizard, Panels)
├── hooks/useConfiguratorState.ts # Состояние конфигуратора
├── config/ThermalCabinetConfig.ts # Конфигурация шагов wizard
├── types/                     # TypeScript типы
└── three/                     # Three.js модули
    ├── boot/CabinetScene.ts   # Инициализация сцены
    ├── managers/              # CabinetManager, EquipmentManager
    ├── cabinets/              # Классы шкафов (CabinetBase + tsh_*)
    ├── strategies/            # MountingStrategies (DIN, Rack, Plate)
    ├── data/                  # Каталоги (cabinets-catalog.ts)
    ├── events/EventBus.ts     # Событийная система React ↔ Three.js
    └── types/                 # Типы для 3D
```

## Структура Landing (Blade)

```
resources/views/
├── landing/index.blade.php    # Главная страница
├── layouts/app.blade.php      # Мастер-шаблон
└── partials/                  # Header, Footer, Sprite

public/
├── css/styles.css             # Стили (CSS-переменные в :root)
├── js/landing/                # Vanilla JS для лендинга
└── assets/                    # Иконки, шрифты, изображения
```

---

## Запуск разработки

```powershell
# Терминал 1: Vite dev server (HMR)
npm run dev

# Терминал 2: Laravel backend
php artisan serve

# Или одной командой:
npm run dev:full
```

**URL**: http://localhost:8000/configurator

### Основные команды

```powershell
npm run dev           # Vite dev server (порт 5174)
npm run build         # Production сборка → public/build/
npm run build:icons   # Генерация SVG-спрайта
php artisan migrate   # Миграции БД
php artisan db:seed   # Сидеры
```

---

## Ключевые паттерны

### 1. Каталог шкафов (`resources/frontend/three/data/cabinets-catalog.ts`)

```typescript
const cabinet: CabinetDefinition = {
  id: 'tsh_700_500_240',
  className: 'tsh_700_500_240',  // Должен совпадать с папкой в cabinets/
  mountingCapabilities: ['din_rail', 'mounting_plate'],
  dimensions: { width: 700, height: 500, depth: 240 },
};
```

### 2. Классы шкафов (`resources/frontend/three/cabinets/{className}/`)

```typescript
// tsh_700_500_250.ts
export class tsh_700_500_250 extends CabinetBase {
  async assemble(options): Promise<THREE.Group> {
    // Загрузка GLB, сборка компонентов
  }
}
```

### 3. Стратегии монтажа (`MountingStrategies.ts`)
- `DINRailStrategy` — монтаж на DIN-рейки
- `RackUnitStrategy` — монтаж в 19" стойки  
- `MountingPlateStrategy` — монтаж на плату

### 4. EventBus (связь React ↔ Three.js)

```typescript
import { eventBus, ConfiguratorEvents } from '@/three/events/EventBus';

eventBus.emit(ConfiguratorEvents.CABINET_LOADED, { id: 'cabinet_main' });
eventBus.on(ConfiguratorEvents.EQUIPMENT_ADDED, handler);
```

### 5. Глобальные объекты для отладки (DevTools)

```typescript
window.scene           // THREE.Scene
window.cabinetManager  // CabinetManager
window.equipmentManager // EquipmentManager
```

---

## Добавление нового шкафа

1. Создать папку `resources/frontend/three/cabinets/{className}/`
2. Добавить `{className}.ts` (extends CabinetBase) и `config.js`
3. Добавить запись в `cabinets-catalog.ts`
4. Положить GLB-модель в `public/assets/models/...`

---

## Конфигуратор (React Wizard)

Конфиг шагов в `config/ThermalCabinetConfig.ts`:

```typescript
{
  steps: [
    { id: 'power', title: '...', required: true, options: [...] },
    { id: 'breakers', showWhen: { step: 'power', condition: 'any' }, ... },
  ],
  continueButton: { route: '/configurator', passParamsAs: 'query' }
}
```

Хук `useConfiguratorState` управляет:
- `selections` — выбранные опции
- `visibleSteps` — шаги, видимые по условиям
- `isValid` — все required шаги заполнены

---

## Ограничения

### ❌ НЕ делать
- НЕ редактировать миграции после `php artisan migrate` (создавать новые)
- НЕ коммитить `.env`
- НЕ использовать React StrictMode (ломает Three.js)
- НЕ использовать `any` типы — использовать `unknown` + type guards

### ✅ Всегда делать
- `npm run build` перед деплоем
- Очистка кеша: `php artisan config:clear`
- Документация в `docs/` (не в корне)
- `php artisan make:*` для контроллеров/моделей/миграций

---

## Отладка

### 3D-сцена не загружается
```javascript
// DevTools Console
window.scene?.children.length  // Должно быть > 0
window.cabinetManager?.getActiveCabinet()
```

### Vite HMR не работает
- Проверить `public/hot` существует
- Vite на порту 5174 запущен
- Laravel видит Vite через `@vite` директиву в Blade

### TypeScript типы не находятся
- Проверить `@/` alias в `vite.config.ts` → `resources/frontend/`
- `tsconfig.json` → `paths`

---

## Документация в `docs/`

| Файл | Описание |
|------|----------|
| `QUICKSTART.md` | Быстрый старт |
| `DEPLOYMENT.md` | Деплой на production |
| `PARAMETRIC_SCALING_RULES.md` | Правила масштабирования GLB-моделей |
| `EQUIPMENT_LOADING_ARCHITECTURE.md` | Архитектура загрузки оборудования |

**Важно**: Новую документацию размещайте в `docs/`, не в корне.
