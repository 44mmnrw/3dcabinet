<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3Cabinet — React Конфигуратор</title>
    <meta name="description" content="3D конфигуратор серверных шкафов с React UI">
    
    {{-- Development: прямое подключение к Vite dev-серверу на порту 5174 --}}
    <script type="module" src="http://localhost:5174/@vite/client"></script>
    <script type="module" src="http://localhost:5174/resources/js/app.jsx"></script>
</head>
<body style="margin: 0; padding: 0; overflow: hidden; font-family: Arial, sans-serif;">
    <div id="root"></div>
    
    {{-- Container для Three.js сцены (будет использован React) --}}
    <div id="scene-container" style="display: none;"></div>
</body>
</html>
