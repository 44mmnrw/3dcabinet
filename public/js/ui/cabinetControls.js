/**
 * UI контроллер для управления шкафом (универсальный для любых шкафов)
 * Автоматически работает с любым шкафом, если он наследует CabinetBase
 */
export function initCabinetControls(cabinetManager, camera, controls) {
  const cabinet = cabinetManager.getActiveCabinet();
  if (!cabinet || !cabinet.instance) {
    return;
  }

  // === ДВЕРЬ (Универсальная поддержка) ===
  const btnOpenDoor = document.getElementById('btn-open-door');
  const btnCloseDoor = document.getElementById('btn-close-door');
  const doorSlider = document.getElementById('door-angle');
  const doorValue = document.getElementById('door-angle-value');

  // Вспомогательная функция для установки значения слайдера и текста
  const updateDoorDisplay = (degrees) => {
    if (doorSlider) doorSlider.value = degrees;
    if (doorValue) doorValue.textContent = degrees + '°';
  };

  // Функция для открытия двери (универсальная)
  const openDoor = (angle = -Math.PI / 2) => {
    cabinet.instance.setDoorRotation(angle);
    const degrees = Math.abs(Math.round(angle * 180 / Math.PI));
    updateDoorDisplay(degrees);
  };

  // Функция для закрытия двери (универсальная)
  const closeDoor = () => {
    cabinet.instance.setDoorRotation(0);
    updateDoorDisplay(0);
  };

  if (btnOpenDoor) {
    btnOpenDoor.onclick = openDoor;
  }

  if (btnCloseDoor) {
    btnCloseDoor.onclick = closeDoor;
  }

  if (doorSlider) {
    doorSlider.oninput = (e) => {
      const degrees = parseInt(e.target.value);
      const radians = -(degrees * Math.PI / 180);
      cabinet.instance.setDoorRotation(radians);
      updateDoorDisplay(degrees);
    };
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
}
