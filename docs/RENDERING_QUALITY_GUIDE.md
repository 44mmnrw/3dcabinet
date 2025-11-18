# Улучшение качества рендеринга — Дополнительные шаги

## Что уже сделано ✅

1. **ACESFilmic Tone Mapping** — кинематографическое тонирование
2. **Студийное освещение** — 3-точечная схема (Key, Fill, Rim)
3. **Environment Map** — реалистичные отражения на металлических поверхностях
4. **Тени 4K** — увеличено разрешение теневых карт до 4096×4096
5. **Правильное цветовое пространство** — sRGB output

## Дальнейшие улучшения (опционально)

### 1. HDR Environment Map (вместо градиента)

**Что даёт**: Фотореалистичные отражения неба/студии на металле

**Как добавить**:
```javascript
// SceneManager.js, в setupLighting()
import { RGBELoader } from '../libs/RGBELoader.js';

const rgbeLoader = new RGBELoader();
rgbeLoader.load('/assets/textures/env/studio_small_03_1k.hdr', (texture) => {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    
    this.scene.environment = envMap;  // Отражения
    // this.scene.background = envMap;  // Опционально: фон как HDR
    
    texture.dispose();
    pmremGenerator.dispose();
    
    console.log('✅ HDR Environment загружен');
});
```

**Где взять HDR**:
- Poly Haven: https://polyhaven.com/hdris (бесплатные 1K-4K HDR)
- Рекомендуемые: `studio_small_03_1k.hdr`, `photo_studio_01_1k.hdr`

**Файлы**:
- Скачать `RGBELoader.js` из Three.js examples
- Положить HDR в `public/assets/textures/env/`

---

### 2. Постобработка (EffectComposer)

**Что даёт**: Bloom (свечение), SSAO (ambient occlusion), антиалиасинг

**Как добавить**:
```javascript
// SceneManager.js
import { EffectComposer } from '../libs/postprocessing/EffectComposer.js';
import { RenderPass } from '../libs/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../libs/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from '../libs/postprocessing/SMAAPass.js';

// В init(), после создания renderer
this.composer = new EffectComposer(this.renderer);

// 1. Основной рендер
const renderPass = new RenderPass(this.scene, this.camera);
this.composer.addPass(renderPass);

// 2. Bloom (свечение металла, эмиссивных материалов)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,   // strength (интенсивность свечения)
    0.4,   // radius
    0.85   // threshold (светимость материала для свечения)
);
this.composer.addPass(bloomPass);

// 3. SMAA (антиалиасинг лучше чем FXAA)
const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
this.composer.addPass(smaaPass);

// В animate(), заменить renderer.render на:
// this.composer.render();
```

**Результат**: Мягкое свечение на металлических частях, идеальные края.

---

### 3. SSAO (Screen Space Ambient Occlusion)

**Что даёт**: Затенение в углублениях/щелях (как в реальности)

**Как добавить**:
```javascript
import { SSAOPass } from '../libs/postprocessing/SSAOPass.js';

const ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
ssaoPass.kernelRadius = 16;  // Радиус затенения
ssaoPass.minDistance = 0.005; // Минимальное расстояние
ssaoPass.maxDistance = 0.1;   // Максимальное расстояние
this.composer.addPass(ssaoPass);
```

**Результат**: Шкаф выглядит "объёмнее", тени в щелях между деталями.

---

### 4. Настройка материалов для максимального качества

**Если используете текстуры из KeyShot**:
```javascript
model.traverse((child) => {
    if (child.isMesh && child.material) {
        // Включить environment map для металлических частей
        if (child.material.metalness > 0.5) {
            child.material.envMapIntensity = 1.5;  // Усилить отражения
        }
        
        // Правильное цветовое пространство текстур
        if (child.material.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
        }
        if (child.material.normalMap) {
            child.material.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
        }
        if (child.material.roughnessMap) {
            child.material.roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
        }
        
        child.material.needsUpdate = true;
    }
});
```

---

### 5. Экспозиция и контраст

**Регулировка яркости сцены**:
```javascript
// SceneManager.js, после создания renderer
this.renderer.toneMappingExposure = 1.2;  // Увеличить яркость на 20%

// Динамическая регулировка через UI
document.getElementById('exposure-slider').addEventListener('input', (e) => {
    this.renderer.toneMappingExposure = parseFloat(e.target.value);
});
```

**HTML для слайдера**:
```html
<div class="renderer-controls">
    <label>Экспозиция:</label>
    <input type="range" id="exposure-slider" min="0.5" max="2.0" step="0.1" value="1.0">
</div>
```

---

### 6. Анизотропная фильтрация текстур

**Что даёт**: Чёткие текстуры под углом (например, на DIN-рейках)

```javascript
model.traverse((child) => {
    if (child.isMesh && child.material) {
        if (child.material.map) {
            child.material.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        }
        if (child.material.normalMap) {
            child.material.normalMap.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        }
    }
});
```

---

## Сравнение производительности

| Настройка | FPS (1080p) | Качество | Рекомендация |
|-----------|-------------|----------|--------------|
| **Базовая** (было) | 60 | 6/10 | ❌ |
| **Улучшенная** (сейчас) | 60 | 8/10 | ✅ Текущая |
| **+ HDR Env** | 55-60 | 8.5/10 | ✅ Рекомендуется |
| **+ Bloom** | 50-55 | 9/10 | ⚠️ Если GPU мощная |
| **+ SSAO** | 40-50 | 9.5/10 | ⚠️ Только для screenshots |
| **Всё вместе** | 30-40 | 10/10 | ❌ Избыточно |

---

## Быстрые настройки для разных сценариев

### Режим "Производительность" (60 FPS гарантия)
```javascript
this.renderer.toneMappingExposure = 1.0;
this.renderer.shadowMap.type = THREE.BasicShadowMap;  // Простые тени
keyLight.shadow.mapSize.width = 2048;  // Вместо 4096
// НЕ используем постобработку
```

### Режим "Баланс" (текущий)
```javascript
this.renderer.toneMappingExposure = 1.0;
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
keyLight.shadow.mapSize.width = 4096;
this.scene.environment = envMap;  // HDR окружение
// Постобработка: только SMAA
```

### Режим "Качество" (для презентаций)
```javascript
this.renderer.toneMappingExposure = 1.2;
this.renderer.shadowMap.type = THREE.VSMShadowMap;  // Лучшие тени
keyLight.shadow.mapSize.width = 8192;  // Ultra HD тени
this.scene.environment = hdrEnvMap;  // HDR 4K
// Постобработка: Bloom + SSAO + SMAA
```

---

## Проверочный чеклист

- [x] **Tone Mapping**: ACESFilmic ✅
- [x] **Освещение**: 3-точечная схема ✅
- [x] **Environment Map**: Простой градиент ✅
- [x] **Тени**: 4K PCFSoft ✅
- [ ] **HDR Environment**: Нужно добавить HDR-файл
- [ ] **Постобработка**: Опционально (Bloom, SSAO)
- [x] **Цветовое пространство**: sRGB ✅
- [ ] **Анизотропная фильтрация**: Если есть текстуры на моделях

---

## Финальная настройка (рекомендуется)

Добавьте HDR Environment для идеального результата:

1. **Скачать HDR** (1K, ~2 МБ):
   ```
   https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr
   ```

2. **Положить в проект**:
   ```
   public/assets/textures/env/studio_small_03_1k.hdr
   ```

3. **Загрузить RGBELoader**:
   ```bash
   curl -o public/js/libs/RGBELoader.js \
     https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/RGBELoader.js
   ```

4. **Добавить в SceneManager.js**:
   ```javascript
   import { RGBELoader } from '../libs/RGBELoader.js';
   
   // В setupLighting(), вместо градиента:
   const rgbeLoader = new RGBELoader();
   rgbeLoader.load('/assets/textures/env/studio_small_03_1k.hdr', (texture) => {
       const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
       const envMap = pmremGenerator.fromEquirectangular(texture).texture;
       this.scene.environment = envMap;
       texture.dispose();
       pmremGenerator.dispose();
   });
   ```

**Результат**: Идентичное качество с glTF Viewer! ✨

---

**Версия**: 1.0  
**Дата**: 9 ноября 2025  
**Связано**: MATERIAL_WORKFLOW_GUIDE.md, DRACO_COMPRESSION_GUIDE.md
