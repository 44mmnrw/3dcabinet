<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ConfiguratorController extends Controller
{
    /**
     * Отображение 3D конфигуратора
     */
    public function index()
    {
        return view('configurator.index');
    }
}
