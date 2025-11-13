/**
 * InteractionController — управление взаимодействием пользователя
 * Обработка кликов, drag&drop, выбор объектов
 */

import * as THREE from '../libs/three.module.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from '../libs/three-mesh-bvh.module.js';

// Ускорение raycasting через BVH (Bounding Volume Hierarchy)
// Улучшает производительность кликов/hover на 10-100x для сложных моделей
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export class InteractionController {
    constructor(sceneManager, cabinetManager) {
        this.sceneManager = sceneManager;
        this.cabinetManager = cabinetManager;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Состояние drag
        this.isDragging = false;
        this.draggedCabinet = null;
        this.dragPlane = null;
        this.dragOffset = new THREE.Vector3();
        
        // Состояние hover (наведение)
        this.hoveredCabinet = null;
        
        this.init();
    }
    
    init() {
        const canvas = this.sceneManager.renderer.domElement;
        
        // События мыши
        canvas.addEventListener('click', this.onClick.bind(this), false);
        canvas.addEventListener('dblclick', this.onDoubleClick.bind(this), false);
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        // События клавиатуры
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
        window.addEventListener('keyup', this.onKeyUp.bind(this), false);
        
        // Создать плоскость для drag (пол)
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }
    
    updateMousePosition(event) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    onClick(event) {
        if (this.isDragging) return;
        
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        // Получить все шкафы на сцене
        const allMeshes = [];
        this.cabinetManager.getAllCabinets().forEach(cabinet => {
            if (cabinet.model) {
                cabinet.model.traverse(child => {
                    if (child.isMesh) {
                        allMeshes.push(child);
                    }
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        
        if (intersects.length > 0) {
            // Найти cabinetId из userData
            const hitObject = intersects[0].object;
            const cabinetId = hitObject.userData.cabinetId;
            if (cabinetId) {
                this.cabinetManager.selectCabinet(cabinetId);
                // Передаём также ссылку на конкретный меш для более точной подсветки
                this.onCabinetSelected(cabinetId, hitObject);
            }
        } else {
            // Клик по пустому месту — снять выбор
            this.cabinetManager.deselectAll();
            this.onCabinetDeselected();
        }
    }
    
    onDoubleClick(event) {
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        const allMeshes = [];
        this.cabinetManager.getAllCabinets().forEach(cabinet => {
            if (cabinet.model) {
                cabinet.model.traverse(child => {
                    if (child.isMesh) {
                        allMeshes.push(child);
                    }
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        
        if (intersects.length > 0) {
            const cabinetId = intersects[0].object.userData.cabinetId;
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            
            if (cabinet) {
                cabinet.toggleDoor(true);
            }
        }
    }
    
    onMouseDown(event) {
        if (event.button !== 0) return; // Только левая кнопка
        
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        const allMeshes = [];
        this.cabinetManager.getAllCabinets().forEach(cabinet => {
            if (cabinet.model) {
                cabinet.model.traverse(child => {
                    if (child.isMesh) {
                        allMeshes.push(child);
                    }
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const cabinetId = hitObject.userData.cabinetId;
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            
            if (!cabinet) return;
            
            // ========== УМНЫЙ РАСКАСТИНГ ==========
            
            if (event.shiftKey) {
                // РЕЖИМ: Перетаскивание шкафа (Shift + Click)
                this.startDrag(cabinet, intersects[0].point);
                
                // Отключить OrbitControls на время drag
                this.sceneManager.controls.enabled = false;
                
                // Курсор: рука сжатая (grabbing)
                this.sceneManager.renderer.domElement.style.cursor = 'grabbing';
                
            } else {
                // РЕЖИМ: Взаимодействие с компонентами (Click без Shift)
                
                if (hitObject.userData.isEquipment) {
                    // Клик по оборудованию
                    this.selectEquipment(cabinet, hitObject.userData.equipmentId, hitObject);
                } else if (hitObject.userData.isDoor) {
                    // Клик по двери
                    this.selectDoor(cabinet, hitObject);
                } else if (hitObject.userData.isDinRail) {
                    // Клик по DIN-рейке
                    this.selectDinRail(cabinet, hitObject);
                } else {
                    // Клик по корпусу шкафа — выбрать весь шкаф
                    this.selectCabinet(cabinet, hitObject);
                }
            }
        }
    }
    
    /**
     * Выбрать оборудование
     */
    selectEquipment(cabinet, equipmentId, mesh = null) {
        this.cabinetManager.selectCabinet(cabinet.id);
        
        // Вызвать callback с информацией об оборудовании
        if (this.onEquipmentSelected) {
            this.onEquipmentSelected(cabinet.id, equipmentId, mesh);
        }
    }
    
    /**
     * Выбрать дверь
     */
    selectDoor(cabinet, mesh = null) {
        this.cabinetManager.selectCabinet(cabinet.id);
        
        // Вызвать callback для отображения UI двери
        if (this.onDoorSelected) {
            this.onDoorSelected(cabinet.id, mesh);
        }
    }
    
    /**
     * Выбрать DIN-рейку
     */
    selectDinRail(cabinet, railObject) {
        this.cabinetManager.selectCabinet(cabinet.id);
        
        // Вызвать callback для работы с рейкой
        if (this.onDinRailSelected) {
            this.onDinRailSelected(cabinet.id, railObject, railObject);
        }
    }
    
    /**
     * Выбрать шкаф целиком
     */
    selectCabinet(cabinet, mesh = null) {
        this.cabinetManager.selectCabinet(cabinet.id);
        
        // Вызвать существующий callback
        if (this.onCabinetSelected) {
            this.onCabinetSelected(cabinet.id, mesh);
        }
    }
    
    onMouseMove(event) {
        this.updateMousePosition(event);
        
        // Если перетаскиваем — двигать модель
        if (this.isDragging && this.draggedCabinet) {
            this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
            
            // Пересечение с плоскостью drag (пол)
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
            
            if (intersectPoint) {
                // Новая позиция = точка пересечения - offset
                const newPosition = intersectPoint.clone().sub(this.dragOffset);
                
                // Переместить шкаф НАПРЯМУЮ (без проверки коллизий во время drag)
                // Сохраняем Y координату (не опускаем в пол)
                newPosition.y = this.draggedCabinet.model.position.y;
                
                // Прямое перемещение
                this.draggedCabinet.setPosition(newPosition);
            }
            return; // Не проверяем hover во время drag
        }
        
        // Проверка наведения курсора (hover) для курсора-руки
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        const allMeshes = [];
        this.cabinetManager.getAllCabinets().forEach(cabinet => {
            if (cabinet.model) {
                cabinet.model.traverse(child => {
                    if (child.isMesh) {
                        allMeshes.push(child);
                    }
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const cabinetId = hitObject.userData.cabinetId;
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            
            if (cabinet && cabinet !== this.hoveredCabinet) {
                this.hoveredCabinet = cabinet;
                
                // Курсор зависит от типа объекта и наличия Shift
                if (event.shiftKey) {
                    // Shift зажат — режим перетаскивания
                    this.sceneManager.renderer.domElement.style.cursor = 'grab';
                } else {
                    // Без Shift — режим взаимодействия
                    if (hitObject.userData.isEquipment || hitObject.userData.isDoor || hitObject.userData.isDinRail) {
                        this.sceneManager.renderer.domElement.style.cursor = 'pointer';
                    } else {
                        this.sceneManager.renderer.domElement.style.cursor = 'pointer';
                    }
                }
            }
        } else {
            // Курсор вне модели — сбросить курсор
            if (this.hoveredCabinet) {
                this.hoveredCabinet = null;
                this.sceneManager.renderer.domElement.style.cursor = 'default';
            }
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            this.stopDrag();
            
            // Включить OrbitControls обратно
            this.sceneManager.controls.enabled = true;
            
            // Вернуть курсор: рука открытая (если всё ещё на модели) или default
            if (this.hoveredCabinet) {
                this.sceneManager.renderer.domElement.style.cursor = 'grab';
            } else {
                this.sceneManager.renderer.domElement.style.cursor = 'default';
            }
        }
    }
    
    startDrag(cabinet, clickPoint) {
        this.isDragging = true;
        this.draggedCabinet = cabinet;
        
        // Вычислить offset (смещение клика от центра шкафа)
        this.dragOffset.copy(clickPoint).sub(cabinet.model.position);
    }
    
    stopDrag() {
        this.isDragging = false;
        this.draggedCabinet = null;
    }
    
    onKeyDown(event) {
        // Обновить курсор при нажатии Shift (если курсор над моделью)
        if (event.key === 'Shift' && this.hoveredCabinet) {
            this.sceneManager.renderer.domElement.style.cursor = 'grab';
        }
        
        const selectedCabinet = this.cabinetManager.selectedCabinet;
        if (!selectedCabinet) return;
        
        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                // Удалить выбранный шкаф
                this.cabinetManager.removeCabinet(selectedCabinet.id);
                break;
                
            case 'r':
            case 'R':
                // Повернуть на 90°
                const newRotation = selectedCabinet.rotation + Math.PI / 2;
                this.cabinetManager.rotateCabinet(selectedCabinet.id, newRotation);
                break;
                
            case 'o':
            case 'O':
                // Открыть/закрыть дверцу
                selectedCabinet.toggleDoor(true);
                break;
                
            case 'Escape':
                // Снять выбор
                this.cabinetManager.deselectAll();
                break;
        }
    }
    
    onKeyUp(event) {
        // Обновить курсор при отпускании Shift (если курсор над моделью)
        if (event.key === 'Shift' && this.hoveredCabinet) {
            this.sceneManager.renderer.domElement.style.cursor = 'pointer';
        }
    }
    
    onWheel(event) {
        event.preventDefault();
        let cabinet = this.cabinetManager.selectedCabinet;
        if (!cabinet) {
            const all = this.cabinetManager.getAllCabinets();
            if (all.length === 0) return;
            cabinet = all[0];
        }
        if (!cabinet.model) return;

        const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
        const currentScale = cabinet.model.scale.x;
        let newScale = currentScale * scaleFactor;
        newScale = THREE.MathUtils.clamp(newScale, 0.1, 10000);
        
        cabinet.updateBoundingBox();
        const bottomYBefore = cabinet.boundingBox ? cabinet.boundingBox.min.y : 0;
        
        cabinet.model.scale.set(newScale, newScale, newScale);
        cabinet.model.updateMatrixWorld(true);
        
        // Обновить bounding box
        cabinet.updateBoundingBox();
        
        // === СКОРРЕКТИРОВАТЬ ПОЗИЦИЮ, ЧТОБЫ НИЖНЯЯ ТОЧКА ОСТАЛАСЬ НА МЕСТЕ ===
        if (cabinet.boundingBox) {
            const bottomYAfter = cabinet.boundingBox.min.y;
            const deltaY = bottomYBefore - bottomYAfter;
            
            // Сдвинуть модель вверх/вниз, чтобы компенсировать изменение
            cabinet.model.position.y += deltaY;
            cabinet.model.updateMatrixWorld(true);
            
            // Финальное обновление bounding box
            cabinet.updateBoundingBox();
        }
        
        // Обновить визуальные элементы
        cabinet.createSelectionBox();
        if (this.sceneManager.updateCameraClipping) {
            this.sceneManager.updateCameraClipping(cabinet.getBoundingBox());
        }
        if (cabinet.isSelected && cabinet.selectionBox) {
            cabinet.selectionBox.visible = true;
        }
    }

    // Callback-методы (переопределяются извне)
    onCabinetSelected(cabinetId) {
        // Вызывается при выборе шкафа
    }
    
    onCabinetDeselected() {
        // Вызывается при снятии выбора
        console.log('📦 Выбор снят');
    }
}
