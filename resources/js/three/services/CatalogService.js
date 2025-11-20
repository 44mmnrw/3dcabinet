/**
 * CatalogService — Сервис для работы с каталогом шкафов
 * Отвечает только за загрузку и предоставление данных каталога
 */
export class CatalogService {
    constructor(catalogUrl = '/assets/models/cabinets/catalog.json') {
        this.catalogUrl = catalogUrl;
        this.catalog = null;
        this.loadingPromise = null;
    }

    /**
     * Загрузить каталог шкафов из JSON
     * @returns {Promise<Object>} Объект каталога
     */
    async loadCatalog() {
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
    async _fetchCatalog() {
        try {
            const response = await fetch(this.catalogUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Каталог шкафов не найден`);
            }
            const catalog = await response.json();
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
     * @returns {Promise<Array>} Список шкафов с базовой информацией
     */
    async getAvailableCabinets() {
        const catalog = await this.loadCatalog();
        return (catalog.cabinets || []).map(c => ({
            id: c.id,
            name: c.name,
            dimensions: c.dimensions,
            thumbnail: c.thumbnail,
            description: c.description,
            category: c.category
        }));
    }

    /**
     * Получить определение шкафа по ID
     * @param {string} catalogId - ID шкафа из каталога
     * @returns {Promise<Object|null>} Определение шкафа или null
     */
    async getCabinetDefinition(catalogId) {
        const catalog = await this.loadCatalog();
        return catalog.cabinets?.find(c => c.id === catalogId) || null;
    }

    /**
     * Получить весь каталог
     * @returns {Promise<Object>} Объект каталога
     */
    async getCatalog() {
        return await this.loadCatalog();
    }

    /**
     * Очистить кеш каталога (для перезагрузки)
     */
    clearCache() {
        this.catalog = null;
        this.loadingPromise = null;
    }
}

// Singleton instance
export const catalogService = new CatalogService();

