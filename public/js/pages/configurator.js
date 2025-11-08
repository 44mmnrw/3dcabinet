/**
 * 3D Конфигуратор шкафов — Главный модуль приложения
 * Объединяет все компоненты: сцену, шкафы, взаимодействие
 */

import { SceneManager } from '../modules/SceneManager.js';
import { CabinetModel } from '../modules/CabinetModel.js';
import { CabinetManager } from '../modules/CabinetManager.js';
import { InteractionController } from '../modules/InteractionController.js';

class CabinetConfigurator {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        
        if (!this.container) {
            console.error(`Контейнер "${containerSelector}" не найден`);
            return;
        }
        
        // Менеджеры
        this.sceneManager = null;
        this.cabinetManager = null;
        this.interactionController = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Инициализация 3D Конфигуратора...');
        
        // Инициализация сцены
        this.sceneManager = new SceneManager(this.container);
        
        // Менеджер шкафов
        this.cabinetManager = new CabinetManager(this.sceneManager);
        
        // Контроллер взаимодействия
        this.interactionController = new InteractionController(
            this.sceneManager, 
            this.cabinetManager
        );
        
        // Подключить callback'и
        this.setupCallbacks();
        
        // Загрузить тестовый шкаф
        await this.loadTestCabinet();
        
        // Экспортировать API в window для доступа из консоли
        window.configurator = this;
        
        console.log('✅ 3D Конфигуратор готов к работе');
        console.log('💡 Доступные команды:');
        console.log('  - configurator.addCabinet(type) — добавить шкаф');
        console.log('  - configurator.removeCabinet(id) — удалить шкаф');
        console.log('  - configurator.getCabinets() — список шкафов');
        console.log('  - Shift + Click — перетащить шкаф');
        console.log('  - Double Click — открыть/закрыть дверцу');
        console.log('  - R — повернуть на 90°');
        console.log('  - O — открыть/закрыть дверцу');
        console.log('  - Delete — удалить выбранный шкаф');
    }
    
    setupCallbacks() {
        // Callback при выборе шкафа
        this.interactionController.onCabinetSelected = (cabinetId) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            this.updateUI(cabinet);
        };
        
        // Callback при снятии выбора
        this.interactionController.onCabinetDeselected = () => {
            this.clearUI();
        };
    }
    
    async loadTestCabinet() {
        console.log('📦 Загрузка тестового шкафа...');
        
        // Путь к GLB-модели tsh_700_500_240
        const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb';
        
        console.log(`  Путь к модели: ${modelPath}`);
        
        // Создать модель шкафа
        const cabinet = new CabinetModel(modelPath, {
            type: 'floor',
            width: 700,   // мм (реальные размеры модели)
            height: 500,  // мм
            depth: 240,   // мм
            name: 'TSH 700×500×240',
            color: 0xd0d0d0
        });
        
        // Добавить на сцену
        try {
            await this.cabinetManager.addCabinet(cabinet);
            console.log('✅ Тестовый шкаф успешно загружен');
            
            // Автоматически сфокусировать камеру на шкаф
            this.sceneManager.focusOnObject(cabinet.model);
            
            // Финальная проверка рендеринга
            console.log(`\n  🎬 === ПРОВЕРКА РЕНДЕРИНГА ===`);
            console.log(`  Canvas размер: ${this.sceneManager.renderer.domElement.width} × ${this.sceneManager.renderer.domElement.height}`);
            console.log(`  Scene children:`, this.sceneManager.scene.children.length);
            console.log(`  Модель в сцене:`, this.sceneManager.scene.children.includes(cabinet.model));
            console.log(`  Renderer info:`, this.sceneManager.renderer.info);
            console.log(`  ============================\n`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки тестового шкафа:', error);
            console.error('  Проверьте, что файл существует:');
            console.error('  - public/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb');
        }
    }
    
    async addCabinet(type = 'floor') {
        const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.gltf';
        
        const cabinet = new CabinetModel(modelPath, {
            type: type,
            width: 700,
            height: 500,
            depth: 240,
            name: `TSH ${type === 'wall' ? 'настенный' : 'напольный'}`,
            color: type === 'wall' ? 0xd0d0d0 : 0xe0e0e0
        });
        
        await this.cabinetManager.addCabinet(cabinet);
        return cabinet;
    }
    
    removeCabinet(cabinetId) {
        return this.cabinetManager.removeCabinet(cabinetId);
    }
    
    getCabinets() {
        return this.cabinetManager.getAllCabinets();
    }
    
    updateUI(cabinet) {
        // Обновить правую панель с параметрами шкафа
        const parametersDiv = document.getElementById('cabinet-parameters');
        
        if (!parametersDiv) return;
        
        parametersDiv.innerHTML = `
            <div style="padding: 1rem;">
                <h4>${cabinet.config.name}</h4>
                <p><strong>ID:</strong> ${cabinet.id}</p>
                <p><strong>Тип:</strong> ${cabinet.config.type === 'floor' ? 'Напольный' : 'Настенный'}</p>
                <p><strong>Размеры:</strong> ${cabinet.config.width}×${cabinet.config.height}×${cabinet.config.depth} мм</p>
                <p><strong>Дверца:</strong> ${cabinet.isDoorOpen ? '🟢 Открыта' : '🔴 Закрыта'}</p>
                <p><strong>Оборудование:</strong> ${cabinet.equipment.length} шт.</p>
                
                <div style="margin-top: 1rem;">
                    <button onclick="configurator.toggleDoor('${cabinet.id}')" style="padding: 0.5rem 1rem; margin: 0.25rem;">
                        ${cabinet.isDoorOpen ? 'Закрыть' : 'Открыть'} дверцу
                    </button>
                    <button onclick="configurator.rotateCabinet('${cabinet.id}')" style="padding: 0.5rem 1rem; margin: 0.25rem;">
                        Повернуть 90°
                    </button>
                    <button onclick="configurator.removeCabinet('${cabinet.id}')" style="padding: 0.5rem 1rem; margin: 0.25rem; background: #e74c3c; color: white;">
                        Удалить
                    </button>
                </div>
                
                <div style="margin-top: 1rem;">
                    <label>Цвет:</label><br>
                    <input type="color" value="#e0e0e0" onchange="configurator.changeCabinetColor('${cabinet.id}', this.value)" style="width: 100%; height: 40px; margin-top: 0.5rem;">
                </div>
            </div>
        `;
    }
    
    clearUI() {
        const parametersDiv = document.getElementById('cabinet-parameters');
        if (parametersDiv) {
            parametersDiv.innerHTML = '<p style="padding: 1rem; color: #999;">Выберите шкаф для редактирования</p>';
        }
    }
    
    toggleDoor(cabinetId) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            cabinet.toggleDoor(true);
            this.updateUI(cabinet);
        }
    }
    
    rotateCabinet(cabinetId) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            const newRotation = cabinet.rotation + Math.PI / 2;
            this.cabinetManager.rotateCabinet(cabinetId, newRotation);
        }
    }
    
    changeCabinetColor(cabinetId, colorHex) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            const color = parseInt(colorHex.replace('#', '0x'), 16);
            cabinet.setColor(color);
        }
    }
}

// Запуск при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CabinetConfigurator('#cabinet-3d-container');
    });
} else {
    new CabinetConfigurator('#cabinet-3d-container');
}
