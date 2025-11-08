@extends('layouts.app')

@section('title', '3Cabinet — 3D Конфигуратор')
@section('meta_description', '3D конфигуратор серверных шкафов с визуализацией в реальном времени')

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/configurator.css') }}">
@endpush

@push('scripts')
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
