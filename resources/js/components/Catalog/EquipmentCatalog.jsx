import React, { useState } from 'react';
import CategoryTabs from './CategoryTabs';
import EquipmentCard from './EquipmentCard';

// Временные данные (потом заменим на API)
const EQUIPMENT_DATA = [
  { id: 'circuit_breaker', name: 'Автоматический выключатель', category: 'breakers', width: 18, icon: '🔌', available: true },
  { id: 'socket_g', name: 'Розетка 220В Schuko', category: 'sockets', width: 44.5, icon: '⚡', available: true },
];

function EquipmentCatalog({ onAdd, onLoadCabinet, cabinetLoaded }) {
  const [activeTab, setActiveTab] = useState('breakers');

  const filteredItems = EQUIPMENT_DATA.filter(item => item.category === activeTab);

  return (
    <div className="catalog-panel">
      {/* Секция: Шкафы */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>🗄️ Шкафы</h3>
        <button 
          onClick={onLoadCabinet}
          disabled={cabinetLoaded}
          style={{
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: cabinetLoaded ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: cabinetLoaded ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {cabinetLoaded ? '✅ Шкаф загружен' : '➕ Загрузить шкаф TS_700_500_250'}
        </button>
      </div>
      <CategoryTabs
        active={activeTab}
        onChange={setActiveTab}
      />
      
      <div className="equipment-grid">
        {filteredItems.map(item => (
          <EquipmentCard
            key={item.id}
            {...item}
            onClick={() => {}} // Клик отключен - только drag-and-drop
          />
        ))}
      </div>
    </div>
  );
}

export default EquipmentCatalog;
