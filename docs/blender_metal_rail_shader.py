"""
Blender 4.5.3 Python Script
Создание shader nodes для металлической текстуры монтажного рельса
Основано на фотореференсе: серый матовый металл с лёгкими царапинами

Использование:
1. Откройте Blender 4.5.3
2. Выберите объект (монтажный рельс)
3. Откройте Text Editor → New → вставьте этот скрипт
4. Запустите через Alt+P или кнопку "Run Script"
"""

import bpy
import math

def create_metal_rail_material(material_name="MetalRail_Material"):
    """
    Создаёт procedural материал для металлического монтажного рельса
    с характеристиками:
    - Base Color: светло-серый (RGB 0.75, 0.75, 0.75)
    - Metallic: 0.95 (почти полностью металл)
    - Roughness: 0.35 (слегка матовый с лёгким блеском)
    - Bump/Normal: мелкие царапины и неровности
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
    
    # Основные параметры металла
    bsdf.inputs['Base Color'].default_value = (0.75, 0.75, 0.75, 1.0)  # Светло-серый
    bsdf.inputs['Metallic'].default_value = 0.95  # Почти полностью металл
    bsdf.inputs['Roughness'].default_value = 0.35  # Слегка матовый
    bsdf.inputs['IOR'].default_value = 1.45  # Index of Refraction для металла
    bsdf.inputs['Specular IOR Level'].default_value = 0.5  # Умеренные блики
    
    # Связать BSDF с Output
    links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    
    # ============ TEXTURE COORDINATE ============
    tex_coord = nodes.new(type='ShaderNodeTexCoord')
    tex_coord.location = (-1400, 200)
    
    # ============ MAPPING (для контроля масштаба текстур) ============
    mapping = nodes.new(type='ShaderNodeMapping')
    mapping.location = (-1200, 200)
    mapping.inputs['Scale'].default_value = (10.0, 10.0, 10.0)  # Масштаб текстур
    
    links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])
    
    # ============ ЦАРАПИНЫ (Scratches) ============
    # Используем Wave Texture для имитации линейных царапин
    scratches_wave = nodes.new(type='ShaderNodeTexWave')
    scratches_wave.location = (-1000, 300)
    scratches_wave.wave_type = 'BANDS'
    scratches_wave.bands_direction = 'X'  # Горизонтальные царапины вдоль рельса
    scratches_wave.inputs['Scale'].default_value = 50.0  # Частота царапин
    scratches_wave.inputs['Distortion'].default_value = 5.0  # Случайность
    scratches_wave.inputs['Detail'].default_value = 8.0  # Детализация
    
    links.new(mapping.outputs['Vector'], scratches_wave.inputs['Vector'])
    
    # ColorRamp для контроля интенсивности царапин
    scratches_ramp = nodes.new(type='ShaderNodeValToRGB')
    scratches_ramp.location = (-800, 300)
    scratches_ramp.color_ramp.elements[0].position = 0.45  # Порог для царапин
    scratches_ramp.color_ramp.elements[1].position = 0.55
    scratches_ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)  # Чёрный
    scratches_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)  # Белый
    
    links.new(scratches_wave.outputs['Color'], scratches_ramp.inputs['Fac'])
    
    # ============ МИКРОШЕРОХОВАТОСТИ (Micro Roughness) ============
    # Noise Texture для мелких неровностей металла
    noise_tex = nodes.new(type='ShaderNodeTexNoise')
    noise_tex.location = (-1000, 0)
    noise_tex.inputs['Scale'].default_value = 150.0  # Очень мелкие детали
    noise_tex.inputs['Detail'].default_value = 10.0
    noise_tex.inputs['Roughness'].default_value = 0.6
    noise_tex.inputs['Distortion'].default_value = 0.2
    
    links.new(mapping.outputs['Vector'], noise_tex.inputs['Vector'])
    
    # ColorRamp для настройки контраста шума
    noise_ramp = nodes.new(type='ShaderNodeValToRGB')
    noise_ramp.location = (-800, 0)
    noise_ramp.color_ramp.elements[0].position = 0.4
    noise_ramp.color_ramp.elements[1].position = 0.6
    
    links.new(noise_tex.outputs['Fac'], noise_ramp.inputs['Fac'])
    
    # ============ КОМБИНИРОВАНИЕ ТЕКСТУР (MixRGB) ============
    # Смешать царапины и шум
    mix_textures = nodes.new(type='ShaderNodeMix')
    mix_textures.location = (-600, 150)
    mix_textures.data_type = 'RGBA'
    mix_textures.blend_type = 'MIX'
    mix_textures.inputs['Factor'].default_value = 0.5  # 50/50 смешивание
    
    links.new(scratches_ramp.outputs['Color'], mix_textures.inputs['A'])
    links.new(noise_ramp.outputs['Color'], mix_textures.inputs['B'])
    
    # ============ ROUGHNESS VARIATION ============
    # Добавить вариацию Roughness на основе текстур
    roughness_math = nodes.new(type='ShaderNodeMath')
    roughness_math.location = (-400, 150)
    roughness_math.operation = 'MULTIPLY'
    roughness_math.inputs[1].default_value = 0.15  # Множитель вариации (0-0.15)
    
    links.new(mix_textures.outputs['Result'], roughness_math.inputs[0])
    
    # Добавить базовое значение Roughness
    roughness_add = nodes.new(type='ShaderNodeMath')
    roughness_add.location = (-200, 150)
    roughness_add.operation = 'ADD'
    roughness_add.inputs[1].default_value = 0.30  # Базовая roughness
    roughness_add.use_clamp = True
    
    links.new(roughness_math.outputs['Value'], roughness_add.inputs[0])
    links.new(roughness_add.outputs['Value'], bsdf.inputs['Roughness'])
    
    # ============ NORMAL MAP (Bump) ============
    # Преобразовать текстуры в Normal для рельефа
    bump_node = nodes.new(type='ShaderNodeBump')
    bump_node.location = (0, -200)
    bump_node.inputs['Strength'].default_value = 0.08  # Слабый bump для тонких царапин
    bump_node.inputs['Distance'].default_value = 0.05
    
    links.new(mix_textures.outputs['Result'], bump_node.inputs['Height'])
    links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    
    # ============ EDGE WEAR (опционально) ============
    # Геометрия для выделения краёв (более светлые от износа)
    geometry_node = nodes.new(type='ShaderNodeNewGeometry')
    geometry_node.location = (-600, -400)
    
    # ColorRamp для острых краёв
    edge_ramp = nodes.new(type='ShaderNodeValToRGB')
    edge_ramp.location = (-400, -400)
    edge_ramp.color_ramp.elements[0].position = 0.7  # Порог для краёв
    edge_ramp.color_ramp.elements[1].position = 0.75
    
    links.new(geometry_node.outputs['Pointiness'], edge_ramp.inputs['Fac'])
    
    # Смешать цвет с более светлым на краях
    edge_color_mix = nodes.new(type='ShaderNodeMix')
    edge_color_mix.location = (200, 200)
    edge_color_mix.data_type = 'RGBA'
    edge_color_mix.blend_type = 'MIX'
    edge_color_mix.inputs['A'].default_value = (0.75, 0.75, 0.75, 1.0)  # Базовый цвет
    edge_color_mix.inputs['B'].default_value = (0.85, 0.85, 0.85, 1.0)  # Светлее на краях
    
    links.new(edge_ramp.outputs['Color'], edge_color_mix.inputs['Factor'])
    links.new(edge_color_mix.outputs['Result'], bsdf.inputs['Base Color'])
    
    print(f"✅ Материал '{material_name}' создан успешно!")
    return mat


def apply_material_to_selected():
    """
    Применяет созданный материал к выбранному объекту
    """
    selected_objects = bpy.context.selected_objects
    
    if not selected_objects:
        print("❌ Ошибка: Не выбран ни один объект!")
        print("   Выберите объект (монтажный рельс) и запустите скрипт снова.")
        return None
    
    # Создать материал
    mat = create_metal_rail_material()
    
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
    Настраивает освещение сцены для лучшего отображения металла
    """
    world = bpy.context.scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    
    # Очистить существующие ноды
    nodes.clear()
    
    # Background
    bg_node = nodes.new(type='ShaderNodeBackground')
    bg_node.location = (0, 0)
    bg_node.inputs['Color'].default_value = (0.3, 0.3, 0.3, 1.0)  # Серый фон
    bg_node.inputs['Strength'].default_value = 1.0
    
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


# ============ ГЛАВНАЯ ФУНКЦИЯ ============
def main():
    """
    Основная функция запуска
    """
    print("\n" + "="*60)
    print("🔧 BLENDER METAL RAIL SHADER GENERATOR")
    print("="*60 + "\n")
    
    # Применить материал к выбранным объектам
    mat = apply_material_to_selected()
    
    if mat:
        # Настроить освещение (закомментировано, чтобы не менять фон)
        # setup_world_lighting()
        
        # Переключить viewport
        setup_viewport_shading()
        
        print("\n" + "="*60)
        print("✅ ГОТОВО! Материал создан и применён.")
        print("="*60)
        print("\n📝 НАСТРОЙКИ ДЛЯ ТОНКОЙ НАСТРОЙКИ:")
        print("   • Base Color: (0.75, 0.75, 0.75) - цвет металла")
        print("   • Metallic: 0.95 - металличность")
        print("   • Roughness: 0.30-0.45 - матовость (варьируется)")
        print("   • Bump Strength: 0.08 - глубина царапин")
        print("   • Wave Scale: 50.0 - частота царапин")
        print("   • Noise Scale: 150.0 - размер микродеталей")
        print("\n💡 СОВЕТ: Откройте Shading workspace для редактирования нодов")
        print("="*60 + "\n")
    else:
        print("\n❌ Материал не был создан. Проверьте выбранные объекты.\n")


# ============ ЗАПУСК ============
if __name__ == "__main__":
    main()
