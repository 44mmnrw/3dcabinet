<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="3Cabinet — онлайн-конфигуратор серверного шкафа" />
    <title>3Cabinet — Конфигуратор</title>

    <link rel="preload" href="fonts/InterVariable.woff2" as="font" type="font/woff2">
    <link rel="preload" href="fonts/InterVariable-Italic.woff2" as="font" type="font/woff2">

    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="body">    
    <!-- SVG спрайт -->
    <div hidden aria-hidden="true">
        <?php include __DIR__ . '/assets/sprite/sprite.svg'; ?>
    </div>

    <!-- HEADER -->
    <header class="header">
        <div class="container">
            <div class="header-block">
                <!-- Логотип -->
                <div class="header-logo">   
                    <a href="/" class="logo-hover-left logo-hover-right logo-hover-digits">
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
                            <a class="header-nav-link" href="/">Конфигуратор</a>
                        </li>
                        <li class="header-nav-item">
                            <a class="header-nav-link" href="/">Возможности</a>
                        </li>
                        <li class="header-nav-item">
                            <a class="header-nav-link" href="/">Документация</a>
                        </li>
                        <li class="header-nav-item">
                            <a class="header-nav-link" href="/">Поддержка</a>
                        </li>
                    </ul>
                </nav>

                <!-- Кнопки действий -->
                <div class="header-actions">
                    <button class="button white-button" type="button">Войти</button>
                    <button class="button blue-button" type="button">Создать проект</button>
                </div>
            </div>
        </div>    
    </header>

    <!-- MAIN CONTENT -->
    <main class="content">
        <div class="container">
            <!-- СЕКЦИЯ 1: Форма выбора параметров -->
            <section class="first-section">
                <!-- Левая часть: Введение -->
                <div class="intro">
                    <div class="intro-header">
                        <h1 class="main-title">Создайте идеальный шкаф за несколько минут</h1>
                        <p class="main-description">Интеллектуальная система подбора и конфигурирования шкафного оборудования</p>
                    </div>
                    <div class="intro-list">                        
                        <ul>
                            <li>
                                <span class="icon-check-list">
                                    <svg role="img">
                                        <use xlink:href="#icon-check-list"></use>
                                    </svg>
                                </span>
                                Автоматический расчет параметров
                            </li>
                            <li>
                                <span class="icon-check-list">
                                    <svg role="img">
                                        <use xlink:href="#icon-check-list"></use>
                                    </svg>
                                </span>
                                3D-визуализация в реальном времени
                            </li>
                            <li>
                                <span class="icon-check-list">
                                    <svg role="img">
                                        <use xlink:href="#icon-check-list"></use>
                                    </svg>
                                </span>
                                Готовая документация и спецификации
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Правая часть: Форма выбора -->
                <div class="selection">
                    <h2 class="selection-title">Начнем с основных<br> параметров</h2>
                    <p class="selection-description">Ответьте на 2 вопроса, и мы подберем оптимальный шкаф</p>
                    
                    <div class="step-info" id="step-label"></div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>

                    <!-- Вопрос 1: Место установки -->
                    <h3 class="selection-title2">Место установки шкафа</h3>
                    <div class="buttons-container" id="location-container">
                        <label class="select-card">
                            <input type="radio" name="location">
                            <span class="custom-radio">
                                <svg class="checkmark-icon" viewBox="0 0 16 16" width="14" height="14">
                                    <use xlink:href="#icon-check-list"></use>
                                </svg>
                            </span>
                            <div class="content">
                                <div class="icon-select">
                                    <svg role="img">
                                        <use xlink:href="#icon-house"></use>
                                        <rect class="icon-decoration"/>
                                    </svg>
                                </div>
                                <div class="select-card-title">В помещении</div>
                                <div class="select-card-desc">Серверная, ЦОД, офис</div>
                            </div>
                        </label>
                        
                        <label class="select-card">
                            <input type="radio" name="location">
                            <span class="custom-radio">
                                <svg class="checkmark-icon" viewBox="0 0 16 16" width="14" height="14">
                                    <use xlink:href="#icon-check-list"></use>
                                </svg>
                            </span>
                            <div class="content">
                                <div class="icon-select">
                                    <svg role="img">
                                        <use xlink:href="#icon-cloud"></use>
                                        <rect class="icon-decoration"/>
                                    </svg>
                                </div>
                                <div class="select-card-title">На улице</div>
                                <div class="select-card-desc">Дождь, снег, гроза</div>
                            </div>
                        </label>
                    </div>

                    <!-- Вопрос 2: Тип установки (скрытый по умолчанию) -->
                    <h3 class="selection-title2" id="installation-title">Тип установки</h3>
                    <div class="buttons-container hidden" id="installation-container">
                        <label class="select-card">
                            <input type="radio" name="installation">
                            <span class="custom-radio">
                                <svg class="checkmark-icon" viewBox="0 0 16 16" width="14" height="14">
                                    <use xlink:href="#icon-check-list"></use>
                                </svg>
                            </span>
                            <div class="content">
                                <div class="icon-select">
                                    <svg role="img">
                                        <use xlink:href="#icon-box"></use>
                                        <rect class="icon-decoration"/>
                                    </svg>
                                </div>
                                <div class="select-card-title">Напольный</div>
                                <div class="select-card-desc">Стационарная установка</div>
                            </div>
                        </label>
                        
                        <label class="select-card">
                            <input type="radio" name="installation" value="wall">
                            <span class="custom-radio">
                                <svg class="checkmark-icon" viewBox="0 0 16 16" width="14" height="14">
                                    <use xlink:href="#icon-check-list"></use>
                                </svg>
                            </span>
                            <div class="content">
                                <div class="icon-select">
                                    <svg role="img" width="40" height="40">
                                        <use xlink:href="#icon-on-wall"></use>
                                    </svg>
                                </div>
                                <div class="select-card-title">Настенный</div>
                                <div class="select-card-desc">Крепление на стене или опоре</div>
                            </div>
                        </label>
                    </div>

                    <!-- Кнопка продолжения -->
                    <button class="button blue-button disabled-button" type="button" id="continue-button" disabled>
                        Перейти к конфигурированию →
                    </button>
                </div>
            </section>

            <!-- СЕКЦИЯ 2: Шаги процесса -->
            <section class="second-section">
                <div class="second-section-header">
                    <h2 class="section-title">Четыре простых шага до готового проекта</h2>
                </div>
                
                <div class="steps-container">
                    <!-- Шаг 1 -->
                    <div class="step-card">
                        <div class="step-number">1</div>
                        <div class="step-icon">
                            <svg role="img">
                                <use xlink:href="#icon-cloud"></use>
                            </svg>
                        </div>
                        <h3 class="step-title">Укажите параметры</h3>
                        <p class="step-description">Выберите тип шкафа, место установки и основные характеристики оборудования</p>
                    </div>

                    <!-- Шаг 2 -->
                    <div class="step-card">
                        <div class="step-number">2</div>
                        <div class="step-icon">
                            <svg role="img">
                                <use xlink:href="#icon-cloud"></use>
                            </svg>
                        </div>
                        <h3 class="step-title">Укажите параметры</h3>
                        <p class="step-description">Выберите тип шкафа, место установки и основные характеристики оборудования</p>
                    </div>

                    <!-- Шаг 3 -->
                    <div class="step-card">
                        <div class="step-number">3</div>
                        <div class="step-icon">
                            <svg role="img">
                                <use xlink:href="#icon-cloud"></use>
                            </svg>
                        </div>
                        <h3 class="step-title">Укажите параметры</h3>
                        <p class="step-description">Выберите тип шкафа, место установки и основные характеристики оборудования</p>
                    </div>

                    <!-- Шаг 4 -->
                    <div class="step-card">
                        <div class="step-number">4</div>
                        <div class="step-icon">
                            <svg role="img">
                                <use xlink:href="#icon-cloud"></use>
                            </svg>
                        </div>
                        <h3 class="step-title">Укажите параметры</h3>
                        <p class="step-description">Выберите тип шкафа, место установки и основные характеристики оборудования</p>
                    </div>
                </div>
            </section>

            <!-- СЕКЦИЯ 3: Промо-баннер -->
            <section class="third-section">
                <div class="third-section-header">
                    <h2 class="section-title">Интуитивный интерфейс конфигурирования</h2>
                    <p class="section-description">Drag-and-drop размещение оборудования с автоматической проверкой совместимости</p>
                </div>
                
                <div class="promo-banner-wrapper">
                    <div class="promo-banner">
                        <!-- Левая колонка: Каталог оборудования -->
                        <div class="promo-banner-left">
                            <div class="banner-left-content">
                                <h4 class="promo-banner-heading">Каталог оборудования</h4>
                                
                                <div class="equipment-item">
                                    <div class="equipment-icon">
                                        <div class="icon-wrapper"></div>
                                    </div>
                                    <div class="equipment-details">
                                        <div class="equipment-info"></div>
                                        <div class="equipment-action"></div>
                                    </div>
                                </div>
                                
                                <div class="equipment-item">
                                    <div class="equipment-icon">
                                        <div class="icon-wrapper"></div>
                                    </div>
                                    <div class="equipment-details">
                                        <div class="equipment-info"></div>
                                        <div class="equipment-action"></div>
                                    </div>
                                </div>
                                
                                <div class="equipment-item">
                                    <div class="equipment-icon">
                                        <div class="icon-wrapper"></div>
                                    </div>
                                    <div class="equipment-details">
                                        <div class="equipment-info"></div>
                                        <div class="equipment-action"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Центральная колонка: 3D-визуализация -->
                        <div class="promo-banner-center">
                            <div class="banner-center-content">
                                <h4 class="promo-banner-heading">3D-визуализация</h4>
                                <div class="cabinet">
                                    <svg role="img">
                                        <use xlink:href="#icon-cabinet"></use>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- Правая колонка: Параметры с прогресс-барами -->
                        <div class="promo-banner-right">
                            <div class="banner-right-content">
                                <h4 class="promo-banner-heading">Параметры</h4>
                                
                                <!-- Параметр 1: Энергопотребление -->
                                <div class="parameter-item" data-progress-start="15" data-progress-end="65">
                                    <div class="parameter-header">
                                        <p>Энергопотребление</p>
                                        <span class="progress-value">15%</span>
                                    </div>
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill power"></div>
                                    </div>
                                </div>

                                <!-- Параметр 2: Масса оборудования -->
                                <div class="parameter-item" data-progress-start="20" data-progress-end="75">
                                    <div class="parameter-header">
                                        <p>Масса оборудования</p>
                                        <span class="progress-value">20%</span>
                                    </div>
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill weight"></div>
                                    </div>
                                </div>

                                <!-- Параметр 3: Тепловыделение -->
                                <div class="parameter-item" data-progress-start="10" data-progress-end="55">
                                    <div class="parameter-header">
                                        <p>Тепловыделение</p>
                                        <span class="progress-value">10%</span>
                                    </div>
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill heat"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section class="fourth-section">
                <div class="fourth-section-header">
                    <h2 class="section-title">Ключевые возможности</h2>
                    <div class="key-features-card-1">
                        <h3 class="key-features-title">Особенности</h3>
                    </div>
                    <div class="key-features-card-2">
                    </div>
                    <div class="key-features-card-3">
                    </div>
                    <div class="key-features-card-4">
                    </div>
                    <div class="key-features-card-5">
                    </div>
                    <div class="key-features-card-6">
                    </div>
                </div>
            </section>
            <section class="fifth-section">
            </section>
            <footer></footer>
                <div class="footer-content">
                    <p>&copy; 2025 3D Cabinet. Все права защищены.</p>
                </div>
            </footer> 
        </div>
    </main>            
    <!-- JavaScript -->
    <script src="js/selection.js"></script>
    <script src="js/progress-animation.js"></script>
</body>
</html>