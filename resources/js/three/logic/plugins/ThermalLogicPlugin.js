/**
 * ThermalLogicPlugin — расчёты для термошкафов
 * Тепловой баланс, энергопотребление, рекомендации по климат-контролю
 */
import { LogicPlugin } from '../LogicEngine.js';

export class ThermalLogicPlugin extends LogicPlugin {
    constructor() {
        super('ThermalLogicPlugin');
    }

    calculate(cabinetType, equipmentList) {
        const calculations = {
            // Суммарные значения
            totalPower: 0,              // Вт
            totalHeatDissipation: 0,    // Вт
            totalWeight: 0,             // кг
            
            // Тепловой баланс
            heatingAvailable: cabinetType.thermal?.heatingPower || 0,
            coolingAvailable: cabinetType.thermal?.coolingPower || 0,
            heatingRequired: 0,
            coolingRequired: 0,
            thermalBalance: 'unknown',
            
            // Температурный режим
            ambientTemp: 25,            // °C (предполагаемая)
            internalTemp: 25,           // °C (расчётная)
            tempRise: 0,                // °C (повышение от оборудования)
            
            // Статус
            isOverheating: false,
            needsHeating: false,
            needsCooling: false
        };

        const recommendations = [];
        const warnings = [];

        // Суммирование характеристик оборудования
        equipmentList.forEach(eq => {
            if (eq.specs) {
                calculations.totalPower += eq.specs.power || 0;
                calculations.totalHeatDissipation += eq.specs.heatDissipation || eq.specs.power || 0;
                calculations.totalWeight += eq.specs.weight || 0;
            }
        });

        // Расчёт требований к охлаждению
        // Упрощённо: всё тепловыделение должно отводиться
        calculations.coolingRequired = calculations.totalHeatDissipation;

        // Оценка повышения температуры (упрощённая формула)
        // ΔT = P / (k * V), где P - мощность, k - коэффициент теплопередачи, V - объём
        const volume = (cabinetType.dimensions.width * cabinetType.dimensions.height * cabinetType.dimensions.depth) / 1e9; // м³
        const heatTransferCoef = 0.5; // Вт/(м³·°C) (упрощённо)
        calculations.tempRise = calculations.totalHeatDissipation / (heatTransferCoef * volume);
        calculations.internalTemp = calculations.ambientTemp + calculations.tempRise;

        // Проверка перегрева
        const maxTemp = cabinetType.thermal?.operatingTemp?.max || 55;
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
        const minTemp = cabinetType.thermal?.operatingTemp?.min || -40;
        if (minTemp < 0 && !cabinetType.climate?.hasHeater) {
            recommendations.push({
                severity: 'warning',
                type: 'heating',
                message: 'Для работы при отрицательных температурах требуется обогрев',
                suggestion: `Рабочий диапазон: ${minTemp}°C..${maxTemp}°C, рекомендуется обогреватель ${calculations.heatingAvailable || 500}Вт`
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
