import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { test_TS_700_500_250 } from './models/TS_700_500_250/test_TS_700_500_250.js';
import { test_circuit_breaker } from './models/circuit_breaker/test_circuit_breaker.js';

// Инициализация сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Камера
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(1.5, 1, 2);

// Рендерер
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Контролы
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Сетка
const gridHelper = new THREE.GridHelper(5, 50);
scene.add(gridHelper);

// Оси координат
const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

// Загрузка моделей
let cabinetModel, breakerModel;

async function loadModels() {
    try {
        // Загружаем шкаф TS_700_500_250
        console.log('🔄 Загрузка TS_700_500_250...');
        cabinetModel = new test_TS_700_500_250();
        const cabinetAssembly = await cabinetModel.assemble();
        cabinetAssembly.position.set(-0.5, 0, 0);  // Сдвигаем влево
        scene.add(cabinetAssembly);
        console.log('✅ TS_700_500_250 загружен');

        // Загружаем автоматический выключатель
        console.log('🔄 Загрузка circuit_breaker...');
        breakerModel = new test_circuit_breaker();
        const breakerAssembly = await breakerModel.assemble();
        breakerAssembly.position.set(0.5, 0, 0);  // Сдвигаем вправо
        scene.add(breakerAssembly);
        console.log('✅ Circuit breaker загружен');

        // Открываем дверь шкафа для демонстрации
        setTimeout(() => {
            cabinetModel.setDoorRotation(Math.PI / 2);  // 90°
        }, 1000);

    } catch (error) {
        console.error('❌ Ошибка загрузки моделей:', error);
    }
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Адаптивность
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Запуск
loadModels();
animate();

// Глобальный доступ для отладки
window.scene = scene;
window.cabinetModel = () => cabinetModel;
window.breakerModel = () => breakerModel;
