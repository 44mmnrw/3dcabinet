/**
 * Скрипт для копирования Three.js библиотек из node_modules в public/js/libs/
 * Запускается автоматически после npm install
 */

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Пути
const nodeModulesPath = join(__dirname, 'node_modules', 'three');
const targetPath = join(__dirname, 'public', 'js', 'libs');

// Создать папку libs, если не существует
if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true });
    console.log('✓ Создана папка public/js/libs/');
}

// Файлы для копирования
const filesToCopy = [
    // Three.js core
    {
        src: join(nodeModulesPath, 'build', 'three.module.js'),
        dest: join(targetPath, 'three.module.js'),
        name: 'three.module.js'
    },
    {
        src: join(nodeModulesPath, 'examples', 'jsm', 'controls', 'OrbitControls.js'),
        dest: join(targetPath, 'OrbitControls.js'),
        name: 'OrbitControls.js'
    },
    {
        src: join(nodeModulesPath, 'examples', 'jsm', 'loaders', 'GLTFLoader.js'),
        dest: join(targetPath, 'GLTFLoader.js'),
        name: 'GLTFLoader.js'
    },
    {
        src: join(nodeModulesPath, 'examples', 'jsm', 'utils', 'BufferGeometryUtils.js'),
        dest: join(targetPath, 'BufferGeometryUtils.js'),
        name: 'BufferGeometryUtils.js'
    },
    // Дополнительные библиотеки
    {
        src: join(__dirname, 'node_modules', '@tweenjs', 'tween.js', 'dist', 'tween.esm.js'),
        dest: join(targetPath, 'tween.esm.js'),
        name: 'tween.esm.js'
    },
    {
        src: join(__dirname, 'node_modules', 'sweetalert2', 'dist', 'sweetalert2.all.js'),
        dest: join(targetPath, 'sweetalert2.all.js'),
        name: 'sweetalert2.all.js'
    },
    {
        src: join(__dirname, 'node_modules', 'sweetalert2', 'dist', 'sweetalert2.min.css'),
        dest: join(__dirname, 'public', 'css', 'sweetalert2.min.css'),
        name: 'sweetalert2.min.css'
    },
    {
        src: join(__dirname, 'node_modules', 'file-saver', 'dist', 'FileSaver.min.js'),
        dest: join(targetPath, 'FileSaver.min.js'),
        name: 'FileSaver.min.js'
    },
    {
        src: join(__dirname, 'node_modules', 'lil-gui', 'dist', 'lil-gui.esm.js'),
        dest: join(targetPath, 'lil-gui.esm.js'),
        name: 'lil-gui.esm.js'
    },
    {
        src: join(__dirname, 'node_modules', 'stats.js', 'build', 'stats.min.js'),
        dest: join(targetPath, 'stats.min.js'),
        name: 'stats.min.js'
    },
    // 3D-специфичные библиотеки
    {
        src: join(__dirname, 'node_modules', 'three-mesh-bvh', 'build', 'index.module.js'),
        dest: join(targetPath, 'three-mesh-bvh.module.js'),
        name: 'three-mesh-bvh.module.js'
    },
    {
        src: join(__dirname, 'node_modules', 'postprocessing', 'build', 'index.js'),
        dest: join(targetPath, 'postprocessing.js'),
        name: 'postprocessing.js'
    },
    {
        src: join(__dirname, 'node_modules', 'troika-three-text', 'dist', 'troika-three-text.esm.js'),
        dest: join(targetPath, 'troika-three-text.esm.js'),
        name: 'troika-three-text.esm.js'
    },
    {
        src: join(__dirname, 'node_modules', 'camera-controls', 'dist', 'camera-controls.module.js'),
        dest: join(targetPath, 'camera-controls.module.js'),
        name: 'camera-controls.module.js'
    },
    {
        src: join(__dirname, 'node_modules', 'cannon-es', 'dist', 'cannon-es.js'),
        dest: join(targetPath, 'cannon-es.js'),
        name: 'cannon-es.js'
    }
];

console.log('🚀 Копирование Three.js библиотек...\n');

let successCount = 0;
let errorCount = 0;

filesToCopy.forEach(file => {
    try {
        if (!existsSync(file.src)) {
            console.error(`  ❌ Исходный файл не найден: ${file.name}`);
            errorCount++;
            return;
        }
        
        copyFileSync(file.src, file.dest);
        console.log(`  ✓ ${file.name}`);
        successCount++;
    } catch (error) {
        console.error(`  ❌ Ошибка при копировании ${file.name}:`, error.message);
        errorCount++;
    }
});

console.log(`\n✅ Готово! Скопировано: ${successCount}, ошибок: ${errorCount}`);

if (errorCount > 0) {
    console.log('\n⚠️  Некоторые файлы не были скопированы. Проверьте ошибки выше.');
    process.exit(1);
}
