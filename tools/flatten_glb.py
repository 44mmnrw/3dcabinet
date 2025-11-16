"""
Скрипт для упрощения иерархии GLB-модели
Удаляет лишние контейнеры и выносит все mesh на верхний уровень
"""

import sys
import json
import struct
from pathlib import Path

def flatten_glb_structure(input_path, output_path):
    """Упрощает иерархию GLB: все mesh на верхний уровень"""
    
    print(f"\n{'='*60}")
    print(f"🔧 УПРОЩЕНИЕ СТРУКТУРЫ GLB")
    print(f"{'='*60}")
    print(f"Вход: {input_path}")
    print(f"Выход: {output_path}\n")
    
    # Читаем GLB
    with open(input_path, 'rb') as f:
        # Header
        magic = f.read(4)
        if magic != b'glTF':
            print("❌ Это не GLB файл!")
            return False
        
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        # JSON chunk
        json_length = struct.unpack('<I', f.read(4))[0]
        json_type = f.read(4)
        json_data = f.read(json_length).decode('utf-8')
        
        # BIN chunk (остаток файла)
        remaining_data = f.read()
    
    # Парсим JSON
    gltf = json.loads(json_data)
    
    print(f"📊 До изменений:")
    print(f"  Узлов: {len(gltf.get('nodes', []))}")
    print(f"  Мешей: {len(gltf.get('meshes', []))}")
    
    # Создаём новую плоскую структуру узлов
    new_nodes = []
    node_mapping = {}  # старый индекс → новый индекс
    
    # Целевые имена (оставляем только их)
    target_names = {
        'BODY', 'DOOR', 'INSULATION', 'INSULATION_FRAME', 
        'PANEL.003', 'DIN_RAIL_40.001', 'DIN_RAIL_40.002', 'DIN_RAIL_40.003'
    }
    
    # Проходим по всем узлам и собираем только целевые
    for i, node in enumerate(gltf.get('nodes', [])):
        name = node.get('name', '')
        
        if name in target_names:
            # Создаём упрощённый узел (без children, без лишних transform)
            new_node = {
                'name': name
            }
            
            # Если узел имеет mesh, сохраняем его
            if 'mesh' in node:
                new_node['mesh'] = node['mesh']
            
            # Если узел группа с детьми, ищем mesh в детях
            elif 'children' in node:
                # Найти первого ребёнка с mesh
                for child_idx in node['children']:
                    child = gltf['nodes'][child_idx]
                    if 'mesh' in child:
                        new_node['mesh'] = child['mesh']
                        break
            
            # Сохраняем трансформы (если есть)
            if 'translation' in node:
                new_node['translation'] = node['translation']
            if 'rotation' in node:
                new_node['rotation'] = node['rotation']
            if 'scale' in node:
                new_node['scale'] = node['scale']
            
            node_mapping[i] = len(new_nodes)
            new_nodes.append(new_node)
            print(f"✅ Добавлен: {name} (mesh: {'mesh' in new_node})")
    
    # Обновляем gltf
    gltf['nodes'] = new_nodes
    
    # Обновляем сцену (все узлы на верхнем уровне)
    if 'scenes' in gltf and len(gltf['scenes']) > 0:
        gltf['scenes'][0]['nodes'] = list(range(len(new_nodes)))
    
    print(f"\n📊 После изменений:")
    print(f"  Узлов: {len(gltf['nodes'])}")
    print(f"  Все на верхнем уровне: ✅")
    
    # Сериализуем обратно в JSON
    new_json = json.dumps(gltf, separators=(',', ':'))
    new_json_bytes = new_json.encode('utf-8')
    
    # Padding для выравнивания по 4 байта
    json_padding = (4 - len(new_json_bytes) % 4) % 4
    new_json_bytes += b' ' * json_padding
    
    # Записываем новый GLB
    with open(output_path, 'wb') as f:
        # GLB Header
        f.write(b'glTF')
        f.write(struct.pack('<I', 2))  # version
        
        # Total length (посчитаем позже)
        total_length_pos = f.tell()
        f.write(struct.pack('<I', 0))  # placeholder
        
        # JSON chunk header
        f.write(struct.pack('<I', len(new_json_bytes)))
        f.write(b'JSON')
        f.write(new_json_bytes)
        
        # BIN chunk (копируем как есть)
        f.write(remaining_data)
        
        # Обновляем total length
        total_length = f.tell()
        f.seek(total_length_pos)
        f.write(struct.pack('<I', total_length))
    
    print(f"\n✅ Новая модель сохранена: {output_path}")
    print(f"   Размер: {Path(output_path).stat().st_size / 1024:.2f} KB")
    return True

if __name__ == '__main__':
    input_glb = r'c:\laragon\www\3dcabinet\public\assets\models\thermocabinets\tsh_700_500_240\tsh_700_500_240.glb'
    output_glb = r'c:\laragon\www\3dcabinet\public\assets\models\thermocabinets\tsh_700_500_240\tsh_700_500_240_flat.glb'
    
    if len(sys.argv) > 1:
        input_glb = sys.argv[1]
    if len(sys.argv) > 2:
        output_glb = sys.argv[2]
    
    success = flatten_glb_structure(input_glb, output_glb)
    
    if success:
        print("\n" + "="*60)
        print("✅ ГОТОВО! Теперь используйте tsh_700_500_240_flat.glb")
        print("="*60)
    else:
        print("\n❌ Ошибка при обработке")
