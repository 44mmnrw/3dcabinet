/**
 * Реестр классов шкафов
 * Централизованное управление регистрацией и доступом к классам шкафов
 */

import type { CabinetBase } from '../cabinets/CabinetBase.ts';

/**
 * Конструктор класса шкафа
 */
type CabinetClassConstructor = new () => CabinetBase;

/**
 * Реестр классов шкафов
 */
export class CabinetRegistry {
    private static registry: Map<string, CabinetClassConstructor> = new Map();

    /**
     * Зарегистрировать класс шкафа
     */
    static register(name: string, CabinetClass: CabinetClassConstructor): void {
        this.registry.set(name, CabinetClass);
        console.log(`✅ Класс шкафа зарегистрирован: ${name}`);
    }

    /**
     * Получить класс шкафа по имени
     */
    static get(name: string): CabinetClassConstructor | undefined {
        return this.registry.get(name);
    }

    /**
     * Получить все зарегистрированные классы
     */
    static getAll(): Array<[string, CabinetClassConstructor]> {
        return Array.from(this.registry.entries());
    }

    /**
     * Проверить, зарегистрирован ли класс
     */
    static has(name: string): boolean {
        return this.registry.has(name);
    }

    /**
     * Очистить реестр (для тестирования)
     */
    static clear(): void {
        this.registry.clear();
    }

    /**
     * Получить количество зарегистрированных классов
     */
    static size(): number {
        return this.registry.size;
    }
}

