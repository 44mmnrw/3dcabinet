import * as THREE from 'three';
import type { CabinetManager } from '../three/managers/CabinetManager';
import type { EquipmentManager } from '../three/managers/EquipmentManager';
import type { ResizableCabinet } from '../three/types/cabinet.types';

/**
 * CabinetController - Универсальный контроллер для управления шкафом
 * 
 * Централизует всю логику:
 * - Загрузка/удаление шкафа
 * - Параметрический ресайз (изменение размеров)
 * - Управление дверью (открытие/закрытие)
 * - Отображение граней (edges)
 * 
 * UI-компоненты (LeftPanel, кнопки, формы) только вызывают методы этого контроллера.
 */

export interface CabinetState {
  isLoaded: boolean;
  cabinetId: string | null;
  originalSize: THREE.Vector3 | null;
  currentSize: { width: number; height: number; depth: number };
  doorRotation: number; // в градусах
  showEdges: boolean;
}

export interface CabinetManagers {
  cabinet: CabinetManager;
  equipment?: EquipmentManager;
}

type StateChangeCallback = (state: CabinetState) => void;

class CabinetControllerClass {
  private managers: CabinetManagers | null = null;
  private state: CabinetState = {
    isLoaded: false,
    cabinetId: null,
    originalSize: null,
    currentSize: { width: 800, height: 600, depth: 250 },
    doorRotation: 0,
    showEdges: false,
  };
  
  private listeners: Set<StateChangeCallback> = new Set();
  
  // ============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================================
  
  /**
   * Устанавливает менеджеры для работы с 3D сценой
   */
  setManagers(managers: CabinetManagers): void {
    this.managers = managers;
  }
  
  /**
   * Получает текущие менеджеры
   */
  getManagers(): CabinetManagers | null {
    return this.managers;
  }
  
  // ============================================================================
  // ПОДПИСКА НА ИЗМЕНЕНИЯ СОСТОЯНИЯ
  // ============================================================================
  
  /**
   * Подписаться на изменения состояния
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    // Сразу вызываем с текущим состоянием
    callback(this.getState());
    // Возвращаем функцию отписки
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Уведомить всех подписчиков об изменении состояния
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(callback => callback(state));
  }
  
  /**
   * Получить текущее состояние (копию)
   */
  getState(): CabinetState {
    return {
      ...this.state,
      originalSize: this.state.originalSize?.clone() || null,
      currentSize: { ...this.state.currentSize },
    };
  }
  
  // ============================================================================
  // ЗАГРУЗКА / УДАЛЕНИЕ ШКАФА
  // ============================================================================
  
  /**
   * Загрузить шкаф по ID из каталога
   */
  async loadCabinet(cabinetTypeId: string = 'tshm'): Promise<string | null> {
    if (!this.managers?.cabinet) {
      console.error('❌ [CabinetController] CabinetManager не инициализирован');
      return null;
    }
    
    try {
      console.log(`📦 [CabinetController] Загрузка шкафа ${cabinetTypeId}...`);
      
      // Загружаем каталог и добавляем шкаф
      await this.managers.cabinet.loadCatalog();
      const cabinetId = await this.managers.cabinet.addCabinetById(cabinetTypeId, 'cabinet_main');
      
      // Небольшая задержка для полной загрузки
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Получаем данные о шкафе
      const cabinet = this.managers.cabinet.getCabinet(cabinetId);
      if (cabinet?.instance) {
        const instance = cabinet.instance as ResizableCabinet;
        
        // Получаем оригинальные размеры
        let originalSize: THREE.Vector3 | null = null;
        
        if (typeof instance.getOriginalSize === 'function') {
          originalSize = instance.getOriginalSize();
        } else if (instance.originalCabinetSize) {
          originalSize = instance.originalCabinetSize.clone();
        }
        
        if (originalSize) {
          this.state.originalSize = originalSize;
          this.state.currentSize = {
            width: Math.round(originalSize.x),
            height: Math.round(originalSize.y),
            depth: Math.round(originalSize.z),
          };
        }
      }
      
      this.state.isLoaded = true;
      this.state.cabinetId = cabinetId;
      this.state.doorRotation = 0;
      
      console.log(`✅ [CabinetController] Шкаф ${cabinetTypeId} загружен`);
      this.notifyListeners();
      
      return cabinetId;
    } catch (error) {
      console.error('❌ [CabinetController] Ошибка загрузки шкафа:', error);
      return null;
    }
  }
  
  /**
   * Удалить текущий шкаф
   */
  removeCabinet(): boolean {
    if (!this.managers?.cabinet || !this.state.cabinetId) {
      return false;
    }
    
    try {
      this.managers.cabinet.removeCabinet(this.state.cabinetId);
      
      this.state.isLoaded = false;
      this.state.cabinetId = null;
      this.state.originalSize = null;
      this.state.doorRotation = 0;
      this.state.showEdges = false;
      
      console.log('✅ [CabinetController] Шкаф удалён');
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('❌ [CabinetController] Ошибка удаления шкафа:', error);
      return false;
    }
  }
  
  /**
   * Переключить загрузку шкафа (загрузить/удалить)
   */
  async toggleCabinet(cabinetTypeId: string = 'tshm'): Promise<boolean> {
    if (this.state.isLoaded) {
      return this.removeCabinet();
    } else {
      const id = await this.loadCabinet(cabinetTypeId);
      return id !== null;
    }
  }
  
  // ============================================================================
  // ПАРАМЕТРИЧЕСКИЙ РЕСАЙЗ
  // ============================================================================
  
  /**
   * Изменить размеры шкафа (делегирует в CabinetManager)
   * @param width - ширина в мм
   * @param height - высота в мм
   * @param depth - глубина в мм
   */
  resize(width: number, height: number, depth: number): boolean {
    if (!this.managers?.cabinet) return false;
    
    const success = this.managers.cabinet.resize(width, height, depth);
    
    if (success) {
      this.state.currentSize = { width, height, depth };
      this.notifyListeners();
    }
    
    return success;
  }
  
  /**
   * Изменить только ширину
   */
  setWidth(width: number): boolean {
    return this.resize(width, this.state.currentSize.height, this.state.currentSize.depth);
  }
  
  /**
   * Изменить только высоту
   */
  setHeight(height: number): boolean {
    return this.resize(this.state.currentSize.width, height, this.state.currentSize.depth);
  }
  
  /**
   * Изменить только глубину
   */
  setDepth(depth: number): boolean {
    return this.resize(this.state.currentSize.width, this.state.currentSize.height, depth);
  }
  
  /**
   * Сбросить размеры к оригинальным
   */
  resetSize(): boolean {
    if (!this.state.originalSize) return false;
    
    return this.resize(
      Math.round(this.state.originalSize.x),
      Math.round(this.state.originalSize.y),
      Math.round(this.state.originalSize.z)
    );
  }
  
  // ============================================================================
  // УПРАВЛЕНИЕ ДВЕРЬЮ
  // ============================================================================
  
  /**
   * Установить угол поворота двери (делегирует в CabinetManager)
   * @param degrees - угол в градусах (0-120)
   */
  setDoorRotation(degrees: number): boolean {
    if (!this.managers?.cabinet) return false;
    
    const clampedDegrees = Math.max(0, Math.min(120, degrees));
    const success = this.managers.cabinet.setDoorRotation(clampedDegrees);
    
    if (success) {
      this.state.doorRotation = clampedDegrees;
      this.notifyListeners();
    }
    
    return success;
  }
  
  /**
   * Открыть дверь (90°)
   */
  openDoor(): boolean {
    return this.setDoorRotation(90);
  }
  
  /**
   * Закрыть дверь (0°)
   */
  closeDoor(): boolean {
    return this.setDoorRotation(0);
  }
  
  // ============================================================================
  // ОТОБРАЖЕНИЕ ГРАНЕЙ (EDGES)
  // ============================================================================
  
  /**
   * Включить/выключить отображение граней (делегирует в CabinetManager)
   */
  setShowEdges(show: boolean): boolean {
    if (!this.managers?.cabinet) return false;
    
    const success = this.managers.cabinet.setShowEdges(show);
    
    if (success) {
      this.state.showEdges = show;
      this.notifyListeners();
    }
    
    return success;
  }
  
  /**
   * Переключить отображение граней (делегирует в CabinetManager)
   */
  toggleEdges(): boolean {
    if (!this.managers?.cabinet) return false;
    
    const success = this.managers.cabinet.toggleEdges();
    
    if (success) {
      this.state.showEdges = !this.state.showEdges;
      this.notifyListeners();
    }
    
    return success;
  }
  
  // ============================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================================================================
  
  /**
   * Проверить, загружен ли шкаф
   */
  isLoaded(): boolean {
    return this.state.isLoaded;
  }
  
  /**
   * Получить оригинальные размеры
   */
  getOriginalSize(): THREE.Vector3 | null {
    return this.state.originalSize?.clone() || null;
  }
  
  /**
   * Получить текущие размеры
   */
  getCurrentSize(): { width: number; height: number; depth: number } {
    return { ...this.state.currentSize };
  }
  
  /**
   * Получить угол поворота двери
   */
  getDoorRotation(): number {
    return this.state.doorRotation;
  }
}

// Синглтон для глобального доступа
export const CabinetController = new CabinetControllerClass();

// Экспорт типа класса для тестирования
export type { CabinetControllerClass };
