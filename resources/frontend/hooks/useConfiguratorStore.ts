/**
 * useConfiguratorStore — React hook для синхронизации с конфигуратором
 * Подписывается на события EventBus и обновляет локальное состояние
 */
import { useState, useEffect, useCallback } from 'react';
import type { IEventBus, ConfiguratorEvents as ConfiguratorEventsType } from '../three/events/EventBus.ts';

/**
 * Интерфейс EventBus (реэкспорт из EventBus.ts)
 */
export type EventBus = IEventBus;

/**
 * Константы событий конфигуратора (реэкспорт из EventBus.ts)
 */
export type ConfiguratorEvents = typeof ConfiguratorEventsType;

/**
 * Ошибка валидации
 */
export interface ValidationError {
    message: string;
    field?: string;
    [key: string]: any;
}

/**
 * Предупреждение валидации
 */
export interface ValidationWarning {
    message: string;
    field?: string;
    [key: string]: any;
}

/**
 * Рекомендация
 */
export interface Recommendation {
    severity: 'error' | 'warning' | 'info';
    type?: string;
    message: string;
    suggestion?: string;
    [key: string]: any;
}

/**
 * Оборудование
 */
export interface Equipment {
    id: string;
    type: string;
    [key: string]: any;
}

/**
 * Состояние конфигуратора
 */
export interface ConfiguratorStoreState {
    // Cabinet
    activeCabinetId: string | null;
    cabinetType: string | null;
    
    // Equipment
    equipmentList: Equipment[];
    equipmentCount: number;
    
    // Calculations
    calculations: Record<string, unknown> | null;
    recommendations: Recommendation[];
    
    // Validation
    validationErrors: ValidationError[];
    validationWarnings: ValidationWarning[];
    
    // Status
    isLoading: boolean;
    lastUpdate: number | null;
}

/**
 * Действия для управления состоянием
 */
export interface ConfiguratorStoreActions {
    clearValidationErrors: () => void;
    clearRecommendations: () => void;
    reset: () => void;
}

/**
 * Результат хука
 */
export interface UseConfiguratorStoreResult {
    state: ConfiguratorStoreState;
    actions: ConfiguratorStoreActions;
}

/**
 * Hook для работы с конфигуратором через EventBus
 * @param eventBus - Экземпляр EventBus
 * @param events - ConfiguratorEvents
 * @returns Состояние и методы
 */
export function useConfiguratorStore(
    eventBus: EventBus,
    events: ConfiguratorEvents
): UseConfiguratorStoreResult {
    const [state, setState] = useState<ConfiguratorStoreState>({
        // Cabinet
        activeCabinetId: null,
        cabinetType: null,
        
        // Equipment
        equipmentList: [],
        equipmentCount: 0,
        
        // Calculations
        calculations: null,
        recommendations: [],
        
        // Validation
        validationErrors: [],
        validationWarnings: [],
        
        // Status
        isLoading: false,
        lastUpdate: null
    });

    // Обновление состояния (иммутабельно)
    const updateState = useCallback((updates: Partial<ConfiguratorStoreState>) => {
        setState(prev => ({
            ...prev,
            ...updates,
            lastUpdate: Date.now()
        }));
    }, []);

    useEffect(() => {
        // Cabinet events
        const onCabinetAdded = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { cabinetId, cabinetType } = event.detail || {};
            updateState({
                activeCabinetId: cabinetId || null,
                cabinetType: cabinetType || null
            });
        };

        const onCabinetRemoved = () => {
            updateState({
                activeCabinetId: null,
                cabinetType: null,
                equipmentList: [],
                equipmentCount: 0
            });
        };

        // Equipment events
        const onEquipmentAdded = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { equipment } = event.detail || {};
            if (equipment) {
                setState(prev => ({
                    ...prev,
                    equipmentList: [...prev.equipmentList, equipment],
                    equipmentCount: prev.equipmentCount + 1,
                    lastUpdate: Date.now()
                }));
            }
        };

        const onEquipmentRemoved = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { equipmentId } = event.detail || {};
            if (equipmentId) {
                setState(prev => ({
                    ...prev,
                    equipmentList: prev.equipmentList.filter(eq => eq.id !== equipmentId),
                    equipmentCount: Math.max(0, prev.equipmentCount - 1),
                    lastUpdate: Date.now()
                }));
            }
        };

        // Validation events
        const onValidationFailed = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { errors } = event.detail || {};
            updateState({
                validationErrors: errors || []
            });
        };

        const onValidationWarning = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { warnings } = event.detail || {};
            updateState({
                validationWarnings: warnings || []
            });
        };

        // Calculations events
        const onCalculationsUpdated = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { calculations } = event.detail || {};
            updateState({
                calculations: calculations || null
            });
        };

        const onRecommendationsUpdated = (event: CustomEvent | { type: string; detail: unknown }) => {
            const { recommendations } = event.detail || {};
            updateState({
                recommendations: recommendations || []
            });
        };

        // Подписка на события
        eventBus.on(events.CABINET_ADDED, onCabinetAdded);
        eventBus.on(events.CABINET_REMOVED, onCabinetRemoved);
        eventBus.on(events.EQUIPMENT_ADDED, onEquipmentAdded);
        eventBus.on(events.EQUIPMENT_REMOVED, onEquipmentRemoved);
        eventBus.on(events.VALIDATION_FAILED, onValidationFailed);
        eventBus.on(events.VALIDATION_WARNING, onValidationWarning);
        eventBus.on(events.CALCULATIONS_UPDATED, onCalculationsUpdated);
        eventBus.on(events.RECOMMENDATIONS_UPDATED, onRecommendationsUpdated);

        // Cleanup при размонтировании
        return () => {
            eventBus.off(events.CABINET_ADDED, onCabinetAdded);
            eventBus.off(events.CABINET_REMOVED, onCabinetRemoved);
            eventBus.off(events.EQUIPMENT_ADDED, onEquipmentAdded);
            eventBus.off(events.EQUIPMENT_REMOVED, onEquipmentRemoved);
            eventBus.off(events.VALIDATION_FAILED, onValidationFailed);
            eventBus.off(events.VALIDATION_WARNING, onValidationWarning);
            eventBus.off(events.CALCULATIONS_UPDATED, onCalculationsUpdated);
            eventBus.off(events.RECOMMENDATIONS_UPDATED, onRecommendationsUpdated);
        };
    }, [eventBus, events, updateState]);

    // Методы для взаимодействия
    const actions: ConfiguratorStoreActions = {
        // Сбросить ошибки валидации
        clearValidationErrors: useCallback(() => {
            updateState({
                validationErrors: [],
                validationWarnings: []
            });
        }, [updateState]),

        // Сбросить рекомендации
        clearRecommendations: useCallback(() => {
            updateState({
                recommendations: []
            });
        }, [updateState]),

        // Полный сброс состояния
        reset: useCallback(() => {
            setState({
                activeCabinetId: null,
                cabinetType: null,
                equipmentList: [],
                equipmentCount: 0,
                calculations: null,
                recommendations: [],
                validationErrors: [],
                validationWarnings: [],
                isLoading: false,
                lastUpdate: null
            });
        }, [])
    };

    return {
        state,
        actions
    };
}

/**
 * Пример использования в компоненте:
 * 
 * import { useConfiguratorStore } from '@/hooks/useConfiguratorStore';
 * import { eventBus, ConfiguratorEvents } from '../three/events/EventBus.ts';
 * 
 * function ConfiguratorPanel() {
 *     const { state, actions } = useConfiguratorStore(eventBus, ConfiguratorEvents);
 *     
 *     return (
 *         <div>
 *             <h2>Шкаф: {state.activeCabinetId}</h2>
 *             <p>Оборудования: {state.equipmentCount}</p>
 *             
 *             {state.validationErrors.length > 0 && (
 *                 <div className="errors">
 *                     {state.validationErrors.map((err, i) => (
 *                         <div key={i}>{err.message}</div>
 *                     ))}
 *                 </div>
 *             )}
 *             
 *             {state.recommendations.length > 0 && (
 *                 <div className="recommendations">
 *                     {state.recommendations.map((rec, i) => (
 *                         <div key={i} className={rec.severity}>
 *                             {rec.message}
 *                         </div>
 *                     ))}
 *                 </div>
 *             )}
 *         </div>
 *     );
 * }
 */

