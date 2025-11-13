# Исправление: InteriorPointLight не создавался

## Проблема
```
⚠️ InteriorPointLight не создан
setInteriorLight @ SceneManager.js:1023
```

Метод `setInteriorLight()` пытался использовать `this.interiorPointLight`, но он **никогда не создавался** в конструкторе/setupLighting().

## Решение
Добавлено создание `interiorPointLight` в метод `setupLighting()`:

```javascript
// В SceneManager.js, после создания основных источников света:
this.interiorPointLight = new THREE.PointLight(0xffffff, 0, 800, 2);
this.interiorPointLight.position.set(0, 0, 0); // Будет обновлено в setInteriorLight()
this.interiorPointLight.castShadow = false; // Оптимизация
this.scene.add(this.interiorPointLight);
```

## Параметры PointLight
- **Цвет**: `0xffffff` (белый)
- **Интенсивность**: `0` (изначально выключен)
- **Distance**: `800` мм (радиус освещения)
- **Decay**: `2` (физически корректное затухание)
- **Тени**: отключены (оптимизация)

## Результат
✅ Ошибка устранена  
✅ Режим сборки теперь корректно включает/выключает внутренний свет  
✅ Позиция света обновляется в `setInteriorLight()` согласно BODY шкафа
