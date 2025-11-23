import { DINRailStrategy, RackUnitStrategy, MountingPlateStrategy } from '../strategies/MountingStrategies.ts';
import { strategyRegistry } from '../strategies/StrategyRegistry.ts';
import { StrategyFactory } from '../strategies/StrategyFactory.ts';
import { typeRegistry } from '../types/index.ts';
import type { CabinetDefinition } from '../types/cabinet.types.js';
import type { MountingStrategy } from '../strategies/MountingStrategies.ts';
import type { CabinetBase } from '../cabinets/CabinetBase.ts';
import type { CabinetType } from '../types/CabinetType.ts';
import type * as THREE from 'three';

/**
 * Опции для создания шкафа
 */
export interface CabinetFactoryOptions {
    basePath?: string;
    [key: string]: any;
}

/**
 * Результат создания шкафа
 */
export interface CabinetCreationResult {
    instance: CabinetBase;
    assembly: THREE.Group;
    cabinetType: CabinetType;
    strategies: Map<string, MountingStrategy>;
}

/**
 * Реестр модулей шкафов (через Vite glob import)
 * Поддерживает как .ts, так и .js файлы для обратной совместимости
 */
const cabinetModulesTS = import.meta.glob('../cabinets/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
const cabinetModulesJS = import.meta.glob('../cabinets/**/*.js', { eager: true }) as Record<string, Record<string, unknown>>;
const cabinetModules = { ...cabinetModulesTS, ...cabinetModulesJS };

/**
 * Фабрика для создания шкафов с типами и стратегиями
 * Отвечает за создание экземпляров шкафов, типов и стратегий монтажа
 */
export class CabinetFactory {
    /**
     * Регистрация всех стратегий монтажа в реестре
     * Вызывается один раз при инициализации
     */
    static registerStrategies(): void {
        strategyRegistry.register('din_rail', DINRailStrategy, ['din', 'rail']);
        strategyRegistry.register('rack_unit', RackUnitStrategy, ['rack', '19inch']);
        strategyRegistry.register('mounting_plate', MountingPlateStrategy, ['plate']);
    }

    /**
     * Создать экземпляр шкафа из определения каталога
     */
    static async createFromDefinition(cabinetDef: CabinetDefinition, options: CabinetFactoryOptions = {}): Promise<CabinetCreationResult> {
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
        // Метод assemble может быть в конкретных реализациях, но не в базовом классе
        const cabinetWithAssemble = cabinetInstance as CabinetBase & { assemble?: (options?: { basePath?: string; config?: unknown }) => Promise<THREE.Group> };
        if (!cabinetWithAssemble.assemble || typeof cabinetWithAssemble.assemble !== 'function') {
            throw new Error(`Класс ${className} не имеет метода assemble()`);
        }
        // Важно: вызываем метод напрямую на объекте, чтобы сохранить контекст this
        const assembly = await cabinetWithAssemble.assemble({ basePath });

        // 3. Создать тип через TypeRegistry
        const cabinetType = await this._createCabinetType(cabinetDef);

        // 4. Создать стратегии монтажа
        const strategies = await this._createStrategies(cabinetType, cabinetInstance, cabinetDef);

        // 5. Установить основную стратегию на instance (для обратной совместимости)
        // Примечание: mountingStrategy больше не используется напрямую, используйте cabinet.strategies
        const primaryStrategy = strategies.values().next().value;
        if (primaryStrategy && 'mountingStrategy' in cabinetInstance) {
            (cabinetInstance as { mountingStrategy?: MountingStrategy }).mountingStrategy = primaryStrategy;
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
    private static async _loadCabinetClass(className: string, modulePath?: string): Promise<CabinetBase> {
        // Поиск модуля в предзагруженных модулях
        // Поддерживаем как .ts, так и .js для обратной совместимости
        const moduleKey = Object.keys(cabinetModules).find(key => 
            key.includes(`${className}/${className}.ts`) || 
            key.includes(`${className}/${className}.js`) || 
            (modulePath && (key.includes(modulePath.replace('.js', '.ts')) || key.includes(modulePath)))
        );

        if (!moduleKey) {
            const available = Object.keys(cabinetModules).slice(0, 5).join(', ');
            throw new Error(
                `Модуль шкафа ${className} не найден. ` +
                `Доступные модули (первые 5): ${available}...`
            );
        }

        const module = cabinetModules[moduleKey];
        if (!module) {
            throw new Error(`Модуль не найден для ключа: ${moduleKey}`);
        }
        const CabinetClass = module[className] as typeof CabinetBase | undefined;

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
    private static async _createCabinetType(cabinetDef: CabinetDefinition): Promise<CabinetType> {
        if (!cabinetDef.category) {
            console.warn('⚠️ Категория шкафа не указана, используется базовый тип');
            const { CabinetType } = await import('../types/CabinetType.ts');
            return new CabinetType(cabinetDef);
        }

        try {
            return await typeRegistry.createType(cabinetDef.category, cabinetDef);
        } catch (error: unknown) {
            console.warn('⚠️ Ошибка создания типа, используется базовый:', error);
            const { CabinetType } = await import('../types/CabinetType.ts');
            return new CabinetType(cabinetDef);
        }
    }

    /**
     * Создать стратегии монтажа для шкафа
     * @private
     */
    private static async _createStrategies(
        cabinetType: CabinetType, 
        cabinetInstance: CabinetBase, 
        cabinetDef: CabinetDefinition
    ): Promise<Map<string, MountingStrategy>> {
        // Создаём стратегии через StrategyFactory на основе возможностей типа
        let strategies = new Map<string, MountingStrategy>();

        if (cabinetType && cabinetType.mountingCapabilities) {
            strategies = StrategyFactory.createForCabinet(cabinetType, cabinetInstance);
        }

        // Fallback: если нет стратегий, создаём DIN-rail по умолчанию
        if (strategies.size === 0) {
            const mountType = (cabinetDef as CabinetDefinition & { mountingType?: string }).mountingType || 'din_rail';
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
    static async loadCabinet(className: string, modulePath?: string): Promise<CabinetBase> {
        const instance = await this._loadCabinetClass(className, modulePath);
        return instance;
    }

    /**
     * Загрузить и зарегистрировать класс шкафа (legacy метод)
     * @deprecated Используйте createFromDefinition()
     */
    static async loadAndRegister(className: string, modulePath?: string, registry: { register?: (name: string, cls: typeof CabinetBase) => void } | null = null): Promise<typeof CabinetBase | null> {
        try {
            // Используем предзагруженные модули через import.meta.glob (совместимо с Vite)
            // Поддерживаем как .ts, так и .js для обратной совместимости
            const moduleKey = Object.keys(cabinetModules).find(key => 
                key.includes(`${className}/${className}.ts`) || 
                key.includes(`${className}/${className}.js`) || 
                (modulePath && (key.includes(modulePath.replace('.js', '.ts')) || key.includes(modulePath)))
            );

            if (!moduleKey) {
                const available = Object.keys(cabinetModules).slice(0, 5).join(', ');
                throw new Error(
                    `Модуль шкафа ${className} не найден. ` +
                    `Доступные модули (первые 5): ${available}...`
                );
            }

            const module = cabinetModules[moduleKey] as Record<string, unknown>;
            const CabinetClass = module[className] as typeof CabinetBase | undefined;
            
            if (!CabinetClass) {
                throw new Error(
                    `Класс "${className}" не найден в модуле. ` +
                    `Доступные экспорты: ${Object.keys(module).join(', ')}`
                );
            }
            
            // Регистрировать, если передан реестр
            if (registry && registry.register) {
                registry.register(className, CabinetClass);
            }
            
            return CabinetClass as typeof CabinetBase;
            
        } catch (error: unknown) {
            console.error(`❌ Ошибка при загрузке и регистрации ${className}:`, error);
            throw error;
        }
    }

    /**
     * Создать экземпляр из определения каталога (legacy метод)
     * @deprecated Используйте createFromDefinition()
     */
    static async createFromCatalog(cabinetDef: CabinetDefinition): Promise<CabinetCreationResult> {
        return await this.createFromDefinition(cabinetDef);
    }
}

// Автоматическая регистрация стратегий при импорте
CabinetFactory.registerStrategies();

