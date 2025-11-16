/**
 * CompatibilityRule — Проверка совместимости типа монтажа
 */
import { ValidationRule } from './ValidationEngine.js';

export class CompatibilityRule extends ValidationRule {
    constructor() {
        super('CompatibilityRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
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
        if (!cabinetType.supportsMountType(mountType)) {
            result.errors.push({
                rule: this.name,
                message: `Шкаф не поддерживает тип монтажа '${mountType}'. ` +
                         `Доступны: ${cabinetType.mountingCapabilities.join(', ')}`
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
