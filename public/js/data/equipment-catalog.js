/**
 * Каталог оборудования для размещения в шкафах
 * Содержит метаданные, 3D модели, правила размещения
 */

export const EQUIPMENT_CATALOG = [
    {
        id: 'circuit_breaker_1p',
        name: 'Автоматический выключатель 1P',
        description: 'Однополюсный автоматический выключатель 16A',
        category: 'protection',
        subcategory: 'circuit_breakers',
        
        // Технические характеристики
        specifications: {
            current: 16,           // А
            poles: 1,              // полюсов
            voltage: 230,          // В
            breakingCapacity: 6000, // А (отключающая способность)
            standard: 'GOST R 50345',
            manufacturer: 'IEK'
        },
        
        // Физические размеры (для размещения на DIN-рейке)
        dimensions: {
            width: 18,    // мм (модули: 1 модуль = 18 мм)
            height: 80,   // мм
            depth: 70,    // мм
            modules: 1    // количество модулей на DIN-рейке
        },
        
        // Параметры монтажа
        mounting: {
            type: 'din_rail',      // 'din_rail', 'wall', 'floor'
            orientation: 'vertical',
            requiresSpace: true,   // нужно ли свободное место
            snapToGrid: true       // примагничивание к сетке
        },
        
        // 3D модель
        model: {
            path: '/assets/models/equipment/circuit_breaker/circuit_breaker.glb',
            compressed: true,      // DRACO compression
            fileSize: '156 KB',
            scale: 1.0,            // масштаб по умолчанию
            pivotOffset: { x: 0, y: 0, z: 0 } // смещение точки крепления
        },
        
        // UI данные
        thumbnail: '/assets/images/equipment/circuit_breaker_thumb.jpg',
        icon: 'circuit-breaker',
        color: '#2196F3',
        
        // Коммерческие данные
        price: 245,        // руб
        inStock: true,
        vendor: 'IEK',
        article: 'MVK10-1-016-C'
    }
    
    // Шаблон для будущего оборудования:
    // {
    //     id: 'power_supply_12v',
    //     name: 'Блок питания 12V/5A',
    //     category: 'power',
    //     subcategory: 'power_supplies',
    //     dimensions: { width: 36, height: 90, depth: 58, modules: 2 },
    //     mounting: { type: 'din_rail', orientation: 'vertical' },
    //     model: { path: '/assets/models/equipment/power_supply_12v/model.glb' },
    //     price: 1850,
    //     inStock: true
    // }
];

/**
 * Получить оборудование по ID
 */
export function getEquipmentById(id) {
    return EQUIPMENT_CATALOG.find(eq => eq.id === id);
}

/**
 * Получить оборудование по категории
 */
export function getEquipmentByCategory(category) {
    return EQUIPMENT_CATALOG.filter(eq => eq.category === category);
}

/**
 * Получить все DIN-rail оборудование
 */
export function getDinRailEquipment() {
    return EQUIPMENT_CATALOG.filter(eq => eq.mounting.type === 'din_rail');
}

/**
 * Получить доступное оборудование
 */
export function getAvailableEquipment() {
    return EQUIPMENT_CATALOG.filter(eq => eq.inStock);
}

/**
 * Категории оборудования для фильтрации UI
 */
export const EQUIPMENT_CATEGORIES = {
    protection: {
        name: 'Защита',
        icon: 'shield',
        color: '#FF9800'
    },
    power: {
        name: 'Питание',
        icon: 'power',
        color: '#4CAF50'
    },
    network: {
        name: 'Сеть',
        icon: 'network',
        color: '#2196F3'
    },
    control: {
        name: 'Управление',
        icon: 'settings',
        color: '#9C27B0'
    },
    accessories: {
        name: 'Аксессуары',
        icon: 'box',
        color: '#607D8B'
    }
};
