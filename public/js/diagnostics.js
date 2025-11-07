/**
 * Диагностика загрузки 3D конфигуратора
 * Проверяет все зависимости и выводит подробные логи
 */

console.log('=== ДИАГНОСТИКА 3D КОНФИГУРАТОРА ===');
console.log('1. Проверка контейнера...');

const container = document.getElementById('cabinet-3d-container');
if (!container) {
    console.error('❌ Контейнер #cabinet-3d-container не найден!');
} else {
    console.log('✅ Контейнер найден');
    console.log('  - clientWidth:', container.clientWidth);
    console.log('  - clientHeight:', container.clientHeight);
    console.log('  - offsetWidth:', container.offsetWidth);
    console.log('  - offsetHeight:', container.offsetHeight);
}

console.log('\n2. Проверка Three.js...');
import * as THREE from './three.module.js';

if (typeof THREE === 'undefined') {
    console.error('❌ Three.js не загружен!');
} else {
    console.log('✅ Three.js загружен');
    console.log('  - Версия:', THREE.REVISION);
    console.log('  - WebGLRenderer:', typeof THREE.WebGLRenderer);
}

console.log('\n3. Проверка GLTFLoader...');
import { GLTFLoader } from './GLTFLoader.js';

if (typeof GLTFLoader === 'undefined') {
    console.error('❌ GLTFLoader не загружен!');
} else {
    console.log('✅ GLTFLoader загружен');
    console.log('  - Тип:', typeof GLTFLoader);
}

console.log('\n4. Проверка OrbitControls...');
import { OrbitControls } from './OrbitControls.js';

if (typeof OrbitControls === 'undefined') {
    console.error('❌ OrbitControls не загружен!');
} else {
    console.log('✅ OrbitControls загружен');
    console.log('  - Тип:', typeof OrbitControls);
}

console.log('\n5. Проверка модулей конфигуратора...');

import { SceneManager } from './modules/SceneManager.js';
import { CabinetModel } from './modules/CabinetModel.js';
import { CabinetManager } from './modules/CabinetManager.js';
import { InteractionController } from './modules/InteractionController.js';

console.log('✅ Все модули загружены');
console.log('  - SceneManager:', typeof SceneManager);
console.log('  - CabinetModel:', typeof CabinetModel);
console.log('  - CabinetManager:', typeof CabinetManager);
console.log('  - InteractionController:', typeof InteractionController);

console.log('\n6. Проверка путей к модели...');

const modelPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.gltf';
const binPath = '/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.bin';

console.log('  GLTF:', window.location.origin + modelPath);
console.log('  BIN:', window.location.origin + binPath);

// Проверка доступности файлов
fetch(modelPath, { method: 'HEAD' })
    .then(response => {
        if (response.ok) {
            console.log('  ✅ GLTF файл доступен (', response.headers.get('content-type'), ')');
        } else {
            console.error('  ❌ GLTF файл недоступен:', response.status, response.statusText);
        }
    })
    .catch(err => console.error('  ❌ Ошибка проверки GLTF:', err));

fetch(binPath, { method: 'HEAD' })
    .then(response => {
        if (response.ok) {
            console.log('  ✅ BIN файл доступен (', response.headers.get('content-type'), ')');
        } else {
            console.error('  ❌ BIN файл недоступен:', response.status, response.statusText);
        }
    })
    .catch(err => console.error('  ❌ Ошибка проверки BIN:', err));

console.log('\n7. Тестовая инициализация Three.js...');

try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    console.log('✅ Three.js инициализирован успешно');
    console.log('  - Scene:', scene);
    console.log('  - Camera:', camera);
    console.log('  - Renderer:', renderer);
    
    renderer.dispose();
} catch (error) {
    console.error('❌ Ошибка инициализации Three.js:', error);
}

console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');
console.log('Если все проверки прошли успешно, запускайте configurator.js');
