import React from 'react';

function EquipmentCard({ id, name, width, icon, available, onClick }) {
  return (
    <div
      data-equipment-type={id}  // Для DragDropController
      onClick={onClick}
      draggable={available}
      style={{
        padding: '12px',
        marginBottom: '10px',
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        cursor: available ? 'grab' : 'not-allowed',
        opacity: available ? 1 : 0.5,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseEnter={e => {
        if (available) {
          e.currentTarget.style.borderColor = '#6c63ff';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 99, 255, 0.15)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#dee2e6';
        e.currentTarget.style.boxShadow = 'none';
      }}
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
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#212529',
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {name}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6c757d'
        }}>
          {width} мм
        </div>
      </div>
      
      {!available && (
        <div style={{
          fontSize: '11px',
          color: '#dc3545',
          fontWeight: '500'
        }}>
          Недоступно
        </div>
      )}
    </div>
  );
}

export default EquipmentCard;
