import * as THREE from 'three';
import type { EquipmentConfig, EquipmentInstance } from '../types/equipment.types.js';
import { CabinetManager } from './CabinetManager';
import type { AssetLoader } from '../loaders/AssetLoader.ts';
import type { MountingPosition } from '../strategies/MountingStrategies.ts';

/**
 * Менеджер оборудования на 3D-сцене
 * 
 * Функциональность:
 * - Загрузка GLB-моделей оборудования
 * - Размещение на DIN-рейках через стратегии монтажа
 * - Управление жизненным циклом (добавление, удаление, dispose)
 * - Callbacks для синхронизации с React UI
 */
export class EquipmentManager {
    // @ts-ignore - Пока не используется, но может понадобиться в будущем
    private _scene: THREE.Scene;
    private assetLoader: AssetLoader;
    private cabinetManager: CabinetManager;
    private equipment: Map<string, EquipmentInstance>;
    private equipmentConfigs: Map<string, EquipmentConfig>;
    private nextId: number;
    private doorAutoOpened: boolean; // Авто-открытие двери выполнено?
    private highlighted: Set<string>; // Уже подсвеченные элементы
    
    // Callback для React (синхронизация счётчика)
    public onUpdate: ((count: number) => void) | null;

    constructor(scene: THREE.Scene, assetLoader: AssetLoader, cabinetManager: CabinetManager) {
        this._scene = scene;
        this.assetLoader = assetLoader;
        this.cabinetManager = cabinetManager;
        this.equipment = new Map<string, EquipmentInstance>();
        this.equipmentConfigs = new Map<string, EquipmentConfig>();
        this.nextId = 1;
        this.doorAutoOpened = false;
        this.highlighted = new Set<string>();
        
        // Callback для React (синхронизация счётчика)
        this.onUpdate = null;
    }

    /**
     * Загрузка конфигурации оборудования из JSON
     * @param type - Тип оборудования (например, 'circuit_breaker')
     * @returns Конфигурация оборудования
     */
    async loadEquipmentConfig(type: string): Promise<EquipmentConfig> {
        if (this.equipmentConfigs.has(type)) {
            return this.equipmentConfigs.get(type)!;
        }

        try {
            const configPath = `/assets/models/equipment/${type}/${type}.json`;
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Конфиг не найден: ${configPath}`);
            }
            const config: EquipmentConfig = await response.json();
            this.equipmentConfigs.set(type, config);
            console.log(`📋 Загружен конфиг: ${type}`);
            return config;
        } catch (error) {
            console.warn(`⚠️ Конфиг ${type} не найден, используем дефолтные параметры`);
            const defaultConfig: EquipmentConfig = {
                id: type,
                name: type,
                description: 'Авто-сгенерированный конфиг (fallback)',
                category: 'protection',
                specifications: {},
                dimensions: {
                    width: 0.02,
                    height: 0.06,
                    depth: 0.05,
                    modules: 1
                },
                mounting: {
                    type: 'din_rail',
                    orientation: 'vertical',
                    anchorPoint: { offset: [0, 0, 0] },
                    requiresSpace: true,
                    snapToGrid: true
                },
                model: {
                    path: `${type}.glb`,
                    scale: 1
                },
                icon: 'icon-box',
                color: '#CCCCCC',
                inStock: true
            };
            return defaultConfig;
        }
    }

    /**
     * Добавить оборудование на сцену
     * @param type - Тип оборудования
     * @param railIndex - Индекс DIN-рейки (0-3)
     * @param xOffset - Смещение по X (null = автопоиск)
     * @param cabinetId - ID шкафа (null = активный)
     * @returns ID добавленного оборудования или null при ошибке
     */
    async addEquipment(
        type: string, 
        railIndex: number = 0, 
        xOffset: number | null = null, 
        cabinetId: string | null = null
    ): Promise<string | null> {
        try {
            // Если шкаф не указан, используем активный
            if (!cabinetId) {
                const activeCabinet = this.cabinetManager.getActiveCabinet();
                if (!activeCabinet) {
                    console.error('❌ Нет активного шкафа. Сначала добавьте шкаф!');
                    return null;
                }
                cabinetId = this.cabinetManager.activeCabinetId ?? null;
                if (!cabinetId) {
                    return null;
                }
            }

            const id = `${type}_${this.nextId++}`;
            console.log(`🔄 Добавление оборудования: ${id} в шкаф ${cabinetId}`);

            // Загружаем конфигурацию
            const config = await this.loadEquipmentConfig(type);
            console.log(`  📋 Конфиг загружен:`, config);

            // Загружаем GLTF/GLB модель
            const modelFileName = typeof config.model === 'string' ? config.model : config.model.path;
            const modelPath = `/assets/models/equipment/${type}/${modelFileName}`;
            console.log(`  🔄 Загрузка модели: ${modelPath}`);
            
            const glbGroup = await this.assetLoader.load(modelPath, {
                useCache: true,
                clone: true
            }) as THREE.Group;
            console.log(`  ✅ Модель загружена:`, glbGroup);

            // НЕ вызываем alignGroupToFloor для оборудования, монтируемого на рейку
            // Позиционирование будет выполнено через mountingStrategy.mount()
            glbGroup.name = id;
            
            // Убеждаемся, что оборудование видимо и имеет правильный масштаб
            glbGroup.visible = true;
            glbGroup.scale.set(1, 1, 1);
            
            // ДЕТАЛЬНАЯ проверка структуры модели
            let meshCount = 0;
            let totalVertices = 0;
            const meshNames: string[] = [];
            
            glbGroup.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    meshCount++;
                    const meshName = mesh.name || '(unnamed)';
                    meshNames.push(meshName);
                    const vertices = mesh.geometry?.attributes?.['position']?.count || 0;
                    totalVertices += vertices;
                    const materialName = (mesh.material as THREE.Material & { name?: string })?.name;
                    console.log(`    📦 Меш "${meshName}": ${vertices} вершин, видимо: ${mesh.visible}, материал: ${materialName || 'нет'}`);
                    // Дополнительный лог типа материала
                    if (mesh.material) {
                        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                        if (!mat) return;
                        const matType = mat.type || mat.constructor?.name || 'unknown';
                        const matColor = (mat as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.MeshPhongMaterial).color;
                        const colorHex = matColor?.getHexString() || 'n/a';
                        const transparent = (mat as THREE.Material & { transparent?: boolean }).transparent;
                        const opacity = (mat as THREE.Material & { opacity?: number }).opacity;
                        console.log(`      🧪 Материал тип: ${matType}, цвет: ${colorHex}, transparent: ${transparent}, opacity: ${opacity}`);
                    }
                    // Fallback материал, если материал отсутствует или невалиден
                    const hasMaterial = !!mesh.material;
                    if (!hasMaterial) {
                        console.warn(`    ⚠️ Меш "${meshName}" не имеет материала — применяем дефолтный MeshStandardMaterial`);
                        mesh.material = new THREE.MeshStandardMaterial({
                            color: 0xdddddd,
                            metalness: 0.15,
                            roughness: 0.85
                        });
                    } else {
                        // Если материал есть, но у него нет имени и это MeshBasicMaterial / без цвета — усиливаем видимость
                        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                        if (mat && (mat.type === 'MeshBasicMaterial' || mat.type === 'MeshPhongMaterial' || mat.type === 'MeshStandardMaterial')) {
                            const coloredMat = mat as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.MeshPhongMaterial;
                            // Принудительный видимый цвет если слишком тёмный
                            if (coloredMat.color && coloredMat.color.r + coloredMat.color.g + coloredMat.color.b < 0.15) {
                                console.warn(`    ⚠️ Материал очень тёмный — переназначаем цвет для видимости`);
                                coloredMat.color.setHex(0x8888ff);
                            }
                            // Добавляем лёгкую эмиссию для читаемости
                            if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhongMaterial') {
                                const emissiveMat = mat as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
                                emissiveMat.emissive.setHex(0x222244);
                                emissiveMat.emissiveIntensity = 0.4;
                            }
                        }
                    }
                    // Нормали: если отсутствуют, пересчитываем (иначе материал может рендериться чёрным)
                    if (mesh.geometry && !mesh.geometry.attributes['normal']) {
                        console.warn(`    ⚠️ Меш "${meshName}" не имеет normal-атрибутов — вычисляем computeVertexNormals()`);
                        mesh.geometry.computeVertexNormals();
                    }
                    // Убеждаемся, что mesh не полностью прозрачный
                    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                    if (mat) {
                        const matWithProps = mat as THREE.Material & { transparent?: boolean; opacity?: number };
                        matWithProps.transparent = false;
                        matWithProps.opacity = 1.0;
                        // Если это стандартный PBR материал — слегка регулируем параметры для читаемости
                        if (mat.type === 'MeshStandardMaterial') {
                            const standardMat = mat as THREE.MeshStandardMaterial;
                            if (typeof standardMat.metalness === 'number' && standardMat.metalness > 0.6) {
                                standardMat.metalness = 0.4; // чуть меньше металличности для лучшего света
                            }
                            if (typeof standardMat.roughness === 'number' && standardMat.roughness < 0.2) {
                                standardMat.roughness = 0.35; // избегаем слишком зеркальных отражений
                            }
                        }
                    }
                    // Диагностика масштаба
                    if (mesh.scale.x === 0 || mesh.scale.y === 0 || mesh.scale.z === 0) {
                        console.warn(`    ⚠️ Обнаружен нулевой scale у "${meshName}" → исправляем на (1,1,1)`);
                        mesh.scale.set(1,1,1);
                    }
                }
            });
            
            // Проверяем структуру модели
            console.log(`  🔍 Структура модели:`, {
                name: glbGroup.name,
                type: glbGroup.type,
                children: glbGroup.children.length,
                visible: glbGroup.visible,
                scale: glbGroup.scale.toArray(),
                position: glbGroup.position.toArray(),
                // Добавляем усреднённый scale дочерних мешей для диагностики
                avgChildScale: (() => {
                    let sx=0, sy=0, sz=0, n=0; glbGroup.traverse(c=>{ if(c instanceof THREE.Mesh){ const s = c.scale; sx+=s.x; sy+=s.y; sz+=s.z; n++; }}); return n? [+(sx/n).toFixed(3), +(sy/n).toFixed(3), +(sz/n).toFixed(3)]: null; })(),
                meshCount: meshCount,
                totalVertices: totalVertices,
                meshNames: meshNames
            });

            // DEBUG: Автоматический helper для первой добавленной модели (можно отключить позже)
            try {
                const bboxHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(glbGroup), new THREE.Color(0xff0000));
                glbGroup.add(bboxHelper);
            } catch(e) {
                console.warn('⚠️ Не удалось добавить Box3Helper:', e);
            }
            
            // Проверка BBox модели ДО добавления в assembly
            const modelBBox = new THREE.Box3().setFromObject(glbGroup);
            console.log(`  📐 BBox модели:`, {
                min: modelBBox.min.toArray(),
                max: modelBBox.max.toArray(),
                size: modelBBox.getSize(new THREE.Vector3()).toArray(),
                center: modelBBox.getCenter(new THREE.Vector3()).toArray(),
                isEmpty: modelBBox.isEmpty()
            });
            
            if (meshCount === 0) {
                console.error(`  ❌ ВНИМАНИЕ: Модель не содержит мешей!`);
            }
            if (totalVertices === 0) {
                console.error(`  ❌ ВНИМАНИЕ: Модель не содержит вершин!`);
            }
            if (modelBBox.isEmpty()) {
                console.error(`  ❌ ВНИМАНИЕ: BBox модели пустой!`);
            }

            // Получаем шкаф, куда будем добавлять оборудование
            const cabinet = this.cabinetManager.getCabinet(cabinetId);
            if (!cabinet) {
                throw new Error(`Шкаф ${cabinetId} не найден`);
            }

            const equipmentInstance: EquipmentInstance = {
                id: id,
                mesh: glbGroup,
                type: type,
                config: config,
                railIndex: railIndex,
                xOffset: xOffset,
                cabinetId: cabinetId
            };

            // Вычисляем bbox в локальной системе координат ДО добавления в assembly
            glbGroup.position.set(0, 0, 0);
            glbGroup.updateMatrixWorld(true);
            const localBBox = new THREE.Box3().setFromObject(glbGroup);
            console.log('🔍 [EquipmentManager] Локальный bbox ДО добавления в assembly:', {
                min: localBBox.min.toArray(),
                max: localBBox.max.toArray(),
                size: localBBox.getSize(new THREE.Vector3()).toArray(),
                center: localBBox.getCenter(new THREE.Vector3()).toArray()
            });
            
            this.equipment.set(id, equipmentInstance);

            // Добавляем оборудование внутрь шкафа (важно для координат!)
            cabinet.assembly.add(glbGroup);
            
            // Диагностика перед позиционированием
            console.log('🔍 [EquipmentManager] Перед позиционированием:', {
                equipmentId: id,
                cabinetId: cabinetId,
                assemblyInScene: cabinet.assembly.parent !== null,
                assemblyVisible: cabinet.assembly.visible,
                equipmentVisible: glbGroup.visible,
                equipmentScale: glbGroup.scale.toArray(),
                equipmentPosition: glbGroup.position.toArray(),
                equipmentChildren: glbGroup.children.length
            });
            
            try {
                this.positionEquipment(id);
                
                // Диагностика после позиционирования
                console.log('🔍 [EquipmentManager] После позиционирования:', {
                    equipmentId: id,
                    finalPosition: glbGroup.position.toArray(),
                    worldPosition: glbGroup.getWorldPosition(new THREE.Vector3()).toArray(),
                    visible: glbGroup.visible,
                    inScene: glbGroup.parent !== null,
                    assemblyInScene: cabinet.assembly.parent !== null
                });
            } catch (positionError: unknown) {
                // Не удалось разместить — удаляем оборудование
                cabinet.assembly.remove(glbGroup);
                this.equipment.delete(id);
                const errorMessage = positionError instanceof Error ? positionError.message : String(positionError);
                console.error(`❌ ${errorMessage}`);
                alert(`⚠️ ${errorMessage}`);
                return null;
            }
            
            // Авто-открытие двери при первом добавлении оборудования
            if (!this.doorAutoOpened) {
                const cabinetObj = this.cabinetManager.getCabinet(cabinetId);
                const cabinetInstance = cabinetObj?.instance;
                
                if (cabinetInstance && typeof cabinetInstance.openDoor === 'function') {
                    try {
                        cabinetInstance.openDoor();
                        this.doorAutoOpened = true;
                    } catch (doorErr) {
                        console.warn('⚠️ Не удалось автоматически открыть дверь:', doorErr);
                    }
                }
            }

            this._notifyUpdate();

            console.log(`✅ ${config.name || type}: ${id} → шкаф ${cabinetId}, рейка ${railIndex}`);
            return id;
        } catch (error: unknown) {
            console.error(`❌ Ошибка добавления оборудования [${type}]:`, error);
            if (error instanceof Error) {
                console.error('  Error stack:', error.stack);
                console.error('  Error message:', error.message);
            }
            return null;
        }
    }

    /**
     * Визуально подсветить оборудование (wireframe + bbox + принудительный материал)
     */
    highlightEquipment(id: string): void {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`⚠️ highlightEquipment: оборудование ${id} не найдено`);
            return;
        }
        const group = item.mesh;
        group.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                // Заменяем материал на яркий
                mesh.material = new THREE.MeshStandardMaterial({
                    color: 0xff4444,
                    metalness: 0.1,
                    roughness: 0.6,
                    emissive: new THREE.Color(0x330000),
                    emissiveIntensity: 0.6
                });
                // Добавляем wireframe overlay
                const wire = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }));
                wire.position.copy(mesh.position);
                wire.scale.copy(mesh.scale);
                wire.rotation.copy(mesh.rotation);
                group.add(wire);
            }
        });
        const bbox = new THREE.Box3().setFromObject(group);
        const helper = new THREE.Box3Helper(bbox, new THREE.Color(0x00ff00));
        group.add(helper);
        console.log(`🌟 Подсветка применена к ${id}`);
    }

    /**
     * Удалить оборудование по ID
     * @param id - ID оборудования
     * @returns true если удалено успешно
     */
    removeEquipment(id: string): boolean {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`Оборудование ${id} не найдено`);
            return false;
        }

        // Освобождаем занятое место в стратегии монтажа
        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (cabinet && cabinet.strategies) {
            // Получаем стратегию по типу монтажа оборудования
            const mountType = item.config.mounting.type;
            const strategy = cabinet.strategies.get(mountType);
            const unmount = (strategy as { unmount?: (id: string, railIndex: number) => void }).unmount;
            if (unmount && typeof unmount === 'function' && item.railIndex !== undefined) {
                unmount(id, item.railIndex);
            }
        }

        // Удаляем из parent (шкафа)
        if (item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
        }

        // Dispose геометрии и материалов
        item.mesh.traverse((child: THREE.Object3D) => {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                const material = mesh.material;
                if (Array.isArray(material)) {
                    material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    material.dispose();
                }
            }
        });

        this.equipment.delete(id);
        this._notifyUpdate();
        console.log(`🗑️ Удалено: ${id}`);
        return true;
    }

    /**
     * Удалить последнее добавленное оборудование
     */
    removeLastEquipment(): boolean {
        const ids = Array.from(this.equipment.keys());
        if (ids.length === 0) {
            console.warn('Нет оборудования для удаления');
            return false;
        }
        return this.removeEquipment(ids[ids.length - 1] ?? '');
    }

    /**
     * Удалить всё оборудование
     */
    removeAllEquipment(): void {
        const ids = Array.from(this.equipment.keys());
        ids.forEach(id => this.removeEquipment(id));
        console.log('🗑️ Всё оборудование удалено');
    }

    /**
     * Позиционировать оборудование через стратегию монтажа
     * @param id - ID оборудования
     */
    positionEquipment(id: string): void {
        const item = this.equipment.get(id);
        if (!item) {
            console.error(`❌ [positionEquipment] Оборудование ${id} не найдено в equipment map`);
            return;
        }

        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${item.cabinetId} не найден для оборудования ${id}`);
            return;
        }
        
        const equipmentGroup = item.mesh;
        
        console.log('🔍 [positionEquipment] Начало позиционирования:', {
            equipmentId: id,
            cabinetId: item.cabinetId,
            railIndex: item.railIndex,
            xOffset: item.xOffset,
            hasCabinetInstance: !!cabinet.instance,
            hasMountingStrategy: !!cabinet.strategies && cabinet.strategies.size > 0
        });

        // Универсальная стратегия монтажа
        const mountType = item.config.mounting.type;
        const mountingStrategy = cabinet.strategies.get(mountType);
        if (mountingStrategy && typeof mountingStrategy.mount === 'function') {
            try {
                // Создаем position объект в зависимости от типа монтажа
                let position: MountingPosition | undefined;
                if (mountType === 'din_rail') {
                    position = {
                        railIndex: item.railIndex,
                        xOffset: item.xOffset ?? null
                    };
                } else if (mountType === 'rack_unit') {
                    const rackPosition: { unitIndex?: number; depth?: number } = {};
                    if (item.unitIndex !== undefined) {
                        rackPosition.unitIndex = item.unitIndex;
                    }
                    if (item.depth !== undefined) {
                        rackPosition.depth = item.depth;
                    }
                    position = rackPosition;
                } else if (mountType === 'mounting_plate') {
                    position = {
                        x: item.xOffset ?? 0,
                        y: 0
                    };
                }
                console.log('🔧 [positionEquipment] Вызов mountingStrategy.mount с параметрами:', position);
                mountingStrategy.mount(equipmentGroup, item.config, position);
                console.log('✅ [positionEquipment] mountingStrategy.mount завершен успешно');
                return;
            } catch (e) {
                console.error('❌ Ошибка стратегии монтажа:', e);
                console.error('Stack:', (e as Error).stack);
                throw e;
            }
        }

        console.warn('⚠️ Шкаф не имеет стратегии монтажа', {
            hasCabinetInstance: !!cabinet.instance,
            hasMountingStrategy: !!cabinet.strategies && cabinet.strategies.size > 0,
            mountType: mountType,
            availableStrategies: Array.from(cabinet.strategies.keys())
        });
    }

    /**
     * Переместить оборудование вдоль рейки
     * @param id - ID оборудования
     * @param newPosition - Новая позиция { railIndex, xOffset }
     * @returns Успешно ли перемещение
     */
    moveEquipment(id: string, newPosition: { railIndex: number; xOffset: number }): boolean {
        const item = this.equipment.get(id);
        if (!item) {
            console.warn(`Оборудование ${id} не найдено`);
            return false;
        }

        const cabinet = this.cabinetManager.getCabinet(item.cabinetId);
        if (!cabinet) {
            console.warn(`Шкаф ${item.cabinetId} не найден для оборудования ${id}`);
            return false;
        }

        const mountType = item.config.mounting.type;
        const strategy = cabinet.strategies.get(mountType);
        if (!strategy) {
            console.warn('⚠️ Стратегия монтажа не найдена для типа:', mountType);
            return false;
        }
        
        const moveEquipment = (strategy as { moveEquipment?: (mesh: THREE.Group, config: EquipmentConfig, oldPos: unknown, newPos: unknown) => boolean }).moveEquipment;
        if (typeof moveEquipment !== 'function') {
            console.warn('⚠️ Стратегия монтажа не поддерживает перемещение');
            return false;
        }

        const oldPosition = {
            railIndex: item.railIndex,
            xOffset: item.xOffset ?? 0,
            equipmentId: id
        };

        try {
            const success = moveEquipment(
                item.mesh,
                item.config,
                oldPosition,
                newPosition
            );

            if (success) {
                // Обновляем позицию в EquipmentManager
                item.railIndex = newPosition.railIndex;
                item.xOffset = newPosition.xOffset;
                this._notifyUpdate();
                return true;
            }

            return false;
        } catch (e) {
            console.error('❌ Ошибка перемещения оборудования:', e);
            return false;
        }
    }

    /**
     * Уведомить React о изменении количества оборудования
     * @private
     */
    private _notifyUpdate(): void {
        if (typeof this.onUpdate === 'function') {
            this.onUpdate(this.equipment.size);
        }
    }

    /**
     * Получить оборудование по ID
     */
    getEquipment(id: string): EquipmentInstance | undefined {
        return this.equipment.get(id);
    }

    /**
     * Получить всё оборудование
     */
    getAllEquipment(): EquipmentInstance[] {
        return Array.from(this.equipment.values());
    }

    /**
     * Получить оборудование конкретного шкафа
     */
    getEquipmentByCabinet(cabinetId: string): EquipmentInstance[] {
        return Array.from(this.equipment.values()).filter(item => item.cabinetId === cabinetId);
    }

    /**
     * Массовая подсветка всех текущих моделей.
     * @param force - если true, переустанавливает подсветку даже уже подсвеченным.
     */
    massHighlight(force: boolean = false): void {
        this.equipment.forEach((_item, id) => {
            if (force || !this.highlighted.has(id)) {
                this.highlightEquipment(id);
                this.highlighted.add(id);
            }
        });
        console.log(`🌟 Массовая подсветка выполнена. Всего: ${this.equipment.size}`);
    }
}

