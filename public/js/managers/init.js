import * as THREE from '../libs/three.module.js';
import { getAssetLoader } from '../loaders/AssetLoader.js';
import { initializeScene } from '../utils/SceneSetup.js';
import { CabinetManager } from './CabinetManager.js';
import { EquipmentManager } from './EquipmentManager.js';
import { DragDropController } from '../core/DragDropController.js';
import { ContextMenuManager } from '../core/ContextMenuManager.js';
import { GeometryUtils } from '../utils/ModelUtils.js';
import { eventBus, ConfiguratorEvents } from '../events/EventBus.js';
import { initCabinetControls } from '../ui/cabinetControls.js';

/**
 * Инициализация Three.js сцены и менеджеров
 * 
 * @param {string} containerId - ID DOM-элемента для канваса
 * @returns {Object} Объект с менеджерами и Three.js элементами
 */
export async function initializeManagers(containerId = 'scene-container') {
    const container = document.getElementById(containerId);
    
    if (!container) {
        return null;
    }

    // Инициализация Three.js сцены
    const { scene, camera, renderer, controls } = initializeScene({
        container: container,
        backgroundColor: 0xf5f5f5,
        showGrid: true,
        showAxes: true,
        ambientIntensity: 0.6,
        directionalIntensity: 0.8,
        polarAngle: Math.PI / 2.5  // Угол камеры (вертикальный лок, ~68° от горизонта)
    });

    const assetLoader = getAssetLoader();

    // Инициализация менеджеров
    const cabinetManager = new CabinetManager(scene);
    const equipmentManager = new EquipmentManager(scene, assetLoader, cabinetManager);

    // Инициализация Drag & Drop контроллера
    const dragDropController = new DragDropController({
        scene,
        camera,
        renderer,
        cabinetManager,
        equipmentManager,
        eventBus  // Передаём EventBus для слушания cabinet:added
    });

    // Инициализация контекстного меню (ПКМ для удаления)
    const contextMenuManager = new ContextMenuManager({
        scene,
        camera,
        renderer,
        equipmentManager
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
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Привязка Drag & Drop к карточкам (СРАЗУ при загрузке)
    const cards = document.querySelectorAll('[data-equipment-type]');
    if (cards.length > 0) {
        dragDropController.initialize('[data-equipment-type]');
        contextMenuManager.initialize();
        console.log(`✅ Drag & Drop привязан к ${cards.length} карточкам`);
    }

    // Глобальный доступ для отладки
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.cabinetManager = cabinetManager;
    window.equipmentManager = equipmentManager;
    window.dragDropController = dragDropController;
    window.contextMenuManager = contextMenuManager;
    window.GeometryUtils = GeometryUtils;  // Доступ к утилитам геометрии из консоли
    window.initCabinetControls = initCabinetControls;  // Для инициализации UI

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
        contextMenu: contextMenuManager
    };
}

/**
 * Helper-функции для отладки
 */

/**
 * Добавить N автоматических выключателей на указанную рейку
 */
export async function addBreakers(equipmentManager, count = 5, railIndex = 0) {
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
export function showRailOccupancy(cabinetManager, railIndex = 0) {
    const cabinet = cabinetManager.getActiveCabinet();
    if (!cabinet?.instance?.mountingStrategy) {
        console.warn('⚠️ Нет активного шкафа со стратегией монтажа');
        return;
    }
    const occupancy = cabinet.instance.mountingStrategy.getRailOccupancy(railIndex);
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
export function dumpSceneHierarchy(scene, maxDepth = 6) {
    function dumpObjectTree(object, depth = 0) {
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
