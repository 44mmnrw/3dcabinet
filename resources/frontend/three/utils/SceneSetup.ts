import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA } from '../constants/PhysicalConstants.ts';
import type { SceneInitOptions, SceneInitResult } from '../types/managers.types.js';

/**
 * Опции для создания сцены
 */
export interface CreateSceneOptions {
    backgroundColor?: number;
    showGrid?: boolean;
    showAxes?: boolean;
}

/**
 * Опции для создания камеры
 */
export interface CreateCameraOptions {
    fov?: number;
    position?: [number, number, number];
    container?: HTMLElement | null;
}

/**
 * Опции для создания рендерера
 */
export interface CreateRendererOptions {
    antialias?: boolean;
    shadows?: boolean;
    container?: HTMLElement | null;
}

/**
 * Опции для создания освещения
 */
export interface CreateLightsOptions {
    ambientIntensity?: number;
    directionalIntensity?: number;
}

/**
 * Опции для создания контролов
 */
export interface CreateControlsOptions {
    enableDamping?: boolean;
    dampingFactor?: number;
    polarAngle?: number;
}

/**
 * Результат создания освещения
 */
export interface LightsResult {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
}

/**
 * Универсальный модуль для инициализации Three.js сцены
 * Используется в Assembler.js и других визуализаторах
 */

/**
 * Создать сцену с базовым фоном и помощниками
 */
export function createScene(options: CreateSceneOptions = {}): THREE.Scene {
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
 */
export function createCamera(options: CreateCameraOptions = {}): THREE.PerspectiveCamera {
    const {
        fov = 45,
        position = [1.5, 1, 2],
        container = null
    } = options;

    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    const camera = new THREE.PerspectiveCamera(
        fov,
        width / height,
        0.1,
        1000
    );
    camera.position.set(...position);
    
    // ⚠️ ВАЖНО: зафиксировать ось Y вертикально (не дать ей вращаться)
    camera.up.set(0, 1, 0);  // Y-axis всегда вверх
    
    // Камера смотрит на центр сцены
    camera.lookAt(0, 0, 0);

    return camera;
}

/**
 * Создать рендерер с настройками по умолчанию
 */
export function createRenderer(options: CreateRendererOptions = {}): THREE.WebGLRenderer {
    const {
        antialias = true,
        shadows = true,
        container = null
    } = options;

    const renderer = new THREE.WebGLRenderer({ antialias });
    
    // Если есть контейнер, используем его размеры, иначе - размеры окна
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    if (shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Добавляем в контейнер если указан, иначе в body
    if (container) {
        container.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }

    return renderer;
}

/**
 * Создать освещение для сцены
 */
export function createLights(scene: THREE.Scene, options: CreateLightsOptions = {}): LightsResult {
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
 */
export function createControls(
    camera: THREE.Camera, 
    domElement: HTMLElement, 
    options: CreateControlsOptions = {}
): OrbitControls {
    const {
        enableDamping = true,
        dampingFactor = 0.05,
        polarAngle = CAMERA.DEFAULT_POLAR_ANGLE
    } = options;

    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    
    // ⚠️ Заблокировать вращение вверх-вниз (только влево-вправо)
    // Устанавливаем фиксированный полярный угол
    controls.minPolarAngle = polarAngle;
    controls.maxPolarAngle = polarAngle;
    
    // Отключить auto-rotate
    controls.autoRotate = false;

    return controls;
}

/**
 * Настроить автоматическую адаптацию при изменении размера окна
 */
export function setupResizeHandler(
    camera: THREE.PerspectiveCamera, 
    renderer: THREE.WebGLRenderer, 
    container: HTMLElement | null = null
): void {
    window.addEventListener('resize', () => {
        const width = container ? container.clientWidth : window.innerWidth;
        const height = container ? container.clientHeight : window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
}

/**
 * Полная инициализация сцены (all-in-one)
 */
export function initializeScene(options: SceneInitOptions): SceneInitResult {
    const { container = null } = options;
    
    const scene = createScene(options);
    const camera = createCamera({ 
        fov: 45,
        position: [1.5, 1, 2],
        container 
    });
    const renderer = createRenderer({ 
        antialias: true,
        shadows: true,
        container 
    });
    const lightsOptions: CreateLightsOptions = {};
    if (options.ambientIntensity !== undefined) {
        lightsOptions.ambientIntensity = options.ambientIntensity;
    }
    if (options.directionalIntensity !== undefined) {
        lightsOptions.directionalIntensity = options.directionalIntensity;
    }
    createLights(scene, lightsOptions);
    
    const controlsOptions: CreateControlsOptions = {
        enableDamping: true,
        dampingFactor: 0.05
    };
    if (options.polarAngle !== undefined) {
        controlsOptions.polarAngle = options.polarAngle;
    }
    const controls = createControls(camera, renderer.domElement, controlsOptions);

    setupResizeHandler(camera, renderer, container);

    return { scene, camera, renderer, controls };
}

