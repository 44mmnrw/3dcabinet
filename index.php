<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="3Cabinet — онлайн-конфигуратор серверного шкафа" />
    <title>3Cabinet — Конфигуратор</title>

    <!-- <link rel="preload" href="fonts/InterVariable.woff2" as="font" type="font/woff2"> -->
    <link rel="preload" href="fonts/InterVariable-Italic.woff2" as="font" type="font/woff2">

    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/styles.css" />
    <!-- стиль перенесен в css/styles.css -->
    </head>
<body class="body">
    <!-- Опционально: инлайн-спрайт, чтобы не грузить внешний файл и улучшить совместимость -->
    <div hidden aria-hidden="true">
        <?php /* Вставит содержимое assets/sprite/sprite.svg в DOM */ include __DIR__ . '/assets/sprite/sprite.svg'; ?>
    </div>
    <header class="header">
        <div class="container">
            <div class="header-block">
                <div class="header-logo">   
                  <a href="/" class="logo-hover-left logo-hover-right logo-hover-digits">
                    <svg class="icon-logo-box-left" width="40" height="40" role="img">
                      <use href="#icon-logo-box-left" xlink:href="#icon-logo-box-left"></use>
                    </svg>
                    <svg class="icon-logo-box-right" width="40" height="40" role="img">
                      <use href="#icon-logo-box-right" xlink:href="#icon-logo-box-right"></use>
                    </svg>
                    <svg class="icon-logo-digits" width="70" height="70" role="img">
                      <use href="#icon-logo-digits" xlink:href="#icon-logo-digits"></use>
                    </svg>
                    </a>
                </div>
                <nav class="header-nav">
                    <ul class="header-nav-list">
                        <li class="header-nav-item"><a class="header-nav-link" href="/">Конфигуратор</a></li>
                        <li class="header-nav-item"><a class="header-nav-link" href="/">Возможности</a></li>
                        <li class="header-nav-item"><a class="header-nav-link" href="/">Документация</a></li>
                        <li class="header-nav-item"><a class="header-nav-link" href="/">Поддержка</a></li>
                    </ul>
                </nav>
                <div class="header-actions">
                    <button class="button white-button" type="button">Войти</button>
                    <button class="button blue-button" type="button">Создать проект</button>
                </div>
            </div>
        </div>    
    </header>
    <main class="main">
        <div class="container">
            <h1 class="main-title">Конфигуратор серверного шкафа</h1>
            <p class="main-description">С помощью 3Cabinet вы можете легко спроектировать свой идеальный серверный шкаф.</p>
            <button class="button blue-button" type="button">Начать конфигурацию</button>
        </div>
    </main>

</body>
</html>