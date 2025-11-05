# 3Cabinet — Конфигуратор серверных шкафов

Веб-приложение на Laravel 11 для виртуального проектирования размещения оборудования в серверном шкафу с 3D-визуализацией на Three.js.

## 🚀 Быстрый старт

### Локальная разработка (Laragon)

```powershell
# 1. Запустить миграции
php artisan migrate

# 2. Заполнить БД тестовыми данными
php artisan db:seed --class=EquipmentSeeder

# 3. Запустить сервер
php artisan serve

# Приложение доступно на http://localhost:8000
```

Подробнее: [QUICKSTART.md](QUICKSTART.md)

### Production deployment

**Для Timeweb Cloud** 🔥: **[TIMEWEB_DEPLOYMENT.md](TIMEWEB_DEPLOYMENT.md)** — пошаговая инструкция от создания сервера до SSL

**Общая инструкция**:
```bash
# 1. Настроить .env (см. .env.production.example)
# 2. Установить зависимости
composer install --no-dev --optimize-autoloader

# 3. Сгенерировать ключ и применить миграции
php artisan key:generate
php artisan migrate --force

# 4. Настроить права и кэш
chmod -R 775 storage bootstrap/cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Подробнее: **[DEPLOYMENT.md](DEPLOYMENT.md)** 📦  
Другие хостинги: **[HOSTING_SETUP.md](HOSTING_SETUP.md)**

## 📁 Структура проекта

```
3dcabinet/
├── app/Http/Controllers/     # Контроллеры (Landing, Configurator, Admin)
├── resources/views/          # Blade-шаблоны
│   ├── layouts/              # Мастер-шаблон app.blade.php
│   ├── partials/             # Header, Footer, SVG-спрайт
│   ├── landing/              # Главная страница
│   ├── configurator/         # 3D-конфигуратор
│   └── admin/                # Админ-панель
├── public/                   # Публичные файлы
│   ├── js/                   # JavaScript (Three.js, app.js, data.js)
│   ├── css/                  # Стили (styles.css, reset.css)
│   ├── assets/               # SVG-спрайт и иконки
│   └── fonts/                # Inter Variable
├── database/
│   ├── migrations/           # Таблицы: projects, equipment, configurations
│   └── seeders/              # EquipmentSeeder
└── routes/web.php            # Роуты приложения
```

## 🎯 Основные URL

| URL | Описание | Контроллер |
|-----|----------|------------|
| `/` | Landing с формой выбора | `LandingController` |
| `/app` | 3D-конфигуратор | `ConfiguratorController` |
| `/admin` | Админ-панель | `AdminController` |

## 🛠️ Технологии

- **Backend**: Laravel 11 (PHP 8.3+, Blade, Eloquent ORM)
- **Frontend**: Vanilla JS + Three.js r167 (ES6 modules, без build-процесса)
- **База данных**: MySQL (через Laragon)
- **Стили**: CSS с переменными (без препроцессоров)
- **SVG**: Автоматическая сборка спрайта через `npm run build:icons`

## 📚 Документация

- **[QUICKSTART.md](QUICKSTART.md)** — Быстрый старт (3 шага)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Деплой на production-хостинг 🔥
- **[3DCABINET_README.md](3DCABINET_README.md)** — Подробная документация
- **[LARAGON_SETUP.md](LARAGON_SETUP.md)** — Настройка Laragon
- **[VHOST_SETUP.md](VHOST_SETUP.md)** — Виртуальные хосты
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — Инструкции для AI-агентов

## 🔧 Полезные команды

```powershell
# Разработка
php artisan serve                # Запустить сервер
php artisan migrate              # Применить миграции
php artisan db:seed              # Заполнить БД
php artisan route:list           # Список роутов

# SVG-спрайт
npm run build:icons              # Сгенерировать спрайт
npm run icons:watch              # Наблюдение за изменениями

# Production
php artisan config:cache         # Кэшировать конфигурацию
php artisan route:cache          # Кэшировать роуты
php artisan view:cache           # Кэшировать views
```

## ⚙️ Требования

- PHP 8.2+ (рекомендуется 8.3)
- MySQL 5.7+ или MariaDB 10.3+
- Composer
- Node.js 18+ (для сборки SVG-спрайта)

## 📝 Лицензия

MIT License

---

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
