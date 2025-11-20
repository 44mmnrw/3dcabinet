/**
 * ServerLogicPlugin — расчёты для серверных шкафов
 * Плотность мощности, охлаждение, airflow, резервирование
 */
import { LogicPlugin } from '../LogicEngine.js';

export class ServerLogicPlugin extends LogicPlugin {
    constructor() {
        super('ServerLogicPlugin');
    }

    calculate(cabinetType, equipmentList) {
        const calculations = {
            // Мощность
            totalPower: 0,              // кВт
            totalHeatLoad: 0,           // кВт (тепловыделение)
            usedRackUnits: 0,
            powerDensity: 0,            // кВт/U
            maxPowerDensity: cabinetType.power?.maxPowerDensity || 0.5,
            
            // Охлаждение
            coolingRequired: 0,         // кВт
            coolingAvailable: cabinetType.cooling?.coolingCapacity || 0,
            coolingAdequacy: 'unknown',
            airflowType: cabinetType.cooling?.airflowType || 'passive',
            airflowBalance: 'unknown',
            
            // Резервирование
            redundancy: cabinetType.power?.redundancy || 'none',
            redundancyStatus: 'unknown',
            
            // Статус
            isOverloaded: false,
            needsActiveCooling: false,
            needsRedundancy: false
        };

        const recommendations = [];
        const warnings = [];

        // Суммирование
        equipmentList.forEach(eq => {
            if (eq.specs) {
                const power = (eq.specs.power || 0) * PHYSICAL.W_TO_KW; // Вт -> кВт
                calculations.totalPower += power;
                
                // Тепловыделение = мощность (упрощённо)
                const heat = eq.specs.heatDissipation 
                    ? eq.specs.heatDissipation * PHYSICAL.W_TO_KW 
                    : power;
                calculations.totalHeatLoad += heat;
            }
            
            if (eq.mounting && eq.mounting.rackUnits) {
                calculations.usedRackUnits += eq.mounting.rackUnits;
            }
        });

        // Плотность мощности
        if (calculations.usedRackUnits > 0) {
            calculations.powerDensity = calculations.totalPower / calculations.usedRackUnits;
        }

        // Требования к охлаждению (1:1 с тепловой нагрузкой)
        calculations.coolingRequired = calculations.totalHeatLoad;

        // Оценка охлаждения
        if (calculations.coolingAvailable === 0) {
            if (calculations.totalHeatLoad > 1) {
                calculations.coolingAdequacy = 'none';
                calculations.needsActiveCooling = true;
                
                recommendations.push({
                    severity: 'error',
                    type: 'cooling',
                    message: 'Требуется система активного охлаждения',
                    value: calculations.totalHeatLoad,
                    suggestion: `Тепловая нагрузка: ${calculations.totalHeatLoad.toFixed(2)}кВт`
                });
            } else {
                calculations.coolingAdequacy = 'passive_sufficient';
            }
        } else if (calculations.coolingRequired > calculations.coolingAvailable) {
            calculations.coolingAdequacy = 'insufficient';
            calculations.needsActiveCooling = true;
            
            warnings.push(`Охлаждение ${calculations.coolingAvailable}кВт < требуется ${calculations.coolingRequired.toFixed(2)}кВт`);
            
            recommendations.push({
                severity: 'error',
                type: 'cooling',
                message: 'Недостаточная мощность охлаждения',
                value: calculations.coolingRequired,
                available: calculations.coolingAvailable,
                suggestion: `Требуется ${calculations.coolingRequired.toFixed(2)}кВт, доступно ${calculations.coolingAvailable}кВт`
            });
        } else if (calculations.coolingRequired > calculations.coolingAvailable * 0.8) {
            calculations.coolingAdequacy = 'near_limit';
            
            recommendations.push({
                severity: 'warning',
                type: 'cooling',
                message: 'Мощность охлаждения близка к максимальной',
                suggestion: 'Рекомендуется запас 20-30%'
            });
        } else {
            calculations.coolingAdequacy = 'adequate';
        }

        // Проверка плотности мощности
        if (calculations.powerDensity > calculations.maxPowerDensity) {
            warnings.push(`Плотность мощности ${calculations.powerDensity.toFixed(2)}кВт/U превышает рекомендуемую ${calculations.maxPowerDensity}кВт/U`);
            
            recommendations.push({
                severity: 'warning',
                type: 'power_density',
                message: 'Высокая плотность мощности',
                value: calculations.powerDensity,
                available: calculations.maxPowerDensity,
                suggestion: 'Рекомендуется распределить нагрузку или усилить охлаждение'
            });
        }

        // Airflow
        if (calculations.airflowType === 'passive' && calculations.totalPower > 1.5) {
            calculations.airflowBalance = 'restricted';
            
            recommendations.push({
                severity: 'warning',
                type: 'airflow',
                message: 'Ограниченная циркуляция воздуха',
                suggestion: 'При мощности >1.5кВт рекомендуется активная вентиляция'
            });
        } else if (cabinetType.cooling?.hasHotAisle && cabinetType.cooling?.hasColdAisle) {
            calculations.airflowBalance = 'balanced';
        } else {
            calculations.airflowBalance = 'moderate';
        }

        // Резервирование
        if (calculations.redundancy === 'none' && calculations.totalPower > 5) {
            calculations.redundancyStatus = 'at_risk';
            calculations.needsRedundancy = true;
            
            recommendations.push({
                severity: 'warning',
                type: 'redundancy',
                message: 'Отсутствует резервирование питания',
                suggestion: `При мощности ${calculations.totalPower.toFixed(2)}кВт рекомендуется N+1 или 2N`
            });
        } else if (calculations.redundancy !== 'none') {
            calculations.redundancyStatus = 'ok';
        } else {
            calculations.redundancyStatus = 'acceptable';
        }

        // Проверка перегрузки
        const maxPower = cabinetType.getMaxPower() * PHYSICAL.W_TO_KW; // Вт -> кВт
        if (calculations.totalPower > maxPower) {
            calculations.isOverloaded = true;
            warnings.push(`Мощность ${calculations.totalPower.toFixed(2)}кВт превышает максимум ${maxPower.toFixed(2)}кВт`);
            
            recommendations.push({
                severity: 'error',
                type: 'power',
                message: 'Превышена максимальная мощность шкафа',
                value: calculations.totalPower,
                available: maxPower,
                suggestion: `Требуется снизить на ${(calculations.totalPower - maxPower).toFixed(2)}кВт`
            });
        }

        return {
            category: 'server',
            calculations,
            recommendations,
            warnings
        };
    }
}
