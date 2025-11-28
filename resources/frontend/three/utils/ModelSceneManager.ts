import * as THREE from 'three';

/**
 * Интерфейс для сборщика модели
 */
interface ModelAssembler {
    assemble: () => Promise<THREE.Group>;
    setAssemblyPosition: (x: number, y: number, z: number) => void;
    setComponentVisibility?: (componentName: string, visible: boolean) => void;
    setComponentPosition?: (componentName: string, x: number, y: number, z: number) => void;
    getComponents?: () => Record<string, THREE.Object3D>;
    [key: string]: unknown;
}

/**
 * Метаданные модели
 */
interface ModelMetadata {
    name: string;
    description: string;
    addedAt: number;
    [key: string]: unknown;
}

/**
 * Данные модели в менеджере
 */
interface ModelData {
    assembler: ModelAssembler;
    assembly: THREE.Group;
    position: { x: number; y: number; z: number };
    metadata: ModelMetadata;
}

/**
 * Информация о модели
 */
interface ModelInfo {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    components: string[];
}

/**
 * ModelSceneManager - управление размещением моделей в 3D-пространстве
 * Промежуточный слой между сборщиками моделей и Three.js Scene
 */
export class ModelSceneManager {
    private scene: THREE.Scene;
    private models: Map<string, ModelData>;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.models = new Map();
    }

    /**
     * Добавить модель в сцену
     */
    async addModel(
        id: string, 
        assembler: ModelAssembler, 
        position: { x?: number; y?: number; z?: number } = { x: 0, y: 0, z: 0 }, 
        metadata: Partial<ModelMetadata> = {}
    ): Promise<THREE.Group> {
        const assembly = await assembler.assemble();
        
        const pos = { x: position.x ?? 0, y: position.y ?? 0, z: position.z ?? 0 };
        assembler.setAssemblyPosition(pos.x, pos.y, pos.z);
        this.scene.add(assembly);
        
        this.models.set(id, {
            assembler,
            assembly,
            position: { ...pos },
            metadata: {
                name: metadata.name || id,
                description: metadata.description || '',
                addedAt: Date.now(),
                ...metadata
            }
        });
        
        console.log(`✅ Модель "${id}" добавлена:`, pos);
        return assembly;
    }

    /**
     * Переместить модель
     */
    moveModel(id: string, x: number, y: number, z: number): boolean {
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
    removeModel(id: string): boolean {
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
    getModel(id: string): ModelData | null {
        return this.models.get(id) || null;
    }

    /**
     * Получить все модели
     */
    getAllModels(): Array<{ id: string } & ModelData> {
        const result: Array<{ id: string } & ModelData> = [];
        this.models.forEach((model, id) => {
            result.push({ id, ...model });
        });
        return result;
    }

    /**
     * Показать/скрыть компонент модели
     */
    setComponentVisibility(modelId: string, componentName: string, visible: boolean): boolean {
        const model = this.models.get(modelId);
        if (!model || !model.assembler.setComponentVisibility) return false;
        
        model.assembler.setComponentVisibility(componentName, visible);
        return true;
    }

    /**
     * Переместить компонент модели
     */
    setComponentPosition(modelId: string, componentName: string, x: number, y: number, z: number): boolean {
        const model = this.models.get(modelId);
        if (!model || !model.assembler.setComponentPosition) return false;
        
        model.assembler.setComponentPosition(componentName, x, y, z);
        return true;
    }

    /**
     * Расставить модели в ряд
     */
    arrangeInLine(modelIds: string[], spacing: number = 1.5, axis: 'x' | 'y' | 'z' = 'x'): void {
        let offset = 0;
        modelIds.forEach((id) => {
            const pos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
            pos[axis] = offset;
            this.moveModel(id, pos.x, pos.y, pos.z);
            offset += spacing;
        });
        console.log(`📐 Модели расставлены в ряд по ${axis.toUpperCase()}`);
    }

    /**
     * Очистить сцену
     */
    clear(): void {
        this.models.forEach((model) => {
            this.scene.remove(model.assembly);
        });
        this.models.clear();
        console.log('🗑️ Все модели удалены');
    }

    /**
     * Получить информацию
     */
    getInfo(): ModelInfo[] {
        const info: ModelInfo[] = [];
        this.models.forEach((model, id) => {
            const components = model.assembler.getComponents 
                ? Object.keys(model.assembler.getComponents())
                : [];
            info.push({
                id,
                name: model.metadata.name,
                position: model.position,
                components
            });
        });
        return info;
    }
}

