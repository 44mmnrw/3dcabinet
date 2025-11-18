/**
 * Logic System — экспорт и фабрика
 */
export { LogicEngine, LogicPlugin } from './LogicEngine.js';
export { ThermalLogicPlugin } from './plugins/ThermalLogicPlugin.js';
export { TelecomLogicPlugin } from './plugins/TelecomLogicPlugin.js';
export { ServerLogicPlugin } from './plugins/ServerLogicPlugin.js';

import { LogicEngine } from './LogicEngine.js';
import { ThermalLogicPlugin } from './plugins/ThermalLogicPlugin.js';
import { TelecomLogicPlugin } from './plugins/TelecomLogicPlugin.js';
import { ServerLogicPlugin } from './plugins/ServerLogicPlugin.js';

/**
 * Создать LogicEngine с зарегистрированными плагинами
 * @returns {LogicEngine}
 */
export function createDefaultLogicEngine() {
    const engine = new LogicEngine();
    
    engine.registerPlugin('thermal', new ThermalLogicPlugin());
    engine.registerPlugin('outdoor', new ThermalLogicPlugin()); // Алиас
    engine.registerPlugin('telecom', new TelecomLogicPlugin());
    engine.registerPlugin('network', new TelecomLogicPlugin()); // Алиас
    engine.registerPlugin('server', new ServerLogicPlugin());
    engine.registerPlugin('datacenter', new ServerLogicPlugin()); // Алиас
    
    return engine;
}
