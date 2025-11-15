<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ConfiguratorController extends Controller
{
    /**
     * Отображение 3D конфигуратора (старая Blade-версия)
     */
    public function index()
    {
        return view('configurator.index');
    }

    /**
     * Отображение 3D конфигуратора (React-версия)
     */
    public function react()
    {
        return view('configurator.react-new');
    }
}
