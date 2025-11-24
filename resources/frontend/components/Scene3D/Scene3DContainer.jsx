import React, { useEffect } from 'react';

function Scene3DContainer({ managers, containerRef }) {
  useEffect(() => {
    console.log('🔄 Scene3DContainer useEffect triggered', { 
      hasManagers: !!managers, 
      hasContainer: !!containerRef?.current 
    });
    
    if (!managers || !containerRef?.current) return;

    // Three.js рендерер уже создан в init.js
    // Просто подключаем контейнер
    const { renderer } = managers;
    const container = containerRef.current;
    
    if (renderer && renderer.domElement && container) {
      // ФИКС React Strict Mode: удаляем ВСЕ canvas из контейнера перед добавлением правильного
      const allCanvas = container.querySelectorAll('canvas');
      allCanvas.forEach(c => {
        if (c !== renderer.domElement) {
          c.remove();
          console.log('🗑️ Удалён дубликат canvas');
        }
      });
      
      // Проверяем, не добавлен ли уже canvas КАК ПРЯМОЙ РЕБЁНОК
      if (renderer.domElement.parentElement !== container) {
        container.appendChild(renderer.domElement);
        console.log('📦 Canvas добавлен в контейнер');
      } else {
        console.log('✅ Canvas уже в контейнере, пропускаем');
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
