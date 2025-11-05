/* ================================================
   DATA.JS — Конфигурация и данные для 3Cabinet
   ================================================ */

// Конфигурация шкафа по умолчанию
const CABINET_CONFIG = {
    // Базовые размеры (мм)
    width: 600,
    height: 2000,
    depth: 800,
    
    // Единицы (U)
    units: 42,
    unitHeight: 44.45, // мм
    
    // Параметры
    maxWeight: 1000, // кг
    maxPower: 5000, // Вт
    
    // Тип установки
    installation: 'floor', // floor | wall
    location: 'indoor' // indoor | outdoor
};

// Каталог оборудования
const EQUIPMENT_DATA = [
    {
        id: 'server-1u',
        name: 'Сервер 1U',
        category: 'Серверы',
        units: 1,
        weight: 15, // кг
        power: 350, // Вт
        heat: 350, // BTU
        depth: 650, // мм
        price: 85000,
        manufacturer: 'Dell',
        model: 'PowerEdge R340'
    },
    {
        id: 'server-2u',
        name: 'Сервер 2U',
        category: 'Серверы',
        units: 2,
        weight: 25,
        power: 750,
        heat: 750,
        depth: 700,
        price: 150000,
        manufacturer: 'HP',
        model: 'ProLiant DL380'
    },
    {
        id: 'switch-1u',
        name: 'Коммутатор 1U',
        category: 'Сетевое оборудование',
        units: 1,
        weight: 5,
        power: 100,
        heat: 100,
        depth: 400,
        price: 45000,
        manufacturer: 'Cisco',
        model: 'Catalyst 2960'
    },
    {
        id: 'ups-2u',
        name: 'ИБП 2U',
        category: 'Питание',
        units: 2,
        weight: 20,
        power: 1500,
        heat: 150,
        depth: 600,
        price: 95000,
        manufacturer: 'APC',
        model: 'Smart-UPS 1500'
    },
    {
        id: 'patch-panel-1u',
        name: 'Патч-панель 1U',
        category: 'Кабельная система',
        units: 1,
        weight: 2,
        power: 0,
        heat: 0,
        depth: 200,
        price: 8000,
        manufacturer: 'Generic',
        model: '24-port CAT6'
    }
];

// Экспорт для использования в других модулях (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CABINET_CONFIG, EQUIPMENT_DATA };
}
