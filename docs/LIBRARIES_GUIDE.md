# 📚 Установленные библиотеки и примеры использования

Все библиотеки установлены через npm и автоматически копируются в `public/js/libs/` и `public/css/`.

---

## 🎨 Установленные библиотеки

### 1. Three.js (r169)
**Расположение**: `public/js/libs/three.module.js`

```javascript
import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
```

---

### 2. Tween.js — плавные анимации
**Расположение**: `public/js/libs/tween.esm.js`

**Пример — замена текущей анимации двери**:

```javascript
import TWEEN from '../libs/tween.esm.js';

// В CabinetModel.js — метод animateDoor()
animateDoor(targetRotation, axis = 'y') {
    const startRotation = this.door.rotation[axis];
    
    new TWEEN.Tween({ rotation: startRotation })
        .to({ rotation: targetRotation }, 500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(obj => {
            this.door.rotation[axis] = obj.rotation;
            this.door.updateMatrixWorld(true);
        })
        .start();
}

// В SceneManager.js — добавить в animate()
animate() {
    requestAnimationFrame(() => this.animate());
    
    TWEEN.update(); // ⬅️ Добавить эту строку
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
}
```

**Пример — плавная анимация камеры**:

```javascript
// Плавное перемещение камеры к объекту
focusOnObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    
    // Целевая позиция камеры
    const targetPosition = {
        x: center.x + 500,
        y: center.y + 500,
        z: center.z + 500
    };
    
    // Анимация камеры
    new TWEEN.Tween(this.camera.position)
        .to(targetPosition, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
    
    // Анимация controls target
    new TWEEN.Tween(this.controls.target)
        .to(center, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
}
```

---

### 3. SweetAlert2 — красивые модальные окна
**Расположение**: 
- `public/js/libs/sweetalert2.all.js`
- `public/css/sweetalert2.min.css`

**Подключение в Blade**:

```blade
@push('styles')
    <link rel="stylesheet" href="{{ asset('css/sweetalert2.min.css') }}">
@endpush

@push('scripts')
    <script src="{{ asset('js/libs/sweetalert2.all.js') }}"></script>
@endpush
```

**Пример — подтверждение удаления**:

```javascript
// В CabinetConfigurator.js
async removeCabinet(cabinetId) {
    const result = await Swal.fire({
        title: 'Удалить шкаф?',
        text: 'Это действие нельзя отменить',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Да, удалить',
        cancelButtonText: 'Отмена'
    });
    
    if (result.isConfirmed) {
        this.cabinetManager.removeCabinet(cabinetId);
        
        Swal.fire({
            title: 'Удалено!',
            text: 'Шкаф успешно удалён',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    }
}
```

**Пример — сохранение конфигурации**:

```javascript
async saveConfiguration() {
    const { value: name } = await Swal.fire({
        title: 'Сохранить конфигурацию',
        input: 'text',
        inputLabel: 'Название проекта',
        inputPlaceholder: 'Мой проект',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Введите название!';
            }
        }
    });
    
    if (name) {
        // Сохранить через API
        const config = this.exportConfiguration();
        await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, config })
        });
        
        Swal.fire('Сохранено!', `Проект "${name}" сохранён`, 'success');
    }
}
```

---

### 4. FileSaver — скачивание файлов
**Расположение**: `public/js/libs/FileSaver.min.js`

**Пример — экспорт конфигурации в JSON**:

```javascript
// В CabinetConfigurator.js
exportConfiguration() {
    const cabinets = this.cabinetManager.getAllCabinets();
    
    const config = {
        version: '1.0',
        created: new Date().toISOString(),
        cabinets: cabinets.map(cabinet => ({
            id: cabinet.id,
            type: cabinet.config.type,
            width: cabinet.config.width,
            height: cabinet.config.height,
            depth: cabinet.config.depth,
            position: {
                x: cabinet.position.x,
                y: cabinet.position.y,
                z: cabinet.position.z
            },
            rotation: cabinet.rotation,
            color: cabinet.config.color,
            isDoorOpen: cabinet.isDoorOpen,
            equipment: cabinet.equipment
        }))
    };
    
    return config;
}

downloadConfiguration() {
    const config = this.exportConfiguration();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    // Скачать файл
    saveAs(blob, `configuration_${Date.now()}.json`);
    
    Swal.fire({
        title: 'Готово!',
        text: 'Конфигурация скачана',
        icon: 'success',
        timer: 2000
    });
}
```

**Пример — импорт конфигурации**:

```javascript
async importConfiguration() {
    const { value: file } = await Swal.fire({
        title: 'Загрузить конфигурацию',
        input: 'file',
        inputAttributes: {
            accept: 'application/json',
            'aria-label': 'Выберите JSON-файл'
        }
    });
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.loadConfiguration(config);
                Swal.fire('Загружено!', 'Конфигурация применена', 'success');
            } catch (error) {
                Swal.fire('Ошибка!', 'Неверный формат файла', 'error');
            }
        };
        reader.readAsText(file);
    }
}
```

---

### 5. lil-gui — панель настроек (для разработки)
**Расположение**: `public/js/libs/lil-gui.esm.js`

**Пример — отладочная панель**:

```javascript
import { GUI } from '../libs/lil-gui.esm.js';

// В SceneManager.js — метод для отладки
createDebugPanel() {
    const gui = new GUI();
    
    // Папка освещения
    const lightFolder = gui.addFolder('Освещение');
    lightFolder.add(this.ambientLight, 'intensity', 0, 2).name('Ambient');
    lightFolder.add(this.directionalLight, 'intensity', 0, 2).name('Directional');
    
    // Папка камеры
    const cameraFolder = gui.addFolder('Камера');
    cameraFolder.add(this.camera.position, 'x', -2000, 2000);
    cameraFolder.add(this.camera.position, 'y', 0, 3000);
    cameraFolder.add(this.camera.position, 'z', -2000, 2000);
    
    // Папка сетки
    const gridFolder = gui.addFolder('Сетка');
    gridFolder.add(this.gridHelper, 'visible').name('Показать');
    
    gui.close(); // Свернуть по умолчанию
}

// В constructor() SceneManager
constructor(containerElement) {
    // ... существующий код ...
    
    // Только для разработки
    if (window.location.hostname === 'localhost') {
        this.createDebugPanel();
    }
}
```

---

### 6. Stats.js — FPS-монитор
**Расположение**: `public/js/libs/stats.min.js`

**Пример — FPS-счётчик**:

```javascript
// В SceneManager.js
import Stats from '../libs/stats.min.js';

constructor(containerElement) {
    // ... существующий код ...
    
    // FPS-счётчик (только для localhost)
    if (window.location.hostname === 'localhost') {
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        document.body.appendChild(this.stats.dom);
    }
}

animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.stats) this.stats.begin(); // ⬅️ Начало замера
    
    TWEEN.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    
    if (this.stats) this.stats.end(); // ⬅️ Конец замера
}
```

---

## 🚀 Быстрый старт

### Добавить кнопки экспорта/импорта в UI

**В `resources/views/configurator/index.blade.php`**:

```html
<div class="panel-right-controls" style="padding: 1rem;">
    <button onclick="configurator.downloadConfiguration()" class="btn-export">
        💾 Скачать конфигурацию
    </button>
    <button onclick="configurator.importConfiguration()" class="btn-import">
        📂 Загрузить конфигурацию
    </button>
</div>
```

### Подключить SweetAlert2

**В `resources/views/configurator/index.blade.php`**:

```blade
@push('styles')
    <link rel="stylesheet" href="{{ asset('css/sweetalert2.min.css') }}">
@endpush

@push('scripts')
    <script src="{{ asset('js/libs/sweetalert2.all.js') }}"></script>
@endpush
```

### Заменить анимацию двери на Tween.js

**В `public/js/modules/CabinetModel.js`** (добавить импорт):

```javascript
import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import TWEEN from '../libs/tween.esm.js'; // ⬅️ Добавить
```

**В `public/js/modules/SceneManager.js`** (обновить animate):

```javascript
animate() {
    requestAnimationFrame(() => this.animate());
    
    TWEEN.update(); // ⬅️ Добавить для работы анимаций
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
}
```

---

## 📦 Обновление библиотек

```powershell
# Обновить все библиотеки
npm update

# Пересобрать (скопировать в public/)
npm run build:three

# Проверить версии
npm list
```

---

**Последнее обновление**: 8 ноября 2025 г.
