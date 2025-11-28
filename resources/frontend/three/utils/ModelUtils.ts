import * as THREE from 'three';

/**
 * === КЛАСС GeometryUtils ===
 * Централизованные утилиты для работы с геометрией и позиционированием моделей
 */
export class GeometryUtils {
  /**
   * Выравнивание модели по полу (Y = 0)
   * @param object - 3D объект для выравнивания
   * @param updateMatrices - Обновить матрицы перед расчётом
   * @returns Объект с bbox и offset
   */
  static alignToFloor(object: THREE.Object3D, updateMatrices: boolean = true): {
    bbox: THREE.Box3;
    offset: { x: number; y: number; z: number };
  } {
    if (updateMatrices) {
      object.updateMatrixWorld(true);
    }
    
    const bbox = new THREE.Box3().setFromObject(object);
    const offsetY = -bbox.min.y;
    
    object.position.y += offsetY;
    
    console.log(`📐 Модель выровнена по полу. Смещение Y: ${offsetY.toFixed(3)}м`);
    
    return {
      bbox,
      offset: { x: 0, y: offsetY, z: 0 }
    };
  }

  /**
   * Центрирование модели по осям X и Z
   * @param object - 3D объект
   * @param centerX - Центрировать по X
   * @param centerZ - Центрировать по Z
   * @returns Объект с bbox и offset
   */
  static centerModel(
    object: THREE.Object3D, 
    centerX: boolean = true, 
    centerZ: boolean = true
  ): {
    bbox: THREE.Box3;
    offset: { x: number; y: number; z: number };
  } {
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
   * @param object - 3D объект
   * @param options - Опции выравнивания
   * @returns Объект с bbox, offset и dimensions
   */
  static alignModel(
    object: THREE.Object3D, 
    options: {
      floor?: boolean;
      centerX?: boolean;
      centerZ?: boolean;
    } = {}
  ): {
    bbox: THREE.Box3;
    offset: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
  } {
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
   * @param object - 3D объект
   * @param updateMatrices - Обновить матрицы перед расчётом
   * @returns Bounding Box
   */
  static getBoundingBox(object: THREE.Object3D, updateMatrices: boolean = true): THREE.Box3 {
    if (updateMatrices) {
      object.updateMatrixWorld(true);
    }
    return new THREE.Box3().setFromObject(object);
  }

  /**
   * Получить размеры объекта
   * @param object - 3D объект
   * @returns Размеры и центр объекта
   */
  static getDimensions(object: THREE.Object3D): {
    width: number;
    height: number;
    depth: number;
    center: THREE.Vector3;
  } {
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
   * @param object - 3D объект
   * @param name - Имя для логов
   */
  static diagnoseGeometry(object: THREE.Object3D, name: string = 'Object'): {
    bboxBefore: THREE.Box3;
    bboxAfter: THREE.Box3;
    offsetY: number;
  } {
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
   * @param object - 3D объект
   * @param scene - Сцена
   * @param color - Цвет линий (hex)
   */
  static showBoundingBox(object: THREE.Object3D, scene: THREE.Scene, color: number = 0xff0000): THREE.Box3Helper {
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
   * @param scene - Сцена
   */
  static hideBoundingBoxes(scene: THREE.Scene): void {
    const helpers = scene.children.filter(child => 
      child.name && child.name.startsWith('BBoxHelper_')
    );
    
    if (helpers.length === 0) {
      console.log('ℹ️ BBox хелперов не найдено');
      return;
    }
    
    helpers.forEach(helper => {
      scene.remove(helper);
      if ('dispose' in helper && typeof helper.dispose === 'function') {
        (helper as { dispose: () => void }).dispose();
      }
    });
    
    console.log(`🗑️ Удалено ${helpers.length} BBox хелперов`);
  }

  /**
   * Проверить вложенные трансформации компонентов
   * @param object - 3D объект
   * @param level - Уровень вложенности (для отступов)
   */
  static checkNestedTransforms(object: THREE.Object3D, level: number = 0): void {
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
 * @param group - Группа для выравнивания
 */
export function alignGroupToFloor(group: THREE.Group): void {
    const result = GeometryUtils.alignToFloor(group);
    console.log('📐 GLB aligned to floor, offset Y:', result.offset.y.toFixed(3));
}

/**
 * Получить размеры объекта (ширина, высота, глубина)
 * @deprecated Используйте GeometryUtils.getDimensions()
 * @param object - Three.js объект
 * @returns Размеры объекта
 */
export function getObjectDimensions(object: THREE.Object3D): {
    width: number;
    height: number;
    depth: number;
} {
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
 * @param object - Three.js объект
 */
export function centerObject(object: THREE.Object3D): void {
    GeometryUtils.centerModel(object, true, true);
}

