/**
 * TelecomCabinet — тип для телекоммуникационных шкафов
 * Специализация для 19" стоечных шкафов с телеком-оборудованием
 */
import { CabinetType } from './CabinetType.ts';
import { ELECTRICAL } from '../constants/PhysicalConstants.ts';
import type { EquipmentConfig } from './equipment.types.js';
import type { CabinetCategory, MountingCapability, MountingZone, CabinetDimensions, CabinetSpecs } from './cabinet.types.js';

export interface TelecomCabinetConfig {
    id: string;
    name: string;
    category: CabinetCategory;
    dimensions?: CabinetDimensions | Record<string, unknown>;
    mountingZones?: MountingZone[];
    mountingCapabilities?: MountingCapability[];
    specs?: CabinetSpecs | Record<string, unknown>;
    [key: string]: unknown;  // Для совместимости с CabinetTypeConfig
    rack?: {
        units: number;
        width: number;
        depth: number;
        railType: string;
    };
    cabling?: {
        hasHorizontalCableManager: boolean;
        hasVerticalCableManager: boolean;
        hasPatchPanel: boolean;
        maxCableLoad: number;
    };
    power?: {
        hasPDU: boolean;
        pduType: string | null;
        maxCurrent: number;
    };
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface Recommendation {
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
    [key: string]: unknown;  // Для совместимости с ConfigurationRecommendation
}

export interface TelecomMetrics {
    usedRackUnits: number;
    availableRackUnits: number;
    utilizationPercent: number;
    totalCurrent: number;
    cableLoad: number;
    requiresPDU: boolean;
    requiresCableManager: boolean;
    [key: string]: unknown;
}

export class TelecomCabinet extends CabinetType {
    rack: {
        units: number;
        width: number;
        depth: number;
        railType: string;
    };
    
    cabling: {
        hasHorizontalCableManager: boolean;
        hasVerticalCableManager: boolean;
        hasPatchPanel: boolean;
        maxCableLoad: number;
    };
    
    power: {
        hasPDU: boolean;
        pduType: string | null;
        maxCurrent: number;
    };

    constructor(config: TelecomCabinetConfig) {
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
    validateEquipment(equipment: EquipmentConfig): ValidationResult {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Проверка размера в юнитах
        if (equipment.mounting && 'rackUnits' in equipment.mounting) {
            const rackUnits = (equipment.mounting as any).rackUnits;
            if (rackUnits !== undefined) {
                const requiredUnits = rackUnits;
                const availableUnits = this.rack.units;
                
                if (requiredUnits > availableUnits) {
                    result.valid = false;
                    result.errors.push(
                        `Оборудование требует ${requiredUnits}U, доступно ${availableUnits}U`
                    );
                }
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
        if (equipment.specifications && (equipment.specifications as any).cableWeight) {
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
    calculateTypeSpecificMetrics(equipmentList: EquipmentConfig[]): TelecomMetrics {
        const metrics: TelecomMetrics = {
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
            if (eq.mounting && 'rackUnits' in eq.mounting) {
                const rackUnits = (eq.mounting as any).rackUnits;
                if (rackUnits !== undefined) {
                    metrics.usedRackUnits += rackUnits;
                }
            }
            if (eq.specifications) {
                // Расчёт тока (P = U * I, I = P / U)
                const power = (eq.specifications as any).power;
                if (power) {
                    metrics.totalCurrent += power / ELECTRICAL.STANDARD_VOLTAGE_V;
                }
                const cableWeight = (eq.specifications as any).cableWeight;
                if (cableWeight) {
                    metrics.cableLoad += cableWeight;
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
    getConfigurationRecommendations(equipmentList: EquipmentConfig[]): Recommendation[] {
        const recommendations: Recommendation[] = [];
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
    getAvailableRackUnits(): number {
        return this.rack.units;
    }

    /**
     * Проверка наличия PDU
     */
    hasPDU(): boolean {
        return this.power.hasPDU;
    }

    /**
     * Проверка наличия кабель-менеджмента
     */
    hasCableManagement(): boolean {
        return this.cabling.hasHorizontalCableManager || 
               this.cabling.hasVerticalCableManager;
    }
}

