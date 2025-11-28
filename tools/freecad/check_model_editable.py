# -*- coding: utf-8 -*-
"""
Скрипт для проверки возможности редактирования модели в FreeCAD

Проверяет, можно ли редактировать объекты, или они read-only/ссылки/заблокированы

Использование:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\check_model_editable.py', encoding='utf-8').read())
    check_editable()
"""

import FreeCAD as App
import FreeCADGui as Gui
from FreeCAD import Vector, Matrix


def check_editable(object_name=None):
    """
    Проверить, можно ли редактировать объект
    
    Args:
        object_name: имя объекта для проверки (если None - проверяет все объекты)
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    print(f"\n{'='*70}")
    print(f"🔍 ПРОВЕРКА ВОЗМОЖНОСТИ РЕДАКТИРОВАНИЯ")
    print(f"{'='*70}\n")
    
    objects_to_check = []
    
    if object_name:
        obj = doc.getObject(object_name)
        if obj:
            objects_to_check.append(obj)
        else:
            print(f"❌ Объект '{object_name}' не найден!")
            return
    else:
        objects_to_check = [obj for obj in doc.Objects if hasattr(obj, 'Shape')]
    
    if not objects_to_check:
        print("❌ Не найдено объектов для проверки!")
        return
    
    for obj in objects_to_check:
        print(f"📦 Объект: {obj.Name} ({obj.Label})")
        print(f"   Тип: {obj.TypeId}")
        
        # Проверка 1: Есть ли Shape
        has_shape = hasattr(obj, 'Shape')
        print(f"   ✅ Has Shape: {has_shape}")
        
        if not has_shape:
            print(f"   ❌ Объект не имеет геометрии!")
            continue
        
        # Проверка 2: Shape не NULL
        shape_is_null = obj.Shape.isNull()
        print(f"   ✅ Shape is NULL: {shape_is_null}")
        
        if shape_is_null:
            print(f"   ❌ Shape пустой!")
            continue
        
        # Проверка 3: Можно ли получить копию
        try:
            shape_copy = obj.Shape.copy()
            print(f"   ✅ Можно создать копию Shape")
        except Exception as e:
            print(f"   ❌ Нельзя создать копию Shape: {e}")
            continue
        
        # Проверка 4: Можно ли изменить Shape напрямую
        try:
            # Пробуем применить простую трансформацию
            test_matrix = Matrix()
            test_matrix.move(Vector(0, 0, 0.001))  # Минимальное смещение для теста
            
            test_shape = shape_copy.copy()
            test_shape.transformGeometry(test_matrix)
            print(f"   ✅ Можно применить transformGeometry")
        except Exception as e:
            print(f"   ❌ Нельзя применить transformGeometry: {e}")
            continue
        
        # Проверка 5: Можно ли установить новый Shape
        try:
            # Сохраняем оригинальный Shape
            original_shape = obj.Shape.copy()
            
            # Пробуем установить изменённый Shape
            obj.Shape = test_shape
            print(f"   ✅ Можно установить новый Shape")
            
            # Восстанавливаем оригинал
            obj.Shape = original_shape
            print(f"   ✅ Можно восстановить оригинальный Shape")
        except Exception as e:
            print(f"   ❌ Нельзя установить новый Shape: {e}")
            continue
        
        # Проверка 6: Placement
        try:
            original_placement = obj.Placement.copy()
            test_placement = original_placement.copy()
            test_placement.Base.z += 0.001
            
            obj.Placement = test_placement
            print(f"   ✅ Можно изменить Placement")
            
            # Восстанавливаем
            obj.Placement = original_placement
            print(f"   ✅ Можно восстановить Placement")
        except Exception as e:
            print(f"   ❌ Нельзя изменить Placement: {e}")
        
        # Проверка 7: Свойства объекта
        print(f"\n   📋 Свойства объекта:")
        print(f"      ReadOnly: {getattr(obj, 'ReadOnly', 'N/A')}")
        print(f"      Visibility: {getattr(obj, 'Visibility', 'N/A')}")
        
        # Проверка 8: Зависимости
        print(f"\n   🔗 Зависимости:")
        if hasattr(obj, 'InList'):
            in_list = obj.InList
            if in_list:
                print(f"      Зависит от: {[o.Name for o in in_list]}")
            else:
                print(f"      Нет зависимостей")
        
        if hasattr(obj, 'OutList'):
            out_list = obj.OutList
            if out_list:
                print(f"      Используется в: {[o.Name for o in out_list]}")
            else:
                print(f"      Не используется другими объектами")
        
        # Проверка 9: Документ
        print(f"\n   📄 Документ:")
        print(f"      Document: {obj.Document.Name}")
        print(f"      Document ReadOnly: {getattr(obj.Document, 'ReadOnly', False)}")
        
        print(f"\n   ✅ ВЫВОД: Объект {'МОЖНО' if has_shape and not shape_is_null else 'НЕЛЬЗЯ'} редактировать")
        print(f"{'='*70}\n")


def test_scale_simple(object_name):
    """
    Простой тест масштабирования с минимальными изменениями
    
    Args:
        object_name: имя объекта для теста
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    obj = doc.getObject(object_name)
    if not obj:
        print(f"❌ Объект '{object_name}' не найден!")
        return
    
    print(f"\n{'='*70}")
    print(f"🧪 ТЕСТ МАСШТАБИРОВАНИЯ")
    print(f"{'='*70}\n")
    
    try:
        # Получаем текущие размеры
        bbox = obj.Shape.BoundBox
        print(f"До масштабирования:")
        print(f"   Размеры: {bbox.XLength:.2f} × {bbox.YLength:.2f} × {bbox.ZLength:.2f} мм")
        print(f"   Z: {bbox.ZMin:.2f} .. {bbox.ZMax:.2f} мм")
        
        # Сохраняем оригинал
        original_shape = obj.Shape.copy()
        original_placement = obj.Placement.copy()
        
        # Пробуем минимальное масштабирование (0.99 = уменьшение на 1%)
        scale_factor = 0.99
        print(f"\n🔧 Применяю масштабирование {scale_factor} (уменьшение на 1%)...")
        
        # Масштабируем относительно нижней точки
        z_min = bbox.ZMin
        
        # Трансформация
        translation_to_origin = Matrix()
        translation_to_origin.move(Vector(0, 0, -z_min))
        
        scale_matrix = Matrix()
        scale_matrix.scale(1.0, 1.0, scale_factor)
        
        translation_back = Matrix()
        translation_back.move(Vector(0, 0, z_min))
        
        transform_matrix = translation_back * scale_matrix * translation_to_origin
        
        # Применяем
        new_shape = original_shape.copy()
        new_shape.transformGeometry(transform_matrix)
        
        # Устанавливаем новую форму
        obj.Shape = new_shape
        doc.recompute()
        
        # Проверяем результат
        bbox_new = obj.Shape.BoundBox
        print(f"\nПосле масштабирования:")
        print(f"   Размеры: {bbox_new.XLength:.2f} × {bbox_new.YLength:.2f} × {bbox_new.ZLength:.2f} мм")
        print(f"   Z: {bbox_new.ZMin:.2f} .. {bbox_new.ZMax:.2f} мм")
        
        if abs(bbox_new.ZLength - bbox.ZLength * scale_factor) < 0.1:
            print(f"\n   ✅ ТЕСТ УСПЕШЕН! Масштабирование работает")
            print(f"   Ожидаемая высота: {bbox.ZLength * scale_factor:.2f} мм")
            print(f"   Фактическая высота: {bbox_new.ZLength:.2f} мм")
            
            # Восстанавливаем оригинал
            print(f"\n   🔄 Восстанавливаю оригинал...")
            obj.Shape = original_shape
            obj.Placement = original_placement
            doc.recompute()
            print(f"   ✅ Оригинал восстановлен")
        else:
            print(f"\n   ❌ ТЕСТ НЕУДАЧЕН! Масштабирование не сработало")
            print(f"   Ожидаемая высота: {bbox.ZLength * scale_factor:.2f} мм")
            print(f"   Фактическая высота: {bbox_new.ZLength:.2f} мм")
            
            # Восстанавливаем оригинал
            print(f"\n   🔄 Восстанавливаю оригинал...")
            obj.Shape = original_shape
            obj.Placement = original_placement
            doc.recompute()
            print(f"   ✅ Оригинал восстановлен")
            
    except Exception as e:
        print(f"\n   ❌ ОШИБКА при тесте: {e}")
        import traceback
        traceback.print_exc()
        
        # Пытаемся восстановить оригинал
        try:
            obj.Shape = original_shape
            obj.Placement = original_placement
            doc.recompute()
            print(f"   ✅ Оригинал восстановлен после ошибки")
        except:
            print(f"   ⚠️  Не удалось восстановить оригинал")


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Скрипт проверки редактируемости загружен!")
    print("\n📖 Использование:")
    print("   1. Проверить все объекты: check_editable()")
    print("   2. Проверить конкретный объект: check_editable('Part__Feature')")
    print("   3. Тест масштабирования: test_scale_simple('Part__Feature')")

