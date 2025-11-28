# -*- coding: utf-8 -*-
"""
Скрипт для уменьшения шкафа с 240 до 180 мм по оси Z

Использование:
    1. Откройте FreeCAD с моделью шкафа
    2. В Python консоли выполните:
       exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\scale_z_240_to_180.py', encoding='utf-8').read())
    3. Запустите: scale_cabinet_z_240_to_180()
"""

import FreeCAD as App
import FreeCADGui as Gui
import Part
from FreeCAD import Vector, Matrix


def scale_cabinet_z_240_to_180(from_height=240, to_height=180, object_names=None, use_actual_height=False):
    """
    Уменьшить высоту шкафа с 240 до 180 мм по оси Z
    
    Args:
        from_height: текущая высота (мм) - по умолчанию 240 (используется только если use_actual_height=False)
        to_height: целевая высота (мм) - по умолчанию 180
        object_names: список имён объектов для масштабирования (если None - все объекты с высотой ~240)
        use_actual_height: если True, использует реальную высоту объекта вместо from_height
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"\n{'='*70}")
    print(f"📐 МАСШТАБИРОВАНИЕ ШКАФА ПО ОСИ Z")
    print(f"{'='*70}")
    print(f"   Целевая высота: {to_height} мм")
    
    # Определяем объекты для масштабирования
    objects_to_scale = []
    
    if object_names:
        # Масштабировать указанные объекты
        for name in object_names:
            obj = doc.getObject(name)
            if obj and hasattr(obj, 'Shape') and not obj.Shape.isNull():
                objects_to_scale.append(obj)
            else:
                print(f"⚠️  Объект '{name}' не найден или не имеет геометрии")
    else:
        # Автоматически найти все объекты с высотой ~240 мм
        for obj in doc.Objects:
            if hasattr(obj, 'Shape') and not obj.Shape.isNull():
                bbox = obj.Shape.BoundBox
                # Проверяем, что объект имеет высоту ~240 мм (с допуском ±10 мм)
                if abs(bbox.ZLength - from_height) < 10:
                    objects_to_scale.append(obj)
    
    if not objects_to_scale:
        print("\n❌ Не найдено объектов для масштабирования!")
        print("   Возможные причины:")
        print("   1. Объекты не имеют высоту ~240 мм")
        print("   2. Укажите имена объектов явно: scale_cabinet_z_240_to_180(object_names=['obj1', 'obj2'])")
        
        # Показываем все объекты для справки
        print("\n📦 Все объекты в документе:")
        for obj in doc.Objects:
            if hasattr(obj, 'Shape') and not obj.Shape.isNull():
                bbox = obj.Shape.BoundBox
                print(f"   {obj.Name} ({obj.Label}): {bbox.XLength:.1f} × {bbox.YLength:.1f} × {bbox.ZLength:.1f} мм")
        return
    
    print(f"\n🔧 Найдено объектов для масштабирования: {len(objects_to_scale)}")
    
    for obj in objects_to_scale:
        try:
            print(f"\n📦 Обработка: {obj.Label} ({obj.Name})")
            
            # Получить текущие размеры
            bbox = obj.Shape.BoundBox
            z_min_original = bbox.ZMin
            z_max_original = bbox.ZMax
            z_length_original = bbox.ZLength
            
            # Использовать реальную высоту или указанную
            actual_from_height = z_length_original if use_actual_height else from_height
            scale_factor = to_height / actual_from_height
            
            print(f"   До: {bbox.XLength:.1f} × {bbox.YLength:.1f} × {z_length_original:.2f} мм")
            print(f"   Z: {z_min_original:.2f} .. {z_max_original:.2f} мм")
            print(f"   Коэффициент масштабирования: {scale_factor:.4f}")
            
            # Сохранить текущий Placement
            original_placement = obj.Placement.copy()
            original_base = original_placement.Base
            
            # Масштабировать относительно нижней точки (Z_min), чтобы она осталась на месте
            # 1. Переместить геометрию так, чтобы нижняя точка была в (0,0,0)
            translation_to_origin = Matrix()
            translation_to_origin.move(Vector(0, 0, -z_min_original))
            
            # 2. Масштабировать только по Z
            scale_matrix = Matrix()
            scale_matrix.scale(1.0, 1.0, scale_factor)
            
            # 3. Вернуть обратно
            translation_back = Matrix()
            translation_back.move(Vector(0, 0, z_min_original))
            
            # Комбинированная трансформация
            transform_matrix = translation_back * scale_matrix * translation_to_origin
            
            # Применить трансформацию к форме
            # Используем transformShape вместо transformGeometry для прямого изменения
            new_shape = obj.Shape.copy()
            
            # Пробуем transformShape (более надёжный метод)
            try:
                new_shape.transformShape(transform_matrix)
                print(f"   ✅ Использован transformShape")
            except:
                # Если не работает, пробуем transformGeometry
                try:
                    new_shape.transformGeometry(transform_matrix)
                    print(f"   ✅ Использован transformGeometry")
                except Exception as e:
                    print(f"   ⚠️  Ошибка трансформации: {e}")
                    # Пробуем создать новую форму через scaled()
                    try:
                        # Альтернативный метод: создать новую форму через операции
                        import Part
                        # Масштабируем через makeScaled
                        new_shape = Part.makeScaled(obj.Shape, Vector(1.0, 1.0, scale_factor))
                        # Перемещаем так, чтобы нижняя точка осталась на месте
                        bbox_scaled = new_shape.BoundBox
                        z_offset = z_min_original - bbox_scaled.ZMin
                        new_shape.translate(Vector(0, 0, z_offset))
                        print(f"   ✅ Использован makeScaled")
                    except Exception as e2:
                        print(f"   ❌ Все методы трансформации не сработали: {e2}")
                        raise
            
            # Проверить новые размеры
            bbox_new = new_shape.BoundBox
            z_length_new = bbox_new.ZLength
            
            print(f"   Проверка новой формы: {bbox_new.ZLength:.2f} мм (ожидалось: {z_length_original * scale_factor:.2f} мм)")
            
            # Установить новую форму
            # Пробуем напрямую
            try:
                obj.Shape = new_shape
                print(f"   ✅ Shape установлен напрямую")
            except Exception as e:
                print(f"   ⚠️  Не удалось установить Shape напрямую: {e}")
                # Создаём новый объект с масштабированной формой
                print(f"   🔄 Создаю новый объект с масштабированной формой...")
                new_obj = doc.addObject("Part::Feature", f"{obj.Name}_scaled")
                new_obj.Shape = new_shape
                new_obj.Placement = original_placement
                new_obj.Label = f"{obj.Label} (scaled)"
                
                # Копируем визуальные свойства
                if hasattr(obj, 'ViewObject') and hasattr(new_obj, 'ViewObject'):
                    try:
                        new_obj.ViewObject.ShapeColor = obj.ViewObject.ShapeColor
                        new_obj.ViewObject.Transparency = obj.ViewObject.Transparency
                        new_obj.ViewObject.Visibility = obj.ViewObject.Visibility
                    except:
                        pass
                
                print(f"   ✅ Создан новый объект: {new_obj.Name}")
                print(f"   ⚠️  Оригинальный объект не изменён, создан новый объект")
                doc.recompute()
                
                # Проверяем новый объект
                bbox_new_obj = new_obj.Shape.BoundBox
                print(f"   Новый объект: {bbox_new_obj.XLength:.1f} × {bbox_new_obj.YLength:.1f} × {bbox_new_obj.ZLength:.2f} мм")
                continue
            
            # Placement должен остаться таким же (нижняя точка уже на месте благодаря трансформации)
            # Но проверим, что Z_min остался на месте
            if abs(bbox_new.ZMin - z_min_original) > 0.01:
                # Если нижняя точка сдвинулась, скорректируем Placement
                z_correction = z_min_original - bbox_new.ZMin
                new_placement = original_placement.copy()
                new_placement.Base.z = original_base.z + z_correction
                obj.Placement = new_placement
            else:
                # Placement остаётся без изменений
                obj.Placement = original_placement
            
            # Пересчитать для получения финальных размеров
            doc.recompute()
            
            # Проверить результат
            bbox_final = obj.Shape.BoundBox
            print(f"   После: {bbox_final.XLength:.1f} × {bbox_final.YLength:.1f} × {bbox_final.ZLength:.2f} мм")
            print(f"   Z: {bbox_final.ZMin:.2f} .. {bbox_final.ZMax:.2f} мм")
            print(f"   Изменение высоты: {z_length_original - bbox_final.ZLength:.2f} мм")
            print(f"   ✅ Готово")
            
        except Exception as e:
            print(f"   ❌ Ошибка при обработке {obj.Label}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*70}")
    print(f"✅ МАСШТАБИРОВАНИЕ ЗАВЕРШЕНО")
    print(f"{'='*70}")
    print(f"   Целевая высота: {to_height} мм")
    print(f"   Обработано объектов: {len(objects_to_scale)}")
    
    # Пересчитать документ
    doc.recompute()


def scale_cabinet_z_create_new(from_height=240, to_height=180, object_names=None, use_actual_height=False):
    """
    Уменьшить высоту шкафа, создавая НОВЫЕ объекты (если оригинальные нельзя редактировать)
    
    Args:
        from_height: текущая высота (мм) - по умолчанию 240
        to_height: целевая высота (мм) - по умолчанию 180
        object_names: список имён объектов для масштабирования
        use_actual_height: если True, использует реальную высоту объекта
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"\n{'='*70}")
    print(f"📐 МАСШТАБИРОВАНИЕ ШКАФА (СОЗДАНИЕ НОВЫХ ОБЪЕКТОВ)")
    print(f"{'='*70}")
    print(f"   Целевая высота: {to_height} мм")
    
    if not object_names:
        print("❌ Укажите имена объектов: scale_cabinet_z_create_new(object_names=['Part__Feature'])")
        return
    
    objects_to_scale = []
    for name in object_names:
        obj = doc.getObject(name)
        if obj and hasattr(obj, 'Shape') and not obj.Shape.isNull():
            objects_to_scale.append(obj)
        else:
            print(f"⚠️  Объект '{name}' не найден")
    
    if not objects_to_scale:
        print("❌ Не найдено объектов для масштабирования!")
        return
    
    print(f"\n🔧 Найдено объектов: {len(objects_to_scale)}")
    
    for obj in objects_to_scale:
        try:
            print(f"\n📦 Обработка: {obj.Label} ({obj.Name})")
            
            bbox = obj.Shape.BoundBox
            z_min_original = bbox.ZMin
            z_length_original = bbox.ZLength
            
            actual_from_height = z_length_original if use_actual_height else from_height
            scale_factor = to_height / actual_from_height
            
            print(f"   До: {bbox.XLength:.1f} × {bbox.YLength:.1f} × {z_length_original:.2f} мм")
            print(f"   Коэффициент: {scale_factor:.4f}")
            
            # Создаём масштабированную форму
            import Part
            import Mesh
            z_min = bbox.ZMin
            
            print(f"   Точка привязки (Z_min): {z_min:.2f} мм")
            print(f"   Масштабирование только по Z: {scale_factor:.4f}")
            
            # МЕТОД: Триангуляция + изменение Z координат вершин
            # Это гарантирует, что X и Y не изменятся
            original_shape = obj.Shape
            
            print(f"   🔄 Триангуляция формы...")
            # Триангулируем форму
            mesh_data = original_shape.tessellate(0.1)  # Точность 0.1 мм
            vertices = mesh_data[0]  # Список Vector объектов
            triangles = mesh_data[1]  # Список кортежей индексов
            
            print(f"   Вершин: {len(vertices)}, Треугольников: {len(triangles)}")
            
            # Трансформируем только Z координаты
            print(f"   🔄 Масштабирование Z координат...")
            transformed_vertices = []
            for v in vertices:
                # Масштабируем только Z относительно z_min
                new_z = z_min + (v.z - z_min) * scale_factor
                transformed_vertices.append(Vector(v.x, v.y, new_z))
            
            # Создаём новый mesh из трансформированных вершин
            print(f"   🔄 Создание нового mesh...")
            new_mesh = Mesh.Mesh()
            for tri in triangles:
                # Каждый треугольник - это кортеж из 3 индексов
                v0 = transformed_vertices[tri[0]]
                v1 = transformed_vertices[tri[1]]
                v2 = transformed_vertices[tri[2]]
                new_mesh.addFacet(v0, v1, v2)
            
            # Конвертируем mesh обратно в Part Shape
            print(f"   🔄 Конвертация mesh в Part Shape...")
            new_shape = Part.Shape(new_mesh)
            
            # Проверяем результат
            bbox_final = new_shape.BoundBox
            x_diff = abs(bbox_final.XLength - bbox.XLength)
            y_diff = abs(bbox_final.YLength - bbox.YLength)
            z_diff = abs(bbox_final.ZLength - (z_length_original * scale_factor))
            z_min_diff = abs(bbox_final.ZMin - z_min)
            
            print(f"   ✅ Результат:")
            print(f"      X: {bbox_final.XLength:.2f} мм (оригинал: {bbox.XLength:.2f}, diff: {x_diff:.3f})")
            print(f"      Y: {bbox_final.YLength:.2f} мм (оригинал: {bbox.YLength:.2f}, diff: {y_diff:.3f})")
            print(f"      Z: {bbox_final.ZLength:.2f} мм (ожидалось: {z_length_original * scale_factor:.2f}, diff: {z_diff:.3f})")
            print(f"      Z_min: {bbox_final.ZMin:.2f} мм (оригинал: {z_min:.2f}, diff: {z_min_diff:.3f})")
            
            if x_diff > 1.0 or y_diff > 1.0:
                print(f"      ⚠️  ВНИМАНИЕ: X или Y изменились больше чем на 1 мм!")
                print(f"         Это может быть из-за триангуляции (округление)")
            else:
                print(f"      ✅ X и Y сохранены (разница < 1 мм)")
            
            if z_min_diff > 0.1:
                print(f"      ⚠️  ВНИМАНИЕ: Нижняя точка сдвинулась, корректирую...")
                # Корректируем позицию
                z_correction = z_min - bbox_final.ZMin
                correction_matrix = Matrix()
                correction_matrix.move(Vector(0, 0, z_correction))
                new_shape.transformShape(correction_matrix)
                print(f"      ✅ Нижняя точка скорректирована")
            
            # Создаём новый объект
            new_obj = doc.addObject("Part::Feature", f"{obj.Name}_scaled")
            new_obj.Shape = new_shape
            new_obj.Placement = obj.Placement.copy()
            new_obj.Label = f"{obj.Label} ({to_height}mm)"
            
            # Копируем визуальные свойства
            if hasattr(obj, 'ViewObject') and hasattr(new_obj, 'ViewObject'):
                try:
                    new_obj.ViewObject.ShapeColor = obj.ViewObject.ShapeColor
                    new_obj.ViewObject.Transparency = obj.ViewObject.Transparency
                    new_obj.ViewObject.Visibility = True
                except:
                    pass
            
            doc.recompute()
            
            bbox_new = new_obj.Shape.BoundBox
            print(f"   После: {bbox_new.XLength:.1f} × {bbox_new.YLength:.1f} × {bbox_new.ZLength:.2f} мм")
            print(f"   ✅ Создан новый объект: {new_obj.Name}")
            
        except Exception as e:
            print(f"   ❌ Ошибка: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n✅ МАСШТАБИРОВАНИЕ ЗАВЕРШЕНО")
    print(f"   Создано новых объектов: {len(objects_to_scale)}")


def list_objects():
    """Показать все объекты в документе с их размерами"""
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print("\n📦 Объекты в документе:")
    print(f"{'='*70}")
    
    for obj in doc.Objects:
        if hasattr(obj, 'Shape') and not obj.Shape.isNull():
            bbox = obj.Shape.BoundBox
            print(f"  Name: {obj.Name}")
            print(f"  Label: {obj.Label}")
            print(f"  Размеры: {bbox.XLength:.1f} × {bbox.YLength:.1f} × {bbox.ZLength:.1f} мм")
            print(f"  Позиция: ({bbox.XMin:.1f}, {bbox.YMin:.1f}, {bbox.ZMin:.1f})")
            print()


# Автоматический запуск при загрузке скрипта
if __name__ == "__main__" or True:
    print("✅ Скрипт загружен!")
    print("\n📖 Использование:")
    print("   1. Показать все объекты: list_objects()")
    print("\n   2. Масштабировать (изменить оригинальный объект):")
    print("      scale_cabinet_z_240_to_180(object_names=['Part__Feature'], use_actual_height=True)")
    print("\n   3. Масштабировать (создать НОВЫЙ объект) - РЕКОМЕНДУЕТСЯ:")
    print("      scale_cabinet_z_create_new(object_names=['Part__Feature'], use_actual_height=True)")
    print("\n   💡 Если объект нельзя редактировать, используйте вариант 3 (создаёт новый объект)")

