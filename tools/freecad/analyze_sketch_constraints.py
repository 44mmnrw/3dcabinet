# -*- coding: utf-8 -*-
"""
Анализ скетча FreeCAD и рекомендации по ограничениям

Анализирует скетч и показывает:
- Какие constraints уже есть
- Какие constraints нужно добавить для полного ограничения
- Рекомендации по типам constraints

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\analyze_sketch_constraints.py', encoding='utf-8').read())
    analyze_sketch_needs()
"""

import FreeCAD as App
import FreeCADGui as Gui
import Sketcher
from FreeCAD import Vector


def analyze_sketch_needs(sketch_name=None):
    """
    Анализирует скетч и показывает, какие constraints нужны для полного ограничения
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    # Получаем скетч
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
    print(f"📊 АНАЛИЗ СКЕТЧА: {sketch.Name} ({sketch.Label})")
    print(f"{'='*70}")
    
    geometry = sketch.Geometry
    constraints = sketch.Constraints
    
    print(f"\n📐 Геометрия:")
    print(f"   Элементов: {len(geometry)}")
    
    # Анализируем типы геометрии
    geom_types = {}
    for geom in geometry:
        geom_type = type(geom).__name__
        geom_types[geom_type] = geom_types.get(geom_type, 0) + 1
    
    print(f"   Типы:")
    for geom_type, count in geom_types.items():
        print(f"      - {geom_type}: {count}")
    
    print(f"\n🔗 Constraints:")
    print(f"   Всего: {len(constraints)}")
    
    # Анализируем типы constraints
    constraint_types = {}
    for constraint in constraints:
        ctype = constraint.Type
        constraint_types[ctype] = constraint_types.get(ctype, 0) + 1
    
    print(f"   По типам:")
    for ctype, count in sorted(constraint_types.items()):
        print(f"      - {ctype}: {count}")
    
    # Подсчитываем степени свободы
    print(f"\n📏 Анализ ограничений:")
    
    # Считаем точки
    points_count = 0
    for geom in geometry:
        geom_type = type(geom).__name__
        if geom_type == 'LineSegment':
            points_count += 2  # start + end
        elif geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
            points_count += 3  # start + end + center
        elif geom_type in ['Circle', 'Ellipse']:
            points_count += 1  # center
        elif geom_type == 'BSplineCurve':
            points_count += 2  # start + end
    
    # Каждая точка имеет 2 степени свободы (x, y)
    total_dof = points_count * 2
    
    # Считаем constraints
    # Coincident убирает 2 степени свободы (x и y)
    # Distance убирает 1 степень свободы
    # Angle убирает 1 степень свободы
    # и т.д.
    
    constraint_dof_reduction = 0
    coincident_count = constraint_types.get('Coincident', 0)
    distance_count = constraint_types.get('Distance', 0) + constraint_types.get('DistanceX', 0) + constraint_types.get('DistanceY', 0)
    angle_count = constraint_types.get('Angle', 0)
    radius_count = constraint_types.get('Radius', 0) + constraint_types.get('Diameter', 0)
    vertical_count = constraint_types.get('Vertical', 0)
    horizontal_count = constraint_types.get('Horizontal', 0)
    parallel_count = constraint_types.get('Parallel', 0)
    perpendicular_count = constraint_types.get('Perpendicular', 0)
    tangent_count = constraint_types.get('Tangent', 0)
    equal_count = constraint_types.get('Equal', 0)
    symmetric_count = constraint_types.get('Symmetric', 0)
    point_on_object_count = constraint_types.get('PointOnObject', 0)
    
    # Coincident убирает 2 DOF (фиксирует x и y)
    constraint_dof_reduction += coincident_count * 2
    
    # Distance убирает 1 DOF
    constraint_dof_reduction += distance_count * 1
    
    # Angle убирает 1 DOF
    constraint_dof_reduction += angle_count * 1
    
    # Radius/Diameter убирают 1 DOF
    constraint_dof_reduction += radius_count * 1
    
    # Vertical/Horizontal убирают 1 DOF (направление)
    constraint_dof_reduction += vertical_count * 1
    constraint_dof_reduction += horizontal_count * 1
    
    # Parallel убирает 1 DOF
    constraint_dof_reduction += parallel_count * 1
    
    # Perpendicular убирает 1 DOF
    constraint_dof_reduction += perpendicular_count * 1
    
    # Tangent убирает 1 DOF
    constraint_dof_reduction += tangent_count * 1
    
    # Equal убирает 1 DOF (для длин/радиусов)
    constraint_dof_reduction += equal_count * 1
    
    # Symmetric убирает 2 DOF (симметрия относительно линии)
    constraint_dof_reduction += symmetric_count * 2
    
    # PointOnObject убирает 1 DOF (точка на линии/кривой)
    constraint_dof_reduction += point_on_object_count * 1
    
    remaining_dof = total_dof - constraint_dof_reduction
    
    print(f"   Точек: {points_count}")
    print(f"   Всего степеней свободы: {total_dof}")
    print(f"   Убрано constraints: {constraint_dof_reduction}")
    print(f"   Осталось степеней свободы: {remaining_dof}")
    
    if remaining_dof == 0:
        print(f"\n   ✅ Скетч ПОЛНОСТЬЮ ОГРАНИЧЕН!")
    elif remaining_dof > 0:
        print(f"\n   ⚠️  Скетч НЕ полностью ограничен (нужно ещё {remaining_dof} constraints)")
    else:
        print(f"\n   ❌ Скетч ПЕРЕОГРАНИЧЕН (слишком много constraints, конфликты!)")
    
    # Рекомендации
    print(f"\n💡 РЕКОМЕНДАЦИИ:")
    
    if remaining_dof > 0:
        print(f"\n   1. Coincident constraints (совпадающие точки):")
        print(f"      - Нужно для соединения концов линий/дуг")
        print(f"      - Убирает 2 степени свободы на каждую пару")
        
        print(f"\n   2. Distance constraints (расстояния):")
        print(f"      - Distance - расстояние между двумя точками")
        print(f"      - DistanceX - расстояние по оси X")
        print(f"      - DistanceY - расстояние по оси Y")
        print(f"      - Убирает 1 степень свободы")
        
        print(f"\n   3. Geometric constraints (геометрические):")
        print(f"      - Vertical - вертикальная линия")
        print(f"      - Horizontal - горизонтальная линия")
        print(f"      - Parallel - параллельные линии")
        print(f"      - Perpendicular - перпендикулярные линии")
        print(f"      - Tangent - касание")
        print(f"      - Equal - равные длины/радиусы")
        print(f"      - Убирают 1 степень свободы каждая")
        
        print(f"\n   4. Dimensional constraints (размерные):")
        print(f"      - Radius - радиус окружности/дуги")
        print(f"      - Diameter - диаметр окружности")
        print(f"      - Angle - угол между линиями")
        print(f"      - Убирают 1 степень свободы каждая")
        
        print(f"\n   5. PointOnObject:")
        print(f"      - Точка лежит на линии/кривой")
        print(f"      - Убирает 1 степень свободы")
        
        print(f"\n   6. Symmetric:")
        print(f"      - Симметрия относительно линии")
        print(f"      - Убирает 2 степени свободы")
        
        print(f"\n   📋 Типичный порядок наложения constraints:")
        print(f"      1. Coincident (соединить точки)")
        print(f"      2. Vertical/Horizontal (ориентация)")
        print(f"      3. Distance (размеры)")
        print(f"      4. Angle, Radius и т.д. (дополнительные размеры)")
    
    # Анализ конкретных проблем
    print(f"\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ:")
    
    # Проверяем совпадающие точки без constraints
    print(f"\n   Совпадающие точки без Coincident:")
    points = []
    for geom_idx, geom in enumerate(geometry):
        geom_type = type(geom).__name__
        if geom_type == 'LineSegment':
            points.append(('start', geom.StartPoint, geom_idx, 1))
            points.append(('end', geom.EndPoint, geom_idx, 2))
        elif geom_type in ['ArcOfCircle', 'ArcOfEllipse']:
            points.append(('start', geom.StartPoint, geom_idx, 1))
            points.append(('end', geom.EndPoint, geom_idx, 2))
            points.append(('center', geom.Center, geom_idx, 3))
        elif geom_type in ['Circle', 'Ellipse']:
            points.append(('center', geom.Center, geom_idx, 1))
        elif geom_type == 'BSplineCurve':
            points.append(('start', geom.StartPoint, geom_idx, 1))
            points.append(('end', geom.EndPoint, geom_idx, 2))
    
    # Проверяем существующие Coincident constraints
    coincident_pairs = set()
    for constraint in constraints:
        if constraint.Type == 'Coincident':
            coincident_pairs.add((constraint.First, constraint.FirstPos, constraint.Second, constraint.SecondPos))
            coincident_pairs.add((constraint.Second, constraint.SecondPos, constraint.First, constraint.FirstPos))
    
    # Находим совпадающие точки без constraints
    missing_coincident = []
    for i, (type1, pos1, geom_idx1, pos_id1) in enumerate(points):
        for j, (type2, pos2, geom_idx2, pos_id2) in enumerate(points[i+1:], i+1):
            if pos1.distanceToPoint(pos2) < 0.01:  # Допуск 0.01 мм
                pair_key = (geom_idx1, pos_id1, geom_idx2, pos_id2)
                if pair_key not in coincident_pairs:
                    missing_coincident.append((geom_idx1, pos_id1, geom_idx2, pos_id2, type1, type2))
    
    if missing_coincident:
        print(f"      Найдено: {len(missing_coincident)} пар")
        for idx, (g1, p1, g2, p2, t1, t2) in enumerate(missing_coincident[:10], 1):  # Показываем первые 10
            print(f"      {idx}. Геометрия {g1} ({t1}, точка {p1}) ↔ Геометрия {g2} ({t2}, точка {p2})")
        if len(missing_coincident) > 10:
            print(f"      ... и ещё {len(missing_coincident) - 10} пар")
    else:
        print(f"      ✅ Все совпадающие точки имеют Coincident constraints")
    
    # Проверяем линии без ориентации
    print(f"\n   Линии без ориентации (Vertical/Horizontal):")
    lines_without_orientation = []
    for geom_idx, geom in enumerate(geometry):
        if type(geom).__name__ == 'LineSegment':
            # Проверяем, есть ли Vertical или Horizontal constraint для этой линии
            has_orientation = False
            for constraint in constraints:
                if constraint.Type in ['Vertical', 'Horizontal']:
                    if constraint.First == geom_idx:
                        has_orientation = True
                        break
            if not has_orientation:
                # Проверяем, близка ли линия к вертикали/горизонтали
                start = geom.StartPoint
                end = geom.EndPoint
                dx = abs(end.x - start.x)
                dy = abs(end.y - start.y)
                if dx < 0.01:  # Почти вертикальная
                    lines_without_orientation.append((geom_idx, 'Vertical'))
                elif dy < 0.01:  # Почти горизонтальная
                    lines_without_orientation.append((geom_idx, 'Horizontal'))
    
    if lines_without_orientation:
        print(f"      Найдено: {len(lines_without_orientation)} линий")
        for geom_idx, orientation in lines_without_orientation[:10]:
            print(f"      - Геометрия {geom_idx}: рекомендуется {orientation}")
    else:
        print(f"      ✅ Все линии имеют ориентацию или не нуждаются в ней")
    
    # Проверяем размеры
    print(f"\n   Размеры (Distance/Radius/Angle):")
    dimensional_constraints = distance_count + radius_count + angle_count
    if dimensional_constraints == 0:
        print(f"      ⚠️  Нет размерных constraints!")
        print(f"      Рекомендуется добавить Distance constraints для определения размеров")
    else:
        print(f"      ✅ Есть {dimensional_constraints} размерных constraints")
    
    print(f"\n{'='*70}")


def get_constraint_recommendations(sketch_name=None):
    """
    Получить конкретные рекомендации по constraints для скетча
    """
    doc = App.ActiveDocument
    if not doc:
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
        return
    
    print(f"\n📋 КОНКРЕТНЫЕ РЕКОМЕНДАЦИИ ДЛЯ: {sketch.Name}")
    print(f"{'='*70}\n")
    
    geometry = sketch.Geometry
    constraints = sketch.Constraints
    
    # 1. Coincident для совпадающих точек
    print("1️⃣  COINCIDENT (совпадающие точки):")
    print("   Назначение: Соединить концы линий/дуг, которые находятся в одном месте")
    print("   Когда использовать:")
    print("   - Конец одной линии совпадает с началом другой")
    print("   - Несколько линий/дуг сходятся в одной точке")
    print("   - Центр окружности совпадает с точкой на другой геометрии")
    print("   Эффект: Убирает 2 степени свободы (фиксирует x и y координаты)\n")
    
    # 2. Vertical/Horizontal
    print("2️⃣  VERTICAL / HORIZONTAL (ориентация):")
    print("   Назначение: Зафиксировать направление линии")
    print("   Когда использовать:")
    print("   - Линия должна быть строго вертикальной или горизонтальной")
    print("   - Для симметричных деталей")
    print("   Эффект: Убирает 1 степень свободы (направление)\n")
    
    # 3. Distance
    print("3️⃣  DISTANCE (расстояние):")
    print("   Назначение: Задать размер между точками")
    print("   Когда использовать:")
    print("   - Расстояние между двумя точками")
    print("   - Длина линии")
    print("   - Размер детали")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 4. Parallel/Perpendicular
    print("4️⃣  PARALLEL / PERPENDICULAR (параллельность/перпендикулярность):")
    print("   Назначение: Зафиксировать взаимное расположение линий")
    print("   Когда использовать:")
    print("   - Две линии должны быть параллельны")
    print("   - Две линии должны быть перпендикулярны")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 5. Radius/Diameter
    print("5️⃣  RADIUS / DIAMETER (радиус/диаметр):")
    print("   Назначение: Задать размер окружности/дуги")
    print("   Когда использовать:")
    print("   - Для окружностей")
    print("   - Для дуг окружности")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 6. Angle
    print("6️⃣  ANGLE (угол):")
    print("   Назначение: Задать угол между линиями")
    print("   Когда использовать:")
    print("   - Угол между двумя линиями")
    print("   - Наклон линии относительно оси")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 7. Tangent
    print("7️⃣  TANGENT (касание):")
    print("   Назначение: Линия касается окружности/дуги")
    print("   Когда использовать:")
    print("   - Линия касается окружности")
    print("   - Две окружности касаются друг друга")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 8. Equal
    print("8️⃣  EQUAL (равенство):")
    print("   Назначение: Две линии/дуги имеют одинаковую длину/радиус")
    print("   Когда использовать:")
    print("   - Несколько линий одинаковой длины")
    print("   - Несколько окружностей одинакового радиуса")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    # 9. Symmetric
    print("9️⃣  SYMMETRIC (симметрия):")
    print("   Назначение: Симметрия относительно линии")
    print("   Когда использовать:")
    print("   - Симметричные детали")
    print("   - Оси симметрии")
    print("   Эффект: Убирает 2 степени свободы\n")
    
    # 10. PointOnObject
    print("🔟  POINTONOBJECT (точка на объекте):")
    print("   Назначение: Точка лежит на линии/кривой")
    print("   Когда использовать:")
    print("   - Точка должна быть на линии")
    print("   - Центр окружности на линии")
    print("   Эффект: Убирает 1 степень свободы\n")
    
    print("="*70)
    print("💡 ПРАВИЛО: Для полного ограничения нужно 2*N constraints для N точек")
    print("   (или эквивалентное количество других constraints)")


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Скрипт анализа constraints загружен!")
    print("\n📖 Использование:")
    print("   1. Анализ скетча: analyze_sketch_needs()")
    print("   2. Рекомендации: get_constraint_recommendations()")

