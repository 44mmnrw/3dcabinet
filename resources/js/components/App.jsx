import React, { useState, useEffect, useRef } from 'react';
import EquipmentCatalog from './Catalog/EquipmentCatalog';
import Scene3DContainer from './Scene3D/Scene3DContainer';
import Controls from './Controls';

function App() {
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [doorAngle, setDoorAngle] = useState(0);
  const [cabinetLoaded, setCabinetLoaded] = useState(false);
  const managersRef = useRef(null);

  useEffect(() => {
    // Ждём следующего кадра, чтобы #scene-container точно был в DOM
    requestAnimationFrame(async () => {
      // Ожидание загрузки initializeManagers из глобального скрипта
      let attempts = 0;
      while (!window.initializeManagers && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.initializeManagers) {
        console.error('❌ initializeManagers не загружен!');
        return;
      }
      
      console.log('✅ initializeManagers загружен');
      
      // Инициализация Three.js менеджеров
      managersRef.current = await window.initializeManagers();
      
      console.log('✅ Менеджеры инициализированы:', managersRef.current);
      
      // Подписка на обновления оборудования
      if (managersRef.current?.equipment) {
        managersRef.current.equipment.onUpdate = (count) => {
          setEquipmentCount(count);
        };
      }
    });
  }, []);

  const handleAddEquipment = async (type) => {
    if (managersRef.current?.equipment) {
      await managersRef.current.equipment.addEquipment(type);
    }
  };

  const handleDoorChange = (angle) => {
    setDoorAngle(angle);
    const radians = -(angle * Math.PI / 180);
    const cabinet = managersRef.current?.cabinet?.getActiveCabinet();
    if (cabinet?.instance?.setDoorRotation) {
      cabinet.instance.setDoorRotation(radians);
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
        await managersRef.current.cabinet.addCabinetById('TS_700_500_250');
        setCabinetLoaded(true);
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
      />

      {/* Центр: 3D сцена */}
      <Scene3DContainer managers={managersRef.current} />

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
