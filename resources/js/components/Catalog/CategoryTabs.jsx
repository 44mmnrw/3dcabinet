import React from 'react';

const TABS = [
  { id: 'breakers', label: 'Автоматы', icon: '🔌' },
  { id: 'sockets', label: 'Розетки', icon: '⚡' },
  { id: 'switches', label: 'Рубильники', icon: '🔧' },
  { id: 'controllers', label: 'Контроллеры', icon: '💻' },
];

const CategoryTabs = ({ active, onChange }) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '15px',
    borderBottom: '1px solid #dee2e6',
    background: '#fff'
  }}>
    {TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: '1 1 calc(50% - 4px)',
          minWidth: '120px',
          padding: '10px',
          border: 'none',
          borderRadius: '8px',
          background: active === tab.id ? '#6c63ff' : '#e9ecef',
          color: active === tab.id ? '#fff' : '#495057',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: active === tab.id ? '600' : '400',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <span style={{ fontSize: '18px' }}>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
);

export default CategoryTabs;
