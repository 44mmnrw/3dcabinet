/**
 * EventBus — лёгкая событийная система для конфигуратора
 * Использует нативные CustomEvent для совместимости с React
 * Поддерживает Node.js окружение для тестирования (с ограничениями)
 */
export class EventBus {
    constructor() {
        // Проверка окружения (browser vs Node.js)
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        
        if (isBrowser) {
            this.target = document.createElement('div');
        } else {
            // Node.js: простая эмуляция EventTarget
            this.target = {
                _events: new Map(),
                addEventListener: function(eventName, callback, options = {}) {
                    if (!this._events.has(eventName)) {
                        this._events.set(eventName, []);
                    }
                    this._events.get(eventName).push({ callback, once: options.once || false });
                },
                removeEventListener: function(eventName, callback) {
                    if (!this._events.has(eventName)) return;
                    const handlers = this._events.get(eventName);
                    const index = handlers.findIndex(h => h.callback === callback);
                    if (index > -1) handlers.splice(index, 1);
                },
                dispatchEvent: function(event) {
                    if (!this._events.has(event.type)) return;
                    const handlers = this._events.get(event.type).slice(); // Copy для once
                    handlers.forEach(handler => {
                        handler.callback(event);
                        if (handler.once) {
                            this.removeEventListener(event.type, handler.callback);
                        }
                    });
                }
            };
        }
        
        this.listeners = new Map(); // Для отладки
        this.isBrowser = isBrowser;
    }

    /**
     * Подписаться на событие
     * @param {string} eventName - Имя события (например, 'cabinet:added')
     * @param {Function} callback - Обработчик
     * @param {Object} options - Опции addEventListener
     */
    on(eventName, callback, options = {}) {
        this.target.addEventListener(eventName, callback, options);
        
        // Сохраняем для отладки
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
        
        console.log(`[EventBus] Subscribed to: ${eventName}`);
    }

    /**
     * Отписаться от события
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        this.target.removeEventListener(eventName, callback);
        
        // Удаляем из отладочного списка
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        
        console.log(`[EventBus] Unsubscribed from: ${eventName}`);
    }

    /**
     * Подписаться на событие (выполнится один раз)
     * @param {string} eventName
     * @param {Function} callback
     */
    once(eventName, callback) {
        this.on(eventName, callback, { once: true });
    }

    /**
     * Отправить событие
     * @param {string} eventName - Имя события
     * @param {*} detail - Данные события
     */
    emit(eventName, detail = null) {
        let event;
        
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
        
        this.target.dispatchEvent(event);
        
        console.log(`[EventBus] Emitted: ${eventName}`, detail);
    }

    /**
     * Получить список подписчиков на событие (для отладки)
     * @param {string} eventName
     * @returns {number}
     */
    getListenerCount(eventName) {
        return this.listeners.has(eventName) 
            ? this.listeners.get(eventName).length 
            : 0;
    }

    /**
     * Получить все зарегистрированные события
     * @returns {Array<string>}
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Очистить все подписки
     */
    clear() {
        this.listeners.forEach((callbacks, eventName) => {
            callbacks.forEach(callback => {
                this.target.removeEventListener(eventName, callback);
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
};
