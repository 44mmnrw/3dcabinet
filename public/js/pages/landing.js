/**
 * Скрипт управления выбором параметров шкафа
 * Управляет прогресс-баром, показом/скрытием блоков и активацией финальной кнопки
 */

(function() {
  'use strict';

  // Получаем все необходимые элементы
  const locationContainer = document.getElementById('location-container');
  const installationContainer = document.getElementById('installation-container');
  const installationTitle = document.getElementById('installation-title');
  const progressFill = document.getElementById('progress-fill');
  const stepLabel = document.getElementById('step-label');
  const continueButton = document.getElementById('continue-button');

  // Состояние выбора
  let selectedLocation = false;
  let selectedInstallation = false;

  /**
   * Обновляет прогресс-бар в зависимости от выбранных опций
   */
  function updateProgress() {
    if (selectedInstallation) {
      progressFill.style.width = '100%';
      stepLabel.textContent = 'Шаг 2 из 2 — Завершено';
    } else if (selectedLocation) {
      progressFill.style.width = '50%';
      stepLabel.textContent = 'Шаг 1 из 2';
    } else {
      progressFill.style.width = '0%';
      stepLabel.textContent = 'Шаг 0 из 2';
    }
  }

  /**
   * Активирует/деактивирует финальную кнопку (теперь ссылка)
   */
  function updateContinueButton() {
    if (selectedLocation && selectedInstallation) {
      continueButton.classList.remove('disabled-button');
      continueButton.style.pointerEvents = 'auto';
    } else {
      continueButton.classList.add('disabled-button');
      continueButton.style.pointerEvents = 'none';
    }
  }

  /**
   * Показывает блок с типом установки
   */
  function showInstallationBlock() {
    installationContainer.classList.remove('hidden');
    installationContainer.classList.add('visible');
    // Добавляем небольшую анимацию появления заголовка
    installationTitle.style.opacity = '1';
  }

  /**
   * Удаляет класс active у всех карточек в контейнере
   */
  function clearActiveCards(container) {
    const cards = container.querySelectorAll('.select-card');
    cards.forEach(card => card.classList.remove('active'));
  }

  /**
   * Обработчик клика на карточку выбора места установки
   */
  function handleLocationSelect(event) {
    const card = event.currentTarget;
    const radio = card.querySelector('input[type="radio"]');
    
    // Снимаем активный класс со всех карточек в этом контейнере
    clearActiveCards(locationContainer);
    
    // Активируем текущую карточку
    card.classList.add('active');
    radio.checked = true;
    
    // Обновляем состояние
    selectedLocation = true;
    
    // Показываем блок с типом установки
    showInstallationBlock();
    
    // Обновляем прогресс
    updateProgress();
    updateContinueButton();
  }

  /**
   * Обработчик клика на карточку выбора типа установки
   */
  function handleInstallationSelect(event) {
    const card = event.currentTarget;
    const radio = card.querySelector('input[type="radio"]');
    
    // Снимаем активный класс со всех карточек в этом контейнере
    clearActiveCards(installationContainer);
    
    // Активируем текущую карточку
    card.classList.add('active');
    radio.checked = true;
    
    // Обновляем состояние
    selectedInstallation = true;
    
    // Обновляем прогресс
    updateProgress();
    updateContinueButton();
  }

  /**
   * Инициализация обработчиков событий
   */
  function init() {
    // Устанавливаем начальный прогресс
    updateProgress();
    
    // Добавляем обработчики на карточки выбора места
    const locationCards = locationContainer.querySelectorAll('.select-card');
    locationCards.forEach(card => {
      card.addEventListener('click', handleLocationSelect);
    });

    // Добавляем обработчики на карточки выбора типа установки
    const installationCards = installationContainer.querySelectorAll('.select-card');
    installationCards.forEach(card => {
      card.addEventListener('click', handleInstallationSelect);
    });

    // Скрываем заголовок "Тип установки" изначально
    installationTitle.style.opacity = '0';
    installationTitle.style.transition = 'opacity 0.3s ease';
  }

  // Запускаем инициализацию после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
