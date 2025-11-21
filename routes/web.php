<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\ConfiguratorController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\Admin\CabinetController;

// Главная страница (Landing)
Route::get('/', [LandingController::class, 'index'])->name('landing');

// 3D Конфигуратор (React - основная версия)
Route::get('/configurator', [ConfiguratorController::class, 'index'])->name('configurator');

// Админ панель
Route::prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin.dashboard');
    Route::resource('cabinets', CabinetController::class)->names('admin.cabinets');
});
