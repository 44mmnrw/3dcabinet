# 3Cabinet - Laravel версия

Проект 3Cabinet успешно перенесён в Laravel framework.

## Структура проекта

```
cabinet-calc/
├── app/
│   └── Http/
│       └── Controllers/
│           ├── LandingController.php      # Главная страница
│           ├── ConfiguratorController.php # 3D конфигуратор
│           └── AdminController.php        # Админ панель
├── resources/
│   └── views/
│       ├── layouts/
│       │   └── app.blade.php             # Основной layout
│       ├── partials/
│       │   ├── header.blade.php          # Header
│       │   ├── footer.blade.php          # Footer
│       │   └── sprite.blade.php          # SVG спрайт
│       ├── landing/
│       │   └── index.blade.php           # Лендинг страница
│       ├── configurator/
│       │   └── index.blade.php           # 3D конфигуратор
│       └── admin/
│           └── index.blade.php           # Админ панель
├── public/
│   ├── css/                              # Стили из 3dcabinet
│   ├── js/                               # JavaScript и Three.js
│   ├── fonts/                            # Шрифты
│   ├── images/                           # Изображения
│   └── assets/                           # Дополнительные ресурсы
├── database/
│   └── migrations/
│       ├── *_create_projects_table.php
│       ├── *_create_equipment_table.php
│       └── *_create_cabinet_configurations_table.php
└── routes/
    └── web.php                           # Роуты приложения
```

## Установка и запуск

### 1. Установка зависимостей

```bash
composer install
```

### 2. Настройка окружения

Убедитесь, что файл `.env` настроен правильно:

```env
APP_NAME="3Cabinet"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=3dcabinet
DB_USERNAME=admin
DB_PASSWORD="4bq;=m=)"
```

### 3. Запуск миграций

```bash
php artisan migrate
```

### 4. Запуск сервера

```bash
php artisan serve
```

Приложение будет доступно по адресу: `http://localhost:8000`

## Роуты

- **`/`** - Главная страница (Landing)
- **`/app`** - 3D Конфигуратор
- **`/admin`** - Админ панель

## Функциональность

### Landing Page
- Форма выбора параметров шкафа
- Описание процесса конфигурирования
- Промо-баннер с интерфейсом
- Ключевые возможности системы

### 3D Конфигуратор
- Three.js визуализация шкафа
- Каталог оборудования
- Drag-and-drop размещение
- Автоматический расчёт параметров

### Админ панель
- Управление проектами
- Управление оборудованием
- Управление пользователями
- Настройки системы

## База данных

### Таблицы

#### `projects`
- `id` - ID проекта
- `name` - Название проекта
- `description` - Описание
- `user_id` - ID пользователя
- `configuration` - JSON конфигурации
- `total_price` - Общая стоимость
- `total_power` - Энергопотребление
- `total_weight` - Вес
- `status` - Статус (draft/completed/archived)

#### `equipment`
- `id` - ID оборудования
- `name` - Название
- `category` - Категория
- `manufacturer` - Производитель
- `model` - Модель
- `units` - Количество юнитов (U)
- `weight` - Вес (кг)
- `power` - Мощность (Вт)
- `heat` - Тепловыделение (BTU)
- `depth` - Глубина (мм)
- `price` - Цена

#### `cabinet_configurations`
- `id` - ID конфигурации
- `project_id` - ID проекта
- `width/height/depth` - Размеры шкафа
- `units` - Количество юнитов
- `max_weight` - Макс. вес
- `max_power` - Макс. мощность
- `installation` - Тип установки (floor/wall)
- `location` - Место (indoor/outdoor)
- `equipment_positions` - JSON позиций оборудования

## Технологии

- **Laravel 11** - PHP фреймворк
- **Three.js** - 3D визуализация
- **Blade** - Шаблонизатор
- **MySQL** - База данных

## Миграция из старой версии

Все файлы из проекта `3dcabinet` успешно перенесены:

✅ Контроллеры созданы  
✅ Роуты настроены  
✅ Views конвертированы в Blade  
✅ Статические ресурсы скопированы  
✅ Миграции базы данных созданы  
✅ Конфигурация базы настроена  

## Следующие шаги

1. **Запустить миграции** - создать таблицы в БД
2. **Заполнить данные** - добавить оборудование в каталог
3. **Доработать админ панель** - добавить CRUD операции
4. **Настроить аутентификацию** - добавить систему пользователей
5. **API endpoints** - создать REST API для работы с данными
6. **Оптимизация** - настроить кэширование и production режим

## Поддержка

При возникновении вопросов обращайтесь к документации Laravel:
https://laravel.com/docs
