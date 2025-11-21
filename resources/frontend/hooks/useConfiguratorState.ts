import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  ConfiguratorConfig,
  ConfiguratorState,
  Step,
  StepOption,
  Selection,
  Conflict,
} from '@/types/configurator';

const initialState: ConfiguratorState = {
  currentStep: 0,
  selections: {},
  isValid: false,
  visibleSteps: [],
  history: [],
  conflicts: [],
  draftSaved: false,
};

/**
 * Хук для управления состоянием конфигуратора
 */
export function useConfiguratorState(config: ConfiguratorConfig) {
  const [state, setState] = useState<ConfiguratorState>(() => {
    // Попытка восстановить из localStorage
    if (config.storage.restoreOnLoad) {
      const saved = localStorage.getItem(config.storage.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...initialState, ...parsed };
        } catch (e) {
          console.warn('Failed to restore state from localStorage', e);
        }
      }
    }
    return initialState;
  });

  // Вычисление видимых шагов на основе условий
  const visibleSteps = useMemo(() => {
    const visible: string[] = [];
    
    config.steps.forEach((step) => {
      if (!step.showWhen) {
        visible.push(step.id);
        return;
      }

      const { step: dependencyStep, condition, values } = step.showWhen;
      const dependencySelection = state.selections[dependencyStep];

      if (condition === 'any') {
        if (dependencySelection) {
          visible.push(step.id);
        }
      } else if (condition === 'specific' && values) {
        if (dependencySelection && values.includes(dependencySelection.value)) {
          visible.push(step.id);
        }
      }
    });

    return visible;
  }, [config.steps, state.selections]);

  // Обновление видимых шагов в состоянии
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      visibleSteps,
    }));
  }, [visibleSteps.join(',')]);

  // Валидация состояния
  const isValid = useMemo(() => {
    const visibleStepsList = config.steps.filter((step) =>
      visibleSteps.includes(step.id)
    );
    
    const requiredSteps = visibleStepsList.filter((step) => step.required);
    const allRequiredSelected = requiredSteps.every(
      (step) => state.selections[step.id] !== undefined
    );

    return allRequiredSelected && state.conflicts.length === 0;
  }, [config.steps, visibleSteps, state.selections, state.conflicts]);

  // Обновление валидности в состоянии
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isValid,
    }));
  }, [isValid]);

  // Сохранение в localStorage
  useEffect(() => {
    if (config.storage.saveToLocalStorage) {
      localStorage.setItem(
        config.storage.storageKey,
        JSON.stringify(state)
      );
    }
  }, [state, config.storage.saveToLocalStorage, config.storage.storageKey]);

  // Выбор опции
  const selectOption = useCallback(
    (stepId: string, option: StepOption) => {
      setState((prev) => {
        const newSelections = {
          ...prev.selections,
          [stepId]: {
            value: option.value,
            label: option.label,
            params: option.params,
          } as Selection,
        };

        // Проверка конфликтов
        const conflicts: Conflict[] = [];
        const step = config.steps.find((s) => s.id === stepId);
        
        if (step?.conflictRules) {
          step.conflictRules.forEach((rule) => {
            const conditionMet = Object.entries(rule.condition).every(
              ([key, value]) => {
                const selection = newSelections[key];
                if (!selection) return false;
                
                if (Array.isArray(value)) {
                  return value.includes(selection.value);
                }
                return selection.value === value;
              }
            );

            if (conditionMet) {
              conflicts.push(rule.conflict);
            }
          });
        }

        // Переход к следующему шагу, если есть
        const currentStepIndex = config.steps.findIndex((s) => s.id === stepId);
        const nextVisibleStepIndex = config.steps.findIndex(
          (s, index) =>
            index > currentStepIndex &&
            visibleSteps.includes(s.id) &&
            !newSelections[s.id]
        );

        return {
          ...prev,
          selections: newSelections,
          conflicts,
          currentStep:
            nextVisibleStepIndex >= 0 ? nextVisibleStepIndex : prev.currentStep,
          history: [...prev.history, prev.currentStep],
        };
      });
    },
    [config.steps, visibleSteps]
  );

  // Переход к шагу
  const goToStep = useCallback((stepIndex: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: stepIndex,
      history: [...prev.history, prev.currentStep],
    }));
  }, []);

  // Возврат назад
  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;

      const previousStep = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);

      // Очистка зависимых шагов, если включено
      let newSelections = { ...prev.selections };
      if (config.navigation.clearFutureOnBack) {
        const currentStepId = config.steps[prev.currentStep]?.id;
        if (currentStepId) {
          // Удаляем выборы для шагов после предыдущего
          const stepsToClear = config.steps.slice(previousStep + 1);
          stepsToClear.forEach((step) => {
            delete newSelections[step.id];
          });
        }
      }

      return {
        ...prev,
        currentStep: previousStep,
        history: newHistory,
        selections: newSelections,
        conflicts: [], // Очищаем конфликты при возврате
      };
    });
  }, [config.steps, config.navigation.clearFutureOnBack]);

  // Сброс состояния
  const reset = useCallback(() => {
    setState(initialState);
    if (config.storage.saveToLocalStorage) {
      localStorage.removeItem(config.storage.storageKey);
    }
  }, [config.storage.saveToLocalStorage, config.storage.storageKey]);

  // Получение всех параметров
  const getParams = useCallback(() => {
    const params: Record<string, any> = {};
    Object.values(state.selections).forEach((selection) => {
      Object.assign(params, selection.params);
    });
    return params;
  }, [state.selections]);

  // Сохранение черновика
  const saveDraft = useCallback(() => {
    if (config.storage.draftStorage?.enabled) {
      const draft = {
        selections: state.selections,
        currentStep: state.currentStep,
        conflicts: state.conflicts,
        savedAt: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(
        config.storage.draftStorage.storageKey,
        JSON.stringify(draft)
      );
      setState((prev) => ({
        ...prev,
        draftSaved: true,
        lastSavedAt: Date.now(),
      }));
    }
  }, [state, config.storage.draftStorage]);

  // Загрузка черновика
  const loadDraft = useCallback(() => {
    if (config.storage.draftStorage?.enabled) {
      const draftStr = localStorage.getItem(
        config.storage.draftStorage.storageKey
      );
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          setState((prev) => ({
            ...prev,
            selections: draft.selections || {},
            currentStep: draft.currentStep || 0,
            conflicts: draft.conflicts || [],
            draftSaved: true,
            lastSavedAt: draft.savedAt,
          }));
          return true;
        } catch (e) {
          console.warn('Failed to load draft', e);
        }
      }
    }
    return false;
  }, [config.storage.draftStorage]);

  // Разрешение конфликта
  const resolveConflict = useCallback(
    (conflictId: string, resolutionId: string) => {
      setState((prev) => {
        const conflict = prev.conflicts.find((c) => c.id === conflictId);
        if (!conflict?.resolution) return prev;

        const resolution = conflict.resolution.options?.find(
          (opt) => opt.id === resolutionId
        );
        if (!resolution) return prev;

        let newState = { ...prev };

        // Выполнение действия разрешения
        if (resolution.action === 'modifySelection' && resolution.modifications) {
          newState.selections = {
            ...prev.selections,
            ...resolution.modifications,
          };
        }

        // Удаление разрешенного конфликта
        newState.conflicts = prev.conflicts.filter((c) => c.id !== conflictId);

        return newState;
      });
    },
    []
  );

  return {
    state: {
      ...state,
      visibleSteps,
      isValid,
    },
    selectOption,
    goToStep,
    goBack,
    reset,
    isValid,
    getParams,
    saveDraft,
    loadDraft,
    resolveConflict,
  };
}

