/**
 * WeightRule — Проверка весовых ограничений
 */
import { ValidationRule } from '../ValidationEngine.ts';
import type { ValidationContext, RuleValidationResult } from '../ValidationEngine.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    getMaxLoad?: () => number;
    [key: string]: unknown;
}

export class WeightRule extends ValidationRule {
    constructor() {
        super('WeightRule');
    }

    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext): Promise<RuleValidationResult> {
        const result: RuleValidationResult = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.specifications || equipment.specifications['weight'] === undefined) {
            result.info.push({
                rule: this.name,
                message: 'Вес оборудования не указан, проверка пропущена'
            });
            return result;
        }

        const eqWeightRaw = equipment.specifications['weight'];
        const eqWeight = typeof eqWeightRaw === 'number' ? eqWeightRaw : 0;
        const maxLoad = cabinetType.getMaxLoad ? cabinetType.getMaxLoad() : 0;

        if (maxLoad === 0) {
            result.info.push({
                rule: this.name,
                message: 'Максимальная нагрузка шкафа не определена'
            });
            return result;
        }

        if (eqWeight <= 0) {
            return result;
        }

        // Текущий вес в контексте
        const currentWeight = typeof context.totalWeight === 'number' ? context.totalWeight : 0;
        const newTotalWeight = currentWeight + eqWeight;

        // Проверка превышения лимита
        if (newTotalWeight > maxLoad) {
            result.errors.push({
                rule: this.name,
                message: `Суммарный вес (${newTotalWeight.toFixed(1)}кг) превысит максимальную нагрузку (${maxLoad}кг)`
            });
        } else if (newTotalWeight > maxLoad * 0.9) {
            result.warnings.push({
                rule: this.name,
                message: `Суммарный вес (${newTotalWeight.toFixed(1)}кг) близок к максимальной нагрузке (${maxLoad}кг)`
            });
        } else if (newTotalWeight > maxLoad * 0.75) {
            result.info.push({
                rule: this.name,
                message: `Загрузка по весу: ${((newTotalWeight / maxLoad) * 100).toFixed(1)}%`
            });
        }

        return result;
    }
}

