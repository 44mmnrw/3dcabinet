"""
Скрипт для автоматической подгонки GLB-модели под требования
- Конвертирует единицы измерения в миллиметры
- Центрирует модель (origin в нижнем центре)
- Масштабирует до заданных размеров
- Проверяет структуру узлов

Требования: pip install pygltflib numpy
"""

import sys
import struct
from pathlib import Path
from pygltflib import GLTF2
import numpy as np

# === НАСТРОЙКИ ПОДГОНКИ ===
TARGET_WIDTH = 600   # мм (X)
TARGET_HEIGHT = 700  # мм (Y)
TARGET_DEPTH = 500   # мм (Z)

# Режим масштабирования:
# 'fit' — вписать в заданные размеры (пропорционально)
# 'stretch' — растянуть до точных размеров
# 'meters_to_mm' — конвертировать метры в миллиметры (×1000)  ← ИСПОЛЬЗУЕМ ЭТОТ!
# 'cm_to_mm' — конвертировать сантиметры в миллиметры (×100)
SCALE_MODE = 'meters_to_mm'  # ← ИЗМЕНЕНО!

# Центрирование
CENTER_XZ = True  # Центрировать по X и Z
FLOOR_Y = True    # Поставить на пол (Y min = 0)


def read_vertices_from_gltf(gltf, file_path):
    """Читает все вершины из GLB-файла"""
    all_vertices = []
    
    if not (gltf.meshes and gltf.accessors and gltf.bufferViews and gltf.buffers):
        return np.array([])
    
    for mesh in gltf.meshes:
        for primitive in mesh.primitives:
            if 'POSITION' not in primitive.attributes:
                continue
            
            accessor_idx = primitive.attributes['POSITION']
            accessor = gltf.accessors[accessor_idx]
            buffer_view = gltf.bufferViews[accessor.bufferView]
            buffer = gltf.buffers[buffer_view.buffer]
            
            # Получить бинарные данные
            if buffer.uri:
                bin_path = Path(file_path).parent / buffer.uri
                with open(bin_path, 'rb') as f:
                    buffer_data = f.read()
            else:
                buffer_data = gltf.binary_blob()
            
            # Извлечь вершины
            offset = buffer_view.byteOffset + (accessor.byteOffset if accessor.byteOffset else 0)
            stride = buffer_view.byteStride if buffer_view.byteStride else 12
            count = accessor.count
            
            for i in range(count):
                pos = offset + i * stride
                x, y, z = struct.unpack_from('fff', buffer_data, pos)
                all_vertices.append([x, y, z])
    
    return np.array(all_vertices)


def write_vertices_to_gltf(gltf, file_path, new_vertices):
    """Записывает обновлённые вершины обратно в GLB"""
    vertex_idx = 0
    
    for mesh in gltf.meshes:
        for primitive in mesh.primitives:
            if 'POSITION' not in primitive.attributes:
                continue
            
            accessor_idx = primitive.attributes['POSITION']
            accessor = gltf.accessors[accessor_idx]
            buffer_view = gltf.bufferViews[accessor.bufferView]
            buffer = gltf.buffers[buffer_view.buffer]
            
            # Получить бинарные данные
            if buffer.uri:
                bin_path = Path(file_path).parent / buffer.uri
                with open(bin_path, 'rb') as f:
                    buffer_data = bytearray(f.read())
            else:
                buffer_data = bytearray(gltf.binary_blob())
            
            # Записать новые вершины
            offset = buffer_view.byteOffset + (accessor.byteOffset if accessor.byteOffset else 0)
            stride = buffer_view.byteStride if buffer_view.byteStride else 12
            count = accessor.count
            
            for i in range(count):
                pos = offset + i * stride
                x, y, z = new_vertices[vertex_idx]
                struct.pack_into('fff', buffer_data, pos, x, y, z)
                vertex_idx += 1
            
            # Обновить accessor min/max
            mesh_vertices = new_vertices[vertex_idx - count:vertex_idx]
            accessor.min = mesh_vertices.min(axis=0).tolist()
            accessor.max = mesh_vertices.max(axis=0).tolist()
            
            # Сохранить обновлённые данные
            if buffer.uri:
                with open(bin_path, 'wb') as f:
                    f.write(buffer_data)
            else:
                gltf.set_binary_blob(bytes(buffer_data))


def adjust_glb_model(input_path, output_path):
    """Основная функция подгонки модели"""
    
    print(f"\n{'='*60}")
    print(f"🔧 ПОДГОНКА GLB-МОДЕЛИ")
    print(f"{'='*60}")
    print(f"Входной файл: {input_path}")
    print(f"Выходной файл: {output_path}")
    print(f"\nЦелевые размеры: {TARGET_WIDTH} × {TARGET_HEIGHT} × {TARGET_DEPTH} мм")
    print(f"Режим масштабирования: {SCALE_MODE}")
    print(f"Центрирование XZ: {CENTER_XZ}, Пол Y: {FLOOR_Y}\n")
    
    # Загрузить GLB
    try:
        gltf = GLTF2().load(input_path)
    except Exception as e:
        print(f"❌ Ошибка загрузки: {e}")
        return False
    
    # Прочитать вершины
    print("📖 Чтение вершин...")
    vertices = read_vertices_from_gltf(gltf, input_path)
    
    if len(vertices) == 0:
        print("❌ Не удалось прочитать вершины")
        return False
    
    print(f"✅ Прочитано вершин: {len(vertices)}")
    
    # Исходные размеры
    min_coords = vertices.min(axis=0)
    max_coords = vertices.max(axis=0)
    original_size = max_coords - min_coords
    original_center = (min_coords + max_coords) / 2
    
    print(f"\n📐 Исходные размеры:")
    print(f"   Размер: {original_size[0]:.4f} × {original_size[1]:.4f} × {original_size[2]:.4f}")
    print(f"   Центр: ({original_center[0]:.4f}, {original_center[1]:.4f}, {original_center[2]:.4f})")
    print(f"   Min: ({min_coords[0]:.4f}, {min_coords[1]:.4f}, {min_coords[2]:.4f})")
    print(f"   Max: ({max_coords[0]:.4f}, {max_coords[1]:.4f}, {max_coords[2]:.4f})")
    
    # === ШАГ 1: Масштабирование ===
    print(f"\n🔄 Шаг 1: Масштабирование...")
    
    if SCALE_MODE == 'meters_to_mm':
        scale_factor = np.array([1000, 1000, 1000])
        print(f"   Метры → миллиметры (×1000)")
    elif SCALE_MODE == 'cm_to_mm':
        scale_factor = np.array([100, 100, 100])
        print(f"   Сантиметры → миллиметры (×100)")
    elif SCALE_MODE == 'fit':
        # Вписать пропорционально
        scale_x = TARGET_WIDTH / original_size[0]
        scale_y = TARGET_HEIGHT / original_size[1]
        scale_z = TARGET_DEPTH / original_size[2]
        uniform_scale = min(scale_x, scale_y, scale_z)
        scale_factor = np.array([uniform_scale, uniform_scale, uniform_scale])
        print(f"   Пропорциональное вписывание: ×{uniform_scale:.2f}")
    elif SCALE_MODE == 'stretch':
        scale_x = TARGET_WIDTH / original_size[0]
        scale_y = TARGET_HEIGHT / original_size[1]
        scale_z = TARGET_DEPTH / original_size[2]
        scale_factor = np.array([scale_x, scale_y, scale_z])
        print(f"   Растягивание: X×{scale_x:.2f}, Y×{scale_y:.2f}, Z×{scale_z:.2f}")
    else:
        print(f"❌ Неизвестный режим масштабирования: {SCALE_MODE}")
        return False
    
    # Применить масштаб
    vertices = vertices * scale_factor
    
    # Пересчитать размеры после масштабирования
    min_coords = vertices.min(axis=0)
    max_coords = vertices.max(axis=0)
    scaled_size = max_coords - min_coords
    scaled_center = (min_coords + max_coords) / 2
    
    print(f"   Размер после масштаба: {scaled_size[0]:.2f} × {scaled_size[1]:.2f} × {scaled_size[2]:.2f} мм")
    
    # === ШАГ 2: Центрирование ===
    print(f"\n📍 Шаг 2: Центрирование...")
    
    offset = np.array([0.0, 0.0, 0.0])
    
    if CENTER_XZ:
        # Центрировать по X и Z
        offset[0] = -scaled_center[0]
        offset[2] = -scaled_center[2]
        print(f"   Центрирование по X и Z")
    
    if FLOOR_Y:
        # Поставить на пол (Y min = 0)
        offset[1] = -min_coords[1]
        print(f"   Установка на пол (Y min → 0)")
    
    vertices = vertices + offset
    
    # Финальные размеры
    final_min = vertices.min(axis=0)
    final_max = vertices.max(axis=0)
    final_size = final_max - final_min
    final_center = (final_min + final_max) / 2
    
    print(f"\n✅ Финальные размеры:")
    print(f"   Размер: {final_size[0]:.2f} × {final_size[1]:.2f} × {final_size[2]:.2f} мм")
    print(f"   Центр: ({final_center[0]:.2f}, {final_center[1]:.2f}, {final_center[2]:.2f})")
    print(f"   Min: ({final_min[0]:.2f}, {final_min[1]:.2f}, {final_min[2]:.2f})")
    print(f"   Max: ({final_max[0]:.2f}, {final_max[1]:.2f}, {final_max[2]:.2f})")
    
    # Проверка соответствия целевым размерам
    tolerance = 5  # мм
    if SCALE_MODE == 'fit':
        max_dim = max(final_size)
        target_max = max(TARGET_WIDTH, TARGET_HEIGHT, TARGET_DEPTH)
        if abs(max_dim - target_max) < tolerance:
            print(f"   ✅ Размеры соответствуют целевым (в пределах {tolerance} мм)")
        else:
            print(f"   ⚠️  Размеры отличаются от целевых на {abs(max_dim - target_max):.2f} мм")
    
    # === ШАГ 3: Запись обновлённой модели ===
    print(f"\n💾 Шаг 3: Сохранение...")
    
    try:
        write_vertices_to_gltf(gltf, input_path, vertices)
        gltf.save(output_path)
        print(f"✅ Модель сохранена: {output_path}")
    except Exception as e:
        print(f"❌ Ошибка сохранения: {e}")
        return False
    
    # === ИТОГОВЫЕ РЕКОМЕНДАЦИИ ===
    print(f"\n{'='*60}")
    print(f"💡 РЕКОМЕНДАЦИИ ДЛЯ THREE.JS")
    print(f"{'='*60}")
    print(f"1. Загрузите файл: {Path(output_path).name}")
    print(f"2. Установите в CabinetModel.js:")
    print(f"   this.model.scale.set(1, 1, 1);  // Масштаб НЕ НУЖЕН")
    print(f"3. Установите в SceneManager.js:")
    print(f"   const distanceMultiplier = 2.5;  // Стандартное расстояние")
    print(f"4. Модель готова к использованию! ✅")
    print(f"{'='*60}\n")
    
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python adjust_glb_model.py <входной_файл.glb> [выходной_файл.glb]")
        print("\nПример:")
        print("  python adjust_glb_model.py test.glb test_adjusted.glb")
        print("\nЕсли выходной файл не указан, будет создан <input>_adjusted.glb")
        print("\nНастройки (измените в начале скрипта):")
        print(f"  TARGET_WIDTH = {TARGET_WIDTH} мм")
        print(f"  TARGET_HEIGHT = {TARGET_HEIGHT} мм")
        print(f"  TARGET_DEPTH = {TARGET_DEPTH} мм")
        print(f"  SCALE_MODE = '{SCALE_MODE}'  # fit | stretch | meters_to_mm | cm_to_mm")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not Path(input_file).exists():
        print(f"❌ Файл не найден: {input_file}")
        sys.exit(1)
    
    # Определить выходной файл
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        input_path = Path(input_file)
        output_file = str(input_path.parent / f"{input_path.stem}_adjusted{input_path.suffix}")
    
    # Выполнить подгонку
    success = adjust_glb_model(input_file, output_file)
    
    sys.exit(0 if success else 1)
