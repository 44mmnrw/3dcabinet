import { DINRailStrategy } from '../strategies/MountingStrategies.js';

/**
 * Менеджер шкафов на 3D-сцене
 * 
 * Функциональность:
 * - Динамическая загрузка классов шкафов из catalog.json
 * - Управление несколькими экземплярами шкафов
 * - Присваивание стратегий монтажа (DIN-rail, rack unit, mounting plate)
 * - Управление жизненным циклом (добавление, удаление, dispose)
 */
export class CabinetManager {
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
            
            // Динамический импорт стратегий по мере необходимости
            switch (stored.mountingType) {
                case 'din_rail':
                    stored.instance.mountingStrategy = new DINRailStrategy(stored.instance, cabinetDef);
                    break;
                case 'rack_unit':
                    // TODO: импортировать RackUnitStrategy когда понадобится
                    console.warn(`⚠️ RackUnitStrategy не реализована`);
                    break;
                case 'mounting_plate':
                    // TODO: импортировать MountingPlateStrategy когда понадобится
                    console.warn(`⚠️ MountingPlateStrategy не реализована`);
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
            const module = await import(/* @vite-ignore */ modulePath);
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

    /**
     * Удалить шкаф по ID
     * @param {string} cabinetId - ID шкафа
     * @returns {boolean} true если удалён успешно
     */
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

    /**
     * Установить активный шкаф
     */
    setActiveCabinet(cabinetId) {
        if (!this.cabinets.has(cabinetId)) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }
        this.activeCabinetId = cabinetId;
        console.log(`🎯 Активный шкаф: ${cabinetId}`);
        return true;
    }

    /**
     * Получить активный шкаф
     */
    getActiveCabinet() {
        if (!this.activeCabinetId) return null;
        return this.cabinets.get(this.activeCabinetId);
    }

    /**
     * Получить шкаф по ID
     */
    getCabinet(cabinetId) {
        return this.cabinets.get(cabinetId);
    }

    /**
     * Получить список всех шкафов
     */
    getAllCabinets() {
        return Array.from(this.cabinets.entries()).map(([id, data]) => ({
            id,
            type: data.type,
            position: data.position
        }));
    }
}
