# 🔍 Диагностика ошибки 500

## Быстрая диагностика на сервере

### 1. Включить отладку (временно)
В `.env` файле на сервере:
```env
APP_DEBUG=true
APP_ENV=local
```

После этого обновить кеш:
```bash
php artisan config:clear
```

Теперь откройте сайт — увидите детальную ошибку.

### 2. Проверить логи Laravel
```bash
tail -f storage/logs/laravel.log
# Или последние 50 строк:
tail -n 50 storage/logs/laravel.log
```

### 3. Проверить права доступа
```bash
ls -la storage/
ls -la bootstrap/cache/
```

Должны быть права 775 или 777:
```bash
chmod -R 775 storage bootstrap/cache
# Или если не помогает:
chmod -R 777 storage bootstrap/cache
```

### 4. Проверить .env файл
```bash
cat .env | grep -E "APP_ENV|APP_DEBUG|APP_KEY"
```

Должно быть:
- `APP_ENV=production` (или `local` для отладки)
- `APP_DEBUG=false` (или `true` для отладки)
- `APP_KEY=` должен быть заполнен

Если `APP_KEY` пустой:
```bash
php artisan key:generate
```

### 5. Очистить весь кеш
```bash
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

### 6. Проверить что vendor установлен
```bash
ls -la vendor/
```

Если папки нет или пустая:
```bash
composer install --no-dev --optimize-autoloader
```

### 7. Проверить что public/build существует
```bash
ls -la public/build/
```

Если папки нет или пустая:
```bash
npm ci
npm run build
```

---

## Частые причины ошибки 500

### ❌ APP_KEY не установлен
**Решение:**
```bash
php artisan key:generate
php artisan config:cache
```

### ❌ Нет прав на storage/
**Решение:**
```bash
chmod -R 775 storage bootstrap/cache
```

### ❌ Ошибка в коде (синтаксис, отсутствующий файл)
**Решение:** Проверить логи `storage/logs/laravel.log`

### ❌ Проблемы с базой данных
**Решение:** Проверить настройки БД в `.env` и подключение

### ❌ Отсутствуют зависимости
**Решение:**
```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

---

## Полная переустановка (если ничего не помогает)

```bash
# 1. Очистить всё
php artisan optimize:clear
rm -rf bootstrap/cache/*.php
rm -rf storage/framework/cache/*
rm -rf storage/framework/views/*

# 2. Переустановить зависимости
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# 3. Применить миграции
php artisan migrate --force

# 4. Создать кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Права
chmod -R 775 storage bootstrap/cache
```

---

## После исправления

**Не забудьте вернуть:**
```env
APP_DEBUG=false
APP_ENV=production
```

И обновить кеш:
```bash
php artisan config:cache
```

