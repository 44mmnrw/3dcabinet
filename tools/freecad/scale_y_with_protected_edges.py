# -*- coding: utf-8 -*-
"""
Скрипт для масштабирования объекта по оси Y с защитой краёв

Масштабирует только среднюю часть объекта, оставляя по 100мм от каждого края по оси Y нетронутыми.

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\scale_y_with_protected_edges.py', encoding='utf-8').read())
    scale_y_protected(scale_factor=1.2, protected_mm=100)
"""

import FreeCAD as App
import FreeCADGui as Gui
import Part
from FreeCAD import Vector


def scale_y_protected(scale_factor=1.2, protected_mm=100, object_name=None):
    """
    Масштабирует объект по оси Y, защищая края (БЕЗ разрезания модели)
    
    Трансформирует координаты точек напрямую, сохраняя целостность геометрии.
    
    Args:
        scale_factor: Коэффициент масштабирования (1.2 = увеличение на 20%)
        protected_mm: Защищённая зона от каждого края в мм (по умолчанию 100)
        object_name: Имя объекта для масштабирования (если None - берётся выделенный)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return None
    
    # Получаем объект
    if object_name:
        obj = doc.getObject(object_name)
        if not obj:
            print(f"❌ Объект '{object_name}' не найден!")
            return None
    else:
        selection = Gui.Selection.getSelection()
        if not selection:
            print("❌ Ничего не выделено! Выделите объект или укажите object_name")
            return None
        obj = selection[0]
    
    if not hasattr(obj, 'Shape'):
        print(f"❌ Объект '{obj.Label}' не имеет геометрии!")
        return None
    
    print(f"\n{'='*70}")
    print(f"МАСШТАБИРОВАНИЕ ПО ОСИ Y С ЗАЩИТОЙ КРАЁВ")
    print(f"{'='*70}")
    print(f"Объект: {obj.Label}")
    print(f"Коэффициент масштабирования: {scale_factor}")
    print(f"Защищённая зона: {protected_mm} мм от каждого края")
    
    shape = obj.Shape
    bbox = shape.BoundBox
    
    y_min = bbox.YMin
    y_max = bbox.YMax
    y_length = bbox.YLength
    
    print(f"\nИсходные размеры по Y:")
    print(f"  Y_min: {y_min:.2f} мм")
    print(f"  Y_max: {y_max:.2f} мм")
    print(f"  Длина: {y_length:.2f} мм")
    
    # Проверяем, что защищённые зоны не перекрываются
    protected_total = protected_mm * 2
    if protected_total >= y_length:
        print(f"\n❌ ОШИБКА: Защищённые зоны ({protected_total} мм) больше или равны длине объекта ({y_length:.2f} мм)!")
        print(f"   Уменьшите protected_mm или увеличьте объект")
        return None
    
    # Определяем границы зон
    y_protected_bottom_end = y_min + protected_mm
    y_protected_top_start = y_max - protected_mm
    y_middle_start = y_protected_bottom_end
    y_middle_end = y_protected_top_start
    middle_length = y_middle_end - y_middle_start
    
    print(f"\nЗоны:")
    print(f"  Нижняя защищённая: {y_min:.2f} .. {y_protected_bottom_end:.2f} мм ({protected_mm} мм)")
    print(f"  Средняя (масштабируемая): {y_middle_start:.2f} .. {y_middle_end:.2f} мм ({middle_length:.2f} мм)")
    print(f"  Верхняя защищённая: {y_protected_top_start:.2f} .. {y_max:.2f} мм ({protected_mm} мм)")
    
    print(f"\n🔧 Трансформация координат (без разрезания)...")
    
    try:
        # Функция трансформации координаты Y
        def transform_y(y):
            if y <= y_protected_bottom_end:
                # Нижняя защищённая зона - без изменений
                return y
            elif y >= y_protected_top_start:
                # Верхняя защищённая зона - сдвигаем на увеличение средней части
                delta_y = middle_length * (scale_factor - 1)
                return y + delta_y
            else:
                # Средняя зона - масштабируем относительно центра средней части
                scale_center_y = (y_middle_start + y_middle_end) / 2
                relative_y = y - scale_center_y
                scaled_y = scale_center_y + relative_y * scale_factor
                # Сдвигаем на половину увеличения (чтобы верхняя часть тоже сдвинулась)
                delta_y = (middle_length * (scale_factor - 1)) / 2
                return scaled_y + delta_y
        
        # Функция трансформации точки
        def transform_point(point):
            new_y = transform_y(point.y)
            return Vector(point.x, new_y, point.z)
        
        # УПРОЩЁННЫЙ ПОДХОД: трансформируем через триангуляцию
        # Это сохраняет форму, но может потерять точность для точных кривых
        print("  🔄 Триангуляция и трансформация...")
        
        mesh = shape.tessellate(0.1)  # Триангуляция с точностью 0.1 мм
        vertices = mesh[0]
        triangles = mesh[1]
        
        # Трансформируем вершины
        transformed_vertices = [transform_point(v) for v in vertices]
        
        # Создаём новую форму из трансформированных вершин
        # Но это потеряет точность и создаст mesh вместо точной геометрии
        
        print("  ⚠️  ВНИМАНИЕ: Для точной трансформации без потери качества")
        print("     рекомендуется использовать разделение на части.")
        print("     Текущий метод использует триангуляцию и может потерять точность.")
        
        # Создаём mesh из трансформированных вершин
        import Mesh
        mesh_obj = Mesh.Mesh()
        mesh_obj.addFacets([(transformed_vertices[t[0]], transformed_vertices[t[1]], transformed_vertices[t[2]]) 
                           for t in triangles])
        
        # Конвертируем mesh обратно в Part (но это будет приблизительно)
        new_shape = Part.Shape(mesh_obj)
        
        # Создаём новый объект
        new_obj = doc.addObject("Part::Feature", f"{obj.Label}_scaled")
        new_obj.Shape = new_shape
        
        # Копируем свойства
        if hasattr(obj, 'ViewObject'):
            new_obj.ViewObject.Visibility = obj.ViewObject.Visibility
            if hasattr(obj.ViewObject, 'ShapeColor'):
                new_obj.ViewObject.ShapeColor = obj.ViewObject.ShapeColor
            if hasattr(obj.ViewObject, 'Transparency'):
                new_obj.ViewObject.Transparency = obj.ViewObject.Transparency
        
        doc.recompute()
        
        # Проверяем результат
        new_bbox = new_obj.Shape.BoundBox
        new_y_length = new_bbox.YLength
        
        print(f"\n{'='*70}")
        print(f"✅ МАСШТАБИРОВАНИЕ ЗАВЕРШЕНО")
        print(f"{'='*70}")
        print(f"Новый объект: {new_obj.Label}")
        print(f"\nНовые размеры по Y:")
        print(f"  Y_min: {new_bbox.YMin:.2f} мм")
        print(f"  Y_max: {new_bbox.YMax:.2f} мм")
        print(f"  Длина: {new_y_length:.2f} мм")
        print(f"  Изменение: {new_y_length - y_length:.2f} мм ({((new_y_length / y_length - 1) * 100):.1f}%)")
        print(f"\n⚠️  ВНИМАНИЕ: Геометрия преобразована через триангуляцию.")
        print(f"   Для точной геометрии используйте scale_y_protected_precise()")
        
        return new_obj
        
    except Exception as e:
        print(f"\n❌ ОШИБКА при масштабировании: {e}")
        import traceback
        traceback.print_exc()
        return None


def scale_y_protected_precise(scale_factor=1.2, protected_mm=100, object_name=None):
    """
    ТОЧНЫЙ метод масштабирования (использует разделение, но делает это автоматически)
    
    Этот метод даёт точный результат, но технически разделяет модель на части
    (хотя промежуточные объекты не создаются в документе)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return None
    
    # Получаем объект
    if object_name:
        obj = doc.getObject(object_name)
        if not obj:
            print(f"❌ Объект '{object_name}' не найден!")
            return None
    else:
        selection = Gui.Selection.getSelection()
        if not selection:
            print("❌ Ничего не выделено!")
            return None
        obj = selection[0]
    
    if not hasattr(obj, 'Shape'):
        print(f"❌ Объект '{obj.Label}' не имеет геометрии!")
        return None
    
    print(f"\n{'='*70}")
    print(f"ТОЧНОЕ МАСШТАБИРОВАНИЕ (автоматическое разделение)")
    print(f"{'='*70}")
    print(f"Объект: {obj.Label}")
    print(f"Коэффициент: {scale_factor}, Защита: {protected_mm} мм")
    
    shape = obj.Shape
    bbox = shape.BoundBox
    
    y_min = bbox.YMin
    y_max = bbox.YMax
    y_length = bbox.YLength
    
    protected_total = protected_mm * 2
    if protected_total >= y_length:
        print(f"❌ Защищённые зоны слишком большие!")
        return None
    
    y_protected_bottom_end = y_min + protected_mm
    y_protected_top_start = y_max - protected_mm
    y_middle_start = y_protected_bottom_end
    y_middle_end = y_protected_top_start
    middle_length = y_middle_end - y_middle_start
    
    print(f"Средняя часть: {middle_length:.2f} мм")
    print(f"🔧 Автоматическое разделение и масштабирование...")
    
    try:
        # Разделяем (но не создаём промежуточные объекты)
        x_margin = bbox.XLength * 0.5
        z_margin = bbox.ZLength * 0.5
        
        box_bottom = Part.makeBox(
            bbox.XLength + x_margin * 2,
            protected_mm + 1,
            bbox.ZLength + z_margin * 2,
            Vector(bbox.XMin - x_margin, y_min - 0.5, bbox.ZMin - z_margin)
        )
        part_bottom = shape.common(box_bottom)
        
        box_middle = Part.makeBox(
            bbox.XLength + x_margin * 2,
            middle_length + 1,
            bbox.ZLength + z_margin * 2,
            Vector(bbox.XMin - x_margin, y_middle_start - 0.5, bbox.ZMin - z_margin)
        )
        part_middle = shape.common(box_middle)
        
        box_top = Part.makeBox(
            bbox.XLength + x_margin * 2,
            protected_mm + 1,
            bbox.ZLength + z_margin * 2,
            Vector(bbox.XMin - x_margin, y_protected_top_start - 0.5, bbox.ZMin - z_margin)
        )
        part_top = shape.common(box_top)
        
        # Масштабируем среднюю часть
        scale_center_y = (y_middle_start + y_middle_end) / 2
        from FreeCAD import Matrix
        scale_matrix = Matrix()
        scale_matrix.scale(1.0, scale_factor, 1.0)
        
        translation_to_origin = Matrix()
        translation_to_origin.move(Vector(0, -scale_center_y, 0))
        
        translation_back = Matrix()
        translation_back.move(Vector(0, scale_center_y, 0))
        
        transform_matrix = translation_back * scale_matrix * translation_to_origin
        
        part_middle_scaled = part_middle.copy()
        part_middle_scaled.transformShape(transform_matrix)
        
        # Объединяем
        result_shape = part_bottom.fuse(part_middle_scaled)
        result_shape = result_shape.fuse(part_top)
        
        try:
            result_shape = result_shape.removeSplitter()
        except:
            pass
        
        # Создаём новый объект
        new_obj = doc.addObject("Part::Feature", f"{obj.Label}_scaled")
        new_obj.Shape = result_shape
        
        if hasattr(obj, 'ViewObject'):
            new_obj.ViewObject.Visibility = obj.ViewObject.Visibility
            if hasattr(obj.ViewObject, 'ShapeColor'):
                new_obj.ViewObject.ShapeColor = obj.ViewObject.ShapeColor
            if hasattr(obj.ViewObject, 'Transparency'):
                new_obj.ViewObject.Transparency = obj.ViewObject.Transparency
        
        doc.recompute()
        
        new_bbox = new_obj.Shape.BoundBox
        new_y_length = new_bbox.YLength
        
        print(f"✅ Готово! Новый размер по Y: {new_y_length:.2f} мм")
        
        return new_obj
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return None


def scale_y_protected_simple(scale_factor=1.2, protected_mm=100, object_name=None):
    """
    Упрощённая версия: масштабирует через трансформацию с учётом защищённых зон
    
    Этот метод работает быстрее, но может быть менее точным для сложной геометрии
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return None
    
    # Получаем объект
    if object_name:
        obj = doc.getObject(object_name)
        if not obj:
            print(f"❌ Объект '{object_name}' не найден!")
            return None
    else:
        selection = Gui.Selection.getSelection()
        if not selection:
            print("❌ Ничего не выделено!")
            return None
        obj = selection[0]
    
    if not hasattr(obj, 'Shape'):
        print(f"❌ Объект '{obj.Label}' не имеет геометрии!")
        return None
    
    shape = obj.Shape
    bbox = shape.BoundBox
    
    y_min = bbox.YMin
    y_max = bbox.YMax
    y_length = bbox.YLength
    
    protected_total = protected_mm * 2
    if protected_total >= y_length:
        print(f"❌ Защищённые зоны слишком большие!")
        return None
    
    y_protected_bottom_end = y_min + protected_mm
    y_protected_top_start = y_max - protected_mm
    y_middle_start = y_protected_bottom_end
    y_middle_end = y_protected_top_start
    middle_length = y_middle_end - y_middle_start
    
    print(f"\n{'='*70}")
    print(f"МАСШТАБИРОВАНИЕ (упрощённый метод)")
    print(f"{'='*70}")
    print(f"Объект: {obj.Label}")
    print(f"Коэффициент: {scale_factor}, Защита: {protected_mm} мм")
    print(f"Средняя часть: {middle_length:.2f} мм")
    
    # Создаём функцию трансформации для каждой точки
    def transform_point(point):
        y = point.y
        
        if y <= y_protected_bottom_end:
            # Нижняя защищённая зона - без изменений
            return point
        elif y >= y_protected_top_start:
            # Верхняя защищённая зона - сдвигаем на увеличение средней части
            delta_y = (middle_length * (scale_factor - 1))
            return Vector(point.x, point.y + delta_y, point.z)
        else:
            # Средняя зона - масштабируем относительно центра
            scale_center_y = (y_middle_start + y_middle_end) / 2
            relative_y = y - scale_center_y
            scaled_y = scale_center_y + relative_y * scale_factor
            # Сдвигаем на половину увеличения (чтобы верхняя часть тоже сдвинулась)
            delta_y = (middle_length * (scale_factor - 1)) / 2
            return Vector(point.x, scaled_y + delta_y, point.z)
    
    # Применяем трансформацию к вершинам
    # Это упрощённый метод - для точного результата лучше использовать первый метод
    print("⚠️  Упрощённый метод может быть неточным для сложной геометрии")
    print("   Рекомендуется использовать scale_y_protected()")
    
    return None  # Пока не реализовано полностью


# Пример использования
if __name__ == "__main__":
    print("✅ Скрипт загружен!")
    print("\n📖 Доступные функции:")
    print("\n1. scale_y_protected() - БЕЗ разрезания (через триангуляцию)")
    print("   ⚠️  Может потерять точность для сложной геометрии")
    print("   scale_y_protected(scale_factor=1.2, protected_mm=100)")
    print("\n2. scale_y_protected_precise() - ТОЧНЫЙ метод (автоматическое разделение)")
    print("   ✅ Сохраняет точность, но технически разделяет модель")
    print("   scale_y_protected_precise(scale_factor=1.2, protected_mm=100)")
    print("\n💡 Примеры:")
    print("   scale_y_protected(1.2, 100)           # Без разрезания, может потерять точность")
    print("   scale_y_protected_precise(1.2, 100)   # Точный метод (рекомендуется)")
    print("   scale_y_protected_precise(0.9, 100)   # Уменьшить на 10%")

