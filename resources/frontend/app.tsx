import React from 'react';
import ReactDOM from 'react-dom/client';
import ConfiguratorPage from './pages/ConfiguratorPage';
import '../css/app.css';

// Точка входа React (TypeScript)
// Монтирование страницы конфигуратора с использованием StrictMode
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ConfiguratorPage />
    </React.StrictMode>
  );
}

export {};