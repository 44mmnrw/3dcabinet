/**
 * CompatibilityRule — Проверка совместимости типа монтажа
 */
import { ValidationRule } from '../ValidationEngine.ts';
import type { ValidationContext, RuleValidationResult } from '../ValidationEngine.ts';
import type { EquipmentConfig } from '../../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    supportsMountType?: (type: string) => boolean;
    mountingCapabilities?: string[];
    category?: string;
    [key: string]: unknown;
}

export class CompatibilityRule extends ValidationRule {
    constructor() {
        super('CompatibilityRule');
    }

    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, _context: ValidationContext): Promise<RuleValidationResult> {
        const result: RuleValidationResult = {
            errors: [],
            warnings: [],
            info: []
        };

        // Проверка типа монтажа
        if (!equipment.mounting || !equipment.mounting.type) {
            result.warnings.push({
                rule: this.name,
                message: 'Тип монтажа оборудования не указан'
            });
            return result;
        }

        const mountType = equipment.mounting.type;
        
        // Проверка поддержки типа монтажа шкафом
        if (cabinetType.supportsMountType && !cabinetType.supportsMountType(mountType)) {
            const capabilities = cabinetType.mountingCapabilities || [];
            result.errors.push({
                rule: this.name,
                message: `Шкаф не поддерживает тип монтажа '${mountType}'. ` +
                         `Доступны: ${capabilities.join(', ')}`
            });
        }

        // Проверка категории оборудования
        if (equipment.category && cabinetType.category) {
            // Специфичные проверки для категорий
            if (cabinetType.category === 'server' && 
                !['server', 'network', 'storage', 'pdu'].includes(equipment.category)) {
                result.warnings.push({
                    rule: this.name,
                    message: `Оборудование категории '${equipment.category}' нетипично для серверного шкафа`
                });
            }
        }

        return result;
    }
}

