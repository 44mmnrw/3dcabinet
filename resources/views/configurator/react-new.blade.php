<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3Cabinet React</title>
    
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/frontend/app.jsx'])
</head>
<body>
    <!-- SVG-спрайт (скрыт) -->
    <div style="display: none;">
        @include('partials.sprite')
    </div>
    <div id="root"></div>
</body>
</html>
