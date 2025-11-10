"""
Blender 4.5.3 Python Script
Создание shader nodes для материала корпуса пластикового шкафа IP65
Основано на IEK ЩМПп: ударопрочный ABS пластик RAL 7035

Характеристики:
- Материал: ударопрочный ABS пластик
- Цвет: светло-серый (RAL 7035) RGB(0.85, 0.85, 0.85)
- Поверхность: слегка матовая пластиковая с лёгким блеском
- Roughness: 0.35-0.45 (сатиновая поверхность, не полностью матовая)
- Metallic: 0.0 (диэлектрик, пластик)
- Текстура: гладкая с очень мелкой зернистостью литья
- Стойкость: UV-стабилизированный, IP65

Использование:
1. Откройте Blender 4.5.3
2. Выберите объект (корпус шкафа)
3. Откройте Text Editor → New → вставьте этот скрипт
4. Запустите через Alt+P или кнопку "Run Script"
"""

import bpy
import math

def create_cabinet_body_material(material_name="CabinetBody_ABS_Material"):
    """
    Создаёт procedural материал для пластикового корпуса шкафа IP65
    из ударопрочного ABS пластика RAL 7035
    
    Параметры:
    - Base Color: светло-серый (RGB 0.85, 0.85, 0.85) — RAL 7035
    - Metallic: 0.0 (диэлектрик, пластик)
    - Roughness: 0.40 (сатиновая поверхность с лёгким блеском)
    - Subsurface: 0.03 (пластик пропускает свет в тонких местах)
    - Мелкая текстура литья и формовки
    """
    
    # Удалить существующий материал с таким именем (если есть)
    if material_name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[material_name])
    
    # Создать новый материал
    mat = bpy.data.materials.new(name=material_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Очистить дефолтные ноды
    nodes.clear()
    
    # ============ OUTPUT ============
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (800, 0)
    
    # ============ PRINCIPLED BSDF ============
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (400, 0)
    
    # Основные параметры ABS пластика
    bsdf.inputs['Base Color'].default_value = (0.85, 0.85, 0.85, 1.0)  # RAL 7035 светло-серый
    bsdf.inputs['Metallic'].default_value = 0.0  # Диэлектрик, пластик
    bsdf.inputs['Roughness'].default_value = 0.40  # Сатиновая поверхность (не матовая)
    bsdf.inputs['IOR'].default_value = 1.54  # IOR для ABS пластика
    bsdf.inputs['Specular IOR Level'].default_value = 0.5  # Умеренные блики (пластик блестит)
    bsdf.inputs['Sheen Weight'].default_value = 0.05  # Лёгкий sheen для пластика
    bsdf.inputs['Sheen Roughness'].default_value = 0.5  # Мягкий sheen
    
    # Subsurface для реалистичности (пластик пропускает свет в тонких местах)
    bsdf.inputs['Subsurface Weight'].default_value = 0.03  # Больше чем краска
    bsdf.inputs['Subsurface Radius'].default_value = (1.0, 1.0, 1.0)
    bsdf.inputs['Subsurface Scale'].default_value = 0.1
    
    # Связать BSDF с Output
    links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    
    # ============ TEXTURE COORDINATE ============
    tex_coord = nodes.new(type='ShaderNodeTexCoord')
    tex_coord.location = (-1400, 200)
    
    # ============ MAPPING (для контроля масштаба текстур) ============
    mapping = nodes.new(type='ShaderNodeMapping')
    mapping.location = (-1200, 200)
    mapping.inputs['Scale'].default_value = (20.0, 20.0, 20.0)  # Масштаб текстуры порошка
    
    links.new(tex_coord.outputs['Object'], mapping.inputs['Vector'])
    
    # ============ ТЕКСТУРА ПЛАСТИКОВОЙ ПОВЕРХНОСТИ ============
    # Noise Texture #1: текстура литья (мелкие неровности формы)
    plastic_noise_1 = nodes.new(type='ShaderNodeTexNoise')
    plastic_noise_1.location = (-1000, 300)
    plastic_noise_1.noise_dimensions = '3D'
    plastic_noise_1.inputs['Scale'].default_value = 150.0  # Мелкая, но не микро-текстура
    plastic_noise_1.inputs['Detail'].default_value = 6.0  # Меньше деталей чем у порошка
    plastic_noise_1.inputs['Roughness'].default_value = 0.4
    plastic_noise_1.inputs['Distortion'].default_value = 0.05  # Более гладкая
    
    links.new(mapping.outputs['Vector'], plastic_noise_1.inputs['Vector'])
    
    # Noise Texture #2: очень мелкая зернистость (микротекстура ABS)
    plastic_noise_2 = nodes.new(type='ShaderNodeTexNoise')
    plastic_noise_2.location = (-1000, 50)
    plastic_noise_2.noise_dimensions = '3D'
    plastic_noise_2.inputs['Scale'].default_value = 400.0  # Микродетали поверхности
    plastic_noise_2.inputs['Detail'].default_value = 10.0
    plastic_noise_2.inputs['Roughness'].default_value = 0.5
    plastic_noise_2.inputs['Distortion'].default_value = 0.02  # Минимальная дисторсия
    
    links.new(mapping.outputs['Vector'], plastic_noise_2.inputs['Vector'])
    
    # ============ КОМБИНИРОВАНИЕ NOISE ТЕКСТУР ============
    # ColorRamp для первого noise (более мягкий контраст для пластика)
    noise_ramp_1 = nodes.new(type='ShaderNodeValToRGB')
    noise_ramp_1.location = (-800, 300)
    noise_ramp_1.color_ramp.elements[0].position = 0.47  # Мягче переход
    noise_ramp_1.color_ramp.elements[1].position = 0.53
    noise_ramp_1.color_ramp.interpolation = 'EASE'  # Плавный переход
    
    links.new(plastic_noise_1.outputs['Fac'], noise_ramp_1.inputs['Fac'])
    
    # ColorRamp для второго noise (очень мягкий)
    noise_ramp_2 = nodes.new(type='ShaderNodeValToRGB')
    noise_ramp_2.location = (-800, 50)
    noise_ramp_2.color_ramp.elements[0].position = 0.48
    noise_ramp_2.color_ramp.elements[1].position = 0.52
    noise_ramp_2.color_ramp.interpolation = 'EASE'
    
    links.new(plastic_noise_2.outputs['Fac'], noise_ramp_2.inputs['Fac'])
    
    # Смешать оба noise (пластик более гладкий)
    mix_plastic = nodes.new(type='ShaderNodeMix')
    mix_plastic.location = (-600, 200)
    mix_plastic.data_type = 'RGBA'
    mix_plastic.blend_type = 'MIX'
    mix_plastic.inputs['Factor'].default_value = 0.3  # Больше веса на основную текстуру
    
    links.new(noise_ramp_1.outputs['Color'], mix_plastic.inputs['A'])
    links.new(noise_ramp_2.outputs['Color'], mix_plastic.inputs['B'])
    
    # ============ ROUGHNESS VARIATION ============
    # Небольшая вариация Roughness (пластик менее однородный чем краска)
    roughness_multiply = nodes.new(type='ShaderNodeMath')
    roughness_multiply.location = (-400, 200)
    roughness_multiply.operation = 'MULTIPLY'
    roughness_multiply.inputs[1].default_value = 0.05  # Слабая вариация (0-0.05)
    
    links.new(mix_plastic.outputs['Result'], roughness_multiply.inputs[0])
    
    # Добавить базовое значение Roughness (сатиновая поверхность)
    roughness_add = nodes.new(type='ShaderNodeMath')
    roughness_add.location = (-200, 200)
    roughness_add.operation = 'ADD'
    roughness_add.inputs[1].default_value = 0.38  # Базовая roughness (0.38 + 0-0.05 = 0.38-0.43)
    roughness_add.use_clamp = True
    
    links.new(roughness_multiply.outputs['Value'], roughness_add.inputs[0])
    links.new(roughness_add.outputs['Value'], bsdf.inputs['Roughness'])
    
    # ============ COLOR VARIATION (минимальная для однородного пластика) ============
    # Voronoi для имитации очень слабых неровностей литья
    voronoi = nodes.new(type='ShaderNodeTexVoronoi')
    voronoi.location = (-1000, -200)
    voronoi.voronoi_dimensions = '3D'
    voronoi.feature = 'DISTANCE_TO_EDGE'
    voronoi.inputs['Scale'].default_value = 80.0  # Крупные ячейки (менее заметно)
    voronoi.inputs['Randomness'].default_value = 0.3  # Меньше случайности
    
    links.new(mapping.outputs['Vector'], voronoi.inputs['Vector'])
    
    # ColorRamp для Voronoi (экстремально слабый эффект)
    voronoi_ramp = nodes.new(type='ShaderNodeValToRGB')
    voronoi_ramp.location = (-800, -200)
    voronoi_ramp.color_ramp.elements[0].position = 0.48  # Почти центр
    voronoi_ramp.color_ramp.elements[1].position = 0.52
    voronoi_ramp.color_ramp.interpolation = 'EASE'
    
    links.new(voronoi.outputs['Distance'], voronoi_ramp.inputs['Fac'])
    
    # Math node для микро-вариации цвета (пластик очень однородный)
    color_variation = nodes.new(type='ShaderNodeMath')
    color_variation.location = (-600, -200)
    color_variation.operation = 'MULTIPLY'
    color_variation.inputs[1].default_value = 0.01  # Максимум ±1% изменение
    
    links.new(voronoi_ramp.outputs['Color'], color_variation.inputs[0])
    
    # Применить минимальную вариацию к Base Color
    color_mix = nodes.new(type='ShaderNodeMix')
    color_mix.location = (200, 300)
    color_mix.data_type = 'RGBA'
    color_mix.blend_type = 'MIX'
    color_mix.inputs['A'].default_value = (0.85, 0.85, 0.85, 1.0)  # Базовый цвет RAL 7035
    color_mix.inputs['B'].default_value = (0.84, 0.84, 0.84, 1.0)  # Едва темнее
    
    links.new(color_variation.outputs['Value'], color_mix.inputs['Factor'])
    links.new(color_mix.outputs['Result'], bsdf.inputs['Base Color'])
    
    # ============ NORMAL MAP (минимальный Bump для гладкого пластика) ============
    # Преобразовать текстуру литья в Normal для едва заметного рельефа
    bump_node = nodes.new(type='ShaderNodeBump')
    bump_node.location = (0, -300)
    bump_node.inputs['Strength'].default_value = 0.015  # Экстремально слабый bump
    bump_node.inputs['Distance'].default_value = 0.005  # Очень мелкий микрорельеф
    
    links.new(mix_plastic.outputs['Result'], bump_node.inputs['Height'])
    links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    
    # ============ ЗАКРУГЛЕНИЯ И ФАСКИ (Edge Detection для пластика) ============
    # Геометрия для мягких переходов на углах (литьевые радиусы)
    geometry_node = nodes.new(type='ShaderNodeNewGeometry')
    geometry_node.location = (-600, -500)
    
    # ColorRamp для скругления краёв (пластик имеет радиусы формовки)
    edge_ramp = nodes.new(type='ShaderNodeValToRGB')
    edge_ramp.location = (-400, -500)
    edge_ramp.color_ramp.elements[0].position = 0.55  # Порог для краёв
    edge_ramp.color_ramp.elements[1].position = 0.65  # Мягче переход
    edge_ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    edge_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    edge_ramp.color_ramp.interpolation = 'EASE'  # Плавный переход
    
    links.new(geometry_node.outputs['Pointiness'], edge_ramp.inputs['Fac'])
    
    # Добавить лёгкий светлый край (полированные радиусы)
    edge_brightness = nodes.new(type='ShaderNodeMath')
    edge_brightness.location = (-200, -500)
    edge_brightness.operation = 'MULTIPLY'
    edge_brightness.inputs[1].default_value = 0.02  # Слабое осветление
    
    links.new(edge_ramp.outputs['Color'], edge_brightness.inputs[0])
    
    # Применить к Roughness (края более гладкие от извлечения из формы)
    edge_roughness_mix = nodes.new(type='ShaderNodeMath')
    edge_roughness_mix.location = (0, 0)
    edge_roughness_mix.operation = 'SUBTRACT'
    edge_roughness_mix.use_clamp = True
    
    links.new(roughness_add.outputs['Value'], edge_roughness_mix.inputs[0])
    links.new(edge_brightness.outputs['Value'], edge_roughness_mix.inputs[1])
    links.new(edge_roughness_mix.outputs['Value'], bsdf.inputs['Roughness'])
    
    print(f"✅ Материал '{material_name}' создан успешно!")
    return mat


def apply_material_to_selected():
    """
    Применяет созданный материал к выбранному объекту
    """
    selected_objects = bpy.context.selected_objects
    
    if not selected_objects:
        print("❌ Ошибка: Не выбран ни один объект!")
        print("   Выберите объект (корпус шкафа) и запустите скрипт снова.")
        return None
    
    # Создать материал
    mat = create_cabinet_body_material()
    
    # Применить ко всем выбранным объектам
    for obj in selected_objects:
        if obj.type == 'MESH':
            # Очистить существующие материалы
            obj.data.materials.clear()
            # Добавить новый материал
            obj.data.materials.append(mat)
            print(f"✅ Материал применён к объекту: {obj.name}")
        else:
            print(f"⚠️  Пропущен объект '{obj.name}' (не MESH)")
    
    return mat


def setup_world_lighting():
    """
    Настраивает освещение сцены для лучшего отображения пластика
    (пластик отражает свет ярче чем матовая краска)
    """
    world = bpy.context.scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    
    # Очистить существующие ноды
    nodes.clear()
    
    # Background (яркое освещение для бликов пластика)
    bg_node = nodes.new(type='ShaderNodeBackground')
    bg_node.location = (0, 0)
    bg_node.inputs['Color'].default_value = (0.6, 0.6, 0.6, 1.0)  # Светлый серый
    bg_node.inputs['Strength'].default_value = 1.5  # Ярче для пластика
    
    # Output
    output_node = nodes.new(type='ShaderNodeOutputWorld')
    output_node.location = (200, 0)
    
    links.new(bg_node.outputs['Background'], output_node.inputs['Surface'])
    
    print("✅ Освещение World настроено")


def setup_viewport_shading():
    """
    Переключает viewport в режим Material Preview для просмотра
    """
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'
                    space.shading.use_scene_lights = True
                    space.shading.use_scene_world = True
                    print("✅ Viewport переключён в Material Preview")
                    break


def add_area_light():
    """
    Добавляет Area Light для лучшего освещения пластиковой поверхности
    (пластик нуждается в направленном освещении для бликов)
    """
    # Создать Area Light
    bpy.ops.object.light_add(type='AREA', location=(3, -3, 5))
    light = bpy.context.object
    light.name = "PlasticLight_Main"
    light.data.energy = 250  # Ярче для пластика
    light.data.size = 4.0  # Больше площадь для мягких бликов
    light.data.color = (1.0, 1.0, 1.0)
    
    # Направить на центр сцены
    light.rotation_euler = (0.8, 0, 0.8)
    
    print("✅ Area Light добавлен")


# ============ ГЛАВНАЯ ФУНКЦИЯ ============
def main():
    """
    Основная функция запуска
    """
    print("\n" + "="*60)
    print("🔧 BLENDER PLASTIC CABINET SHADER GENERATOR")
    print("   Материал: Ударопрочный ABS пластик RAL 7035 IP65")
    print("="*60 + "\n")
    
    # Применить материал к выбранным объектам
    mat = apply_material_to_selected()
    
    if mat:
        # Настроить освещение (закомментировано, чтобы не менять фон)
        # setup_world_lighting()
        
        # Добавить Area Light (опционально, закомментируйте если не нужен)
        # add_area_light()
        
        # Переключить viewport
        setup_viewport_shading()
        
        print("\n" + "="*60)
        print("✅ ГОТОВО! Материал пластикового корпуса IP65 создан.")
        print("="*60)
        print("\n📝 ХАРАКТЕРИСТИКИ МАТЕРИАЛА:")
        print("   • Material: ABS пластик (ударопрочный)")
        print("   • Base Color: RGB(0.85, 0.85, 0.85) — RAL 7035")
        print("   • Metallic: 0.0 — диэлектрик (пластик)")
        print("   • Roughness: 0.38-0.43 — сатиновая поверхность")
        print("   • IOR: 1.54 — характерный для ABS")
        print("   • Sheen: 0.05 — лёгкий блеск пластика")
        print("   • Subsurface: 0.03 — пластик пропускает свет")
        print("   • Bump Strength: 0.015 — гладкая поверхность литья")
        print("\n📝 ПАРАМЕТРЫ ДЛЯ ТОНКОЙ НАСТРОЙКИ:")
        print("   • Plastic Noise Scale: 150 и 400 — текстура литья")
        print("   • Roughness Range: 0.38-0.43 — сатиновая (не матовая!)")
        print("   • Color Variation: ±1% — однородный пластик")
        print("   • Bump Strength: 0.015 — минимальный рельеф")
        print("   • Edge Smoothness: края более гладкие от формовки")
        print("\n💡 СОВЕТ: Откройте Shading workspace для редактирования")
        print("💡 TIP: Добавьте HDRI для реалистичных бликов на пластике")
        print("💡 NOTE: Пластик IP65 имеет лёгкий блеск, не матовый!")
        print("="*60 + "\n")
    else:
        print("\n❌ Материал не был создан. Проверьте выбранные объекты.\n")


# ============ ЗАПУСК ============
if __name__ == "__main__":
    main()
