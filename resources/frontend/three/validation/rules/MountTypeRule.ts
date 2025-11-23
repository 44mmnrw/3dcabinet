/**
 * MountTypeRule — Проверка специфичных требований типа монтажа
 */
import { ValidationRule } from '../ValidationEngine.ts';
import type { ValidationContext, RuleValidationResult } from '../ValidationEngine.ts';
import type { EquipmentConfig, EquipmentMounting } from '../../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    hasDinRails?: () => boolean;
    hasRackUnits?: () => boolean;
    getMountingZones?: (type: string) => import('../../types/cabinet.types.js').MountingZone[];
    [key: string]: unknown;
}

export class MountTypeRule extends ValidationRule {
    constructor() {
        super('MountTypeRule');
    }

    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext): Promise<RuleValidationResult> {
        const result: RuleValidationResult = {
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
            if (cabinetType.hasDinRails && !cabinetType.hasDinRails()) {
                result.errors.push({
                    rule: this.name,
                    message: 'Шкаф не имеет DIN-реек'
                });
            } else {
                const dinRailZones = cabinetType.getMountingZones ? cabinetType.getMountingZones('din_rail') : [];
                if (dinRailZones.length === 0) {
                    result.warnings.push({
                        rule: this.name,
                        message: 'DIN-рейки не сконфигурированы в mountingZones'
                    });
                }
            }

            // Проверка ширины модуля
            const mountingWithWidth = equipment.mounting as EquipmentMounting & { moduleWidth?: number };
            if (mountingWithWidth?.moduleWidth) {
                const width = mountingWithWidth.moduleWidth;
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
            if (cabinetType.hasRackUnits && !cabinetType.hasRackUnits()) {
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
            const plateZones = cabinetType.getMountingZones ? cabinetType.getMountingZones('mounting_plate') : [];
            if (plateZones.length === 0) {
                result.warnings.push({
                    rule: this.name,
                    message: 'Монтажная пластина не определена в конфигурации шкафа'
                });
            }

            // Проверка крепежных отверстий
            const mountingWithHoles = equipment.mounting as EquipmentMounting & { mountingHoles?: { pattern?: string; spacing?: number } };
            if (mountingWithHoles?.mountingHoles) {
                const holes = mountingWithHoles.mountingHoles;
                if (!holes.pattern || !holes.spacing) {
                    result.warnings.push({
                        rule: this.name,
                        message: 'Шаблон крепежных отверстий не полностью определён'
                    });
                }
            }
        }

        // Проверка доступности монтажных зон
        if (context.occupiedZones) {
            const mountingWithZone = equipment.mounting as EquipmentMounting & { preferredZone?: string };
            if (mountingWithZone?.preferredZone) {
                const preferredZone = mountingWithZone.preferredZone;
                if (context.occupiedZones.includes(preferredZone)) {
                    result.warnings.push({
                        rule: this.name,
                        message: `Предпочтительная зона '${preferredZone}' занята`
                    });
                }
            }
        }

        return result;
    }
}

