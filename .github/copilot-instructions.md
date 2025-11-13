# 3Cabinet — Copilot Guide (коротко)

- Архитектура: Laravel 11 + Blade на сервере; фронт — Vanilla JS + Three.js r167 как ES-модули без сборки. Данные — MySQL через Eloquent. Вся статика в `public/`.
- Роуты: `/` → `LandingController` → `resources/views/landing/index.blade.php`; `/app` → `ConfiguratorController` → `configurator/index.blade.php`; `/admin` → `AdminController` → `admin/index.blade.php` (см. `routes/web.php`).
- Ключевые файлы: `public/js/app.js` (Three.js сцена), `public/js/data.js` (глобальные `CABINET_CONFIG`, `EQUIPMENT_DATA`), `public/js/selection.js` (IIFE логика формы), `resources/views/layouts/app.blade.php` (мастер-шаблон), `database/seeders/EquipmentSeeder.php`.
- Загрузка скриптов: в Blade используйте порядок `data.js` → `app.js` (`type="module"`) → `selection.js` через `@push('scripts')` (см. инвариант в docs). Не добавляйте сборщик/Vite для `public/js`.
- Three.js: размеры шкафа и позиция камеры завязаны на `CABINET_CONFIG`. При изменении `units` пересчитывается высота ($42 × 44.45$ мм по умолчанию) и обновляется `BoxGeometry` + камера в `app.js`.
- Структуры данных: `EQUIPMENT_DATA[{ id, name, units(1–4), power, weight, depth, category }]`; `CABINET_CONFIG{ name, units, width, depth, maxWeight, maxPower }`. Категории соответствуют UI-фильтрам.
- UI-паттерны: классы состояния `.hidden/.visible`, `.active`, `.disabled-button`; radio скрыты, выбор идёт по клику по `.select-card` с синхронизацией `.active` и `checked`.
- Генерация SVG-спрайта: кладите SVG в `public/assets/icons/`, затем `npm run build:icons` → используйте `<use xlink:href="{{ asset('assets/sprite/sprite.svg#icon-NAME') }}">`. Спрайт инклюдится через `@include('partials.sprite')`.
- Разработка (Windows/Laragon):
  - `php artisan migrate` → `php artisan db:seed --class=EquipmentSeeder` → `php artisan serve` → http://localhost:8000
  - Полезно: `php artisan route:list`, `php artisan config:clear`, `php artisan cache:clear`.
- БД и миграции: не редактируйте существующие миграции после применения — создавайте новые. Внешние ключи: `cabinet_configurations.project_id` → `projects.id`. JSON-поля: `projects.configuration`, `cabinet_configurations.equipment_positions`.
- Ограничения: не добавляйте сборку для JS, не конвертируйте `app.js` в CJS, не переносите статику из `public/`. Используйте Blade `asset()` для всех URL.
- Отладка 3D: проверьте размеры контейнера `#cabinet-3d-container`, поддержку WebGL в консоли, порядок подключения скриптов. Для формы — ищите `.select-card.active` и `input:checked` в DevTools.
- Стиль и ответственность: минимальные точечные изменения, без затрагивания несвязанных частей; храните бизнес-логику в контроллерах, а не в Blade; для AJAX — `routes/api.php` с JSON.
- Частые задачи:
  - Добавить оборудование: правьте `public/js/data.js` и/или сидер `EquipmentSeeder`, затем `php artisan db:seed`.
  - Изменить параметры шкафа: обновите `CABINET_CONFIG` в `data.js` и соответствующую геометрию/камеру в `app.js`.
  - Обновить стили: редактируйте CSS-переменные в `public/css/styles.css` и используйте существующие классы состояний.
- Продакшен: DocumentRoot указывает на `public/`; генерируйте `APP_KEY`, права на `storage/` и `bootstrap/cache/`, используйте `php artisan config:cache route:cache view:cache`. Подробности — `docs/DEPLOYMENT.md` и `docs/TIMEWEB_DEPLOYMENT.md`.
- Справочники и примеры: в `docs/` есть QUICKSTART, THREE_JS_SETUP, MODEL_STRUCTURE, EQUIPMENT_LOADING_ARCHITECTURE, RENDERING_QUALITY_GUIDE и др. Опираться на них при изменениях.

Если что-то неочевидно (например, формат `equipment_positions` в БД или взаимосвязь камеры и геометрии), уточните — расширим раздел краткими примерами кода и ссылками на конкретные файлы.

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
