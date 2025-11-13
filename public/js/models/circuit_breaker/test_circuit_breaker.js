import * as THREE from '../../libs/three.module.js';
import { FreeCADGeometryLoader } from '../../modules/FreeCADGeometryLoader.js';

// Тестовая модель автоматического выключателя
export class test_circuit_breaker {
    constructor() {
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.assembly.name = 'test_circuit_breaker_Assembly';
        this.component = null;
    }

    // Загрузка модели
    async assemble(options = {}) {
        const basePath = options.basePath || './assets/models/freecad';

        try {
            // Загружаем единственный компонент
            this.component = await this.loader.load(`${basePath}/circuit_breaker.json`);
            this.component.name = 'Circuit_Breaker';
            this.component.scale.set(0.001, 0.001, 0.001);
            this.component.position.set(0, 0, 0);
            this.assembly.add(this.component);

            // Центрируем сборку относительно нижней плоскости
            this._alignAssemblyToFloor();

            console.log('⚡ Circuit breaker загружен');
            return this.assembly;
        } catch (error) {
            console.error('❌ Ошибка загрузки circuit_breaker:', error);
            throw error;
        }
    }

    // Выровнять сборку так, чтобы origin был на нижней плоскости
    _alignAssemblyToFloor() {
        const bbox = new THREE.Box3().setFromObject(this.assembly);
        const offsetY = -bbox.min.y;
        
        // Сдвигаем компонент вверх, чтобы низ был на Y=0
        this.assembly.children.forEach(child => {
            child.position.y += offsetY;
        });
        
        console.log('📐 Circuit breaker aligned to floor, offset Y:', offsetY.toFixed(3));
    }

    // Переместить сборку
    setAssemblyPosition(x, y, z) {
        this.assembly.position.set(x, y, z);
    }

    // Показать/скрыть компонент
    setVisibility(visible) {
        if (this.component) this.component.visible = visible;
    }

    // Информация о сборке
    getInfo() {
        const info = {
            assembly: {
                name: this.assembly.name,
                position: this.assembly.position.toArray(),
                children: this.assembly.children.length
            }
        };
        
        if (this.component) {
            const world = new THREE.Vector3();
            this.component.getWorldPosition(world);
            info.component = {
                name: this.component.name,
                visible: this.component.visible,
                position: {
                    local: this.component.position.toArray(),
                    world: world.toArray()
                },
                scale: this.component.scale.toArray()
            };
        }
        
        return info;
    }

    getComponent() { return this.component; }
    getAssembly() { return this.assembly; }
}
