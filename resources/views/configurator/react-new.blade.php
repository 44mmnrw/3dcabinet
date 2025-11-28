<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3Cabinet React</title>
    
    {{-- Critical CSS для LCP элемента (right-panel-description) --}}
    <style>
        /* Critical CSS для правой панели - загружается немедленно */
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: #f5f5f5;
            color: #212529;
        }
        #root {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            position: relative;
        }
        /* Pre-rendered right panel для LCP */
        .configurator-right-panel-preload {
            position: absolute;
            top: 0;
            right: 0;
            width: 360px;
            background: #fff;
            border-left: 1px solid #dee2e6;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
            z-index: 1;
        }
        .right-panel-header-preload {
            padding: 1.5rem 1.25rem;
            border-bottom: 1px solid #dee2e6;
            background: #f8f9fa;
        }
        .right-panel-title-preload {
            font-size: 1.125rem;
            font-weight: 700;
            color: #212529;
            margin: 0 0 0.5rem 0;
        }
        .right-panel-description {
            font-size: 0.875rem;
            color: #6c757d;
            margin: 0;
            line-height: 1.5;
        }
        /* Скрываем pre-rendered контент после загрузки React */
        .react-loaded .configurator-right-panel-preload {
            display: none;
        }
    </style>
    
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/frontend/app.tsx'])
</head>
<body>
    <!-- SVG-спрайт (скрыт) -->
    <div style="display: none;">
        @include('partials.sprite')
    </div>
    
    {{-- Pre-rendered HTML для LCP элемента --}}
    <div class="configurator-right-panel-preload">
        <div class="right-panel-header-preload">
            <h3 class="right-panel-title-preload">Потребляемая мощность оборудования</h3>
            <p class="right-panel-description">Укажите диапазон потребляемой мощности оборудования</p>
        </div>
    </div>
    
    <div id="root"></div>
    
    {{-- Скрипт для скрытия pre-rendered контента после загрузки React --}}
    <script>
        // Помечаем body как загруженный после монтирования React
        document.addEventListener('DOMContentLoaded', function() {
            // Небольшая задержка для гарантии, что React начал рендеринг
            setTimeout(function() {
                document.body.classList.add('react-loaded');
            }, 100);
        });
    </script>
</body>
</html>
