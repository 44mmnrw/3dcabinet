"""
Скрипт для измерения РЕАЛЬНЫХ размеров геометрии в GLB файле
"""
import sys
import struct
import json

def read_glb(file_path):
    with open(file_path, 'rb') as f:
        # Читаем заголовок GLB
        magic = f.read(4)
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        print(f"GLB версия: {version}")
        print(f"Размер файла: {length} байт")
        
        # Читаем JSON chunk
        json_chunk_length = struct.unpack('<I', f.read(4))[0]
        json_chunk_type = f.read(4)
        json_data = f.read(json_chunk_length).decode('utf-8')
        gltf = json.loads(json_data)
        
        # Читаем BIN chunk
        bin_chunk_length = struct.unpack('<I', f.read(4))[0]
        bin_chunk_type = f.read(4)
        bin_data = f.read(bin_chunk_length)
        
        print(f"\nJSON chunk: {json_chunk_length} байт")
        print(f"BIN chunk: {bin_chunk_length} байт")
        
        # Ищем accessor для POSITION (первая mesh, первый primitive)
        if 'meshes' in gltf and len(gltf['meshes']) > 0:
            first_mesh = gltf['meshes'][0]
            print(f"\nПервый mesh: {first_mesh.get('name', 'без имени')}")
            
            if 'primitives' in first_mesh and len(first_mesh['primitives']) > 0:
                primitive = first_mesh['primitives'][0]
                position_accessor_index = primitive['attributes'].get('POSITION')
                
                if position_accessor_index is not None:
                    accessor = gltf['accessors'][position_accessor_index]
                    
                    print(f"\nAccessor POSITION:")
                    print(f"  Count: {accessor['count']} вершин")
                    print(f"  Type: {accessor['type']}")
                    print(f"  ComponentType: {accessor['componentType']}")
                    
                    if 'bufferView' in accessor:
                        buffer_view_index = accessor['bufferView']
                        buffer_view = gltf['bufferViews'][buffer_view_index]
                        print(f"  BufferView: {buffer_view_index}")
                    
                    # Читаем min/max из accessor (если есть)
                    if 'min' in accessor and 'max' in accessor:
                        min_pos = accessor['min']
                        max_pos = accessor['max']
                        
                        print(f"\n📐 РАЗМЕРЫ ГЕОМЕТРИИ (из accessor):")
                        print(f"  Min: [{min_pos[0]:.6f}, {min_pos[1]:.6f}, {min_pos[2]:.6f}]")
                        print(f"  Max: [{max_pos[0]:.6f}, {max_pos[1]:.6f}, {max_pos[2]:.6f}]")
                        
                        size_x = max_pos[0] - min_pos[0]
                        size_y = max_pos[1] - min_pos[1]
                        size_z = max_pos[2] - min_pos[2]
                        
                        print(f"\n📏 РАЗМЕРЫ:")
                        print(f"  X (width): {size_x:.6f} units")
                        print(f"  Y (height): {size_y:.6f} units")
                        print(f"  Z (depth): {size_z:.6f} units")
                        
                        diagonal = (size_x**2 + size_y**2 + size_z**2)**0.5
                        print(f"  Diagonal: {diagonal:.6f} units")
                        
                        print(f"\n🔍 ОПРЕДЕЛЕНИЕ ЕДИНИЦ ИЗМЕРЕНИЯ:")
                        print(f"  Если units = метры:")
                        print(f"    Width: {size_x * 1000:.1f} мм")
                        print(f"    Height: {size_y * 1000:.1f} мм")
                        print(f"    Depth: {size_z * 1000:.1f} мм")
                        
                        print(f"\n  Если units = миллиметры:")
                        print(f"    Width: {size_x:.1f} мм")
                        print(f"    Height: {size_y:.1f} мм")
                        print(f"    Depth: {size_z:.1f} мм")
                        
                        print(f"\n  Ожидаемые размеры шкафа:")
                        print(f"    Width: 700 мм")
                        print(f"    Height: 500 мм")
                        print(f"    Depth: 240 мм")
                        
                        # Вычислить scaleFactor
                        expected_diagonal = (700**2 + 500**2 + 240**2)**0.5
                        print(f"\n🎯 КОЭФФИЦИЕНТ МАСШТАБИРОВАНИЯ:")
                        print(f"  Expected diagonal: {expected_diagonal:.1f} мм")
                        print(f"  Initial diagonal: {diagonal:.6f} units")
                        
                        if size_x < 10:  # Скорее всего метры
                            print(f"  ✅ GLB в МЕТРАХ -> scaleFactor ≈ {expected_diagonal / diagonal:.1f}")
                        else:  # Скорее всего миллиметры
                            print(f"  ✅ GLB в МИЛЛИМЕТРАХ -> scaleFactor ≈ {expected_diagonal / diagonal:.3f}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Использование: python measure_glb_size.py <путь_к_glb>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    read_glb(file_path)
