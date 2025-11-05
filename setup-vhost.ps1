# Скрипт автоматической настройки виртуального хоста
# Запустите PowerShell от имени администратора!

Write-Host "=== Настройка виртуального хоста cabinet-calc.test ===" -ForegroundColor Cyan
Write-Host ""

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ОШИБКА: Требуются права администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора и повторите попытку." -ForegroundColor Yellow
    pause
    exit 1
}

# Путь к файлу hosts
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostname = "cabinet-calc.test"

# Проверка наличия записи
$hostsContent = Get-Content $hostsPath
$entryExists = $hostsContent | Select-String -Pattern $hostname -Quiet

if ($entryExists) {
    Write-Host "✓ Запись '$hostname' уже существует в файле hosts" -ForegroundColor Green
} else {
    Write-Host "Добавление записи '$hostname' в файл hosts..." -ForegroundColor Yellow
    
    # Добавление записи
    Add-Content -Path $hostsPath -Value "`n127.0.0.1    $hostname"
    
    Write-Host "✓ Запись успешно добавлена!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Проверка конфигурации Apache ===" -ForegroundColor Cyan

$apacheConfigPath = "C:\laragon\etc\apache2\sites-enabled\cabinet-calc.test.conf"

if (Test-Path $apacheConfigPath) {
    Write-Host "✓ Конфигурация Apache найдена: $apacheConfigPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Конфигурация Apache не найдена!" -ForegroundColor Yellow
    Write-Host "  Создайте файл: $apacheConfigPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Перезапуск Apache ===" -ForegroundColor Cyan

# Поиск процессов Apache
$apacheProcesses = Get-Process httpd -ErrorAction SilentlyContinue

if ($apacheProcesses) {
    Write-Host "Apache запущен. Перезапустите Apache в Laragon для применения изменений." -ForegroundColor Yellow
    Write-Host "Laragon → Stop All → Start All" -ForegroundColor White
} else {
    Write-Host "Apache не запущен. Запустите его в Laragon." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Очистка DNS кеша ===" -ForegroundColor Cyan
ipconfig /flushdns | Out-Null
Write-Host "✓ DNS кеш очищен" -ForegroundColor Green

Write-Host ""
Write-Host "=== Готово! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Откройте в браузере:" -ForegroundColor White
Write-Host "  http://$hostname" -ForegroundColor Cyan
Write-Host "  http://$hostname/app" -ForegroundColor Cyan
Write-Host "  http://$hostname/admin" -ForegroundColor Cyan
Write-Host ""

pause
