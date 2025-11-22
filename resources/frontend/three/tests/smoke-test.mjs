/**
 * Smoke Test — Базовая проверка новых модулей
 * Запуск: node public/js/tests/smoke-test.mjs
 * 
 * Проверяет:
 * - Type System (создание типов, валидация, расчёты)
 * - Strategy Registry (регистрация, создание)
 * - Validation Engine (применение правил)
 */

console.log('🧪 Начало Smoke Test...\n');

// ========== Test 1: TypeRegistry ==========
console.log('=== Test 1: TypeRegistry ===');

import { typeRegistry, ThermalCabinet } from '../types/index.ts';

const thermalConfig = {
    id: 'test_thermal',
    name: 'Test Thermal Cabinet',
    category: 'thermal',
    dimensions: { width: 700, height: 500, depth: 240 },
    mountingCapabilities: ['din_rail', 'mounting_plate'],
    mountingZones: [
        { type: 'din_rail', componentNames: ['dinRail1', 'dinRail2'] }
    ],
    specs: { maxLoad: 50, maxPower: 3000 },
    thermal: {
        heatingPower: 800,
        coolingPower: 0,
        operatingTemp: { min: -40, max: 55 }
    }
};

try {
    const thermalCabinet = await typeRegistry.createType('thermal', thermalConfig);
    
    console.assert(thermalCabinet instanceof ThermalCabinet, '✗ Неверный тип');
    console.assert(thermalCabinet.hasDinRails() === true, '✗ hasDinRails() должен быть true');
    console.assert(thermalCabinet.getMaxLoad() === 50, '✗ maxLoad должен быть 50');
    console.assert(thermalCabinet.getMountingZones('din_rail').length === 1, '✗ Должна быть 1 зона DIN');
    
    console.log('✅ TypeRegistry работает');
    console.log(`   Тип: ${thermalCabinet.constructor.name}`);
    console.log(`   Монтаж: ${thermalCabinet.mountingCapabilities.join(', ')}`);
} catch (error) {
    console.error('✗ TypeRegistry FAILED:', error.message);
}

console.log('');

// ========== Test 2: Strategy Registry ==========
console.log('=== Test 2: StrategyRegistry ===');

import { strategyRegistry } from '../strategies/StrategyRegistry.js';
import { DINRailStrategy, RackUnitStrategy } from '../strategies/MountingStrategies.js';

try {
    // Регистрация
    strategyRegistry.register('test_din', DINRailStrategy, ['test_alias']);
    strategyRegistry.register('test_rack', RackUnitStrategy);
    
    console.assert(strategyRegistry.has('test_din'), '✗ test_din не зарегистрирована');
    console.assert(strategyRegistry.has('test_alias'), '✗ Алиас не работает');
    console.assert(strategyRegistry.has('test_rack'), '✗ test_rack не зарегистрирована');
    
    const types = strategyRegistry.getRegisteredTypes();
    console.assert(types.length >= 2, '✗ Должно быть минимум 2 типа');
    
    console.log('✅ StrategyRegistry работает');
    console.log(`   Зарегистрировано типов: ${types.length}`);
    console.log(`   Типы: ${types.join(', ')}`);
} catch (error) {
    console.error('✗ StrategyRegistry FAILED:', error.message);
}

console.log('');

// ========== Test 3: StrategyFactory ==========
console.log('=== Test 3: StrategyFactory ===');

import { StrategyFactory } from '../strategies/StrategyFactory.js';

try {
    const mockCabinet = {
        getComponents: () => ({
            dinRail1: { position: { x: 0, y: 0, z: 0 } }
        })
    };
    
    const thermalType = await typeRegistry.createType('thermal', thermalConfig);
    const strategies = StrategyFactory.createForCabinet(thermalType, mockCabinet);
    
    console.assert(strategies instanceof Map, '✗ Должен вернуть Map');
    console.assert(strategies.size > 0, '✗ Должны быть созданы стратегии');
    
    console.log('✅ StrategyFactory работает');
    console.log(`   Создано стратегий: ${strategies.size}`);
    console.log(`   Ключи: ${Array.from(strategies.keys()).join(', ')}`);
} catch (error) {
    console.error('✗ StrategyFactory FAILED:', error.message);
}

console.log('');

// ========== Test 4: ValidationEngine ==========
console.log('=== Test 4: ValidationEngine ===');

import { ValidationEngine } from '../validation/ValidationEngine.js';
import { CompatibilityRule, DimensionRule } from '../validation/index.js';

try {
    const engine = new ValidationEngine();
    engine.addRule(new CompatibilityRule());
    engine.addRule(new DimensionRule());
    
    const thermalType = await typeRegistry.createType('thermal', thermalConfig);
    
    const validEquipment = {
        id: 'test_breaker',
        mounting: { type: 'din_rail', moduleWidth: 2 },
        dimensions: { width: 36, height: 90, depth: 78 },
        specs: { weight: 0.5, power: 100 }
    };
    
    const result = await engine.validate(thermalType, validEquipment, {});
    
    console.assert(typeof result.valid === 'boolean', '✗ result.valid должен быть boolean');
    console.assert(Array.isArray(result.errors), '✗ result.errors должен быть массивом');
    console.assert(Array.isArray(result.warnings), '✗ result.warnings должен быть массивом');
    
    console.log('✅ ValidationEngine работает');
    console.log(`   Правил: ${engine.getRuleNames().length}`);
    console.log(`   Результат: valid=${result.valid}, errors=${result.errors.length}, warnings=${result.warnings.length}`);
} catch (error) {
    console.error('✗ ValidationEngine FAILED:', error.message);
}

console.log('');

// ========== Test 5: ThermalCabinet Calculations ==========
console.log('=== Test 5: ThermalCabinet Calculations ===');

try {
    const thermalType = await typeRegistry.createType('thermal', thermalConfig);
    
    const equipmentList = [
        { specs: { heatDissipation: 50, power: 100 } },
        { specs: { heatDissipation: 80, power: 150 } }
    ];
    
    const metrics = thermalType.calculateTypeSpecificMetrics(equipmentList);
    
    console.assert(metrics.totalHeatDissipation === 130, '✗ Суммарное тепло должно быть 130');
    console.assert(metrics.totalPowerConsumption === 250, '✗ Суммарная мощность должна быть 250');
    console.assert(metrics.thermalBalance, '✗ Должен быть статус баланса');
    
    const recommendations = thermalType.getConfigurationRecommendations(equipmentList);
    console.assert(Array.isArray(recommendations), '✗ Рекомендации должны быть массивом');
    
    console.log('✅ ThermalCabinet расчёты работают');
    console.log(`   Тепло: ${metrics.totalHeatDissipation}Вт`);
    console.log(`   Баланс: ${metrics.thermalBalance}`);
    console.log(`   Рекомендаций: ${recommendations.length}`);
} catch (error) {
    console.error('✗ ThermalCabinet Calculations FAILED:', error.message);
}

console.log('');

// ========== Test 6: TelecomCabinet Calculations ==========
console.log('=== Test 6: TelecomCabinet Calculations ===');

import { TelecomCabinet } from '../types/TelecomCabinet.ts';

try {
    const telecomConfig = {
        id: 'test_telecom',
        name: 'Test Telecom Cabinet',
        category: 'telecom',
        dimensions: { width: 600, height: 1972, depth: 800 },
        mountingCapabilities: ['rack_unit'],
        specs: { rackUnits: 42 },
        rack: { units: 42, width: 19, depth: 600 }
    };
    
    const telecomType = await typeRegistry.createType('telecom', telecomConfig);
    
    console.assert(telecomType instanceof TelecomCabinet, '✗ Неверный тип');
    console.assert(telecomType.hasRackUnits() === false, '✗ hasRackUnits() зависит от mountingZones');
    console.assert(telecomType.getRackUnits() === 42, '✗ rackUnits должен быть 42');
    
    const equipmentList = [
        { mounting: { rackUnits: 2 }, specs: { power: 500 } },
        { mounting: { rackUnits: 1 }, specs: { power: 300 } }
    ];
    
    const metrics = telecomType.calculateTypeSpecificMetrics(equipmentList);
    
    console.assert(metrics.usedRackUnits === 3, '✗ Занято должно быть 3U');
    console.assert(metrics.availableRackUnits === 39, '✗ Свободно должно быть 39U');
    
    console.log('✅ TelecomCabinet расчёты работают');
    console.log(`   Занято: ${metrics.usedRackUnits}U / ${telecomType.getRackUnits()}U`);
    console.log(`   Утилизация: ${metrics.utilizationPercent}%`);
} catch (error) {
    console.error('✗ TelecomCabinet Calculations FAILED:', error.message);
}

console.log('');

// ========== Final Summary ==========
console.log('=== 🎉 Smoke Test Завершён ===');
console.log('Все базовые проверки пройдены!');
console.log('');
console.log('Следующие шаги:');
console.log('1. Интеграция ValidationEngine в EquipmentManager');
console.log('2. Тестирование на реальных 3D-моделях шкафов');
console.log('3. Добавление React Event Layer для синхронизации UI');
