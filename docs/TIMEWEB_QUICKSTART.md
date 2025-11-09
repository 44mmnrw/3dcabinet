# ⚡ Быстрая шпаргалка: Timeweb Cloud

## 🔑 Данные доступа (запишите!)

```
IP-адрес:    ___________________
Пароль root: ___________________

MySQL root:  ___________________
БД:          3dcabinet
User:        3dcabinet_user
Password:    ___________________

Домен:       ___________________
```

---

## 📋 Последовательность команд

### 1. Подключиться к серверу
```bash
ssh root@ВАШ_IP
```

### 2. Установить всё необходимое
```bash
apt update && apt upgrade -y
apt install -y nginx mysql-server php8.3 php8.3-fpm php8.3-mysql \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd \
  composer git unzip certbot python3-certbot-nginx
```

### 3. Настроить MySQL
```bash
mysql_secure_installation
mysql -u root -p
```
```sql
CREATE DATABASE 3dcabinet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '3dcabinet_user'@'localhost' IDENTIFIED BY 'СИЛЬНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON 3dcabinet.* TO '3dcabinet_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Загрузить проект
```bash
cd /var/www/
git clone https://github.com/44mmnrw/3dcabinet.git
cd 3dcabinet/
```

### 5. Настроить Laravel
```bash
composer install --no-dev --optimize-autoloader
cp .env.production.example .env
nano .env
# Заполнить: APP_URL, DB_DATABASE, DB_USERNAME, DB_PASSWORD
# Сохранить: Ctrl+O, Enter, Ctrl+X

php artisan key:generate
chown -R www-data:www-data /var/www/3dcabinet/
chmod -R 775 storage bootstrap/cache
php artisan migrate --force
php artisan db:seed --class=EquipmentSeeder --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. Настроить Nginx
```bash
nano /etc/nginx/sites-available/3dcabinet
```

**Вставить** (заменить `ваш-домен.ru` на реальный):
```nginx
server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;
    root /var/www/3dcabinet/public;
    index index.php;
    
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
}
```

**Активировать**:
```bash
ln -s /etc/nginx/sites-available/3dcabinet /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 7. Получить SSL
```bash
certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
# Email: ваш@email.ru
# Accept: A
# Redirect: 2

# Обновить .env
nano /var/www/3dcabinet/.env
# APP_URL=https://ваш-домен.ru
# SESSION_SECURE_COOKIE=true

cd /var/www/3dcabinet/
php artisan config:clear
php artisan config:cache
```

### 8. Настроить файрвол
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## ✅ Проверка

- [ ] Открыть `https://ваш-домен.ru` в браузере
- [ ] Проверить `/`, `/app`, `/admin`
- [ ] Проверить логи: `tail -f /var/www/3dcabinet/storage/logs/laravel.log`

---

## 🔧 Обновление приложения

```bash
cd /var/www/3dcabinet/
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
systemctl reload php8.3-fpm
```

---

## 🐛 Если что-то не работает

**500 Error**:
```bash
tail -f /var/www/3dcabinet/storage/logs/laravel.log
chmod -R 775 /var/www/3dcabinet/storage /var/www/3dcabinet/bootstrap/cache
php artisan cache:clear
```

**502 Bad Gateway**:
```bash
systemctl restart php8.3-fpm nginx
```

**CSRF token mismatch**:
```bash
cd /var/www/3dcabinet/
php artisan config:clear
php artisan cache:clear
```

---

## 📚 Полная инструкция
**[TIMEWEB_DEPLOYMENT.md](TIMEWEB_DEPLOYMENT.md)**

---

Время: ~30-60 минут | Timeweb Cloud | Ubuntu 22.04 | PHP 8.3 | Nginx | MySQL
