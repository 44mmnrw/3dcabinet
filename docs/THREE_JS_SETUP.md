# 📚 Управление библиотеками Three.js

## Текущая конфигурация

Three.js установлен через **npm** и автоматически копируется в `public/js/libs/` после установки.

**Текущая версия**: Three.js r169 (0.169.0)

---

## 🔧 Установка и обновление

### Первая установка

```powershell
cd c:\laragon\www\3dcabinet
npm install
```

Скрипт `build-three.mjs` автоматически скопирует файлы:
- ✅ `three.module.js` → `public/js/libs/`
- ✅ `OrbitControls.js` → `public/js/libs/`
- ✅ `GLTFLoader.js` → `public/js/libs/`
- ✅ `BufferGeometryUtils.js` → `public/js/libs/`

### Обновление до новой версии

```powershell
# Обновить до последней версии
npm install three@latest

# Или до конкретной версии
npm install three@0.170.0

# Файлы автоматически обновятся в public/js/libs/
```

### Ручное копирование (если нужно)

```powershell
npm run build:three
```

---

## 📂 Структура файлов

### В node_modules (исходники)

```
node_modules/three/
├── build/
│   └── three.module.js          # Ядро Three.js
└── examples/jsm/
    ├── controls/
    │   └── OrbitControls.js     # Управление камерой
    ├── loaders/
    │   └── GLTFLoader.js        # Загрузка 3D-моделей
    └── utils/
        └── BufferGeometryUtils.js  # Утилиты геометрии
```

### В public/js/libs/ (используемые файлы)

```
public/js/libs/
├── three.module.js          # Копия из node_modules
├── OrbitControls.js         # Копия из node_modules
├── GLTFLoader.js            # Копия из node_modules
└── BufferGeometryUtils.js   # Копия из node_modules
```

---

## 🔄 Как работает автоматическое обновление

### package.json

```json
{
  "scripts": {
    "build:three": "node build-three.mjs",
    "postinstall": "npm run build:three"
  },
  "dependencies": {
    "three": "^0.169.0"
  }
}
```

- **`npm install`** → запускает `postinstall` → запускает `build:three` → копирует файлы
- **`npm run build:three`** → ручной запуск копирования

### build-three.mjs

Скрипт автоматически:
1. Создаёт папку `public/js/libs/` (если не существует)
2. Копирует 4 файла из `node_modules/three/` в `public/js/libs/`
3. Выводит статус копирования в консоль

---

## ✅ Проверка версии

### В консоли браузера (F12)

```javascript
import * as THREE from './libs/three.module.js';
console.log('Three.js версия:', THREE.REVISION);  // r169
```

### В package.json

```powershell
npm list three
```

Вывод:
```
3dcabinet@1.0.0 c:\laragon\www\3dcabinet
└── three@0.169.0
```

---

## 🚨 Решение проблем

### "Файл не найден" при npm install

**Проблема**: `node_modules/three/` не существует

**Решение**:
```powershell
rm -rf node_modules package-lock.json
npm install
```

### Старая версия после обновления

**Проблема**: Браузер кэширует старые файлы

**Решение**:
1. Очистить кэш браузера (Ctrl+Shift+R)
2. Или добавить версию в URL:
   ```javascript
   import * as THREE from './libs/three.module.js?v=169';
   ```

### Ошибки импорта после обновления

**Проблема**: API Three.js изменился между версиями

**Решение**:
1. Читайте [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
2. Обновите код в `modules/` согласно новому API
3. Тестируйте после каждого мажорного обновления

---

## 📖 Дополнительные модули Three.js

Если нужны другие модули (например, `DRACOLoader`, `RGBELoader`):

### 1. Обновите build-three.mjs

```javascript
const filesToCopy = [
    // ... существующие файлы ...
    {
        src: join(nodeModulesPath, 'examples', 'jsm', 'loaders', 'DRACOLoader.js'),
        dest: join(targetPath, 'DRACOLoader.js'),
        name: 'DRACOLoader.js'
    }
];
```

### 2. Запустите копирование

```powershell
npm run build:three
```

### 3. Импортируйте в код

```javascript
import { DRACOLoader } from '../libs/DRACOLoader.js';
```

---

## 🔗 Полезные ссылки

- **Документация Three.js**: https://threejs.org/docs/
- **Примеры**: https://threejs.org/examples/
- **GitHub**: https://github.com/mrdoob/three.js
- **npm пакет**: https://www.npmjs.com/package/three
- **Migration Guide**: https://github.com/mrdoob/three.js/wiki/Migration-Guide

---

## 📋 Чеклист обновления Three.js

- [ ] Проверить [Release Notes](https://github.com/mrdoob/three.js/releases)
- [ ] Прочитать [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) для мажорных версий
- [ ] Обновить версию: `npm install three@latest`
- [ ] Проверить копирование: `npm run build:three`
- [ ] Очистить кеш браузера (Ctrl+Shift+R)
- [ ] Проверить работу 3D-сцены на `/app`
- [ ] Проверить загрузку модели (открыть/закрыть дверь)
- [ ] Проверить взаимодействие (клик, перемещение, вращение)
- [ ] Закоммитить изменения: `git add package.json package-lock.json public/js/libs/`

---

**Последнее обновление**: 8 ноября 2025 г.
