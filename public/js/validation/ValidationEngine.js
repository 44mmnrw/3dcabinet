/**
 * ValidationEngine — Движок валидации совместимости оборудования и шкафов
 * Применяет набор правил и возвращает структурированный результат
 */
export class ValidationEngine {
    constructor() {
        // Array<ValidationRule>
        this.rules = [];
    }

    /**
     * Добавить правило валидации
     * @param {Object} rule - Объект с методом validate(cabinet, equipment)
     */
    addRule(rule) {
        if (!rule || typeof rule.validate !== 'function') {
            return;
        }
        
        this.rules.push(rule);
    }

    /**
     * Удалить правило по имени
     * @param {string} name
     */
    removeRule(name) {
        const initialLength = this.rules.length;
        this.rules = this.rules.filter(rule => rule.name !== name);
    }

    /**
     * Валидировать оборудование для шкафа
     * @param {Object} cabinetType - Экземпляр CabinetType
     * @param {Object} equipment - Объект оборудования из каталога
     * @param {Object} context - Дополнительный контекст (текущая конфигурация, etc.)
     * @returns {Object} {valid: boolean, errors: Array, warnings: Array, info: Array}
     */
    async validate(cabinetType, equipment, context = {}) {
        const result = {
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
                
            } catch (error) {
                result.errors.push({
                    rule: rule.name,
                    message: `Internal error: ${error.message}`
                });
                result.valid = false;
            }
        }

        return result;
    }

    /**
     * Быстрая валидация (только критичные ошибки)
     * @param {Object} cabinetType
     * @param {Object} equipment
     * @param {Object} context
     * @returns {Promise<boolean>}
     */
    async canMount(cabinetType, equipment, context = {}) {
        const result = await this.validate(cabinetType, equipment, context);
        return result.valid;
    }

    /**
     * Получить список активных правил
     * @returns {Array<string>}
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name || 'unnamed');
    }

    /**
     * Очистить все правила
     */
    clearRules() {
        this.rules = [];
    }

    /**
     * Создать отчёт валидации (форматированный текст)
     * @param {Object} validationResult - Результат из validate()
     * @returns {string}
     */
    formatReport(validationResult) {
        const lines = [];
        
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
     * @returns {Object}
     */
    getStats() {
        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames()
        };
    }
}

/**
 * ValidationRule — Базовый интерфейс для правил валидации
 */
export class ValidationRule {
    constructor(name) {
        this.name = name;
    }

    /**
     * Выполнить валидацию
     * @param {Object} cabinetType
     * @param {Object} equipment
     * @param {Object} context
     * @returns {Promise<Object>} {errors: Array, warnings: Array, info: Array}
     */
    async validate(cabinetType, equipment, context) {
        throw new Error('ValidationRule.validate() must be implemented');
    }
}
