/**
 * AssetLoader — централизованный загрузчик 3D моделей
 * Управляет кэшированием, прогрессом загрузки, DRACO декомпрессией
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.cache = new Map(); // path -> { gltf, timestamp }
        this.loadingQueue = new Map(); // path -> Promise
        this.progressCallbacks = new Map(); // path -> callback[]
        
        // Настройка DRACO декодера
        this.setupDRACOLoader();
        
        console.log('✅ AssetLoader инициализирован');
    }
    
    /**
     * Настройка DRACO декодера для сжатых моделей
     */
    setupDRACOLoader() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/libs/draco/');
        dracoLoader.setDecoderConfig({ type: 'js' }); // 'js' или 'wasm'
        this.gltfLoader.setDRACOLoader(dracoLoader);
        console.log('  ✅ DRACOLoader настроен: /js/libs/draco/');
    }
    
    /**
     * Загрузить 3D модель (с кэшированием)
     * @param {string} path - путь к .glb файлу
     * @param {object} options - опции загрузки
     * @returns {Promise<THREE.Group>} - клон загруженной сцены
     */
    async load(path, options = {}) {
        const {
            useCache = true,
            clone = true,
            onProgress = null
        } = options;
        
        console.log(`🔄 AssetLoader.load("${path}")`);
        console.log(`  Options: useCache=${useCache}, clone=${clone}`);
        
        // Проверить кэш
        if (useCache && this.cache.has(path)) {
            console.log('  ✅ Модель найдена в кэше');
            const cached = this.cache.get(path);
            const result = clone ? this.cloneScene(cached.gltf.scene) : cached.gltf.scene;
            console.log('  📦 Возвращаем модель из кэша:', result.type);
            return result;
        }
        
        // Проверить очередь загрузки (избежать дублирования)
        if (this.loadingQueue.has(path)) {
            console.log('  ⏳ Модель уже загружается, ожидание...');
            const gltf = await this.loadingQueue.get(path);
            const result = clone ? this.cloneScene(gltf.scene) : gltf.scene;
            console.log('  📦 Модель дождалась загрузки:', result.type);
            return result;
        }
        
        // Создать промис загрузки
        const loadPromise = new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    console.log(`  ✅ Модель загружена: ${path}`);
                    console.log(`  📦 gltf.scene:`, gltf.scene);
                    console.log(`  📊 gltf.scene.children.length:`, gltf.scene.children.length);
                    
                    // Сохранить в кэш
                    if (useCache) {
                        this.cache.set(path, {
                            gltf,
                            timestamp: Date.now()
                        });
                        console.log(`  💾 Сохранено в кэш (всего: ${this.cache.size})`);
                    }
                    
                    // Удалить из очереди
                    this.loadingQueue.delete(path);
                    
                    resolve(gltf);
                },
                (progress) => {
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(1);
                        console.log(`  ⏳ Загрузка: ${percent}%`);
                        
                        if (onProgress) {
                            onProgress(progress.loaded, progress.total, percent);
                        }
                    }
                },
                (error) => {
                    console.error(`  ❌ Ошибка загрузки ${path}:`, error);
                    this.loadingQueue.delete(path);
                    reject(error);
                }
            );
        });
        
        // Добавить в очередь
        this.loadingQueue.set(path, loadPromise);
        
        const gltf = await loadPromise;
        const result = clone ? this.cloneScene(gltf.scene) : gltf.scene;
        console.log(`  📦 Возвращаем результат:`, result.type, `children: ${result.children.length}`);
        return result;
    }
    
    /**
     * Клонировать сцену с сохранением материалов и геометрии
     */
    cloneScene(scene) {
        const cloned = scene.clone(true);
        
        // Глубокое клонирование материалов (чтобы каждый экземпляр был независим)
        cloned.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => mat.clone());
                } else {
                    child.material = child.material.clone();
                }
            }
        });
        
        return cloned;
    }
    
    /**
     * Предзагрузка массива моделей
     * @param {string[]} paths - массив путей
     * @param {function} onProgress - callback прогресса (loaded, total)
     */
    async preload(paths, onProgress = null) {
        console.log(`🔄 Предзагрузка ${paths.length} моделей...`);
        
        let loaded = 0;
        const promises = paths.map(async (path) => {
            try {
                await this.load(path, { useCache: true, clone: false });
                loaded++;
                if (onProgress) {
                    onProgress(loaded, paths.length);
                }
            } catch (error) {
                console.error(`❌ Не удалось предзагрузить ${path}:`, error);
            }
        });
        
        await Promise.all(promises);
        console.log(`✅ Предзагрузка завершена: ${loaded}/${paths.length}`);
    }
    
    /**
     * Очистить кэш (освободить память)
     */
    clearCache() {
        console.log(`🗑️ Очистка кэша (${this.cache.size} моделей)...`);
        
        // Удалить геометрию и материалы из памяти
        this.cache.forEach((cached) => {
            cached.gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        
        this.cache.clear();
        console.log('✅ Кэш очищен');
    }
    
    /**
     * Получить статистику кэша
     */
    getCacheStats() {
        return {
            cached: this.cache.size,
            loading: this.loadingQueue.size,
            paths: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
let instance = null;

export function getAssetLoader() {
    if (!instance) {
        instance = new AssetLoader();
    }
    return instance;
}
