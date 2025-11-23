import * as THREE from 'three';
import type { EquipmentManager } from '../managers/EquipmentManager.js';

/**
 * Опции для инициализации ContextMenuManager
 */
export interface ContextMenuManagerOptions {
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    equipmentManager: EquipmentManager;
}

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
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private equipmentManager: EquipmentManager;
    
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    
    private menuElement: HTMLElement | null;
    private currentEquipmentId: string | null;
    
    // Привязка контекста
    private _boundContextMenu: (event: MouseEvent) => void;
    private _boundClickOutside: (event: MouseEvent) => void;

    constructor({ camera, renderer, equipmentManager }: ContextMenuManagerOptions) {
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
    initialize(): void {
        // Слушаем contextmenu (ПКМ) на canvas
        this.renderer.domElement.addEventListener('contextmenu', this._boundContextMenu);
        
        // Создаём DOM-элемент меню
        this._createMenuElement();
        
        console.log('✅ ContextMenuManager: инициализирован');
    }

    /**
     * Создать DOM-элемент контекстного меню
     */
    private _createMenuElement(): void {
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
    private _createMenuItem(text: string, onClick: () => void): HTMLElement {
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
    private _createMenuSeparator(): HTMLElement {
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
    private _onContextMenu(event: MouseEvent): void {
        event.preventDefault();

        // Преобразуем координаты мыши
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycasting для поиска оборудования
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Собираем все mesh-объекты оборудования
        const equipmentMeshes: THREE.Mesh[] = [];
        const allEquipment = this.equipmentManager.getAllEquipment();
        
        allEquipment.forEach((item) => {
            if (item.mesh) {
                item.mesh.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.userData['equipmentId'] = item.id; // Помечаем ID
                        equipmentMeshes.push(mesh);
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
            const firstIntersect = intersects[0];
            
            if (!firstIntersect || !firstIntersect.object) {
                this._hideMenu();
                return;
            }
            
            const clickedMesh = firstIntersect.object as THREE.Mesh;
            const equipmentId = clickedMesh.userData['equipmentId'] as string | undefined;

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
    private _showMenu(x: number, y: number): void {
        if (!this.menuElement) return;
        
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
    private _hideMenu(): void {
        if (!this.menuElement) return;
        
        this.menuElement.style.display = 'none';
        this.currentEquipmentId = null;
        document.removeEventListener('click', this._boundClickOutside);
    }

    /**
     * Клик вне меню — закрыть
     */
    private _onClickOutside(event: MouseEvent): void {
        if (!this.menuElement || !event.target) return;
        
        if (!this.menuElement.contains(event.target as Node)) {
            this._hideMenu();
        }
    }

    /**
     * Удалить текущее оборудование
     */
    private _deleteCurrentEquipment(): void {
        if (!this.currentEquipmentId) return;

        const item = this.equipmentManager.getEquipment(this.currentEquipmentId);
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
    private _showEquipmentInfo(): void {
        if (!this.currentEquipmentId) return;

        const item = this.equipmentManager.getEquipment(this.currentEquipmentId);
        if (!item) return;

        const info: Record<string, string> = {
            ID: this.currentEquipmentId,
            Тип: item.type,
            Название: item.config?.name || 'N/A',
            Рейка: String(item.railIndex ?? 'N/A'),
            Ширина: item.config?.dimensions?.width 
                ? `${(item.config.dimensions.width * 1000).toFixed(1)}мм` 
                : 'N/A',
            Мощность: item.config?.['power'] ? `${item.config['power']}Вт` : 'N/A'
        };

        const infoText = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        alert(infoText);
    }

    /**
     * Очистка (cleanup)
     */
    dispose(): void {
        this.renderer.domElement.removeEventListener('contextmenu', this._boundContextMenu);
        document.removeEventListener('click', this._boundClickOutside);
        
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }

        console.log('♻️ ContextMenuManager: очищен');
    }
}

