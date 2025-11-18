/**
 * Скрипт для анализа структуры GLB-модели
 * Выводит иерархию объектов и их имена
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к GLB-файлу
const glbPath = path.join(__dirname, '../public/assets/models/thermocabinets/tsh_700_500_240/tsh_700_500_240.glb');

console.log('📦 Анализ GLB-модели:', glbPath);
console.log('═'.repeat(60));

// Настроить DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(path.join(__dirname, '../public/js/libs/draco/'));

// Загрузить GLB
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// Читаем файл
const glbData = fs.readFileSync(glbPath);
const arrayBuffer = glbData.buffer.slice(glbData.byteOffset, glbData.byteOffset + glbData.byteLength);

loader.parse(arrayBuffer, '', (gltf) => {
    console.log('\n✅ Модель загружена успешно\n');
    
    const scene = gltf.scene;
    
    // Функция для вывода иерархии
    function printHierarchy(object, level = 0) {
        const indent = '  '.repeat(level);
        const icon = object.isMesh ? '📦' : object.isGroup ? '📁' : '🔹';
        
        console.log(`${indent}${icon} ${object.name || '(unnamed)'} [${object.type}]`);
        
        if (object.isMesh && object.geometry) {
            const geo = object.geometry;
            console.log(`${indent}   └─ Vertices: ${geo.attributes.position?.count || 0}`);
        }
        
        if (object.children && object.children.length > 0) {
            object.children.forEach(child => {
                printHierarchy(child, level + 1);
            });
        }
    }
    
    console.log('🌲 СТРУКТУРА МОДЕЛИ:');
    console.log('─'.repeat(60));
    printHierarchy(scene);
    
    console.log('\n📊 СВОДКА:');
    console.log('─'.repeat(60));
    
    let meshCount = 0;
    let groupCount = 0;
    const allNames = [];
    
    scene.traverse((obj) => {
        if (obj.isMesh) meshCount++;
        if (obj.isGroup) groupCount++;
        if (obj.name) allNames.push(obj.name);
    });
    
    console.log(`Всего объектов: ${scene.children.length}`);
    console.log(`Mesh объектов: ${meshCount}`);
    console.log(`Group объектов: ${groupCount}`);
    console.log(`\nВсе имена объектов:`);
    allNames.forEach(name => console.log(`  - ${name}`));
    
    console.log('\n✅ Анализ завершён');
    
}, (error) => {
    console.error('❌ Ошибка загрузки:', error);
});
