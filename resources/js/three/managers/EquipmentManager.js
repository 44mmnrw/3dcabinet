import * as THREE from 'three';
import { alignGroupToFloor } from '../utils/ModelUtils.js';

/**
 * Менеджер оборудования на 3D-сцене
 * 
 * Функциональность:
 * - Загрузка GLB-моделей оборудования
 * - Размещение на DIN-рейках через стратегии монтажа
 * - Управление жизненным циклом (добавление, удаление, dispose)
 * - Callbacks для синхронизации с React UI
 */
export class EquipmentManager {
    constructor(scene, assetLoader, cabinetManager) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.cabinetManager = cabinetManager;
        this.equipment = new Map(); // id -> {mesh, config, railIndex, moduleIndex, cabinetId}
        this.equipmentConfigs = new Map(); // type -> config из JSON
        this.nextId = 1;
        
        // Callback для React (синхронизация счётчика)
        this.onUpdate = null; // function(count) { ... }
    }

    /**
     * Загрузка конфигурации оборудования из JSON
     * @param {string} type - Тип оборудования (например, 'circuit_breaker')
     * @returns {Promise<Object>} Конфигурация оборудования
     */
    async loadEquipmentConfig(type) {
        if (this.equipmentConfigs.has(type)) {
            return this.equipmentConfigs.get(type);
        }

        try {
            const configPath = `/assets/models/equipment/${type}/${type}.json`;
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Конфиг не найден: ${configPath}`);
            }
            const config = await response.json();
            this.equipmentConfigs.set(type, config);
            console.log(`📋 Загружен конфиг: ${type}`);
            return config;
        } catch (error) {
            console.warn(`⚠️ Конфиг ${type} не найден, используем дефолтные параметры`);
            return {
                id: type,
                name: type,
                model: `${type}.glb`,
                mounting: {
                    type: 'din_rail',
                    anchorPoint: { offset: [0, 0, 0] }
                }
            };
        }
    }

    /**
     * Добавить оборудование на сцену
     * @param {string} type - Тип оборудования
     * @param {number} railIndex - Индекс DIN-рейки (0-3)
     * @param {number|null} xOffset - Смещение по X (null = автопоиск)
     * @param {string|null} cabinetId - ID шкафа (null = активный)
     * @returns {Promise<string|null>} ID добавленного оборудования или null при ошибке
     */
    async addEquipment(type, railIndex = 0, xOffset = null, cabinetId = null) {
        try {
            // Если шкаф не указан, используем активный
            if (!cabinetId) {
                const activeCabinet = this.cabinetManager.getActiveCabinet();
                if (!activeCabinet) {
                    console.error('❌ Нет активного шкафа. Сначала добавьте шкаф!');
                    return null;
                }
                cabinetId = this.cabinetManager.activeCabinetId;
            }

            const id = `${type}_${this.nextId++}`;
            console.log(`🔄 Добавление оборудования: ${id} в шкаф ${cabinetId}`);

            // Загружаем конфигурацию
            const config = await this.loadEquipmentConfig(type);
            console.log(`  📋 Конфиг загружен:`, config);

            // Загружаем GLTF/GLB модель
            const modelPath = `/assets/models/equipment/${type}/${config.model}`;
            console.log(`  🔄 Загрузка модели: ${modelPath}`);
            
            const glbGroup = await this.assetLoader.load(modelPath, {
                useCache: true,
                clone: true
            });
            console.log(`  ✅ Модель загружена:`, glbGroup);

            alignGroupToFloor(glbGroup);
            glbGroup.name = id;

            // Получаем шкаф, куда будем добавлять оборудование
            const cabinet = this.cabinetManager.getCabinet(cabinetId);
            if (!cabinet) {
                throw new Error(`Шкаф ${cabinetId} не найден`);
            }

            this.equipment.set(id, {
                mesh: glbGroup,
                type: type,
                config: config,
                railIndex: railIndex,
                xOffset: xOffset,  // null = автоматически найдёт свободное место
                cabinetId: cabinetId
            });

            // Добавляем оборудование внутрь шкафа (важно для координат!)
            cabinet.assembly.add(glbGroup);
            
            try {
                this.positionEquipment(id);
            } catch (positionError) {
                // Не удалось разместить — удаляем оборудование
                cabinet.assembly.remove(glbGroup);
                this.equipment.delete(id);
                console.error(`❌ ${positionError.message}`);
                alert(`⚠️ ${positionError.message}`);
                return null;
            }
            
            this._notifyUpdate();

            console.log(`✅ ${config.name || type}: ${id} → шкаф ${cabinetId}, рейка ${railIndex}`);
            return id;
        } catch (error) {
            console.error(`❌ Ошибка добавления оборудования [${type}]:`, error);
            console.error('  Error stack:', error.stack);
            console.error('  Error message:', error.message);
            return null;
        }
    }

    /**
     * Удалить оборудование по ID
     * @param {string} id - ID оборудования
     * @returns {boolean} true если удалено успешно
     */
    removeEquipment(id) {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`Оборудование ${id} не найдено`);
            return false;
        }

        // Освобождаем занятое место в стратегии монтажа
        const cabinet = this.cabinetManager.cabinets.get(item.cabinetId);
        if (cabinet && cabinet.instance && cabinet.instance.mountingStrategy) {
            const strategy = cabinet.instance.mountingStrategy;
            if (typeof strategy.unmount === 'function' && item.railIndex !== undefined) {
                strategy.unmount(id, item.railIndex);
            }
        }

        // Удаляем из parent (шкафа)
        if (item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
        }

        // Dispose геометрии и материалов
        item.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.equipment.delete(id);
        this._notifyUpdate();
        console.log(`🗑️ Удалено: ${id}`);
        return true;
    }

    /**
     * Удалить последнее добавленное оборудование
     */
    removeLastEquipment() {
        const ids = Array.from(this.equipment.keys());
        if (ids.length === 0) {
            console.warn('Нет оборудования для удаления');
            return false;
        }
        return this.removeEquipment(ids[ids.length - 1]);
    }

    /**
     * Удалить всё оборудование
     */
    removeAllEquipment() {
        const ids = Array.from(this.equipment.keys());
        ids.forEach(id => this.removeEquipment(id));
        console.log('🗑️ Всё оборудование удалено');
    }

    /**
     * Позиционировать оборудование через стратегию монтажа
     * @param {string} id - ID оборудования
     */
    positionEquipment(id) {
        const item = this.equipment.get(id);
        if (!item) return;

        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${item.cabinetId} не найден для оборудования ${id}`);
            return;
        }
        
        const equipmentGroup = item.mesh;

        // Универсальная стратегия монтажа
        if (cabinet.instance?.mountingStrategy && typeof cabinet.instance.mountingStrategy.mount === 'function') {
            try {
                const position = {
                    railIndex: item.railIndex,
                    xOffset: item.xOffset,
                    unitIndex: item.unitIndex,
                    depth: item.depth
                };
                cabinet.instance.mountingStrategy.mount(equipmentGroup, item.config, position);
                return;
            } catch (e) {
                console.error('❌ Ошибка стратегии монтажа:', e);
                throw e;
            }
        }

        console.warn('⚠️ Шкаф не имеет стратегии монтажа');
    }

    /**
     * Уведомить React о изменении количества оборудования
     * @private
     */
    _notifyUpdate() {
        if (typeof this.onUpdate === 'function') {
            this.onUpdate(this.equipment.size);
        }
    }

    /**
     * Получить оборудование по ID
     */
    getEquipment(id) {
        return this.equipment.get(id);
    }

    /**
     * Получить всё оборудование
     */
    getAllEquipment() {
        return Array.from(this.equipment.values());
    }

    /**
     * Получить оборудование конкретного шкафа
     */
    getEquipmentByCabinet(cabinetId) {
        return Array.from(this.equipment.values()).filter(item => item.cabinetId === cabinetId);
    }
}
