import { DINRailStrategy, RackUnitStrategy, MountingPlateStrategy } from '../strategies/MountingStrategies.js';
import { strategyRegistry } from '../strategies/StrategyRegistry.js';
import { StrategyFactory } from '../strategies/StrategyFactory.js';
import { typeRegistry } from '../types/index.js';

// Регистрация всех модулей шкафов через Vite glob import
const cabinetModules = import.meta.glob('../cabinets/**/*.js', { eager: true });

/**
 * Фабрика для создания шкафов с типами и стратегиями
 * Отвечает за создание экземпляров шкафов, типов и стратегий монтажа
 */
export class CabinetFactory {
    /**
     * Регистрация всех стратегий монтажа в реестре
     * Вызывается один раз при инициализации
     */
    static registerStrategies() {
        strategyRegistry.register('din_rail', DINRailStrategy, ['din', 'rail']);
        strategyRegistry.register('rack_unit', RackUnitStrategy, ['rack', '19inch']);
        strategyRegistry.register('mounting_plate', MountingPlateStrategy, ['plate']);
    }

    /**
     * Создать экземпляр шкафа из определения каталога
     * @param {Object} cabinetDef - Определение из каталога
     * @param {Object} options - Опции сборки
     * @returns {Promise<Object>} { instance, assembly, cabinetType, strategies }
     */
    static async createFromDefinition(cabinetDef, options = {}) {
        if (!cabinetDef || !cabinetDef.className) {
            throw new Error('Некорректное определение шкафа: отсутствует className');
        }

        const { className, modulePath } = cabinetDef;
        const basePath = options.basePath || (window.location.origin + '/assets/models/freecad');

        // 1. Загрузить класс шкафа
        const cabinetInstance = await this._loadCabinetClass(className, modulePath);

        // 2. Собрать 3D-модель
        // Не передаём config, чтобы использовался встроенный конфиг из модуля
        // cabinetDef из каталога не содержит структуру components/rails
        const assembly = await cabinetInstance.assemble({ basePath });

        // 3. Создать тип через TypeRegistry
        const cabinetType = await this._createCabinetType(cabinetDef);

        // 4. Создать стратегии монтажа
        const strategies = await this._createStrategies(cabinetType, cabinetInstance, cabinetDef);

        // 5. Установить основную стратегию на instance (для обратной совместимости)
        const primaryStrategy = strategies.values().next().value;
        if (primaryStrategy) {
            cabinetInstance.mountingStrategy = primaryStrategy;
        }

        return {
            instance: cabinetInstance,
            assembly,
            cabinetType,
            strategies
        };
    }

    /**
     * Загрузить класс шкафа из модуля
     * @private
     */
    static async _loadCabinetClass(className, modulePath) {
        // Поиск модуля в предзагруженных модулях
        const moduleKey = Object.keys(cabinetModules).find(key => 
            key.includes(`${className}/${className}.js`) || 
            (modulePath && key.includes(modulePath))
        );

        if (!moduleKey) {
            const available = Object.keys(cabinetModules).slice(0, 5).join(', ');
            throw new Error(
                `Модуль шкафа ${className} не найден. ` +
                `Доступные модули (первые 5): ${available}...`
            );
        }

        const module = cabinetModules[moduleKey];
        const CabinetClass = module[className];

        if (!CabinetClass) {
            throw new Error(
                `Класс ${className} не найден в модуле. ` +
                `Доступные экспорты: ${Object.keys(module).join(', ')}`
            );
        }

        return new CabinetClass();
    }

    /**
     * Создать CabinetType из определения
     * @private
     */
    static async _createCabinetType(cabinetDef) {
        if (!cabinetDef.category) {
            console.warn('⚠️ Категория шкафа не указана, используется базовый тип');
            const { CabinetType } = await import('../types/CabinetType.js');
            return new CabinetType(cabinetDef);
        }

        try {
            return await typeRegistry.createType(cabinetDef.category, cabinetDef);
        } catch (error) {
            console.warn('⚠️ Ошибка создания типа, используется базовый:', error);
            const { CabinetType } = await import('../types/CabinetType.js');
            return new CabinetType(cabinetDef);
        }
    }

    /**
     * Создать стратегии монтажа для шкафа
     * @private
     */
    static async _createStrategies(cabinetType, cabinetInstance, cabinetDef) {
        // Создаём стратегии через StrategyFactory на основе возможностей типа
        let strategies = new Map();

        if (cabinetType && cabinetType.mountingCapabilities) {
            strategies = StrategyFactory.createForCabinet(cabinetType, cabinetInstance);
        }

        // Fallback: если нет стратегий, создаём DIN-rail по умолчанию
        if (strategies.size === 0) {
            const mountType = cabinetDef.mountingType || 'din_rail';
            const strategy = strategyRegistry.create(mountType, cabinetInstance, cabinetType);
            if (strategy) {
                strategies.set(mountType, strategy);
            }
        }

        return strategies;
    }

    /**
     * Загрузить класс шкафа динамически из модуля (legacy метод)
     * @deprecated Используйте createFromDefinition()
     */
    static async loadCabinet(className, modulePath) {
        const instance = await this._loadCabinetClass(className, modulePath);
        return instance;
    }

    /**
     * Загрузить и зарегистрировать класс шкафа (legacy метод)
     * @deprecated Используйте createFromDefinition()
     */
    static async loadAndRegister(className, modulePath, registry = null) {
        try {
            const module = await import(modulePath);
            const CabinetClass = module[className];
            
            if (!CabinetClass) {
                throw new Error(`Класс "${className}" не найден в "${modulePath}"`);
            }
            
            // Регистрировать, если передан реестр
            if (registry && registry.register) {
                registry.register(className, CabinetClass);
            }
            
            return CabinetClass;
            
        } catch (error) {
            console.error(`❌ Ошибка при загрузке и регистрации ${className}:`, error);
            throw error;
        }
    }

    /**
     * Создать экземпляр из определения каталога (legacy метод)
     * @deprecated Используйте createFromDefinition()
     */
    static async createFromCatalog(cabinetDef) {
        return await this.createFromDefinition(cabinetDef);
    }
}

// Автоматическая регистрация стратегий при импорте
CabinetFactory.registerStrategies();
