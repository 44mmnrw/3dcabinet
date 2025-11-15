import React, { useState } from 'react';
import CategoryTabs from './CategoryTabs';
import EquipmentCard from './EquipmentCard';

// Временные данные (потом заменим на API)
const EQUIPMENT_DATA = [
  { id: 'circuit_breaker', name: 'Автоматический выключатель', category: 'breakers', width: 18, icon: '🔌', available: true },
  { id: 'socket_g', name: 'Розетка 220В Schuko', category: 'sockets', width: 44.5, icon: '⚡', available: true },
];

function EquipmentCatalog({ onAdd }) {
  const [activeTab, setActiveTab] = useState('breakers');

  const filteredItems = EQUIPMENT_DATA.filter(item => item.category === activeTab);

  return (
    <div style={{
      width: '300px',
      height: '100vh',
      background: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <CategoryTabs
        active={activeTab}
        onChange={setActiveTab}
      />
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px'
      }}>
        {filteredItems.map(item => (
          <EquipmentCard
            key={item.id}
            {...item}
            onClick={() => item.available && onAdd(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default EquipmentCatalog;
