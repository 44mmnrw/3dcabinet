import React, { useEffect } from 'react';

function Scene3DContainer({ managers, containerRef }) {
  useEffect(() => {
    if (!managers || !containerRef?.current) return;

    // Three.js рендерер уже создан в init.js
    // Просто подключаем контейнер
    const { renderer } = managers;
    const container = containerRef.current;
    
    if (renderer && renderer.domElement && container) {
      // Проверяем, не добавлен ли уже canvas
      if (!container.contains(renderer.domElement)) {
      // Очищаем контейнер от старого канваса (если есть)
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
      }
      
      // Обновляем размер при монтировании
      const { clientWidth, clientHeight } = container;
      if (managers.camera) {
        managers.camera.aspect = clientWidth / clientHeight;
        managers.camera.updateProjectionMatrix();
      }
      renderer.setSize(clientWidth, clientHeight);
    }

    // Обработка resize
    const handleResize = () => {
      if (!containerRef?.current || !managers.camera || !renderer) return;
      
      const { clientWidth, clientHeight } = containerRef.current;
      managers.camera.aspect = clientWidth / clientHeight;
      managers.camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [managers, containerRef]);

  // Этот компонент не рендерит ничего, он только управляет подключением рендерера
  return null;
}

export default Scene3DContainer;
