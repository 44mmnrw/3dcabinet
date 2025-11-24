import * as THREE from 'three';
import { getAssetLoader } from '../loaders/AssetLoader.ts';
import { DINRailStrategy, RackUnitStrategy, MountingPlateStrategy } from '../strategies/MountingStrategies.ts';
import { initializeScene } from '../utils/SceneSetup.ts';
import { DragDropController } from '../core/DragDropController.ts';
import { ContextMenuManager } from '../core/ContextMenuManager.ts';
import type { AssetLoader } from '../loaders/AssetLoader.ts';
import type { EquipmentConfig } from '../types/equipment.types.js';
import type { CabinetDefinition } from '../types/cabinet.types.js';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Интерфейс для CabinetBase (будет типизирован позже)
 */
interface CabinetBase {
    assemble: () => Promise<THREE.Group>;
    getComponents: () => Record<string, THREE.Object3D>;
    mountingStrategy?: DINRailStrategy | RackUnitStrategy | MountingPlateStrategy;
    [key: string]: any;
}

/**
 * Данные шкафа в legacy менеджере
 */
interface LegacyCabinetData {
    type: string;
    instance: CabinetBase;
    assembly: THREE.Group;
    position: THREE.Vector3;
    definition?: CabinetDefinition;
    mountingType?: string;
    strategies?: Map<string, DINRailStrategy | RackUnitStrategy | MountingPlateStrategy>;
}

/**
 * Данные оборудования в legacy менеджере
 */
interface LegacyEquipmentData {
    mesh: THREE.Group;
    type: string;
    config: EquipmentConfig;
    railIndex: number;
    xOffset: number | null;
    unitIndex?: number;
    depth?: number;
    cabinetId: string;
}

/**
 * Каталог шкафов (legacy формат)
 */
interface LegacyCatalog {
    cabinets: CabinetDefinition[];
}

/**
 * Менеджер шкафов (legacy версия)
 */
class CabinetManager {
    private scene: THREE.Scene;
    private cabinets: Map<string, LegacyCabinetData>;
    public activeCabinetId: string | null;
    private catalog: LegacyCatalog | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.cabinets = new Map();
        this.activeCabinetId = null;
        this.catalog = null;
    }

    /**
     * Загрузить каталог шкафов из JSON
     */
    async loadCatalog(): Promise<LegacyCatalog> {
        if (this.catalog) return this.catalog;
        
        try {
            const response = await fetch('/assets/models/cabinets/catalog.json');
            if (!response.ok) {
                throw new Error('Каталог шкафов не найден');
            }
            this.catalog = await response.json() as LegacyCatalog;
            console.log(`📚 Загружен каталог: ${this.catalog.cabinets.length} шкафов`);
            return this.catalog;
        } catch (error) {
            console.error('❌ Ошибка загрузки каталога шкафов:', error);
            this.catalog = { cabinets: [] };
            return this.catalog;
        }
    }

    /**
     * Получить список доступных шкафов из каталога
     */
    async getAvailableCabinets(): Promise<Array<{ id: string; name: string; dimensions?: any; thumbnail?: string; description?: string }>> {
        await this.loadCatalog();
        return this.catalog!.cabinets.map(c => {
            const result: { id: string; name: string; dimensions?: any; thumbnail?: string; description?: string } = {
                id: c.id,
                name: c.name
            };
            if (c.dimensions) {
                result.dimensions = c.dimensions;
            }
            if (c.thumbnail !== undefined) {
                result.thumbnail = c.thumbnail;
            }
            if (c.description !== undefined) {
                result.description = c.description;
            }
            return result;
        });
    }

    /**
     * Добавить шкаф по ID из каталога (упрощённый API)
     */
    async addCabinetById(catalogId: string, instanceId: string | null = null): Promise<string> {
        await this.loadCatalog();
        
        const cabinetDef = this.catalog!.cabinets.find(c => c.id === catalogId);
        if (!cabinetDef) {
            throw new Error(`Шкаф "${catalogId}" не найден в каталоге. Доступные: ${this.catalog!.cabinets.map(c => c.id).join(', ')}`);
        }

        console.log(`🔄 Загрузка шкафа из каталога: ${cabinetDef.name}`);
        const newId = await this.addCabinet(
            cabinetDef.className,
            cabinetDef.modulePath,
            instanceId || `${catalogId}_${Date.now()}`
        );

        // Присваиваем стратегию монтажа в зависимости от типа
        const stored = this.cabinets.get(newId);
        if (stored) {
            stored.definition = cabinetDef;
            stored.mountingType = (cabinetDef as any).mountingType || 'din_rail';
            switch (stored.mountingType) {
                case 'din_rail':
                    stored.instance.mountingStrategy = new DINRailStrategy(
                        stored.instance
                    );
                    break;
                case 'rack_unit':
                    stored.instance.mountingStrategy = new RackUnitStrategy(
                        stored.instance,
                        cabinetDef as unknown as import('../cabinets/CabinetBase').CabinetBase
                    );
                    break;
                case 'mounting_plate':
                    stored.instance.mountingStrategy = new MountingPlateStrategy(stored.instance, cabinetDef as any);
                    break;
                default:
                    console.warn(`⚠️ Неизвестный mountingType: ${stored.mountingType}. Позиционирование будет по умолчанию.`);
            }
        }

        return newId;
    }

    /**
     * Динамическая загрузка класса шкафа (прямой метод)
     */
    async addCabinet(cabinetType: string, modulePath: string, cabinetId: string | null = null): Promise<string> {
        try {
            if (!cabinetId) {
                cabinetId = `${cabinetType}_${Date.now()}`;
            }

            console.log(`🔄 Загрузка шкафа: ${cabinetType} (${cabinetId})`);

            // Динамический импорт класса
            const module = await import(modulePath) as any;
            const CabinetClass = module[cabinetType];

            if (!CabinetClass) {
                throw new Error(`Класс ${cabinetType} не найден в модуле ${modulePath}`);
            }

            // Создание и сборка экземпляра
            const cabinetInstance = new CabinetClass() as CabinetBase;
            const assembly = await cabinetInstance.assemble();
            
            assembly.name = cabinetId;
            assembly.position.set(0, 0, 0); // Дефолтная позиция
            
            this.scene.add(assembly);
            this.cabinets.set(cabinetId, {
                type: cabinetType,
                instance: cabinetInstance,
                assembly: assembly,
                position: assembly.position.clone()
            });

            this.activeCabinetId = cabinetId;
            console.log(`✅ Шкаф ${cabinetType} загружен: ${cabinetId}`);
            
            return cabinetId;
        } catch (error: any) {
            console.error(`❌ Ошибка загрузки шкафа ${cabinetType}:`, error);
            throw error;
        }
    }

    removeCabinet(cabinetId: string): boolean {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }

        this.scene.remove(cabinet.assembly);
        cabinet.assembly.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose();
            }
            if ((child as THREE.Mesh).material) {
                const material = (child as THREE.Mesh).material;
                if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else {
                    material.dispose();
                }
            }
        });

        this.cabinets.delete(cabinetId);
        
        if (this.activeCabinetId === cabinetId) {
            this.activeCabinetId = this.cabinets.size > 0 
                ? Array.from(this.cabinets.keys())[0]!
                : null;
        }

        console.log(`🗑️ Шкаф удалён: ${cabinetId}`);
        return true;
    }

    setActiveCabinet(cabinetId: string): boolean {
        if (!this.cabinets.has(cabinetId)) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }
        this.activeCabinetId = cabinetId;
        console.log(`🎯 Активный шкаф: ${cabinetId}`);
        return true;
    }

    getActiveCabinet(): LegacyCabinetData | null {
        if (!this.activeCabinetId) return null;
        return this.cabinets.get(this.activeCabinetId) || null;
    }

    getCabinet(cabinetId: string): LegacyCabinetData | undefined {
        return this.cabinets.get(cabinetId);
    }

    getAllCabinets(): Array<{ id: string; type: string; position: THREE.Vector3 }> {
        return Array.from(this.cabinets.entries()).map(([id, data]) => ({
            id,
            type: data.type,
            position: data.position
        }));
    }
}

/**
 * Менеджер оборудования на сцене (legacy версия)
 */
class EquipmentManager {
    private assetLoader: AssetLoader;
    private cabinetManager: CabinetManager;
    private equipment: Map<string, LegacyEquipmentData>;
    private equipmentConfigs: Map<string, EquipmentConfig>;
    private nextId: number;

    constructor(assetLoader: AssetLoader, cabinetManager: CabinetManager) {
        this.assetLoader = assetLoader;
        this.cabinetManager = cabinetManager;
        this.equipment = new Map();
        this.equipmentConfigs = new Map();
        this.nextId = 1;
    }

    /**
     * Загрузка конфигурации оборудования из JSON
     */
    async loadEquipmentConfig(type: string): Promise<EquipmentConfig> {
        if (this.equipmentConfigs.has(type)) {
            return this.equipmentConfigs.get(type)!;
        }

        try {
            const configPath = `/assets/models/equipment/${type}/${type}.json`;
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Конфиг не найден: ${configPath}`);
            }
            const config = await response.json() as EquipmentConfig;
            this.equipmentConfigs.set(type, config);
            console.log(`📋 Загружен конфиг: ${type}`);
            return config;
        } catch (error) {
            console.warn(`⚠️ Конфиг ${type} не найден, используем дефолтные параметры`);
            return {
                id: type,
                name: type,
                model: {
                    path: `${type}.glb`
                },
                category: 'protection',
                specifications: {},
                dimensions: { width: 0.018, height: 0.1, depth: 0.08 },
                mounting: {
                    type: 'din_rail',
                    orientation: 'vertical',
                    anchorPoint: { offset: [0, 0, 0] }
                }
            };
        }
    }

    async addEquipment(type: string, railIndex: number = 0, xOffset: number | null = null, cabinetId: string | null = null): Promise<string | null> {
        try {
            // Если шкаф не указан, используем активный
            if (!cabinetId) {
                const activeCabinet = this.cabinetManager.getActiveCabinet();
                if (!activeCabinet) {
                    console.error('❌ Нет активного шкафа. Сначала добавьте шкаф!');
                    return null;
                }
                cabinetId = this.cabinetManager.activeCabinetId!;
            }

            const id = `${type}_${this.nextId++}`;
            console.log(`🔄 Добавление оборудования: ${id} в шкаф ${cabinetId}`);

            // Загружаем конфигурацию
            const config = await this.loadEquipmentConfig(type);

            // Загружаем GLTF/GLB модель
            const modelPath = `/assets/models/equipment/${type}/${config.model.path}`;
            const glbGroup = await this.assetLoader.load(modelPath, {
                useCache: true,
                clone: true
            }) as THREE.Group;

            alignGroupToFloor(glbGroup);
            glbGroup.name = id;

            // Получаем шкаф, куда будем добавлять оборудование
            const cabinet = this.cabinetManager.getCabinet(cabinetId!);
            if (!cabinet) {
                throw new Error(`Шкаф ${cabinetId} не найден`);
            }

            this.equipment.set(id, {
                mesh: glbGroup,
                type: type,
                config: config,
                railIndex: railIndex,
                xOffset: xOffset,
                cabinetId: cabinetId!
            });

            // Добавляем оборудование внутрь шкафа (важно для координат!)
            cabinet.assembly.add(glbGroup);
            
            try {
                this.positionEquipment(id);
            } catch (positionError: any) {
                // Не удалось разместить — удаляем оборудование
                cabinet.assembly.remove(glbGroup);
                this.equipment.delete(id);
                console.error(`❌ ${positionError.message}`);
                alert(`⚠️ ${positionError.message}`);
                return null;
            }
            
            this.updateUI();

            console.log(`✅ ${config.name || type}: ${id} → шкаф ${cabinetId}, рейка ${railIndex}`);
            return id;
        } catch (error: any) {
            console.error('❌ Ошибка добавления оборудования:', error);
            return null;
        }
    }

    removeEquipment(id: string): boolean {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`Оборудование ${id} не найдено`);
            return false;
        }

        // Освобождаем занятое место в стратегии монтажа
        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (cabinet && cabinet.instance && cabinet.instance.mountingStrategy) {
            const strategy = cabinet.instance.mountingStrategy;
            if (typeof (strategy as any).unmount === 'function' && item.railIndex !== undefined) {
                (strategy as any).unmount(id, item.railIndex);
            }
        }

        // Удаляем из parent (шкафа)
        if (item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
        }

        item.mesh.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose();
            }
            if ((child as THREE.Mesh).material) {
                const material = (child as THREE.Mesh).material;
                if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else {
                    material.dispose();
                }
            }
        });

        this.equipment.delete(id);
        this.updateUI();
        console.log(`🗑️ Удалено: ${id}`);
        return true;
    }

    removeLastEquipment(): boolean {
        const ids = Array.from(this.equipment.keys());
        if (ids.length === 0) {
            console.warn('Нет оборудования для удаления');
            return false;
        }
        const lastId = ids[ids.length - 1]!; // Safe: мы проверили, что массив не пустой
        return this.removeEquipment(lastId);
    }

    removeAllEquipment(): void {
        const ids = Array.from(this.equipment.keys());
        ids.forEach(id => this.removeEquipment(id));
        console.log('🗑️ Всё оборудование удалено');
    }

    positionEquipment(id: string): void {
        const item = this.equipment.get(id);
        if (!item) return;

        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${item.cabinetId} не найден для оборудования ${id}`);
            return;
        }
        
        const equipmentGroup = item.mesh;

        // Универсальная стратегия монтажа
        const mountType = item.config.mounting.type;
        if (!cabinet.strategies) {
            console.warn('⚠️ Шкаф не имеет стратегий монтажа');
            return;
        }
        const strategy = cabinet.strategies.get(mountType);
        if (strategy && typeof strategy.mount === 'function') {
            try {
                // Создаем position объект в зависимости от типа монтажа
                let position: { railIndex?: number; xOffset?: number | null; unitIndex?: number; depth?: number; x?: number; y?: number } | undefined;
                if (mountType === 'din_rail') {
                    position = {
                        railIndex: item.railIndex,
                        xOffset: item.xOffset ?? null
                    };
                } else if (mountType === 'rack_unit') {
                    const rackPosition: { unitIndex?: number; depth?: number } = {};
                    if (item.unitIndex !== undefined) {
                        rackPosition.unitIndex = item.unitIndex;
                    }
                    if (item.depth !== undefined) {
                        rackPosition.depth = item.depth;
                    }
                    position = rackPosition;
                } else if (mountType === 'mounting_plate') {
                    position = {
                        x: item.xOffset ?? 0,
                        y: 0
                    };
                }
                strategy.mount(equipmentGroup, item.config, position);
                return;
            } catch (e: any) {
                console.error('❌ Ошибка стратегии монтажа:', e);
                throw e;
            }
        }

        console.warn('⚠️ Шкаф не имеет стратегии монтажа');
    }

    updateUI(): void {
        const countEl = document.getElementById('equipment-count');
        if (countEl) countEl.textContent = String(this.equipment.size);
    }

    getEquipment(id: string): LegacyEquipmentData | undefined {
        return this.equipment.get(id);
    }

    getAllEquipment(): LegacyEquipmentData[] {
        return Array.from(this.equipment.values());
    }

    getEquipmentByCabinet(cabinetId: string): LegacyEquipmentData[] {
        return Array.from(this.equipment.values()).filter(item => item.cabinetId === cabinetId);
    }
}

// Получаем контейнер для сцены
const sceneContainer = document.getElementById('scene-container');

// Инициализация сцены через универсальный модуль
const { scene, camera, renderer, controls } = initializeScene({
    container: sceneContainer,
    backgroundColor: 0xf5f5f5,
    showGrid: true,
    showAxes: true,
    ambientIntensity: 0.6,
    directionalIntensity: 0.8
});

let cabinetManager: CabinetManager;
let equipmentManager: EquipmentManager;
let dragDropController: DragDropController;
let contextMenuManager: ContextMenuManager;

async function loadInitialScene(): Promise<void> {
    try {
        const assetLoader = getAssetLoader();
        
        // Инициализируем менеджеры
        cabinetManager = new CabinetManager(scene);
        equipmentManager = new EquipmentManager(assetLoader, cabinetManager);

        // Глобальный доступ для отладки и расширения
        (window as any).cabinetManager = cabinetManager;
        (window as any).equipmentManager = equipmentManager;

        // Инициализация Drag & Drop контроллера
        dragDropController = new DragDropController({
            camera,
            renderer,
            cabinetManager: cabinetManager as any,
            equipmentManager: equipmentManager as any
        });

        // Инициализация контекстного меню (ПКМ для удаления оборудования)
        contextMenuManager = new ContextMenuManager({
            camera,
            renderer,
            equipmentManager: equipmentManager as any
        });

        // Экспорт в window для отладки
        (window as any).dragDropController = dragDropController;
        (window as any).contextMenuManager = contextMenuManager;

        // Автоматически загружаем первый доступный шкаф из каталога
        const available = await cabinetManager.getAvailableCabinets();
        const firstCabinet = available[0];
        if (firstCabinet) {
            console.log(`📋 Доступно шкафов в каталоге: ${available.length}`);
            await cabinetManager.addCabinetById(firstCabinet.id, 'cabinet_main');
        } else {
            console.warn('⚠️ Каталог шкафов пуст. Используйте cabinetManager.addCabinet() для ручной загрузки.');
        }

        console.log('✅ Сцена инициализирована');

        // Helper-функции
        (window as any).addBreakers = async (count: number = 5, railIndex: number = 0): Promise<void> => {
            console.log(`🔧 Добавляем ${count} автоматов на DIN-рейку #${railIndex}...`);
            let added = 0;
            for (let i = 0; i < count; i++) {
                const result = await equipmentManager.addEquipment('circuit_breaker', railIndex);
                if (!result) {
                    // Не удалось добавить (рейка переполнена)
                    console.log(`⚠️ Остановлено: добавлено ${added} из ${count} автоматов`);
                    break;
                }
                added++;
            }
            if (added === count) {
                console.log(`✅ Добавлено ${count} автоматов`);
            }
        };

        (window as any).showRailOccupancy = (railIndex: number = 0): void => {
            const cabinet = cabinetManager.getActiveCabinet();
            if (!cabinet?.instance?.mountingStrategy) {
                console.warn('⚠️ Нет активного шкафа со стратегией монтажа');
                return;
            }
            const strategy = cabinet.instance.mountingStrategy as DINRailStrategy;
            const occupancy = strategy.getRailOccupancy(railIndex);
            if (!occupancy) {
                console.warn(`⚠️ DIN-рейка #${railIndex} не найдена`);
                return;
            }
            console.log(`📊 DIN-рейка #${railIndex}:`);
            console.log(`   Длина: ${(occupancy.railWidth * 1000).toFixed(1)}мм`);
            console.log(`   Занято: ${(occupancy.occupiedWidth * 1000).toFixed(1)}мм (${occupancy.fillPercent}%)`);
            console.log(`   Свободно: ${(occupancy.freeWidth * 1000).toFixed(1)}мм`);
            console.log(`   Установлено: ${occupancy.items} шт.`);
        };

        // Инициализация DOM-привязок для drag & drop и контекстного меню
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', initializeDOMBindings);
        } else {
            // DOM уже загружен
            initializeDOMBindings();
        }

    } catch (error: any) {
        console.error('❌ Ошибка загрузки сцены:', error);
    }
}

// Функция для инициализации DOM-привязок
function initializeDOMBindings(): void {
    if (dragDropController) {
        dragDropController.initialize('.equipment-card');
    }
    
    if (contextMenuManager) {
        contextMenuManager.initialize();
    }
    
    console.log('✅ Drag & Drop и контекстное меню инициализированы');
    console.log('💡 Перетащите карточку оборудования из панели на DIN-рейку');
    console.log('💡 ПКМ на оборудовании → контекстное меню');
}

// Анимация
function animate(): void {
    requestAnimationFrame(animate);
    (controls as OrbitControls).update();
    renderer.render(scene, camera);
}

// Запуск
loadInitialScene();
animate();

// Отладка: печать иерархии сцены ASCII-деревом
function dumpObjectTree(object: THREE.Object3D, depth: number = 0, maxDepth: number = 6): string {
    if (depth > maxDepth) return '';
    const indent = '  '.repeat(depth);
    const name = object.name || object.type;
    const line = `${indent}- ${name} [${object.type}]`;
    let out = line + '\n';
    if (object.children && object.children.length) {
        for (const child of object.children) {
            out += dumpObjectTree(child, depth + 1, maxDepth);
        }
    }
    return out;
}

function dumpSceneHierarchy(maxDepth: number = 6): string {
    let report = 'Scene graph:\n';
    report += dumpObjectTree(scene, 0, maxDepth);
    console.log(report);
    return report;
}

// Экспортируем в global для удобства
(window as any).dumpSceneHierarchy = dumpSceneHierarchy;

// Вспомогательная функция: выровнять группу так, чтобы её нижняя точка была на Y=0
function alignGroupToFloor(group: THREE.Group): void {
    const bbox = new THREE.Box3().setFromObject(group);
    const offsetY = -bbox.min.y;
    group.position.y += offsetY;
    console.log('📐 GLB aligned to floor, offset Y:', offsetY.toFixed(3));
}

// ========== DRAG & DROP и КОНТЕКСТНОЕ МЕНЮ ==========
// Инициализация происходит внутри loadInitialScene() после создания менеджеров

// ========================================================

console.log('🎮 Используйте controls для управления сценой');
console.log('📊 Доступные команды:');
console.log('  🏗️ ШКАФЫ:');
console.log('    • cabinetManager.getAvailableCabinets() - список доступных шкафов из каталога');
console.log('    • cabinetManager.addCabinetById("catalogId", "instanceId") - добавить шкаф по ID из каталога');
console.log('    • cabinetManager.addCabinet("ClassName", "./path/to/Class.js", "id") - добавить шкаф напрямую');
console.log('    • cabinetManager.removeCabinet("id") - удалить шкаф');
console.log('    • cabinetManager.setActiveCabinet("id") - переключить активный');
console.log('    • cabinetManager.getAllCabinets() - список загруженных шкафов');
console.log('  ⚡ ОБОРУДОВАНИЕ:');
console.log('    • equipmentManager.addEquipment("type", railIndex, xOffset, cabinetId) - добавить (xOffset=null = auto)');
console.log('    • equipmentManager.removeLastEquipment() - удалить последнее');
console.log('    • equipmentManager.getEquipmentByCabinet("id") - оборудование конкретного шкафа');
console.log('    • addBreakers(count, railIndex=0) - добавить N автоматов на рейку (helper)');
console.log('  🖱️ DRAG & DROP:');
console.log('    • dragDropController.initialize(".equipment-card") - привязать к карточкам');
console.log('    • contextMenuManager.initialize() - включить ПКМ меню');
console.log('  🧭 ОТЛАДКА:');
console.log('    • dumpSceneHierarchy(6) - напечатать иерархию сцены (ASCII)');
console.log('    • showRailOccupancy(railIndex) - показать заполненность DIN-рейки');

