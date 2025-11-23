// Type declarations for JS runtime types in three/types/index.js
export class CabinetType { constructor(config: any); specs?: any; getComponents?(): Record<string, any>; }
export class ThermalCabinet extends CabinetType {}
export class TelecomCabinet extends CabinetType {}
export class ServerCabinet extends CabinetType {}

export class TypeRegistry {
  private types: Map<string, any>;
  constructor();
  register(category: string, TypeClass: any): void;
  createType(category: string, config: any): Promise<CabinetType>;
  hasType(category: string): boolean;
  getRegisteredCategories(): string[];
}
export const typeRegistry: TypeRegistry;

// Реэкспортируем основные типы, чтобы tests могли импортировать из '../index'
export * from './equipment.types';
export * from './cabinet.types';
export * from './scene.types';
export * from './managers.types';
