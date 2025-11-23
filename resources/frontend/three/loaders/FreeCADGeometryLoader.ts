/**
 * Загрузчик геометрии из FreeCAD JSON для Three.js
 * Поддерживает два режима:
 * 1. С триангуляцией (полная геометрия)
 * 2. Ultra-light (только рёбра)
 */

import * as THREE from 'three';

/**
 * Стиль отображения
 */
export type DisplayStyle = 'technical' | 'realistic';

/**
 * Опции для загрузки модели
 */
export interface LoadOptions {
    name?: string;
    style?: DisplayStyle;
    lineColor?: number;
    surfaceColor?: number;
    surfaceOpacity?: number;
    showEdges?: boolean;
    showSurfaces?: boolean;
}

/**
 * Конфигурация загрузки
 */
interface LoadConfig {
    style: DisplayStyle;
    lineColor: number;
    surfaceColor: number;
    surfaceOpacity: number;
    showEdges: boolean;
    showSurfaces: boolean;
}

/**
 * Метаданные FreeCAD JSON
 */
interface FreeCADMetadata {
    mode?: string;
    [key: string]: any;
}

/**
 * Геометрия объекта (для режима с триангуляцией)
 */
interface FreeCADGeometry {
    vertices: number[][];
    indices: number[];
    vertexCount?: number;
    triangleCount?: number;
}

/**
 * Рёбра объекта
 */
interface FreeCADEdges {
    lines?: number[][][];
}

/**
 * Объект FreeCAD
 */
interface FreeCADObject {
    name: string;
    geometry?: FreeCADGeometry;
    edges?: number[][][] | FreeCADEdges;
}

/**
 * Структура FreeCAD JSON
 */
interface FreeCADData {
    metadata: FreeCADMetadata;
    objects: FreeCADObject[];
}

export class FreeCADGeometryLoader {
    constructor() {
        // Убираем this.group — создаём новую группу при каждом load()
    }
    
    /**
     * Загрузить JSON файл из FreeCAD
     * @param jsonPath - путь к JSON файлу
     * @param options - опции отображения
     * @returns Promise с загруженной группой
     */
    async load(jsonPath: string, options: LoadOptions = {}): Promise<THREE.Group> {
        // Создаём новую группу для этой загрузки
        const group = new THREE.Group();
        group.name = options.name || 'FreeCADModel';
        const config: LoadConfig = {
            // Стиль отображения
            style: options.style || 'technical',  // 'technical' | 'realistic'
            
            // Цвета
            lineColor: options.lineColor || 0x2c3e50,
            surfaceColor: options.surfaceColor || 0xecf0f1,
            surfaceOpacity: options.surfaceOpacity || 0.15,
            
            // Отображение компонентов
            showEdges: options.showEdges !== false,
            showSurfaces: options.showSurfaces !== false,
        };
        
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data: FreeCADData = await response.json();
            
            // Определяем режим
            const isUltraLight = data.metadata.mode === 'edges-only';
            
            if (isUltraLight) {
                this.loadUltraLight(data, config, group);
            } else {
                this.loadWithTriangulation(data, config, group);
            }
            
            return group;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            throw error;
        }
    }
    
    /**
     * Загрузка Ultra-Light режима (только рёбра)
     */
    private loadUltraLight(data: FreeCADData, config: LoadConfig, group: THREE.Group): void {
        data.objects.forEach(obj => {
            const objGroup = new THREE.Group();
            objGroup.name = obj.name;
            
            // Создаём линии из рёбер
            if (obj.edges && Array.isArray(obj.edges) && obj.edges.length > 0) {
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: config.lineColor,
                    linewidth: 2
                });
                
                obj.edges.forEach((edgePoints, idx) => {
                    if (edgePoints.length < 2) return;
                    
                    // Валидация точек рёбер
                    const validPoints: THREE.Vector3[] = [];
                    for (const p of edgePoints) {
                        if (Array.isArray(p) && p.length >= 3) {
                            const x = Number(p[0]);
                            const y = Number(p[1]);
                            const z = Number(p[2]);
                            
                            if (isFinite(x) && isFinite(y) && isFinite(z)) {
                                validPoints.push(new THREE.Vector3(x, y, z));
                            } else {
                                console.warn(`⚠️ [FreeCADGeometryLoader] NaN/Infinity в точке ребра ${obj.name}_edge_${idx}:`, p);
                            }
                        }
                    }
                    
                    if (validPoints.length < 2) {
                        console.warn(`⚠️ [FreeCADGeometryLoader] Недостаточно валидных точек для ребра ${obj.name}_edge_${idx}`);
                        return;
                    }
                    
                    const geometry = new THREE.BufferGeometry().setFromPoints(validPoints);
                    const line = new THREE.Line(geometry, lineMaterial);
                    line.name = `${obj.name}_edge_${idx}`;
                    objGroup.add(line);
                });
            }
            
            // Создаём упрощённые поверхности (опционально)
            if (config.showSurfaces && config.style === 'technical') {
                // Для технического вида можно добавить прозрачные плоскости
                // на основе bounding box
                const bbox = new THREE.Box3().setFromObject(objGroup);
                const size = bbox.getSize(new THREE.Vector3());
                const center = bbox.getCenter(new THREE.Vector3());
                
                // Создаём простой бокс как поверхность
                const surfaceGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                const surfaceMaterial = new THREE.MeshBasicMaterial({
                    color: config.surfaceColor,
                    opacity: config.surfaceOpacity,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                
                const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
                surfaceMesh.position.copy(center);
                surfaceMesh.name = `${obj.name}_surface`;
                objGroup.add(surfaceMesh);
            }
            
            group.add(objGroup);
        });
    }
    
    /**
     * Загрузка с полной триангуляцией
     */
    private loadWithTriangulation(data: FreeCADData, config: LoadConfig, group: THREE.Group): void {
        data.objects.forEach(obj => {
            const objGroup = new THREE.Group();
            objGroup.name = obj.name;
            
            // Создаём геометрию из vertices + indices
            if (obj.geometry && obj.geometry.vertices && obj.geometry.indices) {
                // Валидация и очистка vertices от NaN
                const rawVertices = obj.geometry.vertices;
                const cleanedVertices: number[] = [];
                
                for (const vertex of rawVertices) {
                    if (Array.isArray(vertex) && vertex.length >= 3) {
                        const x = Number(vertex[0]);
                        const y = Number(vertex[1]);
                        const z = Number(vertex[2]);
                        
                        // Проверяем на NaN и Infinity
                        if (isFinite(x) && isFinite(y) && isFinite(z)) {
                            cleanedVertices.push(x, y, z);
                        } else {
                            console.warn(`⚠️ [FreeCADGeometryLoader] NaN/Infinity в вершине объекта ${obj.name}:`, vertex);
                            // Заменяем на 0,0,0 если значение некорректное
                            cleanedVertices.push(0, 0, 0);
                        }
                    } else {
                        console.warn(`⚠️ [FreeCADGeometryLoader] Некорректная вершина в объекте ${obj.name}:`, vertex);
                        cleanedVertices.push(0, 0, 0);
                    }
                }
                
                if (cleanedVertices.length === 0) {
                    console.error(`❌ [FreeCADGeometryLoader] Нет валидных вершин в объекте ${obj.name}`);
                    group.add(objGroup);
                    return;
                }
                
                const geometry = new THREE.BufferGeometry();
                
                // Конвертируем очищенные vertices в Float32Array
                const vertices = new Float32Array(cleanedVertices);
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                
                // Валидация индексов
                const rawIndices = obj.geometry.indices;
                const cleanedIndices: number[] = [];
                
                for (const idx of rawIndices) {
                    const numIdx = Number(idx);
                    if (isFinite(numIdx) && numIdx >= 0 && numIdx < cleanedVertices.length / 3) {
                        cleanedIndices.push(numIdx);
                    } else {
                        console.warn(`⚠️ [FreeCADGeometryLoader] Некорректный индекс в объекте ${obj.name}:`, idx);
                    }
                }
                
                if (cleanedIndices.length === 0) {
                    console.error(`❌ [FreeCADGeometryLoader] Нет валидных индексов в объекте ${obj.name}`);
                    group.add(objGroup);
                    return;
                }
                
                // Добавляем индексы
                geometry.setIndex(cleanedIndices);
                
                // Вычисляем нормали (может выдать предупреждение, но не ошибку)
                try {
                    geometry.computeVertexNormals();
                } catch (err) {
                    console.warn(`⚠️ [FreeCADGeometryLoader] Ошибка вычисления нормалей для ${obj.name}:`, err);
                }
                
                // Поверхность
                if (config.showSurfaces) {
                    const surfaceMaterial = new THREE.MeshBasicMaterial({
                        color: config.surfaceColor,
                        opacity: config.surfaceOpacity,
                        transparent: true,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    
                    const mesh = new THREE.Mesh(geometry, surfaceMaterial);
                    mesh.name = `${obj.name}_surface`;
                    objGroup.add(mesh);
                }
                
                // Контуры (EdgesGeometry)
                if (config.showEdges) {
                    try {
                        // Проверяем, что геометрия валидна перед созданием EdgesGeometry
                        geometry.computeBoundingSphere();
                        if (geometry.boundingSphere && !isFinite(geometry.boundingSphere.radius)) {
                            console.warn(`⚠️ [FreeCADGeometryLoader] Некорректный bounding sphere для ${obj.name}, пропускаем EdgesGeometry`);
                        } else {
                            const edges = new THREE.EdgesGeometry(geometry, 20);
                            const lineMaterial = new THREE.LineBasicMaterial({
                                color: config.lineColor,
                                linewidth: 2
                            });
                            
                            const lines = new THREE.LineSegments(edges, lineMaterial);
                            lines.name = `${obj.name}_edges`;
                            objGroup.add(lines);
                        }
                    } catch (err) {
                        console.warn(`⚠️ [FreeCADGeometryLoader] Ошибка создания EdgesGeometry для ${obj.name}:`, err);
                    }
                }
                
                console.log(`  ✓ ${obj.name}: ${obj.geometry.vertexCount} вершин, ${obj.geometry.triangleCount} треугольников`);
            }
            
            // Рёбра из FreeCAD (если есть)
            if (obj.edges && typeof obj.edges === 'object' && 'lines' in obj.edges) {
                const edgesData = obj.edges as FreeCADEdges;
                if (edgesData.lines) {
                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: config.lineColor,
                        linewidth: 2
                    });
                    
                    edgesData.lines.forEach((edgePoints, idx) => {
                        if (edgePoints.length < 2) return;
                        
                        // Валидация точек рёбер
                        const validPoints: THREE.Vector3[] = [];
                        for (const p of edgePoints) {
                            if (Array.isArray(p) && p.length >= 3) {
                                const x = Number(p[0]);
                                const y = Number(p[1]);
                                const z = Number(p[2]);
                                
                                if (isFinite(x) && isFinite(y) && isFinite(z)) {
                                    validPoints.push(new THREE.Vector3(x, y, z));
                                } else {
                                    console.warn(`⚠️ [FreeCADGeometryLoader] NaN/Infinity в точке FreeCAD ребра ${obj.name}_freecad_edge_${idx}:`, p);
                                }
                            }
                        }
                        
                        if (validPoints.length < 2) {
                            console.warn(`⚠️ [FreeCADGeometryLoader] Недостаточно валидных точек для FreeCAD ребра ${obj.name}_freecad_edge_${idx}`);
                            return;
                        }
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(validPoints);
                        const line = new THREE.Line(geometry, lineMaterial);
                        line.name = `${obj.name}_freecad_edge_${idx}`;
                        objGroup.add(line);
                    });
                }
            }
            
            group.add(objGroup);
        });
    }
    
    /**
     * Изменить прозрачность поверхностей
     */
    static setSurfaceOpacity(group: THREE.Group, opacity: number): void {
        group.traverse((child) => {
            if (child.name && child.name.includes('_surface')) {
                if (child instanceof THREE.Mesh && child.material) {
                    const material = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (material instanceof THREE.MeshBasicMaterial) {
                        material.opacity = opacity;
                        material.needsUpdate = true;
                    }
                }
            }
        });
    }
    
    /**
     * Изменить цвет линий
     */
    static setLineColor(group: THREE.Group, color: number): void {
        group.traverse((child) => {
            if (child.name && (child.name.includes('_edge') || child.name.includes('_edges'))) {
                if ((child instanceof THREE.Line || child instanceof THREE.LineSegments) && child.material) {
                    const material = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (material instanceof THREE.LineBasicMaterial) {
                        material.color.setHex(color);
                        material.needsUpdate = true;
                    }
                }
            }
        });
    }
    
    /**
     * Переключить видимость рёбер
     */
    static toggleEdges(group: THREE.Group, visible: boolean): void {
        group.traverse((child) => {
            if (child.name && (child.name.includes('_edge') || child.name.includes('_edges'))) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Переключить видимость поверхностей
     */
    static toggleSurfaces(group: THREE.Group, visible: boolean): void {
        group.traverse((child) => {
            if (child.name && child.name.includes('_surface')) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Cleanup
     */
    static dispose(group: THREE.Group): void {
        group.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}

/**
 * Хелпер для быстрой загрузки
 * @param jsonPath - путь к JSON файлу
 * @param style - стиль отображения
 * @returns Promise с загруженной группой
 */
export async function loadFreeCADModel(jsonPath: string, style: DisplayStyle = 'technical'): Promise<THREE.Group> {
    const loader = new FreeCADGeometryLoader();
    return await loader.load(jsonPath, {
        style: style,
        lineColor: 0x2c3e50,
        surfaceColor: 0x3498db,
        surfaceOpacity: 0.15
    });
}

