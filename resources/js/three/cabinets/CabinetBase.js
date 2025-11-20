import * as THREE from 'three';
import { GeometryUtils } from '../utils/ModelUtils.js';
import { MATH } from '../constants/PhysicalConstants.js';

/**
 * Базовый класс для всех шкафов
 * Предоставляет универсальные методы управления компонентами
 */
export class CabinetBase {
    constructor() {
        this.assembly = new THREE.Group();
        this.components = {};
        this.config = null;
        this.doorComponentName = null; // Переопределяется в подклассах
        this.doorRotationAxis = 'y'; // Ось вращения двери (x, y, z) — переопределяется в подклассах
        this.doorPivotOffset = new THREE.Vector3(0, 0, 0); // Offset для виртуальной точки вращения двери
    }

    /**
     * Установить угол поворота двери (универсальный метод)
     * @param {number} radians - Угол в радианах
     */
    setDoorRotation(radians) {
        // Пытаемся найти дверь по разным возможным названиям
        let door = null;
        
        // 1. Если указано явно
        if (this.doorComponentName) {
            door = this.components[this.doorComponentName];
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
            const pivotWorldPos = new THREE.Vector3().copy(this.doorPivotOffset);
            
            // Применяем ротацию только к оси Y (или нужной оси)
            door.rotation[this.doorRotationAxis] = radians;
            
            // Позиция должна быть смещена так, чтобы вращение происходило вокруг pivot
            // position = pivot * (1 - rotation_applied)
            const rotationMatrix = new THREE.Matrix4().makeRotationAxis(
                this.doorRotationAxis === 'x' ? new THREE.Vector3(1, 0, 0) :
                this.doorRotationAxis === 'y' ? new THREE.Vector3(0, 1, 0) :
                new THREE.Vector3(0, 0, 1),
                radians
            );
            
            // Трансформируем -pivot, вращаем, затем добавляем pivot обратно
            const offsetFromPivot = new THREE.Vector3(0, 0, 0).sub(this.doorPivotOffset);
            offsetFromPivot.applyMatrix4(rotationMatrix);
            door.position.copy(this.doorPivotOffset).add(offsetFromPivot);
        } else {
            // Без pivot — вращаемся прямо
            door.rotation.set(0, 0, 0);
            door.rotation[this.doorRotationAxis] = radians;
        }
        
        // Дверь повёрнута
    }

    /**
     * Инициализировать параметры двери из конфига
     * Вызывается после загрузки конфига
     */
    _initDoorSettingsFromConfig() {
        if (!this.config || !this.config.door) return;
        
        const doorConfig = this.config.door;
        
        // Загружаем имя компонента двери
        if (doorConfig.componentName) {
            this.doorComponentName = doorConfig.componentName;
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
    _initializeDoorPivot() {
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
     * @param {number} angle - Угол открытия в радианах (по умолчанию -π/2 = 90°)
     */
    openDoor(angle = -MATH.DEG_90_RAD) { // -90° по умолчанию
        this.setDoorRotation(angle);
    }

    /**
     * Закрыть дверь (удобный метод)
     */
    closeDoor() {
        this.setDoorRotation(0);
    }

    /**
     * Получить все компоненты шкафа
     */
    getComponents() {
        return this.components;
    }

    /**
     * Получить корневую группу сборки
     */
    getAssembly() {
        return this.assembly;
    }

    /**
     * Получить компонент по имени (вспомогательный метод)
     * @private
     */
    _getComponent(componentName) {
        const c = this.components[componentName];
        return c;
    }

    /**
     * Показать/скрыть компонент
     */
    setComponentVisibility(componentName, visible) {
        const c = this._getComponent(componentName);
        if (c) c.visible = visible;
    }

    /**
     * Установить позицию компонента
     */
    setComponentPosition(componentName, x, y, z) {
        const c = this._getComponent(componentName);
        if (c) c.position.set(x, y, z);
    }

    /**
     * Получить локальную позицию компонента
     */
    getComponentPosition(componentName) {
        const c = this._getComponent(componentName);
        return c ? c.position.clone() : null;
    }

    /**
     * Получить мировую позицию компонента
     */
    getComponentWorldPosition(componentName) {
        const c = this._getComponent(componentName);
        if (!c) return null;
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        return v;
    }

    /**
     * Переместить всю сборку
     */
    setAssemblyPosition(x, y, z) {
        this.assembly.position.set(x, y, z);
    }

    /**
     * Получить позицию сборки
     */
    getAssemblyPosition() {
        return this.assembly.position.clone();
    }

    /**
     * Переместить сборку на величину (относительное смещение)
     */
    moveAssemblyBy(dx, dy, dz) {
        this.assembly.position.addScaledVector(new THREE.Vector3(dx, dy, dz), 1);
    }

    /**
     * Сбросить позицию в начало координат (0, 0, 0)
     */
    resetAssemblyPosition() {
        this.assembly.position.set(0, 0, 0);
    }

    /**
     * Выровнять сборку так, чтобы origin был на нижней плоскости
     */
    _alignAssemblyToFloor() {
        const offsetY = GeometryUtils.alignToFloor(this.assembly);
        return offsetY.offset.y;
    }

    /**
     * Информация о сборке и компонентах
     */
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
}
