/**
 * PowerRule — Проверка энергопотребления
 */
import { ValidationRule } from '../ValidationEngine.js';

export class PowerRule extends ValidationRule {
    constructor() {
        super('PowerRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.specs || equipment.specs.power === undefined) {
            result.info.push({
                rule: this.name,
                message: 'Энергопотребление оборудования не указано'
            });
            return result;
        }

        const eqPower = equipment.specs.power; // Вт
        const maxPower = cabinetType.getMaxPower(); // Вт

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
        } else if (newTotalPower > maxPower * 0.9) {
            result.warnings.push({
                rule: this.name,
                message: `Суммарная мощность (${newTotalPower}Вт) близка к максимальной (${maxPower}Вт)`
            });
        } else if (newTotalPower > maxPower * 0.75) {
            result.info.push({
                rule: this.name,
                message: `Загрузка по мощности: ${((newTotalPower / maxPower) * 100).toFixed(1)}%`
            });
        }

        // Проверка тока (упрощённо: P = U * I, I = P / U)
        const voltage = 230; // В (стандартная сеть)
        const current = newTotalPower / voltage; // А
        
        if (current > 16) { // Стандартный автомат 16А
            result.warnings.push({
                rule: this.name,
                message: `Расчётный ток (${current.toFixed(1)}А) превышает стандартный автомат 16А`
            });
        }

        return result;
    }
}
