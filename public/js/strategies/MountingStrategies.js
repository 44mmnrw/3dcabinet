import * as THREE from '../libs/three.module.js';

export class MountingStrategy {
    constructor(cabinetInstance, cabinetDef = {}) {
        this.cabinet = cabinetInstance;
        this.cabinetDef = cabinetDef;
    }

    mount(equipmentMesh, equipmentConfig, position) {
        throw new Error('mount() must be implemented by strategy');
    }

    getAvailablePositions() {
        return [];
    }
}

export class DINRailStrategy extends MountingStrategy {
    constructor(cabinetInstance, cabinetDef = {}) {
        super(cabinetInstance, cabinetDef);
        // Карта занятых позиций: railIndex -> массив [startX, endX, equipmentId]
        this.occupiedSpaces = new Map();
    }

    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { railIndex = 0, xOffset = null } = position;

        const components = this.cabinet.getComponents();
        const rails = [components.dinRail1, components.dinRail2, components.dinRail3].filter(Boolean);
        if (!rails.length) {
            throw new Error('В шкафу нет DIN-реек');
        }

        const rail = rails[Math.min(railIndex, rails.length - 1)];
        const railBBox = new THREE.Box3().setFromObject(rail);

        // Сохраняем текущую позицию оборудования и сбрасываем для правильного bbox
        const savedPosition = equipmentMesh.position.clone();
        equipmentMesh.position.set(0, 0, 0);
        equipmentMesh.updateMatrixWorld(true);

        // Ищем anchor mesh по имени (если указан)
        let anchorMesh = null;
        const anchorMeshName = equipmentConfig?.mounting?.anchorPoint?.meshName;
        if (anchorMeshName) {
            equipmentMesh.traverse((child) => {
                if (child.name === anchorMeshName && child.isMesh) {
                    anchorMesh = child;
                }
            });
            if (!anchorMesh) {
                console.warn(`⚠️ Anchor mesh "${anchorMeshName}" не найден, используем bbox всей группы`);
            }
        }

        // Считаем bbox в локальных координатах (после сброса position)
        const targetObject = anchorMesh || equipmentMesh;
        const equipmentBBox = new THREE.Box3().setFromObject(targetObject);
        
        // Ширина оборудования = используем dimensions из конфига (точнее) или bbox
        const equipmentWidth = equipmentConfig?.dimensions?.width || (equipmentBBox.max.x - equipmentBBox.min.x);

        // Определяем X-позицию на рейке
        let targetX;
        if (xOffset !== null) {
            targetX = railBBox.min.x + xOffset;
        } else {
            targetX = this._findNextFreePosition(railIndex, railBBox, equipmentWidth);
        }

        // Anchor point на рейке (локальные координаты рейки)
        const railAnchorX = targetX;
        const railAnchorY = (railBBox.min.y + railBBox.max.y) / 2;
        const railAnchorZ = railBBox.max.z;  // передняя грань рейки

        // Anchor point на оборудовании (локальные координаты)
        const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
        const equipmentAnchorX = equipmentBBox.min.x + configOffset[0];  // левый край
        const equipmentAnchorY = (equipmentBBox.min.y + equipmentBBox.max.y) / 2 + configOffset[1];  // центр по Y
        const equipmentAnchorZ = equipmentBBox.min.z + configOffset[2];  // задняя грань (клипса)

        // Вычисляем итоговую позицию оборудования (оба объекта в одной системе координат - assembly)
        equipmentMesh.position.set(
            railAnchorX - equipmentAnchorX,
            railAnchorY - equipmentAnchorY,
            railAnchorZ - equipmentAnchorZ
        );

        // Регистрируем занятое место на рейке
        this._registerOccupiedSpace(railIndex, targetX, targetX + equipmentWidth, equipmentMesh.name);

        console.log(`📍 DIN-рейка ${railIndex}: ${equipmentMesh.name} на X=${targetX.toFixed(3)}м (${(targetX * 1000).toFixed(1)}мм от начала), ширина=${(equipmentWidth * 1000).toFixed(1)}мм`);
        console.log(`   equipmentBBox: min=[${equipmentBBox.min.x.toFixed(3)}, ${equipmentBBox.min.y.toFixed(3)}, ${equipmentBBox.min.z.toFixed(3)}], max=[${equipmentBBox.max.x.toFixed(3)}, ${equipmentBBox.max.y.toFixed(3)}, ${equipmentBBox.max.z.toFixed(3)}]`);
        console.log(`   finalPosition: [${equipmentMesh.position.x.toFixed(3)}, ${equipmentMesh.position.y.toFixed(3)}, ${equipmentMesh.position.z.toFixed(3)}]`);
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

        console.warn(`⚠️ DIN-рейка ${railIndex} переполнена! Занято ${(searchX * 1000).toFixed(1)}мм из ${(railWidth * 1000).toFixed(1)}мм`);
        return searchX;  // Всё равно размещаем (выйдет за границы)
    }

    _registerOccupiedSpace(railIndex, startX, endX, equipmentId) {
        if (!this.occupiedSpaces.has(railIndex)) {
            this.occupiedSpaces.set(railIndex, []);
        }
        this.occupiedSpaces.get(railIndex).push({ startX, endX, equipmentId });
    }

    getRailOccupancy(railIndex) {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        const components = this.cabinet.getComponents();
        const rails = [components.dinRail1, components.dinRail2, components.dinRail3].filter(Boolean);
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
}

export class RackUnitStrategy extends MountingStrategy {
    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { unitIndex = 0, depth = 0 } = position;
        const components = this.cabinet.getComponents();
        const rackRails = components.rackRails || [];
        if (!rackRails.length) {
            throw new Error('В шкафу нет rack-направляющих');
        }

        const unitHeightMM = this.cabinetDef?.mounting?.unitHeight || 44.45;
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
}
