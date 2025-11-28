# -*- coding: utf-8 -*-
"""
RackCabinetResizer Structured Version

Улучшенная версия с поддержкой структурированных моделей FreeCAD.
Использует систему тегов и Assembly для гибкого управления геометрией.

КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
1. Система тегов для компонентов (scaleable, fixed, anchor, etc.)
2. Поддержка Assembly (группировка компонентов)
3. Сохранение позиций при масштабировании
4. Параметрическое управление размерами

СТРУКТУРА МОДЕЛИ:
- Assembly "Cabinet_Assembly" - главная сборка
  - Group "Vertical" - вертикальные элементы (масштабируются)
  - Group "Horizontal" - горизонтальные элементы (не масштабируются)
  - Group "Doors" - двери (масштабируются по высоте)
  - Group "Fixed" - фиксированные детали (не масштабируются)
  - Group "Anchors" - якорные точки (для позиционирования)

ТЕГИ В ИМЕНАХ ОБЪЕКТОВ:
- [SCALE] - масштабируется при изменении размера
- [FIXED] - НЕ масштабируется, позиция НЕ меняется
- [FIXED_POS] - НЕ масштабируется, но позиция меняется пропорционально высоте
- [ANCHOR] - якорная точка (для позиционирования)
- [DOOR] - дверь (масштабируется только по высоте)
- [PANEL] - панель (масштабируется только по высоте)

Автор: Cabinet Configurator Team
Версия: 3.0 (Structured)
"""

import FreeCAD as App
import FreeCADGui as Gui
from PySide import QtGui, QtCore
import math


# Константы стандарта 19" rack
UNIT_HEIGHT_MM = 44.45  # Высота 1U в миллиметрах
RACK_WIDTH_MM = 482.6   # Стандартная ширина 19"

# Теги для классификации компонентов
TAG_SCALE = '[SCALE]'
TAG_FIXED = '[FIXED]'
TAG_FIXED_POS = '[FIXED_POS]'  # Фиксированный размер, но позиция меняется по высоте
TAG_ANCHOR = '[ANCHOR]'
TAG_DOOR = '[DOOR]'
TAG_PANEL = '[PANEL]'

# Имена групп Assembly
GROUP_VERTICAL = 'Vertical'
GROUP_HORIZONTAL = 'Horizontal'
GROUP_DOORS = 'Doors'
GROUP_PANELS = 'Panels'
GROUP_FIXED = 'Fixed'
GROUP_ANCHORS = 'Anchors'


class StructuredCabinetAnalyzer:
    """Анализатор структурированного шкафа"""
    
    def __init__(self, doc):
        self.doc = doc
        self.components = {
            'vertical': [],      # Вертикальные элементы (масштабируются)
            'horizontal': [],   # Горизонтальные (не масштабируются)
            'door': [],          # Двери (масштабируются по высоте)
            'panel': [],         # Панели (масштабируются по высоте)
            'fixed': [],         # Фиксированные (не масштабируются, позиция не меняется)
            'fixed_pos': [],     # Фиксированные с изменяемой позицией (замки, ригели и т.д.)
            'anchor': [],        # Якорные точки
            'unknown': []        # Неопознанные
        }
        self.assemblies = {}    # Словарь Assembly: имя -> список объектов
        self.current_units = 0
        self.total_height = 0.0
        self.anchor_points = {}  # Якорные точки для позиционирования
        
    def analyze(self):
        """Анализ структурированной модели"""
        print("\n" + "="*70)
        print("🔍 АНАЛИЗ СТРУКТУРИРОВАННОГО ШКАФА")
        print("="*70)
        
        # Шаг 1: Поиск Assembly
        self._find_assemblies()
        
        # Шаг 2: Анализ компонентов по группам
        self._analyze_by_groups()
        
        # Шаг 3: Анализ компонентов по тегам
        self._analyze_by_tags()
        
        # Шаг 4: Поиск якорных точек
        self._find_anchor_points()
        
        # Шаг 5: Определение текущего размера
        self._calculate_current_units()
        
        # Вывод результатов
        self._print_results()
        
        return self.current_units
    
    def _find_assemblies(self):
        """Поиск Assembly в документе"""
        print("\n📦 Поиск Assembly...")
        
        for obj in self.doc.Objects:
            # Проверяем App::Part или PartDesign::Body (Assembly)
            if obj.TypeId in ['App::Part', 'PartDesign::Body']:
                assembly_name = obj.Label
                self.assemblies[assembly_name] = []
                
                # Собираем дочерние объекты
                if hasattr(obj, 'Group'):
                    for child in obj.Group:
                        if hasattr(child, 'Shape'):
                            self.assemblies[assembly_name].append(child)
                
                print(f"   ✅ Найдена Assembly: {assembly_name} ({len(self.assemblies[assembly_name])} объектов)")
        
        # Если Assembly нет, работаем с корневыми объектами
        if not self.assemblies:
            print("   ⚠️ Assembly не найдены, работаем с корневыми объектами")
    
    def _analyze_by_groups(self):
        """Анализ компонентов по группам Assembly"""
        print("\n📂 Анализ по группам...")
        
        for assembly_name, objects in self.assemblies.items():
            for obj in objects:
                # Проверяем имя группы в Label
                label_lower = obj.Label.lower()
                
                if GROUP_VERTICAL.lower() in label_lower or 'vertical' in label_lower:
                    self._add_component(obj, 'vertical')
                elif GROUP_HORIZONTAL.lower() in label_lower or 'horizontal' in label_lower:
                    self._add_component(obj, 'horizontal')
                elif GROUP_DOORS.lower() in label_lower or 'door' in label_lower:
                    self._add_component(obj, 'door')
                elif GROUP_PANELS.lower() in label_lower or 'panel' in label_lower:
                    self._add_component(obj, 'panel')
                elif GROUP_FIXED.lower() in label_lower or 'fixed' in label_lower:
                    self._add_component(obj, 'fixed')
                elif GROUP_ANCHORS.lower() in label_lower or 'anchor' in label_lower:
                    self._add_component(obj, 'anchor')
    
    def _analyze_by_tags(self):
        """Анализ компонентов по тегам в именах"""
        print("\n🏷️  Анализ по тегам...")
        
        # Анализируем все объекты документа
        for obj in self.doc.Objects:
            if not hasattr(obj, 'Shape'):
                continue
            
            label = obj.Label
            label_upper = label.upper()
            
            # Проверяем теги (важно: проверяем FIXED_POS перед FIXED!)
            if TAG_SCALE in label_upper:
                self._add_component(obj, 'vertical')
                print(f"   ✅ {label}: тег [SCALE] → vertical")
            elif TAG_FIXED_POS in label_upper:
                self._add_component(obj, 'fixed_pos')
                print(f"   ✅ {label}: тег [FIXED_POS] → fixed_pos (позиция меняется)")
            elif TAG_FIXED in label_upper:
                self._add_component(obj, 'fixed')
                print(f"   ✅ {label}: тег [FIXED] → fixed")
            elif TAG_DOOR in label_upper:
                self._add_component(obj, 'door')
                print(f"   ✅ {label}: тег [DOOR] → door")
            elif TAG_PANEL in label_upper:
                self._add_component(obj, 'panel')
                print(f"   ✅ {label}: тег [PANEL] → panel")
            elif TAG_ANCHOR in label_upper:
                self._add_component(obj, 'anchor')
                print(f"   ✅ {label}: тег [ANCHOR] → anchor")
    
    def _find_anchor_points(self):
        """Поиск якорных точек для позиционирования"""
        print("\n⚓ Поиск якорных точек...")
        
        for item in self.components['anchor']:
            obj = item['object']
            bbox = item['bbox']
            
            # Центр якорной точки
            center = bbox.Center
            
            anchor_name = obj.Label
            self.anchor_points[anchor_name] = {
                'position': center,
                'bbox': bbox,
                'object': obj
            }
            
            print(f"   ⚓ {anchor_name}: ({center.x:.2f}, {center.y:.2f}, {center.z:.2f})")
    
    def _add_component(self, obj, comp_type):
        """Добавить компонент в категорию"""
        if not hasattr(obj, 'Shape'):
            return
        
        bbox = obj.Shape.BoundBox
        height = bbox.ZLength
        width = bbox.XLength
        depth = bbox.YLength
        
        # Проверяем, не добавлен ли уже
        existing = [c for c in self.components[comp_type] if c['object'].Name == obj.Name]
        if existing:
            return
        
        self.components[comp_type].append({
            'object': obj,
            'bbox': bbox,
            'height': height,
            'width': width,
            'depth': depth,
            'position': obj.Placement.Base if hasattr(obj, 'Placement') else App.Vector(0, 0, 0)
        })
    
    def _calculate_current_units(self):
        """Расчёт текущего количества юнитов"""
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
    
    def _print_results(self):
        """Вывод результатов анализа"""
        print("\n" + "="*70)
        print("📊 РЕЗУЛЬТАТЫ АНАЛИЗА:")
        print("="*70)
        
        for comp_type, items in self.components.items():
            if items:
                print(f"   {comp_type.upper()}: {len(items)} шт.")
        
        print(f"\n📏 Текущая высота: {self.total_height:.1f} мм")
        print(f"📐 Количество юнитов: {self.current_units}U")
        
        if self.anchor_points:
            print(f"\n⚓ Якорных точек: {len(self.anchor_points)}")
        
        print("="*70 + "\n")


class StructuredResizerDialog(QtGui.QDialog):
    """Диалог изменения размера структурированного шкафа"""
    
    def __init__(self, analyzer):
        super(StructuredResizerDialog, self).__init__()
        self.analyzer = analyzer
        self.target_units = analyzer.current_units
        self.init_ui()
        
    def init_ui(self):
        """Инициализация интерфейса"""
        self.setWindowTitle("Изменение высоты шкафа (Structured)")
        self.setMinimumWidth(600)
        
        layout = QtGui.QVBoxLayout()
        
        # === Информация ===
        info_group = QtGui.QGroupBox("📊 Текущая конфигурация")
        info_layout = QtGui.QFormLayout()
        
        info_layout.addRow("Количество юнитов:", QtGui.QLabel(f"<b>{self.analyzer.current_units}U</b>"))
        info_layout.addRow("Высота шкафа:", QtGui.QLabel(f"{self.analyzer.total_height:.2f} мм"))
        info_layout.addRow("Вертикальных элементов:", 
                          QtGui.QLabel(str(len(self.analyzer.components['vertical']))))
        info_layout.addRow("Фиксированных:", 
                          QtGui.QLabel(str(len(self.analyzer.components['fixed']))))
        info_layout.addRow("Якорных точек:", 
                          QtGui.QLabel(str(len(self.analyzer.anchor_points))))
        
        info_group.setLayout(info_layout)
        layout.addWidget(info_group)
        
        # === Настройки ===
        settings_group = QtGui.QGroupBox("🎯 Новая конфигурация")
        settings_layout = QtGui.QFormLayout()
        
        units_layout = QtGui.QHBoxLayout()
        self.units_slider = QtGui.QSlider(QtCore.Qt.Horizontal)
        self.units_slider.setRange(6, 47)
        self.units_slider.setValue(self.analyzer.current_units)
        self.units_slider.setTickPosition(QtGui.QSlider.TicksBelow)
        self.units_slider.setTickInterval(6)
        
        self.units_spinbox = QtGui.QSpinBox()
        self.units_spinbox.setRange(6, 47)
        self.units_spinbox.setValue(self.analyzer.current_units)
        self.units_spinbox.setSuffix(" U")
        
        self.units_slider.valueChanged.connect(self.units_spinbox.setValue)
        self.units_spinbox.valueChanged.connect(self.units_slider.setValue)
        self.units_slider.valueChanged.connect(self.update_preview)
        
        units_layout.addWidget(self.units_slider, 3)
        units_layout.addWidget(self.units_spinbox, 1)
        settings_layout.addRow("Количество юнитов:", units_layout)
        
        # Предпросмотр
        self.preview_height_label = QtGui.QLabel()
        self.preview_diff_label = QtGui.QLabel()
        self.update_preview()
        
        settings_layout.addRow("Новая высота:", self.preview_height_label)
        settings_layout.addRow("Изменение:", self.preview_diff_label)
        
        settings_group.setLayout(settings_layout)
        layout.addWidget(settings_group)
        
        # === Опции ===
        options_group = QtGui.QGroupBox("⚙️ Параметры")
        options_layout = QtGui.QVBoxLayout()
        
        self.preserve_positions_checkbox = QtGui.QCheckBox("Сохранять позиции компонентов (использовать якорные точки)")
        self.preserve_positions_checkbox.setChecked(True)
        
        self.scale_doors_checkbox = QtGui.QCheckBox("Масштабировать двери по высоте")
        self.scale_doors_checkbox.setChecked(True)
        
        self.scale_panels_checkbox = QtGui.QCheckBox("Масштабировать панели по высоте")
        self.scale_panels_checkbox.setChecked(True)
        
        self.create_copy_checkbox = QtGui.QCheckBox("Создать новый объект (сохранить оригинал)")
        self.create_copy_checkbox.setChecked(True)
        
        options_layout.addWidget(self.preserve_positions_checkbox)
        options_layout.addWidget(self.scale_doors_checkbox)
        options_layout.addWidget(self.scale_panels_checkbox)
        options_layout.addWidget(self.create_copy_checkbox)
        
        options_group.setLayout(options_layout)
        layout.addWidget(options_group)
        
        # === Кнопки ===
        button_layout = QtGui.QHBoxLayout()
        
        apply_button = QtGui.QPushButton("✓ Применить")
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
        
        color = "green" if diff > 0 else "red" if diff < 0 else "gray"
        sign = "+" if diff > 0 else ""
        
        self.preview_diff_label.setText(
            f"<span style='color:{color};'><b>{sign}{diff:.2f} мм ({sign}{diff_units}U)</b></span>"
        )
        
        self.target_units = new_units
    
    def get_parameters(self):
        """Получить параметры"""
        return {
            'target_units': self.target_units,
            'preserve_positions': self.preserve_positions_checkbox.isChecked(),
            'scale_doors': self.scale_doors_checkbox.isChecked(),
            'scale_panels': self.scale_panels_checkbox.isChecked(),
            'create_copy': self.create_copy_checkbox.isChecked()
        }


def resize_structured_cabinet(analyzer, target_units, preserve_positions=True, 
                              scale_doors=True, scale_panels=True, create_copy=True):
    """
    Изменение размера структурированного шкафа
    
    Args:
        analyzer: StructuredCabinetAnalyzer
        target_units: Целевое количество юнитов
        preserve_positions: Сохранять позиции компонентов
        scale_doors: Масштабировать двери
        scale_panels: Масштабировать панели
        create_copy: Создать копию
    """
    doc = analyzer.doc
    
    current_height = analyzer.total_height
    target_height = target_units * UNIT_HEIGHT_MM
    scale_factor = target_height / current_height
    
    print("\n" + "="*70)
    print("🔧 ИЗМЕНЕНИЕ РАЗМЕРА (STRUCTURED)")
    print("="*70)
    print(f"Было:  {analyzer.current_units}U ({current_height:.2f} мм)")
    print(f"Стало: {target_units}U ({target_height:.2f} мм)")
    print(f"Коэффициент: {scale_factor:.4f}")
    print("="*70)
    
    # Сохраняем исходные позиции для фиксированных компонентов
    original_positions = {}
    if preserve_positions:
        for comp_type in ['fixed', 'horizontal']:
            for item in analyzer.components[comp_type]:
                obj = item['object']
                original_positions[obj.Name] = {
                    'position': obj.Placement.Base if hasattr(obj, 'Placement') else App.Vector(0, 0, 0),
                    'rotation': obj.Placement.Rotation if hasattr(obj, 'Placement') else App.Rotation()
                }
    
    # Масштабирование вертикальных элементов
    for item in analyzer.components['vertical']:
        obj = item['object']
        if not hasattr(obj, 'Shape'):
            continue
        
        scale_vector = App.Vector(1.0, 1.0, scale_factor)
        matrix = App.Matrix()
        matrix.scale(scale_vector)
        
        try:
            new_shape = obj.Shape.transformGeometry(matrix)
            
            if create_copy:
                new_name = f"{obj.Name}_{target_units}U"
                new_obj = doc.addObject("Part::Feature", new_name)
                new_obj.Shape = new_shape
                new_obj.Label = f"{obj.Label} {target_units}U"
                _copy_view_properties(obj, new_obj)
                if hasattr(obj, 'ViewObject'):
                    obj.ViewObject.Visibility = False
            else:
                obj.Shape = new_shape
            
            print(f"✅ vertical: {obj.Label}")
        except Exception as e:
            print(f"❌ {obj.Label}: {e}")
    
    # Масштабирование дверей (только по высоте)
    if scale_doors:
        for item in analyzer.components['door']:
            obj = item['object']
            if not hasattr(obj, 'Shape'):
                continue
            
            scale_vector = App.Vector(1.0, 1.0, scale_factor)
            matrix = App.Matrix()
            matrix.scale(scale_vector)
            
            try:
                new_shape = obj.Shape.transformGeometry(matrix)
                
                if create_copy:
                    new_name = f"{obj.Name}_{target_units}U"
                    new_obj = doc.addObject("Part::Feature", new_name)
                    new_obj.Shape = new_shape
                    new_obj.Label = f"{obj.Label} {target_units}U"
                    _copy_view_properties(obj, new_obj)
                    if hasattr(obj, 'ViewObject'):
                        obj.ViewObject.Visibility = False
                else:
                    obj.Shape = new_shape
                
                print(f"✅ door: {obj.Label}")
            except Exception as e:
                print(f"❌ {obj.Label}: {e}")
    
    # Масштабирование панелей (только по высоте)
    if scale_panels:
        for item in analyzer.components['panel']:
            obj = item['object']
            if not hasattr(obj, 'Shape'):
                continue
            
            scale_vector = App.Vector(1.0, 1.0, scale_factor)
            matrix = App.Matrix()
            matrix.scale(scale_vector)
            
            try:
                new_shape = obj.Shape.transformGeometry(matrix)
                
                if create_copy:
                    new_name = f"{obj.Name}_{target_units}U"
                    new_obj = doc.addObject("Part::Feature", new_name)
                    new_obj.Shape = new_shape
                    new_obj.Label = f"{obj.Label} {target_units}U"
                    _copy_view_properties(obj, new_obj)
                    if hasattr(obj, 'ViewObject'):
                        obj.ViewObject.Visibility = False
                else:
                    obj.Shape = new_shape
                
                print(f"✅ panel: {obj.Label}")
            except Exception as e:
                print(f"❌ {obj.Label}: {e}")
    
    # Компоненты с [FIXED_POS]: НЕ масштабируются, но позиция меняется пропорционально высоте
    if analyzer.components['fixed_pos']:
        print("\n📍 Коррекция позиций компонентов [FIXED_POS]...")
        
        # Базовая высота (нижняя точка шкафа) - обычно 0 или минимальная Z координата
        base_z = 0.0
        if analyzer.components['vertical']:
            # Находим минимальную Z координату вертикальных элементов
            base_z = min(item['bbox'].ZMin for item in analyzer.components['vertical'])
        
        for item in analyzer.components['fixed_pos']:
            obj = item['object']
            original_pos = item['position']
            
            # Вычисляем относительную позицию по Z (относительно базовой высоты)
            relative_z = original_pos.z - base_z
            
            # Новая позиция Z пропорциональна высоте
            new_z = base_z + (relative_z * scale_factor)
            
            # Новая позиция (X и Y остаются без изменений)
            new_position = App.Vector(original_pos.x, original_pos.y, new_z)
            
            try:
                if hasattr(obj, 'Placement'):
                    # Сохраняем вращение
                    rotation = obj.Placement.Rotation
                    obj.Placement = App.Placement(new_position, rotation)
                    print(f"   ✅ {obj.Label}: Z {original_pos.z:.2f} → {new_z:.2f} мм")
                else:
                    print(f"   ⚠️ {obj.Label}: нет Placement, пропущен")
            except Exception as e:
                print(f"   ❌ {obj.Label}: ошибка позиционирования - {e}")
    
    # Фиксированные компоненты [FIXED]: НЕ масштабируются и позиция НЕ меняется
    # (они уже обработаны выше, позиции сохранены)
    
    # Если есть якорные точки, используем их для дополнительной коррекции позиций
    if preserve_positions and analyzer.anchor_points:
        print("\n⚓ Коррекция позиций по якорным точкам...")
        # TODO: Реализовать коррекцию позиций на основе якорных точек
    
    doc.recompute()
    print("\n✅ Изменение размера завершено!")
    print("="*70 + "\n")


def _copy_view_properties(source_obj, target_obj):
    """Копирование визуальных свойств"""
    if not (hasattr(source_obj, 'ViewObject') and hasattr(target_obj, 'ViewObject')):
        return
    
    try:
        source_vo = source_obj.ViewObject
        target_vo = target_obj.ViewObject
        
        if hasattr(source_vo, 'ShapeColor'):
            target_vo.ShapeColor = source_vo.ShapeColor
        if hasattr(source_vo, 'Transparency'):
            target_vo.Transparency = source_vo.Transparency
        if hasattr(source_vo, 'LineWidth'):
            target_vo.LineWidth = source_vo.LineWidth
    except Exception as e:
        print(f"⚠️ Не удалось скопировать свойства: {e}")


def main():
    """Главная функция"""
    if not App.ActiveDocument:
        QtGui.QMessageBox.critical(None, "Ошибка", "Нет открытого документа!")
        return
    
    doc = App.ActiveDocument
    
    # Анализ
    analyzer = StructuredCabinetAnalyzer(doc)
    current_units = analyzer.analyze()
    
    if current_units == 0:
        QtGui.QMessageBox.warning(
            None,
            "Ошибка анализа",
            "Не удалось определить количество юнитов.\n"
            "Убедитесь что модель структурирована правильно."
        )
        return
    
    # Диалог
    dialog = StructuredResizerDialog(analyzer)
    
    if dialog.exec_():
        params = dialog.get_parameters()
        
        try:
            resize_structured_cabinet(
                analyzer,
                params['target_units'],
                params['preserve_positions'],
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

