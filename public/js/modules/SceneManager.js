// ====== ОТЛАДКА ======
console.log('🔄 SceneManager.js начал загрузку');

/**
 * SceneManager — управление основной 3D-сценой
 * Создает комнату, освещение, камеру, рендерер
 */

import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { Tween, Easing } from '../libs/tween.esm.js';
import { tweenGroup } from './CabinetModel.js';

export class SceneManager {
    constructor(containerElement) {
        console.log('🏗️ SceneManager constructor вызван');
        console.log('  containerElement:', containerElement);
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        this.stats = null; // FPS монитор
        
        // Параметры комнаты (мм)
        this.roomWidth = 5000;
        this.roomHeight = 3000;
        this.roomDepth = 4000;
        
        // Центр комнаты на полу (точка вращения камеры)
        this.roomCenter = new THREE.Vector3(0, 0, 0);
        
        // Хранилище объектов для raycast
        this.interactiveObjects = [];
        
        this.init();
    }
    
    init() {
        console.log('🚀 SceneManager init() запущен');
        
        // Проверка WebGL
        if (!this.checkWebGLSupport()) {
            console.error('❌ WebGL не поддерживается');
            this.showWebGLError();
            return;
        }
        
        console.log('✅ WebGL поддерживается');
        
        // Создание сцены
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        // Камера (вид сверху-сбоку)
        const aspect = this.container.clientWidth / this.container.clientHeight;
        // NEAR увеличен с 0.1 до 10 — убирает z-fighting (мигающие артефакты)
        this.camera = new THREE.PerspectiveCamera(50, aspect, 10, 1000000);
        
        // ====================================================================
        // НАЧАЛЬНАЯ ПОЗИЦИЯ КАМЕРЫ (изменяйте ЭТИ значения для поворота вида)
        // ====================================================================
        // Исходная позиция: (3000, 2500, 3000) - вид из угла под 45°
        // Для поворота на 45° ВПРАВО от исходного положения:
        //   Исходный азимут: 45° (π/4)
        //   Новый азимут: 0° (вид строго с СЕВЕРА, вдоль оси Z)
        
        const radius = Math.sqrt(3000 * 3000 + 2500 * 2500 + 3000 * 3000); // Расстояние от центра
        const polarAngle = Math.acos(2500 / radius);      // Наклон камеры (вертикальный угол)
        const azimuthAngle = 0;                           // Азимут 0° = вид СТРОГО С СЕВЕРА (45° вправо от исходного)
        
        // Пересчёт сферических координат в декартовы (X, Y, Z)
        const x = radius * Math.sin(polarAngle) * Math.sin(azimuthAngle);
        const y = radius * Math.cos(polarAngle);
        const z = radius * Math.sin(polarAngle) * Math.cos(azimuthAngle);
        
        console.log('📹 Начальная позиция камеры (повёрнута на 45° вправо):');
        console.log(`  Азимут: ${(azimuthAngle * 180 / Math.PI).toFixed(0)}°`);
        console.log(`  Полярный угол: ${(polarAngle * 180 / Math.PI).toFixed(0)}°`);
        console.log(`  Позиция: X=${x.toFixed(0)}, Y=${y.toFixed(0)}, Z=${z.toFixed(0)}`);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.roomCenter);
        
        // ═══════════════════════════════════════════════════════════════
        // 🎨 ПРОФЕССИОНАЛЬНЫЙ РЕНДЕРЕР (как в glTF Viewer)
        // ═══════════════════════════════════════════════════════════════
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,           // Сглаживание краёв
            alpha: false,              // Непрозрачный фон
            powerPreference: 'high-performance',  // Использовать дискретную видеокарту
            preserveDrawingBuffer: true // Для скриншотов
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Retina displays
        
        // ═══════════════════════════════════════════════════════════════
        // ✨ ФИЗИЧЕСКИ КОРРЕКТНЫЙ РЕНДЕРИНГ (PBR)
        // ═══════════════════════════════════════════════════════════════
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;  // Кинематографическое тонирование
        this.renderer.toneMappingExposure = 0.8;                  // Экспозиция СНИЖЕНА с 1.0 (убирает засветку)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;    // Правильное цветовое пространство
        
        // ═══════════════════════════════════════════════════════════════
        // 🌑 ТЕНИ ВЫСОКОГО КАЧЕСТВА
        // ═══════════════════════════════════════════════════════════════
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;    // Мягкие тени
        // Альтернативы: THREE.BasicShadowMap (быстро), THREE.VSMShadowMap (лучше качество)
        
        // ═══════════════════════════════════════════════════════════════
        // 🔥 ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ КАЧЕСТВА
        // ═══════════════════════════════════════════════════════════════
        this.renderer.physicallyCorrectLights = true;  // ⚠️ Deprecated в r155+, но улучшает освещение
        
        console.log('✅ Рендерер настроен:', {
            toneMapping: 'ACESFilmic',
            exposure: this.renderer.toneMappingExposure,
            shadows: 'PCFSoft',
            colorSpace: 'sRGB'
        });
        
        // Добавляем canvas в начало контейнера (перед кнопками управления)
        if (this.container.firstChild) {
            this.container.insertBefore(this.renderer.domElement, this.container.firstChild);
        } else {
            this.container.appendChild(this.renderer.domElement);
        }
        
        // Управление камерой (как в Blender)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // BLENDER-СТИЛЬ УПРАВЛЕНИЯ:
        this.controls.enablePan = true;          // Shift + средняя кнопка = панорамирование
        this.controls.screenSpacePanning = true; // Панорамирование в плоскости экрана (как в Blender)
        this.controls.enableZoom = false;        // ОТКЛЮЧЕН zoom OrbitControls
        this.controls.enableRotate = true;       // Средняя кнопка = вращение
        
        // Настройки как в Blender:
        // ЛКМ = выбор/drag моделей (управляется InteractionController)
        // Средняя кнопка = вращение камеры
        // ПКМ = панорамирование камеры
        this.controls.mouseButtons = {
            LEFT: null,                  // ЛКМ освобождена для drag моделей
            MIDDLE: THREE.MOUSE.ROTATE,  // Средняя = вращение (как в Blender)
            RIGHT: THREE.MOUSE.PAN       // ПКМ = панорамирование
        };
        
        this.controls.minDistance = 100;     // Минимум 100 мм — можно рассмотреть объект
        this.controls.maxDistance = 1000000; // Дальняя дистанция — 1 км
        this.controls.zoomSpeed = 1.0;       // Скорость зума (как в Blender)
        this.controls.rotateSpeed = 1.0;     // Скорость вращения
        this.controls.panSpeed = 0.8;        // Скорость панорамирования
        
        // Камера вращается вокруг центра комнаты на полу (0, 0, 0)
        this.controls.target.copy(this.roomCenter);
        
        // Создание упрощенной комнаты
        this.createRoom();
        
        // Освещение
        this.setupLighting();
        
        // Оси координат (для отладки) - визуализация осей X, Y, Z
        const axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(axesHelper);
        
        // Добавляем подписи к осям для лучшей визуализации
        this.createAxisLabels();
        
        // Stats.js — FPS монитор (для отладки производительности)
        this.initStats();
        
        // Обработчик resize
        this.resizeHandler = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.resizeHandler, false);
        
        // ═══════════════════════════════════════════════════════════════
        // 🚫 ОТКЛЮЧЕНИЕ ПРОКРУТКИ СТРАНИЦЫ НАД 3D-СЦЕНОЙ
        // ═══════════════════════════════════════════════════════════════
        // Блокируем скролл браузера, когда курсор над canvas
        this.setupScrollLock();
        
        // Запуск анимации
        this.animate();
        
        console.log('✅ SceneManager инициализирован');
    }
    
    /**
     * 🚫 Блокировка прокрутки страницы над 3D-сценой
     * 
     * Проблема: При вращении камеры средней кнопкой мыши (или колесом)
     * браузер также прокручивает страницу, что мешает управлению 3D-сценой.
     * 
     * Решение: Отключаем события прокрутки на уровне window когда курсор
     * находится над canvas элементом 3D-сцены.
     */
    setupScrollLock() {
        const canvas = this.renderer.domElement;
        
        // Флаг: курсор над canvas
        let isOverCanvas = false;
        
        // Обработчик блокировки прокрутки
        const preventScroll = (e) => {
            if (isOverCanvas) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        
        // Отслеживаем вход курсора на canvas
        canvas.addEventListener('mouseenter', () => {
            isOverCanvas = true;
            document.body.style.overflow = 'hidden'; // Блокируем прокрутку body
        });
        
        // Отслеживаем выход курсора с canvas
        canvas.addEventListener('mouseleave', () => {
            isOverCanvas = false;
            document.body.style.overflow = ''; // Восстанавливаем прокрутку
        });
        
        // Блокируем прокрутку колесом мыши НА УРОВНЕ WINDOW
        window.addEventListener('wheel', preventScroll, { passive: false, capture: true });
        
        // Блокируем прокрутку на canvas (дополнительно)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        // Блокируем touch-скролл на мобильных
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Блокируем средний клик (авто-скролл в браузере)
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Средняя кнопка
                e.preventDefault();
            }
        });
        
        canvas.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
        
        console.log('✅ Scroll lock настроен для 3D-сцены');
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    showWebGLError() {
        this.container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e74c3c;">
                <h3>WebGL не поддерживается</h3>
                <p>Ваш браузер не поддерживает WebGL. Попробуйте обновить браузер.</p>
            </div>
        `;
    }
    
    createRoom() {
        // Пол (сетка)
        const gridHelper = new THREE.GridHelper(this.roomWidth, 50, 0xcccccc, 0xe5e5e5);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
        
        // Пол (плоскость для теней)
        const floorGeometry = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth);
        const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.name = 'floor';
        this.scene.add(floor);
        
        // Стены (линии контура комнаты)
        const wallMaterial = new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 1 });
        
        // Задняя стена
        const backWallPoints = [
            new THREE.Vector3(-this.roomWidth / 2, 0, -this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, 0, -this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, this.roomHeight, -this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, this.roomHeight, -this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, 0, -this.roomDepth / 2)
        ];
        const backWallGeometry = new THREE.BufferGeometry().setFromPoints(backWallPoints);
        const backWall = new THREE.Line(backWallGeometry, wallMaterial);
        backWall.name = 'backWall';
        this.scene.add(backWall);
        
        // Левая стена
        const leftWallPoints = [
            new THREE.Vector3(-this.roomWidth / 2, 0, -this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, 0, this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, this.roomHeight, this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, this.roomHeight, -this.roomDepth / 2),
            new THREE.Vector3(-this.roomWidth / 2, 0, -this.roomDepth / 2)
        ];
        const leftWallGeometry = new THREE.BufferGeometry().setFromPoints(leftWallPoints);
        const leftWall = new THREE.Line(leftWallGeometry, wallMaterial);
        leftWall.name = 'leftWall';
        this.scene.add(leftWall);
        
        // Правая стена
        const rightWallPoints = [
            new THREE.Vector3(this.roomWidth / 2, 0, -this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, 0, this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, this.roomHeight, this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, this.roomHeight, -this.roomDepth / 2),
            new THREE.Vector3(this.roomWidth / 2, 0, -this.roomDepth / 2)
        ];
        const rightWallGeometry = new THREE.BufferGeometry().setFromPoints(rightWallPoints);
        const rightWall = new THREE.Line(rightWallGeometry, wallMaterial);
        rightWall.name = 'rightWall';
        this.scene.add(rightWall);
        
        // Невидимые плоскости стен для raycast (для размещения подвесных шкафов)
        this.createInvisibleWalls();
    }
    
    createInvisibleWalls() {
        // Задняя стена (невидимая плоскость для raycast)
        const backWallPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(this.roomWidth, this.roomHeight),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        backWallPlane.position.set(0, this.roomHeight / 2, -this.roomDepth / 2);
        backWallPlane.name = 'backWallPlane';
        backWallPlane.userData.isWall = true;
        this.scene.add(backWallPlane);
        this.interactiveObjects.push(backWallPlane);
        
        // Левая стена
        const leftWallPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(this.roomDepth, this.roomHeight),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        leftWallPlane.position.set(-this.roomWidth / 2, this.roomHeight / 2, 0);
        leftWallPlane.rotation.y = Math.PI / 2;
        leftWallPlane.name = 'leftWallPlane';
        leftWallPlane.userData.isWall = true;
        this.scene.add(leftWallPlane);
        this.interactiveObjects.push(leftWallPlane);
        
        // Правая стена
        const rightWallPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(this.roomDepth, this.roomHeight),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        rightWallPlane.position.set(this.roomWidth / 2, this.roomHeight / 2, 0);
        rightWallPlane.rotation.y = -Math.PI / 2;
        rightWallPlane.name = 'rightWallPlane';
        rightWallPlane.userData.isWall = true;
        this.scene.add(rightWallPlane);
        this.interactiveObjects.push(rightWallPlane);
    }
    
    setupLighting() {
        // ═══════════════════════════════════════════════════════════════
        // 💡 ОПТИМИЗИРОВАННОЕ ОСВЕЩЕНИЕ — 3 источника на равном расстоянии
        // ═══════════════════════════════════════════════════════════════
        
        const distance = 4000;  // Расстояние от центра (мм)
        const height = 3000;    // Высота всех источников (мм)
        const intensity = 0.6;  // Одинаковая интенсивность для всех
        
        // 1️⃣ LIGHT 1 — Позиция: 0° (впереди)
        const light1 = new THREE.DirectionalLight(0xffffff, intensity);
        light1.position.set(0, height, distance);
        light1.castShadow = true;
        
        // Настройки теней (только для одного источника, чтобы снизить нагрузку)
        light1.shadow.camera.left = -3000;
        light1.shadow.camera.right = 3000;
        light1.shadow.camera.top = 3000;
        light1.shadow.camera.bottom = -3000;
        light1.shadow.camera.near = 100;
        light1.shadow.camera.far = 8000;
        light1.shadow.mapSize.width = 2048;
        light1.shadow.mapSize.height = 2048;
        light1.shadow.bias = -0.001;
        light1.shadow.normalBias = 0.05;
        
        this.scene.add(light1);
        
        // 2️⃣ LIGHT 2 — Позиция: 120° (сзади-слева)
        const angle2 = (120 * Math.PI) / 180;
        const light2 = new THREE.DirectionalLight(0xffffff, intensity);
        light2.position.set(
            Math.sin(angle2) * distance,
            height,
            Math.cos(angle2) * distance
        );
        this.scene.add(light2);
        
        // 3️⃣ LIGHT 3 — Позиция: 240° (сзади-справа)
        const angle3 = (240 * Math.PI) / 180;
        const light3 = new THREE.DirectionalLight(0xffffff, intensity);
        light3.position.set(
            Math.sin(angle3) * distance,
            height,
            Math.cos(angle3) * distance
        );
        this.scene.add(light3);
        
        console.log('✅ Освещение настроено: 3 источника на равном расстоянии');
        console.log('  Расстояние:', distance, 'мм');
        console.log('  Высота:', height, 'мм');
        console.log('  Интенсивность:', intensity);
        
        // Сохраняем ссылки на источники света
        this.light1 = light1;
        this.light2 = light2;
        this.light3 = light3;
    }
    
    /**
     * 🎛️ Добавление GUI-панели управления (как в glTF Viewer)
     */
    addGUI() {
        if (typeof dat === 'undefined') {
            console.warn('⚠️ dat.GUI не загружен, панель управления недоступна');
            return;
        }
        
        // Создаём GUI-панель
        this.gui = new dat.GUI({
            autoPlace: false,
            width: 300,
            hideable: true,
        });
        
        // Состояние для контролов (МЯГКИЙ РЕЖИМ по умолчанию)
        this.guiState = {
            // Рендеринг
            exposure: 0.8,  // ← СНИЖЕНО с 1.0 (убирает засветку)
            toneMapping: 'ACESFilmic',
            wireframe: false,
            grid: true,
            autoRotate: false,
            
            // Освещение (мягкие значения)
            keyIntensity: 0.8,    // ← Снижено с 1.2 (мягче)
            fillIntensity: 0.6,   // ← Увеличено с 0.5 (больше заполнения)
            rimIntensity: 0.2,    // ← Снижено с 0.3 (меньше контраста)
            ambientIntensity: 0.6, // ← Базовая яркость (мягкий режим)
            
            // Цвета света
            keyColor: '#ffffff',
            fillColor: '#ffffff',
            rimColor: '#ffffff',
            ambientColor: '#ffffff',
            
            // Окружение
            envIntensity: 1.0,  // Интенсивность environment map (отражений)
            
            // Фон
            bgColor: '#f5f5f5',
        };
        
        // ═══════════════════════════════════════════════════════════════
        // 📺 ПАПКА: Display (Отображение)
        // ═══════════════════════════════════════════════════════════════
        const displayFolder = this.gui.addFolder('Display');
        
        displayFolder.add(this.guiState, 'wireframe').name('Wireframe').onChange((value) => {
            this.scene.traverse((obj) => {
                if (obj.isMesh && obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.wireframe = value);
                    } else {
                        obj.material.wireframe = value;
                    }
                }
            });
        });
        
        displayFolder.add(this.guiState, 'grid').name('Grid').onChange((value) => {
            const grid = this.scene.getObjectByName('Floor_Grid');
            if (grid) grid.visible = value;
        });
        
        displayFolder.add(this.guiState, 'autoRotate').name('Auto Rotate').onChange((value) => {
            this.controls.autoRotate = value;
        });
        
        displayFolder.addColor(this.guiState, 'bgColor').name('Background').onChange((color) => {
            this.scene.background.set(color);
        });
        
        displayFolder.open();
        
        // ═══════════════════════════════════════════════════════════════
        // 🎨 ПАПКА: Rendering (Рендеринг)
        // ═══════════════════════════════════════════════════════════════
        const renderFolder = this.gui.addFolder('Rendering');
        
        renderFolder.add(this.guiState, 'exposure', 0.1, 3.0, 0.01).name('Exposure').onChange((value) => {
            this.renderer.toneMappingExposure = value;
        });
        
        renderFolder.add(this.guiState, 'envIntensity', 0, 3.0, 0.1).name('Environment').onChange((value) => {
            // Изменяем интенсивность отражений на всех материалах
            this.scene.traverse((obj) => {
                if (obj.isMesh && obj.material) {
                    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                    materials.forEach(mat => {
                        if (mat.envMapIntensity !== undefined) {
                            mat.envMapIntensity = value;
                            mat.needsUpdate = true;
                        }
                    });
                }
            });
        });
        
        renderFolder.add(this.guiState, 'toneMapping', {
            'Linear': 'Linear',
            'ACES Filmic': 'ACESFilmic',
            'Reinhard': 'Reinhard',
            'Cineon': 'Cineon',
        }).name('Tone Mapping').onChange((value) => {
            switch(value) {
                case 'Linear':
                    this.renderer.toneMapping = THREE.LinearToneMapping;
                    break;
                case 'ACESFilmic':
                    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    break;
                case 'Reinhard':
                    this.renderer.toneMapping = THREE.ReinhardToneMapping;
                    break;
                case 'Cineon':
                    this.renderer.toneMapping = THREE.CineonToneMapping;
                    break;
            }
        });
        
        renderFolder.open();
        
        // ═══════════════════════════════════════════════════════════════
        // 💡 ПАПКА: Lighting (Освещение)
        // ═══════════════════════════════════════════════════════════════
        const lightFolder = this.gui.addFolder('Lighting');
        
        lightFolder.add(this.guiState, 'keyIntensity', 0, 5, 0.1).name('Key Light').onChange((value) => {
            if (this.keyLight) this.keyLight.intensity = value;
        });
        
        lightFolder.add(this.guiState, 'fillIntensity', 0, 3, 0.1).name('Fill Light').onChange((value) => {
            if (this.fillLight) this.fillLight.intensity = value;
        });
        
        lightFolder.add(this.guiState, 'rimIntensity', 0, 2, 0.1).name('Rim Light').onChange((value) => {
            if (this.rimLight) this.rimLight.intensity = value;
        });
        
        lightFolder.add(this.guiState, 'ambientIntensity', 0, 2, 0.1).name('Ambient').onChange((value) => {
            if (this.ambientLight) this.ambientLight.intensity = value;
        });
        
        lightFolder.addColor(this.guiState, 'keyColor').name('Key Color').onChange((color) => {
            if (this.keyLight) this.keyLight.color.set(color);
        });
        
        lightFolder.addColor(this.guiState, 'ambientColor').name('Ambient Color').onChange((color) => {
            if (this.ambientLight) this.ambientLight.color.set(color);
        });
        
        // ═══════════════════════════════════════════════════════════════
        // 🎭 ПРЕСЕТЫ ОСВЕЩЕНИЯ
        // ═══════════════════════════════════════════════════════════════
        const presets = {
            'Мягкий (по умолчанию)': () => {
                this.guiState.keyIntensity = 0.8;
                this.guiState.fillIntensity = 0.6;
                this.guiState.rimIntensity = 0.2;
                this.guiState.ambientIntensity = 0.6;
                this.applyLightingPreset();
            },
            'Жёсткий (контрастный)': () => {
                this.guiState.keyIntensity = 1.5;
                this.guiState.fillIntensity = 0.3;
                this.guiState.rimIntensity = 0.5;
                this.guiState.ambientIntensity = 0.2;
                this.applyLightingPreset();
            },
            'Равномерный (студия)': () => {
                this.guiState.keyIntensity = 1.0;
                this.guiState.fillIntensity = 0.8;
                this.guiState.rimIntensity = 0.3;
                this.guiState.ambientIntensity = 0.7;
                this.applyLightingPreset();
            },
            'Драматичный (тёмный)': () => {
                this.guiState.keyIntensity = 1.2;
                this.guiState.fillIntensity = 0.2;
                this.guiState.rimIntensity = 0.6;
                this.guiState.ambientIntensity = 0.2;
                this.applyLightingPreset();
            },
            'Яркий (презентация)': () => {
                this.guiState.keyIntensity = 1.0;
                this.guiState.fillIntensity = 0.7;
                this.guiState.rimIntensity = 0.3;
                this.guiState.ambientIntensity = 0.8;
                this.applyLightingPreset();
            }
        };
        
        lightFolder.add(presets, 'Мягкий (по умолчанию)').name('▶ Мягкий свет');
        lightFolder.add(presets, 'Жёсткий (контрастный)').name('▶ Жёсткий свет');
        lightFolder.add(presets, 'Равномерный (студия)').name('▶ Студийный');
        lightFolder.add(presets, 'Драматичный (тёмный)').name('▶ Драматичный');
        lightFolder.add(presets, 'Яркий (презентация)').name('▶ Презентация');
        
        lightFolder.open();
        
        // ═══════════════════════════════════════════════════════════════
        // 📍 РАЗМЕЩЕНИЕ GUI
        // ═══════════════════════════════════════════════════════════════
        const guiContainer = document.createElement('div');
        guiContainer.classList.add('gui-container');
        guiContainer.style.position = 'absolute';
        guiContainer.style.top = '10px';
        guiContainer.style.right = '10px';
        guiContainer.style.zIndex = '1000';
        guiContainer.appendChild(this.gui.domElement);
        this.container.appendChild(guiContainer);
        
        console.log('✅ GUI-панель создана');
        
        // ═══════════════════════════════════════════════════════════════
        // ⏱️ АВТОМАТИЧЕСКОЕ ЗАКРЫТИЕ GUI через 3 секунды
        // ═══════════════════════════════════════════════════════════════
        setTimeout(() => {
            if (this.gui) {
                this.gui.close();
                console.log('📦 GUI автоматически свёрнута (3 сек после загрузки)');
            }
        }, 3000);
    }
    
    /**
     * 🎭 Применение пресета освещения
     */
    applyLightingPreset() {
        if (this.keyLight) this.keyLight.intensity = this.guiState.keyIntensity;
        if (this.fillLight) this.fillLight.intensity = this.guiState.fillIntensity;
        if (this.rimLight) this.rimLight.intensity = this.guiState.rimIntensity;
        if (this.ambientLight) this.ambientLight.intensity = this.guiState.ambientIntensity;
        
        // Обновляем GUI контролы
        if (this.gui) {
            this.gui.updateDisplay();
        }
        
        console.log('✅ Пресет освещения применён:', {
            key: this.guiState.keyIntensity,
            fill: this.guiState.fillIntensity,
            rim: this.guiState.rimIntensity,
            ambient: this.guiState.ambientIntensity
        });
    }
    
    createAxisLabels() {
        // Создаем более крупные и яркие оси для лучшей видимости
        const axisLength = 1500; // мм
        
        // Ось X (красная) - горизонтальная ось (влево-вправо)
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        xAxis.name = 'X_Axis';
        this.scene.add(xAxis);
        
        // Ось Y (зеленая) - вертикальная ось (вверх-вниз)
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        yAxis.name = 'Y_Axis';
        this.scene.add(yAxis);
        
        // Ось Z (синяя) - горизонтальная ось (вперед-назад)
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        zAxis.name = 'Z_Axis';
        this.scene.add(zAxis);
        
        console.log('✅ Оси координат добавлены на сцену');
        console.log('  X (красная) - горизонтальная ось (влево-вправо)');
        console.log('  Y (зеленая) - вертикальная ось (вверх-вниз)');
        console.log('  Z (синяя) - горизонтальная ось (вперед-назад)');
    }

    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    async initStats() {
        // Создать FPS монитор (только если включен режим отладки)
        const debugMode = new URLSearchParams(window.location.search).has('debug');
        
        if (debugMode) {
            // Динамическая загрузка Stats.js (UMD-модуль)
            const script = document.createElement('script');
            script.src = '/js/libs/stats.min.js';
            script.onload = () => {
                if (window.Stats) {
                    this.stats = new window.Stats();
                    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
                    this.stats.dom.style.position = 'absolute';
                    this.stats.dom.style.top = '10px';
                    this.stats.dom.style.left = '10px';
                    this.stats.dom.style.zIndex = '9999';
                    this.container.appendChild(this.stats.dom);
                    console.log('📊 Stats.js активирован (?debug в URL для отображения)');
                } else {
                    console.error('Stats.js загружен, но window.Stats не найден');
                }
            };
            script.onerror = () => {
                console.error('Не удалось загрузить Stats.js');
            };
            document.head.appendChild(script);
        }
    }
    
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        // Обновить Stats.js (если включен)
        if (this.stats) this.stats.begin();
        
        // Обновить TWEEN анимации шкафов (двери, движение и т.д.)
        tweenGroup.update();
        
        // Обновить глобальные TWEEN анимации (камера, переходы режимов)
        if (typeof TWEEN !== 'undefined' && TWEEN.update) {
            TWEEN.update();
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        
        // Завершить измерение Stats.js
        if (this.stats) this.stats.end();
    }
    
    addToScene(object) {
        this.scene.add(object);
    }
    
    removeFromScene(object) {
        this.scene.remove(object);
    }
    
    // focusOnObject() УДАЛЁН — камера остаётся в начальной позиции (вид с севера)
    // Причина: метод разворачивал камеру после загрузки шкафа
    
    updateCameraClipping(box) {
        if (!box) return;
        const size = new THREE.Vector3();
        box.getSize(size);
        const diagonal = size.length();
        const desiredFar = Math.max(diagonal * 4, 20000);
        if (desiredFar > this.camera.far * 0.9) {
            this.camera.far = Math.min(desiredFar, 5000000);
            this.camera.updateProjectionMatrix();
        }
        const desiredMaxDistance = Math.max(diagonal * 2, 50000);
        if (desiredMaxDistance > this.controls.maxDistance) {
            this.controls.maxDistance = desiredMaxDistance;
        }
    }
    
    /**
     * Вращение камеры вокруг сцены
     * @param {string} direction - 'up', 'down', 'left', 'right'
     */
    rotateCamera(direction) {
        const rotationSpeed = 0.3; // радианы
        const currentAzimuth = this.controls.getAzimuthalAngle();
        const currentPolar = this.controls.getPolarAngle();
        
        switch(direction) {
            case 'up':
                // Вращение вверх (уменьшить polar angle)
                const newPolarUp = Math.max(currentPolar - rotationSpeed, 0.1);
                this.animateCameraRotation(currentAzimuth, newPolarUp);
                break;
                
            case 'down':
                // Вращение вниз (увеличить polar angle)
                const newPolarDown = Math.min(currentPolar + rotationSpeed, Math.PI - 0.1);
                this.animateCameraRotation(currentAzimuth, newPolarDown);
                break;
                
            case 'left':
                // Вращение влево (увеличить azimuthal angle)
                this.animateCameraRotation(currentAzimuth + rotationSpeed, currentPolar);
                break;
                
            case 'right':
                // Вращение вправо (уменьшить azimuthal angle)
                this.animateCameraRotation(currentAzimuth - rotationSpeed, currentPolar);
                break;
        }
    }
    
    /**
     * Плавная анимация вращения камеры
     */
    animateCameraRotation(targetAzimuth, targetPolar) {
        const duration = 300; // мс
        const startAzimuth = this.controls.getAzimuthalAngle();
        const startPolar = this.controls.getPolarAngle();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing: ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Интерполяция углов
            const currentAzimuth = startAzimuth + (targetAzimuth - startAzimuth) * eased;
            const currentPolar = startPolar + (targetPolar - startPolar) * eased;
            
            // Вычислить новую позицию камеры
            const radius = this.camera.position.distanceTo(this.controls.target);
            const x = radius * Math.sin(currentPolar) * Math.sin(currentAzimuth);
            const y = radius * Math.cos(currentPolar);
            const z = radius * Math.sin(currentPolar) * Math.cos(currentAzimuth);
            
            this.camera.position.set(
                this.controls.target.x + x,
                this.controls.target.y + y,
                this.controls.target.z + z
            );
            this.camera.lookAt(this.controls.target);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * Зум камеры
     * @param {string} direction - 'in' или 'out'
     */
    zoomCamera(direction) {
        const zoomSpeed = 0.15; // 15% от текущего расстояния
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        
        let targetDistance;
        if (direction === 'in') {
            targetDistance = currentDistance * (1 - zoomSpeed);
            targetDistance = Math.max(targetDistance, this.controls.minDistance);
        } else {
            targetDistance = currentDistance * (1 + zoomSpeed);
            targetDistance = Math.min(targetDistance, this.controls.maxDistance);
        }
        
        this.animateCameraZoom(targetDistance);
    }
    
    /**
     * Плавная анимация зума
     */
    animateCameraZoom(targetDistance) {
        const duration = 200; // мс
        const startDistance = this.camera.position.distanceTo(this.controls.target);
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing: ease-out quad
            const eased = 1 - Math.pow(1 - progress, 2);
            
            const currentDistance = startDistance + (targetDistance - startDistance) * eased;
            
            // Вычислить направление от target к камере
            const direction = new THREE.Vector3()
                .subVectors(this.camera.position, this.controls.target)
                .normalize();
            
            // Установить новую позицию камеры
            this.camera.position.copy(this.controls.target).add(direction.multiplyScalar(currentDistance));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * Сброс камеры в исходное положение (вид с севера, азимут 0°)
     */
    resetCamera() {
        // Возвращаем камеру в начальную позицию (вид с севера)
        const defaultDistance = 5000;         // Расстояние от центра
        const defaultPolar = Math.acos(2500 / Math.sqrt(3000 * 3000 + 2500 * 2500 + 3000 * 3000)); // Исходный наклон
        const defaultAzimuth = 0;             // Азимут 0° = вид строго с СЕВЕРА
        
        this.animateCameraRotation(defaultAzimuth, defaultPolar);
        this.animateCameraZoom(defaultDistance);
    }
    
    /**
     * Добавить объект на сцену
     * @param {THREE.Object3D} object3D 
     */
    addToScene(object3D) {
        console.log('➕ SceneManager.addToScene() вызван');
        console.log('  Объект:', object3D?.name || object3D?.type || 'unnamed');
        console.log('  Позиция:', object3D?.position);
        console.log('  Видимость:', object3D?.visible);
        
        if (!object3D) {
            console.error('❌ Попытка добавить null/undefined на сцену!');
            return;
        }
        
        this.scene.add(object3D);
        console.log('  ✅ Объект добавлен на сцену');
        console.log('  📊 Всего объектов на сцене:', this.scene.children.length);
        
        // Добавить в список интерактивных объектов для raycasting
        object3D.traverse((child) => {
            if (child.isMesh) {
                this.interactiveObjects.push(child);
            }
        });
        console.log('  📊 Всего интерактивных объектов:', this.interactiveObjects.length);
    }
    
    /**
     * Удалить объект со сцены
     * @param {THREE.Object3D} object3D 
     */
    removeFromScene(object3D) {
        console.log('➖ SceneManager.removeFromScene() вызван');
        
        if (!object3D) {
            console.warn('⚠️ Попытка удалить null/undefined со сцены');
            return;
        }
        
        this.scene.remove(object3D);
        
        // Удалить из интерактивных объектов
        object3D.traverse((child) => {
            if (child.isMesh) {
                const index = this.interactiveObjects.indexOf(child);
                if (index > -1) {
                    this.interactiveObjects.splice(index, 1);
                }
            }
        });
        
        console.log('  ✅ Объект удален со сцены');
    }
    
    /**
     * 🔦 Управление внутренним светом (включается/выключается при открытии/закрытии двери)
     * @param {boolean} enable - true для включения, false для выключения
     * @param {THREE.Object3D} cabinetModel - модель шкафа (для позиционирования света)
     */
    setInteriorLight(enable, cabinetModel = null) {
        console.log('🔦 setInteriorLight вызван:', {
            enable,
            hasPointLight: !!this.interiorPointLight,
            hasCabinet: !!cabinetModel,
            currentIntensity: this.interiorPointLight ? this.interiorPointLight.intensity : 'N/A'
        });
        
        if (!this.interiorPointLight) {
            console.warn('⚠️ InteriorPointLight не создан');
            return;
        }
        
        if (enable) {
            // Включаем свет с анимацией (плавное увеличение интенсивности)
            const targetIntensity = 3.0; // Яркость света внутрь (PointLight эффективнее)
            
            // Позиционируем свет относительно шкафа (если передан)
            if (cabinetModel) {
                const cabinetBox = new THREE.Box3().setFromObject(cabinetModel);
                const center = cabinetBox.getCenter(new THREE.Vector3());
                const size = cabinetBox.getSize(new THREE.Vector3());
                
                console.log('📦 Параметры шкафа:', {
                    center: { x: center.x.toFixed(1), y: center.y.toFixed(1), z: center.z.toFixed(1) },
                    size: { x: size.x.toFixed(1), y: size.y.toFixed(1), z: size.z.toFixed(1) }
                });
                
                // Позиция света: ВНУТРИ шкафа (в центре) — светит во все стороны
                const lightPos = new THREE.Vector3(
                    center.x,                 // Центр по X
                    center.y,                 // Центр по Y
                    center.z - size.z * 0.1   // Немного сзади от центра (внутри)
                );
                
                this.interiorPointLight.position.copy(lightPos);
                
                console.log('💡 Позиция PointLight:', {
                    position: { x: lightPos.x.toFixed(1), y: lightPos.y.toFixed(1), z: lightPos.z.toFixed(1) },
                    distance: this.interiorPointLight.distance
                });
                
                this.interiorPointLight.updateMatrixWorld();
                
                // Обновляем helper для визуализации
                if (this.pointLightHelper) {
                    this.pointLightHelper.update();
                }
            }
            
            // Плавное включение света (TWEEN анимация)
            console.log('▶️ Запуск TWEEN анимации включения (0 → ' + targetIntensity + ')');
            new Tween({ intensity: this.interiorPointLight.intensity }, tweenGroup)
                .to({ intensity: targetIntensity }, 400) // 400мс
                .easing(Easing.Quadratic.Out)
                .onUpdate((obj) => {
                    this.interiorPointLight.intensity = obj.intensity;
                })
                .onComplete(() => {
                    console.log('✅ TWEEN анимация включения завершена, intensity:', this.interiorPointLight.intensity);
                })
                .start();
            
            console.log('🔦 Внутренний свет включён (целевая интенсивность:', targetIntensity, ')');
            
        } else {
            // Выключаем свет с анимацией (плавное уменьшение до 0)
            console.log('▶️ Запуск TWEEN анимации выключения (' + this.interiorPointLight.intensity + ' → 0)');
            new Tween({ intensity: this.interiorPointLight.intensity }, tweenGroup)
                .to({ intensity: 0 }, 300) // 300мс (быстрее чем включение)
                .easing(Easing.Quadratic.In)
                .onUpdate((obj) => {
                    this.interiorPointLight.intensity = obj.intensity;
                })
                .onComplete(() => {
                    console.log('✅ TWEEN анимация выключения завершена, intensity:', this.interiorPointLight.intensity);
                })
                .start();
            
            console.log('🔦 Внутренний свет выключен (начало анимации)');
        }
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.resizeHandler);
        this.renderer.dispose();
        this.controls.dispose();
        this.container.innerHTML = '';
    }
}

console.log('✅ SceneManager.js загружен полностью');
