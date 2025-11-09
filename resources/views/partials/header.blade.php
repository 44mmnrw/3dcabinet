<!-- HEADER -->
<header class="header">
    <div class="container">
        <div class="header-block">
            <!-- Логотип -->
            <div class="header-logo">   
                <a href="{{ route('landing') }}" class="logo-hover-left logo-hover-right logo-hover-digits">
                    <svg class="icon-logo-box-left" width="40" height="40" role="img">
                        <use xlink:href="#icon-logo-box-left"></use>
                    </svg>
                    <svg class="icon-logo-box-right" width="40" height="40" role="img">
                        <use xlink:href="#icon-logo-box-right"></use>
                    </svg>
                    <svg class="icon-logo-digits" width="70" height="70" role="img">
                        <use xlink:href="#icon-logo-digits"></use>
                    </svg>
                </a>
            </div>

            <!-- Навигация -->
            <nav class="header-nav">
                <ul class="header-nav-list">
                    <li class="header-nav-item">
                        <a class="header-nav-link" href="{{ route('landing') }}">Конфигуратор</a>
                    </li>
                    <li class="header-nav-item">
                        <a class="header-nav-link" href="{{ route('landing') }}#features">Возможности</a>
                    </li>
                    <li class="header-nav-item">
                        <a class="header-nav-link" href="{{ route('landing') }}#documentation">Документация</a>
                    </li>
                    <li class="header-nav-item">
                        <a class="header-nav-link" href="{{ route('landing') }}#support">Поддержка</a>
                    </li>
                </ul>
            </nav>

            <!-- Кнопки действий -->
            <div class="header-actions">
                <button class="button white-button" type="button">Войти</button>
                <a href="{{ route('configurator') }}" class="button blue-button">Создать проект</a>
            </div>
        </div>
    </div>    
</header>
