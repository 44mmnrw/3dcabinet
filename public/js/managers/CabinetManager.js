import { DINRailStrategy, RackUnitStrategy, MountingPlateStrategy } from '../strategies/MountingStrategies.js';
import { strategyRegistry } from '../strategies/StrategyRegistry.js';
import { StrategyFactory } from '../strategies/StrategyFactory.js';
import { typeRegistry } from '../types/index.js';
import { eventBus, ConfiguratorEvents } from '../events/EventBus.js';
import { createDefaultLogicEngine } from '../logic/index.js';

/**
 * Менеджер шкафов на 3D-сцене
 * 
 * Функциональность:
 * - Динамическая загрузка классов шкафов из catalog.json
 * - Управление несколькими экземплярами шкафов
 * - Присваивание стратегий монтажа через StrategyFactory (NEW!)
 * - Интеграция с Type System для универсальной поддержки типов (NEW!)
 * - Event-driven архитектура через EventBus (NEW!)
 * - Расчёты через LogicEngine (NEW!)
 * - Управление жизненным циклом (добавление, удаление, dispose)
 */
export class CabinetManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.cabinets = new Map(); // cabinetId -> { instance, assembly, position, cabinetType, strategies }
        this.activeCabinetId = null;
        this.catalog = null; // Каталог доступных шкафов
        
        // Event-driven (NEW!)
        this.eventBus = options.eventBus || eventBus;
        
        // Logic Engine (NEW!)
        this.logicEngine = options.logicEngine || createDefaultLogicEngine();
        
        // Регистрация стратегий при инициализации
        this._registerStrategies();
    }

    /**
     * Регистрация всех стратегий монтажа в реестре
     * @private
     */
    _registerStrategies() {
        strategyRegistry.register('din_rail', DINRailStrategy, ['din', 'rail']);
        strategyRegistry.register('rack_unit', RackUnitStrategy, ['rack', '19inch']);
        strategyRegistry.register('mounting_plate', MountingPlateStrategy, ['plate']);
        
        console.log('✅ Зарегистрировано стратегий:', strategyRegistry.getRegisteredTypes().length);
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
     * @param {string} catalogId - ID шкафа из каталога (например, 'tsh_700_500_240')
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
            instanceId || `${catalogId}_${Date.now()}`,
            cabinetDef  // Передаём определение (NEW!)
        );

        return newId;
    }

    /**
     * Динамическая загрузка класса шкафа (прямой метод)
     * @param {string} cabinetType - Имя класса шкафа (например, 'test_TS_700_500_250')
     * @param {string} modulePath - Путь к модулю
     * @param {string} cabinetId - Уникальный ID экземпляра
     * @param {Object} cabinetDef - Определение из каталога (NEW!)
     * @returns {Promise<string>} ID добавленного шкафа
     */
    async addCabinet(cabinetType, modulePath, cabinetId = null, cabinetDef = null) {
        try {
            if (!cabinetId) {
                cabinetId = `${cabinetType}_${Date.now()}`;
            }

            console.log(`🔄 Загрузка шкафа: ${cabinetType} (${cabinetId})`);

            // Динамический импорт класса
            // Преобразуем абсолютный путь (/js/...) в относительный от текущего модуля
            const resolvedPath = modulePath.startsWith('/') 
                ? new URL(modulePath, window.location.origin).href
                : modulePath;
            const module = await import(/* @vite-ignore */ resolvedPath);
            const CabinetClass = module[cabinetType];

            if (!CabinetClass) {
                throw new Error(`Класс ${cabinetType} не найден в модуле ${modulePath}`);
            }

            // Создание и сборка экземпляра
            const cabinetInstance = new CabinetClass();
            const assembly = await cabinetInstance.assemble();
            
            assembly.name = cabinetId;
            assembly.position.set(0, 0, 0);
            
            this.scene.add(assembly);
            
            // Создание типа через TypeRegistry (NEW!)
            let cabinetTypeInstance = null;
            if (cabinetDef && cabinetDef.category) {
                try {
                    cabinetTypeInstance = await typeRegistry.createType(
                        cabinetDef.category,
                        cabinetDef
                    );
                    console.log(`✅ Создан тип: ${cabinetTypeInstance.toString()}`);
                } catch (error) {
                    console.warn('⚠️ Ошибка создания типа:', error);
                }
            }
            
            // Создание стратегий через StrategyFactory (NEW!)
            const strategies = cabinetTypeInstance 
                ? StrategyFactory.createForCabinet(cabinetTypeInstance, cabinetInstance)
                : new Map();
            
            // Fallback: если нет стратегий, создаём DIN-rail по умолчанию
            if (strategies.size === 0 && cabinetDef?.mountingType === 'din_rail') {
                const dinStrategy = strategyRegistry.create('din_rail', cabinetInstance, cabinetTypeInstance);
                if (dinStrategy) {
                    strategies.set('din_rail', dinStrategy);
                }
            }
            
            // Устанавливаем основную стратегию на instance (для обратной совместимости)
            const primaryStrategy = strategies.values().next().value;
            if (primaryStrategy) {
                cabinetInstance.mountingStrategy = primaryStrategy;
            }
            
            this.cabinets.set(cabinetId, {
                type: cabinetType,
                instance: cabinetInstance,
                assembly: assembly,
                position: assembly.position.clone(),
                definition: cabinetDef,
                cabinetType: cabinetTypeInstance,  // NEW!
                strategies: strategies,            // NEW!
                equipmentList: []                   // NEW!
            });

            this.activeCabinetId = cabinetId;
            console.log(`✅ Шкаф ${cabinetType} загружен: ${cabinetId}`);
            console.log(`   Тип: ${cabinetTypeInstance?.constructor.name || 'CabinetType'}`);
            console.log(`   Стратегии: ${Array.from(strategies.keys()).join(', ') || 'нет'}`);
            
            // Emit event (NEW!)
            this.eventBus.emit(ConfiguratorEvents.CABINET_ADDED, {
                cabinetId,
                cabinetType: cabinetTypeInstance,
                strategies: Array.from(strategies.keys())
            });
            
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
        
        // Emit event (NEW!)
        this.eventBus.emit(ConfiguratorEvents.CABINET_REMOVED, { cabinetId });
        
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
     * Получить CabinetType активного шкафа (NEW!)
     * @returns {CabinetType|null}
     */
    getActiveCabinetType() {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.cabinetType : null;
    }

    /**
     * Получить стратегию по типу монтажа для активного шкафа (NEW!)
     * @param {string} mountType - Тип монтажа (din_rail, rack_unit, mounting_plate)
     * @returns {MountingStrategy|null}
     */
    getStrategy(mountType) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.strategies) return null;
        
        return cabinet.strategies.get(mountType) || null;
    }

    /**
     * Получить все стратегии активного шкафа (NEW!)
     * @returns {Map<string, MountingStrategy>}
     */
    getAllStrategies() {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.strategies : new Map();
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

    /**
     * Обновить расчёты для активного шкафа (NEW!)
     * Вызывает LogicEngine и отправляет события
     */
    updateCalculations() {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.cabinetType) {
            console.warn('[CabinetManager] Нет активного шкафа или типа для расчёта');
            return null;
        }

        const equipmentList = cabinet.equipmentList || [];
        const result = this.logicEngine.calculate(cabinet.cabinetType, equipmentList);
        
        // Emit events
        this.eventBus.emit(ConfiguratorEvents.CALCULATIONS_UPDATED, {
            cabinetId: this.activeCabinetId,
            calculations: result.calculations
        });
        
        this.eventBus.emit(ConfiguratorEvents.RECOMMENDATIONS_UPDATED, {
            cabinetId: this.activeCabinetId,
            recommendations: result.recommendations
        });
        
        // Warnings as validation events
        if (result.warnings && result.warnings.length > 0) {
            this.eventBus.emit(ConfiguratorEvents.VALIDATION_WARNING, {
                cabinetId: this.activeCabinetId,
                warnings: result.warnings
            });
        }
        
        return result;
    }

    /**
     * Добавить оборудование в список активного шкафа (NEW!)
     * Для интеграции с EquipmentManager
     * @param {Object} equipment - Объект оборудования
     */
    addEquipment(equipment) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet) {
            console.warn('[CabinetManager] Нет активного шкафа');
            return;
        }

        if (!cabinet.equipmentList) {
            cabinet.equipmentList = [];
        }

        cabinet.equipmentList.push(equipment);
        
        // Автоматически обновляем расчёты
        this.updateCalculations();
    }

    /**
     * Удалить оборудование из списка активного шкафа (NEW!)
     * @param {string} equipmentId - ID оборудования
     */
    removeEquipment(equipmentId) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.equipmentList) {
            return;
        }

        const index = cabinet.equipmentList.findIndex(eq => eq.id === equipmentId);
        if (index > -1) {
            cabinet.equipmentList.splice(index, 1);
            
            // Автоматически обновляем расчёты
            this.updateCalculations();
        }
    }
}
