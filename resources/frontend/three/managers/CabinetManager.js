import { catalogService } from '../services/CatalogService.js';
import { CabinetFactory } from '../utils/CabinetFactory.js';
import { eventBus, ConfiguratorEvents } from '../events/EventBus.js';
import { createDefaultLogicEngine } from '../logic/index.js';

/**
 * Менеджер шкафов на 3D-сцене
 * 
 * Отвечает ТОЛЬКО за:
 * - Управление экземплярами шкафов (добавление, удаление, получение)
 * - Управление активным шкафом
 * - Интеграция с EventBus для событий
 * - Расчёты через LogicEngine
 * 
 * НЕ отвечает за:
 * - Загрузку каталога (CatalogService)
 * - Создание шкафов (CabinetFactory)
 * - Регистрацию стратегий (CabinetFactory)
 */
export class CabinetManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.cabinets = new Map(); // cabinetId -> { instance, assembly, position, cabinetType, strategies, equipmentList }
        this.activeCabinetId = null;
        
        // Зависимости
        this.catalogService = options.catalogService || catalogService;
        this.cabinetFactory = options.cabinetFactory || CabinetFactory;
        this.eventBus = options.eventBus || eventBus;
        this.logicEngine = options.logicEngine || createDefaultLogicEngine();
    }

    /**
     * Добавить шкаф по ID из каталога
     * @param {string} catalogId - ID шкафа из каталога
     * @param {string} instanceId - Уникальный ID экземпляра (опционально)
     * @returns {Promise<string>} ID добавленного шкафа
     */
    async addCabinetById(catalogId, instanceId = null) {
        // Получаем определение из каталога
        const cabinetDef = await this.catalogService.getCabinetDefinition(catalogId);
        if (!cabinetDef) {
            const available = await this.catalogService.getAvailableCabinets();
            const availableIds = available.map(c => c.id).join(', ');
            throw new Error(
                `Шкаф "${catalogId}" не найден в каталоге. ` +
                `Доступные: ${availableIds}`
            );
        }

        console.log(`🔄 Загрузка шкафа из каталога: ${cabinetDef.name}`);
        
        // Создаём шкаф через фабрику
        const newId = instanceId || `${catalogId}_${Date.now()}`;
        await this.addCabinet(cabinetDef, newId);

        return newId;
    }

    /**
     * Добавить шкаф из определения
     * @param {Object} cabinetDef - Определение шкафа из каталога
     * @param {string} cabinetId - Уникальный ID экземпляра
     * @returns {Promise<string>} ID добавленного шкафа
     */
    async addCabinet(cabinetDef, cabinetId) {
        try {
            if (!cabinetId) {
                cabinetId = `${cabinetDef.className || 'cabinet'}_${Date.now()}`;
            }

            console.log(`🔄 Создание шкафа: ${cabinetDef.name || cabinetDef.className} (${cabinetId})`);

            // Создаём шкаф через фабрику
            const { instance, assembly, cabinetType, strategies } = 
                await this.cabinetFactory.createFromDefinition(cabinetDef);

            // Проверяем, что assembly не пустой
            if (!assembly) {
                throw new Error('Assembly не создан');
            }

            // Настраиваем assembly
            assembly.name = cabinetId;
            this.scene.add(assembly);

            // Сохраняем в Map
            this.cabinets.set(cabinetId, {
                type: cabinetDef.className,
                instance,
                assembly,
                position: assembly.position.clone(),
                definition: cabinetDef,
                cabinetType,
                strategies,
                equipmentList: []
            });

            // Устанавливаем как активный
            this.activeCabinetId = cabinetId;

            console.log(`✅ Шкаф загружен: ${cabinetId}`);
            console.log(`   Тип: ${cabinetType?.constructor.name || 'CabinetType'}`);
            console.log(`   Стратегии: ${Array.from(strategies.keys()).join(', ') || 'нет'}`);
            
            // Emit event
            this.eventBus.emit(ConfiguratorEvents.CABINET_ADDED, {
                cabinetId,
                cabinetType,
                strategies: Array.from(strategies.keys())
            });
            
            return cabinetId;
        } catch (error) {
            console.error(`❌ Ошибка создания шкафа:`, error);
            throw error;
        }
    }

    /**
     * Удалить шкаф по ID
     * @param {string} cabinetId - ID шкафа
     * @returns {boolean} true если удалён успешно
     */
    removeCabinet(cabinetId) {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }

        this.scene.remove(cabinet.assembly);
        cabinet.assembly.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.cabinets.delete(cabinetId);
        
        if (this.activeCabinetId === cabinetId) {
            this.activeCabinetId = this.cabinets.size > 0 
                ? Array.from(this.cabinets.keys())[0] 
                : null;
        }

        console.log(`🗑️ Шкаф удалён: ${cabinetId}`);
        
        // Emit event (NEW!)
        this.eventBus.emit(ConfiguratorEvents.CABINET_REMOVED, { cabinetId });
        
        return true;
    }

    /**
     * Установить активный шкаф
     */
    setActiveCabinet(cabinetId) {
        if (!this.cabinets.has(cabinetId)) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }
        this.activeCabinetId = cabinetId;
        console.log(`🎯 Активный шкаф: ${cabinetId}`);
        
        // Emit event
        this.eventBus.emit(ConfiguratorEvents.CABINET_CHANGED, { cabinetId });
        
        return true;
    }

    /**
     * Получить активный шкаф
     */
    getActiveCabinet() {
        if (!this.activeCabinetId) return null;
        return this.cabinets.get(this.activeCabinetId);
    }

    /**
     * Получить CabinetType активного шкафа (NEW!)
     * @returns {CabinetType|null}
     */
    getActiveCabinetType() {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.cabinetType : null;
    }

    /**
     * Получить стратегию по типу монтажа для активного шкафа (NEW!)
     * @param {string} mountType - Тип монтажа (din_rail, rack_unit, mounting_plate)
     * @returns {MountingStrategy|null}
     */
    getStrategy(mountType) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.strategies) return null;
        
        return cabinet.strategies.get(mountType) || null;
    }

    /**
     * Получить все стратегии активного шкафа (NEW!)
     * @returns {Map<string, MountingStrategy>}
     */
    getAllStrategies() {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.strategies : new Map();
    }

    /**
     * Получить шкаф по ID
     */
    getCabinet(cabinetId) {
        return this.cabinets.get(cabinetId);
    }

    /**
     * Получить список всех шкафов
     */
    getAllCabinets() {
        return Array.from(this.cabinets.entries()).map(([id, data]) => ({
            id,
            type: data.type,
            position: data.position
        }));
    }

    /**
     * Загрузить каталог шкафов (делегирует в CatalogService)
     * @returns {Promise<Object>} Объект каталога
     */
    async loadCatalog() {
        return await this.catalogService.loadCatalog();
    }

    /**
     * Получить список доступных шкафов из каталога (делегирует в CatalogService)
     * @returns {Promise<Array>}
     */
    async getAvailableCabinets() {
        return await this.catalogService.getAvailableCabinets();
    }

    /**
     * Обновить расчёты для активного шкафа (NEW!)
     * Вызывает LogicEngine и отправляет события
     */
    updateCalculations() {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.cabinetType) {
            console.warn('[CabinetManager] Нет активного шкафа или типа для расчёта');
            return null;
        }

        const equipmentList = cabinet.equipmentList || [];
        const result = this.logicEngine.calculate(cabinet.cabinetType, equipmentList);
        
        // Emit events
        this.eventBus.emit(ConfiguratorEvents.CALCULATIONS_UPDATED, {
            cabinetId: this.activeCabinetId,
            calculations: result.calculations
        });
        
        this.eventBus.emit(ConfiguratorEvents.RECOMMENDATIONS_UPDATED, {
            cabinetId: this.activeCabinetId,
            recommendations: result.recommendations
        });
        
        // Warnings as validation events
        if (result.warnings && result.warnings.length > 0) {
            this.eventBus.emit(ConfiguratorEvents.VALIDATION_WARNING, {
                cabinetId: this.activeCabinetId,
                warnings: result.warnings
            });
        }
        
        return result;
    }

    /**
     * Добавить оборудование в список активного шкафа (NEW!)
     * Для интеграции с EquipmentManager
     * @param {Object} equipment - Объект оборудования
     */
    addEquipment(equipment) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet) {
            console.warn('[CabinetManager] Нет активного шкафа');
            return;
        }

        if (!cabinet.equipmentList) {
            cabinet.equipmentList = [];
        }

        cabinet.equipmentList.push(equipment);
        
        // Автоматически обновляем расчёты
        this.updateCalculations();
    }

    /**
     * Удалить оборудование из списка активного шкафа (NEW!)
     * @param {string} equipmentId - ID оборудования
     */
    removeEquipment(equipmentId) {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.equipmentList) {
            return;
        }

        const index = cabinet.equipmentList.findIndex(eq => eq.id === equipmentId);
        if (index > -1) {
            cabinet.equipmentList.splice(index, 1);
            
            // Автоматически обновляем расчёты
            this.updateCalculations();
        }
    }
}
