import * as THREE from 'three';
import { PHYSICAL, DEFAULTS } from '../constants/PhysicalConstants.ts';
import type { EquipmentConfig } from '../types/equipment.types.js';
import type { MountingZone } from '../types/cabinet.types.js';

/**
 * Интерфейс для CabinetType (будет типизирован позже)
 */
interface CabinetType {
    getMountingZones?: (type: string) => MountingZone[] | undefined;
    specs?: {
        rackUnits?: number;
        [key: string]: any;
    };
    [key: string]: any;
}

/**
 * Интерфейс для CabinetBase (будет типизирован позже)
 */
interface CabinetBase {
    getComponents: () => Record<string, THREE.Object3D>;
    [key: string]: any;
}

/**
 * Позиция для монтажа на DIN-рейке
 */
export interface DINRailPosition {
    railIndex?: number;
    xOffset?: number | null;
}

/**
 * Позиция для монтажа на rack-юните
 */
export interface RackUnitPosition {
    unitIndex?: number;
    depth?: number;
}

/**
 * Позиция для монтажа на монтажной пластине
 */
export interface MountingPlatePosition {
    x?: number;
    y?: number;
}

/**
 * Объединенный тип позиции
 */
export type MountingPosition = DINRailPosition | RackUnitPosition | MountingPlatePosition;

/**
 * Занятое место на рейке
 */
interface OccupiedSpace {
    startX: number;
    endX: number;
    equipmentId: string;
}

/**
 * Старая позиция оборудования (для перемещения)
 */
export interface OldPosition {
    railIndex: number;
    xOffset: number;
    equipmentId: string;
}

/**
 * Новая позиция оборудования (для перемещения)
 */
export interface NewPosition {
    railIndex: number;
    xOffset: number;
}

/**
 * Результат поиска свободного места
 */
export interface AvailableSlot {
    railIndex: number;
    xOffset: number;
}

/**
 * Информация о занятости рейки
 */
export interface RailOccupancy {
    railWidth: number;
    occupiedWidth: number;
    freeWidth: number;
    fillPercent: string;
    items: number;
}

/**
 * Базовый класс стратегии монтажа
 */
export abstract class MountingStrategy {
    protected cabinet: CabinetBase;
    protected cabinetType: CabinetType | null;

    constructor(cabinetInstance: CabinetBase, cabinetType: CabinetType | null = null) {
        this.cabinet = cabinetInstance;
        this.cabinetType = cabinetType;
    }

    abstract mount(equipmentMesh: THREE.Group, equipmentConfig: EquipmentConfig, position?: MountingPosition): void;

    /**
     * Проверить возможность монтажа (заглушка для Phase 1)
     */
    async canMount(_equipmentConfig: EquipmentConfig): Promise<boolean> {
        return true;
    }

    getAvailablePositions(): any[] {
        return [];
    }
}

/**
 * Стратегия монтажа на DIN-рейке
 */
export class DINRailStrategy extends MountingStrategy {
    // Карта занятых позиций: railIndex -> массив [startX, endX, equipmentId]
    private occupiedSpaces: Map<number, OccupiedSpace[]>;

    constructor(cabinetInstance: CabinetBase, cabinetType: CabinetType | null = null) {
        super(cabinetInstance, cabinetType);
        this.occupiedSpaces = new Map();
    }

    /**
     * Получить список DIN-реек через CabinetType или fallback на компоненты
     */
    _getRails(): THREE.Object3D[] {
        // Новый путь: через CabinetType.getMountingZones() (если есть)
        if (this.cabinetType && typeof this.cabinetType.getMountingZones === 'function') {
            const zones = this.cabinetType.getMountingZones('din_rail');
            if (zones && zones.length > 0) {
                const components = this.cabinet.getComponents();
                const rails: THREE.Object3D[] = [];
                
                zones.forEach(zone => {
                    if (zone.componentNames && Array.isArray(zone.componentNames)) {
                        zone.componentNames.forEach(name => {
                            const rail = components[name];
                            if (rail) rails.push(rail);
                        });
                    }
                });
                
                if (rails.length > 0) {
                    console.log(`✅ Найдено ${rails.length} DIN-реек через mountingZones`);
                    return rails;
                }
            }
        }
        
        // Fallback: ищем все компоненты, которые выглядят как DIN-рейки
        const components = this.cabinet.getComponents();
        const rails = Object.entries(components)
            .filter(([name, component]) => {
                // Проверяем по именам: dinRail*, din_rail*, rail*
                return component && (
                    name.includes('dinRail') || 
                    name.includes('din_rail') || 
                    name.includes('rail')
                );
            })
            .map(([_name, component]) => component)
            .sort(); // Сортируем для консистентности
        
        if (rails.length > 0) {
            console.warn(`⚠️ Используется fallback. Найдено ${rails.length} DIN-реек: ${Object.keys(components).filter(n => n.includes('rail')).join(', ')}`);
        }
        
        return rails;
    }

    mount(equipmentMesh: THREE.Group, equipmentConfig: EquipmentConfig, position: DINRailPosition = {}): void {
        const { railIndex = 0, xOffset = null } = position;

        const rails = this._getRails();
        if (!rails.length) {
            throw new Error('В шкафу нет DIN-реек');
        }

        const rail = rails[Math.min(railIndex, rails.length - 1)];
        if (!rail) {
            throw new Error(`Рейка с индексом ${railIndex} не найдена`);
        }
        const railBBox = new THREE.Box3().setFromObject(rail);
        console.log('🔍 [MountingStrategy] railBBox:', {
            min: railBBox.min.toArray(),
            max: railBBox.max.toArray(),
            size: railBBox.getSize(new THREE.Vector3()).toArray(),
            center: railBBox.getCenter(new THREE.Vector3()).toArray()
        });

        // Сохраняем текущую позицию оборудования
        const savedPosition = equipmentMesh.position.clone();
        const savedParent = equipmentMesh.parent;
        console.log('🔍 [MountingStrategy] Сохраненная позиция:', savedPosition.toArray(), 'parent:', savedParent?.name);

        // Временно удаляем из родителя для вычисления bbox в локальных координатах
        if (savedParent) {
            savedParent.remove(equipmentMesh);
        }
        equipmentMesh.position.set(0, 0, 0);
        equipmentMesh.updateMatrixWorld(true);

        // Ищем anchor mesh (rail_mesh) для крепления к DIN-рейке (только для Y/Z)
        let railMesh: THREE.Mesh | null = null;
        const railMeshName = equipmentConfig?.mounting?.anchorPoint?.meshName;
        if (railMeshName) {
            equipmentMesh.traverse((child) => {
                if (child.name === railMeshName && (child as THREE.Mesh).isMesh) {
                    railMesh = child as THREE.Mesh;
                }
            });
        }
        console.log('🔍 [MountingStrategy] railMesh найден:', !!railMesh, railMeshName);

        // Временно скрываем rail_mesh для расчёта РЕАЛЬНЫХ габаритов оборудования
        let railMeshVisible: boolean | null = null;
        if (railMesh) {
            const mesh = railMesh as THREE.Mesh; // Explicit type assertion
            railMeshVisible = mesh.visible;
            mesh.visible = false;
        }
        
        // Реальные габариты оборудования (БЕЗ rail_mesh плоскости) в ЛОКАЛЬНЫХ координатах
        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        console.log('🔍 [MountingStrategy] equipmentBBox в локальных координатах:', {
            min: equipmentBBox.min.toArray(),
            max: equipmentBBox.max.toArray(),
            size: equipmentBBox.getSize(new THREE.Vector3()).toArray(),
            center: equipmentBBox.getCenter(new THREE.Vector3()).toArray(),
            isEmpty: equipmentBBox.isEmpty()
        });
        
        // BBox самого rail_mesh (для Y/Z крепления) - вычисляем ДО восстановления родителя
        let railMeshBBox: THREE.Box3 | null = null;
        if (railMesh) {
            // Вычисляем bbox rail_mesh в локальных координатах оборудования
            // Используем setFromObject напрямую для railMesh
            railMeshBBox = new THREE.Box3().setFromObject(railMesh as THREE.Mesh);
            console.log('🔍 [MountingStrategy] railMeshBBox в локальных координатах:', {
                min: railMeshBBox.min.toArray(),
                max: railMeshBBox.max.toArray(),
                center: railMeshBBox.getCenter(new THREE.Vector3()).toArray(),
                size: railMeshBBox.getSize(new THREE.Vector3()).toArray()
            });
        }
        
        // Восстанавливаем видимость rail_mesh
        if (railMesh) {
            (railMesh as THREE.Mesh).visible = railMeshVisible ?? true;
        }
        
        // Восстанавливаем родителя
        if (savedParent) {
            savedParent.add(equipmentMesh);
        }
        
        // Ширина оборудования из конфига (для поиска свободного места)
        const equipmentWidthConfig = equipmentConfig?.dimensions?.width;
        
        // Реальная ширина bbox (для регистрации занятого пространства)
        const equipmentWidthReal = equipmentBBox.max.x - equipmentBBox.min.x;
        
        // Используем бОльшую из двух (чтобы учесть реальные габариты)
        const equipmentWidth = Math.max(equipmentWidthConfig || 0, equipmentWidthReal);

        // Определяем X-позицию на рейке (АБСОЛЮТНАЯ координата в assembly)
        let targetX: number;
        if (xOffset !== null && xOffset !== undefined) {
            targetX = railBBox.min.x + xOffset;
        } else {
            targetX = this._findNextFreePosition(railIndex, railBBox, equipmentWidth);
        }

        // Anchor point на рейке (АБСОЛЮТНЫЕ координаты в assembly)
        const railAnchorX = targetX;  // targetX уже абсолютная координата
        const railAnchorY = (railBBox.min.y + railBBox.max.y) / 2;
        const railAnchorZ = railBBox.max.z;  // передняя грань рейки

        // Anchor point на оборудовании (локальные координаты)
        const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
        
        // X: используем РЕАЛЬНЫЙ левый край из bbox (он уже учитывает все внутренние трансформации GLTF)
        const equipmentAnchorX = equipmentBBox.min.x + configOffset[0];
        
        // Y и Z: используем rail_mesh если есть (точка крепления к DIN-рейке), иначе реальное оборудование
        let equipmentAnchorY: number, equipmentAnchorZ: number;
        if (railMeshBBox) {
            equipmentAnchorY = (railMeshBBox.min.y + railMeshBBox.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = railMeshBBox.min.z + configOffset[2];
            console.log('🔍 [MountingStrategy] Используется railMeshBBox для Y/Z:', {
                railMeshBBox: { min: railMeshBBox.min.toArray(), max: railMeshBBox.max.toArray() },
                equipmentAnchorY,
                equipmentAnchorZ
            });
        } else {
            equipmentAnchorY = (equipmentBBox.min.y + equipmentBBox.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = equipmentBBox.min.z + configOffset[2];
            console.log('🔍 [MountingStrategy] Используется equipmentBBox для Y/Z:', {
                equipmentBBox: { min: equipmentBBox.min.toArray(), max: equipmentBBox.max.toArray() },
                equipmentAnchorY,
                equipmentAnchorZ
            });
        }
        
        console.log('🔍 [MountingStrategy] Anchor points:', {
            railAnchor: { x: railAnchorX, y: railAnchorY, z: railAnchorZ },
            equipmentAnchor: { x: equipmentAnchorX, y: equipmentAnchorY, z: equipmentAnchorZ },
            configOffset
        });

        // Вычисляем итоговую позицию оборудования (оба объекта в одной системе координат - assembly)
        const finalX = railAnchorX - equipmentAnchorX;
        const finalY = railAnchorY - equipmentAnchorY;
        const finalZ = railAnchorZ - equipmentAnchorZ;
        
        console.log('🔧 [MountingStrategy] Расчет позиции:', {
            railAnchor: { x: railAnchorX, y: railAnchorY, z: railAnchorZ },
            equipmentAnchor: { x: equipmentAnchorX, y: equipmentAnchorY, z: equipmentAnchorZ },
            final: { x: finalX, y: finalY, z: finalZ },
            equipmentBBox: { min: equipmentBBox.min, max: equipmentBBox.max },
            railBBox: { min: railBBox.min, max: railBBox.max }
        });
        
        equipmentMesh.position.set(finalX, finalY, finalZ);

        // Обновляем матрицу для точного bbox
        equipmentMesh.updateMatrixWorld(true);
        
        // Убеждаемся, что оборудование видимо
        equipmentMesh.visible = true;
        equipmentMesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.visible = true;
                // Убеждаемся, что материал не прозрачный
                if (mesh.material) {
                    const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    material.forEach(mat => {
                        if (mat && 'opacity' in mat) {
                            mat.opacity = 1;
                            mat.transparent = false;
                        }
                    });
                }
            }
        });
        
        // Проверяем финальное состояние
        const finalBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const worldPos = equipmentMesh.getWorldPosition(new THREE.Vector3());
        
        console.log('✅ [MountingStrategy] Позиция установлена:', {
            localPosition: equipmentMesh.position.toArray(),
            worldPosition: worldPos.toArray(),
            visible: equipmentMesh.visible,
            inScene: equipmentMesh.parent !== null,
            parentName: equipmentMesh.parent?.name,
            finalBBox: {
                min: finalBBox.min.toArray(),
                max: finalBBox.max.toArray(),
                center: finalBBox.getCenter(new THREE.Vector3()).toArray(),
                size: finalBBox.getSize(new THREE.Vector3()).toArray()
            },
            // ВРЕМЕННО: проверяем, видно ли оборудование в центре
            testCenterPosition: 'Для теста попробуйте: equipmentMesh.position.set(0, 0.5, 0)'
        });
        
        // ВРЕМЕННАЯ ДИАГНОСТИКА: если Y отрицательный, попробуем исправить
        if (finalY < 0) {
            console.warn('⚠️ [MountingStrategy] Y позиция отрицательная! Возможная проблема в вычислении anchor points.');
            console.warn('   Попробуйте временно установить: equipmentMesh.position.y = 0.5');
        }

        // Регистрируем занятое место на рейке (АБСОЛЮТНЫЕ координаты в assembly)
        this._registerOccupiedSpace(railIndex, targetX, targetX + equipmentWidth, equipmentMesh.name);
    }

    private _findNextFreePosition(railIndex: number, railBBox: THREE.Box3, equipmentWidth: number): number {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        const railWidth = railBBox.max.x - railBBox.min.x;

        console.log(`🔍 Поиск позиции: рейка #${railIndex}, ширина оборудования=${(equipmentWidth * PHYSICAL.M_TO_MM).toFixed(1)}мм`);
        console.log(`   Рейка: min.x=${railBBox.min.x.toFixed(3)}, max.x=${railBBox.max.x.toFixed(3)}, ширина=${(railWidth * PHYSICAL.M_TO_MM).toFixed(1)}мм`);
        console.log(`   Занято позиций: ${occupied.length}`);

        // Сортируем по startX
        occupied.sort((a, b) => a.startX - b.startX);

        let searchX = railBBox.min.x;
        for (const space of occupied) {
            console.log(`   Занято: [${space.startX.toFixed(3)} - ${space.endX.toFixed(3)}] (${((space.endX - space.startX) * PHYSICAL.M_TO_MM).toFixed(1)}мм) - ${space.equipmentId}`);
            if (searchX + equipmentWidth <= space.startX) {
                // Нашли свободное место перед этим оборудованием
                console.log(`   ✅ Найдено место: X=${searchX.toFixed(3)}м (перед ${space.equipmentId})`);
                return searchX;
            }
            searchX = space.endX;  // Пропускаем занятое
        }

        // Проверяем, влезет ли в конец
        if (searchX + equipmentWidth <= railBBox.max.x) {
            console.log(`   ✅ Найдено место: X=${searchX.toFixed(3)}м (в конце рейки)`);
            return searchX;
        }

        // Места нет — выбрасываем ошибку
        const occupiedMM = (searchX - railBBox.min.x) * PHYSICAL.M_TO_MM;
        const railWidthMM = railWidth * PHYSICAL.M_TO_MM;
        const neededMM = equipmentWidth * PHYSICAL.M_TO_MM;
        throw new Error(
            `DIN-рейка ${railIndex} переполнена! ` +
            `Занято: ${occupiedMM.toFixed(0)}мм, ` +
            `длина рейки: ${railWidthMM.toFixed(0)}мм, ` +
            `требуется: ${neededMM.toFixed(0)}мм`
        );
    }

    private _registerOccupiedSpace(railIndex: number, startX: number, endX: number, equipmentId: string): void {
        if (!this.occupiedSpaces.has(railIndex)) {
            this.occupiedSpaces.set(railIndex, []);
        }
        this.occupiedSpaces.get(railIndex)!.push({ startX, endX, equipmentId });
    }

    /**
     * Освободить занятое место на рейке (для перемещения)
     */
    _unregisterOccupiedSpace(railIndex: number, equipmentId: string): void {
        if (!this.occupiedSpaces.has(railIndex)) {
            return;
        }
        const occupied = this.occupiedSpaces.get(railIndex)!;
        const filtered = occupied.filter(space => space.equipmentId !== equipmentId);
        this.occupiedSpaces.set(railIndex, filtered);
    }

    /**
     * Проверить, можно ли разместить оборудование в указанной позиции
     */
    _canPlaceAt(railIndex: number, startX: number, endX: number, excludeEquipmentId: string | null = null): boolean {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        
        // Проверяем пересечения с занятыми местами
        for (const space of occupied) {
            // Пропускаем исключённое оборудование (то, которое перемещаем)
            if (excludeEquipmentId && space.equipmentId === excludeEquipmentId) {
                continue;
            }
            
            // Проверка пересечения: [startX, endX] пересекается с [space.startX, space.endX]
            if (!(endX <= space.startX || startX >= space.endX)) {
                return false; // Есть пересечение
            }
        }
        
        return true; // Место свободно
    }

    /**
     * Переместить оборудование вдоль рейки
     */
    moveEquipment(equipmentMesh: THREE.Group, equipmentConfig: EquipmentConfig, oldPosition: OldPosition, newPosition: NewPosition): boolean {
        const { railIndex: oldRailIndex, equipmentId } = oldPosition;
        const { railIndex: newRailIndex, xOffset: newXOffset } = newPosition;

        const rails = this._getRails();
        if (newRailIndex >= rails.length) {
            console.error(`❌ Рейка ${newRailIndex} не существует`);
            return false;
        }

        const rail = rails[newRailIndex];
        if (!rail) {
            console.error(`❌ Рейка ${newRailIndex} не найдена`);
            return false;
        }
        const railBBox = new THREE.Box3().setFromObject(rail);

        // Получаем ширину оборудования
        const equipmentWidthConfig = equipmentConfig?.dimensions?.width;
        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const equipmentWidthReal = equipmentBBox.max.x - equipmentBBox.min.x;
        const equipmentWidth = Math.max(equipmentWidthConfig || 0, equipmentWidthReal);

        // Вычисляем новую позицию X (абсолютная координата)
        const newTargetX = railBBox.min.x + newXOffset;
        const newStartX = newTargetX;
        const newEndX = newTargetX + equipmentWidth;

        // Проверяем границы рейки
        if (newStartX < railBBox.min.x || newEndX > railBBox.max.x) {
            console.warn(`⚠️ Новая позиция выходит за границы рейки ${newRailIndex}`);
            return false;
        }

        // Освобождаем старое место
        this._unregisterOccupiedSpace(oldRailIndex, equipmentId);

        // Проверяем коллизии на новой позиции
        if (!this._canPlaceAt(newRailIndex, newStartX, newEndX, equipmentId)) {
            // Восстанавливаем старое место при неудаче
            const oldOccupied = this.occupiedSpaces.get(oldRailIndex) || [];
            const oldSpace = oldOccupied.find(s => s.equipmentId === equipmentId);
            if (oldSpace) {
                this._registerOccupiedSpace(oldRailIndex, oldSpace.startX, oldSpace.endX, equipmentId);
            }
            console.warn(`⚠️ Новая позиция занята другим оборудованием`);
            return false;
        }

        // Перемещаем mesh (используем ту же логику, что и в mount, но с новой позицией)
        // ВАЖНО: сбрасываем позицию для правильного вычисления bbox (как в mount)
        equipmentMesh.position.set(0, 0, 0);
        equipmentMesh.updateMatrixWorld(true);

        // Получаем anchor point оборудования (локальные координаты)
        let railMesh: THREE.Mesh | null = null;
        const railMeshName = equipmentConfig?.mounting?.anchorPoint?.meshName;
        if (railMeshName) {
            equipmentMesh.traverse((child) => {
                if (child.name === railMeshName && (child as THREE.Mesh).isMesh) {
                    railMesh = child as THREE.Mesh;
                }
            });
        }

        // Временно скрываем rail_mesh для расчёта габаритов
        let railMeshVisible: boolean | null = null;
        if (railMesh) {
            const mesh = railMesh as THREE.Mesh; // Explicit type assertion
            railMeshVisible = mesh.visible;
            mesh.visible = false;
        }
        
        // Реальные габариты оборудования (БЕЗ rail_mesh плоскости)
        const equipmentBBoxForAnchor = new THREE.Box3().setFromObject(equipmentMesh);
        
        if (railMesh) {
            (railMesh as THREE.Mesh).visible = railMeshVisible ?? true;
        }
        
        const railAnchorX = newTargetX;
        const railAnchorY = (railBBox.min.y + railBBox.max.y) / 2;
        const railAnchorZ = railBBox.max.z;

        const railMeshBBox = railMesh ? new THREE.Box3().setFromObject(railMesh as THREE.Mesh) : null;
        const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
        
        const equipmentAnchorX = equipmentBBoxForAnchor.min.x + configOffset[0];
        
        let equipmentAnchorY: number, equipmentAnchorZ: number;
        if (railMeshBBox) {
            equipmentAnchorY = (railMeshBBox.min.y + railMeshBBox.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = railMeshBBox.min.z + configOffset[2];
        } else {
            equipmentAnchorY = (equipmentBBoxForAnchor.min.y + equipmentBBoxForAnchor.max.y) / 2 + configOffset[1];
            equipmentAnchorZ = equipmentBBoxForAnchor.min.z + configOffset[2];
        }

        // Устанавливаем новую позицию
        equipmentMesh.position.set(
            railAnchorX - equipmentAnchorX,
            railAnchorY - equipmentAnchorY,
            railAnchorZ - equipmentAnchorZ
        );
        equipmentMesh.updateMatrixWorld(true);

        // Регистрируем новое место
        this._registerOccupiedSpace(newRailIndex, newStartX, newEndX, equipmentId);

        console.log(`✅ Оборудование ${equipmentId} перемещено: рейка ${oldRailIndex} → ${newRailIndex}, X=${newXOffset.toFixed(3)}м`);
        return true;
    }

    /**
     * Автоматический поиск следующей свободной позиции на рейках (0 → 1 → 2 → 3)
     */
    findNextAvailableSlot(equipmentWidth: number, preferredRailIndex: number = 0): AvailableSlot | null {
        const rails = this._getRails();
        
        if (rails.length === 0) {
            console.error('❌ В шкафу нет DIN-реек');
            return null;
        }

        // Порядок поиска: preferredRailIndex → 0 → 1 → 2 → 3
        const searchOrder = [preferredRailIndex];
        for (let i = 0; i < rails.length; i++) {
            if (i !== preferredRailIndex) searchOrder.push(i);
        }

        console.log(`🔍 Поиск места для оборудования (ширина ${(equipmentWidth * PHYSICAL.M_TO_MM).toFixed(1)}мм)`);
        console.log(`   Порядок поиска по рейкам: ${searchOrder.join(' → ')}`);

        for (const railIndex of searchOrder) {
            if (railIndex >= rails.length) continue;

            const rail = rails[railIndex];
            if (!rail) continue;
            const railBBox = new THREE.Box3().setFromObject(rail);
            
            try {
                const xOffset = this._findNextFreePosition(railIndex, railBBox, equipmentWidth);
                console.log(`✅ Найдено свободное место: рейка ${railIndex}, X=${xOffset.toFixed(3)}м`);
                return { railIndex, xOffset };
            } catch (e: any) {
                // Рейка заполнена, пробуем следующую
                console.log(`   ⚠️ Рейка ${railIndex}: ${e.message}`);
                continue;
            }
        }

        console.error('❌ Нет свободного места ни на одной DIN-рейке');
        return null;
    }

    unmount(equipmentId: string, railIndex: number): void {
        if (!this.occupiedSpaces.has(railIndex)) {
            console.warn(`⚠️ Рейка ${railIndex} не найдена в occupiedSpaces`);
            return;
        }

        const occupied = this.occupiedSpaces.get(railIndex)!;
        const initialLength = occupied.length;
        
        // Удаляем запись с этим equipmentId
        const filtered = occupied.filter(space => space.equipmentId !== equipmentId);
        this.occupiedSpaces.set(railIndex, filtered);
        
        const removed = initialLength - filtered.length;
        if (removed > 0) {
            console.log(`🔓 Освобождено место на рейке ${railIndex}: удалено ${removed} записей для ${equipmentId}`);
        } else {
            console.warn(`⚠️ Не найдено записи для ${equipmentId} на рейке ${railIndex}`);
        }
    }

    getRailOccupancy(railIndex: number): RailOccupancy | null {
        const occupied = this.occupiedSpaces.get(railIndex) || [];
        const rails = this._getRails();
        if (railIndex >= rails.length) return null;

        const rail = rails[railIndex];
        if (!rail) return null;
        const railBBox = new THREE.Box3().setFromObject(rail);
        const railWidth = railBBox.max.x - railBBox.min.x;

        let occupiedWidth = 0;
        occupied.forEach(space => {
            occupiedWidth += (space.endX - space.startX);
        });

        return {
            railWidth: railWidth,
            occupiedWidth: occupiedWidth,
            freeWidth: railWidth - occupiedWidth,
            fillPercent: (occupiedWidth / railWidth * 100).toFixed(1),
            items: occupied.length
        };
    }

    /**
     * Валидация монтажа для DIN-рейки
     */
    async canMount(equipmentConfig: EquipmentConfig): Promise<boolean> {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'din_rail') {
            return false;
        }

        const rails = this._getRails();
        if (rails.length === 0) {
            console.warn('[DINRailStrategy] Нет DIN-реек в шкафу');
            return false;
        }

        // Дополнительные проверки можно добавить здесь
        return true;
    }
}

/**
 * Стратегия монтажа на rack-юните
 */
export class RackUnitStrategy extends MountingStrategy {
    mount(equipmentMesh: THREE.Group, _equipmentConfig: EquipmentConfig, position: RackUnitPosition = {}): void {
        const { unitIndex = 0, depth = 0 } = position;
        const components = this.cabinet.getComponents();
        const rackRailsRaw = components['rackRails'];
        // Нормализуем в массив: если это массив - используем, если один объект - оборачиваем, иначе пустой массив
        const rackRails: THREE.Object3D[] = Array.isArray(rackRailsRaw) 
            ? rackRailsRaw 
            : rackRailsRaw 
                ? [rackRailsRaw] 
                : [];
        if (!rackRails.length) {
            throw new Error('В шкафу нет rack-направляющих');
        }

        // Используем cabinetType если доступен
        const unitHeightMM = this.cabinetType 
            ? ((this.cabinetType.specs?.rackUnits || DEFAULTS.RACK_HEIGHT_U) * PHYSICAL.RACK_UNIT_HEIGHT_MM / DEFAULTS.RACK_HEIGHT_U)
            : PHYSICAL.RACK_UNIT_HEIGHT_MM;
        const unitHeight = unitHeightMM * PHYSICAL.MM_TO_M;
        const yPosition = unitIndex * unitHeight;

        const firstRackRail = rackRails[0];
        if (!firstRackRail) {
            throw new Error('Rack rail не найден');
        }
        const rackBBox = new THREE.Box3().setFromObject(firstRackRail);
        const rackAnchor = new THREE.Vector3(
            rackBBox.min.x,
            rackBBox.min.y + yPosition,
            rackBBox.min.z + depth
        );

        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const equipmentAnchor = new THREE.Vector3(
            (equipmentBBox.min.x + equipmentBBox.max.x) / 2,
            equipmentBBox.min.y,
            equipmentBBox.min.z
        );

        const delta = rackAnchor.clone().sub(equipmentAnchor);
        equipmentMesh.position.add(delta);
    }

    /**
     * Валидация для rack-монтажа
     */
    async canMount(equipmentConfig: EquipmentConfig): Promise<boolean> {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'rack_unit') {
            return false;
        }

        const components = this.cabinet.getComponents();
        const rackRailsRaw = components['rackRails'];
        const rackRails: THREE.Object3D[] = Array.isArray(rackRailsRaw) 
            ? rackRailsRaw 
            : rackRailsRaw 
                ? [rackRailsRaw] 
                : [];
        if (rackRails.length === 0) {
            console.warn('[RackUnitStrategy] Нет rack-направляющих');
            return false;
        }

        return true;
    }
}

/**
 * Стратегия монтажа на монтажной пластине
 */
export class MountingPlateStrategy extends MountingStrategy {
    mount(equipmentMesh: THREE.Group, _equipmentConfig: EquipmentConfig, position: MountingPlatePosition = {}): void {
        const { x = 0, y = 0 } = position; // локальные координаты на плате
        const components = this.cabinet.getComponents();
        const plate = components['mountingPlate'] as THREE.Object3D | undefined;
        if (!plate) {
            throw new Error('В шкафу нет монтажной пластины');
        }

        const plateBBox = new THREE.Box3().setFromObject(plate);
        const anchor = new THREE.Vector3(plateBBox.min.x + x, plateBBox.min.y + y, plateBBox.max.z);

        const equipmentBBox = new THREE.Box3().setFromObject(equipmentMesh);
        const equipmentAnchor = new THREE.Vector3(
            (equipmentBBox.min.x + equipmentBBox.max.x) / 2,
            equipmentBBox.min.y,
            equipmentBBox.min.z
        );

        const delta = plate.localToWorld(anchor).sub(equipmentMesh.localToWorld(equipmentAnchor));
        equipmentMesh.position.add(delta);
    }

    /**
     * Валидация для монтажной пластины
     */
    async canMount(equipmentConfig: EquipmentConfig): Promise<boolean> {
        if (!equipmentConfig.mounting || equipmentConfig.mounting.type !== 'mounting_plate') {
            return false;
        }

        const components = this.cabinet.getComponents();
        if (!components['mountingPlate']) {
            console.warn('[MountingPlateStrategy] Нет монтажной пластины');
            return false;
        }

        return true;
    }
}

