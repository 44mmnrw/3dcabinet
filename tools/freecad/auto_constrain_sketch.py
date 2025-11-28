# -*- coding: utf-8 -*-
"""
Скрипт для автоматического наложения ограничений на совпадающие точки в скетче FreeCAD

Находит точки, которые находятся в одном месте, и добавляет Coincident constraints между ними.

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\auto_constrain_sketch.py', encoding='utf-8').read())
    auto_constrain_coincident_points()
    # Или для конкретного скетча:
    auto_constrain_coincident_points('Sketch')
"""

import FreeCAD as App
import FreeCADGui as Gui
import Sketcher
from FreeCAD import Vector


def auto_constrain_coincident_points(sketch_name=None, tolerance=0.01):
    """
    Автоматически накладывает Coincident constraints на точки, которые совпадают по расположению
    
    Args:
        sketch_name: имя скетча (если None - берётся выделенный или первый найденный)
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
        if selection:
            obj = selection[0]
            if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                sketch = obj
            else:
                print(f"⚠️  Выделенный объект '{obj.Name}' не является скетчем")
        
        # Если не нашли, ищем первый скетч в документе
        if not sketch:
            for obj in doc.Objects:
                if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                    sketch = obj
                    break
        
        if not sketch:
            print("❌ Не найден скетч! Выделите скетч или укажите имя: auto_constrain_coincident_points('Sketch')")
            return
    
    print(f"\n{'='*70}")
    print(f"🔗 АВТОМАТИЧЕСКОЕ НАЛОЖЕНИЕ ОГРАНИЧЕНИЙ")
    print(f"{'='*70}")
    print(f"Скетч: {sketch.Name} ({sketch.Label})")
    print(f"Допуск: {tolerance} мм")
    
    # Получаем все геометрические элементы скетча
    geometry = sketch.Geometry
    geometry_count = len(geometry)
    
    print(f"\n📊 Геометрия скетча:")
    print(f"   Элементов: {geometry_count}")
    
    # Собираем все конечные точки геометрических элементов
    points = []  # Список (point_index, point_type, coordinates, geometry_index)
    
    for geom_idx, geom in enumerate(geometry):
        geom_type = type(geom).__name__
        
        # Получаем точки в зависимости от типа геометрии
        if geom_type == 'LineSegment':
            # Линия: начальная и конечная точки
            start = geom.StartPoint
            end = geom.EndPoint
            points.append((f"Line{geom_idx}_Start", 'start', Vector(start.x, start.y, 0), geom_idx))
            points.append((f"Line{geom_idx}_End", 'end', Vector(end.x, end.y, 0), geom_idx))
        
        elif geom_type == 'ArcOfCircle':
            # Дуга окружности: начальная, конечная и центр
            start = geom.StartPoint
            end = geom.EndPoint
            center = geom.Center
            points.append((f"Arc{geom_idx}_Start", 'start', Vector(start.x, start.y, 0), geom_idx))
            points.append((f"Arc{geom_idx}_End", 'end', Vector(end.x, end.y, 0), geom_idx))
            points.append((f"Arc{geom_idx}_Center", 'center', Vector(center.x, center.y, 0), geom_idx))
        
        elif geom_type == 'Circle':
            # Окружность: центр
            center = geom.Center
            points.append((f"Circle{geom_idx}_Center", 'center', Vector(center.x, center.y, 0), geom_idx))
        
        elif geom_type == 'ArcOfEllipse':
            # Дуга эллипса: начальная, конечная и центр
            start = geom.StartPoint
            end = geom.EndPoint
            center = geom.Center
            points.append((f"EllipseArc{geom_idx}_Start", 'start', Vector(start.x, start.y, 0), geom_idx))
            points.append((f"EllipseArc{geom_idx}_End", 'end', Vector(end.x, end.y, 0), geom_idx))
            points.append((f"EllipseArc{geom_idx}_Center", 'center', Vector(center.x, center.y, 0), geom_idx))
        
        elif geom_type == 'Ellipse':
            # Эллипс: центр
            center = geom.Center
            points.append((f"Ellipse{geom_idx}_Center", 'center', Vector(center.x, center.y, 0), geom_idx))
        
        elif geom_type == 'BSplineCurve':
            # B-сплайн: начальная и конечная точки
            start = geom.StartPoint
            end = geom.EndPoint
            points.append((f"BSpline{geom_idx}_Start", 'start', Vector(start.x, start.y, 0), geom_idx))
            points.append((f"BSpline{geom_idx}_End", 'end', Vector(end.x, end.y, 0), geom_idx))
    
    print(f"   Найдено точек: {len(points)}")
    
    # Находим совпадающие точки
    coincident_groups = []  # Группы совпадающих точек
    processed = set()
    
    for i, (name1, type1, pos1, geom_idx1) in enumerate(points):
        if i in processed:
            continue
        
        # Ищем все точки, совпадающие с этой
        group = [i]
        for j, (name2, type2, pos2, geom_idx2) in enumerate(points):
            if i != j and j not in processed:
                # Проверяем расстояние
                distance = pos1.distanceToPoint(pos2)
                if distance < tolerance:
                    group.append(j)
                    processed.add(j)
        
        if len(group) > 1:  # Если есть совпадающие точки
            coincident_groups.append(group)
            processed.add(i)
    
    print(f"\n🔍 Найдено групп совпадающих точек: {len(coincident_groups)}")
    
    if not coincident_groups:
        print("   ✅ Все точки уже уникальны или нет совпадающих точек")
        return
    
    # Показываем найденные группы
    total_constraints = 0
    for group_idx, group in enumerate(coincident_groups, 1):
        print(f"\n   Группа {group_idx}: {len(group)} совпадающих точек")
        for point_idx in group:
            name, point_type, pos, geom_idx = points[point_idx]
            print(f"      - {name} ({point_type}) на геометрии {geom_idx}: ({pos.x:.3f}, {pos.y:.3f})")
        
        # Для каждой группы создаём constraints между всеми парами точек
        # (первая точка с остальными)
        if len(group) > 1:
            # Получаем информацию о базовой точке
            base_point_idx = group[0]
            base_name, base_point_type, base_pos, base_geom_idx = points[base_point_idx]
            
            # Получаем тип геометрии для базовой точки
            base_geom = geometry[base_geom_idx]
            base_geom_type = type(base_geom).__name__
            
            # Определяем правильный индекс точки в геометрии FreeCAD
            # В FreeCAD Sketcher для Coincident constraint:
            # - Для линии: 1=start, 2=end (НЕ 0 и 1!)
            # - Для дуги окружности: 1=start, 2=end, 3=center
            # - Для окружности: 1=center
            base_vertex_idx = None
            
            if base_geom_type == 'LineSegment':
                if base_point_type == 'start':
                    base_vertex_idx = 1  # Start point (в FreeCAD это 1, не 0!)
                elif base_point_type == 'end':
                    base_vertex_idx = 2  # End point (в FreeCAD это 2, не 1!)
            
            elif base_geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
                if base_point_type == 'start':
                    base_vertex_idx = 1  # Start point
                elif base_point_type == 'end':
                    base_vertex_idx = 2  # End point
                elif base_point_type == 'center':
                    base_vertex_idx = 3  # Center point
            
            elif base_geom_type in ['Circle', 'Ellipse']:
                if base_point_type == 'center':
                    base_vertex_idx = 1  # Center point
            
            elif base_geom_type == 'BSplineCurve':
                if base_point_type == 'start':
                    base_vertex_idx = 1  # Start point
                elif base_point_type == 'end':
                    base_vertex_idx = 2  # End point
            
            if base_vertex_idx is None:
                print(f"      ⚠️  Не удалось определить индекс для {base_name} (тип: {base_geom_type}, точка: {base_point_type})")
                continue
            
            # Проверяем существующие constraints, чтобы не создавать дубликаты
            existing_constraints = set()
            for constraint in sketch.Constraints:
                if constraint.Type == 'Coincident':
                    # Сохраняем пары (geom1, point1, geom2, point2) и (geom2, point2, geom1, point1)
                    existing_constraints.add((constraint.First, constraint.FirstPos, constraint.Second, constraint.SecondPos))
                    existing_constraints.add((constraint.Second, constraint.SecondPos, constraint.First, constraint.FirstPos))
            
            for other_point_idx in group[1:]:
                other_name, other_point_type, other_pos, other_geom_idx = points[other_point_idx]
                
                # Получаем тип геометрии для другой точки
                other_geom = geometry[other_geom_idx]
                other_geom_type = type(other_geom).__name__
                
                # Определяем правильный индекс точки
                other_vertex_idx = None
                
                if other_geom_type == 'LineSegment':
                    if other_point_type == 'start':
                        other_vertex_idx = 1  # Start point (в FreeCAD это 1!)
                    elif other_point_type == 'end':
                        other_vertex_idx = 2  # End point (в FreeCAD это 2!)
                
                elif other_geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
                    if other_point_type == 'start':
                        other_vertex_idx = 1
                    elif other_point_type == 'end':
                        other_vertex_idx = 2
                    elif other_point_type == 'center':
                        other_vertex_idx = 3
                
                elif other_geom_type in ['Circle', 'Ellipse']:
                    if other_point_type == 'center':
                        other_vertex_idx = 1  # Center point
                
                elif other_geom_type == 'BSplineCurve':
                    if other_point_type == 'start':
                        other_vertex_idx = 1
                    elif other_point_type == 'end':
                        other_vertex_idx = 2
                
                if other_vertex_idx is None:
                    print(f"      ⚠️  Не удалось определить индекс для {other_name} (тип: {other_geom_type}, точка: {other_point_type})")
                    continue
                
                # Проверяем, не существует ли уже такой constraint
                constraint_key = (base_geom_idx, base_vertex_idx, other_geom_idx, other_vertex_idx)
                if constraint_key in existing_constraints:
                    print(f"      ⏭️  Пропущен (уже существует): геометрия {base_geom_idx} (точка {base_vertex_idx}) ↔ геометрия {other_geom_idx} (точка {other_vertex_idx})")
                    continue
                
                # Добавляем constraint
                try:
                    # В FreeCAD Sketcher для Coincident constraint:
                    # Constraint('Coincident', GeoId1, PosId1, GeoId2, PosId2)
                    # PosId: 1=start, 2=end, 3=center (для дуг)
                    # Но индексы геометрии начинаются с 0!
                    
                    # Создаём constraint
                    constraint = Sketcher.Constraint(
                        'Coincident',
                        base_geom_idx, base_vertex_idx,
                        other_geom_idx, other_vertex_idx
                    )
                    
                    # Добавляем constraint
                    constraint_index = sketch.addConstraint(constraint)
                    
                    total_constraints += 1
                    # Добавляем в множество существующих
                    existing_constraints.add((base_geom_idx, base_vertex_idx, other_geom_idx, other_vertex_idx))
                    existing_constraints.add((other_geom_idx, other_vertex_idx, base_geom_idx, base_vertex_idx))
                    print(f"      ✅ Добавлен Coincident #{constraint_index}: геометрия {base_geom_idx} (точка {base_vertex_idx}) ↔ геометрия {other_geom_idx} (точка {other_vertex_idx})")
                except Exception as e:
                    print(f"      ❌ Ошибка при добавлении constraint: {e}")
                    print(f"         Геометрия {base_geom_idx} ({base_geom_type}) точка {base_vertex_idx} ↔ Геометрия {other_geom_idx} ({other_geom_type}) точка {other_vertex_idx}")
                    # Не выводим полный traceback, чтобы не засорять вывод
    
    print(f"\n{'='*70}")
    print(f"✅ ЗАВЕРШЕНО")
    print(f"{'='*70}")
    print(f"   Добавлено ограничений: {total_constraints}")
    print(f"   Групп совпадающих точек: {len(coincident_groups)}")
    
    # Пересчитать скетч
    doc.recompute()


def remove_malformed_constraints(sketch_name=None):
    """
    Удаляет все неправильные (malformed) constraints из скетча
    
    Args:
        sketch_name: имя скетча (если None - берётся выделенный)
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
        selection = Gui.Selection.getSelection()
        if selection:
            obj = selection[0]
            if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                sketch = obj
        
        if not sketch:
            for obj in doc.Objects:
                if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                    sketch = obj
                    break
        
        if not sketch:
            print("❌ Не найден скетч!")
            return
    
    print(f"\n{'='*70}")
    print(f"🗑️  УДАЛЕНИЕ НЕПРАВИЛЬНЫХ CONSTRAINTS")
    print(f"{'='*70}")
    print(f"Скетч: {sketch.Name} ({sketch.Label})")
    
    # Получаем все constraints
    constraints = sketch.Constraints
    print(f"Всего constraints: {len(constraints)}")
    
    # Находим неправильные constraints
    # В FreeCAD неправильные constraints обычно имеют некорректные индексы геометрии
    malformed_indices = []
    
    geometry_count = len(sketch.Geometry)
    
    for idx, constraint in enumerate(constraints):
        is_malformed = False
        
        # Проверяем индексы геометрии
        if hasattr(constraint, 'First') and constraint.First >= geometry_count:
            is_malformed = True
        if hasattr(constraint, 'Second') and constraint.Second >= geometry_count:
            is_malformed = True
        if hasattr(constraint, 'Third') and constraint.Third >= geometry_count:
            is_malformed = True
        
        if is_malformed:
            malformed_indices.append(idx)
            print(f"   Найден неправильный constraint #{idx}: {constraint.Type}")
    
    if not malformed_indices:
        print("   ✅ Неправильных constraints не найдено")
        return
    
    print(f"\n   Найдено неправильных constraints: {len(malformed_indices)}")
    print(f"   Удаление...")
    
    # Удаляем в обратном порядке (чтобы индексы не сдвигались)
    for idx in reversed(malformed_indices):
        try:
            sketch.delConstraint(idx)
            print(f"   ✅ Удалён constraint #{idx}")
        except Exception as e:
            print(f"   ❌ Ошибка при удалении constraint #{idx}: {e}")
    
    print(f"\n✅ Удалено constraints: {len(malformed_indices)}")
    doc.recompute()


def analyze_sketch_points(sketch_name=None, tolerance=0.01):
    """
    Анализирует скетч и показывает, какие constraints нужно создать
    (без их создания - только для проверки)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    sketch = None
    if sketch_name:
        sketch = doc.getObject(sketch_name)
    else:
        selection = Gui.Selection.getSelection()
        if selection and hasattr(selection[0], 'TypeId') and 'Sketcher' in selection[0].TypeId:
            sketch = selection[0]
        else:
            for obj in doc.Objects:
                if hasattr(obj, 'TypeId') and 'Sketcher' in obj.TypeId:
                    sketch = obj
                    break
    
    if not sketch:
        print("❌ Не найден скетч!")
        return
    
    print(f"\n{'='*70}")
    print(f"📊 АНАЛИЗ ТОЧЕК СКЕТЧА")
    print(f"{'='*70}")
    print(f"Скетч: {sketch.Name}")
    
    geometry = sketch.Geometry
    points = []
    
    for geom_idx, geom in enumerate(geometry):
        geom_type = type(geom).__name__
        
        if geom_type == 'LineSegment':
            start = geom.StartPoint
            end = geom.EndPoint
            points.append(('start', Vector(start.x, start.y, 0), geom_idx, 1))  # PosId=1 для start
            points.append(('end', Vector(end.x, end.y, 0), geom_idx, 2))  # PosId=2 для end
        
        elif geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
            start = geom.StartPoint
            end = geom.EndPoint
            center = geom.Center
            points.append(('start', Vector(start.x, start.y, 0), geom_idx, 1))
            points.append(('end', Vector(end.x, end.y, 0), geom_idx, 2))
            points.append(('center', Vector(center.x, center.y, 0), geom_idx, 3))
        
        elif geom_type in ['Circle', 'Ellipse']:
            center = geom.Center
            points.append(('center', Vector(center.x, center.y, 0), geom_idx, 1))
        
        elif geom_type == 'BSplineCurve':
            start = geom.StartPoint
            end = geom.EndPoint
            points.append(('start', Vector(start.x, start.y, 0), geom_idx, 1))
            points.append(('end', Vector(end.x, end.y, 0), geom_idx, 2))
    
    # Находим совпадающие
    coincident_pairs = []
    for i, (type1, pos1, geom_idx1, pos_id1) in enumerate(points):
        for j, (type2, pos2, geom_idx2, pos_id2) in enumerate(points[i+1:], i+1):
            if pos1.distanceToPoint(pos2) < tolerance:
                coincident_pairs.append((geom_idx1, pos_id1, geom_idx2, pos_id2, type1, type2))
    
    print(f"\nНайдено совпадающих пар: {len(coincident_pairs)}")
    print(f"\nConstraints для создания:")
    for idx, (g1, p1, g2, p2, t1, t2) in enumerate(coincident_pairs, 1):
        print(f"  {idx}. Coincident: геометрия {g1} (точка {p1}, {t1}) ↔ геометрия {g2} (точка {p2}, {t2})")
        print(f"     Команда: sketch.addConstraint(Sketcher.Constraint('Coincident', {g1}, {p1}, {g2}, {p2}))")
    
    return coincident_pairs


def auto_constrain_all(sketch_name=None, tolerance=0.01):
    """
    Автоматически накладывает все возможные ограничения:
    - Coincident для совпадающих точек
    - Horizontal/Vertical для линий, близких к осям
    - и т.д.
    """
    print("⚠️  Функция auto_constrain_all() пока не реализована")
    print("   Используйте auto_constrain_coincident_points() для совпадающих точек")


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Скрипт автоматического наложения ограничений загружен!")
    print("\n📖 Использование:")
    print("   1. Удалить неправильные constraints (если есть ошибки):")
    print("      remove_malformed_constraints()")
    print("   2. Проанализировать скетч (показать, что будет создано):")
    print("      analyze_sketch_points()")
    print("   3. Автоматически для выделенного скетча:")
    print("      auto_constrain_coincident_points()")
    print("   4. Для конкретного скетча:")
    print("      auto_constrain_coincident_points('Sketch')")
    print("   5. С другим допуском:")
    print("      auto_constrain_coincident_points(tolerance=0.05)")

