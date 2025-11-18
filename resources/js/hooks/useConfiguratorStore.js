/**
 * useConfiguratorStore — React hook для синхронизации с конфигуратором
 * Подписывается на события EventBus и обновляет локальное состояние
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook для работы с конфигуратором через EventBus
 * @param {Object} eventBus - Экземпляр EventBus
 * @param {Object} events - ConfiguratorEvents
 * @returns {Object} Состояние и методы
 */
export function useConfiguratorStore(eventBus, events) {
    const [state, setState] = useState({
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
    const updateState = useCallback((updates) => {
        setState(prev => ({
            ...prev,
            ...updates,
            lastUpdate: Date.now()
        }));
    }, []);

    useEffect(() => {
        // Cabinet events
        const onCabinetAdded = (event) => {
            const { cabinetId, cabinetType } = event.detail;
            updateState({
                activeCabinetId: cabinetId,
                cabinetType: cabinetType
            });
        };

        const onCabinetRemoved = (event) => {
            updateState({
                activeCabinetId: null,
                cabinetType: null,
                equipmentList: [],
                equipmentCount: 0
            });
        };

        // Equipment events
        const onEquipmentAdded = (event) => {
            const { equipment } = event.detail;
            setState(prev => ({
                ...prev,
                equipmentList: [...prev.equipmentList, equipment],
                equipmentCount: prev.equipmentCount + 1,
                lastUpdate: Date.now()
            }));
        };

        const onEquipmentRemoved = (event) => {
            const { equipmentId } = event.detail;
            setState(prev => ({
                ...prev,
                equipmentList: prev.equipmentList.filter(eq => eq.id !== equipmentId),
                equipmentCount: Math.max(0, prev.equipmentCount - 1),
                lastUpdate: Date.now()
            }));
        };

        // Validation events
        const onValidationFailed = (event) => {
            const { errors } = event.detail;
            updateState({
                validationErrors: errors || []
            });
        };

        const onValidationWarning = (event) => {
            const { warnings } = event.detail;
            updateState({
                validationWarnings: warnings || []
            });
        };

        // Calculations events
        const onCalculationsUpdated = (event) => {
            const { calculations } = event.detail;
            updateState({
                calculations: calculations
            });
        };

        const onRecommendationsUpdated = (event) => {
            const { recommendations } = event.detail;
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
    const actions = {
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
 * import { eventBus, ConfiguratorEvents } from '@public/js/events/EventBus';
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
