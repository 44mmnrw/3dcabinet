# ✅ Pre-Deployment Checklist — 3Cabinet

Используйте этот чеклист перед деплоем на production-сервер.

---

## 📦 Подготовка файлов

- [ ] **Проект собран локально**
  ```powershell
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  npm run build:icons
  ```

- [ ] **Git коммиты актуальны**
  ```powershell
  git status
  git add .
  git commit -m "Подготовка к деплою"
  git push origin main
  ```

- [ ] **`.gitignore` настроен**
  - ✅ `.env` в игноре
  - ✅ `node_modules/` в игноре
  - ✅ `vendor/` в игноре
  - ✅ `storage/logs/` в игноре

- [ ] **Все файлы `public/` готовы**
  - ✅ `public/js/` (app.js, data.js, Three.js)
  - ✅ `public/css/` (styles.css, reset.css)
  - ✅ `public/assets/sprite/sprite.svg`
  - ✅ `public/fonts/` (InterVariable.woff2)

---

## 🔧 Конфигурация сервера

### Требования проверены

- [ ] **PHP 8.2+** установлен
  ```bash
  php -v
  ```

- [ ] **Расширения PHP** установлены
  ```bash
  php -m | grep -E 'mbstring|xml|curl|zip|gd|mysql|pdo|json|tokenizer'
  ```

- [ ] **Composer** установлен
  ```bash
  composer --version
  ```

- [ ] **MySQL/MariaDB** установлен и запущен
  ```bash
  mysql --version
  ```

- [ ] **Node.js** установлен (опционально, для спрайтов)
  ```bash
  node --version
  ```

### База данных создана

- [ ] **БД создана** в панели хостинга или через MySQL
  ```sql
  CREATE DATABASE 3dcabinet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

- [ ] **Пользователь БД создан** и имеет права
  ```sql
  CREATE USER '3dcabinet_user'@'localhost' IDENTIFIED BY 'пароль';
  GRANT ALL PRIVILEGES ON 3dcabinet.* TO '3dcabinet_user'@'localhost';
  FLUSH PRIVILEGES;
  ```

---

## 📄 Файл .env настроен

- [ ] **Файл .env создан** на сервере
  ```bash
  cp .env.production.example .env
  nano .env
  ```

### Основные настройки

- [ ] **APP_ENV=production**
  ```env
  APP_ENV=production
  ```

- [ ] **APP_DEBUG=false**
  ```env
  APP_DEBUG=false
  ```

- [ ] **APP_URL** указан с https://
  ```env
  APP_URL=https://ваш-домен.ru
  ```

- [ ] **APP_KEY** сгенерирован
  ```bash
  php artisan key:generate
  ```

### База данных

- [ ] **DB_HOST** указан (обычно `localhost`)
  ```env
  DB_HOST=localhost
  ```

- [ ] **DB_DATABASE** указано название БД
  ```env
  DB_DATABASE=3dcabinet
  ```

- [ ] **DB_USERNAME** указан пользователь
  ```env
  DB_USERNAME=3dcabinet_user
  ```

- [ ] **DB_PASSWORD** указан пароль (в кавычках!)
  ```env
  DB_PASSWORD="сильный-пароль"
  ```

### Сессии и безопасность

- [ ] **SESSION_DRIVER=database**
  ```env
  SESSION_DRIVER=database
  ```

- [ ] **SESSION_SECURE_COOKIE=true** (для HTTPS)
  ```env
  SESSION_SECURE_COOKIE=true
  ```

- [ ] **SESSION_DOMAIN** указан домен с точкой
  ```env
  SESSION_DOMAIN=.ваш-домен.ru
  ```

### Логирование

- [ ] **LOG_CHANNEL=daily**
  ```env
  LOG_CHANNEL=daily
  ```

- [ ] **LOG_LEVEL=error**
  ```env
  LOG_LEVEL=error
  ```

---

## 🗂️ Установка и настройка

- [ ] **Зависимости установлены**
  ```bash
  composer install --no-dev --optimize-autoloader
  ```

- [ ] **Права на директории установлены**
  ```bash
  chmod -R 775 storage bootstrap/cache
  chown -R www-data:www-data storage bootstrap/cache  # Или юзер веб-сервера
  ```

- [ ] **Миграции применены**
  ```bash
  php artisan migrate --force
  ```

- [ ] **Сидеры запущены** (если нужно)
  ```bash
  php artisan db:seed --class=EquipmentSeeder --force
  ```

- [ ] **Кэш создан**
  ```bash
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  ```

---

## 🌐 Настройка веб-сервера

### Document Root

- [ ] **Document Root указывает на `public/`**
  - Apache: `/путь/к/проекту/public`
  - Nginx: `root /путь/к/проекту/public;`

### Apache

- [ ] **`.htaccess` присутствует** в `public/`
  ```bash
  ls -la public/.htaccess
  ```

- [ ] **mod_rewrite включен**
  ```bash
  # Debian/Ubuntu
  sudo a2enmod rewrite
  sudo systemctl restart apache2
  ```

### Nginx

- [ ] **Конфиг создан** в `/etc/nginx/sites-available/`
  ```bash
  sudo nano /etc/nginx/sites-available/3dcabinet.conf
  ```

- [ ] **Конфиг активирован**
  ```bash
  sudo ln -s /etc/nginx/sites-available/3dcabinet.conf /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

### SSL/HTTPS

- [ ] **SSL-сертификат получен** (Let's Encrypt)
  ```bash
  sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
  ```

- [ ] **Редирект на HTTPS** настроен
  - Apache: `RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]`
  - Nginx: `return 301 https://$server_name$request_uri;`

---

## 🔒 Безопасность

- [ ] **`.env` не в публичном доступе**
  ```bash
  chmod 600 .env
  ```

- [ ] **Доступ к скрытым файлам запрещён**
  - Nginx: `location ~ /\. { deny all; }`
  - Apache: уже в `.htaccess`

- [ ] **Права на файлы корректны**
  ```bash
  # Только storage/ и bootstrap/cache/ должны быть 775/777
  chmod -R 755 .
  chmod -R 775 storage bootstrap/cache
  ```

- [ ] **Файрвол настроен** (для VPS)
  ```bash
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 80/tcp    # HTTP
  sudo ufw allow 443/tcp   # HTTPS
  sudo ufw enable
  ```

---

## 🧪 Тестирование

### Проверка конфигурации

- [ ] **Подключение к БД работает**
  ```bash
  php artisan db:show
  ```

- [ ] **Роуты загружены**
  ```bash
  php artisan route:list
  ```

- [ ] **Конфигурация корректна**
  ```bash
  php artisan config:show
  ```

### Проверка в браузере

- [ ] **Главная страница `/` открывается**
  - Без ошибок 500
  - Стили загружаются
  - SVG-иконки отображаются

- [ ] **3D-конфигуратор `/app` работает**
  - WebGL инициализируется
  - Шкаф отрисовывается
  - OrbitControls работают

- [ ] **Админка `/admin` доступна**
  - Страница открывается
  - Стили применены

### Проверка логов

- [ ] **Нет ошибок в Laravel логах**
  ```bash
  tail -f storage/logs/laravel.log
  ```

- [ ] **Нет ошибок в логах веб-сервера**
  ```bash
  # Nginx
  tail -f /var/log/nginx/error.log
  
  # Apache
  tail -f /var/log/apache2/error.log
  ```

---

## 📊 Мониторинг и обслуживание

### Резервное копирование

- [ ] **БД бэкапится регулярно**
  ```bash
  # Ручной бэкап
  mysqldump -u пользователь -p 3dcabinet > backup_$(date +%Y%m%d).sql
  
  # Или настроить cron:
  0 2 * * * mysqldump -u пользователь -p пароль 3dcabinet > /backups/db_$(date +\%Y\%m\%d).sql
  ```

- [ ] **Файлы проекта бэкапятся**
  ```bash
  # Через rsync или tar
  tar -czf backup_project_$(date +%Y%m%d).tar.gz /путь/к/проекту
  ```

### Обновления

- [ ] **Процедура обновления документирована**
  ```bash
  # См. DEPLOYMENT.md раздел "Обновление приложения"
  git pull
  composer install --no-dev
  php artisan migrate --force
  php artisan cache:clear
  php artisan config:cache
  ```

- [ ] **Автообновление SSL настроено**
  ```bash
  # Certbot автоматически добавляет cron job
  certbot renew --dry-run  # Проверка
  ```

---

## ✅ Финальная проверка

- [ ] **Сайт работает по HTTPS**
- [ ] **Все страницы открываются без ошибок**
- [ ] **3D-визуализация работает**
- [ ] **Нет предупреждений в консоли браузера**
- [ ] **Логи чистые (нет ошибок)**
- [ ] **Бэкапы настроены**
- [ ] **Документация обновлена**

---

## 🎉 Готово к production!

Если все пункты отмечены — ваш сайт готов к работе на боевом сервере.

**Полезные ссылки**:
- [DEPLOYMENT.md](DEPLOYMENT.md) — Подробная инструкция деплоя
- [HOSTING_SETUP.md](HOSTING_SETUP.md) — Настройка популярных хостингов
- [.env.production.example](.env.production.example) — Шаблон .env для production
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — Инструкции для AI-агентов

---

**Дата проверки**: _______________  
**Кто проверял**: _______________  
**Версия**: _______________
