/**
 * Реестр классов шкафов
 * Централизованное управление регистрацией и доступом к классам шкафов
 */
export class CabinetRegistry {
    static #registry = new Map();

    /**
     * Зарегистрировать класс шкафа
     * @param {string} name - Имя класса (например, 'tsh_700_500_250')
     * @param {class} CabinetClass - Класс шкафа
     */
    static register(name, CabinetClass) {
        this.#registry.set(name, CabinetClass);
        console.log(`✅ Класс шкафа зарегистрирован: ${name}`);
    }

    /**
     * Получить класс шкафа по имени
     * @param {string} name - Имя класса
     * @returns {class|undefined} Класс или undefined
     */
    static get(name) {
        return this.#registry.get(name);
    }

    /**
     * Получить все зарегистрированные классы
     * @returns {Array<[string, class]>} Массив [имя, класс]
     */
    static getAll() {
        return Array.from(this.#registry.entries());
    }

    /**
     * Проверить, зарегистрирован ли класс
     * @param {string} name - Имя класса
     * @returns {boolean}
     */
    static has(name) {
        return this.#registry.has(name);
    }

    /**
     * Очистить реестр (для тестирования)
     */
    static clear() {
        this.#registry.clear();
    }

    /**
     * Получить количество зарегистрированных классов
     * @returns {number}
     */
    static size() {
        return this.#registry.size;
    }
}
