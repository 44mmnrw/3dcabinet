// ====== ОТЛАДКА: логи загрузки модуля ======
console.log('🔄 configurator.js начал загрузку');

/**
 * 3D Конфигуратор шкафов — Главный модуль приложения
 * Объединяет все компоненты: сцену, шкафы, взаимодействие
 */

import { SceneManager } from '../modules/SceneManager.js';
import { CabinetModel } from '../modules/CabinetModel.js';
import { CabinetManager } from '../modules/CabinetManager.js';
import { InteractionController } from '../modules/InteractionController.js';
import { createFresnelOutline } from '../modules/ShaderUtils.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { DRACOLoader } from '../libs/DRACOLoader.js';
import * as THREE from '../libs/three.module.js';

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
        
        // ====== ЦВЕТОВАЯ СХЕМА ШКАФОВ (HEX-цвета) ======
        // Формат: 0xRRGGBB (Red, Green, Blue в шестнадцатеричной системе)
        // Пример: 0xFF0000 = красный, 0x00FF00 = зеленый, 0x0000FF = синий
        this.cabinetColorScheme = {
            // Цвет по умолчанию (fallback для неопознанных частей)
            default: 0x673831,           // Коричневый (RGB: 103, 56, 49)
            
            // ОСНОВНЫЕ ЧАСТИ ШКАФА:
            body: 0x673831,              // Корпус/каркас шкафа (коричневый)
            door: 0x673831,              // Дверца шкафа (коричневый)
            panel: 0x673831,             // Монтажная панель внутри (коричневый)
            
            // ИЗОЛЯЦИОННЫЕ ЭЛЕМЕНТЫ:
            insulation: 0xE8E8E8,        // Изоляционный материал/прокладки (светло-серый, почти белый)
            insulationFrame: 0xC0C0C0,   // Рамка вокруг изоляции (серебристый металл)
            
            // МОНТАЖНЫЕ КОМПОНЕНТЫ:
            dinRail: 0xA8A8A8            // DIN-рейки для крепления оборудования (темно-серый металл)
        };
        
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
    
    async loadTestCabinet() {
        console.log('🚀🚀🚀 loadTestCabinet() НАЧАТ 🚀🚀🚀');
        
        const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb';
        console.log('📁 Путь к модели:', modelPath);
        
        // ═══════════════════════════════════════════════════════════════
        // 🖼️ ТЕКСТУРНАЯ СХЕМА (PBR-текстуры из KeyShot)
        // ═══════════════════════════════════════════════════════════════
        // Путь БЕЗ суффиксов! SceneManager.loadPBRTextures() автоматически добавит:
        // - _albedo.jpg (базовый цвет)
        // - _normal.png (карта нормалей)
        // - _roughness.jpg (шероховатость)
        // - _ao.jpg (ambient occlusion)
        // - _metalness.jpg (металличность, опционально)
        const textureScheme = {
            body: '/assets/textures/metal/keyshot/brushed',      // Корпус
            door: '/assets/textures/metal/keyshot/brushed',      // Дверца
            panel: '/assets/textures/metal/keyshot/brushed',     // Панель
            dinRail: '/assets/textures/metal/keyshot/brushed'    // DIN-рейки
            // insulation и insulationFrame используют цвета без текстур
        };
        
        console.log('🏗️ Создание CabinetModel...');
        const cabinet = new CabinetModel(modelPath, {
            type: 'floor',
            width: 700,
            height: 500,
            depth: 240,
            name: 'TSH 700×500×240',
            color: this.cabinetColorScheme.default,
            colorScheme: this.cabinetColorScheme,
            textureScheme: textureScheme  // ← Добавляем текстурную схему
        }, this.sceneManager.renderer, this.sceneManager);  // ← Передаём renderer и sceneManager
        console.log('✅ CabinetModel создан, ID:', cabinet.id);
        
        try {
            console.log('⏳ Вызов cabinetManager.addCabinet()...');
            await this.cabinetManager.addCabinet(cabinet);
            console.log('✅ cabinetManager.addCabinet() завершён');
            
            console.log('🎯 Выбор шкафа...');
            this.cabinetManager.selectCabinet(cabinet.id);
            
            console.log('🖥️ Обновление UI...');
            this.updateUI(cabinet);
            
            console.log('📷 Фокусировка камеры на объект...');
            this.sceneManager.focusOnObject(cabinet.model);
            
            // ═══════════════════════════════════════════════════════════════
            // 🔌 ЗАГРУЗКА ОБОРУДОВАНИЯ (Автоматический выключатель)
            // ═══════════════════════════════════════════════════════════════
            // console.log('🔌 Загрузка оборудования...');
            // await this.loadTestEquipment(cabinet);  // ← ОТКЛЮЧЕНО
            console.log('ℹ️ Загрузка оборудования отключена');
            
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
    
    /**
     * 🔌 Загрузка тестового оборудования на DIN-рейки
     * Добавляет автоматический выключатель на первую DIN-рейку шкафа
     */
    async loadTestEquipment(cabinet) {
        try {
            console.log('🔄 loadTestEquipment() начат для cabinet:', cabinet.id);
            
            // Проверяем наличие DIN-реек
            if (!cabinet.dinRails || cabinet.dinRails.length === 0) {
                console.warn('⚠️ DIN-рейки не найдены в шкафу, оборудование не добавлено');
                return;
            }
            
            const equipmentPath = '/assets/models/equipment/circuit_breaker/circuit_breaker.glb';
            console.log('📁 Путь к оборудованию:', equipmentPath);
            
            // Настроить DRACOLoader для сжатых моделей
            const loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('/js/libs/draco/');
            dracoLoader.setDecoderConfig({ type: 'js' });  // Авто-выбор WASM/JS
            loader.setDRACOLoader(dracoLoader);
            console.log('✅ DRACOLoader настроен для оборудования');
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    equipmentPath,
                    (gltf) => {
                        console.log('✅ Оборудование загружено:', equipmentPath);
                        resolve(gltf);
                    },
                    undefined,
                    (error) => {
                        console.error('❌ Ошибка загрузки оборудования:', error);
                        reject(error);
                    }
                );
            });
            
            const equipmentModel = gltf.scene;
            
            // Настроить масштаб оборудования (автоматический выключатель обычно ~18мм шириной)
            const targetWidth = 18; // мм (1 модуль DIN)
            const bbox = new THREE.Box3().setFromObject(equipmentModel);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            
            const scaleFactor = targetWidth / size.x;
            equipmentModel.scale.setScalar(scaleFactor);
            
            console.log(`📏 Масштаб оборудования: ${scaleFactor.toFixed(3)}x`);
            
            // Добавить на первую DIN-рейку
            const success = cabinet.addEquipment(equipmentModel, 0);
            
            if (success) {
                console.log('✅ Оборудование добавлено на DIN-рейку #0');
            } else {
                console.error('❌ Не удалось добавить оборудование на рейку');
            }
            
        } catch (error) {
            console.error('❌ Ошибка в loadTestEquipment():', error);
            console.error('  Модель оборудования не загружена, но работа продолжается');
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
            color: this.cabinetColorScheme.default,
            colorScheme: this.cabinetColorScheme
        }, this.sceneManager.renderer, this.sceneManager);  // ← Передаём renderer и sceneManager
        
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
    
    changeCabinetColor(cabinetId, colorHex) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (cabinet) {
            const color = parseInt(colorHex.replace('#', '0x'), 16);
            cabinet.setColor(color);
        }
    }

    /**
     * Изменить текстуру части шкафа
     * @param {string} cabinetId 
     * @param {string} partName - 'body', 'door', 'insulation' и т.д.
     * @param {string} texturePath - Путь без расширения
     */
    async changeCabinetTexture(cabinetId, partName, texturePath) {
        const cabinet = this.cabinetManager.getCabinetById(cabinetId);
        if (!cabinet) return;
        
        // Обновить схему
        if (!cabinet.textureScheme) cabinet.textureScheme = {};
        cabinet.textureScheme[partName] = texturePath;
        
        // Перезагрузить текстуры
        await cabinet.applyTextures(cabinet.model);
        
        console.log(`✅ Текстура ${partName} изменена на ${texturePath}`);
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
            
            // ОТЛАДКА: вывести информацию о созданном outline
            console.log('🎨 Outline создан:', {
                visible: this.selectedOutline.visible,
                scale: this.selectedOutline.scale,
                renderOrder: this.selectedOutline.renderOrder,
                material: {
                    transparent: this.selectedOutline.material.transparent,
                    depthWrite: this.selectedOutline.material.depthWrite,
                    blending: this.selectedOutline.material.blending,
                    uniforms: {
                        uIntensity: this.selectedOutline.material.uniforms.uIntensity.value,
                        uPower: this.selectedOutline.material.uniforms.uPower.value,
                        uOpacity: this.selectedOutline.material.uniforms.uOpacity.value,
                        uColor: this.selectedOutline.material.uniforms.uColor.value
                    }
                }
            });
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