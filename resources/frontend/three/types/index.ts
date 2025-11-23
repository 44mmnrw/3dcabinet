/**
 * Type System — Экспорт всех типов шкафов
 */
export { CabinetType, type CabinetTypeConfig, type ValidationResult, type ConfigurationRecommendation } from './CabinetType.ts';
export { ThermalCabinet, type ThermalCabinetConfig, type ThermalMetrics } from './ThermalCabinet.ts';
export { TelecomCabinet, type TelecomCabinetConfig, type TelecomMetrics } from './TelecomCabinet.ts';
export { ServerCabinet, type ServerCabinetConfig, type ServerMetrics } from './ServerCabinet.ts';

import type { CabinetType, CabinetTypeConfig } from './CabinetType.ts';

/**
 * TypeRegistry — Реестр типов шкафов
 * Позволяет регистрировать новые типы и создавать экземпляры по категории
 */
export class TypeRegistry {
    private types: Map<string, typeof CabinetType | Promise<typeof CabinetType>>;

    constructor() {
        this.types = new Map();
        this._registerDefaultTypes();
    }

    /**
     * Регистрация встроенных типов
     * @private
     */
    private _registerDefaultTypes(): void {
        // Импорты уже выполнены выше
        this.register('thermal', import('./ThermalCabinet.ts').then(m => m.ThermalCabinet));
        this.register('outdoor', import('./ThermalCabinet.ts').then(m => m.ThermalCabinet));
        this.register('telecom', import('./TelecomCabinet.ts').then(m => m.TelecomCabinet));
        this.register('network', import('./TelecomCabinet.ts').then(m => m.TelecomCabinet));
        this.register('server', import('./ServerCabinet.ts').then(m => m.ServerCabinet));
        this.register('datacenter', import('./ServerCabinet.ts').then(m => m.ServerCabinet));
    }

    /**
     * Регистрация нового типа
     * @param category - Категория шкафа
     * @param TypeClass - Класс типа или Promise
     */
    register(category: string, TypeClass: typeof CabinetType | Promise<typeof CabinetType>): void {
        this.types.set(category.toLowerCase(), TypeClass);
    }

    /**
     * Создать экземпляр типа по категории
     * @param category - Категория из каталога
     * @param config - Конфигурация шкафа
     * @returns Экземпляр типа шкафа
     */
    async createType(category: string, config: CabinetTypeConfig): Promise<CabinetType> {
        const key = category.toLowerCase();
        
        if (!this.types.has(key)) {
            // Fallback на базовый тип
            const { CabinetType } = await import('./CabinetType.ts');
            return new CabinetType(config);
        }

        const TypeClassOrPromise = this.types.get(key);
        if (!TypeClassOrPromise) {
            const { CabinetType } = await import('./CabinetType.ts');
            return new CabinetType(config);
        }

        const TypeClass = TypeClassOrPromise instanceof Promise 
            ? (await TypeClassOrPromise) 
            : TypeClassOrPromise;
        
        return new TypeClass(config);
    }

    /**
     * Проверить наличие типа
     * @param category - Категория шкафа
     * @returns true, если тип зарегистрирован
     */
    hasType(category: string): boolean {
        return this.types.has(category.toLowerCase());
    }

    /**
     * Получить список зарегистрированных категорий
     * @returns Массив категорий
     */
    getRegisteredCategories(): string[] {
        return Array.from(this.types.keys());
    }
}

// Singleton instance
export const typeRegistry = new TypeRegistry();

