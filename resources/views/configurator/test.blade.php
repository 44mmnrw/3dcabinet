@extends('layouts.app')

@section('title', 'ТЕСТ — Минимальная загрузка')

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/configurator.css') }}">
@endpush

@push('scripts')
    {{-- Минимальная тестовая версия --}}
    <script type="module" src="{{ asset('js/pages/configurator-minimal.js') }}"></script>
@endpush

@section('content')
<main class="content-configurator">
    <div style="padding: 20px; background: white;">
        <h1>ТЕСТ: Минимальная загрузка конфигуратора</h1>
        <p>Откройте консоль браузера (F12) и проверьте логи.</p>
    </div>
    
    <div class="configurator-wrapper">
        <div id="cabinet-3d-container" style="width: 100%; height: 600px; background: #f0f0f0;">
            <!-- Сюда будет добавлен рендерер -->
        </div>
    </div>
</main>
@endsection
