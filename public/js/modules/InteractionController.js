/**
 * InteractionController — управление взаимодействием пользователя
 * Обработка кликов, drag&drop, выбор объектов
 */

import * as THREE from '../three.module.js';

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
        
        // Создать плоскость для drag (пол)
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        console.log('✅ InteractionController инициализирован');
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
            const cabinetId = intersects[0].object.userData.cabinetId;
            if (cabinetId) {
                this.cabinetManager.selectCabinet(cabinetId);
                this.onCabinetSelected(cabinetId);
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
                // Двойной клик — открыть/закрыть дверцу
                cabinet.toggleDoor(true);
                console.log(`🚪 Дверца ${cabinet.isDoorOpen ? 'открыта' : 'закрыта'}`);
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
            const cabinetId = intersects[0].object.userData.cabinetId;
            const cabinet = this.cabinetManager.getCabinetById(cabinetId);
            
            if (cabinet && event.shiftKey) {
                // Shift + MouseDown — начать перетаскивание
                this.startDrag(cabinet, intersects[0].point);
                
                // Отключить OrbitControls на время drag
                this.sceneManager.controls.enabled = false;
            }
        }
    }
    
    onMouseMove(event) {
        if (!this.isDragging || !this.draggedCabinet) return;
        
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        // Пересечение с плоскостью drag
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        
        if (intersectPoint) {
            // Новая позиция = точка пересечения - offset
            const newPosition = intersectPoint.clone().sub(this.dragOffset);
            
            // Попытаться переместить (с проверкой коллизий)
            this.cabinetManager.moveCabinet(this.draggedCabinet.id, newPosition);
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            this.stopDrag();
            
            // Включить OrbitControls обратно
            this.sceneManager.controls.enabled = true;
        }
    }
    
    startDrag(cabinet, clickPoint) {
        this.isDragging = true;
        this.draggedCabinet = cabinet;
        
        // Вычислить offset (смещение клика от центра шкафа)
        this.dragOffset.copy(clickPoint).sub(cabinet.model.position);
        
        console.log(`🖐️ Начато перетаскивание: ${cabinet.config.name}`);
    }
    
    stopDrag() {
        console.log(`✋ Перетаскивание завершено`);
        this.isDragging = false;
        this.draggedCabinet = null;
    }
    
    onKeyDown(event) {
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
                console.log('🔄 Шкаф повернут на 90°');
                break;
                
            case 'o':
            case 'O':
                // Открыть/закрыть дверцу
                selectedCabinet.toggleDoor(true);
                console.log(`🚪 Дверца ${selectedCabinet.isDoorOpen ? 'открыта' : 'закрыта'}`);
                break;
                
            case 'Escape':
                // Снять выбор
                this.cabinetManager.deselectAll();
                break;
        }
    }
    
    // Масштабирование объекта колесом мыши
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
        
        // Применить масштаб
        cabinet.model.scale.set(newScale, newScale, newScale);
        cabinet.model.updateMatrixWorld(true);
        
        // Обновить bounding box после масштабирования
        cabinet.updateBoundingBox();
        
        // Скорректировать позицию, чтобы модель не ушла ниже плоскости пола
        cabinet.ensureOnFloor();
        
        // Обновить визуальные элементы
        cabinet.createSelectionBox();
        if (this.sceneManager.updateCameraClipping) {
            this.sceneManager.updateCameraClipping(cabinet.getBoundingBox());
        }
        if (cabinet.isSelected && cabinet.selectionBox) {
            cabinet.selectionBox.visible = true;
        }
        console.log(`🔍 Масштаб шкафа: ${newScale.toFixed(2)}×`);
    }

    // Callback-методы (переопределяются извне)
    onCabinetSelected(cabinetId) {
        // Вызывается при выборе шкафа
        console.log(`📦 Выбран шкаф: ${cabinetId}`);
    }
    
    onCabinetDeselected() {
        // Вызывается при снятии выбора
        console.log('📦 Выбор снят');
    }
}
