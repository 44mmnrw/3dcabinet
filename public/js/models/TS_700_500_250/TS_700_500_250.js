import * as THREE from '../../libs/three.module.js';
import { FreeCADGeometryLoader } from '../../modules/FreeCADGeometryLoader.js';

// Модельный сборщик для TS_700_500_250
export class TS_700_500_250 {
    constructor() {
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.assembly.name = 'TS_700_500_250_Assembly';
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

            // Door
            this.components.door = await this.loader.load(`${basePath}/door_${size}.json`);
            this.components.door.name = 'Door';
            this.components.door.scale.set(0.001, 0.001, 0.001);
            this.components.door.position.set(0, 0, 0);
            this.assembly.add(this.components.door);

            // Panel
            this.components.panel = await this.loader.load(`${basePath}/panel_${size}.json`);
            this.components.panel.name = 'Panel';
            this.components.panel.scale.set(0.001, 0.001, 0.001);
            this.components.panel.position.set(0, 0, 0);
            this.assembly.add(this.components.panel);

            // DIN Rail
            this.components.dinRail = await this.loader.load(`${basePath}/din_rail40_${size}.json`);
            this.components.dinRail.name = 'DIN_Rail';
            this.components.dinRail.scale.set(0.001, 0.001, 0.001);
            this.components.dinRail.position.set(0, 0, 0);
            this.assembly.add(this.components.dinRail);

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

    // Переместить всю сборку
    setAssemblyPosition(x, y, z) {
        this.assembly.position.set(x, y, z);
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
