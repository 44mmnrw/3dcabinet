import * as THREE from 'three';

/**
 * Параметрический ресайз 3D моделей (GLB/GLTF)
 * 
 * Читает правила из glTF Custom Properties (userData.extras)
 * и применяет масштабирование/перемещение узлов модели.
 * 
 * ЛОГИКА:
 * - scale:    объект масштабируется вместе с родителем (по умолчанию)
 * - move:     объект НЕ масштабируется, позиция пересчитывается от anchor
 * - fixed:    объект НЕ масштабируется, позиция пересчитывается от anchor (= move)
 * - absolute: объект НЕ масштабируется, мировая позиция НЕ меняется
 */

// ========== ТИПЫ ==========
export type ResizeAction = 'scale' | 'move' | 'fixed' | 'absolute';
export type AnchorX = 'left' | 'center' | 'right';
export type AnchorY = 'bottom' | 'center' | 'top';
export type AnchorZ = 'front' | 'center' | 'back';

export interface ResizeRules {
  resize_x: ResizeAction;
  resize_y: ResizeAction;
  resize_z: ResizeAction;
  anchor_x: AnchorX;
  anchor_y: AnchorY;
  anchor_z: AnchorZ;
}

export interface NodeOriginalData {
  localPosition: THREE.Vector3;   // Локальная позиция (child.position)
  worldPosition: THREE.Vector3;   // Мировая позиция (для absolute)
  localScale: THREE.Vector3;      // Локальный масштаб (child.scale)
  rules: ResizeRules;
}

export interface ModelOriginalData {
  size: THREE.Vector3;    // Размер модели в метрах
  min: THREE.Vector3;     // Минимальные координаты bbox
  max: THREE.Vector3;     // Максимальные координаты bbox
  center: THREE.Vector3;  // Центр модели
}

// ========== КОНСТАНТЫ ==========
const DEFAULT_RULES: ResizeRules = {
  resize_x: 'scale',
  resize_y: 'scale',
  resize_z: 'scale',
  anchor_x: 'center',
  anchor_y: 'bottom',
  anchor_z: 'center',
};

// ========== ФУНКЦИИ ПАРАМЕТРИЧЕСКОГО РЕСАЙЗА ==========

/**
 * Читает правила ресайза из userData (glTF extras)
 * 
 * ВАЖНО: В glTF custom properties могут быть:
 * - В node.extras → попадает в object.userData
 * - В mesh.extras → попадает в mesh.geometry.userData (для Mesh объектов)
 * 
 * Проверяем оба места!
 */
export function getResizeRules(obj: THREE.Object3D): ResizeRules {
  // Собираем userData из node И из mesh geometry
  const nodeUserData = obj.userData || {};
  
  // Для Mesh объектов проверяем также geometry.userData (там mesh.extras)
  let meshUserData: Record<string, unknown> = {};
  if (obj instanceof THREE.Mesh && obj.geometry?.userData) {
    meshUserData = obj.geometry.userData;
  }
  
  // Node extras имеют приоритет над mesh extras
  // (mesh extras — fallback, если в node не указано)
  const userData = { ...meshUserData, ...nodeUserData };
  const rules: ResizeRules = { ...DEFAULT_RULES };
  
  // Shorthand: presize_xyz применяется ко всем осям
  const shorthand = userData['presize_xyz'] || userData['resize_xyz'];
  if (shorthand && ['scale', 'move', 'fixed', 'absolute'].includes(shorthand as string)) {
    rules.resize_x = shorthand as ResizeAction;
    rules.resize_y = shorthand as ResizeAction;
    rules.resize_z = shorthand as ResizeAction;
  }
  
  // Индивидуальные оси переопределяют shorthand
  const rx = userData['presize_x'] || userData['resize_x'];
  const ry = userData['presize_y'] || userData['resize_y'];
  const rz = userData['presize_z'] || userData['resize_z'];
  
  if (rx && ['scale', 'move', 'fixed', 'absolute'].includes(rx as string)) rules.resize_x = rx as ResizeAction;
  if (ry && ['scale', 'move', 'fixed', 'absolute'].includes(ry as string)) rules.resize_y = ry as ResizeAction;
  if (rz && ['scale', 'move', 'fixed', 'absolute'].includes(rz as string)) rules.resize_z = rz as ResizeAction;
  
  // Anchors
  if (userData['anchor_x']) rules.anchor_x = userData['anchor_x'] as AnchorX;
  if (userData['anchor_y']) rules.anchor_y = userData['anchor_y'] as AnchorY;
  if (userData['anchor_z']) rules.anchor_z = userData['anchor_z'] as AnchorZ;
  
  return rules;
}

/**
 * Проверяет, нужна ли обработка узла (есть ли нестандартные правила)
 */
export function needsProcessing(rules: ResizeRules): boolean {
  return rules.resize_x !== 'scale' || 
         rules.resize_y !== 'scale' || 
         rules.resize_z !== 'scale';
}

/**
 * Проверяет, есть ли кастомные правила ресайза
 * Принимает либо ResizeRules объект, либо THREE.Object3D модель
 */
export function hasCustomResizeRules(input: ResizeRules | THREE.Object3D): boolean {
  // Если передан объект правил (ResizeRules)
  if ('resize_x' in input && 'resize_y' in input && 'resize_z' in input) {
    return needsProcessing(input as ResizeRules);
  }
  
  // Если передан THREE.Object3D
  const model = input as THREE.Object3D;
  if (!model || typeof model.traverse !== 'function') {
    console.warn('hasCustomResizeRules: invalid input, expected ResizeRules or THREE.Object3D');
    return false;
  }
  
  let hasRules = false;
  
  model.traverse((child) => {
    if (hasRules) return; // Уже нашли, выходим
    
    const rules = getResizeRules(child);
    if (needsProcessing(rules)) {
      hasRules = true;
    }
  });
  
  return hasRules;
}

/**
 * Собирает оригинальные данные для всех узлов модели
 */
export function collectOriginalData(model: THREE.Object3D): { 
  nodes: Map<string, NodeOriginalData>, 
  model: ModelOriginalData 
} {
  const nodesMap = new Map<string, NodeOriginalData>();
  
  // BBox всей модели
  const modelBox = new THREE.Box3().setFromObject(model);
  const modelSize = new THREE.Vector3();
  const modelCenter = new THREE.Vector3();
  modelBox.getSize(modelSize);
  modelBox.getCenter(modelCenter);
  
  const modelData: ModelOriginalData = {
    size: modelSize.clone(),
    min: modelBox.min.clone(),
    max: modelBox.max.clone(),
    center: modelCenter.clone()
  };
  
  console.log(`📦 Модель: ${(modelSize.x * 1000).toFixed(0)}×${(modelSize.y * 1000).toFixed(0)}×${(modelSize.z * 1000).toFixed(0)} мм`);
  
  // Собираем данные узлов
  model.traverse((child) => {
    if (child.name && child !== model) {
      const rules = getResizeRules(child);
      
      // Получаем мировую позицию
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      
      nodesMap.set(child.name, {
        localPosition: child.position.clone(),
        worldPosition: worldPos,
        localScale: child.scale.clone(),
        rules
      });
      
      // Детальный лог для WALLS_* и LOCK_*
      if (child.name.startsWith('WALLS_') || child.name.startsWith('LOCK_')) {
        const meshUserData = (child instanceof THREE.Mesh && child.geometry?.userData) 
          ? child.geometry.userData 
          : {};
        console.log(`🔍 ${child.name}:`, {
          nodeUserData: child.userData,
          meshUserData: meshUserData,
          parent: child.parent?.name,
          localPosition: `(${child.position.x.toFixed(4)}, ${child.position.y.toFixed(4)}, ${child.position.z.toFixed(4)})`,
          worldPosition: `(${worldPos.x.toFixed(4)}, ${worldPos.y.toFixed(4)}, ${worldPos.z.toFixed(4)})`,
          rules
        });
      }
      
      // Логируем узлы с нестандартными правилами
      if (needsProcessing(rules)) {
        console.log(`🔧 ${child.name}: (${rules.resize_x}, ${rules.resize_y}, ${rules.resize_z}) anchor=(${rules.anchor_x}, ${rules.anchor_y}, ${rules.anchor_z})`);
      }
    }
  });
  
  return { nodes: nodesMap, model: modelData };
}

/**
 * Применяет параметрический ресайз
 * 
 * @param model - корневой объект модели
 * @param nodesData - оригинальные данные узлов
 * @param modelData - оригинальные данные модели (size, min, max, center)
 * @param originalSizeMm - оригинальный размер модели в мм (для расчёта scale)
 * @param newSizeMm - новый размер в миллиметрах (x, y, z)
 */
export function applyParametricResize(
  model: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  modelData: ModelOriginalData,
  originalSizeMm: THREE.Vector3,
  newSizeMm: THREE.Vector3
): void {
  // Конвертируем мм в метры
  const origSize = new THREE.Vector3(
    originalSizeMm.x / 1000,
    originalSizeMm.y / 1000,
    originalSizeMm.z / 1000
  );
  
  const newSize = new THREE.Vector3(
    newSizeMm.x / 1000,
    newSizeMm.y / 1000,
    newSizeMm.z / 1000
  );
  
  // Коэффициенты масштабирования
  const scaleX = newSize.x / origSize.x;
  const scaleY = newSize.y / origSize.y;
  const scaleZ = newSize.z / origSize.z;
  
  console.log(`📐 Ресайз: ${originalSizeMm.x.toFixed(0)}×${originalSizeMm.y.toFixed(0)}×${originalSizeMm.z.toFixed(0)} → ${newSizeMm.x.toFixed(0)}×${newSizeMm.y.toFixed(0)}×${newSizeMm.z.toFixed(0)} мм (scale: ${scaleX.toFixed(2)}, ${scaleY.toFixed(2)}, ${scaleZ.toFixed(2)})`);
  
  // 1. Масштабируем корень модели
  model.scale.set(scaleX, scaleY, scaleZ);
  
  // 2. Компенсируем смещение — фиксируем точку масштабирования
  // После scale от origin (0,0,0) модель сдвигается. Возвращаем на место.
  // Ось X: масштабируется от центра модели
  const offsetX = modelData.center.x * (1 - scaleX);
  // Ось Y: масштабируется от нижнего края (min.y)
  const offsetY = modelData.min.y * (1 - scaleY);
  // Ось Z: масштабируется от переднего края (min.z)
  const offsetZ = modelData.min.z * (1 - scaleZ);
  model.position.set(offsetX, offsetY, offsetZ);
  
  // 3. Обрабатываем узлы с нестандартными правилами
  model.traverse((child) => {
    const data = nodesData.get(child.name);
    if (!data || !needsProcessing(data.rules)) {
      return; // scale по всем осям — ничего не делаем
    }
    
    const rules = data.rules;
    
    // --- МАСШТАБ ---
    // Компенсируем родительский scale для осей с move/fixed/absolute
    const childScaleX = rules.resize_x === 'scale' ? data.localScale.x : data.localScale.x / scaleX;
    const childScaleY = rules.resize_y === 'scale' ? data.localScale.y : data.localScale.y / scaleY;
    const childScaleZ = rules.resize_z === 'scale' ? data.localScale.z : data.localScale.z / scaleZ;
    child.scale.set(childScaleX, childScaleY, childScaleZ);
    
    // --- ПОЗИЦИЯ ---
    // scale:    позиция масштабируется вместе с родителем (ничего не делаем)
    // move:     позиция пересчитывается относительно anchor
    // fixed:    позиция пересчитывается относительно anchor (= move)
    // absolute: мировая позиция НЕ меняется
    
    let newPosX = data.localPosition.x;
    let newPosY = data.localPosition.y;
    let newPosZ = data.localPosition.z;
    
    // X axis
    if (rules.resize_x === 'absolute') {
      // Для absolute: восстанавливаем оригинальную мировую позицию
      // Нужно преобразовать worldPosition обратно в локальную систему координат
      // local = (world - parentWorld) / parentScale
      // Но т.к. у нас может быть вложенная иерархия, используем матрицы
      const targetWorldPos = new THREE.Vector3(
        data.worldPosition.x,
        child.position.y, // Y и Z пока не трогаем
        child.position.z
      );
      // Преобразуем мировую позицию в локальную систему родителя
      const parentWorldMatrix = new THREE.Matrix4();
      if (child.parent) {
        child.parent.updateMatrixWorld(true);
        parentWorldMatrix.copy(child.parent.matrixWorld).invert();
      }
      targetWorldPos.applyMatrix4(parentWorldMatrix);
      newPosX = targetWorldPos.x;
    } else if (rules.resize_x === 'fixed' || rules.resize_x === 'move') {
      // Пересчитываем позицию от anchor
      newPosX = calculateNewPosition(
        data.localPosition.x,
        origSize.x,
        newSize.x,
        scaleX,
        rules.anchor_x
      );
    }
    
    // Y axis
    if (rules.resize_y === 'absolute') {
      const targetWorldPos = new THREE.Vector3(
        child.position.x,
        data.worldPosition.y,
        child.position.z
      );
      const parentWorldMatrix = new THREE.Matrix4();
      if (child.parent) {
        child.parent.updateMatrixWorld(true);
        parentWorldMatrix.copy(child.parent.matrixWorld).invert();
      }
      targetWorldPos.applyMatrix4(parentWorldMatrix);
      newPosY = targetWorldPos.y;
    } else if (rules.resize_y === 'fixed' || rules.resize_y === 'move') {
      newPosY = calculateNewPosition(
        data.localPosition.y,
        origSize.y,
        newSize.y,
        scaleY,
        rules.anchor_y
      );
    }
    
    // Z axis
    if (rules.resize_z === 'absolute') {
      const targetWorldPos = new THREE.Vector3(
        child.position.x,
        child.position.y,
        data.worldPosition.z
      );
      const parentWorldMatrix = new THREE.Matrix4();
      if (child.parent) {
        child.parent.updateMatrixWorld(true);
        parentWorldMatrix.copy(child.parent.matrixWorld).invert();
      }
      targetWorldPos.applyMatrix4(parentWorldMatrix);
      newPosZ = targetWorldPos.z;
    } else if (rules.resize_z === 'fixed' || rules.resize_z === 'move') {
      newPosZ = calculateNewPosition(
        data.localPosition.z,
        origSize.z,
        newSize.z,
        scaleZ,
        rules.anchor_z
      );
    }
    
    child.position.set(newPosX, newPosY, newPosZ);
    
    console.log(`   ${child.name}: pos=(${newPosX.toFixed(4)}, ${newPosY.toFixed(4)}, ${newPosZ.toFixed(4)})`);
  });
}

/**
 * Вычисляет новую локальную позицию для оси с move/fixed
 * 
 * ВАЖНО: Для оси X модель масштабируется от центра!
 * Это значит что левый и правый края сдвигаются на (newSize - origSize) / 2
 * 
 * @param origPos - оригинальная локальная позиция
 * @param origSize - оригинальный размер модели по оси
 * @param newSize - новый размер модели по оси
 * @param scale - коэффициент масштабирования
 * @param anchor - точка привязки
 */
function calculateNewPosition(
  origPos: number,
  origSize: number,
  newSize: number,
  scale: number,
  anchor: string
): number {
  let offset: number;
  let newPos: number;
  
  switch (anchor) {
    case 'right':
      // Для right: симметрично left, но сдвигаемся вправо
      // (т.к. масштабирование идёт от центра по X)
      offset = origPos;
      newPos = offset + (newSize - origSize) / 2;
      break;
      
    case 'top':
    case 'back':
      // Привязка к max краю: сохраняем расстояние от max
      offset = origSize - origPos;
      newPos = newSize - offset;
      break;
      
    case 'left':
      // Для left: учитываем что левый край сдвинулся влево на половину прироста
      // (т.к. масштабирование идёт от центра по X)
      offset = origPos;
      newPos = offset - (newSize - origSize) / 2;
      break;
      
    case 'bottom':
    case 'front':
      // Для bottom/front: край не сдвигается (масштабирование от min)
      offset = origPos;
      newPos = offset;
      break;
      
    case 'center':
    default:
      // Привязка к центру: сохраняем относительную позицию от центра
      offset = origPos - origSize / 2;
      newPos = newSize / 2 + offset;
      break;
  }
  
  // Конвертируем в локальные координаты (делим на scale родителя)
  return newPos / scale;
}

/**
 * Сбрасывает модель к оригинальным размерам
 */
export function resetToOriginal(
  model: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>
): void {
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);
  
  model.traverse((child) => {
    const data = nodesData.get(child.name);
    if (data) {
      child.position.copy(data.localPosition);
      child.scale.copy(data.localScale);
    }
  });
  
  console.log('🔄 Модель сброшена');
}

/**
 * Получает текущий размер модели в мм
 */
export function getModelSizeInMm(model: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  return new THREE.Vector3(size.x * 1000, size.y * 1000, size.z * 1000);
}


// Force HMR update 15:11:46
