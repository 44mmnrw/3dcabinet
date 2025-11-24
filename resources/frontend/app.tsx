import React from 'react';
import ReactDOM from 'react-dom/client';
import ConfiguratorPage from './pages/ConfiguratorPage';
import '../css/app.css';

// Точка входа React (TypeScript)
// Монтирование страницы конфигуратора БЕЗ StrictMode (для Three.js)
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <ConfiguratorPage />
  );
}

export {};