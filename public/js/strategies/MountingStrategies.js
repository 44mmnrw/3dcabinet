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
    mount(equipmentMesh, equipmentConfig, position = {}) {
        const { railIndex = 0, moduleIndex = 0 } = position;

        const components = this.cabinet.getComponents();
        const rails = [components.dinRail1, components.dinRail2, components.dinRail3].filter(Boolean);
        if (!rails.length) {
            throw new Error('В шкафу нет DIN-реек');
        }

        const rail = rails[Math.min(railIndex, rails.length - 1)];

        const railBBox = new THREE.Box3().setFromObject(rail);
        const railAnchorLocal = new THREE.Vector3(
            railBBox.min.x,
            (railBBox.min.y + railBBox.max.y) / 2,
            railBBox.max.z
        );

        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
        const equipmentAnchorLocal = new THREE.Vector3(
            (equipmentBBox.min.x + equipmentBBox.max.x) / 2 + configOffset[0],
            equipmentBBox.min.y + configOffset[1],
            equipmentBBox.min.z + configOffset[2]
        );

        const railAnchorWorld = rail.localToWorld(railAnchorLocal.clone());
        const equipmentAnchorWorld = equipmentMesh.localToWorld(equipmentAnchorLocal.clone());
        const delta = railAnchorWorld.clone().sub(equipmentAnchorWorld);
        equipmentMesh.position.add(delta);

        const equipmentPosInRail = rail.worldToLocal(equipmentMesh.position.clone());
        const stepMM = this.cabinetDef?.mounting?.moduleWidth || 18; // мм
        const moduleStep = (equipmentConfig?.dimensions?.width || (stepMM / 1000));
        equipmentPosInRail.x = railBBox.min.x + moduleIndex * moduleStep;
        equipmentMesh.position.copy(rail.localToWorld(equipmentPosInRail));
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
