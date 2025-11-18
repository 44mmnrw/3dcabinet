<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3Cabinet - Legacy Configurator</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; font-family: Arial, sans-serif; }
        .legacy-badge {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff6b6b;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="legacy-badge">Legacy Version (Vanilla JS)</div>
    <iframe 
        src="{{ asset('legacy-configurator.html') }}" 
        style="width: 100vw; height: 100vh; border: none;"
    ></iframe>
</body>
</html>
