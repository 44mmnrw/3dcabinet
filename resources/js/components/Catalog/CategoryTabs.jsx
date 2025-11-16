import React from 'react';

const TABS = [
  { id: 'breakers', label: 'Автоматы', icon: '🔌' },
  { id: 'sockets', label: 'Розетки', icon: '⚡' },
  { id: 'switches', label: 'Рубильники', icon: '🔧' },
  { id: 'controllers', label: 'Контроллеры', icon: '💻' },
];

const CategoryTabs = ({ active, onChange }) => (
  <div className="category-tabs">
    {TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`category-tab ${active === tab.id ? 'active' : ''}`}
      >
        <span className="category-tab-icon">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
);

export default CategoryTabs;
