import type { ConfiguratorConfig } from '@/types/configurator';

/**
 * Конфигурация конфигуратора термошкафов
 * Основано на спецификации: docs/configurator/DIAGRAM.md
 * 
 * Процесс конфигурации термошкафа:
 * 1. Мощность оборудования
 * 2. Автоматические выключатели (многократное добавление)
 * 3. Точки подключения (многократное добавление)
 * 4. Обогрев (опционально)
 * 5. Вентиляция/охлаждение (опционально)
 * 6. Степень защиты IP
 * 7. Коммутационная панель (опционально)
 * 8. Размер шкафа
 */
export const thermalCabinetConfig: ConfiguratorConfig = {
  steps: [
    {
      id: 'power',
      title: 'Потребляемая мощность оборудования',
      description: 'Укажите диапазон потребляемой мощности оборудования',
      required: true,
      options: [
        {
          value: '0-100',
          label: '0-100 Вт',
          description: 'Низкая мощность',
          icon: 'icon-power',
          params: {
            powerMin: 0,
            powerMax: 100,
            powerRange: 'low',
          },
        },
        {
          value: '101-1000',
          label: '101-1000 Вт',
          description: 'Средняя мощность',
          icon: 'icon-power',
          params: {
            powerMin: 101,
            powerMax: 1000,
            powerRange: 'medium',
          },
        },
        {
          value: '1001-5000',
          label: '1001-5000 Вт',
          description: 'Высокая мощность',
          icon: 'icon-power',
          params: {
            powerMin: 1001,
            powerMax: 5000,
            powerRange: 'high',
          },
        },
      ],
    },
    {
      id: 'breakers',
      title: 'Автоматические выключатели',
      description: 'Укажите тип и количество автоматических выключателей',
      required: true,
      showWhen: {
        step: 'power',
        condition: 'any',
      },
      options: [
        {
          value: 'C6',
          label: 'C6',
          description: 'Автоматический выключатель C6',
          icon: 'icon-breaker',
          params: {
            breakerType: 'C6',
            breakerRating: 6,
          },
        },
        {
          value: 'C10',
          label: 'C10',
          description: 'Автоматический выключатель C10',
          icon: 'icon-breaker',
          params: {
            breakerType: 'C10',
            breakerRating: 10,
          },
        },
        {
          value: 'C16',
          label: 'C16',
          description: 'Автоматический выключатель C16',
          icon: 'icon-breaker',
          params: {
            breakerType: 'C16',
            breakerRating: 16,
          },
        },
        {
          value: 'C25',
          label: 'C25',
          description: 'Автоматический выключатель C25',
          icon: 'icon-breaker',
          params: {
            breakerType: 'C25',
            breakerRating: 25,
          },
        },
        {
          value: 'C32',
          label: 'C32',
          description: 'Автоматический выключатель C32',
          icon: 'icon-breaker',
          params: {
            breakerType: 'C32',
            breakerRating: 32,
          },
        },
      ],
    },
    {
      id: 'sockets',
      title: 'Точки подключения',
      description: 'Укажите тип и количество точек подключения',
      required: true,
      showWhen: {
        step: 'breakers',
        condition: 'any',
      },
      options: [
        {
          value: 'socket',
          label: 'Розетка',
          description: 'Стандартная розетка',
          icon: 'icon-socket',
          params: {
            socketType: 'socket',
            connectionType: 'schuko',
          },
        },
        {
          value: 'clamp',
          label: 'Клемма',
          description: 'Клеммное подключение',
          icon: 'icon-clamp',
          params: {
            socketType: 'clamp',
            connectionType: 'terminal',
          },
        },
      ],
    },
    {
      id: 'heater',
      title: 'Обогрев',
      description: 'Требуется ли обогрев шкафа?',
      required: false,
      showWhen: {
        step: 'sockets',
        condition: 'any',
      },
      options: [
        {
          value: 'none',
          label: 'Не требуется',
          description: 'Обогрев не нужен',
          icon: 'icon-heater-off',
          params: {
            heaterEnabled: false,
          },
        },
        {
          value: 'HTR-100',
          label: 'HTR-100 (100 Вт)',
          description: 'Обогреватель 100 Вт',
          icon: 'icon-heater',
          params: {
            heaterEnabled: true,
            heaterModel: 'HTR-100',
            heaterPower: 100,
          },
        },
        {
          value: 'HTR-200',
          label: 'HTR-200 (200 Вт)',
          description: 'Обогреватель 200 Вт',
          icon: 'icon-heater',
          params: {
            heaterEnabled: true,
            heaterModel: 'HTR-200',
            heaterPower: 200,
          },
        },
        {
          value: 'HTR-500',
          label: 'HTR-500 (500 Вт)',
          description: 'Обогреватель 500 Вт',
          icon: 'icon-heater',
          params: {
            heaterEnabled: true,
            heaterModel: 'HTR-500',
            heaterPower: 500,
          },
        },
      ],
    },
    {
      id: 'ventilation',
      title: 'Вентиляция/охлаждение',
      description: 'Требуется ли вентиляция или охлаждение?',
      required: false,
      showWhen: {
        step: 'heater',
        condition: 'any',
      },
      options: [
        {
          value: 'none',
          label: 'Не требуется',
          description: 'Вентиляция не нужна',
          icon: 'icon-vent-off',
          params: {
            ventilationEnabled: false,
          },
        },
        {
          value: 'axial',
          label: 'Осевой вентилятор',
          description: 'Осевой тип вентиляции',
          icon: 'icon-vent',
          params: {
            ventilationEnabled: true,
            ventilationType: 'axial',
          },
        },
        {
          value: 'centrifugal',
          label: 'Центробежный вентилятор',
          description: 'Центробежный тип вентиляции',
          icon: 'icon-vent',
          params: {
            ventilationEnabled: true,
            ventilationType: 'centrifugal',
          },
        },
      ],
    },
    {
      id: 'ipRating',
      title: 'Степень защиты IP',
      description: 'Выберите степень защиты от пыли и влаги',
      required: true,
      showWhen: {
        step: 'ventilation',
        condition: 'any',
      },
      options: [
        {
          value: 'IP54',
          label: 'IP54',
          description: 'Защита от пыли и брызг воды',
          icon: 'icon-ip',
          params: {
            ipRating: 'IP54',
            protectionLevel: 'standard',
          },
        },
        {
          value: 'IP56',
          label: 'IP56',
          description: 'Защита от пыли и сильных струй воды',
          icon: 'icon-ip',
          params: {
            ipRating: 'IP56',
            protectionLevel: 'enhanced',
          },
        },
        {
          value: 'IP65',
          label: 'IP65',
          description: 'Полная защита от пыли и воды (несовместимо с вентиляцией)',
          icon: 'icon-ip',
          params: {
            ipRating: 'IP65',
            protectionLevel: 'full',
          },
        },
      ],
      conflictRules: [
        {
          condition: {
            ventilation: ['axial', 'centrifugal'],
            value: 'IP65',
          },
          conflict: {
            id: 'ip65-ventilation-conflict',
            type: 'incompatibility',
            message: 'IP65 несовместим с вентиляцией. Выберите IP54/IP56 или откажитесь от вентиляции',
            severity: 'error',
            affectedSteps: ['ventilation', 'ipRating'],
            resolution: {
              type: 'branch',
              options: [
                {
                  id: 'change-ip',
                  label: 'Изменить степень защиты на IP54',
                  description: 'Автоматически изменит степень защиты на IP54',
                  action: 'modifySelection',
                  modifications: {
                    ipRating: {
                      value: 'IP54',
                      label: 'IP54',
                      icon: 'icon-ip',
                      params: {
                        ipRating: 'IP54',
                        protectionLevel: 'standard',
                      },
                    },
                  },
                },
                {
                  id: 'change-ip-56',
                  label: 'Изменить степень защиты на IP56',
                  description: 'Автоматически изменит степень защиты на IP56',
                  action: 'modifySelection',
                  modifications: {
                    ipRating: {
                      value: 'IP56',
                      label: 'IP56',
                      icon: 'icon-ip',
                      params: {
                        ipRating: 'IP56',
                        protectionLevel: 'enhanced',
                      },
                    },
                  },
                },
                {
                  id: 'remove-ventilation',
                  label: 'Отказаться от вентиляции',
                  description: 'Автоматически отключит вентиляцию',
                  action: 'modifySelection',
                  modifications: {
                    ventilation: {
                      value: 'none',
                      label: 'Не требуется',
                      icon: 'icon-vent-off',
                      params: {
                        ventilationEnabled: false,
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
    {
      id: 'commPanel',
      title: 'Коммутационная панель',
      description: 'Требуется ли установка коммутационной панели?',
      required: false,
      showWhen: {
        step: 'ipRating',
        condition: 'any',
      },
      options: [
        {
          value: 'none',
          label: 'Не требуется',
          description: 'Коммутационная панель не нужна',
          icon: 'icon-comm-off',
          params: {
            commPanelEnabled: false,
          },
        },
        {
          value: 'optical',
          label: 'Оптическая панель',
          description: 'Панель с оптическими адаптерами',
          icon: 'icon-comm-optical',
          params: {
            commPanelEnabled: true,
            commPanelType: 'optical',
          },
        },
        {
          value: 'copper',
          label: 'Медная панель',
          description: 'Панель с медными адаптерами',
          icon: 'icon-comm-copper',
          params: {
            commPanelEnabled: true,
            commPanelType: 'copper',
          },
        },
      ],
    },
    {
      id: 'size',
      title: 'Размер шкафа',
      description: 'Выберите габариты шкафа и свободное место на DIN-рейках',
      required: true,
      showWhen: {
        step: 'commPanel',
        condition: 'any',
      },
      options: [
        {
          value: 'small',
          label: 'Малый',
          description: '300×200×150 мм, 200 мм DIN-рейки',
          icon: 'icon-box',
          params: {
            width: 300,
            height: 200,
            depth: 150,
            dinRailSpace: 200,
          },
        },
        {
          value: 'medium',
          label: 'Средний',
          description: '400×300×200 мм, 300 мм DIN-рейки',
          icon: 'icon-box',
          params: {
            width: 400,
            height: 300,
            depth: 200,
            dinRailSpace: 300,
          },
        },
        {
          value: 'large',
          label: 'Большой',
          description: '500×400×250 мм, 400 мм DIN-рейки',
          icon: 'icon-box',
          params: {
            width: 500,
            height: 400,
            depth: 250,
            dinRailSpace: 400,
          },
        },
        {
          value: 'xlarge',
          label: 'Очень большой',
          description: '600×500×300 мм, 500 мм DIN-рейки',
          icon: 'icon-box',
          params: {
            width: 600,
            height: 500,
            depth: 300,
            dinRailSpace: 500,
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
    storageKey: 'thermal-cabinet-configurator-state',
    restoreOnLoad: true,
    draftStorage: {
      enabled: true,
      storageKey: 'thermal-cabinet-configurator-draft',
      autoSave: true,
      autoSaveInterval: 30000,
    },
  },
};

