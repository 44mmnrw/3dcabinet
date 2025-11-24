/**
 * ThermalCabinet — тип для термошкафов
 * Специализация для outdoor шкафов с системой климат-контроля
 */
import { CabinetType } from './CabinetType.ts';
import type { EquipmentConfig } from './equipment.types.js';
import type { CabinetCategory, MountingCapability, MountingZone, CabinetDimensions, CabinetSpecs } from './cabinet.types.js';
import type { ValidationResult, ConfigurationRecommendation } from './CabinetType.ts';

export interface ThermalCabinetConfig {
    id: string;
    name: string;
    category: CabinetCategory;
    dimensions?: CabinetDimensions | Record<string, unknown>;
    mountingZones?: MountingZone[];
    mountingCapabilities?: MountingCapability[];
    specs?: CabinetSpecs | Record<string, unknown>;
    [key: string]: unknown;  // Для совместимости с CabinetTypeConfig
    thermal?: {
        heatingPower: number;      // Мощность обогрева (Вт)
        coolingPower: number;      // Мощность охлаждения (Вт)
        insulation: string;         // Уровень изоляции
        operatingTemp: {            // Рабочий диапазон (°C)
            min: number;
            max: number;
        };
    };
    climate?: {
        hasHeater: boolean;
        hasCooler: boolean;
        hasThermostat: boolean;
        hasHumidityControl: boolean;
    };
}

export interface ThermalMetrics {
    totalHeatDissipation: number;    // Суммарное тепловыделение (Вт)
    totalPowerConsumption: number;   // Суммарное энергопотребление (Вт)
    heatingRequired: number;         // Требуемая мощность обогрева (Вт)
    coolingRequired: number;         // Требуемая мощность охлаждения (Вт)
    thermalBalance: 'unknown' | 'insufficient_cooling' | 'oversized_cooling' | 'balanced';
    [key: string]: unknown;
}

export class ThermalCabinet extends CabinetType {
    thermal: {
        heatingPower: number;
        coolingPower: number;
        insulation: string;
        operatingTemp: {
            min: number;
            max: number;
        };
    };
    
    climate: {
        hasHeater: boolean;
        hasCooler: boolean;
        hasThermostat: boolean;
        hasHumidityControl: boolean;
    };

    constructor(config: ThermalCabinetConfig) {
        super(config);
        
        // Специфичные параметры термошкафа
        this.thermal = config.thermal || {
            heatingPower: 0,      // Мощность обогрева (Вт)
            coolingPower: 0,      // Мощность охлаждения (Вт)
            insulation: 'standard', // Уровень изоляции
            operatingTemp: { min: -40, max: 55 } // Рабочий диапазон (°C)
        };
        
        this.climate = config.climate || {
            hasHeater: false,
            hasCooler: false,
            hasThermostat: false,
            hasHumidityControl: false
        };
    }

    /**
     * Валидация для термошкафа
     * Проверяет тепловой баланс и требования к климат-контролю
     */
    validateEquipment(equipment: EquipmentConfig): ValidationResult {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Проверка диапазона рабочих температур оборудования
        if (equipment.specifications) {
            const operatingTemp = (equipment.specifications as any).operatingTemp;
            if (operatingTemp) {
                const eqTemp = operatingTemp;
                const cabTemp = this.thermal.operatingTemp;
                
                if (eqTemp.min < cabTemp.min || eqTemp.max > cabTemp.max) {
                    result.warnings.push(
                        `Рабочий диапазон оборудования (${eqTemp.min}°C..${eqTemp.max}°C) ` +
                        `выходит за пределы шкафа (${cabTemp.min}°C..${cabTemp.max}°C)`
                    );
                }
            }
        }

        // Проверка тепловыделения
        if (equipment.specifications) {
            const heatDissipation = (equipment.specifications as any).heatDissipation;
            if (heatDissipation) {
                const heatOutput = heatDissipation;
                if (heatOutput > this.thermal.coolingPower) {
                    result.warnings.push(
                        `Тепловыделение оборудования (${heatOutput}Вт) превышает мощность охлаждения (${this.thermal.coolingPower}Вт)`
                    );
                }
            }
        }

        return result;
    }

    /**
     * Расчёт теплового баланса
     */
    calculateTypeSpecificMetrics(equipmentList: EquipmentConfig[]): ThermalMetrics {
        const metrics: ThermalMetrics = {
            totalHeatDissipation: 0,    // Суммарное тепловыделение (Вт)
            totalPowerConsumption: 0,   // Суммарное энергопотребление (Вт)
            heatingRequired: 0,         // Требуемая мощность обогрева (Вт)
            coolingRequired: 0,         // Требуемая мощность охлаждения (Вт)
            thermalBalance: 'unknown'   // Статус баланса
        };

        equipmentList.forEach(eq => {
            if (eq.specifications) {
                const heatDissipation = (eq.specifications as any).heatDissipation;
                metrics.totalHeatDissipation += heatDissipation || 0;
                metrics.totalPowerConsumption += eq.specifications.power || 0;
            }
        });

        // Упрощённый расчёт требований
        metrics.coolingRequired = metrics.totalHeatDissipation;
        
        // Определение статуса баланса
        if (metrics.coolingRequired > this.thermal.coolingPower) {
            metrics.thermalBalance = 'insufficient_cooling';
        } else if (metrics.coolingRequired < this.thermal.coolingPower * 0.5) {
            metrics.thermalBalance = 'oversized_cooling';
        } else {
            metrics.thermalBalance = 'balanced';
        }

        return metrics;
    }

    /**
     * Рекомендации для термошкафа
     */
    getConfigurationRecommendations(equipmentList: EquipmentConfig[]): ConfigurationRecommendation[] {
        const recommendations: ConfigurationRecommendation[] = [];
        const metrics = this.calculateTypeSpecificMetrics(equipmentList);

        if (metrics.thermalBalance === 'insufficient_cooling') {
            recommendations.push({
                severity: 'error',
                message: 'Недостаточная мощность охлаждения',
                suggestion: `Требуется система охлаждения мощностью минимум ${metrics.coolingRequired}Вт`
            });
        }

        if (metrics.totalHeatDissipation > 0 && !this.climate.hasCooler) {
            recommendations.push({
                severity: 'warning',
                message: 'Оборудование выделяет тепло, но система охлаждения не установлена',
                suggestion: 'Рекомендуется добавить охлаждающий модуль'
            });
        }

        if (metrics.totalPowerConsumption > this.getMaxPower()) {
            recommendations.push({
                severity: 'error',
                message: 'Суммарное энергопотребление превышает максимально допустимое',
                suggestion: `Превышение: ${metrics.totalPowerConsumption - this.getMaxPower()}Вт`
            });
        }

        return recommendations;
    }

    /**
     * Проверка наличия климат-контроля
     */
    hasClimateControl(): boolean {
        return this.climate.hasHeater || this.climate.hasCooler || this.climate.hasThermostat;
    }

    /**
     * Получить параметры изоляции
     */
    getInsulationLevel(): string {
        return this.thermal.insulation;
    }
}

