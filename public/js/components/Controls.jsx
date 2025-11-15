import React from 'react';

function Controls({ doorAngle, onDoorChange, equipmentCount, onRemoveAll }) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      minWidth: '250px',
      zIndex: 10
    }}>
      {/* Управление дверью */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#212529',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🚪</span>
          <span>Дверь</span>
        </div>
        
        <input
          type="range"
          min="0"
          max="120"
          value={doorAngle}
          onChange={e => onDoorChange(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#6c63ff'
          }}
        />
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#6c757d',
          marginTop: '5px'
        }}>
          <span>Закрыта</span>
          <span>{doorAngle}°</span>
          <span>Открыта</span>
        </div>
      </div>

      {/* Счётчик оборудования */}
      <div style={{
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          marginBottom: '4px'
        }}>
          Установлено
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#6c63ff'
        }}>
          {equipmentCount}
        </div>
      </div>

      {/* Кнопка очистки */}
      {equipmentCount > 0 && (
        <button
          onClick={onRemoveAll}
          style={{
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            background: '#dc3545',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.target.style.background = '#c82333'}
          onMouseLeave={e => e.target.style.background = '#dc3545'}
        >
          Удалить всё
        </button>
      )}
    </div>
  );
}

export default Controls;
