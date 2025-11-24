import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CabinetManager } from '../managers/CabinetManager.js';

// Создание контейнера, если отсутствует
let container: HTMLElement | null = document.getElementById('canvas-container');
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

const camera = new THREE.PerspectiveCamera(45, container!.clientWidth / container!.clientHeight, 0.1, 100);
camera.position.set(2, 1.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container!.clientWidth, container!.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container!.appendChild(renderer.domElement);

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
(window as Window & { cabinetManager?: CabinetManager }).cabinetManager = cabinetManager;

/**
 * Загрузить шкаф по ID из каталога
 * @param cabinetId - ID шкафа из каталога (по умолчанию первый доступный)
 */
async function loadCabinet(cabinetId: string | null = null): Promise<void> {
  try {
    const loadingEl = document.getElementById('loading');
    
    // Получить список доступных шкафов
    const cabinets = await cabinetManager.getAvailableCabinets();
    
    if (!cabinets || cabinets.length === 0) {
      console.warn('⚠️ Каталог шкафов пуст');
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="color: orange;">Каталог шкафов не содержит моделей</p>';
      }
      return;
    }
    
    // Если ID не указан, использовать первый
    const selectedCabinet = cabinetId 
      ? cabinets.find(c => c.id === cabinetId)
      : cabinets[0];
    
    if (!selectedCabinet) {
      throw new Error(`Шкаф с ID "${cabinetId}" не найден в каталоге`);
    }
    
    console.log(`🔄 Загружаю шкаф: ${selectedCabinet.name} (${selectedCabinet.id})`);
    
    // Добавить шкаф по ID из каталога
    await cabinetManager.addCabinetById(selectedCabinet.id, 'cabinet_main');
    
    // Скрыть индикатор загрузки после успешной загрузки
    if (loadingEl) loadingEl.classList.add('hidden');
    console.log('✅ Шкаф загружен успешно');
    
    // Инициализация UI после загрузки
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
      initializeUI();
    }
    
  } catch (error: unknown) {
    console.error('❌ Cabinet load error', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loadingEl.innerHTML = `<p style="color: red;">Ошибка загрузки шкафа! ${errorMessage}</p>`;
    }
  }
}

// Загрузка шкафа из каталога (первый доступный или конкретный по ID)
loadCabinet('tsh_700_500_250');

// Инициализация обработчиков UI
function initializeUI(): void {
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
  const doorSlider = document.getElementById('door-angle') as HTMLInputElement | null;
  const doorValue = document.getElementById('door-angle-value');
  
  console.log('🔍 Элементы UI:', { btnOpenDoor, btnCloseDoor, doorSlider, doorValue });

  if (btnOpenDoor) {
    btnOpenDoor.addEventListener('click', () => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { openDoor?: (angle: number) => void }).openDoor === 'function') {
        (instance as { openDoor: (angle: number) => void }).openDoor(-Math.PI / 2);
      }
      if (doorSlider) doorSlider.value = '90';
      if (doorValue) doorValue.textContent = '90°';
    });
  }

  if (btnCloseDoor) {
    btnCloseDoor.addEventListener('click', () => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { closeDoor?: () => void }).closeDoor === 'function') {
        (instance as { closeDoor: () => void }).closeDoor();
      }
      if (doorSlider) doorSlider.value = '0';
      if (doorValue) doorValue.textContent = '0°';
    });
  }

  if (doorSlider) {
    doorSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const degrees = parseInt(target.value);
      const radians = -(degrees * Math.PI / 180);
      const instance = cabinet.instance;
      if (instance && typeof (instance as { setDoorRotation?: (radians: number) => void }).setDoorRotation === 'function') {
        (instance as { setDoorRotation: (radians: number) => void }).setDoorRotation(radians);
      }
      if (doorValue) doorValue.textContent = degrees + '°';
    });
  }

  // Обработчики видимости компонентов
  const showBody = document.getElementById('show-body') as HTMLInputElement | null;
  const showDoor = document.getElementById('show-door') as HTMLInputElement | null;
  const showPanel = document.getElementById('show-panel') as HTMLInputElement | null;
  const showRails = document.getElementById('show-rails') as HTMLInputElement | null;

  if (showBody) {
    showBody.addEventListener('change', (e) => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { setComponentVisibility?: (name: string, visible: boolean) => void }).setComponentVisibility === 'function') {
        (instance as { setComponentVisibility: (name: string, visible: boolean) => void }).setComponentVisibility('body', (e.target as HTMLInputElement).checked);
      }
    });
  }

  if (showDoor) {
    showDoor.addEventListener('change', (e) => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { setComponentVisibility?: (name: string, visible: boolean) => void }).setComponentVisibility === 'function') {
        (instance as { setComponentVisibility: (name: string, visible: boolean) => void }).setComponentVisibility('door', (e.target as HTMLInputElement).checked);
      }
    });
  }

  if (showPanel) {
    showPanel.addEventListener('change', (e) => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { setComponentVisibility?: (name: string, visible: boolean) => void }).setComponentVisibility === 'function') {
        (instance as { setComponentVisibility: (name: string, visible: boolean) => void }).setComponentVisibility('panel', (e.target as HTMLInputElement).checked);
      }
    });
  }

  if (showRails) {
    showRails.addEventListener('change', (e) => {
      const instance = cabinet.instance;
      if (instance && typeof (instance as { getComponents?: () => Record<string, THREE.Object3D> }).getComponents === 'function') {
        const components = (instance as { getComponents: () => Record<string, THREE.Object3D> }).getComponents();
        Object.keys(components).forEach(key => {
          if (key.includes('DIN_Rail') || key.includes('dinRail')) {
            if (instance && typeof (instance as { setComponentVisibility?: (name: string, visible: boolean) => void }).setComponentVisibility === 'function') {
              (instance as { setComponentVisibility: (name: string, visible: boolean) => void }).setComponentVisibility(key, (e.target as HTMLInputElement).checked);
            }
          }
        });
      }
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
      const instance = cabinet.instance;
      if (instance && typeof (instance as { getInfo?: () => unknown }).getInfo === 'function') {
        console.log('📋 Информация о шкафе:', (instance as { getInfo: () => unknown }).getInfo());
        alert('Информация выведена в консоль (F12)');
      }
    });
  }

  // Обновление счётчика компонентов
  const componentCount = document.getElementById('component-count');
  if (componentCount) {
    const instance = cabinet.instance;
    if (instance && typeof (instance as { getComponents?: () => Record<string, THREE.Object3D> }).getComponents === 'function') {
      const components = (instance as { getComponents: () => Record<string, THREE.Object3D> }).getComponents();
      componentCount.textContent = String(Object.keys(components).length);
    }
  }

  // FPS счётчик
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsDisplay = document.getElementById('fps');
  
  function updateFPS(): void {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
      if (fpsDisplay) fpsDisplay.textContent = String(frameCount);
      frameCount = 0;
      lastTime = currentTime;
    }
    requestAnimationFrame(updateFPS);
  }
  if (fpsDisplay) updateFPS();

  console.log('✅ UI обработчики инициализированы');
}

// Анимационный цикл
function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  // Вызов update у активного шкафа (если реализован)
  const active = cabinetManager.getActiveCabinet();
  if (active && active.instance) {
    const instance = active.instance;
    // Проверяем наличие метода update через проверку типа
    if ('update' in instance && typeof (instance as { update: () => void }).update === 'function') {
      (instance as { update: () => void }).update();
    }
  }
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
});

// Экспорт функции для изменения шкафа в runtime
(window as Window & { loadCabinet?: typeof loadCabinet }).loadCabinet = loadCabinet;

console.log('✅ CabinetScene.ts инициализирован');
console.log('💡 Использование:');
console.log('   window.loadCabinet("tsh_700_500_250") - загрузить конкретный шкаф');
console.log('   window.loadCabinet() - загрузить первый доступный шкаф');
console.log('   window.cabinetManager.getAvailableCabinets() - список доступных');

