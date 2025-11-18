/**
 * DimensionRule — Проверка габаритных размеров
 */
import { ValidationRule } from '../ValidationEngine.js';

export class DimensionRule extends ValidationRule {
    constructor() {
        super('DimensionRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.dimensions) {
            result.info.push({
                rule: this.name,
                message: 'Размеры оборудования не указаны, проверка пропущена'
            });
            return result;
        }

        const eqDim = equipment.dimensions;
        const cabDim = cabinetType.dimensions;

        // Проверка ширины
        if (eqDim.width && cabDim.width) {
            if (eqDim.width > cabDim.width) {
                result.errors.push({
                    rule: this.name,
                    message: `Ширина оборудования (${eqDim.width}мм) превышает ширину шкафа (${cabDim.width}мм)`
                });
            } else if (eqDim.width > cabDim.width * 0.95) {
                result.warnings.push({
                    rule: this.name,
                    message: 'Ширина оборудования близка к максимальной (>95%)'
                });
            }
        }

        // Проверка глубины
        if (eqDim.depth && cabDim.depth) {
            if (eqDim.depth > cabDim.depth) {
                result.errors.push({
                    rule: this.name,
                    message: `Глубина оборудования (${eqDim.depth}мм) превышает глубину шкафа (${cabDim.depth}мм)`
                });
            } else if (eqDim.depth > cabDim.depth * 0.9) {
                result.warnings.push({
                    rule: this.name,
                    message: 'Глубина оборудования близка к максимальной (>90%)'
                });
            }
        }

        // Проверка высоты
        if (eqDim.height && cabDim.height) {
            if (eqDim.height > cabDim.height) {
                result.errors.push({
                    rule: this.name,
                    message: `Высота оборудования (${eqDim.height}мм) превышает высоту шкафа (${cabDim.height}мм)`
                });
            }
        }

        // Для rack-монтажа проверка юнитов
        if (equipment.mounting && equipment.mounting.rackUnits) {
            const eqUnits = equipment.mounting.rackUnits;
            const cabUnits = cabinetType.getRackUnits();
            
            if (cabUnits > 0 && eqUnits > cabUnits) {
                result.errors.push({
                    rule: this.name,
                    message: `Оборудование требует ${eqUnits}U, в шкафу доступно ${cabUnits}U`
                });
            }
        }

        return result;
    }
}
