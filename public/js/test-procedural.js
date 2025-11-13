/**
 * Тестовая сцена для процедурной генерации шкафа
 * Технический вид с прозрачными плоскостями
 */

console.log('🚀 test-procedural.js загружается...');

import * as THREE from './libs/three.module.js';
console.log('✅ THREE загружен:', THREE);

import { OrbitControls } from './libs/OrbitControls.js';
console.log('✅ OrbitControls загружен');

import { ProceduralCabinetGenerator } from './modules/ProceduralCabinetGenerator.js';
console.log('✅ ProceduralCabinetGenerator загружен');

// Инициализация сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0); // Светлый фон для техн. вида

// Камера
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(1.5, 1, 1.5);

// Рендерер
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = false; // Не нужны тени в техническом виде
document.body.appendChild(renderer.domElement);

// Контроллы
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.25, 0);

// Освещение (минималистичное для технического вида)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Сетка для ориентации
const gridHelper = new THREE.GridHelper(2, 20, 0xcccccc, 0xeeeeee);
scene.add(gridHelper);

// Оси координат
const axesHelper = new THREE.AxesHelper(0.5);
scene.add(axesHelper);

// ===============================================
// ГЕНЕРАЦИЯ ПРОЦЕДУРНОГО ШКАФА
// ===============================================

const generator = new ProceduralCabinetGenerator({
    // Размеры ТШ-7 (метры)
    width: 0.7,
    height: 0.5,
    depth: 0.24,
    
    // Технический стиль
    style: 'technical',
    lineColor: 0x2c3e50,        // Тёмно-синий контур
    surfaceColor: 0x3498db,     // Голубые поверхности
    surfaceOpacity: 0.15,       // 15% прозрачность
    
    // Компоненты
    components: {
        body: true,
        door: true,
        dinRails: 3,  // 3 DIN-рейки
        panel: true
    }
});

const cabinet = generator.generate();
scene.add(cabinet);

console.log('📦 Процедурный шкаф добавлен в сцену');
console.log('Структура:', cabinet);

// ===============================================
// UI КОНТРОЛЛЫ
// ===============================================

const controls_ui = document.createElement('div');
controls_ui.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    font-family: 'Inter', sans-serif;
    min-width: 250px;
    z-index: 1000;
`;

controls_ui.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🔧 Управление видом</h3>
    
    <label style="display: block; margin-bottom: 10px;">
        <strong>Прозрачность:</strong>
        <input type="range" id="opacity-slider" min="0" max="100" value="15" 
               style="width: 100%; margin-top: 5px;">
        <span id="opacity-value">15%</span>
    </label>
    
    <label style="display: block; margin-bottom: 10px;">
        <strong>Цвет линий:</strong>
        <input type="color" id="line-color" value="#2c3e50" 
               style="width: 100%; margin-top: 5px; height: 30px;">
    </label>
    
    <label style="display: block; margin-bottom: 10px;">
        <strong>Цвет поверхностей:</strong>
        <input type="color" id="surface-color" value="#3498db" 
               style="width: 100%; margin-top: 5px; height: 30px;">
    </label>
    
    <button id="toggle-style" style="
        width: 100%;
        padding: 10px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 10px;
    ">
        Переключить стиль
    </button>
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <strong>Инфо:</strong><br>
        Полигонов: <span id="poly-count">0</span><br>
        Draw calls: <span id="draw-calls">0</span>
    </div>
`;

document.body.appendChild(controls_ui);

// Обработчики UI
document.getElementById('opacity-slider').addEventListener('input', (e) => {
    const opacity = e.target.value / 100;
    generator.setSurfaceOpacity(opacity);
    document.getElementById('opacity-value').textContent = `${e.target.value}%`;
});

document.getElementById('line-color').addEventListener('input', (e) => {
    const color = parseInt(e.target.value.replace('#', ''), 16);
    generator.setLineColor(color);
});

document.getElementById('surface-color').addEventListener('input', (e) => {
    const color = parseInt(e.target.value.replace('#', ''), 16);
    cabinet.traverse((child) => {
        if (child.name && child.name.includes('_SURFACE')) {
            if (child.material) {
                child.material.color.setHex(color);
            }
        }
    });
});

let currentStyle = 'technical';
document.getElementById('toggle-style').addEventListener('click', () => {
    currentStyle = currentStyle === 'technical' ? 'realistic' : 'technical';
    generator.setStyle(currentStyle);
    document.getElementById('toggle-style').textContent = 
        currentStyle === 'technical' ? 'Переключить в реалистичный' : 'Переключить в технический';
});

// ===============================================
// АНИМАЦИЯ
// ===============================================

let animationTime = 0;

function animate() {
    requestAnimationFrame(animate);
    
    animationTime += 0.01;
    
    // Лёгкая анимация двери (опционально)
    const door = generator.getDoorMesh();
    if (door && animationTime < Math.PI) {
        // door.rotation.y = Math.sin(animationTime) * 0.2;
    }
    
    controls.update();
    renderer.render(scene, camera);
    
    // Обновление статистики
    updateStats();
}

function updateStats() {
    // Подсчёт полигонов
    let totalTriangles = 0;
    scene.traverse((child) => {
        if (child.geometry) {
            if (child.geometry.index) {
                totalTriangles += child.geometry.index.count / 3;
            } else if (child.geometry.attributes.position) {
                totalTriangles += child.geometry.attributes.position.count / 3;
            }
        }
    });
    
    document.getElementById('poly-count').textContent = Math.floor(totalTriangles);
    document.getElementById('draw-calls').textContent = renderer.info.render.calls;
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Запуск анимации
try {
    animate();
    console.log('✅ Тестовая сцена запущена');
    console.log('📐 Используйте мышь для вращения камеры');
    console.log('🎨 Настройте внешний вид через панель справа');
} catch (error) {
    console.error('❌ Ошибка в animate():', error);
    throw error;
}
