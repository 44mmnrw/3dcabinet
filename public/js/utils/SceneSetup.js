import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';

/**
 * Универсальный модуль для инициализации Three.js сцены
 * Используется в test-assembler.js и других визуализаторах
 */

/**
 * Создать сцену с базовым фоном и помощниками
 * @param {Object} options - Параметры сцены
 * @param {number} options.backgroundColor - Цвет фона (hex)
 * @param {boolean} options.showGrid - Показывать сетку
 * @param {boolean} options.showAxes - Показывать оси координат
 * @returns {THREE.Scene}
 */
export function createScene(options = {}) {
    const {
        backgroundColor = 0xf5f5f5,
        showGrid = true,
        showAxes = true
    } = options;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // Сетка
    if (showGrid) {
        const gridHelper = new THREE.GridHelper(5, 50, 0xcccccc, 0xe0e0e0);
        scene.add(gridHelper);
    }

    // Оси координат
    if (showAxes) {
        const axesHelper = new THREE.AxesHelper(1);
        scene.add(axesHelper);
    }

    return scene;
}

/**
 * Создать камеру с настройками по умолчанию
 * @param {Object} options - Параметры камеры
 * @param {number} options.fov - Угол обзора
 * @param {Array<number>} options.position - Позиция [x, y, z]
 * @returns {THREE.PerspectiveCamera}
 */
export function createCamera(options = {}) {
    const {
        fov = 45,
        position = [1.5, 1, 2]
    } = options;

    const camera = new THREE.PerspectiveCamera(
        fov,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(...position);

    return camera;
}

/**
 * Создать рендерер с настройками по умолчанию
 * @param {Object} options - Параметры рендерера
 * @param {boolean} options.antialias - Сглаживание
 * @param {boolean} options.shadows - Тени
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(options = {}) {
    const {
        antialias = true,
        shadows = true
    } = options;

    const renderer = new THREE.WebGLRenderer({ antialias });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    if (shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    document.body.appendChild(renderer.domElement);

    return renderer;
}

/**
 * Создать освещение для сцены
 * @param {THREE.Scene} scene - Сцена для добавления света
 * @param {Object} options - Параметры освещения
 * @param {number} options.ambientIntensity - Интенсивность ambient light
 * @param {number} options.directionalIntensity - Интенсивность directional light
 * @returns {Object} - {ambientLight, directionalLight}
 */
export function createLights(scene, options = {}) {
    const {
        ambientIntensity = 0.6,
        directionalIntensity = 0.8
    } = options;

    const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    return { ambientLight, directionalLight };
}

/**
 * Создать OrbitControls с настройками по умолчанию
 * @param {THREE.Camera} camera - Камера
 * @param {HTMLElement} domElement - DOM элемент (canvas)
 * @param {Object} options - Параметры контролов
 * @returns {OrbitControls}
 */
export function createControls(camera, domElement, options = {}) {
    const {
        enableDamping = true,
        dampingFactor = 0.05
    } = options;

    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;

    return controls;
}

/**
 * Настроить автоматическую адаптацию при изменении размера окна
 * @param {THREE.Camera} camera - Камера
 * @param {THREE.WebGLRenderer} renderer - Рендерер
 */
export function setupResizeHandler(camera, renderer) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/**
 * Полная инициализация сцены (all-in-one)
 * @param {Object} options - Объединённые параметры всех компонентов
 * @returns {Object} - {scene, camera, renderer, controls, lights}
 */
export function initializeScene(options = {}) {
    const scene = createScene(options);
    const camera = createCamera(options);
    const renderer = createRenderer(options);
    const lights = createLights(scene, options);
    const controls = createControls(camera, renderer.domElement, options);

    setupResizeHandler(camera, renderer);

    return { scene, camera, renderer, controls, lights };
}
