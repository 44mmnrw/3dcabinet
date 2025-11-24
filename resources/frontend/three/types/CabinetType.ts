/**
 * CabinetType — базовый класс для системы типов шкафов
 * Определяет общий интерфейс и логику для всех типов шкафов
 */

import type { CabinetCategory, MountingCapability, CabinetDimensions, CabinetSpecs, MountingZone } from './cabinet.types.js';
import type { EquipmentConfig } from './equipment.types.js';

/**
 * Конфигурация для создания CabinetType
 */
export interface CabinetTypeConfig {
    id: string;
    name: string;
    category: CabinetCategory;
    dimensions?: CabinetDimensions | Record<string, unknown>;
    mountingZones?: MountingZone[];
    mountingCapabilities?: MountingCapability[];
    specs?: CabinetSpecs | Record<string, unknown>;
    [key: string]: unknown;  // Для дополнительных полей
}

/**
 * Результат валидации оборудования
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Рекомендация по конфигурации
 */
export interface ConfigurationRecommendation {
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
    [key: string]: unknown;  // Для дополнительных полей
}

/**
 * Базовый класс для всех типов шкафов
 */
export class CabinetType {
    id: string;
    name: string;
    category: CabinetCategory;
    config: CabinetTypeConfig;
    dimensions: CabinetDimensions | Record<string, unknown>;
    mountingZones: MountingZone[];
    mountingCapabilities: MountingCapability[];
    specs: CabinetSpecs | Record<string, unknown>;

    /**
     * @param config - Конфигурация из каталога
     */
    constructor(config: CabinetTypeConfig) {
        this.id = config.id;
        this.name = config.name;
        this.category = config.category;
        this.config = config;
        
        // Базовые размеры
        this.dimensions = config.dimensions || {};
        
        // Монтажные зоны (будет заполняться из каталога)
        this.mountingZones = config.mountingZones || [];
        
        // Возможности монтажа
        this.mountingCapabilities = config.mountingCapabilities || [];
        
        // Технические характеристики
        this.specs = config.specs || {};
    }

    /**
     * Получить монтажные зоны по типу
     * @param type - Тип зоны (din_rail, rack_unit, mounting_plate, zero_u, door)
     * @returns Массив зон указанного типа
     */
    getMountingZones(type: string): MountingZone[] {
        return this.mountingZones.filter(zone => zone.type === type);
    }

    /**
     * Проверить совместимость с типом монтажа
     * @param mountType - Тип монтажа оборудования
     * @returns true, если поддерживается
     */
    supportsMountType(mountType: string): boolean {
        return this.mountingCapabilities.includes(mountType as MountingCapability);
    }

    /**
     * Получить максимальную нагрузку (кг)
     * @returns Максимальная нагрузка в килограммах
     */
    getMaxLoad(): number {
        const maxLoad = (this.specs as CabinetSpecs)?.maxLoad;
        return maxLoad !== undefined ? maxLoad : 0;
    }

    /**
     * Получить максимальную мощность (Вт)
     * @returns Максимальная мощность в ваттах
     */
    getMaxPower(): number {
        const maxPower = (this.specs as CabinetSpecs)?.maxPower;
        return maxPower !== undefined ? maxPower : 0;
    }

    /**
     * Получить параметры охлаждения (если есть)
     * @returns Параметры охлаждения или null
     */
    getCoolingSpec(): { type: string; capacity?: number } | null {
        const cooling = (this.specs as CabinetSpecs)?.cooling;
        return cooling || null;
    }

    /**
     * Проверить наличие DIN-реек
     * @returns true, если есть DIN-рейки
     */
    hasDinRails(): boolean {
        return this.getMountingZones('din_rail').length > 0;
    }

    /**
     * Проверить наличие 19" стоек
     * @returns true, если есть стойки
     */
    hasRackUnits(): boolean {
        return this.getMountingZones('rack_unit').length > 0;
    }

    /**
     * Получить высоту в юнитах (для стоечных шкафов)
     * @returns Высота в юнитах (U)
     */
    getRackUnits(): number {
        const rackUnits = (this.specs as CabinetSpecs)?.rackUnits;
        return rackUnits !== undefined ? rackUnits : 0;
    }

    /**
     * Валидация специфичная для типа (переопределяется в наследниках)
     * @param equipment - Оборудование для проверки
     * @returns Результат валидации
     */
    validateEquipment(_equipment: EquipmentConfig): ValidationResult {
        return {
            valid: true,
            errors: [],
            warnings: []
        };
    }

    /**
     * Рассчитать специфичные для типа параметры (переопределяется в наследниках)
     * @param equipmentList - Список установленного оборудования
     * @returns Результаты расчётов
     */
    calculateTypeSpecificMetrics(_equipmentList: EquipmentConfig[]): Record<string, unknown> {
        return {};
    }

    /**
     * Получить рекомендации по конфигурации (переопределяется в наследниках)
     * @param equipmentList - Список установленного оборудования
     * @returns Массив рекомендаций
     */
    getConfigurationRecommendations(_equipmentList: EquipmentConfig[]): ConfigurationRecommendation[] {
        return [];
    }

    /**
     * Получить строковое представление типа
     * @returns Строковое представление
     */
    toString(): string {
        return `${this.constructor.name}(${this.id})`;
    }
}

