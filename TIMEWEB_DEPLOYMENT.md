# 🚀 Деплой 3Cabinet на Timeweb Cloud

Пошаговая инструкция для запуска Laravel-приложения 3Cabinet на хостинге Timeweb Cloud.

---

## Шаг 1: Подготовка на локальной машине

### 1.1. Оптимизация проекта

```powershell
cd c:\laragon\www\3dcabinet

# Очистить и закешировать
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Сгенерировать спрайт иконок
npm run build:icons
```

### 1.2. Коммит в Git (если используете)

```powershell
git add .
git commit -m "Подготовка к деплою на Timeweb"
git push origin main
```

---

## Шаг 2: Создание сервера на Timeweb Cloud

### 2.1. Заказ VPS

1. Войти в [timeweb.cloud](https://timeweb.cloud/)
2. **Облачные серверы** → **Создать сервер**
3. Выбрать конфигурацию:
   - **ОС**: Ubuntu 22.04 LTS
   - **Тариф**: Минимум 1 CPU / 1 GB RAM (рекомендуется 2 CPU / 2 GB RAM)
   - **Диск**: 10 GB SSD (минимум)
   - **Локация**: Москва (ближе к пользователям)
4. Установить галочку **"SSH-ключ"** или использовать пароль
5. Нажать **"Создать сервер"**

### 2.2. Получить данные доступа

После создания вы получите:
- **IP-адрес сервера**: `123.45.67.89`
- **Логин**: `root`
- **Пароль**: (придёт на email или задан вами)

---

## Шаг 3: Первоначальная настройка сервера

### 3.1. Подключиться через SSH

**Windows PowerShell**:
```powershell
ssh root@123.45.67.89
# Ввести пароль
```

**Или через Putty** (скачать с [putty.org](https://www.putty.org/)):
- Host: `123.45.67.89`
- Port: `22`
- Username: `root`
- Password: ваш пароль

### 3.2. Обновить систему

```bash
apt update && apt upgrade -y
```

### 3.3. Установить необходимое ПО

```bash
# Установить Nginx, MySQL, PHP 8.3
apt install -y nginx mysql-server \
  php8.3 php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml \
  php8.3-curl php8.3-zip php8.3-gd php8.3-intl \
  composer git unzip curl

# Проверить версии
php -v
composer --version
nginx -v
mysql --version
```

---

## Шаг 4: Настройка MySQL

### 4.1. Запустить безопасную установку

```bash
mysql_secure_installation
```

Ответы на вопросы:
- **Set root password?** → Y (задать пароль root)
- **Remove anonymous users?** → Y
- **Disallow root login remotely?** → Y
- **Remove test database?** → Y
- **Reload privilege tables?** → Y

### 4.2. Создать базу данных

```bash
mysql -u root -p
# Ввести пароль root
```

```sql
CREATE DATABASE 3dcabinet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '3dcabinet_user'@'localhost' IDENTIFIED BY 'Сильный_Пароль_123!';
GRANT ALL PRIVILEGES ON 3dcabinet.* TO '3dcabinet_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

✅ **Запомните данные**:
- База: `3dcabinet`
- Пользователь: `3dcabinet_user`
- Пароль: `Сильный_Пароль_123!`

---

## Шаг 5: Загрузка проекта на сервер

### Вариант A: Через Git (рекомендуется)

```bash
cd /var/www/
git clone https://github.com/44mmnrw/3dcabinet.git
cd 3dcabinet/
```

### Вариант B: Через SCP/SFTP

**На локальной машине** (PowerShell):
```powershell
# Создать архив
tar -czf 3dcabinet.tar.gz c:\laragon\www\3dcabinet\

# Загрузить на сервер
scp 3dcabinet.tar.gz root@123.45.67.89:/var/www/
```

**На сервере**:
```bash
cd /var/www/
tar -xzf 3dcabinet.tar.gz
mv 3dcabinet-main 3dcabinet  # Если из архива GitHub
```

---

## Шаг 6: Настройка Laravel

### 6.1. Установить зависимости

```bash
cd /var/www/3dcabinet/
composer install --no-dev --optimize-autoloader
```

### 6.2. Создать .env файл

```bash
cp .env.production.example .env
nano .env
```

**Заполнить ключевые параметры**:
```env
APP_NAME="3Cabinet"
APP_ENV=production
APP_KEY=                                    # Сгенерируем ниже
APP_DEBUG=false
APP_URL=https://ваш-домен.ru                # Ваш домен или IP

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=3dcabinet
DB_USERNAME=3dcabinet_user
DB_PASSWORD="Сильный_Пароль_123!"           # Ваш пароль от БД

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.ваш-домен.ru                # Ваш домен

LOG_CHANNEL=daily
LOG_LEVEL=error
```

**Сохранить**: `Ctrl+O`, Enter, `Ctrl+X`

### 6.3. Сгенерировать ключ приложения

```bash
php artisan key:generate
```

### 6.4. Настроить права доступа

```bash
chown -R www-data:www-data /var/www/3dcabinet/
chmod -R 775 storage bootstrap/cache
```

### 6.5. Применить миграции

```bash
php artisan migrate --force
```

**Ответить**: `yes`

### 6.6. Заполнить БД начальными данными

```bash
php artisan db:seed --class=EquipmentSeeder --force
```

### 6.7. Создать кэш

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Шаг 7: Настройка Nginx

### 7.1. Создать конфигурацию сайта

```bash
nano /etc/nginx/sites-available/3dcabinet
```

**Вставить конфигурацию**:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ваш-домен.ru www.ваш-домен.ru;  # Замените на ваш домен или IP
    
    root /var/www/3dcabinet/public;
    index index.php index.html;

    # Логи
    access_log /var/log/nginx/3dcabinet-access.log;
    error_log /var/log/nginx/3dcabinet-error.log;

    # Gzip сжатие
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # Кэширование статики
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Laravel routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    # Запретить доступ к скрытым файлам
    location ~ /\. {
        deny all;
    }
}
```

**Сохранить**: `Ctrl+O`, Enter, `Ctrl+X`

### 7.2. Активировать конфигурацию

```bash
# Создать символическую ссылку
ln -s /etc/nginx/sites-available/3dcabinet /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

---

## Шаг 8: Настройка домена (опционально)

### 8.1. Привязать домен к серверу

1. Зайти в панель Timeweb Cloud → **DNS**
2. Или в панель вашего регистратора домена
3. Создать A-запись:
   - **Тип**: A
   - **Имя**: `@` (или оставить пустым)
   - **Значение**: `123.45.67.89` (IP вашего сервера)
4. Создать A-запись для www:
   - **Тип**: A
   - **Имя**: `www`
   - **Значение**: `123.45.67.89`

⏰ **Подождать**: DNS-записи обновляются 5-60 минут

---

## Шаг 9: Настройка SSL (HTTPS)

### 9.1. Установить Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2. Получить SSL-сертификат

```bash
certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
```

**Ответить на вопросы**:
- **Email**: ваш@email.ru
- **Terms of Service**: A (Accept)
- **Share email**: N (No)
- **Redirect HTTP to HTTPS**: 2 (Yes, redirect)

✅ Certbot автоматически:
- Получит сертификат от Let's Encrypt
- Обновит конфигурацию Nginx
- Настроит редирект с HTTP на HTTPS

### 9.3. Проверить автообновление

```bash
certbot renew --dry-run
```

Если успешно — сертификат будет обновляться автоматически каждые 60 дней.

### 9.4. Обновить .env для HTTPS

```bash
nano /var/www/3dcabinet/.env
```

**Изменить**:
```env
APP_URL=https://ваш-домен.ru
SESSION_SECURE_COOKIE=true
```

**Очистить и пересоздать кэш**:
```bash
cd /var/www/3dcabinet/
php artisan config:clear
php artisan config:cache
```

---

## Шаг 10: Проверка работы сайта

### 10.1. Открыть в браузере

- **HTTP**: `http://ваш-домен.ru` (должен редиректить на HTTPS)
- **HTTPS**: `https://ваш-домен.ru`

### 10.2. Проверить страницы

- `/` — Главная страница (Landing)
- `/app` — 3D-конфигуратор
- `/admin` — Админ-панель

### 10.3. Проверить логи при ошибках

```bash
# Laravel логи
tail -f /var/www/3dcabinet/storage/logs/laravel.log

# Nginx логи
tail -f /var/log/nginx/3dcabinet-error.log

# PHP-FPM логи
tail -f /var/log/php8.3-fpm.log
```

---

## 🔧 Обновление приложения

### Через Git

```bash
cd /var/www/3dcabinet/

# Загрузить изменения
git pull origin main

# Обновить зависимости
composer install --no-dev --optimize-autoloader

# Очистить старый кеш
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Применить новые миграции (если есть)
php artisan migrate --force

# Создать новый кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Перезапустить PHP-FPM (опционально)
systemctl reload php8.3-fpm
```

---

## 🛡️ Безопасность

### Настроить файрвол (UFW)

```bash
# Разрешить SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включить файрвол
ufw enable

# Проверить статус
ufw status
```

### Создать нового пользователя (не root)

```bash
# Создать пользователя
adduser deploy
usermod -aG sudo deploy

# Переключиться на нового пользователя
su - deploy

# Использовать sudo для команд от root
sudo systemctl restart nginx
```

---

## 📊 Мониторинг и обслуживание

### Автоматический бэкап БД (cron)

```bash
# Открыть crontab
crontab -e

# Добавить строку (бэкап каждый день в 2:00 AM)
0 2 * * * mysqldump -u 3dcabinet_user -p'Сильный_Пароль_123!' 3dcabinet > /var/backups/3dcabinet_$(date +\%Y\%m\%d).sql

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

### Очистка старых логов

```bash
# Добавить в crontab (очистка логов старше 7 дней)
0 0 * * * find /var/www/3dcabinet/storage/logs/ -name "*.log" -mtime +7 -delete
```

### Мониторинг ресурсов

```bash
# Использование CPU/RAM
htop

# Использование диска
df -h

# Логи Nginx в реальном времени
tail -f /var/log/nginx/3dcabinet-access.log
```

---

## 🐛 Решение типичных проблем

### "500 Internal Server Error"

```bash
# Проверить Laravel логи
tail -f /var/www/3dcabinet/storage/logs/laravel.log

# Проверить права
chmod -R 775 /var/www/3dcabinet/storage /var/www/3dcabinet/bootstrap/cache

# Очистить кеш
cd /var/www/3dcabinet/
php artisan cache:clear
php artisan config:clear
```

### "502 Bad Gateway"

```bash
# Проверить статус PHP-FPM
systemctl status php8.3-fpm

# Перезапустить PHP-FPM
systemctl restart php8.3-fpm

# Проверить Nginx
systemctl status nginx
nginx -t
```

### "CSRF token mismatch"

```bash
cd /var/www/3dcabinet/

# Проверить SESSION_DOMAIN в .env
nano .env
# SESSION_DOMAIN=.ваш-домен.ru

# Очистить кеш
php artisan config:clear
php artisan cache:clear
```

### БД не подключается

```bash
# Проверить подключение
cd /var/www/3dcabinet/
php artisan db:show

# Проверить, что MySQL запущен
systemctl status mysql

# Проверить .env
cat .env | grep DB_
```

---

## ✅ Чеклист готовности

- [ ] Сервер создан на Timeweb Cloud
- [ ] SSH-доступ работает
- [ ] Nginx, MySQL, PHP 8.3 установлены
- [ ] База данных создана
- [ ] Проект загружен на сервер
- [ ] Зависимости установлены (`composer install`)
- [ ] `.env` файл настроен
- [ ] `APP_KEY` сгенерирован
- [ ] Права на `storage/` и `bootstrap/cache/` установлены (775)
- [ ] Миграции применены (`php artisan migrate --force`)
- [ ] Кэш создан (config, route, view)
- [ ] Nginx конфигурация создана и активна
- [ ] Домен привязан к серверу (если есть)
- [ ] SSL-сертификат установлен
- [ ] Сайт открывается по HTTPS
- [ ] Все страницы работают (`/`, `/app`, `/admin`)
- [ ] Файрвол настроен
- [ ] Бэкапы БД настроены

---

## 📞 Поддержка Timeweb

- **База знаний**: https://timeweb.cloud/help
- **Тикеты**: через панель Timeweb Cloud
- **Telegram**: @timeweb_support

---

## 📚 Дополнительная документация

- [DEPLOYMENT.md](DEPLOYMENT.md) — Подробная документация деплоя
- [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) — Чеклист перед деплоем
- [.env.production.example](.env.production.example) — Шаблон .env

---

**Время развёртывания**: ~30-60 минут  
**Сложность**: Средняя  
**Последнее обновление**: 5 ноября 2025 г.
