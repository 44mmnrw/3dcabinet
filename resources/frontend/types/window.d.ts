/**
 * Расширение интерфейса Window для глобальных переменных отладки
 */

import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CabinetManager } from '../three/managers/CabinetManager';
import type { EquipmentManager } from '../three/managers/EquipmentManager';
import type { DragDropController } from '../three/core/DragDropController';
import type { EquipmentMoveController } from '../three/core/EquipmentMoveController';
import type { ContextMenuManager } from '../three/core/ContextMenuManager';
import type { ManagersInitResult } from '../three/types/managers.types';
import type { GeometryUtils } from '../three/utils/ModelUtils';

declare global {
    interface Window {
        // Three.js основные объекты
        THREE?: typeof THREE;
        scene?: THREE.Scene;
        camera?: THREE.PerspectiveCamera;
        renderer?: THREE.WebGLRenderer;
        controls?: OrbitControls;
        
        // Менеджеры
        cabinetManager?: CabinetManager;
        equipmentManager?: EquipmentManager;
        dragDropController?: DragDropController;
        equipmentMoveController?: EquipmentMoveController;
        contextMenuManager?: ContextMenuManager;
        
        // Утилиты
        GeometryUtils?: typeof GeometryUtils;
        initCabinetControls?: typeof import('../three/ui/cabinetControls').initCabinetControls;
        
        // Helper функции для отладки
        addBreakers?: typeof import('../three/managers/init').addBreakers;
        showRailOccupancy?: typeof import('../three/managers/init').showRailOccupancy;
        dumpSceneHierarchy?: typeof import('../three/managers/init').dumpSceneHierarchy;
        
        // React компоненты
        managers?: ManagersInitResult;
    }
}

export {};

