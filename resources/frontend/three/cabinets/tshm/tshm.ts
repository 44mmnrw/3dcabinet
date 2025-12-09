import * as THREE from 'three';
import { GLTFCabinetBase, type GLTFCabinetConfig } from '../GLTFCabinetBase.ts';
import type { GLTFCabinetAssembleOptions } from '../GLTFCabinetBase.ts';

/**
 * Класс шкафа TSHM (Термошкаф металлический)
 * Загружает готовую GLTF модель из /assets/models/cabinets/thermo_metall/tshm.gltf
 * Поддерживает параметрический ресайз через CabinetResizer
 * 
 * Использует GLTFCabinetBase для универсальной загрузки GLTF моделей
 */
export class tshm extends GLTFCabinetBase {
    constructor() {
        super();
        this.assembly.name = 'tshm_Assembly';
    }

    /**
     * Получить конфигурацию GLTF шкафа
     */
    protected getGLTFConfig(): GLTFCabinetConfig {
        return {
            modelPath: '/assets/models/cabinets/thermo_metall/tshm.gltf',
            doorComponentName: 'DOOR_HINGE', // Может быть DOOR_SET или DOOR_FRAME
            doorRotationAxis: 'y',
            dinRailPatterns: ['DIN_RAIL', 'din_rail', 'DINRail']
        };
    }

    /**
     * Переопределяем assemble для поддержки modelPath из опций
     */
    async assemble(options: GLTFCabinetAssembleOptions = {}): Promise<THREE.Group> {
        // Если передан modelPath в опциях, используем его
        if (options.modelPath) {
            const config = this.getGLTFConfig();
            config.modelPath = options.modelPath;
        }
        
        return await super.assemble(options);
    }
}

