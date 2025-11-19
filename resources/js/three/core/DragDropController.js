import * as THREE from 'three';
import { RailHighlighter } from '../utils/RailHighlighter.js';

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
    constructor({ scene, camera, renderer, cabinetManager, equipmentManager, eventBus = null }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.cabinetManager = cabinetManager;
        this.equipmentManager = equipmentManager;
        this.eventBus = eventBus;
        
        // Raycasting для определения позиции курсора в 3D
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Подсветка реек
        this.railHighlighter = new RailHighlighter();
        
        // Состояние перетаскивания
        this.dragState = {
            active: false,              // Активен ли drag
            equipmentType: null,        // Тип оборудования (из data-equipment-type)
            equipmentConfig: null,      // Конфиг из JSON
            ghostElement: null,         // DOM-элемент миниатюры
            sourceCard: null,           // Исходная карточка оборудования
            targetRailIndex: null       // Индекс рейки под курсором
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
    onReactMouseDown(event) {
        try {
            const card = event.currentTarget?.closest?.('.equipment-card') || event.currentTarget;
            if (!card) return;
            this._onDragStart(event, card);
        } catch (e) {
            console.error('❌ onReactMouseDown error:', e);
        }
    }

    /**
     * Инициализация — привязка событий к DOM-элементам
     * @param {string} equipmentCardsSelector - Селектор карточек оборудования
     */
    initialize(equipmentCardsSelector = '.equipment-card') {
        const cards = document.querySelectorAll(equipmentCardsSelector);
        
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
            const handler = (e) => this._onDragStart(e, card);
            this._cardHandlers.set(card, handler);
            
            // Слушаем mousedown для начала перетаскивания
            card.addEventListener('mousedown', handler);
        });

        console.log(`✅ DragDropController: инициализировано для ${cards.length} карточек`);
    }

    /**
     * Начало перетаскивания (mousedown на карточке)
     */
    async _onDragStart(event, card) {
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
            console.warn('⚠️ Шкаф не готов. activeCabinetId:', this.cabinetManager.activeCabinetId, 'cabinets.size:', this.cabinetManager.cabinets.size);
            return; // Просто выход, БЕЗ alert
        }
        const cabinet = cabinetData.instance;

        // Извлекаем данные из data-атрибутов
        const equipmentType = card.dataset.equipmentType;
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

        } catch (error) {
            console.error(`❌ Ошибка загрузки конфига оборудования [${equipmentType}]:`, error);
            console.error('  Stack trace:', error.stack);
            alert(`Ошибка загрузки ${equipmentType}: ${error.message}`);
            
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
    _onDragMove(event) {
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

        if (intersects.length > 0) {
            // Нашли ближайшую рейку
            const closestMesh = intersects[0].object;
            const closestRail = railMeshes.find(r => r.mesh === closestMesh);
            
            if (closestRail && this.dragState.targetRailIndex !== closestRail.index) {
                this.dragState.targetRailIndex = closestRail.index;
                this.railHighlighter.highlightOne(railMeshes, closestRail.index);
                console.log(`🎯 Навели на рейку ${closestRail.index}: ${closestRail.name}`);
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
    async _onDragEnd(event) {
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
            const strategy = cabinet?.instance?.mountingStrategy;

            if (!strategy) {
                throw new Error('У шкафа нет стратегии монтажа');
            }

            // Проверяем наличие метода для автопоиска позиции
            if (typeof strategy.findNextAvailableSlot !== 'function') {
                throw new Error('Стратегия не поддерживает findNextAvailableSlot()');
            }

            // Определяем ширину оборудования
            const equipmentWidth = this.dragState.equipmentConfig?.dimensions?.width || 0.018; // дефолт 18мм

            // Ищем свободную позицию, начиная с целевой рейки
            const slot = strategy.findNextAvailableSlot(equipmentWidth, targetRailIndex);

            if (!slot) {
                throw new Error('Нет свободного места на DIN-рейках');
            }

            // Добавляем оборудование через EquipmentManager
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

        } catch (error) {
            console.error('❌ Ошибка размещения оборудования:', error);
            alert(`⚠️ ${error.message}`);
        } finally {
            this._resetDragState();
        }
    }

    /**
     * Создать DOM-элемент миниатюры (ghost)
     */
    _createGhostElement(sourceCard, config) {
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
            const clonedIcon = icon.cloneNode(true);
            clonedIcon.style.cssText = 'width: 60px; height: 60px; display: block; margin: 0 auto;';
            ghost.appendChild(clonedIcon);
        }

        // Название оборудования
        const name = document.createElement('div');
        name.textContent = config.name || this.dragState.equipmentType;
        name.style.cssText = 'font-size: 11px; text-align: center; margin-top: 4px; color: #333;';
        ghost.appendChild(name);

        document.body.appendChild(ghost);
        return ghost;
    }

    /**
     * Получить список DIN-реек из активного шкафа
     */
    _getRailMeshes() {
        const cabinet = this.cabinetManager.getActiveCabinet();
        if (!cabinet) return [];

        const components = cabinet.instance.getComponents();
        const railMeshes = [];

        // Универсальный поиск: dinRail*, rail*, DINRail* (регистронезависимо)
        Object.entries(components).forEach(([name, object]) => {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('dinrail') || lowerName.includes('rail')) {
                // Извлекаем ПОСЛЕДНИЙ индекс из имени (din_rail40_700_500_250_1 → 1, din_rail40_700_500_250_2 → 2, etc.)
                const matches = name.match(/\d+/g);
                const index = matches ? parseInt(matches[matches.length - 1]) - 1 : railMeshes.length;
                
                // Рейки — это Group → Group → [Line, Line, ..., Mesh]
                // Mesh находится глубоко внутри для raycasting
                let actualMesh = null;
                
                object.traverse((child) => {
                    if (child.isMesh && !actualMesh) {
                        actualMesh = child;
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
    _animateEquipmentAppearance(equipmentId) {
        const item = this.equipmentManager.equipment.get(equipmentId);
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
        const duration = 300; // 300мс
        const startTime = Date.now();

        const animate = () => {
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
    _resetDragState() {
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
    dispose() {
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
