import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { test_TS_700_500_250 } from './models/TS_700_500_250/test_TS_700_500_250.js';
// Заменяем JSON FreeCAD загрузку автоматического выключателя на GLB через AssetLoader
import { getAssetLoader } from './modules/AssetLoader.js';

// Инициализация сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Контролы
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Сетка
const gridHelper = new THREE.GridHelper(5, 50, 0xcccccc, 0xe0e0e0);
scene.add(gridHelper);

// Оси координат
const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

// Загрузка моделей
let cabinetModel, breakerModel; // breakerModel будет оберткой над GLB группой

async function loadModels() {
    try {
        // Загружаем шкаф TS_700_500_250
        console.log('🔄 Загрузка TS_700_500_250...');
        cabinetModel = new test_TS_700_500_250();
        const cabinetAssembly = await cabinetModel.assemble();
        cabinetAssembly.position.set(-0.5, 0, 0);  // Сдвигаем влево
        scene.add(cabinetAssembly);
        console.log('✅ TS_700_500_250 загружен');

        // Загружаем автоматический выключатель (GLB) через AssetLoader
        console.log('🔄 Загрузка circuit_breaker.glb через AssetLoader...');
        const assetLoader = getAssetLoader();
        const glbGroup = await assetLoader.load('/assets/models/equipment/circuit_breaker/circuit_breaker.glb', {
            useCache: true,
            clone: true,
            onProgress: (loaded, total, percent) => {
                if (percent) console.log(`  ⏳ circuit_breaker.glb: ${percent}%`);
            }
        });

        // Выравнивание по полу (аналогично тестовой JSON модели)
        alignGroupToFloor(glbGroup);

        glbGroup.name = 'Circuit_Breaker_GLB';
        glbGroup.position.set(0.5, 0, 0); // Сдвигаем вправо
        scene.add(glbGroup);
        console.log('✅ Circuit breaker GLB добавлен в сцену');

        // Обертка API для совместимости с HTML (breakerModel.setVisibility / getComponent / getInfo)
        breakerModel = {
            _group: glbGroup,
            setVisibility(visible) { this._group.visible = visible; },
            getComponent() { return this._group; },
            getAssembly() { return this._group; },
            getInfo() {
                const bbox = new THREE.Box3().setFromObject(this._group);
                const worldPos = new THREE.Vector3();
                this._group.getWorldPosition(worldPos);
                return {
                    assembly: {
                        name: this._group.name,
                        position: this._group.position.toArray(),
                        worldPosition: worldPos.toArray(),
                        visible: this._group.visible,
                        children: this._group.children.length,
                        bbox: {
                            min: bbox.min.toArray(),
                            max: bbox.max.toArray(),
                            size: bbox.getSize(new THREE.Vector3()).toArray()
                        }
                    }
                };
            }
        };

        // Автооткрытие двери (debug) удалено: дверь остаётся закрытой по умолчанию.

        // Глобальный доступ для отладки
        window.cabinetModel = cabinetModel;
        window.breakerModel = breakerModel;

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

// Вспомогательная функция: выровнять группу так, чтобы её нижняя точка была на Y=0
function alignGroupToFloor(group) {
    const bbox = new THREE.Box3().setFromObject(group);
    const offsetY = -bbox.min.y;
    group.position.y += offsetY;
    console.log('📐 GLB aligned to floor, offset Y:', offsetY.toFixed(3));
}

console.log('🎮 Используйте controls для управления сценой');
console.log('📊 Доступные команды: cabinetModel.getInfo(), breakerModel.getInfo()');
