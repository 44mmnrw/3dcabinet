# 🎨 Извлечение текстур из KeyShot для Three.js

## Методы экспорта текстур из KeyShot

### 1. Material Graph Export (Лучший метод)

**Шаги:**
1. Откройте материал: **Правый клик на материале → Edit in Material Graph**
2. В Material Graph найдите ноды с текстурами
3. Для каждой текстуры:
   ```
   Правый клик на ноде → Export Texture
   Разрешение: 2048×2048 или 4096×4096
   Формат: JPG для color/roughness/ao, PNG для normal
   ```

**Что экспортировать:**
| KeyShot нода | Three.js название | Формат |
|--------------|-------------------|--------|
| Color / Diffuse | `material_albedo.jpg` | JPG |
| Roughness | `material_roughness.jpg` | JPG |
| Bump / Normal | `material_normal.png` | PNG (16-bit) |
| Ambient Occlusion | `material_ao.jpg` | JPG |
| Metallic | `material_metalness.jpg` | JPG |

---

### 2. Render Passes (Генерация карт из рендера)

**Шаги:**
1. **Render → Render Passes**
2. Включите пассы:
   - ✅ **Diffuse** → используйте как albedo
   - ✅ **Normals** → используйте как normal map
   - ✅ **Ambient Occlusion** → используйте как ao
   - ✅ **Depth** → можно конвертировать в roughness
   - ✅ **Clown** (Material ID) → для маскирования

3. **Настройки рендера:**
   ```
   Разрешение: 2048×2048 (для текстур)
   Формат: PNG-16 для Normal/Depth, JPG для остальных
   Samples: 128+ для чистого результата
   ```

4. **Render** → KeyShot создаст папку с pass-изображениями

---

### 3. Bake Textures (UV-запекание)

**Требования:** Модель должна иметь UV-развёртку

**Шаги:**
1. **Tools → Bake Textures**
2. **Настройки запекания:**
   ```
   Texture Size: 4096×4096
   Anti-Aliasing: 4x
   Включите:
   - ✅ Color
   - ✅ Normal (Tangent Space)
   - ✅ Roughness
   - ✅ Metallic
   - ✅ Ambient Occlusion
   ```

3. **Output Path:** Выберите папку `public/assets/textures/metal/keyshot/`
4. **Bake** → текстуры будут созданы с UV-координатами

---

### 4. Экспорт из Libraries

**Шаги:**
1. **Window → Libraries**
2. Вкладка **Textures**
3. Найдите используемую текстуру
4. **Правый клик → Show in Explorer** (Windows) или **Show in Finder** (Mac)
5. Скопируйте файлы в ваш проект

---

## 📁 Структура папок в проекте

После экспорта создайте такую структуру:

```
public/assets/textures/metal/
└── keyshot/
    ├── brushed_albedo.jpg       ← Color/Diffuse из KeyShot
    ├── brushed_normal.png       ← Bump/Normal из KeyShot (16-bit PNG!)
    ├── brushed_roughness.jpg    ← Roughness из KeyShot
    ├── brushed_ao.jpg           ← AO из Render Passes
    └── brushed_metalness.jpg    ← Metallic из KeyShot (если есть)
```

---

## 🔧 Конвертация и оптимизация

### Обработка Normal Map

KeyShot может экспортировать bump как grayscale. Конвертация в нормали:

**В Photoshop:**
```
Filter → 3D → Generate Normal Map
Blur: 0-5 (в зависимости от детализации)
Scale: 3-10
```

**В GIMP:**
```
Filters → Generic → Normal Map
Scale: 3-8
Height Source: Average RGB
```

**Онлайн:**
- https://cpetry.github.io/NormalMap-Online/
- Загрузите bump/height map → скачайте normal map

---

### Конвертация Depth → Roughness

Если у вас есть Depth pass, но нет Roughness:

**В Photoshop:**
```
1. Откройте depth.png
2. Image → Adjustments → Levels
   - Растяните гистограмму для контраста
3. Filter → Blur → Gaussian Blur (1-3px для сглаживания)
4. Инвертируйте если нужно: Ctrl+I
5. Save As → roughness.jpg
```

---

### Оптимизация размера

**Рекомендуемые разрешения:**
- **Albedo/Color:** 2048×2048 (JPG, quality 85%)
- **Normal:** 2048×2048 (PNG-16, без сжатия)
- **Roughness:** 1024×1024 (JPG, quality 90%)
- **AO:** 1024×1024 (JPG, quality 90%)
- **Metalness:** 1024×1024 (JPG, quality 90%)

**Пакетное изменение размера:**
```powershell
# PowerShell с ImageMagick
Get-ChildItem *.jpg | ForEach-Object {
    magick convert $_.Name -resize 2048x2048 -quality 85 ("resized_" + $_.Name)
}
```

---

## 🎯 Использование в Three.js

### 1. Создайте textureScheme в configurator.js

```javascript
// В методе loadTestCabinet() в configurator.js
const textureScheme = {
    body: '/assets/textures/metal/keyshot/brushed',      // Без суффиксов!
    door: '/assets/textures/metal/keyshot/brushed',
    panel: '/assets/textures/metal/keyshot/brushed',
    dinRail: '/assets/textures/metal/keyshot/brushed'
};

const cabinet = await this.cabinetManager.loadCabinet(
    '/assets/models/cabinet.glb',
    {
        type: 'floor',
        width: 700,
        height: 500,
        depth: 240,
        colorScheme: cabinetColorScheme,
        textureScheme: textureScheme  // ← Добавить эту строку
    }
);
```

### 2. Структура файлов (ВАЖНО — без суффиксов в пути!)

SceneManager.loadPBRTextures() автоматически добавит суффиксы:
```
/assets/textures/metal/keyshot/brushed_albedo.jpg    ← автоматически
/assets/textures/metal/keyshot/brushed_normal.png    ← автоматически
/assets/textures/metal/keyshot/brushed_roughness.jpg ← автоматически
/assets/textures/metal/keyshot/brushed_ao.jpg        ← автоматически
/assets/textures/metal/keyshot/brushed_metalness.jpg ← опционально
```

---

## 🐛 Troubleshooting

### Текстуры не загружаются
**Проверьте:**
1. Файлы точно в `public/assets/textures/metal/keyshot/`
2. Имена файлов правильные (с суффиксами `_albedo`, `_normal` и т.д.)
3. Console → проверьте ошибки 404
4. Normal map в формате PNG (не JPG!)

### Нормали выглядят неправильно
**Решение:**
- KeyShot экспортирует нормали в Tangent Space
- Проверьте Material Graph: Normal → Format → **Tangent Space** (не Object/World!)
- В Three.js используйте `normalScale: new THREE.Vector2(1, 1)` (уже есть в CabinetModel.js)

### Слишком блестящий материал
**Решение:**
- Roughness map слишком тёмная
- В Photoshop: Image → Adjustments → Levels → поднимите средний ползунок
- Или в коде: `material.roughness = 0.7;` (увеличить значение)

### Недостаточно металлический
**Решение:**
- Если KeyShot не экспортировал metalness
- В коде: `material.metalness = 0.8;` (увеличить значение)
- Или создайте metalness map: белый = металл, чёрный = диэлектрик

---

## 📚 Дополнительные ресурсы

**KeyShot документация:**
- [Material Graph Export](https://manual.keyshot.com/manual/material-graph/)
- [Render Passes](https://manual.keyshot.com/manual/rendering/passes/)
- [Texture Baking](https://manual.keyshot.com/manual/tools/bake-textures/)

**PBR теория:**
- [Physically Based Rendering Guide](https://learnopengl.com/PBR/Theory)
- [Substance PBR Guide](https://substance3d.adobe.com/tutorials/courses/the-pbr-guide-part-1)

**Конвертация текстур:**
- [Normal Map Online](https://cpetry.github.io/NormalMap-Online/)
- [Texture Tools](https://www.crazybump.com/) (платный, но мощный)
