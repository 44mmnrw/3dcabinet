/**
 * Logic System — экспорт и фабрика
 */
export { LogicEngine, LogicPlugin, type PluginResult } from './LogicEngine.ts';
export { ThermalLogicPlugin } from './plugins/ThermalLogicPlugin.ts';
export { TelecomLogicPlugin } from './plugins/TelecomLogicPlugin.ts';
export { ServerLogicPlugin } from './plugins/ServerLogicPlugin.ts';

import { LogicEngine } from './LogicEngine.ts';
import { ThermalLogicPlugin } from './plugins/ThermalLogicPlugin.ts';
import { TelecomLogicPlugin } from './plugins/TelecomLogicPlugin.ts';
import { ServerLogicPlugin } from './plugins/ServerLogicPlugin.ts';

/**
 * Создать LogicEngine с зарегистрированными плагинами
 * @returns LogicEngine с зарегистрированными плагинами
 */
export function createDefaultLogicEngine(): LogicEngine {
    const engine = new LogicEngine();
    
    engine.registerPlugin('thermal', new ThermalLogicPlugin());
    engine.registerPlugin('outdoor', new ThermalLogicPlugin()); // Алиас
    engine.registerPlugin('telecom', new TelecomLogicPlugin());
    engine.registerPlugin('network', new TelecomLogicPlugin()); // Алиас
    engine.registerPlugin('server', new ServerLogicPlugin());
    engine.registerPlugin('datacenter', new ServerLogicPlugin()); // Алиас
    
    return engine;
}

