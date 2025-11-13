/**
 * 3D Конфигуратор FreeCAD — Модуль для центральной панели
 * Использует ModelSceneManager + TS_700_500_250
 */

import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { ModelSceneManager } from '../modules/ModelSceneManager.js';
import { TS_700_500_250 } from '../models/TS_700_500_250/TS_700_500_250.js';

console.log('🚀 configurator-freecad.js загружен');

class FreeCadConfigurator {
    constructor(containerSelector) {
        console.log('🏗️ FreeCadConfigurator constructor');
        
        this.container = document.querySelector(containerSelector);
        
        if (!this.container) {
            console.error(`❌ Контейнер "${containerSelector}" не найден`);
            return;
        }
        
        // Three.js компоненты
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        
        // Менеджер моделей
        this.sceneManager = null;
        this.models = new Map(); // ID → {assembler, metadata}
        
        this.init();
    }
    
    init() {
        console.log('🎬 FreeCadConfigurator init()');
        
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLights();
        this.createHelpers();
        
        // Создаём менеджер сцены
        this.sceneManager = new ModelSceneManager(this.scene);
        
        this.animate();
        this.setupEventListeners();
        
        console.log('✅ FreeCadConfigurator инициализирован');
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        console.log('  ✓ Сцена создана');
    }
    
    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(1.5, 1, 1.5);
        console.log('  ✓ Камера создана');
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        console.log('  ✓ Рендерер создан');
    }
    
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.5, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 10;
        this.controls.maxPolarAngle = Math.PI / 2; // Не опускаться ниже пола
        console.log('  ✓ Контролы созданы');
    }
    
    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        
        console.log('  ✓ Освещение создано');
    }
    
    createHelpers() {
        // Сетка (цвета по умолчанию для чёткого отображения)
        const gridHelper = new THREE.GridHelper(2, 10);
        this.scene.add(gridHelper);
        
        // Оси координат
        const axesHelper = new THREE.AxesHelper(0.5);
        this.scene.add(axesHelper);
        
        console.log('  ✓ Хелперы созданы');
    }
    
    /**
     * Добавить модель в сцену
     * @param {string} id - Уникальный ID модели
     * @param {string} modelType - Тип модели ('TS_700_500_250' и т.д.)
     * @param {object} position - {x, y, z}
     * @param {object} options - Опции загрузки
     */
    async addModel(id, modelType, position = {x: 0, y: 0, z: 0}, options = {}) {
        console.log(`📦 Добавление модели ${id} типа ${modelType}`);
        
        try {
            let assembler;
            
            // Создаём ассемблер нужного типа
            switch(modelType) {
                case 'TS_700_500_250':
                    assembler = new TS_700_500_250();
                    break;
                // Добавить другие типы моделей здесь
                default:
                    throw new Error(`Неизвестный тип модели: ${modelType}`);
            }
            
            // Добавляем через ModelSceneManager
            await this.sceneManager.addModel(
                id,
                assembler,
                position,
                {
                    basePath: options.basePath || './assets/models/freecad',
                    size: options.size || '700_500_250',
                    name: options.name || `Model ${id}`,
                    ...options
                }
            );
            
            // Сохраняем в локальный реестр
            this.models.set(id, {
                assembler,
                modelType,
                position,
                options
            });
            
            console.log(`✅ Модель ${id} добавлена`);
            return assembler;
            
        } catch (error) {
            console.error(`❌ Ошибка добавления модели ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Удалить модель из сцены
     */
    removeModel(id) {
        if (this.sceneManager.removeModel(id)) {
            this.models.delete(id);
            console.log(`🗑️ Модель ${id} удалена`);
            return true;
        }
        return false;
    }
    
    /**
     * Переместить модель
     */
    moveModel(id, x, y, z) {
        this.sceneManager.moveModel(id, x, y, z);
        
        // Обновляем локальный реестр
        const model = this.models.get(id);
        if (model) {
            model.position = {x, y, z};
        }
    }
    
    /**
     * Изменить позицию компонента модели
     */
    setComponentPosition(modelId, componentName, x, y, z) {
        this.sceneManager.setComponentPosition(modelId, componentName, x, y, z);
    }
    
    /**
     * Получить информацию о всех моделях
     */
    getModelsInfo() {
        return {
            count: this.models.size,
            models: Array.from(this.models.entries()).map(([id, data]) => ({
                id,
                type: data.modelType,
                position: data.position,
                components: data.assembler.getInfo()
            })),
            sceneManager: this.sceneManager.getInfo()
        };
    }
    
    /**
     * Анимационный цикл
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Обработчики событий
     */
    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('  ✓ Event listeners установлены');
    }
    
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    /**
     * Cleanup
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.sceneManager.clear();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.container && this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        
        console.log('🧹 FreeCadConfigurator disposed');
    }
}

// ====================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================

let configurator = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM загружен, запуск FreeCadConfigurator');
    
    try {
        // Создаём конфигуратор
        configurator = new FreeCadConfigurator('#cabinet-3d-container');
        
        // Загружаем тестовую модель
        await configurator.addModel(
            'cabinet-1',
            'TS_700_500_250',
            { x: 0, y: 0, z: 0 },
            {
                basePath: './assets/models/freecad',
                size: '700_500_250',
                name: 'Основной шкаф'
            }
        );
        
        console.log('📊 Информация о моделях:', configurator.getModelsInfo());
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
});

// Экспорт для глобального доступа (опционально)
window.freeCadConfigurator = configurator;

export { FreeCadConfigurator };
