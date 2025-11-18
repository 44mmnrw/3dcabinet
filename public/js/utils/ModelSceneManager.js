import * as THREE from '../libs/three.module.js';

/**
 * ModelSceneManager - управление размещением моделей в 3D-пространстве
 * Промежуточный слой между сборщиками моделей и Three.js Scene
 */
export class ModelSceneManager {
    constructor(scene) {
        this.scene = scene;
        this.models = new Map(); // ID → { assembler, assembly, metadata }
    }

    /**
     * Добавить модель в сцену
     * @param {string} id - Уникальный идентификатор модели
     * @param {Object} assembler - Экземпляр сборщика (tsh_700_500_250 и т.д.)
     * @param {Object} position - Позиция в сцене {x, y, z}
     * @param {Object} metadata - Дополнительные данные
     */
    async addModel(id, assembler, position = { x: 0, y: 0, z: 0 }, metadata = {}) {
        const assembly = await assembler.assemble();
        
        assembler.setAssemblyPosition(position.x, position.y, position.z);
        this.scene.add(assembly);
        
        this.models.set(id, {
            assembler,
            assembly,
            position: { ...position },
            metadata: {
                name: metadata.name || id,
                description: metadata.description || '',
                addedAt: Date.now(),
                ...metadata
            }
        });
        
        console.log(`✅ Модель "${id}" добавлена:`, position);
        return assembly;
    }

    /**
     * Переместить модель
     */
    moveModel(id, x, y, z) {
        const model = this.models.get(id);
        if (!model) {
            console.warn(`⚠️ Модель "${id}" не найдена`);
            return false;
        }
        
        model.assembler.setAssemblyPosition(x, y, z);
        model.position = { x, y, z };
        console.log(`📍 Модель "${id}" перемещена:`, { x, y, z });
        return true;
    }

    /**
     * Удалить модель
     */
    removeModel(id) {
        const model = this.models.get(id);
        if (!model) return false;
        
        this.scene.remove(model.assembly);
        this.models.delete(id);
        console.log(`🗑️ Модель "${id}" удалена`);
        return true;
    }

    /**
     * Получить модель
     */
    getModel(id) {
        return this.models.get(id) || null;
    }

    /**
     * Получить все модели
     */
    getAllModels() {
        const result = [];
        this.models.forEach((model, id) => {
            result.push({ id, ...model });
        });
        return result;
    }

    /**
     * Показать/скрыть компонент модели
     */
    setComponentVisibility(modelId, componentName, visible) {
        const model = this.models.get(modelId);
        if (!model) return false;
        
        model.assembler.setComponentVisibility(componentName, visible);
        return true;
    }

    /**
     * Переместить компонент модели
     */
    setComponentPosition(modelId, componentName, x, y, z) {
        const model = this.models.get(modelId);
        if (!model) return false;
        
        model.assembler.setComponentPosition(componentName, x, y, z);
        return true;
    }

    /**
     * Расставить модели в ряд
     */
    arrangeInLine(modelIds, spacing = 1.5, axis = 'x') {
        let offset = 0;
        modelIds.forEach((id) => {
            const pos = { x: 0, y: 0, z: 0 };
            pos[axis] = offset;
            this.moveModel(id, pos.x, pos.y, pos.z);
            offset += spacing;
        });
        console.log(`📐 Модели расставлены в ряд по ${axis.toUpperCase()}`);
    }

    /**
     * Очистить сцену
     */
    clear() {
        this.models.forEach((model) => {
            this.scene.remove(model.assembly);
        });
        this.models.clear();
        console.log('🗑️ Все модели удалены');
    }

    /**
     * Получить информацию
     */
    getInfo() {
        const info = [];
        this.models.forEach((model, id) => {
            info.push({
                id,
                name: model.metadata.name,
                position: model.position,
                components: Object.keys(model.assembler.getComponents())
            });
        });
        return info;
    }
}
