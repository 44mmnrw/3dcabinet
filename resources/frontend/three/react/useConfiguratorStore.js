// useConfiguratorStore — React hook без импорта (использует глобальный React)
export function useConfiguratorStore(eventBus, events) {
  const { useState, useEffect, useCallback } = React;

  const [state, setState] = useState({
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

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates, lastUpdate: Date.now() }));
  }, []);

  useEffect(() => {
    const onCabinetAdded = (event) => {
      const { cabinetId, cabinetType } = event.detail || {};
      updateState({ activeCabinetId: cabinetId, cabinetType });
    };
    const onCabinetRemoved = () => {
      updateState({
        activeCabinetId: null,
        cabinetType: null,
        equipmentList: [],
        equipmentCount: 0
      });
    };
    const onEquipmentAdded = (event) => {
      const { equipment } = event.detail || {};
      setState((prev) => ({
        ...prev,
        equipmentList: [...prev.equipmentList, equipment],
        equipmentCount: prev.equipmentCount + 1,
        lastUpdate: Date.now()
      }));
    };
    const onEquipmentRemoved = (event) => {
      const { equipmentId } = event.detail || {};
      setState((prev) => ({
        ...prev,
        equipmentList: prev.equipmentList.filter((eq) => eq.id !== equipmentId),
        equipmentCount: Math.max(0, prev.equipmentCount - 1),
        lastUpdate: Date.now()
      }));
    };
    const onValidationFailed = (event) => {
      const { errors } = event.detail || {};
      updateState({ validationErrors: errors || [] });
    };
    const onValidationWarning = (event) => {
      const { warnings } = event.detail || {};
      updateState({ validationWarnings: warnings || [] });
    };
    const onCalculationsUpdated = (event) => {
      const { calculations } = event.detail || {};
      updateState({ calculations });
    };
    const onRecommendationsUpdated = (event) => {
      const { recommendations } = event.detail || {};
      updateState({ recommendations: recommendations || [] });
    };

    eventBus.on(events.CABINET_ADDED, onCabinetAdded);
    eventBus.on(events.CABINET_REMOVED, onCabinetRemoved);
    eventBus.on(events.EQUIPMENT_ADDED, onEquipmentAdded);
    eventBus.on(events.EQUIPMENT_REMOVED, onEquipmentRemoved);
    eventBus.on(events.VALIDATION_FAILED, onValidationFailed);
    eventBus.on(events.VALIDATION_WARNING, onValidationWarning);
    eventBus.on(events.CALCULATIONS_UPDATED, onCalculationsUpdated);
    eventBus.on(events.RECOMMENDATIONS_UPDATED, onRecommendationsUpdated);

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

  const actions = {
    clearValidationErrors: useCallback(() => {
      updateState({ validationErrors: [], validationWarnings: [] });
    }, [updateState]),
    clearRecommendations: useCallback(() => {
      updateState({ recommendations: [] });
    }, [updateState]),
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

  return { state, actions };
}
