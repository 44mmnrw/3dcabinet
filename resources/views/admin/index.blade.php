@extends('layouts.app')

@section('title', '3Cabinet — Админ панель')
@section('meta_description', 'Административная панель управления 3Cabinet')

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
@endpush

@push('scripts')
    <script src="{{ asset('js/admin.js') }}"></script>
@endpush

@section('content')
<!-- MAIN CONTENT: Админ панель -->
<main class="content">
    <div class="admin-wrapper">
        <div class="admin-container">
            <h1>Административная панель</h1>
            <p>Управление конфигуратором 3DCabinet</p>
            
            <!-- Здесь будет добавлен функционал админ панели -->
            <div class="admin-dashboard">
                <div class="dashboard-card">
                    <h3>Проекты</h3>
                    <p>Управление проектами пользователей</p>
                </div>
                
                <div class="dashboard-card">
                    <h3>Оборудование</h3>
                    <p>Каталог оборудования</p>
                </div>
                
                <div class="dashboard-card">
                    <h3>Пользователи</h3>
                    <p>Управление пользователями</p>
                </div>
                
                <div class="dashboard-card">
                    <h3>Настройки</h3>
                    <p>Настройки системы</p>
                </div>
            </div>
        </div>
    </div>
</main>
@endsection
