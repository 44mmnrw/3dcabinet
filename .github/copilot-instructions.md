# Инструкции для AI-ассистента — 3Cabinet

## Архитектура проекта

**Тип приложения**: Laravel 11 веб-конфигуратор с 3D-визуализацией (Three.js) и Blade-шаблонизацией.

**Гибридная архитектура**:
- **Backend**: Laravel 11 (PHP 8.3+, роутинг, Blade views, Eloquent ORM)
- **Frontend**: Vanilla JS + Three.js (ES6 modules, без npm build-процесса)
- **База данных**: MySQL (через Laragon) с миграциями для projects, equipment, cabinet_configurations

**Три основных маршрута** (см. `routes/web.php`):
1. `/` → `LandingController` → `landing/index.blade.php` — лендинг с 2-шаговой формой выбора
2. `/app` → `ConfiguratorController` → `configurator/index.blade.php` — 3D-конфигуратор
3. `/admin` → `AdminController` → `admin/index.blade.php` — админ-панель

**Клиент-серверное разделение**:
- Рендеринг HTML: Blade templates (`resources/views/`)
- Статические активы: `public/` (CSS, JS, fonts, images, assets)
- Состояние UI: управляется JavaScript на клиенте (без build-процесса)
- Персистентность: Laravel Eloquent + MySQL (projects, equipment, configurations)

---

## Ключевые файлы и структура

### Backend (Laravel)

**Контроллеры** (`app/Http/Controllers/`):
- `LandingController.php` — отдаёт главную с формой выбора
- `ConfiguratorController.php` — отдаёт 3D-конфигуратор
- `AdminController.php` — админ-панель (базовая)

**Роутинг** (`routes/web.php`):
```php
Route::get('/', [LandingController::class, 'index'])->name('landing');
Route::get('/app', [ConfiguratorController::class, 'index'])->name('configurator');
Route::prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin.dashboard');
});
```

**Миграции** (`database/migrations/`):
- `*_create_projects_table.php` — проекты (name, configuration JSON, total_price/power/weight, status enum)
- `*_create_equipment_table.php` — каталог оборудования (name, category, units, power, weight, depth, price)
- `*_create_cabinet_configurations_table.php` — конфигурации (project_id FK, размеры, equipment_positions JSON)

**Сидеры** (`database/seeders/`):
- `EquipmentSeeder.php` — начальные данные оборудования (серверы Dell/HP, коммутаторы Cisco, ИБП APC, патч-панели)

### Frontend (Blade + Vanilla JS)

**Blade Templates** (`resources/views/`):
- `layouts/app.blade.php` — мастер-шаблон (подключает reset.css, styles.css, SVG-спрайт, header/footer)
- `partials/header.blade.php`, `footer.blade.php`, `sprite.blade.php` — переиспользуемые компоненты
- `landing/index.blade.php` — лендинг с формой (@push scripts: data.js + selection.js)
- `configurator/index.blade.php` — 3D-конфигуратор (app.js как ES6 module)
- `admin/index.blade.php` — админка

**JavaScript** (`public/js/` — без сборщиков!):
- `app.js` — ES6 модуль для Three.js (import THREE, OrbitControls, WebGL-инициализация, геометрия шкафа 600×1872×1000 мм)
- `data.js` — статические данные (CABINET_CONFIG объект, EQUIPMENT_DATA массив) — используется как глобальный скрипт
- `selection.js` — IIFE для формы выбора (обработчики `.select-card`, прогресс-бар, синхронизация radio + `.active`)
- `three.module.js`, `OrbitControls.js`, `GLTFLoader.js`, `BufferGeometryUtils.js` — Three.js r167 локальные копии

**Стили** (`public/css/`):
- `reset.css` — базовый сброс
- `styles.css` — главный файл (1000+ строк): CSS-переменные :root (--primary-color: #8b5cf6), Inter Variable шрифт, responsive (брейкпоинты 1024/900/768/430/375px), анимации (прогресс-бар, SVG галка stroke-dashoffset)
- Классы состояния: `.hidden`/`.visible`, `.active`, `.disabled-button`

**Активы** (`public/assets/`):
- `icons/` — SVG-исходники
- `sprite/sprite.svg` — сгенерированный спрайт (через `npm run build:icons`, используется `<use xlink:href="{{ asset('assets/sprite/sprite.svg#icon-name') }}">`)

### Конфигурация

- `.env` — окружение (DB_DATABASE=3dcabinet, DB_USERNAME=admin, DB_PASSWORD="4bq;=m=)", APP_NAME="3Cabinet")
- `package.json` — скрипты для спрайта: `build:icons` (node build-icons.mjs), `icons:watch` (chokidar), `icons:dev`
- `build-icons.mjs` — ES-модуль для сборки SVG-спрайта (svgstore: public/assets/icons → public/assets/sprite/sprite.svg)
- `vite.config.js` — НЕ используется для public/js (это шаблонные настройки Laravel)

---

## Форматы и структуры данных

### EQUIPMENT_DATA (массив в `js/data.js`)
```javascript
{
  id: 1,                    // уникальный идентификатор
  name: "Коммутатор Cisco 2960",
  description: "24-port Gigabit Switch",
  units: 1,                 // занимаемые U-slots в шкафу (1-4)
  power: 45,                // вт (0 для пассивного оборудования)
  weight: 3.2,              // кг
  depth: 250,               // мм
  category: "network"       // "network", "server", "power", "accessories"
}
```

### CABINET_CONFIG (объект в `js/data.js`)
```javascript
{
  name: 'Стандарт 19" RACK',
  units: 42,                // всего U-slots
  width: 600,               // мм
  depth: 800,               // мм
  maxWeight: 800,           // кг
  maxPower: 3500            // вт
}
```

### Состояние выбора (в `js/selection.js`)
```javascript
selectedLocation: boolean,      // место установки выбрано
selectedInstallation: boolean   // тип установки выбран
```

---

## Паттерны и соглашения

### Стилизация через классы
- **`.hidden` / `.visible`** — управление видимостью с CSS transitions
  ```css
  .hidden { display: none !important; opacity: 0; max-height: 0; }
  .visible { display: grid !important; opacity: 1; max-height: 500px; }
  ```
  
- **`.active`** — выбранная карточка получает светлый фон и фиолетовую границу
  ```javascript
  card.classList.add('active'); // в response на клик
  ```

- **`.disabled-button`** — неактивная кнопка (серый фон, нет events)
  ```css
  .disabled-button { background-color: #B2BEC3 !important; cursor: not-allowed; pointer-events: none; }
  ```

### Управление формой
- Radio-inputs скрыты (`display: none`), видны только custom-radio (кружок + SVG-галка)
- При клике на `.select-card`: устанавливается `.active` класс И проверяется `radio.checked`
- Анимация галки: `stroke-dashoffset` идёт от 30 к 0, сопровождается `scale(1.1)` пульсом

### Three.js сцена (в `js/app.js`)
- **Сцена**: белый фон, оси координат (AxesHelper), светлая сетка
- **Камера**: PerspectiveCamera, позиция `-width/2, height*0.86, camDistance` (косой вид сверху)
- **Освещение**:
  - AmbientLight: интенсивность 1 (базовое)
  - DirectionalLight: направлен с вверху-справа, создаёт тень
- **Шкаф**: BoxGeometry (600×1872×1000 мм для 42U), + 4 рельса (стойки) спереди/сзади
- **Рендерер**: WebGLRenderer с antialiasing, PCFSoftShadowMap, devicePixelRatio

---

## Рабочие процессы

### Запуск проекта (Laragon + Laravel)

**Встроенный сервер Laravel**:
```powershell
cd c:\laragon\www\3dcabinet
php artisan serve
# → http://localhost:8000
```

**Через Laragon Apache** (требуется vhost, см. VHOST_SETUP.md):
```powershell
# 1. Создать C:\laragon\etc\apache2\sites-enabled\cabinet-calc.test.conf
# 2. Добавить в C:\Windows\System32\drivers\etc\hosts (от admin):
#    127.0.0.1    cabinet-calc.test
# 3. Перезапустить Apache в Laragon
# → http://cabinet-calc.test
```

**Миграции БД**:
```powershell
php artisan migrate           # Применить миграции
php artisan migrate:rollback  # Откатить последнюю порцию
php artisan migrate:fresh     # Пересоздать все (УДАЛЯЕТ ДАННЫЕ!)
php artisan db:seed --class=EquipmentSeeder  # Заполнить оборудование
```

**Полезные команды**:
```powershell
php artisan route:list        # Список всех роутов
php artisan config:clear      # Очистить кеш конфигурации
php artisan cache:clear       # Очистить кеш приложения
```

### Генерация SVG-спрайта

**Команды** (см. package.json):
```powershell
npm run build:icons           # Разовая сборка спрайта
npm run icons:watch           # Режим наблюдения (автопересборка)
npm run icons:dev             # Сборка + наблюдение
```

**Процесс**:
1. Положить SVG в `public/assets/icons/` (имя файла = ID иконки)
2. Запустить `npm run build:icons`
3. Скрипт `build-icons.mjs` создаст `public/assets/sprite/sprite.svg`
4. В Blade: `<svg><use xlink:href="{{ asset('assets/sprite/sprite.svg#icon-NAME') }}"></use></svg>`

### Развитие функционала

**Добавить оборудование**:
1. JS-данные: редактируйте `EQUIPMENT_DATA` в `public/js/data.js`
2. БД: добавьте запись через `EquipmentSeeder.php` → `php artisan db:seed`

**Изменить параметры шкафа**:
1. JS: редактируйте `CABINET_CONFIG` в `public/js/data.js`
2. БД: миграция `cabinet_configurations` (если нужна персистентность)

**Обновить стили**:
- Редактируйте CSS-переменные в `public/css/styles.css` (строка ~56, `:root`)
- Брейкпоинты: `@media (max-width: 1024px)`, `(max-width: 768px)`, ...

**Создать контроллер/миграцию**:
```powershell
php artisan make:controller EquipmentController
php artisan make:migration create_users_projects_table
# Редактировать → php artisan migrate
```

### Отладка

**Backend (PHP)**:
```php
dd($variable);           // Dump and die
dump($variable);         // Dump без остановки
Log::info('Msg', ['data' => $val]); // storage/logs/laravel.log
```

**Frontend (JavaScript)**:
```javascript
console.log('Контейнер:', container);
console.warn('WebGL не поддерживается');
console.error('Ошибка:', e);
```

**Проверки**:
- 3D-сцена: DevTools → Console → логи из `app.js`, Application → WebGL включен
- Форма: Elements → `.select-card.active`, Console → `querySelectorAll('input:checked')` должно быть 2
- Стили: Проверьте `<link href="{{ asset('css/styles.css') }}">`, очистите кеш браузера (Ctrl+Shift+R)

---

## Важные инварианты

### БД и миграции
1. **Внешние ключи**: `projects.user_id` → `users.id` (nullable, cascade delete), `cabinet_configurations.project_id` → `projects.id`
2. **JSON-столбцы**: `projects.configuration`, `cabinet_configurations.equipment_positions` — полная конфигурация как JSON
3. **Enum-столбцы**: `projects.status` (draft/completed/archived), `cabinet_configurations.installation` (floor/wall), `location` (indoor/outdoor)

### JavaScript данные
1. **EQUIPMENT_DATA**: все `id` уникальны, `units` от 1 до 4, `category` соответствует фильтрам UI
2. **CABINET_CONFIG**: изменение `units` требует пересчёта `height` (units × 44.45 мм) и обновления геометрии в `app.js`
3. **Порядок скриптов в Blade**:
   ```blade
   @push('scripts')
     <script src="{{ asset('js/data.js') }}"></script>      <!-- Сначала данные -->
     <script type="module" src="{{ asset('js/app.js') }}"></script> <!-- Затем модули -->
     <script src="{{ asset('js/selection.js') }}"></script> <!-- Затем IIFE -->
   @endpush
   ```

### Three.js и камера
1. **Позиция камеры** жёстко привязана к размерам: `camera.position.set(-width/2, height*0.86, camDistance)`
2. **camDistance** вычисляется динамически: `Math.max(width, depth, height) * 2.65`
3. **Изменение CABINET_CONFIG** требует обновления `BoxGeometry(width, height, depth)` в `app.js`

### Blade и CSS
1. **asset()** хелпер генерирует URL от `public/`, используйте его для всей статики
2. **`.hidden`/`.visible`** управляют видимостью через `display: none/grid` + `opacity` + `max-height` (transitions)
3. **Респонсивность**: 5 брейкпоинтов (1024px, 900px, 768px, 430px, 375px), тестируйте на мобильных

---

## Ограничения и требования

### ❌ Не делать
- **НЕ добавляйте npm build** для JS (Three.js подключается как ES6 модули напрямую из `public/js/`)
- **НЕ используйте Vite/Webpack** для `public/js/app.js` (загружается через `<script type="module">` без сборки)
- **НЕ конвертируйте app.js** в CommonJS (текущий `import` работает нативно в браузере)
- **НЕ меняйте миграции** после `php artisan migrate` (используйте новые миграции для изменений)
- **НЕ коммитьте .env** (содержит пароли БД)

### ✅ Всегда делать
- **Запускайте миграции** после изменения схемы БД (`php artisan migrate`)
- **Очищайте кеш** после изменения конфигурации (`php artisan config:clear`)
- **Используйте Blade-директивы** для условий (`@if`, `@foreach`, `@include`)
- **Документируйте JSON-форматы** для `configuration` и `equipment_positions`
- **Тестируйте WebGL** на Chrome/Firefox/Edge (НЕ IE11)

### 🔧 Рекомендации
- Используйте `php artisan make:*` для создания контроллеров/моделей/миграций
- Храните бизнес-логику в контроллерах, не в Blade
- Для AJAX: создавайте API-роуты в `routes/api.php` с JSON-ответами
- Используйте Eloquent ORM вместо прямого SQL

---

## Быстрые ответы на проблемы

### "Белый экран на /"
- `php artisan route:list` — должен быть `/` маршрут
- Проверьте `resources/views/landing/index.blade.php` существует
- Смотрите `storage/logs/laravel.log`

### "3D-сцена пустая"
- Console → `WebGL не поддерживается` или ошибки Three.js
- Elements → `#cabinet-3d-container` должен иметь ненулевые размеры
- Убедитесь `app.js` загружается как `<script type="module">`

### "Форма не реагирует"
- Console → проверьте ошибки в `selection.js`
- `data.js` загружен ДО `selection.js`
- Элементы с ID: `#location-container`, `#progress-fill`, `#continue-button` существуют

### "Иконка не видна"
- `public/assets/sprite/sprite.svg` существует (запустите `npm run build:icons`)
- Используйте `xlink:href="{{ asset('assets/sprite/sprite.svg#icon-NAME') }}"`
- Спрайт инклудится через `@include('partials.sprite')` в `app.blade.php`

### "Стили не применяются"
- Проверьте `<link href="{{ asset('css/styles.css') }}">`
- Очистите кеш браузера (Ctrl+Shift+R)
- CSS-переменные определены в `:root` блоке `styles.css`

### "Миграции не работают"
- `php artisan db:show` — проверьте подключение
- БД `3dcabinet` существует (phpMyAdmin в Laragon)
- `.env`: `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` корректны

---

## Полезные ссылки и документы

**Laravel**:
- Docs: https://laravel.com/docs/11.x
- Blade: https://laravel.com/docs/11.x/blade
- Eloquent: https://laravel.com/docs/11.x/eloquent

**Three.js**:
- Docs: https://threejs.org/docs/
- Examples: https://threejs.org/examples/

**Проектная документация**:
- `docs/QUICKSTART.md` — Инструкции запуска (миграции, сервер, браузер)
- `docs/3DCABINET_README.md` — Подробная документация структуры
- `docs/LARAGON_SETUP.md` — Настройка Laragon, PHP, vhosts, БД
- `docs/VHOST_SETUP.md` — Настройка cabinet-calc.test домена

**Важно**: Вся проектная документация находится в папке `docs/` в корне проекта. При создании новых markdown-файлов (гайдов, инструкций, технической документации) всегда размещайте их в `docs/`, а НЕ в корне проекта. Исключение — только `README.md` в корне.

---

## Deployment на production-хостинг

### Требования к хостингу

**Минимальные требования**:
- PHP 8.2+ (рекомендуется 8.3)
- MySQL 5.7+ или MariaDB 10.3+
- Composer
- Node.js 18+ (для сборки спрайтов, опционально)
- Доступ к SSH (для миграций и команд Artisan)
- Apache/Nginx с mod_rewrite

**Рекомендуемые расширения PHP**:
```
php-mbstring, php-xml, php-curl, php-zip, php-gd
php-mysql, php-pdo, php-json, php-tokenizer
php-fileinfo, php-intl
```

### Пошаговая настройка

#### 1. Подготовка файлов

**На локальной машине**:
```powershell
# Очистить кеш и сгенерировать файлы оптимизации
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Сгенерировать SVG-спрайт (если не закоммичен)
npm run build:icons

# Создать архив проекта (исключая dev-файлы)
# Не включайте: .env, node_modules/, vendor/, storage/logs/*, storage/framework/cache/*
```

**Что загружать на хостинг**:
```
✅ Загружать:
- app/, bootstrap/, config/, database/, public/, resources/, routes/
- artisan, composer.json, composer.lock
- package.json (если планируется сборка на сервере)
- .htaccess в public/

❌ НЕ загружать:
- .env (создаётся на сервере!)
- node_modules/, vendor/ (устанавливаются на сервере)
- storage/logs/*, storage/framework/cache/*
- .git/, tests/, phpunit.xml
```

#### 2. Настройка .env на production

**Создайте на сервере `/путь/к/проекту/.env`**:
```env
APP_NAME="3Cabinet"
APP_ENV=production              # ❗ ОБЯЗАТЕЛЬНО production
APP_KEY=                        # Сгенерировать: php artisan key:generate
APP_DEBUG=false                 # ❗ ОБЯЗАТЕЛЬНО false
APP_URL=https://ваш-домен.ru    # Ваш реальный URL

APP_LOCALE=ru
APP_FALLBACK_LOCALE=en

LOG_CHANNEL=daily               # Ротация логов по дням
LOG_LEVEL=error                 # Только ошибки в production

# База данных от хостинга
DB_CONNECTION=mysql
DB_HOST=localhost               # Или IP-адрес БД от хостинга
DB_PORT=3306
DB_DATABASE=имя_базы_данных     # Название БД от хостинга
DB_USERNAME=пользователь_бд     # Пользователь БД от хостинга
DB_PASSWORD="пароль_бд"         # Пароль БД (в кавычках!)

SESSION_DRIVER=database         # Сессии в БД (для нескольких серверов)
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true      # ❗ Для HTTPS
SESSION_DOMAIN=.ваш-домен.ru    # Ваш домен (с точкой для поддоменов)

CACHE_STORE=database            # Или redis, если доступен
QUEUE_CONNECTION=database       # Или redis/sqs для очередей

# Почта (настроить согласно хостингу)
MAIL_MAILER=smtp
MAIL_HOST=smtp.yandex.ru        # Или smtp.gmail.com и т.д.
MAIL_PORT=465
MAIL_USERNAME=ваш@email.ru
MAIL_PASSWORD="пароль_почты"
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@ваш-домен.ru
MAIL_FROM_NAME="${APP_NAME}"
```

**Сгенерируйте APP_KEY** (через SSH):
```bash
cd /путь/к/проекту
php artisan key:generate
```

#### 3. Установка зависимостей

**Через SSH на сервере**:
```bash
cd /путь/к/проекту

# Установить PHP-зависимости (без dev-пакетов)
composer install --no-dev --optimize-autoloader

# Если нужно пересобрать спрайт (опционально)
npm install --production
npm run build:icons
```

#### 4. Настройка прав доступа

**Критически важно!**
```bash
# Права на директории storage и bootstrap/cache
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache  # Или пользователь веб-сервера

# Или через SSH (если www-data недоступен):
chmod -R 777 storage bootstrap/cache  # Менее безопасно, но работает на shared-хостинге
```

#### 5. Запуск миграций

```bash
cd /путь/к/проекту

# Применить миграции
php artisan migrate --force  # --force нужен в production

# Заполнить БД начальными данными (если нужно)
php artisan db:seed --class=EquipmentSeeder --force
```

#### 6. Настройка веб-сервера

##### Вариант A: Apache (shared-хостинг)

**Document Root должен указывать на `public/`!**

Если хостинг не позволяет изменить Document Root, создайте `.htaccess` в корне:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

**Или используйте символическую ссылку** (если поддерживается):
```bash
ln -s /путь/к/проекту/public /home/пользователь/public_html
```

##### Вариант B: Nginx (VPS/Dedicated)

**Конфигурация Nginx** (`/etc/nginx/sites-available/3dcabinet.conf`):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ваш-домен.ru www.ваш-домен.ru;
    
    # Редирект на HTTPS (после настройки SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ваш-домен.ru www.ваш-домен.ru;
    
    root /путь/к/проекту/public;
    index index.php index.html;
    
    # SSL-сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш-домен.ru/privkey.pem;
    
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
    
    # Laravel
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;  # Или tcp://127.0.0.1:9000
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Запретить доступ к .env и другим скрытым файлам
    location ~ /\. {
        deny all;
    }
}
```

**Активируйте конфиг**:
```bash
sudo ln -s /etc/nginx/sites-available/3dcabinet.conf /etc/nginx/sites-enabled/
sudo nginx -t  # Проверить синтаксис
sudo systemctl reload nginx
```

#### 7. Оптимизация production

**После деплоя выполните**:
```bash
cd /путь/к/проекту

# Кэширование конфигурации и роутов
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Оптимизация autoloader (если не сделано через composer)
composer dump-autoload --optimize
```

**Для обновления приложения**:
```bash
# 1. Загрузить новые файлы (git pull или FTP)
# 2. Обновить зависимости
composer install --no-dev --optimize-autoloader

# 3. Очистить старый кеш
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# 4. Применить новые миграции (если есть)
php artisan migrate --force

# 5. Создать новый кеш
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Безопасность production

**Чеклист безопасности**:
- ✅ `APP_ENV=production` и `APP_DEBUG=false` в `.env`
- ✅ `.env` НЕ в публичном доступе (вне `public/`)
- ✅ Document Root строго на `public/` (не на корень проекта!)
- ✅ HTTPS с валидным SSL-сертификатом (Let's Encrypt бесплатно)
- ✅ `SESSION_SECURE_COOKIE=true` для HTTPS
- ✅ Права `storage/` и `bootstrap/cache/`: 775 или 777 (только эти папки!)
- ✅ Блокировка доступа к `.env`, `.git`, `composer.json` через Nginx/Apache
- ✅ Регулярные бэкапы БД (`mysqldump` или панель хостинга)

**Файрвол для VPS** (опционально):
```bash
# Разрешить только HTTP/HTTPS/SSH
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Мониторинг и логи

**Просмотр логов**:
```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Nginx logs (если есть доступ)
tail -f /var/log/nginx/3dcabinet-error.log

# Apache logs (shared-хостинг)
tail -f ~/logs/error_log  # Путь зависит от хостинга
```

**Очистка старых логов** (автоматизация):
```bash
# Добавить в crontab (для LOG_CHANNEL=daily)
0 0 * * * cd /путь/к/проекту && php artisan log:clear --keep=7
```

### Типичные проблемы на production

**"500 Internal Server Error"**:
- Проверьте `storage/logs/laravel.log`
- Права на `storage/` и `bootstrap/cache/`: `chmod -R 775`
- `APP_KEY` сгенерирован: `php artisan key:generate`
- `.env` файл существует и корректен

**"403 Forbidden"**:
- Document Root указывает на `public/`, не на корень
- Проверьте права: `chmod 755 public/`

**"Mix manifest not found"**:
- Проект НЕ использует Laravel Mix/Vite для `public/js`
- Убедитесь, что `public/js/`, `public/css/`, `public/assets/` загружены

**"CSRF token mismatch"**:
- Проверьте `SESSION_DOMAIN` в `.env` (должен совпадать с доменом)
- Очистите кеш: `php artisan config:clear && php artisan cache:clear`

**База данных не подключается**:
- Проверьте `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` в `.env`
- На shared-хостинге `DB_HOST` часто = `localhost`, не IP
- Пароль в кавычках: `DB_PASSWORD="пароль"`
