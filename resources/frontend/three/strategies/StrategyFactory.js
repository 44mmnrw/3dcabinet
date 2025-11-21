/**
 * StrategyFactory — Фабрика для создания стратегий монтажа
 * Упрощённый интерфейс поверх StrategyRegistry
 */
import { strategyRegistry } from './StrategyRegistry.js';

export class StrategyFactory {
    /**
     * Создать стратегию по типу монтажа
     * @param {string} mountType - Тип монтажа из каталога оборудования
     * @param {Object} cabinet - Экземпляр шкафа
     * @param {Object} options - Дополнительные параметры стратегии
     * @returns {Object|null} Экземпляр стратегии или null
     */
    static create(mountType, cabinet, options = {}) {
        if (!mountType) {
            console.error('[StrategyFactory] mountType is required');
            return null;
        }

        if (!cabinet) {
            console.error('[StrategyFactory] cabinet is required');
            return null;
        }

        // Попытка создать через реестр
        const strategy = strategyRegistry.create(mountType, cabinet, options);
        
        if (!strategy) {
            console.warn(
                `[StrategyFactory] No strategy found for '${mountType}'. ` +
                `Available: ${strategyRegistry.getRegisteredTypes().join(', ')}`
            );
        }

        return strategy;
    }

    /**
     * Создать стратегию с fallback на базовую
     * @param {string} mountType
     * @param {Object} cabinet
     * @param {Object} options
     * @param {Function} FallbackStrategy - Стратегия по умолчанию
     * @returns {Object}
     */
    static createWithFallback(mountType, cabinet, options = {}, FallbackStrategy = null) {
        let strategy = this.create(mountType, cabinet, options);
        
        if (!strategy && FallbackStrategy) {
            console.warn(
                `[StrategyFactory] Using fallback strategy for '${mountType}'`
            );
            strategy = new FallbackStrategy(cabinet, options);
        }
        
        return strategy;
    }

    /**
     * Создать несколько стратегий для разных типов монтажа
     * @param {Array<string>} mountTypes - Массив типов монтажа
     * @param {Object} cabinet
     * @param {Object} options
     * @returns {Map<string, Object>} Map типов монтажа к стратегиям
     */
    static createMultiple(mountTypes, cabinet, options = {}) {
        const strategies = new Map();
        
        mountTypes.forEach(mountType => {
            const strategy = this.create(mountType, cabinet, options);
            if (strategy) {
                strategies.set(mountType, strategy);
            }
        });
        
        return strategies;
    }

    /**
     * Автоматическое определение стратегий для шкафа
     * Создаёт стратегии на основе mountingCapabilities шкафа
     * @param {Object} cabinetType - Экземпляр CabinetType с mountingCapabilities
     * @param {Object} cabinet - Экземпляр шкафа для Three.js
     * @param {Object} options
     * @returns {Map<string, Object>}
     */
    static createForCabinet(cabinetType, cabinet, options = {}) {
        if (!cabinetType || !cabinetType.mountingCapabilities) {
            console.error('[StrategyFactory] cabinetType with mountingCapabilities required');
            return new Map();
        }

        const capabilities = cabinetType.mountingCapabilities;
        console.log(
            `[StrategyFactory] Auto-creating strategies for: ${capabilities.join(', ')}`
        );
        
        return this.createMultiple(capabilities, cabinet, options);
    }

    /**
     * Проверить поддержку типа монтажа
     * @param {string} mountType
     * @returns {boolean}
     */
    static supports(mountType) {
        return strategyRegistry.has(mountType);
    }

    /**
     * Получить список поддерживаемых типов монтажа
     * @returns {Array<string>}
     */
    static getSupportedTypes() {
        return strategyRegistry.getRegisteredTypes();
    }

    /**
     * Получить информацию о стратегии
     * @param {string} mountType
     * @returns {Object|null} {type, aliases, available}
     */
    static getStrategyInfo(mountType) {
        if (!strategyRegistry.has(mountType)) {
            return null;
        }

        return {
            type: mountType,
            aliases: strategyRegistry.getAliases(mountType),
            available: true,
            StrategyClass: strategyRegistry.get(mountType)
        };
    }

    /**
     * Валидация оборудования перед монтажом
     * Проверяет совместимость через стратегию
     * @param {string} mountType
     * @param {Object} cabinet
     * @param {Object} equipment
     * @returns {Object} {canMount: boolean, reason: string}
     */
    static async validateMount(mountType, cabinet, equipment) {
        const strategy = this.create(mountType, cabinet);
        
        if (!strategy) {
            return {
                canMount: false,
                reason: `Strategy not found for '${mountType}'`
            };
        }

        if (typeof strategy.canMount === 'function') {
            const canMount = await strategy.canMount(equipment);
            return {
                canMount,
                reason: canMount ? 'OK' : 'Strategy rejected mount'
            };
        }

        return {
            canMount: true,
            reason: 'No validation implemented'
        };
    }

    /**
     * Получить статистику фабрики
     * @returns {Object}
     */
    static getStats() {
        return {
            ...strategyRegistry.getStats(),
            factoryVersion: '1.0.0'
        };
    }
}
