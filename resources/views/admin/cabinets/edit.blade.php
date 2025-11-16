@extends('layouts.app')

@section('title', 'Редактировать шкаф — Админка')

@section('content')
<section class="container" style="padding: 20px 0;">
  <h1 style="margin-bottom: 12px;">Редактировать шкаф: {{ $cabinet->display_name }}</h1>

  @if(session('success'))
    <div class="success" style="margin: 8px 0;">{{ session('success') }}</div>
  @endif
  @if($errors->any())
    <div class="error" style="margin: 8px 0;">{{ $errors->first() }}</div>
  @endif

  <form action="{{ route('admin.cabinets.update', $cabinet) }}" method="POST" enctype="multipart/form-data" class="form">
    @csrf
    @method('PUT')

    <div class="grid-2" style="gap:16px;">
      <div>
        <label>Отображаемое название</label>
        <input type="text" name="display_name" required value="{{ old('display_name', $cabinet->display_name) }}" />
      </div>
      <div>
        <label>Категория</label>
        <select name="category" required>
          @foreach(['thermal','telecom','server'] as $cat)
            <option value="{{ $cat }}" @selected(old('category', $cabinet->category) === $cat)>{{ ucfirst($cat) }}</option>
          @endforeach
        </select>
      </div>
    </div>

    <fieldset style="margin-top:16px;">
      <legend>Характеристики</legend>
      <div class="grid-2" style="gap:16px;">
        <div>
          <label>Max Power (Вт)</label>
          <input type="number" name="max_power" value="{{ old('max_power', data_get($cabinet->specs,'maxPower')) }}" />
        </div>
        <div>
          <label>Max Load (кг)</label>
          <input type="number" name="max_load" value="{{ old('max_load', data_get($cabinet->specs,'maxLoad')) }}" />
        </div>
      </div>
      <div class="grid-3" style="gap:16px; margin-top:12px;">
        <div>
          <label>Heating Power (Вт)</label>
          <input type="number" name="heating_power" value="{{ old('heating_power', data_get($cabinet->thermal,'heatingPower')) }}" />
        </div>
        <div>
          <label>Cooling Power (Вт)</label>
          <input type="number" name="cooling_power" value="{{ old('cooling_power', data_get($cabinet->thermal,'coolingPower')) }}" />
        </div>
        <div>
          <label>Температуры (мин/макс, °C)</label>
          <div class="grid-2" style="gap:8px;">
            <input type="number" name="temp_min" value="{{ old('temp_min', data_get($cabinet->thermal,'operatingTemp.min')) }}" />
            <input type="number" name="temp_max" value="{{ old('temp_max', data_get($cabinet->thermal,'operatingTemp.max')) }}" />
          </div>
        </div>
      </div>
      <div class="grid-3" style="gap:16px; margin-top:12px;">
        <div>
          <label>IP рейтинг</label>
          <input type="number" name="ip_rating" value="{{ old('ip_rating', data_get($cabinet->climate,'ip')) }}" />
        </div>
        <div>
          <label><input type="checkbox" name="has_heater" value="1" @checked(data_get($cabinet->climate,'hasHeater')) /> Обогрев</label>
        </div>
        <div>
          <label><input type="checkbox" name="has_fans" value="1" @checked(data_get($cabinet->climate,'hasFans')) /> Вентиляция</label>
        </div>
      </div>
    </fieldset>

    <div style="margin-top:16px;">
      <label>Thumbnail (опционально)</label>
      <input type="file" name="thumbnail" accept="image/*" />
      @if($cabinet->thumbnail_path)
        <div class="muted" style="margin-top:6px;">Текущее: {{ $cabinet->thumbnail_path }}</div>
      @endif
    </div>

    <div style="margin-top:16px;">
      <label><input type="checkbox" name="is_active" value="1" @checked($cabinet->is_active) /> Активен</label>
    </div>

    <div style="margin-top:20px;">
      <button type="submit" class="button">Сохранить</button>
      <a href="{{ route('admin.cabinets.index') }}" class="button" style="background:#95a5a6;">Отмена</a>
    </div>
  </form>
</section>
@endsection
