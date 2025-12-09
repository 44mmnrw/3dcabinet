/**
 * Типы для шкафов и их конфигураций
 */

import type * as THREE from 'three';
import type { CabinetBase } from '../cabinets/CabinetBase.ts';
import type { CabinetType } from './CabinetType.ts';
import type { MountingStrategy } from '../strategies/MountingStrategies.ts';
import type { EquipmentConfig } from './equipment.types.js';

/**
 * Категория шкафа
 */
export type CabinetCategory = 'thermal' | 'telecom' | 'server';

/**
 * Тип монтажа оборудования
 */
export type MountingCapability = 'din_rail' | 'rack_unit' | 'mounting_plate';

/**
 * Размеры шкафа в миллиметрах
 */
export interface CabinetDimensions {
    width: number;   // мм
    height: number;  // мм
    depth: number;   // мм
    [key: string]: unknown;  // Для совместимости с Record<string, unknown>
}

/**
 * Технические характеристики шкафа
 */
export interface CabinetSpecs {
    maxPower?: number;      // Вт
    maxLoad?: number;       // кг
    rackUnits?: number;     // U (для стоечных шкафов)
    cooling?: {
        type: string;
        capacity?: number;
    };
    [key: string]: unknown;  // Для совместимости с Record<string, unknown>
}

/**
 * Монтажная зона в шкафу
 */
export interface MountingZone {
    type: MountingCapability;
    componentNames: string[];  // Имена компонентов в 3D-модели
    position?: {
        x: number;
        y: number;
        z: number;
    };
    dimensions?: {
        width: number;
        height: number;
        depth: number;
    };
}

/**
 * Параметры термошкафа
 */
export interface ThermalSpecs {
    heatingPower?: number;      // Вт
    coolingPower?: number;      // Вт
    insulation?: string;
    operatingTemp?: {
        min: number;            // °C
        max: number;            // °C
    };
}

/**
 * Климатические параметры
 */
export interface ClimateSpecs {
    ip?: string;                // IP54, IP56, IP65
    hasHeater?: boolean;
    hasFans?: boolean;
}

/**
 * Тип модели шкафа
 */
export type CabinetModelType = 'freecad' | 'gltf' | 'glb';

/**
 * Определение шкафа из каталога
 */
export interface CabinetDefinition {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    className: string;
    modulePath: string;
    category: CabinetCategory;
    schemaVersion?: number;
    dimensions: CabinetDimensions;
    specs?: CabinetSpecs;
    mountingCapabilities: MountingCapability[];
    mountingZones?: MountingZone[];
    thermal?: ThermalSpecs;
    climate?: ClimateSpecs;
    thumbnail?: string;
    // Новые поля для поддержки GLTF/GLB
    modelType?: CabinetModelType;  // Тип модели: 'freecad' (по умолчанию) или 'gltf'/'glb'
    modelPath?: string;             // Путь к GLTF/GLB файлу (относительно /assets/models/cabinets/)
    [key: string]: unknown;  // Для дополнительных полей
}

/**
 * Экземпляр шкафа в сцене
 * 
 * Структура данных, которая хранится в CabinetManager.cabinets Map
 */
export interface CabinetInstance {
    id: string;
    type: string;                    // className шкафа
    instance: CabinetBase;           // Экземпляр шкафа с методами управления
    assembly: THREE.Group;           // 3D-модель шкафа
    position: THREE.Vector3;         // Позиция в сцене
    definition: CabinetDefinition;   // Определение из каталога
    cabinetType: CabinetType;        // Тип шкафа для расчётов и валидации
    strategies: Map<string, MountingStrategy>;  // Map<mountType, MountingStrategy>
    equipmentList: EquipmentConfig[]; // Список установленного оборудования
}

/**
 * Базовая информация о шкафе (для списков)
 */
export interface CabinetInfo {
    id: string;
    type: string;
    position: THREE.Vector3;
}

