import * as THREE from 'three';
import { catalogService, type CatalogService } from '../services/CatalogService.ts';
import { CabinetFactory } from '../utils/CabinetFactory.ts';
import { eventBus, ConfiguratorEvents, type IEventBus } from '../events/EventBus.ts';
import { createDefaultLogicEngine } from '../logic/index.ts';
import type { LogicEngine } from '../logic/LogicEngine.ts';
import type { CabinetDefinition, CabinetInstance, CabinetInfo } from '../types/cabinet.types.js';
import type { CabinetManagerOptions } from '../types/managers.types.js';
import type { EquipmentConfig } from '../types/equipment.types.js';
import type { MountingStrategy } from '../strategies/MountingStrategies.ts';

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
    private scene: THREE.Scene;
    private cabinets: Map<string, CabinetInstance>;
    public activeCabinetId: string | null;
    
    // Зависимости
    private catalogService: CatalogService;
    private cabinetFactory: typeof CabinetFactory;
    private eventBus: IEventBus;
    private logicEngine: LogicEngine;

    constructor(scene: THREE.Scene, options: CabinetManagerOptions = {}) {
        this.scene = scene;
        this.cabinets = new Map<string, CabinetInstance>();
        this.activeCabinetId = null;
        
        // Зависимости
        this.catalogService = options.catalogService || catalogService;
        this.cabinetFactory = options.cabinetFactory || CabinetFactory;
        this.eventBus = options.eventBus || eventBus;
        this.logicEngine = options.logicEngine || createDefaultLogicEngine();
    }

    /**
     * Добавить шкаф по ID из каталога
     * @param catalogId - ID шкафа из каталога
     * @param instanceId - Уникальный ID экземпляра (опционально)
     * @returns ID добавленного шкафа
     */
    async addCabinetById(catalogId: string, instanceId: string | null = null): Promise<string> {
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
        // Генерируем уникальный ID: тип_размеры_индекс (например: tsh_700_500_250_1)
        const newId = instanceId || this._generateCabinetId(catalogId);
        await this.addCabinet(cabinetDef, newId);

        return newId;
    }

    /**
     * Добавить шкаф из определения
     * @param cabinetDef - Определение шкафа из каталога
     * @param cabinetId - Уникальный ID экземпляра
     * @returns ID добавленного шкафа
     */
    async addCabinet(cabinetDef: CabinetDefinition, cabinetId: string): Promise<string> {
        try {
            if (!cabinetId) {
                cabinetId = this._generateCabinetId(cabinetDef.className || 'cabinet');
            }

            console.log(`🔄 Создание шкафа: ${cabinetDef.name || cabinetDef.className} (${cabinetId})`);

            // Создаём шкаф через фабрику
            const { instance, assembly, cabinetType, strategies } = 
                await this.cabinetFactory.createFromDefinition(cabinetDef);

            // Проверяем, что assembly не пустой
            if (!assembly) {
                throw new Error('Assembly не создан');
            }

            // Вычисляем bounding box для диагностики
            const bbox = new THREE.Box3().setFromObject(assembly);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            
            console.log('🔍 [CabinetManager] Assembly создан:', {
                name: assembly.name,
                type: assembly.type,
                children: assembly.children.length,
                position: assembly.position.toArray(),
                visible: assembly.visible,
                bbox: {
                    min: bbox.min.toArray(),
                    max: bbox.max.toArray(),
                    size: size.toArray(),
                    center: center.toArray()
                }
            });

            // Настраиваем assembly
            assembly.name = cabinetId;
            assembly.visible = true; // Убедимся, что видим
            this.scene.add(assembly);
            
            // Проверяем после добавления
            const bboxAfter = new THREE.Box3().setFromObject(assembly);
            const sizeAfter = bboxAfter.getSize(new THREE.Vector3());
            
            console.log('🔍 [CabinetManager] Assembly добавлен на сцену:', {
                parent: assembly.parent?.type || 'нет parent',
                sceneChildren: this.scene.children.length,
                position: assembly.position.toArray(),
                visible: assembly.visible,
                bboxAfter: {
                    min: bboxAfter.min.toArray(),
                    max: bboxAfter.max.toArray(),
                    size: sizeAfter.toArray()
                },
                hasChildren: assembly.children.length > 0,
                childrenVisible: assembly.children.filter(c => c.visible).length
            });
            
            // Проверяем, что assembly не пустой
            if (assembly.children.length === 0) {
                console.warn('⚠️ [CabinetManager] Assembly не имеет children!');
            }
            
            if (sizeAfter.x === 0 && sizeAfter.y === 0 && sizeAfter.z === 0) {
                console.warn('⚠️ [CabinetManager] Assembly имеет нулевой размер!');
            }

            // Сохраняем в Map
            const cabinetInstance: CabinetInstance = {
                id: cabinetId,
                type: cabinetDef.className,
                instance: instance as CabinetInstance['instance'],
                assembly,
                position: assembly.position.clone(),
                definition: cabinetDef,
                cabinetType: cabinetType as CabinetInstance['cabinetType'],
                strategies,
                equipmentList: []
            };

            this.cabinets.set(cabinetId, cabinetInstance);

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
     * @param cabinetId - ID шкафа
     * @returns true если удалён успешно
     */
    removeCabinet(cabinetId: string): boolean {
        const cabinet = this.cabinets.get(cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${cabinetId} не найден`);
            return false;
        }

        this.scene.remove(cabinet.assembly);
        cabinet.assembly.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).geometry) {
                ((child as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
            }
            if ((child as THREE.Mesh).material) {
                const material = (child as THREE.Mesh).material;
                if (Array.isArray(material)) {
                    material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    material.dispose();
                }
            }
        });

        this.cabinets.delete(cabinetId);
        
        if (this.activeCabinetId === cabinetId) {
            const remainingKeys = Array.from(this.cabinets.keys());
            this.activeCabinetId = remainingKeys.length > 0 
                ? (remainingKeys[0] ?? null)
                : null;
        }

        console.log(`🗑️ Шкаф удалён: ${cabinetId}`);
        
        // Emit event
        this.eventBus.emit(ConfiguratorEvents.CABINET_REMOVED, { cabinetId });
        
        return true;
    }

    /**
     * Установить активный шкаф
     */
    setActiveCabinet(cabinetId: string): boolean {
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
    getActiveCabinet(): CabinetInstance | null {
        if (!this.activeCabinetId) return null;
        return this.cabinets.get(this.activeCabinetId) || null;
    }

    /**
     * Получить CabinetType активного шкафа
     * @returns CabinetType или null
     */
    getActiveCabinetType(): CabinetInstance['cabinetType'] | null {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.cabinetType : null;
    }

    /**
     * Получить стратегию по типу монтажа для активного шкафа
     * @param mountType - Тип монтажа (din_rail, rack_unit, mounting_plate)
     * @returns MountingStrategy или null
     */
    getStrategy(mountType: string): MountingStrategy | null {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.strategies) return null;
        
        return cabinet.strategies.get(mountType) || null;
    }

    /**
     * Получить все стратегии активного шкафа
     * @returns Map<string, MountingStrategy>
     */
    getAllStrategies(): Map<string, MountingStrategy> {
        const cabinet = this.getActiveCabinet();
        return cabinet ? cabinet.strategies : new Map();
    }

    /**
     * Получить шкаф по ID
     */
    getCabinet(cabinetId: string): CabinetInstance | undefined {
        return this.cabinets.get(cabinetId);
    }

    /**
     * Получить список всех шкафов
     */
    getAllCabinets(): CabinetInfo[] {
        return Array.from(this.cabinets.entries()).map(([id, data]) => ({
            id,
            type: data.type,
            position: data.position
        }));
    }

    /**
     * Загрузить каталог шкафов (делегирует в CatalogService)
     * @returns Объект каталога
     */
    async loadCatalog(): Promise<ReturnType<CatalogService['loadCatalog']>> {
        return await this.catalogService.loadCatalog();
    }

    /**
     * Получить список доступных шкафов из каталога (делегирует в CatalogService)
     */
    async getAvailableCabinets(): Promise<ReturnType<CatalogService['getAvailableCabinets']>> {
        return await this.catalogService.getAvailableCabinets();
    }

    /**
     * Обновить расчёты для активного шкафа
     * Вызывает LogicEngine и отправляет события
     */
    updateCalculations(): ReturnType<LogicEngine['calculate']> | null {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.cabinetType) {
            console.warn('[CabinetManager] Нет активного шкафа или типа для расчёта');
            return null;
        }

        const equipmentList = (cabinet.equipmentList || []) as EquipmentConfig[];
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
     * Добавить оборудование в список активного шкафа
     * Для интеграции с EquipmentManager
     * @param equipment - Объект оборудования
     */
    addEquipment(equipment: EquipmentConfig): void {
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
     * Удалить оборудование из списка активного шкафа
     * @param equipmentId - ID оборудования
     */
    removeEquipment(equipmentId: string): void {
        const cabinet = this.getActiveCabinet();
        if (!cabinet || !cabinet.equipmentList) {
            return;
        }

        const index = cabinet.equipmentList.findIndex((eq: EquipmentConfig) => eq.id === equipmentId);
        if (index > -1) {
            cabinet.equipmentList.splice(index, 1);
            
            // Автоматически обновляем расчёты
            this.updateCalculations();
        }
    }

    /**
     * Генерация уникального ID для экземпляра шкафа
     * Формат: тип_размеры_индекс (например: tsh_700_500_250_1)
     * @param baseId - Базовый ID (например: tsh_700_500_250)
     * @returns Уникальный ID экземпляра
     */
    private _generateCabinetId(baseId: string): string {
        // Подсчитываем, сколько уже есть экземпляров этого типа
        let index = 1;
        for (const [id] of this.cabinets) {
            if (id.startsWith(baseId + '_')) {
                index++;
            }
        }
        return `${baseId}_${index}`;
    }
}

