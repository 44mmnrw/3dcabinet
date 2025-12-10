/**
 * Типы для оборудования
 */

import type * as THREE from 'three';

/**
 * Категория оборудования
 */
export type EquipmentCategory = 
    | 'protection'      // Защита (автоматы, УЗО)
    | 'power'          // Питание (блоки питания)
    | 'communication'  // Коммутация (коммутаторы, роутеры)
    | 'control'        // Управление (контроллеры)
    | 'monitoring'     // Мониторинг (датчики)
    | 'accessories';   // Аксессуары (розетки, разъёмы)

/**
 * Тип монтажа оборудования
 */
export type EquipmentMountingType = 'din_rail' | 'wall' | 'floor' | 'rack_unit' | 'mounting_plate';

/**
 * Ориентация оборудования
 */
export type EquipmentOrientation = 'vertical' | 'horizontal';

/**
 * Размеры оборудования в метрах (для Three.js сцены)
 */
export interface EquipmentDimensions {
    width: number;      // м
    height: number;    // м
    depth: number;     // м
    modules?: number;  // Количество модульных мест на DIN-рейке
}

/**
 * Технические характеристики оборудования
 */
export interface EquipmentSpecifications {
    current?: number;           // А
    voltage?: number;           // В
    power?: number;             // Вт
    poles?: number;             // Количество полюсов
    breakingCapacity?: number;  // А (отключающая способность)
    standard?: string;          // ГОСТ, IEC и т.д.
    manufacturer?: string;
    [key: string]: unknown;         // Дополнительные характеристики
}

/**
 * Параметры монтажа оборудования
 */
export interface EquipmentMounting {
    type: EquipmentMountingType;
    orientation: EquipmentOrientation;
    requiresSpace?: boolean;
    snapToGrid?: boolean;
    anchorPoint?: {
        offset: [number, number, number];  // Смещение точки крепления
        meshName?: string;                  // Имя mesh для точки крепления (например, "rail_mesh" для DIN-рейки)
    };
}

/**
 * Параметры 3D-модели оборудования
 */
export interface EquipmentModel {
    path: string;              // Путь к GLB/GLTF файлу
    compressed?: boolean;
    fileSize?: string;
    scale?: number;
    pivotOffset?: {
        x: number;
        y: number;
        z: number;
    };
}

/**
 * Конфигурация оборудования из каталога
 */
export interface EquipmentConfig {
    id: string;
    name: string;
    description?: string;
    category: EquipmentCategory;
    subcategory?: string;
    specifications: EquipmentSpecifications;
    dimensions: EquipmentDimensions;
    mounting: EquipmentMounting;
    model: EquipmentModel;
    thumbnail?: string;
    icon?: string;
    color?: string;
    price?: number;
    inStock?: boolean;
    vendor?: string;
    article?: string;
    [key: string]: unknown;  // Для дополнительных полей
}

/**
 * Данные привязки оборудования к монтажной поверхности
 * Используется для пересчёта позиции при ресайзе шкафа
 */
export interface EquipmentMountingData {
    railName: string;           // Имя рейки (din_rail_0, din_rail_1...)
    relativeX: number;          // Смещение от левого края рейки по X
    relativeY: number;          // Смещение от центра рейки по Y (обычно 0)
    relativeZ: number;          // Смещение от передней грани рейки по Z
}

/**
 * Экземпляр оборудования в сцене
 * 
 * Структура данных, которая хранится в EquipmentManager.equipment Map
 */
export interface EquipmentInstance {
    id: string;
    type: string;                    // Тип оборудования (circuit_breaker и т.д.)
    mesh: THREE.Group;               // 3D-модель оборудования
    config: EquipmentConfig;          // Конфигурация из каталога
    railIndex: number;               // Индекс DIN-рейки (0-3)
    moduleIndex?: number;            // Позиция на рейке (для модульного оборудования)
    /** Дополнительные координатные параметры (используются стратегиями монтажа) */
    xOffset?: number | null;         // Смещение вдоль рейки (метры)
    unitIndex?: number;              // Позиция по юнитам (для rack_unit)
    depth?: number;                  // Глубина установки (rack / монтажная плата)
    cabinetId: string;               // ID шкафа, в котором установлено
    position?: THREE.Vector3;        // Позиция в сцене
    
    /** Данные привязки к рейке для синхронизации при ресайзе */
    mountingData?: EquipmentMountingData;
}

