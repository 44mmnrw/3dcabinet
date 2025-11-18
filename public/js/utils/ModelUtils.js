import * as THREE from '../libs/three.module.js';

/**
 * === КЛАСС GeometryUtils ===
 * Централизованные утилиты для работы с геометрией и позиционированием моделей
 */
export class GeometryUtils {
  /**
   * Выравнивание модели по полу (Y = 0)
   * @param {THREE.Object3D} object - 3D объект для выравнивания
   * @param {boolean} updateMatrices - Обновить матрицы перед расчётом
   * @returns {Object} - { bbox, offset: { x, y, z } }
   */
  static alignToFloor(object, updateMatrices = true) {
    if (updateMatrices) {
      object.updateMatrixWorld(true);
    }
    
    const bbox = new THREE.Box3().setFromObject(object);
    const offsetY = -bbox.min.y;
    
    object.position.y += offsetY;
    
    console.log(`📐 Модель выровнена по полу. Смещение Y: ${offsetY.toFixed(3)}м`);
    
    return {
      bbox,ы
      offset: { x: 0, y: offsetY, z: 0 }
    };
  }

  /**
   * Центрирование модели по осям X и Z
   * @param {THREE.Object3D} object - 3D объект
   * @param {boolean} centerX - Центрировать по X
   * @param {boolean} centerZ - Центрировать по Z
   * @returns {Object} - { bbox, offset: { x, y, z } }
   */
  static centerModel(object, centerX = true, centerZ = true) {
    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    
    const centerOffsetX = centerX ? -(bbox.max.x + bbox.min.x) / 2 : 0;
    const centerOffsetZ = centerZ ? -(bbox.max.z + bbox.min.z) / 2 : 0;
    
    object.position.x += centerOffsetX;
    object.position.z += centerOffsetZ;
    
    return {
      bbox,
      offset: { x: centerOffsetX, y: 0, z: centerOffsetZ }
    };
  }

  /**
   * Полное выравнивание: пол + центрирование
   * @param {THREE.Object3D} object - 3D объект
   * @param {Object} options - { floor: true, centerX: true, centerZ: true }
   * @returns {Object} - { bbox, offset, dimensions }
   */
  static alignModel(object, options = {}) {
    const { floor = true, centerX = true, centerZ = true } = options;
    
    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    
    const offset = { x: 0, y: 0, z: 0 };
    
    if (floor) {
      offset.y = -bbox.min.y;
      object.position.y += offset.y;
    }
    
    if (centerX) {
      offset.x = -(bbox.max.x + bbox.min.x) / 2;
      object.position.x += offset.x;
    }
    
    if (centerZ) {
      offset.z = -(bbox.max.z + bbox.min.z) / 2;
      object.position.z += offset.z;
    }
    
    object.updateMatrixWorld(true);
    const finalBBox = new THREE.Box3().setFromObject(object);
    
    return {
      bbox: finalBBox,
      offset,
      dimensions: {
        width: finalBBox.max.x - finalBBox.min.x,
        height: finalBBox.max.y - finalBBox.min.y,
        depth: finalBBox.max.z - finalBBox.min.z
      }
    };
  }

  /**
   * Получить Bounding Box объекта
   * @param {THREE.Object3D} object - 3D объект
   * @param {boolean} updateMatrices - Обновить матрицы перед расчётом
   * @returns {THREE.Box3}
   */
  static getBoundingBox(object, updateMatrices = true) {
    if (updateMatrices) {
      object.updateMatrixWorld(true);
    }
    return new THREE.Box3().setFromObject(object);
  }

  /**
   * Получить размеры объекта
   * @param {THREE.Object3D} object - 3D объект
   * @returns {Object} - { width, height, depth, center: Vector3 }
   */
  static getDimensions(object) {
    const bbox = this.getBoundingBox(object);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    return {
      width: bbox.max.x - bbox.min.x,
      height: bbox.max.y - bbox.min.y,
      depth: bbox.max.z - bbox.min.z,
      center
    };
  }

  /**
   * === DEBUG МЕТОДЫ ===
   */

  /**
   * Полная диагностика геометрии объекта
   * @param {THREE.Object3D} object - 3D объект
   * @param {string} name - Имя для логов
   */
  static diagnoseGeometry(object, name = 'Object') {
    console.log(`\n📊 === ДИАГНОСТИКА: ${name} ===`);
    
    // 1. Проверка трансформаций
    console.log(`\n1️⃣ ТРАНСФОРМАЦИИ:`);
    console.log(`   position: (${object.position.x.toFixed(3)}, ${object.position.y.toFixed(3)}, ${object.position.z.toFixed(3)})`);
    console.log(`   rotation: (${object.rotation.x.toFixed(3)}, ${object.rotation.y.toFixed(3)}, ${object.rotation.z.toFixed(3)})`);
    console.log(`   scale: (${object.scale.x.toFixed(3)}, ${object.scale.y.toFixed(3)}, ${object.scale.z.toFixed(3)})`);
    
    // 2. Иерархия
    console.log(`\n2️⃣ ИЕРАРХИЯ:`);
    console.log(`   name: ${object.name || '(без имени)'}`);
    console.log(`   type: ${object.type}`);
    console.log(`   children: ${object.children.length}`);
    if (object.children.length > 0) {
      object.children.forEach((child, idx) => {
        console.log(`     [${idx}] ${child.name || 'unnamed'} (${child.type})`);
      });
    }
    
    // 3. BBox ДО обновления матриц
    const bboxBefore = new THREE.Box3().setFromObject(object);
    console.log(`\n3️⃣ BBox ДО updateMatrixWorld:`);
    console.log(`   min: (${bboxBefore.min.x.toFixed(3)}, ${bboxBefore.min.y.toFixed(3)}, ${bboxBefore.min.z.toFixed(3)})`);
    console.log(`   max: (${bboxBefore.max.x.toFixed(3)}, ${bboxBefore.max.y.toFixed(3)}, ${bboxBefore.max.z.toFixed(3)})`);
    console.log(`   size: (${(bboxBefore.max.x - bboxBefore.min.x).toFixed(3)}, ${(bboxBefore.max.y - bboxBefore.min.y).toFixed(3)}, ${(bboxBefore.max.z - bboxBefore.min.z).toFixed(3)})`);
    
    // 4. BBox ПОСЛЕ обновления матриц
    object.updateMatrixWorld(true);
    const bboxAfter = new THREE.Box3().setFromObject(object);
    console.log(`\n4️⃣ BBox ПОСЛЕ updateMatrixWorld(true):`);
    console.log(`   min: (${bboxAfter.min.x.toFixed(3)}, ${bboxAfter.min.y.toFixed(3)}, ${bboxAfter.min.z.toFixed(3)})`);
    console.log(`   max: (${bboxAfter.max.x.toFixed(3)}, ${bboxAfter.max.y.toFixed(3)}, ${bboxAfter.max.z.toFixed(3)})`);
    console.log(`   size: (${(bboxAfter.max.x - bboxAfter.min.x).toFixed(3)}, ${(bboxAfter.max.y - bboxAfter.min.y).toFixed(3)}, ${(bboxAfter.max.z - bboxAfter.min.z).toFixed(3)})`);
    
    // 5. Смещение для выравнивания
    const offsetY = -bboxAfter.min.y;
    console.log(`\n5️⃣ ТРЕБУЕМОЕ СМЕЩЕНИЕ для выравнивания по полу:`);
    console.log(`   offsetY = -bbox.min.y = ${offsetY.toFixed(3)}`);
    
    console.log(`\n✅ === КОНЕЦ ДИАГНОСТИКИ ===\n`);
    
    return {
      bboxBefore,
      bboxAfter,
      offsetY
    };
  }

  /**
   * Визуализация Bounding Box на сцене (для отладки)
   * @param {THREE.Object3D} object - 3D объект
   * @param {THREE.Scene} scene - Сцена
   * @param {number} color - Цвет линий (hex)
   */
  static showBoundingBox(object, scene, color = 0xff0000) {
    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    const helper = new THREE.Box3Helper(bbox, color);
    helper.name = `BBoxHelper_${object.name || 'unnamed'}`;
    scene.add(helper);
    
    console.log(`📦 BBox helper добавлен на сцену (${object.name})`);
    
    return helper;
  }

  /**
   * Скрыть все BBox хелперы
   * @param {THREE.Scene} scene - Сцена
   */
  static hideBoundingBoxes(scene) {
    const helpers = scene.children.filter(child => 
      child.name && child.name.startsWith('BBoxHelper_')
    );
    
    if (helpers.length === 0) {
      console.log('ℹ️ BBox хелперов не найдено');
      return;
    }
    
    helpers.forEach(helper => {
      scene.remove(helper);
      helper.dispose();
    });
    
    console.log(`🗑️ Удалено ${helpers.length} BBox хелперов`);
  }

  /**
   * Проверить вложенные трансформации компонентов
   * @param {THREE.Object3D} object - 3D объект
   */
  static checkNestedTransforms(object, level = 0) {
    const indent = '  '.repeat(level);
    console.log(`${indent}▸ ${object.name || 'unnamed'} (${object.type})`);
    console.log(`${indent}  pos: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
    console.log(`${indent}  rot: (${object.rotation.x.toFixed(2)}, ${object.rotation.y.toFixed(2)}, ${object.rotation.z.toFixed(2)})`);
    console.log(`${indent}  scale: (${object.scale.x.toFixed(2)}, ${object.scale.y.toFixed(2)}, ${object.scale.z.toFixed(2)})`);
    
    if (object.children.length > 0) {
      object.children.forEach(child => {
        this.checkNestedTransforms(child, level + 1);
      });
    }
  }
}

/**
 * === LEGACY ФУНКЦИИ (для совместимости) ===
 */

/**
 * Выровнять группу так, чтобы её нижняя точка была на Y=0
 * @deprecated Используйте GeometryUtils.alignToFloor()
 * @param {THREE.Group} group - Группа для выравнивания
 */
export function alignGroupToFloor(group) {
    const result = GeometryUtils.alignToFloor(group);
    console.log('📐 GLB aligned to floor, offset Y:', result.offset.y.toFixed(3));
}

/**
 * Получить размеры объекта (ширина, высота, глубина)
 * @deprecated Используйте GeometryUtils.getDimensions()
 * @param {THREE.Object3D} object - Three.js объект
 * @returns {Object} { width, height, depth }
 */
export function getObjectDimensions(object) {
    const dims = GeometryUtils.getDimensions(object);
    return {
        width: dims.width,
        height: dims.height,
        depth: dims.depth
    };
}

/**
 * Центрировать объект относительно мировых координат
 * @deprecated Используйте GeometryUtils.centerModel()
 * @param {THREE.Object3D} object - Three.js объект
 */
export function centerObject(object) {
    GeometryUtils.centerModel(object, true, true);
}
