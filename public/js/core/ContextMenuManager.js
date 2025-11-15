import * as THREE from '../libs/three.module.js';

/**
 * Менеджер контекстного меню для оборудования в 3D-сцене
 * 
 * Функциональность:
 * - ПКМ на оборудовании → показать контекстное меню
 * - Удаление оборудования через меню
 * - Raycasting для определения кликнутого объекта
 * - Закрытие меню при клике вне его области
 */
export class ContextMenuManager {
    constructor({ scene, camera, renderer, equipmentManager }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.equipmentManager = equipmentManager;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.menuElement = null;
        this.currentEquipmentId = null;
        
        // Привязка контекста
        this._boundContextMenu = this._onContextMenu.bind(this);
        this._boundClickOutside = this._onClickOutside.bind(this);
    }

    /**
     * Инициализация — привязка событий
     */
    initialize() {
        // Слушаем contextmenu (ПКМ) на canvas
        this.renderer.domElement.addEventListener('contextmenu', this._boundContextMenu);
        
        // Создаём DOM-элемент меню
        this._createMenuElement();
        
        console.log('✅ ContextMenuManager: инициализирован');
    }

    /**
     * Создать DOM-элемент контекстного меню
     */
    _createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'context-menu-3d';
        this.menuElement.style.cssText = `
            position: fixed;
            display: none;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 150px;
            padding: 4px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
        `;

        // Пункт "Удалить"
        const deleteItem = this._createMenuItem('🗑️ Удалить', () => {
            this._deleteCurrentEquipment();
        });

        // Пункт "Информация" (опционально, для будущего)
        const infoItem = this._createMenuItem('ℹ️ Информация', () => {
            this._showEquipmentInfo();
        });

        this.menuElement.appendChild(deleteItem);
        this.menuElement.appendChild(this._createMenuSeparator());
        this.menuElement.appendChild(infoItem);

        document.body.appendChild(this.menuElement);
    }

    /**
     * Создать пункт меню
     */
    _createMenuItem(text, onClick) {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = text;
        item.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            transition: background 0.15s;
        `;

        item.addEventListener('mouseenter', () => {
            item.style.background = '#f0f0f0';
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
            this._hideMenu();
        });

        return item;
    }

    /**
     * Создать разделитель меню
     */
    _createMenuSeparator() {
        const separator = document.createElement('div');
        separator.style.cssText = `
            height: 1px;
            background: #e0e0e0;
            margin: 4px 0;
        `;
        return separator;
    }

    /**
     * Обработка ПКМ на canvas
     */
    _onContextMenu(event) {
        event.preventDefault();

        // Преобразуем координаты мыши
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycasting для поиска оборудования
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Собираем все mesh-объекты оборудования
        const equipmentMeshes = [];
        this.equipmentManager.equipment.forEach((item, id) => {
            if (item.mesh) {
                item.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.equipmentId = id; // Помечаем ID
                        equipmentMeshes.push(child);
                    }
                });
            }
        });

        if (equipmentMeshes.length === 0) {
            this._hideMenu();
            return;
        }

        // Проверяем пересечения
        const intersects = this.raycaster.intersectObjects(equipmentMeshes, false);

        if (intersects.length > 0) {
            // Нашли оборудование под курсором
            const clickedMesh = intersects[0].object;
            const equipmentId = clickedMesh.userData.equipmentId;

            if (equipmentId) {
                this.currentEquipmentId = equipmentId;
                this._showMenu(event.clientX, event.clientY);
                console.log(`🖱️ ПКМ на оборудовании: ${equipmentId}`);
            }
        } else {
            // Клик мимо оборудования — скрываем меню
            this._hideMenu();
        }
    }

    /**
     * Показать контекстное меню
     */
    _showMenu(x, y) {
        this.menuElement.style.display = 'block';
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;

        // Слушаем клики вне меню для закрытия
        setTimeout(() => {
            document.addEventListener('click', this._boundClickOutside);
        }, 100);
    }

    /**
     * Скрыть контекстное меню
     */
    _hideMenu() {
        this.menuElement.style.display = 'none';
        this.currentEquipmentId = null;
        document.removeEventListener('click', this._boundClickOutside);
    }

    /**
     * Клик вне меню — закрыть
     */
    _onClickOutside(event) {
        if (!this.menuElement.contains(event.target)) {
            this._hideMenu();
        }
    }

    /**
     * Удалить текущее оборудование
     */
    _deleteCurrentEquipment() {
        if (!this.currentEquipmentId) return;

        const item = this.equipmentManager.equipment.get(this.currentEquipmentId);
        if (!item) {
            console.warn(`⚠️ Оборудование ${this.currentEquipmentId} не найдено`);
            return;
        }

        const equipmentName = item.config?.name || item.type;
        
        if (confirm(`Удалить "${equipmentName}"?`)) {
            this.equipmentManager.removeEquipment(this.currentEquipmentId);
            console.log(`🗑️ Удалено: ${this.currentEquipmentId}`);
        }
    }

    /**
     * Показать информацию об оборудовании (для будущего расширения)
     */
    _showEquipmentInfo() {
        if (!this.currentEquipmentId) return;

        const item = this.equipmentManager.equipment.get(this.currentEquipmentId);
        if (!item) return;

        const info = {
            ID: this.currentEquipmentId,
            Тип: item.type,
            Название: item.config?.name || 'N/A',
            Рейка: item.railIndex,
            Ширина: item.config?.dimensions?.width 
                ? `${(item.config.dimensions.width * 1000).toFixed(1)}мм` 
                : 'N/A',
            Мощность: item.config?.power ? `${item.config.power}Вт` : 'N/A'
        };

        const infoText = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        alert(infoText);
    }

    /**
     * Очистка (cleanup)
     */
    dispose() {
        this.renderer.domElement.removeEventListener('contextmenu', this._boundContextMenu);
        document.removeEventListener('click', this._boundClickOutside);
        
        if (this.menuElement) {
            this.menuElement.remove();
        }

        console.log('♻️ ContextMenuManager: очищен');
    }
}
