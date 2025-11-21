import React from 'react';
import type { Step, ConfiguratorState, Conflict } from '@/types/configurator';
import BackButton from './BackButton';
import ContinueButton from './ContinueButton';
import ConflictResolver from './ConflictResolver';
import './RightPanel.css';

interface RightPanelProps {
  currentStep: Step | null;
  state: ConfiguratorState;
  onBack?: () => void;
  onContinue?: () => void;
  showBackButton?: boolean;
  showContinueButton?: boolean;
}

const RightPanel: React.FC<RightPanelProps> = ({
  currentStep,
  state,
  onBack,
  onContinue,
  showBackButton = true,
  showContinueButton = true,
}) => {
  const activeConflict = state.conflicts.find(
    (conflict) =>
      conflict.affectedSteps.includes(currentStep?.id || '') &&
      conflict.severity === 'error'
  );

  const currentSelection = currentStep
    ? state.selections[currentStep.id]
    : null;

  return (
    <div className="configurator-right-panel">
      {/* Заголовок */}
      <div className="right-panel-header">
        <h3 className="right-panel-title">
          {currentStep?.title || 'Информация'}
        </h3>
        {currentStep?.description && (
          <p className="right-panel-description">{currentStep.description}</p>
        )}
      </div>

      {/* Контент панели */}
      <div className="right-panel-content">
        {/* Текущий выбор */}
        {currentSelection && (
          <div className="right-panel-section">
            <h4 className="section-title">Выбранный вариант</h4>
            <div className="selection-card">
              <div className="selection-label">{currentSelection.label}</div>
              {currentSelection.params && (
                <div className="selection-params">
                  {Object.entries(currentSelection.params).map(
                    ([key, value]) => (
                      <div key={key} className="param-item">
                        <span className="param-key">{key}:</span>
                        <span className="param-value">{String(value)}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Конфликты */}
        {activeConflict && (
          <div className="right-panel-section">
            <ConflictResolver
              conflict={activeConflict}
              onResolve={(resolutionId) => {
                // Обработка разрешения конфликта
                console.log('Resolve conflict:', resolutionId);
              }}
            />
          </div>
        )}

        {/* Все конфликты (если есть) */}
        {state.conflicts.length > 0 && !activeConflict && (
          <div className="right-panel-section">
            <h4 className="section-title section-title-warning">
              Обнаружены проблемы
            </h4>
            <div className="conflicts-list">
              {state.conflicts.map((conflict) => (
                <div key={conflict.id} className="conflict-item">
                  <div className="conflict-icon">
                    {conflict.severity === 'error' ? '❌' : '⚠️'}
                  </div>
                  <div className="conflict-message">{conflict.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Информация о шаге */}
        {currentStep && !currentSelection && (
          <div className="right-panel-section">
            <h4 className="section-title">Информация</h4>
            <p className="section-text">
              Выберите один из вариантов слева, чтобы продолжить
              конфигурацию.
            </p>
          </div>
        )}

        {/* Статистика */}
        <div className="right-panel-section">
          <h4 className="section-title">Прогресс</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">
                {Object.keys(state.selections).length}
              </div>
              <div className="stat-label">Выбрано шагов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{state.visibleSteps.length}</div>
              <div className="stat-label">Всего шагов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {state.conflicts.length > 0 ? '⚠️' : '✅'}
              </div>
              <div className="stat-label">Статус</div>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="right-panel-footer">
        {showBackButton && (
          <BackButton
            disabled={state.currentStep === 0}
            onClick={onBack || (() => {})}
            label="← Назад"
          />
        )}
        {showContinueButton && (
          <ContinueButton
            disabled={!state.isValid || state.conflicts.length > 0}
            onClick={onContinue || (() => {})}
            route="/configurator"
          />
        )}
      </div>
    </div>
  );
};

export default RightPanel;

