import * as THREE from 'three';
import { getAssetLoader } from '../loaders/AssetLoader.ts';
import { initializeScene } from '../utils/SceneSetup.ts';
import { CabinetManager } from './CabinetManager';
import { CAMERA } from '../constants/PhysicalConstants.ts';
import { EquipmentManager } from './EquipmentManager';
import { DragDropController } from '../core/DragDropController.ts';
import { EquipmentMoveController } from '../core/EquipmentMoveController.ts';
import { ContextMenuManager } from '../core/ContextMenuManager.ts';
import { GeometryUtils } from '../utils/ModelUtils.ts';
import { eventBus } from '../events/EventBus.ts';
import { initCabinetControls } from '../ui/cabinetControls.ts';
import type { ManagersInitResult, SceneInitOptions } from '../types/managers.types.js';

/**
 * Инициализация Three.js сцены и менеджеров
 * 
 * @param containerId - ID DOM-элемента для канваса
 * @returns Объект с менеджерами и Three.js элементами или null если контейнер не найден
 */
export async function initializeManagers(containerId: string = 'scene-container'): Promise<ManagersInitResult | null> {
    const container = document.getElementById(containerId);
    
    if (!container) {
        return null;
    }

    // Инициализация Three.js сцены
    const sceneOptions: SceneInitOptions = {
        container: container,
        backgroundColor: 0xf5f5f5,
        showGrid: true,
        showAxes: true,
        ambientIntensity: 0.6,
        directionalIntensity: 0.8,
        polarAngle: CAMERA.DEFAULT_POLAR_ANGLE
    };

    const sceneInit = initializeScene(sceneOptions);
    const { scene, camera, renderer, controls } = sceneInit;

    const assetLoader = getAssetLoader();

    // Инициализация менеджеров
    const cabinetManager = new CabinetManager(scene);
    const equipmentManager = new EquipmentManager(scene, assetLoader, cabinetManager);

    // Инициализация Drag & Drop контроллера
    const dragDropController = new DragDropController({
        camera,
        renderer,
        cabinetManager,
        equipmentManager
    });

    // Инициализация контроллера перемещения оборудования
    const equipmentMoveController = new EquipmentMoveController({
        scene,
        camera,
        renderer,
        cabinetManager,
        equipmentManager,
        eventBus,
        controls // Передаём OrbitControls для отключения во время перемещения
    } as any);

    // Инициализация контекстного меню (ПКМ для удаления)
    const contextMenuManager = new ContextMenuManager({
        camera,
        renderer,
        equipmentManager
    });

    // Привязка обработчика mousedown для перемещения оборудования
    renderer.domElement.addEventListener('mousedown', (event: MouseEvent) => {
        equipmentMoveController.onMouseDown(event);
    });

    // Автоматическая загрузка первого шкафа из каталога
    // TODO: раскомментировать после запуска Laravel API
    /*
    try {
        const available = await cabinetManager.getAvailableCabinets();
        if (available.length > 0) {
            await cabinetManager.addCabinetById(available[0].id, 'cabinet_main');
        }
    } catch (error) {
        // Ошибка загрузки каталога
    }
    */

    // Запуск анимационного цикла
    let animationId: number;
    function animate(): void {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Функция для остановки animation loop и очистки ресурсов
    function cleanup(): void {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Очистка контроллеров
        dragDropController.cleanup?.();
        equipmentMoveController.cleanup?.();
        contextMenuManager.cleanup?.();
        
        // Очистка Three.js ресурсов
        renderer.dispose();
        renderer.forceContextLoss();
        
        console.log('🧹 Three.js ресурсы очищены');
    }

    // Инициализация DND перенесена в React App - вызывается из useEffect
    // это необходимо потому что React компоненты ещё не смонтированы
    // (см. App.jsx useEffect с managersRef.current.initializeDragDrop())

    // Глобальный доступ для отладки
    if (typeof window !== 'undefined') {
        window.THREE = THREE;  // Экспорт THREE для консоли
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        window.controls = controls;
        window.cabinetManager = cabinetManager;
        window.equipmentManager = equipmentManager;
        window.dragDropController = dragDropController;
        window.equipmentMoveController = equipmentMoveController;
        window.contextMenuManager = contextMenuManager;
        window.GeometryUtils = GeometryUtils;  // Доступ к утилитам геометрии из консоли
        window.initCabinetControls = initCabinetControls;  // Для инициализации UI
    }

    console.log('✅ Three.js сцена инициализирована');
    console.log('💡 Доступны: window.equipmentManager, window.cabinetManager, window.dragDropController');

    return {
        scene,
        camera,
        renderer,
        controls,
        cabinet: cabinetManager,
        equipment: equipmentManager,
        dragDrop: dragDropController,
        equipmentMove: equipmentMoveController,
        contextMenu: contextMenuManager,
        // Функция для инициализации DND ПОСЛЕ монтирования React
        initializeDragDrop: () => {
            dragDropController.initialize('.equipment-card');
            contextMenuManager.initialize();
        },
        // Функция для очистки всех ресурсов при размонтировании
        cleanup
    };
}

/**
 * Helper-функции для отладки
 */

/**
 * Добавить N автоматических выключателей на указанную рейку
 */
export async function addBreakers(
    equipmentManager: EquipmentManager, 
    count: number = 5, 
    railIndex: number = 0
): Promise<void> {
    console.log(`🔧 Добавляем ${count} автоматов на DIN-рейку #${railIndex}...`);
    let added = 0;
    for (let i = 0; i < count; i++) {
        const result = await equipmentManager.addEquipment('circuit_breaker', railIndex);
        if (!result) {
            console.log(`⚠️ Остановлено: добавлено ${added} из ${count} автоматов`);
            break;
        }
        added++;
    }
    if (added === count) {
        console.log(`✅ Добавлено ${count} автоматов`);
    }
}

/**
 * Показать заполненность DIN-рейки
 */
export function showRailOccupancy(cabinetManager: CabinetManager, railIndex: number = 0): void {
    const cabinet = cabinetManager.getActiveCabinet();
    if (!cabinet?.strategies || cabinet.strategies.size === 0) {
        console.warn('⚠️ Нет активного шкафа со стратегией монтажа');
        return;
    }
    // Получаем DIN-rail стратегию
    const dinRailStrategy = cabinet.strategies.get('din_rail');
    if (!dinRailStrategy || typeof (dinRailStrategy as { getRailOccupancy?: (railIndex: number) => unknown }).getRailOccupancy !== 'function') {
        console.warn('⚠️ Стратегия DIN-rail не найдена или не поддерживает getRailOccupancy');
        return;
    }
    const getRailOccupancy = (dinRailStrategy as { getRailOccupancy?: (railIndex: number) => { railWidth: number; occupiedWidth: number; freeWidth: number; fillPercent: string; items: number } | null }).getRailOccupancy;
    if (!getRailOccupancy || typeof getRailOccupancy !== 'function') {
        console.warn('⚠️ Стратегия не поддерживает getRailOccupancy');
        return;
    }
    const occupancy = getRailOccupancy(railIndex);
    if (!occupancy) {
        console.warn(`⚠️ DIN-рейка #${railIndex} не найдена`);
        return;
    }
    console.log(`📊 DIN-рейка #${railIndex}:`);
    console.log(`   Длина: ${(occupancy.railWidth * 1000).toFixed(1)}мм`);
    console.log(`   Занято: ${(occupancy.occupiedWidth * 1000).toFixed(1)}мм (${occupancy.fillPercent}%)`);
    console.log(`   Свободно: ${(occupancy.freeWidth * 1000).toFixed(1)}мм`);
    console.log(`   Установлено: ${occupancy.items} шт.`);
}

/**
 * Печать иерархии сцены ASCII-деревом
 */
export function dumpSceneHierarchy(scene: THREE.Scene, maxDepth: number = 6): string {
    function dumpObjectTree(object: THREE.Object3D, depth: number = 0): string {
        if (depth > maxDepth) return '';
        const indent = '  '.repeat(depth);
        const name = object.name || object.type;
        const line = `${indent}- ${name} [${object.type}]`;
        let out = line + '\n';
        if (object.children && object.children.length) {
            for (const child of object.children) {
                out += dumpObjectTree(child, depth + 1);
            }
        }
        return out;
    }
    
    let report = 'Scene graph:\n';
    report += dumpObjectTree(scene, 0);
    console.log(report);
    return report;
}

// Экспорт helper-функций в window для удобства отладки
if (typeof window !== 'undefined') {
    window.addBreakers = addBreakers;
    window.showRailOccupancy = showRailOccupancy;
    window.dumpSceneHierarchy = dumpSceneHierarchy;
}

