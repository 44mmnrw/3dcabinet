/**
 * TelecomLogicPlugin — расчёты для телекоммуникационных шкафов
 * Заполнение юнитов, потребление тока, кабель-менеджмент
 */
import { LogicPlugin } from '../LogicEngine.ts';
import { ELECTRICAL, DEFAULTS } from '../../constants/PhysicalConstants.ts';
import type { CabinetType } from '../../types/CabinetType.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';

export interface TelecomCalculations {
    totalRackUnits: number;
    usedRackUnits: number;
    availableRackUnits: number;
    utilizationPercent: number;
    totalPower: number;
    totalCurrent: number;
    voltage: number;
    phases: number;
    maxCurrent: number;
    cableLoad: number;
    maxCableLoad: number;
    requiresPDU: boolean;
    requiresCableManager: boolean;
    isOverloaded: boolean;
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

export interface TelecomResult {
    category: string;
    calculations: TelecomCalculations;
    recommendations: Recommendation[];
    warnings: string[];
}

export class TelecomLogicPlugin extends LogicPlugin {
    constructor() {
        super('TelecomLogicPlugin');
    }

    calculate(cabinetType: CabinetType, equipmentList: EquipmentConfig[]): TelecomResult {
        const calculations: TelecomCalculations = {
            // Rack Units
            totalRackUnits: (cabinetType as any).getRackUnits?.() || DEFAULTS.RACK_HEIGHT_U,
            usedRackUnits: 0,
            availableRackUnits: 0,
            utilizationPercent: 0,
            
            // Питание
            totalPower: 0,              // Вт
            totalCurrent: 0,            // А (при 230В)
            voltage: ELECTRICAL.STANDARD_VOLTAGE_V,
            phases: (cabinetType as any).power?.phases || DEFAULTS.PHASES,
            maxCurrent: (cabinetType as any).power?.maxCurrent || DEFAULTS.MAX_CURRENT_A,
            
            // Кабели
            cableLoad: 0,               // кг
            maxCableLoad: (cabinetType as any).cabling?.maxCableLoad || 0,
            
            // Статус
            requiresPDU: false,
            requiresCableManager: false,
            isOverloaded: false
        };

        const recommendations: Recommendation[] = [];
        const warnings: string[] = [];

        // Суммирование характеристик
        equipmentList.forEach(eq => {
            // Rack Units
            if (eq.mounting && 'rackUnits' in eq.mounting) {
                const rackUnits = (eq.mounting as any).rackUnits;
                if (rackUnits) {
                    calculations.usedRackUnits += rackUnits;
                }
            }
            
            // Питание
            if (eq.specifications && eq.specifications.power) {
                calculations.totalPower += eq.specifications.power;
            }
            
            // Кабели
            if (eq.specifications && (eq.specifications as any).cableWeight) {
                calculations.cableLoad += (eq.specifications as any).cableWeight;
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
        const hasPDU = (cabinetType as any).power?.hasPDU;
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
        const hasCableManager = (cabinetType as any).cabling?.hasVerticalCableManager || 
                               (cabinetType as any).cabling?.hasHorizontalCableManager;
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

