/**
 * Type System — Экспорт всех типов шкафов
 */
export { CabinetType } from './CabinetType.js';
export { ThermalCabinet } from './ThermalCabinet.js';
export { TelecomCabinet } from './TelecomCabinet.js';
export { ServerCabinet } from './ServerCabinet.js';

/**
 * TypeRegistry — Реестр типов шкафов
 * Позволяет регистрировать новые типы и создавать экземпляры по категории
 */
export class TypeRegistry {
    constructor() {
        this.types = new Map();
        this._registerDefaultTypes();
    }

    /**
     * Регистрация встроенных типов
     * @private
     */
    _registerDefaultTypes() {
        // Импорты уже выполнены выше
        this.register('thermal', import('./ThermalCabinet.js').then(m => m.ThermalCabinet));
        this.register('outdoor', import('./ThermalCabinet.js').then(m => m.ThermalCabinet));
        this.register('telecom', import('./TelecomCabinet.js').then(m => m.TelecomCabinet));
        this.register('network', import('./TelecomCabinet.js').then(m => m.TelecomCabinet));
        this.register('server', import('./ServerCabinet.js').then(m => m.ServerCabinet));
        this.register('datacenter', import('./ServerCabinet.js').then(m => m.ServerCabinet));
    }

    /**
     * Регистрация нового типа
     * @param {string} category - Категория шкафа
     * @param {Function|Promise} TypeClass - Класс типа или Promise
     */
    register(category, TypeClass) {
        this.types.set(category.toLowerCase(), TypeClass);
    }

    /**
     * Создать экземпляр типа по категории
     * @param {string} category - Категория из каталога
     * @param {Object} config - Конфигурация шкафа
     * @returns {Promise<CabinetType>}
     */
    async createType(category, config) {
        const key = category.toLowerCase();
        
        if (!this.types.has(key)) {
            // Fallback на базовый тип
            const { CabinetType } = await import('./CabinetType.js');
            return new CabinetType(config);
        }

        const TypeClassOrPromise = this.types.get(key);
        const TypeClass = TypeClassOrPromise instanceof Promise 
            ? (await TypeClassOrPromise) 
            : TypeClassOrPromise;
        
        return new TypeClass(config);
    }

    /**
     * Проверить наличие типа
     * @param {string} category
     * @returns {boolean}
     */
    hasType(category) {
        return this.types.has(category.toLowerCase());
    }

    /**
     * Получить список зарегистрированных категорий
     * @returns {Array<string>}
     */
    getRegisteredCategories() {
        return Array.from(this.types.keys());
    }
}

// Singleton instance
export const typeRegistry = new TypeRegistry();
