import * as THREE from 'three';
import { RailHighlighter } from '../utils/RailHighlighter.js';
import { ANIMATION } from '../constants/PhysicalConstants.js';

/**
 * Контроллер перемещения установленного оборудования вдоль рейки
 * 
 * Функциональность:
 * - Выбор оборудования на сцене (raycasting)
 * - Перемещение строго вдоль рейки (DIN-рейка: ось X, Rack: ось Y)
 * - Проверка коллизий с другим оборудованием
 * - Визуальная обратная связь (подсветка рейки, ghost)
 */
export class EquipmentMoveController {
    constructor({ scene, camera, renderer, cabinetManager, equipmentManager, eventBus = null, controls = null }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.cabinetManager = cabinetManager;
        this.equipmentManager = equipmentManager;
        this.eventBus = eventBus;
        this.controls = controls; // OrbitControls для отключения во время перемещения
        
        // Raycasting для выбора оборудования
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Подсветка реек
        this.railHighlighter = new RailHighlighter();
        
        // Состояние перемещения
        this.moveState = {
            active: false,
            equipmentId: null,
            equipmentItem: null,
            cabinet: null,
            strategy: null,
            railIndex: null,
            startMousePosition: null,
            ghostMesh: null
        };
        
        // Привязка контекста для обработчиков
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        
        // Флаг для отключения/включения перемещения
        this.enabled = true;
    }

    /**
     * Включить/выключить контроллер
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.moveState.active) {
            this._cancelMove();
        }
    }

    /**
     * Обработка mousedown на сцене (выбор оборудования)
     */
    onMouseDown(event) {
        if (!this.enabled) return;
        
        // Игнорируем правый клик
        if (event.button !== 0) return;
        
        // Игнорируем если уже идёт перемещение
        if (this.moveState.active) return;

        // Получаем координаты мыши в нормализованном виде (-1 до +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycasting для поиска оборудования
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Получаем все оборудование на сцене
        const allEquipment = this.equipmentManager.getAllEquipment();
        
        if (allEquipment.length === 0) return;

        // Собираем все mesh-объекты оборудования с пометкой ID
        const equipmentMeshes = [];
        
        allEquipment.forEach((item) => {
            if (item.mesh) {
                item.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.equipmentId = item.mesh.name;
                        equipmentMeshes.push(child);
                    }
                });
            }
        });

        if (equipmentMeshes.length === 0) return;

        // Пересечения с оборудованием
        const intersects = this.raycaster.intersectObjects(equipmentMeshes, false);
        
        if (intersects.length === 0) return;

        // Находим первое пересечение
        const clickedMesh = intersects[0].object;
        const equipmentId = clickedMesh.userData.equipmentId;
        
        if (!equipmentId) return;

        // Находим оборудование по ID
        const equipmentItem = allEquipment.find(item => item.mesh.name === equipmentId);
        
        if (!equipmentItem) return;

        // Получаем шкаф и стратегию
        const cabinet = this.cabinetManager.getCabinet(equipmentItem.cabinetId);
        if (!cabinet || !cabinet.instance?.mountingStrategy) {
            console.warn('⚠️ Шкаф или стратегия монтажа не найдены');
            return;
        }

        const strategy = cabinet.instance.mountingStrategy;
        
        // Проверяем, поддерживает ли стратегия перемещение
        if (typeof strategy.moveEquipment !== 'function') {
            console.warn('⚠️ Стратегия монтажа не поддерживает перемещение');
            return;
        }

        // Начинаем перемещение
        this._startMove(equipmentItem, cabinet, strategy, event);
    }

    /**
     * Начать перемещение оборудования
     */
    _startMove(equipmentItem, cabinet, strategy, event) {
        // Предотвращаем конфликт с OrbitControls
        event.stopPropagation();
        
        this.moveState.active = true;
        this.moveState.equipmentId = equipmentItem.mesh.name;
        this.moveState.equipmentItem = equipmentItem;
        this.moveState.cabinet = cabinet;
        this.moveState.strategy = strategy;
        this.moveState.railIndex = equipmentItem.railIndex;
        this.moveState.startMousePosition = new THREE.Vector2(event.clientX, event.clientY);

        // Отключаем OrbitControls во время перемещения
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Подсвечиваем рейку
        const rails = strategy._getRails();
        if (rails.length > 0 && this.moveState.railIndex < rails.length) {
            // Преобразуем массив реек в формат для RailHighlighter
            const railMeshes = rails.map((rail, index) => ({ mesh: rail, index }));
            this.railHighlighter.highlightOne(railMeshes, this.moveState.railIndex);
        }

        // Создаём ghost mesh (полупрозрачная копия)
        this._createGhostMesh(equipmentItem.mesh);

        // Добавляем обработчики событий
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);

        // Изменяем курсор
        this.renderer.domElement.style.cursor = 'grabbing';

        console.log(`🔄 Начато перемещение оборудования: ${this.moveState.equipmentId}`);
    }

    /**
     * Создать ghost mesh (полупрозрачная копия для визуализации)
     */
    _createGhostMesh(originalMesh) {
        const ghost = originalMesh.clone();
        ghost.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = 0.5;
                child.material.emissive = new THREE.Color(0x00ff00);
                child.material.emissiveIntensity = 0.3;
            }
        });
        ghost.visible = false; // Пока скрыт, покажем при движении
        this.scene.add(ghost);
        this.moveState.ghostMesh = ghost;
    }

    /**
     * Обработка движения мыши при перемещении
     */
    _onMouseMove(event) {
        if (!this.moveState.active) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Проецируем движение мыши на рейку
        const newPosition = this._projectMouseToRail(event);
        
        if (newPosition) {
            // Обновляем позицию ghost mesh используя ту же логику, что и в moveEquipment
            if (this.moveState.ghostMesh) {
                const { equipmentItem, strategy, railIndex } = this.moveState;
                const rails = strategy._getRails();
                if (railIndex < rails.length) {
                    const rail = rails[railIndex];
                    const railBBox = new THREE.Box3().setFromObject(rail);
                    const targetX = railBBox.min.x + newPosition.xOffset;
                    
                    // Сбрасываем позицию ghost для правильного вычисления bbox
                    const savedGhostPos = this.moveState.ghostMesh.position.clone();
                    this.moveState.ghostMesh.position.set(0, 0, 0);
                    this.moveState.ghostMesh.updateMatrixWorld(true);
                    
                    // Получаем anchor point (та же логика, что в moveEquipment)
                    const equipmentConfig = equipmentItem.config;
                    let railMesh = null;
                    const railMeshName = equipmentConfig?.mounting?.anchorPoint?.meshName;
                    if (railMeshName) {
                        this.moveState.ghostMesh.traverse((child) => {
                            if (child.name === railMeshName && child.isMesh) {
                                railMesh = child;
                            }
                        });
                    }
                    
                    // Временно скрываем rail_mesh для расчёта габаритов
                    let railMeshVisible = null;
                    if (railMesh) {
                        railMeshVisible = railMesh.visible;
                        railMesh.visible = false;
                    }
                    
                    const ghostBBox = new THREE.Box3().setFromObject(this.moveState.ghostMesh);
                    
                    if (railMesh) {
                        railMesh.visible = railMeshVisible;
                    }
                    
                    const railMeshBBox = railMesh ? new THREE.Box3().setFromObject(railMesh) : null;
                    const configOffset = equipmentConfig?.mounting?.anchorPoint?.offset || [0, 0, 0];
                    
                    const equipmentAnchorX = ghostBBox.min.x + configOffset[0];
                    const railAnchorX = targetX;
                    const railAnchorY = (railBBox.min.y + railBBox.max.y) / 2;
                    const railAnchorZ = railBBox.max.z;
                    
                    let equipmentAnchorY, equipmentAnchorZ;
                    if (railMeshBBox) {
                        equipmentAnchorY = (railMeshBBox.min.y + railMeshBBox.max.y) / 2 + configOffset[1];
                        equipmentAnchorZ = railMeshBBox.min.z + configOffset[2];
                    } else {
                        equipmentAnchorY = (ghostBBox.min.y + ghostBBox.max.y) / 2 + configOffset[1];
                        equipmentAnchorZ = ghostBBox.min.z + configOffset[2];
                    }
                    
                    // Устанавливаем позицию ghost mesh
                    this.moveState.ghostMesh.position.set(
                        railAnchorX - equipmentAnchorX,
                        railAnchorY - equipmentAnchorY,
                        railAnchorZ - equipmentAnchorZ
                    );
                    this.moveState.ghostMesh.updateMatrixWorld(true);
                    this.moveState.ghostMesh.visible = true;
                }
            }

            // Проверяем, можно ли разместить здесь
            const canPlace = this._canPlaceAtPosition(newPosition);
            
            // Меняем цвет ghost в зависимости от возможности размещения
            if (this.moveState.ghostMesh) {
                this.moveState.ghostMesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = canPlace 
                            ? new THREE.Color(0x00ff00) 
                            : new THREE.Color(0xff0000);
                    }
                });
            }
        }
    }

    /**
     * Проецировать позицию мыши на рейку (ограничение движения вдоль оси)
     */
    _projectMouseToRail(event) {
        const { equipmentItem, strategy, railIndex, cabinet } = this.moveState;
        const rails = strategy._getRails();
        
        if (railIndex >= rails.length) return null;

        const rail = rails[railIndex];
        
        // Получаем bbox рейки в локальных координатах assembly
        const railBBox = new THREE.Box3().setFromObject(rail);

        // Raycasting для определения точки пересечения с плоскостью рейки
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Создаём плоскость в локальных координатах assembly
        // Для DIN-рейки плоскость перпендикулярна оси Z (плоскость YZ)
        const railPoint = new THREE.Vector3(
            railBBox.min.x,
            (railBBox.min.y + railBBox.max.y) / 2,
            railBBox.max.z
        );
        
        // Нормаль плоскости (в локальных координатах assembly, перпендикулярна к рейке)
        // Для DIN-рейки это нормаль к плоскости YZ (направление вдоль оси Z)
        const railNormal = new THREE.Vector3(0, 0, 1);
        
        // Преобразуем плоскость в глобальные координаты для raycasting
        if (cabinet && cabinet.assembly) {
            const railWorldPoint = railPoint.clone().applyMatrix4(cabinet.assembly.matrixWorld);
            const railWorldNormal = railNormal.clone().transformDirection(cabinet.assembly.matrixWorld);
            const plane = new THREE.Plane(railWorldNormal, -railWorldNormal.dot(railWorldPoint));
            
            const intersection = new THREE.Vector3();
            const hasIntersection = this.raycaster.ray.intersectPlane(plane, intersection);
            
            if (!hasIntersection) return null;
            
            // Преобразуем точку пересечения в локальные координаты assembly
            const intersectionLocal = intersection.clone().applyMatrix4(cabinet.assembly.matrixWorld.clone().invert());
            
            // Ограничиваем движение только по оси X рейки (для DIN-рейки)
            const clampedX = THREE.MathUtils.clamp(
                intersectionLocal.x,
                railBBox.min.x,
                railBBox.max.x
            );

            // Вычисляем xOffset (относительно начала рейки)
            const xOffset = clampedX - railBBox.min.x;
            
            return {
                railIndex: railIndex,
                xOffset: xOffset
            };
        } else {
            // Если нет assembly, работаем в глобальных координатах (fallback)
            const plane = new THREE.Plane(railNormal, -railNormal.dot(railPoint));
            const intersection = new THREE.Vector3();
            const hasIntersection = this.raycaster.ray.intersectPlane(plane, intersection);
            
            if (!hasIntersection) return null;
            
            const clampedX = THREE.MathUtils.clamp(
                intersection.x,
                railBBox.min.x,
                railBBox.max.x
            );
            
            const xOffset = clampedX - railBBox.min.x;
            
            return {
                railIndex: railIndex,
                xOffset: xOffset
            };
        }
    }

    /**
     * Проверить, можно ли разместить оборудование в позиции
     */
    _canPlaceAtPosition(newPosition) {
        const { equipmentItem, strategy } = this.moveState;
        const rails = strategy._getRails();
        
        if (newPosition.railIndex >= rails.length) return false;

        const rail = rails[newPosition.railIndex];
        const railBBox = new THREE.Box3().setFromObject(rail);

        // Получаем ширину оборудования
        const equipmentWidthConfig = equipmentItem.config?.dimensions?.width;
        const equipmentBBox = new THREE.Box3().setFromObject(equipmentItem.mesh);
        const equipmentWidthReal = equipmentBBox.max.x - equipmentBBox.min.x;
        const equipmentWidth = Math.max(equipmentWidthConfig || 0, equipmentWidthReal);

        // Вычисляем границы новой позиции
        const newStartX = railBBox.min.x + newPosition.xOffset;
        const newEndX = newStartX + equipmentWidth;

        // Проверяем границы рейки
        if (newStartX < railBBox.min.x || newEndX > railBBox.max.x) {
            return false;
        }

        // Проверяем коллизии через стратегию
        if (typeof strategy._canPlaceAt === 'function') {
            return strategy._canPlaceAt(
                newPosition.railIndex,
                newStartX,
                newEndX,
                equipmentItem.mesh.name // excludeEquipmentId
            );
        }

        return true;
    }

    /**
     * Обработка mouseup (завершение перемещения)
     */
    _onMouseUp(event) {
        if (!this.moveState.active) return;

        // Обновляем координаты мыши перед проецированием
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Проецируем финальную позицию
        const finalPosition = this._projectMouseToRail(event);
        
        if (finalPosition && this._canPlaceAtPosition(finalPosition)) {
            // Перемещаем оборудование
            const success = this.equipmentManager.moveEquipment(
                this.moveState.equipmentId,
                {
                    railIndex: finalPosition.railIndex,
                    xOffset: finalPosition.xOffset
                }
            );

            if (success) {
                console.log(`✅ Оборудование перемещено: ${this.moveState.equipmentId}`);
                
                // Отправляем событие
                if (this.eventBus) {
                    this.eventBus.emit('equipment:moved', {
                        equipmentId: this.moveState.equipmentId,
                        newPosition: finalPosition
                    });
                }
            } else {
                console.warn(`⚠️ Не удалось переместить оборудование: ${this.moveState.equipmentId}`);
            }
        }

        this._endMove();
    }

    /**
     * Завершить перемещение
     */
    _endMove() {
        // Удаляем ghost mesh
        if (this.moveState.ghostMesh) {
            this.scene.remove(this.moveState.ghostMesh);
            this.moveState.ghostMesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.moveState.ghostMesh = null;
        }

        // Убираем подсветку рейки
        if (this.moveState.strategy) {
            const rails = this.moveState.strategy._getRails();
            if (rails.length > 0) {
                const railMeshes = rails.map((rail, index) => ({ mesh: rail, index }));
                this.railHighlighter.reset(railMeshes);
            }
        }

        // Удаляем обработчики событий
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundMouseUp);

        // Восстанавливаем курсор
        this.renderer.domElement.style.cursor = 'default';

        // Включаем OrbitControls обратно
        if (this.controls) {
            this.controls.enabled = true;
        }

        // Сбрасываем состояние
        this.moveState = {
            active: false,
            equipmentId: null,
            equipmentItem: null,
            cabinet: null,
            strategy: null,
            railIndex: null,
            startMousePosition: null,
            ghostMesh: null
        };
    }

    /**
     * Отменить перемещение
     */
    _cancelMove() {
        this._endMove();
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.moveState.active) {
            this._cancelMove();
        }
        // Очищаем состояния, но не dispose материалов (они могут использоваться DragDropController)
        this.railHighlighter.clear();
    }
}

