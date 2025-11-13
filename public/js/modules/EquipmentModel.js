/**
 * EquipmentModel — класс для работы с экземпляром оборудования
 * Управляет загрузкой, позиционированием, привязкой к DIN-рейке
 */

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { DRACOLoader } from '../libs/DRACOLoader.js';

export class EquipmentModel {
    constructor(catalogData) {
        this.id = this.generateId();
        this.catalogId = catalogData.id;
        this.data = catalogData; // Ссылка на данные из каталога
        
        this.model = null; // THREE.Group с загруженной моделью
        this.boundingBox = null;
        this.actualSize = null; // Фактический размер после загрузки
        
        // Параметры размещения
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Угол в радианах
        this.parentCabinet = null; // Ссылка на шкаф
        this.dinRailIndex = null; // Индекс DIN-рейки (если примонтировано)
        this.slotIndex = null; // Слот на DIN-рейке
        
        // Состояние
        this.isLoaded = false;
        this.isPlaced = false; // Размещено на шкафу
        this.isSelected = false;
        
        // Loader (как у CabinetModel)
        this.loader = new GLTFLoader();
        
        // Промис загрузки
        this.loadPromise = this.load();
    }
    
    generateId() {
        return `equipment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Загрузка 3D модели (как у CabinetModel - напрямую через GLTFLoader)
     */
    async load() {
        console.log(`🔄 Загрузка оборудования: "${this.data.name}"`);
        
        // Настраиваем DRACOLoader (как у CabinetModel)
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/libs/draco/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        this.loader.setDRACOLoader(dracoLoader);
        
        return new Promise((resolve, reject) => {
            this.loader.load(
                this.data.model.path,
                (gltf) => {
                    // Получить модель из сцены
                    this.model = gltf.scene;
                    
                    // Установить metadata
                    this.model.userData.equipmentId = this.id;
                    this.model.userData.catalogId = this.catalogId;
                    this.model.userData.isEquipment = true;
                    
                    // Применить userData ко всем дочерним объектам
                    this.model.traverse((child) => {
                        child.userData.equipmentId = this.id;
                        child.userData.catalogId = this.catalogId;
                    });
                    
                    const scale = this.data.model.scale || 1.0;
                    this.model.scale.setScalar(scale);
                    
                    // Рассчитать размеры
                    this.calculateBoundingBox();
                    
                    // Включить тени
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    this.isLoaded = true;
                    console.log(`✅ "${this.data.name}" загружено`);
                    
                    resolve(this.model);
                },
                undefined, // progress callback не нужен
                (error) => {
                    console.error(`❌ Ошибка загрузки "${this.data.name}":`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Рассчитать bounding box и актуальные размеры
     */
    calculateBoundingBox() {
        this.boundingBox = new THREE.Box3().setFromObject(this.model);
        this.actualSize = new THREE.Vector3();
        this.boundingBox.getSize(this.actualSize);
    }
    
    /**
     * Установить позицию оборудования
     */
    setPosition(x, y, z) {
        if (!this.model) {
            console.warn('⚠️ Модель еще не загружена');
            return;
        }
        
        this.position.set(x, y, z);
        this.model.position.copy(this.position);
        
        // Применить смещение pivot point из каталога
        if (this.data.model.pivotOffset) {
            const offset = this.data.model.pivotOffset;
            this.model.position.add(new THREE.Vector3(offset.x, offset.y, offset.z));
        }
    }
    
    /**
     * Установить поворот оборудования
     */
    setRotation(angleRadians) {
        if (!this.model) return;
        
        this.rotation = angleRadians;
        this.model.rotation.y = angleRadians;
    }
    
    /**
     * Привязать к шкафу
     */
    attachToCabinet(cabinet, dinRailIndex = 0) {
        this.parentCabinet = cabinet;
        this.dinRailIndex = dinRailIndex;
        this.isPlaced = true;
    }
    
    /**
     * Отвязать от шкафа
     */
    detach() {
        this.parentCabinet = null;
        this.dinRailIndex = null;
        this.slotIndex = null;
        this.isPlaced = false;
    }
    
    /**
     * Выделить оборудование (визуально)
     */
    select() {
        this.isSelected = true;
        // TODO: Добавить визуальную подсветку (outline)
    }
    
    /**
     * Снять выделение
     */
    deselect() {
        this.isSelected = false;
        // TODO: Убрать визуальную подсветку
    }
    
    /**
     * Удалить оборудование (очистка памяти)
     */
    dispose() {
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            if (this.model.parent) {
                this.model.parent.remove(this.model);
            }
        }
        
        console.log(`🗑️ Оборудование "${this.data.name}" удалено`);
    }
    
    /**
     * Получить информацию для UI
     */
    getInfo() {
        return {
            id: this.id,
            catalogId: this.catalogId,
            name: this.data.name,
            category: this.data.category,
            isLoaded: this.isLoaded,
            isPlaced: this.isPlaced,
            isSelected: this.isSelected,
            position: this.position.toArray(),
            rotation: this.rotation,
            cabinet: this.parentCabinet?.id || null,
            dinRail: this.dinRailIndex,
            dimensions: this.data.dimensions
        };
    }
}
