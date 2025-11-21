/**
 * MountTypeRule — Проверка специфичных требований типа монтажа
 */
import { ValidationRule } from '../ValidationEngine.js';

export class MountTypeRule extends ValidationRule {
    constructor() {
        super('MountTypeRule');
    }

    async validate(cabinetType, equipment, context) {
        const result = {
            errors: [],
            warnings: [],
            info: []
        };

        if (!equipment.mounting) {
            return result;
        }

        const mountType = equipment.mounting.type;

        // Проверка специфики DIN-рейки
        if (mountType === 'din_rail') {
            if (!cabinetType.hasDinRails()) {
                result.errors.push({
                    rule: this.name,
                    message: 'Шкаф не имеет DIN-реек'
                });
            } else {
                const dinRailZones = cabinetType.getMountingZones('din_rail');
                if (dinRailZones.length === 0) {
                    result.warnings.push({
                        rule: this.name,
                        message: 'DIN-рейки не сконфигурированы в mountingZones'
                    });
                }
            }

            // Проверка ширины модуля
            if (equipment.mounting.moduleWidth) {
                const width = equipment.mounting.moduleWidth;
                if (width < 1 || width > 24) {
                    result.warnings.push({
                        rule: this.name,
                        message: `Нестандартная ширина модуля: ${width} (обычно 1-24)`
                    });
                }
            }
        }

        // Проверка специфики Rack Unit
        if (mountType === 'rack_unit') {
            if (!cabinetType.hasRackUnits()) {
                result.errors.push({
                    rule: this.name,
                    message: 'Шкаф не является стоечным (19" rack)'
                });
            }

            // Проверка глубины для rack-монтажа
            if (equipment.dimensions && equipment.dimensions.depth) {
                const depth = equipment.dimensions.depth;
                if (depth < 200) {
                    result.warnings.push({
                        rule: this.name,
                        message: `Малая глубина для стоечного оборудования: ${depth}мм`
                    });
                }
            }
        }

        // Проверка специфики монтажной пластины
        if (mountType === 'mounting_plate') {
            const plateZones = cabinetType.getMountingZones('mounting_plate');
            if (plateZones.length === 0) {
                result.warnings.push({
                    rule: this.name,
                    message: 'Монтажная пластина не определена в конфигурации шкафа'
                });
            }

            // Проверка крепежных отверстий
            if (equipment.mounting.mountingHoles) {
                const holes = equipment.mounting.mountingHoles;
                if (!holes.pattern || !holes.spacing) {
                    result.warnings.push({
                        rule: this.name,
                        message: 'Шаблон крепежных отверстий не полностью определён'
                    });
                }
            }
        }

        // Проверка доступности монтажных зон
        if (context.occupiedZones && equipment.mounting.preferredZone) {
            const preferredZone = equipment.mounting.preferredZone;
            if (context.occupiedZones.includes(preferredZone)) {
                result.warnings.push({
                    rule: this.name,
                    message: `Предпочтительная зона '${preferredZone}' занята`
                });
            }
        }

        return result;
    }
}
