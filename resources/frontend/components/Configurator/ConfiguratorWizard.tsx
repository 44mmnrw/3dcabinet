import React, { useEffect, useRef, useState } from 'react';
import type { ConfiguratorConfig, ConfiguratorState, StepOption } from '@/types/configurator';
import { LeftPanel, RightPanel, StepContainer } from './index';
import Scene3DContainer from '../Scene3D/Scene3DContainer';
import { initializeManagers } from '../../three/managers/init.js';
import './ConfiguratorWizard.css';

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
  const [managers, setManagers] = useState<any>(null);
  const [showStepOverlay, setShowStepOverlay] = useState(true);
  const managersRef = useRef<any>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);

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
      
      const initializedManagers = await initializeManagers('scene-container');
      
      if (!initializedManagers) {
        console.error('❌ Не удалось инициализировать менеджеры');
        return;
      }

      managersRef.current = initializedManagers;
      setManagers(initializedManagers);
      
      // Инициализация Drag & Drop
      if (initializedManagers?.initializeDragDrop) {
        initializedManagers.initializeDragDrop();
        console.log('✅ Drag & Drop инициализирован');
      }

      // Автоматическая загрузка шкафа по умолчанию
      if (initializedManagers?.cabinet) {
        try {
          await initializedManagers.cabinet.loadCatalog();
          await initializedManagers.cabinet.addCabinetById('tsh_700_500_250');
          console.log('✅ Шкаф загружен');
        } catch (err) {
          console.error('❌ Ошибка загрузки шкафа:', err);
        }
      }
    };

    initScene();
  }, []);

  const visibleStepsList = config.steps.filter((step) =>
    state.visibleSteps.includes(step.id)
  );
  
  const currentStepIndex = state.currentStep;
  const currentStep = visibleStepsList[currentStepIndex] || null;
  const currentSelection = currentStep
    ? state.selections[currentStep.id]
    : undefined;

  const handleSelectOption = (option: StepOption) => {
    if (currentStep && onSelectOption) {
      onSelectOption(currentStep.id, option);
      // Скрываем overlay после выбора
      setShowStepOverlay(false);
    }
  };

  // Показываем overlay, если есть незавершенный шаг
  useEffect(() => {
    if (currentStep && !currentSelection) {
      setShowStepOverlay(true);
    }
  }, [currentStep, currentSelection]);

  return (
    <div className="configurator-wizard">
      {/* Левая панель: Список шагов и прогресс */}
      <LeftPanel
        steps={config.steps}
        state={state}
        onStepClick={onStepClick}
        onCategoryChange={(category) => {
          console.log('Категория изменена:', category);
          // Здесь будет логика переключения категории
        }}
        showProgress={config.progress.showStepLabel}
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
                selection={currentSelection}
                onSelect={handleSelectOption}
              />
              <button
                className="step-overlay-close"
                onClick={() => setShowStepOverlay(false)}
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
        onBack={onBack}
        onContinue={onContinue}
        showBackButton={config.navigation.showBackButton}
      />
    </div>
  );
};

export default ConfiguratorWizard;

