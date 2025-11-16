/**
 * Каталог доступных термошкафов
 * Содержит метаданные для UI и параметры загрузки
 */

export const CABINETS_CATALOG = [
    {
        id: 'tsh_700_500_240',
        name: 'ТШ-7-IP54',
        description: 'Термошкаф уличный 700×500×240 мм',
        category: 'thermal',  // Для Type System (было 'outdoor')
        schemaVersion: 2,     // Версионирование схемы
        dimensions: {
            width: 700,   // мм
            height: 500,  // мм
            depth: 240    // мм
        },
        specifications: {
            protection: 'IP54',
            mounting: 'wall',
            material: 'Сталь 1.5 мм',
            weight: 18,   // кг
            maxLoad: 50,  // кг
            maxPower: 3000, // Вт (добавлено)
            temperatureRange: '-40°C до +50°C'
        },
        // Возможности монтажа (для Type System)
        mountingCapabilities: ['din_rail', 'mounting_plate'],
        
        // Абстракция монтажных зон (NEW!)
        mountingZones: [
            {
                type: 'din_rail',
                componentNames: ['dinRail1', 'dinRail2']  // Рейки в 3D-модели
            },
            {
                type: 'mounting_plate',
                componentNames: ['mountingPlate']
            }
        ],
        
        // Специфичные параметры термошкафа
        thermal: {
            heatingPower: 800,
            coolingPower: 0,
            insulation: 'standard',
            operatingTemp: { min: -40, max: 55 }
        },
        
        climate: {
            hasHeater: true,
            hasCooler: false,
            hasThermostat: false,
            hasHumidityControl: false
        },
        
        features: {
            hasDoor: true,
            hasDinRails: true,
            dinRailCount: 2,
            hasHeating: true,
            hasVentilation: false
        },
        model: {
            path: '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb',
            compressed: true, // DRACO compression
            fileSize: '2.1 MB'
        },
        thumbnail: '/assets/images/cabinets/tsh_700_500_240_thumb.jpg',
        price: 12500, // руб
        inStock: true
    }
    // Здесь будут добавляться новые шкафы по мере разработки:
    // {
    //     id: 'tsh_800_600_300',
    //     name: 'ТШ-8-IP54',
    //     ...
    // }
];

/**
 * Получить данные шкафа по ID
 */
export function getCabinetById(id) {
    return CABINETS_CATALOG.find(cabinet => cabinet.id === id);
}

/**
 * Получить все шкафы по категории
 */
export function getCabinetsByCategory(category) {
    return CABINETS_CATALOG.filter(cabinet => cabinet.category === category);
}

/**
 * Получить все доступные шкафы
 */
export function getAvailableCabinets() {
    return CABINETS_CATALOG.filter(cabinet => cabinet.inStock);
}
