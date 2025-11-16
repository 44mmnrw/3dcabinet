<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\ConfiguratorController;
use App\Http\Controllers\AdminController;

// Главная страница (Landing)
Route::get('/', [LandingController::class, 'index'])->name('landing');

// 3D Конфигуратор (React - основная версия)
Route::get('/configurator', [ConfiguratorController::class, 'index'])->name('configurator');

// Legacy конфигуратор (Vanilla JS - для совместимости)
Route::get('/legacy', [ConfiguratorController::class, 'legacy'])->name('configurator.legacy');

// ТЕСТ: Минимальная загрузка
Route::get('/test', function () {
    return view('configurator.test');
})->name('configurator.test');

// Админ панель
Route::prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin.dashboard');
});
