// === DEBUG SCRIPT FOR RACE CONDITION FIX ===
// Запустите в консоли браузера (F12)

console.log('🧪 Начало диагностики...\n');

// 1. Проверить DragDropController
console.log('1️⃣ DragDropController:');
console.log('   isReady:', window.dragDropController?.isReady ?? 'NOT FOUND');
console.log('   eventBus:', window.dragDropController?.eventBus ? '✅' : '❌ NULL');
console.log();

// 2. Проверить CabinetManager
console.log('2️⃣ CabinetManager:');
const cabinet = window.cabinetManager?.getActiveCabinet();
console.log('   getActiveCabinet():', cabinet ? '✅ Found' : '❌ NULL');
console.log('   activeCabinetId:', window.cabinetManager?.activeCabinetId ?? 'NOT SET');
console.log('   cabinets.size:', window.cabinetManager?.cabinets?.size ?? 0);
console.log();

// 3. Проверить EventBus
console.log('3️⃣ EventBus:');
console.log('   eventBus:', window.eventBus ? '✅' : '❌ NOT FOUND');
console.log('   listeners:', window.eventBus?.listeners?.size ?? 0, 'subscriptions');
console.log('   cabinet:added listeners:', window.eventBus?.listeners?.get('cabinet:added')?.length ?? 0);
console.log();

// 4. Проверить оборудование
console.log('4️⃣ Equipment Cards:');
const cards = document.querySelectorAll('[data-equipment-type]');
console.log('   Total cards found:', cards.length);
cards.forEach((card, i) => {
    if (i < 3) {  // Show first 3
        console.log(`   - ${card.dataset.equipmentType}`);
    }
});
if (cards.length > 3) {
    console.log(`   ... and ${cards.length - 3} more`);
}
console.log();

// 5. Проверить наличие моделей
console.log('5️⃣ Equipment Models:');
const equipmentTypes = ['circuit_breaker', 'socket_g'];
equipmentTypes.forEach(type => {
    console.log(`   ${type}: Checking...`);
    fetch(`/assets/models/equipment/${type}/${type}.json`)
        .then(r => r.ok ? `✅ Config found` : `❌ Config NOT found`)
        .then(msg => console.log(`            ${msg}`))
        .catch(() => console.log(`            ❌ Error loading config`));
});
console.log();

// 6. Тестовая функция: эмитить cabinet:added вручную
console.log('6️⃣ Test Functions:');
console.log('   testCabinetAdded() - emit cabinet:added event');
window.testCabinetAdded = () => {
    console.log('   📢 Emitting cabinet:added...');
    window.eventBus.emit('cabinet:added', { cabinetId: 'test' });
    console.log('   ✅ Event emitted. Check isReady:', window.dragDropController.isReady);
};

console.log('   checkDragDropReady() - check if drag-drop is ready');
window.checkDragDropReady = () => {
    const isReady = window.dragDropController?.isReady;
    const cabinet = window.cabinetManager?.getActiveCabinet();
    console.log(`   isReady: ${isReady ? '✅ YES' : '❌ NO'}`);
    console.log(`   cabinet: ${cabinet ? '✅ YES' : '❌ NO'}`);
    return isReady && cabinet;
};

console.log('   testDragStart(type) - simulate drag start');
window.testDragStart = (type = 'circuit_breaker') => {
    const card = document.querySelector(`[data-equipment-type="${type}"]`);
    if (!card) {
        console.log(`❌ Card for ${type} not found`);
        return;
    }
    console.log(`📢 Simulating drag start for ${type}...`);
    const event = new MouseEvent('mousedown', { button: 0 });
    card.dispatchEvent(event);
};

console.log();
console.log('✅ Диагностика завершена!');
console.log('\nПримеры:');
console.log('  window.checkDragDropReady()      // Check if ready');
console.log('  window.testCabinetAdded()        // Emit event manually');
console.log('  window.testDragStart("socket_g") // Test socket_g drag');
