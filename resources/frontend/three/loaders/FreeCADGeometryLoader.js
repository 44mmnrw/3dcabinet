/**
 * Загрузчик геометрии из FreeCAD JSON для Three.js
 * Поддерживает два режима:
 * 1. С триангуляцией (полная геометрия)
 * 2. Ultra-light (только рёбра)
 */

import * as THREE from 'three';

export class FreeCADGeometryLoader {
    constructor() {
        // Убираем this.group — создаём новую группу при каждом load()
    }
    
    /**
     * Загрузить JSON файл из FreeCAD
     * @param {string} jsonPath - путь к JSON файлу
     * @param {object} options - опции отображения
     * @returns {Promise<THREE.Group>}
     */
    async load(jsonPath, options = {}) {
        // Создаём новую группу для этой загрузки
        const group = new THREE.Group();
        group.name = options.name || 'FreeCADModel';
        const config = {
            // Стиль отображения
            style: options.style || 'technical',  // 'technical' | 'realistic'
            
            // Цвета
            lineColor: options.lineColor || 0x2c3e50,
            surfaceColor: options.surfaceColor || 0xecf0f1,
            surfaceOpacity: options.surfaceOpacity || 0.15,
            
            // Отображение компонентов
            showEdges: options.showEdges !== false,
            showSurfaces: options.showSurfaces !== false,
            
            ...options
        };
        
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
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
    loadUltraLight(data, config, group) {
        data.objects.forEach(obj => {
            const objGroup = new THREE.Group();
            objGroup.name = obj.name;
            
            // Создаём линии из рёбер
            if (obj.edges && obj.edges.length > 0) {
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: config.lineColor,
                    linewidth: 2
                });
                
                obj.edges.forEach((edgePoints, idx) => {
                    if (edgePoints.length < 2) return;
                    
                    const points = edgePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
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
    loadWithTriangulation(data, config, group) {
        data.objects.forEach(obj => {
            const objGroup = new THREE.Group();
            objGroup.name = obj.name;
            
            // Создаём геометрию из vertices + indices
            if (obj.geometry && obj.geometry.vertices && obj.geometry.indices) {
                const geometry = new THREE.BufferGeometry();
                
                // Конвертируем vertices в Float32Array
                const vertices = new Float32Array(obj.geometry.vertices.flat());
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                
                // Добавляем индексы
                geometry.setIndex(obj.geometry.indices);
                
                // Вычисляем нормали
                geometry.computeVertexNormals();
                
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
                    const edges = new THREE.EdgesGeometry(geometry, 20);
                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: config.lineColor,
                        linewidth: 2
                    });
                    
                    const lines = new THREE.LineSegments(edges, lineMaterial);
                    lines.name = `${obj.name}_edges`;
                    objGroup.add(lines);
                }
                
                console.log(`  ✓ ${obj.name}: ${obj.geometry.vertexCount} вершин, ${obj.geometry.triangleCount} треугольников`);
            }
            
            // Рёбра из FreeCAD (если есть)
            if (obj.edges && obj.edges.lines) {
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: config.lineColor,
                    linewidth: 2
                });
                
                obj.edges.lines.forEach((edgePoints, idx) => {
                    if (edgePoints.length < 2) return;
                    
                    const points = edgePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geometry, lineMaterial);
                    line.name = `${obj.name}_freecad_edge_${idx}`;
                    objGroup.add(line);
                });
            }
            
            group.add(objGroup);
        });
    }
    
    /**
     * Изменить прозрачность поверхностей
     */
    static setSurfaceOpacity(group, opacity) {
        group.traverse((child) => {
            if (child.name && child.name.includes('_surface')) {
                if (child.material) {
                    child.material.opacity = opacity;
                    child.material.needsUpdate = true;
                }
            }
        });
    }
    
    /**
     * Изменить цвет линий
     */
    static setLineColor(group, color) {
        group.traverse((child) => {
            if (child.name && (child.name.includes('_edge') || child.name.includes('_edges'))) {
                if (child.material) {
                    child.material.color.setHex(color);
                    child.material.needsUpdate = true;
                }
            }
        });
    }
    
    /**
     * Переключить видимость рёбер
     */
    static toggleEdges(group, visible) {
        group.traverse((child) => {
            if (child.name && (child.name.includes('_edge') || child.name.includes('_edges'))) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Переключить видимость поверхностей
     */
    static toggleSurfaces(group, visible) {
        group.traverse((child) => {
            if (child.name && child.name.includes('_surface')) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Cleanup
     */
    static dispose(group) {
        group.traverse((child) => {
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
        });
    }
}

/**
 * Хелпер для быстрой загрузки
 */
export async function loadFreeCADModel(jsonPath, style = 'technical') {
    const loader = new FreeCADGeometryLoader();
    await loader.load(jsonPath, {
        style: style,
        lineColor: 0x2c3e50,
        surfaceColor: 0x3498db,
        surfaceOpacity: 0.15
    });
    return loader.getGroup();
}
