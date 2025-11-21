/**
 * ThermalRule — Проверка тепловыделения (заглушка для Phase 2)
 */
import { ValidationRule } from '../ValidationEngine.js';

export class ThermalRule extends ValidationRule {
    constructor() {
        super('ThermalRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
            errors: [],
            warnings: [],
            info: []
        };

        // TODO: Реализация в Phase 2 (интеграция с LogicEngine)
        
        if (!equipment.specs || equipment.specs.heatDissipation === undefined) {
            result.info.push({
                rule: this.name,
                message: '[Phase 2] Тепловыделение не указано'
            });
            return result;
        }

        const heatOutput = equipment.specs.heatDissipation; // Вт
        const coolingSpec = cabinetType.getCoolingSpec();

        if (!coolingSpec) {
            result.info.push({
                rule: this.name,
                message: '[Phase 2] Параметры охлаждения шкафа не определены'
            });
            return result;
        }

        // Текущее тепловыделение в контексте
        const currentHeat = context.totalHeat || 0;
        const newTotalHeat = currentHeat + heatOutput;

        // Упрощённая проверка (детальный расчёт в LogicEngine)
        if (coolingSpec.capacity && newTotalHeat > coolingSpec.capacity) {
            result.warnings.push({
                rule: this.name,
                message: `[Phase 2] Суммарное тепловыделение (${newTotalHeat}Вт) может превысить мощность охлаждения`
            });
        }

        result.info.push({
            rule: this.name,
            message: '[Phase 2] Детальный тепловой расчёт будет выполнен через LogicEngine'
        });

        return result;
    }
}
