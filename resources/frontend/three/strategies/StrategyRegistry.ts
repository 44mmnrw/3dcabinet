/**
 * StrategyRegistry — Централизованный реестр стратегий монтажа
 * Управляет регистрацией, поиском и созданием стратегий
 */

import type { MountingStrategy } from './MountingStrategies.ts';

/**
 * Конструктор стратегии монтажа
 */
type StrategyConstructor = new (cabinetInstance: import('../cabinets/CabinetBase.ts').CabinetBase, cabinetType?: import('../types/CabinetType.ts').CabinetType | null) => MountingStrategy;

/**
 * Статистика реестра
 */
export interface RegistryStats {
    totalStrategies: number;
    uniqueTypes: number;
    totalAliases: number;
}

/**
 * Централизованный реестр стратегий монтажа
 */
export class StrategyRegistry {
    // Map<string, StrategyConstructor>
    private strategies: Map<string, StrategyConstructor>;
    
    // Map<string, Array<string>> — алиасы для типов монтажа
    private aliases: Map<string, string[]>;

    constructor() {
        this.strategies = new Map();
        this.aliases = new Map();
    }

    /**
     * Регистрация стратегии
     */
    register(mountType: string, StrategyClass: StrategyConstructor, aliases: string[] = []): void {
        const key = this._normalizeKey(mountType);
        
        if (this.strategies.has(key)) {
            console.warn(`Strategy for '${mountType}' is already registered. Overwriting.`);
        }
        
        this.strategies.set(key, StrategyClass);
        
        // Регистрация алиасов
        if (aliases.length > 0) {
            this.aliases.set(key, aliases.map(a => this._normalizeKey(a)));
            aliases.forEach(alias => {
                this.strategies.set(this._normalizeKey(alias), StrategyClass);
            });
        }

        console.log(`[StrategyRegistry] Registered: ${mountType}`, 
            aliases.length > 0 ? `(aliases: ${aliases.join(', ')})` : '');
    }

    /**
     * Получить стратегию по типу монтажа
     */
    get(mountType: string): StrategyConstructor | null {
        const key = this._normalizeKey(mountType);
        return this.strategies.get(key) || null;
    }

    /**
     * Проверить наличие стратегии
     */
    has(mountType: string): boolean {
        return this.strategies.has(this._normalizeKey(mountType));
    }

    /**
     * Создать экземпляр стратегии
     */
    create(mountType: string, cabinetInstance: import('../cabinets/CabinetBase.ts').CabinetBase, cabinetType?: import('../types/CabinetType.ts').CabinetType | null): MountingStrategy | null {
        const StrategyClass = this.get(mountType);
        
        if (!StrategyClass) {
            console.error(`[StrategyRegistry] Strategy not found: ${mountType}`);
            return null;
        }

        try {
            return new StrategyClass(cabinetInstance, cabinetType);
        } catch (error: unknown) {
            console.error(`[StrategyRegistry] Failed to create strategy '${mountType}':`, error);
            return null;
        }
    }

    /**
     * Получить список всех зарегистрированных типов
     */
    getRegisteredTypes(): string[] {
        // Уникальные ключи без алиасов
        const uniqueTypes = new Set<string>();
        this.strategies.forEach((_value, key) => {
            // Пропускаем алиасы
            let isAlias = false;
            this.aliases.forEach(aliasList => {
                if (aliasList.includes(key)) {
                    isAlias = true;
                }
            });
            if (!isAlias) {
                uniqueTypes.add(key);
            }
        });
        return Array.from(uniqueTypes);
    }

    /**
     * Получить алиасы для типа
     */
    getAliases(mountType: string): string[] {
        const key = this._normalizeKey(mountType);
        return this.aliases.get(key) || [];
    }

    /**
     * Удалить стратегию
     */
    unregister(mountType: string): boolean {
        const key = this._normalizeKey(mountType);
        
        // Удалить алиасы
        const aliases = this.aliases.get(key) || [];
        aliases.forEach(alias => this.strategies.delete(alias));
        this.aliases.delete(key);
        
        return this.strategies.delete(key);
    }

    /**
     * Очистить реестр
     */
    clear(): void {
        this.strategies.clear();
        this.aliases.clear();
        console.log('[StrategyRegistry] Cleared all strategies');
    }

    /**
     * Нормализация ключа (lowercase, trim)
     */
    private _normalizeKey(key: string): string {
        return String(key).toLowerCase().trim();
    }

    /**
     * Получить статистику реестра
     */
    getStats(): RegistryStats {
        return {
            totalStrategies: this.strategies.size,
            uniqueTypes: this.getRegisteredTypes().length,
            totalAliases: Array.from(this.aliases.values())
                .reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    /**
     * Валидация стратегии (проверка наличия обязательных методов)
     */
    validateStrategy(StrategyClass: StrategyConstructor): boolean {
        const requiredMethods = ['mount', 'canMount'];
        const prototype = StrategyClass.prototype;
        
        for (const method of requiredMethods) {
            if (typeof prototype[method] !== 'function') {
                console.error(
                    `[StrategyRegistry] Invalid strategy: missing method '${method}'`
                );
                return false;
            }
        }
        
        return true;
    }
}

// Singleton instance
export const strategyRegistry = new StrategyRegistry();

