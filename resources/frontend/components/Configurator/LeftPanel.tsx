import React, { useState } from 'react';
import type { Step, ConfiguratorState } from '@/types/configurator';
import { useCabinetController } from '@/hooks/useCabinetController';
import './LeftPanel.css';

export type CabinetCategory = 'thermal' | 'telecom-wall' | 'telecom-floor';

interface LeftPanelProps {
  steps?: Step[];
  state?: ConfiguratorState;
  onStepClick?: (stepIndex: number) => void;
  onCategoryChange?: (category: CabinetCategory | null) => void;
  onAssemblyTypeClick?: (assemblyTypeId: string) => void;
  showProgress?: boolean;
  managers?: any; // Managers для работы с 3D сценой
  managersRef?: React.RefObject<any>;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  steps: _steps,
  state: _state,
  onStepClick: _onStepClick,
  onCategoryChange,
  onAssemblyTypeClick,
  managers,
  managersRef,
}) => {
  // Универсальный контроллер шкафа
  const cabinet = useCabinetController(managers, managersRef);
  
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

  // Обработчик загрузки/удаления шкафа (через универсальный контроллер)
  const handleToggleTestModel = async () => {
    try {
      await cabinet.toggleCabinet('tshm');
    } catch (error) {
      console.error('❌ Ошибка при загрузке/удалении шкафа:', error);
      alert(`⚠️ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    }
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

        {/* Кнопки оборудования */}
        <div className="equipment-section" style={{ marginTop: '16px', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#2c3e50' }}>
            🔌 Оборудование
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="equipment-button"
              onClick={async () => {
                const m = managersRef?.current || managers;
                if (!m?.equipment) {
                  console.error('❌ EquipmentManager не инициализирован');
                  alert('⚠️ Менеджер оборудования не найден. Убедитесь, что 3D сцена загружена.');
                  return;
                }
                
                try {
                  const equipmentId = await m.equipment.addEquipment('circuit_breaker');
                  if (equipmentId) {
                    console.log(`✅ Оборудование добавлено: ${equipmentId}`);
                  } else {
                    console.error('❌ Не удалось добавить оборудование');
                    alert('⚠️ Не удалось добавить оборудование. Убедитесь, что шкаф загружен.');
                  }
                } catch (error) {
                  console.error('❌ Ошибка при добавлении оборудования:', error);
                  alert(`⚠️ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2980b9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3498db';
              }}
            >
              ⚡ Автоматический выключатель
            </button>
            
            <button
              className="equipment-button"
              onClick={async () => {
                const m = managersRef?.current || managers;
                if (!m?.equipment) {
                  console.error('❌ EquipmentManager не инициализирован');
                  alert('⚠️ Менеджер оборудования не найден. Убедитесь, что 3D сцена загружена.');
                  return;
                }
                
                try {
                  const equipmentId = await m.equipment.addEquipment('socket_g');
                  if (equipmentId) {
                    console.log(`✅ Оборудование добавлено: ${equipmentId}`);
                  } else {
                    console.error('❌ Не удалось добавить оборудование');
                    alert('⚠️ Не удалось добавить оборудование. Убедитесь, что шкаф загружен.');
                  }
                } catch (error) {
                  console.error('❌ Ошибка при добавлении оборудования:', error);
                  alert(`⚠️ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#229954';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#27ae60';
              }}
            >
              🔌 Розетка 220В
            </button>
          </div>
        </div>

        {/* Кнопка загрузки/удаления шкафа */}
      <div className="left-panel-footer">
        <button
          className={`toggle-cabinet-button test-model-button ${cabinet.isLoaded ? 'loaded' : ''}`}
          onClick={handleToggleTestModel}
          title="Загрузить/удалить шкаф"
        >
          {cabinet.isLoaded ? '🗑️ Удалить шкаф' : '📦 Загрузить шкаф'}
        </button>
        
        {/* Управление шкафом */}
        {cabinet.isLoaded && (
          <div className="material-controls" style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            {/* Вращение двери */}
            <div>
              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>🚪 Вращение двери</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', minWidth: '65px', color: '#9b59b6' }}>Угол Y:</label>
                <input 
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={cabinet.doorRotation}
                  onChange={(e) => cabinet.setDoorRotation(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>{cabinet.doorRotation}°</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => cabinet.closeDoor()}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '12px', 
                    background: '#ecf0f1', 
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Закрыто (0°)
                </button>
                <button
                  onClick={() => cabinet.openDoor()}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '12px', 
                    background: '#ecf0f1', 
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Открыто (90°)
                </button>
              </div>
            </div>
            
            {/* Отображение граней */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>🔲 Грани модели</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox"
                    checked={cabinet.showEdges}
                    onChange={(e) => cabinet.setShowEdges(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>Показать грани (edges)</span>
                </label>
              </div>
              
              <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                Отображает рёбра геометрии с углом &gt; 15°
              </div>
            </div>
            
            {/* === ПАРАМЕТРИЧЕСКИЙ РЕСАЙЗ === */}
            {cabinet.originalSize && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
                <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>📐 Параметрический ресайз</div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                  Оригинал: {Math.round(cabinet.originalSize.x)}×{Math.round(cabinet.originalSize.y)}×{Math.round(cabinet.originalSize.z)} мм
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#e74c3c' }}>Ширина:</label>
                  <input 
                    type="range"
                    min={Math.round(cabinet.originalSize.x * 0.5)}
                    max={Math.round(cabinet.originalSize.x * 1.5)}
                    step="10"
                    value={cabinet.currentSize.width}
                    onChange={(e) => cabinet.setWidth(parseInt(e.target.value, 10))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinet.currentSize.width} мм</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#27ae60' }}>Высота:</label>
                  <input 
                    type="range"
                    min={Math.round(cabinet.originalSize.y * 0.5)}
                    max={Math.round(cabinet.originalSize.y * 1.5)}
                    step="10"
                    value={cabinet.currentSize.height}
                    onChange={(e) => cabinet.setHeight(parseInt(e.target.value, 10))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinet.currentSize.height} мм</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#3498db' }}>Глубина:</label>
                  <input 
                    type="range"
                    min={Math.round(cabinet.originalSize.z * 0.5)}
                    max={Math.round(cabinet.originalSize.z * 1.5)}
                    step="10"
                    value={cabinet.currentSize.depth}
                    onChange={(e) => cabinet.setDepth(parseInt(e.target.value, 10))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinet.currentSize.depth} мм</span>
                </div>
                
                <button
                  onClick={() => cabinet.resetSize()}
                  style={{ 
                    marginTop: '8px', 
                    padding: '6px 16px', 
                    fontSize: '12px', 
                    background: '#3498db', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Сбросить размеры
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;