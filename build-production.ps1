# Скрипт сборки проекта для production (PowerShell)
# Использование: .\build-production.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Начинаем сборку проекта для production..." -ForegroundColor Cyan

# 1. Проверка зависимостей
Write-Host "📦 Проверка зависимостей..." -ForegroundColor Yellow
$dependencies = @("php", "composer", "node", "npm")
foreach ($dep in $dependencies) {
    if (-not (Get-Command $dep -ErrorAction SilentlyContinue)) {
        Write-Host "❌ $dep не установлен!" -ForegroundColor Red
        exit 1
    }
}

# 2. Установка PHP зависимостей (без dev)
Write-Host "📦 Установка PHP зависимостей..." -ForegroundColor Yellow
composer install --no-dev --optimize-autoloader --no-interaction

# 3. Установка Node зависимостей
Write-Host "📦 Установка Node зависимостей..." -ForegroundColor Yellow
npm ci

# 4. Сборка иконок (если нужно)
Write-Host "🎨 Сборка SVG-спрайта..." -ForegroundColor Yellow
npm run build:icons

# 5. Сборка фронтенда через Vite
Write-Host "🔨 Сборка фронтенда (Vite)..." -ForegroundColor Yellow
npm run build

# 6. Очистка кеша Laravel
Write-Host "🧹 Очистка кеша Laravel..." -ForegroundColor Yellow
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# 7. Оптимизация Laravel (кеширование конфигов, роутов, views)
Write-Host "⚡ Оптимизация Laravel..." -ForegroundColor Yellow
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 8. Проверка .env
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Файл .env не найден!" -ForegroundColor Yellow
    Write-Host "📝 Создайте .env на основе .env.example и настройте для production" -ForegroundColor Yellow
    Write-Host "   Обязательно установите:" -ForegroundColor Yellow
    Write-Host "   - APP_ENV=production" -ForegroundColor Yellow
    Write-Host "   - APP_DEBUG=false" -ForegroundColor Yellow
    Write-Host "   - APP_URL=https://ваш-домен.ru" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Сборка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Проверьте .env файл (APP_ENV=production, APP_DEBUG=false)" -ForegroundColor White
Write-Host "   2. Сгенерируйте APP_KEY: php artisan key:generate" -ForegroundColor White
Write-Host "   3. Примените миграции: php artisan migrate --force" -ForegroundColor White
Write-Host "   4. Настройте права на сервере: chmod -R 775 storage bootstrap/cache" -ForegroundColor White
Write-Host "   5. Загрузите проект на сервер" -ForegroundColor White
Write-Host ""

