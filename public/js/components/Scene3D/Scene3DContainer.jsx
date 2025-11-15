import React, { useEffect, useRef } from 'react';

function Scene3DContainer({ managers }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!managers || !containerRef.current) return;

    // Three.js рендерер уже создан в init.js
    // Просто подключаем контейнер
    const { renderer } = managers;
    if (renderer && renderer.domElement) {
      // Очищаем контейнер от старого канваса (если есть)
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
      
      // Обновляем размер при монтировании
      const { clientWidth, clientHeight } = containerRef.current;
      if (managers.camera) {
        managers.camera.aspect = clientWidth / clientHeight;
        managers.camera.updateProjectionMatrix();
      }
      renderer.setSize(clientWidth, clientHeight);
    }

    // Обработка resize
    const handleResize = () => {
      if (!containerRef.current || !managers.camera || !renderer) return;
      
      const { clientWidth, clientHeight } = containerRef.current;
      managers.camera.aspect = clientWidth / clientHeight;
      managers.camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [managers]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden'
      }}
    />
  );
}

export default Scene3DContainer;
