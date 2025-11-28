# -*- coding: utf-8 -*-
"""
Простой скрипт для FreeCAD: находит точки с одинаковыми координатами 
и накладывает на них ограничение наложения точек (Coincident)

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\find_coincident_points.py', encoding='utf-8').read())
    find_coincident_points()
"""

import FreeCAD as App
import FreeCADGui as Gui
import Sketcher
from FreeCAD import Vector


def find_coincident_points(sketch_name=None, tolerance=0.01):
    """
    Находит точки с одинаковыми координатами в скетче и накладывает на них ограничение Coincident
    
    Args:
        sketch_name: имя скетча (если None - используется выделенный или первый найденный)
        tolerance: допуск для совпадения точек в мм (по умолчанию 0.01 мм)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    # Получаем скетч
    sketch = None
    
    if sketch_name:
        sketch = doc.getObject(sketch_name)
        if not sketch:
            print(f"❌ Скетч '{sketch_name}' не найден!")
            return
    else:
        # Пробуем получить выделенный объект
        selection = Gui.Selection.getSelection()
        if selection and hasattr(selection[0], 'TypeId') and 'Sketcher' in selection[0].TypeId:
            sketch = selection[0]
        else:
            # Ищем первый скетч в документе
            for obj in doc.Objects:
                if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                    sketch = obj
                    break
    
    if not sketch:
        print("❌ Не найден скетч! Выделите скетч или укажите имя.")
        return
    
    print(f"📐 Обработка скетча: {sketch.Name}")
    print(f"   Допуск: {tolerance} мм")
    
    # Получаем геометрию скетча
    geometry = sketch.Geometry
    
    # Собираем все точки из геометрии
    points = []  # (geom_idx, pos_id, position)
    
    for geom_idx, geom in enumerate(geometry):
        geom_type = type(geom).__name__
        
        if geom_type == 'LineSegment':
            # Линия: начальная (1) и конечная (2) точки
            points.append((geom_idx, 1, Vector(geom.StartPoint.x, geom.StartPoint.y, 0)))
            points.append((geom_idx, 2, Vector(geom.EndPoint.x, geom.EndPoint.y, 0)))
        
        elif geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
            # Дуга: начальная (1), конечная (2) и центр (3)
            points.append((geom_idx, 1, Vector(geom.StartPoint.x, geom.StartPoint.y, 0)))
            points.append((geom_idx, 2, Vector(geom.EndPoint.x, geom.EndPoint.y, 0)))
            points.append((geom_idx, 3, Vector(geom.Center.x, geom.Center.y, 0)))
        
        elif geom_type in ['Circle', 'Ellipse']:
            # Окружность/эллипс: центр (1)
            points.append((geom_idx, 1, Vector(geom.Center.x, geom.Center.y, 0)))
        
        elif geom_type == 'BSplineCurve':
            # B-сплайн: начальная (1) и конечная (2) точки
            points.append((geom_idx, 1, Vector(geom.StartPoint.x, geom.StartPoint.y, 0)))
            points.append((geom_idx, 2, Vector(geom.EndPoint.x, geom.EndPoint.y, 0)))
    
    print(f"   Найдено точек: {len(points)}")
    
    # Находим совпадающие точки
    coincident_pairs = []
    processed = set()
    
    for i, (geom_idx1, pos_id1, pos1) in enumerate(points):
        if i in processed:
            continue
        
        # Ищем все точки, совпадающие с текущей
        matching = [i]
        for j, (geom_idx2, pos_id2, pos2) in enumerate(points[i+1:], i+1):
            if j in processed:
                continue
            
            # Проверяем расстояние
            distance = pos1.distanceToPoint(pos2)
            if distance < tolerance:
                matching.append(j)
                processed.add(j)
        
        # Если нашли совпадающие точки, создаём пары для constraints
        if len(matching) > 1:
            processed.add(i)
            # Создаём constraints между первой точкой и всеми остальными
            base_geom_idx, base_pos_id, base_pos = points[matching[0]]
            for match_idx in matching[1:]:
                other_geom_idx, other_pos_id, other_pos = points[match_idx]
                coincident_pairs.append((base_geom_idx, base_pos_id, other_geom_idx, other_pos_id))
    
    if not coincident_pairs:
        print("   ✅ Совпадающих точек не найдено")
        return
    
    print(f"   Найдено совпадающих пар: {len(coincident_pairs)}")
    
    # Проверяем существующие constraints, чтобы не создавать дубликаты
    existing = set()
    for constraint in sketch.Constraints:
        if constraint.Type == 'Coincident':
            key1 = (constraint.First, constraint.FirstPos, constraint.Second, constraint.SecondPos)
            key2 = (constraint.Second, constraint.SecondPos, constraint.First, constraint.FirstPos)
            existing.add(key1)
            existing.add(key2)
    
    # Добавляем constraints
    added = 0
    for geom_idx1, pos_id1, geom_idx2, pos_id2 in coincident_pairs:
        key = (geom_idx1, pos_id1, geom_idx2, pos_id2)
        if key in existing:
            continue
        
        try:
            constraint = Sketcher.Constraint('Coincident', geom_idx1, pos_id1, geom_idx2, pos_id2)
            sketch.addConstraint(constraint)
            added += 1
            print(f"   ✅ Добавлен Coincident: геометрия {geom_idx1} (точка {pos_id1}) ↔ геометрия {geom_idx2} (точка {pos_id2})")
        except Exception as e:
            print(f"   ❌ Ошибка: геометрия {geom_idx1} (точка {pos_id1}) ↔ геометрия {geom_idx2} (точка {pos_id2}): {e}")
    
    print(f"\n✅ Добавлено ограничений: {added}")
    
    # Пересчитываем скетч
    doc.recompute()


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Скрипт загружен!")
    print("📖 Использование:")
    print("   find_coincident_points()              # Для выделенного скетча")
    print("   find_coincident_points('Sketch')      # Для конкретного скетча")
    print("   find_coincident_points(tolerance=0.05) # С другим допуском")

