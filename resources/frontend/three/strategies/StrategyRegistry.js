/**
 * StrategyRegistry — Централизованный реестр стратегий монтажа
 * Управляет регистрацией, поиском и созданием стратегий
 */
export class StrategyRegistry {
    constructor() {
        // Map<string, StrategyConstructor>
        this.strategies = new Map();
        
        // Map<string, Array<string>> — алиасы для типов монтажа
        this.aliases = new Map();
    }

    /**
     * Регистрация стратегии
     * @param {string} mountType - Тип монтажа (din_rail, rack_unit, mounting_plate, etc.)
     * @param {Function} StrategyClass - Конструктор класса стратегии
     * @param {Array<string>} aliases - Дополнительные имена для поиска
     */
    register(mountType, StrategyClass, aliases = []) {
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
     * @param {string} mountType - Тип монтажа
     * @returns {Function|null} Конструктор стратегии или null
     */
    get(mountType) {
        const key = this._normalizeKey(mountType);
        return this.strategies.get(key) || null;
    }

    /**
     * Проверить наличие стратегии
     * @param {string} mountType
     * @returns {boolean}
     */
    has(mountType) {
        return this.strategies.has(this._normalizeKey(mountType));
    }

    /**
     * Создать экземпляр стратегии
     * @param {string} mountType - Тип монтажа
     * @param {...any} args - Аргументы конструктора стратегии
     * @returns {Object|null} Экземпляр стратегии или null
     */
    create(mountType, ...args) {
        const StrategyClass = this.get(mountType);
        
        if (!StrategyClass) {
            console.error(`[StrategyRegistry] Strategy not found: ${mountType}`);
            return null;
        }

        try {
            return new StrategyClass(...args);
        } catch (error) {
            console.error(`[StrategyRegistry] Failed to create strategy '${mountType}':`, error);
            return null;
        }
    }

    /**
     * Получить список всех зарегистрированных типов
     * @returns {Array<string>}
     */
    getRegisteredTypes() {
        // Уникальные ключи без алиасов
        const uniqueTypes = new Set();
        this.strategies.forEach((value, key) => {
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
     * @param {string} mountType
     * @returns {Array<string>}
     */
    getAliases(mountType) {
        const key = this._normalizeKey(mountType);
        return this.aliases.get(key) || [];
    }

    /**
     * Удалить стратегию
     * @param {string} mountType
     * @returns {boolean}
     */
    unregister(mountType) {
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
    clear() {
        this.strategies.clear();
        this.aliases.clear();
        console.log('[StrategyRegistry] Cleared all strategies');
    }

    /**
     * Нормализация ключа (lowercase, trim)
     * @private
     */
    _normalizeKey(key) {
        return String(key).toLowerCase().trim();
    }

    /**
     * Получить статистику реестра
     * @returns {Object}
     */
    getStats() {
        return {
            totalStrategies: this.strategies.size,
            uniqueTypes: this.getRegisteredTypes().length,
            totalAliases: Array.from(this.aliases.values())
                .reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    /**
     * Валидация стратегии (проверка наличия обязательных методов)
     * @param {Function} StrategyClass
     * @returns {boolean}
     */
    validateStrategy(StrategyClass) {
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
