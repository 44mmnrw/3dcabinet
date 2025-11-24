/**
 * Validation Rules — Экспорт всех правил
 */
export { CompatibilityRule } from './rules/CompatibilityRule.ts';
export { DimensionRule } from './rules/DimensionRule.ts';
export { MountTypeRule } from './rules/MountTypeRule.ts';
export { WeightRule } from './rules/WeightRule.ts';
export { PowerRule } from './rules/PowerRule.ts';
export { ThermalRule } from './rules/ThermalRule.ts';

/**
 * Создать стандартный ValidationEngine с базовыми правилами
 */
import { ValidationEngine } from './ValidationEngine.ts';

export function createDefaultValidationEngine(): ValidationEngine {
    const engine = new ValidationEngine();
    
    // Импорты для динамической загрузки
    import('./rules/CompatibilityRule.ts').then(({ CompatibilityRule }) => {
        engine.addRule(new CompatibilityRule());
    });
    
    import('./rules/DimensionRule.ts').then(({ DimensionRule }) => {
        engine.addRule(new DimensionRule());
    });
    
    import('./rules/MountTypeRule.ts').then(({ MountTypeRule }) => {
        engine.addRule(new MountTypeRule());
    });
    
    import('./rules/WeightRule.ts').then(({ WeightRule }) => {
        engine.addRule(new WeightRule());
    });
    
    import('./rules/PowerRule.ts').then(({ PowerRule }) => {
        engine.addRule(new PowerRule());
    });
    
    import('./rules/ThermalRule.ts').then(({ ThermalRule }) => {
        engine.addRule(new ThermalRule());
    });
    
    return engine;
}

export { ValidationEngine } from './ValidationEngine.ts';
export type { ValidationContext, ValidationResult, RuleValidationResult, ValidationMessage } from './ValidationEngine.ts';

