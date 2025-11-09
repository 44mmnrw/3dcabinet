# Настройка проекта 3Cabinet в Laragon

## Быстрый старт

### 1. Настройка виртуального хоста в Laragon

Laragon автоматически создаёт виртуальный хост для каждой папки в `c:\laragon\www\`.

Проект находится в: `c:\laragon\www\cabinet-calc`

#### Создание алиаса для удобного доступа:

1. Откройте файл настроек Laragon: `Menu > Apache > httpd-vhosts.conf`
2. Добавьте виртуальный хост:

```apache
<VirtualHost *:80>
    DocumentRoot "C:/laragon/www/cabinet-calc/public"
    ServerName 3dcabinet.test
    ServerAlias *.3dcabinet.test
    <Directory "C:/laragon/www/cabinet-calc/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

3. Добавьте запись в `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1    3dcabinet.test
```

4. Перезапустите Apache в Laragon

### 2. Проверка PHP

Убедитесь, что используется PHP 8.x:
```bash
php -v
```

Если PHP не доступен в PATH, используйте полный путь:
```powershell
& "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" -v
```

### 3. Создание базы данных

Laragon уже имеет MySQL. Создайте базу данных:

1. Откройте HeidiSQL (кнопка "Database" в Laragon)
2. Создайте новую базу: `3dcabinet`
3. Или через командную строку:

```bash
# Подключитесь к MySQL
mysql -u admin -p

# Создайте базу
CREATE DATABASE 3dcabinet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Запуск миграций

```powershell
cd c:\laragon\www\cabinet-calc

# Запустите миграции
& "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan migrate
```

### 5. Доступ к приложению

После настройки проект будет доступен по адресам:

- **http://3dcabinet.test** - Главная страница (Landing)
- **http://3dcabinet.test/app** - 3D Конфигуратор
- **http://3dcabinet.test/admin** - Админ панель

Или через встроенный сервер Laravel:

```powershell
cd c:\laragon\www\cabinet-calc
& "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan serve
```

Затем откройте: **http://localhost:8000**

## Создание алиаса для PHP Artisan

Для удобства работы создайте функцию в PowerShell:

1. Откройте профиль PowerShell:
```powershell
notepad $PROFILE
```

2. Добавьте функцию:
```powershell
function artisan {
    & "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan $args
}
```

3. Перезапустите PowerShell

Теперь можно использовать просто:
```powershell
artisan migrate
artisan serve
artisan make:controller MyController
```

## Полезные команды

### Очистка кеша
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Просмотр роутов
```bash
php artisan route:list
```

### Создание контроллера
```bash
php artisan make:controller NameController
```

### Создание модели с миграцией
```bash
php artisan make:model ModelName -m
```

### Откат миграций
```bash
php artisan migrate:rollback
```

### Пересоздание всех таблиц
```bash
php artisan migrate:fresh
```

## Структура проекта после переноса

```
c:\laragon\www\cabinet-calc\
├── public/           # Публичная директория (DocumentRoot)
│   ├── index.php    # Точка входа Laravel
│   ├── css/         # Стили из 3dcabinet
│   ├── js/          # JavaScript и Three.js
│   ├── fonts/       # Шрифты
│   ├── images/      # Изображения
│   └── assets/      # SVG спрайты и другие ресурсы
├── app/
│   └── Http/
│       └── Controllers/
│           ├── LandingController.php
│           ├── ConfiguratorController.php
│           └── AdminController.php
├── resources/
│   └── views/
│       ├── layouts/
│       ├── partials/
│       ├── landing/
│       ├── configurator/
│       └── admin/
├── routes/
│   └── web.php      # Роуты приложения
└── database/
    └── migrations/  # Миграции БД
```

## Отладка

### Проверка подключения к БД
```bash
php artisan tinker
> DB::connection()->getPdo();
```

### Просмотр логов
Логи находятся в: `c:\laragon\www\cabinet-calc\storage\logs\laravel.log`

### Включение debug режима
В файле `.env`:
```env
APP_DEBUG=true
APP_ENV=local
```

## Возможные проблемы

### Ошибка 500
1. Проверьте права на папки:
   - `storage/` должна быть доступна для записи
   - `bootstrap/cache/` должна быть доступна для записи

2. Очистите кеш:
```bash
php artisan cache:clear
php artisan config:clear
```

### CSS/JS не загружаются
1. Проверьте, что файлы скопированы в `public/`
2. Проверьте консоль браузера на ошибки 404
3. Убедитесь, что DocumentRoot указывает на `public/`

### Three.js не работает
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что файлы в `public/js/libs/` скопированы
3. Проверьте импорты в `app.js`

## Полезные ссылки

- [Laravel Documentation](https://laravel.com/docs)
- [Three.js Documentation](https://threejs.org/docs/)
- [Blade Templates](https://laravel.com/docs/blade)
- [Laravel Migrations](https://laravel.com/docs/migrations)
