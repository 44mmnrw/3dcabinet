import * as THREE from 'three';

/**
 * Режим подсветки рейки
 */
export type HighlightMode = 'dim' | 'bright';

/**
 * Информация о рейке для подсветки
 */
export interface RailMeshInfo {
    mesh: THREE.Mesh;
    index: number;
    name?: string;
}

/**
 * Управление визуальными эффектами подсветки DIN-реек и других монтажных поверхностей
 * 
 * Поддерживает 3 состояния:
 * - normal: оригинальный материал (без подсветки)
 * - dim: слабое свечение (все рейки при начале drag)
 * - bright: яркое свечение (ближайшая рейка при наведении)
 */
export class RailHighlighter {
    // Материалы для различных состояний подсветки
    private materials: {
        dim: THREE.MeshStandardMaterial;
        bright: THREE.MeshStandardMaterial;
    };
    
    // Хранение оригинальных материалов для восстановления
    private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
    
    // Текущее состояние каждой рейки
    private currentState: Map<THREE.Mesh, HighlightMode>;

    constructor() {
        // Материалы для различных состояний подсветки
        this.materials = {
            dim: new THREE.MeshStandardMaterial({
                color: 0xC0C0C0,          // Серебристый металл
                emissive: 0x3498db,       // Голубое свечение
                emissiveIntensity: 0.3,   // Слабая интенсивность
                metalness: 0.8,
                roughness: 0.3,
                transparent: false
            }),
            bright: new THREE.MeshStandardMaterial({
                color: 0xC0C0C0,
                emissive: 0x2ecc71,       // Зелёное свечение (готовность к установке)
                emissiveIntensity: 0.7,   // Яркая интенсивность
                metalness: 0.8,
                roughness: 0.3,
                transparent: false
            })
        };
        
        // Хранение оригинальных материалов для восстановления
        this.originalMaterials = new Map();
        
        // Текущее состояние каждой рейки
        this.currentState = new Map();
    }

    /**
     * Подсветить все рейки слабым свечением
     */
    highlightAll(railMeshes: RailMeshInfo[], mode: HighlightMode = 'dim'): void {
        if (!railMeshes || railMeshes.length === 0) {
            console.warn('⚠️ RailHighlighter: нет реек для подсветки');
            return;
        }

        railMeshes.forEach(({ mesh, index }) => {
            if (!mesh || !mesh.isMesh) {
                console.warn(`⚠️ RailHighlighter: объект рейки ${index} не является Mesh`);
                return;
            }

            // Сохраняем оригинальный материал при первой подсветке
            if (!this.originalMaterials.has(mesh)) {
                this.originalMaterials.set(mesh, mesh.material);
            }
            
            // Применяем материал подсветки
            mesh.material = this.materials[mode];
            this.currentState.set(mesh, mode);
        });

        console.log(`✨ RailHighlighter: подсвечено ${railMeshes.length} реек (режим: ${mode})`);
    }

    /**
     * Подсветить одну рейку ярко, остальные слабо
     */
    highlightOne(railMeshes: RailMeshInfo[], targetIndex: number): void {
        if (!railMeshes || railMeshes.length === 0) return;

        railMeshes.forEach(({ mesh, index }) => {
            if (!mesh || !mesh.isMesh) return;

            const mode: HighlightMode = (index === targetIndex) ? 'bright' : 'dim';
            mesh.material = this.materials[mode];
            this.currentState.set(mesh, mode);
        });

        console.log(`🎯 RailHighlighter: рейка ${targetIndex} подсвечена ярко`);
    }

    /**
     * Вернуть все рейки к оригинальным материалам
     */
    reset(railMeshes: RailMeshInfo[]): void {
        if (!railMeshes || railMeshes.length === 0) return;

        let resetCount = 0;
        railMeshes.forEach(({ mesh }) => {
            if (!mesh) return;

            if (this.originalMaterials.has(mesh)) {
                mesh.material = this.originalMaterials.get(mesh)!;
                this.originalMaterials.delete(mesh);
                this.currentState.delete(mesh);
                resetCount++;
            }
        });

        console.log(`🔄 RailHighlighter: сброшено ${resetCount} реек к оригинальным материалам`);
    }

    /**
     * Проверить, находится ли рейка в подсвеченном состоянии
     */
    getState(mesh: THREE.Mesh): HighlightMode | null {
        return this.currentState.get(mesh) || null;
    }

    /**
     * Очистить все сохранённые состояния (при удалении шкафа)
     */
    clear(): void {
        this.originalMaterials.clear();
        this.currentState.clear();
        console.log('🧹 RailHighlighter: очищены все состояния');
    }

    /**
     * Dispose материалов подсветки (при уничтожении highlighter)
     */
    dispose(): void {
        this.materials.dim.dispose();
        this.materials.bright.dispose();
        this.clear();
        console.log('♻️ RailHighlighter: материалы освобождены');
    }
}

