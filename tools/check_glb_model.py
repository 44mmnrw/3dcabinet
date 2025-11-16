"""
Скрипт для анализа GLB-модели
Показывает размеры, центр, структуру узлов и другие параметры модели

Требования: pip install pygltflib numpy
"""

import sys
import json
from pathlib import Path
from pygltflib import GLTF2
import struct
import numpy as np

def analyze_glb(file_path):
    """Анализирует GLB файл и выводит все параметры"""
    
    print(f"\n{'='*60}")
    print(f"📦 АНАЛИЗ GLB-МОДЕЛИ")
    print(f"{'='*60}")
    print(f"Файл: {file_path}")
    print(f"Размер файла: {Path(file_path).stat().st_size / 1024:.2f} KB\n")
    
    # Загрузить GLB
    try:
        gltf = GLTF2().load(file_path)
    except Exception as e:
        print(f"❌ Ошибка загрузки файла: {e}")
        return
    
    # === БАЗОВАЯ ИНФОРМАЦИЯ ===
    print(f"{'─'*60}")
    print(f"📋 БАЗОВАЯ ИНФОРМАЦИЯ")
    print(f"{'─'*60}")
    
    if gltf.asset:
        print(f"Generator: {gltf.asset.generator if gltf.asset.generator else 'N/A'}")
        print(f"Version: {gltf.asset.version if gltf.asset.version else 'N/A'}")
    
    print(f"Сцен: {len(gltf.scenes) if gltf.scenes else 0}")
    print(f"Узлов (nodes): {len(gltf.nodes) if gltf.nodes else 0}")
    print(f"Мешей (meshes): {len(gltf.meshes) if gltf.meshes else 0}")
    print(f"Материалов: {len(gltf.materials) if gltf.materials else 0}")
    print(f"Текстур: {len(gltf.textures) if gltf.textures else 0}")
    print(f"Анимаций: {len(gltf.animations) if gltf.animations else 0}")
    
    # === СТРУКТУРА УЗЛОВ ===
    print(f"\n{'─'*60}")
    print(f"🌲 СТРУКТУРА УЗЛОВ")
    print(f"{'─'*60}")
    
    if gltf.nodes:
        for i, node in enumerate(gltf.nodes):
            indent = "  "
            name = node.name if node.name else f"Node_{i}"
            
            node_type = []
            if node.mesh is not None:
                node_type.append("Mesh")
            if node.camera is not None:
                node_type.append("Camera")
            if node.children:
                node_type.append(f"{len(node.children)} children")
            
            type_str = f" ({', '.join(node_type)})" if node_type else " (Empty)"
            
            print(f"{indent}[{i}] {name}{type_str}")
            
            # Трансформации
            if node.translation:
                t = node.translation
                print(f"{indent}    Position: ({t[0]:.4f}, {t[1]:.4f}, {t[2]:.4f})")
            if node.rotation:
                r = node.rotation
                print(f"{indent}    Rotation: ({r[0]:.4f}, {r[1]:.4f}, {r[2]:.4f}, {r[3]:.4f})")
            if node.scale:
                s = node.scale
                print(f"{indent}    Scale: ({s[0]:.4f}, {s[1]:.4f}, {s[2]:.4f})")
    
    # === РАЗМЕРЫ И BOUNDING BOX ===
    print(f"\n{'─'*60}")
    print(f"📐 РАЗМЕРЫ И BOUNDING BOX")
    print(f"{'─'*60}")
    
    all_vertices = []
    
    if gltf.meshes and gltf.accessors and gltf.bufferViews and gltf.buffers:
        for mesh_idx, mesh in enumerate(gltf.meshes):
            mesh_name = mesh.name if mesh.name else f"Mesh_{mesh_idx}"
            
            for prim_idx, primitive in enumerate(mesh.primitives):
                if 'POSITION' in primitive.attributes:
                    accessor_idx = primitive.attributes['POSITION']
                    accessor = gltf.accessors[accessor_idx]
                    
                    # Получить данные вершин
                    buffer_view = gltf.bufferViews[accessor.bufferView]
                    buffer = gltf.buffers[buffer_view.buffer]
                    
                    # Прочитать бинарные данные
                    if buffer.uri:
                        # Внешний файл
                        bin_path = Path(file_path).parent / buffer.uri
                        with open(bin_path, 'rb') as f:
                            buffer_data = f.read()
                    else:
                        # Встроенные данные (GLB)
                        buffer_data = gltf.binary_blob()
                    
                    # Извлечь вершины
                    offset = buffer_view.byteOffset + (accessor.byteOffset if accessor.byteOffset else 0)
                    stride = buffer_view.byteStride if buffer_view.byteStride else 12  # 3 floats
                    count = accessor.count
                    
                    for i in range(count):
                        pos = offset + i * stride
                        x, y, z = struct.unpack_from('fff', buffer_data, pos)
                        all_vertices.append([x, y, z])
    
    if all_vertices:
        vertices = np.array(all_vertices)
        
        min_coords = vertices.min(axis=0)
        max_coords = vertices.max(axis=0)
        center = (min_coords + max_coords) / 2
        size = max_coords - min_coords
        
        print(f"Всего вершин: {len(vertices)}")
        print(f"\nBounding Box:")
        print(f"  Min: ({min_coords[0]:.4f}, {min_coords[1]:.4f}, {min_coords[2]:.4f})")
        print(f"  Max: ({max_coords[0]:.4f}, {max_coords[1]:.4f}, {max_coords[2]:.4f})")
        print(f"  Центр: ({center[0]:.4f}, {center[1]:.4f}, {center[2]:.4f})")
        print(f"  Размер: {size[0]:.4f} × {size[1]:.4f} × {size[2]:.4f}")
        
        # Определение единиц измерения
        diagonal = np.linalg.norm(size)
        print(f"  Диагональ: {diagonal:.4f}")
        
        if diagonal < 10:
            print(f"\n⚠️  Модель в МЕТРАХ (диагональ < 10)")
            print(f"   Размер в миллиметрах: {size[0]*1000:.0f} × {size[1]*1000:.0f} × {size[2]*1000:.0f} мм")
            print(f"   Рекомендуемый масштаб для Three.js: 1000×")
        elif diagonal < 100:
            print(f"\n⚠️  Модель в САНТИМЕТРАХ (диагональ < 100)")
            print(f"   Размер в миллиметрах: {size[0]*10:.0f} × {size[1]*10:.0f} × {size[2]*10:.0f} мм")
            print(f"   Рекомендуемый масштаб для Three.js: 100×")
        else:
            print(f"\n✅ Модель в МИЛЛИМЕТРАХ (диагональ >= 100)")
            print(f"   Рекомендуемый масштаб для Three.js: 1×")
        
        # Проверка положения относительно начала координат
        print(f"\n📍 Положение относительно (0, 0, 0):")
        if abs(center[0]) < 1 and abs(center[2]) < 1:
            print(f"   ✅ Модель отцентрирована по X и Z")
        else:
            print(f"   ⚠️  Модель СМЕЩЕНА по X и/или Z на ({center[0]:.2f}, {center[2]:.2f})")
            print(f"   Рекомендация: отцентрировать в Blender")
        
        if abs(min_coords[1]) < 0.1:
            print(f"   ✅ Модель стоит на полу (Y min ≈ 0)")
        else:
            print(f"   ⚠️  Модель НЕ на полу (Y min = {min_coords[1]:.2f})")
            print(f"   Рекомендация: переместить origin в нижний центр")
    else:
        print("⚠️  Не удалось извлечь данные вершин")
    
    # === МАТЕРИАЛЫ ===
    if gltf.materials:
        print(f"\n{'─'*60}")
        print(f"🎨 МАТЕРИАЛЫ")
        print(f"{'─'*60}")
        
        for i, material in enumerate(gltf.materials):
            name = material.name if material.name else f"Material_{i}"
            print(f"  [{i}] {name}")
            
            if material.pbrMetallicRoughness:
                pbr = material.pbrMetallicRoughness
                if pbr.baseColorFactor:
                    color = pbr.baseColorFactor
                    print(f"      Base Color: RGBA({color[0]:.2f}, {color[1]:.2f}, {color[2]:.2f}, {color[3]:.2f})")
                if pbr.baseColorTexture:
                    print(f"      Base Texture: Index {pbr.baseColorTexture.index}")
    
    # === ИТОГОВЫЕ РЕКОМЕНДАЦИИ ===
    print(f"\n{'='*60}")
    print(f"💡 РЕКОМЕНДАЦИИ ДЛЯ ИСПОЛЬЗОВАНИЯ В THREE.JS")
    print(f"{'='*60}")
    
    if all_vertices:
        if diagonal < 10:
            print(f"1. Модель экспортирована в метрах")
            print(f"2. Установите масштаб в CabinetModel.js:")
            print(f"   this.model.scale.set(1000, 1000, 1000);")
        elif diagonal < 100:
            print(f"1. Модель экспортирована в сантиметрах")
            print(f"2. Установите масштаб в CabinetModel.js:")
            print(f"   this.model.scale.set(100, 100, 100);")
        else:
            print(f"1. Модель в правильном масштабе (миллиметры)")
            print(f"2. Масштаб не требуется (или 1×)")
        
        if abs(center[0]) > 1 or abs(center[2]) > 1:
            print(f"3. ⚠️  Пересоздайте модель с центрированным origin")
        
        if abs(min_coords[1]) > 0.1:
            print(f"4. ⚠️  Переместите origin в нижний центр модели")
        
        # Расчет оптимального расстояния камеры
        optimal_distance = diagonal * 2.5
        if diagonal < 10:
            optimal_distance *= 1000
        elif diagonal < 100:
            optimal_distance *= 100
        
        print(f"\n5. Рекомендуемое расстояние камеры:")
        print(f"   SceneManager.js → distanceMultiplier = 2.5")
        print(f"   (итоговое расстояние ≈ {optimal_distance:.0f} мм)")
    
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python check_glb_model.py <путь_к_файлу.glb>")
        print("\nПример:")
        print("  python check_glb_model.py ../public/assets/models/thermocabinets/tsh_700_500_240/test.glb")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"❌ Файл не найден: {file_path}")
        sys.exit(1)
    
    analyze_glb(file_path)
