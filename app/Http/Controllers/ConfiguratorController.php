<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ConfiguratorController extends Controller
{
    /**
     * Главный конфигуратор (React)
     */
    public function index()
    {
        return view('configurator.react-new');
    }

    /**
     * Legacy конфигуратор (Vanilla JS) - для совместимости
     */
    public function legacy()
    {
        return view('configurator.legacy');
    }
}
