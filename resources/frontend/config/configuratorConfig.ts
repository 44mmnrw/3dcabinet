import type { ConfiguratorConfig } from '@/types/configurator';

/**
 * Конфигурация конфигуратора шкафа
 * Основано на спецификации: docs/configurator/CONFIGURATOR_LOGIC_README.md
 */
export const configuratorConfig: ConfiguratorConfig = {
  steps: [
    {
      id: 'location',
      title: 'Место установки шкафа',
      description: 'Выберите, где будет установлен шкаф',
      required: true,
      options: [
        {
          value: 'indoor',
          label: 'В помещении',
          description: 'Серверная, ЦОД, офис',
          icon: 'icon-house',
          params: {
            environment: 'indoor',
            protection: 'standard',
          },
        },
        {
          value: 'outdoor',
          label: 'На улице',
          description: 'Дождь, снег, гроза',
          icon: 'icon-cloud',
          params: {
            environment: 'outdoor',
            protection: 'ip65',
          },
        },
      ],
    },
    {
      id: 'installation',
      title: 'Тип установки',
      description: 'Выберите способ установки шкафа',
      required: true,
      showWhen: {
        step: 'location',
        condition: 'any',
      },
      options: [
        {
          value: 'floor',
          label: 'Напольный',
          description: 'Стационарная установка',
          icon: 'icon-box',
          params: {
            installationType: 'floor',
            mounting: 'stationary',
          },
        },
        {
          value: 'wall',
          label: 'Настенный',
          description: 'Крепление на стене или опоре',
          icon: 'icon-on-wall',
          params: {
            installationType: 'wall',
            mounting: 'wall-mounted',
          },
        },
      ],
    },
    {
      id: 'size',
      title: 'Размер шкафа',
      description: 'Выберите размер шкафа',
      required: true,
      showWhen: {
        step: 'installation',
        condition: 'any',
      },
      options: [
        {
          value: 'small',
          label: 'Малый',
          description: '42U, 600x600',
          icon: 'icon-box',
          params: {
            units: 42,
            width: 600,
            depth: 600,
          },
        },
        {
          value: 'medium',
          label: 'Средний',
          description: '45U, 700x700',
          icon: 'icon-box',
          params: {
            units: 45,
            width: 700,
            depth: 700,
          },
        },
        {
          value: 'large',
          label: 'Большой',
          description: '47U, 800x1000',
          icon: 'icon-box',
          params: {
            units: 47,
            width: 800,
            depth: 1000,
          },
        },
      ],
      conflictRules: [
        {
          condition: {
            location: 'outdoor',
            installation: 'wall',
            value: 'large',
          },
          conflict: {
            id: 'large-wall-outdoor',
            type: 'incompatibility',
            message:
              'Конфигурация не совместима: Большие настенные шкафы на улице требуют дополнительного крепления',
            severity: 'error',
            affectedSteps: ['location', 'installation', 'size'],
            resolution: {
              type: 'branch',
              options: [
                {
                  id: 'change-size',
                  label: 'Изменить размер на средний',
                  description: 'Автоматически изменит размер на 45U',
                  action: 'modifySelection',
                  modifications: {
                    size: {
                      value: 'medium',
                      label: 'Средний',
                      params: {
                        units: 45,
                        width: 700,
                        depth: 700,
                      },
                    },
                  },
                },
                {
                  id: 'change-installation',
                  label: 'Изменить тип установки на напольный',
                  description: 'Автоматически изменит тип установки',
                  action: 'modifySelection',
                  modifications: {
                    installation: {
                      value: 'floor',
                      label: 'Напольный',
                      params: {
                        installationType: 'floor',
                        mounting: 'stationary',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  ],
  progress: {
    showStepLabel: true,
    animationDuration: 300,
  },
  continueButton: {
    route: '/configurator',
    passParamsAs: 'query',
    enabledClass: 'blue-button',
    disabledClass: 'disabled-button',
  },
  animations: {
    showStep: {
      duration: 300,
      easing: 'ease',
    },
    progressBar: {
      duration: 300,
      easing: 'ease',
    },
  },
  validation: {
    validateBeforeNext: true,
    showErrors: true,
    useLogicEngine: false, // Пока отключено, будет добавлено позже
    eventBusIntegration: false,
  },
  navigation: {
    allowBackNavigation: true,
    showBackButton: true,
    backButtonLabel: '← Назад',
    clearFutureOnBack: true,
  },
  conflictResolution: {
    enableBranching: true,
    showConflictMessage: true,
    conflictMessage: 'Конфигурация не совместима',
    autoDetectConflicts: true,
    allowManualResolution: true,
  },
  storage: {
    saveToLocalStorage: true,
    storageKey: 'cabinet-configurator-state',
    restoreOnLoad: true,
    draftStorage: {
      enabled: true,
      storageKey: 'cabinet-configurator-draft',
      autoSave: true,
      autoSaveInterval: 30000,
    },
  },
};

