import React, { useEffect, useRef, useState } from 'react';
import type { ConfiguratorConfig, ConfiguratorState, StepOption } from '@/types/configurator';
import { LeftPanel, RightPanel, StepContainer } from './index';
import Scene3DContainer from '../Scene3D/Scene3DContainer';
import './ConfiguratorWizard.css';

// Импорт initializeManagers из TypeScript модуля
import { initializeManagers } from '../../three/managers/init';
import type { ManagersInitResult } from '../../three/types/managers.types';

interface ConfiguratorWizardProps {
  config: ConfiguratorConfig;
  state: ConfiguratorState;
  onStepClick?: (stepIndex: number) => void;
  onSelectOption?: (stepId: string, option: StepOption) => void;
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * Главный компонент конфигуратора
 * Объединяет левую и правую боковые панели с 3D сценой в центре
 */
const ConfiguratorWizard: React.FC<ConfiguratorWizardProps> = ({
  config,
  state,
  onStepClick,
  onSelectOption,
  onBack,
  onContinue,
}) => {
  const [managers, setManagers] = useState<ManagersInitResult | null>(null);
  const [showStepOverlay, setShowStepOverlay] = useState(false);
  const managersRef = useRef<ManagersInitResult | null>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);

  // Вычисляем видимые шаги и текущий шаг ДО использования в useEffect
  const visibleStepsList = config.steps.filter((step) =>
    state.visibleSteps.includes(step.id)
  );
  
  // currentStep в state - это индекс в массиве всех шагов config.steps
  // Нужно найти соответствующий шаг в видимых шагах
  const currentStepInAllSteps = config.steps[state.currentStep];
  const currentStep = currentStepInAllSteps && state.visibleSteps.includes(currentStepInAllSteps.id)
    ? currentStepInAllSteps
    : visibleStepsList[0] || null; // Если текущий шаг не виден, берем первый видимый
  
  const currentSelection = currentStep
    ? state.selections[currentStep.id]
    : undefined;

  // Автоматическое открытие модального окна отключено
  // Конфигуратор открывается только по нажатию кнопки "Линейная сборка" в LeftPanel
  // useEffect(() => {
  //   if (currentStep && !currentSelection) {
  //     // Открываем модальное окно для текущего шага, если он не заполнен
  //     setShowStepOverlay(true);
  //   } else if (currentStep && currentSelection) {
  //     // Если шаг заполнен, проверяем, есть ли следующий незаполненный шаг
  //     const currentStepIndexInVisible = visibleStepsList.findIndex(
  //       (s) => s.id === currentStep.id
  //     );
  //     const nextUnfilledStep = visibleStepsList.find(
  //       (step, index) =>
  //         index > currentStepIndexInVisible && !state.selections[step.id]
  //     );
  //     
  //     if (nextUnfilledStep) {
  //       // Есть следующий незаполненный шаг - оставляем модальное окно открытым
  //       // Оно автоматически переключится на следующий шаг
  //       setShowStepOverlay(true);
  //     } else {
  //       // Все шаги заполнены - закрываем модальное окно
  //       setShowStepOverlay(false);
  //     }
  //   }
  // }, [currentStep, currentSelection, state.visibleSteps, state.selections, config.steps]);

  // Инициализация Three.js менеджеров после монтирования контейнера
  useEffect(() => {
    if (!sceneContainerRef.current) return;

    const initScene = async () => {
      // Ждем следующий кадр, чтобы контейнер точно был в DOM
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      if (!sceneContainerRef.current) return;

      console.log('✅ Инициализация Three.js менеджеров...');
      
      // Устанавливаем ID для контейнера, чтобы init.js мог его найти
      sceneContainerRef.current.id = 'scene-container';
      
      let initializedManagers;
      try {
        initializedManagers = await initializeManagers('scene-container');
        
        if (!initializedManagers) {
          console.error('❌ Не удалось инициализировать менеджеры');
          return;
        }
        
        console.log('✅ Менеджеры инициализированы:', initializedManagers);
      } catch (error) {
        console.error('❌ Ошибка инициализации менеджеров:', error);
        console.error('Stack:', (error as Error).stack);
        return;
      }

      managersRef.current = initializedManagers;
      setManagers(initializedManagers);
      
      // Сохраняем managers в window для отладки (дополнительно к отдельным объектам)
      if (typeof window !== 'undefined') {
        window.managers = initializedManagers;
      }
      
      // Инициализация Drag & Drop
      if (initializedManagers?.initializeDragDrop) {
        initializedManagers.initializeDragDrop();
        console.log('✅ Drag & Drop инициализирован');
      }

      // Автоматическая загрузка шкафа tsh_700_500_250
      if (initializedManagers?.cabinet) {
        try {
          await initializedManagers.cabinet.loadCatalog();
          await initializedManagers.cabinet.addCabinetById('tsh_700_500_250');
          console.log('✅ Шкаф tsh_700_500_250 загружен автоматически');
        } catch (err) {
          console.error('❌ Ошибка автозагрузки шкафа:', err);
        }
      }
    };

    initScene();
  }, []);

  const handleSelectOption = (option: StepOption) => {
    if (currentStep && onSelectOption) {
      onSelectOption(currentStep.id, option);
      // Модальное окно закроется автоматически через useEffect,
      // когда появится следующий шаг или текущий будет заполнен
    }
  };

  // Открытие модального окна (будет вызываться из LeftPanel)
  const openStepModal = () => {
    setShowStepOverlay(true);
  };

  // Закрытие модального окна
  const closeStepModal = () => {
    setShowStepOverlay(false);
  };

  return (
    <div className="configurator-wizard">
      {/* Левая панель: Список шагов и прогресс */}
      <LeftPanel
        steps={config.steps}
        state={state}
        {...(onStepClick !== undefined ? { onStepClick } : {})}
        onCategoryChange={(category) => {
          console.log('Категория изменена:', category);
          // Здесь будет логика переключения категории
        }}
        onAssemblyTypeClick={(assemblyTypeId) => {
          // При клике на кнопку assemblyType открываем модальное окно
          if (assemblyTypeId === 'linear') {
            openStepModal();
          }
        }}
        showProgress={config.progress.showStepLabel}
        managers={managers}
        managersRef={managersRef}
      />

      {/* Центральная область: 3D сцена с overlay для выбора */}
      <div className="configurator-wizard-center">
        {/* 3D сцена Three.js */}
        <div ref={sceneContainerRef} id="scene-container" className="scene-panel" />
        {managers && (
          <Scene3DContainer managers={managers} containerRef={sceneContainerRef} />
        )}

        {/* Overlay с опциями выбора (показывается когда нужно выбрать опцию) */}
        {showStepOverlay && currentStep && (
          <div className="step-overlay">
            <div className="step-overlay-content">
              <StepContainer
                step={currentStep}
                isVisible={true}
                isActive={true}
                {...(currentSelection !== undefined ? { selection: currentSelection } : {})}
                onSelect={handleSelectOption}
              />
              <button
                className="step-overlay-close"
                onClick={closeStepModal}
                title="Скрыть опции (можно продолжить работу с 3D)"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Правая панель: Информация и управление */}
      <RightPanel
        currentStep={currentStep}
        state={state}
        {...(onBack !== undefined ? { onBack } : {})}
        {...(onContinue !== undefined ? { onContinue } : {})}
        showBackButton={config.navigation.showBackButton}
      />
    </div>
  );
};

export default ConfiguratorWizard;

