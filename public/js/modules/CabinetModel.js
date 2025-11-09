/**
 * CabinetModel — класс для работы с отдельным экземпляром шкафа
 * Загружает GLTF-модель, управляет дверцей, оборудованием, материалами
 */

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { Tween, Easing, Group } from '../libs/tween.esm.js';

// Создаём глобальную группу для всех TWEEN-анимаций шкафов
const tweenGroup = new Group();

export class CabinetModel {
    constructor(modelPath, config = {}) {
        this.modelPath = modelPath;
        this.config = {
            type: config.type || 'floor', // 'floor' или 'wall'
            width: config.width || 700,    // мм
            height: config.height || 500,  // мм
            depth: config.depth || 240,    // мм
            name: config.name || 'Cabinet',
            color: config.color || 0x2196f3,  // Основной цвет (fallback)
            colorScheme: config.colorScheme || null  // Цветовая схема для частей модели
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
        
        // Добавить текстурную схему
        this.textureScheme = config.textureScheme || null;
    }
    
    generateId() {
        return `cabinet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async load() {
        console.log('🔄 CabinetModel.load() начат для:', this.modelPath);
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
                    
                    // ВАЖНО: Проверяем масштаб модели и центрируем
                    const initialBox = new THREE.Box3().setFromObject(this.model);
                    const initialSize = new THREE.Vector3();
                    const initialCenter = new THREE.Vector3();
                    initialBox.getSize(initialSize);
                    initialBox.getCenter(initialCenter);
                    console.log('  📏 Исходные размеры модели:', initialSize);
                    console.log('  📍 Исходный центр:', initialCenter);
                    // === МАСШТАБИРОВАНИЕ МОДЕЛИ ===
                    const expectedSize = new THREE.Vector3(
                        this.config.width,
                        this.config.height,
                        this.config.depth
                    );
                    const initialDiagonal = initialSize.length();
                    const expectedDiagonal = expectedSize.length();
                    let scaleFactor = 1;
                    if (initialDiagonal > 0 && expectedDiagonal > 0) {
                        scaleFactor = expectedDiagonal / initialDiagonal;
                    }
                    scaleFactor = THREE.MathUtils.clamp(scaleFactor, 0.01, 2000);
                    console.log('  🔢 Вычисленный scaleFactor:', scaleFactor);
                    this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    this.model.updateMatrixWorld(true);
                    console.log('  ✅ Масштаб применен:', this.model.scale);

                    // Принудительно сбрасываем масштаб всех дочерних объектов
                    this.model.traverse(child => {
                        if (child !== this.model && child.scale) {
                            child.scale.set(1, 1, 1);
                        }
                    });

                    // После масштабирования просто выводим размеры и центр
                    const scaledBox = new THREE.Box3().setFromObject(this.model);
                    const scaledCenter = new THREE.Vector3();
                    const scaledSize = new THREE.Vector3();
                    scaledBox.getCenter(scaledCenter);
                    scaledBox.getSize(scaledSize);

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
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.userData.cabinetId = this.id;
                            meshCount++;
                        }
                    });
                    console.log(`  🔢 Найдено mesh-объектов: ${meshCount}`);
                    
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
                    this.applyPartColors();
                    console.log('  ✅ Цветовая схема применена');
                    
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
                    
                    // ✅ Применить текстуры (если указаны)
                    if (this.textureScheme) {
                        console.log('🖼️ Применение текстур...');
                        try {
                            await this.applyTextures(this.model);
                            console.log('  ✅ Текстуры применены');
                        } catch (e) {
                            console.error('❌ Ошибка применения текстур:', e);
                            // Продолжаем работу даже если текстуры не загрузились
                        }
                    } else {
                        console.log('ℹ️ Текстурная схема не задана, пропускаем');
                    }
                    
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

    applyPartColors() {
        if (!this.model) return;

        // Если colorScheme не передана, используем config.color для всех частей
        if (!this.config.colorScheme) {
            console.log('⚠️ ColorScheme не задана, используется единый цвет:', this.config.color);
            return;
        }

        const scheme = this.config.colorScheme;
        
        // Карта соответствия: ключевое слово в имени mesh → ключ в colorScheme
        const partMapping = [
            { keywords: ['body', 'корпус'], colorKey: 'body' },
            { keywords: ['door', 'дверь', 'дверца'], colorKey: 'door' },
            { keywords: ['panel', 'панель'], colorKey: 'panel' },
            { keywords: ['insulation_frame', 'изоляция_рамка'], colorKey: 'insulationFrame' },
            { keywords: ['insulation', 'изоляция'], colorKey: 'insulation' },
            { keywords: ['din_rail', 'din', 'rail', 'рейка'], colorKey: 'dinRail' }
        ];

        this.model.traverse((child) => {
            if (!child.isMesh || !child.name) return;

            const lowerName = child.name.toLowerCase();
            let colorToUse = scheme.default;  // Цвет по умолчанию
            
            // Ищем совпадение по ключевым словам
            for (const mapping of partMapping) {
                if (mapping.keywords.some(kw => lowerName.includes(kw))) {
                    colorToUse = scheme[mapping.colorKey] || scheme.default;
                    console.log(`🎨 ${child.name} → ${mapping.colorKey} (${colorToUse.toString(16)})`);
                    break;
                }
            }

            // Создаём новый материал с нужным цветом
            child.material = new THREE.MeshStandardMaterial({
                color: colorToUse,
                metalness: 0.3,
                roughness: 0.7,
                map: null,
                transparent: false,
                opacity: 1.0
            });
            child.material.needsUpdate = true;
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
            return;
        }
        
        this.isDoorOpen = !this.isDoorOpen;
        
        // ========== ВЫБОР ОСИ ВРАЩЕНИЯ ==========
        const ROTATION_AXIS = 'y'; // 'x', 'y' или 'z'
        // ========================================
        
        // Учитываем исходный поворот модели по выбранной оси
        const baseRotation = this.doorInitialRotation[ROTATION_AXIS];
        const targetRotation = this.isDoorOpen ? baseRotation - Math.PI / 2 : baseRotation; // Минус для открытия в другую сторону
        
        if (animate) {
            this.animateDoor(targetRotation, ROTATION_AXIS);
        } else {
            this.door.rotation[ROTATION_AXIS] = targetRotation;
            this.door.updateMatrixWorld(true);
        }
    }
    
    animateDoor(targetRotation, axis = 'y') {
        const startRotation = this.door.rotation[axis];
        const duration = 600; // мс
        
        // Используем TWEEN для плавной анимации с явной группой
        new Tween(this.door.rotation, tweenGroup)
            .to({ [axis]: targetRotation }, duration)
            .easing(Easing.Cubic.InOut) // Плавное ускорение и замедление
            .onUpdate(() => {
                this.door.updateMatrixWorld(true);
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
        
        // Позиция на рейке (упрощенно — в конце списка оборудования)
        const offset = this.equipment.filter(eq => eq.railIndex === railIndex).length * 50; // 50мм интервал
        
        equipmentModel.position.copy(rail.position);
        equipmentModel.position.x += offset;
        
        this.model.add(equipmentModel);
        this.equipment.push({ model: equipmentModel, railIndex });
        
        console.log(`Оборудование добавлено на рейку ${railIndex}`);
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
    
    /**
     * Применить текстуры к меш-объектам
     * @param {THREE.Object3D} model 
     */
    async applyTextures(model) {
        if (!this.textureScheme) return;
        
        const sceneManager = window.configurator?.sceneManager;
        if (!sceneManager) {
            console.warn('SceneManager недоступен для загрузки текстур');
            return;
        }
        
        // Загрузить все текстуры параллельно
        const texturePromises = {};
        for (const [partName, texturePath] of Object.entries(this.textureScheme)) {
            if (texturePath && typeof texturePath === 'string') {
                texturePromises[partName] = sceneManager.loadPBRTextures(texturePath);
            }
        }
        
        const loadedTextures = {};
        for (const [partName, promise] of Object.entries(texturePromises)) {
            try {
                loadedTextures[partName] = await promise;
            } catch (e) {
                console.error(`Не удалось загрузить текстуры для ${partName}:`, e);
            }
        }
        
        // Применить текстуры к мешам
        model.traverse((child) => {
            if (child.isMesh && child.name) {
                const partName = this.getPartNameFromMesh(child);
                const textures = loadedTextures[partName];
                
                if (textures && Object.keys(textures).length > 0) {
                    this.applyTexturesToMaterial(child.material, textures);
                    console.log(`✅ Текстуры применены к ${child.name}`);
                }
            }
        });
    }
    
    /**
     * Применить текстуры к материалу
     * @param {THREE.Material} material 
     * @param {Object} textures 
     */
    applyTexturesToMaterial(material, textures) {
        if (Array.isArray(material)) {
            material.forEach(mat => this.applyTexturesToMaterial(mat, textures));
            return;
        }
        
        // Применить карты к материалу
        if (textures.map) {
            material.map = textures.map;
        }
        
        if (textures.normalMap) {
            material.normalMap = textures.normalMap;
            material.normalScale = new THREE.Vector2(1, 1);
        }
        
        if (textures.roughnessMap) {
            material.roughnessMap = textures.roughnessMap;
            material.roughness = 1.0;
        }
        
        if (textures.aoMap) {
            material.aoMap = textures.aoMap;
            material.aoMapIntensity = 1.0;
            
            // UV2 для aoMap
            if (material.geometry && !material.geometry.attributes.uv2) {
                material.geometry.attributes.uv2 = material.geometry.attributes.uv;
            }
        }
        
        material.needsUpdate = true;
    }
    
    /**
     * Определить название части по имени меша
     * @param {THREE.Mesh} mesh 
     * @returns {string}
     */
    getPartNameFromMesh(mesh) {
        const name = mesh.name.toUpperCase();
        
        if (name.includes('BODY')) return 'body';
        if (name.includes('DOOR')) return 'door';
        if (name.includes('PANEL')) return 'panel';
        if (name.includes('INSULATION') && !name.includes('FRAME')) return 'insulation';
        if (name.includes('INSULATION_FRAME')) return 'insulationFrame';
        if (name.includes('DIN_RAIL')) return 'dinRail';
        
        return 'default';
    }
}

// Экспортируем группу для обновления в SceneManager
export { tweenGroup };
