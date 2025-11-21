import React, { useState } from 'react';
import type { Step, ConfiguratorState } from '@/types/configurator';
import './LeftPanel.css';

export type CabinetCategory = 'thermal' | 'telecom-wall' | 'telecom-floor';

interface LeftPanelProps {
  steps?: Step[];
  state?: ConfiguratorState;
  onStepClick?: (stepIndex: number) => void;
  onCategoryChange?: (category: CabinetCategory) => void;
  showProgress?: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  steps,
  state,
  onStepClick,
  onCategoryChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<CabinetCategory>('thermal');
  const [activeAssemblyType, setActiveAssemblyType] = useState<string | null>(null);

  const handleCategoryChange = (category: CabinetCategory) => {
    setActiveCategory(category);
    setActiveAssemblyType(null); // Сбрасываем выбор типа сборки при смене категории
    onCategoryChange?.(category);
  };

  const handleAssemblyTypeClick = (type: string) => {
    setActiveAssemblyType(type);
    console.log('Выбран тип сборки:', type);
    // Здесь будет логика обработки выбора типа сборки
  };

  const categories = [
    { id: 'thermal' as CabinetCategory, label: 'Термошкафы', icon: 'icon-box' },
    { id: 'telecom-wall' as CabinetCategory, label: 'Настенные телеком', icon: 'icon-box' },
    { id: 'telecom-floor' as CabinetCategory, label: 'Напольные телеком', icon: 'icon-box' },
  ];

  const assemblyTypes = [
    { id: 'linear', label: 'Линейная сборка', icon: 'icon-box' },
    { id: 'modular', label: 'Модульная сборка', icon: 'icon-box' },
    { id: 'standard', label: 'Типовые решения', icon: 'icon-box' },
  ];

  return (
    <div className="configurator-left-panel">
      <div className="left-panel-header">
        <h2 className="left-panel-title">Конфигуратор шкафов</h2>
        <p className="left-panel-description">Настройте параметры вашего шкафа</p>
      </div>

      <div className="left-panel-content">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`tab-button ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category.id)}
              title={category.label}
            >
              <div className="tab-button-icon-container">
                <svg className="tab-button-icon category-tab-icon" preserveAspectRatio="xMidYMid meet">
                  <use xlinkHref={`#${category.icon}`} />
                </svg>
              </div>
              <span className="tab-button-label category-tab-label" lang="ru">{category.label}</span>
            </button>
          ))}
        </div>

        {activeCategory === 'thermal' && (
          <div className="category-content">
            <div className="assembly-type-buttons">
              {assemblyTypes.map((type) => (
                <button
                  key={type.id}
                  className={`tab-button ${activeAssemblyType === type.id ? 'active' : ''}`}
                  onClick={() => handleAssemblyTypeClick(type.id)}
                >
                  <div className="tab-button-icon-container">
                    <svg className="tab-button-icon assembly-type-icon" preserveAspectRatio="xMidYMid meet">
                      <use xlinkHref={`#${type.icon}`} />
                    </svg>
                  </div>
                  <span className="tab-button-label assembly-type-label" lang="ru">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'telecom-wall' && (
          <div className="category-content">
            <div className="category-placeholder">
              <p>Контент для настенных телеком шкафов</p>
            </div>
          </div>
        )}

        {activeCategory === 'telecom-floor' && (
          <div className="category-content">
            <div className="category-placeholder">
              <p>Контент для напольных телеком шкафов</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;

