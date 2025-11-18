/**
 * WeightRule — Проверка весовых ограничений
 */
import { ValidationRule } from '../ValidationEngine.js';

export class WeightRule extends ValidationRule {
    constructor() {
        super('WeightRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.specs || equipment.specs.weight === undefined) {
            result.info.push({
                rule: this.name,
                message: 'Вес оборудования не указан, проверка пропущена'
            });
            return result;
        }

        const eqWeight = equipment.specs.weight;
        const maxLoad = cabinetType.getMaxLoad();

        if (maxLoad === 0) {
            result.info.push({
                rule: this.name,
                message: 'Максимальная нагрузка шкафа не определена'
            });
            return result;
        }

        // Текущий вес в контексте
        const currentWeight = context.totalWeight || 0;
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
