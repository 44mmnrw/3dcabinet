/**
 * ThermalRule — Проверка тепловыделения (заглушка для Phase 2)
 */
import { ValidationRule } from '../ValidationEngine.ts';
import type { ValidationContext, RuleValidationResult } from '../ValidationEngine.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    getCoolingSpec?: () => { capacity?: number } | null;
    [key: string]: unknown;
}

export class ThermalRule extends ValidationRule {
    constructor() {
        super('ThermalRule');
    }

    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext): Promise<RuleValidationResult> {
        const result: RuleValidationResult = {
            errors: [],
            warnings: [],
            info: []
        };

        // TODO: Реализация в Phase 2 (интеграция с LogicEngine)
        
        if (!equipment.specifications || equipment.specifications['heatDissipation'] === undefined) {
            result.info.push({
                rule: this.name,
                message: '[Phase 2] Тепловыделение не указано'
            });
            return result;
        }

        const heatOutputRaw = equipment.specifications['heatDissipation']; // Вт
        const heatOutput = typeof heatOutputRaw === 'number' ? heatOutputRaw : 0;
        const coolingSpec = cabinetType.getCoolingSpec ? cabinetType.getCoolingSpec() : null;

        if (!coolingSpec) {
            result.info.push({
                rule: this.name,
                message: '[Phase 2] Параметры охлаждения шкафа не определены'
            });
            return result;
        }

        if (heatOutput <= 0) {
            return result;
        }

        // Текущее тепловыделение в контексте
        const currentHeat = typeof context.totalHeat === 'number' ? context.totalHeat : 0;
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

