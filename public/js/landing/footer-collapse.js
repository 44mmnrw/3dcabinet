// Footer accordion for mobile (< 768px)
(function() {
  const MOBILE_BREAKPOINT = 768;
  
  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }
  
  function initAccordion() {
    const sections = document.querySelectorAll('.footer-section');
    
    sections.forEach(section => {
      const title = section.querySelector('.footer-section-title');
      const list = section.querySelector('.footer-list');
      
      if (!title || !list) return;
      
      // На мобильных: свернуть по умолчанию
      if (isMobile()) {
        list.style.maxHeight = '0';
        list.style.opacity = '0';
        section.dataset.collapsed = 'true';
      } else {
        list.style.maxHeight = 'none';
        list.style.opacity = '1';
        section.dataset.collapsed = 'false';
      }
      
      // Клик по заголовку
      title.addEventListener('click', function() {
        if (!isMobile()) return;
        
        const isCollapsed = section.dataset.collapsed === 'true';
        
        if (isCollapsed) {
          // Раскрываем
          list.style.maxHeight = list.scrollHeight + 'px';
          list.style.opacity = '1';
          section.dataset.collapsed = 'false';
        } else {
          // Сворачиваем
          list.style.maxHeight = '0';
          list.style.opacity = '0';
          section.dataset.collapsed = 'true';
        }
      });
    });
  }
  
  // Инициализация при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordion);
  } else {
    initAccordion();
  }
  
  // Переинициализация при изменении размера окна
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initAccordion, 250);
  });
})();
