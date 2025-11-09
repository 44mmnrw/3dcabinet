# DRACO Compression — Руководство по сжатию 3D-моделей

## Что такое DRACO?

**DRACO** — это библиотека сжатия 3D-геометрии от Google. Она уменьшает размер `.glb` файлов **в 4-6 раз** без видимой потери качества.

**Пример экономии**:
- Несжатый GLB: **2000 КБ**
- Сжатый DRACO: **500 КБ** (экономия ~75%)

Для web-приложений это критично, особенно когда на сцене несколько моделей.

---

## Интеграция DRACO в 3Cabinet

### 1. Установленные файлы

**Структура библиотеки** (`public/js/libs/`):
```
js/libs/
├── DRACOLoader.js           # 13 КБ — загрузчик Three.js
└── draco/                   # Декодеры Google DRACO 1.5.6
    ├── draco_decoder.wasm   # 279 КБ — WASM-декодер (быстрый)
    ├── draco_decoder.js     # 702 КБ — JS-fallback (для старых браузеров)
    └── draco_wasm_wrapper.js # 57 КБ — обёртка для WASM
```

**Версии**:
- Three.js: **r158** (совпадает с основной версией)
- DRACO: **1.5.6** (стабильная версия от Google)

### 2. Где используется

**Автоматическая настройка** в двух местах:

#### A. `CabinetModel.js` (загрузка шкафов)
```javascript
import { DRACOLoader } from '../libs/DRACOLoader.js';

async load() {
    // Настраиваем DRACO перед загрузкой
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/js/libs/draco/');  // Путь к WASM
    dracoLoader.setDecoderConfig({ type: 'js' });    // Авто-выбор WASM/JS
    this.loader.setDRACOLoader(dracoLoader);
    
    // Теперь loader поддерживает сжатые модели
    this.loader.load(this.modelPath, ...);
}
```

#### B. `configurator.js` (загрузка оборудования)
```javascript
import { DRACOLoader } from '../libs/DRACOLoader.js';

async loadTestEquipment(cabinet) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/js/libs/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // Загружает circuit_breaker.glb (сжатый)
    const gltf = await loader.loadAsync(equipmentPath);
}
```

### 3. Как работает

**Автоматическое определение**:
- GLTFLoader проверяет, сжата ли модель через DRACO
- Если **да** → использует DRACOLoader для декомпрессии
- Если **нет** → загружает как обычный GLB

**Выбор декодера**:
- `type: 'js'` → библиотека автоматически выбирает:
  - **WASM** (draco_decoder.wasm) — если браузер поддерживает (быстро)
  - **JS** (draco_decoder.js) — fallback для IE11/старых браузеров (медленно)

---

## Экспорт моделей с DRACO

### KeyShot (рекомендовано)

**Настройки экспорта GLB**:
1. File → Export → 3D Model
2. Формат: **GLB (Binary)**
3. Units: **Millimeters** (важно для масштаба!)
4. **☑ Draco Compression** — ВКЛЮЧИТЬ
5. Draco Compression Level: **7** (по умолчанию, баланс качества/размера)
6. Export

**Результат**:
```
circuit_breaker.glb
├── Размер: 500 КБ (вместо 2000 КБ)
├── DRACO: Enabled
└── Качество: Визуально идентично оригиналу
```

### Blender (альтернатива)

**Экспорт GLB с DRACO**:
1. File → Export → glTF 2.0 (.glb)
2. Format: **glTF Binary (.glb)**
3. **Compression → Draco mesh compression** ✅
4. Compression level: **6** (по умолчанию)
5. Quantization:
   - Position: **14** bits (высокое качество)
   - Normal: **10** bits
   - TexCoord: **12** bits
6. Export GLB

**Опционально — настройки для web**:
- ☑ Apply Modifiers (применить модификаторы)
- ☑ UVs (текстурные координаты)
- ☑ Normals (нормали)
- ☐ Tangents (отключить, если не нужны для материалов)
- ☑ Compression (DRACO включён!)

### Python скрипт (автоматизация)

Если у вас много моделей, можно сжать через **gltf-pipeline** (Node.js):

```bash
# Установить (один раз)
npm install -g gltf-pipeline

# Сжать одну модель
gltf-pipeline -i model.glb -o model_compressed.glb -d

# Batch-обработка всех GLB в папке
for file in *.glb; do
  gltf-pipeline -i "$file" -o "compressed_$file" -d
done
```

**Флаги**:
- `-d` → включить DRACO compression
- `-s` → дополнительная оптимизация (убрать неиспользуемые вершины)

---

## Проверка сжатия

### Через консоль браузера

После загрузки модели:
```javascript
console.log('✅ GLTF загружен успешно:', modelPath);
// Если DRACO был использован, в консоли будет:
// "DRACOLoader: Transcoding DRACO compressed mesh"
```

### Через инструменты

**gltf-validator** (проверка корректности):
```bash
npm install -g gltf-validator
gltf-validator model.glb

# Вывод покажет:
# - Использование DRACO: Yes
# - Compression ratio: 4.2x
# - Ошибки (если есть)
```

**glTF Report** (онлайн):
- Сайт: https://gltf.report/
- Загрузить GLB
- Показывает размер текстур, геометрии, compression

---

## Производительность

### Время декомпрессии

**WASM-декодер** (draco_decoder.wasm):
- Модель 500 КБ: **~50-100 мс** (незаметно)
- Модель 2000 КБ: **~200-300 мс** (приемлемо)

**JS-декодер** (draco_decoder.js, fallback):
- Модель 500 КБ: **~300-500 мс** (медленно)
- Модель 2000 КБ: **~1000-1500 мс** (очень медленно)

**Рекомендация**: WASM поддерживается всеми современными браузерами (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+).

### Размер декодеров

**Что загружается при первой загрузке**:
```
DRACOLoader.js         13 КБ   (всегда)
draco_decoder.wasm    279 КБ   (WASM, кешируется)
ИЛИ
draco_decoder.js      702 КБ   (JS fallback, кешируется)
```

**При повторных загрузках** (кеш браузера):
- Декодеры берутся из кеша → **0 КБ**
- Загружаются только новые модели

**Итого** (первая загрузка 3 моделей):
```
Без DRACO:
- model1.glb: 2000 КБ
- model2.glb: 1800 КБ
- model3.glb: 2200 КБ
= 6000 КБ

С DRACO:
- DRACOLoader.js: 13 КБ
- draco_decoder.wasm: 279 КБ
- model1.glb: 500 КБ
- model2.glb: 450 КБ
- model3.glb: 550 КБ
= 1792 КБ (экономия ~70%)
```

---

## Совместимость

### Поддержка браузерами

**WASM-декодер** (быстрый):
- ✅ Chrome 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Edge 16+
- ✅ Opera 44+
- ❌ IE 11 (fallback на JS)

**JS-декодер** (fallback):
- ✅ Все браузеры (включая IE 11)

**Автоматический fallback**:
```javascript
dracoLoader.setDecoderConfig({ type: 'js' });
// → Библиотека сама выберет WASM или JS
```

### Three.js версии

**Совместимость версий**:
- Three.js r100+ → DRACO 1.4.x
- Three.js r150+ → DRACO 1.5.x
- **Проект**: Three.js r158 + DRACO 1.5.6 ✅

---

## Отладка

### Проблема: "No DRACOLoader instance provided"

**Причина**: Модель сжата DRACO, но loader не настроен.

**Решение**:
```javascript
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/js/libs/draco/');
loader.setDRACOLoader(dracoLoader);  // ← ВАЖНО!
```

### Проблема: "Failed to fetch draco_decoder.wasm"

**Причина**: Неправильный путь к декодерам.

**Решение**:
- Проверьте путь: `/js/libs/draco/` (без `public/`)
- Убедитесь, что файлы существуют:
  ```
  public/js/libs/draco/draco_decoder.wasm
  public/js/libs/draco/draco_decoder.js
  ```

### Проблема: CORS ошибка при загрузке WASM

**Причина**: Сервер блокирует WASM файлы.

**Решение** (для Apache):
```apache
# .htaccess
<FilesMatch "\.(wasm)$">
  Header set Content-Type "application/wasm"
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

**Решение** (для Nginx):
```nginx
location ~ \.wasm$ {
  types { application/wasm wasm; }
  add_header Access-Control-Allow-Origin *;
}
```

### Проблема: Модель загружается, но очень медленно

**Диагностика**:
```javascript
console.time('DRACO decode');
loader.load(path, (gltf) => {
  console.timeEnd('DRACO decode'); // Время декомпрессии
});
```

**Если >500 мс**:
- Вероятно, используется JS-декодер (проверьте в Network → wasm не загружается)
- Снизьте уровень сжатия в KeyShot (6 вместо 7)
- Или используйте несжатые модели для мелких объектов (<500 КБ)

---

## Рекомендации

### Когда использовать DRACO

**✅ Используйте DRACO для**:
- Моделей >500 КБ (экономия существенна)
- Статичного оборудования (серверы, коммутаторы, ИБП)
- Моделей с высоким polycount (>10k треугольников)
- Множества моделей на сцене (3+)

**❌ НЕ используйте DRACO для**:
- Моделей <100 КБ (overhead декодера не окупится)
- Анимированных моделей (если нужна анимация скелета)
- Простых примитивов (кубы, сферы) — Three.js геометрия быстрее

### Оптимизация экспорта

**KeyShot Settings** (оптимальные):
- Units: **Millimeters** (соответствует масштабу 3Cabinet)
- Draco Compression: **☑ Enabled**
- Compression Level: **7** (баланс)
- Include Textures: **☐ No** (если материалы простые, используйте Three.js MeshStandardMaterial)

**Blender Settings** (оптимальные):
- Compression: **6** (по умолчанию)
- Quantization Position: **14 bits** (высокое качество для точных размеров)
- Quantization Normal: **10 bits** (достаточно для освещения)

### Файловая структура проекта

**Рекомендуемое размещение**:
```
public/assets/models/
├── thermocabinets/          # Шкафы (сжаты DRACO)
│   ├── tsh_700_500_240.glb  # 500 КБ (было 2000 КБ)
│   └── ...
├── equipment/               # Оборудование (сжато DRACO)
│   ├── circuit_breaker/
│   │   └── circuit_breaker.glb  # 500 КБ (было 2000 КБ)
│   ├── servers/
│   └── switches/
└── accessories/            # Мелкие детали (НЕ сжимать)
    ├── cable.glb           # 50 КБ (сжатие не нужно)
    └── screw.glb           # 20 КБ
```

---

## Обновление декодеров

### Ручное обновление (при выходе новой версии DRACO)

**Шаги**:
1. Проверить текущую версию Three.js в проекте
2. Скачать соответствующий DRACOLoader.js:
   ```bash
   curl -o DRACOLoader.js https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/DRACOLoader.js
   ```
3. Скачать декодеры из Google CDN (gstatic.com):
   - Проверить последнюю версию: https://github.com/google/draco/releases
   - Пример для 1.5.7:
     ```bash
     curl -o draco_decoder.wasm https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.wasm
     curl -o draco_decoder.js https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.js
     curl -o draco_wasm_wrapper.js https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_wasm_wrapper.js
     ```
4. Тестировать загрузку моделей (проверить консоль на ошибки)

### Автоматизация через npm (опционально)

**Добавить в package.json**:
```json
{
  "scripts": {
    "update-draco": "node scripts/update-draco.mjs"
  },
  "devDependencies": {
    "draco3d": "^1.5.6"
  }
}
```

**Скрипт update-draco.mjs**:
```javascript
import fs from 'fs';
import https from 'https';
const DRACO_VERSION = '1.5.6';
const DEST = './public/js/libs/draco/';
const files = ['draco_decoder.wasm', 'draco_decoder.js', 'draco_wasm_wrapper.js'];
files.forEach(file => {
  const url = `https://www.gstatic.com/draco/versioned/decoders/${DRACO_VERSION}/${file}`;
  https.get(url, res => res.pipe(fs.createWriteStream(DEST + file)));
});
```

---

## Чеклист интеграции DRACO

### Для разработчиков

- [x] **Скачаны декодеры**: DRACOLoader.js, draco_decoder.wasm, draco_decoder.js, draco_wasm_wrapper.js
- [x] **Импортирован DRACOLoader** в CabinetModel.js и configurator.js
- [x] **Настроен путь**: `dracoLoader.setDecoderPath('/js/libs/draco/')`
- [x] **Установлен в GLTFLoader**: `loader.setDRACOLoader(dracoLoader)`
- [ ] **Протестирована загрузка** сжатых моделей (circuit_breaker.glb)
- [ ] **Проверено время декомпрессии** в консоли браузера (<200 мс для 500 КБ)
- [ ] **Проверена совместимость** (Chrome, Firefox, Safari, Edge)

### Для 3D-художников

- [ ] **Экспортированы модели** с DRACO compression (KeyShot/Blender)
- [ ] **Проверен размер файлов** (сжатие ~4-6x от оригинала)
- [ ] **Проверены единицы измерения** (Millimeters для KeyShot)
- [ ] **Протестировано качество** (визуально идентично несжатой версии)
- [ ] **Заменены старые модели** в public/assets/models/

---

## Дополнительные ресурсы

**Официальные документы**:
- DRACO GitHub: https://github.com/google/draco
- Three.js DRACOLoader: https://threejs.org/docs/#examples/en/loaders/DRACOLoader
- glTF 2.0 Spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

**Инструменты**:
- gltf-pipeline (CLI сжатие): https://github.com/CesiumGS/gltf-pipeline
- gltf-validator (проверка): https://github.com/KhronosGroup/glTF-Validator
- glTF Report (онлайн анализ): https://gltf.report/

**Тестирование производительности**:
- WebPageTest: https://www.webpagetest.org/ (сравнить размер загружаемых моделей)
- Chrome DevTools → Network → Filter: GLB (показывает размер и время загрузки)

---

**Версия**: 1.0  
**Дата**: 9 ноября 2025  
**Автор**: 3Cabinet Team  
**Обновлено**: После интеграции DRACO 1.5.6 + Three.js r158
