/**
 * ThermalLogicPlugin — расчёты для термошкафов
 * Тепловой баланс, энергопотребление, рекомендации по климат-контролю
 */
import { LogicPlugin } from '../LogicEngine.ts';
import { THERMAL, DEFAULTS, PHYSICAL } from '../../constants/PhysicalConstants.ts';
import type { CabinetType } from '../../types/CabinetType.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';

export interface ThermalCalculations {
    totalPower: number;
    totalHeatDissipation: number;
    totalWeight: number;
    heatingAvailable: number;
    coolingAvailable: number;
    heatingRequired: number;
    coolingRequired: number;
    thermalBalance: 'unknown' | 'insufficient_cooling' | 'near_limit' | 'balanced';
    ambientTemp: number;
    internalTemp: number;
    tempRise: number;
    isOverheating: boolean;
    needsHeating: boolean;
    needsCooling: boolean;
    [key: string]: unknown;
}

export interface Recommendation {
    severity: 'error' | 'warning' | 'info';
    type: string;
    message: string;
    value?: number;
    available?: number;
    suggestion: string;
    [key: string]: unknown;
}

export interface ThermalResult {
    category: string;
    calculations: ThermalCalculations;
    recommendations: Recommendation[];
    warnings: string[];
}

export class ThermalLogicPlugin extends LogicPlugin {
    constructor() {
        super('ThermalLogicPlugin');
    }

    calculate(cabinetType: CabinetType, equipmentList: EquipmentConfig[]): ThermalResult {
        const calculations: ThermalCalculations = {
            // Суммарные значения
            totalPower: 0,              // Вт
            totalHeatDissipation: 0,    // Вт
            totalWeight: 0,             // кг
            
            // Тепловой баланс
            heatingAvailable: (cabinetType as any).thermal?.heatingPower || 0,
            coolingAvailable: (cabinetType as any).thermal?.coolingPower || 0,
            heatingRequired: 0,
            coolingRequired: 0,
            thermalBalance: 'unknown',
            
            // Температурный режим
            ambientTemp: DEFAULTS.AMBIENT_TEMP_C,
            internalTemp: DEFAULTS.AMBIENT_TEMP_C,
            tempRise: 0,                // °C (повышение от оборудования)
            
            // Статус
            isOverheating: false,
            needsHeating: false,
            needsCooling: false
        };

        const recommendations: Recommendation[] = [];
        const warnings: string[] = [];

        // Суммирование характеристик оборудования
        equipmentList.forEach(eq => {
            if (eq.specifications) {
                calculations.totalPower += eq.specifications.power || 0;
                const heatDissipation = (eq.specifications as any).heatDissipation;
                calculations.totalHeatDissipation += heatDissipation || eq.specifications.power || 0;
                const weight = (eq.specifications as any).weight;
                calculations.totalWeight += weight || 0;
            }
        });

        // Расчёт требований к охлаждению
        // Упрощённо: всё тепловыделение должно отводиться
        calculations.coolingRequired = calculations.totalHeatDissipation;

        // Оценка повышения температуры (упрощённая формула)
        // ΔT = P / (k * V), где P - мощность, k - коэффициент теплопередачи, V - объём
        const dimensions = cabinetType.dimensions || {};
        const dims = (typeof dimensions === 'object' && dimensions !== null && 'width' in dimensions && 'height' in dimensions && 'depth' in dimensions) 
            ? dimensions as { width: number; height: number; depth: number }
            : { width: 0, height: 0, depth: 0 };
        const width = dims.width || 0;
        const height = dims.height || 0;
        const depth = dims.depth || 0;
        const volume = (width * height * depth) / (PHYSICAL.M_TO_MM ** 3); // м³
        const heatTransferCoef = THERMAL.HEAT_TRANSFER_COEFFICIENT;
        calculations.tempRise = calculations.totalHeatDissipation / (heatTransferCoef * volume);
        calculations.internalTemp = calculations.ambientTemp + calculations.tempRise;

        // Проверка перегрева
        const maxTemp = (cabinetType as any).thermal?.operatingTemp?.max || 55;
        if (calculations.internalTemp > maxTemp) {
            calculations.isOverheating = true;
            warnings.push(`Перегрев: расчётная температура ${calculations.internalTemp.toFixed(1)}°C > ${maxTemp}°C`);
        }

        // Оценка теплового баланса
        if (calculations.coolingRequired > calculations.coolingAvailable) {
            calculations.thermalBalance = 'insufficient_cooling';
            calculations.needsCooling = true;
            
            recommendations.push({
                severity: 'error',
                type: 'cooling',
                message: 'Недостаточная мощность охлаждения',
                value: calculations.coolingRequired,
                available: calculations.coolingAvailable,
                suggestion: `Требуется система охлаждения минимум ${calculations.coolingRequired.toFixed(0)}Вт`
            });
        } else if (calculations.coolingRequired > calculations.coolingAvailable * 0.8) {
            calculations.thermalBalance = 'near_limit';
            
            recommendations.push({
                severity: 'warning',
                type: 'cooling',
                message: 'Мощность охлаждения близка к максимальной',
                value: calculations.coolingRequired,
                available: calculations.coolingAvailable,
                suggestion: 'Рекомендуется запас мощности 20-30%'
            });
        } else {
            calculations.thermalBalance = 'balanced';
        }

        // Проверка необходимости обогрева (для outdoor шкафов)
        const minTemp = (cabinetType as any).thermal?.operatingTemp?.min || -40;
        if (minTemp < 0 && !(cabinetType as any).climate?.hasHeater) {
            recommendations.push({
                severity: 'warning',
                type: 'heating',
                message: 'Для работы при отрицательных температурах требуется обогрев',
                suggestion: `Рабочий диапазон: ${minTemp}°C..${maxTemp}°C, рекомендуется обогреватель ${calculations.heatingAvailable || DEFAULTS.HEATING_POWER_W}Вт`
            });
        }

        // Проверка энергопотребления
        const maxPower = cabinetType.getMaxPower();
        if (calculations.totalPower > maxPower) {
            warnings.push(`Суммарная мощность ${calculations.totalPower}Вт превышает максимум ${maxPower}Вт`);
            
            recommendations.push({
                severity: 'error',
                type: 'power',
                message: 'Превышена максимальная мощность',
                value: calculations.totalPower,
                available: maxPower,
                suggestion: `Требуется снизить потребление на ${calculations.totalPower - maxPower}Вт`
            });
        }

        // Проверка веса
        const maxLoad = cabinetType.getMaxLoad();
        if (calculations.totalWeight > maxLoad) {
            warnings.push(`Суммарный вес ${calculations.totalWeight.toFixed(1)}кг превышает максимум ${maxLoad}кг`);
            
            recommendations.push({
                severity: 'error',
                type: 'weight',
                message: 'Превышена максимальная нагрузка',
                value: calculations.totalWeight,
                available: maxLoad,
                suggestion: `Требуется снизить вес на ${(calculations.totalWeight - maxLoad).toFixed(1)}кг`
            });
        }

        return {
            category: 'thermal',
            calculations,
            recommendations,
            warnings
        };
    }
}

