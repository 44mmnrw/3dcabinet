import * as THREE from 'three';
import { CabinetBase } from './CabinetBase.ts';
import { getAssetLoader } from '../loaders/AssetLoader.ts';
import { collectOriginalData, applyParametricResize } from '../utils/CabinetResizer.ts';
import type { NodeOriginalData, ModelOriginalData } from '../utils/CabinetResizer.ts';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Опции для метода assemble
 */
export interface GLTFCabinetAssembleOptions {
    modelPath?: string;
    basePath?: string;
    config?: unknown;
}

/**
 * Конфигурация для GLTF шкафа
 */
export interface GLTFCabinetConfig {
    modelPath: string;
    doorComponentName?: string;
    doorRotationAxis?: 'x' | 'y' | 'z';
    dinRailPatterns?: string[]; // Паттерны для поиска DIN-реек (по умолчанию: ['DIN_RAIL', 'din_rail', 'DINRail'])
    componentPatterns?: Record<string, string[]>; // Дополнительные компоненты для регистрации
}

/**
 * Универсальный базовый класс для шкафов из GLTF/GLB моделей
 * Автоматически определяет компоненты (DIN-рейки, двери) из структуры модели
 */
export abstract class GLTFCabinetBase extends CabinetBase {
    protected assetLoader = getAssetLoader();
    protected originalCabinetSize: THREE.Vector3 | null = null;
    protected nodesOriginalData: Map<string, NodeOriginalData> = new Map();
    protected modelOriginalData: ModelOriginalData | null = null;
    protected gltfConfig: GLTFCabinetConfig | null = null;
    /** Текущие размеры шкафа (обновляются при каждом applyResize) */
    private _currentSize: THREE.Vector3 | null = null;
    /** Флаг для предотвращения рекурсии при пересчёте ресайза после поворота двери */
    private _isRecalculatingResize: boolean = false;

    constructor() {
        super();
    }

    /**
     * Получить конфигурацию GLTF шкафа
     * Должен быть переопределён в дочерних классах
     */
    protected abstract getGLTFConfig(): GLTFCabinetConfig;

    /**
     * Сборка шкафа из GLTF модели
     * @param options - Опции сборки
     * @returns Собранный шкаф
     */
    async assemble(options: GLTFCabinetAssembleOptions = {}): Promise<THREE.Group> {
        try {
            // Получаем конфигурацию
            this.gltfConfig = this.getGLTFConfig();
            
            // Определяем путь к модели
            // Приоритет: options.modelPath > gltfConfig.modelPath
            let modelPath = options.modelPath || this.gltfConfig.modelPath;
            
            // Если путь относительный, добавляем базовый путь
            if (modelPath && !modelPath.startsWith('/')) {
                modelPath = `/assets/models/cabinets/${modelPath}`;
            }
            
            if (!modelPath) {
                throw new Error('Путь к модели не указан. Укажите modelPath в опциях или в getGLTFConfig()');
            }

            console.log(`🔄 Загрузка шкафа из GLTF: ${modelPath}`);
            
            // Загружаем GLTF модель через AssetLoader, но получаем доступ к полному GLTF объекту
            // для чтения extras из исходной структуры
            const assetLoader = this.assetLoader as any;
            
            // Используем внутренний gltfLoader из AssetLoader (он уже настроен с DRACO)
            const gltf = await new Promise<GLTF>((resolve, reject) => {
                assetLoader.gltfLoader.load(
                    modelPath,
                    resolve,
                    undefined,
                    reject
                );
            });
            
            const model = gltf.scene as THREE.Group;

            // GLTFLoader НЕ копирует extras в userData автоматически
            // Нужно явно скопировать extras из GLTF структуры в userData узлов
            if (gltf.parser && (gltf.parser as any).json) {
                const json = (gltf.parser as any).json;
                const nodes = json.nodes as Array<{ name?: string; extras?: Record<string, unknown>; mesh?: number }> | undefined;
                const meshes = json.meshes as Array<{ extras?: Record<string, unknown> }> | undefined;
                
                // Функция нормализации имён (Three.js может удалять точки из имён)
                const normalizeName = (name: string) => name.replace(/\./g, '');
                
                model.traverse((child) => {
                    if (!child.name) return;
                    
                    // Находим соответствующий узел в JSON
                    // Сравниваем как точное совпадение, так и нормализованные имена
                    const childNameNormalized = normalizeName(child.name);
                    const nodeDef = nodes?.find((n) => {
                        if (!n.name) return false;
                        return n.name === child.name || normalizeName(n.name) === childNameNormalized;
                    });
                    
                    // Отладка для DIN-реек
                    if (child.name.includes('DIN_RAIL')) {
                        console.log(`🔍 [GLTFCabinetBase] Поиск узла для ${child.name}:`);
                        console.log('   childNameNormalized:', childNameNormalized);
                        console.log('   nodeDef найден:', !!nodeDef);
                        if (nodeDef) {
                            console.log('   nodeDef.name:', nodeDef.name);
                            console.log('   nodeDef.extras:', nodeDef.extras);
                        }
                    }
                    
                    if (nodeDef) {
                        // Копируем extras из node
                        if (nodeDef.extras) {
                            if (!child.userData) {
                                child.userData = {};
                            }
                            Object.assign(child.userData, nodeDef.extras);
                            
                            // Отладка для DIN-реек
                            if (child.name.includes('DIN_RAIL')) {
                                console.log(`   ✅ Extras скопированы в userData для ${child.name}:`, child.userData);
                            }
                        }
                        
                        // Также проверяем extras в mesh, если узел ссылается на mesh
                        if (nodeDef.mesh !== undefined && meshes && meshes[nodeDef.mesh]) {
                            const meshExtras = meshes[nodeDef.mesh].extras;
                            if (meshExtras) {
                                if (!child.userData) {
                                    child.userData = {};
                                }
                                Object.assign(child.userData, meshExtras);
                            }
                            
                            // Также копируем в geometry.userData, если это Mesh
                            if (child instanceof THREE.Mesh && child.geometry) {
                                if (!child.geometry.userData) {
                                    child.geometry.userData = {};
                                }
                                Object.assign(child.geometry.userData, meshExtras);
                            }
                        }
                    }
                });
            }

            // Сохраняем оригинальные данные для параметрического ресайза
            const { nodes: nodesData, model: modelData } = collectOriginalData(model);
            this.nodesOriginalData = nodesData;
            this.modelOriginalData = modelData;
            
            // Размеры в миллиметрах
            const sizeInMm = new THREE.Vector3(
                modelData.size.x * 1000,
                modelData.size.y * 1000,
                modelData.size.z * 1000
            );
            this.originalCabinetSize = sizeInMm;
            // Инициализируем текущие размеры как оригинальные
            this._currentSize = sizeInMm.clone();
            
            // Устанавливаем модель на "пол" (центрируем по Y)
            const minY = modelData.min.y;
            if (minY < 0) {
                model.position.y -= minY;
            }
            
            // Сохраняем модель как основной компонент
            model.name = `${this.assembly.name}_cabinet`;
            this.components['cabinet'] = model;
            this.assembly.add(model);
            
            // Настраиваем дверь из конфига
            if (this.gltfConfig.doorComponentName) {
                this.doorComponentName = this.gltfConfig.doorComponentName;
            }
            if (this.gltfConfig.doorRotationAxis) {
                this.doorRotationAxis = this.gltfConfig.doorRotationAxis;
            }
            
            // Регистрируем компоненты из модели
            this._registerComponents(model);
            
            console.log('✅ Шкаф загружен успешно');
            console.log(`📐 Размеры: ${Math.round(sizeInMm.x)}×${Math.round(sizeInMm.y)}×${Math.round(sizeInMm.z)} мм`);
            console.log(`🔗 Зарегистрировано компонентов: ${Object.keys(this.components).length}`);
            
            return this.assembly;
        } catch (error) {
            console.error('❌ Ошибка загрузки шкафа:', error);
            throw error;
        }
    }

    /**
     * Применить параметрический ресайз к шкафу
     * @param newWidth - Новая ширина в мм
     * @param newHeight - Новая высота в мм
     * @param newDepth - Новая глубина в мм
     */
    applyResize(newWidth: number, newHeight: number, newDepth: number): void {
        if (!this.originalCabinetSize || !this.modelOriginalData || this.nodesOriginalData.size === 0) {
            console.warn('⚠️ Невозможно применить ресайз: отсутствуют оригинальные данные');
            return;
        }
        
        const cabinetModel = this.components['cabinet'];
        if (!cabinetModel) {
            console.warn('⚠️ Невозможно применить ресайз: модель не найдена');
            return;
        }
        
        // ВАЖНО: Сохраняем ИЗНАЧАЛЬНЫЙ размер для расчёта scale
        // Не обновляем originalCabinetSize до применения ресайза!
        const originalSize = this.originalCabinetSize.clone();
        const newSize = new THREE.Vector3(newWidth, newHeight, newDepth);
        
        // Вычисляем scale относительно ИЗНАЧАЛЬНОГО размера
        const scale = new THREE.Vector3(
            newSize.x / originalSize.x,
            newSize.y / originalSize.y,
            newSize.z / originalSize.z
        );
        
        // Проверяем, есть ли в модели узлы с кастомными правилами ресайза
        let hasCustomRules = false;
        this.nodesOriginalData.forEach((data) => {
            if (data.rules.resize_x !== 'scale' || data.rules.resize_y !== 'scale' || data.rules.resize_z !== 'scale') {
                hasCustomRules = true;
            }
        });
        
        if (hasCustomRules) {
            // Применяем параметрический ресайз относительно ИЗНАЧАЛЬНОГО размера
            applyParametricResize(
                cabinetModel,
                this.nodesOriginalData,
                this.modelOriginalData,
                originalSize,  // Используем сохранённый оригинальный размер
                newSize
            );
        } else {
            // Простое масштабирование всей модели
            // Сбрасываем scale до (1,1,1) перед применением нового
            cabinetModel.scale.set(1, 1, 1);
            cabinetModel.scale.copy(scale);
        }
        
        // Обновляем матрицы для всех узлов после ресайза
        cabinetModel.traverse((child) => {
            child.updateMatrix();
            child.updateMatrixWorld(true);
        });
        
        // Сохраняем текущие размеры для пересчёта ресайза при повороте двери
        this._currentSize = newSize.clone();
        
        // НЕ обновляем originalCabinetSize - он должен оставаться неизменным!
        // this.originalCabinetSize = newSize; // УДАЛЕНО!
    }

    /**
     * Получить оригинальные размеры шкафа
     */
    getOriginalSize(): THREE.Vector3 | null {
        return this.originalCabinetSize?.clone() || null;
    }

    /**
     * Переопределяем setDoorRotation для автоматического пересчёта ресайза
     * после поворота двери (необходимо для правильной компенсации scale двери)
     */
    setDoorRotation(radians: number): void {
        // Вызываем базовый метод для поворота двери
        super.setDoorRotation(radians);
        
        // Если шкаф был масштабирован, пересчитываем ресайз для правильной компенсации scale двери
        // Это необходимо, так как compensatedScale зависит от угла поворота двери
        if (this._isRecalculatingResize) {
            // Предотвращаем рекурсию
            return;
        }
        
        if (this._currentSize && this.originalCabinetSize) {
            // Проверяем, что размеры действительно были изменены (не равны оригинальным)
            // Используем ручное сравнение вместо equals (может не существовать в некоторых версиях Three.js)
            const isResized = Math.abs(this._currentSize.x - this.originalCabinetSize.x) > 0.1 ||
                             Math.abs(this._currentSize.y - this.originalCabinetSize.y) > 0.1 ||
                             Math.abs(this._currentSize.z - this.originalCabinetSize.z) > 0.1;
            
            if (isResized) {
                // Устанавливаем флаг, чтобы предотвратить рекурсию
                this._isRecalculatingResize = true;
                
                try {
                    // Пересчитываем ресайз с текущими размерами
                    this.applyResize(
                        this._currentSize.x,
                        this._currentSize.y,
                        this._currentSize.z
                    );
                } finally {
                    // Сбрасываем флаг в любом случае
                    this._isRecalculatingResize = false;
                }
            }
        }
    }

    /**
     * Регистрирует компоненты из модели (DIN-рейки, двери и т.д.)
     * @private
     */
    private _registerComponents(model: THREE.Group): void {
        if (!this.gltfConfig) return;

        // Регистрируем DIN-рейки
        const dinRailPatterns = this.gltfConfig.dinRailPatterns || ['DIN_RAIL', 'din_rail', 'DINRail'];
        this._registerDINRails(model, dinRailPatterns);

        // Регистрируем дверь, если указано имя компонента
        if (this.doorComponentName) {
            this._registerDoor(model, this.doorComponentName);
        }

        // Регистрируем дополнительные компоненты из конфига
        if (this.gltfConfig.componentPatterns) {
            for (const [componentName, patterns] of Object.entries(this.gltfConfig.componentPatterns)) {
                this._registerComponentByPattern(model, componentName, patterns);
            }
        }
    }

    /**
     * Регистрирует дверь как компонент
     * @private
     */
    private _registerDoor(model: THREE.Group, doorName: string): void {
        let doorFound = false;
        
        // Ищем дверь по точному имени
        model.traverse((child) => {
            if (child.name === doorName && !doorFound) {
                this.components[doorName] = child;
                doorFound = true;
                console.log(`  🚪 Зарегистрирована дверь: ${doorName}`);
            }
        });
        
        // Если не найдена по точному имени, ищем по паттернам
        if (!doorFound) {
            const doorPatterns = ['DOOR_HINGE', 'DOOR_SET', 'DOOR_FRAME', 'DOOR', 'door'];
            model.traverse((child) => {
                if (!doorFound && child.name) {
                    const matchesPattern = doorPatterns.some(pattern => 
                        child.name.includes(pattern) || child.name.toLowerCase().includes(pattern.toLowerCase())
                    );
                    if (matchesPattern) {
                        this.components[doorName] = child;
                        doorFound = true;
                        console.log(`  🚪 Зарегистрирована дверь: ${child.name} → ${doorName}`);
                    }
                }
            });
        }
        
        if (!doorFound) {
            console.warn(`⚠️ Дверь "${doorName}" не найдена в модели. Проверьте имена узлов в GLTF.`);
            console.warn(`   Ищем узлы с именами, содержащими: ${doorName}, DOOR_HINGE, DOOR_SET, DOOR_FRAME, DOOR`);
        }
    }

    /**
     * Регистрирует DIN-рейки из модели как отдельные компоненты
     * Это необходимо для работы стратегии монтажа DINRailStrategy
     * @private
     */
    private _registerDINRails(model: THREE.Group, patterns: string[]): void {
        const railNames: string[] = [];
        let railIndex = 0;
        
        // Ищем узлы с именами, содержащими паттерны
        model.traverse((child) => {
            const name = child.name;
            if (!name) return;

            // Проверяем все паттерны
            const matchesPattern = patterns.some(pattern => 
                name.includes(pattern) || name.toLowerCase().includes(pattern.toLowerCase())
            );

            if (matchesPattern) {
                // Создаём имя компонента, которое будет найдено стратегией
                // Стратегия ищет: dinRail*, din_rail*, rail*
                const componentName = `din_rail_${railIndex}`;
                
                // Регистрируем узел как компонент
                this.components[componentName] = child;
                railNames.push(`${name} → ${componentName}`);
                railIndex++;
                
                console.log(`  🔗 Зарегистрирована DIN-рейка: ${name} → ${componentName}`);
            }
        });
        
        if (railNames.length === 0) {
            console.warn('⚠️ В модели не найдено DIN-реек. Проверьте имена узлов в GLTF.');
            console.warn(`   Ожидаются узлы с именами, содержащими: ${patterns.join(', ')}`);
        } else {
            console.log(`✅ Зарегистрировано ${railNames.length} DIN-реек для стратегии монтажа:`);
            railNames.forEach(name => console.log(`   - ${name}`));
        }
    }

    /**
     * Регистрирует компонент по паттернам имён
     * @private
     */
    private _registerComponentByPattern(model: THREE.Group, componentName: string, patterns: string[]): void {
        model.traverse((child) => {
            const name = child.name;
            if (!name) return;

            const matchesPattern = patterns.some(pattern => 
                name.includes(pattern) || name.toLowerCase().includes(pattern.toLowerCase())
            );

            if (matchesPattern && !this.components[componentName]) {
                this.components[componentName] = child;
                console.log(`  📦 Зарегистрирован компонент: ${name} → ${componentName}`);
            }
        });
    }
}

