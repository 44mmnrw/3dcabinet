/**
 * Validation Rules — Экспорт всех правил
 */
export { CompatibilityRule } from './rules/CompatibilityRule.js';
export { DimensionRule } from './rules/DimensionRule.js';
export { MountTypeRule } from './rules/MountTypeRule.js';
export { WeightRule } from './rules/WeightRule.js';
export { PowerRule } from './rules/PowerRule.js';
export { ThermalRule } from './rules/ThermalRule.js';

/**
 * Создать стандартный ValidationEngine с базовыми правилами
 * @returns {ValidationEngine}
 */
import { ValidationEngine } from './ValidationEngine.js';

export function createDefaultValidationEngine() {
    const engine = new ValidationEngine();
    
    // Импорты для динамической загрузки
    import('./rules/CompatibilityRule.js').then(({ CompatibilityRule }) => {
        engine.addRule(new CompatibilityRule());
    });
    
    import('./rules/DimensionRule.js').then(({ DimensionRule }) => {
        engine.addRule(new DimensionRule());
    });
    
    import('./rules/MountTypeRule.js').then(({ MountTypeRule }) => {
        engine.addRule(new MountTypeRule());
    });
    
    import('./rules/WeightRule.js').then(({ WeightRule }) => {
        engine.addRule(new WeightRule());
    });
    
    import('./rules/PowerRule.js').then(({ PowerRule }) => {
        engine.addRule(new PowerRule());
    });
    
    import('./rules/ThermalRule.js').then(({ ThermalRule }) => {
        engine.addRule(new ThermalRule());
    });
    
    return engine;
}

export { ValidationEngine };
