/**
 * Процедурная генерация шкафа в техническом стиле
 * Использует EdgesGeometry + прозрачные поверхности
 * По мотивам Blum конфигуратора
 */

import * as THREE from '../libs/three.module.js';

export class ProceduralCabinetGenerator {
    constructor(config = {}) {
        this.config = {
            // Размеры в метрах (по умолчанию ТШ-7)
            width: config.width || 0.7,
            height: config.height || 0.5,
            depth: config.depth || 0.24,
            
            // Толщины материалов (метры)
            bodyThickness: config.bodyThickness || 0.0015,  // 1.5мм сталь
            doorThickness: config.doorThickness || 0.02,
            panelThickness: config.panelThickness || 0.001,
            
            // Стиль отображения
            style: config.style || 'technical',  // 'technical' | 'realistic'
            
            // Цвета
            lineColor: config.lineColor || 0x2c3e50,        // Тёмно-синий
            surfaceColor: config.surfaceColor || 0xecf0f1,  // Светло-серый
            surfaceOpacity: config.surfaceOpacity || 0.15,  // 15% прозрачность
            
            // Компоненты
            components: {
                body: true,
                door: true,
                dinRails: config.dinRailCount || 3,
                panel: true,
                insulation: false,  // Пока не нужна
                ...config.components
            }
        };
        
        this.group = new THREE.Group();
        this.group.name = 'ProceduralCabinet';
    }
    
    /**
     * Генерация полной модели шкафа
     */
    generate() {
        console.log('🔧 Генерация процедурного шкафа (технический вид)...');
        
        if (this.config.components.body) {
            this.createBody();
        }
        
        if (this.config.components.dinRails > 0) {
            this.createDinRails(this.config.components.dinRails);
        }
        
        if (this.config.components.panel) {
            this.createPanel();
        }
        
        if (this.config.components.door) {
            this.createDoor();
        }
        
        console.log('✅ Процедурный шкаф сгенерирован');
        return this.group;
    }
    
    /**
     * Создание корпуса шкафа в техническом стиле
     */
    createBody() {
        const { width, height, depth, bodyThickness } = this.config;
        
        // Создаём геометрию с закруглёнными краями
        const radius = 0.003; // 3мм радиус закругления (как у Blum)
        const bodyGeometry = this.createRoundedBox(width, height, depth, radius);
        
        // Технический вид: контуры + прозрачные грани
        const body = this.createTechnicalMesh(bodyGeometry, 'BODY');
        
        // Позиционирование (центр по XZ, низ на Y=0)
        body.position.y = height / 2;
        
        this.group.add(body);
        this.bodyMesh = body;
        
        console.log(`  ✓ BODY создан: ${width}×${height}×${depth}м (закруглённые края)`);
    }
    
    /**
     * Создание DIN-реек с использованием InstancedMesh
     */
    createDinRails(count) {
        const { width, height, depth } = this.config;
        
        // Стандартные размеры DIN-рейки
        const railWidth = 0.035;   // 35мм
        const railHeight = 0.0075; // 7.5мм
        const railLength = width - 0.1; // Почти на всю ширину
        
        const railGeometry = new THREE.BoxGeometry(railWidth, railHeight, railLength);
        
        // Расположение реек (равномерно по высоте)
        const step = height / (count + 1);
        
        // Создаём каждую рейку отдельно (проще для технического вида)
        for (let i = 0; i < count; i++) {
            const yPos = step * (i + 1);
            const xPos = -depth / 2 + 0.05; // Ближе к задней стенке
            
            // Контуры рейки
            const railEdges = new THREE.EdgesGeometry(railGeometry, 20);
            const lineMaterial = this.createLineMaterial();
            const railLines = new THREE.LineSegments(railEdges, lineMaterial);
            railLines.position.set(xPos, yPos, 0);
            railLines.name = `DIN_RAIL_${i + 1}_EDGES`;
            this.group.add(railLines);
            
            // Прозрачная поверхность рейки
            if (this.config.style === 'technical') {
                const surfaceMaterial = this.createSurfaceMaterial();
                const railSurface = new THREE.Mesh(railGeometry, surfaceMaterial);
                railSurface.position.set(xPos, yPos, 0);
                railSurface.name = `DIN_RAIL_${i + 1}_SURFACE`;
                this.group.add(railSurface);
            }
        }
        
        console.log(`  ✓ DIN-рейки созданы: ${count} шт.`);
    }
    
    /**
     * Создание монтажной панели
     */
    createPanel() {
        const { width, height, depth, panelThickness } = this.config;
        
        // Панель — тонкая плоскость на задней стенке
        const panelWidth = width - 0.04;   // С отступом от стенок
        const panelHeight = height - 0.04;
        
        const panelGeometry = new THREE.BoxGeometry(
            panelWidth,
            panelHeight,
            panelThickness
        );
        
        const panel = this.createTechnicalMesh(panelGeometry, 'PANEL_003');
        
        // Позиция: задняя стенка корпуса
        panel.position.set(
            -depth / 2 + panelThickness / 2 + 0.01,  // Немного от задней стенки
            height / 2,
            0
        );
        
        this.group.add(panel);
        console.log('  ✓ PANEL_003 создана');
    }
    
    /**
     * Создание двери в техническом стиле
     */
    createDoor() {
        const { width, height, depth, doorThickness } = this.config;
        
        const doorWidth = width - 0.02;   // С небольшим зазором
        const doorHeight = height - 0.02;
        
        // Дверь тоже с закруглением
        const radius = 0.002; // 2мм радиус
        const doorGeometry = this.createRoundedBox(doorWidth, doorHeight, doorThickness, radius);
        
        const door = this.createTechnicalMesh(doorGeometry, 'DOOR');
        
        // Позиция двери (перед корпусом)
        door.position.set(
            depth / 2 + doorThickness / 2,
            height / 2,
            0
        );
        
        // Добавляем упрощённые петли
        this.createHinges(door, doorHeight);
        
        this.group.add(door);
        this.doorMesh = door;
        
        console.log('  ✓ DOOR создана (с закруглением)');
    }
    
    /**
     * Создание упрощённых петель (цилиндры)
     */
    createHinges(door, doorHeight) {
        const hingeGeometry = new THREE.CylinderGeometry(
            0.005,  // радиус 5мм
            0.005,
            0.03,   // высота 30мм
            16      // сегменты
        );
        hingeGeometry.rotateZ(Math.PI / 2); // Горизонтально
        
        const hingeMaterial = this.createLineMaterial();
        const hingeEdges = new THREE.EdgesGeometry(hingeGeometry, 20);
        
        // Верхняя петля
        const topHinge = new THREE.LineSegments(hingeEdges, hingeMaterial);
        topHinge.position.set(
            -this.config.doorThickness / 2,
            doorHeight / 2 - 0.05,
            -this.config.width / 2 + 0.02
        );
        door.add(topHinge);
        
        // Нижняя петля
        const bottomHinge = new THREE.LineSegments(hingeEdges, hingeMaterial);
        bottomHinge.position.set(
            -this.config.doorThickness / 2,
            -doorHeight / 2 + 0.05,
            -this.config.width / 2 + 0.02
        );
        door.add(bottomHinge);
        
        console.log('    ✓ Петли добавлены');
    }
    
    /**
     * Создание закруглённого бокса (как roundedEdges у Blum)
     * @param {number} width - ширина
     * @param {number} height - высота
     * @param {number} depth - глубина
     * @param {number} radius - радиус закругления рёбер
     * @returns {THREE.BufferGeometry}
     */
    createRoundedBox(width, height, depth, radius) {
        const shape = new THREE.Shape();
        
        const w = width / 2;
        const h = height / 2;
        const d = depth / 2;
        const r = radius;
        
        // Создаём прямоугольник с закруглёнными углами (вид сверху)
        shape.moveTo(-w + r, -d);
        shape.lineTo(w - r, -d);
        shape.quadraticCurveTo(w, -d, w, -d + r);
        shape.lineTo(w, d - r);
        shape.quadraticCurveTo(w, d, w - r, d);
        shape.lineTo(-w + r, d);
        shape.quadraticCurveTo(-w, d, -w, d - r);
        shape.lineTo(-w, -d + r);
        shape.quadraticCurveTo(-w, -d, -w + r, -d);
        
        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            bevelThickness: r,
            bevelSize: r,
            bevelSegments: 3
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Центрирование геометрии
        geometry.translate(0, -height / 2, 0);
        geometry.rotateX(Math.PI / 2);
        
        return geometry;
    }
    
    /**
     * Создание меша в техническом стиле (контуры + прозрачные грани)
     */
    createTechnicalMesh(geometry, name) {
        const group = new THREE.Group();
        group.name = name;
        
        // 1. Контуры (EdgesGeometry как у Blum)
        const edges = new THREE.EdgesGeometry(geometry, 20); // 20° угол для рёбер
        const lineMaterial = this.createLineMaterial();
        const lines = new THREE.LineSegments(edges, lineMaterial);
        lines.name = `${name}_EDGES`;
        group.add(lines);
        
        // 2. Прозрачные поверхности (для объёма)
        const surfaceMaterial = this.createSurfaceMaterial();
        const mesh = new THREE.Mesh(geometry, surfaceMaterial);
        mesh.name = `${name}_SURFACE`;
        group.add(mesh);
        
        return group;
    }
    
    /**
     * Материал для линий (контуров)
     */
    createLineMaterial() {
        return new THREE.LineBasicMaterial({
            color: this.config.lineColor,
            linewidth: 2, // Note: linewidth > 1 работает только в WebGLRenderer
            opacity: 1.0,
            transparent: false,
            depthTest: true,
            depthWrite: true
        });
    }
    
    /**
     * Материал для прозрачных поверхностей
     */
    createSurfaceMaterial() {
        return new THREE.MeshBasicMaterial({
            color: this.config.surfaceColor,
            opacity: this.config.surfaceOpacity,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false  // Важно для корректной прозрачности
        });
    }
    
    /**
     * Получить меш для анимации двери
     */
    getDoorMesh() {
        return this.doorMesh;
    }
    
    /**
     * Получить меш корпуса
     */
    getBodyMesh() {
        return this.bodyMesh;
    }
    
    /**
     * Изменить прозрачность поверхностей
     */
    setSurfaceOpacity(opacity) {
        this.config.surfaceOpacity = opacity;
        
        this.group.traverse((child) => {
            if (child.name && child.name.includes('_SURFACE')) {
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
        this.config.lineColor = color;
        
        this.group.traverse((child) => {
            if (child.name && child.name.includes('_EDGES')) {
                if (child.material) {
                    child.material.color.setHex(color);
                    child.material.needsUpdate = true;
                }
            }
        });
    }
    
    /**
     * Переключение между техническим и реалистичным видом
     */
    setStyle(style) {
        this.config.style = style;
        
        if (style === 'technical') {
            this.setSurfaceOpacity(0.15);
        } else if (style === 'realistic') {
            this.setSurfaceOpacity(0.9);
        }
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
 * Хелпер для быстрого создания технического шкафа
 */
export function createTechnicalCabinet(width, height, depth) {
    const generator = new ProceduralCabinetGenerator({
        width: width / 1000,   // мм → метры
        height: height / 1000,
        depth: depth / 1000,
        style: 'technical',
        surfaceOpacity: 0.15,  // 15% прозрачность
        lineColor: 0x2c3e50
    });
    
    return generator.generate();
}
