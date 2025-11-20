# 📋 Чеклист для деплоя на production сервер

## ✅ Перед деплоем (локально)

### 1. Сборка проекта
```bash
# Windows (PowerShell)
.\build-production.ps1

# Linux/Mac
chmod +x build-production.sh
./build-production.sh

# Или вручную:
npm run build
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 2. Проверка файлов
- [ ] `.env` файл НЕ должен быть в репозитории (уже в .gitignore)
- [ ] `public/build/` собран (проверить наличие файлов)
- [ ] `public/assets/sprite/sprite.svg` собран (если используется)
- [ ] Все миграции применены локально и работают

### 3. Оптимизация
- [ ] Проверить размер `node_modules/` (не загружать на сервер)
- [ ] Проверить размер `vendor/` (не загружать на сервер, установить через composer)
- [ ] Убедиться что `storage/logs/` пуст или не загружается

---

## 🚀 На сервере

### 1. Подготовка окружения

#### Создать .env файл:
```env
APP_NAME="3Cabinet"
APP_ENV=production
APP_KEY=                    # Сгенерировать: php artisan key:generate
APP_DEBUG=false
APP_URL=https://ваш-домен.ru

APP_LOCALE=ru
APP_FALLBACK_LOCALE=en

LOG_CHANNEL=daily
LOG_LEVEL=error

# База данных
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=имя_базы
DB_USERNAME=пользователь
DB_PASSWORD="пароль"

# Сессии
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.ваш-домен.ru

# Кеш
CACHE_STORE=database
QUEUE_CONNECTION=database
```

#### Сгенерировать APP_KEY:
```bash
php artisan key:generate
```

### 2. Установка зависимостей

```bash
# PHP зависимости (без dev-пакетов)
composer install --no-dev --optimize-autoloader

# Если нужно пересобрать фронтенд на сервере:
npm ci
npm run build:icons
npm run build
```

### 3. База данных

```bash
# Применить миграции
php artisan migrate --force

# Если нужно заполнить тестовыми данными (только для теста!)
# php artisan db:seed --class=EquipmentSeeder
```

### 4. Права доступа

```bash
# Установить права на папки для записи
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Если не работает, попробовать:
chmod -R 777 storage
chmod -R 777 bootstrap/cache
```

### 5. Оптимизация Laravel

```bash
# Очистить старый кеш
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Создать новый кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. Настройка веб-сервера

#### Apache (.htaccess уже должен быть в public/)
```apache
# Document Root должен указывать на /public/
DocumentRoot /путь/к/проекту/public
```

#### Nginx
```nginx
server {
    listen 80;
    server_name ваш-домен.ru;
    root /путь/к/проекту/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### 7. SSL сертификат (HTTPS)

```bash
# Let's Encrypt (Certbot)
sudo certbot --nginx -d ваш-домен.ru

# Или через панель хостинга
```

---

## 🔒 Безопасность

- [ ] `APP_ENV=production` в `.env`
- [ ] `APP_DEBUG=false` в `.env`
- [ ] `.env` файл НЕ доступен через веб (вне `public/`)
- [ ] Document Root строго на `public/`
- [ ] HTTPS включен с валидным SSL
- [ ] `SESSION_SECURE_COOKIE=true` для HTTPS
- [ ] Права на `storage/` и `bootstrap/cache/` установлены
- [ ] Доступ к `.env`, `.git`, `composer.json` заблокирован

---

## 📦 Что загружать на сервер

### ✅ Загружать:
- `app/`
- `bootstrap/`
- `config/`
- `database/`
- `public/` (включая `public/build/`)
- `resources/`
- `routes/`
- `artisan`
- `composer.json`
- `composer.lock`
- `package.json` (если будете собирать на сервере)
- `.htaccess` (в `public/`)

### ❌ НЕ загружать:
- `.env` (создать на сервере!)
- `.env.example` (можно, но не обязательно)
- `node_modules/` (установить через `npm ci`)
- `vendor/` (установить через `composer install`)
- `storage/logs/*` (создастся автоматически)
- `storage/framework/cache/*` (создастся автоматически)
- `.git/`
- `tests/`
- `docs/` (опционально)

---

## 🧪 Проверка после деплоя

- [ ] Главная страница открывается
- [ ] 3D конфигуратор загружается
- [ ] Модели шкафов загружаются
- [ ] Оборудование можно добавлять
- [ ] Нет ошибок в консоли браузера
- [ ] Нет ошибок в логах Laravel (`storage/logs/laravel.log`)
- [ ] HTTPS работает
- [ ] Все статические файлы загружаются (CSS, JS, изображения)

---

## 🔄 Обновление проекта

```bash
# 1. Загрузить новые файлы (git pull или FTP)

# 2. Обновить зависимости
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# 3. Очистить кеш
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# 4. Применить миграции (если есть)
php artisan migrate --force

# 5. Создать новый кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 📞 Полезные команды

```bash
# Просмотр логов
tail -f storage/logs/laravel.log

# Очистка всех кешей
php artisan optimize:clear

# Проверка конфигурации
php artisan config:show

# Проверка роутов
php artisan route:list
```

---

## ⚠️ Частые проблемы

### Ошибка 500
- Проверить права на `storage/` и `bootstrap/cache/`
- Проверить логи: `storage/logs/laravel.log`
- Проверить `.env` файл

### Статические файлы не загружаются
- Проверить что `public/build/` существует и содержит файлы
- Проверить права на `public/`
- Проверить настройки веб-сервера

### Ошибки с базой данных
- Проверить настройки БД в `.env`
- Проверить что миграции применены: `php artisan migrate:status`

### Белый экран
- Включить `APP_DEBUG=true` временно для диагностики
- Проверить логи: `storage/logs/laravel.log`
- Проверить права на файлы

