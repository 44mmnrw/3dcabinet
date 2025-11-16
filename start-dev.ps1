# Скрипт автозапуска Vite dev server
# Использование: .\start-dev.ps1

$vitePath = "C:\laragon\www\3dcabinet"
$viteProcessName = "node"

# Проверка, запущен ли уже Vite
$viteRunning = Get-Process -Name $viteProcessName -ErrorAction SilentlyContinue | 
    Where-Object { $_.MainWindowTitle -like "*vite*" -or $_.CommandLine -like "*vite*" }

if ($viteRunning) {
    Write-Host "✅ Vite уже запущен (PID: $($viteRunning.Id))" -ForegroundColor Green
    exit 0
}

# Проверка, занят ли порт 5174
$portInUse = netstat -ano | Select-String ":5174" | Select-String "LISTENING"

if ($portInUse) {
    Write-Host "⚠️  Порт 5174 занят, но процесс Vite не найден" -ForegroundColor Yellow
    Write-Host "Попробуйте вручную: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Запуск Vite в фоновом режиме
Write-Host "🚀 Запуск Vite dev server..." -ForegroundColor Cyan

# Переход в директорию проекта
Set-Location $vitePath

# Запуск в новом окне PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$vitePath'; npm run dev" -WindowStyle Normal

Write-Host "✅ Vite запускается в отдельном окне" -ForegroundColor Green
Write-Host "📍 URL: http://localhost:5174/" -ForegroundColor Cyan
Write-Host "📍 APP: http://3dcabinet.test/configurator" -ForegroundColor Cyan
