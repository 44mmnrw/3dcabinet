import React, { useState } from 'react';
import type { Step, ConfiguratorState } from '@/types/configurator';
import { getAssetLoader } from '@/three/loaders/AssetLoader';
import * as THREE from 'three';
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
  // По умолчанию никакая категория не выбрана
  const [activeCategory, setActiveCategory] = useState<CabinetCategory | null>(null);
  const [activeAssemblyType, setActiveAssemblyType] = useState<string | null>(null);
  const [showAssemblyTypes, setShowAssemblyTypes] = useState(false);
  const [cabinetLoaded, setCabinetLoaded] = useState(false); // Состояние загрузки модели
  
  // Стейт для тестовой модели
  const [testModelLoaded, setTestModelLoaded] = useState(false);
  const [testModelObject, setTestModelObject] = useState<THREE.Object3D | null>(null);
  
  // Стейт для управления материалом тестовой модели
  const [modelColor, setModelColor] = useState('#97a3db'); // Голубоватый по умолчанию
  const [modelOpacity, setModelOpacity] = useState(1.0);
  const [showEdges, setShowEdges] = useState(false); // Показывать рёбра
  const [edgeLines, setEdgeLines] = useState<THREE.LineSegments[]>([]); // Массив линий рёбер
  const [edgeColor, setEdgeColor] = useState('#666666'); // Цвет рёбер (серый по умолчанию)
  
  // Стейт для масштабирования модели по осям
  const [scaleX, setScaleX] = useState(1.0);
  const [scaleY, setScaleY] = useState(1.0);
  const [scaleZ, setScaleZ] = useState(1.0);
  
  // Стейт для вращения двери (DOOR_SET)
  const [doorRotation, setDoorRotation] = useState(0); // Угол в градусах (0-120)

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

  // Обработчик добавления/удаления модели tsh_700_500_250
  const handleToggleCabinet = async () => {
    const m = managersRef?.current || managers;
    
    if (!m?.cabinet) {
      console.error('❌ CabinetManager не инициализирован');
      return;
    }

    try {
      if (cabinetLoaded) {
        // Удалить шкаф
        const cabinets = m.cabinet.getAllCabinets();
        if (cabinets.length > 0) {
          const cabinetId = cabinets[0].id;
          m.cabinet.removeCabinet(cabinetId);
          setCabinetLoaded(false);
        }
      } else {
        // Добавить шкаф
        await m.cabinet.loadCatalog();
        await m.cabinet.addCabinetById('tsh_800_600_260');
        setCabinetLoaded(true);
      }
    } catch (error) {
      console.error('❌ Ошибка при добавлении/удалении шкафа:', error);
    }
  };

  // Обработчик загрузки/удаления тестовой модели test.gltf
  const handleToggleTestModel = async () => {
    const scene = (window as any).scene as THREE.Scene | undefined;
    
    if (!scene) {
      console.error('❌ Сцена не найдена в window.scene');
      return;
    }

    try {
      if (testModelLoaded && testModelObject) {
        // Удалить тестовую модель
        // Сначала очистить линии рёбер
        edgeLines.forEach(line => {
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
        });
        setEdgeLines([]);
        setShowEdges(false);
        
        scene.remove(testModelObject);
        testModelObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        setTestModelObject(null);
        setTestModelLoaded(false);
        console.log('✅ Тестовая модель удалена');
      } else {
        // Загрузить тестовую модель
        console.log('📦 Загрузка test.gltf...');
        const loader = getAssetLoader();
        const model = await loader.load('/assets/models/freecad/webGL/test.gltf');
        
        // Вычислить bounding box и установить модель на "пол"
        const box = new THREE.Box3().setFromObject(model);
        const minY = box.min.y;
        if (minY < 0) {
          model.position.y -= minY; // Поднять модель так, чтобы низ был на y=0
        }
        
        scene.add(model);
        setTestModelObject(model);
        setTestModelLoaded(true);
        console.log('✅ Тестовая модель загружена:', model);
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке/удалении тестовой модели:', error);
    }
  };

  // Обработчик изменения цвета модели
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setModelColor(color);
    
    if (testModelObject) {
      testModelObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (mat && 'color' in mat) {
              (mat as THREE.MeshStandardMaterial).color.setStyle(color);
            }
          });
        }
      });
    }
  };

  // Обработчик изменения прозрачности модели
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    setModelOpacity(opacity);
    
    if (testModelObject) {
      testModelObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (mat) {
              mat.transparent = opacity < 1.0;
              mat.opacity = opacity;
              mat.needsUpdate = true;
            }
          });
        }
      });
    }
  };

  // Обработчик переключения отображения рёбер
  const handleToggleEdges = (e: React.ChangeEvent<HTMLInputElement>) => {
    const show = e.target.checked;
    setShowEdges(show);
    
    if (testModelObject) {
      if (show && edgeLines.length === 0) {
        // Создать рёбра для всех мешей
        const newEdgeLines: THREE.LineSegments[] = [];
        testModelObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 30); // 30° угол
            const edgeMaterial = new THREE.LineBasicMaterial({ 
              color: edgeColor,
              linewidth: 1 // WebGL ограничение - всегда 1px
            });
            const lineSegments = new THREE.LineSegments(edgesGeometry, edgeMaterial);
            mesh.add(lineSegments); // Добавляем как дочерний объект меша
            newEdgeLines.push(lineSegments);
          }
        });
        setEdgeLines(newEdgeLines);
        console.log(`✅ Добавлено ${newEdgeLines.length} линий рёбер`);
      } else {
        // Переключить видимость существующих рёбер
        edgeLines.forEach(line => {
          line.visible = show;
        });
      }
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

      {/* Кнопка добавления/удаления модели tsh_700_500_250 */}
      <div className="left-panel-footer">
        <button
          className={`toggle-cabinet-button ${cabinetLoaded ? 'loaded' : ''}`}
          onClick={handleToggleCabinet}
          disabled={!managers && !managersRef?.current}
        >
          {cabinetLoaded ? '🗑️ Удалить шкаф' : '➕ Загрузить шкаф TSH 700×500×250'}
        </button>
        <button
          className={`toggle-cabinet-button test-model-button ${testModelLoaded ? 'loaded' : ''}`}
          onClick={handleToggleTestModel}
          title="Загрузить тестовую модель test.gltf"
        >
          {testModelLoaded ? '🗑️ Удалить test.gltf' : '📦 Загрузить test.gltf'}
        </button>
        
        {/* Управление материалом тестовой модели */}
        {testModelLoaded && (
          <div className="material-controls" style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>🎨 Материал модели</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', minWidth: '50px' }}>Цвет:</label>
              <input 
                type="color" 
                value={modelColor}
                onChange={handleColorChange}
                style={{ width: '40px', height: '28px', border: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>{modelColor}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', minWidth: '50px' }}>Opacity:</label>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={modelOpacity}
                onChange={handleOpacityChange}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>{(modelOpacity * 100).toFixed(0)}%</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={showEdges}
                  onChange={handleToggleEdges}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Показать грани
              </label>
              <input 
                type="color" 
                value={edgeColor}
                onChange={(e) => {
                  const color = e.target.value;
                  setEdgeColor(color);
                  edgeLines.forEach(line => {
                    (line.material as THREE.LineBasicMaterial).color.setStyle(color);
                  });
                }}
                style={{ width: '28px', height: '20px', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                title="Цвет граней"
              />
            </div>
            
            {/* Масштабирование по осям */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>📐 Масштаб (Scale)</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', minWidth: '65px', color: '#e74c3c' }}>X (ширина):</label>
                <input 
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={scaleX}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setScaleX(val);
                    if (testModelObject) testModelObject.scale.x = val;
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>{scaleX.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', minWidth: '65px', color: '#27ae60' }}>Y (высота):</label>
                <input 
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={scaleY}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setScaleY(val);
                    if (testModelObject) testModelObject.scale.y = val;
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>{scaleY.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', minWidth: '65px', color: '#3498db' }}>Z (глубина):</label>
                <input 
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={scaleZ}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setScaleZ(val);
                    if (testModelObject) testModelObject.scale.z = val;
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>{scaleZ.toFixed(2)}</span>
              </div>
              
              <button
                onClick={() => {
                  setScaleX(1.0);
                  setScaleY(1.0);
                  setScaleZ(1.0);
                  if (testModelObject) {
                    testModelObject.scale.set(1, 1, 1);
                  }
                }}
                style={{ 
                  marginTop: '6px', 
                  padding: '4px 12px', 
                  fontSize: '12px', 
                  background: '#ecf0f1', 
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Сбросить масштаб
              </button>
            </div>
            
            {/* Вращение двери (DOOR_SET) */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>🚪 Вращение двери</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', minWidth: '65px', color: '#9b59b6' }}>Угол Y:</label>
                <input 
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={doorRotation}
                  onChange={(e) => {
                    const angle = parseFloat(e.target.value);
                    setDoorRotation(angle);
                    if (testModelObject) {
                      // Найти DOOR_SET по имени
                      const doorSet = testModelObject.getObjectByName('DOOR_SET');
                      if (doorSet) {
                        // Преобразуем градусы в радианы и вращаем вокруг Y
                        doorSet.rotation.y = (angle * Math.PI) / 180;
                      } else {
                        console.warn('⚠️ DOOR_SET не найден в модели');
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>{doorRotation}°</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setDoorRotation(0);
                    if (testModelObject) {
                      const doorSet = testModelObject.getObjectByName('DOOR_SET');
                      if (doorSet) doorSet.rotation.y = 0;
                    }
                  }}
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
                  onClick={() => {
                    setDoorRotation(90);
                    if (testModelObject) {
                      const doorSet = testModelObject.getObjectByName('DOOR_SET');
                      if (doorSet) doorSet.rotation.y = Math.PI / 2;
                    }
                  }}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;

