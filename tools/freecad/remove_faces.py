# -*- coding: utf-8 -*-
"""
Скрипт для удаления граней из solid объекта в FreeCAD

Использование:
1. Выделите грани, которые нужно удалить (Face5, Face39 и т.д.)
2. Запустите скрипт в консоли Python FreeCAD:
   exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\remove_faces.py', encoding='utf-8').read())
   remove_selected_faces()
"""

import FreeCAD as App
import FreeCADGui as Gui
import Part


def remove_selected_faces():
    """
    Удаляет выделенные грани из solid объекта
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    # Получаем выделение с информацией о гранях
    selection = Gui.Selection.getSelectionEx()
    
    if not selection:
        print("❌ Ничего не выделено! Выделите грани для удаления.")
        return
    
    # Группируем грани по объектам
    faces_by_object = {}
    
    for sel in selection:
        obj = sel.Object
        obj_name = obj.Name
        
        if obj_name not in faces_by_object:
            faces_by_object[obj_name] = {
                'object': obj,
                'face_indices': []
            }
        
        # Получаем индексы выделенных граней
        if sel.SubElementNames:
            for sub_name in sel.SubElementNames:
                if sub_name.startswith('Face'):
                    # Извлекаем номер грани (например, "Face5" -> 5)
                    try:
                        face_num = int(sub_name.replace('Face', ''))
                        faces_by_object[obj_name]['face_indices'].append(face_num)
                    except ValueError:
                        print(f"⚠️  Не удалось распознать номер грани: {sub_name}")
    
    if not faces_by_object:
        print("❌ Не найдено граней для удаления!")
        return
    
    # Обрабатываем каждый объект
    for obj_name, data in faces_by_object.items():
        obj = data['object']
        face_indices = data['face_indices']
        
        if not hasattr(obj, 'Shape') or not obj.Shape.Solids:
            print(f"⚠️  Объект '{obj_name}' не является solid объектом, пропускаем")
            continue
        
        print(f"\n📐 Обработка объекта: {obj_name}")
        print(f"   Грани для удаления: {face_indices}")
        
        shape = obj.Shape
        
        # Получаем список всех граней
        all_faces = shape.Faces
        
        if not all_faces:
            print(f"   ⚠️  В объекте нет граней")
            continue
        
        print(f"   Всего граней в объекте: {len(all_faces)}")
        
        # Проверяем, что индексы валидны
        valid_indices = []
        for idx in face_indices:
            # В FreeCAD индексы начинаются с 1, но в Python списке с 0
            # Face5 = индекс 4 в списке
            if 1 <= idx <= len(all_faces):
                valid_indices.append(idx - 1)  # Конвертируем в 0-based индекс
            else:
                print(f"   ⚠️  Грань Face{idx} не существует (всего граней: {len(all_faces)})")
        
        if not valid_indices:
            print(f"   ❌ Нет валидных граней для удаления")
            continue
        
        # Создаем список граней для удаления
        faces_to_remove = [all_faces[i] for i in valid_indices]
        
        print(f"   Удаляем граней: {len(faces_to_remove)}")
        
        try:
            # Используем removeShape для удаления граней
            # Создаем список всех граней кроме удаляемых
            remaining_faces = [face for i, face in enumerate(all_faces) if i not in valid_indices]
            
            if not remaining_faces:
                print(f"   ❌ Нельзя удалить все грани из solid объекта")
                continue
            
            # Создаем новую форму без удаленных граней
            # Используем метод removeShape
            new_shape = shape.removeShape(faces_to_remove)
            
            # Альтернативный метод: создаем новую оболочку из оставшихся граней
            if new_shape.isNull() or len(new_shape.Solids) == 0:
                print(f"   ⚠️  Метод removeShape не сработал, пробуем альтернативный метод...")
                
                # Создаем оболочку из оставшихся граней
                try:
                    shell = Part.Shell(remaining_faces)
                    if shell.isClosed():
                        new_shape = Part.Solid(shell)
                    else:
                        print(f"   ⚠️  Оболочка не замкнута, используем только оболочку")
                        new_shape = shell
                except Exception as e:
                    print(f"   ❌ Ошибка при создании новой формы: {e}")
                    continue
            
            # Создаем новый объект с обновленной формой
            new_obj_name = f"{obj_name}_without_faces"
            new_obj = doc.addObject("Part::Feature", new_obj_name)
            new_obj.Shape = new_shape
            new_obj.Label = f"{obj.Label} (без граней {face_indices})"
            
            # Копируем placement
            if hasattr(obj, 'Placement'):
                new_obj.Placement = obj.Placement
            
            # Скрываем оригинальный объект
            try:
                obj.ViewObject.Visibility = False
            except:
                pass
            
            print(f"   ✅ Создан новый объект: {new_obj_name}")
            print(f"      Осталось граней: {len(new_shape.Faces) if hasattr(new_shape, 'Faces') else 'N/A'}")
            
        except Exception as e:
            print(f"   ❌ Ошибка при удалении граней: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Пересчитываем документ
    doc.recompute()
    print(f"\n✅ Готово!")


# Альтернативная функция для удаления граней по номерам напрямую
def remove_faces_by_numbers(obj_name, face_numbers):
    """
    Удаляет грани по номерам из указанного объекта
    
    Args:
        obj_name: имя объекта (например, 'Solid002')
        face_numbers: список номеров граней (например, [5, 39])
    """
    doc = App.ActiveDocument
    if not doc:
        print("❌ Нет активного документа!")
        return
    
    obj = doc.getObject(obj_name)
    if not obj:
        print(f"❌ Объект '{obj_name}' не найден!")
        return
    
    if not hasattr(obj, 'Shape') or not obj.Shape.Solids:
        print(f"❌ Объект '{obj_name}' не является solid объектом!")
        return
    
    shape = obj.Shape
    all_faces = shape.Faces
    
    # Конвертируем номера граней в индексы (Face5 = индекс 4)
    valid_indices = []
    for face_num in face_numbers:
        if 1 <= face_num <= len(all_faces):
            valid_indices.append(face_num - 1)
        else:
            print(f"⚠️  Грань Face{face_num} не существует (всего граней: {len(all_faces)})")
    
    if not valid_indices:
        print("❌ Нет валидных граней для удаления")
        return
    
    faces_to_remove = [all_faces[i] for i in valid_indices]
    remaining_faces = [face for i, face in enumerate(all_faces) if i not in valid_indices]
    
    try:
        # Пробуем removeShape
        new_shape = shape.removeShape(faces_to_remove)
        
        if new_shape.isNull() or len(new_shape.Solids) == 0:
            # Альтернативный метод
            shell = Part.Shell(remaining_faces)
            if shell.isClosed():
                new_shape = Part.Solid(shell)
            else:
                new_shape = shell
        
        new_obj_name = f"{obj_name}_cleaned"
        new_obj = doc.addObject("Part::Feature", new_obj_name)
        new_obj.Shape = new_shape
        new_obj.Label = f"{obj.Label} (без граней {face_numbers})"
        
        if hasattr(obj, 'Placement'):
            new_obj.Placement = obj.Placement
        
        try:
            obj.ViewObject.Visibility = False
        except:
            pass
        
        doc.recompute()
        print(f"✅ Создан объект {new_obj_name} без граней {face_numbers}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


# Автоматический запуск
if __name__ == "__main__" or True:
    print("✅ Скрипт загружен!")
    print("📖 Использование:")
    print("   1. Выделите грани в FreeCAD (Face5, Face39 и т.д.)")
    print("   2. Запустите: remove_selected_faces()")
    print("   Или для конкретного объекта:")
    print("      remove_faces_by_numbers('Solid002', [5, 39])")
    
    # Удаление Face216, Face217, Face218
    print("\n🔧 Удаление граней Face216, Face217, Face218...")
    remove_faces_by_numbers('Solid005', [216, 217, 218])

