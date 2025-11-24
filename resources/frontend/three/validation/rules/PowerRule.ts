/**
 * PowerRule — Проверка энергопотребления
 */
import { ValidationRule } from '../ValidationEngine.ts';
import type { ValidationContext, RuleValidationResult } from '../ValidationEngine.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';
import { ELECTRICAL, DEFAULTS, VALIDATION_THRESHOLDS } from '../../constants/PhysicalConstants.ts';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    getMaxPower?: () => number;
    [key: string]: unknown;
}

export class PowerRule extends ValidationRule {
    constructor() {
        super('PowerRule');
    }

    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext): Promise<RuleValidationResult> {
        const result: RuleValidationResult = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.specifications || equipment.specifications.power === undefined) {
            result.info.push({
                rule: this.name,
                message: 'Энергопотребление оборудования не указано'
            });
            return result;
        }

        const eqPower = equipment.specifications.power; // Вт
        const maxPower = cabinetType.getMaxPower ? cabinetType.getMaxPower() : 0; // Вт

        if (maxPower === 0) {
            result.info.push({
                rule: this.name,
                message: 'Максимальная мощность шкафа не определена'
            });
            return result;
        }

        // Текущее потребление в контексте
        const currentPower = context.totalPower || 0;
        const newTotalPower = currentPower + eqPower;

        // Проверка превышения лимита
        if (newTotalPower > maxPower) {
            result.errors.push({
                rule: this.name,
                message: `Суммарная мощность (${newTotalPower}Вт) превысит максимальную (${maxPower}Вт)`
            });
        } else if (newTotalPower > maxPower * VALIDATION_THRESHOLDS.CRITICAL_WARNING_PERCENT) {
            result.warnings.push({
                rule: this.name,
                message: `Суммарная мощность (${newTotalPower}Вт) близка к максимальной (${maxPower}Вт)`
            });
        } else if (newTotalPower > maxPower * VALIDATION_THRESHOLDS.INFO_THRESHOLD_PERCENT) {
            result.info.push({
                rule: this.name,
                message: `Загрузка по мощности: ${((newTotalPower / maxPower) * 100).toFixed(1)}%`
            });
        }

        // Проверка тока (упрощённо: P = U * I, I = P / U)
        const voltage = ELECTRICAL.STANDARD_VOLTAGE_V;
        const current = newTotalPower / voltage; // А
        
        if (current > DEFAULTS.MAX_CURRENT_A) {
            result.warnings.push({
                rule: this.name,
                message: `Расчётный ток (${current.toFixed(1)}А) превышает стандартный автомат ${DEFAULTS.MAX_CURRENT_A}А`
            });
        }

        return result;
    }
}

