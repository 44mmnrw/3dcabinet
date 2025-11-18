import React from 'react';

function EquipmentCard({ id, name, width, icon, available, onClick, onMouseDown }) {

  const handleClick = (e) => {
    if (available && onClick) {
      onClick(id);
    }
  };

  return (
    <div
      data-equipment-type={id}
      draggable={false}
      className="equipment-card"
      onClick={handleClick}
      onMouseDown={available ? onMouseDown : undefined}
      style={{ 
        opacity: available ? 1 : 0.5, 
        cursor: available ? 'grab' : 'not-allowed',
        userSelect: 'none'
      }}
    >
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
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
