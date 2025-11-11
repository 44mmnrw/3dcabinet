/**
 * EquipmentManager — менеджер всего оборудования на сцене
 * Управляет коллекцией, drag & drop, размещением на DIN-рейках
 */

import * as THREE from '../libs/three.module.js';
import { EquipmentModel } from './EquipmentModel.js';
import { getEquipmentById } from '../data/equipment-catalog.js';

export class EquipmentManager {
    constructor(sceneManager, cabinetManager) {
        this.sceneManager = sceneManager;
        this.cabinetManager = cabinetManager;
        
        this.equipment = new Map(); // id -> EquipmentModel
        this.selectedEquipment = null;
        
        // Параметры размещения на DIN-рейке
        this.moduleWidth = 18; // мм — стандартная ширина модуля
        this.snapTolerance = 5; // мм — допуск примагничивания
        
        console.log('✅ EquipmentManager инициализирован');
    }
    
    /**
     * Создать экземпляр оборудования из каталога
     * @param {string} catalogId - ID оборудования в каталоге
     * @returns {Promise<EquipmentModel>}
     */
    async createEquipment(catalogId) {
        console.log(`🔨 EquipmentManager.createEquipment("${catalogId}")`);
        
        // Получить данные из каталога
        const catalogData = getEquipmentById(catalogId);
        if (!catalogData) {
            console.error(`❌ Оборудование "${catalogId}" не найдено в каталоге`);
            return null;
        }
        
        // Создать экземпляр
        const equipment = new EquipmentModel(catalogData);
        
        // Дождаться загрузки модели
        await equipment.loadPromise;
        
        // Добавить в коллекцию
        this.equipment.set(equipment.id, equipment);
        console.log(`✅ Оборудование создано, всего: ${this.equipment.size}`);
        
        return equipment;
    }
    
    /**
     * Добавить оборудование на сцену (в режиме drag)
     * @param {EquipmentModel} equipment
     */
    addToScene(equipment) {
        if (!equipment.isLoaded) {
            console.warn('⚠️ Оборудование еще не загружено');
            return false;
        }
        
        if (!equipment.model) {
            console.error('❌ equipment.model is null/undefined!');
            return false;
        }
        
        this.sceneManager.addToScene(equipment.model);
        return true;
    }
    
    /**
     * Разместить оборудование на шкафу
     * @param {EquipmentModel} equipment
     * @param {CabinetModel} cabinet
     * @param {object} options - { dinRailIndex, position }
     */
    async placeOnCabinet(equipment, cabinet, options = {}) {
        console.log(`🔧 Размещение "${equipment.data.name}" на шкафу ${cabinet.id}`);
        
        const {
            dinRailIndex = 0,
            position = null
        } = options;
        
        // Проверить, есть ли DIN-рейки в шкафу
        if (!cabinet.dinRails || cabinet.dinRails.length === 0) {
            console.error('❌ В шкафу нет DIN-реек');
            return false;
        }
        
        if (dinRailIndex >= cabinet.dinRails.length) {
            console.error(`❌ DIN-рейка с индексом ${dinRailIndex} не найдена`);
            return false;
        }
        
        // Найти свободное место на DIN-рейке
        const targetRail = cabinet.dinRails[dinRailIndex];
        const targetPosition = position || this.findFreeSlot(cabinet, dinRailIndex, equipment);
        
        if (!targetPosition) {
            console.warn('❌ Нет свободного места на DIN-рейке');
            return false;
        }
        
        // Рассчитать мировые координаты
        const worldPosition = this.calculateWorldPosition(cabinet, targetRail, targetPosition);
        console.log(`  📍 Рассчитанная позиция: (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);
        
        // Установить позицию
        equipment.setPosition(worldPosition.x, worldPosition.y, worldPosition.z);
        
        // Привязать к шкафу
        console.log(`  🔗 Привязка к шкафу...`);
        equipment.attachToCabinet(cabinet, dinRailIndex);
        
        // Добавить на сцену (если еще не добавлено)
        if (!equipment.model.parent) {
            const added = this.addToScene(equipment);
            if (!added) {
                console.error('❌ Не удалось добавить оборудование на сцену!');
                return false;
            }
        }
        
        // Добавить в массив оборудования шкафа
        cabinet.equipment.push(equipment);
        
        console.log(`✅ Оборудование "${equipment.data.name}" размещено на DIN-рейке ${dinRailIndex}`);
        
        return true;
    }
    
    /**
     * Найти свободный слот на DIN-рейке
     */
    findFreeSlot(cabinet, dinRailIndex, equipment) {
        const requiredModules = equipment.data.dimensions.modules || 1;
        const requiredWidth = requiredModules * this.moduleWidth;
        
        // TODO: Реализовать поиск свободного места
        // Сейчас просто возвращаем начало рейки
        return { x: 0, modules: requiredModules };
    }
    
    /**
     * Рассчитать мировые координаты на DIN-рейке
     */
    calculateWorldPosition(cabinet, dinRail, slotPosition) {
        // Получить мировую позицию DIN-рейки
        const railWorldPos = new THREE.Vector3();
        dinRail.getWorldPosition(railWorldPos);
        
        // Смещение вдоль рейки (по X)
        const offsetX = slotPosition.x || 0;
        
        // Вернуть мировые координаты
        return new THREE.Vector3(
            railWorldPos.x + offsetX,
            railWorldPos.y,
            railWorldPos.z
        );
    }
    
    /**
     * Удалить оборудование
     */
    removeEquipment(equipmentId) {
        const equipment = this.equipment.get(equipmentId);
        if (!equipment) {
            console.warn(`Оборудование ${equipmentId} не найдено`);
            return false;
        }
        
        // Отвязать от шкафа
        if (equipment.parentCabinet) {
            const cabinet = equipment.parentCabinet;
            const index = cabinet.equipment.indexOf(equipment);
            if (index > -1) {
                cabinet.equipment.splice(index, 1);
            }
            equipment.detach();
        }
        
        // Удалить со сцены
        this.sceneManager.removeFromScene(equipment.model);
        
        // Очистить память
        equipment.dispose();
        
        // Удалить из коллекции
        this.equipment.delete(equipmentId);
        
        console.log(`🗑️ Оборудование ${equipmentId} удалено, осталось: ${this.equipment.size}`);
        return true;
    }
    
    /**
     * Выбрать оборудование
     */
    selectEquipment(equipmentId) {
        // Снять предыдущее выделение
        if (this.selectedEquipment) {
            this.selectedEquipment.deselect();
        }
        
        const equipment = this.equipment.get(equipmentId);
        if (equipment) {
            equipment.select();
            this.selectedEquipment = equipment;
            console.log(`✓ Выбрано оборудование: ${equipment.data.name}`);
        }
    }
    
    /**
     * Снять выделение
     */
    deselectEquipment() {
        if (this.selectedEquipment) {
            this.selectedEquipment.deselect();
            this.selectedEquipment = null;
        }
    }
    
    /**
     * Получить все оборудование шкафа
     */
    getEquipmentByCabinet(cabinetId) {
        return Array.from(this.equipment.values()).filter(
            eq => eq.parentCabinet?.id === cabinetId
        );
    }
    
    /**
     * Получить статистику
     */
    getStats() {
        return {
            total: this.equipment.size,
            placed: Array.from(this.equipment.values()).filter(eq => eq.isPlaced).length,
            selected: this.selectedEquipment?.id || null
        };
    }
    
    /**
     * Очистить все оборудование
     */
    clear() {
        console.log(`🗑️ Очистка всего оборудования (${this.equipment.size} шт.)...`);
        
        this.equipment.forEach(equipment => {
            this.removeEquipment(equipment.id);
        });
        
        this.selectedEquipment = null;
        console.log('✅ Все оборудование удалено');
    }
}
