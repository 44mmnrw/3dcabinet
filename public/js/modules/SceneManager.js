/**
 * SceneManager — управление основной 3D-сценой
 * Создает комнату, освещение, камеру, рендерер
 */

import * as THREE from '../three.module.js';
import { OrbitControls } from '../OrbitControls.js';

export class SceneManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        
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
        // Проверка WebGL
        if (!this.checkWebGLSupport()) {
            console.error('WebGL не поддерживается');
            this.showWebGLError();
            return;
        }
        
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
        this.container.innerHTML = ''; // Очистить placeholder
        this.container.appendChild(this.renderer.domElement);
        
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
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,    // ЛКМ = вращение (или средняя в Blender)
            MIDDLE: THREE.MOUSE.DOLLY,   // Средняя = зум
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
    
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    addToScene(object) {
        this.scene.add(object);
        console.log(`  ✓ Объект добавлен на сцену:`, object.name || object.type);
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

        console.log(`\n  📷 === АВТОФОКУС КАМЕРЫ ===`);
        console.log(`  Bounding box центр: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`);
        console.log(`  Размер: ${size.x.toFixed(0)} × ${size.y.toFixed(0)} × ${size.z.toFixed(0)} мм`);
        console.log(`  Камера позиция: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`);
        console.log(`  Камера смотрит на: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`);
        console.log(`  Controls target: (${this.controls.target.x.toFixed(1)}, ${this.controls.target.y.toFixed(1)}, ${this.controls.target.z.toFixed(1)})`);
        console.log(`  ============================\n`);
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
