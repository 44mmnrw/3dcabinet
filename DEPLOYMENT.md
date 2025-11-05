# 🚀 Deployment Guide — 3Cabinet на Production

## Быстрая шпаргалка

### 1️⃣ Подготовка локально

```powershell
# Оптимизировать и закешировать
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Сгенерировать спрайт
npm run build:icons

# Создать архив (через FTP или Git)
```

### 2️⃣ На сервере: создать `.env`

```bash
cp .env.example .env
nano .env  # Редактировать
```

**Ключевые настройки**:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://ваш-домен.ru

DB_HOST=localhost
DB_DATABASE=имя_базы
DB_USERNAME=пользователь
DB_PASSWORD="пароль"

SESSION_SECURE_COOKIE=true
```

### 3️⃣ Установка

```bash
cd /путь/к/проекту

# Зависимости
composer install --no-dev --optimize-autoloader

# Ключ приложения
php artisan key:generate

# Права
chmod -R 775 storage bootstrap/cache

# Миграции
php artisan migrate --force
php artisan db:seed --class=EquipmentSeeder --force

# Кэш
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 4️⃣ Настройка веб-сервера

**Document Root = `/путь/к/проекту/public`**

#### Apache (.htaccess уже настроен)
Просто укажите Document Root на `public/`

#### Nginx (конфиг)
```nginx
root /путь/к/проекту/public;
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

---

## Checklist перед запуском

- [ ] `.env` создан с `APP_ENV=production` и `APP_DEBUG=false`
- [ ] `APP_KEY` сгенерирован (`php artisan key:generate`)
- [ ] БД настроена (`DB_*` параметры в `.env`)
- [ ] Document Root указывает на `public/`
- [ ] Права на `storage/` и `bootstrap/cache/`: 775 или 777
- [ ] Миграции применены (`php artisan migrate --force`)
- [ ] Кэш создан (`config:cache`, `route:cache`, `view:cache`)
- [ ] HTTPS настроен (для production обязательно!)
- [ ] Файлы загружены: `public/js/`, `public/css/`, `public/assets/`

---

## Обновление приложения

```bash
# 1. Загрузить новые файлы (git pull или FTP)

# 2. Обновить зависимости
composer install --no-dev --optimize-autoloader

# 3. Очистить старый кеш
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 4. Применить новые миграции (если есть)
php artisan migrate --force

# 5. Создать новый кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Перезапустить PHP-FPM (если есть доступ)
sudo systemctl reload php8.3-fpm
```

---

## Troubleshooting

### 500 Internal Server Error
```bash
# Проверить логи
tail -f storage/logs/laravel.log

# Проверить права
chmod -R 775 storage bootstrap/cache

# Пересоздать .env
php artisan key:generate
php artisan config:clear
```

### 403 Forbidden
- Document Root указывает на `public/`, не на корень проекта
- Проверьте права: `chmod 755 public/`

### CSRF token mismatch
```bash
# Очистить сессии и кеш
php artisan cache:clear
php artisan config:clear

# Проверить SESSION_DOMAIN в .env
```

### БД не подключается
- Проверьте `DB_HOST` (часто `localhost`, не IP)
- Пароль в кавычках: `DB_PASSWORD="пароль"`
- Убедитесь, что БД создана на хостинге

---

## Требования к хостингу

**Минимальные**:
- PHP 8.2+ (рекомендуется 8.3)
- MySQL 5.7+ или MariaDB 10.3+
- Composer
- SSH-доступ (для миграций)
- Apache/Nginx с mod_rewrite

**Расширения PHP**:
```
php-mbstring php-xml php-curl php-zip php-gd
php-mysql php-pdo php-json php-tokenizer
```

---

## Безопасность

**Обязательно**:
- ✅ HTTPS с валидным SSL-сертификатом
- ✅ `APP_DEBUG=false` в production
- ✅ `.env` вне публичного доступа
- ✅ Document Root строго на `public/`
- ✅ Блокировка `.env`, `.git` через веб-сервер

**Nginx — блокировка скрытых файлов**:
```nginx
location ~ /\. {
    deny all;
}
```

**Apache** (в `.htaccess` корня, если Document Root не на `public/`):
```apache
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>
```

---

## Полезные команды

```bash
# Просмотр логов
tail -f storage/logs/laravel.log

# Очистка кеша
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Создание кеша
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Просмотр конфигурации
php artisan config:show database  # Показать настройки БД
php artisan route:list             # Список всех роутов
php artisan about                  # Информация о приложении

# Бэкап БД
mysqldump -u пользователь -p имя_базы > backup_$(date +%Y%m%d).sql
```

---

## Контакты хостинга (примеры)

**Популярные хостинги для Laravel**:
- **Shared**: Beget, TimeWeb, HostGator (требуют настройки Document Root)
- **VPS**: DigitalOcean, Linode, Vultr (полный контроль)
- **Managed**: Laravel Forge, Cloudways (автоматическая настройка)

**Документация хостингов**:
- Beget: https://beget.com/ru/kb/how-to/programming/laravel
- TimeWeb: https://timeweb.com/ru/community/articles/laravel

---

📚 **Подробная документация**: см. `.github/copilot-instructions.md` (секция "Deployment на production-хостинг")
