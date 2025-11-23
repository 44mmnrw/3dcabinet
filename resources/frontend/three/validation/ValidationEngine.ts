/**
 * ValidationEngine — Движок валидации совместимости оборудования и шкафов
 * Применяет набор правил и возвращает структурированный результат
 */

import type { EquipmentConfig } from '../types/equipment.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
import type { MountingZone } from '../types/cabinet.types.js';

interface CabinetType {
    getMaxPower?: () => number;
    getMaxLoad?: () => number;
    getCoolingSpec?: () => { type: string; capacity?: number } | null;
    getRackUnits?: () => number;
    hasDinRails?: () => boolean;
    hasRackUnits?: () => boolean;
    getMountingZones?: (type: string) => MountingZone[];
    supportsMountType?: (type: string) => boolean;
    dimensions?: {
        width: number;
        height: number;
        depth: number;
    };
    mountingCapabilities?: string[];
    category?: string;
    [key: string]: unknown;
}

/**
 * Контекст валидации
 */
export interface ValidationContext {
    totalPower?: number;
    totalWeight?: number;
    totalHeat?: number;
    occupiedZones?: string[];
    [key: string]: unknown;
}

/**
 * Сообщение валидации
 */
export interface ValidationMessage {
    rule: string;
    message: string;
}

/**
 * Результат валидации правила
 */
export interface RuleValidationResult {
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
    info: ValidationMessage[];
}

/**
 * Полный результат валидации
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
    info: ValidationMessage[];
}

/**
 * Статистика движка валидации
 */
export interface ValidationEngineStats {
    totalRules: number;
    ruleNames: string[];
}

/**
 * ValidationRule — Базовый интерфейс для правил валидации
 */
export abstract class ValidationRule {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Выполнить валидацию
     */
    abstract validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext): Promise<RuleValidationResult>;
}

/**
 * ValidationEngine — Движок валидации совместимости оборудования и шкафов
 */
export class ValidationEngine {
    private rules: ValidationRule[];

    constructor() {
        this.rules = [];
    }

    /**
     * Добавить правило валидации
     */
    addRule(rule: ValidationRule): void {
        if (!rule || typeof rule.validate !== 'function') {
            return;
        }
        
        this.rules.push(rule);
    }

    /**
     * Удалить правило по имени
     */
    removeRule(name: string): void {
        this.rules = this.rules.filter(rule => rule.name !== name);
    }

    /**
     * Валидировать оборудование для шкафа
     */
    async validate(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext = {}): Promise<ValidationResult> {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

        // Применить все правила
        for (const rule of this.rules) {
            try {
                const ruleResult = await rule.validate(cabinetType, equipment, context);
                
                // Мержить результаты
                if (ruleResult.errors && ruleResult.errors.length > 0) {
                    result.errors.push(...ruleResult.errors);
                    result.valid = false;
                }
                
                if (ruleResult.warnings && ruleResult.warnings.length > 0) {
                    result.warnings.push(...ruleResult.warnings);
                }
                
                if (ruleResult.info && ruleResult.info.length > 0) {
                    result.info.push(...ruleResult.info);
                }
                
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                result.errors.push({
                    rule: rule.name,
                    message: `Internal error: ${errorMessage}`
                });
                result.valid = false;
            }
        }

        return result;
    }

    /**
     * Быстрая валидация (только критичные ошибки)
     */
    async canMount(cabinetType: CabinetType, equipment: EquipmentConfig, context: ValidationContext = {}): Promise<boolean> {
        const result = await this.validate(cabinetType, equipment, context);
        return result.valid;
    }

    /**
     * Получить список активных правил
     */
    getRuleNames(): string[] {
        return this.rules.map(rule => rule.name || 'unnamed');
    }

    /**
     * Очистить все правила
     */
    clearRules(): void {
        this.rules = [];
    }

    /**
     * Создать отчёт валидации (форматированный текст)
     */
    formatReport(validationResult: ValidationResult): string {
        const lines: string[] = [];
        
        lines.push('=== Validation Report ===');
        lines.push(`Status: ${validationResult.valid ? 'VALID ✓' : 'INVALID ✗'}`);
        lines.push('');
        
        if (validationResult.errors.length > 0) {
            lines.push('ERRORS:');
            validationResult.errors.forEach((err, i) => {
                lines.push(`  ${i + 1}. [${err.rule || 'unknown'}] ${err.message}`);
            });
            lines.push('');
        }
        
        if (validationResult.warnings.length > 0) {
            lines.push('WARNINGS:');
            validationResult.warnings.forEach((warn, i) => {
                lines.push(`  ${i + 1}. [${warn.rule || 'unknown'}] ${warn.message}`);
            });
            lines.push('');
        }
        
        if (validationResult.info.length > 0) {
            lines.push('INFO:');
            validationResult.info.forEach((info, i) => {
                lines.push(`  ${i + 1}. [${info.rule || 'unknown'}] ${info.message}`);
            });
        }
        
        return lines.join('\n');
    }

    /**
     * Получить статистику движка
     */
    getStats(): ValidationEngineStats {
        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames()
        };
    }
}

