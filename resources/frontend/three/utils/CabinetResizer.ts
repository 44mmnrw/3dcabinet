import * as THREE from 'three';

/**
 * CabinetResizer v2.0
 * внеси
 * Параметрический ресайз 3D моделей шкафов (GLB/GLTF)
 * 
 * Основан на ТЗ v2.0: Система адаптивного масштабирования
 * 
 * ============================================================================
 * КОНЦЕПЦИЯ
 * ============================================================================
 * 
 * 1. Action (resize_x/y/z) — что делать с объектом:
 *    - scale:    масштабировать вместе с родителем (по умолчанию)
 *    - move:     НЕ масштабировать геометрию, только перемещать
 *    - absolute: НЕ масштабировать и НЕ перемещать (мировая позиция фиксирована)
 * 
 * 2. Anchor (anchor_x/y/z) — к какому краю привязан объект:
 *    - left/bottom/front:  фиксированный отступ от origin (мин. координата)
 *    - right/top/back:     фиксированный отступ от противоположного края
 *    - center:             пропорциональное положение
 * 
 * ============================================================================
 * ФОРМУЛЫ (для resize='move')
 * ============================================================================
 * 
 * Компенсация геометрии:
 *   child.scale = origScale / parentScale
 * 
 * Позиция в зависимости от anchor:
 *   - anchor = left/bottom/front:
 *       newPos = origPos / scale
 *   - anchor = right/top/back:
 *       newPos = origPos / scale + sizeDelta / 2 / scale
 *   - anchor = center:
 *       newPos = origPos (пропорционально)
 * 
 * ============================================================================
 * ТРЕБОВАНИЯ К МОДЕЛИ
 * ============================================================================
 * 
 * - Узлы с resize/anchor должны иметь origin в центре bbox
 * - Для вращающихся элементов (двери) использовать двухуровневую иерархию:
 *   DOOR_FRAME (центр bbox, resize/anchor) → DOOR_HINGE (петля, rotation.y)
 * 
 * ============================================================================
 */

// ============================================================================
// ТИПЫ
// ============================================================================

/** Действие при масштабировании */
export type ResizeAction = 'scale' | 'move' | 'absolute';

/** Anchor по оси X */
export type AnchorX = 'left' | 'center' | 'right';

/** Anchor по оси Y */
export type AnchorY = 'bottom' | 'center' | 'top';

/** Anchor по оси Z */
export type AnchorZ = 'front' | 'center' | 'back';

/** Правила ресайза для узла */
export interface ResizeRules {
  resize_x: ResizeAction;
  resize_y: ResizeAction;
  resize_z: ResizeAction;
  anchor_x: AnchorX;
  anchor_y: AnchorY;
  anchor_z: AnchorZ;
}

/** Оригинальные данные узла (сохраняются при загрузке) */
export interface NodeOriginalData {
  localPosition: THREE.Vector3;
  worldPosition: THREE.Vector3;
  localScale: THREE.Vector3;
  size: THREE.Vector3;
  rules: ResizeRules;
  parentName: string | null;
}

/** Оригинальные данные модели */
export interface ModelOriginalData {
  size: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
}

/** Результат collectOriginalData */
export interface CollectedData {
  nodes: Map<string, NodeOriginalData>;
  model: ModelOriginalData;
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

const EPSILON = 1e-6;

const DEFAULT_RULES: ResizeRules = {
  resize_x: 'scale',
  resize_y: 'scale',
  resize_z: 'scale',
  anchor_x: 'center',
  anchor_y: 'bottom',
  anchor_z: 'center',
};

// ============================================================================
// ЧТЕНИЕ ПРАВИЛ ИЗ GLTF
// ============================================================================

/**
 * Читает правила ресайза из userData (glTF extras)
 * 
 * Проверяет:
 * 1. node.userData (node.extras в glTF)
 * 2. mesh.geometry.userData (mesh.extras в glTF)
 * 
 * Поддерживает shorthand: resize_xyz / presize_xyz применяется ко всем осям
 */
export function getResizeRules(obj: THREE.Object3D): ResizeRules {
  // Собираем userData из node и mesh geometry
  const nodeUserData = obj.userData || {};
  
  let meshUserData: Record<string, unknown> = {};
  if (obj instanceof THREE.Mesh && obj.geometry?.userData) {
    meshUserData = obj.geometry.userData;
  }
  
  // Node extras имеют приоритет над mesh extras
  const userData = { ...meshUserData, ...nodeUserData };
  const rules: ResizeRules = { ...DEFAULT_RULES };
  
  // Shorthand: resize_xyz / presize_xyz применяется ко всем осям
  const shorthand = userData['resize_xyz'] || userData['presize_xyz'];
  if (isValidResizeAction(shorthand)) {
    rules.resize_x = shorthand;
    rules.resize_y = shorthand;
    rules.resize_z = shorthand;
  }
  
  // Индивидуальные оси переопределяют shorthand
  const rx = userData['resize_x'] || userData['presize_x'];
  const ry = userData['resize_y'] || userData['presize_y'];
  const rz = userData['resize_z'] || userData['presize_z'];
  
  if (isValidResizeAction(rx)) rules.resize_x = rx;
  if (isValidResizeAction(ry)) rules.resize_y = ry;
  if (isValidResizeAction(rz)) rules.resize_z = rz;
  
  // Anchors
  if (isValidAnchorX(userData['anchor_x'])) rules.anchor_x = userData['anchor_x'];
  if (isValidAnchorY(userData['anchor_y'])) rules.anchor_y = userData['anchor_y'];
  if (isValidAnchorZ(userData['anchor_z'])) rules.anchor_z = userData['anchor_z'];
  
  return rules;
}

function isValidResizeAction(value: unknown): value is ResizeAction {
  return value === 'scale' || value === 'move' || value === 'absolute';
}

function isValidAnchorX(value: unknown): value is AnchorX {
  return value === 'left' || value === 'center' || value === 'right';
}

function isValidAnchorY(value: unknown): value is AnchorY {
  return value === 'bottom' || value === 'center' || value === 'top';
}

function isValidAnchorZ(value: unknown): value is AnchorZ {
  return value === 'front' || value === 'center' || value === 'back';
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
 * Проверяет, есть ли в модели узлы с кастомными правилами
 */
export function hasCustomResizeRules(model: THREE.Object3D): boolean {
  let found = false;
  
  model.traverse((child) => {
    if (found) return;
    const rules = getResizeRules(child);
    if (needsProcessing(rules)) {
      found = true;
    }
  });
  
  return found;
}

// ============================================================================
// СБОР ОРИГИНАЛЬНЫХ ДАННЫХ
// ============================================================================

/**
 * Собирает оригинальные данные модели и всех узлов
 * Вызывать ОДИН РАЗ после загрузки модели, ДО любых трансформаций
 */
export function collectOriginalData(model: THREE.Object3D): { 
  nodes: Map<string, NodeOriginalData>;
  model: ModelOriginalData;
} {
  const nodes = new Map<string, NodeOriginalData>();
  
  // Обновляем мировые матрицы перед сбором данных
  model.updateMatrixWorld(true);
  
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
  
  console.log(`📦 CabinetResizer: Модель ${formatSize(modelSize)}`);
  
  // Собираем данные узлов
  model.traverse((child) => {
    if (!child.name || child === model) return;
    
    const rules = getResizeRules(child);
    const worldPos = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    const nodeBox = new THREE.Box3().setFromObject(child);
    const nodeSize = new THREE.Vector3();
    nodeBox.getSize(nodeSize);
    
    nodes.set(child.name, {
      localPosition: child.position.clone(),
      worldPosition: worldPos,
      localScale: child.scale.clone(),
      size: nodeSize.clone(),
      rules,
      parentName: child.parent?.name || null
    });
    
    // Логируем узлы с кастомными правилами
    if (needsProcessing(rules)) {
      console.log(
        `   🔧 ${child.name}: ` +
        `resize=(${rules.resize_x},${rules.resize_y},${rules.resize_z}) ` +
        `anchor=(${rules.anchor_x},${rules.anchor_y},${rules.anchor_z}) ` +
        `pos=(${formatVec(child.position)})`
      );
    }
  });
  
  return { nodes, model: modelData };
}

// ============================================================================
// ГЛАВНЫЙ АЛГОРИТМ РЕСАЙЗА
// ============================================================================

/**
 * Применяет параметрический ресайз к модели
 * 
 * @param model - корневой объект модели
 * @param nodesData - оригинальные данные узлов (из collectOriginalData)
 * @param modelData - оригинальные данные модели
 * @param originalSizeMm - оригинальный размер в мм
 * @param newSizeMm - новый размер в мм
 */
export function applyParametricResize(
  model: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  modelData: ModelOriginalData,
  originalSizeMm: THREE.Vector3,
  newSizeMm: THREE.Vector3
): void {
  // --- 1. Валидация входных данных ---
  if (!validateSize(originalSizeMm) || !validateSize(newSizeMm)) {
    console.error('❌ CabinetResizer: Некорректные размеры');
    return;
  }
  
  // --- 2. Вычисляем scale и sizeDelta ---
  const scale = new THREE.Vector3(
    safeDiv(newSizeMm.x, originalSizeMm.x),
    safeDiv(newSizeMm.y, originalSizeMm.y),
    safeDiv(newSizeMm.z, originalSizeMm.z)
  );
  
  // sizeDelta в метрах (для формул anchor)
  const sizeDelta = new THREE.Vector3(
    (newSizeMm.x - originalSizeMm.x) / 1000,
    (newSizeMm.y - originalSizeMm.y) / 1000,
    (newSizeMm.z - originalSizeMm.z) / 1000
  );
  
  console.log(
    `📐 CabinetResizer: ${formatSizeMm(originalSizeMm)} → ${formatSizeMm(newSizeMm)}\n` +
    `   scale=(${formatVec(scale)}) sizeDelta=(${formatVec(sizeDelta)})`
  );
  
  // --- 3. Применяем scale к корню модели ---
  model.scale.copy(scale);
  
  // --- 4. Компенсируем позицию модели (фиксируем точку масштабирования) ---
  // X: от центра, Y: от низа, Z: от переда
  const offsetX = modelData.center.x * (1 - scale.x);
  const offsetY = modelData.min.y * (1 - scale.y);
  const offsetZ = modelData.min.z * (1 - scale.z);
  model.position.set(offsetX, offsetY, offsetZ);
  
  // --- 5. Обрабатываем узлы с кастомными правилами ---
  model.traverse((child) => {
    const data = nodesData.get(child.name);
    if (!data || !needsProcessing(data.rules)) return;
    
    processNode(child, data, scale, nodesData, modelData);
  });
  
  // --- 6. Обновляем мировые матрицы ---
  model.updateMatrixWorld(true);
}

/**
 * Обрабатывает отдельный узел с кастомными правилами
 */
function processNode(
  child: THREE.Object3D,
  data: NodeOriginalData,
  rootScale: THREE.Vector3,
  nodesData: Map<string, NodeOriginalData>,
  modelData: ModelOriginalData
): void {
  const rules = data.rules;
  const origPos = data.localPosition;
  const origScale = data.localScale;
  
  // Получаем effectiveScale (учитывая цепочку родителей)
  const effScale = getEffectiveScale(child, nodesData, rootScale);
  
  // Получаем sizeDelta относительно ближайшего масштабируемого родителя
  const { parentSize, parentScale } = getParentSizeAndScale(child, nodesData, modelData, rootScale);
  const sizeDelta = new THREE.Vector3(
    parentSize.x * (parentScale.x - 1),
    parentSize.y * (parentScale.y - 1),
    parentSize.z * (parentScale.z - 1)
  );
  
  // --- Компенсация геометрии (child.scale) ---
  // Если resize !== 'scale', компенсируем растяжение, которое реально дошло до узла
  const newScale = new THREE.Vector3(
    rules.resize_x !== 'scale' ? safeDiv(origScale.x, effScale.x) : origScale.x,
    rules.resize_y !== 'scale' ? safeDiv(origScale.y, effScale.y) : origScale.y,
    rules.resize_z !== 'scale' ? safeDiv(origScale.z, effScale.z) : origScale.z
  );
  
  // --- Компенсация позиции ---
  const newPos = new THREE.Vector3();
  
  // X
  if (rules.resize_x === 'move') {
    newPos.x = calculatePositionByAnchor(origPos.x, rules.anchor_x, effScale.x, sizeDelta.x);
  } else if (rules.resize_x === 'absolute') {
    // absolute: сохраняем мировую позицию → newLocal = origWorld / parentWorldScale
    newPos.x = safeDiv(data.worldPosition.x - getParentWorldPosition(child).x, getParentWorldScale(child).x);
  } else {
    newPos.x = origPos.x;
  }
  
  // Y
  if (rules.resize_y === 'move') {
    newPos.y = calculatePositionByAnchor(origPos.y, rules.anchor_y, effScale.y, sizeDelta.y);
  } else if (rules.resize_y === 'absolute') {
    newPos.y = safeDiv(data.worldPosition.y - getParentWorldPosition(child).y, getParentWorldScale(child).y);
  } else {
    newPos.y = origPos.y;
  }
  
  // Z
  if (rules.resize_z === 'move') {
    newPos.z = calculatePositionByAnchor(origPos.z, rules.anchor_z, effScale.z, sizeDelta.z);
  } else if (rules.resize_z === 'absolute') {
    newPos.z = safeDiv(data.worldPosition.z - getParentWorldPosition(child).z, getParentWorldScale(child).z);
  } else {
    newPos.z = origPos.z;
  }
  
  // --- Применяем ---
  child.scale.copy(newScale);
  child.position.copy(newPos);
  
  // Debug log для ключевых объектов
  if (shouldLogNode(child.name)) {
    console.log(
      `   🎯 ${child.name}:\n` +
      `      rules: (${rules.resize_x},${rules.resize_y},${rules.resize_z}) ` +
      `anchor=(${rules.anchor_x},${rules.anchor_y},${rules.anchor_z})\n` +
      `      effScale: (${formatVec(effScale)})\n` +
      `      sizeDelta: (${formatVec(sizeDelta)})\n` +
      `      pos: (${formatVec(origPos)}) → (${formatVec(newPos)})\n` +
      `      scale: (${formatVec(origScale)}) → (${formatVec(newScale)})`
    );
  }
}

/**
 * Вычисляет позицию по anchor
 * 
 * anchor = left/bottom/front:
 *   Фиксированный отступ от origin
 *   newPos = origPos / scale
 * 
 * anchor = right/top/back:
 *   Фиксированный отступ от противоположного края
 *   newWorldPos = origPos + sizeDelta/2
 *   newLocalPos * scale = origPos + sizeDelta/2
 *   newLocalPos = origPos/scale + sizeDelta/2/scale
 * 
 * anchor = center:
 *   Пропорционально — не меняем локальную позицию
 *   newPos = origPos
 */
function calculatePositionByAnchor(
  origPos: number,
  anchor: string,
  scale: number,
  sizeDelta: number
): number {
  switch (anchor) {
    case 'left':
    case 'bottom':
    case 'front':
      // Фиксированный отступ от origin (учитываем сдвиг левого/нижнего/переднего края)
      return safeDiv(origPos, scale) - safeDiv(sizeDelta, 2 * scale);
      
    case 'right':
    case 'top':
    case 'back':
      // Фиксированный отступ от противоположного края
      return safeDiv(origPos, scale) + safeDiv(sizeDelta, 2 * scale);
      
    case 'center':
    default:
      // Пропорционально — не меняем локальную позицию
      return origPos;
  }
}

/**
 * Вычисляет effectiveScale для узла с учётом иерархии
 * 
 * Если родитель по какой-то оси имеет resize !== 'scale',
 * то он уже компенсировал масштаб, и для ребёнка effScale = 1 по этой оси
 */
function getEffectiveScale(
  child: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  rootScale: THREE.Vector3
): THREE.Vector3 {
  const effScale = new THREE.Vector3(1, 1, 1);
  let current: THREE.Object3D | null = child.parent;
  let blockedX = false;
  let blockedY = false;
  let blockedZ = false;
  
  while (current) {
    const parentData = nodesData.get(current.name);
    if (parentData) {
      if (parentData.rules.resize_x !== 'scale') blockedX = true;
      if (parentData.rules.resize_y !== 'scale') blockedY = true;
      if (parentData.rules.resize_z !== 'scale') blockedZ = true;
    }
    current = current.parent;
  }
  
  effScale.set(
    blockedX ? 1 : rootScale.x,
    blockedY ? 1 : rootScale.y,
    blockedZ ? 1 : rootScale.z
  );
  
  return effScale;
}

/**
 * Возвращает размер и масштаб ближайшего родителя для расчёта sizeDelta
 */
function getParentSizeAndScale(
  child: THREE.Object3D,
  nodesData: Map<string, NodeOriginalData>,
  modelData: ModelOriginalData,
  rootScale: THREE.Vector3
): { parentSize: THREE.Vector3; parentScale: THREE.Vector3 } {
  const parent = child.parent;
  if (parent) {
    const parentData = nodesData.get(parent.name);
    if (parentData) {
      const parentEffScale = getEffectiveScale(parent, nodesData, rootScale);
      return { parentSize: parentData.size.clone(), parentScale: parentEffScale };
    }
  }
  // Фолбэк к размерам модели
  return { parentSize: modelData.size.clone(), parentScale: rootScale.clone() };
}

/**
 * Получает мировую позицию родителя (для absolute)
 */
function getParentWorldPosition(child: THREE.Object3D): THREE.Vector3 {
  const v = new THREE.Vector3();
  if (child.parent) child.parent.getWorldPosition(v);
  return v;
}

/**
 * Получает мировой scale родителя (для absolute)
 */
function getParentWorldScale(child: THREE.Object3D): THREE.Vector3 {
  const v = new THREE.Vector3(1, 1, 1);
  if (child.parent) child.parent.getWorldScale(v);
  return v;
}

// ============================================================================
// СБРОС И УТИЛИТЫ
// ============================================================================

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
  
  model.updateMatrixWorld(true);
  console.log('🔄 CabinetResizer: Модель сброшена');
}

/**
 * Получает текущий размер модели в мм
 */
export function getModelSizeInMm(model: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  return new THREE.Vector3(
    size.x * 1000,
    size.y * 1000,
    size.z * 1000
  );
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/** Безопасное деление (защита от деления на 0 и NaN) */
function safeDiv(a: number, b: number): number {
  if (Math.abs(b) < EPSILON) {
    console.warn(`⚠️ CabinetResizer: деление на ~0 (${a}/${b})`);
    return a; // Fallback к оригинальному значению
  }
  const result = a / b;
  if (!isFinite(result) || isNaN(result)) {
    console.warn(`⚠️ CabinetResizer: результат не finite (${a}/${b}=${result})`);
    return a;
  }
  return result;
}

/** Валидация размера */
function validateSize(size: THREE.Vector3): boolean {
  return size.x > EPSILON && size.y > EPSILON && size.z > EPSILON &&
         isFinite(size.x) && isFinite(size.y) && isFinite(size.z) &&
         !isNaN(size.x) && !isNaN(size.y) && !isNaN(size.z);
}

/** Форматирование размера в мм */
function formatSizeMm(v: THREE.Vector3): string {
  return `${v.x.toFixed(0)}×${v.y.toFixed(0)}×${v.z.toFixed(0)}мм`;
}

/** Форматирование размера в метрах → мм */
function formatSize(v: THREE.Vector3): string {
  return `${(v.x * 1000).toFixed(0)}×${(v.y * 1000).toFixed(0)}×${(v.z * 1000).toFixed(0)}мм`;
}

/** Форматирование вектора */
function formatVec(v: THREE.Vector3): string {
  return `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
}

/** Определяет, нужно ли логировать узел (для отладки) */
function shouldLogNode(name: string): boolean {
  const keywords = ['LOCK', 'WALLS_LEFT', 'WALLS_RIGHT', 'DOOR', 'ROOF', 'BOTTOM'];
  return keywords.some(kw => name.includes(kw));
}

