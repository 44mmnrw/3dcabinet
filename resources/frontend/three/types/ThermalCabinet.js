/**
 * ThermalCabinet — тип для термошкафов
 * Специализация для outdoor шкафов с системой климат-контроля
 */
import { CabinetType } from './CabinetType.js';

export class ThermalCabinet extends CabinetType {
    constructor(config) {
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
    validateEquipment(equipment) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Проверка диапазона рабочих температур оборудования
        if (equipment.specs && equipment.specs.operatingTemp) {
            const eqTemp = equipment.specs.operatingTemp;
            const cabTemp = this.thermal.operatingTemp;
            
            if (eqTemp.min < cabTemp.min || eqTemp.max > cabTemp.max) {
                result.warnings.push(
                    `Рабочий диапазон оборудования (${eqTemp.min}°C..${eqTemp.max}°C) ` +
                    `выходит за пределы шкафа (${cabTemp.min}°C..${cabTemp.max}°C)`
                );
            }
        }

        // Проверка тепловыделения
        if (equipment.specs && equipment.specs.heatDissipation) {
            const heatOutput = equipment.specs.heatDissipation;
            if (heatOutput > this.thermal.coolingPower) {
                result.warnings.push(
                    `Тепловыделение оборудования (${heatOutput}Вт) превышает мощность охлаждения (${this.thermal.coolingPower}Вт)`
                );
            }
        }

        return result;
    }

    /**
     * Расчёт теплового баланса
     */
    calculateTypeSpecificMetrics(equipmentList) {
        const metrics = {
            totalHeatDissipation: 0,    // Суммарное тепловыделение (Вт)
            totalPowerConsumption: 0,   // Суммарное энергопотребление (Вт)
            heatingRequired: 0,         // Требуемая мощность обогрева (Вт)
            coolingRequired: 0,         // Требуемая мощность охлаждения (Вт)
            thermalBalance: 'unknown'   // Статус баланса
        };

        equipmentList.forEach(eq => {
            if (eq.specs) {
                metrics.totalHeatDissipation += eq.specs.heatDissipation || 0;
                metrics.totalPowerConsumption += eq.specs.power || 0;
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
    getConfigurationRecommendations(equipmentList) {
        const recommendations = [];
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
    hasClimateControl() {
        return this.climate.hasHeater || this.climate.hasCooler || this.climate.hasThermostat;
    }

    /**
     * Получить параметры изоляции
     */
    getInsulationLevel() {
        return this.thermal.insulation;
    }
}
