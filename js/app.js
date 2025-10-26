/* ================================================
   3Cabinet Configurator - Main Application
   ================================================ */

// Состояние приложения
const appState = {
  installedEquipment: [], // [{equipmentId, position, units}]
  draggedEquipment: null
};

// DOM элементы
let equipmentGrid, cabinetGrid, paramsContainer;

// ================================================
// Инициализация приложения
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  equipmentGrid = document.getElementById('equipment-grid');
  cabinetGrid = document.getElementById('cabinet-grid');
  paramsContainer = document.getElementById('parameters');

  renderCabinetInfo();
  renderEquipmentCatalog();
  renderCabinet();
  updateParameters();

  console.log('3Cabinet Configurator initialized');
}

// ================================================
// Рендеринг информации о шкафе
// ================================================
function renderCabinetInfo() {
  const infoContainer = document.getElementById('cabinet-info');

  infoContainer.innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Тип</div>
        <div class="info-value">${CABINET_CONFIG.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Юниты</div>
        <div class="info-value">${CABINET_CONFIG.units}U</div>
      </div>
      <div class="info-item">
        <div class="info-label">Размер</div>
        <div class="info-value">${CABINET_CONFIG.width}×${CABINET_CONFIG.depth} мм</div>
      </div>
      <div class="info-item">
        <div class="info-label">Макс. вес</div>
        <div class="info-value">${CABINET_CONFIG.maxWeight} кг</div>
      </div>
    </div>
  `;
}

// ================================================
// Рендеринг каталога оборудования
// ================================================
function renderEquipmentCatalog() {
  equipmentGrid.innerHTML = EQUIPMENT_DATA.map(equipment => `
    <div class="equipment-card" 
         draggable="true"
         data-equipment-id="${equipment.id}"
         ondragstart="handleDragStart(event, ${equipment.id})"
         ondragend="handleDragEnd(event)">
      <div class="equipment-header">
        <div class="equipment-name">${equipment.name}</div>
        <div class="unit-badge">${equipment.units}U</div>
      </div>
      <div class="equipment-description">${equipment.description}</div>
      <div class="equipment-specs">
        <div class="spec-item">⚡ ${equipment.power}W</div>
        <div class="spec-item">⚖️ ${equipment.weight}кг</div>
        <div class="spec-item">📏 ${equipment.depth}мм</div>
      </div>
    </div>
  `).join('');
}

// ================================================
// Рендеринг шкафа
// ================================================
function renderCabinet() {
  const units = [];

  for (let i = CABINET_CONFIG.units; i >= 1; i--) {
    const installed = findEquipmentAtPosition(i);

    if (installed) {
      // Показываем только первый юнит оборудования
      if (i === installed.position + installed.units - 1) {
        units.push(createOccupiedUnit(i, installed));
      }
      // Пропускаем остальные юниты этого оборудования
    } else {
      units.push(createEmptyUnit(i));
    }
  }

  cabinetGrid.innerHTML = units.join('');
}

function createEmptyUnit(unitNumber) {
  return `
    <div class="cabinet-unit empty" 
         data-unit="${unitNumber}"
         ondragover="handleDragOver(event)"
         ondragleave="handleDragLeave(event)"
         ondrop="handleDrop(event, ${unitNumber})">
      <div class="unit-number">${unitNumber}U</div>
    </div>
  `;
}

function createOccupiedUnit(unitNumber, installed) {
  const equipment = EQUIPMENT_DATA.find(e => e.id === installed.equipmentId);

  return `
    <div class="cabinet-unit occupied" 
         data-unit="${unitNumber}"
         style="grid-row: span ${installed.units}; min-height: ${installed.units * 20}px;"
         onclick="handleRemoveEquipment(${installed.equipmentId})">
      <div class="unit-number">${unitNumber}U</div>
      <div class="unit-equipment">${equipment.name} (${installed.units}U)</div>
      <button class="remove-btn" onclick="event.stopPropagation(); handleRemoveEquipment(${installed.equipmentId})">✕</button>
    </div>
  `;
}

// ================================================
// Drag & Drop handlers
// ================================================
function handleDragStart(event, equipmentId) {
  const equipment = EQUIPMENT_DATA.find(e => e.id === equipmentId);
  appState.draggedEquipment = equipment;
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  appState.draggedEquipment = null;

  // Убираем все highlight
  document.querySelectorAll('.cabinet-unit.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event, position) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');

  if (!appState.draggedEquipment) return;

  const equipment = appState.draggedEquipment;

  // Проверка возможности размещения
  if (canPlaceEquipment(position, equipment.units)) {
    installEquipment(equipment.id, position, equipment.units);
    showNotification(`${equipment.name} установлен в позицию ${position}U`, 'success');
  } else {
    showNotification('Невозможно разместить оборудование в этой позиции', 'error');
  }
}

// ================================================
// Логика размещения оборудования
// ================================================
function canPlaceEquipment(position, units) {
  // Проверка границ
  if (position - units + 1 < 1) {
    return false;
  }

  // Проверка пересечений
  for (let i = position; i > position - units; i--) {
    if (findEquipmentAtPosition(i)) {
      return false;
    }
  }

  return true;
}

function installEquipment(equipmentId, position, units) {
  appState.installedEquipment.push({
    equipmentId,
    position,
    units
  });

  renderCabinet();
  updateParameters();
}

function handleRemoveEquipment(equipmentId) {
  const equipment = EQUIPMENT_DATA.find(e => e.id === equipmentId);
  appState.installedEquipment = appState.installedEquipment.filter(
    e => e.equipmentId !== equipmentId
  );

  renderCabinet();
  updateParameters();
  showNotification(`${equipment.name} удален`, 'info');
}

function findEquipmentAtPosition(unitNumber) {
  return appState.installedEquipment.find(installed => {
    const start = installed.position - installed.units + 1;
    const end = installed.position;
    return unitNumber >= start && unitNumber <= end;
  });
}

// ================================================
// Обновление параметров
// ================================================
function updateParameters() {
  const totalPower = calculateTotalPower();
  const totalWeight = calculateTotalWeight();
  const usedUnits = calculateUsedUnits();

  const powerPercent = (totalPower / CABINET_CONFIG.maxPower) * 100;
  const weightPercent = (totalWeight / CABINET_CONFIG.maxWeight) * 100;
  const unitsPercent = (usedUnits / CABINET_CONFIG.units) * 100;

  paramsContainer.innerHTML = `
    <div class="parameter-card">
      <div class="parameter-label">Энергопотребление</div>
      <div class="parameter-value">${totalPower} / ${CABINET_CONFIG.maxPower} Вт</div>
      <div class="progress-bar">
        <div class="progress-fill ${powerPercent > 80 ? 'warning' : ''}" 
             style="width: ${Math.min(powerPercent, 100)}%"></div>
      </div>
      <div class="parameter-detail">Резерв: ${CABINET_CONFIG.maxPower - totalPower} Вт</div>
    </div>

    <div class="parameter-card">
      <div class="parameter-label">Нагрузка</div>
      <div class="parameter-value">${totalWeight} / ${CABINET_CONFIG.maxWeight} кг</div>
      <div class="progress-bar">
        <div class="progress-fill ${weightPercent > 80 ? 'warning' : ''}" 
             style="width: ${Math.min(weightPercent, 100)}%"></div>
      </div>
      <div class="parameter-detail">Резерв: ${CABINET_CONFIG.maxWeight - totalWeight} кг</div>
    </div>

    <div class="parameter-card">
      <div class="parameter-label">Занятость</div>
      <div class="parameter-value">${usedUnits} / ${CABINET_CONFIG.units} U</div>
      <div class="progress-bar">
        <div class="progress-fill ${unitsPercent > 80 ? 'warning' : ''}" 
             style="width: ${Math.min(unitsPercent, 100)}%"></div>
      </div>
      <div class="parameter-detail">Свободно: ${CABINET_CONFIG.units - usedUnits} U</div>
    </div>
  `;
}

function calculateTotalPower() {
  return appState.installedEquipment.reduce((total, installed) => {
    const equipment = EQUIPMENT_DATA.find(e => e.id === installed.equipmentId);
    return total + equipment.power;
  }, 0);
}

function calculateTotalWeight() {
  return appState.installedEquipment.reduce((total, installed) => {
    const equipment = EQUIPMENT_DATA.find(e => e.id === installed.equipmentId);
    return total + equipment.weight;
  }, 0);
}

function calculateUsedUnits() {
  return appState.installedEquipment.reduce((total, installed) => {
    return total + installed.units;
  }, 0);
}

// ================================================
// Уведомления
// ================================================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
