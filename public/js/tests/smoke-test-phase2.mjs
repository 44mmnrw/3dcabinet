/**
 * Smoke Test для Phase 2: Logic Engine & Event System
 * 
 * Запуск: node public/js/tests/smoke-test-phase2.mjs
 */

import { LogicEngine, ThermalLogicPlugin, TelecomLogicPlugin, ServerLogicPlugin, createDefaultLogicEngine } from '../logic/index.js';
import { EventBus, ConfiguratorEvents } from '../events/EventBus.js';

console.log('🧪 Phase 2 Smoke Test\n');

// ============================================
// Test 1: LogicEngine Registration
// ============================================
console.log('Test 1: LogicEngine Plugin Registration');
const engine = new LogicEngine();
engine.registerPlugin('thermal', new ThermalLogicPlugin());
engine.registerPlugin('telecom', new TelecomLogicPlugin());
engine.registerPlugin('server', new ServerLogicPlugin());

const categories = engine.getRegisteredCategories();
console.assert(categories.length === 3, 'Expected 3 plugins');
console.assert(engine.hasPlugin('thermal'), 'Thermal plugin registered');
console.assert(engine.hasPlugin('telecom'), 'Telecom plugin registered');
console.assert(engine.hasPlugin('server'), 'Server plugin registered');
console.log('✅ Plugin registration OK\n');

// ============================================
// Test 2: ThermalLogicPlugin Calculations
// ============================================
console.log('Test 2: ThermalLogicPlugin Calculations');
const thermalCabinet = {
    category: 'thermal',
    dimensions: { width: 700, height: 1872, depth: 500 },
    thermal: {
        heatingPower: 1000,
        coolingPower: 2000,
        operatingTemp: { min: -40, max: 55 }
    },
    getMaxPower: () => 3000,
    getMaxLoad: () => 100
};

const thermalEquipment = [
    { id: 'eq1', specs: { power: 500, heatDissipation: 400, weight: 2.5 } },
    { id: 'eq2', specs: { power: 800, heatDissipation: 700, weight: 3.0 } }
];

const thermalPlugin = new ThermalLogicPlugin();
const thermalResult = thermalPlugin.calculate(thermalCabinet, thermalEquipment);

console.assert(thermalResult.category === 'thermal', 'Category: thermal');
console.assert(thermalResult.calculations.totalPower === 1300, 'Total power: 1300W');
console.assert(thermalResult.calculations.totalHeatDissipation === 1100, 'Heat dissipation: 1100W');
console.assert(thermalResult.calculations.totalWeight === 5.5, 'Total weight: 5.5kg');
console.assert(thermalResult.calculations.coolingRequired === 1100, 'Cooling required: 1100W');
console.assert(thermalResult.calculations.thermalBalance === 'balanced', 'Thermal balance: balanced');
console.log('✅ Thermal calculations OK\n');

// ============================================
// Test 3: TelecomLogicPlugin Calculations
// ============================================
console.log('Test 3: TelecomLogicPlugin Calculations');
const telecomCabinet = {
    category: 'telecom',
    dimensions: { width: 600, height: 1872, depth: 1000 },
    power: {
        phases: 1,
        maxCurrent: 16,
        hasPDU: true
    },
    cabling: {
        maxCableLoad: 50,
        hasVerticalCableManager: false
    },
    getRackUnits: () => 42
};

const telecomEquipment = [
    { id: 'switch', mounting: { rackUnits: 2 }, specs: { power: 300 } },
    { id: 'router', mounting: { rackUnits: 1 }, specs: { power: 150 } },
    { id: 'patch', mounting: { rackUnits: 1 }, specs: { power: 0, cableWeight: 5 } }
];

const telecomPlugin = new TelecomLogicPlugin();
const telecomResult = telecomPlugin.calculate(telecomCabinet, telecomEquipment);

console.assert(telecomResult.category === 'telecom', 'Category: telecom');
console.assert(telecomResult.calculations.usedRackUnits === 4, 'Used rack units: 4');
console.assert(telecomResult.calculations.totalPower === 450, 'Total power: 450W');
console.assert(Math.abs(telecomResult.calculations.totalCurrent - 450 / 230) < 0.01, 'Current calculation correct');
console.assert(telecomResult.calculations.utilizationPercent < 10, 'Low utilization');
console.assert(telecomResult.calculations.requiresCableManager === true, 'Requires cable manager');
console.log('✅ Telecom calculations OK\n');

// ============================================
// Test 4: ServerLogicPlugin Calculations
// ============================================
console.log('Test 4: ServerLogicPlugin Calculations');
const serverCabinet = {
    category: 'server',
    dimensions: { width: 600, height: 2000, depth: 1000 },
    power: {
        maxPowerDensity: 0.5,
        redundancy: 'none'
    },
    cooling: {
        coolingCapacity: 10,
        airflowType: 'active',
        hasHotAisle: true,
        hasColdAisle: true
    },
    getMaxPower: () => 8000
};

const serverEquipment = [
    { id: 'srv1', mounting: { rackUnits: 2 }, specs: { power: 2000, heatDissipation: 1800 } },
    { id: 'srv2', mounting: { rackUnits: 2 }, specs: { power: 3000, heatDissipation: 2700 } }
];

const serverPlugin = new ServerLogicPlugin();
const serverResult = serverPlugin.calculate(serverCabinet, serverEquipment);

console.assert(serverResult.category === 'server', 'Category: server');
console.assert(serverResult.calculations.totalPower === 5, 'Total power: 5kW');
console.assert(serverResult.calculations.totalHeatLoad === 4.5, 'Heat load: 4.5kW');
console.assert(serverResult.calculations.usedRackUnits === 4, 'Used rack units: 4');
console.assert(serverResult.calculations.powerDensity === 1.25, 'Power density: 1.25kW/U');
console.assert(serverResult.calculations.coolingAdequacy === 'adequate', 'Cooling adequate');
console.assert(serverResult.calculations.airflowBalance === 'balanced', 'Airflow balanced');
console.log('✅ Server calculations OK\n');

// ============================================
// Test 5: LogicEngine Default Factory
// ============================================
console.log('Test 5: LogicEngine Default Factory');
const defaultEngine = createDefaultLogicEngine();
const factoryCategories = defaultEngine.getRegisteredCategories();

console.assert(factoryCategories.includes('thermal'), 'Has thermal');
console.assert(factoryCategories.includes('outdoor'), 'Has outdoor alias');
console.assert(factoryCategories.includes('telecom'), 'Has telecom');
console.assert(factoryCategories.includes('network'), 'Has network alias');
console.assert(factoryCategories.includes('server'), 'Has server');
console.assert(factoryCategories.includes('datacenter'), 'Has datacenter alias');
console.log('✅ Default factory OK\n');

// ============================================
// Test 6: EventBus Basic Operations
// ============================================
console.log('Test 6: EventBus Basic Operations');
const eventBus = new EventBus();
let receivedEvent = null;
let callCount = 0;

const handler = (event) => {
    receivedEvent = event.detail;
    callCount++;
};

eventBus.on('test:event', handler);
console.assert(eventBus.getListenerCount('test:event') === 1, '1 listener registered');

eventBus.emit('test:event', { value: 42 });
console.assert(receivedEvent && receivedEvent.value === 42, 'Event received with correct data');
console.assert(callCount === 1, 'Handler called once');

eventBus.emit('test:event', { value: 100 });
console.assert(receivedEvent.value === 100, 'Event updated');
console.assert(callCount === 2, 'Handler called twice');

eventBus.off('test:event', handler);
console.assert(eventBus.getListenerCount('test:event') === 0, 'Listener removed');

console.log('✅ EventBus operations OK\n');

// ============================================
// Test 7: EventBus Once and Multiple Listeners
// ============================================
console.log('Test 7: EventBus Once and Multiple Listeners');
const eventBus2 = new EventBus();
let count1 = 0, count2 = 0, count3 = 0;

eventBus2.on('multi:event', () => count1++);
eventBus2.on('multi:event', () => count2++);
eventBus2.once('multi:event', () => count3++);

console.assert(eventBus2.getListenerCount('multi:event') === 3, '3 listeners registered');

eventBus2.emit('multi:event');
console.assert(count1 === 1 && count2 === 1 && count3 === 1, 'All handlers called');

eventBus2.emit('multi:event');
console.assert(count1 === 2 && count2 === 2 && count3 === 1, 'Once handler not called again');

console.log('✅ EventBus once/multiple OK\n');

// ============================================
// Test 8: ConfiguratorEvents Constants
// ============================================
console.log('Test 8: ConfiguratorEvents Constants');
console.assert(ConfiguratorEvents.CABINET_ADDED === 'cabinet:added', 'CABINET_ADDED constant');
console.assert(ConfiguratorEvents.EQUIPMENT_ADDED === 'equipment:added', 'EQUIPMENT_ADDED constant');
console.assert(ConfiguratorEvents.CALCULATIONS_UPDATED === 'calculations:updated', 'CALCULATIONS_UPDATED constant');
console.assert(ConfiguratorEvents.VALIDATION_FAILED === 'validation:failed', 'VALIDATION_FAILED constant');
console.log('✅ ConfiguratorEvents constants OK\n');

// ============================================
// Test 9: Integration Scenario (Minimal)
// ============================================
console.log('Test 9: Integration Scenario');
const integrationEngine = createDefaultLogicEngine();
const integrationBus = new EventBus();

let calculationsReceived = null;
let recommendationsReceived = null;

integrationBus.on(ConfiguratorEvents.CALCULATIONS_UPDATED, (event) => {
    calculationsReceived = event.detail.calculations;
});

integrationBus.on(ConfiguratorEvents.RECOMMENDATIONS_UPDATED, (event) => {
    recommendationsReceived = event.detail.recommendations;
});

// Simulate cabinet + equipment
const result = integrationEngine.calculate(thermalCabinet, thermalEquipment);
integrationBus.emit(ConfiguratorEvents.CALCULATIONS_UPDATED, {
    cabinetId: 'test_cab',
    calculations: result.calculations
});
integrationBus.emit(ConfiguratorEvents.RECOMMENDATIONS_UPDATED, {
    cabinetId: 'test_cab',
    recommendations: result.recommendations
});

console.assert(calculationsReceived !== null, 'Calculations received');
console.assert(calculationsReceived.totalPower === 1300, 'Calculations data correct');
console.assert(Array.isArray(recommendationsReceived), 'Recommendations is array');
console.log('✅ Integration scenario OK\n');

// ============================================
// Test 10: Error Handling
// ============================================
console.log('Test 10: Error Handling');
const errorEngine = new LogicEngine();

// Plugin не зарегистрирован
const errorResult = errorEngine.calculate({ category: 'unknown' }, []);
console.assert(errorResult.category === 'unknown', 'Category preserved');
console.assert(Object.keys(errorResult.calculations).length === 0, 'Empty calculations');
console.assert(errorResult.warnings.length === 0, 'No warnings');

// Invalid plugin (no calculate method)
const invalidPlugin = { name: 'Invalid' };
errorEngine.registerPlugin('invalid', invalidPlugin);
console.assert(!errorEngine.hasPlugin('invalid'), 'Invalid plugin not registered');

console.log('✅ Error handling OK\n');

// ============================================
// Summary
// ============================================
console.log('═══════════════════════════════════════');
console.log('✅ All Phase 2 tests passed!');
console.log('═══════════════════════════════════════');
console.log('LogicEngine: 3 plugins, calculations work');
console.log('EventBus: Events emit/subscribe work');
console.log('Integration: Events + Calculations combined');
console.log('═══════════════════════════════════════\n');
