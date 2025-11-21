import React from 'react';
import ReactDOM from 'react-dom/client';
import ConfiguratorPage from './pages/ConfiguratorPage';
import '../css/app.css';

// Монтирование страницы конфигуратора
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ConfiguratorPage />
    </React.StrictMode>
  );
}
