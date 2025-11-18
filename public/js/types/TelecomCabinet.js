/**
 * TelecomCabinet — тип для телекоммуникационных шкафов
 * Специализация для 19" стоечных шкафов с телеком-оборудованием
 */
import { CabinetType } from './CabinetType.js';

export class TelecomCabinet extends CabinetType {
    constructor(config) {
        super(config);
        
        // Специфичные параметры телеком-шкафа
        this.rack = config.rack || {
            units: 42,            // Высота в юнитах (U)
            width: 19,            // Ширина в дюймах
            depth: 600,           // Глубина (мм)
            railType: 'standard'  // Тип направляющих
        };
        
        this.cabling = config.cabling || {
            hasHorizontalCableManager: false,
            hasVerticalCableManager: false,
            hasPatchPanel: false,
            maxCableLoad: 0  // кг
        };
        
        this.power = config.power || {
            hasPDU: false,
            pduType: null,       // vertical, horizontal
            maxCurrent: 0        // А
        };
    }

    /**
     * Валидация для телеком-шкафа
     * Проверяет размещение в юнитах и кабельную инфраструктуру
     */
    validateEquipment(equipment) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Проверка размера в юнитах
        if (equipment.mounting && equipment.mounting.rackUnits) {
            const requiredUnits = equipment.mounting.rackUnits;
            const availableUnits = this.rack.units;
            
            if (requiredUnits > availableUnits) {
                result.valid = false;
                result.errors.push(
                    `Оборудование требует ${requiredUnits}U, доступно ${availableUnits}U`
                );
            }
        }

        // Проверка глубины
        if (equipment.dimensions && equipment.dimensions.depth) {
            const eqDepth = equipment.dimensions.depth;
            const cabDepth = this.rack.depth;
            
            if (eqDepth > cabDepth) {
                result.valid = false;
                result.errors.push(
                    `Глубина оборудования (${eqDepth}мм) превышает глубину шкафа (${cabDepth}мм)`
                );
            }
        }

        // Проверка кабельной нагрузки
        if (equipment.specs && equipment.specs.cableWeight) {
            if (!this.cabling.hasVerticalCableManager) {
                result.warnings.push(
                    'Рекомендуется добавить вертикальный кабель-органайзер'
                );
            }
        }

        return result;
    }

    /**
     * Расчёт метрик для телеком-шкафа
     */
    calculateTypeSpecificMetrics(equipmentList) {
        const metrics = {
            usedRackUnits: 0,           // Занято юнитов
            availableRackUnits: 0,      // Свободно юнитов
            utilizationPercent: 0,      // % заполнения
            totalCurrent: 0,            // Суммарный ток (А)
            cableLoad: 0,               // Нагрузка на кабели (кг)
            requiresPDU: false,         // Требуется PDU
            requiresCableManager: false // Требуется кабель-менеджер
        };

        // Подсчёт занятых юнитов
        equipmentList.forEach(eq => {
            if (eq.mounting && eq.mounting.rackUnits) {
                metrics.usedRackUnits += eq.mounting.rackUnits;
            }
            if (eq.specs) {
                // Расчёт тока (P = U * I, I = P / U)
                if (eq.specs.power) {
                    metrics.totalCurrent += eq.specs.power / 230; // 230V AC
                }
                if (eq.specs.cableWeight) {
                    metrics.cableLoad += eq.specs.cableWeight;
                }
            }
        });

        metrics.availableRackUnits = this.rack.units - metrics.usedRackUnits;
        metrics.utilizationPercent = (metrics.usedRackUnits / this.rack.units) * 100;
        
        metrics.requiresPDU = metrics.totalCurrent > 0 && !this.power.hasPDU;
        metrics.requiresCableManager = 
            metrics.cableLoad > 0 && 
            !this.cabling.hasVerticalCableManager;

        return metrics;
    }

    /**
     * Рекомендации для телеком-шкафа
     */
    getConfigurationRecommendations(equipmentList) {
        const recommendations = [];
        const metrics = this.calculateTypeSpecificMetrics(equipmentList);

        // Проверка заполнения
        if (metrics.utilizationPercent > 80) {
            recommendations.push({
                severity: 'warning',
                message: 'Высокая плотность монтажа',
                suggestion: `Заполнено ${metrics.utilizationPercent.toFixed(1)}% юнитов, рекомендуется предусмотреть вентиляцию`
            });
        }

        // Проверка PDU
        if (metrics.requiresPDU) {
            recommendations.push({
                severity: 'error',
                message: 'Требуется PDU (блок распределения питания)',
                suggestion: `Суммарный ток: ${metrics.totalCurrent.toFixed(1)}А`
            });
        } else if (this.power.hasPDU && metrics.totalCurrent > this.power.maxCurrent) {
            recommendations.push({
                severity: 'error',
                message: 'Превышена мощность PDU',
                suggestion: `Требуется ${metrics.totalCurrent.toFixed(1)}А, доступно ${this.power.maxCurrent}А`
            });
        }

        // Проверка кабель-менеджмента
        if (metrics.requiresCableManager) {
            recommendations.push({
                severity: 'warning',
                message: 'Рекомендуется кабель-организатор',
                suggestion: `Нагрузка на кабели: ${metrics.cableLoad.toFixed(1)}кг`
            });
        }

        // Проверка доступного пространства
        if (metrics.availableRackUnits < 2) {
            recommendations.push({
                severity: 'info',
                message: 'Почти все юниты заняты',
                suggestion: `Свободно только ${metrics.availableRackUnits}U`
            });
        }

        return recommendations;
    }

    /**
     * Получить свободные юниты
     */
    getAvailableRackUnits() {
        return this.rack.units;
    }

    /**
     * Проверка наличия PDU
     */
    hasPDU() {
        return this.power.hasPDU;
    }

    /**
     * Проверка наличия кабель-менеджмента
     */
    hasCableManagement() {
        return this.cabling.hasHorizontalCableManager || 
               this.cabling.hasVerticalCableManager;
    }
}
