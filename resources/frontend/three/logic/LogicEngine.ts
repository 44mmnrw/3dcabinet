/**
 * LogicEngine — движок бизнес-логики для расчётов и рекомендаций
 * Использует плагинную архитектуру для расширения под разные типы шкафов
 */

import type { CabinetType } from '../types/CabinetType.ts';
import type { EquipmentConfig } from '../types/equipment.types.js';

/**
 * Результат расчётов плагина
 */
export interface PluginResult {
    category: string;
    calculations: Record<string, unknown>;
    recommendations: Array<{
        severity: 'error' | 'warning' | 'info';
        type?: string;
        message: string;
        value?: number;
        available?: number;
        suggestion: string;
        [key: string]: unknown;
    }>;
    warnings: string[];
}

/**
 * LogicPlugin — базовый интерфейс для плагинов
 */
export abstract class LogicPlugin {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Выполнить расчёты (должен быть переопределён)
     * @param cabinetType - Тип шкафа
     * @param equipmentList - Список установленного оборудования
     * @returns Результаты расчётов
     */
    abstract calculate(cabinetType: CabinetType, equipmentList: EquipmentConfig[]): PluginResult;
}

/**
 * LogicEngine — движок бизнес-логики
 */
export class LogicEngine {
    private plugins: Map<string, LogicPlugin>;

    constructor() {
        // Map<string, LogicPlugin>
        this.plugins = new Map();
    }

    /**
     * Регистрация плагина для типа шкафа
     * @param cabinetCategory - Категория шкафа (thermal, telecom, server)
     * @param plugin - Экземпляр плагина
     */
    registerPlugin(cabinetCategory: string, plugin: LogicPlugin): void {
        if (!plugin || typeof plugin.calculate !== 'function') {
            console.error('[LogicEngine] Invalid plugin: must have calculate() method');
            return;
        }
        
        this.plugins.set(cabinetCategory, plugin);
        console.log(`[LogicEngine] Registered plugin: ${cabinetCategory}`);
    }

    /**
     * Выполнить расчёты для конфигурации
     * @param cabinetType - Тип шкафа
     * @param equipmentList - Список установленного оборудования
     * @returns Результаты расчётов
     */
    calculate(cabinetType: CabinetType, equipmentList: EquipmentConfig[]): PluginResult {
        const category = cabinetType.category;
        const plugin = this.plugins.get(category);
        
        if (!plugin) {
            console.warn(`[LogicEngine] No plugin for category '${category}'`);
            return {
                category,
                calculations: {},
                recommendations: [],
                warnings: []
            };
        }

        try {
            return plugin.calculate(cabinetType, equipmentList);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[LogicEngine] Plugin '${category}' failed:`, error);
            return {
                category,
                calculations: {},
                recommendations: [],
                warnings: [`Ошибка расчёта: ${errorMessage}`]
            };
        }
    }

    /**
     * Получить рекомендации для конфигурации
     * @param cabinetType - Тип шкафа
     * @param equipmentList - Список установленного оборудования
     * @returns Массив рекомендаций
     */
    getRecommendations(cabinetType: CabinetType, equipmentList: EquipmentConfig[]): PluginResult['recommendations'] {
        const result = this.calculate(cabinetType, equipmentList);
        return result.recommendations || [];
    }

    /**
     * Проверить наличие плагина для категории
     * @param category - Категория шкафа
     * @returns true, если плагин зарегистрирован
     */
    hasPlugin(category: string): boolean {
        return this.plugins.has(category);
    }

    /**
     * Получить список зарегистрированных категорий
     * @returns Массив категорий
     */
    getRegisteredCategories(): string[] {
        return Array.from(this.plugins.keys());
    }
}

