import React, { useState, useEffect, useRef } from 'react';
import EquipmentCatalog from './Catalog/EquipmentCatalog';
import Scene3DContainer from './Scene3D/Scene3DContainer';
import Controls from './Controls';
import { initializeManagers } from '@public/managers/init';

function App() {
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [doorAngle, setDoorAngle] = useState(0);
  const managersRef = useRef(null);

  useEffect(() => {
    // Ждём следующего кадра, чтобы #scene-container точно был в DOM
    requestAnimationFrame(() => {
      // Инициализация Three.js менеджеров
      managersRef.current = initializeManagers();
      
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

  return (
    <div style={{ display: 'flex', height: '100vh', margin: 0, overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {/* Левая панель: Каталог оборудования */}
      <EquipmentCatalog onAdd={handleAddEquipment} />

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
