import * as THREE from '../../libs/three.module.js';
import { FreeCADGeometryLoader } from '../../loaders/FreeCADGeometryLoader.js';
import { GeometryUtils } from '../../utils/ModelUtils.js';

// Модельный сборщик для TS_700_500_250
export class TS_700_500_250 {
    constructor() {
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.assembly.name = 'TS_700_500_250_Assembly';
        this.components = {};
        // Состояние двери
        this.doorState = {
            targetAngle: 0,
            currentAngle: 0,
            isAnimating: false,
            animationSpeed: 0.05
        };
    }

    // Сборка компонентов конкретной модели TS_700_500_250
    async assemble(options = {}) {
        const basePath = options.basePath || './assets/models/freecad';
        const configPath = options.configPath || './js/cabinets/TS_700_500_250/TS_700_500_250.json';

        try {
            // Загружаем JSON-конфиг
            const config = await fetch(configPath).then(r => r.json());
            console.log('📋 Загружен конфиг:', config.name);

            // --- Компоненты (body, door, panel) ---
            for (const [key, comp] of Object.entries(config.components)) {
                const mesh = await this.loader.load(`${basePath}/${comp.file}`);
                mesh.name = key.charAt(0).toUpperCase() + key.slice(1);
                if (comp.scale) mesh.scale.set(...comp.scale);
                if (comp.position) mesh.position.set(...comp.position);

                // Если это дверь — создаём pivot для вращения вокруг петель
                if (key === 'door') {
                    const bbox = GeometryUtils.getBoundingBox(mesh, true);
                    const hingeX = bbox.min.x + 0.009;
                    const hingeY = bbox.min.y;
                    const hingeZ = bbox.min.z + 0.025;
                    const pivot = new THREE.Group();
                    pivot.name = 'Door_Pivot';
                    pivot.position.set(hingeX, hingeY, hingeZ);
                    mesh.position.set(-hingeX, -hingeY, -hingeZ);
                    pivot.add(mesh);
                    this.components[key] = pivot;
                    this.assembly.add(pivot);
                    console.log(`🚪 Дверь с pivot создана (hinge: ${hingeX.toFixed(3)}, ${hingeY.toFixed(3)}, ${hingeZ.toFixed(3)})`);
                } else {
                    this.components[key] = mesh;
                    this.assembly.add(mesh);
                    console.log(`✅ Загружен компонент: ${mesh.name}`);
                }
            }

            // --- DIN-рейки (через панели) ---
            if (config.panels && config.panels.length > 0) {
                for (const panel of config.panels) {
                    if (panel.dinRails && panel.dinRails.length > 0) {
                        const size = config.name.split('_').slice(1).join('_');
                        const cabinetFolder = 'tsh_' + size; // tsh_700_500_250
                        for (const rail of panel.dinRails) {
                            const mesh = await this.loader.load(`${basePath}/${cabinetFolder}/din_rail40_${size}.json`);
                            mesh.name = rail.id || `DIN_Rail`;
                            if (rail.localPosition) mesh.position.set(...rail.localPosition);
                            if (rail.rotation) mesh.rotation.set(...rail.rotation);
                            
                            // Базовый scale для конвертации из мм в метры
                            const baseScale = 0.001;
                            mesh.scale.set(baseScale, baseScale, baseScale);
                            
                            // Применяем длину рейки (scale по X, если рейка горизонтальная)
                            if (rail.length) {
                                const bbox = new THREE.Box3().setFromObject(mesh);
                                const currentLength = (bbox.max.x - bbox.min.x);
                                if (currentLength > 0) {
                                    const lengthScale = rail.length / currentLength;
                                    mesh.scale.x *= lengthScale;
                                }
                            }
                            
                            this.components[mesh.name] = mesh;
                            this.assembly.add(mesh);
                            console.log(`✅ Загружена DIN-рейка: ${mesh.name}, длина ${rail.length}м, позиция [${rail.localPosition}]`);
                        }
                    }
                }
            }

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

    // === Управление дверью ===
    setDoorRotation(angleRadians) {
        if (this.components.door) {
            this.components.door.rotation.y = angleRadians;
            this.doorState.currentAngle = angleRadians;
            this.doorState.targetAngle = angleRadians;
        }
    }

    openDoor(angle = -Math.PI / 2) { // отрицательный для открытия вправо как в legacy UI
        this.doorState.targetAngle = angle;
        this.doorState.isAnimating = true;
    }

    closeDoor() {
        this.doorState.targetAngle = 0;
        this.doorState.isAnimating = true;
    }

    update() {
        if (this.doorState.isAnimating && this.components.door) {
            const diff = this.doorState.targetAngle - this.doorState.currentAngle;
            if (Math.abs(diff) > 0.001) {
                this.doorState.currentAngle += diff * this.doorState.animationSpeed;
                this.components.door.rotation.y = this.doorState.currentAngle;
            } else {
                this.doorState.currentAngle = this.doorState.targetAngle;
                this.components.door.rotation.y = this.doorState.targetAngle;
                this.doorState.isAnimating = false;
            }
        }
    }

    getDoorRotation() {
        return this.components.door ? this.components.door.rotation.y : 0;
    }
}
