/**
 * ServerCabinet — тип для серверных шкафов
 * Специализация для high-density серверных конфигураций с акцентом на охлаждение
 */
import { CabinetType } from './CabinetType.js';
import { ELECTRICAL, DEFAULTS, PHYSICAL } from '../constants/PhysicalConstants.js';

export class ServerCabinet extends CabinetType {
    constructor(config) {
        super(config);
        
        // Специфичные параметры серверного шкафа
        this.cooling = config.cooling || {
            hasActiveCooling: false,    // Активное охлаждение
            coolingCapacity: 0,         // Мощность охлаждения (кВт)
            airflowType: 'passive',     // passive, front-to-back, side-to-side
            hasHotAisle: false,         // Организация Hot/Cold Aisle
            hasColdAisle: false
        };
        
        this.power = config.power || {
            inputVoltage: ELECTRICAL.STANDARD_VOLTAGE_V,
            phases: DEFAULTS.PHASES,
            maxPowerDensity: 0,         // кВт/U
            redundancy: 'none'          // none, N+1, 2N
        };
        
        this.monitoring = config.monitoring || {
            hasTemperatureSensors: false,
            hasHumiditySensors: false,
            hasPowerMetering: false,
            hasAccessControl: false
        };
    }

    /**
     * Валидация для серверного шкафа
     * Проверяет тепловой баланс, плотность мощности, airflow
     */
    validateEquipment(equipment) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Проверка воздушного потока
        if (equipment.specs && equipment.specs.airflowDirection) {
            const eqAirflow = equipment.specs.airflowDirection;
            const cabAirflow = this.cooling.airflowType;
            
            if (eqAirflow !== 'passive' && 
                cabAirflow !== 'passive' && 
                eqAirflow !== cabAirflow) {
                result.warnings.push(
                    `Направление воздушного потока оборудования (${eqAirflow}) ` +
                    `не соответствует конфигурации шкафа (${cabAirflow})`
                );
            }
        }

        // Проверка плотности мощности
        if (equipment.specs && equipment.specs.power && equipment.mounting) {
            const eqUnits = equipment.mounting.rackUnits || 1;
            const powerDensity = equipment.specs.power * PHYSICAL.W_TO_KW / eqUnits; // кВт/U
            
            if (powerDensity > this.power.maxPowerDensity) {
                result.warnings.push(
                    `Плотность мощности оборудования (${powerDensity.toFixed(2)}кВт/U) ` +
                    `превышает рекомендуемую (${this.power.maxPowerDensity}кВт/U)`
                );
            }
        }

        // Проверка высоты для серверов
        if (equipment.category === 'server' && 
            equipment.mounting && 
            equipment.mounting.rackUnits > 4) {
            result.warnings.push(
                'Высокопрофильное серверное оборудование может ограничить вентиляцию'
            );
        }

        return result;
    }

    /**
     * Расчёт метрик для серверного шкафа
     */
    calculateTypeSpecificMetrics(equipmentList) {
        const metrics = {
            totalPower: 0,              // Суммарная мощность (кВт)
            totalHeatLoad: 0,           // Тепловая нагрузка (кВт)
            powerDensity: 0,            // Средняя плотность (кВт/U)
            coolingRequired: 0,         // Требуемая мощность охлаждения (кВт)
            coolingAdequacy: 'unknown', // adequate, insufficient, oversized
            airflowBalance: 'unknown',  // balanced, restricted, turbulent
            redundancyStatus: 'unknown' // ok, at_risk, insufficient
        };

        let totalUnits = 0;

        equipmentList.forEach(eq => {
            if (eq.specs) {
                const power = (eq.specs.power || 0) * PHYSICAL.W_TO_KW; // Вт -> кВт
                metrics.totalPower += power;
                metrics.totalHeatLoad += eq.specs.heatDissipation 
                    ? eq.specs.heatDissipation * PHYSICAL.W_TO_KW 
                    : power; // Если нет heatDissipation, приравнять к power
            }
            if (eq.mounting && eq.mounting.rackUnits) {
                totalUnits += eq.mounting.rackUnits;
            }
        });

        if (totalUnits > 0) {
            metrics.powerDensity = metrics.totalPower / totalUnits;
        }

        // Требуемая мощность охлаждения (обычно ~1:1 с тепловой нагрузкой)
        metrics.coolingRequired = metrics.totalHeatLoad;

        // Оценка адекватности охлаждения
        const coolingCapacity = this.cooling.coolingCapacity;
        if (coolingCapacity === 0) {
            metrics.coolingAdequacy = 'none';
        } else if (metrics.coolingRequired > coolingCapacity) {
            metrics.coolingAdequacy = 'insufficient';
        } else if (metrics.coolingRequired < coolingCapacity * 0.5) {
            metrics.coolingAdequacy = 'oversized';
        } else {
            metrics.coolingAdequacy = 'adequate';
        }

        // Упрощённая оценка воздушного потока
        if (this.cooling.airflowType === 'passive' && metrics.totalPower > 1.5) {
            metrics.airflowBalance = 'restricted';
        } else if (this.cooling.hasHotAisle && this.cooling.hasColdAisle) {
            metrics.airflowBalance = 'balanced';
        } else {
            metrics.airflowBalance = 'moderate';
        }

        // Оценка резервирования питания
        if (this.power.redundancy === 'none' && metrics.totalPower > 5) {
            metrics.redundancyStatus = 'at_risk';
        } else if (this.power.redundancy !== 'none') {
            metrics.redundancyStatus = 'ok';
        } else {
            metrics.redundancyStatus = 'acceptable';
        }

        return metrics;
    }

    /**
     * Рекомендации для серверного шкафа
     */
    getConfigurationRecommendations(equipmentList) {
        const recommendations = [];
        const metrics = this.calculateTypeSpecificMetrics(equipmentList);

        // Проверка охлаждения
        if (metrics.coolingAdequacy === 'insufficient') {
            recommendations.push({
                severity: 'error',
                message: 'Недостаточная мощность охлаждения',
                suggestion: `Требуется ${metrics.coolingRequired.toFixed(2)}кВт, доступно ${this.cooling.coolingCapacity}кВт`
            });
        } else if (metrics.coolingAdequacy === 'none' && metrics.totalHeatLoad > 1) {
            recommendations.push({
                severity: 'error',
                message: 'Требуется система активного охлаждения',
                suggestion: `Тепловая нагрузка: ${metrics.totalHeatLoad.toFixed(2)}кВт`
            });
        }

        // Проверка плотности мощности
        if (metrics.powerDensity > this.power.maxPowerDensity) {
            recommendations.push({
                severity: 'warning',
                message: 'Высокая плотность мощности',
                suggestion: `${metrics.powerDensity.toFixed(2)}кВт/U (макс: ${this.power.maxPowerDensity}кВт/U)`
            });
        }

        // Проверка воздушного потока
        if (metrics.airflowBalance === 'restricted') {
            recommendations.push({
                severity: 'warning',
                message: 'Ограниченная циркуляция воздуха',
                suggestion: 'Рекомендуется активная система вентиляции или реорганизация Hot/Cold Aisle'
            });
        }

        // Проверка резервирования
        if (metrics.redundancyStatus === 'at_risk') {
            recommendations.push({
                severity: 'warning',
                message: 'Отсутствует резервирование питания',
                suggestion: `При мощности ${metrics.totalPower.toFixed(2)}кВт рекомендуется N+1 или 2N`
            });
        }

        // Проверка мониторинга
        if (metrics.totalPower > 3 && !this.monitoring.hasTemperatureSensors) {
            recommendations.push({
                severity: 'info',
                message: 'Рекомендуется установка датчиков температуры',
                suggestion: 'Для критичных серверных конфигураций требуется мониторинг'
            });
        }

        // Проверка суммарной мощности
        if (metrics.totalPower > this.getMaxPower() * PHYSICAL.W_TO_KW) {
            recommendations.push({
                severity: 'error',
                message: 'Превышена максимальная мощность шкафа',
                suggestion: `${metrics.totalPower.toFixed(2)}кВт > ${(this.getMaxPower() * PHYSICAL.W_TO_KW).toFixed(2)}кВт`
            });
        }

        return recommendations;
    }

    /**
     * Проверка наличия активного охлаждения
     */
    hasActiveCooling() {
        return this.cooling.hasActiveCooling;
    }

    /**
     * Проверка организации Hot/Cold Aisle
     */
    hasAisleContainment() {
        return this.cooling.hasHotAisle || this.cooling.hasColdAisle;
    }

    /**
     * Получить тип резервирования питания
     */
    getPowerRedundancy() {
        return this.power.redundancy;
    }

    /**
     * Проверка наличия мониторинга
     */
    hasMonitoring() {
        return this.monitoring.hasTemperatureSensors || 
               this.monitoring.hasPowerMetering;
    }
}
