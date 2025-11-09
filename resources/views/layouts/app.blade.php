<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="@yield('meta_description', '3Cabinet — онлайн-конфигуратор серверного шкафа')" />
    <title>@yield('title', '3Cabinet — Конфигуратор')</title>
    
    <!-- Preload Fonts -->
    <link rel="preload" href="{{ asset('fonts/InterVariable.woff2') }}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="{{ asset('fonts/InterVariable-Italic.woff2') }}" as="font" type="font/woff2" crossorigin>
    
    <!-- Styles -->
    <link rel="stylesheet" href="{{ asset('css/reset.css') }}">
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    @stack('styles')
</head>
<body class="body">
    <!-- SVG-спрайт -->
    <div style="display:none">
        @include('partials.sprite')
    </div>

    @include('partials.header')

    @yield('content')

    @include('partials.footer')

    <!-- Scripts -->
    @stack('scripts')
</body>
</html>
