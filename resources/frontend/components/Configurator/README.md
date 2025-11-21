# Компоненты конфигуратора

Компоненты для левой и правой боковых панелей конфигуратора шкафа.

## Структура

```
Configurator/
├── ConfiguratorWizard.tsx    # Главный компонент-обертка
├── LeftPanel.tsx             # Левая боковая панель (шаги, прогресс)
├── RightPanel.tsx            # Правая боковая панель (информация, управление)
├── ProgressBar.tsx           # Компонент прогресс-бара
├── StepLabel.tsx             # Метка шага (Шаг X из Y)
├── BackButton.tsx            # Кнопка "Назад"
├── ContinueButton.tsx        # Кнопка "Продолжить"
├── ConflictResolver.tsx      # Компонент разрешения конфликтов
└── index.ts                  # Экспорты
```

## Использование

### Базовый пример

```tsx
import { ConfiguratorWizard } from '@/components/Configurator';
import type { ConfiguratorConfig, ConfiguratorState } from '@/types/configurator';

const config: ConfiguratorConfig = {
  steps: [...],
  progress: { showStepLabel: true, animationDuration: 300 },
  continueButton: { route: '/configurator', passParamsAs: 'query', ... },
  // ... остальная конфигурация
};

const state: ConfiguratorState = {
  currentStep: 0,
  selections: {},
  isValid: false,
  visibleSteps: ['step1', 'step2'],
  history: [],
  conflicts: [],
  draftSaved: false,
};

function MyComponent() {
  return (
    <ConfiguratorWizard
      config={config}
      state={state}
      onStepClick={(index) => console.log('Step clicked:', index)}
      onBack={() => console.log('Back')}
      onContinue={() => console.log('Continue')}
    />
  );
}
```

### Использование отдельных компонентов

```tsx
import { LeftPanel, RightPanel } from '@/components/Configurator';

// Левая панель
<LeftPanel
  steps={steps}
  state={state}
  onStepClick={handleStepClick}
  showProgress={true}
/>

// Правая панель
<RightPanel
  currentStep={currentStep}
  state={state}
  onBack={handleBack}
  onContinue={handleContinue}
/>
```

## Стилизация

Все компоненты используют глобальные CSS переменные из `variables.css`:

- `--color-blue` - основной синий цвет
- `--color-blue-dark` - темный синий
- `--color-white` - белый
- `--color-background-2` - фон панелей
- `--color-dark` - темный текст
- `--color-gray` - серый текст
- `--color-light-gray` - светлая граница
- `--spacing-*` - отступы
- `--border-radius-*` - радиусы скругления
- `--transition-duration` - длительность анимаций

## Адаптивность

Компоненты адаптивны и автоматически перестраиваются на мобильных устройствах (< 768px):
- Панели становятся горизонтальными
- Высота ограничивается 40vh
- Сохраняется функциональность

## Типы

Все компоненты используют типы из `@/types/configurator`:
- `ConfiguratorConfig`
- `ConfiguratorState`
- `Step`
- `Conflict`
- и другие

