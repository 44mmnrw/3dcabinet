import React, { useEffect } from 'react';
import { ConfiguratorWizard } from '@/components/Configurator';
import { useConfiguratorState } from '@/hooks/useConfiguratorState';
import { thermalCabinetConfig } from '@/config/ThermalCabinetConfig';
import type { StepOption } from '@/types/configurator';

/**
 * Страница конфигуратора
 * Главная страница для настройки параметров шкафа
 */
const ConfiguratorPage: React.FC = () => {
  const {
    state,
    selectOption,
    goToStep,
    goBack,
    getParams,
    saveDraft,
  } = useConfiguratorState(thermalCabinetConfig);

  // Автосохранение черновика
  useEffect(() => {
    if (thermalCabinetConfig.storage.draftStorage?.autoSave) {
      const interval = setInterval(() => {
        saveDraft();
      }, thermalCabinetConfig.storage.draftStorage.autoSaveInterval);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [saveDraft]);

  const handleContinue = () => {
    if (!state.isValid) {
      return;
    }

    const params = getParams();
    
    // Сохранение параметров для передачи в 3D конфигуратор
    if (thermalCabinetConfig.continueButton.passParamsAs === 'localStorage') {
      localStorage.setItem('thermal-cabinet-config-params', JSON.stringify(params));
    } else if (thermalCabinetConfig.continueButton.passParamsAs === 'query') {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      
      // Переход на страницу 3D конфигуратора с параметрами
      window.location.href = `${thermalCabinetConfig.continueButton.route}?${queryString}`;
      return;
    }

    // Переход на страницу 3D конфигуратора
    window.location.href = thermalCabinetConfig.continueButton.route;
    return;
  };

  const handleStepClick = (stepIndex: number) => {
    goToStep(stepIndex);
  };

  const handleSelectOption = (stepId: string, option: StepOption) => {
    selectOption(stepId, option);
  };

  return (
    <ConfiguratorWizard
      config={thermalCabinetConfig}
      state={state}
      onStepClick={handleStepClick}
      onSelectOption={handleSelectOption}
      onBack={goBack}
      onContinue={handleContinue}
    />
  );
};

export default ConfiguratorPage;

