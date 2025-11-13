# Roadmap: Путь к решению как у Blum

## Текущее состояние vs Целевое

| Аспект | Сейчас (3Cabinet) | Цель (как Blum) | Приоритет |
|--------|-------------------|-----------------|-----------|
| **Производительность** | ~30-40 FPS (тени включены) | 60 FPS (тени выключены) | 🔴 Высокий |
| **Архитектура моделей** | Единая GLB модель шкафа | Гибрид: процедурный + GLB | 🟡 Средний |
| **Визуальный стиль** | Realistic (PBR) | Technical (контуры Edges) | 🟢 Низкий |
| **Масштабируемость** | 1 шкаф | Каталог продуктов | 🟡 Средний |
| **Оптимизация** | Отдельные mesh'и | InstancedMesh | 🔴 Высокий |

---

## Этап 1: Быстрые победы (1-2 дня) 🚀

### 1.1 Отключить тени (+40% FPS)

**Файл**: `public/js/modules/SceneManager.js`

```javascript
// Строка ~125
this.renderer.shadowMap.enabled = false; // ← ИЗМЕНИТЬ с true

// Строка ~400
light1.castShadow = false; // ← ИЗМЕНИТЬ с true
```

**Результат**: Сразу +40% FPS, тени не критичны для термошкафов

---

### 1.2 Отключить physicallyCorrectLights (+20% FPS)

**Файл**: `public/js/modules/SceneManager.js`

```javascript
// Строка ~135
this.renderer.physicallyCorrectLights = false; // ← ИЗМЕНИТЬ с true
```

**Результат**: Быстрее расчёты освещения, визуально почти без изменений

---

### 1.3 Увеличить exposure (компенсация отсутствия теней)

**Файл**: `public/js/modules/SceneManager.js`

```javascript
// Строка ~122
this.renderer.toneMappingExposure = 1.0; // ← ИЗМЕНИТЬ с 0.8
```

**Результат**: Модель станет светлее (как у Blum без теней)

---

**Итого Этапа 1**: **+60% FPS**, 1 час работы, изменения в одном файле

---

## Этап 2: InstancedMesh для DIN-реек (1 день) ⚡

### 2.1 Создать InstancedMesh для реек

**Новый файл**: `public/js/modules/InstancedDinRails.js`

```javascript
import * as THREE from '../libs/three.module.js';

export class InstancedDinRails {
  constructor(count = 3) {
    // Геометрия одной DIN-рейки (40x7.5мм, длина по высоте панели)
    const railGeometry = new THREE.BoxGeometry(0.04, 1.8, 0.0075);
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.3
    });
    
    this.mesh = new THREE.InstancedMesh(railGeometry, railMaterial, count);
    
    // Позиции для 3 реек (слева, центр, справа)
    const positions = [
      new THREE.Vector3(-0.25, 0.9, -0.23),
      new THREE.Vector3(0, 0.9, -0.23),
      new THREE.Vector3(0.25, 0.9, -0.23)
    ];
    
    const matrix = new THREE.Matrix4();
    positions.forEach((pos, i) => {
      matrix.setPosition(pos);
      this.mesh.setMatrixAt(i, matrix);
    });
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  
  addToScene(scene) {
    scene.add(this.mesh);
  }
  
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
```

### 2.2 Интегрировать в CabinetModel

**Файл**: `public/js/modules/CabinetModel.js`

```javascript
import { InstancedDinRails } from './InstancedDinRails.js';

// В constructor:
this.dinRailsInstanced = null;

// В loadModel (после загрузки GLB):
// Скрыть оригинальные DIN-рейки из GLB
['DIN_RAIL_1', 'DIN_RAIL_2', 'DIN_RAIL_3'].forEach(name => {
  const rail = this.model.getObjectByName(name);
  if (rail) rail.visible = false;
});

// Добавить InstancedMesh
this.dinRailsInstanced = new InstancedDinRails(3);
this.dinRailsInstanced.addToScene(this.sceneManager.scene);
```

**Результат**: 3 draw calls → 1 draw call, -2 геометрии

---

## Этап 3: EdgeGeometry для контуров (2 дня) 🎨

### 3.1 Создать утилиту для Edges

**Новый файл**: `public/js/utils/EdgeUtils.js`

```javascript
import * as THREE from '../libs/three.module.js';

export class EdgeUtils {
  static createEdges(geometry, thresholdAngle = 30, color = 0x000000) {
    const edges = new THREE.EdgesGeometry(geometry, thresholdAngle);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ 
        color,
        linewidth: 1,
        transparent: true,
        opacity: 0.3
      })
    );
    return line;
  }
  
  static addEdgesToMesh(mesh, thresholdAngle = 30, color = 0x000000) {
    const edges = this.createEdges(mesh.geometry, thresholdAngle, color);
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    edges.scale.copy(mesh.scale);
    mesh.parent?.add(edges);
    return edges;
  }
  
  static addEdgesToGroup(group, thresholdAngle = 30, color = 0x000000) {
    const edgesArray = [];
    group.traverse(child => {
      if (child.isMesh && child.geometry) {
        const edges = this.addEdgesToMesh(child, thresholdAngle, color);
        edgesArray.push(edges);
      }
    });
    return edgesArray;
  }
}
```

### 3.2 Добавить контуры к шкафу

**Файл**: `public/js/modules/CabinetModel.js`

```javascript
import { EdgeUtils } from '../utils/EdgeUtils.js';

// В loadModel (после загрузки GLB):
this.edges = EdgeUtils.addEdgesToGroup(this.model, 30, 0x333333);
console.log('✅ Edges добавлены:', this.edges.length, 'линий');
```

**Результат**: Technical стиль как у Blum, чёткие контуры панелей

---

## Этап 4: Гибридная архитектура (1-2 недели) 📦

### 4.1 Разделить на корпус + оборудование

**Структура каталога**:
```
public/assets/models/
├─ thermocabinets/
│  └─ tsh_700_500_240/
│     └─ tsh_700_500_240.glb     ← ТОЛЬКО корпус (без оборудования)
└─ equipment/
   ├─ circuit_breaker.glb        ← Автоматы
   ├─ contactor.glb              ← Контакторы
   ├─ relay.glb                  ← Реле
   └─ terminal_block.glb         ← Клеммники
```

### 4.2 Создать каталог оборудования

**Новый файл**: `public/js/data/equipment-catalog.js`

```javascript
export const EQUIPMENT_CATALOG = {
  circuitBreakers: [
    {
      id: 'cb_001',
      name: 'Автомат 16A 1P',
      model: 'circuit_breaker.glb',
      width: 18,  // мм (1 модуль DIN)
      height: 85, // мм
      depth: 70,  // мм
      power: 0,
      price: 450,
      manufacturer: 'ABB',
      article: 'S201-C16'
    },
    // ... ещё автоматы
  ],
  
  contactors: [
    {
      id: 'ct_001',
      name: 'Контактор 25A',
      model: 'contactor.glb',
      width: 45,  // мм (2.5 модуля)
      height: 85,
      depth: 75,
      power: 8,   // Вт (потребление катушки)
      price: 1200,
      manufacturer: 'Schneider Electric',
      article: 'LC1D25'
    },
    // ... ещё контакторы
  ]
  
  // ... другие категории
};
```

### 4.3 Динамическая загрузка оборудования

**Новый файл**: `public/js/modules/EquipmentLoader.js`

```javascript
import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

export class EquipmentLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map(); // Кеш загруженных моделей
  }
  
  async load(equipmentId, catalogData) {
    // Проверить кеш
    if (this.cache.has(equipmentId)) {
      return this.cache.get(equipmentId).clone();
    }
    
    // Загрузить GLB
    const modelPath = `/assets/models/equipment/${catalogData.model}`;
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.userData.equipmentData = catalogData;
          
          // Кешировать
          this.cache.set(equipmentId, model);
          
          resolve(model.clone());
        },
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  clearCache() {
    this.cache.forEach(model => {
      model.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.cache.clear();
  }
}
```

### 4.4 UI для добавления оборудования

**Новый файл**: `resources/views/configurator/equipment-sidebar.blade.php`

```blade
<div class="equipment-sidebar">
    <h3>Каталог оборудования</h3>
    
    <div class="equipment-categories">
        <button class="category-btn active" data-category="circuitBreakers">
            Автоматы
        </button>
        <button class="category-btn" data-category="contactors">
            Контакторы
        </button>
        <button class="category-btn" data-category="relays">
            Реле
        </button>
        <!-- ... другие категории -->
    </div>
    
    <div class="equipment-list" id="equipmentList">
        <!-- Динамически заполняется из JS -->
    </div>
</div>
```

**JavaScript для UI**:

```javascript
// configurator.js
import { EQUIPMENT_CATALOG } from '../data/equipment-catalog.js';
import { EquipmentLoader } from '../modules/EquipmentLoader.js';

class ConfiguratorApp {
  constructor() {
    this.equipmentLoader = new EquipmentLoader();
    this.selectedCategory = 'circuitBreakers';
    this.initEquipmentUI();
  }
  
  initEquipmentUI() {
    // Обработчик выбора категории
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedCategory = e.target.dataset.category;
        this.renderEquipmentList();
      });
    });
    
    this.renderEquipmentList();
  }
  
  renderEquipmentList() {
    const listContainer = document.getElementById('equipmentList');
    const items = EQUIPMENT_CATALOG[this.selectedCategory];
    
    listContainer.innerHTML = items.map(item => `
      <div class="equipment-item" data-id="${item.id}" draggable="true">
        <img src="/assets/thumbnails/${item.id}.png" alt="${item.name}">
        <div class="item-info">
          <h4>${item.name}</h4>
          <p>${item.manufacturer} ${item.article}</p>
          <span class="price">${item.price} ₽</span>
        </div>
      </div>
    `).join('');
    
    // Drag-n-drop
    listContainer.querySelectorAll('.equipment-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('equipmentId', item.dataset.id);
      });
    });
  }
  
  async addEquipmentToScene(equipmentId) {
    const catalogData = this.findEquipmentById(equipmentId);
    const model = await this.equipmentLoader.load(equipmentId, catalogData);
    
    // Позиция на DIN-рейке (нужна логика размещения)
    model.position.set(0, 0.5, -0.2);
    
    this.sceneManager.scene.add(model);
    console.log('✅ Оборудование добавлено:', catalogData.name);
  }
  
  findEquipmentById(id) {
    for (let category in EQUIPMENT_CATALOG) {
      const item = EQUIPMENT_CATALOG[category].find(eq => eq.id === id);
      if (item) return item;
    }
    return null;
  }
}
```

**Результат**: Масштабируемая архитектура, легко добавлять новое оборудование

---

## Этап 5: Дополнительные улучшения (опционально) 🎯

### 5.1 SpotLight вместо 3 DirectionalLight

**Файл**: `public/js/modules/SceneManager.js`

```javascript
// ЗАМЕНИТЬ 3 DirectionalLight на:
const spotlight = new THREE.SpotLight(0xffffff, 1.5);
spotlight.position.set(0, 3, 2);
spotlight.angle = Math.PI / 3;
spotlight.penumbra = 0.3;
spotlight.decay = 2;
spotlight.distance = 10;
this.scene.add(spotlight);
```

### 5.2 PickBoxes для raycast

**Новый файл**: `public/js/modules/PickBoxManager.js`

```javascript
export class PickBoxManager {
  constructor(scene) {
    this.scene = scene;
    this.pickBoxes = [];
  }
  
  createPickBox(size, position, userData = {}) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    box.position.copy(position);
    box.userData = { ...userData, isPickBox: true };
    
    this.scene.add(box);
    this.pickBoxes.push(box);
    return box;
  }
  
  getPickBoxes() {
    return this.pickBoxes;
  }
}
```

### 5.3 Процедурный корпус (вместо GLB)

**Если хотите полностью как Blum** - создать корпус процедурно:

```javascript
export class ProceduralCabinet {
  constructor(width, height, depth) {
    this.group = new THREE.Group();
    
    // Панели
    this.createPanels(width, height, depth);
    
    // Винты
    this.createScrews(width, height, depth);
    
    // DIN-рейки
    this.createDinRails(width, height, depth);
  }
  
  createPanels(w, h, d) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.3,
      roughness: 0.7
    });
    
    // Верх
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.002, d),
      material
    );
    top.position.y = h;
    this.group.add(top);
    
    // Низ, боковины, задняя стенка...
    // ...
  }
  
  // ...
}
```

---

## Приоритизация задач

### 🔴 Критичные (делать первыми):
1. ✅ Отключить тени → **+40% FPS**
2. ✅ `physicallyCorrectLights: false` → **+20% FPS**
3. ✅ Увеличить exposure → компенсация

**Время**: 1 час  
**Результат**: **+60% FPS** сразу

---

### 🟡 Важные (следующая итерация):
4. ✅ InstancedMesh для DIN-реек → **-2 draw calls**
5. ✅ EdgeGeometry для контуров → **technical стиль**

**Время**: 1-2 дня  
**Результат**: Визуально ближе к Blum, чуть быстрее

---

### 🟢 Желательные (долгосрочно):
6. 📦 Гибридная архитектура (корпус + оборудование)
7. 🎨 Каталог оборудования с drag-n-drop
8. 🔍 PickBoxes для raycast
9. 💡 SpotLight вместо 3 DirectionalLight

**Время**: 2-4 недели  
**Результат**: Полноценный конфигуратор как у Blum

---

## Пошаговый план выполнения

### Неделя 1: Производительность
- [x] День 1: Отключить тени + physicallyCorrectLights
- [x] День 2: Тестирование, настройка освещения
- [x] День 3: InstancedMesh для DIN-реек
- [x] День 4: EdgeGeometry для контуров
- [x] День 5: Оптимизация материалов

### Неделя 2: Архитектура
- [ ] День 1-2: Создать каталог оборудования (данные)
- [ ] День 3-4: EquipmentLoader + кеширование
- [ ] День 5: Интеграция с UI (боковая панель)

### Неделя 3: Функциональность
- [ ] День 1-2: Drag-n-drop оборудования
- [ ] День 3-4: Размещение на DIN-рейках (автоматика)
- [ ] День 5: Расчёт цены/мощности

### Неделя 4: Полировка
- [ ] День 1-2: PickBoxes для raycast
- [ ] День 3: SpotLight освещение
- [ ] День 4-5: UI/UX доработки

---

## Метрики успеха

| Метрика | Сейчас | Цель | Статус |
|---------|--------|------|--------|
| FPS | 30-40 | 60 | 🔴 |
| Draw Calls | ~50 | ~30 | 🟡 |
| Load Time | 2-3s | <1s | 🟢 |
| Каталог оборудования | 0 | 50+ | 🔴 |
| Визуальный стиль | Realistic | Technical | 🟡 |

---

## Риски и митигации

| Риск | Вероятность | Последствия | Митигация |
|------|-------------|-------------|-----------|
| Отключение теней ухудшит восприятие | Средняя | Средние | A/B тест, опция включения |
| Гибридная архитектура сложна | Высокая | Высокие | Начать с малого, итерации |
| GLB модели оборудования дорого создавать | Средняя | Высокие | Купить готовые или упростить |
| Производительность на мобильных | Низкая | Средние | Responsive дизайн, упрощение |

---

## Следующие шаги

**Прямо сейчас (30 минут)**:
1. Открыть `SceneManager.js`
2. Изменить 3 строки (тени + physicallyCorrectLights + exposure)
3. Запустить проект
4. Замерить FPS (было/стало)

**Завтра (2 часа)**:
5. Создать `InstancedDinRails.js`
6. Интегрировать в `CabinetModel.js`
7. Проверить визуальный результат

**На неделе (8-10 часов)**:
8. Создать `EdgeUtils.js`
9. Добавить контуры к шкафу
10. Настроить прозрачность/цвет контуров

**Готовы начать?** Начинаем с Этапа 1? 🚀
