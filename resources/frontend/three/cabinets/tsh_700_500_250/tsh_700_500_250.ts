import * as THREE from 'three';
import { FreeCADGeometryLoader } from '../../loaders/FreeCADGeometryLoader.ts';
import { config as defaultConfig } from './config.js';
import { CabinetBase } from '../CabinetBase.ts';

/**
 * Конфигурация двери из конфига
 */
interface DoorConfig {
    componentName?: string;
    rotationAxis?: 'x' | 'y' | 'z';
    pivotOffset?: {
        x?: number;
        y?: number;
        z?: number;
    };
}

/**
 * Конфигурация шкафа
 */
interface CabinetConfig {
    name?: string;
    door?: DoorConfig;
    components?: Record<string, {
        file: string;
        scale?: number[];
        position?: number[];
    }>;
    rails?: Array<{
        id: string;
        file: string;
        scale?: number[];
        position?: number[];
        rotation?: number[];
    }>;
    [key: string]: unknown;
}

/**
 * Информация о компоненте
 */
interface ComponentInfo {
    name: string;
    visible: boolean;
    position: {
        local: number[];
        world: number[];
    };
    scale: number[];
}

/**
 * Информация о сборке
 */
interface AssemblyInfo {
    name: string;
    position: number[];
    children: number;
}

/**
 * Полная информация о шкафе
 */
interface CabinetInfo {
    assembly: AssemblyInfo;
    components: Record<string, ComponentInfo>;
}

/**
 * Опции для метода assemble
 */
interface AssembleOptions {
    basePath?: string;
    config?: CabinetConfig;
}

/**
 * Класс шкафа tsh_700_500_250
 * Автоматически сгенерирован из FreeCAD JSON-схем
 * Размеры: 0×0×0 мм
 * Конфиг: config.js
 * 
 * Структура: config содержит компоненты и рейки с позициями
 */
export class tsh_700_500_250 extends CabinetBase {
    protected loader: FreeCADGeometryLoader;

    constructor() {
        super(); // Вызываем конструктор базового класса
        this.loader = new FreeCADGeometryLoader();
        this.assembly.name = 'tsh_700_500_250_Assembly';
        
        // Настройки двери из конфига (переопределяются в _loadConfig)
        // Указывай имя компонента двери для своего шкафа:
        this.doorComponentName = 'door_700_500_250'; // Соответствует config.js
    }

    /**
     * Загрузить конфиг (по умолчанию из встроенного модуля)
     * @param customConfig - Пользовательский конфиг (если не указан, использует встроенный)
     * @returns Загруженный конфиг
     */
    async _loadConfig(customConfig?: CabinetConfig): Promise<CabinetConfig> {
        try {
            if (customConfig) {
                this.config = customConfig;
                console.log('✅ Конфиг загружен (пользовательский):', this.config.name);
            } else {
                this.config = defaultConfig as CabinetConfig;
                console.log('✅ Конфиг загружен (встроенный):', this.config.name);
            }
            
            // Инициализируем настройки двери из конфига
            if (this.config.door) {
                this.doorComponentName = this.config.door.componentName || null;
                this.doorRotationAxis = this.config.door.rotationAxis || 'y';
                
                if (this.config.door.pivotOffset) {
                    this.doorPivotOffset.set(
                        this.config.door.pivotOffset.x || 0,
                        this.config.door.pivotOffset.y || 0,
                        this.config.door.pivotOffset.z || 0
                    );
                    console.log(`🚪 Настройки двери загружены (pivot: [${this.doorPivotOffset.x.toFixed(3)}, ${this.doorPivotOffset.y.toFixed(3)}, ${this.doorPivotOffset.z.toFixed(3)}])`);
                }
            }
            
            return this.config;
        } catch (error) {
            console.error('❌ Ошибка загрузки конфига:', error);
            throw error;
        }
    }

    /**
     * Сборка компонентов шкафа на основе конфига
     * @param options - Опции сборки
     * @param options.basePath - Полный путь к папке моделей (например http://localhost:5173/assets/models/freecad)
     * @param options.config - Пользовательский конфиг (если не указан, используется встроенный)
     * @returns Собранный шкаф
     */
    async assemble(options: AssembleOptions = {}): Promise<THREE.Group> {
        const basePath = options.basePath || (window.location.origin + '/assets/models/freecad');
        
        // Если конфиг не загружен — загружаем (по умолчанию встроенный)
        if (!this.config) {
            await this._loadConfig(options.config);
            // Загружаем настройки двери из конфига (ось вращения, pivot и т.д.)
            this._initDoorSettingsFromConfig();
        }

        try {
            await this._assembleFromConfig(basePath);
            
            // Инициализируем pivot для двери (должно быть после загрузки компонентов)
            this._initializeDoorPivot();
            
            // Центрируем всю сборку относительно нижней плоскости
            this._alignAssemblyToFloor();
            
            // Детальная диагностика после сборки
            const bbox = new THREE.Box3().setFromObject(this.assembly);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            
            console.log('✅ Шкаф tsh_700_500_250 собран успешно');
            console.log('📦 Компоненты:', Object.keys(this.components));
            console.log('📐 Assembly размеры:', {
                children: this.assembly.children.length,
                position: this.assembly.position.toArray(),
                visible: this.assembly.visible,
                bbox: {
                    min: bbox.min.toArray(),
                    max: bbox.max.toArray(),
                    size: size.toArray(),
                    center: center.toArray()
                }
            });
            
            // Проверяем каждый компонент
            this.assembly.children.forEach((child, idx) => {
                const childBbox = new THREE.Box3().setFromObject(child);
                const childSize = childBbox.getSize(new THREE.Vector3());
                console.log(`  📦 Компонент ${idx} (${child.name}):`, {
                    visible: child.visible,
                    position: child.position.toArray(),
                    scale: child.scale.toArray(),
                    size: childSize.toArray(),
                    hasGeometry: child instanceof THREE.Mesh || child instanceof THREE.Group
                });
            });
            
            return this.assembly;
        } catch (error) {
            console.error('❌ Ошибка сборки tsh_700_500_250:', error);
            throw error;
        }
    }

    /**
     * Внутренний метод сборки на основе конфига
     * @param basePath - Базовый путь к папке моделей
     */
    protected async _assembleFromConfig(basePath: string): Promise<void> {
        if (!this.config) throw new Error('Конфиг не загружен');

        const folderName = this.config.name as string;

        // Обычные компоненты
        if (this.config.components) {
            const components = this.config.components as Record<string, { file: string; scale?: number[]; position?: number[] }>;
            for (const [varName, compDef] of Object.entries(components)) {
                const filename = compDef.file;
                const filePath = `${basePath}/${folderName}/${filename}`;
                
                this.components[varName] = await this.loader.load(filePath);
                this.components[varName].name = varName;
                
                const scale = compDef.scale || [0.001, 0.001, 0.001];
                const pos = compDef.position || [0, 0, 0];
                
                this.components[varName].scale.set(...scale);
                this.components[varName].position.set(...pos);
                this.assembly.add(this.components[varName]);
                
                console.log(`  📦 ${varName} загружен`);
            }
        }

        // Рейки (может быть несколько с разными позициями!)
        if (this.config.rails && Array.isArray(this.config.rails)) {
            const rails = this.config.rails as Array<{ id: string; file: string; scale?: number[]; position?: number[]; rotation?: number[] }>;
            for (const railDef of rails) {
                const railId = railDef.id;
                const filename = railDef.file;
                const filePath = `${basePath}/${folderName}/${filename}`;
                
                this.components[railId] = await this.loader.load(filePath);
                this.components[railId].name = railId;
                
                const scale = railDef.scale || [0.001, 0.001, 0.001];
                const pos = railDef.position || [0, 0, 0];
                const rot = railDef.rotation || [0, 0, 0];
                
                this.components[railId].scale.set(...scale);
                this.components[railId].position.set(...pos);
                this.components[railId].rotation.set(...rot);
                this.assembly.add(this.components[railId]);
                
                console.log(`  🔗 ${railId} загружен (pos: [${pos.join(', ')}])`);
            }
        }
    }

    // ========== Методы получения информации ==========

    /**
     * Информация о сборке и компонентах
     * @returns Информация о шкафе и его компонентах
     */
    getInfo(): CabinetInfo {
        const info: CabinetInfo = {
            assembly: {
                name: this.assembly.name,
                position: this.assembly.position.toArray(),
                children: this.assembly.children.length
            },
            components: {}
        };
        Object.entries(this.components).forEach(([name, c]) => {
            if (!c) return;
            const world = new THREE.Vector3();
            c.getWorldPosition(world);
            info.components[name] = {
                name: c.name,
                visible: c.visible,
                position: {
                    local: c.position.toArray(),
                    world: world.toArray()
                },
                scale: c.scale.toArray()
            };
        });
        return info;
    }
}
