import React from 'react';

function Controls({ doorAngle, onDoorChange, equipmentCount, onRemoveAll }) {
  return (
    <div className="controls-panel">
      {/* Управление дверью */}
      <div className="control-group">
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
          id="door-angle"
          type="range"
          min="0"
          max="120"
          value={doorAngle}
          onChange={e => onDoorChange(Number(e.target.value))}
          className="range-slider"
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
      <div className="control-group">
        <div className="equipment-counter">
          <div className="equipment-counter-label">
            Установлено
          </div>
          <div className="equipment-counter-value">
            {equipmentCount}
          </div>
        </div>
      </div>

      {/* Кнопка очистки */}
      {equipmentCount > 0 && (
        <button
          onClick={onRemoveAll}
          className="btn btn-danger"
        >
          Удалить всё
        </button>
      )}
    </div>
  );
}

export default Controls;
