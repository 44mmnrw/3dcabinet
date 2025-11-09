// Минимальная тестовая версия конфигуратора
console.log('TEST: configurator-minimal.js загружается');

import * as THREE from '../libs/three.module.js';
console.log('TEST: THREE загружен', !!THREE);

import { SceneManager } from '../modules/SceneManager.js';
console.log('TEST: SceneManager импортирован', !!SceneManager);

import { CabinetModel } from '../modules/CabinetModel.js';
console.log('TEST: CabinetModel импортирован', !!CabinetModel);

import { CabinetManager } from '../modules/CabinetManager.js';
console.log('TEST: CabinetManager импортирован', !!CabinetManager);

console.log('TEST: Все импорты прошли успешно!');

// Проверка контейнера
const container = document.querySelector('#cabinet-3d-container');
console.log('TEST: Контейнер найден:', !!container);

if (container) {
    console.log('TEST: Создание SceneManager...');
    try {
        const sceneManager = new SceneManager(container);
        console.log('TEST: SceneManager создан успешно!');
        window.testSceneManager = sceneManager;
    } catch (error) {
        console.error('TEST ERROR: Не удалось создать SceneManager:', error);
    }
}
