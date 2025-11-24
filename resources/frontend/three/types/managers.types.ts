/**
 * Типы для менеджеров
 */

import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CatalogService } from '../services/CatalogService.ts';
import type { CabinetFactory } from '../utils/CabinetFactory.ts';
import type { IEventBus } from '../events/EventBus.ts';
import type { LogicEngine } from '../logic/LogicEngine.ts';
import type { AssetLoader } from '../loaders/AssetLoader.ts';
import type { CabinetManager } from '../managers/CabinetManager.ts';
import type { EquipmentManager } from '../managers/EquipmentManager.ts';
import type { DragDropController } from '../core/DragDropController.ts';
import type { EquipmentMoveController } from '../core/EquipmentMoveController.ts';
import type { ContextMenuManager } from '../core/ContextMenuManager.ts';

/**
 * Опции для инициализации CabinetManager
 */
export interface CabinetManagerOptions {
    catalogService?: CatalogService;
    cabinetFactory?: typeof CabinetFactory;
    eventBus?: IEventBus;
    logicEngine?: LogicEngine;
}

/**
 * Опции для инициализации EquipmentManager
 */
export interface EquipmentManagerOptions {
    assetLoader?: AssetLoader;
    cabinetManager?: CabinetManager;
    onUpdate?: (count: number) => void;  // Callback для обновления UI
}

/**
 * Опции для инициализации сцены
 */
export interface SceneInitOptions {
    container?: HTMLElement | null;
    backgroundColor?: number;
    showGrid?: boolean;
    showAxes?: boolean;
    ambientIntensity?: number;
    directionalIntensity?: number;
    polarAngle?: number;
}

/**
 * Результат инициализации сцены
 */
export interface SceneInitResult {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
}

/**
 * Результат инициализации менеджеров
 */
export interface ManagersInitResult {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    cabinet: CabinetManager;
    equipment: EquipmentManager;
    dragDrop: DragDropController;
    equipmentMove: EquipmentMoveController;
    contextMenu: ContextMenuManager;
    initializeDragDrop: () => void;
    cleanup: () => void;
}

