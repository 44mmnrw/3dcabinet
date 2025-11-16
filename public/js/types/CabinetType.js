/**
 * CabinetType — базовый класс для системы типов шкафов
 * Определяет общий интерфейс и логику для всех типов шкафов
 */
export class CabinetType {
    /**
     * @param {Object} config - Конфигурация из каталога
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.category = config.category;
        this.config = config;
        
        // Базовые размеры
        this.dimensions = config.dimensions || {};
        
        // Монтажные зоны (будет заполняться из каталога)
        this.mountingZones = config.mountingZones || [];
        
        // Возможности монтажа
        this.mountingCapabilities = config.mountingCapabilities || [];
        
        // Технические характеристики
        this.specs = config.specs || {};
    }

    /**
     * Получить монтажные зоны по типу
     * @param {string} type - Тип зоны (din_rail, rack_unit, mounting_plate, zero_u, door)
     * @returns {Array} Массив зон указанного типа
     */
    getMountingZones(type) {
        return this.mountingZones.filter(zone => zone.type === type);
    }

    /**
     * Проверить совместимость с типом монтажа
     * @param {string} mountType - Тип монтажа оборудования
     * @returns {boolean}
     */
    supportsMountType(mountType) {
        return this.mountingCapabilities.includes(mountType);
    }

    /**
     * Получить максимальную нагрузку (кг)
     * @returns {number}
     */
    getMaxLoad() {
        return this.specs.maxLoad || 0;
    }

    /**
     * Получить максимальную мощность (Вт)
     * @returns {number}
     */
    getMaxPower() {
        return this.specs.maxPower || 0;
    }

    /**
     * Получить параметры охлаждения (если есть)
     * @returns {Object|null}
     */
    getCoolingSpec() {
        return this.specs.cooling || null;
    }

    /**
     * Проверить наличие DIN-реек
     * @returns {boolean}
     */
    hasDinRails() {
        return this.getMountingZones('din_rail').length > 0;
    }

    /**
     * Проверить наличие 19" стоек
     * @returns {boolean}
     */
    hasRackUnits() {
        return this.getMountingZones('rack_unit').length > 0;
    }

    /**
     * Получить высоту в юнитах (для стоечных шкафов)
     * @returns {number}
     */
    getRackUnits() {
        return this.specs.rackUnits || 0;
    }

    /**
     * Валидация специфичная для типа (переопределяется в наследниках)
     * @param {Object} equipment - Оборудование для проверки
     * @returns {Object} {valid: boolean, errors: Array, warnings: Array}
     */
    validateEquipment(equipment) {
        return {
            valid: true,
            errors: [],
            warnings: []
        };
    }

    /**
     * Рассчитать специфичные для типа параметры (переопределяется в наследниках)
     * @param {Array} equipmentList - Список установленного оборудования
     * @returns {Object} Результаты расчётов
     */
    calculateTypeSpecificMetrics(equipmentList) {
        return {};
    }

    /**
     * Получить рекомендации по конфигурации (переопределяется в наследниках)
     * @param {Array} equipmentList - Список установленного оборудования
     * @returns {Array} Массив рекомендаций
     */
    getConfigurationRecommendations(equipmentList) {
        return [];
    }

    /**
     * Получить строковое представление типа
     * @returns {string}
     */
    toString() {
        return `${this.constructor.name}(${this.id})`;
    }
}
