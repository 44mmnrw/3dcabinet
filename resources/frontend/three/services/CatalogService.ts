/**
 * CatalogService — Сервис для работы с каталогом шкафов
 * Отвечает только за загрузку и предоставление данных каталога
 */

import type { CabinetDefinition } from '../types/cabinet.types.js';

/**
 * Структура каталога шкафов
 */
export interface Catalog {
    cabinets: CabinetDefinition[];
    [key: string]: unknown;
}

/**
 * Базовая информация о шкафе из каталога
 */
export interface CabinetInfo {
    id: string;
    name: string;
    dimensions?: {
        width: number;
        height: number;
        depth: number;
    };
    thumbnail?: string;
    description?: string;
    category?: string;
}

/**
 * Сервис для работы с каталогом шкафов
 */
export class CatalogService {
    private catalogUrl: string;
    private catalog: Catalog | null;
    private loadingPromise: Promise<Catalog> | null;

    constructor(catalogUrl: string = '/assets/models/cabinets/catalog.json') {
        this.catalogUrl = catalogUrl;
        this.catalog = null;
        this.loadingPromise = null;
    }

    /**
     * Загрузить каталог шкафов из JSON
     */
    async loadCatalog(): Promise<Catalog> {
        // Если уже загружен, возвращаем кеш
        if (this.catalog) {
            return this.catalog;
        }

        // Если уже загружается, возвращаем тот же Promise
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // Начинаем загрузку
        this.loadingPromise = this._fetchCatalog();
        
        try {
            this.catalog = await this.loadingPromise;
            return this.catalog;
        } catch (error) {
            this.loadingPromise = null; // Сбрасываем при ошибке
            throw error;
        }
    }

    /**
     * Внутренний метод загрузки каталога
     * @private
     */
    private async _fetchCatalog(): Promise<Catalog> {
        try {
            const response = await fetch(this.catalogUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Каталог шкафов не найден`);
            }
            const catalog = await response.json() as Catalog;
            console.log(`📚 Загружен каталог: ${catalog.cabinets?.length || 0} шкафов`);
            return catalog;
        } catch (error) {
            console.error('❌ Ошибка загрузки каталога шкафов:', error);
            // Возвращаем пустой каталог вместо выброса ошибки
            return { cabinets: [] };
        }
    }

    /**
     * Получить список доступных шкафов из каталога
     */
    async getAvailableCabinets(): Promise<CabinetInfo[]> {
        const catalog = await this.loadCatalog();
        return (catalog.cabinets || []).map(c => {
            const info: CabinetInfo = {
                id: c.id,
                name: c.name
            };
            if (c.dimensions) {
                info.dimensions = c.dimensions;
            }
            if (c.thumbnail !== undefined) {
                info.thumbnail = c.thumbnail;
            }
            if (c.description !== undefined) {
                info.description = c.description;
            }
            if (c.category !== undefined) {
                info.category = c.category;
            }
            return info;
        });
    }

    /**
     * Получить определение шкафа по ID
     */
    async getCabinetDefinition(catalogId: string): Promise<CabinetDefinition | null> {
        const catalog = await this.loadCatalog();
        return catalog.cabinets?.find(c => c.id === catalogId) || null;
    }

    /**
     * Получить весь каталог
     */
    async getCatalog(): Promise<Catalog> {
        return await this.loadCatalog();
    }

    /**
     * Очистить кеш каталога (для перезагрузки)
     */
    clearCache(): void {
        this.catalog = null;
        this.loadingPromise = null;
    }
}

// Singleton instance
export const catalogService = new CatalogService();

