import * as THREE from 'three';
import { FreeCADGeometryLoader } from '../../loaders/FreeCADGeometryLoader.ts';
import { config as defaultConfig } from './config.js';
import { CabinetBase } from '../CabinetBase.ts';

/**
 * Класс шкафа tsh_700_500_250
 * Автоматически сгенерирован из FreeCAD JSON-схем
 * Размеры: 0×0×0 мм
 * Конфиг: config.json
 * 
 * Структура: config содержит компоненты и рейки с позициями
 */
export class tsh_700_500_250 extends CabinetBase {
    constructor() {
        super(); // Вызиваем конструктор базового класса
        this.loader = new FreeCADGeometryLoader();
        this.assembly.name = 'tsh_700_500_250_Assembly';
        // Остальные значения загружаются из конфига в _initDoorSettingsFromConfig()
        this.config = null;
    }

    /**
     * Загрузить конфиг (по умолчанию из встроенного модуля)
     * @param {Object} customConfig - Пользовательский конфиг (если не указан, использует встроенный)
     * @returns {Object} Загруженный конфиг
     */
    async _loadConfig(customConfig) {
        try {
            if (customConfig) {
                this.config = customConfig;
                console.log('✅ Конфиг загружен (пользовательский):', this.config.name);
            } else {
                this.config = defaultConfig;
                console.log('✅ Конфиг загружен (встроенный):', this.config.name);
            }
            return this.config;
        } catch (error) {
            console.error('❌ Ошибка загрузки конфига:', error);
            throw error;
        }
    }

    /**
     * Сборка компонентов шкафа на основе конфига
     * @param {Object} options - Опции сборки
     * @param {string} options.basePath - Полный путь к папке моделей (например http://localhost:5173/assets/models/freecad)
     * @param {Object} options.config - Пользовательский конфиг (если не указан, используется встроенный)
     * @returns {Promise<THREE.Group>} Собранный шкаф
     */
    async assemble(options = {}) {
        const basePath = options.basePath || (window.location.origin + '/assets/models/freecad');
        
        // Если конфиг не загружен — загружаем (по умолчанию встроенный)
        if (!this.config) {
            await this._loadConfig(options.config);
        }
        
        // Всегда загружаем настройки двери из конфига (инициализируем или обновляем)
        this._initDoorSettingsFromConfig();

        try {
            await this._assembleFromConfig(basePath);
            
            // Инициализируем pivot для двери (должно быть после загрузки компонентов)
            this._initializeDoorPivot();
            
            // Центрируем всю сборку относительно нижней плоскости
            this._alignAssemblyToFloor();
            
            console.log('✅ Шкаф tsh_700_500_250 собран успешно');
            console.log('📦 Компоненты:', Object.keys(this.components));
            return this.assembly;
        } catch (error) {
            console.error('❌ Ошибка сборки tsh_700_500_250:', error);
            throw error;
        }
    }

    /**
     * Внутренний метод сборки на основе конфига
     */
    async _assembleFromConfig(basePath) {
        if (!this.config) throw new Error('Конфиг не загружен');

        const folderName = this.config.name;

        // Обычные компоненты
        if (this.config.components) {
            for (const [varName, compDef] of Object.entries(this.config.components)) {
                const filename = compDef.file;
                const filePath = `${basePath}/${folderName}/${filename}`;
                
                this.components[varName] = await this.loader.load(filePath);
                this.components[varName].name = varName;
                
                const scale = compDef.scale || [0.001, 0.001, 0.001];
                const pos = compDef.position || [0, 0, 0];
                
                this.components[varName].scale.set(...scale);
                this.components[varName].position.set(...pos);
                this.assembly.add(this.components[varName]);
            }
        }

        // Рейки (может быть несколько с разными позициями!)
        if (this.config.rails && Array.isArray(this.config.rails)) {
            for (const railDef of this.config.rails) {
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
            }
        }
    }

    // ========== Методы управления компонентами ==========

    /**
     * Установить позицию компонента
     */
    setComponentPosition(componentName, x, y, z) {
        const c = this.components[componentName];
        if (c) c.position.set(x, y, z);
    }

    /**
     * Получить локальную позицию компонента
     */
    getComponentPosition(componentName) {
        const c = this.components[componentName];
        return c ? c.position.clone() : null;
    }

    /**
     * Получить мировую позицию компонента
     */
    getComponentWorldPosition(componentName) {
        const c = this.components[componentName];
        if (!c) return null;
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        return v;
    }

    /**
     * Показать/скрыть компонент
     */
    setComponentVisibility(componentName, visible) {
        const c = this.components[componentName];
        if (c) c.visible = visible;
    }

    /**
     * Выровнять сборку так, чтобы origin был на нижней плоскости
     */
    _alignAssemblyToFloor() {
        // Обновляем матрицы перед расчётом bbox (КРИТИЧНО для вложенных трансформаций)
        this.assembly.updateMatrixWorld(true);
        
        // Получаем Bounding Box всей сборки
        const bbox = new THREE.Box3().setFromObject(this.assembly);
        
        // Вычисляем смещение: нижняя точка должна быть на Y=0
        const offsetY = -bbox.min.y;
        
        // Смещаем саму сборку (не дочерние элементы!)
        this.assembly.position.y += offsetY;
        
        return offsetY;
    }

    /**
     * Переместить всю сборку
     */
    setAssemblyPosition(x, y, z) {
        this.assembly.position.set(x, y, z);
    }

    /**
     * Получить позицию сборки
     */
    getAssemblyPosition() {
        return this.assembly.position.clone();
    }

    /**
     * Переместить сборку на величину (относительное смещение)
     */
    moveAssemblyBy(dx, dy, dz) {
        this.assembly.position.x += dx;
        this.assembly.position.y += dy;
        this.assembly.position.z += dz;
    }

    /**
     * Сбросить позицию в начало координат (0, 0, 0)
     */
    resetAssemblyPosition() {
        this.assembly.position.set(0, 0, 0);
    }

    /**
     * Информация о сборке и компонентах
     */
    getInfo() {
        const info = {
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

    /**
     * Получить все компоненты шкафа
     */
    getComponents() { 
        return this.components; 
    }

    /**
     * Получить корневую группу сборки
     */
    getAssembly() { 
        return this.assembly; 
    }
}
