@extends('layouts.app')

@section('title', '3Cabinet — 3D Конфигуратор')
@section('meta_description', '3D конфигуратор серверных шкафов с визуализацией в реальном времени')

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
@endpush

@push('scripts')
    <script type="module" src="{{ asset('js/app.js') }}"></script>
@endpush

@section('content')
<!-- MAIN CONTENT: Конфигуратор -->
<main class="content">
    <div class="configurator-wrapper">
        <!-- Левая панель: Каталог оборудования -->
        <div class="panel-left">
            <h2>Каталог оборудования</h2>
            <div id="equipment-catalog">
                <!-- Список оборудования будет заполняться JS из data.js -->
            </div>
        </div>

        <!-- Центральная панель: 3D-визуализация -->
        <div class="panel-center">
            <div id="cabinet-3d-container">
                <!-- 3D-сцена Three.js будет отрендерена здесь -->
            </div>
        </div>

        <!-- Правая панель: Параметры шкафа -->
        <div class="panel-right">
            <h2>Параметры конфигурации</h2>
            <div id="cabinet-parameters">
                <!-- Параметры будут заполняться JS -->
            </div>
        </div>
    </div>
</main>
@endsection
