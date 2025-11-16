"""
Простой анализатор GLB без зависимостей
Читает JSON-часть GLB и выводит структуру узлов
"""

import struct
import json
import sys

def read_glb_structure(filepath):
    with open(filepath, 'rb') as f:
        # Читаем GLB header (12 байт)
        magic = f.read(4)
        if magic != b'glTF':
            print("❌ Это не GLB файл!")
            return
        
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        print(f"📦 GLB версия: {version}")
        print(f"📦 Размер файла: {length} байт\n")
        
        # Читаем первый chunk (JSON)
        chunk_length = struct.unpack('<I', f.read(4))[0]
        chunk_type = f.read(4)
        
        if chunk_type != b'JSON':
            print("❌ Первый chunk не JSON!")
            return
        
        # Читаем JSON данные
        json_data = f.read(chunk_length).decode('utf-8')
        gltf = json.loads(json_data)
        
        # Выводим структуру
        print("═" * 60)
        print("🌲 СТРУКТУРА УЗЛОВ (NODES)")
        print("═" * 60)
        
        if 'nodes' in gltf:
            for i, node in enumerate(gltf['nodes']):
                name = node.get('name', f'(node_{i})')
                mesh_idx = node.get('mesh', None)
                children = node.get('children', [])
                
                # Определяем тип
                if mesh_idx is not None:
                    node_type = f"Mesh #{mesh_idx}"
                elif children:
                    node_type = "Group"
                else:
                    node_type = "Empty"
                
                print(f"\n📌 Node {i}: {name}")
                print(f"   Тип: {node_type}")
                
                if 'translation' in node:
                    print(f"   Position: {node['translation']}")
                if 'rotation' in node:
                    print(f"   Rotation: {node['rotation']}")
                if 'scale' in node:
                    print(f"   Scale: {node['scale']}")
                if children:
                    print(f"   Дети: {children}")
        
        # Выводим имена мешей
        print("\n" + "═" * 60)
        print("📦 МЕШИ (MESHES)")
        print("═" * 60)
        
        if 'meshes' in gltf:
            for i, mesh in enumerate(gltf['meshes']):
                name = mesh.get('name', f'(mesh_{i})')
                primitives = len(mesh.get('primitives', []))
                print(f"\n📦 Mesh {i}: {name}")
                print(f"   Primitives: {primitives}")
        
        # Сводка
        print("\n" + "═" * 60)
        print("📊 СВОДКА")
        print("═" * 60)
        print(f"Узлов (nodes): {len(gltf.get('nodes', []))}")
        print(f"Мешей (meshes): {len(gltf.get('meshes', []))}")
        print(f"Материалов: {len(gltf.get('materials', []))}")
        print(f"Текстур: {len(gltf.get('textures', []))}")
        
        # Список ВСЕХ имён
        print("\n" + "═" * 60)
        print("📋 ВСЕ ИМЕНА В МОДЕЛИ")
        print("═" * 60)
        
        all_names = []
        if 'nodes' in gltf:
            for node in gltf['nodes']:
                if 'name' in node:
                    all_names.append(f"Node: {node['name']}")
        
        if 'meshes' in gltf:
            for mesh in gltf['meshes']:
                if 'name' in mesh:
                    all_names.append(f"Mesh: {mesh['name']}")
        
        for name in all_names:
            print(f"  • {name}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        filepath = r'c:\laragon\www\3dcabinet\public\assets\models\thermocabinets\tsh_700_500_240\tsh_700_500_240.glb'
    else:
        filepath = sys.argv[1]
    
    print(f"\n🔍 Анализ файла: {filepath}\n")
    read_glb_structure(filepath)
    print("\n✅ Анализ завершён\n")
