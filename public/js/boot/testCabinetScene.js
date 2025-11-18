import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { CabinetManager } from '../managers/CabinetManager.js';

// Создание контейнера, если отсутствует
let container = document.getElementById('canvas-container');
if (!container) {
  container = document.createElement('div');
  container.id = 'canvas-container';
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);
}

// Инициализация сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(2, 1.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.5, 0);
controls.update();

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Grid
const grid = new THREE.GridHelper(10, 20, 0xcccccc, 0xeeeeee);
grid.position.y = -0.001;
scene.add(grid);

// Менеджер шкафа
const cabinetManager = new CabinetManager(scene);
// Экспорт в глобальную область для legacy UI
window.cabinetManager = cabinetManager;

// Загрузка шкафа из каталога
cabinetManager.addCabinetById('TS_700_500_250')
  .then(() => {
    // Скрыть индикатор загрузки после успешной загрузки
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
    console.log('✅ Шкаф загружен успешно');
    
    // Инициализация UI после загрузки (с задержкой для уверенности что DOM готов)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
      initializeUI();
    }
  })
  .catch(e => {
    console.error('Cabinet load error', e);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.innerHTML = '<p style="color: red;">Ошибка загрузки шкафа! Проверьте консоль (F12).</p>';
    }
  });

// Инициализация обработчиков UI
function initializeUI() {
  console.log('🎛️ Инициализация UI...');
  const cabinet = cabinetManager.getActiveCabinet();
  if (!cabinet || !cabinet.instance) {
    console.error('❌ Шкаф не найден в cabinetManager');
    return;
  }
  console.log('✅ Шкаф найден:', cabinet);

  // Обработчики кнопок двери
  const btnOpenDoor = document.getElementById('btn-open-door');
  const btnCloseDoor = document.getElementById('btn-close-door');
  const doorSlider = document.getElementById('door-angle');
  const doorValue = document.getElementById('door-angle-value');
  
  console.log('🔍 Элементы UI:', { btnOpenDoor, btnCloseDoor, doorSlider, doorValue });

  if (btnOpenDoor) {
    btnOpenDoor.addEventListener('click', () => {
      if (cabinet.instance.openDoor) cabinet.instance.openDoor(-Math.PI / 2);
      if (doorSlider) doorSlider.value = 90;
      if (doorValue) doorValue.textContent = '90°';
    });
  }

  if (btnCloseDoor) {
    btnCloseDoor.addEventListener('click', () => {
      if (cabinet.instance.closeDoor) cabinet.instance.closeDoor();
      if (doorSlider) doorSlider.value = 0;
      if (doorValue) doorValue.textContent = '0°';
    });
  }

  if (doorSlider) {
    doorSlider.addEventListener('input', (e) => {
      const degrees = parseInt(e.target.value);
      const radians = -(degrees * Math.PI / 180);
      if (cabinet.instance.setDoorRotation) {
        cabinet.instance.setDoorRotation(radians);
      }
      if (doorValue) doorValue.textContent = degrees + '°';
    });
  }

  // Обработчики видимости компонентов
  const showBody = document.getElementById('show-body');
  const showDoor = document.getElementById('show-door');
  const showPanel = document.getElementById('show-panel');
  const showRails = document.getElementById('show-rails');

  if (showBody) {
    showBody.addEventListener('change', (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('body', e.target.checked);
      }
    });
  }

  if (showDoor) {
    showDoor.addEventListener('change', (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('door', e.target.checked);
      }
    });
  }

  if (showPanel) {
    showPanel.addEventListener('change', (e) => {
      if (cabinet.instance.setComponentVisibility) {
        cabinet.instance.setComponentVisibility('panel', e.target.checked);
      }
    });
  }

  if (showRails) {
    showRails.addEventListener('change', (e) => {
      const components = cabinet.instance.getComponents();
      Object.keys(components).forEach(key => {
        if (key.includes('DIN_Rail') || key.includes('dinRail')) {
          if (cabinet.instance.setComponentVisibility) {
            cabinet.instance.setComponentVisibility(key, e.target.checked);
          }
        }
      });
    });
  }

  // Обработчики камеры
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const btnTopView = document.getElementById('btn-top-view');
  const btnFrontView = document.getElementById('btn-front-view');

  if (btnResetCamera) {
    btnResetCamera.addEventListener('click', () => {
      camera.position.set(2, 1.5, 3);
      controls.target.set(0, 0.5, 0);
      controls.update();
    });
  }

  if (btnTopView) {
    btnTopView.addEventListener('click', () => {
      camera.position.set(0, 3, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    });
  }

  if (btnFrontView) {
    btnFrontView.addEventListener('click', () => {
      camera.position.set(0, 1, 3);
      controls.target.set(0, 0.5, 0);
      controls.update();
    });
  }

  // Кнопка показа информации
  const btnShowInfo = document.getElementById('btn-show-info');
  if (btnShowInfo) {
    btnShowInfo.addEventListener('click', () => {
      if (cabinet.instance.getInfo) {
        console.log('📋 Информация о шкафе:', cabinet.instance.getInfo());
        alert('Информация выведена в консоль (F12)');
      }
    });
  }

  // Обновление счётчика компонентов
  const componentCount = document.getElementById('component-count');
  if (componentCount && cabinet.instance.getComponents) {
    const components = cabinet.instance.getComponents();
    componentCount.textContent = Object.keys(components).length;
  }

  // FPS счётчик
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

  console.log('✅ UI обработчики инициализированы');
}

// Анимационный цикл
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // Вызов update у активного шкафа (если реализован)
  const active = cabinetManager.getActiveCabinet();
  if (active && active.instance && typeof active.instance.update === 'function') {
    active.instance.update();
  }
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
