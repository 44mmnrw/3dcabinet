/**
 * Фабрика для динамической загрузки классов шкафов
 * Поддерживает как статическую регистрацию, так и динамический импорт
 */
export class CabinetFactory {
    /**
     * Загрузить класс шкафа динамически из модуля
     * @param {string} className - Имя класса в модуле
     * @param {string} modulePath - Путь к модулю (относительный или абсолютный)
     * @returns {Promise<Object>} Экземпляр класса
     */
    static async loadCabinet(className, modulePath) {
        try {
            console.log(`🔄 Загрузка шкафа ${className} из ${modulePath}...`);
            
            // Динамический импорт модуля
            const module = await import(modulePath);
            
            // Получить класс из модуля
            const CabinetClass = module[className];
            
            if (!CabinetClass) {
                throw new Error(
                    `Класс "${className}" не найден в модуле "${modulePath}". ` +
                    `Доступные экспорты: ${Object.keys(module).join(', ')}`
                );
            }
            
            // Создать экземпляр
            const instance = new CabinetClass();
            console.log(`✅ Шкаф ${className} загружен успешно`);
            
            return instance;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки шкафа ${className}:`, error);
            throw error;
        }
    }

    /**
     * Загрузить и зарегистрировать класс шкафа
     * @param {string} className - Имя класса
     * @param {string} modulePath - Путь к модулю
     * @param {CabinetRegistry} registry - Реестр для регистрации (опционально)
     * @returns {Promise<class>} Класс шкафа
     */
    static async loadAndRegister(className, modulePath, registry = null) {
        try {
            const module = await import(modulePath);
            const CabinetClass = module[className];
            
            if (!CabinetClass) {
                throw new Error(`Класс "${className}" не найден в "${modulePath}"`);
            }
            
            // Регистрировать, если передан реестр
            if (registry && registry.register) {
                registry.register(className, CabinetClass);
            }
            
            return CabinetClass;
            
        } catch (error) {
            console.error(`❌ Ошибка при загрузке и регистрации ${className}:`, error);
            throw error;
        }
    }

    /**
     * Создать экземпляр из определения каталога
     * @param {Object} cabinetDef - Определение из catalog.json
     * @returns {Promise<Object>} Экземпляр класса
     */
    static async createFromCatalog(cabinetDef) {
        if (!cabinetDef || !cabinetDef.className || !cabinetDef.modulePath) {
            throw new Error('Некорректное определение шкафа из каталога');
        }
        
        return this.loadCabinet(cabinetDef.className, cabinetDef.modulePath);
    }
}
