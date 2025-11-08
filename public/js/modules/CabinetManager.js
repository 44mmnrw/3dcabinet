/**
 * CabinetManager — менеджер всех шкафов на сцене
 * Управляет коллекцией, collision detection, snap-to-grid
 */

import * as THREE from '../libs/three.module.js';

export class CabinetManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.cabinets = new Map(); // id -> CabinetModel
        this.selectedCabinet = null;
        
        // Параметры snap-to-grid
        this.snapDistance = 50; // мм — расстояние примагничивания
        this.gridSize = 100; // мм — размер сетки для выравнивания
    }
    
    async addCabinet(cabinetModel) {
        // Дождаться загрузки модели
        await cabinetModel.loadPromise;
        
        // Проверить коллизии и найти свободное место
        const validPosition = this.findValidPosition(cabinetModel);
        
        if (!validPosition) {
            console.warn('Не удалось найти место для шкафа');
            return false;
        }
        
        cabinetModel.setPosition(validPosition);
        
        // Добавить в коллекцию
        this.cabinets.set(cabinetModel.id, cabinetModel);
        
        // Добавить на сцену
        this.sceneManager.addToScene(cabinetModel.model);
        
        console.log(`✅ Шкаф добавлен: ${cabinetModel.config.name} в позицию (${validPosition.x}, ${validPosition.y}, ${validPosition.z})`);
        
        return true;
    }
    
    removeCabinet(cabinetId) {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) return false;
        
        this.sceneManager.removeFromScene(cabinet.model);
        cabinet.dispose();
        this.cabinets.delete(cabinetId);
        
        if (this.selectedCabinet?.id === cabinetId) {
            this.selectedCabinet = null;
        }
        
        console.log(`🗑️ Шкаф удален: ${cabinetId}`);
        return true;
    }
    
    findValidPosition(cabinetModel) {
        const type = cabinetModel.config.type;
        
        // Если это первый шкаф — просто разместить в центре без проверок
        if (this.cabinets.size === 0) {
            console.log(`  Первый шкаф, размещаю в центре без collision detection`);
            if (type === 'floor') {
                return new THREE.Vector3(0, 0, 0);
            } else {
                return new THREE.Vector3(0, 1500, -this.sceneManager.roomDepth / 2 + 100);
            }
        }
        
        if (type === 'floor') {
            return this.findFloorPosition(cabinetModel);
        } else {
            return this.findWallPosition(cabinetModel);
        }
    }
    
    findFloorPosition(cabinetModel) {
        // Начальная позиция — центр комнаты
        let testPosition = new THREE.Vector3(0, 0, 0);
        
        // Если есть другие шкафы, попробовать разместить рядом
        if (this.cabinets.size > 0) {
            const lastCabinet = Array.from(this.cabinets.values()).pop();
            const lastBox = lastCabinet.getBoundingBox();
            const lastSize = new THREE.Vector3();
            lastBox.getSize(lastSize);
            
            // Попробовать справа от последнего
            testPosition.x = lastBox.max.x + cabinetModel.config.width / 2 + this.snapDistance;
            testPosition.z = lastCabinet.position.z;
        }
        
        // Проверить на коллизии
        if (this.checkCollision(cabinetModel, testPosition)) {
            // Если коллизия — попробовать следующий ряд
            testPosition.z += 500; // Следующий ряд на 500мм дальше
            testPosition.x = 0;
            
            if (this.checkCollision(cabinetModel, testPosition)) {
                // Если снова коллизия — найти свободное место перебором
                testPosition = this.bruteForcePosition(cabinetModel);
            }
        }
        
        // Применить snap-to-grid
        testPosition = this.snapToGrid(testPosition);
        
        return testPosition;
    }
    
    findWallPosition(cabinetModel) {
        // Подвесные шкафы размещаются на задней стене
        const wallZ = -this.sceneManager.roomDepth / 2 + cabinetModel.config.depth / 2 + 10; // 10мм отступ от стены
        const wallY = cabinetModel.config.height / 2 + 1500; // 1500мм от пола (стандартная высота)
        
        let testPosition = new THREE.Vector3(0, wallY, wallZ);
        
        // Если есть другие подвесные шкафы, разместить рядом
        const wallCabinets = Array.from(this.cabinets.values()).filter(c => c.config.type === 'wall');
        
        if (wallCabinets.length > 0) {
            const lastWallCabinet = wallCabinets[wallCabinets.length - 1];
            const lastBox = lastWallCabinet.getBoundingBox();
            
            testPosition.x = lastBox.max.x + cabinetModel.config.width / 2 + this.snapDistance;
        }
        
        // Проверить коллизии
        if (this.checkCollision(cabinetModel, testPosition)) {
            testPosition = this.bruteForcePosition(cabinetModel, 'wall');
        }
        
        testPosition = this.snapToGrid(testPosition);
        
        return testPosition;
    }
    
    bruteForcePosition(cabinetModel, type = 'floor') {
        // Перебор позиций для поиска свободного места
        const step = 200; // шаг перебора 200мм
        const maxAttempts = 100;
        
        for (let i = 0; i < maxAttempts; i++) {
            const angle = (i / maxAttempts) * Math.PI * 2; // Спираль
            const radius = i * step;
            
            const testPosition = new THREE.Vector3(
                Math.cos(angle) * radius,
                type === 'wall' ? 1500 : 0,
                Math.sin(angle) * radius
            );
            
            if (!this.checkCollision(cabinetModel, testPosition)) {
                return testPosition;
            }
        }
        
        console.warn('Не удалось найти свободное место после 100 попыток');
        return new THREE.Vector3(0, type === 'wall' ? 1500 : 0, 0);
    }
    
    checkCollision(cabinetModel, position) {
        // Создать временный bounding box в тестовой позиции
        const testBox = this.createBoundingBox(cabinetModel, position);
        
        // Проверить пересечение с существующими шкафами
        for (const cabinet of this.cabinets.values()) {
            const cabinetBox = cabinet.getBoundingBox();
            
            if (testBox.intersectsBox(cabinetBox)) {
                return true; // Коллизия найдена
            }
        }
        
        // Проверить границы комнаты
        if (this.isOutsideRoom(testBox)) {
            return true;
        }
        
        return false; // Коллизий нет
    }
    
    createBoundingBox(cabinetModel, position) {
        const halfWidth = cabinetModel.config.width / 2;
        const halfHeight = cabinetModel.config.height / 2;
        const halfDepth = cabinetModel.config.depth / 2;
        
        return new THREE.Box3(
            new THREE.Vector3(
                position.x - halfWidth,
                position.y - halfHeight,
                position.z - halfDepth
            ),
            new THREE.Vector3(
                position.x + halfWidth,
                position.y + halfHeight,
                position.z + halfDepth
            )
        );
    }
    
    isOutsideRoom(box) {
        const roomHalfWidth = this.sceneManager.roomWidth / 2;
        const roomHalfDepth = this.sceneManager.roomDepth / 2;
        
        const isOutside = (
            box.min.x < -roomHalfWidth ||
            box.max.x > roomHalfWidth ||
            box.min.z < -roomHalfDepth ||
            box.max.z > roomHalfDepth ||
            box.min.y < 0 ||
            box.max.y > this.sceneManager.roomHeight
        );
        
        if (isOutside) {
            console.warn(`  ⚠ Шкаф выходит за границы комнаты:`);
            console.warn(`    Box: X(${box.min.x.toFixed(0)} - ${box.max.x.toFixed(0)}), Y(${box.min.y.toFixed(0)} - ${box.max.y.toFixed(0)}), Z(${box.min.z.toFixed(0)} - ${box.max.z.toFixed(0)})`);
            console.warn(`    Комната: X(±${roomHalfWidth}), Y(0-${this.sceneManager.roomHeight}), Z(±${roomHalfDepth})`);
        }
        
        return isOutside;
    }
    
    snapToGrid(position) {
        // Примагничивание к сетке
        return new THREE.Vector3(
            Math.round(position.x / this.gridSize) * this.gridSize,
            position.y,
            Math.round(position.z / this.gridSize) * this.gridSize
        );
    }
    
    snapToNearby(cabinetModel, position) {
        // Примагничивание к ближайшим шкафам
        let snappedPosition = position.clone();
        let minDistance = this.snapDistance;
        
        for (const cabinet of this.cabinets.values()) {
            if (cabinet.id === cabinetModel.id) continue;
            
            const cabinetBox = cabinet.getBoundingBox();
            
            // Проверить расстояние по X
            const distanceX = Math.abs(position.x - cabinetBox.max.x);
            if (distanceX < minDistance) {
                snappedPosition.x = cabinetBox.max.x + cabinetModel.config.width / 2;
            }
            
            // Проверить расстояние по Z
            const distanceZ = Math.abs(position.z - cabinetBox.max.z);
            if (distanceZ < minDistance) {
                snappedPosition.z = cabinetBox.max.z + cabinetModel.config.depth / 2;
            }
        }
        
        return snappedPosition;
    }
    
    selectCabinet(cabinetId) {
        // Снять выбор с предыдущего
        if (this.selectedCabinet) {
            this.selectedCabinet.setSelected(false);
        }
        
        const cabinet = this.cabinets.get(cabinetId);
        if (cabinet) {
            cabinet.setSelected(true);
            this.selectedCabinet = cabinet;
            console.log(`Выбран шкаф: ${cabinet.config.name}`);
            return cabinet;
        }
        
        this.selectedCabinet = null;
        return null;
    }
    
    deselectAll() {
        if (this.selectedCabinet) {
            this.selectedCabinet.setSelected(false);
            this.selectedCabinet = null;
        }
    }
    
    moveCabinet(cabinetId, newPosition) {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) return false;
        
        // Проверить коллизии в новой позиции
        if (this.checkCollision(cabinet, newPosition)) {
            console.warn('Невозможно переместить: коллизия');
            return false;
        }
        
        // Применить snap
        const snappedPosition = this.snapToNearby(cabinet, newPosition);
        cabinet.setPosition(snappedPosition);
        
        return true;
    }
    
    rotateCabinet(cabinetId, angle) {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) return false;
        
        cabinet.setRotation(angle);
        return true;
    }
    
    getAllCabinets() {
        return Array.from(this.cabinets.values());
    }
    
    getCabinetById(id) {
        return this.cabinets.get(id);
    }
    
    clear() {
        for (const cabinet of this.cabinets.values()) {
            this.sceneManager.removeFromScene(cabinet.model);
            cabinet.dispose();
        }
        this.cabinets.clear();
        this.selectedCabinet = null;
        console.log('🗑️ Все шкафы удалены');
    }
}
