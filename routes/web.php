<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\ConfiguratorController;
use App\Http\Controllers\AdminController;

// Главная страница (Landing)
Route::get('/', [LandingController::class, 'index'])->name('landing');

// 3D Конфигуратор
Route::get('/app', [ConfiguratorController::class, 'index'])->name('configurator');

// ТЕСТ: Минимальная загрузка
Route::get('/test', function () {
    return view('configurator.test');
})->name('configurator.test');

// Админ панель
Route::prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin.dashboard');
});
