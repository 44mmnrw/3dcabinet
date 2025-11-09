@extends('layouts.app')

@section('title', '3Cabinet — 3D Конфигуратор')
@section('meta_description', '3D конфигуратор серверных шкафов с визуализацией в реальном времени')

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/configurator.css') }}">
@endpush

@push('scripts')
    {{-- dat.GUI библиотека для панели управления --}}
    <script src="{{ asset('js/libs/dat.gui.min.js') }}"></script>
    
    {{-- Главный модуль конфигуратора --}}
    <script type="module" src="{{ asset('js/pages/configurator.js') }}"></script>
@endpush

@section('content')
<!-- MAIN CONTENT: Конфигуратор -->
<main class="content-configurator">
    <div class="configurator-wrapper">
        <!-- Левая панель: Каталог оборудования -->
        <div class="panel-left">
            <div class="panel-left-header">
                <h3>Каталог оборудования</h3>
            </div>            
            <div id="equipment-search">
                Здесь Поиск
            </div>
            <div id="equipment-catalog">
                Каталог оборудования
            </div>
        </div>
                <!-- Центральная панель: 3D-визуализация -->
        <div class="panel-center">
            <div id="cabinet-3d-selector">
                <div class="panel-left-header">
                    <h3>Мои шкафы</h3>
                </div>
                <div id="cabinet-3d-list">
                    <p>Список 3D шкафов будет загружаться динамически</p>
                </div>
            </div>
            <div id="cabinet-3d-container">
                <!-- Контролы камеры (вращение и зум) -->
                <div id="camera-controls">
                    <!-- Вращение камеры -->
                    <div class="camera-control-group camera-rotation">
                        <button class="camera-btn camera-btn-up" title="Вращение вверх">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <div class="camera-control-row">
                            <button class="camera-btn camera-btn-left" title="Вращение влево">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <button class="camera-btn camera-btn-center" title="Сбросить камеру">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                            <button class="camera-btn camera-btn-right" title="Вращение вправо">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                        <button class="camera-btn camera-btn-down" title="Вращение вниз">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Зум камеры -->
                    <div class="camera-control-group camera-zoom">
                        <button class="camera-btn camera-btn-zoom-in" title="Приблизить">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <button class="camera-btn camera-btn-zoom-out" title="Отдалить">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Правая панель: Параметры шкафа -->
        <div class="panel-right">
            <div class="panel-left-header">
                <h3>Параметры конфигурации</h3>
            </div>
            <div id="cabinet-parameters">
                <!-- Параметры будут заполняться JS -->
            </div>
        </div>
    </div>
</main>
@endsection
