/**
 * CabinetModel — класс для работы с отдельным экземпляром шкафа
 * Загружает GLTF-модель, управляет дверцей, оборудованием, материалами
 */

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

export class CabinetModel {
    constructor(modelPath, config = {}) {
        this.modelPath = modelPath;
        this.config = {
            type: config.type || 'floor', // 'floor' или 'wall'
            width: config.width || 700,    // мм
            height: config.height || 500,  // мм
            depth: config.depth || 240,    // мм
            name: config.name || 'Cabinet',
            color: config.color || 0xD7D9D6 // RAL 7035 (светло-серый)
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
        return new Promise((resolve, reject) => {
            console.log(`  Начало загрузки: ${this.modelPath}`);
            
            this.loader.load(
                this.modelPath,
                (gltf) => {
                    console.log(`  ✓ GLTF загружен успешно`);
                    
                    this.gltf = gltf;
                    this.model = gltf.scene;
                    this.model.userData.cabinetId = this.id;
                    this.model.userData.isCabinet = true;
                    
                    console.log(`  Узлов в сцене: ${gltf.scene.children.length}`);
                    console.log(`  Корневые узлы:`, gltf.scene.children.map(c => c.name));
                    console.log(`  Полный список узлов:`);
                    this.getAllNodeNames().forEach(name => console.log(`    • ${name}`));
                    
                    // ВАЖНО: Проверяем масштаб модели и центрируем
                    const initialBox = new THREE.Box3().setFromObject(this.model);
                    const initialSize = new THREE.Vector3();
                    const initialCenter = new THREE.Vector3();
                    initialBox.getSize(initialSize);
                    initialBox.getCenter(initialCenter);
                    
                    console.log(`  Исходный размер: ${initialSize.x.toFixed(2)} × ${initialSize.y.toFixed(2)} × ${initialSize.z.toFixed(2)}`);
                    console.log(`  Исходный центр: (${initialCenter.x.toFixed(2)}, ${initialCenter.y.toFixed(2)}, ${initialCenter.z.toFixed(2)})`);
                    
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
                    this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    this.model.updateMatrixWorld(true);
                    console.log(`  ✓ Применён масштаб: ${scaleFactor.toFixed(3)}× (ожидаемые размеры ${expectedSize.x}×${expectedSize.y}×${expectedSize.z} мм)`);

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

                    console.log(`  📐 После масштаба:`);
                    console.log(`    Размер: ${scaledSize.x.toFixed(0)} × ${scaledSize.y.toFixed(0)} × ${scaledSize.z.toFixed(0)} мм`);
                    console.log(`    Центр: (${scaledCenter.x.toFixed(1)}, ${scaledCenter.y.toFixed(1)}, ${scaledCenter.z.toFixed(1)})`);
                    console.log(`    Min: (${scaledBox.min.x.toFixed(1)}, ${scaledBox.min.y.toFixed(1)}, ${scaledBox.min.z.toFixed(1)})`);
                    console.log(`    Max: (${scaledBox.max.x.toFixed(1)}, ${scaledBox.max.y.toFixed(1)}, ${scaledBox.max.z.toFixed(1)})`);
                    
                    // Сохранить смещение для установки пики
                    this.pivotOffset.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

                    // Центрировать по X и Z, оставить Y на полу (минимум = 0)
                    this.model.position.copy(this.pivotOffset);
                    this.model.updateMatrixWorld(true);
                    
                    console.log(`  ✓ Модель отцентрирована: позиция (${this.model.position.x.toFixed(1)}, ${this.model.position.y.toFixed(1)}, ${this.model.position.z.toFixed(1)})`);
                    
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
                    console.log(`  Mesh-объектов: ${meshCount}`);
                    
                    // Найти дверцу (по имени объекта в GLTF) - СНАЧАЛА помечаем части
                    this.findDoor();
                    
                    // Найти DIN-рейки
                    this.findDinRails();
                    
                    // Раскраска отдельных частей (единственный способ)
                    this.applyPartColors();
                    
                    // Вычислить bounding box ПОСЛЕ всех трансформаций
                    this.updateBoundingBox();
                    
                    // === ФИНАЛЬНАЯ ПРОВЕРКА ===
                    const checkBox = new THREE.Box3().setFromObject(this.model);
                    const checkCenter = new THREE.Vector3();
                    const checkSize = new THREE.Vector3();
                    checkBox.getCenter(checkCenter);
                    checkBox.getSize(checkSize);
                    
                    console.log(`\n  🔍 === ФИНАЛЬНАЯ ПРОВЕРКА МОДЕЛИ ===`);
                    console.log(`  Position:`, this.model.position);
                    console.log(`  Scale:`, this.model.scale);
                    console.log(`  Rotation:`, this.model.rotation);
                    console.log(`  Visible:`, this.model.visible);
                    console.log(`  Parent:`, this.model.parent ? this.model.parent.type : 'null');
                    console.log(`  Children count:`, this.model.children.length);
                    console.log(`  Финальный размер: ${checkSize.x.toFixed(0)} × ${checkSize.y.toFixed(0)} × ${checkSize.z.toFixed(0)} мм`);
                    console.log(`  Финальный центр: (${checkCenter.x.toFixed(1)}, ${checkCenter.y.toFixed(1)}, ${checkCenter.z.toFixed(1)})`);
                    console.log(`  Bounding box Min: (${checkBox.min.x.toFixed(1)}, ${checkBox.min.y.toFixed(1)}, ${checkBox.min.z.toFixed(1)})`);
                    console.log(`  Bounding box Max: (${checkBox.max.x.toFixed(1)}, ${checkBox.max.y.toFixed(1)}, ${checkBox.max.z.toFixed(1)})`);
                    console.log(`  ===================================\n`);
                    
                    // Создать рамку выбора (невидимую по умолчанию)
                    this.createSelectionBox();
                    
                    // Установить начальную позицию
                    this.setPosition(this.position);
                    
                    console.log(`✅ Модель загружена: ${this.config.name} (${this.id})`);
                    resolve(this);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0);
                        console.log(`  Загрузка ${this.config.name}: ${percent}%`);
                    } else {
                        console.log(`  Загружено байт: ${progress.loaded}`);
                    }
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

        const partColorMap = [
            { keyword: 'body', color: new THREE.Color(0xD7D9D6) }, // светло-серый
            { keyword: 'door', color: new THREE.Color(0xD7D9D6) }, // светло-серый
            { keyword: 'panel', color: new THREE.Color(0xD7D9D6) } // светло-серый
        ];

        this.model.traverse((child) => {
            if (!child.isMesh || !child.material || !child.name) return;

            const lowerName = child.name.toLowerCase();
            const match = partColorMap.find(entry => lowerName.includes(entry.keyword));
            if (!match) return;

            // Клонируем материал, чтобы не затронуть другие mesh с общим материалом
            if (Array.isArray(child.material)) {
                child.material = child.material.map(mat => {
                    const clonedMat = mat.clone();
                    if (clonedMat.color) {
                        clonedMat.color.copy(match.color);
                    }
                    // Убираем прозрачность
                    clonedMat.transparent = false;
                    clonedMat.opacity = 1.0;
                    clonedMat.needsUpdate = true;
                    return clonedMat;
                });
            } else {
                child.material = child.material.clone();
                if (child.material.color) {
                    child.material.color.copy(match.color);
                }
                // Убираем прозрачность
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.needsUpdate = true;
            }
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
                console.log(`  ✓ Найдена дверца: "${child.name}" (тип: ${child.type})`);
                
                // Сохранить исходные углы поворота (КОПИРУЕМ ЗНАЧЕНИЯ, а не ссылку!)
                this.doorInitialRotation = {
                    x: child.rotation.x,
                    y: child.rotation.y,
                    z: child.rotation.z,
                    order: child.rotation.order // Порядок вращения (XYZ, YXZ, etc.)
                };
                console.log(`    Исходный поворот дверцы:`, this.doorInitialRotation);
                console.log(`    X: ${child.rotation.x.toFixed(4)} (${(child.rotation.x * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`    Y: ${child.rotation.y.toFixed(4)} (${(child.rotation.y * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`    Z: ${child.rotation.z.toFixed(4)} (${(child.rotation.z * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`    Порядок вращения: ${child.rotation.order}`);
                
                // Вычислить bounding box двери для определения положения петель
                const doorBox = new THREE.Box3().setFromObject(this.door);
                const doorSize = new THREE.Vector3();
                const doorCenter = new THREE.Vector3();
                doorBox.getSize(doorSize);
                doorBox.getCenter(doorCenter);
                
                console.log(`    Размер двери: ${doorSize.x.toFixed(1)} × ${doorSize.y.toFixed(1)} × ${doorSize.z.toFixed(1)} мм`);
                console.log(`    Текущий центр двери (pivot): (${doorCenter.x.toFixed(1)}, ${doorCenter.y.toFixed(1)}, ${doorCenter.z.toFixed(1)})`);
                console.log(`    Min двери: (${doorBox.min.x.toFixed(1)}, ${doorBox.min.y.toFixed(1)}, ${doorBox.min.z.toFixed(1)})`);
                console.log(`    Max двери: (${doorBox.max.x.toFixed(1)}, ${doorBox.max.y.toFixed(1)}, ${doorBox.max.z.toFixed(1)})`);
                
                // Определить возможные позиции петель (4 края двери)
                console.log(`\n    � Возможные позиции петель (для вращения вокруг оси Y):`);
                console.log(`      Левый край:   X = ${doorBox.min.x.toFixed(1)} (петли слева)`);
                console.log(`      Правый край:  X = ${doorBox.max.x.toFixed(1)} (петли справа)`);
                console.log(`      Передний край: Z = ${doorBox.min.z.toFixed(1)} (петли спереди)`);
                console.log(`      Задний край:   Z = ${doorBox.max.z.toFixed(1)} (петли сзади)`);
                
                console.log(`\n    💡 РЕШЕНИЯ для правильного pivot point:`);
                console.log(`      1️⃣  BLENDER (рекомендуется):`);
                console.log(`         • Выберите дверь → Object Mode`);
                console.log(`         • Set Origin → Origin to Geometry`);
                console.log(`         • Переместите Origin к краю с петлями (G+X или G+Z)`);
                console.log(`         • Экспортируйте GLB заново`);
                console.log(`      2️⃣  THREE.JS (workaround):`);
                console.log(`         • Вызовите: cabinet.fixDoorPivot('left') // или 'right', 'front', 'back'`);
                console.log(`         • Это обернёт дверь в Group и сместит позицию\n`);
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
                console.log(`  ✓ Найдена DIN-рейка: "${child.name}" (тип: ${child.type})`);
            }
        });
        
        if (this.dinRails.length === 0) {
            console.warn(`  ⚠ DIN-рейки не найдены в модели ${this.config.name}`);
        } else {
            console.log(`  Всего DIN-реек: ${this.dinRails.length}`);
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
        
        // Размеры
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        console.log(`  Размеры модели: ${size.x.toFixed(0)} × ${size.y.toFixed(0)} × ${size.z.toFixed(0)} мм`);
        console.log(`  Центр модели: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`);
        console.log(`  Min: (${box.min.x.toFixed(1)}, ${box.min.y.toFixed(1)}, ${box.min.z.toFixed(1)})`);
        console.log(`  Max: (${box.max.x.toFixed(1)}, ${box.max.y.toFixed(1)}, ${box.max.z.toFixed(1)})`);
        console.log(`  Масштаб модели:`, this.model.scale);
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
    
    setRotation(angleRadians) {
        this.rotation = angleRadians;
        if (this.model) {
            this.model.rotation.y = angleRadians;
        }
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
        
        console.log(`\n🚪 ===== ОТКРЫТИЕ/ЗАКРЫТИЕ ДВЕРИ =====`);
        console.log(`  Состояние: ${this.isDoorOpen ? 'ОТКРЫВАЕТСЯ' : 'ЗАКРЫВАЕТСЯ'}`);
        console.log(`  Ось вращения: ${ROTATION_AXIS.toUpperCase()}`);
        console.log(`  Текущий угол ${ROTATION_AXIS.toUpperCase()}: ${(this.door.rotation[ROTATION_AXIS] * 180 / Math.PI).toFixed(1)}°`);
        console.log(`  Базовый угол: ${(baseRotation * 180 / Math.PI).toFixed(1)}°`);
        console.log(`  Целевой угол: ${(targetRotation * 180 / Math.PI).toFixed(1)}°`);
        console.log(`  Изменение: ${((targetRotation - this.door.rotation[ROTATION_AXIS]) * 180 / Math.PI).toFixed(1)}°`);
        console.log(`=======================================\n`);
        
        if (animate) {
            this.animateDoor(targetRotation, ROTATION_AXIS);
        } else {
            this.door.rotation[ROTATION_AXIS] = targetRotation;
            this.door.updateMatrixWorld(true);
        }
    }
    
    animateDoor(targetRotation, axis = 'y') {
        const startRotation = this.door.rotation[axis];
        const duration = 500; // мс
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing (easeInOutQuad)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            this.door.rotation[axis] = startRotation + (targetRotation - startRotation) * eased;
            this.door.updateMatrixWorld(true);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log(`\n  ✅ ===== АНИМАЦИЯ ЗАВЕРШЕНА =====`);
                console.log(`  Целевая ось: ${axis.toUpperCase()}`);
                console.log(`  Финальные углы двери:`);
                console.log(`    X: ${this.door.rotation.x.toFixed(4)} рад (${(this.door.rotation.x * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`    Y: ${this.door.rotation.y.toFixed(4)} рад (${(this.door.rotation.y * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`    Z: ${this.door.rotation.z.toFixed(4)} рад (${(this.door.rotation.z * 180 / Math.PI).toFixed(1)}°)`);
                console.log(`  Порядок вращения: ${this.door.rotation.order}`);
                console.log(`  ================================\n`);
            }
        };
        
        requestAnimationFrame(animate);
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
}
