/* ================================================
   3Cabinet Собственная разработка
   ================================================ */

// Импорт локальных библиотек
import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('Three.js версия:', THREE.REVISION);
console.log('Three.js загружен:', !!THREE.WebGLRenderer);

// Ждем загрузки DOM и затем инициализируем приложение
async function init() {
    console.log('Инициализация приложения...');

    // Ждем полной загрузки DOM
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    console.log('DOM полностью загружен');
    console.log('DOM загружен, начинаем инициализацию...');
    
    // Проверяем поддержку WebGL
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL не поддерживается в этом браузере');
            return;
        }
    } catch (e) {
        console.error('Ошибка при проверке WebGL:', e);
        return;
    }
    console.log('WebGL поддерживается');

    const container = document.getElementById('cabinet-3d-container');
    console.log('Контейнер:', container);
    
    if (!container) {
        console.error('Контейнер для 3D шкафа не найден!');
        return;
    }

    // Убеждаемся, что контейнер имеет размеры
    const { clientWidth, clientHeight } = container;
    console.log('Размеры контейнера:', clientWidth, 'x', clientHeight);
    
    if (!clientWidth || !clientHeight) {
        console.error('Контейнер имеет нулевые размеры!');
        return;
    }

    // Размеры шкафа
    const unitsU = 42;
    const width = 600;
    const depth = 1000;
    const unitHeight = 44.45;
    const height = unitsU * unitHeight;

    // Сцена и камера
    console.log('Создаём сцену...');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    
    // Добавляем оси координат для отладки
    const axesHelper = new THREE.AxesHelper(1000);
    scene.add(axesHelper);
    console.log('Сцена создана');

    // Сетка на полу (светлая, крупная)
    const grid = new THREE.GridHelper(2400, 24, 0xdbeafe, 0xe2e8f0);
    grid.material.transparent = true;
    grid.material.opacity = 0.7;
    grid.position.y = 0;
    scene.add(grid);

    // Тень под шкафом (полупрозрачная прямоугольная плоскость)
    const shadowGeometry = new THREE.PlaneGeometry(width * 1.5, depth * 1.5);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4c5768,
        transparent: true,
        opacity: 0.13
    });
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 1;
    scene.add(shadowMesh);

    // Модель шкафа
    const cabinetGeometry = new THREE.BoxGeometry(width, height, depth);
    const cabinetMaterial = new THREE.MeshPhongMaterial({
        color: 0x191b22,
        shininess: 95,
        specular: new THREE.Color(0x444853)
    });
    const cabinetMesh = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
    cabinetMesh.position.set(0, height / 2, 0);
    cabinetMesh.castShadow = true;
    scene.add(cabinetMesh);

    // Создание модели телекоммуникационного шкафа
    function createCabinet(scene, width, height, depth) {
        console.log('Создаём модель шкафа...');

        // Основной корпус шкафа
        const cabinetFrameGeometry = new THREE.BoxGeometry(width, height, depth);
        const cabinetFrameMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 50,
            specular: 0x555555
        });
        const cabinetFrame = new THREE.Mesh(cabinetFrameGeometry, cabinetFrameMaterial);
        cabinetFrame.position.set(0, height / 2, 0);
        scene.add(cabinetFrame);

        // Вертикальные стойки (передние и задние)
        const railWidth = 20;
        const railDepth = 10;
        const railGeometry = new THREE.BoxGeometry(railWidth, height, railDepth);
        const railMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });

        const frontLeftRail = new THREE.Mesh(railGeometry, railMaterial);
        frontLeftRail.position.set(-width / 2 + railWidth / 2, height / 2, -depth / 2 + railDepth / 2);
        scene.add(frontLeftRail);

        const frontRightRail = frontLeftRail.clone();
        frontRightRail.position.x = width / 2 - railWidth / 2;
        scene.add(frontRightRail);

        const backLeftRail = frontLeftRail.clone();
        backLeftRail.position.z = depth / 2 - railDepth / 2;
        scene.add(backLeftRail);

        const backRightRail = frontRightRail.clone();
        backRightRail.position.z = depth / 2 - railDepth / 2;
        scene.add(backRightRail);

        console.log('Модель шкафа создана');
    }

    // Вызов функции создания шкафа
    createCabinet(scene, width, height, depth);

    // Камера: снята чуть сверху и отодвинута
    const camDistance = Math.max(width, depth, height) * 2.65;
    const camera = new THREE.PerspectiveCamera(
        36,
        container.clientWidth / container.clientHeight,
        1,
        4000
    );
    camera.position.set(-width / 2, height * 0.86, camDistance);
    camera.lookAt(0, height / 2, 0);

    // Увеличиваем дальность обзора камеры, чтобы шкаф не пропадал при уменьшении
    camera.far = 10000; // Устанавливаем дальнюю плоскость отсечения на 10 000 единиц
    camera.updateProjectionMatrix();

    // Основной мягкий свет
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.47);
    dirLight.position.set(0, 1200, 1500);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Рендерер
    console.log('Создаём WebGL рендерер...');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false,
            canvas: container.querySelector('canvas') || undefined
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        console.log('Рендерер создан и добавлен в DOM');
        
        // Очищаем цвет и буфер глубины
        renderer.clear();
    } catch (e) {
        console.error('Ошибка при создании рендерера:', e);
        return;
    }

    // Управление камерой
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = Math.PI / 6; // Минимальный угол (10 градусов над горизонтом)
    controls.maxPolarAngle = Math.PI / 2; // Максимальный угол (90 градусов, вид сверху)
    controls.target.set(0, height / 2, 0); // Центр вращения камеры остаётся на уровне шкафа
    controls.update();

    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    }, false);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    console.log('Запускаем анимацию...');
    animate();
    console.log('Инициализация завершена');
}

// Запускаем инициализацию
init().catch(error => {
    console.error('Ошибка при инициализации:', error);
});