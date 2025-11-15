import * as THREE from '../libs/three.module.js';
import { getAssetLoader } from '../loaders/AssetLoader.js';
import { DINRailStrategy, RackUnitStrategy, MountingPlateStrategy } from '../strategies/MountingStrategies.js';
import { initializeScene } from '../utils/SceneSetup.js';

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

// Менеджер шкафов
class CabinetManager {
    constructor(scene) {
        this.scene = scene;
        this.cabinets = new Map(); // cabinetId -> { instance, assembly, position }
        this.activeCabinetId = null;
        this.catalog = null; // Каталог доступных шкафов
    }

    /**
     * Загрузить каталог шкафов из JSON
     * @returns {Promise<Object>} Объект каталога
     */
    async loadCatalog() {
        if (this.catalog) return this.catalog;
        
        try {
            const response = await fetch('/assets/models/cabinets/catalog.json');
            if (!response.ok) {
                throw new Error('Каталог шкафов не найден');
            }
            this.catalog = await response.json();
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
     * @returns {Promise<Array>} Список шкафов с базовой информацией
     */
    async getAvailableCabinets() {
        await this.loadCatalog();
        return this.catalog.cabinets.map(c => ({
            id: c.id,
            name: c.name,
            dimensions: c.dimensions,
            thumbnail: c.thumbnail,
            description: c.description
        }));
    }

    /**
     * Добавить шкаф по ID из каталога (упрощённый API)
     * @param {string} catalogId - ID шкафа из каталога (например, 'TS_700_500_250')
     * @param {string} instanceId - Уникальный ID экземпляра (опционально)
     * @returns {Promise<string>} ID добавленного шкафа
     */
    async addCabinetById(catalogId, instanceId = null) {
        await this.loadCatalog();
        
        const cabinetDef = this.catalog.cabinets.find(c => c.id === catalogId);
        if (!cabinetDef) {
            throw new Error(`Шкаф "${catalogId}" не найден в каталоге. Доступные: ${this.catalog.cabinets.map(c => c.id).join(', ')}`);
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
            stored.mountingType = cabinetDef.mountingType || 'din_rail';
            switch (stored.mountingType) {
                case 'din_rail':
                    stored.instance.mountingStrategy = new DINRailStrategy(stored.instance, cabinetDef);
                    break;
                case 'rack_unit':
                    stored.instance.mountingStrategy = new RackUnitStrategy(stored.instance, cabinetDef);
                    break;
                case 'mounting_plate':
                    stored.instance.mountingStrategy = new MountingPlateStrategy(stored.instance, cabinetDef);
                    break;
                default:
                    console.warn(`⚠️ Неизвестный mountingType: ${stored.mountingType}. Позиционирование будет по умолчанию.`);
            }
        }

        return newId;
    }

    /**
     * Динамическая загрузка класса шкафа (прямой метод)
     * @param {string} cabinetType - Имя класса шкафа (например, 'test_TS_700_500_250')
     * @param {string} modulePath - Путь к модулю (например, './models/TS_700_500_250/test_TS_700_500_250.js')
     * @param {string} cabinetId - Уникальный ID экземпляра
     * @returns {Promise<string>} ID добавленного шкафа
     */
    async addCabinet(cabinetType, modulePath, cabinetId = null) {
        try {
            if (!cabinetId) {
                cabinetId = `${cabinetType}_${Date.now()}`;
            }

            console.log(`🔄 Загрузка шкафа: ${cabinetType} (${cabinetId})`);

            // Динамический импорт класса
            const module = await import(modulePath);
            const CabinetClass = module[cabinetType];

            if (!CabinetClass) {
                throw new Error(`Класс ${cabinetType} не найден в модуле ${modulePath}`);
            }

            // Создание и сборка экземпляра
            const cabinetInstance = new CabinetClass();
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
        } catch (error) {
            console.error(`❌ Ошибка загрузки шкафа ${cabinetType}:`, error);
            throw error;
        }
    }

    removeCabinet(cabinetId) {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }

        this.scene.remove(cabinet.assembly);
        cabinet.assembly.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.cabinets.delete(cabinetId);
        
        if (this.activeCabinetId === cabinetId) {
            this.activeCabinetId = this.cabinets.size > 0 
                ? Array.from(this.cabinets.keys())[0] 
                : null;
        }

        console.log(`🗑️ Шкаф удалён: ${cabinetId}`);
        return true;
    }

    setActiveCabinet(cabinetId) {
        if (!this.cabinets.has(cabinetId)) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }
        this.activeCabinetId = cabinetId;
        console.log(`🎯 Активный шкаф: ${cabinetId}`);
        return true;
    }

    getActiveCabinet() {
        if (!this.activeCabinetId) return null;
        return this.cabinets.get(this.activeCabinetId);
    }

    getCabinet(cabinetId) {
        return this.cabinets.get(cabinetId);
    }

    getAllCabinets() {
        return Array.from(this.cabinets.entries()).map(([id, data]) => ({
            id,
            type: data.type,
            position: data.position
        }));
    }
}

// Менеджер оборудования на сцене
class EquipmentManager {
    constructor(scene, assetLoader, cabinetManager) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.cabinetManager = cabinetManager;
        this.equipment = new Map(); // id -> {mesh, config, railIndex, moduleIndex, cabinetId}
        this.equipmentConfigs = new Map(); // type -> config из JSON
        this.nextId = 1;
    }

    // Загрузка конфигурации оборудования из JSON
    async loadEquipmentConfig(type) {
        if (this.equipmentConfigs.has(type)) {
            return this.equipmentConfigs.get(type);
        }

        try {
            const configPath = `/assets/models/equipment/${type}/${type}.json`;
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Конфиг не найден: ${configPath}`);
            }
            const config = await response.json();
            this.equipmentConfigs.set(type, config);
            console.log(`📋 Загружен конфиг: ${type}`);
            return config;
        } catch (error) {
            console.warn(`⚠️ Конфиг ${type} не найден, используем дефолтные параметры`);
            return {
                id: type,
                name: type,
                model: `${type}.glb`,
                mounting: {
                    type: 'din_rail',
                    anchorPoint: { offset: [0, 0, 0] }
                }
            };
        }
    }

    async addEquipment(type, railIndex = 0, xOffset = null, cabinetId = null) {
        try {
            // Если шкаф не указан, используем активный
            if (!cabinetId) {
                const activeCabinet = this.cabinetManager.getActiveCabinet();
                if (!activeCabinet) {
                    console.error('❌ Нет активного шкафа. Сначала добавьте шкаф!');
                    return null;
                }
                cabinetId = this.cabinetManager.activeCabinetId;
            }

            const id = `${type}_${this.nextId++}`;
            console.log(`🔄 Добавление оборудования: ${id} в шкаф ${cabinetId}`);

            // Загружаем конфигурацию
            const config = await this.loadEquipmentConfig(type);

            // Загружаем GLTF/GLB модель
            const modelPath = `/assets/models/equipment/${type}/${config.model}`;
            const glbGroup = await this.assetLoader.load(modelPath, {
                useCache: true,
                clone: true
            });

            alignGroupToFloor(glbGroup);
            glbGroup.name = id;

            // Получаем шкаф, куда будем добавлять оборудование
            const cabinet = this.cabinetManager.getCabinet(cabinetId);
            if (!cabinet) {
                throw new Error(`Шкаф ${cabinetId} не найден`);
            }

            this.equipment.set(id, {
                mesh: glbGroup,
                type: type,
                config: config,
                railIndex: railIndex,
                xOffset: xOffset,  // null = автоматически найдёт свободное место
                cabinetId: cabinetId
            });

            // Добавляем оборудование внутрь шкафа (важно для координат!)
            cabinet.assembly.add(glbGroup);
            
            try {
                this.positionEquipment(id);
            } catch (positionError) {
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
        } catch (error) {
            console.error('❌ Ошибка добавления оборудования:', error);
            return null;
        }
    }

    removeEquipment(id) {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`Оборудование ${id} не найдено`);
            return false;
        }

        // Освобождаем занятое место в стратегии монтажа
        const cabinet = this.cabinetManager.cabinets.get(item.cabinetId);
        if (cabinet && cabinet.instance && cabinet.instance.mountingStrategy) {
            const strategy = cabinet.instance.mountingStrategy;
            if (typeof strategy.unmount === 'function' && item.railIndex !== undefined) {
                strategy.unmount(id, item.railIndex);
            }
        }

        // Удаляем из parent (шкафа)
        if (item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
        }

        item.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.equipment.delete(id);
        this.updateUI();
        console.log(`🗑️ Удалено: ${id}`);
        return true;
    }

    removeLastEquipment() {
        const ids = Array.from(this.equipment.keys());
        if (ids.length === 0) {
            console.warn('Нет оборудования для удаления');
            return false;
        }
        return this.removeEquipment(ids[ids.length - 1]);
    }

    removeAllEquipment() {
        const ids = Array.from(this.equipment.keys());
        ids.forEach(id => this.removeEquipment(id));
        console.log('🗑️ Всё оборудование удалено');
    }

    positionEquipment(id) {
        const item = this.equipment.get(id);
        if (!item) return;

        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${item.cabinetId} не найден для оборудования ${id}`);
            return;
        }
        
        const equipmentGroup = item.mesh;

        // Универсальная стратегия монтажа
        if (cabinet.instance?.mountingStrategy && typeof cabinet.instance.mountingStrategy.mount === 'function') {
            try {
                const position = {
                    railIndex: item.railIndex,
                    xOffset: item.xOffset,
                    unitIndex: item.unitIndex,
                    depth: item.depth
                };
                cabinet.instance.mountingStrategy.mount(equipmentGroup, item.config, position);
                return;
            } catch (e) {
                console.error('❌ Ошибка стратегии монтажа:', e);
                throw e;
            }
        }

        console.warn('⚠️ Шкаф не имеет стратегии монтажа');

        const railAnchorWorld = rail.localToWorld(railAnchorLocal.clone());
        const equipmentAnchorWorld = equipmentGroup.localToWorld(equipmentAnchorLocal.clone());
        const delta = railAnchorWorld.clone().sub(equipmentAnchorWorld);
        equipmentGroup.position.add(delta);

        const equipmentPosInRail = rail.worldToLocal(equipmentGroup.position.clone());
        const moduleStep = item.config?.dimensions?.width || 0.018;
        equipmentPosInRail.x = railBBox.min.x + item.moduleIndex * moduleStep;
        equipmentGroup.position.copy(rail.localToWorld(equipmentPosInRail));
    }

    updateUI() {
        const countEl = document.getElementById('equipment-count');
        if (countEl) countEl.textContent = this.equipment.size;
    }

    getEquipment(id) {
        return this.equipment.get(id);
    }

    getAllEquipment() {
        return Array.from(this.equipment.values());
    }

    getEquipmentByCabinet(cabinetId) {
        return Array.from(this.equipment.values()).filter(item => item.cabinetId === cabinetId);
    }
}

let cabinetManager;
let equipmentManager;

async function loadInitialScene() {
    try {
        const assetLoader = getAssetLoader();
        
        // Инициализируем менеджеры
        cabinetManager = new CabinetManager(scene);
        equipmentManager = new EquipmentManager(scene, assetLoader, cabinetManager);

        // Глобальный доступ для отладки и расширения
        window.cabinetManager = cabinetManager;
        window.equipmentManager = equipmentManager;

        // Автоматически загружаем первый доступный шкаф из каталога
        const available = await cabinetManager.getAvailableCabinets();
        if (available.length > 0) {
            console.log(`📋 Доступно шкафов в каталоге: ${available.length}`);
            await cabinetManager.addCabinetById(available[0].id, 'cabinet_main');
        } else {
            console.warn('⚠️ Каталог шкафов пуст. Используйте cabinetManager.addCabinet() для ручной загрузки.');
        }

        console.log('✅ Сцена инициализирована');

        // Helper-функции
        window.addBreakers = async (count = 5, railIndex = 0) => {
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

        window.showRailOccupancy = (railIndex = 0) => {
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
        };

    } catch (error) {
        console.error('❌ Ошибка загрузки сцены:', error);
    }
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Запуск
loadInitialScene();
animate();

// Отладка: печать иерархии сцены ASCII-деревом
function dumpObjectTree(object, depth = 0, maxDepth = 6) {
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

function dumpSceneHierarchy(maxDepth = 6) {
    let report = 'Scene graph:\n';
    report += dumpObjectTree(scene, 0, maxDepth);
    console.log(report);
    return report;
}

// Экспортируем в global для удобства
window.dumpSceneHierarchy = dumpSceneHierarchy;

// Вспомогательная функция: выровнять группу так, чтобы её нижняя точка была на Y=0
function alignGroupToFloor(group) {
    const bbox = new THREE.Box3().setFromObject(group);
    const offsetY = -bbox.min.y;
    group.position.y += offsetY;
    console.log('📐 GLB aligned to floor, offset Y:', offsetY.toFixed(3));
}

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
console.log('  🧭 ОТЛАДКА:');
console.log('    • dumpSceneHierarchy(6) - напечатать иерархию сцены (ASCII)');
console.log('    • showRailOccupancy(railIndex) - показать заполненность DIN-рейки');
