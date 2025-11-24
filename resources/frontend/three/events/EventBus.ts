/**
 * EventBus — лёгкая событийная система для конфигуратора
 * Использует нативные CustomEvent для совместимости с React
 * Поддерживает Node.js окружение для тестирования (с ограничениями)
 */

/**
 * Обработчик события
 */
export type EventHandler = (event: CustomEvent | { type: string; detail: unknown }) => void;

/**
 * Опции для подписки на событие
 */
export interface EventListenerOptions {
    once?: boolean;
}

/**
 * Интерфейс EventBus для использования в других модулях
 */
export interface IEventBus {
    on(eventName: string, callback: EventHandler, options?: EventListenerOptions): void;
    off(eventName: string, callback: EventHandler): void;
    emit(eventName: string, detail?: unknown): void;
    once(eventName: string, callback: EventHandler): void;
    getListenerCount(eventName: string): number;
    getEventNames(): string[];
    clear(): void;
}

/**
 * Эмулированный EventTarget для Node.js
 */
interface EmulatedEventTarget {
    _events: Map<string, Array<{ callback: EventHandler; once: boolean }>>;
    addEventListener(eventName: string, callback: EventHandler, options?: EventListenerOptions): void;
    removeEventListener(eventName: string, callback: EventHandler): void;
    dispatchEvent(event: CustomEvent | { type: string; detail: unknown }): void;
}

/**
 * Целевой объект для событий (HTMLElement в браузере или эмуляция в Node.js)
 */
type EventTarget = HTMLElement | EmulatedEventTarget;

/**
 * Событие (CustomEvent в браузере или простой объект в Node.js)
 */
type Event = CustomEvent | { type: string; detail: unknown };

/**
 * EventBus — класс для работы с событиями
 */
export class EventBus implements IEventBus {
    private target: EventTarget;
    private listeners: Map<string, EventHandler[]>;
    private isBrowser: boolean;

    constructor() {
        // Проверка окружения (browser vs Node.js)
        this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        
        if (this.isBrowser) {
            this.target = document.createElement('div');
        } else {
            // Node.js: простая эмуляция EventTarget
            const _events = new Map<string, Array<{ callback: EventHandler; once: boolean }>>();
            this.target = {
                _events,
                addEventListener: function(eventName: string, callback: EventHandler, options: EventListenerOptions = {}) {
                    if (!this._events.has(eventName)) {
                        this._events.set(eventName, []);
                    }
                    this._events.get(eventName)!.push({ callback, once: options.once || false });
                },
                removeEventListener: function(eventName: string, callback: EventHandler) {
                    if (!this._events.has(eventName)) return;
                    const handlers = this._events.get(eventName)!;
                    const index = handlers.findIndex(h => h.callback === callback);
                    if (index > -1) handlers.splice(index, 1);
                },
                dispatchEvent: function(event: Event) {
                    if (!this._events.has(event.type)) return;
                    const handlers = this._events.get(event.type)!.slice(); // Copy для once
                    handlers.forEach(handler => {
                        handler.callback(event);
                        if (handler.once) {
                            this.removeEventListener(event.type, handler.callback);
                        }
                    });
                }
            } as EmulatedEventTarget;
        }
        
        this.listeners = new Map(); // Для отладки
    }

    /**
     * Подписаться на событие
     * @param eventName - Имя события (например, 'cabinet:added')
     * @param callback - Обработчик
     * @param options - Опции addEventListener
     */
    on(eventName: string, callback: EventHandler, options: EventListenerOptions = {}): void {
        if (this.isBrowser) {
            (this.target as HTMLElement).addEventListener(eventName, callback as EventListener, options);
        } else {
            (this.target as EmulatedEventTarget).addEventListener(eventName, callback, options);
        }
        
        // Сохраняем для отладки
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName)!.push(callback);
        
        console.log(`[EventBus] Subscribed to: ${eventName}`);
    }

    /**
     * Отписаться от события
     * @param eventName - Имя события
     * @param callback - Обработчик
     */
    off(eventName: string, callback: EventHandler): void {
        if (this.isBrowser) {
            (this.target as HTMLElement).removeEventListener(eventName, callback as EventListener);
        } else {
            (this.target as EmulatedEventTarget).removeEventListener(eventName, callback);
        }
        
        // Удаляем из отладочного списка
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName)!;
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        
        console.log(`[EventBus] Unsubscribed from: ${eventName}`);
    }

    /**
     * Подписаться на событие (выполнится один раз)
     * @param eventName - Имя события
     * @param callback - Обработчик
     */
    once(eventName: string, callback: EventHandler): void {
        this.on(eventName, callback, { once: true });
    }

    /**
     * Отправить событие
     * @param eventName - Имя события
     * @param detail - Данные события
     */
    emit(eventName: string, detail: unknown = null): void {
        let event: Event;
        
        if (this.isBrowser) {
            event = new CustomEvent(eventName, {
                detail,
                bubbles: false,
                cancelable: false
            });
        } else {
            // Node.js: простой объект с type и detail
            event = {
                type: eventName,
                detail
            };
        }
        
        if (this.isBrowser) {
            (this.target as HTMLElement).dispatchEvent(event as CustomEvent);
        } else {
            (this.target as EmulatedEventTarget).dispatchEvent(event);
        }
        
        console.log(`[EventBus] Emitted: ${eventName}`, detail);
    }

    /**
     * Получить список подписчиков на событие (для отладки)
     * @param eventName - Имя события
     * @returns Количество подписчиков
     */
    getListenerCount(eventName: string): number {
        return this.listeners.has(eventName) 
            ? this.listeners.get(eventName)!.length 
            : 0;
    }

    /**
     * Получить все зарегистрированные события
     * @returns Массив имён событий
     */
    getEventNames(): string[] {
        return Array.from(this.listeners.keys());
    }

    /**
     * Очистить все подписки
     */
    clear(): void {
        this.listeners.forEach((callbacks, eventName) => {
            callbacks.forEach(callback => {
                if (this.isBrowser) {
                    (this.target as HTMLElement).removeEventListener(eventName, callback as EventListener);
                } else {
                    (this.target as EmulatedEventTarget).removeEventListener(eventName, callback);
                }
            });
        });
        this.listeners.clear();
        console.log('[EventBus] Cleared all listeners');
    }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Стандартные события конфигуратора
 */
export const ConfiguratorEvents = {
    // Cabinet events
    CABINET_ADDED: 'cabinet:added',
    CABINET_REMOVED: 'cabinet:removed',
    CABINET_CHANGED: 'cabinet:changed',
    
    // Equipment events
    EQUIPMENT_ADDED: 'equipment:added',
    EQUIPMENT_REMOVED: 'equipment:removed',
    EQUIPMENT_MOVED: 'equipment:moved',
    
    // Validation events
    VALIDATION_FAILED: 'validation:failed',
    VALIDATION_WARNING: 'validation:warning',
    VALIDATION_SUCCESS: 'validation:success',
    
    // Logic events
    CALCULATIONS_UPDATED: 'calculations:updated',
    RECOMMENDATIONS_UPDATED: 'recommendations:updated',
    
    // Configuration events
    CONFIG_LOADED: 'config:loaded',
    CONFIG_SAVED: 'config:saved',
    CONFIG_RESET: 'config:reset'
} as const;

