/**
 * CabinetModel — класс для работы с отдельным экземпляром шкафа
 * Загружает GLTF-модель, управляет дверцей, оборудованием, материалами
 */

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { DRACOLoader } from '../libs/DRACOLoader.js';
import { Tween, Easing, Group } from '../libs/tween.esm.js';

// Создаём глобальную группу для всех TWEEN-анимаций шкафов
const tweenGroup = new Group();

export class CabinetModel {
    constructor(modelPath, config = {}, renderer = null, sceneManager = null) {
        this.modelPath = modelPath;
        this.renderer = renderer;  // ← Для получения maxAnisotropy
        this.sceneManager = sceneManager;  // ← Для управления внутренним светом
        this.config = {
            type: config.type || 'floor', // 'floor' или 'wall'
            width: config.width || 0.7,    // метры (0.7 м = 700 мм)
            height: config.height || 0.5,  // метры (0.5 м = 500 мм)
            depth: config.depth || 0.24,   // метры (0.24 м = 240 мм)
            name: config.name || 'Cabinet'
        };
        
        this.id = this.generateId();
        this.model = null; // Группа с загруженной моделью
        this.gltf = null;  // Исходный GLTF-объект
        this.boundingBox = null;
        this.door = null;  // Ссылка на дверцу (если найдена)
        this.doorInitialRotation = null; // Исходный поворот дверцы
        this.isDoorOpen = false;
        this.dinRails = []; // Массив DIN-реек
        this.equipment = []; // Оборудование на рейках
        
        // Позиция и ориентация
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Угол в радианах
        
        // Состояние выбора
        this.isSelected = false;
        this.selectionBox = null; // Визуальная рамка выбора
        this.pivotOffset = new THREE.Vector3(0, 0, 0);
        
        // Loader
        this.loader = new GLTFLoader();
        
        // Промис загрузки
        this.loadPromise = this.load();
    }
    
    generateId() {
        return `cabinet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async load() {
        console.log('🔄 CabinetModel.load() начат для:', this.modelPath);
        
        // Настраиваем DRACOLoader для поддержки сжатых моделей
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/libs/draco/');  // Путь к WASM-декодерам
        dracoLoader.setDecoderConfig({ type: 'js' });    // 'js' или 'wasm' (авто-выбор)
        this.loader.setDRACOLoader(dracoLoader);
        console.log('✅ DRACOLoader настроен для поддержки сжатых моделей');
        
        return new Promise((resolve, reject) => {
            this.loader.load(
                this.modelPath,
                async (gltf) => {  // ✅ Добавьте async здесь
                    console.log('✅ GLTF загружен успешно:', this.modelPath);
                    this.model = gltf.scene;
                    this.model.userData.cabinetId = this.id;
                    this.model.userData.isCabinet = true;
                    console.log('  📦 Модель создана, ID:', this.id);
                    this.model.scale.set(1, 1, 1);

                    // ОДИН traverse для всех операций (userData, тени, материалы)
                    let meshCount = 0;
                    const maxAnisotropy = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 16;
                    
                    this.model.traverse((child) => {
                        // Установить cabinetId для raycasting
                        child.userData.cabinetId = this.id;
                        
                        // Настроить mesh (тени + материалы)
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            meshCount++;
                            
                            // Коррекция материалов KeyShot (inline, без повторного traverse)
                            if (child.material) {
                                const materials = Array.isArray(child.material) ? child.material : [child.material];
                                materials.forEach(mat => {
                                    // Конвертация цвета Linear → sRGB
                                    if (mat.color) {
                                        mat.color.convertLinearToSRGB();
                                    }
                                    // Конвертация эмиссии (если есть)
                                    if (mat.emissive) {
                                        mat.emissive.convertLinearToSRGB();
                                    }
                                    // Установка envMapIntensity по умолчанию
                                    if (mat.envMapIntensity === undefined) {
                                        mat.envMapIntensity = 1.0;
                                    }
                                    // Анизотропная фильтрация для всех текстур
                                    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(texName => {
                                        if (mat[texName]) {
                                            if (texName === 'map') {
                                                mat[texName].colorSpace = THREE.SRGBColorSpace;
                                            }
                                            mat[texName].anisotropy = maxAnisotropy;
                                            mat[texName].needsUpdate = true;
                                        }
                                    });
                                    mat.needsUpdate = true;
                                });
                            }
                        }
                    });

                    // Вычислить Box3 для позиционирования
                    const box = new THREE.Box3().setFromObject(this.model);
                    const center = box.getCenter(new THREE.Vector3());
                    
                    // Установить позицию (центрировать по XZ, Y на полу)
                    this.pivotOffset.set(-center.x, -box.min.y, -center.z);
                    this.model.position.copy(this.pivotOffset);
                    
                    // 🔍 ДИАГНОСТИКА: Проверка размеров и смещений
                    const size = box.getSize(new THREE.Vector3());
                    console.log(`  📍 Pivot offset (центрирование):`);
                    console.log(`     X: ${this.pivotOffset.x.toFixed(4)} м (центр: ${center.x.toFixed(4)})`);
                    console.log(`     Y: ${this.pivotOffset.y.toFixed(4)} м (min.y: ${box.min.y.toFixed(4)})`);
                    console.log(`     Z: ${this.pivotOffset.z.toFixed(4)} м (центр: ${center.z.toFixed(4)})`);
                    console.log(`  📦 Размеры: ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)} м`);
                    
                    // Кешировать boundingBox (избегаем повторных вычислений)
                    this.boundingBox = box.clone();
                    
                    console.log(`  ✅ Модель загружена: ${meshCount} mesh`);
                    
                    // Материалы уже обработаны в основном traverse выше (оптимизация)
                    
                    // ═══════════════════════════════════════════════════════════════
                    // ❌ ПЕРЕКРАСКА ОТКЛЮЧЕНА — используем материалы из KeyShot
                    // ═══════════════════════════════════════════════════════════════
                    /*
                    // Принудительно заменить материал для всех основных mesh
                    console.log(`🎨 Перекраска модели в цвет:`, this.config.color.toString(16));
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            console.log(`  Mesh: ${child.name}, материал:`, child.material?.type, 'map:', !!child.material?.map);
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else if (child.material) {
                                child.material.dispose();
                            }
                            child.material = new THREE.MeshStandardMaterial({
                                color: this.config.color,
                                metalness: 0.3,
                                roughness: 0.7,
                                map: null // Сбросить текстуру
                            });
                            child.material.needsUpdate = true;
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    */
                    console.log('✅ Материалы из KeyShot сохранены (перекраска отключена)');
                    
                    // Найти дверцу (по имени объекта в GLTF) - СНАЧАЛА помечаем части
                    console.log('🔍 Поиск дверцы...');
                    this.findDoor();
                    console.log('  Дверца найдена:', !!this.door);
                    
                    // Найти DIN-рейки
                    console.log('🔍 Поиск DIN-реек...');
                    this.findDinRails();
                    console.log('  DIN-рейки найдены:', this.dinRails.length);
                    
                    // Раскраска отдельных частей по цветовой схеме (если передана)
                    console.log('🎨 Применение цветовой схемы...');
                    // this.applyPartColors();  // ← ОТКЛЮЧЕНО для проверки текстур из KeyShot
                    console.log('  ✅ Цветовая схема применена (ПРОПУЩЕНА)');
                    
                    // Вычислить bounding box ПОСЛЕ всех трансформаций
                    console.log('📦 Вычисление bounding box...');
                    this.updateBoundingBox();
                    console.log('  BBox:', this.boundingBox);
                    
                    // === ОПТИМИЗАЦИЯ: BVH для ускорения raycasting ===
                    console.log('⚡ Оптимизация геометрии (BVH)...');
                    this.optimizeGeometry();
                    
                    // Создать рамку выбора (невидимую по умолчанию)
                    console.log('🔲 Создание рамки выбора...');
                    this.createSelectionBox();
                    
                    // Установить начальную позицию
                    console.log('📍 Установка начальной позиции:', this.position);
                    this.setPosition(this.position);
                    
                    console.log('✅✅✅ CabinetModel.load() ЗАВЕРШЁН УСПЕШНО ✅✅✅');
                    resolve(this);
                },
                (progress) => {
                    // Опционально: показ прогресса загрузки
                },
                (error) => {
                    console.error(`❌ Ошибка загрузки модели ${this.modelPath}:`, error);
                    console.error(`  Тип ошибки: ${error.constructor.name}`);
                    console.error(`  Сообщение: ${error.message}`);
                    reject(error);
                }
            );
        });
    }
    
    findDoor() {
        // Поиск объекта с именем 'door', 'Door', 'DOOR', 'дверь' и т.д.
        const doorNames = ['door', 'Door', 'DOOR', 'дверь', 'Дверь', 'дверца', 'Дверца'];
        
        this.model.traverse((child) => {
            const childNameLower = child.name.toLowerCase();
            if (doorNames.some(name => childNameLower.includes(name.toLowerCase()))) {
                this.door = child;
                this.door.userData.isDoor = true;
                
                // Сохранить исходные углы поворота (КОПИРУЕМ ЗНАЧЕНИЯ, а не ссылку!)
                this.doorInitialRotation = {
                    x: child.rotation.x,
                    y: child.rotation.y,
                    z: child.rotation.z,
                    order: child.rotation.order
                };
            }
        });
        
        if (!this.door) {
            console.warn(`  ⚠ Дверца не найдена в модели ${this.config.name}`);
            console.warn(`    Доступные узлы:`, this.getAllNodeNames());
        }
    }
    
    findDinRails() {
        // Поиск DIN-реек (по имени 'din', 'rail', 'DIN_Rail' и т.д.)
        const railNames = ['din', 'rail', 'DIN', 'RAIL', 'рейка'];
        
        this.model.traverse((child) => {
            const childNameLower = child.name.toLowerCase();
            if (railNames.some(name => childNameLower.includes(name.toLowerCase()))) {
                this.dinRails.push(child);
                child.userData.isDinRail = true;
            }
        });
        
        if (this.dinRails.length === 0) {
            console.warn(`DIN-рейки не найдены в модели ${this.config.name}`);
        }
    }
    
    getAllNodeNames() {
        const names = [];
        this.model.traverse((child) => {
            names.push(`${child.name} (${child.type})`);
        });
        return names;
    }
    
    updateBoundingBox() {
        const box = new THREE.Box3().setFromObject(this.model);
        this.boundingBox = box;
    }
    
    createSelectionBox() {
        if (!this.boundingBox) return;
        
        const size = new THREE.Vector3();
        this.boundingBox.getSize(size);
        const center = new THREE.Vector3();
        this.boundingBox.getCenter(center);
        const localCenter = center.clone();
        if (this.model) {
            this.model.worldToLocal(localCenter);
        }

        const wasVisible = this.selectionBox ? this.selectionBox.visible : false;

        if (this.selectionBox) {
            if (this.selectionBox.geometry) this.selectionBox.geometry.dispose();
            if (this.selectionBox.material) this.selectionBox.material.dispose();
            this.model.remove(this.selectionBox);
            this.selectionBox = null;
        }
        
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });
        this.selectionBox = new THREE.LineSegments(edges, material);
        this.selectionBox.position.copy(localCenter);
        this.selectionBox.visible = wasVisible;
        this.model.add(this.selectionBox);
    }
    
    setPosition(position) {
        this.position.copy(position);
        
        if (this.model) {
            // Для напольных шкафов Y=0 (на полу)
            if (this.config.type === 'floor') {
                this.model.position.set(
                    position.x + this.pivotOffset.x,
                    this.pivotOffset.y,
                    position.z + this.pivotOffset.z
                );
            } else {
                // Для подвесных — устанавливаем заданную позицию
                this.model.position.set(
                    position.x + this.pivotOffset.x,
                    position.y + this.pivotOffset.y,
                    position.z + this.pivotOffset.z
                );
            }
        }
    }
    
    setRotation(angleRadians, animate = false) {
        if (!animate) {
            // Мгновенный поворот
            this.rotation = angleRadians;
            if (this.model) {
                this.model.rotation.y = angleRadians;
            }
        } else {
            // Плавный поворот через TWEEN
            this.animateRotation(angleRadians);
        }
    }
    
    animateRotation(targetRotation) {
        if (!this.model) return;
        
        const startRotation = this.model.rotation.y;
        const duration = 400; // мс
        
        // Используем TWEEN для плавной анимации с явной группой
        new Tween(this.model.rotation, tweenGroup)
            .to({ y: targetRotation }, duration)
            .easing(Easing.Cubic.InOut) // Плавное ускорение и замедление
            .onUpdate(() => {
                // Обновляем внутреннее значение rotation
                this.rotation = this.model.rotation.y;
                this.model.updateMatrixWorld(true);
            })
            .onComplete(() => {
                this.rotation = targetRotation;
            })
            .start();
    }
    
    /**
     * Обеспечивает, чтобы модель не уходила ниже плоскости пола (y=0)
     */
    ensureOnFloor() {
        if (!this.model || this.config.type !== 'floor') return;
        
        // Обновить bounding box с учетом текущего масштаба и позиции
        this.updateBoundingBox();
        
        if (!this.boundingBox) return;
        
        // Проверить, не ушла ли модель ниже плоскости пола
        if (this.boundingBox.min.y < 0) {
            // Вычислить, на сколько нужно поднять модель
            const offsetY = -this.boundingBox.min.y;
            
            // Поднять модель на необходимую высоту (сохраняем x и z)
            this.model.position.y += offsetY;
            
            // Обновить матрицу преобразования
            this.model.updateMatrixWorld(true);
            
            // Пересчитать bounding box после изменения позиции
            this.updateBoundingBox();
            
            if (this.boundingBox.min.y >= 0) {
                const center = new THREE.Vector3();
                this.boundingBox.getCenter(center);
                this.pivotOffset.y = this.model.position.y - center.y;
            }
            
            console.log(`  📐 Модель поднята на ${offsetY.toFixed(2)} мм для предотвращения ухода ниже пола`);
        }
    }
    
    setTexture(textureUrl) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(textureUrl, (texture) => {
            this.model.traverse((child) => {
                if (child.isMesh && !child.userData.isDoor) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.map = texture;
                            mat.needsUpdate = true;
                        });
                    } else if (child.material) {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    }
                }
            });
        });
    }
    
    toggleDoor(animate = true) {
        if (!this.door) {
            console.warn('Дверца не найдена');
            return Promise.resolve(); // Возвращаем resolved Promise
        }
        
        this.isDoorOpen = !this.isDoorOpen;
        
        // ========== ВЫБОР ОСИ ВРАЩЕНИЯ ==========
        const ROTATION_AXIS = 'y'; // 'x', 'y' или 'z'
        // ========================================
        
        // Учитываем исходный поворот модели по выбранной оси
        const baseRotation = this.doorInitialRotation[ROTATION_AXIS];
        const targetRotation = this.isDoorOpen ? baseRotation - Math.PI / 2 : baseRotation; // Минус для открытия в другую сторону
        
        if (animate) {
            // Возвращаем Promise, который резолвится после анимации
            return this.animateDoor(targetRotation, ROTATION_AXIS);
        } else {
            this.door.rotation[ROTATION_AXIS] = targetRotation;
            this.door.updateMatrixWorld(true);
            
            // 🔦 Управление внутренним светом (включается при открытии, выключается при закрытии)
            if (this.sceneManager && this.sceneManager.setInteriorLight) {
                this.sceneManager.setInteriorLight(this.isDoorOpen, this.model);
            }
            
            return Promise.resolve();
        }
    }
    
    animateDoor(targetRotation, axis = 'y') {
        const startRotation = this.door.rotation[axis];
        const duration = 600; // мс
        
        return new Promise((resolve) => {
            // Используем TWEEN для плавной анимации с явной группой
            new Tween(this.door.rotation, tweenGroup)
                .to({ [axis]: targetRotation }, duration)
                .easing(Easing.Cubic.InOut) // Плавное ускорение и замедление
                .onUpdate(() => {
                    this.door.updateMatrixWorld(true);
                })
                .onComplete(() => {
                    // 🔦 Управление внутренним светом (включается при открытии, выключается при закрытии)
                    if (this.sceneManager && this.sceneManager.setInteriorLight) {
                        this.sceneManager.setInteriorLight(this.isDoorOpen, this.model);
                    }
                    console.log('✅ Анимация двери завершена');
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * РЕЖИМ СБОРКИ: Полный вход
     * 1. Поворот шкафа на 180° (дверью к камере)
     * 2. Открытие двери
     * 3. Масштабирование панели + DIN-реек до 300%
     */
    enterAssemblyMode() {
        console.log('🚀 CabinetModel.enterAssemblyMode() начат');
        
        // Найти панель
        const panel = this.model.getObjectByName('PANEL_003') || 
                      this.model.getObjectByName('PANEL.003') ||
                      this.model.getObjectByName('PANEL003');
        
        if (!panel) {
            console.error('❌ Панель для сборки не найдена');
            return Promise.reject(new Error('Panel not found'));
        }
        
        const body = this.model.getObjectByName('BODY');
        if (!body) {
            console.warn('⚠️ BODY не найден');
        } else {
            const bodyBox = new THREE.Box3().setFromObject(body);
            console.log('📦 BODY границы: minY =', bodyBox.min.y.toFixed(4), 'м');
        }
        
        // Проверка иерархии DIN-реек (для отладки)
        console.log('🔍 Проверка иерархии объектов:');
        console.log('  PANEL:', panel.name);
        this.dinRails.forEach(rail => {
            let isChildOfPanel = false;
            let parent = rail.parent;
            const parentChain = [rail.name];
            
            while (parent) {
                parentChain.push(parent.name);
                if (parent === panel) {
                    isChildOfPanel = true;
                    break;
                }
                parent = parent.parent;
            }
            
            console.log(`  ${rail.name}: ${parentChain.reverse().join(' → ')} [дочерний панели: ${isChildOfPanel}]`);
        });
        
        this.assemblyState = {
            originalRotation: this.model.rotation.y,
            isDoorOpen: this.isDoorOpen,
            panelScale: panel.scale.clone(),
            panelPositionY: panel.position.y,
            dinRailScales: this.dinRails.map(r => r.scale.clone()),
            dinRailPositionsY: this.dinRails.map(r => r.position.y)
        };
        
        console.log('💾 Состояние сохранено:', this.assemblyState);
        
        return new Promise((resolve) => {
            if (!this.isDoorOpen && this.door) {
                this.toggleDoor(true).then(() => {
                    this.scaleAssemblyPanelInternal(panel, 3.0, body, () => {
                        resolve();
                    });
                });
            } else {
                this.scaleAssemblyPanelInternal(panel, 3.0, body, () => {
                    resolve();
                });
            }
        });
    }
    
    /**
     * РЕЖИМ СБОРКИ: Полный выход
     * Возврат к исходному состоянию
     */
    exitAssemblyMode() {
        console.log('🔙 CabinetModel.exitAssemblyMode() начат');
        
        if (!this.assemblyState) {
            console.warn('⚠️ Состояние сборки не сохранено');
            return Promise.resolve();
        }
        
        const state = this.assemblyState;
        const panel = this.model.getObjectByName('PANEL_003') || 
                      this.model.getObjectByName('PANEL.003') ||
                      this.model.getObjectByName('PANEL003');
        
        if (!panel) {
            return Promise.reject(new Error('Panel not found'));
        }
        
        const body = this.model.getObjectByName('BODY');
        
        return new Promise((resolve) => {
            this.scaleAssemblyPanelInternal(panel, 1.0, body, () => {
                if (!state.isDoorOpen && this.isDoorOpen && this.door) {
                    this.toggleDoor(true).then(() => {
                        this.assemblyState = null;
                        resolve();
                    });
                } else {
                    this.assemblyState = null;
                    resolve();
                }
            });
        });
    }
    
    /**
     * Внутренний метод масштабирования панели и DIN-реек до 300% (режим сборки)
     */
    scaleAssemblyPanelInternal(panel, targetScale, body, callback) {
        const duration = 800;
        let completed = 0;
        const total = 1 + this.dinRails.length; // панель + все рейки
        
        const checkComplete = () => {
            completed++;
            if (completed === total && callback) {
                callback();
            }
        };
        
        const yOffset = (targetScale > 1.0) ? 0.001 : -0.001;
        
        // Анимация панели
        new Tween({ 
            scaleX: panel.scale.x, 
            scaleY: panel.scale.y, 
            scaleZ: panel.scale.z,
            posY: panel.position.y
        }, tweenGroup)
            .to({ 
                scaleX: targetScale, 
                scaleY: targetScale, 
                scaleZ: targetScale,
                posY: panel.position.y + yOffset  // ← Простое смещение!
            }, duration)
            .easing(Easing.Cubic.InOut)
            .onUpdate((obj) => {
                panel.scale.set(obj.scaleX, obj.scaleY, obj.scaleZ);
                panel.position.y = obj.posY;
                panel.updateMatrixWorld(true);
            })
            .onComplete(() => {
                checkComplete();
            })
            .start();
        
        this.dinRails.forEach(rail => {
            let isChildOfPanel = false;
            let parent = rail.parent;
            while (parent) {
                if (parent === panel) {
                    isChildOfPanel = true;
                    break;
                }
                parent = parent.parent;
            }
            
            const railTargetScale = isChildOfPanel ? 1.0 : targetScale;
            
            // Анимация рейки
            new Tween({ 
                scaleX: rail.scale.x, 
                scaleY: rail.scale.y, 
                scaleZ: rail.scale.z,
                posY: rail.position.y
            }, tweenGroup)
                .to({ 
                    scaleX: railTargetScale, 
                    scaleY: railTargetScale, 
                    scaleZ: railTargetScale,
                    posY: rail.position.y + yOffset  // ← Простое смещение!
                }, duration)
                .easing(Easing.Cubic.InOut)
                .onUpdate((obj) => {
                    rail.scale.set(obj.scaleX, obj.scaleY, obj.scaleZ);
                    rail.position.y = obj.posY;
                    rail.updateMatrixWorld(true);
                })
                .onComplete(checkComplete)
                .start();
        });
    }
    
    /**
     * Вернуть поворот шкафа к исходному
     */
    rotateToOriginal(originalRotation, callback) {
        console.log('🔄 Возврат поворота...');
        
        new Tween(this.model.rotation, tweenGroup)
            .to({ y: originalRotation }, 1000)
            .easing(Easing.Cubic.InOut)
            .onUpdate(() => {
                this.model.updateMatrixWorld(true);
            })
            .onComplete(() => {
                console.log('✅ Режим обзора восстановлен');
                this.assemblyState = null;
                if (callback) callback();
            })
            .start();
    }
    
    setSelected(selected) {
        this.isSelected = selected;
        if (this.selectionBox) {
            this.selectionBox.visible = selected;
        }
    }
    
    addEquipment(equipmentModel, railIndex = 0) {
        if (railIndex >= this.dinRails.length) {
            console.warn('Индекс DIN-рейки вне диапазона');
            return false;
        }
        
        const rail = this.dinRails[railIndex];
        
        const railWorldPos = new THREE.Vector3();
        rail.getWorldPosition(railWorldPos);
        
        const offset = this.equipment.filter(eq => eq.railIndex === railIndex).length * 0.05;
        
        // Установить локальную позицию относительно шкафа
        equipmentModel.position.copy(rail.position);
        equipmentModel.position.x += offset;
        
        equipmentModel.position.z += 0.1;
        
        this.model.add(equipmentModel);
        this.equipment.push({ model: equipmentModel, railIndex });
        
        return true;
    }
    
    removeEquipment(equipmentModel) {
        const index = this.equipment.findIndex(eq => eq.model === equipmentModel);
        if (index !== -1) {
            this.model.remove(equipmentModel);
            this.equipment.splice(index, 1);
            return true;
        }
        return false;
    }
    
    getBoundingBox() {
        if (this.model) {
            const box = new THREE.Box3().setFromObject(this.model);
            return box;
        }
        return this.boundingBox;
    }
    
    clone() {
        // Клонирование шкафа (новый экземпляр с той же моделью)
        const clonedConfig = { ...this.config };
        const cloned = new CabinetModel(this.modelPath, clonedConfig);
        return cloned;
    }
    
    dispose() {
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    // Удалить BVH перед удалением геометрии
                    if (child.geometry.boundsTree) {
                        child.geometry.disposeBoundsTree();
                    }
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
    
    /**
     * Оптимизация геометрии для ускорения raycasting через BVH
     * Строит Bounding Volume Hierarchy для всех мешей модели
     */
    optimizeGeometry() {
        let meshCount = 0;
        let optimizedCount = 0;
        
        this.model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                meshCount++;
                
                // Построить BVH дерево для геометрии
                if (typeof child.geometry.computeBoundsTree === 'function') {
                    child.geometry.computeBoundsTree();
                    optimizedCount++;
                }
            }
        });
    }
}

// Экспортируем группу для обновления в SceneManager
export { tweenGroup };
