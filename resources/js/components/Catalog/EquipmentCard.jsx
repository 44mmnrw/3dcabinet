import React from 'react';

function EquipmentCard({ id, name, width, icon, available, onClick }) {
  return (
    <div
      data-equipment-type={id}
      onClick={onClick}
      draggable={available}
      className="equipment-card"
      style={{ opacity: available ? 1 : 0.5, cursor: available ? 'grab' : 'not-allowed' }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background: '#f1f3f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0
      }}>
        {icon}
      </div>
      
      <div className="equipment-card-content">
        <div className="equipment-card-name">
          {name}
        </div>
        <div className="equipment-card-info">
          {width} мм
        </div>
      </div>
      
      {!available && (
        <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: '500' }}>
          Недоступно
        </div>
      )}
    </div>
  );
}

export default EquipmentCard;
