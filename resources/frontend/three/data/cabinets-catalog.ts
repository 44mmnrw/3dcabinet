/**
 * Каталог доступных термошкафов
 * Содержит метаданные для UI и параметры загрузки
 */

import type { CabinetDefinition } from '../types/cabinet.types.js';

export const CABINETS_CATALOG: CabinetDefinition[] = [
    {
        id: 'tsh_700_500_240',
        name: 'ТШ-7-IP54',
        displayName: 'Термошкаф уличный 700×500×240 мм',
        description: 'Термошкаф уличный 700×500×240 мм',
        className: 'tsh_700_500_240',
        modulePath: '/js/cabinets/tsh_700_500_240/tsh_700_500_240.js',
        category: 'thermal',
        schemaVersion: 2,
        dimensions: {
            width: 700,
            height: 500,
            depth: 240
        },
        specs: {
            maxLoad: 50,
            maxPower: 3000
        },
        mountingCapabilities: ['din_rail', 'mounting_plate'],
        mountingZones: [
            {
                type: 'din_rail',
                componentNames: ['dinRail1', 'dinRail2']
            },
            {
                type: 'mounting_plate',
                componentNames: ['mountingPlate']
            }
        ],
        thermal: {
            heatingPower: 800,
            coolingPower: 0,
            insulation: 'standard',
            operatingTemp: { min: -40, max: 55 }
        },
        climate: {
            ip: 'IP54',
            hasHeater: true,
            hasFans: false
        },
        thumbnail: '/assets/images/cabinets/tsh_700_500_240_thumb.jpg',
        // Дополнительные поля
        features: {
            hasDoor: true,
            hasDinRails: true,
            dinRailCount: 2,
            hasHeating: true,
            hasVentilation: false
        },
        model: {
            path: '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb',
            compressed: true,
            fileSize: '2.1 MB'
        },
        price: 12500,
        inStock: true
    } as CabinetDefinition
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
export function getCabinetById(id: string): CabinetDefinition | undefined {
    return CABINETS_CATALOG.find(cabinet => cabinet.id === id);
}

/**
 * Получить все шкафы по категории
 */
export function getCabinetsByCategory(category: string): CabinetDefinition[] {
    return CABINETS_CATALOG.filter(cabinet => cabinet.category === category);
}

/**
 * Получить все доступные шкафы
 */
export function getAvailableCabinets(): CabinetDefinition[] {
    return CABINETS_CATALOG.filter(cabinet => (cabinet as any).inStock !== false);
}

