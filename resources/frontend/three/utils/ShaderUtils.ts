// ShaderUtils.ts — утилиты для работы с шейдерами без сборщика
// Загрузка GLSL-файлов по fetch и фабрики ShaderMaterial.

import * as THREE from 'three';

/**
 * Загружает текстовый файл (GLSL) по относительному пути в public/
 * @param url - URL файла для загрузки
 * @returns Текст файла
 */
export async function loadText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.text();
}

/**
 * Опции для создания ShaderMaterial
 */
export interface ShaderMaterialOptions {
  vertexUrl: string;
  fragmentUrl: string;
  uniforms?: Record<string, THREE.IUniform>;
  transparent?: boolean;
  blending?: THREE.Blending;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: THREE.Side;
  defines?: Record<string, any>;
}

/**
 * Универсальный конструктор ShaderMaterial
 * @param options - Опции для создания материала
 * @returns Созданный ShaderMaterial
 */
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
}: ShaderMaterialOptions): Promise<THREE.ShaderMaterial> {
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

/**
 * Обновляет uTime (вызывайте в анимационном цикле, если нужно)
 * @param material - Материал для обновления
 * @param delta - Дельта времени
 */
export function updateTime(material: THREE.ShaderMaterial | null | undefined, delta: number): void {
  if (material && material.uniforms && material.uniforms['uTime']) {
    material.uniforms['uTime'].value += delta;
  }
}

/**
 * Опции для создания Fresnel-материала
 */
export interface FresnelMaterialOptions {
  color?: number | string | THREE.Color;
  power?: number;
  intensity?: number;
  opacity?: number;
}

/**
 * Готовая фабрика Fresnel-материала (для подсветки выбранных объектов)
 * @param options - Опции для создания материала
 * @returns Созданный Fresnel-материал
 */
export async function createFresnelMaterial(options: FresnelMaterialOptions = {}): Promise<THREE.ShaderMaterial> {
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

/**
 * Опции для создания Fresnel-контура
 */
export interface FresnelOutlineOptions extends FresnelMaterialOptions {
  scaleMultiplier?: number;
}

/**
 * Создает Fresnel-контур для меша (для подсветки выбранных объектов)
 * @param mesh - Меш для создания контура
 * @param options - Опции для создания контура
 * @returns Клон меша с Fresnel-материалом
 */
export async function createFresnelOutline(
  mesh: THREE.Mesh | THREE.Group,
  options: FresnelOutlineOptions = {}
): Promise<THREE.Mesh | THREE.Group> {
  const outline = mesh.clone() as THREE.Mesh | THREE.Group;
  const fresnelMaterial = await createFresnelMaterial(options);
  
  // Применить материал: для Mesh напрямую, для Group - ко всем дочерним мешам
  if (outline instanceof THREE.Mesh) {
    outline.material = fresnelMaterial;
  } else if (outline instanceof THREE.Group) {
    outline.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = fresnelMaterial;
      }
    });
  }
  
  // Копировать мировую трансформацию (позиция, поворот, масштаб)
  mesh.updateMatrixWorld(true);
  outline.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
  outline.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
  outline.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
  outline.scale.multiplyScalar(options.scaleMultiplier ?? 1.02);
  
  outline.renderOrder = (mesh.renderOrder ?? 0) + 10;
  outline.userData['__isOutline'] = true;
  return outline;
}

