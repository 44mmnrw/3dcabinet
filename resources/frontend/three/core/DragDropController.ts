import * as THREE from 'three';
import { RailHighlighter } from '../utils/RailHighlighter.ts';
import { ANIMATION } from '../constants/PhysicalConstants.ts';
import type { CabinetManager } from '../managers/CabinetManager.js';
import type { EquipmentManager } from '../managers/EquipmentManager.js';
import type { EquipmentConfig } from '../types/equipment.types.js';

/**
 * Опции для инициализации DragDropController
 */
export interface DragDropControllerOptions {
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    cabinetManager: CabinetManager;
    equipmentManager: EquipmentManager;
}

/**
 * Состояние перетаскивания
 */
interface DragState {
    active: boolean;
    equipmentType: string | null;
    equipmentConfig: EquipmentConfig | null;
    ghostElement: HTMLElement | null;
    sourceCard: HTMLElement | null;
    targetRailIndex: number | null;
}

/**
 * Информация о рейке для raycasting
 */
interface RailMeshInfo {
    mesh: THREE.Mesh;
    index: number;
    name: string;
}

/**
 * Контроллер Drag & Drop для оборудования
 * 
 * Функциональность:
 * - Перетаскивание оборудования из панели в шкаф
 * - Подсветка DIN-реек при перетаскивании (dim → bright)
 * - Raycasting для определения ближайшей рейки
 * - Автоматический поиск свободной позиции на рейках
 * - Ghost-элемент (миниатюра) следующий за курсором
 * - Race condition fix: ждёт первого кабинета перед first drag
 */
export class DragDropController {
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private cabinetManager: CabinetManager;
    private equipmentManager: EquipmentManager;
    
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    
    private railHighlighter: RailHighlighter;
    
    private dragState: DragState;
    
    // Привязка контекста для обработчиков событий
    private _boundDragMove: (event: MouseEvent) => void;
    private _boundDragEnd: (event: MouseEvent) => void;
    
    // Хранилище bound-обработчиков mousedown для каждой карточки (предотвращение дубликатов)
    private _cardHandlers: WeakMap<HTMLElement, (event: MouseEvent) => void>;

    constructor({ camera, renderer, cabinetManager, equipmentManager }: DragDropControllerOptions) {
        this.camera = camera;
        this.renderer = renderer;
        this.cabinetManager = cabinetManager;
        this.equipmentManager = equipmentManager;
        
        // Raycasting для определения позиции курсора в 3D
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Подсветка реек
        this.railHighlighter = new RailHighlighter();
        
        // Состояние перетаскивания
        this.dragState = {
            active: false,
            equipmentType: null,
            equipmentConfig: null,
            ghostElement: null,
            sourceCard: null,
            targetRailIndex: null
        };
        
        // Привязка контекста для обработчиков событий
        this._boundDragMove = this._onDragMove.bind(this);
        this._boundDragEnd = this._onDragEnd.bind(this);
        
        // Хранилище bound-обработчиков mousedown для каждой карточки (предотвращение дубликатов)
        this._cardHandlers = new WeakMap();
    }

    /**
     * Публичная точка входа для React: обрабатывает onMouseDown карточки
     * Использует event.currentTarget как карточку
     */
    onReactMouseDown(event: React.MouseEvent<HTMLElement>): void {
        try {
            const currentTarget = event.currentTarget as HTMLElement;
            const closest = currentTarget?.closest?.('.equipment-card');
            const card = (closest && closest instanceof HTMLElement) ? closest : currentTarget;
            if (!card) return;
            this._onDragStart(event.nativeEvent as MouseEvent, card);
        } catch (e) {
            console.error('❌ onReactMouseDown error:', e);
        }
    }

    /**
     * Инициализация — привязка событий к DOM-элементам
     */
    initialize(equipmentCardsSelector: string = '.equipment-card'): void {
        const cards = document.querySelectorAll<HTMLElement>(equipmentCardsSelector);
        
        if (cards.length === 0) {
            console.warn('⚠️ DragDropController: не найдено карточек оборудования');
            return;
        }

        cards.forEach(card => {
            // Пропускаем если обработчик уже назначен (защита от дубликатов)
            if (this._cardHandlers.has(card)) {
                return;
            }
            
            // Отключаем нативный HTML5 drag & drop
            card.draggable = false;
            
            // Создаём bound-обработчик и сохраняем в WeakMap
            const handler = (e: MouseEvent) => this._onDragStart(e, card);
            this._cardHandlers.set(card, handler);
            
            // Слушаем mousedown для начала перетаскивания
            card.addEventListener('mousedown', handler);
        });

        console.log(`✅ DragDropController: инициализировано для ${cards.length} карточек`);
    }

    /**
     * Начало перетаскивания (mousedown на карточке)
     */
    private async _onDragStart(event: MouseEvent, card: HTMLElement): Promise<void> {
        // Игнорируем правый клик
        if (event.button !== 0) return;

        // Предотвращаем наложение drag операций
        if (this.dragState.active) {
            console.warn('⚠️ Drag уже активен, игнорируем новый клик');
            return;
        }

        // Проверяем активный шкаф НАПРЯМУЮ (не через флаг)
        const cabinetData = this.cabinetManager.getActiveCabinet();
        if (!cabinetData || !cabinetData.instance) {
            console.warn('⚠️ Шкаф не готов. activeCabinetId:', this.cabinetManager.activeCabinetId);
            return; // Просто выход, БЕЗ alert
        }

        // Извлекаем данные из data-атрибутов
        const equipmentType = card.dataset['equipmentType'];
        if (!equipmentType) {
            console.error('❌ У карточки нет data-equipment-type');
            return;
        }

        console.log(`🖱️ Начало drag: ${equipmentType}`);

        // Загружаем конфиг оборудования
        try {
            const config = await this.equipmentManager.loadEquipmentConfig(equipmentType);
            console.log(`📋 Загружена конфигурация:`, config);
            
            this.dragState = {
                active: true,
                equipmentType: equipmentType,
                equipmentConfig: config,
                ghostElement: this._createGhostElement(card, config),
                sourceCard: card,
                targetRailIndex: null
            };

            // Добавляем класс для визуального feedback
            card.classList.add('dragging');

            // Подсвечиваем все рейки слабым свечением
            const railMeshes = this._getRailMeshes();
            if (railMeshes.length > 0) {
                this.railHighlighter.highlightAll(railMeshes, 'dim');
            } else {
                console.warn('⚠️ Не найдено DIN-реек в активном шкафу');
            }

            // Привязываем глобальные обработчики
            document.addEventListener('mousemove', this._boundDragMove);
            document.addEventListener('mouseup', this._boundDragEnd);

            // Курсор
            document.body.style.cursor = 'grabbing';

        } catch (error: unknown) {
            console.error(`❌ Ошибка загрузки конфига оборудования [${equipmentType}]:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            if (errorStack) {
                console.error('  Stack trace:', errorStack);
            }
            alert(`Ошибка загрузки ${equipmentType}: ${errorMessage}`);
            
            // Очистка при ошибке: отвязываем обработчики и сбрасываем состояние
            document.removeEventListener('mousemove', this._boundDragMove);
            document.removeEventListener('mouseup', this._boundDragEnd);
            document.body.style.cursor = '';
            if (card) card.classList.remove('dragging');
            this._resetDragState();
            
            console.log('♻️ DragState сброшен после ошибки');
        }
    }

    /**
     * Движение мыши во время перетаскивания
     */
    private _onDragMove(event: MouseEvent): void {
        if (!this.dragState.active) return;

        // Обновляем позицию ghost-элемента
        if (this.dragState.ghostElement) {
            this.dragState.ghostElement.style.left = `${event.clientX + 15}px`;
            this.dragState.ghostElement.style.top = `${event.clientY + 15}px`;
        }

        // Raycasting для определения ближайшей рейки
        const railMeshes = this._getRailMeshes();
        if (railMeshes.length === 0) return;

        // Преобразуем координаты мыши в normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Настраиваем raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Проверяем пересечения с рейками
        const meshes = railMeshes.map(r => r.mesh);
        const intersects = this.raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0 && intersects[0]) {
            // Нашли ближайшую рейку
            const closestMesh = intersects[0].object as THREE.Mesh;
            const closestRail = railMeshes.find(r => r.mesh === closestMesh);
            
            if (closestRail) {
                if (this.dragState.targetRailIndex !== closestRail.index) {
                    this.dragState.targetRailIndex = closestRail.index;
                    this.railHighlighter.highlightOne(railMeshes, closestRail.index);
                    console.log(`🎯 Навели на рейку ${closestRail.index}: ${closestRail.name}`);
                }
            } else {
                console.warn('⚠️ Ближайшая рейка не найдена в списке');
            }
        } else {
            // Курсор вне реек — все слабо светятся
            if (this.dragState.targetRailIndex !== null) {
                this.dragState.targetRailIndex = null;
                this.railHighlighter.highlightAll(railMeshes, 'dim');
            }
        }
    }

    /**
     * Отпускание мыши — попытка разместить оборудование
     */
    private async _onDragEnd(_event: MouseEvent): Promise<void> {
        if (!this.dragState.active) return;

        console.log('🖱️ Конец drag');

        // КРИТИЧЕСКИ ВАЖНО: отвязываем обработчики В САМОМ НАЧАЛЕ
        // это предотвращает накопление обработчиков при множественных drag
        document.removeEventListener('mousemove', this._boundDragMove);
        document.removeEventListener('mouseup', this._boundDragEnd);
        document.body.style.cursor = '';

        const railMeshes = this._getRailMeshes();
        const targetRailIndex = this.dragState.targetRailIndex;

        // Убираем ghost-элемент
        if (this.dragState.ghostElement) {
            this.dragState.ghostElement.remove();
        }

        // Убираем класс dragging
        if (this.dragState.sourceCard) {
            this.dragState.sourceCard.classList.remove('dragging');
        }

        // Сбрасываем подсветку реек
        this.railHighlighter.reset(railMeshes);

        // Если курсор НЕ над рейкой — отмена
        if (targetRailIndex === null) {
            console.log('⚠️ Оборудование не размещено: курсор вне рейки');
            this._resetDragState();
            return;
        }

        // Пытаемся разместить оборудование
        try {
            const cabinet = this.cabinetManager.getActiveCabinet();
            if (!cabinet) {
                throw new Error('Активный шкаф не найден');
            }
            
            // Получаем стратегию по типу монтажа из конфига оборудования
            const mountType = this.dragState.equipmentConfig?.mounting?.type || 'din_rail';
            const strategy = cabinet.strategies.get(mountType);

            if (!strategy) {
                throw new Error('У шкафа нет стратегии монтажа');
            }

            // Проверяем наличие метода для автопоиска позиции
            const findNextAvailableSlot = (strategy as { findNextAvailableSlot?: (width: number, railIndex: number) => { railIndex: number; xOffset: number } | null }).findNextAvailableSlot;
            if (typeof findNextAvailableSlot !== 'function') {
                throw new Error('Стратегия не поддерживает findNextAvailableSlot()');
            }

            // Определяем ширину оборудования
            const equipmentWidth = this.dragState.equipmentConfig?.dimensions?.width || 0.018; // дефолт 18мм

            // Ищем свободную позицию, начиная с целевой рейки
            const slot = findNextAvailableSlot(equipmentWidth, targetRailIndex);

            if (!slot) {
                throw new Error('Нет свободного места на DIN-рейках');
            }

            // Добавляем оборудование через EquipmentManager
            if (!this.dragState.equipmentType) {
                throw new Error('Тип оборудования не указан');
            }
            const equipmentId = await this.equipmentManager.addEquipment(
                this.dragState.equipmentType,
                slot.railIndex,
                null,
                cabinet.id
            );

            if (!equipmentId) {
                throw new Error('Не удалось добавить оборудование');
            }

            // Анимация плавного появления
            this._animateEquipmentAppearance(equipmentId);
            console.log(`✅ Оборудование размещено: ${equipmentId} на рейку ${slot.railIndex}`);

        } catch (error: unknown) {
            console.error('❌ Ошибка размещения оборудования:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`⚠️ ${errorMessage}`);
        } finally {
            this._resetDragState();
        }
    }

    /**
     * Создать DOM-элемент миниатюры (ghost)
     */
    private _createGhostElement(sourceCard: HTMLElement, config: EquipmentConfig): HTMLElement {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            background: white;
            border: 2px solid #3498db;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0.9;
            transform: scale(0.8);
            max-width: 150px;
        `;

        // Клонируем иконку/изображение из карточки
        const icon = sourceCard.querySelector('img, svg');
        if (icon) {
            const clonedIcon = icon.cloneNode(true) as HTMLElement;
            clonedIcon.style.cssText = 'width: 60px; height: 60px; display: block; margin: 0 auto;';
            ghost.appendChild(clonedIcon);
        }

        // Название оборудования
        const name = document.createElement('div');
        name.textContent = config.name || this.dragState.equipmentType || '';
        name.style.cssText = 'font-size: 11px; text-align: center; margin-top: 4px; color: #333;';
        ghost.appendChild(name);

        document.body.appendChild(ghost);
        return ghost;
    }

    /**
     * Получить список DIN-реек из активного шкафа
     */
    private _getRailMeshes(): RailMeshInfo[] {
        const cabinet = this.cabinetManager.getActiveCabinet();
        if (!cabinet) return [];

        const instance = cabinet.instance;
        const components = instance.getComponents ? instance.getComponents() : {};
        const railMeshes: RailMeshInfo[] = [];

        // Универсальный поиск: dinRail*, rail*, DINRail* (регистронезависимо)
        Object.entries(components).forEach(([name, object]) => {
            const obj = object as THREE.Object3D;
            const lowerName = name.toLowerCase();
            if (lowerName.includes('dinrail') || lowerName.includes('rail')) {
                // Извлекаем ПОСЛЕДНИЙ индекс из имени (din_rail40_700_500_250_1 → 1, din_rail40_700_500_250_2 → 2, etc.)
                const matches = name.match(/\d+/g);
                const lastMatch = matches && matches.length > 0 ? matches[matches.length - 1] : null;
                const index = lastMatch ? parseInt(lastMatch) - 1 : railMeshes.length;
                
                // Рейки — это Group → Group → [Line, Line, ..., Mesh]
                // Mesh находится глубоко внутри для raycasting
                let actualMesh: THREE.Mesh | null = null;
                
                obj.traverse((child: THREE.Object3D) => {
                    if ((child as THREE.Mesh).isMesh && !actualMesh) {
                        actualMesh = child as THREE.Mesh;
                    }
                });
                
                if (actualMesh) {
                    railMeshes.push({ mesh: actualMesh, index, name });
                } else {
                    console.warn(`⚠️ Рейка ${name} не содержит Mesh-объектов`);
                }
            }
        });

        // Сортируем по индексу
        railMeshes.sort((a, b) => a.index - b.index);

        return railMeshes;
    }

    /**
     * Анимация плавного появления оборудования (slide-up вместо fade-in)
     */
    private _animateEquipmentAppearance(equipmentId: string): void {
        const item = this.equipmentManager.getEquipment(equipmentId);
        if (!item || !item.mesh) {
            console.warn(`⚠️ Анимация: оборудование ${equipmentId} не найдено`);
            return;
        }

        const mesh = item.mesh;
        console.log(`🎬 Запуск slide-up анимации для ${equipmentId}`);
        
        // Сохраняем финальную позицию
        const finalY = mesh.position.y;
        const startY = finalY - 0.05; // Начинаем на 5см ниже
        
        mesh.position.y = startY;

        // Анимация через requestAnimationFrame
        const duration = ANIMATION.DRAG_ANIMATION_DURATION_MS;
        const startTime = Date.now();

        const animate = (): void => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);

            // Плавно поднимаем вверх
            mesh.position.y = startY + ((finalY - startY) * eased);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                mesh.position.y = finalY;
                console.log(`✅ Slide-up анимация завершена для ${equipmentId}`);
            }
        };

        animate();
    }

    /**
     * Сброс состояния drag
     */
    private _resetDragState(): void {
        this.dragState = {
            active: false,
            equipmentType: null,
            equipmentConfig: null,
            ghostElement: null,
            sourceCard: null,
            targetRailIndex: null
        };
    }

    /**
     * Отключить drag & drop (cleanup)
     */
    dispose(): void {
        document.removeEventListener('mousemove', this._boundDragMove);
        document.removeEventListener('mouseup', this._boundDragEnd);
        
        if (this.dragState.ghostElement) {
            this.dragState.ghostElement.remove();
        }

        this.railHighlighter.dispose();
        this._resetDragState();
        
        console.log('♻️ DragDropController: очищен');
    }
}

