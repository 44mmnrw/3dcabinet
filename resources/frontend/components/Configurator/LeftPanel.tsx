import React, { useState } from 'react';
import type { Step, ConfiguratorState } from '@/types/configurator';
import './LeftPanel.css';

export type CabinetCategory = 'thermal' | 'telecom-wall' | 'telecom-floor';

interface LeftPanelProps {
  steps?: Step[];
  state?: ConfiguratorState;
  onStepClick?: (stepIndex: number) => void;
  onCategoryChange?: (category: CabinetCategory | null) => void;
  onAssemblyTypeClick?: (assemblyTypeId: string) => void;
  showProgress?: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  steps,
  state,
  onStepClick,
  onCategoryChange,
  onAssemblyTypeClick,
}) => {
  // По умолчанию никакая категория не выбрана
  const [activeCategory, setActiveCategory] = useState<CabinetCategory | null>(null);
  const [activeAssemblyType, setActiveAssemblyType] = useState<string | null>(null);
  const [showAssemblyTypes, setShowAssemblyTypes] = useState(false);

  const handleCategoryChange = (category: CabinetCategory) => {
    // Если кликнули на ту же категорию - скрываем assemblyTypes
    if (activeCategory === category && showAssemblyTypes) {
      setActiveCategory(null);
      setShowAssemblyTypes(false);
      setActiveAssemblyType(null);
      onCategoryChange?.(null);
      return;
    }
    
    setActiveCategory(category);
    setActiveAssemblyType(null); // Сбрасываем выбор типа сборки при смене категории
    setShowAssemblyTypes(true); // Показываем кнопки assemblyTypes
    onCategoryChange?.(category);
  };

  const handleAssemblyTypeClick = (type: string) => {
    setActiveAssemblyType(type);
    console.log('Выбран тип сборки:', type);
    // Вызываем колбэк из родительского компонента
    onAssemblyTypeClick?.(type);
  };

  const categories = [
    { id: 'thermal' as CabinetCategory, label: 'Термошкафы', icon: 'icon-box' },
    { id: 'telecom-wall' as CabinetCategory, label: 'Настенные телеком', icon: 'icon-box' },
    { id: 'telecom-floor' as CabinetCategory, label: 'Напольные телеком', icon: 'icon-box' },
  ];

  // Определяем assemblyTypes для каждой категории (можно расширять в будущем)
  const assemblyTypesMap: Record<CabinetCategory, Array<{ id: string; label: string; icon: string }>> = {
    'thermal': [
      { id: 'linear', label: 'Линейная сборка', icon: 'icon-box' },
      { id: 'modular', label: 'Модульная сборка', icon: 'icon-box' },
      { id: 'standard', label: 'Типовые решения', icon: 'icon-box' },
    ],
    'telecom-wall': [], // Пока нет assemblyTypes для настенных телеком
    'telecom-floor': [], // Пока нет assemblyTypes для напольных телеком
  };

  // Получить assemblyTypes для выбранной категории
  const getAssemblyTypesForCategory = (category: CabinetCategory | null): Array<{ id: string; label: string; icon: string }> => {
    if (!category) return [];
    return assemblyTypesMap[category] || [];
  };

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
              className={`tab-button category-${category.id} ${activeCategory === category.id ? 'active' : ''}`}
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

        {/* Кнопки assemblyTypes появляются только при выборе категории */}
        {showAssemblyTypes && activeCategory && (
          <div className={`category-content assembly-types-container ${showAssemblyTypes ? 'visible' : ''}`}>
            {getAssemblyTypesForCategory(activeCategory).length > 0 ? (
              <div className="assembly-type-buttons">
                {getAssemblyTypesForCategory(activeCategory).map((type) => (
                  <button
                    key={type.id}
                    className={`tab-button assembly-${type.id} ${activeAssemblyType === type.id ? 'active' : ''}`}
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
            ) : (
              <div className="category-placeholder">
                <p>Контент для {activeCategory === 'telecom-wall' ? 'настенных телеком' : activeCategory === 'telecom-floor' ? 'напольных телеком' : 'шкафов'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;

