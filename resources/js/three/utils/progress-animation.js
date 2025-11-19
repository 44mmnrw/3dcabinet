(function() {
    'use strict';
    
    const parameterItems = document.querySelectorAll('.parameter-item');
    
    parameterItems.forEach((item, index) => {
        const progressFill = item.querySelector('.mini-progress-fill');
        const progressValue = item.querySelector('.progress-value');
        
        if (!progressFill || !progressValue) return;
        
        // 🔧 ЖЁСТКО ЗАДАННЫЕ ЗНАЧЕНИЯ ДЛЯ КАЖДОЙ ШКАЛЫ
        const configs = [
            { start: 15, end: 65 },  // Энергопотребление
            { start: 20, end: 75 },  // Масса
            { start: 10, end: 55 }   // Тепловыделение
        ];
        
        const startPercent = configs[index]?.start || 15;
        const endPercent = configs[index]?.end || 55;     // конечное значение при hover
        
        // Устанавливаем начальное состояние
        progressFill.style.width = startPercent + '%';
        progressValue.textContent = startPercent + '%';
        
        // 🔧 ОБРАБОТЧИК ПРИ НАВЕДЕНИИ - здесь происходит анимация увеличения
        item.addEventListener('mouseenter', function() {
            progressFill.style.width = endPercent + '%';
            animateValue(progressValue, startPercent, endPercent, 500); // 500ms - скорость анимации
        });
        
        // 🔧 ОБРАБОТЧИК ПРИ УХОДЕ МЫШИ - здесь происходит анимация уменьшения
        item.addEventListener('mouseleave', function() {
            progressFill.style.width = startPercent + '%';
            animateValue(progressValue, endPercent, startPercent, 500); // 500ms - скорость анимации
        });
    });
    
    // 🔧 ФУНКЦИЯ АНИМАЦИИ ЧИСЛОВОГО ЗНАЧЕНИЯ
    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16); // 60 FPS (16ms на кадр)
        let current = start;
        
        const timer = setInterval(function() {
            current += increment;
            
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            
            element.textContent = Math.round(current) + '%';
        }, 16);
    }
})();
