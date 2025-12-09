import { useState, useEffect, useCallback, useRef } from 'react';
import { CabinetController, CabinetState, CabinetManagers } from '@/services/CabinetController';

/**
 * React-хук для работы с CabinetController
 * 
 * Предоставляет:
 * - Реактивное состояние шкафа
 * - Методы управления (resize, door, edges)
 * - Автоматическую синхронизацию с контроллером
 * 
 * @example
 * ```tsx
 * const { state, resize, setDoorRotation, toggleCabinet } = useCabinetController(managers);
 * 
 * // Изменить размер
 * resize(600, 500, 200);
 * 
 * // Открыть дверь
 * setDoorRotation(90);
 * ```
 */
export function useCabinetController(
  managers?: CabinetManagers | null,
  managersRef?: React.RefObject<CabinetManagers | null>
) {
  const [state, setState] = useState<CabinetState>(CabinetController.getState());
  const initialized = useRef(false);
  
  // Устанавливаем менеджеры при монтировании
  useEffect(() => {
    const m = managersRef?.current || managers;
    if (m && !initialized.current) {
      CabinetController.setManagers(m);
      initialized.current = true;
    }
  }, [managers, managersRef]);
  
  // Подписываемся на изменения состояния
  useEffect(() => {
    const unsubscribe = CabinetController.subscribe(setState);
    return unsubscribe;
  }, []);
  
  // ============================================================================
  // МЕТОДЫ УПРАВЛЕНИЯ
  // ============================================================================
  
  const loadCabinet = useCallback(async (cabinetTypeId: string = 'tshm') => {
    // Обновляем менеджеры перед загрузкой
    const m = managersRef?.current || managers;
    if (m) CabinetController.setManagers(m);
    return CabinetController.loadCabinet(cabinetTypeId);
  }, [managers, managersRef]);
  
  const removeCabinet = useCallback(() => {
    return CabinetController.removeCabinet();
  }, []);
  
  const toggleCabinet = useCallback(async (cabinetTypeId: string = 'tshm') => {
    // Обновляем менеджеры перед операцией
    const m = managersRef?.current || managers;
    if (m) CabinetController.setManagers(m);
    return CabinetController.toggleCabinet(cabinetTypeId);
  }, [managers, managersRef]);
  
  const resize = useCallback((width: number, height: number, depth: number) => {
    return CabinetController.resize(width, height, depth);
  }, []);
  
  const setWidth = useCallback((width: number) => {
    return CabinetController.setWidth(width);
  }, []);
  
  const setHeight = useCallback((height: number) => {
    return CabinetController.setHeight(height);
  }, []);
  
  const setDepth = useCallback((depth: number) => {
    return CabinetController.setDepth(depth);
  }, []);
  
  const resetSize = useCallback(() => {
    return CabinetController.resetSize();
  }, []);
  
  const setDoorRotation = useCallback((degrees: number) => {
    return CabinetController.setDoorRotation(degrees);
  }, []);
  
  const openDoor = useCallback(() => {
    return CabinetController.openDoor();
  }, []);
  
  const closeDoor = useCallback(() => {
    return CabinetController.closeDoor();
  }, []);
  
  const setShowEdges = useCallback((show: boolean) => {
    return CabinetController.setShowEdges(show);
  }, []);
  
  const toggleEdges = useCallback(() => {
    return CabinetController.toggleEdges();
  }, []);
  
  return {
    // Состояние
    state,
    isLoaded: state.isLoaded,
    originalSize: state.originalSize,
    currentSize: state.currentSize,
    doorRotation: state.doorRotation,
    showEdges: state.showEdges,
    
    // Загрузка/удаление
    loadCabinet,
    removeCabinet,
    toggleCabinet,
    
    // Ресайз
    resize,
    setWidth,
    setHeight,
    setDepth,
    resetSize,
    
    // Дверь
    setDoorRotation,
    openDoor,
    closeDoor,
    
    // Грани
    setShowEdges,
    toggleEdges,
    
    // Прямой доступ к контроллеру (для продвинутых случаев)
    controller: CabinetController,
  };
}

export default useCabinetController;
