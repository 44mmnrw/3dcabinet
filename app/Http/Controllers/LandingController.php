<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LandingController extends Controller
{
    /**
     * Отображение главной страницы (landing)
     */
    public function index()
    {
        return view('landing.index');
    }
}
