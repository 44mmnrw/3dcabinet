# -*- coding: utf-8 -*-
"""
Диагностический скрипт для анализа модели шкафа в FreeCAD

Собирает всю информацию о модели: объекты, размеры, структуру, Placement и т.д.

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\analyze_cabinet_model.py', encoding='utf-8').read())
    analyze_model()
"""

import FreeCAD as App
import FreeCADGui as Gui
from FreeCAD import Vector
import json


def analyze_model(output_file=None):
    """
    Полный анализ модели шкафа
    
    Args:
        output_file: путь к JSON файлу для сохранения результатов (опционально)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return None
    
    print(f"\n{'='*70}")
    print(f"📊 АНАЛИЗ МОДЕЛИ ШКАФА")
    print(f"{'='*70}")
    print(f"Документ: {doc.Name}")
    print(f"Всего объектов: {len(doc.Objects)}")
    
    # Собираем данные
    analysis_data = {
        "document": {
            "name": doc.Name,
            "label": doc.Label if hasattr(doc, 'Label') else None,
            "object_count": len(doc.Objects)
        },
        "objects": [],
        "summary": {
            "total_objects": 0,
            "objects_with_shape": 0,
            "objects_with_240mm_height": [],
            "objects_with_180mm_height": [],
            "min_z": None,
            "max_z": None,
            "min_height": None,
            "max_height": None
        }
    }
    
    objects_with_shape = []
    z_values = []
    heights = []
    
    print(f"\n{'='*70}")
    print(f"📦 ОБЪЕКТЫ В ДОКУМЕНТЕ")
    print(f"{'='*70}\n")
    
    for idx, obj in enumerate(doc.Objects, 1):
        obj_data = {
            "index": idx,
            "name": obj.Name,
            "label": obj.Label if hasattr(obj, 'Label') else None,
            "type": obj.TypeId,
            "has_shape": hasattr(obj, 'Shape'),
            "shape_is_null": False,
            "placement": None,
            "bounding_box": None,
            "dimensions": None,
            "volume": None,
            "center": None
        }
        
        print(f"{idx}. {obj.Name} ({obj.Label if hasattr(obj, 'Label') else 'N/A'})")
        print(f"   Тип: {obj.TypeId}")
        
        if hasattr(obj, 'Shape'):
            shape = obj.Shape
            obj_data["shape_is_null"] = shape.isNull()
            
            if not shape.isNull():
                objects_with_shape.append(obj)
                
                # Placement
                placement = obj.Placement
                obj_data["placement"] = {
                    "base": {
                        "x": placement.Base.x,
                        "y": placement.Base.y,
                        "z": placement.Base.z
                    },
                    "rotation": {
                        "axis": {
                            "x": placement.Rotation.Axis.x,
                            "y": placement.Rotation.Axis.y,
                            "z": placement.Rotation.Axis.z
                        },
                        "angle": placement.Rotation.Angle
                    }
                }
                
                print(f"   Placement.Base: ({placement.Base.x:.2f}, {placement.Base.y:.2f}, {placement.Base.z:.2f})")
                
                # Bounding Box
                bbox = shape.BoundBox
                obj_data["bounding_box"] = {
                    "x_min": bbox.XMin,
                    "x_max": bbox.XMax,
                    "y_min": bbox.YMin,
                    "y_max": bbox.YMax,
                    "z_min": bbox.ZMin,
                    "z_max": bbox.ZMax,
                    "x_length": bbox.XLength,
                    "y_length": bbox.YLength,
                    "z_length": bbox.ZLength,
                    "center": {
                        "x": bbox.Center.x,
                        "y": bbox.Center.y,
                        "z": bbox.Center.z
                    }
                }
                
                obj_data["dimensions"] = {
                    "width": bbox.XLength,
                    "depth": bbox.YLength,
                    "height": bbox.ZLength
                }
                
                obj_data["center"] = {
                    "x": bbox.Center.x,
                    "y": bbox.Center.y,
                    "z": bbox.Center.z
                }
                
                # Объём
                try:
                    volume = shape.Volume
                    obj_data["volume"] = volume
                except:
                    obj_data["volume"] = None
                
                # Вывод информации
                print(f"   Размеры: {bbox.XLength:.2f} × {bbox.YLength:.2f} × {bbox.ZLength:.2f} мм")
                print(f"   Позиция: ({bbox.XMin:.2f}, {bbox.YMin:.2f}, {bbox.ZMin:.2f})")
                print(f"   Центр: ({bbox.Center.x:.2f}, {bbox.Center.y:.2f}, {bbox.Center.z:.2f})")
                
                if obj_data["volume"]:
                    print(f"   Объём: {volume:.2f} мм³")
                
                # Проверка высоты
                height = bbox.ZLength
                heights.append(height)
                z_values.extend([bbox.ZMin, bbox.ZMax])
                
                if abs(height - 240) < 10:
                    analysis_data["summary"]["objects_with_240mm_height"].append({
                        "name": obj.Name,
                        "label": obj.Label,
                        "height": height
                    })
                    print(f"   ⚠️  ВЫСОТА ~240 мм (будет масштабироваться)")
                
                if abs(height - 180) < 10:
                    analysis_data["summary"]["objects_with_180mm_height"].append({
                        "name": obj.Name,
                        "label": obj.Label,
                        "height": height
                    })
                    print(f"   ✅ ВЫСОТА ~180 мм (уже масштабирована?)")
                
                print()
            else:
                print(f"   ⚠️  Shape is NULL")
                print()
        else:
            print(f"   ⚠️  Нет атрибута Shape")
            print()
        
        analysis_data["objects"].append(obj_data)
    
    # Сводка
    analysis_data["summary"]["total_objects"] = len(doc.Objects)
    analysis_data["summary"]["objects_with_shape"] = len(objects_with_shape)
    
    if z_values:
        analysis_data["summary"]["min_z"] = min(z_values)
        analysis_data["summary"]["max_z"] = max(z_values)
    
    if heights:
        analysis_data["summary"]["min_height"] = min(heights)
        analysis_data["summary"]["max_height"] = max(heights)
    
    # Вывод сводки
    print(f"\n{'='*70}")
    print(f"📊 СВОДКА")
    print(f"{'='*70}")
    print(f"Всего объектов: {analysis_data['summary']['total_objects']}")
    print(f"Объектов с геометрией: {analysis_data['summary']['objects_with_shape']}")
    print(f"Объектов с высотой ~240 мм: {len(analysis_data['summary']['objects_with_240mm_height'])}")
    print(f"Объектов с высотой ~180 мм: {len(analysis_data['summary']['objects_with_180mm_height'])}")
    
    if analysis_data['summary']['min_z'] is not None:
        print(f"Диапазон Z: {analysis_data['summary']['min_z']:.2f} .. {analysis_data['summary']['max_z']:.2f} мм")
    
    if analysis_data['summary']['min_height'] is not None:
        print(f"Диапазон высот: {analysis_data['summary']['min_height']:.2f} .. {analysis_data['summary']['max_height']:.2f} мм")
    
    if analysis_data['summary']['objects_with_240mm_height']:
        print(f"\n🔧 Объекты для масштабирования (высота ~240 мм):")
        for obj_info in analysis_data['summary']['objects_with_240mm_height']:
            print(f"   - {obj_info['name']} ({obj_info['label']}): {obj_info['height']:.2f} мм")
    
    # Сохранение в JSON
    if output_file:
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, indent=2, ensure_ascii=False)
            print(f"\n✅ Данные сохранены в: {output_file}")
        except Exception as e:
            print(f"\n❌ Ошибка сохранения: {e}")
    
    return analysis_data


def get_objects_for_scaling(height=240, tolerance=10):
    """
    Получить список объектов для масштабирования
    
    Args:
        height: целевая высота для поиска (по умолчанию 240)
        tolerance: допуск в мм (по умолчанию ±10)
    
    Returns:
        Список имён объектов
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return []
    
    objects = []
    
    for obj in doc.Objects:
        if hasattr(obj, 'Shape') and not obj.Shape.isNull():
            bbox = obj.Shape.BoundBox
            if abs(bbox.ZLength - height) < tolerance:
                objects.append({
                    "name": obj.Name,
                    "label": obj.Label,
                    "height": bbox.ZLength,
                    "dimensions": f"{bbox.XLength:.1f}×{bbox.YLength:.1f}×{bbox.ZLength:.1f}"
                })
    
    return objects


def print_scaling_info():
    """Вывести информацию для масштабирования"""
    print(f"\n{'='*70}")
    print(f"🔧 ИНФОРМАЦИЯ ДЛЯ МАСШТАБИРОВАНИЯ")
    print(f"{'='*70}\n")
    
    objects_240 = get_objects_for_scaling(240, 10)
    objects_180 = get_objects_for_scaling(180, 10)
    
    if objects_240:
        print(f"📦 Объекты с высотой ~240 мм (для масштабирования):")
        for obj in objects_240:
            print(f"   - {obj['name']} ({obj['label']}): {obj['dimensions']} мм")
        print(f"\n   Имена для скрипта:")
        names = [obj['name'] for obj in objects_240]
        print(f"   {names}")
        print(f"\n   Команда для масштабирования:")
        print(f"   scale_cabinet_z_240_to_180(object_names={names})")
    else:
        print("⚠️  Не найдено объектов с высотой ~240 мм")
    
    if objects_180:
        print(f"\n✅ Объекты с высотой ~180 мм (уже масштабированы?):")
        for obj in objects_180:
            print(f"   - {obj['name']} ({obj['label']}): {obj['dimensions']} мм")


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Диагностический скрипт загружен!")
    print("\n📖 Использование:")
    print("   1. Полный анализ: analyze_model()")
    print("   2. Сохранить в JSON: analyze_model('analysis.json')")
    print("   3. Информация для масштабирования: print_scaling_info()")
    print("   4. Получить список объектов: get_objects_for_scaling(240)")

