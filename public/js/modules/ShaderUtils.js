// ShaderUtils.js — утилиты для работы с шейдерами без сборщика
// Загрузка GLSL-файлов по fetch и фабрики ShaderMaterial.

import * as THREE from '../libs/three.module.js';

// Загружает текстовый файл (GLSL) по относительному пути в public/
export async function loadText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.text();
}

// Универсальный конструктор ShaderMaterial
export async function createShaderMaterial({
  vertexUrl,
  fragmentUrl,
  uniforms = {},
  transparent = true,
  blending = THREE.AdditiveBlending,
  depthWrite = false,
  depthTest = true,
  side = THREE.FrontSide,
  defines = {},
}) {
  const [vertexShader, fragmentShader] = await Promise.all([
    loadText(vertexUrl),
    loadText(fragmentUrl),
  ]);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      ...uniforms,
    },
    transparent,
    blending,
    depthWrite,
    depthTest,
    side,
    defines,
  });

  return material;
}

// Обновляет uTime (вызывайте в анимационном цикле, если нужно)
export function updateTime(material, delta) {
  if (material && material.uniforms && material.uniforms.uTime) {
    material.uniforms.uTime.value += delta;
  }
}

// Готовая фабрика Fresnel-материала (для подсветки выбранных объектов)
export async function createFresnelMaterial(options = {}) {
  const color = new THREE.Color(options.color ?? 0x8b5cf6); // фирменный фиолетовый
  const power = options.power ?? 2.0;
  const intensity = options.intensity ?? 1.0;
  const opacity = options.opacity ?? 1.0;

  return await createShaderMaterial({
    vertexUrl: '/js/shaders/fresnel.vert.glsl',
    fragmentUrl: '/js/shaders/fresnel.frag.glsl',
    uniforms: {
      uColor: { value: color },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uOpacity: { value: opacity },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
  });
}

// Утилита: создать "обводку" путём небольшого масштабирования копии меша
export async function createFresnelOutline(mesh, options = {}) {
  const outline = mesh.clone();
  outline.material = await createFresnelMaterial(options);
  // Чуть-чуть увеличим, чтобы обводка была видна поверх
  outline.scale.multiplyScalar(options.scaleMultiplier ?? 1.02);
  // Положим поверх основного (depthWrite=false в материале уже помогает)
  outline.renderOrder = (mesh.renderOrder ?? 0) + 10;
  outline.userData.__isOutline = true;
  return outline;
}
