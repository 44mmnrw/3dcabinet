#!/bin/bash

# Скрипт сборки проекта для production
# Использование: ./build-production.sh

set -e  # Остановка при ошибке

echo "🚀 Начинаем сборку проекта для production..."

# 1. Проверка зависимостей
echo "📦 Проверка зависимостей..."
if ! command -v php &> /dev/null; then
    echo "❌ PHP не установлен!"
    exit 1
fi

if ! command -v composer &> /dev/null; then
    echo "❌ Composer не установлен!"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен!"
    exit 1
fi

# 2. Установка PHP зависимостей (без dev)
echo "📦 Установка PHP зависимостей..."
composer install --no-dev --optimize-autoloader --no-interaction

# 3. Установка Node зависимостей
echo "📦 Установка Node зависимостей..."
npm ci --production=false

# 4. Сборка иконок (если нужно)
echo "🎨 Сборка SVG-спрайта..."
npm run build:icons

# 5. Сборка фронтенда через Vite
echo "🔨 Сборка фронтенда (Vite)..."
npm run build

# 6. Очистка кеша Laravel
echo "🧹 Очистка кеша Laravel..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# 7. Оптимизация Laravel (кеширование конфигов, роутов, views)
echo "⚡ Оптимизация Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 8. Проверка .env
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден!"
    echo "📝 Создайте .env на основе .env.example и настройте для production"
    echo "   Обязательно установите:"
    echo "   - APP_ENV=production"
    echo "   - APP_DEBUG=false"
    echo "   - APP_URL=https://ваш-домен.ru"
fi

echo ""
echo "✅ Сборка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Проверьте .env файл (APP_ENV=production, APP_DEBUG=false)"
echo "   2. Сгенерируйте APP_KEY: php artisan key:generate"
echo "   3. Примените миграции: php artisan migrate --force"
echo "   4. Настройте права: chmod -R 775 storage bootstrap/cache"
echo "   5. Загрузите проект на сервер"
echo ""

