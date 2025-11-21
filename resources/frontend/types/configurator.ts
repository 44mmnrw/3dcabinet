/**
 * Типы для конфигуратора шкафа
 * Основано на спецификации: docs/configurator/CONFIGURATOR_LOGIC_README.md
 */

/**
 * Вариант выбора на шаге
 */
export interface StepOption {
  value: string;
  label: string;
  description?: string;
  icon: string;
  params: Record<string, any>;
}

/**
 * Условие показа шага
 */
export interface StepShowWhen {
  step: string;
  condition: 'any' | 'specific';
  values?: string[];
}

/**
 * Вариант разрешения конфликта
 */
export interface ConflictResolutionOption {
  id: string;
  label: string;
  description: string;
  action: 'addStep' | 'modifySelection' | 'custom';
  newStep?: Step;
  modifications?: Record<string, StepOption>;
  customAction?: (state: ConfiguratorState) => ConfiguratorState;
}

/**
 * Разрешение конфликта
 */
export interface ConflictResolution {
  type: 'branch' | 'suggestion' | 'auto';
  options?: ConflictResolutionOption[];
  autoFix?: () => void;
}

/**
 * Правило конфликта
 */
export interface ConflictRule {
  condition: Record<string, string | string[]>;
  conflict: Conflict;
}

/**
 * Конфликт несовместимости
 */
export interface Conflict {
  id: string;
  type: 'incompatibility' | 'validation';
  message: string;
  affectedSteps: string[];
  resolution?: ConflictResolution;
  severity: 'error' | 'warning';
}

/**
 * Шаг конфигурации
 */
export interface Step {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  showWhen?: StepShowWhen;
  options: StepOption[];
  conflictRules?: ConflictRule[];
}

/**
 * Выбор пользователя на шаге
 */
export interface Selection {
  value: string;
  label: string;
  params: Record<string, any>;
}

/**
 * Состояние конфигуратора
 */
export interface ConfiguratorState {
  currentStep: number;
  selections: Record<string, Selection>;
  isValid: boolean;
  visibleSteps: string[];
  history: number[];
  conflicts: Conflict[];
  draftSaved: boolean;
  lastSavedAt?: number;
}

/**
 * Настройки прогресс-бара
 */
export interface ProgressConfig {
  showStepLabel: boolean;
  animationDuration: number;
}

/**
 * Настройки кнопки продолжения
 */
export interface ContinueButtonConfig {
  route: string;
  passParamsAs: 'query' | 'session' | 'localStorage';
  enabledClass: string;
  disabledClass: string;
}

/**
 * Настройки анимаций
 */
export interface AnimationConfig {
  showStep: {
    duration: number;
    easing: string;
  };
  progressBar: {
    duration: number;
    easing: string;
  };
}

/**
 * Настройки валидации
 */
export interface ValidationConfig {
  validateBeforeNext: boolean;
  showErrors: boolean;
  useLogicEngine?: boolean;
  eventBusIntegration?: boolean;
}

/**
 * Настройки навигации
 */
export interface NavigationConfig {
  allowBackNavigation: boolean;
  showBackButton: boolean;
  backButtonLabel: string;
  clearFutureOnBack: boolean;
}

/**
 * Настройки разрешения конфликтов
 */
export interface ConflictResolutionConfig {
  enableBranching: boolean;
  showConflictMessage: boolean;
  conflictMessage: string;
  autoDetectConflicts: boolean;
  allowManualResolution: boolean;
}

/**
 * Настройки сохранения черновика
 */
export interface DraftStorageConfig {
  enabled: boolean;
  storageKey: string;
  autoSave: boolean;
  autoSaveInterval: number;
}

/**
 * Настройки хранилища
 */
export interface StorageConfig {
  saveToLocalStorage: boolean;
  storageKey: string;
  restoreOnLoad: boolean;
  draftStorage?: DraftStorageConfig;
}

/**
 * Полная конфигурация конфигуратора
 */
export interface ConfiguratorConfig {
  steps: Step[];
  progress: ProgressConfig;
  continueButton: ContinueButtonConfig;
  animations: AnimationConfig;
  validation: ValidationConfig;
  navigation: NavigationConfig;
  conflictResolution: ConflictResolutionConfig;
  storage: StorageConfig;
}

/**
 * Черновик конфигурации
 */
export interface Draft {
  selections: Record<string, Selection>;
  currentStep: number;
  conflicts: Conflict[];
  savedAt: number;
  version: string;
}

/**
 * Ошибка валидации
 */
export interface ValidationError {
  type: 'power' | 'weight' | 'cooling' | 'compatibility' | 'custom';
  message: string;
  value: number | string;
  available?: number | string;
  suggestion?: string;
}

