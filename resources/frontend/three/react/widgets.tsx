/**
 * Простые виджеты на React без сборки
 * Использует React.createElement для работы без JSX
 */

import React from 'react';
import { eventBus, ConfiguratorEvents } from '../events/EventBus.ts';
import { useConfiguratorStore, type EventBus, type ConfiguratorEvents as ConfiguratorEventsType } from '../../hooks/useConfiguratorStore.ts';

/**
 * Виджет расчётов
 */
export function CalculationsWidget(): React.ReactElement {
    const { state } = useConfiguratorStore(eventBus as EventBus, ConfiguratorEvents as ConfiguratorEventsType);
    const calc = state.calculations || {};
    return (
        React.createElement('div', { className: 'calc-widget' },
            React.createElement('h3', null, 'Расчёты'),
            React.createElement('div', null, `Мощность: ${String(calc['totalPower'] ?? '-')} Вт`),
            React.createElement('div', null, `Тепловыделение: ${String(calc['totalHeatDissipation'] ?? '-')} Вт`),
            ...(calc['thermalBalance'] ? [React.createElement('div', { key: 'balance' }, `Баланс: ${String(calc['thermalBalance'])}`)] : [])
        )
    );
}

/**
 * Виджет рекомендаций
 */
export function RecommendationsWidget(): React.ReactElement {
    const { state, actions } = useConfiguratorStore(eventBus as EventBus, ConfiguratorEvents as ConfiguratorEventsType);
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

/**
 * Панель валидации
 */
export function ValidationPanel(): React.ReactElement {
    const { state, actions } = useConfiguratorStore(eventBus as EventBus, ConfiguratorEvents as ConfiguratorEventsType);
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

/**
 * Главная панель конфигуратора
 */
export function ConfiguratorPanel(): React.ReactElement {
    const { state } = useConfiguratorStore(eventBus as EventBus, ConfiguratorEvents as ConfiguratorEventsType);
    return (
        React.createElement('div', { className: 'configurator-panel' },
            React.createElement('h2', null, 'Конфигуратор'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', null, `Шкаф: ${state.activeCabinetId || '-'}`),
                React.createElement('div', null, `Тип: ${typeof state.cabinetType === 'object' && state.cabinetType !== null && 'category' in state.cabinetType ? (state.cabinetType as { category?: string }).category : state.cabinetType || '-'}`),
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

