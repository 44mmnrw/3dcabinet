#!/usr/bin/env python3
"""
Генератор классов шкафов для 3DCabinet

Автоматически создаёт TypeScript класс шкафа на основе FreeCAD JSON-схем компонентов.
Анализирует структуру папки, парсит размеры, генерирует типизированный код сборки и обновляет каталог.

Автор: 3DCabinet Team
Версия: 3.0.0
Дата: 2025-11-16
Последнее обновление: Генерация TypeScript классов с полной типизацией (v3.0.0)
"""

import os
import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

# Метаданные скрипта
SCRIPT_VERSION = "3.0.0"
SCRIPT_DATE = "2025-11-16"
SCRIPT_AUTHOR = "3DCabinet Team"

# Шаблон TypeScript класса
CLASS_TEMPLATE = """import * as THREE from 'three';
import {{ FreeCADGeometryLoader }} from '../../loaders/FreeCADGeometryLoader.ts';
import {{ config as defaultConfig }} from './config.js';
import {{ CabinetBase }} from '../CabinetBase.ts';

/**
 * Конфигурация двери из конфига
 */
interface DoorConfig {{
    componentName?: string;
    rotationAxis?: 'x' | 'y' | 'z';
    pivotOffset?: {{
        x?: number;
        y?: number;
        z?: number;
    }};
}}

/**
 * Конфигурация шкафа
 */
interface CabinetConfig {{
    name?: string;
    door?: DoorConfig;
    components?: Record<string, {{
        file: string;
        scale?: number[];
        position?: number[];
    }}>;
    rails?: Array<{{
        id: string;
        file: string;
        scale?: number[];
        position?: number[];
        rotation?: number[];
    }}>;
    [key: string]: unknown;
}}

/**
 * Информация о компоненте
 */
interface ComponentInfo {{
    name: string;
    visible: boolean;
    position: {{
        local: number[];
        world: number[];
    }};
    scale: number[];
}}

/**
 * Информация о сборке
 */
interface AssemblyInfo {{
    name: string;
    position: number[];
    children: number;
}}

/**
 * Полная информация о шкафе
 */
interface CabinetInfo {{
    assembly: AssemblyInfo;
    components: Record<string, ComponentInfo>;
}}

/**
 * Опции для метода assemble
 */
interface AssembleOptions {{
    basePath?: string;
    config?: CabinetConfig;
}}

/**
 * Класс шкафа {class_name}
 * Автоматически сгенерирован из FreeCAD JSON-схем
 * Размеры: {width}×{height}×{depth} мм
 * Конфиг: config.js
 * 
 * Структура: config содержит компоненты и рейки с позициями
 */
export class {class_name} extends CabinetBase {{
    protected loader: FreeCADGeometryLoader;

    constructor() {{
        super(); // Вызываем конструктор базового класса
        this.loader = new FreeCADGeometryLoader();
        this.assembly.name = '{class_name}_Assembly';
        
        // Настройки двери из конфига (переопределяются в _loadConfig)
        // Указывай имя компонента двери для своего шкафа:
        this.doorComponentName = 'door_{class_name}'; // ← Измени если нужно
    }}

    /**
     * Загрузить конфиг (по умолчанию из встроенного модуля)
     * @param customConfig - Пользовательский конфиг (если не указан, использует встроенный)
     * @returns Загруженный конфиг
     */
    async _loadConfig(customConfig?: CabinetConfig): Promise<CabinetConfig> {{
        try {{
            if (customConfig) {{
                this.config = customConfig;
                console.log('✅ Конфиг загружен (пользовательский):', this.config['name']);
            }} else {{
                this.config = defaultConfig as CabinetConfig;
                console.log('✅ Конфиг загружен (встроенный):', this.config['name']);
            }}
            
            // Инициализируем настройки двери из конфига
            if (this.config.door) {{
                this.doorComponentName = this.config.door.componentName || null;
                this.doorRotationAxis = this.config.door.rotationAxis || 'y';
                
                if (this.config.door.pivotOffset) {{
                    this.doorPivotOffset.set(
                        this.config.door.pivotOffset.x || 0,
                        this.config.door.pivotOffset.y || 0,
                        this.config.door.pivotOffset.z || 0
                    );
                    console.log(`🚪 Настройки двери загружены (pivot: [${{this.doorPivotOffset.x.toFixed(3)}}, ${{this.doorPivotOffset.y.toFixed(3)}}, ${{this.doorPivotOffset.z.toFixed(3)}}])`);
                }}
            }}
            
            return this.config;
        }} catch (error) {{
            console.error('❌ Ошибка загрузки конфига:', error);
            throw error;
        }}
    }}

    /**
     * Сборка компонентов шкафа на основе конфига
     * @param options - Опции сборки
     * @param options.basePath - Полный путь к папке моделей (например http://localhost:5173/assets/models/freecad)
     * @param options.config - Пользовательский конфиг (если не указан, используется встроенный)
     * @returns Собранный шкаф
     */
    async assemble(options: AssembleOptions = {{}}): Promise<THREE.Group> {{
        const basePath = options.basePath || (window.location.origin + '/assets/models/freecad');
        
        // Если конфиг не загружен — загружаем (по умолчанию встроенный)
        if (!this.config) {{
            await this._loadConfig(options.config);
            // Загружаем настройки двери из конфига (ось вращения, pivot и т.д.)
            this._initDoorSettingsFromConfig();
        }}

        try {{
            await this._assembleFromConfig(basePath);
            
            // Инициализируем pivot для двери (должно быть после загрузки компонентов)
            this._initializeDoorPivot();
            
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

    /**
     * Внутренний метод сборки на основе конфига
     * @param basePath - Базовый путь к папке моделей
     */
    protected async _assembleFromConfig(basePath: string): Promise<void> {{
        if (!this.config) throw new Error('Конфиг не загружен');

        const folderName = this.config['name'] as string;

        // Обычные компоненты
        if (this.config['components']) {{
            const components = this.config['components'] as Record<string, {{ file: string; scale?: number[]; position?: number[] }}>;
            for (const [varName, compDef] of Object.entries(components)) {{
                const filename = compDef.file;
                const filePath = `${{basePath}}/${{folderName}}/${{filename}}`;
                
                this.components[varName] = await this.loader.load(filePath);
                this.components[varName].name = varName;
                
                const scale = compDef.scale || [0.001, 0.001, 0.001];
                const pos = compDef.position || [0, 0, 0];
                
                this.components[varName].scale.set(scale[0] ?? 0.001, scale[1] ?? 0.001, scale[2] ?? 0.001);
                this.components[varName].position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
                this.assembly.add(this.components[varName]);
                
                console.log(`  📦 ${{varName}} загружен`);
            }}
        }}

        // Рейки (может быть несколько с разными позициями!)
        if (this.config['rails'] && Array.isArray(this.config['rails'])) {{
            const rails = this.config['rails'] as Array<{{ id: string; file: string; scale?: number[]; position?: number[]; rotation?: number[] }}>;
            for (const railDef of rails) {{
                const railId = railDef.id;
                const filename = railDef.file;
                const filePath = `${{basePath}}/${{folderName}}/${{filename}}`;
                
                this.components[railId] = await this.loader.load(filePath);
                this.components[railId].name = railId;
                
                const scale = railDef.scale || [0.001, 0.001, 0.001];
                const pos = railDef.position || [0, 0, 0];
                const rot = railDef.rotation || [0, 0, 0];
                
                this.components[railId].scale.set(scale[0] ?? 0.001, scale[1] ?? 0.001, scale[2] ?? 0.001);
                this.components[railId].position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
                this.components[railId].rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
                this.assembly.add(this.components[railId]);
                
                console.log(`  🔗 ${{railId}} загружен (pos: [${{pos.join(', ')}}])`);
            }}
        }}
    }}

    // ========== Методы получения информации ==========

    /**
     * Информация о сборке и компонентах
     * @returns Информация о шкафе и его компонентах
     */
    getInfo(): CabinetInfo {{
        const info: CabinetInfo = {{
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
}}
"""


def generate_config_json(components: List[Dict[str, str]], folder_name: str, 
                        width: int, height: int, depth: int) -> Dict:
    """
    Генерирует конфиг-файл JSON для шкафа
    
    Args:
        components: Список компонентов из analyze_components()
        folder_name: Имя папки с компонентами
        width, height, depth: Размеры шкафа
    
    Returns:
        Словарь конфига (можно сериализовать в JSON)
    """
    config = {
        "name": folder_name,
        "dimensions": {
            "width": width / 1000,  # Переводим в метры
            "height": height / 1000,
            "depth": depth / 1000
        },
        "components": {},
        "rails": [],
        "door": {
            "componentName": "door_" + folder_name,  # Автоматически определяем имя двери
            "pivotOffset": {
                "x": -width / 2000,  # Левая сторона шкафа (половина ширины)
                "y": 0.0,             # Центр по высоте (можно скорректировать)
                "z": 0.0              # Центр по глубине
            },
            "rotationAxis": "y"  # Y-ось (вращение туда-сюда)
        }
    }
    
    # Разделяем компоненты на обычные и рейки
    for comp in components:
        var_name = comp['var_name']
        filename = comp['filename']
        
        # Если это DIN-рейка, добавляем в массив rails (позже можно задать позиции)
        if 'din' in filename.lower() or 'rail' in filename.lower():
            # Значения по умолчанию — потом пользователь отредактирует конфиг
            config["rails"].append({
                "id": var_name,
                "file": filename,
                "scale": [0.001, 0.001, 0.001],
                "position": [0, 0, 0],
                "rotation": [0, 0, 0]
            })
        else:
            # Обычные компоненты
            config["components"][var_name] = {
                "file": filename,
                "scale": [0.001, 0.001, 0.001],
                "position": [0, 0, 0]
            }
    
    return config


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


def _generate_config_js(config: Dict) -> str:
    """
    Генерирует JavaScript модуль конфига из Python словаря
    
    Args:
        config: Конфиг-словарь
    
    Returns:
        JavaScript код с экспортом конфига
    """
    import json
    
    # Сериализуем словарь в JSON, затем обёрнем в JS экспорт
    config_json = json.dumps(config, indent=2, ensure_ascii=False)
    
    js_code = f"""/**
 * Конфиг шкафа {config['name']}
 * Автоматически сгенерирован из FreeCAD компонентов
 */
export const config = {config_json};
"""
    
    return js_code


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
  resources/frontend/three/cabinets/MyCabinet/
    ├── MyCabinet.ts  (сгенерированный TypeScript класс)
    └── config.js     (конфиг с позициями компонентов)
  
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
    
    parser.add_argument(
        '--version',
        action='version',
        version=f'%(prog)s {SCRIPT_VERSION} ({SCRIPT_DATE})'
    )
    
    args = parser.parse_args()
    
    # Определяем корень проекта (на 2 уровня выше от tools/)
    project_root = Path(__file__).parent.parent
    source_path = project_root / args.source
    
    if not source_path.exists():
        print(f"❌ Ошибка: Папка '{source_path}' не найдена")
        return 1
    
    # Вывод информации о версии
    print(f"📦 Генератор классов шкафов v{SCRIPT_VERSION} ({SCRIPT_DATE})")
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
    
    # Генерируем конфиг JSON
    print(f"⚙️  Генерация конфига JSON...")
    config = generate_config_json(components, folder_name, width, height, depth)
    
    # Формируем список компонентов для документации
    component_list = ', '.join(list(config['components'].keys()) + [r['id'] for r in config['rails']])
    
    class_code = CLASS_TEMPLATE.format(
        class_name=class_name,
        width=width,
        height=height,
        depth=depth,
        folder_name=folder_name,
        component_list=component_list
    )
    
    # Создаём выходную директорию (новая структура: resources/frontend/three/cabinets/)
    output_dir = project_root / 'resources' / 'frontend' / 'three' / 'cabinets' / class_name
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"{class_name}.ts"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(class_code)
    
    print(f"✅ Создан класс: {output_file.relative_to(project_root)}")
    
    # Сохраняем конфиг как JavaScript модуль (не JSON!)
    config_file = output_dir / 'config.js'
    
    # Конвертируем Python словарь в JavaScript объект
    config_js_code = _generate_config_js(config)
    
    with open(config_file, 'w', encoding='utf-8') as f:
        f.write(config_js_code)
    
    print(f"✅ Создан конфиг: {config_file.relative_to(project_root)}")
    
    # Обновляем каталог
    if not args.no_catalog:
        catalog_path = project_root / 'public' / 'assets' / 'models' / 'cabinets' / 'catalog.json'
        # Путь для каталога (относительный от public/js/cabinets/ для совместимости)
        module_path = f"../cabinets/{class_name}/{class_name}.ts"
        
        catalog_entry = create_catalog_entry(class_name, width, height, depth, module_path)
        update_catalog(catalog_path, catalog_entry)
        
        print(f"✅ Обновлён каталог: {catalog_path.relative_to(project_root)}")
    
    print(f"\n🎉 Генерация завершена успешно!")
    print(f"\n📋 Созданные файлы:")
    print(f"   • Класс: {output_file.relative_to(project_root)}")
    print(f"   • Конфиг: {config_file.relative_to(project_root)}")
    print(f"\n🔧 Рекомендации:")
    print(f"   1. Отредактируйте config.js для точной настройки позиций компонентов")
    print(f"   2. Если рейки (rails) — укажите корректные Y-позиции")
    print(f"   3. Пример для 3 рейлок: position: [0, 0, 0], [0, -0.2, 0], [0, -0.4, 0]")
    print(f"\n💡 Для использования в коде:")
    print(f"   await cabinetManager.addCabinetById('{class_name}');")
    
    return 0


if __name__ == '__main__':
    exit(main())
