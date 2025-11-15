import * as THREE from '../libs/three.module.js';

/**
 * Выровнять группу так, чтобы её нижняя точка была на Y=0
 * @param {THREE.Group} group - Группа для выравнивания
 */
export function alignGroupToFloor(group) {
    const bbox = new THREE.Box3().setFromObject(group);
    const offsetY = -bbox.min.y;
    group.position.y += offsetY;
    console.log('📐 GLB aligned to floor, offset Y:', offsetY.toFixed(3));
}

/**
 * Получить размеры объекта (ширина, высота, глубина)
 * @param {THREE.Object3D} object - Three.js объект
 * @returns {Object} { width, height, depth }
 */
export function getObjectDimensions(object) {
    const bbox = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    return {
        width: size.x,
        height: size.y,
        depth: size.z
    };
}

/**
 * Центрировать объект относительно мировых координат
 * @param {THREE.Object3D} object - Three.js объект
 */
export function centerObject(object) {
    const bbox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    object.position.sub(center);
}
