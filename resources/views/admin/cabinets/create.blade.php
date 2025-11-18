@extends('layouts.app')

@section('title', 'Новый шкаф — Админка')

@section('content')
<section class="container" style="padding: 20px 0;">
  <h1 style="margin-bottom: 12px;">Создать новый шкаф</h1>
  <p class="muted" style="margin-bottom: 20px;">Загрузите JSON-компоненты FreeCAD. После сохранения запустится генерация класса шкафа.</p>

  @if($errors->any())
    <div class="error" style="margin: 8px 0;">{{ $errors->first() }}</div>
  @endif

  <form action="{{ route('admin.cabinets.store') }}" method="POST" enctype="multipart/form-data" class="form">
    @csrf

    <div class="grid-2" style="gap:16px;">
      <div>
        <label>Отображаемое название</label>
        <input type="text" name="display_name" required placeholder="Термошкаф 700×500×250" />
      </div>
      <div>
        <label>Категория</label>
        <select name="category" required>
          <option value="thermal">Thermal</option>
          <option value="telecom">Telecom</option>
          <option value="server">Server</option>
        </select>
      </div>
    </div>

    <div class="grid-3" style="gap:16px; margin-top:12px;">
      <div>
        <label>Ширина (мм)</label>
        <input type="number" name="width" required min="1" />
      </div>
      <div>
        <label>Высота (мм)</label>
        <input type="number" name="height" required min="1" />
      </div>
      <div>
        <label>Глубина (мм)</label>
        <input type="number" name="depth" required min="1" />
      </div>
    </div>

    <fieldset style="margin-top:16px;">
      <legend>Характеристики (опционально)</legend>
      <div class="grid-2" style="gap:16px;">
        <div>
          <label>Max Power (Вт)</label>
          <input type="number" name="max_power" />
        </div>
        <div>
          <label>Max Load (кг)</label>
          <input type="number" name="max_load" />
        </div>
      </div>
      <div class="grid-3" style="gap:16px; margin-top:12px;">
        <div>
          <label>Heating Power (Вт)</label>
          <input type="number" name="heating_power" />
        </div>
        <div>
          <label>Cooling Power (Вт)</label>
          <input type="number" name="cooling_power" />
        </div>
        <div>
          <label>Температуры (мин/макс, °C)</label>
          <div class="grid-2" style="gap:8px;">
            <input type="number" name="temp_min" placeholder="min" />
            <input type="number" name="temp_max" placeholder="max" />
          </div>
        </div>
      </div>
      <div class="grid-3" style="gap:16px; margin-top:12px;">
        <div>
          <label>IP рейтинг</label>
          <input type="number" name="ip_rating" />
        </div>
        <div>
          <label><input type="checkbox" name="has_heater" value="1" /> Обогрев</label>
        </div>
        <div>
          <label><input type="checkbox" name="has_fans" value="1" /> Вентиляция</label>
        </div>
      </div>
    </fieldset>

    <fieldset style="margin-top:16px;">
      <legend>Компоненты (JSON файлы)</legend>
      <div id="components-list">
        <div class="grid-2" style="gap:8px; margin-bottom:8px;">
          <input type="text" name="components[0][name]" placeholder="body_700_500_250" required />
          <input type="file" name="components[0][file]" accept=".json" required />
        </div>
      </div>
      <button type="button" class="button" onclick="addComponent()">+ Компонент</button>
    </fieldset>

    <div style="margin-top:16px;">
      <label>Thumbnail (опционально)</label>
      <input type="file" name="thumbnail" accept="image/*" />
    </div>

    <div style="margin-top:16px;">
      <label>Описание (опционально)</label>
      <textarea name="description" rows="3" placeholder="Краткое описание"></textarea>
    </div>

    <div style="margin-top:20px;">
      <button type="submit" class="button">Создать</button>
      <a href="{{ route('admin.cabinets.index') }}" class="button" style="background:#95a5a6;">Отмена</a>
    </div>
  </form>
</section>

@push('scripts')
<script>
let compIndex = 1;
function addComponent() {
  const root = document.getElementById('components-list');
  const row = document.createElement('div');
  row.className = 'grid-2';
  row.style.gap = '8px';
  row.style.marginBottom = '8px';
  row.innerHTML = `
    <input type="text" name="components[${compIndex}][name]" placeholder="door_700_500_250" required />
    <input type="file" name="components[${compIndex}][file]" accept=".json" required />
  `;
  root.appendChild(row);
  compIndex++;
}
</script>
@endpush
@endsection
