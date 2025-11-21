/**
 * TelecomLogicPlugin — расчёты для телекоммуникационных шкафов
 * Заполнение юнитов, потребление тока, кабель-менеджмент
 */
import { LogicPlugin } from '../LogicEngine.js';
import { ELECTRICAL, DEFAULTS } from '../../constants/PhysicalConstants.js';

export class TelecomLogicPlugin extends LogicPlugin {
    constructor() {
        super('TelecomLogicPlugin');
    }

    calculate(cabinetType, equipmentList) {
        const calculations = {
            // Rack Units
            totalRackUnits: cabinetType.getRackUnits() || DEFAULTS.RACK_HEIGHT_U,
            usedRackUnits: 0,
            availableRackUnits: 0,
            utilizationPercent: 0,
            
            // Питание
            totalPower: 0,              // Вт
            totalCurrent: 0,            // А (при 230В)
            voltage: ELECTRICAL.STANDARD_VOLTAGE_V,
            phases: cabinetType.power?.phases || DEFAULTS.PHASES,
            maxCurrent: cabinetType.power?.maxCurrent || DEFAULTS.MAX_CURRENT_A,
            
            // Кабели
            cableLoad: 0,               // кг
            maxCableLoad: cabinetType.cabling?.maxCableLoad || 0,
            
            // Статус
            requiresPDU: false,
            requiresCableManager: false,
            isOverloaded: false
        };

        const recommendations = [];
        const warnings = [];

        // Суммирование характеристик
        equipmentList.forEach(eq => {
            // Rack Units
            if (eq.mounting && eq.mounting.rackUnits) {
                calculations.usedRackUnits += eq.mounting.rackUnits;
            }
            
            // Питание
            if (eq.specs && eq.specs.power) {
                calculations.totalPower += eq.specs.power;
            }
            
            // Кабели
            if (eq.specs && eq.specs.cableWeight) {
                calculations.cableLoad += eq.specs.cableWeight;
            }
        });

        // Расчёт доступных юнитов
        calculations.availableRackUnits = calculations.totalRackUnits - calculations.usedRackUnits;
        calculations.utilizationPercent = (calculations.usedRackUnits / calculations.totalRackUnits) * 100;

        // Расчёт тока (P = U * I * cosφ, упрощённо cosφ = 1)
        calculations.totalCurrent = calculations.totalPower / calculations.voltage;

        // Проверка заполнения
        if (calculations.utilizationPercent > 90) {
            warnings.push(`Высокое заполнение: ${calculations.utilizationPercent.toFixed(1)}%`);
            
            recommendations.push({
                severity: 'warning',
                type: 'space',
                message: 'Почти все юниты заняты',
                value: calculations.usedRackUnits,
                available: calculations.totalRackUnits,
                suggestion: `Свободно только ${calculations.availableRackUnits}U`
            });
        }

        if (calculations.utilizationPercent > 80) {
            recommendations.push({
                severity: 'info',
                type: 'cooling',
                message: 'Высокая плотность монтажа',
                suggestion: 'При заполнении >80% рекомендуется активная вентиляция'
            });
        }

        // Проверка PDU
        const hasPDU = cabinetType.power?.hasPDU;
        calculations.requiresPDU = calculations.totalCurrent > 0 && !hasPDU;
        
        if (calculations.requiresPDU) {
            recommendations.push({
                severity: 'error',
                type: 'pdu',
                message: 'Требуется PDU (блок распределения питания)',
                value: calculations.totalCurrent,
                suggestion: `Суммарный ток: ${calculations.totalCurrent.toFixed(1)}А`
            });
        } else if (hasPDU && calculations.totalCurrent > calculations.maxCurrent) {
            warnings.push(`Ток ${calculations.totalCurrent.toFixed(1)}А превышает максимум ${calculations.maxCurrent}А`);
            
            recommendations.push({
                severity: 'error',
                type: 'pdu',
                message: 'Превышена мощность PDU',
                value: calculations.totalCurrent,
                available: calculations.maxCurrent,
                suggestion: `Требуется PDU на ${Math.ceil(calculations.totalCurrent)}А или выше`
            });
        }

        // Проверка кабель-менеджмента
        const hasCableManager = cabinetType.cabling?.hasVerticalCableManager || 
                               cabinetType.cabling?.hasHorizontalCableManager;
        calculations.requiresCableManager = calculations.cableLoad > 0 && !hasCableManager;
        
        if (calculations.requiresCableManager) {
            recommendations.push({
                severity: 'warning',
                type: 'cable',
                message: 'Рекомендуется кабель-организатор',
                value: calculations.cableLoad,
                suggestion: `Нагрузка на кабели: ${calculations.cableLoad.toFixed(1)}кг`
            });
        }

        if (calculations.maxCableLoad > 0 && calculations.cableLoad > calculations.maxCableLoad) {
            warnings.push(`Нагрузка на кабели ${calculations.cableLoad.toFixed(1)}кг превышает максимум ${calculations.maxCableLoad}кг`);
        }

        // Проверка на автомат 16А
        if (calculations.totalCurrent > DEFAULTS.MAX_CURRENT_A) {
            recommendations.push({
                severity: 'warning',
                type: 'circuit',
                message: 'Требуется автоматический выключатель повышенной мощности',
                value: calculations.totalCurrent,
                suggestion: `Стандартный автомат ${DEFAULTS.MAX_CURRENT_A}А недостаточен, требуется ${Math.ceil(calculations.totalCurrent / 5) * 5}А`
            });
        }

        return {
            category: 'telecom',
            calculations,
            recommendations,
            warnings
        };
    }
}
