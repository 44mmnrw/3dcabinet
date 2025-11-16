"""
FreeCAD Export Script для Three.js
Экспортирует геометрию из FreeCAD в JSON формат для Three.js

ИНСТРУКЦИЯ:
1. Открой FreeCAD
2. Создай/открой модель шкафа
3. Открой Python консоль (View → Panels → Python console)
4. Скопируй и вставь этот код
5. Запусти: export_to_threejs("cabinet_geometry.json")
"""

import FreeCAD as App
import json
import os
from FreeCAD import Vector

def export_to_threejs(output_file, tolerance=0.5):
    """
    Экспортирует активный документ FreeCAD в JSON для Three.js
    
    Args:
        output_file: путь к выходному JSON файлу
        tolerance: точность триангуляции (меньше = больше полигонов)
    """
    
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа! Открой или создай модель.")
        return
    
    print(f"📦 Экспорт документа: {doc.Name}")
    print(f"   Объектов: {len(doc.Objects)}")
    
    # Собираем все объекты
    result = {
        "metadata": {
            "generator": "FreeCAD to Three.js Exporter",
            "version": "1.0",
            "tolerance": tolerance
        },
        "objects": []
    }
    
    for obj in doc.Objects:
        if not hasattr(obj, 'Shape'):
            continue
        
        shape = obj.Shape
        if shape.isNull():
            continue
        
        print(f"\n🔧 Обработка объекта: {obj.Label}")
        print(f"   Тип: {obj.TypeId}")
        
        # Триангуляция всей формы
        try:
            # tessellate возвращает (vertices, triangles)
            mesh_data = shape.tessellate(tolerance)
            vertices_raw = mesh_data[0]  # список Vector объектов
            triangles = mesh_data[1]     # список кортежей индексов
            
            # Конвертируем Vector в списки
            vertices = [[v.x, v.y, v.z] for v in vertices_raw]
            
            # Конвертируем треугольники в плоский массив индексов
            indices = []
            for tri in triangles:
                indices.extend(tri)
            
            obj_data = {
                "name": obj.Label,
                "type": obj.TypeId,
                "visible": obj.ViewObject.Visibility if hasattr(obj, 'ViewObject') else True,
                "geometry": {
                    "type": "BufferGeometry",
                    "vertices": vertices,
                    "indices": indices,
                    "vertexCount": len(vertices),
                    "triangleCount": len(triangles)
                }
            }
            
            # Цвет объекта (если есть)
            if hasattr(obj, 'ViewObject') and hasattr(obj.ViewObject, 'ShapeColor'):
                color = obj.ViewObject.ShapeColor
                obj_data["color"] = {
                    "r": color[0],
                    "g": color[1],
                    "b": color[2]
                }
            
            # Прозрачность
            if hasattr(obj, 'ViewObject') and hasattr(obj.ViewObject, 'Transparency'):
                obj_data["opacity"] = 1.0 - (obj.ViewObject.Transparency / 100.0)
            
            result["objects"].append(obj_data)
            
            print(f"   ✅ Вершин: {len(vertices)}, Треугольников: {len(triangles)}")
            
        except Exception as e:
            print(f"   ❌ Ошибка триангуляции: {e}")
            continue
    
    # Сохраняем JSON
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        file_size = os.path.getsize(output_file) / 1024
        print(f"\n✅ Экспорт завершён!")
        print(f"   Файл: {output_file}")
        print(f"   Размер: {file_size:.2f} KB")
        print(f"   Объектов экспортировано: {len(result['objects'])}")
        
    except Exception as e:
        print(f"\n❌ Ошибка сохранения файла: {e}")


def export_with_edges(output_file, tolerance=0.5, edge_angle=20, compact=True):
    """
    Экспортирует геометрию + рёбра для технического вида
    
    Args:
        output_file: путь к выходному JSON файлу
        tolerance: точность триангуляции (БОЛЬШЕ = меньше полигонов)
        edge_angle: минимальный угол для определения ребра (градусы)
        compact: компактный формат (без отступов, меньше размер файла)
    """
    
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"📦 Экспорт с рёбрами: {doc.Name}")
    print(f"   Tolerance: {tolerance} (больше = меньше полигонов)")
    
    result = {
        "metadata": {
            "generator": "FreeCAD to Three.js Exporter (with edges)",
            "version": "1.0",
            "tolerance": tolerance,
            "edgeAngle": edge_angle
        },
        "objects": []
    }
    
    for obj in doc.Objects:
        if not hasattr(obj, 'Shape'):
            continue
        
        shape = obj.Shape
        if shape.isNull():
            continue
        
        print(f"\n🔧 Обработка: {obj.Label}")
        
        try:
            # Триангуляция
            mesh_data = shape.tessellate(tolerance)
            vertices_raw = mesh_data[0]
            triangles = mesh_data[1]
            
            # Округляем координаты до 3 знаков (мм точность)
            vertices = [[round(v.x, 3), round(v.y, 3), round(v.z, 3)] for v in vertices_raw]
            indices = []
            for tri in triangles:
                indices.extend(tri)
            
            # Извлекаем рёбра
            edges = []
            for edge in shape.Edges:
                try:
                    # Дискретизируем ребро
                    points = edge.discretize(Number=20)  # 20 точек на ребро
                    edge_vertices = [[p.x, p.y, p.z] for p in points]
                    edges.append(edge_vertices)
                except:
                    pass
            
            obj_data = {
                "name": obj.Label,
                "type": obj.TypeId,
                "geometry": {
                    "vertices": vertices,
                    "indices": indices,
                    "vertexCount": len(vertices),
                    "triangleCount": len(triangles)
                },
                "edges": {
                    "lines": edges,
                    "count": len(edges)
                }
            }
            
            # Цвет и прозрачность
            if hasattr(obj, 'ViewObject'):
                if hasattr(obj.ViewObject, 'ShapeColor'):
                    color = obj.ViewObject.ShapeColor
                    obj_data["color"] = {"r": color[0], "g": color[1], "b": color[2]}
                
                if hasattr(obj.ViewObject, 'Transparency'):
                    obj_data["opacity"] = 1.0 - (obj.ViewObject.Transparency / 100.0)
            
            result["objects"].append(obj_data)
            
            print(f"   ✅ Вершин: {len(vertices)}, Рёбер: {len(edges)}")
            
        except Exception as e:
            print(f"   ❌ Ошибка: {e}")
            continue
    
    # Сохранение
    try:
        # Компактный формат (без отступов) или читаемый
        indent = None if compact else 2
        separators = (',', ':') if compact else (', ', ': ')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=indent, separators=separators, ensure_ascii=False)
        
        file_size = os.path.getsize(output_file) / 1024
        file_size_mb = file_size / 1024
        
        print(f"\n✅ Экспорт завершён!")
        print(f"   Файл: {output_file}")
        if file_size_mb > 1:
            print(f"   Размер: {file_size_mb:.2f} MB")
        else:
            print(f"   Размер: {file_size:.2f} KB")
        
        # Совет по оптимизации
        total_vertices = sum(obj['geometry']['vertexCount'] for obj in result['objects'])
        if total_vertices > 10000:
            print(f"\n💡 СОВЕТ: У тебя {total_vertices} вершин!")
            print(f"   Попробуй увеличить tolerance для уменьшения полигонов:")
            print(f"   export_with_edges('{output_file}', tolerance=2.0)")
        
    except Exception as e:
        print(f"\n❌ Ошибка сохранения: {e}")


def quick_export():
    """
    Быстрый экспорт с настройками по умолчанию
    Сохраняет в Downloads/cabinet_geometry.json
    """
    import os
    home = os.path.expanduser("~")
    output = os.path.join(home, "Downloads", "cabinet_geometry.json")
    export_with_edges(output, tolerance=1.0, edge_angle=20, compact=True)
    return output


def export_optimized(output_file):
    """
    Оптимизированный экспорт (меньше полигонов, компактный формат)
    Рекомендуется для веба! По умлчанию было tolerance=5.0
    """
    export_with_edges(output_file, tolerance=5.0, edge_angle=30, compact=True)


def export_ultra_light(output_file, points_per_edge=3):
    """
    УЛЬТРА-ЛЁГКИЙ экспорт для веба
    Максимальное упрощение, только контуры
    
    Args:
        output_file: путь к выходному файлу
        points_per_edge: количество точек на ребро (2-5, меньше = легче)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"📦 Экспорт ULTRA-LIGHT: {doc.Name}")
    print(f"   Точек на ребро: {points_per_edge}")
    
    result = {
        "metadata": {
            "generator": "FreeCAD Ultra-Light Exporter",
            "version": "1.0",
            "mode": "edges-only"
        },
        "objects": []
    }
    
    for obj in doc.Objects:
        if not hasattr(obj, 'Shape'):
            continue
        
        shape = obj.Shape
        if shape.isNull():
            continue
        
        print(f"\n🔧 {obj.Label}")
        
        try:
            # Только рёбра, БЕЗ триангуляции (экономия 90%)
            edges = []
            for edge in shape.Edges:
                try:
                    # МИНИМУМ точек на ребро (2-5)
                    points = edge.discretize(Number=points_per_edge)
                    # Округление до 1 знака (экономия ~50%)
                    edge_vertices = [[round(p.x, 1), round(p.y, 1), round(p.z, 1)] for p in points]
                    edges.append(edge_vertices)
                except:
                    pass
            
            obj_data = {
                "name": obj.Label,
                "type": obj.TypeId,
                "edges": edges
            }
            
            # Цвет (упрощённый формат)
            if hasattr(obj, 'ViewObject') and hasattr(obj.ViewObject, 'ShapeColor'):
                color = obj.ViewObject.ShapeColor
                obj_data["color"] = [round(color[0], 2), round(color[1], 2), round(color[2], 2)]
            
            result["objects"].append(obj_data)
            
            print(f"   ✅ Рёбер: {len(edges)}")
            
        except Exception as e:
            print(f"   ❌ {e}")
            continue
    
    # Сохранение (максимальное сжатие)
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, separators=(',', ':'), ensure_ascii=False)
        
        file_size = os.path.getsize(output_file) / 1024
        file_size_mb = file_size / 1024
        
        print(f"\n✅ Экспорт завершён!")
        print(f"   Файл: {output_file}")
        if file_size_mb > 1:
            print(f"   Размер: {file_size_mb:.2f} MB")
        else:
            print(f"   Размер: {file_size:.2f} KB")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")


def export_medium(output_file, points_per_edge=8):
    """
    СРЕДНИЙ - баланс между размером и детализацией
    Оптимально для веба: ~1-3 MB, плавные кривые
    
    Args:
        output_file: путь к выходному файлу
        points_per_edge: 6-12 для баланса (по умолчанию 8)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"📦 Экспорт MEDIUM: {doc.Name}")
    print(f"   Точек на ребро: {points_per_edge}")
    
    result = {
        "metadata": {
            "generator": "FreeCAD Medium Exporter",
            "version": "1.0",
            "mode": "edges-only"
        },
        "objects": []
    }
    
    for obj in doc.Objects:
        if not hasattr(obj, 'Shape'):
            continue
        
        shape = obj.Shape
        if shape.isNull():
            continue
        
        print(f"\n🔧 {obj.Label}")
        
        try:
            edges = []
            for edge in shape.Edges:
                try:
                    # Средняя детализация (6-12 точек)
                    points = edge.discretize(Number=points_per_edge)
                    # Округление до 2 знаков (баланс точность/размер)
                    edge_vertices = [[round(p.x, 2), round(p.y, 2), round(p.z, 2)] for p in points]
                    edges.append(edge_vertices)
                except:
                    pass
            
            obj_data = {
                "name": obj.Label,
                "type": obj.TypeId,
                "edges": edges
            }
            
            # Цвет
            if hasattr(obj, 'ViewObject') and hasattr(obj.ViewObject, 'ShapeColor'):
                color = obj.ViewObject.ShapeColor
                obj_data["color"] = [round(color[0], 2), round(color[1], 2), round(color[2], 2)]
            
            result["objects"].append(obj_data)
            
            print(f"   ✅ Рёбер: {len(edges)}")
            
        except Exception as e:
            print(f"   ❌ {e}")
            continue
    
    # Сохранение
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, separators=(',', ':'), ensure_ascii=False)
        
        file_size = os.path.getsize(output_file) / 1024
        file_size_mb = file_size / 1024
        
        print(f"\n✅ Экспорт завершён!")
        print(f"   Файл: {output_file}")
        if file_size_mb > 1:
            print(f"   Размер: {file_size_mb:.2f} MB")
        else:
            print(f"   Размер: {file_size:.2f} KB")
        print(f"   💡 Баланс: детализация + малый размер")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")


def export_super_light(output_file):
    """
    СУПЕР-ЛЁГКИЙ - минимальный размер файла
    Только прямые рёбра (начало + конец), округление до целых
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"📦 Экспорт SUPER-LIGHT: {doc.Name}")
    
    result = {
        "metadata": {
            "generator": "FreeCAD Super-Light Exporter",
            "version": "1.0",
            "mode": "edges-only"
        },
        "objects": []
    }
    
    for obj in doc.Objects:
        if not hasattr(obj, 'Shape'):
            continue
        
        shape = obj.Shape
        if shape.isNull():
            continue
        
        print(f"\n🔧 {obj.Label}")
        
        try:
            edges = []
            for edge in shape.Edges:
                try:
                    # ТОЛЬКО начало и конец ребра (2 точки)
                    start = edge.firstVertex().Point
                    end = edge.lastVertex().Point
                    
                    # Округление до целых (экономия ~70%)
                    edge_vertices = [
                        [int(round(start.x)), int(round(start.y)), int(round(start.z))],
                        [int(round(end.x)), int(round(end.y)), int(round(end.z))]
                    ]
                    edges.append(edge_vertices)
                except:
                    pass
            
            obj_data = {
                "name": obj.Label,
                "edges": edges
            }
            
            result["objects"].append(obj_data)
            
            print(f"   ✅ Рёбер: {len(edges)} (только прямые линии)")
            
        except Exception as e:
            print(f"   ❌ {e}")
            continue
    
    # Сохранение
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, separators=(',', ':'), ensure_ascii=False)
        
        file_size = os.path.getsize(output_file) / 1024
        
        print(f"\n✅ Экспорт завершён!")
        print(f"   Файл: {output_file}")
        print(f"   Размер: {file_size:.2f} KB (МИНИМУМ!)")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")


# ============================================
# ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ (скопируй в консоль)
# ============================================

# Вариант 1: Базовый экспорт
# export_to_threejs("C:/Users/rozov/Downloads/cabinet_geometry.json")

# Вариант 2: С рёбрами для технического вида (рекомендуется!)
# export_with_edges("C:/Users/rozov/Downloads/cabinet_geometry.json", tolerance=0.5, edge_angle=20)

# Вариант 3: Быстрый экспорт в Downloads
# quick_export()

# Вариант 4: Высокое качество (больше полигонов)
# export_with_edges("C:/Users/rozov/Downloads/cabinet_hq.json", tolerance=0.1, edge_angle=15)

# Вариант 5: Низкое качество (меньше полигонов, быстрее)
# export_with_edges("C:/Users/rozov/Downloads/cabinet_lq.json", tolerance=2.0, edge_angle=30)

# Вариант 6: Оптимизированный для веба
# export_optimized("C:/Users/rozov/Downloads/cabinet_web.json")

# Вариант 7: СРЕДНИЙ (баланс детализация/размер) ⭐⭐⭐⭐⭐ РЕКОМЕНДУЕТСЯ!
# export_medium("C:/Users/rozov/Downloads/cabinet_medium.json", points_per_edge=8)

# Вариант 8: УЛЬТРА-ЛЁГКИЙ (3 точки на ребро)
# export_ultra_light("C:/Users/rozov/Downloads/cabinet_light.json", points_per_edge=3)

# Вариант 9: СУПЕР-ЛЁГКИЙ (МИНИМУМ! только прямые линии)
# export_super_light("C:/Users/rozov/Downloads/cabinet_super_light.json")


print("✅ Скрипт загружен!")
print("\n📖 Использование:")
print("   export_medium('path/to/output.json')       # БАЛАНС! (8 точек, ~1-3 MB) ⭐⭐⭐")
print("   export_super_light('path/to/output.json')  # минимум (прямые линии)")
print("   export_ultra_light('path/to/output.json')  # лёгкий (3-5 точек)")
print("   export_optimized('path/to/output.json')    # с триангуляцией")
print("\n💡 Рекомендации:")
print("   - export_medium() — ЛУЧШИЙ БАЛАНС для веба (плавные кривые, ~1-3 MB)")
print("   - export_ultra_light(file, 10) — можно настроить детализацию")
print("   - export_super_light() — если нужен минимум (~50-200 KB)")
