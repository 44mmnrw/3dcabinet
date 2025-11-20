# 🚀 Быстрый деплой на production

## Локально (перед загрузкой на сервер)

### Windows:
```powershell
.\build-production.ps1
```

### Linux/Mac:
```bash
chmod +x build-production.sh
./build-production.sh
```

### Или вручную:
```bash
npm run build
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## На сервере

### 1. Загрузить файлы (через FTP/SFTP или Git)
**Важно:** НЕ загружать `node_modules/`, `vendor/`, `.env`, `.git/`

### 2. Создать `.env` файл:
```env
APP_NAME="3Cabinet"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://ваш-домен.ru

# Сгенерировать ключ: php artisan key:generate
APP_KEY=

# База данных
DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=имя_базы
DB_USERNAME=пользователь
DB_PASSWORD="пароль"
```

### 3. Установить зависимости:
```bash
composer install --no-dev --optimize-autoloader
```

### 4. Настроить приложение:
```bash
# Сгенерировать ключ
php artisan key:generate

# Применить миграции
php artisan migrate --force

# Установить права
chmod -R 775 storage bootstrap/cache

# Оптимизировать
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 5. Настроить веб-сервер
- Document Root → `/путь/к/проекту/public`
- Включить HTTPS (SSL сертификат)

---

## ✅ Проверка

- [ ] Главная страница открывается
- [ ] 3D конфигуратор загружается
- [ ] Нет ошибок в консоли браузера
- [ ] HTTPS работает

---

📋 **Подробная инструкция:** [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)

