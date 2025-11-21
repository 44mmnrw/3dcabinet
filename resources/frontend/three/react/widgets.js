// Простые виджеты на React без сборки
import { eventBus, ConfiguratorEvents } from '../events/EventBus.js';
import { useConfiguratorStore } from './useConfiguratorStore.js';

export function CalculationsWidget() {
  const { state } = useConfiguratorStore(eventBus, ConfiguratorEvents);
  const calc = state.calculations || {};
  return (
    React.createElement('div', { className: 'calc-widget' },
      React.createElement('h3', null, 'Расчёты'),
      React.createElement('div', null, `Мощность: ${calc.totalPower ?? '-'} Вт`),
      React.createElement('div', null, `Тепловыделение: ${calc.totalHeatDissipation ?? '-'} Вт`),
      calc.thermalBalance && React.createElement('div', null, `Баланс: ${calc.thermalBalance}`)
    )
  );
}

export function RecommendationsWidget() {
  const { state, actions } = useConfiguratorStore(eventBus, ConfiguratorEvents);
  return (
    React.createElement('div', { className: 'rec-widget' },
      React.createElement('h3', null, 'Рекомендации'),
      React.createElement('button', { onClick: actions.clearRecommendations }, 'Очистить'),
      (state.recommendations || []).length === 0
        ? React.createElement('div', { className: 'muted' }, 'Нет рекомендаций')
        : React.createElement('ul', null,
            state.recommendations.map((rec, i) => (
              React.createElement('li', { key: i, className: `rec-${rec.severity}` },
                React.createElement('strong', null, rec.type || 'info'), ': ', rec.message,
                rec.suggestion ? React.createElement('div', { className: 'muted' }, rec.suggestion) : null
              )
            ))
          )
    )
  );
}

export function ValidationPanel() {
  const { state, actions } = useConfiguratorStore(eventBus, ConfiguratorEvents);
  return (
    React.createElement('div', { className: 'validation-panel' },
      React.createElement('h3', null, 'Проверки'),
      React.createElement('button', { onClick: actions.clearValidationErrors }, 'Очистить'),
      (state.validationErrors || []).length === 0 && (state.validationWarnings || []).length === 0
        ? React.createElement('div', { className: 'muted' }, 'Ошибок и предупреждений нет')
        : React.createElement('div', null,
            (state.validationErrors || []).map((e, i) => (
              React.createElement('div', { key: `err-${i}`, className: 'error' }, e.message || String(e))
            )),
            (state.validationWarnings || []).map((w, i) => (
              React.createElement('div', { key: `warn-${i}`, className: 'warning' }, w.message || String(w))
            ))
          )
    )
  );
}

export function ConfiguratorPanel() {
  const { state } = useConfiguratorStore(eventBus, ConfiguratorEvents);
  return (
    React.createElement('div', { className: 'configurator-panel' },
      React.createElement('h2', null, 'Конфигуратор'),
      React.createElement('div', { className: 'row' },
        React.createElement('div', null, `Шкаф: ${state.activeCabinetId || '-'}`),
        React.createElement('div', null, `Тип: ${state.cabinetType?.category || '-'}`),
        React.createElement('div', null, `Оборудования: ${state.equipmentCount}`)
      ),
      React.createElement('div', { className: 'grid-2' },
        React.createElement(CalculationsWidget, null),
        React.createElement(RecommendationsWidget, null)
      ),
      React.createElement(ValidationPanel, null)
    )
  );
}
