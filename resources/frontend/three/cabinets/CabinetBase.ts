import * as THREE from 'three';
import { GeometryUtils } from '../utils/ModelUtils.ts';
import { MATH } from '../constants/PhysicalConstants.ts';

/**
 * Конфигурация двери из конфига
 */
interface DoorConfig {
    componentName?: string;
    rotationAxis?: 'x' | 'y' | 'z';
    pivotOffset?: {
        x?: number;
        y?: number;
        z?: number;
    };
}

/**
 * Конфигурация шкафа
 */
interface CabinetConfig {
    door?: DoorConfig;
    [key: string]: unknown;
}

/**
 * Информация о компоненте
 */
interface ComponentInfo {
    name: string;
    visible: boolean;
    position: {
        local: number[];
        world: number[];
    };
    scale: number[];
}

/**
 * Информация о сборке
 */
interface AssemblyInfo {
    name: string;
    position: number[];
    children: number;
}

/**
 * Полная информация о шкафе
 */
interface CabinetInfo {
    assembly: AssemblyInfo;
    components: Record<string, ComponentInfo>;
}

/**
 * Базовый класс для всех шкафов
 * Предоставляет универсальные методы управления компонентами
 */
export class CabinetBase {
    protected assembly: THREE.Group;
    protected components: Record<string, THREE.Object3D>;
    protected config: CabinetConfig | null;
    protected doorComponentName: string | null;
    protected doorRotationAxis: 'x' | 'y' | 'z';
    protected doorPivotOffset: THREE.Vector3;

    constructor() {
        this.assembly = new THREE.Group();
        this.components = {};
        this.config = null;
        this.doorComponentName = null;
        this.doorRotationAxis = 'y';
        this.doorPivotOffset = new THREE.Vector3(0, 0, 0);
    }

    /**
     * Установить угол поворота двери (универсальный метод)
     */
    setDoorRotation(radians: number): void {
        // Пытаемся найти дверь по разным возможным названиям
        let door: THREE.Object3D | null = null;
        
        // 1. Если указано явно
        if (this.doorComponentName) {
            door = this.components[this.doorComponentName] || null;
        }
        
        // 2. Ищем по шаблонам (door*,門, etc)
        if (!door) {
            for (const [name, comp] of Object.entries(this.components)) {
                if (name.includes('door') || name.includes('дверь')) {
                    door = comp;
                    break;
                }
            }
        }
        
        if (!door) {
            return;
        }
        
        // Применяем виртуальный pivot: вращаемся вокруг произвольной точки
        if (this.doorPivotOffset && (this.doorPivotOffset.x !== 0 || this.doorPivotOffset.y !== 0 || this.doorPivotOffset.z !== 0)) {
            // Правильный алгоритм для виртуального pivot:
            // 1. Сбрасываем ротацию
            door.rotation.set(0, 0, 0);
            
            // 2. Позиция = pivot + (origin - pivot) повёрнутый
            // Но поскольку дверь в origin (0,0,0), то:
            // position = pivot - pivot повёрнутый = pivot * (1 - cos(angle))
            
            // Применяем ротацию только к оси Y (или нужной оси)
            if (this.doorRotationAxis === 'x') {
                door.rotation.x = radians;
            } else if (this.doorRotationAxis === 'y') {
                door.rotation.y = radians;
            } else {
                door.rotation.z = radians;
            }
            
            // Позиция должна быть смещена так, чтобы вращение происходило вокруг pivot
            // position = pivot * (1 - rotation_applied)
            const rotationAxis = this.doorRotationAxis === 'x' ? new THREE.Vector3(1, 0, 0) :
                                 this.doorRotationAxis === 'y' ? new THREE.Vector3(0, 1, 0) :
                                 new THREE.Vector3(0, 0, 1);
            const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, radians);
            
            // Трансформируем -pivot, вращаем, затем добавляем pivot обратно
            const offsetFromPivot = new THREE.Vector3(0, 0, 0).sub(this.doorPivotOffset);
            offsetFromPivot.applyMatrix4(rotationMatrix);
            door.position.copy(this.doorPivotOffset).add(offsetFromPivot);
        } else {
            // Без pivot — вращаемся прямо
            door.rotation.set(0, 0, 0);
            if (this.doorRotationAxis === 'x') {
                door.rotation.x = radians;
            } else if (this.doorRotationAxis === 'y') {
                door.rotation.y = radians;
            } else {
                door.rotation.z = radians;
            }
        }
        
        // Дверь повёрнута
    }

    /**
     * Инициализировать параметры двери из конфига
     * Вызывается после загрузки конфига
     */
    protected _initDoorSettingsFromConfig(): void {
        if (!this.config || !this.config.door) return;
        
        const doorConfig = this.config.door;
        
        // Загружаем имя компонента двери
        if (doorConfig.componentName) {
            this.doorComponentName = doorConfig.componentName;
        }
        // Если имя из конфига не совпадает с реальным (нет компонента) — пытаемся найти по шаблону
        if (this.doorComponentName && !this.components[this.doorComponentName]) {
            for (const key of Object.keys(this.components)) {
                if (key.toLowerCase().includes('door')) {
                    console.warn(`⚠️ doorComponentName '${this.doorComponentName}' не найден. Используем '${key}'`);
                    this.doorComponentName = key;
                    break;
                }
            }
        }
        
        // Загружаем ось вращения
        if (doorConfig.rotationAxis) {
            this.doorRotationAxis = doorConfig.rotationAxis;
        }
        
        // Загружаем offset точки вращения
        if (doorConfig.pivotOffset) {
            this.doorPivotOffset.set(
                doorConfig.pivotOffset.x || 0,
                doorConfig.pivotOffset.y || 0,
                doorConfig.pivotOffset.z || 0
            );
            // Pivot смещение загружено из конфига
        }
    }

    /**
     * Инициализировать виртуальный pivot для двери
     * (сохраняет позиционирование компонента, только смещает ось вращения)
     */
    protected _initializeDoorPivot(): void {
        if (!this.doorComponentName || !this.doorPivotOffset) return;
        
        const door = this._getComponent(this.doorComponentName);
        if (!door) {
            return;
        }
        
        // Сбрасываем позицию и ротацию двери перед применением нового pivot
        door.position.set(0, 0, 0);
        door.rotation.set(0, 0, 0);
        
        // Виртуальный pivot инициализирован
    }

    /**
     * Открыть дверь (удобный метод)
     * @param angle - угол в радианах (по умолчанию π/2 = 90°)
     */
    openDoor(angle: number = MATH.DEG_90_RAD): void {
        this.setDoorRotation(angle);
        const door = this.doorComponentName ? this.components[this.doorComponentName] : null;
        if (!door) {
            console.warn('⚠️ Дверь не найдена для openDoor()');
        }
    }

    /**
     * Закрыть дверь (удобный метод)
     */
    closeDoor(): void {
        this.setDoorRotation(0);
    }

    /**
     * Получить все компоненты шкафа
     */
    getComponents(): Record<string, THREE.Object3D> {
        return this.components;
    }

    /**
     * Получить корневую группу сборки
     */
    getAssembly(): THREE.Group {
        return this.assembly;
    }

    /**
     * Получить компонент по имени (вспомогательный метод)
     * @private
     */
    protected _getComponent(componentName: string): THREE.Object3D | undefined {
        return this.components[componentName];
    }

    /**
     * Показать/скрыть компонент
     */
    setComponentVisibility(componentName: string, visible: boolean): void {
        const c = this._getComponent(componentName);
        if (c) c.visible = visible;
    }

    /**
     * Установить позицию компонента
     */
    setComponentPosition(componentName: string, x: number, y: number, z: number): void {
        const c = this._getComponent(componentName);
        if (c) c.position.set(x, y, z);
    }

    /**
     * Получить локальную позицию компонента
     */
    getComponentPosition(componentName: string): THREE.Vector3 | null {
        const c = this._getComponent(componentName);
        return c ? c.position.clone() : null;
    }

    /**
     * Получить мировую позицию компонента
     */
    getComponentWorldPosition(componentName: string): THREE.Vector3 | null {
        const c = this._getComponent(componentName);
        if (!c) return null;
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        return v;
    }

    /**
     * Переместить всю сборку
     */
    setAssemblyPosition(x: number, y: number, z: number): void {
        this.assembly.position.set(x, y, z);
    }

    /**
     * Получить позицию сборки
     */
    getAssemblyPosition(): THREE.Vector3 {
        return this.assembly.position.clone();
    }

    /**
     * Переместить сборку на величину (относительное смещение)
     */
    moveAssemblyBy(dx: number, dy: number, dz: number): void {
        this.assembly.position.addScaledVector(new THREE.Vector3(dx, dy, dz), 1);
    }

    /**
     * Сбросить позицию в начало координат (0, 0, 0)
     */
    resetAssemblyPosition(): void {
        this.assembly.position.set(0, 0, 0);
    }

    /**
     * Выровнять сборку так, чтобы origin был на нижней плоскости
     */
    protected _alignAssemblyToFloor(): number {
        const offsetY = GeometryUtils.alignToFloor(this.assembly);
        return offsetY.offset.y;
    }

    /**
     * Информация о сборке и компонентах
     */
    getInfo(): CabinetInfo {
        const info: CabinetInfo = {
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
}

