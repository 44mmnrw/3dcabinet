@extends('layouts.app')

@section('title', 'Админка — Шкафы')

@section('content')
<section class="container" style="padding: 20px 0;">
  <h1 style="margin-bottom: 12px;">Шкафы</h1>
  <p class="muted" style="margin-bottom: 20px;">Управление процедурными шкафами. Дизайн соответствует landing.</p>

  <div style="margin-bottom: 16px;">
    <a href="{{ route('admin.cabinets.create') }}" class="button">+ Новый шкаф</a>
  </div>

  @if(session('success'))
    <div class="success" style="margin: 8px 0;">{{ session('success') }}</div>
  @endif
  @if($errors->any())
    <div class="error" style="margin: 8px 0;">{{ $errors->first() }}</div>
  @endif

  <table class="table" style="width:100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th align="left">ID</th>
        <th align="left">Название</th>
        <th align="left">Категория</th>
        <th align="left">Размеры (мм)</th>
        <th align="left">Статус</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      @forelse($cabinets as $cab)
        <tr>
          <td>{{ $cab->class_name }}</td>
          <td>{{ $cab->display_name }}</td>
          <td>{{ $cab->category }}</td>
          <td>{{ data_get($cab->dimensions,'width') }}×{{ data_get($cab->dimensions,'height') }}×{{ data_get($cab->dimensions,'depth') }}</td>
          <td>{{ $cab->is_active ? 'Активен' : 'Выключен' }}</td>
          <td>
            <a href="{{ route('admin.cabinets.edit', $cab) }}" class="button">Редактировать</a>
            <form action="{{ route('admin.cabinets.destroy', $cab) }}" method="POST" style="display:inline-block" onsubmit="return confirm('Удалить шкаф?');">
              @csrf
              @method('DELETE')
              <button type="submit" class="button" style="background:#e74c3c;">Удалить</button>
            </form>
          </td>
        </tr>
      @empty
        <tr><td colspan="6" class="muted">Пока нет шкафов</td></tr>
      @endforelse
    </tbody>
  </table>

  <div style="margin-top: 16px;">
    {{ $cabinets->links() }}
  </div>
</section>
@endsection
