@extends('layouts.app')

@section('title', '3Cabinet — Конфигуратор серверных шкафов')
@section('meta_description', 'Интеллектуальная система подбора и конфигурирования шкафного оборудования с 3D-визуализацией')

@push('scripts')
    <script src="{{ asset('js/pages/landing.js') }}"></script>
    <script src="{{ asset('js/utils/progress-animation.js') }}"></script>
@endpush

@section('content')
<!-- MAIN CONTENT -->
<main class="content">
    <!-- СЕКЦИЯ 1: Форма выбора параметров -->
    <section class="first-section">
        <!-- Новый контейнер-обёртка -->
        <div class="first-section-inner">
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
                <a href="{{ route('configurator') }}" class="button blue-button disabled-button" id="continue-button" style="pointer-events: none;">
                    Перейти к конфигурированию →
                </a>
            </div>
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
                <h3 class="step-title">Добавьте оборудование</h3>
                <p class="step-description">Выберите необходимое оборудование из каталога и разместите в 3D-модели</p>
            </div>

            <!-- Шаг 3 -->
            <div class="step-card">
                <div class="step-number">3</div>
                <div class="step-icon">
                    <svg role="img">
                        <use xlink:href="#icon-cloud"></use>
                    </svg>
                </div>
                <h3 class="step-title">Проверьте конфигурацию</h3>
                <p class="step-description">Система автоматически проверит совместимость и рассчитает параметры</p>
            </div>

            <!-- Шаг 4 -->
            <div class="step-card">
                <div class="step-number">4</div>
                <div class="step-icon">
                    <svg role="img">
                        <use xlink:href="#icon-cloud"></use>
                    </svg>
                </div>
                <h3 class="step-title">Получите документацию</h3>
                <p class="step-description">Скачайте готовые чертежи, спецификации и коммерческое предложение</p>
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

    <!-- СЕКЦИЯ 4: Ключевые возможности -->
    <section class="fourth-section" id="features">
        <div class="fourth-section-header">
            <h2 class="section-title">Ключевые возможности</h2>
        </div>
        <!-- Добавлена обёртка для синхронизации ширины -->
        <div style="width: 100%; max-width: var(--container-width-landing); padding: 0 clamp(1.5rem, 5vw, 3rem);">
            <div class="key-features-wrapper">
                <div class="key-features-card-1">
                    <h3>Интеллектуальный подбор</h3>                        
                    <p>Автоматический расчет параметров шкафа на основе выбранного оборудования с учетом всех технических требований и ограничений</p>
                </div>
                <div class="key-features-card-2">
                    <h3>3D-визуализация</h3>
                    <p>Реалистичное отображение шкафа и размещенного оборудования в трех измерениях с возможностью просмотра под любым углом</p>
                </div>
                <div class="key-features-card-3">
                    <h3>Проверка совместимости</h3>
                    <p>Предотвращение ошибок при размещении оборудования с автоматической проверкой совместимости и физических конфликтов</p>
                </div>
                <div class="key-features-card-4">
                     <h3>Расчет нагрузок</h3>
                    <p>Автоматический расчет энергопотребления, тепловыделения и массы оборудования с предупреждениями о превышении допустимых значений</p>
                </div>
                <div class="key-features-card-5">
                     <h3>Техническая документация</h3>
                    <p>Автоматическая генерация чертежей, схем подключения, монтажных планов и полных спецификаций в различных форматах</p>
                </div>
                <div class="key-features-card-6">
                     <h3>Коммерческие предложения</h3>
                    <p>Готовые сметы с актуальными ценами, расчетом стоимости монтажа и возможностью экспорта в различные форматы</p>
                </div>
            </div>
        </div>
    </section>

    <!-- СЕКЦИЯ 5: Призыв к действию -->
    <section class="fifth-section">
        <h2 class="section-title">Готовы начать?</h2>
        <p class="section-description">Создайте свой первый проект бесплатно</p>
        <div class="fifth-section-features">
            <span>Бесплатно</span>
            <span class="dot">·</span>
            <span>Экспорт документации</span>
            <span class="dot">·</span>
            <span>Полный функционал</span>
        </div>
        <a href="{{ route('configurator') }}" class="button blue-button">Создать проект</a>
    </section>
</main>
@endsection
