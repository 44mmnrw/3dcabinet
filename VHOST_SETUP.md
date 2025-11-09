# Инструкция по настройке виртуального хоста cabinet-calc.test

## Шаги для настройки:

### 1. Виртуальный хост Apache уже создан
Файл: `C:\laragon\etc\apache2\sites-enabled\cabinet-calc.test.conf`

### 2. Добавьте запись в файл hosts

**ВАЖНО: Требуются права администратора!**

#### Способ 1: Через Laragon Menu
1. Откройте Laragon
2. Меню → Preferences → Services & Ports
3. Нажмите кнопку "Add to hosts"
4. Введите: `cabinet-calc.test`

#### Способ 2: Вручную (требуется PowerShell от администратора)

Запустите PowerShell **от имени администратора** и выполните:

```powershell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n127.0.0.1    cabinet-calc.test"
```

Или откройте файл в Блокноте от администратора:
```
C:\Windows\System32\drivers\etc\hosts
```

И добавьте в конец файла:
```
127.0.0.1    cabinet-calc.test
```

### 3. Перезапустите Apache в Laragon

В Laragon:
1. Нажмите "Stop All"
2. Нажмите "Start All"

Или через меню:
- Apache → Reload

### 4. Проверьте доступ

Откройте в браузере:
- **http://cabinet-calc.test** - Главная страница
- **http://cabinet-calc.test/app** - 3D Конфигуратор
- **http://cabinet-calc.test/admin** - Админ панель

## Проверка настройки

### Проверка hosts файла:
```powershell
Get-Content "C:\Windows\System32\drivers\etc\hosts" | Select-String "cabinet-calc"
```

### Проверка Apache конфигурации:
```powershell
Get-Content "C:\laragon\etc\apache2\sites-enabled\cabinet-calc.test.conf"
```

### Тест DNS:
```powershell
ping cabinet-calc.test
```

Должен ответить: `127.0.0.1`

## Альтернативный домен

Если хотите использовать `3dcabinet.test` вместо `cabinet-calc.test`:

1. Измените в файле конфигурации Apache:
```apache
ServerName 3dcabinet.test
ServerAlias *.3dcabinet.test
```

2. Добавьте в hosts:
```
127.0.0.1    3dcabinet.test
```

3. Перезапустите Apache

## Устранение проблем

### "Не удается открыть страницу"
- Проверьте, что Apache запущен в Laragon
- Проверьте запись в hosts файле
- Очистите кеш DNS: `ipconfig /flushdns`

### Ошибка 403 Forbidden
- Проверьте права доступа к папке `C:\laragon\www\cabinet-calc\public`
- Убедитесь, что в конфигурации указан правильный путь

### Страница показывает список файлов
- Проверьте, что DocumentRoot указывает на `/public`
- Убедитесь, что файл `index.php` существует в `/public`
