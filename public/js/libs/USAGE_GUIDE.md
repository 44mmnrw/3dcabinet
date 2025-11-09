# Подключённые библиотеки для 3D-моделирования

## ✅ Активные библиотеки

### 1. **three-mesh-bvh.module.js** — Ускорение raycasting
**Использование**: `InteractionController.js`

**Что делает**:
- Строит BVH (Bounding Volume Hierarchy) для геометрии
- Ускоряет raycasting (клики/hover) в **10-100 раз**
- Критично для сложных моделей с тысячами полигонов

**Как работает**:
```javascript
// Автоматически применяется ко всем mesh через prototype
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Вызывается в CabinetModel.optimizeGeometry()
child.geometry.computeBoundsTree();
```

**Результат**: Плавные клики и hover даже на моделях с 100K+ полигонов

---

### 2. **tween.esm.js** — Плавные анимации
**Использование**: `CabinetModel.js`, `SceneManager.js`

**Что делает**:
- Плавные анимации открытия/закрытия дверей
- Анимации перемещения камеры
- 30+ встроенных easing-функций (Cubic, Elastic, Bounce и т.д.)

**Пример**:
```javascript
// Анимация открытия двери (в CabinetModel.animateDoor)
new TWEEN.Tween({ rotation: startRotation })
    .to({ rotation: targetRotation }, 600)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate((obj) => {
        this.door.rotation.y = obj.rotation;
    })
    .start();

// Обновление в анимационном цикле (SceneManager.animate)
TWEEN.update();
```

**Результат**: Плавные, профессиональные анимации вместо рывков

---

### 3. **stats.min.js** — FPS монитор
**Использование**: `SceneManager.js`

**Что делает**:
- Отображает FPS (frames per second)
- Мониторинг производительности
- Показывает время рендеринга в миллисекундах

**Как включить**:
1. Добавьте `?debug` в URL: `http://localhost:8000/app?debug`
2. В левом верхнем углу появится FPS-панель

**Панели**:
- **FPS** (панель 0) — кадры в секунду (60 = идеально)
- **MS** (панель 1) — миллисекунды на кадр (<16ms = 60fps)
- **MB** (панель 2) — используемая память

**Результат**: Видите проблемы производительности в реальном времени

---

## 📦 Доступные (но не подключённые) библиотеки

### 4. **cannon-es.js** — Физический движок
**Когда пригодится**:
- Симуляция падения оборудования в шкаф
- Реалистичные столкновения
- Симуляция гравитации

**Как подключить**:
```javascript
import * as CANNON from '../libs/cannon-es.js';

// Создать мир физики
const world = new CANNON.World();
world.gravity.set(0, -9820, 0); // мм/с² (гравитация Земли)

// Добавить тело
const body = new CANNON.Body({
    mass: 5, // кг
    shape: new CANNON.Box(new CANNON.Vec3(350, 250, 120)) // половина размера
});
world.addBody(body);

// Обновлять в animate()
world.step(1/60);
mesh.position.copy(body.position);
```

---

### 5. **troika-three-text.esm.js** — Качественный 3D-текст
**Когда пригодится**:
- Подписи оборудования в шкафу
- Метки размеров
- Названия юнитов (U1, U2, ...)

**Как подключить**:
```javascript
import { Text } from '../libs/troika-three-text.esm.js';

const text = new Text();
text.text = 'U15';
text.fontSize = 20;
text.position.set(300, 665, 0);
text.color = 0x000000;
scene.add(text);
text.sync(); // Обязательно!
```

---

### 6. **camera-controls.module.js** — Расширенное управление камерой
**Когда пригодится**:
- Альтернатива OrbitControls с большими возможностями
- Плавные переходы между точками обзора
- Ограничение области просмотра

**Как подключить**:
```javascript
import CameraControls from '../libs/camera-controls.module.js';
CameraControls.install({ THREE });

const controls = new CameraControls(camera, renderer.domElement);
controls.dollyToCursor = true;
controls.smoothTime = 0.25;

// Анимированный переход к цели
controls.setLookAt(
    1000, 800, 1000, // camera position
    0, 0, 0,         // target
    true             // enable transition
);
```

---

### 7. **postprocessing.js** — Пост-эффекты
**Когда пригодится**:
- Bloom (свечение)
- Ambient Occlusion (тени в углах)
- Depth of Field (размытие фона)
- SSAO, Outline и т.д.

**Как подключить**:
```javascript
import { EffectComposer, RenderPass, BloomEffect, EffectPass } from '../libs/postprocessing.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new BloomEffect({ intensity: 0.5 });
composer.addPass(new EffectPass(camera, bloom));

// В animate()
composer.render();
```

---

### 8. **lil-gui.esm.js** — GUI-панель отладки
**Когда пригодится**:
- Настройка параметров моделей в реальном времени
- Отладка освещения, материалов
- Экспериментирование с параметрами

**Как подключить**:
```javascript
import GUI from '../libs/lil-gui.esm.js';

const gui = new GUI();
gui.add(cabinet.model.position, 'x', -1000, 1000).name('Position X');
gui.add(cabinet.model.scale, 'x', 0.1, 5).name('Scale');
gui.addColor({ color: 0xffffff }, 'color').onChange(val => {
    cabinet.setColor(val);
});
```

---

## 🚀 Производительность

**Текущие оптимизации**:
- ✅ BVH raycasting (10-100x быстрее)
- ✅ TWEEN анимации (плавность 60fps)
- ✅ Stats.js мониторинг

**Рекомендации**:
1. Используйте GLB вместо GLTF (сжатие)
2. Включайте Draco-компрессию для моделей
3. Используйте instancing для повторяющихся объектов
4. Ограничьте количество источников света (макс. 3-5)

---

## 📊 Метрики производительности (целевые)

- **FPS**: 60 (стабильно)
- **Время рендера**: <16ms на кадр
- **Клик/hover latency**: <50ms
- **Загрузка модели**: <500ms для типичного шкафа

---

## 🔗 Документация библиотек

- **Three.js**: https://threejs.org/docs/
- **three-mesh-bvh**: https://github.com/gkjohnson/three-mesh-bvh
- **TWEEN.js**: https://github.com/tweenjs/tween.js
- **Cannon-es**: https://pmndrs.github.io/cannon-es/
- **Troika**: https://github.com/protectwise/troika
- **postprocessing**: https://github.com/pmndrs/postprocessing
