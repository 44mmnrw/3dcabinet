// ====== ОТЛАДКА: логи загрузки модуля ======
console.log('🔄 configurator.js начал загрузку');

/**
 * 3D Конфигуратор шкафов — Главный модуль приложения
 * Объединяет все компоненты: сцену, шкафы, взаимодействие
 */

import { SceneManager } from '../modules/SceneManager.js';
import { CabinetModel } from '../modules/CabinetModel.js';
import { CabinetManager } from '../modules/CabinetManager.js';
import { EquipmentManager } from '../modules/EquipmentManager.js';
import { InteractionController } from '../modules/InteractionController.js';
import { createFresnelOutline } from '../modules/ShaderUtils.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { DRACOLoader } from '../libs/DRACOLoader.js';
import * as THREE from '../libs/three.module.js';
import { getCabinetById } from '../data/cabinets-catalog.js';
import { getEquipmentById, getAvailableEquipment } from '../data/equipment-catalog.js';
import * as TWEEN from '../libs/tween.esm.js';

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
        this.equipmentManager = null;
        this.interactionController = null;
        
        // Режим работы: 'overview' (обзор) или 'assembly' (сборка)
        this.mode = 'overview';
        this.isEnteringAssemblyMode = false; // Флаг процесса входа в режим
        this.assemblyState = null; // Сохранённое состояние для отката
        this.currentPanel = null; // Панель, которая извлечена в режиме сборки (deprecated)
        this.originalPanelPosition = null; // Исходная позиция панели (deprecated)
        
        // Подсветка выбора (Fresnel)
        this.selectedMesh = null;
        this.selectedOutline = null;
        this.highlightOptions = { 
            color: 0x8b5cf6,
            intensity: 8.0,
            power: 1.5,
            opacity: 1.0, 
            scaleMultiplier: 1.05
        };
        
        this.init();
    }
    
    async init() {
        // Инициализация сцены
        this.sceneManager = new SceneManager(this.container);
        
        // Менеджер шкафов
        this.cabinetManager = new CabinetManager(this.sceneManager);
        
        // Менеджер оборудования
        this.equipmentManager = new EquipmentManager(this.sceneManager, this.cabinetManager);
        
        // Контроллер взаимодействия
        this.interactionController = new InteractionController(
            this.sceneManager, 
            this.cabinetManager
        );
        
        // Подключить callback'и
        this.setupCallbacks();
        
        // Загрузить тестовый шкаф
        await this.loadTestCabinet();
        
        // 🧪 ТЕСТ: Автоматически добавить выключатель на шкаф
        await this.addTestCircuitBreaker();
        
        // Настроить контролы камеры
        this.setupCameraControls();
        
        // Настроить кнопку перехода в режим сборки
        this.setupAssemblyModeButton();
        
        // Заполнить библиотеку оборудования
        this.populateEquipmentLibrary();
        
        // ═══════════════════════════════════════════════════════════════
        // 🎛️ ДОБАВЛЕНИЕ GUI-ПАНЕЛИ УПРАВЛЕНИЯ
        // ═══════════════════════════════════════════════════════════════
        this.sceneManager.addGUI();
        console.log('✅ GUI-панель управления добавлена');
        
        // Экспортировать API в window
        window.configurator = this;
        
        console.log('✅ 3D Конфигуратор готов к работе');
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
        
        // Обработчик клавиши Esc для выхода из режима сборки
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.mode === 'assembly') {
                event.preventDefault();
                this.exitAssemblyMode();
            }
        });
    }
    
    /**
     * Настроить кнопку "Начать сборку" и "Готово"
     */
    setupAssemblyModeButton() {
        // Кнопка "Начать сборку"
        const startButton = document.getElementById('start-assembly-btn');
        if (startButton) {
            // Удалить старые обработчики (если были)
            const oldHandler = startButton.__assemblyHandler;
            if (oldHandler) {
                startButton.removeEventListener('click', oldHandler);
            }
            
            // Создать новый обработчик
            const newHandler = () => {
                this.enterAssemblyMode();
            };
            
            // Сохранить ссылку на обработчик
            startButton.__assemblyHandler = newHandler;
            
            // Добавить обработчик
            startButton.addEventListener('click', newHandler);
            console.log('✅ Кнопка "Начать сборку" подключена');
        }
        
        // Кнопка "Готово" (в индикаторе режима)
        const finishButton = document.getElementById('finish-assembly-btn');
        if (finishButton) {
            // Удалить старые обработчики (если были)
            const oldHandler = finishButton.__assemblyHandler;
            if (oldHandler) {
                finishButton.removeEventListener('click', oldHandler);
            }
            
            // Создать новый обработчик
            const newHandler = () => {
                this.exitAssemblyMode();
            };
            
            // Сохранить ссылку на обработчик
            finishButton.__assemblyHandler = newHandler;
            
            // Добавить обработчик
            finishButton.addEventListener('click', newHandler);
            console.log('✅ Кнопка "Готово" подключена');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🔧 УПРАВЛЕНИЕ РЕЖИМАМИ (OVERVIEW / ASSEMBLY)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Переход в режим сборки
     * - Анимация камеры к панели
     * - Извлечение панели из шкафа
     * - Масштабирование панели до 80% viewport
     * - Отключение OrbitControls
     * - Показ UI режима сборки
     */
    async enterAssemblyMode(cabinetId = null) {
        if (this.mode === 'assembly') {
            console.warn('⚠️ Уже в режиме сборки');
            return;
        }
        
        if (this.isEnteringAssemblyMode) {
            console.warn('⚠️ Переход в режим сборки уже выполняется...');
            return;
        }
        
        console.log('🚀 Вход в режим сборки...');
        this.isEnteringAssemblyMode = true;
        this.mode = 'assembly';
        
        // Получить шкаф (по умолчанию первый или выбранный)
        let cabinet = null;
        
        if (cabinetId) {
            // Если указан ID, получить конкретный шкаф
            cabinet = this.cabinetManager.getCabinetById(cabinetId);
        } else if (this.cabinetManager.selectedCabinet) {
            // Использовать выбранный шкаф
            cabinet = this.cabinetManager.selectedCabinet;
        } else {
            // Взять первый шкаф из Map
            const firstCabinet = this.cabinetManager.cabinets.values().next().value;
            cabinet = firstCabinet;
        }
            
        if (!cabinet) {
            console.error('❌ Шкаф не найден для режима сборки');
            console.error('  Доступные шкафы:', this.cabinetManager.cabinets);
            console.error('  Количество:', this.cabinetManager.cabinets.size);
            console.error('  Выбранный шкаф:', this.cabinetManager.selectedCabinet);
            
            alert('Шкаф не загружен. Пожалуйста, подождите завершения загрузки.');
            this.mode = 'overview';
            return;
        }
        
        console.log('✅ Шкаф найден:', cabinet.id);
        
        // Найти ключевые объекты в шкафу
        console.log('🔍 Поиск объектов шкафа...');
        const objects = this.findCabinetObjects(cabinet);
        
        if (!objects.panel) {
            console.error('❌ Панель PANEL.003 не найдена');
            alert('Ошибка: панель для сборки не найдена в модели шкафа');
            this.mode = 'overview';
            return;
        }
        
        console.log('✅ Найденные объекты:', {
            panel: objects.panel?.name,
            door: objects.door?.name,
            dinRails: objects.dinRails.map(r => r.name)
        });
        
        // Сохранить состояние для отката
        this.assemblyState = {
            cabinet: cabinet,
            panel: objects.panel,
            door: objects.door,
            dinRails: objects.dinRails,
            originalPanelScale: objects.panel.scale.clone(),
            originalDoorRotation: objects.door ? objects.door.rotation.clone() : null,
            originalCabinetRotation: cabinet.model.rotation.clone(),
            isDoorOpen: cabinet.isDoorOpen || false
        };
        
        console.log('💾 Состояние сохранено');
        
        try {
            // Вызвать встроенный метод шкафа для входа в режим сборки
            console.log('� Вызов cabinet.enterAssemblyMode()...');
            await cabinet.enterAssemblyMode();
            
            // Отключить OrbitControls
            this.sceneManager.controls.enabled = false;
            
            // Показать UI режима сборки
            this.showAssemblyUI();
            
            console.log('✅ Режим сборки активирован');
            this.isEnteringAssemblyMode = false;
        } catch (error) {
            console.error('❌ Ошибка входа в режим сборки:', error);
            this.mode = 'overview';
            this.isEnteringAssemblyMode = false;
            return;
        }
    }
    
    /**
     * Выход из режима сборки
     * Возвращает всё в исходное состояние
     */
    async exitAssemblyMode() {
        if (this.mode !== 'assembly') {
            console.warn('⚠️ Не в режиме сборки');
            return;
        }
        
        console.log('🔙 Выход из режима сборки...');
        
        if (!this.assemblyState) {
            console.error('❌ Состояние сборки не сохранено');
            this.mode = 'overview';
            return;
        }
        
        const state = this.assemblyState;
        
        try {
            // Скрыть UI режима сборки
            this.hideAssemblyUI();
            
            // Вызвать встроенный метод шкафа для выхода из режима сборки
            console.log('� Вызов cabinet.exitAssemblyMode()...');
            await state.cabinet.exitAssemblyMode();
            
            // Включить OrbitControls
            this.sceneManager.controls.enabled = true;
            
            // Очистить состояние
            this.assemblyState = null;
            this.mode = 'overview';
            
            console.log('✅ Режим обзора активирован');
        } catch (error) {
            console.error('❌ Ошибка выхода из режима сборки:', error);
            this.mode = 'overview';
            this.sceneManager.controls.enabled = true;
        }
    }
    
    setupCallbacks() {
        // Callback при выборе шкафа
        this.interactionController.onCabinetSelected = (cabinetId, mesh) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            // Подсветить конкретный меш или главный меш шкафа
            this.setSelectedForCabinet(cabinet, mesh);
            this.updateUI(cabinet);
        };
        
        // Callback при снятии выбора
        this.interactionController.onCabinetDeselected = () => {
            this.clearSelectionHighlight();
            this.clearUI();
        };
        
        // Callback при выборе двери
        this.interactionController.onDoorSelected = (cabinetId, mesh) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            this.setSelectedForDoor(cabinet, mesh);
            this.updateUI(cabinet, 'door');
        };
        
        // Callback при выборе оборудования
        this.interactionController.onEquipmentSelected = (cabinetId, equipmentId, mesh) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            this.setSelectedForEquipment(cabinet, equipmentId, mesh);
            this.updateUI(cabinet, 'equipment', equipmentId);
        };
        
        // Callback при выборе DIN-рейки
        this.interactionController.onDinRailSelected = (cabinetId, railObject) => {
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            this.setSelectedMesh(railObject);
            this.updateUI(cabinet, 'rail', railObject);
        };
    }
    
    /**
     * 🔨 Добавить оборудование из каталога по ID
     * Вызывается при drag & drop из боковой панели
     */
    async addEquipmentFromCatalog(catalogId) {
        
        try {
            // Создать экземпляр оборудования
            const equipment = await this.equipmentManager.createEquipment(catalogId);
            
            return equipment;
            
        } catch (error) {
            console.error('❌ Ошибка создания оборудования:', error);
            return null;
        }
    }
    
    /**
     * 🔧 Разместить оборудование на шкафу
     * Вызывается после drag & drop на шкаф
     */
    async placeEquipmentOnCabinet(equipment, cabinetId, options = {}) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (!cabinet) {
            console.error('❌ Шкаф не найден');
            return false;
        }
        
        const success = await this.equipmentManager.placeOnCabinet(equipment, cabinet, options);
        
        if (success) {
            this.updateUI(cabinet);
        }
        
        return success;
    }
    
    /**
     * 🧪 ТЕСТОВЫЙ МЕТОД: Добавить автоматический выключатель на шкаф
     * Используется для демонстрации работы системы
     */
    async addTestCircuitBreaker() {
        // Получить первый шкаф на сцене
        const cabinet = Array.from(this.cabinetManager.cabinets.values())[0];
        if (!cabinet) {
            console.error('❌ На сцене нет шкафов. Сначала добавьте шкаф.');
            return;
        }
        
        // Создать оборудование
        const equipment = await this.addEquipmentFromCatalog('circuit_breaker_1p');
        if (!equipment) return;
        
        // Разместить на первой DIN-рейке
        await this.placeEquipmentOnCabinet(equipment, cabinet.id, {
            dinRailIndex: 0
        });
    }
    
    async loadTestCabinet() {
        console.log('🚀🚀🚀 loadTestCabinet() НАЧАТ 🚀🚀🚀');
        
        const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb';
        console.log('📁 Путь к модели:', modelPath);
        
        console.log('🏗️ Создание CabinetModel...');
        const cabinet = new CabinetModel(modelPath, {
            type: 'floor',
            width: 700,
            height: 500,
            depth: 240,
            name: 'TSH 700×500×240'
        }, this.sceneManager.renderer, this.sceneManager);
        console.log('✅ CabinetModel создан, ID:', cabinet.id);
        
        try {
            console.log('⏳ Вызов cabinetManager.addCabinet()...');
            await this.cabinetManager.addCabinet(cabinet);
            console.log('✅ cabinetManager.addCabinet() завершён');
            
            console.log('🎯 Выбор шкафа...');
            this.cabinetManager.selectCabinet(cabinet.id);
            
            console.log('🖥️ Обновление UI...');
            this.updateUI(cabinet);
            
            // console.log('📷 Фокусировка камеры на объект...');
            // this.sceneManager.focusOnObject(cabinet.model); // ОТКЛЮЧЕНО: оставляем начальный вид с севера
            
            console.log('✅✅✅ loadTestCabinet() ЗАВЕРШЁН УСПЕШНО ✅✅✅');
        } catch (error) {
            console.error('❌❌❌ ОШИБКА в loadTestCabinet() ❌❌❌');
            console.error('  Тип ошибки:', error.constructor.name);
            console.error('  Сообщение:', error.message);
            console.error('  Stack trace:', error.stack);
            console.error('  Проверьте, что файл существует:');
            console.error('  - public/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb');
        }
    }
    
    async addCabinet(type = 'floor') {
        const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb';
        
        const cabinet = new CabinetModel(modelPath, {
            type: type,
            width: 700,
            height: 500,
            depth: 240,
            name: `TSH ${type === 'wall' ? 'настенный' : 'напольный'}`
        }, this.sceneManager.renderer, this.sceneManager);
        
        await this.cabinetManager.addCabinet(cabinet);
        return cabinet;
    }
    
    removeCabinet(cabinetId) {
        // Если удаляем выделенный — очищаем подсветку
        if (this.selectedMesh && this.selectedMesh.userData && this.selectedMesh.userData.cabinetId === cabinetId) {
            this.clearSelectionHighlight();
        }
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
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            cabinet.toggleDoor(true);
            this.updateUI(cabinet, 'door');
        } else {
            console.error('Cabinet не найден по ID:', cabinetId);
        }
    }
    
    rotateCabinet(cabinetId) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            const newRotation = cabinet.rotation + Math.PI / 2;
            this.cabinetManager.rotateCabinet(cabinetId, newRotation);
        }
    }

    // ====== Подсветка выбора (Fresnel) ======
    async setSelectedMesh(mesh) {
        if (!this.sceneManager || !this.sceneManager.scene) return;
        // Снять предыдущую обводку
        this.clearSelectionHighlight();
        if (!mesh || !mesh.isMesh) {
            this.selectedMesh = null;
            return;
        }
        this.selectedMesh = mesh;
        try {
            this.selectedOutline = await createFresnelOutline(mesh, this.highlightOptions);
            this.sceneManager.scene.add(this.selectedOutline);
        } catch (e) {
            console.error('❌ Не удалось создать подсветку:', e);
        }
    }
    clearSelectionHighlight() {
        if (this.selectedOutline && this.sceneManager?.scene) {
            this.sceneManager.scene.remove(this.selectedOutline);
        }
        this.selectedOutline = null;
    }
    setHighlightColor(hex) {
        const color = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', '0x'), 16);
        this.highlightOptions.color = color;
        if (this.selectedOutline?.material?.uniforms?.uColor) {
            this.selectedOutline.material.uniforms.uColor.value.setHex(color);
            this.selectedOutline.material.uniformsNeedUpdate = true; // Пометить для обновления
        }
    }
    setHighlightParams({ intensity, power, opacity, scaleMultiplier } = {}) {
        if (intensity !== undefined) this.highlightOptions.intensity = intensity;
        if (power !== undefined) this.highlightOptions.power = power;
        if (opacity !== undefined) this.highlightOptions.opacity = opacity;
        if (scaleMultiplier !== undefined) this.highlightOptions.scaleMultiplier = scaleMultiplier;
        
        // Обновить uniforms существующего outline (не пересоздавать!)
        if (this.selectedOutline?.material?.uniforms) {
            const u = this.selectedOutline.material.uniforms;
            let needsUpdate = false;
            if (intensity !== undefined && u.uIntensity) { u.uIntensity.value = intensity; needsUpdate = true; }
            if (power !== undefined && u.uPower) { u.uPower.value = power; needsUpdate = true; }
            if (opacity !== undefined && u.uOpacity) { u.uOpacity.value = opacity; needsUpdate = true; }
            
            if (needsUpdate) {
                this.selectedOutline.material.uniformsNeedUpdate = true;
            }
            
            // Если изменился scaleMultiplier, нужно пересоздать
            if (scaleMultiplier !== undefined && this.selectedMesh) {
                this.setSelectedMesh(this.selectedMesh);
            }
        }
    }
    // Поиск главного меша шкафа (наибольший объём)
    getPrimaryMesh(object3D) {
        let best = null;
        let bestVol = -Infinity;
        const box = new THREE.Box3();
        object3D.traverse((child) => {
            if (child.isMesh) {
                box.setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);
                const vol = size.x * size.y * size.z;
                if (vol > bestVol) {
                    bestVol = vol;
                    best = child;
                }
            }
        });
        return best;
    }
    setSelectedForCabinet(cabinet, mesh) {
        if (mesh && mesh.isMesh) return this.setSelectedMesh(mesh);
        const mainMesh = this.getPrimaryMesh(cabinet.model);
        return this.setSelectedMesh(mainMesh);
    }
    setSelectedForDoor(cabinet, mesh) {
        if (mesh && mesh.isMesh) return this.setSelectedMesh(mesh);
        let doorMesh = null;
        cabinet.model.traverse((child) => {
            if (child.isMesh && child.userData?.isDoor) doorMesh = child;
        });
        return this.setSelectedMesh(doorMesh || this.getPrimaryMesh(cabinet.model));
    }
    setSelectedForEquipment(cabinet, equipmentId, mesh) {
        if (mesh && mesh.isMesh) return this.setSelectedMesh(mesh);
        let eqMesh = null;
        cabinet.model.traverse((child) => {
            if (child.isMesh && child.userData?.equipmentId === equipmentId) eqMesh = child;
        });
        return this.setSelectedMesh(eqMesh || this.getPrimaryMesh(cabinet.model));
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🎬 АНИМАЦИИ ПЕРЕХОДОВ МЕЖДУ РЕЖИМАМИ
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Найти все ключевые объекты в шкафу для режима сборки
     * @param {CabinetModel} cabinet - Модель шкафа
     * @returns {Object} - Объект с найденными элементами
     */
    findCabinetObjects(cabinet) {
        const objects = {
            panel: null,
            door: null,
            dinRails: []
        };
        
        console.log('🔍 Поиск объектов в шкафу...');
        
        cabinet.model.traverse((child) => {
            const name = child.name?.toLowerCase() || '';
            
            // PANEL.003 - монтажная панель (гибкий поиск)
            if (child.userData?.isPanel || 
                name === 'panel.003' || 
                name === 'panel003' ||
                (name.includes('panel') && !name.includes('din'))) {
                if (!objects.panel) { // Берём только первую найденную
                    objects.panel = child;
                    console.log('✅ Найдена панель:', child.name);
                }
            }
            
            // DOOR - дверь шкафа
            if (child.userData?.isDoor || name === 'door') {
                objects.door = child;
                console.log('✅ Найдена дверь:', child.name);
            }
            
            // DIN-рейки (ищем все, что содержит din_rail или din-rail)
            if (child.userData?.isDinRail || 
                name.includes('din_rail') || 
                name.includes('din-rail') ||
                name.includes('dinrail')) {
                objects.dinRails.push(child);
                console.log('📌 Найдена DIN-рейка:', child.name);
            }
        });
        
        console.log('📊 Результаты поиска:');
        console.log('  - Панель:', objects.panel?.name || 'НЕ НАЙДЕНА');
        console.log('  - Дверь:', objects.door?.name || 'НЕ НАЙДЕНА');
        console.log('  - DIN-рейки:', objects.dinRails.length);
        
        return objects;
    }
    
    /**
     * Повернуть шкаф дверью к камере
     */
    async rotateCabinetToFront(cabinet, duration = 1000) {
        return new Promise((resolve) => {
            const startRotation = cabinet.model.rotation.y;
            const targetRotation = Math.PI; // 180 градусов
            
            new TWEEN.Tween({ rotation: startRotation })
                .to({ rotation: targetRotation }, duration)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(({ rotation }) => {
                    cabinet.model.rotation.y = rotation;
                })
                .onComplete(() => {
                    console.log('✅ Шкаф повёрнут дверью к камере');
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * Вернуть поворот шкафа в исходное состояние
     */
    async rotateCabinetBack(cabinet, originalRotation, duration = 1000) {
        return new Promise((resolve) => {
            const startRotation = cabinet.model.rotation.y;
            const targetRotation = originalRotation.y;
            
            new TWEEN.Tween({ rotation: startRotation })
                .to({ rotation: targetRotation }, duration)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(({ rotation }) => {
                    cabinet.model.rotation.y = rotation;
                })
                .onComplete(() => {
                    console.log('✅ Шкаф возвращён в исходное положение');
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * Масштабировать панель и DIN-рейки
     * @param {THREE.Object3D} panel - Панель PANEL.003
     * @param {Array} dinRails - Массив DIN-реек
     * @param {number} targetScale - Целевой масштаб (3.0 = 300%)
     * @param {number} duration - Длительность анимации (мс)
     */
    async scalePanelGroup(panel, dinRails, targetScale, duration = 1000) {
        return new Promise((resolve) => {
            const startScale = panel.scale.x;
            
            console.log(`📏 Масштабирование от ${startScale} до ${targetScale}`);
            
            new TWEEN.Tween({ scale: startScale })
                .to({ scale: targetScale }, duration)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(({ scale }) => {
                    // Масштабировать панель
                    panel.scale.setScalar(scale);
                    
                    // Масштабировать все DIN-рейки
                    dinRails.forEach(rail => {
                        rail.scale.setScalar(scale);
                    });
                })
                .onComplete(() => {
                    console.log(`✅ Масштабирование завершено: ${targetScale * 100}%`);
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * Найти панель с DIN-рейками в шкафу (старый метод - оставлен для совместимости)
     * @param {CabinetModel} cabinet - Модель шкафа
     * @returns {THREE.Object3D|null} - Панель с DIN-рейками
     */
    findDINPanel(cabinet) {
        let panel = null;
        let dinRails = [];
        
        console.log('🔍 Проход по дереву модели шкафа...');
        console.log('📦 СТРУКТУРА ШКАФА:');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Функция для отображения дерева с отступами
        const printTree = (obj, level = 0) => {
            const indent = '  '.repeat(level);
            const objType = obj.type || 'Object3D';
            const userData = obj.userData ? JSON.stringify(obj.userData) : '{}';
            
            console.log(`${indent}├─ ${obj.name || 'unnamed'} (${objType})`);
            console.log(`${indent}│  userData: ${userData}`);
            console.log(`${indent}│  position: (${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)})`);
            
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => printTree(child, level + 1));
            }
        };
        
        printTree(cabinet.model);
        console.log('═══════════════════════════════════════════════════════════');
        
        let childCount = 0;
        
        cabinet.model.traverse((child) => {
            childCount++;
            
            // Разделяем поиск: ПАНЕЛЬ vs DIN-РЕЙКИ
            const childName = child.name?.toLowerCase() || '';
            
            // 1. Поиск панели (исключая DIN-рейки!)
            if (child.userData?.isDINPanel) {
                // Явно помечена как DIN-панель
                console.log('✅ Найдена DIN-панель (userData):', child.name);
                panel = child;
            } else if (childName.includes('panel') && !childName.includes('din_rail')) {
                // Имя содержит "panel", но не "din_rail"
                console.log('✅ Найдена панель по имени:', child.name);
                if (!panel) panel = child; // Берём первую найденную
            }
            
            // 2. Поиск DIN-реек (для справки)
            if (child.userData?.isDinRail || childName.includes('din_rail')) {
                console.log('📌 Найдена DIN-рейка:', child.name);
                dinRails.push(child);
            }
        });
        
        console.log(`📊 Всего объектов в модели: ${childCount}`);
        console.log(`📌 Найдено DIN-реек: ${dinRails.length}`);
        
        // Если не нашли специфичную панель, используем весь шкаф
        if (!panel) {
            console.warn('⚠️ Специфичная DIN-панель не найдена, используем модель шкафа');
            console.log('📦 Модель шкафа:', cabinet.model);
            panel = cabinet.model;
        } else {
            console.log('✅ Выбранная панель для анимации:', panel.name);
        }
        
        return panel;
    }
    
    /**
     * Анимировать камеру к панели
     * @param {THREE.Object3D} panel - Целевая панель
     * @param {number} duration - Длительность анимации (мс)
     */
    async animateCameraToPanel(panel, duration = 1000) {
        console.log('📹 animateCameraToPanel() начат');
        console.log('  Панель:', panel.name);
        
        return new Promise((resolve, reject) => {
            try {
                const camera = this.sceneManager.camera;
                const controls = this.sceneManager.controls;
                
                console.log('  Камера:', camera.position);
                console.log('  Controls target:', controls.target);
                
                // Вычислить целевую позицию камеры (перед панелью)
                const panelBox = new THREE.Box3().setFromObject(panel);
                const panelCenter = new THREE.Vector3();
                panelBox.getCenter(panelCenter);
                
                const panelSize = new THREE.Vector3();
                panelBox.getSize(panelSize);
                
                console.log('  Центр панели:', panelCenter);
                console.log('  Размер панели:', panelSize);
                
                // Камера должна быть на расстоянии, чтобы панель занимала ~80% viewport
                const distance = Math.max(panelSize.x, panelSize.y) * 1.5;
                console.log('  Расстояние до панели:', distance);
                
                // Целевая позиция: перед панелью на оси Z
                const targetPosition = new THREE.Vector3(
                    panelCenter.x,
                    panelCenter.y,
                    panelCenter.z + distance
                );
                
                console.log('  Целевая позиция камеры:', targetPosition);
                
                // Анимация камеры через TWEEN
                const startPosition = camera.position.clone();
                const startTarget = controls.target.clone();
                
                console.log('  Создание TWEEN анимации...');
                
                new TWEEN.Tween({ t: 0 })
                    .to({ t: 1 }, duration)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .onUpdate(({ t }) => {
                        camera.position.lerpVectors(startPosition, targetPosition, t);
                        controls.target.lerpVectors(startTarget, panelCenter, t);
                        controls.update();
                    })
                    .onComplete(() => {
                        console.log('✅ Камера анимирована к панели');
                        resolve();
                    })
                    .start();
            } catch (error) {
                console.error('❌ Ошибка в animateCameraToPanel:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Извлечь панель из шкафа (сдвинуть вперёд по Z)
     * @param {THREE.Object3D} panel - Панель для извлечения
     * @param {number} distance - Расстояние извлечения (мм)
     * @param {number} duration - Длительность анимации (мс)
     */
    async pullOutPanel(panel, distance = 300, duration = 800) {
        return new Promise((resolve) => {
            const startPosition = panel.position.clone();
            const targetPosition = startPosition.clone();
            targetPosition.z += distance; // Выдвинуть вперёд
            
            new TWEEN.Tween({ t: 0 })
                .to({ t: 1 }, duration)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(({ t }) => {
                    panel.position.lerpVectors(startPosition, targetPosition, t);
                })
                .onComplete(() => {
                    console.log(`✅ Панель извлечена на ${distance} мм`);
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * Задвинуть панель обратно в шкаф
     * @param {THREE.Object3D} panel - Панель для задвигания
     * @param {THREE.Vector3} originalPosition - Исходная позиция
     * @param {number} duration - Длительность анимации (мс)
     */
    async pushInPanel(panel, originalPosition, duration = 800) {
        return new Promise((resolve) => {
            const startPosition = panel.position.clone();
            
            new TWEEN.Tween({ t: 0 })
                .to({ t: 1 }, duration)
                .easing(TWEEN.Easing.Cubic.In)
                .onUpdate(({ t }) => {
                    panel.position.lerpVectors(startPosition, originalPosition, t);
                })
                .onComplete(() => {
                    console.log('✅ Панель задвинута обратно');
                    resolve();
                })
                .start();
        });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🎨 UI РЕЖИМА СБОРКИ
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Показать UI режима сборки
     */
    showAssemblyUI() {
        // Показать панель с библиотекой оборудования
        const libraryPanel = document.getElementById('equipment-library');
        if (libraryPanel) {
            libraryPanel.classList.remove('hidden');
            libraryPanel.classList.add('visible');
        }
        
        // Показать индикатор режима и кнопку "Готово"
        const modeIndicator = document.getElementById('assembly-mode-indicator');
        if (modeIndicator) {
            modeIndicator.classList.remove('hidden');
            modeIndicator.classList.add('visible');
        }
        
        // Скрыть кнопку "Начать сборку"
        const startButton = document.getElementById('start-assembly-btn');
        if (startButton) {
            startButton.classList.add('hidden');
        }
        
        // Настроить обработчики drag & drop для 3D-контейнера
        this.setupDropZone();
        
        console.log('🎨 UI режима сборки отображён');
    }
    
    /**
     * Скрыть UI режима сборки
     */
    hideAssemblyUI() {
        // Скрыть панель с библиотекой оборудования
        const libraryPanel = document.getElementById('equipment-library');
        if (libraryPanel) {
            libraryPanel.classList.remove('visible');
            libraryPanel.classList.add('hidden');
        }
        
        // Скрыть индикатор режима
        const modeIndicator = document.getElementById('assembly-mode-indicator');
        if (modeIndicator) {
            modeIndicator.classList.remove('visible');
            modeIndicator.classList.add('hidden');
        }
        
        // Показать кнопку "Начать сборку"
        const startButton = document.getElementById('start-assembly-btn');
        if (startButton) {
            startButton.classList.remove('hidden');
        }
        
        // Удалить drop-зону (очистим outline на всякий случай)
        if (this.container) {
            this.container.style.outline = 'none';
        }
        
        console.log('🎨 UI режима сборки скрыт');
    }
    
    /**
     * Настроить зону drop для добавления оборудования на панель
     */
    setupDropZone() {
        const dropZone = this.container; // 3D-контейнер
        
        if (!dropZone) {
            console.warn('⚠️ Drop-зона не найдена');
            return;
        }
        
        // Предотвратить поведение по умолчанию
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            dropZone.style.outline = '3px dashed var(--primary-color, #8b5cf6)';
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            dropZone.style.outline = 'none';
        });
        
        // Обработка drop
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.style.outline = 'none';
            
            const equipmentId = e.dataTransfer.getData('equipment-id');
            if (!equipmentId) {
                console.warn('⚠️ equipment-id не найден в dataTransfer');
                return;
            }
            
            console.log(`📦 Dropped equipment ID: ${equipmentId}`);
            
            // Получить координаты drop относительно canvas
            const rect = dropZone.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Выполнить raycasting для определения позиции на DIN-рейке
            const position = this.calculateDropPosition(x, y);
            
            if (!position) {
                console.warn('⚠️ Не удалось определить позицию на DIN-рейке');
                return;
            }
            
            // Добавить оборудование на шкаф
            await this.addEquipmentFromLibrary(equipmentId, position);
        });
        
        console.log('✅ Drop-зона настроена');
    }
    
    /**
     * Вычислить позицию drop на DIN-рейке через raycasting
     * @param {number} x - Нормализованная X координата (-1 до 1)
     * @param {number} y - Нормализованная Y координата (-1 до 1)
     * @returns {Object|null} - Объект с данными позиции или null
     */
    calculateDropPosition(x, y) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        
        raycaster.setFromCamera(mouse, this.sceneManager.camera);
        
        // Найти пересечения с DIN-рейками
        const cabinet = this.cabinetManager.cabinets[0]; // Текущий шкаф
        if (!cabinet) return null;
        
        const intersects = raycaster.intersectObjects(cabinet.model.children, true);
        
        for (const intersect of intersects) {
            const object = intersect.object;
            
            // Проверить, является ли объект DIN-рейкой
            if (object.userData?.isDINRail) {
                const dinRail = object.userData.dinRail; // Ссылка на объект DIN-рейки
                const intersectionPoint = intersect.point;
                
                // Вычислить позицию на рейке (slot)
                const slotPosition = this.calculateSlotFromPoint(dinRail, intersectionPoint);
                
                return {
                    cabinetId: cabinet.id,
                    dinRailId: dinRail.id,
                    slotPosition: slotPosition
                };
            }
        }
        
        // Если не попали в DIN-рейку, использовать первую свободную позицию
        console.warn('⚠️ Drop не попал в DIN-рейку, используем первую свободную');
        return {
            cabinetId: cabinet.id,
            dinRailId: 0, // Первая рейка
            slotPosition: 0 // Первый слот
        };
    }
    
    /**
     * Вычислить номер слота из 3D-координаты точки пересечения
     * @param {Object} dinRail - Объект DIN-рейки
     * @param {THREE.Vector3} point - Точка пересечения
     * @returns {number} - Номер слота
     */
    calculateSlotFromPoint(dinRail, point) {
        // DIN-рейка ориентирована по оси X (горизонтально)
        // Модуль занимает 18 мм на рейке
        const MODULE_WIDTH = 18; // мм
        
        // Получить локальную X-координату относительно начала рейки
        const railStartX = dinRail.position.x - (dinRail.length / 2);
        const localX = point.x - railStartX;
        
        // Вычислить номер слота
        const slotIndex = Math.floor(localX / MODULE_WIDTH);
        
        return Math.max(0, slotIndex); // Не может быть отрицательным
    }
    
    /**
     * Добавить оборудование из библиотеки на шкаф
     * @param {string} equipmentId - ID оборудования из каталога
     * @param {Object} position - Позиция размещения
     */
    async addEquipmentFromLibrary(equipmentId, position) {
        console.log(`🔧 Добавление оборудования ${equipmentId} на позицию:`, position);
        
        try {
            // Использовать существующий метод добавления
            const equipment = await this.addEquipmentFromCatalog(equipmentId);
            
            if (!equipment) {
                console.error('❌ Не удалось создать оборудование');
                return;
            }
            
            // Разместить на указанной позиции
            await this.placeEquipmentOnCabinet(equipment, position.cabinetId, {
                dinRail: position.dinRailId,
                slot: position.slotPosition
            });
            
            console.log('✅ Оборудование добавлено из библиотеки');
        } catch (error) {
            console.error('❌ Ошибка добавления оборудования:', error);
        }
    }
    
    /**
     * Заполнить библиотеку оборудования категориями и элементами
     */
    populateEquipmentLibrary() {
        const categoriesContainer = document.querySelector('.equipment-categories');
        if (!categoriesContainer) {
            console.warn('⚠️ Контейнер .equipment-categories не найден');
            return;
        }
        
        // Получить все доступное оборудование из каталога
        const allEquipment = getAvailableEquipment();
        
        // Группировать по категориям
        const categories = {
            'circuit_breaker': { title: 'Автоматические выключатели', items: [] },
            'relay': { title: 'Реле и контакторы', items: [] },
            'terminal': { title: 'Клеммники', items: [] },
            'power_supply': { title: 'Источники питания', items: [] },
            'controller': { title: 'Контроллеры', items: [] },
            'other': { title: 'Прочее оборудование', items: [] }
        };
        
        // Распределить оборудование по категориям
        allEquipment.forEach(equipment => {
            const category = equipment.category || 'other';
            if (categories[category]) {
                categories[category].items.push(equipment);
            } else {
                categories['other'].items.push(equipment);
            }
        });
        
        // Создать HTML для каждой категории
        Object.entries(categories).forEach(([key, category]) => {
            if (category.items.length === 0) return; // Пропустить пустые
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'equipment-category';
            categoryDiv.dataset.category = key;
            
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'equipment-category-title';
            categoryTitle.textContent = category.title;
            categoryDiv.appendChild(categoryTitle);
            
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'equipment-items';
            
            category.items.forEach(equipment => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'equipment-item';
                itemDiv.dataset.equipmentId = equipment.id;
                itemDiv.draggable = true;
                
                const nameSpan = document.createElement('div');
                nameSpan.className = 'equipment-item-name';
                nameSpan.textContent = equipment.name;
                
                const infoSpan = document.createElement('div');
                infoSpan.className = 'equipment-item-info';
                infoSpan.textContent = `${equipment.width}мм | ${equipment.poles || 1}P`;
                
                itemDiv.appendChild(nameSpan);
                itemDiv.appendChild(infoSpan);
                itemsContainer.appendChild(itemDiv);
                
                // Обработчики drag & drop
                itemDiv.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('equipment-id', equipment.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    itemDiv.style.opacity = '0.5';
                });
                
                itemDiv.addEventListener('dragend', (e) => {
                    itemDiv.style.opacity = '1';
                });
            });
            
            categoryDiv.appendChild(itemsContainer);
            categoriesContainer.appendChild(categoryDiv);
            
            // Сворачивание/разворачивание категории при клике
            categoryTitle.addEventListener('click', () => {
                itemsContainer.style.display = 
                    itemsContainer.style.display === 'none' ? 'flex' : 'none';
            });
        });
        
        console.log('✅ Библиотека оборудования заполнена');
    }
}

// Запуск при загрузке DOM
console.log('📝 Проверка состояния DOM:', document.readyState);

if (document.readyState === 'loading') {
    console.log('⏳ DOM загружается, ждем DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded сработал');
        window.configurator = new CabinetConfigurator('#cabinet-3d-container');
    });
} else {
    console.log('✅ DOM уже загружен, создаем конфигуратор');
    window.configurator = new CabinetConfigurator('#cabinet-3d-container');
}