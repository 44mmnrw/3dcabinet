import * as THREE from 'three';

export class MountingStrategy {
    constructor(cabinetInstance, cabinetType = null) {
        this.cabinet = cabinetInstance;
        this.cabinetType = cabinetType;  // Экземпляр CabinetType (NEW!)
    }

    mount(equipmentMesh, equipmentConfig, position) {
        throw new Error('mount() must be implemented by strategy');
    }

    /**
     * Проверить возможность монтажа (заглушка для Phase 1)
     * @param {Object} equipmentConfig - Конфигурация оборудования
     * @returns {Promise<boolean>}
     */
    async canMount(equipmentConfig) {
        return true;
    }

    getAvailablePositions() {
        return [];
    }
}

export class DINRailStrategy extends MountingStrategy {
    constructor(cabinetInstance, cabinetType = null) {
        super(cabinetInstance, cabinetType);
        // Карта занятых позиций: railIndex -> массив [startX, endX, equipmentId]
        this.occupiedSpaces = new Map();
    }

    /**
     * Получить список DIN-реек через CabinetType или fallback на компоненты
     * @returns {Array<THREE.Object3D>}
     */
    _getRails() {
        // Новый путь: через CabinetType.getMountingZones() (если есть)
        if (this.cabinetType) {
            const zones = this.cabinetType.getMountingZones('din_rail');
            if (zones.length > 0) {
                const components = this.cabinet.getComponents();
                const rails = [];
                
                zones.forEach(zone => {
                    zone.componentNames.forEach(name => {
                        const rail = components[name];
                        if (rail) rails.push(rail);
                    });
                });
                
                if (rails.length > 0) {
                    console.log(`✅ Найдено ${rails.length} DIN-реек через mountingZones`);
                    return rails;
                }
            }
        }
        
        // Fallback: ищем все компоненты, которые выглядят как DIN-рейки
        const components = this.cabinet.getComponents();
        const rails = Object.entries(components)
            .filter(([name, component]) => {
                // Проверяем по именам: dinRail*, din_rail*, rail*
                return component && (
                    name.includes('dinRail') || 
                    name.includes('din_rail') || 
                    name.includes('rail')
                );
            })
            .map(([name, component]) => component)
            .sort(); // Сортируем для консистентности
        
        if (rails.length > 0) {
            console.warn(`⚠️ Используется fallback. Найдено ${rails.length} DIN-реек: ${Object.keys(components).filter(n => n.includes('rail')).join(', ')}`);
        }
        
        return rails;
    }

    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { railIndex = 0, xOffset = null } = position;

        const rails = this._getRails();
        if (!rails.length) {
            throw new Error('В шкафу нет DIN-реек');
        }

        const rail = rails[Math.min(railIndex, rails.length - 1)];
        const railBBox = new THREE.Box3().setFromObject(rail);

        // Сохраняем текущую позицию оборудования и сбрасываем для правильного bbox
        const savedPosition = equipmentMesh.position.clone();
        equipmentMesh.position.set(0, 0, 0);
        equipmentMesh.updateMatrixWorld(true);

        // Ищем anchor mesh (rail_mesh) для крепления к DIN-рейке (только для Y/Z)
        let railMesh = null;
        const railMeshName = equipmentConfig?.mounting?.anchorPoint?.meshName;
        if (railMeshName) {
            equipmentMesh.traverse((child) => {
                if (child.name === railMeshName && child.isMesh) {
                    railMesh = child;
                }
            });
        }

        // Временно скрываем rail_mesh для расчёта РЕАЛЬНЫХ габаритов оборудования
        let railMeshVisible = null;
        if (railMesh) {
            railMeshVisible = railMesh.visible;
            railMesh.visible = false;
        }
        
        // Реальные габариты оборудования (БЕЗ rail_mesh плоскости)
        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        
        // Восстанавливаем видимость rail_mesh
        if (railMesh) {
            railMesh.visible = railMeshVisible;
        }
        
        // BBox самого rail_mesh (для Y/Z крепления)
        const railMeshBBox = railMesh ? new THREE.Box3().setFromObject(railMesh) : null;
        
        // Ширина оборудования из конфига (для поиска свободного места)
        const equipmentWidthConfig = equipmentConfig?.dimensions?.width;
        
        // Реальная ширина bbox (для регистрации занятого пространства)
        const equipmentWidthReal = equipmentBBox.max.x - equipmentBBox.min.x;
        
        // Используем бОльшую из двух (чтобы учесть реальные габариты)
        const equipmentWidth = Math.max(equipmentWidthConfig || 0, equipmentWidthReal);

        // Определяем X-позицию на рейке (АБСОЛЮТНАЯ координата в assembly)
        let targetX;
        if (xOffset !== null) {
            targetX = railBBox.min.x + xOffset;
        } else {
            targetX = this._findNextFreePosition(railIndex, railBBox, equipmentWidth);
        }

        // Anchor point на рейке (АБСОЛЮТНЫЕ координаты в assembly)
        const railAnchorX = targetX;  // targetX уже абсолютная координата
        const railAnchorY = (railBBox.min.y + railBBox.max.y) / 2;
        const railAnchorZ = railBBox.max.z;  // передняя грань рейки

        // Anchor point на оборудовании (локальные координаты)
        const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
        
        // X: используем РЕАЛЬНЫЙ левый край из bbox (он уже учитывает все внутренние трансформации GLTF)
        const equipmentAnchorX = equipmentBBox.min.x + configOffset[0];
        
        // Y и Z: используем rail_mesh если есть (точка крепления к DIN-рейке), иначе реальное оборудование
        let equipmentAnchorY, equipmentAnchorZ;
        if (railMeshBBox) {
            equipmentAnchorY = (railMeshBBox.min.y + railMeshBBox.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = railMeshBBox.min.z + configOffset[2];
        } else {
            equipmentAnchorY = (equipmentBBox.min.y + equipmentBBox.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = equipmentBBox.min.z + configOffset[2];
        }

        // Вычисляем итоговую позицию оборудования (оба объекта в одной системе координат - assembly)
        equipmentMesh.position.set(
            railAnchorX - equipmentAnchorX,
            railAnchorY - equipmentAnchorY,
            railAnchorZ - equipmentAnchorZ
        );

        // Обновляем матрицу для точного bbox
        equipmentMesh.updateMatrixWorld(true);

        // Регистрируем занятое место на рейке (АБСОЛЮТНЫЕ координаты в assembly)
        this._registerOccupiedSpace(railIndex, targetX, targetX + equipmentWidth, equipmentMesh.name);
    }

    _findNextFreePosition(railIndex, railBBox, equipmentWidth) {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        const railWidth = railBBox.max.x - railBBox.min.x;

        console.log(`🔍 Поиск позиции: рейка #${railIndex}, ширина оборудования=${(equipmentWidth * 1000).toFixed(1)}мм`);
        console.log(`   Рейка: min.x=${railBBox.min.x.toFixed(3)}, max.x=${railBBox.max.x.toFixed(3)}, ширина=${(railWidth * 1000).toFixed(1)}мм`);
        console.log(`   Занято позиций: ${occupied.length}`);

        // Сортируем по startX
        occupied.sort((a, b) => a.startX - b.startX);

        let searchX = railBBox.min.x;
        for (const space of occupied) {
            console.log(`   Занято: [${space.startX.toFixed(3)} - ${space.endX.toFixed(3)}] (${((space.endX - space.startX) * 1000).toFixed(1)}мм) - ${space.equipmentId}`);
            if (searchX + equipmentWidth <= space.startX) {
                // Нашли свободное место перед этим оборудованием
                console.log(`   ✅ Найдено место: X=${searchX.toFixed(3)}м (перед ${space.equipmentId})`);
                return searchX;
            }
            searchX = space.endX;  // Пропускаем занятое
        }

        // Проверяем, влезет ли в конец
        if (searchX + equipmentWidth <= railBBox.max.x) {
            console.log(`   ✅ Найдено место: X=${searchX.toFixed(3)}м (в конце рейки)`);
            return searchX;
        }

        // Места нет — выбрасываем ошибку
        const occupiedMM = (searchX - railBBox.min.x) * 1000;
        const railWidthMM = railWidth * 1000;
        const neededMM = equipmentWidth * 1000;
        throw new Error(
            `DIN-рейка ${railIndex} переполнена! ` +
            `Занято: ${occupiedMM.toFixed(0)}мм, ` +
            `длина рейки: ${railWidthMM.toFixed(0)}мм, ` +
            `требуется: ${neededMM.toFixed(0)}мм`
        );
    }

    _registerOccupiedSpace(railIndex, startX, endX, equipmentId) {
        if (!this.occupiedSpaces.has(railIndex)) {
            this.occupiedSpaces.set(railIndex, []);
        }
        this.occupiedSpaces.get(railIndex).push({ startX, endX, equipmentId });
    }

    /**
     * Автоматический поиск следующей свободной позиции на рейках (0 → 1 → 2 → 3)
     * @param {number} equipmentWidth - Ширина оборудования в метрах
     * @param {number} preferredRailIndex - Предпочитаемая рейка (начинаем с неё)
     * @returns {Object|null} { railIndex, xOffset } или null если нет места
     */
    findNextAvailableSlot(equipmentWidth, preferredRailIndex = 0) {
        const rails = this._getRails();
        
        if (rails.length === 0) {
            console.error('❌ В шкафу нет DIN-реек');
            return null;
        }

        // Порядок поиска: preferredRailIndex → 0 → 1 → 2 → 3
        const searchOrder = [preferredRailIndex];
        for (let i = 0; i < rails.length; i++) {
            if (i !== preferredRailIndex) searchOrder.push(i);
        }

        console.log(`🔍 Поиск места для оборудования (ширина ${(equipmentWidth * 1000).toFixed(1)}мм)`);
        console.log(`   Порядок поиска по рейкам: ${searchOrder.join(' → ')}`);

        for (const railIndex of searchOrder) {
            if (railIndex >= rails.length) continue;

            const rail = rails[railIndex];
            const railBBox = new THREE.Box3().setFromObject(rail);
            
            try {
                const xOffset = this._findNextFreePosition(railIndex, railBBox, equipmentWidth);
                console.log(`✅ Найдено свободное место: рейка ${railIndex}, X=${xOffset.toFixed(3)}м`);
                return { railIndex, xOffset };
            } catch (e) {
                // Рейка заполнена, пробуем следующую
                console.log(`   ⚠️ Рейка ${railIndex}: ${e.message}`);
                continue;
            }
        }

        console.error('❌ Нет свободного места ни на одной DIN-рейке');
        return null;
    }

    unmount(equipmentId, railIndex) {
        if (!this.occupiedSpaces.has(railIndex)) {
            console.warn(`⚠️ Рейка ${railIndex} не найдена в occupiedSpaces`);
            return;
        }

        const occupied = this.occupiedSpaces.get(railIndex);
        const initialLength = occupied.length;
        
        // Удаляем запись с этим equipmentId
        const filtered = occupied.filter(space => space.equipmentId !== equipmentId);
        this.occupiedSpaces.set(railIndex, filtered);
        
        const removed = initialLength - filtered.length;
        if (removed > 0) {
            console.log(`🔓 Освобождено место на рейке ${railIndex}: удалено ${removed} записей для ${equipmentId}`);
        } else {
            console.warn(`⚠️ Не найдено записи для ${equipmentId} на рейке ${railIndex}`);
        }
    }

    getRailOccupancy(railIndex) {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        const rails = this._getRails();
        if (railIndex >= rails.length) return null;

        const rail = rails[railIndex];
        const railBBox = new THREE.Box3().setFromObject(rail);
        const railWidth = railBBox.max.x - railBBox.min.x;

        let occupiedWidth = 0;
        occupied.forEach(space => {
            occupiedWidth += (space.endX - space.startX);
        });

        return {
            railWidth: railWidth,
            occupiedWidth: occupiedWidth,
            freeWidth: railWidth - occupiedWidth,
            fillPercent: (occupiedWidth / railWidth * 100).toFixed(1),
            items: occupied.length
        };
    }

    /**
     * Валидация монтажа для DIN-рейки
     * @param {Object} equipmentConfig
     * @returns {Promise<boolean>}
     */
    async canMount(equipmentConfig) {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'din_rail') {
            return false;
        }

        const rails = this._getRails();
        if (rails.length === 0) {
            console.warn('[DINRailStrategy] Нет DIN-реек в шкафу');
            return false;
        }

        // Дополнительные проверки можно добавить здесь
        return true;
    }
}

export class RackUnitStrategy extends MountingStrategy {
    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { unitIndex = 0, depth = 0 } = position;
        const components = this.cabinet.getComponents();
        const rackRails = components.rackRails || [];
        if (!rackRails.length) {
            throw new Error('В шкафу нет rack-направляющих');
        }

        // Используем cabinetType если доступен
        const unitHeightMM = this.cabinetType 
            ? (this.cabinetType.specs.rackUnits || 42) * 44.45 / 42  // 44.45mm per U
            : 44.45;
        const unitHeight = unitHeightMM / 1000;
        const equipmentHeight = equipmentConfig?.dimensions?.height || unitHeight;
        const yPosition = unitIndex * unitHeight;

        const rackBBox = new THREE.Box3().setFromObject(rackRails[0]);
        const rackAnchor = new THREE.Vector3(
            rackBBox.min.x,
            rackBBox.min.y + yPosition,
            rackBBox.min.z + depth
        );

        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const equipmentAnchor = new THREE.Vector3(
            (equipmentBBox.min.x + equipmentBBox.max.x) / 2,
            equipmentBBox.min.y,
            equipmentBBox.min.z
        );

        const delta = rackAnchor.clone().sub(equipmentAnchor);
        equipmentMesh.position.add(delta);
    }

    /**
     * Валидация для rack-монтажа
     */
    async canMount(equipmentConfig) {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'rack_unit') {
            return false;
        }

        const components = this.cabinet.getComponents();
        if (!components.rackRails || components.rackRails.length === 0) {
            console.warn('[RackUnitStrategy] Нет rack-направляющих');
            return false;
        }

        return true;
    }
}

export class MountingPlateStrategy extends MountingStrategy {
    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { x = 0, y = 0 } = position; // локальные координаты на плате
        const components = this.cabinet.getComponents();
        const plate = components.mountingPlate;
        if (!plate) {
            throw new Error('В шкафу нет монтажной пластины');
        }

        const plateBBox = new THREE.Box3().setFromObject(plate);
        const anchor = new THREE.Vector3(plateBBox.min.x + x, plateBBox.min.y + y, plateBBox.max.z);

        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const equipmentAnchor = new THREE.Vector3(
            (equipmentBBox.min.x + equipmentBBox.max.x) / 2,
            equipmentBBox.min.y,
            equipmentBBox.min.z
        );

        const delta = plate.localToWorld(anchor).sub(equipmentMesh.localToWorld(equipmentAnchor));
        equipmentMesh.position.add(delta);
    }

    /**
     * Валидация для монтажной пластины
     */
    async canMount(equipmentConfig) {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'mounting_plate') {
            return false;
        }

        const components = this.cabinet.getComponents();
        if (!components.mountingPlate) {
            console.warn('[MountingPlateStrategy] Нет монтажной пластины');
            return false;
        }

        return true;
    }
}
