import React, { useState, useEffect, useRef } from 'react';
import EquipmentCatalog from './Catalog/EquipmentCatalog';
import Scene3DContainer from './Scene3D/Scene3DContainer';
import Controls from './Controls';
import { initializeManagers } from '../three/managers/init.js';

function App() {
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [doorAngle, setDoorAngle] = useState(0);
  const [cabinetLoaded, setCabinetLoaded] = useState(false);
  const managersRef = useRef(null);

  useEffect(() => {
    // Ждём следующего кадра, чтобы #scene-container точно был в DOM
    requestAnimationFrame(async () => {
      console.log('✅ Инициализация Three.js менеджеров через Vite...');
      
      // Инициализация Three.js менеджеров
      managersRef.current = await initializeManagers();
      
      console.log('✅ Менеджеры инициализированы:', managersRef.current);
      
      // Подписка на обновления оборудования
      if (managersRef.current?.equipment) {
        managersRef.current.equipment.onUpdate = (count) => {
          setEquipmentCount(count);
        };
      }
      // DnD теперь управляется через React onMouseDown → DragDropController.onReactMouseDown
    });
  }, []);

  const handleAddEquipment = async (type) => {
    // Проверяем, загружен ли кабинет
    if (!managersRef.current?.cabinet?.getActiveCabinet()) {
      console.warn('⚠️ Сначала загрузите шкаф');
      return;
    }
    
    if (managersRef.current?.equipment) {
      await managersRef.current.equipment.addEquipment(type);
    }
  };

  const handleDoorChange = (angle) => {
    setDoorAngle(angle);
    const radians = -(angle * Math.PI / 180);
    const cabinetData = managersRef.current?.cabinet?.getActiveCabinet();
    if (cabinetData?.instance?.setDoorRotation) {
      cabinetData.instance.setDoorRotation(radians);
    }
  };

  const handleRemoveLast = () => {
    managersRef.current?.equipment?.removeLastEquipment();
  };

  const handleRemoveAll = () => {
    managersRef.current?.equipment?.removeAllEquipment();
  };

  const handleLoadCabinet = async () => {
    if (managersRef.current?.cabinet) {
      try {
        await managersRef.current.cabinet.loadCatalog();
        await managersRef.current.cabinet.addCabinetById('tsh_700_500_250');
        setCabinetLoaded(true);
        
        // Инициализировать UI контроллер (для слайдера двери и кнопок)
        if (window.initCabinetControls) {
          window.initCabinetControls(
            managersRef.current.cabinet,
            managersRef.current.scene.camera,
            managersRef.current.controls
          );
        }
        
        // Drag & Drop инициализация через React — отдельного вызова не требуется
        
        console.log('✅ Шкаф загружен');
      } catch (err) {
        console.error('❌ Ошибка загрузки шкафа:', err);
        alert('Ошибка загрузки шкафа: ' + err.message);
      }
    }
  };

  return (
    <div className="configurator-container">
      {/* Левая панель: Каталог оборудования */}
      <EquipmentCatalog 
        onAdd={handleAddEquipment}
        onLoadCabinet={handleLoadCabinet}
        cabinetLoaded={cabinetLoaded}
        onCardMouseDown={(e) => {
          e.preventDefault();
          managersRef.current?.dragDrop?.onReactMouseDown(e);
        }}
      />

      {/* Центр: 3D сцена */}
      <Scene3DContainer 
        managers={managersRef.current}
        onEquipmentDrop={handleAddEquipment}
      />

      {/* Правая панель: Управление */}
      <Controls
        doorAngle={doorAngle}
        onDoorChange={handleDoorChange}
        equipmentCount={equipmentCount}
        onRemoveAll={handleRemoveAll}
      />
    </div>
  );
}

export default App;
