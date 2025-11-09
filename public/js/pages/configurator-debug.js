console.log('🔥 DEBUG: Скрипт загрузился');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 DEBUG: DOM готов');
    
    const container = document.querySelector('#cabinet-3d-container');
    console.log('🔥 DEBUG: Контейнер:', container);
    
    if (container) {
        container.innerHTML = '<div style="padding: 2rem; background: green; color: white;">✅ JavaScript работает!</div>';
    }
});
