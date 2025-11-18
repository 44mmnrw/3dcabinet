/**
 * UI контроллер для управления шкафом
 */
export function initCabinetControls(cabinetManager, camera, controls) {
  console.log('🎛️ Инициализация UI контроллера...');
  
  const cabinet = cabinetManager.getActiveCabinet();
  if (!cabinet || !cabinet.instance) {
    console.error('❌ Активный шкаф не найден');
    return;
  }

  // === ДВЕРЬ ===
  const btnOpenDoor = document.getElementById('btn-open-door');
  const btnCloseDoor = document.getElementById('btn-close-door');
  const doorSlider = document.getElementById('door-angle');
  const doorValue = document.getElementById('door-angle-value');

  if (btnOpenDoor) {
    btnOpenDoor.onclick = () => {
      console.log('🚪 Открываем дверь');
      if (cabinet.instance.openDoor) cabinet.instance.openDoor(-Math.PI / 2);
      if (doorSlider) doorSlider.value = 90;
      if (doorValue) doorValue.textContent = '90°';
    };
    console.log('✅ Кнопка "Открыть дверь" подключена');
  }

  if (btnCloseDoor) {
    btnCloseDoor.onclick = () => {
      console.log('🚪 Закрываем дверь');
      if (cabinet.instance.closeDoor) cabinet.instance.closeDoor();
      if (doorSlider) doorSlider.value = 0;
      if (doorValue) doorValue.textContent = '0°';
    };
    console.log('✅ Кнопка "Закрыть дверь" подключена');
  }

  if (doorSlider) {
    doorSlider.oninput = (e) => {
      const degrees = parseInt(e.target.value);
      const radians = -(degrees * Math.PI / 180);
      if (cabinet.instance.setDoorRotation) {
        cabinet.instance.setDoorRotation(radians);
      }
      if (doorValue) doorValue.textContent = degrees + '°';
    };
    console.log('✅ Слайдер двери подключен');
  }

  // === ВИДИМОСТЬ ===
  const showBody = document.getElementById('show-body');
  const showDoor = document.getElementById('show-door');
  const showPanel = document.getElementById('show-panel');
  const showRails = document.getElementById('show-rails');

  if (showBody) {
    showBody.onchange = (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('body', e.target.checked);
      }
    };
  }

  if (showDoor) {
    showDoor.onchange = (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('door', e.target.checked);
      }
    };
  }

  if (showPanel) {
    showPanel.onchange = (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('panel', e.target.checked);
      }
    };
  }

  if (showRails) {
    showRails.onchange = (e) => {
      const components = cabinet.instance.getComponents();
      Object.keys(components).forEach(key => {
        if (key.includes('DIN_Rail') || key.includes('dinRail')) {
          if (cabinet.instance.setComponentVisibility) {
            cabinet.instance.setComponentVisibility(key, e.target.checked);
          }
        }
      });
    };
  }

  // === КАМЕРА ===
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const btnTopView = document.getElementById('btn-top-view');
  const btnFrontView = document.getElementById('btn-front-view');

  if (btnResetCamera) {
    btnResetCamera.onclick = () => {
      camera.position.set(2, 1.5, 3);
      controls.target.set(0, 0.5, 0);
      controls.update();
    };
  }

  if (btnTopView) {
    btnTopView.onclick = () => {
      camera.position.set(0, 3, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    };
  }

  if (btnFrontView) {
    btnFrontView.onclick = () => {
      camera.position.set(0, 1, 3);
      controls.target.set(0, 0.5, 0);
      controls.update();
    };
  }

  // === ИНФОРМАЦИЯ ===
  const btnShowInfo = document.getElementById('btn-show-info');
  if (btnShowInfo) {
    btnShowInfo.onclick = () => {
      if (cabinet.instance.getInfo) {
        console.log('📋 Информация о шкафе:', cabinet.instance.getInfo());
        alert('Информация выведена в консоль (F12)');
      }
    };
  }

  // === СЧЁТЧИКИ ===
  const componentCount = document.getElementById('component-count');
  if (componentCount && cabinet.instance.getComponents) {
    const components = cabinet.instance.getComponents();
    componentCount.textContent = Object.keys(components).length;
  }

  // FPS
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsDisplay = document.getElementById('fps');
  
  function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
      if (fpsDisplay) fpsDisplay.textContent = frameCount;
      frameCount = 0;
      lastTime = currentTime;
    }
    requestAnimationFrame(updateFPS);
  }
  if (fpsDisplay) updateFPS();

  console.log('✅ Все UI обработчики подключены');
}
