import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import '../../public/css/configurator.css';

// Монтирование основного конфигуратора
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
