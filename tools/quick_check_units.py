"""
Быстрая проверка единиц измерения GLB-модели
"""
import sys
from pygltflib import GLTF2
import struct
import numpy as np

def get_bounds(file_path):
    gltf = GLTF2().load(file_path)
    
    all_positions = []
    
    for mesh in gltf.meshes:
        for primitive in mesh.primitives:
            # Получить accessor для POSITION
            if hasattr(primitive.attributes, 'POSITION'):
                pos_accessor_idx = primitive.attributes.POSITION
                accessor = gltf.accessors[pos_accessor_idx]
                
                # Если есть min/max в accessor, используем их
                if accessor.min and accessor.max:
                    all_positions.extend([accessor.min, accessor.max])
    
    if not all_positions:
        print("❌ Не удалось получить позиции из модели")
        return
    
    # Вычислить общий bounding box
    positions = np.array(all_positions)
    bbox_min = positions.min(axis=0)
    bbox_max = positions.max(axis=0)
    size = bbox_max - bbox_min
    
    print(f"\n{'='*60}")
    print(f"📦 РАЗМЕРЫ МОДЕЛИ: {file_path.split('/')[-1]}")
    print(f"{'='*60}")
    print(f"Min: [{bbox_min[0]:.4f}, {bbox_min[1]:.4f}, {bbox_min[2]:.4f}]")
    print(f"Max: [{bbox_max[0]:.4f}, {bbox_max[1]:.4f}, {bbox_max[2]:.4f}]")
    print(f"\n📏 Размеры:")
    print(f"   X (ширина):  {size[0]:.4f}")
    print(f"   Y (высота):  {size[1]:.4f}")
    print(f"   Z (глубина): {size[2]:.4f}")
    
    # Определить единицы измерения
    avg_size = np.mean(size)
    if avg_size < 1:
        print(f"\n✅ Единицы: МЕТРЫ (средний размер {avg_size:.3f} м)")
        print(f"   В миллиметрах: {size[0]*1000:.1f} × {size[1]*1000:.1f} × {size[2]*1000:.1f} мм")
    else:
        print(f"\n✅ Единицы: МИЛЛИМЕТРЫ (средний размер {avg_size:.1f} мм)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick_check_units.py <path/to/model.glb>")
        sys.exit(1)
    
    get_bounds(sys.argv[1])
