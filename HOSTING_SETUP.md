# 🌐 Настройка популярных хостингов для 3Cabinet

## Beget (Shared Hosting)

### 1. Загрузка файлов

**Через FTP**:
- Хост: `ваш-логин.beget.tech`
- Порт: 21
- Загрузить в: `/home/ваш-логин/ваш-домен.ru/public_html/`

**Через SSH** (если доступен):
```bash
ssh ваш-логин@ваш-логин.beget.tech
cd ~/ваш-домен.ru/public_html/
```

### 2. Настройка Document Root

**Вариант A: Изменить Document Root** (рекомендуется):
1. Зайти в панель Beget → "Сайты" → Ваш домен
2. В поле "Каталог" указать: `/public_html/3dcabinet/public`
3. Сохранить

**Вариант B: Символическая ссылка**:
```bash
# Загрузить проект в /home/ваш-логин/3dcabinet/
# Затем создать ссылку:
cd ~/ваш-домен.ru/public_html/
rm -rf *  # Удалить содержимое
ln -s ~/3dcabinet/public/* .
```

### 3. Создание БД

1. Панель Beget → "MySQL"
2. Создать базу данных (запомнить имя, логин, пароль)
3. В `.env`:
   ```env
   DB_HOST=localhost
   DB_DATABASE=ваш-логин_имя-базы
   DB_USERNAME=ваш-логин_имя-базы
   DB_PASSWORD="пароль"
   ```

### 4. Установка Composer

```bash
ssh ваш-логин@ваш-логин.beget.tech
cd ~/3dcabinet/
php composer.phar install --no-dev --optimize-autoloader
```

Если `composer.phar` нет, скачать:
```bash
curl -sS https://getcomposer.org/installer | php
```

### 5. Настройка .env и миграции

```bash
cd ~/3dcabinet/
cp .env.production.example .env
nano .env  # Редактировать (DB_*, APP_URL)

php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=EquipmentSeeder --force

chmod -R 775 storage bootstrap/cache

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## TimeWeb (Shared Hosting)

### 1. Загрузка файлов

**Через FTP**:
- Хост: `ваш-домен.ru`
- Порт: 21
- Папка: `/public_html/`

**Через SSH**:
```bash
ssh username@ваш-домен.ru
cd ~/public_html/
```

### 2. Настройка Document Root

TimeWeb позволяет изменить Document Root:
1. Панель управления → "Сайты" → Ваш домен
2. "Корневая директория": `/public_html/3dcabinet/public`
3. Сохранить

### 3. Создание БД

1. Панель → "Базы данных" → "MySQL"
2. Создать БД и пользователя
3. В `.env`:
   ```env
   DB_HOST=localhost
   DB_DATABASE=имя_базы
   DB_USERNAME=пользователь
   DB_PASSWORD="пароль"
   ```

### 4. Установка и настройка

```bash
cd ~/public_html/3dcabinet/
composer install --no-dev --optimize-autoloader

cp .env.production.example .env
nano .env

php artisan key:generate
php artisan migrate --force
chmod -R 775 storage bootstrap/cache

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## DigitalOcean / Linode (VPS)

### 1. Создание Droplet/Linode

- **OS**: Ubuntu 22.04 LTS
- **План**: Basic (1GB RAM минимум)
- **Локация**: ближайшая к пользователям

### 2. Первоначальная настройка

```bash
# Подключиться через SSH
ssh root@ваш-ip

# Обновить систему
apt update && apt upgrade -y

# Установить LAMP-стек
apt install -y nginx mysql-server php8.3 php8.3-fpm php8.3-mysql \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd \
  composer git unzip
```

### 3. Настройка MySQL

```bash
# Запустить mysql_secure_installation
mysql_secure_installation

# Создать БД
mysql -u root -p
```

```sql
CREATE DATABASE 3dcabinet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '3dcabinet_user'@'localhost' IDENTIFIED BY 'сильный-пароль';
GRANT ALL PRIVILEGES ON 3dcabinet.* TO '3dcabinet_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Загрузка проекта

```bash
# Через Git
cd /var/www/
git clone https://github.com/44mmnrw/3dcabinet.git
cd 3dcabinet/

# Установка зависимостей
composer install --no-dev --optimize-autoloader

# Настройка .env
cp .env.production.example .env
nano .env

# Генерация ключа и миграции
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=EquipmentSeeder --force

# Права
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Кэш
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 5. Настройка Nginx

```bash
nano /etc/nginx/sites-available/3dcabinet
```

```nginx
server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;
    root /var/www/3dcabinet/public;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/3dcabinet-access.log;
    error_log /var/log/nginx/3dcabinet-error.log;
}
```

**Активировать конфиг**:
```bash
ln -s /etc/nginx/sites-available/3dcabinet /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 6. Настройка SSL (Let's Encrypt)

```bash
# Установить Certbot
apt install -y certbot python3-certbot-nginx

# Получить сертификат
certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru

# Автообновление (добавится в cron автоматически)
certbot renew --dry-run
```

---

## Laravel Forge (Managed)

### 1. Подключение сервера

1. Зарегистрироваться на [forge.laravel.com](https://forge.laravel.com)
2. "Servers" → "Create Server"
3. Выбрать провайдера (DigitalOcean, Linode, AWS)
4. Forge автоматически настроит сервер

### 2. Создание сайта

1. "Sites" → "New Site"
2. Domain: `ваш-домен.ru`
3. Project Type: "General PHP / Laravel"
4. Web Directory: `/public`

### 3. Деплой через Git

1. На странице сайта → "Git Repository"
2. Repository: `44mmnrw/3dcabinet`
3. Branch: `main`
4. Deploy Script (отредактировать):

```bash
cd /home/forge/ваш-домен.ru
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

5. "Enable Quick Deploy" — автоматический деплой при push

### 4. Настройка .env

1. На странице сайта → "Environment"
2. Вставить содержимое `.env.production.example`
3. Заполнить реальные данные (DB_*, APP_URL)
4. Сохранить

### 5. Создание БД

1. "Database" → "Create Database"
2. Name: `3dcabinet`
3. User: `3dcabinet_user`
4. Password: (сгенерируется автоматически)

### 6. Запуск миграций

1. На странице сайта → "SSH"
2. Выполнить:
```bash
cd /home/forge/ваш-домен.ru
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=EquipmentSeeder --force
```

### 7. SSL

1. На странице сайта → "SSL"
2. "Let's Encrypt" → Activate

---

## Общие проблемы и решения

### "500 Internal Server Error" на любом хостинге

```bash
# 1. Проверить логи
tail -f storage/logs/laravel.log

# 2. Проверить права
chmod -R 775 storage bootstrap/cache

# 3. Очистить кеш
php artisan cache:clear
php artisan config:clear

# 4. Пересоздать .env
php artisan key:generate
```

### "CSRF token mismatch" на shared-хостинге

В `.env`:
```env
SESSION_DOMAIN=.ваш-домен.ru  # С точкой!
SESSION_SECURE_COOKIE=true     # Для HTTPS
```

Затем:
```bash
php artisan config:clear
php artisan cache:clear
```

### Не подключается к БД

```bash
# Проверить подключение
php artisan db:show

# Проверить .env
cat .env | grep DB_

# Типичные ошибки:
# - DB_HOST должен быть localhost (не 127.0.0.1)
# - DB_PASSWORD в кавычках: DB_PASSWORD="пароль"
# - Пользователь БД имеет права на базу
```

### "Mix manifest not found"

Проект НЕ использует Laravel Mix. Убедитесь, что загружены:
- `public/js/` (все файлы Three.js)
- `public/css/` (styles.css, reset.css)
- `public/assets/` (спрайты и иконки)

---

## Контакты хостингов

- **Beget**: https://beget.com/ru/kb/how-to/programming/laravel
- **TimeWeb**: https://timeweb.com/ru/help/laravel
- **DigitalOcean**: https://www.digitalocean.com/community/tags/laravel
- **Laravel Forge**: https://forge.laravel.com/docs

---

📚 **Подробная документация**: [DEPLOYMENT.md](DEPLOYMENT.md)
