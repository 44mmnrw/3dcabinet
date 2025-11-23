/**
 * Типы для Three.js сцены и рендеринга
 */

import type * as THREE from 'three';

/**
 * Параметры камеры
 */
export interface CameraConfig {
    fov?: number;           // Поле зрения (degrees)
    aspect?: number;        // Соотношение сторон
    near?: number;         // Ближняя плоскость отсечения
    far?: number;          // Дальняя плоскость отсечения
    position?: {
        x: number;
        y: number;
        z: number;
    };
    target?: {
        x: number;
        y: number;
        z: number;
    };
}

/**
 * Параметры освещения
 */
export interface LightingConfig {
    ambientIntensity?: number;
    directionalIntensity?: number;
    directionalPosition?: {
        x: number;
        y: number;
        z: number;
    };
    directionalColor?: number;
}

/**
 * Параметры рендерера
 */
export interface RendererConfig {
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    shadowMap?: {
        enabled?: boolean;
        type?: THREE.ShadowMapType;
    };
}

/**
 * Параметры сетки (GridHelper)
 */
export interface GridConfig {
    size?: number;
    divisions?: number;
    colorCenterLine?: number;
    colorGrid?: number;
}

/**
 * Параметры осей (AxesHelper)
 */
export interface AxesConfig {
    size?: number;
}

/**
 * Полная конфигурация сцены
 */
export interface SceneConfig {
    backgroundColor?: number;
    camera?: CameraConfig;
    lighting?: LightingConfig;
    renderer?: RendererConfig;
    grid?: GridConfig | boolean;
    axes?: AxesConfig | boolean;
}

