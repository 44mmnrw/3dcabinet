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
            width: config.width || 700,    // мм
            height: config.height || 500,  // мм
            depth: config.depth || 240,    // мм
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
                    
                    // ВАЖНО: Установить cabinetId на всех дочерних объектах для raycasting
                    this.model.traverse((child) => {
                        child.userData.cabinetId = this.id;
                    });
                    
                    // ═══════════════════════════════════════════════════════════════
                    // 📏 ДИАГНОСТИКА РАЗМЕРОВ ШКАФА
                    // ═══════════════════════════════════════════════════════════════
                    const initialBox = new THREE.Box3().setFromObject(this.model);
                    const initialSize = new THREE.Vector3();
                    const initialCenter = new THREE.Vector3();
                    initialBox.getSize(initialSize);
                    initialBox.getCenter(initialCenter);
                    console.log('  � Исходные размеры ШКАФА (из GLB):');
                    console.log('    └─ Ширина (X):', initialSize.x.toFixed(2), 'единиц');
                    console.log('    └─ Высота (Y):', initialSize.y.toFixed(2), 'единиц');
                    console.log('    └─ Глубина (Z):', initialSize.z.toFixed(2), 'единиц');
                    console.log('  📍 Исходный центр:', initialCenter);
                    
                    // ═══════════════════════════════════════════════════════════════
                    // 🔧 МАСШТАБИРОВАНИЕ ШКАФА
                    // ═══════════════════════════════════════════════════════════════
                    const expectedSize = new THREE.Vector3(
                        this.config.width,   // 700 мм
                        this.config.height,  // 500 мм
                        this.config.depth    // 240 мм
                    );
                    console.log('  🎯 Целевые размеры (из config):', {
                        width: this.config.width,
                        height: this.config.height,
                        depth: this.config.depth
                    });
                    
                    // МЕТОД МАСШТАБИРОВАНИЯ: по диагонали (сохраняет пропорции)
                    const initialDiagonal = initialSize.length();
                    const expectedDiagonal = expectedSize.length();
                    console.log('  📐 Диагональ исходная:', initialDiagonal.toFixed(2), 'единиц');
                    console.log('  📐 Диагональ целевая:', expectedDiagonal.toFixed(2), 'мм');
                    
                    let scaleFactor = 1;
                    if (initialDiagonal > 0 && expectedDiagonal > 0) {
                        scaleFactor = expectedDiagonal / initialDiagonal;
                    }
                    scaleFactor = THREE.MathUtils.clamp(scaleFactor, 0.01, 2000);
                    
                    console.log(`  🔢 Вычисленный scaleFactor: ${scaleFactor.toFixed(6)}x`);
                    console.log(`  💡 В GLB шкафа: 1 единица = ${(1/scaleFactor).toFixed(2)} мм`);
                    
                    this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    this.model.updateMatrixWorld(true);
                    console.log('  ✅ Масштаб применен:', this.model.scale);

                    // Принудительно сбрасываем масштаб всех дочерних объектов
                    this.model.traverse(child => {
                        if (child !== this.model && child.scale) {
                            child.scale.set(1, 1, 1);
                        }
                    });

                    // ═══════════════════════════════════════════════════════════════
                    // ✅ ПРОВЕРКА ПОСЛЕ МАСШТАБИРОВАНИЯ
                    // ═══════════════════════════════════════════════════════════════
                    const scaledBox = new THREE.Box3().setFromObject(this.model);
                    const scaledCenter = new THREE.Vector3();
                    const scaledSize = new THREE.Vector3();
                    scaledBox.getCenter(scaledCenter);
                    scaledBox.getSize(scaledSize);
                    
                    console.log('  ✅ Размеры ШКАФА после масштабирования:');
                    console.log('    └─ Ширина:', scaledSize.x.toFixed(2), 'мм (ожидалось', this.config.width, 'мм)');
                    console.log('    └─ Высота:', scaledSize.y.toFixed(2), 'мм (ожидалось', this.config.height, 'мм)');
                    console.log('    └─ Глубина:', scaledSize.z.toFixed(2), 'мм (ожидалось', this.config.depth, 'мм)');

                    // НЕ сдвигаем позицию модели! Pivot как в GLB
                    this.model.updateMatrixWorld(true);

                    // Сохранить смещение для установки пики
                    this.pivotOffset.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

                    // Центрировать по X и Z, оставить Y на полу (минимум = 0)
                    this.model.position.copy(this.pivotOffset);
                    this.model.updateMatrixWorld(true);
                    console.log('  📍 Позиция модели установлена:', this.model.position);
                    console.log('  🎯 PivotOffset:', this.pivotOffset);
                    
                    // Включить тени для всех mesh
                    let meshCount = 0;
                    console.log('🔍 МАТЕРИАЛЫ ИЗ GLB (до применения цветов):');
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.userData.cabinetId = this.id;
                            meshCount++;
                            
                            // Логируем материал из KeyShot
                            if (child.material) {
                                console.log(`  📦 ${child.name}:`);
                                console.log(`    └─ Тип: ${child.material.type}`);
                                console.log(`    └─ Цвет: #${child.material.color?.getHexString() || 'N/A'}`);
                                console.log(`    └─ Map (текстура): ${child.material.map ? 'ДА' : 'НЕТ'}`);
                                console.log(`    └─ Metalness: ${child.material.metalness ?? 'N/A'}`);
                                console.log(`    └─ Roughness: ${child.material.roughness ?? 'N/A'}`);
                            }
                        }
                    });
                    console.log(`  🔢 Найдено mesh-объектов: ${meshCount}`);
                    
                    // ═══════════════════════════════════════════════════════════════
                    // 🎨 КОРРЕКЦИЯ МАТЕРИАЛОВ ИЗ KEYSHOT
                    // ═══════════════════════════════════════════════════════════════
                    // KeyShot экспортирует материалы в Linear color space,
                    // а Three.js рендерит в sRGB. Нужно повысить яркость материалов.
                    console.log('🔧 Коррекция материалов KeyShot для правильного освещения...');
                    this.model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            // Конвертируем каждый материал (или массив материалов)
                            const materials = Array.isArray(child.material) ? child.material : [child.material];
                            
                            materials.forEach(mat => {
                                // Повышаем яркость цвета (компенсация linear → sRGB)
                                if (mat.color) {
                                    mat.color.convertLinearToSRGB();  // Яркость +20-30%
                                }
                                
                                // Если есть map-текстура, указываем правильное цветовое пространство
                                if (mat.map) {
                                    mat.map.colorSpace = THREE.SRGBColorSpace;
                                    
                                    // ═══════════════════════════════════════════════════════════════
                                    // 🎯 АНИЗОТРОПНАЯ ФИЛЬТРАЦИЯ — убирает рябь/чешуйчатость
                                    // ═══════════════════════════════════════════════════════════════
                                    // Получаем максимальную анизотропию для GPU (обычно 16)
                                    const maxAnisotropy = this.renderer ? 
                                        this.renderer.capabilities.getMaxAnisotropy() : 16;
                                    
                                    mat.map.anisotropy = maxAnisotropy;
                                    mat.map.needsUpdate = true;
                                    
                                    console.log(`    🎯 Анизотропия: ${maxAnisotropy}x`);
                                }
                                
                                // Применяем анизотропию ко ВСЕМ текстурам материала
                                ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(texName => {
                                    if (mat[texName]) {
                                        const maxAnisotropy = this.renderer ? 
                                            this.renderer.capabilities.getMaxAnisotropy() : 16;
                                        mat[texName].anisotropy = maxAnisotropy;
                                        mat[texName].needsUpdate = true;
                                    }
                                });
                                
                                // Увеличиваем яркость эмиссии (если есть)
                                if (mat.emissive) {
                                    mat.emissive.convertLinearToSRGB();
                                }
                                
                                // ═══════════════════════════════════════════════════════════════
                                // 🌍 ENVIRONMENT MAP INTENSITY — сила отражений/рефлексов
                                // ═══════════════════════════════════════════════════════════════
                                // Устанавливаем интенсивность environment map (1.0 = 100%)
                                // Значение будет управляться через GUI → Rendering → Environment
                                if (mat.envMapIntensity === undefined) {
                                    mat.envMapIntensity = 1.0;  // По умолчанию нормальные отражения
                                }
                                
                                mat.needsUpdate = true;
                            });
                            
                            console.log(`  ✅ ${child.name}: цвет скорректирован`);
                        }
                    });
                    console.log('✅ Материалы скорректированы для правильного отображения');
                    
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

        let localSize = size.clone();
        if (this.model) {
            const s = this.model.scale;
            localSize.set(
                size.x / (s.x || 1),
                size.y / (s.y || 1),
                size.z / (s.z || 1)
            );
        }

        const wasVisible = this.selectionBox ? this.selectionBox.visible : false;

        if (this.selectionBox) {
            if (this.selectionBox.geometry) this.selectionBox.geometry.dispose();
            if (this.selectionBox.material) this.selectionBox.material.dispose();
            this.model.remove(this.selectionBox);
            this.selectionBox = null;
        }
        
    const geometry = new THREE.BoxGeometry(localSize.x, localSize.y, localSize.z);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });
    this.selectionBox = new THREE.LineSegments(edges, material);
    this.selectionBox.position.copy(localCenter);
        this.selectionBox.scale.set(1, 1, 1);
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
     * Используется после масштабирования, чтобы скорректировать позицию
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
            
            // Пересчитать pivotOffset.y с учетом нового масштаба и позиции
            // pivotOffset.y должен компенсировать смещение так, чтобы min.y = 0
            if (this.boundingBox.min.y >= 0) {
                // Вычислить центр bounding box после коррекции
                const center = new THREE.Vector3();
                this.boundingBox.getCenter(center);
                
                // Обновить pivotOffset.y: разница между текущей позицией модели и центром
                // плюс смещение до уровня пола
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
        const panel = this.model.getObjectByName('PANEL003') || 
                      this.model.getObjectByName('PANEL.003');
        
        if (!panel) {
            console.error('❌ Панель для сборки не найдена');
            return Promise.reject(new Error('Panel not found'));
        }
        
        // Найти BODY (корпус шкафа) для привязки границ
        const body = this.model.getObjectByName('BODY');
        if (!body) {
            console.warn('⚠️ BODY не найден, масштабирование без ограничений');
        } else {
            const bodyBox = new THREE.Box3().setFromObject(body);
            console.log('📦 BODY границы: minY =', bodyBox.min.y.toFixed(1), 'мм');
        }
        
        // Проверка иерархии DIN-реек (для отладки)
        console.log('🔍 Проверка иерархии объектов:');
        console.log('  PANEL.003:', panel.name);
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
        
        // Сохранить исходное состояние (только масштабы)
        this.assemblyState = {
            originalRotation: this.model.rotation.y,
            isDoorOpen: this.isDoorOpen,
            panelScale: panel.scale.clone(),
            dinRailScales: this.dinRails.map(r => r.scale.clone())
        };
        
        console.log('💾 Состояние сохранено:', this.assemblyState);
        
        return new Promise((resolve) => {
            // 1. Открыть дверь (если не открыта)
            if (!this.isDoorOpen && this.door) {
                console.log('🚪 Открытие двери...');
                this.toggleDoor(true).then(() => {
                    console.log('✅ Дверь открыта');
                    
                    // 2. Масштабировать панель и DIN-рейки (с привязкой к BODY)
                    this.scaleAssemblyPanelInternal(panel, 3.0, body, () => {
                        console.log('✅ Режим сборки активирован');
                        resolve();
                    });
                });
            } else {
                // Если дверь уже открыта, сразу масштабируем
                this.scaleAssemblyPanelInternal(panel, 3.0, body, () => {
                    console.log('✅ Режим сборки активирован');
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
        const panel = this.model.getObjectByName('PANEL003') || 
                      this.model.getObjectByName('PANEL.003');
        
        if (!panel) {
            return Promise.reject(new Error('Panel not found'));
        }
        
        const body = this.model.getObjectByName('BODY'); // Найти BODY для обратного масштабирования
        
        return new Promise((resolve) => {
            // 1. Вернуть масштаб панели и DIN-реек
            console.log('📏 Возврат масштаба...');
            this.scaleAssemblyPanelInternal(panel, 1.0, body, () => {
                console.log('✅ Масштаб восстановлен');
                
                // 2. Закрыть дверь (если была закрыта изначально)
                if (!state.isDoorOpen && this.isDoorOpen && this.door) {
                    console.log('🚪 Закрытие двери...');
                    this.toggleDoor(true).then(() => {
                        console.log('✅ Дверь закрыта, режим сборки завершён');
                        resolve();
                    });
                } else {
                    // Если дверь не нужно закрывать, завершаем
                    console.log('✅ Режим сборки завершён');
                    resolve();
                }
            });
        });
    }
    
    /**
     * Внутренний метод масштабирования панели и DIN-реек
     * 
     * ВАЖНО: DIN-рейки могут быть дочерними объектами PANEL.003,
     * поэтому нужно компенсировать наследование масштабирования.
     * 
     * Если панель масштабируется на 3.0x, а DIN-рейка является её дочерним объектом,
     * то для достижения итогового масштаба 3.0x нужно установить scale DIN-рейки = 1.0
     * (так как она унаследует 3.0x от родителя).
     */
    scaleAssemblyPanelInternal(panel, targetScale, body, callback) {
        console.log(`📏 Масштабирование до ${targetScale * 100}%`);
        const duration = 800;
        let completed = 0;
        const total = 1 + this.dinRails.length; // панель + все рейки
        
        const checkComplete = () => {
            completed++;
            if (completed === total && callback) {
                callback();
            }
        };
        
        // ═══════════════════════════════════════════════════════════════
        // ПАНЕЛЬ: Простое масштабирование
        // ═══════════════════════════════════════════════════════════════
        
        console.log(`  PANEL.003: scale ${panel.scale.x.toFixed(2)} → ${targetScale.toFixed(2)}`);
        
        // Анимация панели (только масштаб)
        new Tween(panel.scale, tweenGroup)
            .to({ x: targetScale, y: targetScale, z: targetScale }, duration)
            .easing(Easing.Cubic.InOut)
            .onUpdate(() => {
                panel.updateMatrixWorld(true);
            })
            .onComplete(checkComplete)
            .start();
        
        // ═══════════════════════════════════════════════════════════════
        // DIN-РЕЙКИ: Масштабирование с компенсацией наследования
        // ═══════════════════════════════════════════════════════════════
        
        this.dinRails.forEach(rail => {
            // Проверяем, является ли рейка дочерним объектом панели
            let isChildOfPanel = false;
            let parent = rail.parent;
            while (parent) {
                if (parent === panel) {
                    isChildOfPanel = true;
                    break;
                }
                parent = parent.parent;
            }
            
            // Если рейка является дочерней панели, компенсируем наследование масштаба
            // (устанавливаем scale = 1.0, чтобы она унаследовала 3.0 от родителя)
            const railTargetScale = isChildOfPanel ? 1.0 : targetScale;
            
            console.log(`  ${rail.name}: isChild=${isChildOfPanel}, scale ${rail.scale.x.toFixed(2)} → ${railTargetScale.toFixed(2)}`);
            
            // Анимация рейки (только масштаб)
            new Tween(rail.scale, tweenGroup)
                .to({ x: railTargetScale, y: railTargetScale, z: railTargetScale }, duration)
                .easing(Easing.Cubic.InOut)
                .onUpdate(() => {
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
        
        console.log('🔧 addEquipment() начат:');
        console.log('  Rail index:', railIndex);
        console.log('  Rail name:', rail.name);
        console.log('  Rail position (локальная):', rail.position);
        console.log('  Equipment scale:', equipmentModel.scale);
        
        // Получить мировую позицию DIN-рейки
        const railWorldPos = new THREE.Vector3();
        rail.getWorldPosition(railWorldPos);
        console.log('  Rail position (мировая):', railWorldPos);
        
        // Позиция на рейке (упрощенно — в конце списка оборудования)
        const offset = this.equipment.filter(eq => eq.railIndex === railIndex).length * 50; // 50мм интервал
        console.log('  Offset по X:', offset, 'мм');
        
        // Установить локальную позицию относительно шкафа
        equipmentModel.position.copy(rail.position);
        equipmentModel.position.x += offset;
        
        // ВАЖНО: Сместить вперёд по Z, чтобы выключатель был виден спереди
        equipmentModel.position.z += 100;  // 100мм вперёд от рейки
        
        console.log('  Equipment position (локальная, установлена):', equipmentModel.position);
        
        this.model.add(equipmentModel);
        this.equipment.push({ model: equipmentModel, railIndex });
        
        // Проверка мировой позиции после добавления
        const eqWorldPos = new THREE.Vector3();
        equipmentModel.getWorldPosition(eqWorldPos);
        console.log('  Equipment position (мировая, финальная):', eqWorldPos);
        
        console.log(`✅ Оборудование добавлено на рейку ${railIndex}`);
        return true;
    }
    
    removeEquipment(equipmentModel) {
        const index = this.equipment.findIndex(eq => eq.model === equipmentModel);
        if (index !== -1) {
            this.model.remove(equipmentModel);
            this.equipment.splice(index, 1);
            console.log('Оборудование удалено');
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
