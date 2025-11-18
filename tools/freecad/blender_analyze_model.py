"""
Скрипт для анализа модели прямо в Blender
Показывает размеры, масштаб, расположение, origin, единицы измерения

ИСПОЛЬЗОВАНИЕ:
1. Откройте Blender
2. Перейдите в Scripting workspace (вкладка вверху)
3. Создайте новый текст (Text → New)
4. Скопируйте этот скрипт
5. Нажмите "Run Script" (или Alt+P)
6. Результаты появятся в консоли (Window → Toggle System Console)
"""

import bpy
import mathutils
from mathutils import Vector

def analyze_blender_model():
    """Анализирует выбранную модель в Blender"""
    
    print("\n" + "="*70)
    print("📦 АНАЛИЗ МОДЕЛИ В BLENDER")
    print("="*70)
    
    # === ЕДИНИЦЫ ИЗМЕРЕНИЯ СЦЕНЫ ===
    print(f"\n{'─'*70}")
    print(f"⚙️  НАСТРОЙКИ СЦЕНЫ")
    print(f"{'─'*70}")
    
    unit_settings = bpy.context.scene.unit_settings
    print(f"Unit System: {unit_settings.system}")
    print(f"Length Unit: {unit_settings.length_unit}")
    print(f"Scale: {unit_settings.scale_length}")
    
    if unit_settings.length_unit == 'MILLIMETERS':
        unit_multiplier = 1.0
        unit_name = "мм"
        print(f"✅ Единицы: МИЛЛИМЕТРЫ (правильно для экспорта!)")
    elif unit_settings.length_unit == 'METERS':
        unit_multiplier = 1000.0
        unit_name = "м"
        print(f"⚠️  Единицы: МЕТРЫ (при экспорте будет масштаб ×1000!)")
    elif unit_settings.length_unit == 'CENTIMETERS':
        unit_multiplier = 10.0
        unit_name = "см"
        print(f"⚠️  Единицы: САНТИМЕТРЫ (при экспорте будет масштаб ×100!)")
    else:
        unit_multiplier = 1.0
        unit_name = unit_settings.length_unit
        print(f"⚠️  Единицы: {unit_settings.length_unit}")
    
    # === ВЫБРАННЫЕ ОБЪЕКТЫ ===
    selected_objects = bpy.context.selected_objects
    
    if not selected_objects:
        print(f"\n❌ НЕТ ВЫБРАННЫХ ОБЪЕКТОВ!")
        print(f"   Выберите объект (клик по нему) и запустите скрипт снова")
        return
    
    print(f"\n{'─'*70}")
    print(f"📋 ВЫБРАНО ОБЪЕКТОВ: {len(selected_objects)}")
    print(f"{'─'*70}")
    
    for obj in selected_objects:
        analyze_object(obj, unit_multiplier, unit_name)
    
    # === ИТОГОВЫЕ РЕКОМЕНДАЦИИ ===
    print(f"\n{'='*70}")
    print(f"💡 РЕКОМЕНДАЦИИ ДЛЯ ЭКСПОРТА В GLB")
    print(f"{'='*70}")
    
    if unit_settings.length_unit != 'MILLIMETERS':
        print(f"1. ⚠️  ИЗМЕНИТЕ ЕДИНИЦЫ НА МИЛЛИМЕТРЫ:")
        print(f"   Scene Properties → Units → Length = Millimeters")
    else:
        print(f"1. ✅ Единицы измерения правильные (миллиметры)")
    
    print(f"\n2. Перед экспортом GLB:")
    print(f"   • Выделите все объекты (A)")
    print(f"   • Object → Apply → All Transforms (Ctrl+A)")
    print(f"   • Проверьте, что Origin в нижнем центре")
    
    print(f"\n3. Настройки экспорта GLB:")
    print(f"   File → Export → glTF 2.0 (.glb)")
    print(f"   • Format: glTF Binary (.glb)")
    print(f"   • Transform: +Y Up")
    print(f"   • Geometry: Apply Modifiers ✓")
    
    print(f"\n4. После экспорта используйте скрипты:")
    print(f"   python check_glb_model.py <файл.glb>")
    print(f"   python adjust_glb_model.py <файл.glb>")
    
    print(f"\n{'='*70}\n")


def analyze_object(obj, unit_multiplier, unit_name):
    """Подробный анализ одного объекта"""
    
    print(f"\n┌─ ОБЪЕКТ: {obj.name}")
    print(f"│  Тип: {obj.type}")
    
    # === РАЗМЕРЫ ===
    print(f"│")
    print(f"├─ 📐 РАЗМЕРЫ")
    
    # Размеры в Blender units
    dims = obj.dimensions
    print(f"│  Dimensions (Blender units):")
    print(f"│    X: {dims.x:.4f} {unit_name}")
    print(f"│    Y: {dims.y:.4f} {unit_name}")
    print(f"│    Z: {dims.z:.4f} {unit_name}")
    
    # Размеры в миллиметрах (для экспорта)
    dims_mm = Vector((dims.x * unit_multiplier, dims.y * unit_multiplier, dims.z * unit_multiplier))
    print(f"│  Размеры при экспорте (в миллиметрах):")
    print(f"│    Ширина (X):  {dims_mm.x:.2f} мм")
    print(f"│    Высота (Z):  {dims_mm.z:.2f} мм")
    print(f"│    Глубина (Y): {dims_mm.y:.2f} мм")
    
    # === ПОЗИЦИЯ ===
    print(f"│")
    print(f"├─ 📍 ПОЗИЦИЯ (Location)")
    loc = obj.location
    print(f"│  Blender units:")
    print(f"│    X: {loc.x:.4f} {unit_name}")
    print(f"│    Y: {loc.y:.4f} {unit_name}")
    print(f"│    Z: {loc.z:.4f} {unit_name}")
    
    loc_mm = Vector((loc.x * unit_multiplier, loc.y * unit_multiplier, loc.z * unit_multiplier))
    print(f"│  При экспорте (миллиметры):")
    print(f"│    X: {loc_mm.x:.2f} мм")
    print(f"│    Y: {loc_mm.y:.2f} мм")
    print(f"│    Z: {loc_mm.z:.2f} мм")
    
    if abs(loc.x) < 0.001 and abs(loc.y) < 0.001 and abs(loc.z) < 0.001:
        print(f"│  ✅ Объект в начале координат (0, 0, 0)")
    else:
        print(f"│  ⚠️  Объект СМЕЩЁН от начала координат")
        print(f"│     Рекомендация: Object → Clear → Location (Alt+G)")
    
    # === ВРАЩЕНИЕ ===
    print(f"│")
    print(f"├─ 🔄 ВРАЩЕНИЕ (Rotation)")
    rot = obj.rotation_euler
    import math
    rot_deg = Vector((math.degrees(rot.x), math.degrees(rot.y), math.degrees(rot.z)))
    print(f"│  Rotation (degrees):")
    print(f"│    X: {rot_deg.x:.2f}°")
    print(f"│    Y: {rot_deg.y:.2f}°")
    print(f"│    Z: {rot_deg.z:.2f}°")
    
    if abs(rot.x) < 0.001 and abs(rot.y) < 0.001 and abs(rot.z) < 0.001:
        print(f"│  ✅ Вращение = 0 (правильно!)")
    else:
        print(f"│  ⚠️  Объект ПОВЁРНУТ")
        print(f"│     Рекомендация: Object → Clear → Rotation (Alt+R)")
    
    # === МАСШТАБ ===
    print(f"│")
    print(f"├─ 📏 МАСШТАБ (Scale)")
    scale = obj.scale
    print(f"│  Scale:")
    print(f"│    X: {scale.x:.4f}")
    print(f"│    Y: {scale.y:.4f}")
    print(f"│    Z: {scale.z:.4f}")
    
    if abs(scale.x - 1.0) < 0.001 and abs(scale.y - 1.0) < 0.001 and abs(scale.z - 1.0) < 0.001:
        print(f"│  ✅ Масштаб = 1.0 (правильно!)")
    else:
        print(f"│  ⚠️  Масштаб НЕ РАВЕН 1.0")
        print(f"│     Рекомендация: Object → Apply → Scale (Ctrl+A → Scale)")
    
    # === ORIGIN ===
    print(f"│")
    print(f"├─ 🎯 ORIGIN (Точка привязки)")
    
    # Вычислить bounding box
    if obj.type == 'MESH':
        bbox_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        bbox_min = Vector((min(c.x for c in bbox_corners), 
                          min(c.y for c in bbox_corners), 
                          min(c.z for c in bbox_corners)))
        bbox_max = Vector((max(c.x for c in bbox_corners), 
                          max(c.y for c in bbox_corners), 
                          max(c.z for c in bbox_corners)))
        bbox_center = (bbox_min + bbox_max) / 2
        
        print(f"│  Bounding Box:")
        print(f"│    Min: ({bbox_min.x:.4f}, {bbox_min.y:.4f}, {bbox_min.z:.4f})")
        print(f"│    Max: ({bbox_max.x:.4f}, {bbox_max.y:.4f}, {bbox_max.z:.4f})")
        print(f"│    Center: ({bbox_center.x:.4f}, {bbox_center.y:.4f}, {bbox_center.z:.4f})")
        
        # Origin относительно bounding box
        origin_world = obj.matrix_world.translation
        print(f"│  Origin в мировых координатах: ({origin_world.x:.4f}, {origin_world.y:.4f}, {origin_world.z:.4f})")
        
        # Проверка положения origin
        if abs(origin_world.x - bbox_center.x) < 0.01 and abs(origin_world.y - bbox_center.y) < 0.01:
            if abs(origin_world.z - bbox_min.z) < 0.01:
                print(f"│  ✅ Origin в НИЖНЕМ ЦЕНТРЕ (идеально для шкафа!)")
            else:
                print(f"│  ⚠️  Origin отцентрирован по X,Y но не внизу по Z")
                print(f"│     Рекомендация: выделите → Set Origin → Origin to Geometry")
                print(f"│     Затем переместите origin вниз")
        else:
            print(f"│  ⚠️  Origin НЕ в нижнем центре")
            print(f"│     Рекомендация:")
            print(f"│     1. Tab → Edit Mode → Select All (A)")
            print(f"│     2. Mesh → Transform → Move to 3D Cursor (Shift+S → Cursor to World Origin)")
            print(f"│     3. Tab → Object Mode → Object → Set Origin → Origin to 3D Cursor")
    
    # === МОДИФИКАТОРЫ ===
    print(f"│")
    print(f"├─ 🔧 МОДИФИКАТОРЫ")
    
    if obj.modifiers:
        print(f"│  Всего модификаторов: {len(obj.modifiers)}")
        for mod in obj.modifiers:
            print(f"│    • {mod.name} ({mod.type})")
        print(f"│  ⚠️  ПРИМЕНИТЕ модификаторы перед экспортом!")
        print(f"│     Object → Apply → All Modifiers")
    else:
        print(f"│  ✅ Модификаторов нет")
    
    # === ДЕТИ (CHILDREN) ===
    print(f"│")
    print(f"└─ 👶 ДОЧЕРНИЕ ОБЪЕКТЫ")
    
    if obj.children:
        print(f"   Всего детей: {len(obj.children)}")
        for child in obj.children:
            child_type_icon = "🚪" if "door" in child.name.lower() else "📏" if "din" in child.name.lower() or "rail" in child.name.lower() else "📦"
            print(f"     {child_type_icon} {child.name} ({child.type})")
    else:
        print(f"   Детей нет")
    
    print()


# === ЗАПУСК АНАЛИЗА ===
if __name__ == "__main__":
    analyze_blender_model()
