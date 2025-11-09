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
        
        // Настроить контролы камеры
        this.setupCameraControls();
        
        // Экспортировать API в window для доступа из консоли
        window.configurator = this;
        
        // Проверка доступности
        console.log('🌐 window.configurator установлен:', !!window.configurator);
        console.log('  toggleDoor доступен:', typeof window.configurator.toggleDoor === 'function');
        
        console.log('\n✅ 3D Конфигуратор готов к работе');
        console.log('\n💡 Доступные команды:');
        console.log('  - configurator.addCabinet(type) — добавить шкаф');
        console.log('  - configurator.removeCabinet(id) — удалить шкаф');
        console.log('  - configurator.getCabinets() — список шкафов');
        console.log('\n🖱️  Управление мышью:');
        console.log('  - Click — выбрать объект (шкаф/дверь/оборудование)');
        console.log('  - Shift + Drag — перетащить шкаф');
        console.log('  - Double Click — открыть/закрыть дверцу');
        console.log('  - Middle Button — вращать камеру');
        console.log('  - Right Button — панорама камеры');
        console.log('  - Wheel — зум модели');
        console.log('\n⌨️  Горячие клавиши:');
        console.log('  - Shift — режим перетаскивания (зажать перед кликом)');
        console.log('  - R — повернуть шкаф на 90°');
        console.log('  - O — открыть/закрыть дверцу');
        console.log('  - Delete — удалить выбранный шкаф');
        console.log('  - Стрелки — вращать камеру');
        console.log('  - PageUp/Down — зум камеры');
        console.log('  - Home — сбросить камеру');
    }
    
    setupCameraControls() {
        // Вращение камеры
        document.querySelector('.camera-btn-up')?.addEventListener('click', () => {
            this.sceneManager.rotateCamera('up');
        });
        
        document.querySelector('.camera-btn-down')?.addEventListener('click', () => {
            this.sceneManager.rotateCamera('down');
        });
        
        document.querySelector('.camera-btn-left')?.addEventListener('click', () => {
            this.sceneManager.rotateCamera('left');
        });
        
        document.querySelector('.camera-btn-right')?.addEventListener('click', () => {
            this.sceneManager.rotateCamera('right');
        });
        
        // Сброс камеры
        document.querySelector('.camera-btn-center')?.addEventListener('click', () => {
            this.sceneManager.resetCamera();
        });
        
        // Зум
        document.querySelector('.camera-btn-zoom-in')?.addEventListener('click', () => {
            this.sceneManager.zoomCamera('in');
        });
        
        document.querySelector('.camera-btn-zoom-out')?.addEventListener('click', () => {
            this.sceneManager.zoomCamera('out');
        });
        
        // Клавиатурные шорткаты для камеры
        document.addEventListener('keydown', (event) => {
            // Пропускаем, если фокус в input/textarea
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.sceneManager.rotateCamera('up');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.sceneManager.rotateCamera('down');
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.sceneManager.rotateCamera('left');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.sceneManager.rotateCamera('right');
                    break;
                case 'PageUp':
                    event.preventDefault();
                    this.sceneManager.zoomCamera('in');
                    break;
                case 'PageDown':
                    event.preventDefault();
                    this.sceneManager.zoomCamera('out');
                    break;
                case 'Home':
                    event.preventDefault();
                    this.sceneManager.resetCamera();
                    break;
            }
        });
        
        console.log('🎥 Контролы камеры настроены');
        console.log('  ⌨️  Клавиши: Стрелки (вращение), PageUp/Down (зум), Home (сброс)');
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
        
        // Callback при выборе двери
        this.interactionController.onDoorSelected = (cabinetId) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            console.log('🚪 UI для двери:', cabinet.config.name);
            this.updateUI(cabinet, 'door');
        };
        
        // Callback при выборе оборудования
        this.interactionController.onEquipmentSelected = (cabinetId, equipmentId) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            console.log('🔧 UI для оборудования:', equipmentId);
            this.updateUI(cabinet, 'equipment', equipmentId);
        };
        
        // Callback при выборе DIN-рейки
        this.interactionController.onDinRailSelected = (cabinetId, railObject) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            console.log('📏 UI для DIN-рейки:', railObject.name);
            this.updateUI(cabinet, 'rail', railObject);
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
            
            // Автоматически выбрать шкаф и показать UI
            this.cabinetManager.selectCabinet(cabinet.id);
            this.updateUI(cabinet);
            
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
    
    updateUI(cabinet, mode = 'cabinet', data = null) {
        // Обновить правую панель с параметрами шкафа
        const parametersDiv = document.getElementById('cabinet-parameters');
        
        if (!parametersDiv) return;
        
        // Разные UI в зависимости от режима
        switch(mode) {
            case 'door':
                this.renderDoorUI(parametersDiv, cabinet);
                break;
            case 'equipment':
                this.renderEquipmentUI(parametersDiv, cabinet, data);
                break;
            case 'rail':
                this.renderRailUI(parametersDiv, cabinet, data);
                break;
            default:
                this.renderCabinetUI(parametersDiv, cabinet);
        }
    }
    
    renderCabinetUI(container, cabinet) {
        container.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h4 style="margin: 0; font-size: 1.2rem; color: #2c3e50;">📦 ${cabinet.config.name}</h4>
                    <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Выбран</span>
                </div>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="margin: 0.5rem 0;"><strong>ID:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem;">${cabinet.id.substring(0, 12)}...</code></p>
                    <p style="margin: 0.5rem 0;"><strong>Тип:</strong> ${cabinet.config.type === 'floor' ? '🏢 Напольный' : '🔲 Настенный'}</p>
                    <p style="margin: 0.5rem 0;"><strong>Размеры:</strong> ${cabinet.config.width}×${cabinet.config.height}×${cabinet.config.depth} мм</p>
                    <p style="margin: 0.5rem 0;"><strong>Дверца:</strong> ${cabinet.isDoorOpen ? '🟢 Открыта' : '🔴 Закрыта'}</p>
                    <p style="margin: 0.5rem 0;"><strong>Оборудование:</strong> ${cabinet.equipment.length} шт.</p>
                </div>
                
                <div style="background: #fff3cd; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; color: #856404;">
                    <strong>💡 Подсказка:</strong> Зажмите <kbd style="background: #fff; padding: 2px 6px; border: 1px solid #ddd; border-radius: 3px;">Shift</kbd> и перетащите шкаф
                </div>
                    <p style="margin: 0.5rem 0;"><strong>Дверца:</strong> ${cabinet.isDoorOpen ? '🟢 Открыта' : '🔴 Закрыта'}</p>
                    <p style="margin: 0.5rem 0;"><strong>Оборудование:</strong> ${cabinet.equipment.length} шт.</p>
                
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                    <button 
                        onclick="configurator.toggleDoor('${cabinet.id}')" 
                        style="
                            padding: 0.75rem 1rem;
                            background: ${cabinet.isDoorOpen ? '#e74c3c' : '#27ae60'};
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.opacity='0.85'"
                        onmouseout="this.style.opacity='1'"
                    >
                        ${cabinet.isDoorOpen ? '🔒 Закрыть дверцу' : '🔓 Открыть дверцу'}
                    </button>
                    
                    <button 
                        onclick="configurator.rotateCabinet('${cabinet.id}')" 
                        style="
                            padding: 0.75rem 1rem;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.opacity='0.85'"
                        onmouseout="this.style.opacity='1'"
                    >
                        🔄 Повернуть 90°
                    </button>
                    
                    <button 
                        onclick="configurator.removeCabinet('${cabinet.id}')" 
                        style="
                            padding: 0.75rem 1rem;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.background='#c0392b'"
                        onmouseout="this.style.background='#e74c3c'"
                    >
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }
    
    renderDoorUI(container, cabinet) {
        container.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <button onclick="configurator.updateUI(configurator.cabinetManager.getCabinetById('${cabinet.id}'))" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">←</button>
                    <h4 style="margin: 0; font-size: 1.2rem; color: #2c3e50;">🚪 Дверь шкафа</h4>
                </div>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="margin: 0.5rem 0;"><strong>Шкаф:</strong> ${cabinet.config.name}</p>
                    <p style="margin: 0.5rem 0;"><strong>Состояние:</strong> ${cabinet.isDoorOpen ? '🟢 Открыта' : '🔴 Закрыта'}</p>
                </div>
                
                <button 
                    onclick="configurator.toggleDoor('${cabinet.id}')" 
                    style="
                        width: 100%;
                        padding: 1rem;
                        background: ${cabinet.isDoorOpen ? '#e74c3c' : '#27ae60'};
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                >
                    ${cabinet.isDoorOpen ? '🔒 Закрыть дверцу' : '🔓 Открыть дверцу'}
                </button>
            </div>
        `;
    }
    
    renderEquipmentUI(container, cabinet, equipmentId) {
        container.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <button onclick="configurator.updateUI(configurator.cabinetManager.getCabinetById('${cabinet.id}'))" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">←</button>
                    <h4 style="margin: 0; font-size: 1.2rem; color: #2c3e50;">🔧 Оборудование</h4>
                </div>
                
                <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; color: #856404;">
                    <p style="margin: 0;"><strong>ID:</strong> ${equipmentId}</p>
                    <p style="margin: 0.5rem 0 0 0;"><em>Функционал добавления оборудования будет реализован в следующих версиях</em></p>
                </div>
            </div>
        `;
    }
    
    renderRailUI(container, cabinet, rail) {
        container.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <button onclick="configurator.updateUI(configurator.cabinetManager.getCabinetById('${cabinet.id}'))" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">←</button>
                    <h4 style="margin: 0; font-size: 1.2rem; color: #2c3e50;">📏 DIN-рейка</h4>
                </div>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="margin: 0.5rem 0;"><strong>Название:</strong> ${rail.name}</p>
                    <p style="margin: 0.5rem 0;"><strong>Шкаф:</strong> ${cabinet.config.name}</p>
                </div>
                
                <div style="background: #d1ecf1; padding: 1rem; border-radius: 8px; color: #0c5460;">
                    <p style="margin: 0;"><em>На эту рейку можно будет добавить оборудование в следующих версиях</em></p>
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
        console.log('🔘 toggleDoor вызван, cabinetId:', cabinetId);
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        console.log('  Cabinet найден:', !!cabinet);
        if (cabinet) {
            console.log('  Дверца существует:', !!cabinet.door);
            console.log('  Текущее состояние isDoorOpen:', cabinet.isDoorOpen);
            cabinet.toggleDoor(true);
            console.log('  Новое состояние isDoorOpen:', cabinet.isDoorOpen);
            this.updateUI(cabinet, 'door');
        } else {
            console.error('  ❌ Cabinet не найден по ID:', cabinetId);
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
