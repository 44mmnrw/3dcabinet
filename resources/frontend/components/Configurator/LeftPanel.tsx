import React, { useState, useCallback } from 'react';
import type { Step, ConfiguratorState } from '@/types/configurator';
import { getAssetLoader } from '@/three/loaders/AssetLoader';
import * as THREE from 'three';
import './LeftPanel.css';

// Импорт утилит параметрического ресайза
import {
  type NodeOriginalData,
  type ModelOriginalData,
  collectOriginalData,
  applyParametricResize as applyResize,
  hasCustomResizeRules
} from '@/utils/parametricResize';

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
  
  // Стейт для вращения двери (DOOR_SET)
  const [doorRotation, setDoorRotation] = useState(0); // Угол в градусах (0-120)
  
  // Стейт для отображения граней
  const [showEdges, setShowEdges] = useState(false);
  
  // Стейт для параметрического ресайза
  const [cabinetWidth, setCabinetWidth] = useState(800);   // мм
  const [cabinetHeight, setCabinetHeight] = useState(600); // мм
  const [cabinetDepth, setCabinetDepth] = useState(250);   // мм
  const [originalCabinetSize, setOriginalCabinetSize] = useState<THREE.Vector3 | null>(null);
  const [nodesOriginalData, setNodesOriginalData] = useState<Map<string, NodeOriginalData>>(new Map());
  const [modelOriginalData, setModelOriginalData] = useState<ModelOriginalData | null>(null);

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
        
        // === Сохраняем оригинальные данные ДО любых трансформаций ===
        const { nodes: nodesData, model: modelData } = collectOriginalData(model);
        
        const sizeInMm = new THREE.Vector3(
          modelData.size.x * 1000,
          modelData.size.y * 1000,
          modelData.size.z * 1000
        );
        setOriginalCabinetSize(sizeInMm);
        setCabinetWidth(Math.round(sizeInMm.x));
        setCabinetHeight(Math.round(sizeInMm.y));
        setCabinetDepth(Math.round(sizeInMm.z));
        
        // Установить модель на "пол" (ПОСЛЕ сохранения оригинальных данных)
        const minY = modelData.min.y;
        if (minY < 0) {
          model.position.y -= minY;
        }
        setNodesOriginalData(nodesData);
        setModelOriginalData(modelData);
        
        // Логируем узлы с кастомными правилами
        const customNodes = Array.from(nodesData.entries())
          .filter(([_, data]) => hasCustomResizeRules(data.rules));
        console.log(`📊 Сохранены оригинальные данные для ${nodesData.size} узлов (${customNodes.length} с кастомными правилами)`);
        console.log(`📐 Модель: центр (${modelData.center.x.toFixed(4)}, ${modelData.center.y.toFixed(4)}, ${modelData.center.z.toFixed(4)}), размер (${modelData.size.x.toFixed(4)}, ${modelData.size.y.toFixed(4)}, ${modelData.size.z.toFixed(4)})`);
        // === Конец сохранения оригинальных данных ===
        
        scene.add(model);
        setTestModelObject(model);
        setTestModelLoaded(true);
        console.log('✅ Тестовая модель загружена:', model);
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке/удалении тестовой модели:', error);
    }
  };

  // Применить параметрический ресайз ко всем узлам модели
  const handleParametricResize = useCallback((newWidth: number, newHeight: number, newDepth: number) => {
    if (!testModelObject || !originalCabinetSize || !modelOriginalData || nodesOriginalData.size === 0) {
      return;
    }
    
    const newSize = new THREE.Vector3(newWidth, newHeight, newDepth);
    applyResize(testModelObject, nodesOriginalData, modelOriginalData, originalCabinetSize, newSize);
  }, [testModelObject, originalCabinetSize, modelOriginalData, nodesOriginalData]);

  // Обработчики изменения размеров с применением параметрического ресайза
  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCabinetWidth(val);
    handleParametricResize(val, cabinetHeight, cabinetDepth);
  }, [handleParametricResize, cabinetHeight, cabinetDepth]);

  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCabinetHeight(val);
    handleParametricResize(cabinetWidth, val, cabinetDepth);
  }, [handleParametricResize, cabinetWidth, cabinetDepth]);

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCabinetDepth(val);
    handleParametricResize(cabinetWidth, cabinetHeight, val);
  }, [handleParametricResize, cabinetWidth, cabinetHeight]);

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
        
        {/* Управление тестовой моделью */}
        {testModelLoaded && (
          <div className="material-controls" style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            {/* Вращение двери (DOOR_SET) */}
            <div>
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
            
            {/* Отображение граней */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>🔲 Грани модели</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox"
                    checked={showEdges}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setShowEdges(checked);
                      if (testModelObject) {
                        testModelObject.traverse((child) => {
                          if ((child as THREE.Mesh).isMesh) {
                            const mesh = child as THREE.Mesh;
                            
                            // Удаляем существующие грани
                            const existingEdges = mesh.children.find(c => c.type === 'LineSegments');
                            if (existingEdges) {
                              mesh.remove(existingEdges);
                              (existingEdges as THREE.LineSegments).geometry.dispose();
                              ((existingEdges as THREE.LineSegments).material as THREE.Material).dispose();
                            }
                            
                            // Добавляем новые грани если включено
                            if (checked && mesh.geometry) {
                              const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
                              const line = new THREE.LineSegments(
                                edges, 
                                new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
                              );
                              mesh.add(line);
                            }
                          }
                        });
                      }
                    }}
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
            {originalCabinetSize && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
                <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>📐 Параметрический ресайз</div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                  Оригинал: {Math.round(originalCabinetSize.x)}×{Math.round(originalCabinetSize.y)}×{Math.round(originalCabinetSize.z)} мм
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#e74c3c' }}>Ширина:</label>
                  <input 
                    type="range"
                    min={Math.round(originalCabinetSize.x * 0.5)}
                    max={Math.round(originalCabinetSize.x * 1.5)}
                    step="10"
                    value={cabinetWidth}
                    onChange={handleWidthChange}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinetWidth} мм</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#27ae60' }}>Высота:</label>
                  <input 
                    type="range"
                    min={Math.round(originalCabinetSize.y * 0.5)}
                    max={Math.round(originalCabinetSize.y * 1.5)}
                    step="10"
                    value={cabinetHeight}
                    onChange={handleHeightChange}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinetHeight} мм</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', minWidth: '65px', color: '#3498db' }}>Глубина:</label>
                  <input 
                    type="range"
                    min={Math.round(originalCabinetSize.z * 0.5)}
                    max={Math.round(originalCabinetSize.z * 1.5)}
                    step="10"
                    value={cabinetDepth}
                    onChange={handleDepthChange}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: '55px' }}>{cabinetDepth} мм</span>
                </div>
                
                <button
                  onClick={() => {
                    if (originalCabinetSize) {
                      const w = Math.round(originalCabinetSize.x);
                      const h = Math.round(originalCabinetSize.y);
                      const d = Math.round(originalCabinetSize.z);
                      setCabinetWidth(w);
                      setCabinetHeight(h);
                      setCabinetDepth(d);
                      handleParametricResize(w, h, d);
                    }
                  }}
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
                
                {/* Информация о найденных правилах */}
                {nodesOriginalData.size > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Найдено узлов с правилами:</div>
                    {Array.from(nodesOriginalData.entries())
                      .filter(([_, data]) => data.rules.resize_x !== 'scale' || data.rules.resize_y !== 'scale' || data.rules.resize_z !== 'scale')
                      .map(([name, data]) => (
                        <div key={name} style={{ padding: '2px 0', borderBottom: '1px solid #eee' }}>
                          <strong>{name}</strong>: {data.rules.resize_x}/{data.rules.resize_y}/{data.rules.resize_z}
                          {data.rules.anchor_x !== 'center' && ` anchor_x:${data.rules.anchor_x}`}
                          {data.rules.anchor_y !== 'bottom' && ` anchor_y:${data.rules.anchor_y}`}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;

