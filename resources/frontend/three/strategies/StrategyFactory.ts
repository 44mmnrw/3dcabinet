/**
 * StrategyFactory — Фабрика для создания стратегий монтажа
 * Упрощённый интерфейс поверх StrategyRegistry
 */

import { strategyRegistry } from './StrategyRegistry.ts';
import type { MountingStrategy } from './MountingStrategies.ts';
import type { EquipmentConfig } from '../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    mountingCapabilities?: string[];
    [key: string]: any;
}

/**
 * Интерфейс для CabinetBase (будет типизирован позже)
 */
interface CabinetBase {
    [key: string]: any;
}

/**
 * Опции для создания стратегии
 */
export interface StrategyOptions {
    [key: string]: any;
}

/**
 * Результат валидации монтажа
 */
export interface ValidationResult {
    canMount: boolean;
    reason: string;
}

/**
 * Информация о стратегии
 */
export interface StrategyInfo {
    type: string;
    aliases: string[];
    available: boolean;
    StrategyClass: any;  // StrategyConstructor - будет типизирован позже
}

/**
 * Статистика фабрики
 */
export interface FactoryStats {
    totalStrategies: number;
    uniqueTypes: number;
    totalAliases: number;
    factoryVersion: string;
}

/**
 * Фабрика для создания стратегий монтажа
 */
export class StrategyFactory {
    /**
     * Создать стратегию по типу монтажа
     */
    static create(mountType: string, cabinet: CabinetBase, options: StrategyOptions = {}): MountingStrategy | null {
        if (!mountType) {
            console.error('[StrategyFactory] mountType is required');
            return null;
        }

        if (!cabinet) {
            console.error('[StrategyFactory] cabinet is required');
            return null;
        }

        // Попытка создать через реестр
        // options может содержать cabinetType, иначе null
        const cabinetType = (options as { cabinetType?: CabinetType }).cabinetType || null;
        const strategy = strategyRegistry.create(mountType, cabinet as import('../cabinets/CabinetBase.ts').CabinetBase, cabinetType as import('../types/CabinetType.ts').CabinetType | null);
        
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
     */
    static createWithFallback(
        mountType: string, 
        cabinet: CabinetBase, 
        options: StrategyOptions = {}, 
        FallbackStrategy: (new (cabinet: CabinetBase, options?: StrategyOptions) => MountingStrategy) | null = null
    ): MountingStrategy | null {
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
     */
    static createMultiple(mountTypes: string[], cabinet: CabinetBase, options: StrategyOptions = {}): Map<string, MountingStrategy> {
        const strategies = new Map<string, MountingStrategy>();
        
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
     */
    static createForCabinet(cabinetType: CabinetType, cabinet: CabinetBase, options: StrategyOptions = {}): Map<string, MountingStrategy> {
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
     */
    static supports(mountType: string): boolean {
        return strategyRegistry.has(mountType);
    }

    /**
     * Получить список поддерживаемых типов монтажа
     */
    static getSupportedTypes(): string[] {
        return strategyRegistry.getRegisteredTypes();
    }

    /**
     * Получить информацию о стратегии
     */
    static getStrategyInfo(mountType: string): StrategyInfo | null {
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
     */
    static async validateMount(mountType: string, cabinet: CabinetBase, equipment: EquipmentConfig): Promise<ValidationResult> {
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
     */
    static getStats(): FactoryStats {
        return {
            ...strategyRegistry.getStats(),
            factoryVersion: '1.0.0'
        };
    }
}

