/**
 * Загрузчик геометрии из FreeCAD JSON для Three.js
 * Поддерживает два режима:
 * 1. С триангуляцией (полная геометрия)
 * 2. Ultra-light (только рёбра)
 */

import * as THREE from '../libs/three.module.js';

export class FreeCADGeometryLoader {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'FreeCADModel';
    }
    
    /**
     * Загрузить JSON файл из FreeCAD
     * @param {string} jsonPath - путь к JSON файлу
     * @param {object} options - опции отображения
     * @returns {Promise<THREE.Group>}
     */
    async load(jsonPath, options = {}) {
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
                this.loadUltraLight(data, config);
            } else {
                this.loadWithTriangulation(data, config);
            }
            
            return this.group;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            throw error;
        }
    }
    
    /**
     * Загрузка Ultra-Light режима (только рёбра)
     */
    loadUltraLight(data, config) {
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
            
            this.group.add(objGroup);
        });
    }
    
    /**
     * Загрузка с полной триангуляцией
     */
    loadWithTriangulation(data, config) {
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
            
            this.group.add(objGroup);
        });
    }
    
    /**
     * Получить загруженную группу
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Изменить прозрачность поверхностей
     */
    setSurfaceOpacity(opacity) {
        this.group.traverse((child) => {
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
    setLineColor(color) {
        this.group.traverse((child) => {
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
    toggleEdges(visible) {
        this.group.traverse((child) => {
            if (child.name && (child.name.includes('_edge') || child.name.includes('_edges'))) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Переключить видимость поверхностей
     */
    toggleSurfaces(visible) {
        this.group.traverse((child) => {
            if (child.name && child.name.includes('_surface')) {
                child.visible = visible;
            }
        });
    }
    
    /**
     * Cleanup
     */
    dispose() {
        this.group.traverse((child) => {
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
