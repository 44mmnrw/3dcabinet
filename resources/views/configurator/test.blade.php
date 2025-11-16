@extends('layouts.app')

@section('title', '3Cabinet — React Панель')

@section('content')
  <section class="container" style="padding: 20px 0;">
    <h1 style="margin-bottom: 12px;">React панель конфигуратора</h1>
    <p class="muted" style="margin-bottom: 20px;">Демонстрация Phase 3: расчёты, рекомендации и валидация через EventBus.</p>

    @include('partials.react-panel')
  </section>
@endsection
