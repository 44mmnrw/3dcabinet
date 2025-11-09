// ====== ОТЛАДКА ======
console.log('🔄 SceneManager.js начал загрузку');

/**
 * SceneManager — управление основной 3D-сценой
 * Создает комнату, освещение, камеру, рендерер
 */

import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
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
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000000);
        this.camera.position.set(3000, 2500, 3000);
        this.camera.lookAt(this.roomCenter);
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
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
        
        // Запуск анимации
        this.animate();
        
        console.log('✅ SceneManager инициализирован');
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
        // Ambient light (общее освещение)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        // Directional light (основной, с тенями)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2000, 3000, 1500);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -3000;
        dirLight.shadow.camera.right = 3000;
        dirLight.shadow.camera.top = 3000;
        dirLight.shadow.camera.bottom = -3000;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 6000;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);
        
        // Подсветка спереди (заполняющий свет)
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
        frontLight.position.set(0, 1500, 2500);
        this.scene.add(frontLight);
        
        // Подсветка сзади (для глубины)
        const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
        backLight.position.set(0, 1000, -2000);
        this.scene.add(backLight);
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
    
    focusOnObject(object) {
        // Автофокусировка камеры на bounding box модели (как в gltf-viewer)
        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        // Вычисляем максимальное измерение
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraDistance *= 1.5; // как в gltf-viewer — чуть дальше

    // Ограничения
    cameraDistance = Math.max(1000, cameraDistance);
    this.updateCameraClipping(box);
        if (cameraDistance > this.controls.maxDistance) {
            this.controls.maxDistance = cameraDistance * 2;
        }

        // Камера позиционируется по диагонали от центра bounding box
        this.camera.position.set(
            center.x + cameraDistance,
            center.y + cameraDistance,
            center.z + cameraDistance
        );
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }

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
     * Сброс камеры в исходное положение
     */
    resetCamera() {
        // Используем автофокус на все объекты сцены
        const allObjects = this.scene.children.filter(child => 
            child.userData.isCabinet || child.type === 'Group'
        );
        
        if (allObjects.length > 0) {
            this.focusOnObject(allObjects[0]); // Фокус на первый шкаф
        } else {
            // Если шкафов нет, возвращаем дефолтную позицию
            const defaultDistance = 2000;
            const defaultPolar = Math.PI / 3; // 60 градусов
            const defaultAzimuth = Math.PI / 4; // 45 градусов
            
            this.animateCameraRotation(defaultAzimuth, defaultPolar);
            this.animateCameraZoom(defaultDistance);
        }
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
