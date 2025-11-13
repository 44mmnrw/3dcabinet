import * as THREE from '../../libs/three.module.js';
import { FreeCADGeometryLoader } from '../../modules/FreeCADGeometryLoader.js';

// Тестовая копия модели TS_700_500_250 (для экспериментов)
export class test_TS_700_500_250 {
    constructor() {
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.assembly.name = 'test_TS_700_500_250_Assembly';
        this.components = {};
    }

    // Сборка компонентов конкретной модели TS_700_500_250
    async assemble(options = {}) {
        const basePath = options.basePath || './assets/models/freecad';
        const size = '700_500_250';

        try {
            // Body
            this.components.body = await this.loader.load(`${basePath}/body_${size}.json`);
            this.components.body.name = 'Body';
            this.components.body.scale.set(0.001, 0.001, 0.001);
            this.components.body.position.set(0, 0, 0);
            this.assembly.add(this.components.body);

            // Door с pivot-группой для вращения вокруг петель
            const doorMesh = await this.loader.load(`${basePath}/door_${size}.json`);
            doorMesh.name = 'Door_Mesh';
            doorMesh.scale.set(0.001, 0.001, 0.001);
            
            // Вычисляем bbox двери для определения позиции петель
            const doorBbox = new THREE.Box3().setFromObject(doorMesh);
            const hingeX = doorBbox.min.x + 0.009;  // Левый край (петли)
            const hingeY = doorBbox.min.y;  // Низ двери
            const hingeZ = doorBbox.min.z + 0.025;  // Передняя грань
            
            // Создаём pivot в точке петель
            const doorPivot = new THREE.Group();
            doorPivot.name = 'Door_Pivot';
            doorPivot.position.set(hingeX, hingeY, hingeZ);
            
            // Смещаем mesh относительно pivot (чтобы петли были в origin)
            doorMesh.position.set(-hingeX, -hingeY, -hingeZ);
            
            doorPivot.add(doorMesh);
            this.components.door = doorPivot;
            this.assembly.add(doorPivot);
            
            console.log('🚪 Door pivot:', { hingeX, hingeY, hingeZ });

            // Panel
            this.components.panel = await this.loader.load(`${basePath}/panel_${size}.json`);
            this.components.panel.name = 'Panel';
            this.components.panel.scale.set(0.001, 0.001, 0.001);
            this.components.panel.position.set(0, 0, 0);
            this.assembly.add(this.components.panel);

            // DIN Rail 1
            this.components.dinRail1 = await this.loader.load(`${basePath}/din_rail40_${size}.json`);
            this.components.dinRail1.name = 'DIN_Rail_1';
            this.components.dinRail1.scale.set(0.001, 0.001, 0.001);
            this.components.dinRail1.position.set(0.15, 0, -0.055);
            this.assembly.add(this.components.dinRail1);

            // DIN Rail 2
            this.components.dinRail2 = await this.loader.load(`${basePath}/din_rail40_${size}.json`);
            this.components.dinRail2.name = 'DIN_Rail_2';
            this.components.dinRail2.scale.set(0.001, 0.001, 0.001);
            this.components.dinRail2.position.set(0.15, -0.2, -0.055);  // Сдвиг по Y, чтобы видеть вторую рейку
            this.assembly.add(this.components.dinRail2);

            // DIN Rail 3
            this.components.dinRail3 = await this.loader.load(`${basePath}/din_rail40_${size}.json`);
            this.components.dinRail3.name = 'DIN_Rail_3';
            this.components.dinRail3.scale.set(0.001, 0.001, 0.001);
            this.components.dinRail3.position.set(0.15, -0.4, -0.055);  // Сдвиг по Y, чтобы видеть третью рейку
            this.assembly.add(this.components.dinRail3);
            
            // Центрируем всю сборку относительно нижней плоскости
            this._alignAssemblyToFloor();

            // ========== DEBUG: КРАСНАЯ ЛИНИЯ ВДОЛЬ ОСИ Y ==========
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xff0000,
                linewidth: 5  // Примечание: linewidth работает только в WebGLRenderer
            });
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(hingeX, -2, hingeZ),  // Начало линии (ниже модели)
                new THREE.Vector3(hingeX, 2, hingeZ)    // Конец линии (выше модели)
            ]);
            const redLine = new THREE.Line(lineGeometry, lineMaterial);
            redLine.name = 'DEBUG_Y_Axis_Line';
            this.assembly.add(redLine);
            console.log('🔴 DEBUG: Красная линия в координатах петель:', { hingeX, hingeZ });
            // ========== КОНЕЦ DEBUG ==========

            return this.assembly;
        } catch (error) {
            console.error('❌ Ошибка сборки TS_700_500_250:', error);
            throw error;
        }
    }

    // Простые хелперы управления
    setComponentPosition(componentName, x, y, z) {
        const c = this.components[componentName];
        if (c) c.position.set(x, y, z);
    }

    // Получить локальную позицию компонента
    getComponentPosition(componentName) {
        const c = this.components[componentName];
        return c ? c.position.clone() : null;
    }

    // Получить мировую позицию компонента
    getComponentWorldPosition(componentName) {
        const c = this.components[componentName];
        if (!c) return null;
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        return v;
    }

    // Показать/скрыть компонент
    setComponentVisibility(componentName, visible) {
        const c = this.components[componentName];
        if (c) c.visible = visible;
    }

    // Выровнять сборку так, чтобы origin был на нижней плоскости
    _alignAssemblyToFloor() {
        const bbox = new THREE.Box3().setFromObject(this.assembly);
        const offsetY = -bbox.min.y;
        
        // Сдвигаем все компоненты вверх, чтобы низ был на Y=0
        this.assembly.children.forEach(child => {
            child.position.y += offsetY;
        });
        
        console.log('📐 Assembly aligned to floor, offset Y:', offsetY.toFixed(3));
    }

    // Переместить всю сборку
    setAssemblyPosition(x, y, z) {
        this.assembly.position.set(x, y, z);
    }
    
    // Открыть/закрыть дверь (вращение вокруг петель)
    setDoorRotation(angleRadians) {
        if (this.components.door) {
            this.components.door.rotation.y = angleRadians;
            console.log('🚪 Door rotation:', (angleRadians * 180 / Math.PI).toFixed(1) + '°');
        }
    }
    
    // Получить угол открытия двери
    getDoorRotation() {
        return this.components.door ? this.components.door.rotation.y : 0;
    }

    // Информация о сборке и компонентах
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

    getComponents() { return this.components; }
    getAssembly() { return this.assembly; }
}
