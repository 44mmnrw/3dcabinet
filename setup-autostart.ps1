# Скрипт создания задачи в Windows Task Scheduler
# Запустить от имени администратора: .\setup-autostart.ps1

$taskName = "3DCabinet Vite Dev Server"
$projectPath = "C:\laragon\www\3dcabinet"
$viteCommand = "npm run dev"

# Проверка, существует ли задача
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Задача '$taskName' уже существует" -ForegroundColor Yellow
    $answer = Read-Host "Удалить и пересоздать? (y/n)"
    
    if ($answer -eq 'y') {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "✅ Старая задача удалена" -ForegroundColor Green
    } else {
        Write-Host "❌ Отменено" -ForegroundColor Red
        exit 0
    }
}

# Создание action (запуск PowerShell с npm run dev)
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command `"cd '$projectPath'; $viteCommand`"" `
    -WorkingDirectory $projectPath

# Создание trigger (запуск при входе в систему)
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Создание настроек задачи
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) # Без ограничения по времени

# Создание principal (запуск от текущего пользователя)
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Регистрация задачи
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Автоматический запуск Vite dev server для проекта 3DCabinet"

Write-Host ""
Write-Host "✅ Задача '$taskName' создана успешно!" -ForegroundColor Green
Write-Host ""
Write-Host "Теперь Vite будет автоматически запускаться при входе в Windows" -ForegroundColor Cyan
Write-Host ""
Write-Host "Управление задачей:" -ForegroundColor Yellow
Write-Host "  - Просмотр: taskschd.msc -> 'Библиотека планировщика заданий'" -ForegroundColor Gray
Write-Host "  - Запуск вручную: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "  - Остановка: Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "  - Удаление: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
