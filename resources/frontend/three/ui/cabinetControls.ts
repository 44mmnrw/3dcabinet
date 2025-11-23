/**
 * UI контроллер для управления шкафом (универсальный для любых шкафов)
 * Автоматически работает с любым шкафом, если он наследует CabinetBase
 */

import * as THREE from 'three';
import type { CabinetManager } from '../managers/CabinetManager.ts';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Инициализация контролов для управления шкафом
 * @param cabinetManager - Менеджер шкафов
 * @param camera - Камера Three.js
 * @param controls - Орбитальные контролы камеры
 */
export function initCabinetControls(
    cabinetManager: CabinetManager,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls
): void {
    const cabinet = cabinetManager.getActiveCabinet();
    if (!cabinet || !cabinet.instance) {
        return;
    }

    // === ДВЕРЬ (Универсальная поддержка) ===
    const btnOpenDoor = document.getElementById('btn-open-door') as HTMLButtonElement | null;
    const btnCloseDoor = document.getElementById('btn-close-door') as HTMLButtonElement | null;
    const doorSlider = document.getElementById('door-angle') as HTMLInputElement | null;
    const doorValue = document.getElementById('door-angle-value') as HTMLElement | null;

    // Вспомогательная функция для установки значения слайдера и текста
    const updateDoorDisplay = (degrees: number): void => {
        if (doorSlider) doorSlider.value = degrees.toString();
        if (doorValue) doorValue.textContent = degrees + '°';
    };

    // Функция для открытия двери (универсальная)
    const openDoor = (angle: number = -Math.PI / 2): void => {
        cabinet.instance.setDoorRotation(angle);
        const degrees = Math.abs(Math.round(angle * 180 / Math.PI));
        updateDoorDisplay(degrees);
    };

    // Функция для закрытия двери (универсальная)
    const closeDoor = (): void => {
        cabinet.instance.setDoorRotation(0);
        updateDoorDisplay(0);
    };

    if (btnOpenDoor) {
        btnOpenDoor.onclick = () => openDoor();
    }

    if (btnCloseDoor) {
        btnCloseDoor.onclick = closeDoor;
    }

    if (doorSlider) {
        doorSlider.oninput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const degrees = parseInt(target.value);
            const radians = -(degrees * Math.PI / 180);
            cabinet.instance.setDoorRotation(radians);
            updateDoorDisplay(degrees);
        };
    }

    // === ВИДИМОСТЬ ===
    const showBody = document.getElementById('show-body') as HTMLInputElement | null;
    const showDoor = document.getElementById('show-door') as HTMLInputElement | null;
    const showPanel = document.getElementById('show-panel') as HTMLInputElement | null;
    const showRails = document.getElementById('show-rails') as HTMLInputElement | null;

    if (showBody) {
        showBody.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (cabinet.instance.setComponentVisibility) {
                cabinet.instance.setComponentVisibility('body', target.checked);
            }
        };
    }

    if (showDoor) {
        showDoor.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (cabinet.instance.setComponentVisibility) {
                cabinet.instance.setComponentVisibility('door', target.checked);
            }
        };
    }

    if (showPanel) {
        showPanel.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (cabinet.instance.setComponentVisibility) {
                cabinet.instance.setComponentVisibility('panel', target.checked);
            }
        };
    }

    if (showRails) {
        showRails.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const components = cabinet.instance.getComponents();
            Object.keys(components).forEach(key => {
                if (key.includes('DIN_Rail') || key.includes('dinRail')) {
                    if (cabinet.instance.setComponentVisibility) {
                        cabinet.instance.setComponentVisibility(key, target.checked);
                    }
                }
            });
        };
    }

    // === КАМЕРА ===
    const btnResetCamera = document.getElementById('btn-reset-camera') as HTMLButtonElement | null;
    const btnTopView = document.getElementById('btn-top-view') as HTMLButtonElement | null;
    const btnFrontView = document.getElementById('btn-front-view') as HTMLButtonElement | null;

    if (btnResetCamera) {
        btnResetCamera.onclick = () => {
            camera.position.set(2, 1.5, 3);
            controls.target.set(0, 0.5, 0);
            controls.update();
        };
    }

    if (btnTopView) {
        btnTopView.onclick = () => {
            camera.position.set(0, 3, 0);
            controls.target.set(0, 0, 0);
            controls.update();
        };
    }

    if (btnFrontView) {
        btnFrontView.onclick = () => {
            camera.position.set(0, 1, 3);
            controls.target.set(0, 0.5, 0);
            controls.update();
        };
    }

    // === ИНФОРМАЦИЯ ===
    const btnShowInfo = document.getElementById('btn-show-info') as HTMLButtonElement | null;
    if (btnShowInfo) {
        btnShowInfo.onclick = () => {
            if (cabinet.instance && typeof (cabinet.instance as { getInfo?: () => unknown }).getInfo === 'function') {
                alert('Информация выведена в консоль (F12)');
            }
        };
    }

    // === СЧЁТЧИКИ ===
    const componentCount = document.getElementById('component-count') as HTMLElement | null;
    if (componentCount && cabinet.instance.getComponents) {
        const components = cabinet.instance.getComponents();
        componentCount.textContent = Object.keys(components).length.toString();
    }

    // FPS
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsDisplay = document.getElementById('fps') as HTMLElement | null;
    
    function updateFPS(): void {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
            if (fpsDisplay) fpsDisplay.textContent = frameCount.toString();
            frameCount = 0;
            lastTime = currentTime;
        }
        requestAnimationFrame(updateFPS);
    }
    if (fpsDisplay) updateFPS();
}

