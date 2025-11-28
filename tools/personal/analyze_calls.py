"""
Скрипт для анализа звонков и мобильного интернета из Excel файлов
Анализирует входящие/исходящие звонки, время разговоров, мобильный интернет
и создает дашборд в Excel
"""

import pandas as pd
import re
import statistics
from pathlib import Path
from datetime import datetime
from dateutil import parser
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Личные номера в разных форматах
PERSONAL_NUMBERS = [
    '79771058008',
    '79169802167',
    '79031112059',  # 7 903 111-20-59
    '79269547890',  # 7 926 954-78-90
    '79251561409',  # 7 925 156-14-09
    '79251409017',  # 7 925 140-90-17
]

# Нормализация номера (убираем все нецифровые символы, кроме первой 7 или 8)
def normalize_phone(phone):
    """Нормализует номер телефона к формату 7XXXXXXXXXX"""
    if pd.isna(phone):
        return None
    
    # Преобразуем в строку
    phone_str = str(phone)
    
    # Убираем все нецифровые символы
    digits = re.sub(r'\D', '', phone_str)
    
    # Если начинается с 8, заменяем на 7
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    
    # Если начинается с 7 и длина 11 цифр
    if digits.startswith('7') and len(digits) == 11:
        return digits
    
    # Если начинается с 7 и длина 10 цифр (без первой 7)
    if len(digits) == 10:
        return '7' + digits
    
    return digits if digits else None

def is_personal_number(phone):
    """Проверяет, является ли номер личным"""
    normalized = normalize_phone(phone)
    if not normalized:
        return False
    
    # Проверяем все варианты личных номеров
    for personal_num in PERSONAL_NUMBERS:
        if normalized == personal_num:
            return True
    
    return False

def parse_duration(duration_str):
    """Парсит длительность звонка в секунды"""
    if pd.isna(duration_str):
        return 0
    
    duration_str = str(duration_str).strip()
    
    # Формат ЧЧ:ММ:СС
    if ':' in duration_str:
        parts = duration_str.split(':')
        if len(parts) == 3:
            try:
                hours = int(parts[0])
                minutes = int(parts[1])
                seconds = int(parts[2])
                return hours * 3600 + minutes * 60 + seconds
            except:
                pass
    
    # Попытка как число (секунды)
    try:
        return int(float(duration_str))
    except:
        return 0

def format_duration(seconds):
    """Форматирует секунды в ЧЧ:ММ:СС"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def parse_data_volume(volume_str):
    """Парсит объем данных в гигабайты"""
    if pd.isna(volume_str):
        return 0.0
    
    volume_str = str(volume_str).strip().upper()
    
    # Убираем все кроме цифр, точки и единиц измерения
    match = re.search(r'([\d.]+)\s*(MB|GB|МБ|ГБ|KB|КБ)', volume_str)
    if match:
        value = float(match.group(1))
        unit = match.group(2).upper()
        
        if unit in ['GB', 'ГБ']:
            return value
        elif unit in ['MB', 'МБ']:
            return value / 1024
        elif unit in ['KB', 'КБ']:
            return value / (1024 * 1024)
    
    # Попытка как число (предполагаем МБ)
    try:
        value = float(volume_str)
        # Если число большое, считаем байтами, иначе МБ
        if value > 1000000:
            return value / (1024 * 1024 * 1024)  # байты в ГБ
        else:
            return value / 1024  # МБ в ГБ
    except:
        return 0.0

def parse_date_from_string(date_str):
    """Парсит дату из строки в формате '01 августа 2025'"""
    if pd.isna(date_str):
        return None
    
    date_str = str(date_str).strip()
    
    # Русские названия месяцев
    months_ru = {
        'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4,
        'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
        'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12
    }
    
    # Пробуем парсить через dateutil
    try:
        return parser.parse(date_str, dayfirst=True)
    except:
        pass
    
    # Пробуем ручной парсинг для русского формата
    for month_name, month_num in months_ru.items():
        if month_name in date_str.lower():
            match = re.search(r'(\d{1,2})\s+' + month_name + r'\s+(\d{4})', date_str.lower())
            if match:
                day = int(match.group(1))
                year = int(match.group(2))
                return datetime(year, month_num, day)
    
    return None

def analyze_excel_file(file_path):
    """Анализирует один Excel файл"""
    print(f"\n[Анализ] Анализ файла: {file_path}")
    
    try:
        # Читаем файл без заголовков
        df = pd.read_excel(file_path, header=None)
        print(f"   Всего строк: {len(df)}")
        
        # Ищем строку "История транзакций"
        start_row = None
        current_date = None
        
        for idx, row in df.iterrows():
            if pd.notna(row[0]) and 'История транзакций' in str(row[0]):
                start_row = idx + 1  # Начинаем со следующей строки
                # Пробуем найти дату в следующей строке
                if idx + 1 < len(df) and pd.notna(df.iloc[idx + 1, 0]):
                    current_date = parse_date_from_string(df.iloc[idx + 1, 0])
                break
        
        if start_row is None:
            print("   [ВНИМАНИЕ] Не найдена строка 'История транзакций', используем все данные")
            start_row = 0
        
        # Берем данные начиная с найденной строки
        df_data = df.iloc[start_row:].copy()
        df_data.columns = ['Время', 'Описание', 'Объем', 'Стоимость']
        
        # Добавляем колонку с датой
        df_data['Дата'] = None
        df_data['Месяц'] = None
        
        # Парсим даты и заполняем колонку Дата
        for idx, row in df_data.iterrows():
            # Если в колонке Время есть дата (не только время)
            time_val = row['Время']
            if pd.notna(time_val):
                time_str = str(time_val).strip()
                
                # Проверяем, это дата или только время
                is_date = False
                if len(time_str) > 10 or '—' in time_str or any(month in time_str.lower() for month in ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']):
                    # Это дата
                    parsed_date = parse_date_from_string(time_str)
                    if parsed_date:
                        current_date = parsed_date
                        df_data.at[idx, 'Дата'] = parsed_date
                        df_data.at[idx, 'Месяц'] = parsed_date.strftime('%Y-%m')
                        is_date = True
                
                # Если это время (формат ЧЧ:ММ) и есть текущая дата
                if not is_date and ':' in time_str and current_date:
                    try:
                        time_parts = time_str.split(':')
                        if len(time_parts) >= 2 and len(time_str) <= 8:  # Только время, не дата
                            hour = int(time_parts[0])
                            minute = int(time_parts[1])
                            full_date = datetime(current_date.year, current_date.month, current_date.day, hour, minute)
                            df_data.at[idx, 'Дата'] = full_date
                            df_data.at[idx, 'Месяц'] = full_date.strftime('%Y-%m')
                    except (ValueError, IndexError):
                        pass
        
        print(f"   Данных для анализа: {len(df_data)} строк")
        
        return df_data
        
    except Exception as e:
        print(f"   [ОШИБКА] Ошибка чтения файла: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame()

def is_excluded_date(call_date):
    """Проверяет, нужно ли исключить дату из анализа"""
    if pd.isna(call_date):
        return False
    
    try:
        # Преобразуем в datetime объект
        if isinstance(call_date, datetime):
            date_obj = call_date
        else:
            date_obj = pd.to_datetime(call_date)
        
        # Получаем только дату (без времени)
        date_only = date_obj.date()
        
        # Исключаемые периоды
        # Период с 28.08 по 09.09 (включая обе даты)
        exclude_start = datetime(date_obj.year, 8, 28).date()
        exclude_end = datetime(date_obj.year, 9, 9).date()
        
        # Конкретные даты для исключения
        exclude_dates = [
            datetime(date_obj.year, 10, 24).date(),
            datetime(date_obj.year, 11, 17).date()
        ]
        
        # Проверяем период
        if exclude_start <= date_only <= exclude_end:
            return True
        
        # Проверяем конкретные даты
        for excl_date in exclude_dates:
            if date_only == excl_date:
                return True
        
        return False
    except:
        return False

def is_weekend_date(call_date):
    """Проверяет, является ли дата выходным днем"""
    if pd.isna(call_date):
        return False
    
    try:
        # Преобразуем в datetime объект
        if isinstance(call_date, datetime):
            date_obj = call_date
        else:
            date_obj = pd.to_datetime(call_date)
        
        # Получаем только дату (без времени)
        date_only = date_obj.date()
        year = date_obj.year
        
        # Специальные исключения:
        # 01.11 - рабочий день (хотя это суббота)
        # 03.11 и 04.11 - выходные (хотя это понедельник и вторник)
        special_workday = datetime(year, 11, 1).date()
        special_weekends = [
            datetime(year, 11, 3).date(),
            datetime(year, 11, 4).date()
        ]
        
        # Проверяем специальные случаи
        if date_only == special_workday:
            return False  # 01.11 - рабочий день
        
        if date_only in special_weekends:
            return True  # 03.11 и 04.11 - выходные
        
        # Обычная логика: суббота (5) и воскресенье (6) - выходные
        weekday = date_obj.weekday()  # 0=понедельник, 6=воскресенье
        return weekday >= 5  # Суббота и воскресенье
        
    except:
        return False

def calculate_statistics(values):
    """Вычисляет статистику: максимум, минимум, среднее, медиана"""
    if not values or len(values) == 0:
        return {
            'max': 0,
            'min': 0,
            'mean': 0.0,
            'median': 0.0
        }
    
    values_list = [v for v in values if v > 0]  # Убираем нули
    if not values_list:
        return {
            'max': 0,
            'min': 0,
            'mean': 0.0,
            'median': 0.0
        }
    
    return {
        'max': max(values_list),
        'min': min(values_list),
        'mean': statistics.mean(values_list),
        'median': statistics.median(values_list)
    }

def analyze_calls(df):
    """Анализирует звонки с разбивкой по месяцам и статистикой"""
    print("\n[Звонки] Анализ звонков...")
    
    if df.empty or 'Описание' not in df.columns:
        print("   [ВНИМАНИЕ] Нет данных для анализа звонков")
        return {
            'incoming_count': 0,
            'outgoing_count': 0,
            'incoming_duration': 0,
            'outgoing_duration': 0,
            'personal_incoming_count': 0,
            'personal_outgoing_count': 0,
            'personal_incoming_duration': 0,
            'personal_outgoing_duration': 0,
            'by_month': {},
            'stats': {
                'count': {
                    'by_day': {},
                    'by_week': {},
                    'by_month': {}
                },
                'duration': {
                    'by_day': {},
                    'by_week': {},
                    'by_month': {}
                }
            }
        }
    
    incoming_count = 0
    outgoing_count = 0
    incoming_duration = 0
    outgoing_duration = 0
    personal_incoming_count = 0
    personal_outgoing_count = 0
    personal_incoming_duration = 0
    personal_outgoing_duration = 0
    
    # Данные по месяцам
    by_month = {}
    
    # Данные для статистики: по дням, неделям, месяцам
    # Исключаем личные номера из статистики
    calls_by_day_count = {}  # {date_str: count} - количество звонков в день
    calls_by_day_duration = {}  # {date_str: duration} - время звонков в день (секунды)
    calls_by_week_count = {}  # {week_str: count} - количество звонков в неделю
    calls_by_week_duration = {}  # {week_str: duration} - время звонков в неделю (секунды)
    calls_by_month_count = {}  # {month_str: count} - количество звонков в месяц
    calls_by_month_duration = {}  # {month_str: duration} - время звонков в месяц (секунды)
    
    for idx, row in df.iterrows():
        # Пропускаем пустые строки и строки с NaN в описании
        if pd.isna(row.get('Описание')):
            continue
        
        description = str(row['Описание']).lower()
        volume = row.get('Объем', '')
        
        # Определяем тип звонка
        is_incoming = 'входящий звонок' in description or 'входящ' in description
        is_outgoing = 'исходящий звонок' in description or 'исходящ' in description or 'совершен звонок' in description
        
        if not (is_incoming or is_outgoing):
            continue
        
        # Парсим длительность из колонки Объем
        duration = parse_duration(volume) if pd.notna(volume) else 0
        
        # Извлекаем номер из описания
        phone_match = re.search(r'\+?7[\s\-]?[\d\s\-]+', str(row.get('Описание', '')))
        phone = None
        if phone_match:
            phone = phone_match.group(0)
        
        # Проверяем личный номер - ИСКЛЮЧАЕМ ИЗ СТАТИСТИКИ
        is_personal = False
        if phone:
            is_personal = is_personal_number(phone)
        
        # Пропускаем личные звонки в статистике
        if is_personal:
            # Но все равно считаем их в общей статистике
            pass
        
        # Получаем дату и месяц
        call_date = row.get('Дата')
        month_key = row.get('Месяц', 'Unknown')
        if pd.isna(month_key):
            month_key = 'Unknown'
        else:
            month_key = str(month_key)
        
        # Проверяем, нужно ли исключить эту дату из анализа
        if is_excluded_date(call_date):
            # Пропускаем этот звонок из всех подсчетов
            continue
        
        # Определяем день и неделю для статистики
        day_key = None
        week_key = None
        if pd.notna(call_date) and isinstance(call_date, datetime):
            day_key = call_date.strftime('%Y-%m-%d')
            # Неделя: год и номер недели
            week_num = call_date.isocalendar()[1]
            week_key = f"{call_date.year}-W{week_num:02d}"
        elif pd.notna(call_date):
            try:
                call_date_obj = pd.to_datetime(call_date)
                day_key = call_date_obj.strftime('%Y-%m-%d')
                week_num = call_date_obj.isocalendar()[1]
                week_key = f"{call_date_obj.year}-W{week_num:02d}"
            except:
                pass
        
        # Инициализируем месяц, если его еще нет
        if month_key not in by_month:
            by_month[month_key] = {
                'incoming_count': 0,
                'outgoing_count': 0,
                'incoming_duration': 0,
                'outgoing_duration': 0,
                'personal_incoming_count': 0,
                'personal_outgoing_count': 0,
                'personal_incoming_duration': 0,
                'personal_outgoing_duration': 0,
            }
        
        # Подсчитываем для статистики ТОЛЬКО НЕЛИЧНЫЕ ЗВОНКИ
        # Исключаем выходные дни из статистики
        if not is_personal and not is_weekend_date(call_date):
            if day_key:
                if day_key not in calls_by_day_count:
                    calls_by_day_count[day_key] = 0
                    calls_by_day_duration[day_key] = 0
                calls_by_day_count[day_key] += 1
                calls_by_day_duration[day_key] += duration
            
            if week_key:
                if week_key not in calls_by_week_count:
                    calls_by_week_count[week_key] = 0
                    calls_by_week_duration[week_key] = 0
                calls_by_week_count[week_key] += 1
                calls_by_week_duration[week_key] += duration
            
            if month_key != 'Unknown':
                if month_key not in calls_by_month_count:
                    calls_by_month_count[month_key] = 0
                    calls_by_month_duration[month_key] = 0
                calls_by_month_count[month_key] += 1
                calls_by_month_duration[month_key] += duration
        
        if is_incoming:
            incoming_count += 1
            incoming_duration += duration
            by_month[month_key]['incoming_count'] += 1
            by_month[month_key]['incoming_duration'] += duration
            if is_personal:
                personal_incoming_count += 1
                personal_incoming_duration += duration
                by_month[month_key]['personal_incoming_count'] += 1
                by_month[month_key]['personal_incoming_duration'] += duration
        elif is_outgoing:
            outgoing_count += 1
            outgoing_duration += duration
            by_month[month_key]['outgoing_count'] += 1
            by_month[month_key]['outgoing_duration'] += duration
            if is_personal:
                personal_outgoing_count += 1
                personal_outgoing_duration += duration
                by_month[month_key]['personal_outgoing_count'] += 1
                by_month[month_key]['personal_outgoing_duration'] += duration
    
    # Вычисляем статистику по количеству и по времени отдельно
    day_count_values = list(calls_by_day_count.values()) if calls_by_day_count else []
    day_duration_values = list(calls_by_day_duration.values()) if calls_by_day_duration else []
    week_count_values = list(calls_by_week_count.values()) if calls_by_week_count else []
    week_duration_values = list(calls_by_week_duration.values()) if calls_by_week_duration else []
    month_count_values = list(calls_by_month_count.values()) if calls_by_month_count else []
    month_duration_values = list(calls_by_month_duration.values()) if calls_by_month_duration else []
    
    stats = {
        'count': {
            'by_day': calculate_statistics(day_count_values),
            'by_week': calculate_statistics(week_count_values),
            'by_month': calculate_statistics(month_count_values)
        },
        'duration': {
            'by_day': calculate_statistics(day_duration_values),
            'by_week': calculate_statistics(week_duration_values),
            'by_month': calculate_statistics(month_duration_values)
        }
    }
    
    print(f"   Найдено входящих: {incoming_count}, исходящих: {outgoing_count}")
    print(f"   Месяцев в данных: {len(by_month)}")
    print(f"   Дней с звонками (без личных): {len(calls_by_day_count)}, Недель: {len(calls_by_week_count)}")
    
    return {
        'incoming_count': incoming_count,
        'outgoing_count': outgoing_count,
        'incoming_duration': incoming_duration,
        'outgoing_duration': outgoing_duration,
        'personal_incoming_count': personal_incoming_count,
        'personal_outgoing_count': personal_outgoing_count,
        'personal_incoming_duration': personal_incoming_duration,
        'personal_outgoing_duration': personal_outgoing_duration,
        'by_month': by_month,
        'stats': stats,
    }

def analyze_internet(df):
    """Анализирует мобильный интернет с разбивкой по месяцам"""
    print("\n[Интернет] Анализ мобильного интернета...")
    
    if df.empty or 'Описание' not in df.columns:
        print("   [ВНИМАНИЕ] Нет данных для анализа интернета")
        return {
            'total_gb': 0.0,
            'personal_gb': 0.0,
            'by_month': {}
        }
    
    total_gb = 0.0
    personal_gb = 0.0
    by_month = {}
    
    for idx, row in df.iterrows():
        # Пропускаем пустые строки
        if pd.isna(row.get('Описание')):
            continue
        
        # Проверяем, нужно ли исключить эту дату из анализа
        call_date = row.get('Дата')
        if is_excluded_date(call_date):
            # Пропускаем этот интернет-трафик из всех подсчетов
            continue
        
        description = str(row['Описание']).lower()
        volume_str = row.get('Объем', '')
        
        # Проверяем, что это интернет
        is_internet = 'мобильный интернет' in description or 'интернет' in description
        
        if is_internet and pd.notna(volume_str):
            volume = parse_data_volume(str(volume_str))
            if volume > 0:
                total_gb += volume
                
                # Получаем месяц
                month_key = row.get('Месяц', 'Unknown')
                if pd.isna(month_key):
                    month_key = 'Unknown'
                else:
                    month_key = str(month_key)
                
                # Инициализируем месяц, если его еще нет
                if month_key not in by_month:
                    by_month[month_key] = {
                        'total_gb': 0.0,
                        'personal_gb': 0.0,
                    }
                
                by_month[month_key]['total_gb'] += volume
                
                # Проверяем личный номер в описании
                phone_match = re.search(r'\+?7[\s\-]?[\d\s\-]+', str(row.get('Описание', '')))
                is_personal = False
                if phone_match:
                    phone = phone_match.group(0)
                    is_personal = is_personal_number(phone)
                
                if is_personal:
                    personal_gb += volume
                    by_month[month_key]['personal_gb'] += volume
    
    print(f"   Найдено интернет-трафика: {total_gb:.2f} ГБ")
    
    return {
        'total_gb': total_gb,
        'personal_gb': personal_gb,
        'by_month': by_month,
    }

def create_dashboard_two_numbers(results1, results2, number1, number2, output_path):
    """Создает Excel дашборд с результатами для двух номеров"""
    print(f"\n[Дашборд] Создание дашборда: {output_path}")
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Дашборд"
    
    # Стили
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    title_font = Font(bold=True, size=14)
    number_header_fill = PatternFill(start_color="70AD47", end_color="70AD47", fill_type="solid")
    number_header_font = Font(bold=True, color="FFFFFF", size=11)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    row = 1
    
    # Заголовок
    ws.merge_cells(f'A{row}:E{row}')
    cell = ws[f'A{row}']
    cell.value = "АНАЛИЗ ЗВОНКОВ И МОБИЛЬНОГО ИНТЕРНЕТА"
    cell.font = title_font
    cell.alignment = Alignment(horizontal='center', vertical='center')
    row += 2
    
    def format_month_name(month_key):
        """Форматирует ключ месяца в читаемый формат"""
        if month_key == 'Unknown' or not month_key:
            return 'Неизвестно'
        try:
            # Формат YYYY-MM
            year, month = month_key.split('-')
            months_ru = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
            month_name = months_ru[int(month) - 1]
            return f"{month_name} {year}"
        except:
            return month_key
    
    def add_number_section(results, number, start_row):
        """Добавляет секцию для одного номера"""
        current_row = start_row
        
        # Заголовок номера
        ws.merge_cells(f'A{current_row}:E{current_row}')
        cell = ws[f'A{current_row}']
        cell.value = f"НОМЕР: {number}"
        cell.font = number_header_font
        cell.fill = number_header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border
        current_row += 1
        
        # Общая статистика
        ws[f'A{current_row}'] = "ОБЩАЯ СТАТИСТИКА"
        ws[f'A{current_row}'].font = header_font
        ws[f'A{current_row}'].fill = header_fill
        ws[f'A{current_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{current_row}'].fill = header_fill
            ws[f'{col}{current_row}'].border = border
        current_row += 1
        
        # Входящие звонки
        ws[f'A{current_row}'] = "Входящие звонки"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Количество"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = results.get('incoming_count', 0)
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = "Время"
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = format_duration(results.get('incoming_duration', 0))
        ws[f'E{current_row}'].border = border
        current_row += 1
        
        # Исходящие звонки
        ws[f'A{current_row}'] = "Исходящие звонки"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Количество"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = results.get('outgoing_count', 0)
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = "Время"
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = format_duration(results.get('outgoing_duration', 0))
        ws[f'E{current_row}'].border = border
        current_row += 2
        
        # Личные звонки
        ws[f'A{current_row}'] = "ЛИЧНЫЕ ЗВОНКИ"
        ws[f'A{current_row}'].font = header_font
        ws[f'A{current_row}'].fill = header_fill
        ws[f'A{current_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{current_row}'].fill = header_fill
            ws[f'{col}{current_row}'].border = border
        current_row += 1
        
        # Личные входящие
        ws[f'A{current_row}'] = "Входящие (личные)"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Количество"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = results.get('personal_incoming_count', 0)
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = "Время"
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = format_duration(results.get('personal_incoming_duration', 0))
        ws[f'E{current_row}'].border = border
        current_row += 1
        
        # Личные исходящие
        ws[f'A{current_row}'] = "Исходящие (личные)"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Количество"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = results.get('personal_outgoing_count', 0)
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = "Время"
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = format_duration(results.get('personal_outgoing_duration', 0))
        ws[f'E{current_row}'].border = border
        current_row += 2
        
        # Мобильный интернет
        ws[f'A{current_row}'] = "МОБИЛЬНЫЙ ИНТЕРНЕТ"
        ws[f'A{current_row}'].font = header_font
        ws[f'A{current_row}'].fill = header_fill
        ws[f'A{current_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{current_row}'].fill = header_fill
            ws[f'{col}{current_row}'].border = border
        current_row += 1
        
        # Общий интернет
        ws[f'A{current_row}'] = "Общий трафик"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Гигабайты"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = f"{results.get('total_gb', 0.0):.2f} ГБ"
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = ""
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = ""
        ws[f'E{current_row}'].border = border
        current_row += 1
        
        # Личный интернет
        ws[f'A{current_row}'] = "Трафик (личный)"
        ws[f'A{current_row}'].border = border
        ws[f'B{current_row}'] = "Гигабайты"
        ws[f'B{current_row}'].border = border
        ws[f'C{current_row}'] = f"{results.get('personal_gb', 0.0):.2f} ГБ"
        ws[f'C{current_row}'].border = border
        ws[f'D{current_row}'] = ""
        ws[f'D{current_row}'].border = border
        ws[f'E{current_row}'] = ""
        ws[f'E{current_row}'].border = border
        current_row += 2
        
        # Статистика по звонкам (исключая личные номера)
        stats = results.get('stats', {})
        if stats:
            # СТАТИСТИКА ПО КОЛИЧЕСТВУ ЗВОНКОВ
            count_stats = stats.get('count', {})
            if count_stats:
                # Заголовок статистики по количеству
                ws[f'A{current_row}'] = "СТАТИСТИКА ПО КОЛИЧЕСТВУ ЗВОНКОВ (без личных)"
                ws[f'A{current_row}'].font = header_font
                ws[f'A{current_row}'].fill = header_fill
                ws[f'A{current_row}'].border = border
                for col in ['B', 'C', 'D', 'E']:
                    ws[f'{col}{current_row}'].fill = header_fill
                    ws[f'{col}{current_row}'].border = border
                current_row += 1
                
                # Заголовки колонок
                ws[f'A{current_row}'] = "Период"
                ws[f'A{current_row}'].font = Font(bold=True)
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = "Максимум"
                ws[f'B{current_row}'].font = Font(bold=True)
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = "Минимум"
                ws[f'C{current_row}'].font = Font(bold=True)
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = "Среднее"
                ws[f'D{current_row}'].font = Font(bold=True)
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = "Медиана"
                ws[f'E{current_row}'].font = Font(bold=True)
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по дням
                day_stats = count_stats.get('by_day', {})
                ws[f'A{current_row}'] = "В день"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = day_stats.get('max', 0)
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = day_stats.get('min', 0)
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = f"{day_stats.get('mean', 0.0):.2f}"
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = f"{day_stats.get('median', 0.0):.2f}"
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по неделям
                week_stats = count_stats.get('by_week', {})
                ws[f'A{current_row}'] = "В неделю"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = week_stats.get('max', 0)
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = week_stats.get('min', 0)
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = f"{week_stats.get('mean', 0.0):.2f}"
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = f"{week_stats.get('median', 0.0):.2f}"
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по месяцам
                month_stats = count_stats.get('by_month', {})
                ws[f'A{current_row}'] = "В месяц"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = month_stats.get('max', 0)
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = month_stats.get('min', 0)
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = f"{month_stats.get('mean', 0.0):.2f}"
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = f"{month_stats.get('median', 0.0):.2f}"
                ws[f'E{current_row}'].border = border
                current_row += 2
            
            # СТАТИСТИКА ПО ВРЕМЕНИ ЗВОНКОВ
            duration_stats = stats.get('duration', {})
            if duration_stats:
                # Заголовок статистики по времени
                ws[f'A{current_row}'] = "СТАТИСТИКА ПО ВРЕМЕНИ ЗВОНКОВ (без личных)"
                ws[f'A{current_row}'].font = header_font
                ws[f'A{current_row}'].fill = header_fill
                ws[f'A{current_row}'].border = border
                for col in ['B', 'C', 'D', 'E']:
                    ws[f'{col}{current_row}'].fill = header_fill
                    ws[f'{col}{current_row}'].border = border
                current_row += 1
                
                # Заголовки колонок
                ws[f'A{current_row}'] = "Период"
                ws[f'A{current_row}'].font = Font(bold=True)
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = "Максимум"
                ws[f'B{current_row}'].font = Font(bold=True)
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = "Минимум"
                ws[f'C{current_row}'].font = Font(bold=True)
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = "Среднее"
                ws[f'D{current_row}'].font = Font(bold=True)
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = "Медиана"
                ws[f'E{current_row}'].font = Font(bold=True)
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по дням
                day_stats = duration_stats.get('by_day', {})
                ws[f'A{current_row}'] = "В день"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = format_duration(int(day_stats.get('max', 0)))
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = format_duration(int(day_stats.get('min', 0)))
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = format_duration(int(day_stats.get('mean', 0)))
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = format_duration(int(day_stats.get('median', 0)))
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по неделям
                week_stats = duration_stats.get('by_week', {})
                ws[f'A{current_row}'] = "В неделю"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = format_duration(int(week_stats.get('max', 0)))
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = format_duration(int(week_stats.get('min', 0)))
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = format_duration(int(week_stats.get('mean', 0)))
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = format_duration(int(week_stats.get('median', 0)))
                ws[f'E{current_row}'].border = border
                current_row += 1
                
                # Статистика по месяцам
                month_stats = duration_stats.get('by_month', {})
                ws[f'A{current_row}'] = "В месяц"
                ws[f'A{current_row}'].border = border
                ws[f'B{current_row}'] = format_duration(int(month_stats.get('max', 0)))
                ws[f'B{current_row}'].border = border
                ws[f'C{current_row}'] = format_duration(int(month_stats.get('min', 0)))
                ws[f'C{current_row}'].border = border
                ws[f'D{current_row}'] = format_duration(int(month_stats.get('mean', 0)))
                ws[f'D{current_row}'].border = border
                ws[f'E{current_row}'] = format_duration(int(month_stats.get('median', 0)))
                ws[f'E{current_row}'].border = border
                current_row += 2
        
        # Разбивка по месяцам
        by_month = results.get('by_month', {})
        
        if by_month:
            # Заголовок разбивки по месяцам
            ws[f'A{current_row}'] = "РАЗБИВКА ПО МЕСЯЦАМ"
            ws[f'A{current_row}'].font = header_font
            ws[f'A{current_row}'].fill = header_fill
            ws[f'A{current_row}'].border = border
            for col in ['B', 'C', 'D', 'E']:
                ws[f'{col}{current_row}'].fill = header_fill
                ws[f'{col}{current_row}'].border = border
            current_row += 1
            
            # Заголовки колонок
            ws[f'A{current_row}'] = "Месяц"
            ws[f'A{current_row}'].font = Font(bold=True)
            ws[f'A{current_row}'].border = border
            ws[f'B{current_row}'] = "Входящие"
            ws[f'B{current_row}'].font = Font(bold=True)
            ws[f'B{current_row}'].border = border
            ws[f'C{current_row}'] = "Исходящие"
            ws[f'C{current_row}'].font = Font(bold=True)
            ws[f'C{current_row}'].border = border
            ws[f'D{current_row}'] = "Интернет (ГБ)"
            ws[f'D{current_row}'].font = Font(bold=True)
            ws[f'D{current_row}'].border = border
            ws[f'E{current_row}'] = "Личные звонки"
            ws[f'E{current_row}'].font = Font(bold=True)
            ws[f'E{current_row}'].border = border
            current_row += 1
            
            # Сортируем месяцы
            sorted_months = sorted([m for m in by_month.keys() if m != 'Unknown'], reverse=True)
            if 'Unknown' in by_month:
                sorted_months.append('Unknown')
            
            for month_key in sorted_months:
                month_data = by_month.get(month_key, {})
                
                ws[f'A{current_row}'] = format_month_name(month_key)
                ws[f'A{current_row}'].border = border
                
                # Входящие
                incoming = month_data.get('incoming_count', 0)
                incoming_time = format_duration(month_data.get('incoming_duration', 0))
                ws[f'B{current_row}'] = f"{incoming} ({incoming_time})"
                ws[f'B{current_row}'].border = border
                
                # Исходящие
                outgoing = month_data.get('outgoing_count', 0)
                outgoing_time = format_duration(month_data.get('outgoing_duration', 0))
                ws[f'C{current_row}'] = f"{outgoing} ({outgoing_time})"
                ws[f'C{current_row}'].border = border
                
                # Интернет
                internet_gb = month_data.get('total_gb', 0.0)
                ws[f'D{current_row}'] = f"{internet_gb:.2f}"
                ws[f'D{current_row}'].border = border
                
                # Личные звонки
                personal_in = month_data.get('personal_incoming_count', 0)
                personal_out = month_data.get('personal_outgoing_count', 0)
                ws[f'E{current_row}'] = f"Вх: {personal_in}, Исх: {personal_out}"
                ws[f'E{current_row}'].border = border
                
                current_row += 1
            
            current_row += 1
        
        return current_row
    
    # Добавляем секции для обоих номеров
    if results1:
        row = add_number_section(results1, number1, row)
    
    if results2:
        row = add_number_section(results2, number2, row)
    
    # СВОДНАЯ ТАБЛИЦА ПО ДВУМ НОМЕРАМ
    row += 1
    summary_row = row
    
    # Заголовок сводной таблицы
    ws.merge_cells(f'A{summary_row}:E{summary_row}')
    cell = ws[f'A{summary_row}']
    cell.value = "СВОДНАЯ ТАБЛИЦА ПО ДВУМ НОМЕРАМ"
    cell.font = title_font
    cell.fill = PatternFill(start_color="C55A11", end_color="C55A11", fill_type="solid")
    cell.alignment = Alignment(horizontal='center', vertical='center')
    cell.border = border
    summary_row += 2
    
    # Общая статистика по звонкам
    ws[f'A{summary_row}'] = "ОБЩАЯ СТАТИСТИКА ПО ЗВОНКАМ"
    ws[f'A{summary_row}'].font = header_font
    ws[f'A{summary_row}'].fill = header_fill
    ws[f'A{summary_row}'].border = border
    for col in ['B', 'C', 'D', 'E']:
        ws[f'{col}{summary_row}'].fill = header_fill
        ws[f'{col}{summary_row}'].border = border
    summary_row += 1
    
    # Заголовки колонок
    ws[f'A{summary_row}'] = "Показатель"
    ws[f'A{summary_row}'].font = Font(bold=True)
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = number1
    ws[f'B{summary_row}'].font = Font(bold=True)
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = number2
    ws[f'C{summary_row}'].font = Font(bold=True)
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = "Итого"
    ws[f'D{summary_row}'].font = Font(bold=True)
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Входящие звонки
    inc1 = results1.get('incoming_count', 0) if results1 else 0
    inc2 = results2.get('incoming_count', 0) if results2 else 0
    inc_total = inc1 + inc2
    inc_dur1 = results1.get('incoming_duration', 0) if results1 else 0
    inc_dur2 = results2.get('incoming_duration', 0) if results2 else 0
    inc_dur_total = inc_dur1 + inc_dur2
    
    ws[f'A{summary_row}'] = "Входящие звонки"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{inc1} ({format_duration(inc_dur1)})"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{inc2} ({format_duration(inc_dur2)})"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{inc_total} ({format_duration(inc_dur_total)})"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Исходящие звонки
    out1 = results1.get('outgoing_count', 0) if results1 else 0
    out2 = results2.get('outgoing_count', 0) if results2 else 0
    out_total = out1 + out2
    out_dur1 = results1.get('outgoing_duration', 0) if results1 else 0
    out_dur2 = results2.get('outgoing_duration', 0) if results2 else 0
    out_dur_total = out_dur1 + out_dur2
    
    ws[f'A{summary_row}'] = "Исходящие звонки"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{out1} ({format_duration(out_dur1)})"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{out2} ({format_duration(out_dur2)})"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{out_total} ({format_duration(out_dur_total)})"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Личные входящие
    p_inc1 = results1.get('personal_incoming_count', 0) if results1 else 0
    p_inc2 = results2.get('personal_incoming_count', 0) if results2 else 0
    p_inc_total = p_inc1 + p_inc2
    p_inc_dur1 = results1.get('personal_incoming_duration', 0) if results1 else 0
    p_inc_dur2 = results2.get('personal_incoming_duration', 0) if results2 else 0
    p_inc_dur_total = p_inc_dur1 + p_inc_dur2
    
    ws[f'A{summary_row}'] = "Личные входящие"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{p_inc1} ({format_duration(p_inc_dur1)})"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{p_inc2} ({format_duration(p_inc_dur2)})"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{p_inc_total} ({format_duration(p_inc_dur_total)})"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Личные исходящие
    p_out1 = results1.get('personal_outgoing_count', 0) if results1 else 0
    p_out2 = results2.get('personal_outgoing_count', 0) if results2 else 0
    p_out_total = p_out1 + p_out2
    p_out_dur1 = results1.get('personal_outgoing_duration', 0) if results1 else 0
    p_out_dur2 = results2.get('personal_outgoing_duration', 0) if results2 else 0
    p_out_dur_total = p_out_dur1 + p_out_dur2
    
    ws[f'A{summary_row}'] = "Личные исходящие"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{p_out1} ({format_duration(p_out_dur1)})"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{p_out2} ({format_duration(p_out_dur2)})"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{p_out_total} ({format_duration(p_out_dur_total)})"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 2
    
    # Мобильный интернет
    ws[f'A{summary_row}'] = "МОБИЛЬНЫЙ ИНТЕРНЕТ"
    ws[f'A{summary_row}'].font = header_font
    ws[f'A{summary_row}'].fill = header_fill
    ws[f'A{summary_row}'].border = border
    for col in ['B', 'C', 'D', 'E']:
        ws[f'{col}{summary_row}'].fill = header_fill
        ws[f'{col}{summary_row}'].border = border
    summary_row += 1
    
    # Заголовки колонок
    ws[f'A{summary_row}'] = "Показатель"
    ws[f'A{summary_row}'].font = Font(bold=True)
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = number1
    ws[f'B{summary_row}'].font = Font(bold=True)
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = number2
    ws[f'C{summary_row}'].font = Font(bold=True)
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = "Итого"
    ws[f'D{summary_row}'].font = Font(bold=True)
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Общий трафик
    int1 = results1.get('total_gb', 0.0) if results1 else 0.0
    int2 = results2.get('total_gb', 0.0) if results2 else 0.0
    int_total = int1 + int2
    
    ws[f'A{summary_row}'] = "Общий трафик"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{int1:.2f} ГБ"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{int2:.2f} ГБ"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{int_total:.2f} ГБ"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 1
    
    # Личный трафик
    p_int1 = results1.get('personal_gb', 0.0) if results1 else 0.0
    p_int2 = results2.get('personal_gb', 0.0) if results2 else 0.0
    p_int_total = p_int1 + p_int2
    
    ws[f'A{summary_row}'] = "Личный трафик"
    ws[f'A{summary_row}'].border = border
    ws[f'B{summary_row}'] = f"{p_int1:.2f} ГБ"
    ws[f'B{summary_row}'].border = border
    ws[f'C{summary_row}'] = f"{p_int2:.2f} ГБ"
    ws[f'C{summary_row}'].border = border
    ws[f'D{summary_row}'] = f"{p_int_total:.2f} ГБ"
    ws[f'D{summary_row}'].border = border
    ws[f'E{summary_row}'] = ""
    ws[f'E{summary_row}'].border = border
    summary_row += 2
    
    # Сводная статистика по месяцам
    # Объединяем месяцы из обоих номеров
    all_months = set()
    months1 = results1.get('by_month', {}) if results1 else {}
    months2 = results2.get('by_month', {}) if results2 else {}
    all_months.update(months1.keys())
    all_months.update(months2.keys())
    
    if all_months:
        ws[f'A{summary_row}'] = "РАЗБИВКА ПО МЕСЯЦАМ (СВОДНАЯ)"
        ws[f'A{summary_row}'].font = header_font
        ws[f'A{summary_row}'].fill = header_fill
        ws[f'A{summary_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{summary_row}'].fill = header_fill
            ws[f'{col}{summary_row}'].border = border
        summary_row += 1
        
        # Заголовки колонок
        ws[f'A{summary_row}'] = "Месяц"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = number1
        ws[f'B{summary_row}'].font = Font(bold=True)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = number2
        ws[f'C{summary_row}'].font = Font(bold=True)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = "Итого"
        ws[f'D{summary_row}'].font = Font(bold=True)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Сортируем месяцы
        sorted_months = sorted([m for m in all_months if m != 'Unknown'], reverse=True)
        if 'Unknown' in all_months:
            sorted_months.append('Unknown')
        
        for month_key in sorted_months:
            month1 = months1.get(month_key, {})
            month2 = months2.get(month_key, {})
            
            ws[f'A{summary_row}'] = format_month_name(month_key)
            ws[f'A{summary_row}'].border = border
            
            # Входящие
            inc_m1 = month1.get('incoming_count', 0)
            inc_m2 = month2.get('incoming_count', 0)
            inc_m_total = inc_m1 + inc_m2
            ws[f'B{summary_row}'] = f"{inc_m1} вх"
            ws[f'B{summary_row}'].border = border
            ws[f'C{summary_row}'] = f"{inc_m2} вх"
            ws[f'C{summary_row}'].border = border
            ws[f'D{summary_row}'] = f"{inc_m_total} вх"
            ws[f'D{summary_row}'].border = border
            ws[f'E{summary_row}'] = ""
            ws[f'E{summary_row}'].border = border
            summary_row += 1
            
            # Исходящие
            out_m1 = month1.get('outgoing_count', 0)
            out_m2 = month2.get('outgoing_count', 0)
            out_m_total = out_m1 + out_m2
            ws[f'A{summary_row}'] = ""
            ws[f'A{summary_row}'].border = border
            ws[f'B{summary_row}'] = f"{out_m1} исх"
            ws[f'B{summary_row}'].border = border
            ws[f'C{summary_row}'] = f"{out_m2} исх"
            ws[f'C{summary_row}'].border = border
            ws[f'D{summary_row}'] = f"{out_m_total} исх"
            ws[f'D{summary_row}'].border = border
            ws[f'E{summary_row}'] = ""
            ws[f'E{summary_row}'].border = border
            summary_row += 1
            
            # Интернет
            int_m1 = month1.get('total_gb', 0.0)
            int_m2 = month2.get('total_gb', 0.0)
            int_m_total = int_m1 + int_m2
            ws[f'A{summary_row}'] = ""
            ws[f'A{summary_row}'].border = border
            ws[f'B{summary_row}'] = f"{int_m1:.2f} ГБ"
            ws[f'B{summary_row}'].border = border
            ws[f'C{summary_row}'] = f"{int_m2:.2f} ГБ"
            ws[f'C{summary_row}'].border = border
            ws[f'D{summary_row}'] = f"{int_m_total:.2f} ГБ"
            ws[f'D{summary_row}'].border = border
            ws[f'E{summary_row}'] = ""
            ws[f'E{summary_row}'].border = border
            summary_row += 1
    
    # СТАТИСТИКА ПО КОЛИЧЕСТВУ ЗВОНКОВ (без личных) - СВОДНАЯ
    stats1 = results1.get('stats', {}) if results1 else {}
    stats2 = results2.get('stats', {}) if results2 else {}
    count_stats1 = stats1.get('count', {}) if stats1 else {}
    count_stats2 = stats2.get('count', {}) if stats2 else {}
    
    if count_stats1 or count_stats2:
        summary_row += 1
        ws[f'A{summary_row}'] = "СТАТИСТИКА ПО КОЛИЧЕСТВУ ЗВОНКОВ (без личных) - СВОДНАЯ"
        ws[f'A{summary_row}'].font = header_font
        ws[f'A{summary_row}'].fill = header_fill
        ws[f'A{summary_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{summary_row}'].fill = header_fill
            ws[f'{col}{summary_row}'].border = border
        summary_row += 1
        
        # Заголовки колонок
        ws[f'A{summary_row}'] = "Период / Показатель"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = number1
        ws[f'B{summary_row}'].font = Font(bold=True)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = number2
        ws[f'C{summary_row}'].font = Font(bold=True)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = "Итого"
        ws[f'D{summary_row}'].font = Font(bold=True)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО ДНЯМ
        ws[f'A{summary_row}'] = "В день"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        day_stats1 = count_stats1.get('by_day', {})
        day_stats2 = count_stats2.get('by_day', {})
        
        # Максимум
        max_day1 = day_stats1.get('max', 0)
        max_day2 = day_stats2.get('max', 0)
        max_day_total = max(max_day1, max_day2) if (max_day1 or max_day2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = max_day1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = max_day2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = max_day_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_day1 = day_stats1.get('min', 0)
        min_day2 = day_stats2.get('min', 0)
        min_day_total = min(min_day1, min_day2) if (min_day1 and min_day2) else (min_day1 if min_day1 else min_day2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = min_day1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = min_day2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = min_day_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_day1 = day_stats1.get('mean', 0.0)
        mean_day2 = day_stats2.get('mean', 0.0)
        mean_day_total = (mean_day1 + mean_day2) / 2 if (mean_day1 and mean_day2) else (mean_day1 if mean_day1 else mean_day2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{mean_day1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{mean_day2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{mean_day_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_day1 = day_stats1.get('median', 0.0)
        median_day2 = day_stats2.get('median', 0.0)
        median_day_total = (median_day1 + median_day2) / 2 if (median_day1 and median_day2) else (median_day1 if median_day1 else median_day2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{median_day1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{median_day2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{median_day_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО НЕДЕЛЯМ
        summary_row += 1
        ws[f'A{summary_row}'] = "В неделю"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        week_stats1 = count_stats1.get('by_week', {})
        week_stats2 = count_stats2.get('by_week', {})
        
        # Максимум
        max_week1 = week_stats1.get('max', 0)
        max_week2 = week_stats2.get('max', 0)
        max_week_total = max(max_week1, max_week2) if (max_week1 or max_week2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = max_week1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = max_week2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = max_week_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_week1 = week_stats1.get('min', 0)
        min_week2 = week_stats2.get('min', 0)
        min_week_total = min(min_week1, min_week2) if (min_week1 and min_week2) else (min_week1 if min_week1 else min_week2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = min_week1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = min_week2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = min_week_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_week1 = week_stats1.get('mean', 0.0)
        mean_week2 = week_stats2.get('mean', 0.0)
        mean_week_total = (mean_week1 + mean_week2) / 2 if (mean_week1 and mean_week2) else (mean_week1 if mean_week1 else mean_week2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{mean_week1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{mean_week2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{mean_week_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_week1 = week_stats1.get('median', 0.0)
        median_week2 = week_stats2.get('median', 0.0)
        median_week_total = (median_week1 + median_week2) / 2 if (median_week1 and median_week2) else (median_week1 if median_week1 else median_week2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{median_week1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{median_week2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{median_week_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО МЕСЯЦАМ
        summary_row += 1
        ws[f'A{summary_row}'] = "В месяц"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        month_stats1 = count_stats1.get('by_month', {})
        month_stats2 = count_stats2.get('by_month', {})
        
        # Максимум
        max_month1 = month_stats1.get('max', 0)
        max_month2 = month_stats2.get('max', 0)
        max_month_total = max(max_month1, max_month2) if (max_month1 or max_month2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = max_month1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = max_month2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = max_month_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_month1 = month_stats1.get('min', 0)
        min_month2 = month_stats2.get('min', 0)
        min_month_total = min(min_month1, min_month2) if (min_month1 and min_month2) else (min_month1 if min_month1 else min_month2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = min_month1
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = min_month2
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = min_month_total
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_month1 = month_stats1.get('mean', 0.0)
        mean_month2 = month_stats2.get('mean', 0.0)
        mean_month_total = (mean_month1 + mean_month2) / 2 if (mean_month1 and mean_month2) else (mean_month1 if mean_month1 else mean_month2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{mean_month1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{mean_month2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{mean_month_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_month1 = month_stats1.get('median', 0.0)
        median_month2 = month_stats2.get('median', 0.0)
        median_month_total = (median_month1 + median_month2) / 2 if (median_month1 and median_month2) else (median_month1 if median_month1 else median_month2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = f"{median_month1:.2f}"
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = f"{median_month2:.2f}"
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = f"{median_month_total:.2f}"
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
    
    # СТАТИСТИКА ПО ВРЕМЕНИ ЗВОНКОВ (без личных) - СВОДНАЯ
    duration_stats1 = stats1.get('duration', {}) if stats1 else {}
    duration_stats2 = stats2.get('duration', {}) if stats2 else {}
    
    if duration_stats1 or duration_stats2:
        summary_row += 1
        ws[f'A{summary_row}'] = "СТАТИСТИКА ПО ВРЕМЕНИ ЗВОНКОВ (без личных) - СВОДНАЯ"
        ws[f'A{summary_row}'].font = header_font
        ws[f'A{summary_row}'].fill = header_fill
        ws[f'A{summary_row}'].border = border
        for col in ['B', 'C', 'D', 'E']:
            ws[f'{col}{summary_row}'].fill = header_fill
            ws[f'{col}{summary_row}'].border = border
        summary_row += 1
        
        # Заголовки колонок
        ws[f'A{summary_row}'] = "Период / Показатель"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = number1
        ws[f'B{summary_row}'].font = Font(bold=True)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = number2
        ws[f'C{summary_row}'].font = Font(bold=True)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = "Итого"
        ws[f'D{summary_row}'].font = Font(bold=True)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО ДНЯМ
        ws[f'A{summary_row}'] = "В день"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        day_dur_stats1 = duration_stats1.get('by_day', {})
        day_dur_stats2 = duration_stats2.get('by_day', {})
        
        # Максимум
        max_day_dur1 = int(day_dur_stats1.get('max', 0))
        max_day_dur2 = int(day_dur_stats2.get('max', 0))
        max_day_dur_total = max(max_day_dur1, max_day_dur2) if (max_day_dur1 or max_day_dur2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(max_day_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(max_day_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(max_day_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_day_dur1 = int(day_dur_stats1.get('min', 0))
        min_day_dur2 = int(day_dur_stats2.get('min', 0))
        min_day_dur_total = min(min_day_dur1, min_day_dur2) if (min_day_dur1 and min_day_dur2) else (min_day_dur1 if min_day_dur1 else min_day_dur2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(min_day_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(min_day_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(min_day_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_day_dur1 = day_dur_stats1.get('mean', 0.0)
        mean_day_dur2 = day_dur_stats2.get('mean', 0.0)
        mean_day_dur_total = (mean_day_dur1 + mean_day_dur2) / 2 if (mean_day_dur1 and mean_day_dur2) else (mean_day_dur1 if mean_day_dur1 else mean_day_dur2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(mean_day_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(mean_day_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(mean_day_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_day_dur1 = day_dur_stats1.get('median', 0.0)
        median_day_dur2 = day_dur_stats2.get('median', 0.0)
        median_day_dur_total = (median_day_dur1 + median_day_dur2) / 2 if (median_day_dur1 and median_day_dur2) else (median_day_dur1 if median_day_dur1 else median_day_dur2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(median_day_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(median_day_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(median_day_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО НЕДЕЛЯМ
        summary_row += 1
        ws[f'A{summary_row}'] = "В неделю"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        week_dur_stats1 = duration_stats1.get('by_week', {})
        week_dur_stats2 = duration_stats2.get('by_week', {})
        
        # Максимум
        max_week_dur1 = int(week_dur_stats1.get('max', 0))
        max_week_dur2 = int(week_dur_stats2.get('max', 0))
        max_week_dur_total = max(max_week_dur1, max_week_dur2) if (max_week_dur1 or max_week_dur2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(max_week_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(max_week_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(max_week_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_week_dur1 = int(week_dur_stats1.get('min', 0))
        min_week_dur2 = int(week_dur_stats2.get('min', 0))
        min_week_dur_total = min(min_week_dur1, min_week_dur2) if (min_week_dur1 and min_week_dur2) else (min_week_dur1 if min_week_dur1 else min_week_dur2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(min_week_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(min_week_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(min_week_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_week_dur1 = week_dur_stats1.get('mean', 0.0)
        mean_week_dur2 = week_dur_stats2.get('mean', 0.0)
        mean_week_dur_total = (mean_week_dur1 + mean_week_dur2) / 2 if (mean_week_dur1 and mean_week_dur2) else (mean_week_dur1 if mean_week_dur1 else mean_week_dur2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(mean_week_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(mean_week_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(mean_week_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_week_dur1 = week_dur_stats1.get('median', 0.0)
        median_week_dur2 = week_dur_stats2.get('median', 0.0)
        median_week_dur_total = (median_week_dur1 + median_week_dur2) / 2 if (median_week_dur1 and median_week_dur2) else (median_week_dur1 if median_week_dur1 else median_week_dur2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(median_week_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(median_week_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(median_week_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # ПО МЕСЯЦАМ
        summary_row += 1
        ws[f'A{summary_row}'] = "В месяц"
        ws[f'A{summary_row}'].font = Font(bold=True)
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = ""
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = ""
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = ""
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        month_dur_stats1 = duration_stats1.get('by_month', {})
        month_dur_stats2 = duration_stats2.get('by_month', {})
        
        # Максимум
        max_month_dur1 = int(month_dur_stats1.get('max', 0))
        max_month_dur2 = int(month_dur_stats2.get('max', 0))
        max_month_dur_total = max(max_month_dur1, max_month_dur2) if (max_month_dur1 or max_month_dur2) else 0
        ws[f'A{summary_row}'] = "  Максимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(max_month_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(max_month_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(max_month_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Минимум
        min_month_dur1 = int(month_dur_stats1.get('min', 0))
        min_month_dur2 = int(month_dur_stats2.get('min', 0))
        min_month_dur_total = min(min_month_dur1, min_month_dur2) if (min_month_dur1 and min_month_dur2) else (min_month_dur1 if min_month_dur1 else min_month_dur2)
        ws[f'A{summary_row}'] = "  Минимум"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(min_month_dur1)
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(min_month_dur2)
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(min_month_dur_total)
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Среднее
        mean_month_dur1 = month_dur_stats1.get('mean', 0.0)
        mean_month_dur2 = month_dur_stats2.get('mean', 0.0)
        mean_month_dur_total = (mean_month_dur1 + mean_month_dur2) / 2 if (mean_month_dur1 and mean_month_dur2) else (mean_month_dur1 if mean_month_dur1 else mean_month_dur2)
        ws[f'A{summary_row}'] = "  Среднее"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(mean_month_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(mean_month_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(mean_month_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
        
        # Медиана
        median_month_dur1 = month_dur_stats1.get('median', 0.0)
        median_month_dur2 = month_dur_stats2.get('median', 0.0)
        median_month_dur_total = (median_month_dur1 + median_month_dur2) / 2 if (median_month_dur1 and median_month_dur2) else (median_month_dur1 if median_month_dur1 else median_month_dur2)
        ws[f'A{summary_row}'] = "  Медиана"
        ws[f'A{summary_row}'].border = border
        ws[f'B{summary_row}'] = format_duration(int(median_month_dur1))
        ws[f'B{summary_row}'].border = border
        ws[f'C{summary_row}'] = format_duration(int(median_month_dur2))
        ws[f'C{summary_row}'].border = border
        ws[f'D{summary_row}'] = format_duration(int(median_month_dur_total))
        ws[f'D{summary_row}'].border = border
        ws[f'E{summary_row}'] = ""
        ws[f'E{summary_row}'].border = border
        summary_row += 1
    
    # Настройка ширины колонок
    ws.column_dimensions['A'].width = 25
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 15
    
    wb.save(output_path)
    print(f"   [OK] Дашборд сохранен: {output_path}")

def main():
    """Основная функция"""
    print("=" * 60)
    print("АНАЛИЗ ЗВОНКОВ И МОБИЛЬНОГО ИНТЕРНЕТА")
    print("=" * 60)
    
    # Пути к файлам
    base_dir = Path(__file__).parent
    file1 = base_dir / "926 30 4 0160.xlsx"
    file2 = base_dir / "985 862 60 00.xlsx"
    
    # Номера из имен файлов
    number1 = "926 30 4 0160"
    number2 = "985 862 60 00"
    
    # Проверяем наличие файлов
    if not file1.exists():
        print(f"[ОШИБКА] Файл не найден: {file1}")
        return
    
    if not file2.exists():
        print(f"[ОШИБКА] Файл не найден: {file2}")
        return
    
    # Анализируем каждый файл отдельно
    print(f"\n{'='*60}")
    print(f"НОМЕР: {number1}")
    print(f"{'='*60}")
    df1 = analyze_excel_file(file1)
    
    print(f"\n{'='*60}")
    print(f"НОМЕР: {number2}")
    print(f"{'='*60}")
    df2 = analyze_excel_file(file2)
    
    # Анализируем данные для каждого номера
    results1 = {}
    results2 = {}
    
    if not df1.empty:
        print(f"\n[Анализ] Анализ данных для {number1}...")
        call_results1 = analyze_calls(df1)
        internet_results1 = analyze_internet(df1)
        # Объединяем данные по месяцам
        calls_by_month1 = call_results1.get('by_month', {})
        internet_by_month1 = internet_results1.get('by_month', {})
        # Объединяем месяцы
        all_months1 = set(calls_by_month1.keys()) | set(internet_by_month1.keys())
        combined_by_month1 = {}
        for month in all_months1:
            combined_by_month1[month] = {
                **calls_by_month1.get(month, {}),
                **internet_by_month1.get(month, {})
            }
        results1 = {**call_results1, **internet_results1}
        results1['by_month'] = combined_by_month1
        results1['number'] = number1
    
    if not df2.empty:
        print(f"\n[Анализ] Анализ данных для {number2}...")
        call_results2 = analyze_calls(df2)
        internet_results2 = analyze_internet(df2)
        # Объединяем данные по месяцам
        calls_by_month2 = call_results2.get('by_month', {})
        internet_by_month2 = internet_results2.get('by_month', {})
        # Объединяем месяцы
        all_months2 = set(calls_by_month2.keys()) | set(internet_by_month2.keys())
        combined_by_month2 = {}
        for month in all_months2:
            combined_by_month2[month] = {
                **calls_by_month2.get(month, {}),
                **internet_by_month2.get(month, {})
            }
        results2 = {**call_results2, **internet_results2}
        results2['by_month'] = combined_by_month2
        results2['number'] = number2
    
    # Выводим результаты
    print("\n" + "=" * 60)
    print("\n" + "=" * 60)
    print("РЕЗУЛЬТАТЫ АНАЛИЗА")
    print("=" * 60)
    
    if results1:
        print(f"\nНОМЕР: {number1}")
        print(f"   Входящие: {results1['incoming_count']} звонков, {format_duration(results1['incoming_duration'])}")
        print(f"   Исходящие: {results1['outgoing_count']} звонков, {format_duration(results1['outgoing_duration'])}")
        print(f"   Личные входящие: {results1['personal_incoming_count']} звонков, {format_duration(results1['personal_incoming_duration'])}")
        print(f"   Личные исходящие: {results1['personal_outgoing_count']} звонков, {format_duration(results1['personal_outgoing_duration'])}")
        print(f"   Общий трафик: {results1['total_gb']:.2f} ГБ")
        print(f"   Личный трафик: {results1['personal_gb']:.2f} ГБ")
    
    if results2:
        print(f"\nНОМЕР: {number2}")
        print(f"   Входящие: {results2['incoming_count']} звонков, {format_duration(results2['incoming_duration'])}")
        print(f"   Исходящие: {results2['outgoing_count']} звонков, {format_duration(results2['outgoing_duration'])}")
        print(f"   Личные входящие: {results2['personal_incoming_count']} звонков, {format_duration(results2['personal_incoming_duration'])}")
        print(f"   Личные исходящие: {results2['personal_outgoing_count']} звонков, {format_duration(results2['personal_outgoing_duration'])}")
        print(f"   Общий трафик: {results2['total_gb']:.2f} ГБ")
        print(f"   Личный трафик: {results2['personal_gb']:.2f} ГБ")
    
    # Создаем дашборд для обоих номеров
    output_path = base_dir / f"Дашборд_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    create_dashboard_two_numbers(results1, results2, number1, number2, output_path)
    
    print("\n" + "=" * 60)
    print("\n" + "=" * 60)
    print("[OK] АНАЛИЗ ЗАВЕРШЕН")
    print("=" * 60)

if __name__ == "__main__":
    main()

