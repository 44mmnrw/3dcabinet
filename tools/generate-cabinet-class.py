#!/usr/bin/env python3
"""
Генератор классов шкафов для 3DCabinet

Автоматически создаёт JavaScript класс шкафа на основе FreeCAD JSON-схем компонентов.
Анализирует структуру папки, парсит размеры, генерирует код сборки и обновляет каталог.

Автор: 3DCabinet Team
Дата: 15 ноября 2025
"""

import os
import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

# Шаблон JavaScript класса
CLASS_TEMPLATE = """import * as THREE from '../../libs/three.module.js';
import {{ FreeCADGeometryLoader }} from '../../loaders/FreeCADGeometryLoader.js';

/**
 * Класс шкафа {class_name}
 * Автоматически сгенерирован из FreeCAD JSON-схем
 * Размеры: {width}×{height}×{depth} мм
 * Компоненты: {component_list}
 */
export class {class_name} {{
    constructor() {{
        this.loader = new FreeCADGeometryLoader();
        this.assembly = new THREE.Group();
        this.assembly.name = '{class_name}_Assembly';
        this.components = {{}};
    }}

    /**
     * Сборка компонентов шкафа из JSON-схем
     * @param {{Object}} options - Опции сборки
     * @param {{string}} options.basePath - Базовый путь к моделям
     * @returns {{Promise<THREE.Group>}} Собранный шкаф
     */
    async assemble(options = {{}}) {{
        const basePath = options.basePath || './assets/models/freecad';

        try {{
{assembly_code}
            
            // Центрируем всю сборку относительно нижней плоскости
            this._alignAssemblyToFloor();
            
            console.log('✅ Шкаф {class_name} собран успешно');
            console.log('📦 Компоненты:', Object.keys(this.components));
            return this.assembly;
        }} catch (error) {{
            console.error('❌ Ошибка сборки {class_name}:', error);
            throw error;
        }}
    }}

    // ========== Методы управления компонентами ==========

    /**
     * Установить позицию компонента
     */
    setComponentPosition(componentName, x, y, z) {{
        const c = this.components[componentName];
        if (c) c.position.set(x, y, z);
    }}

    /**
     * Получить локальную позицию компонента
     */
    getComponentPosition(componentName) {{
        const c = this.components[componentName];
        return c ? c.position.clone() : null;
    }}

    /**
     * Получить мировую позицию компонента
     */
    getComponentWorldPosition(componentName) {{
        const c = this.components[componentName];
        if (!c) return null;
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        return v;
    }}

    /**
     * Показать/скрыть компонент
     */
    setComponentVisibility(componentName, visible) {{
        const c = this.components[componentName];
        if (c) c.visible = visible;
    }}

    /**
     * Выровнять сборку так, чтобы origin был на нижней плоскости
     */
    _alignAssemblyToFloor() {{
        // Обновляем матрицы перед расчётом bbox (КРИТИЧНО для вложенных трансформаций)
        this.assembly.updateMatrixWorld(true);
        
        // Получаем Bounding Box всей сборки
        const bbox = new THREE.Box3().setFromObject(this.assembly);
        
        // Вычисляем смещение: нижняя точка должна быть на Y=0
        const offsetY = -bbox.min.y;
        
        // Смещаем саму сборку (не дочерние элементы!)
        this.assembly.position.y += offsetY;
        
        console.log(`📐 Assembly aligned to floor. Offset Y: ${{offsetY.toFixed(3)}}м`);
        
        return offsetY;
    }}

    /**
     * Переместить всю сборку
     */
    setAssemblyPosition(x, y, z) {{
        this.assembly.position.set(x, y, z);
    }}

    /**
     * Получить позицию сборки
     */
    getAssemblyPosition() {{
        return this.assembly.position.clone();
    }}

    /**
     * Переместить сборку на величину (относительное смещение)
     */
    moveAssemblyBy(dx, dy, dz) {{
        this.assembly.position.x += dx;
        this.assembly.position.y += dy;
        this.assembly.position.z += dz;
    }}

    /**
     * Сбросить позицию в начало координат (0, 0, 0)
     */
    resetAssemblyPosition() {{
        this.assembly.position.set(0, 0, 0);
    }}

    /**
     * Информация о сборке и компонентах
     */
    getInfo() {{
        const info = {{
            assembly: {{
                name: this.assembly.name,
                position: this.assembly.position.toArray(),
                children: this.assembly.children.length
            }},
            components: {{}}
        }};
        Object.entries(this.components).forEach(([name, c]) => {{
            if (!c) return;
            const world = new THREE.Vector3();
            c.getWorldPosition(world);
            info.components[name] = {{
                name: c.name,
                visible: c.visible,
                position: {{
                    local: c.position.toArray(),
                    world: world.toArray()
                }},
                scale: c.scale.toArray()
            }};
        }});
        return info;
    }}

    /**
     * Получить все компоненты шкафа
     */
    getComponents() {{ 
        return this.components; 
    }}

    /**
     * Получить корневую группу сборки
     */
    getAssembly() {{ 
        return this.assembly; 
    }}
}}
"""


def generate_assembly_code(components: List[Dict[str, str]], folder_name: str) -> str:
    """
    Генерирует код загрузки и сборки компонентов
    
    Args:
        components: Список компонентов из analyze_components()
        folder_name: Имя папки с компонентами
    
    Returns:
        Сгенерированный JavaScript код
    """
    code_lines = []
    
    for idx, comp in enumerate(components, 1):
        var_name = comp['var_name']
        filename = comp['filename']
        
        # Определяем позицию (по умолчанию 0,0,0)
        position = "0, 0, 0"
        
        code_lines.append(f"""            // {filename}
            this.components.{var_name} = await this.loader.load(`${{basePath}}/{folder_name}/{filename}`);
            this.components.{var_name}.name = '{var_name}';
            this.components.{var_name}.scale.set(0.001, 0.001, 0.001);
            this.components.{var_name}.position.set({position});
            this.assembly.add(this.components.{var_name});
""")
    
    return "\n".join(code_lines)


def analyze_components(source_path: Path) -> List[Dict[str, str]]:
    """
    Анализирует все JSON-файлы компонентов в папке
    
    Args:
        source_path: Путь к папке с JSON-схемами
    
    Returns:
        Список словарей с информацией о каждом компоненте:
        [
            {
                'filename': 'body.json',
                'var_name': 'body',
                'stem': 'body'
            },
            ...
        ]
    """
    components = []
    
    for json_file in sorted(source_path.glob('*.json')):
        filename = json_file.name
        stem = json_file.stem  # Имя без расширения
        
        # Используем имя файла как есть (без расширения) как var_name
        # Заменяем недопустимые символы для JavaScript переменных
        var_name = stem.replace('-', '_').replace(' ', '_')
        
        components.append({
            'filename': filename,
            'var_name': var_name,
            'stem': stem
        })
    
    return components


def calculate_cabinet_dimensions(source_path: Path, components: List[Dict[str, str]]) -> Tuple[float, float, float]:
    """
    Вычисляет реальные размеры шкафа, читая JSON-схемы компонентов
    
    Args:
        source_path: Путь к папке с JSON-схемами
        components: Список компонентов из analyze_components()
    
    Returns:
        Tuple[width, height, depth] в миллиметрах (из bbox моделей)
    """
    max_x, max_y, max_z = 0, 0, 0
    
    for comp in components:
        json_path = source_path / comp['filename']
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Читаем вершины из FreeCAD JSON
            if 'vertices' in data:
                vertices = data['vertices']
                for i in range(0, len(vertices), 3):
                    x, y, z = abs(vertices[i]), abs(vertices[i+1]), abs(vertices[i+2])
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
                    max_z = max(max_z, z)
        except Exception as e:
            print(f"⚠️  Не удалось прочитать {comp['filename']}: {e}")
            continue
    
    # Переводим из метров в миллиметры (FreeCAD экспортирует в метрах)
    width = round(max_x * 1000)
    height = round(max_y * 1000)
    depth = round(max_z * 1000)
    
    return width, height, depth


def create_catalog_entry(class_name: str, width: int, height: int, depth: int, 
                        module_path: str) -> Dict:
    """
    Создаёт запись для catalog.json
    """
    return {
        "id": class_name,
        "name": f"Шкаф {class_name.replace('_', ' ')}",
        "className": class_name,
        "modulePath": module_path,
        "dimensions": {
            "width": width,
            "height": height,
            "depth": depth
        },
        "mountingType": "din_rail",
        "description": f"Шкаф {width}×{height}×{depth} мм (автоматически сгенерирован)"
    }


def update_catalog(catalog_path: Path, new_entry: Dict) -> None:
    """
    Обновляет catalog.json, добавляя новую запись
    """
    if catalog_path.exists():
        with open(catalog_path, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
    else:
        catalog = {"cabinets": []}
    
    # Проверяем, не существует ли уже
    existing_ids = [c['id'] for c in catalog['cabinets']]
    if new_entry['id'] in existing_ids:
        print(f"⚠️  Шкаф '{new_entry['id']}' уже существует в каталоге, заменяем...")
        catalog['cabinets'] = [c for c in catalog['cabinets'] if c['id'] != new_entry['id']]
    
    catalog['cabinets'].append(new_entry)
    
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description='Генератор классов шкафов для 3DCabinet',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  1. Генерация из папки с компонентами:
     python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_1200_800_400

  2. Без обновления каталога:
     python tools/generate-cabinet-class.py --source public/assets/models/freecad/TS_700_500_250 --no-catalog

Структура исходной папки (произвольные названия JSON):
  public/assets/models/freecad/TS_700_500_250/
    ├── body_700_500_250.json
    ├── door_700_500_250.json
    ├── panel_700_500_250.json
    └── din_rail40_700_500_250.json
  
  Или (любые названия папки и файлов):
  public/assets/models/freecad/MyCabinet/
    ├── корпус.json
    ├── крышка.json
    └── задняя_стенка.json

ВАЖНО: Размеры шкафа вычисляются автоматически из vertices в JSON-схемах,
        название папки может быть любым!

Результат:
  public/js/cabinets/MyCabinet/
    └── MyCabinet.js  (сгенерированный класс)
  
  public/assets/models/cabinets/catalog.json  (обновлён)
        """
    )
    
    parser.add_argument(
        '--source',
        type=str,
        required=True,
        help='Путь к папке с FreeCAD JSON-схемами компонентов (относительно корня проекта)'
    )
    
    parser.add_argument(
        '--no-catalog',
        action='store_true',
        help='Не обновлять catalog.json'
    )
    
    args = parser.parse_args()
    
    # Определяем корень проекта (на 2 уровня выше от tools/)
    project_root = Path(__file__).parent.parent
    source_path = project_root / args.source
    
    if not source_path.exists():
        print(f"❌ Ошибка: Папка '{source_path}' не найдена")
        return 1
    
    print(f"🔍 Анализ папки: {source_path}")
    
    # Извлекаем имя класса из названия папки
    folder_name = source_path.name
    class_name = folder_name
    
    # Анализируем компоненты
    components = analyze_components(source_path)
    print(f"📦 Найдено компонентов: {len(components)}")
    for comp in components:
        print(f"   - {comp['filename']} → this.components.{comp['var_name']}")
    
    if not components:
        print("❌ В папке не найдено ни одного JSON-файла компонента")
        return 1
    
    # Вычисляем размеры из JSON-схем
    print(f"📐 Анализ геометрии компонентов...")
    width, height, depth = calculate_cabinet_dimensions(source_path, components)
    print(f"📏 Размеры шкафа: {width}×{height}×{depth} мм (вычислено из vertices)")
    
    # Генерируем код сборки
    assembly_code = generate_assembly_code(components, folder_name)
    component_list = ', '.join([c['var_name'] for c in components])
    
    class_code = CLASS_TEMPLATE.format(
        class_name=class_name,
        width=width,
        height=height,
        depth=depth,
        folder_name=folder_name,
        assembly_code=assembly_code,
        component_list=component_list
    )
    
    # Создаём выходную директорию
    output_dir = project_root / 'public' / 'js' / 'cabinets' / class_name
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"{class_name}.js"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(class_code)
    
    print(f"✅ Создан класс: {output_file.relative_to(project_root)}")
    
    # Обновляем каталог
    if not args.no_catalog:
        catalog_path = project_root / 'public' / 'assets' / 'models' / 'cabinets' / 'catalog.json'
        module_path = f"../cabinets/{class_name}/{class_name}.js"
        
        catalog_entry = create_catalog_entry(class_name, width, height, depth, module_path)
        update_catalog(catalog_path, catalog_entry)
        
        print(f"✅ Обновлён каталог: {catalog_path.relative_to(project_root)}")
    
    print(f"\n🎉 Генерация завершена успешно!")
    print(f"\n💡 Для использования в коде:")
    print(f"   await cabinetManager.addCabinetById('{class_name}');")
    
    return 0


if __name__ == '__main__':
    exit(main())
