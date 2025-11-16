/**
 * LogicEngine — движок бизнес-логики для расчётов и рекомендаций
 * Использует плагинную архитектуру для расширения под разные типы шкафов
 */
export class LogicEngine {
    constructor() {
        // Map<string, LogicPlugin>
        this.plugins = new Map();
    }

    /**
     * Регистрация плагина для типа шкафа
     * @param {string} cabinetCategory - Категория шкафа (thermal, telecom, server)
     * @param {LogicPlugin} plugin - Экземпляр плагина
     */
    registerPlugin(cabinetCategory, plugin) {
        if (!plugin || typeof plugin.calculate !== 'function') {
            console.error('[LogicEngine] Invalid plugin: must have calculate() method');
            return;
        }
        
        this.plugins.set(cabinetCategory, plugin);
        console.log(`[LogicEngine] Registered plugin: ${cabinetCategory}`);
    }

    /**
     * Выполнить расчёты для конфигурации
     * @param {CabinetType} cabinetType - Тип шкафа
     * @param {Array} equipmentList - Список установленного оборудования
     * @returns {Object} Результаты расчётов
     */
    calculate(cabinetType, equipmentList) {
        const category = cabinetType.category;
        const plugin = this.plugins.get(category);
        
        if (!plugin) {
            console.warn(`[LogicEngine] No plugin for category '${category}'`);
            return {
                category,
                calculations: {},
                recommendations: [],
                warnings: []
            };
        }

        try {
            return plugin.calculate(cabinetType, equipmentList);
        } catch (error) {
            console.error(`[LogicEngine] Plugin '${category}' failed:`, error);
            return {
                category,
                calculations: {},
                recommendations: [],
                warnings: [`Ошибка расчёта: ${error.message}`]
            };
        }
    }

    /**
     * Получить рекомендации для конфигурации
     * @param {CabinetType} cabinetType
     * @param {Array} equipmentList
     * @returns {Array} Массив рекомендаций
     */
    getRecommendations(cabinetType, equipmentList) {
        const result = this.calculate(cabinetType, equipmentList);
        return result.recommendations || [];
    }

    /**
     * Проверить наличие плагина для категории
     * @param {string} category
     * @returns {boolean}
     */
    hasPlugin(category) {
        return this.plugins.has(category);
    }

    /**
     * Получить список зарегистрированных категорий
     * @returns {Array<string>}
     */
    getRegisteredCategories() {
        return Array.from(this.plugins.keys());
    }
}

/**
 * LogicPlugin — базовый интерфейс для плагинов
 */
export class LogicPlugin {
    constructor(name) {
        this.name = name;
    }

    /**
     * Выполнить расчёты (должен быть переопределён)
     * @param {CabinetType} cabinetType
     * @param {Array} equipmentList
     * @returns {Object} {category, calculations, recommendations, warnings}
     */
    calculate(cabinetType, equipmentList) {
        throw new Error('LogicPlugin.calculate() must be implemented');
    }
}
