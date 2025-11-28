# -*- coding: utf-8 -*-
"""
RackCabinetResizer.FCMacro

Макрос для изменения высоты телекоммуникационного шкафа в юнитах (U).
Автоматически анализирует модель 19" rack и масштабирует вертикальные компоненты.

Стандарт: 1U = 44.45 мм (1.75")
Поддерживаемые размеры: 6U - 47U

Автор: Cabinet Configurator Team
Версия: 2.0
"""

import FreeCAD as App
import FreeCADGui as Gui
import Part
from PySide import QtGui, QtCore
import math


# Константы стандарта 19" rack
UNIT_HEIGHT_MM = 44.45  # Высота 1U в миллиметрах
RACK_WIDTH_MM = 482.6   # Стандартная ширина 19" (может варьироваться)

# Категории компонентов по их роли в конструкции
COMPONENT_TYPES = {
    'vertical': ['rail', 'stoyка', 'профиль', 'стойка', 'угол'],  # Вертикальные элементы
    'horizontal': ['top', 'bottom', 'верх', 'низ', 'крыша', 'основание'],  # Горизонтальные
    'door': ['door', 'дверь', 'дверца'],  # Двери (масштабируются по высоте)
    'panel': ['panel', 'панель', 'стенка', 'боковина'],  # Боковые панели
    'fixed': ['hinge', 'петля', 'замок', 'ручка']  # Фиксированные детали
}


class RackCabinetAnalyzer:
    """Анализатор телекоммуникационного шкафа"""
    
    def __init__(self, doc):
        self.doc = doc
        self.components = {
            'vertical': [],    # Стойки, рейки
            'horizontal': [],  # Верх, низ
            'door': [],        # Двери
            'panel': [],       # Боковые панели
            'fixed': [],       # Неизменяемые детали
            'unknown': []      # Неопознанные
        }
        self.current_units = 0
        self.total_height = 0.0
        
    def analyze(self):
        """Анализ всех объектов документа"""
        print("\n" + "="*70)
        print("🔍 АНАЛИЗ ТЕЛЕКОММУНИКАЦИОННОГО ШКАФА")
        print("="*70)
        
        for obj in self.doc.Objects:
            if not hasattr(obj, 'Shape'):
                continue
                
            bbox = obj.Shape.BoundBox
            height = bbox.ZLength
            width = bbox.XLength
            depth = bbox.YLength
            
            # Классификация компонента
            component_type = self._classify_component(obj, bbox)
            self.components[component_type].append({
                'object': obj,
                'bbox': bbox,
                'height': height,
                'width': width,
                'depth': depth
            })
            
            print(f"\n📦 {obj.Label} ({obj.Name})")
            print(f"   Тип: {component_type.upper()}")
            print(f"   Размеры: {width:.1f} × {depth:.1f} × {height:.1f} мм")
        
        # Определение текущего количества юнитов
        self._calculate_current_units()
        
        print("\n" + "="*70)
        print("📊 РЕЗУЛЬТАТЫ АНАЛИЗА:")
        print("="*70)
        for comp_type, items in self.components.items():
            if items:
                print(f"   {comp_type.upper()}: {len(items)} шт.")
        print(f"\n📏 Текущая высота: {self.total_height:.1f} мм")
        print(f"📐 Количество юнитов: {self.current_units}U")
        print("="*70 + "\n")
        
        return self.current_units
    
    def _classify_component(self, obj, bbox):
        """Классификация компонента по типу"""
        name_lower = obj.Label.lower()
        
        # Проверка по ключевым словам в имени
        for comp_type, keywords in COMPONENT_TYPES.items():
            if any(keyword in name_lower for keyword in keywords):
                return comp_type
        
        # Классификация по пропорциям
        height = bbox.ZLength
        width = bbox.XLength
        depth = bbox.YLength
        
        # Вертикальные элементы: высота >> ширины/глубины
        if height > max(width, depth) * 3:
            return 'vertical'
        
        # Горизонтальные: ширина или глубина >> высоты
        if max(width, depth) > height * 3:
            return 'horizontal'
        
        # Панели: один размер значительно меньше двух других
        sizes = sorted([width, depth, height])
        if sizes[0] < sizes[1] * 0.3:  # Тонкая панель
            if height > width and height > depth:
                return 'panel'  # Боковая панель
        
        return 'unknown'
    
    def _calculate_current_units(self):
        """Расчёт текущего количества юнитов"""
        # Ищем максимальную высоту вертикальных элементов
        max_height = 0.0
        
        if self.components['vertical']:
            max_height = max(item['height'] for item in self.components['vertical'])
        elif self.components['panel']:
            max_height = max(item['height'] for item in self.components['panel'])
        elif self.components['door']:
            max_height = max(item['height'] for item in self.components['door'])
        
        self.total_height = max_height
        self.current_units = round(max_height / UNIT_HEIGHT_MM)
        
        return self.current_units


class RackResizerDialog(QtGui.QDialog):
    """Диалог изменения размера шкафа"""
    
    def __init__(self, analyzer):
        super(RackResizerDialog, self).__init__()
        self.analyzer = analyzer
        self.target_units = analyzer.current_units
        self.init_ui()
        
    def init_ui(self):
        """Инициализация интерфейса"""
        self.setWindowTitle("Изменение высоты телекоммуникационного шкафа")
        self.setMinimumWidth(500)
        
        layout = QtGui.QVBoxLayout()
        
        # === Информация о текущем шкафе ===
        info_group = QtGui.QGroupBox("📊 Текущая конфигурация")
        info_layout = QtGui.QFormLayout()
        
        current_units_label = QtGui.QLabel(f"<b>{self.analyzer.current_units}U</b>")
        current_height_label = QtGui.QLabel(f"{self.analyzer.total_height:.2f} мм")
        
        info_layout.addRow("Количество юнитов:", current_units_label)
        info_layout.addRow("Высота шкафа:", current_height_label)
        info_layout.addRow("Вертикальных элементов:", 
                          QtGui.QLabel(str(len(self.analyzer.components['vertical']))))
        info_layout.addRow("Панелей:", 
                          QtGui.QLabel(str(len(self.analyzer.components['panel']))))
        info_layout.addRow("Дверей:", 
                          QtGui.QLabel(str(len(self.analyzer.components['door']))))
        
        info_group.setLayout(info_layout)
        layout.addWidget(info_group)
        
        # === Настройки нового размера ===
        settings_group = QtGui.QGroupBox("🎯 Новая конфигурация")
        settings_layout = QtGui.QFormLayout()
        
        # Слайдер для выбора количества юнитов
        units_layout = QtGui.QHBoxLayout()
        
        self.units_slider = QtGui.QSlider(QtCore.Qt.Horizontal)
        self.units_slider.setRange(6, 47)  # От 6U до 47U
        self.units_slider.setValue(self.analyzer.current_units)
        self.units_slider.setTickPosition(QtGui.QSlider.TicksBelow)
        self.units_slider.setTickInterval(6)
        
        self.units_spinbox = QtGui.QSpinBox()
        self.units_spinbox.setRange(6, 47)
        self.units_spinbox.setValue(self.analyzer.current_units)
        self.units_spinbox.setSuffix(" U")
        
        # Синхронизация slider и spinbox
        self.units_slider.valueChanged.connect(self.units_spinbox.setValue)
        self.units_spinbox.valueChanged.connect(self.units_slider.setValue)
        self.units_slider.valueChanged.connect(self.update_preview)
        
        units_layout.addWidget(self.units_slider, 3)
        units_layout.addWidget(self.units_spinbox, 1)
        
        settings_layout.addRow("Количество юнитов:", units_layout)
        
        # Популярные конфигурации
        presets_layout = QtGui.QHBoxLayout()
        preset_buttons = [
            ("12U", 12), ("18U", 18), ("24U", 24), 
            ("32U", 32), ("42U", 42), ("47U", 47)
        ]
        
        for label, units in preset_buttons:
            btn = QtGui.QPushButton(label)
            # ✅ ИСПРАВЛЕНО: добавлен checked=False как значение по умолчанию
            btn.clicked.connect(lambda checked=False, u=units: self.units_spinbox.setValue(u))
            presets_layout.addWidget(btn)
        
        settings_layout.addRow("Быстрый выбор:", presets_layout)
        
        # Предпросмотр
        self.preview_height_label = QtGui.QLabel()
        self.preview_diff_label = QtGui.QLabel()
        self.update_preview()
        
        settings_layout.addRow("Новая высота:", self.preview_height_label)
        settings_layout.addRow("Изменение:", self.preview_diff_label)
        
        settings_group.setLayout(settings_layout)
        layout.addWidget(settings_group)
        
        # === Опции ===
        options_group = QtGui.QGroupBox("⚙️ Параметры изменения")
        options_layout = QtGui.QVBoxLayout()
        
        self.scale_doors_checkbox = QtGui.QCheckBox("Масштабировать двери по высоте")
        self.scale_doors_checkbox.setChecked(True)
        
        self.scale_panels_checkbox = QtGui.QCheckBox("Масштабировать боковые панели")
        self.scale_panels_checkbox.setChecked(True)
        
        self.create_copy_checkbox = QtGui.QCheckBox("Создать новый объект (сохранить оригинал)")
        self.create_copy_checkbox.setChecked(True)
        
        options_layout.addWidget(self.scale_doors_checkbox)
        options_layout.addWidget(self.scale_panels_checkbox)
        options_layout.addWidget(self.create_copy_checkbox)
        
        options_group.setLayout(options_layout)
        layout.addWidget(options_group)
        
        # === Кнопки ===
        button_layout = QtGui.QHBoxLayout()
        
        apply_button = QtGui.QPushButton("✓ Применить изменения")
        apply_button.clicked.connect(self.accept)
        apply_button.setDefault(True)
        apply_button.setStyleSheet("QPushButton { padding: 8px; font-weight: bold; }")
        
        cancel_button = QtGui.QPushButton("✗ Отмена")
        cancel_button.clicked.connect(self.reject)
        
        button_layout.addWidget(apply_button)
        button_layout.addWidget(cancel_button)
        
        layout.addLayout(button_layout)
        self.setLayout(layout)
    
    def update_preview(self):
        """Обновление предпросмотра"""
        new_units = self.units_spinbox.value()
        new_height = new_units * UNIT_HEIGHT_MM
        diff = new_height - self.analyzer.total_height
        diff_units = new_units - self.analyzer.current_units
        
        self.preview_height_label.setText(f"<b>{new_height:.2f} мм</b>")
        
        if diff > 0:
            color = "green"
            sign = "+"
        elif diff < 0:
            color = "red"
            sign = ""
        else:
            color = "gray"
            sign = ""
        
        self.preview_diff_label.setText(
            f"<span style='color:{color};'><b>{sign}{diff:.2f} мм ({sign}{diff_units}U)</b></span>"
        )
        
        self.target_units = new_units
    
    def get_parameters(self):
        """Получить параметры"""
        return {
            'target_units': self.target_units,
            'scale_doors': self.scale_doors_checkbox.isChecked(),
            'scale_panels': self.scale_panels_checkbox.isChecked(),
            'create_copy': self.create_copy_checkbox.isChecked()
        }


def resize_rack_cabinet(analyzer, target_units, scale_doors=True, scale_panels=True, create_copy=True):
    """
    Изменение размера шкафа
    
    Args:
        analyzer: RackCabinetAnalyzer с проанализированным шкафом
        target_units (int): Целевое количество юнитов
        scale_doors (bool): Масштабировать двери
        scale_panels (bool): Масштабировать панели
        create_copy (bool): Создать копию или изменить оригинал
    """
    doc = analyzer.doc
    
    current_height = analyzer.total_height
    target_height = target_units * UNIT_HEIGHT_MM
    scale_factor = target_height / current_height
    
    print("\n" + "="*70)
    print("🔧 ИЗМЕНЕНИЕ РАЗМЕРА ШКАФА")
    print("="*70)
    print(f"Было:  {analyzer.current_units}U ({current_height:.2f} мм)")
    print(f"Стало: {target_units}U ({target_height:.2f} мм)")
    print(f"Коэффициент: {scale_factor:.4f}")
    print("="*70)
    
    # Определяем какие компоненты масштабировать
    components_to_scale = ['vertical']  # Всегда масштабируем стойки
    
    if scale_doors:
        components_to_scale.append('door')
    if scale_panels:
        components_to_scale.append('panel')
    
    # Масштабирование
    for comp_type in components_to_scale:
        for item in analyzer.components[comp_type]:
            obj = item['object']
            
            # Проверяем что объект имеет Shape
            if not hasattr(obj, 'Shape'):
                print(f"⚠️ {obj.Label}: пропущен (нет Shape)")
                continue
            
            # Вектор масштабирования (только по оси Z)
            scale_vector = App.Vector(1.0, 1.0, scale_factor)
            
            # Матрица трансформации
            matrix = App.Matrix()
            matrix.scale(scale_vector)
            
            # Применяем
            try:
                new_shape = obj.Shape.transformGeometry(matrix)
            except Exception as e:
                print(f"❌ {obj.Label}: ошибка трансформации - {e}")
                continue
            
            if create_copy:
                new_name = f"{obj.Name}_{target_units}U"
                new_obj = doc.addObject("Part::Feature", new_name)
                new_obj.Shape = new_shape
                new_obj.Label = f"{obj.Label} {target_units}U"
                
                # Безопасное копирование визуальных свойств
                if hasattr(obj, 'ViewObject') and hasattr(new_obj, 'ViewObject'):
                    try:
                        # Копируем цвет (если доступен)
                        if hasattr(obj.ViewObject, 'ShapeColor'):
                            new_obj.ViewObject.ShapeColor = obj.ViewObject.ShapeColor
                        
                        # Копируем прозрачность
                        if hasattr(obj.ViewObject, 'Transparency'):
                            new_obj.ViewObject.Transparency = obj.ViewObject.Transparency
                        
                        # Копируем толщину линий
                        if hasattr(obj.ViewObject, 'LineWidth'):
                            new_obj.ViewObject.LineWidth = obj.ViewObject.LineWidth
                        
                        # Копируем режим отображения (с проверкой совместимости)
                        if hasattr(obj.ViewObject, 'DisplayMode') and hasattr(new_obj.ViewObject, 'DisplayMode'):
                            try:
                                # Проверяем что режим доступен в новом объекте
                                available_modes = new_obj.ViewObject.listDisplayModes() if hasattr(new_obj.ViewObject, 'listDisplayModes') else []
                                current_mode = obj.ViewObject.DisplayMode
                                
                                if not available_modes or current_mode in available_modes:
                                    new_obj.ViewObject.DisplayMode = current_mode
                            except (AttributeError, ValueError):
                                pass  # Режим не поддерживается, пропускаем
                            
                    except (AttributeError, TypeError) as e:
                        print(f"⚠️ {obj.Label}: не удалось скопировать визуальные свойства - {e}")
                
                # Скрываем оригинал
                if hasattr(obj, 'ViewObject'):
                    try:
                        obj.ViewObject.Visibility = False
                    except Exception:
                        pass
                
                print(f"✅ {comp_type}: {obj.Label} → {new_obj.Label}")
            else:
                obj.Shape = new_shape
                print(f"✅ {comp_type}: {obj.Label} изменён")
    
    doc.recompute()
    print("\n✅ Изменение размера завершено!")
    print("="*70 + "\n")


def main():
    """Главная функция"""
    
    if not App.ActiveDocument:
        QtGui.QMessageBox.critical(None, "Ошибка", "Нет открытого документа!")
        return
    
    doc = App.ActiveDocument
    
    # Анализ шкафа
    analyzer = RackCabinetAnalyzer(doc)
    current_units = analyzer.analyze()
    
    if current_units == 0:
        QtGui.QMessageBox.warning(
            None,
            "Ошибка анализа",
            "Не удалось определить количество юнитов.\n"
            "Убедитесь что открыта модель телекоммуникационного шкафа."
        )
        return
    
    # Открываем диалог
    dialog = RackResizerDialog(analyzer)
    
    if dialog.exec_():
        params = dialog.get_parameters()
        
        try:
            resize_rack_cabinet(
                analyzer,
                params['target_units'],
                params['scale_doors'],
                params['scale_panels'],
                params['create_copy']
            )
            
            QtGui.QMessageBox.information(
                None,
                "Успех",
                f"Шкаф успешно изменён!\n\n"
                f"Новый размер: {params['target_units']}U\n"
                f"Высота: {params['target_units'] * UNIT_HEIGHT_MM:.2f} мм"
            )
            
        except Exception as e:
            QtGui.QMessageBox.critical(
                None,
                "Ошибка",
                f"Произошла ошибка:\n\n{str(e)}"
            )
            print(f"❌ Ошибка: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()