import * as THREE from 'three';
import type { CabinetBase } from '../cabinets/CabinetBase.ts';

/**
 * Константы стандарта 19" rack
 */
const UNIT_HEIGHT_MM = 44.45; // Высота 1U в миллиметрах

/**
 * Теги для классификации компонентов
 */
const TAG_SCALE = '[SCALE]';
const TAG_FIXED = '[FIXED]';
const TAG_FIXED_POS = '[FIXED_POS]';
const TAG_DOOR = '[DOOR]';
const TAG_PANEL = '[PANEL]';

/**
 * Категории компонентов
 */
interface ComponentCategory {
    type: 'vertical' | 'horizontal' | 'door' | 'panel' | 'fixed' | 'fixed_pos';
    scale: boolean;
    scaleAxis: 'all' | 'z' | 'none';
    movePosition: boolean;
}

/**
 * Информация о компоненте для изменения размера
 */
interface ComponentResizeInfo {
    object: THREE.Object3D;
    originalScale: THREE.Vector3;
    originalPosition: THREE.Vector3;
    category: ComponentCategory;
}

/**
 * Утилита для изменения размеров шкафа в браузере
 * 
 * Анализирует имена компонентов на теги и применяет масштабирование/позиционирование
 * аналогично FreeCAD скрипту Cab42_Structured.py
 * 
 * ⚠️ ПЕРСПЕКТИВНАЯ РАЗРАБОТКА
 * 
 * Данная функциональность находится в стадии разработки и требует тщательного анализа
 * рисков перед внедрением в production:
 * 
 * 1. Версионирование алгоритма масштабирования
 *    - При изменении логики масштабирования старые проекты могут отображаться некорректно
 *    - Необходимо хранить версию алгоритма вместе с конфигурацией шкафа
 * 
 * 2. Хранение позиций оборудования
 *    - Позиции оборудования хранятся в БД (cabinet_configurations.equipment_positions)
 *    - При динамическом изменении модели координаты могут стать невалидными
 *    - Требуется миграция/пересчет позиций при изменении алгоритма
 * 
 * 3. Производительность
 *    - Динамическое масштабирование требует пересчета при каждой загрузке проекта
 *    - Необходимо кэширование результатов для часто используемых размеров
 * 
 * 4. Точность и округление
 *    - Накопление ошибок округления при многократных пересчетах
 *    - Риск рассинхронизации с физическими моделями
 * 
 * 5. Совместимость с существующими проектами
 *    - Старые проекты созданы с фиксированными моделями
 *    - Требуется стратегия миграции или поддержка обоих подходов
 * 
 * Рекомендации:
 * - Рассмотреть гибридный подход: хранить базовую модель + параметры масштабирования
 * - Добавить версионирование в схему БД (resize_algorithm_version)
 * - Реализовать валидацию позиций оборудования после масштабирования
 * - Предусмотреть возможность "заморозки" модели для критичных проектов
 */
export class CabinetResizer {
    private cabinet: CabinetBase;
    private componentsInfo: Map<string, ComponentResizeInfo>;
    private originalHeight: number;
    private baseZ: number;

    constructor(cabinet: CabinetBase) {
        this.cabinet = cabinet;
        this.componentsInfo = new Map();
        this.originalHeight = 0;
        this.baseZ = 0;
        
        // Анализируем компоненты при создании
        this._analyzeComponents();
    }

    /**
     * Анализ компонентов и определение их категорий
     */
    private _analyzeComponents(): void {
        const components = this.cabinet.getComponents();
        
        // Находим базовую высоту (минимальная Z координата)
        let minZ = Infinity;
        let maxZ = -Infinity;

        for (const [name, obj] of Object.entries(components)) {
            if (!obj) continue;

            // Получаем bbox для определения высоты
            const bbox = new THREE.Box3().setFromObject(obj);
            minZ = Math.min(minZ, bbox.min.z);
            maxZ = Math.max(maxZ, bbox.max.z);

            // Определяем категорию по тегам в имени
            const category = this._classifyComponent(name);
            
            // Сохраняем оригинальные значения
            this.componentsInfo.set(name, {
                object: obj,
                originalScale: obj.scale.clone(),
                originalPosition: obj.position.clone(),
                category
            });
        }

        this.baseZ = minZ;
        this.originalHeight = maxZ - minZ;
    }

    /**
     * Классификация компонента по тегам в имени
     */
    private _classifyComponent(name: string): ComponentCategory {
        const nameUpper = name.toUpperCase();

        // Проверяем теги (важно: FIXED_POS перед FIXED!)
        if (nameUpper.includes(TAG_SCALE)) {
            return {
                type: 'vertical',
                scale: true,
                scaleAxis: 'all',
                movePosition: false
            };
        } else if (nameUpper.includes(TAG_FIXED_POS)) {
            return {
                type: 'fixed_pos',
                scale: false,
                scaleAxis: 'none',
                movePosition: true
            };
        } else if (nameUpper.includes(TAG_FIXED)) {
            return {
                type: 'fixed',
                scale: false,
                scaleAxis: 'none',
                movePosition: false
            };
        } else if (nameUpper.includes(TAG_DOOR)) {
            return {
                type: 'door',
                scale: true,
                scaleAxis: 'z',
                movePosition: false
            };
        } else if (nameUpper.includes(TAG_PANEL)) {
            return {
                type: 'panel',
                scale: true,
                scaleAxis: 'z',
                movePosition: false
            };
        } else {
            // По умолчанию - фиксированный
            return {
                type: 'fixed',
                scale: false,
                scaleAxis: 'none',
                movePosition: false
            };
        }
    }

    /**
     * Изменить размер шкафа
     * 
     * @param targetUnits - Целевое количество юнитов (6-47U)
     * @param options - Опции изменения размера
     */
    resize(targetUnits: number, options: {
        scaleDoors?: boolean;
        scalePanels?: boolean;
    } = {}): void {
        const { scaleDoors = true, scalePanels = true } = options;

        if (targetUnits < 6 || targetUnits > 47) {
            throw new Error(`Недопустимое количество юнитов: ${targetUnits}. Допустимо: 6-47U`);
        }

        const targetHeight = targetUnits * UNIT_HEIGHT_MM;
        const scaleFactor = targetHeight / this.originalHeight;

        console.log(`🔧 Изменение размера шкафа: ${(this.originalHeight / UNIT_HEIGHT_MM).toFixed(1)}U → ${targetUnits}U`);
        console.log(`   Коэффициент масштабирования: ${scaleFactor.toFixed(4)}`);

        // Применяем изменения к компонентам
        for (const [name, info] of this.componentsInfo.entries()) {
            const { object, originalScale, originalPosition, category } = info;

            // Масштабирование
            if (category.scale) {
                if (category.scaleAxis === 'all') {
                    // Масштабируем по всем осям
                    object.scale.set(
                        originalScale.x * scaleFactor,
                        originalScale.y * scaleFactor,
                        originalScale.z * scaleFactor
                    );
                    console.log(`   ✅ ${name}: масштабирован (все оси)`);
                } else if (category.scaleAxis === 'z') {
                    // Масштабируем только по высоте
                    if ((category.type === 'door' && scaleDoors) || 
                        (category.type === 'panel' && scalePanels)) {
                        object.scale.set(
                            originalScale.x,
                            originalScale.y,
                            originalScale.z * scaleFactor
                        );
                        console.log(`   ✅ ${name}: масштабирован (только Z)`);
                    }
                }
            } else {
                // Восстанавливаем оригинальный масштаб
                object.scale.copy(originalScale);
            }

            // Позиционирование
            if (category.movePosition) {
                // Вычисляем относительную позицию по Z
                const relativeZ = originalPosition.z - this.baseZ;
                const newZ = this.baseZ + (relativeZ * scaleFactor);

                // Новая позиция (X и Y остаются без изменений)
                object.position.set(
                    originalPosition.x,
                    originalPosition.y,
                    newZ
                );
                console.log(`   📍 ${name}: позиция Z ${originalPosition.z.toFixed(2)} → ${newZ.toFixed(2)} мм`);
            } else {
                // Восстанавливаем оригинальную позицию
                object.position.copy(originalPosition);
            }

            // Обновляем матрицу
            object.updateMatrixWorld(true);
        }

        console.log(`✅ Размер шкафа изменён: ${targetUnits}U (${targetHeight.toFixed(2)} мм)`);
    }

    /**
     * Сбросить размеры к оригинальным значениям
     */
    reset(): void {
        for (const [, info] of this.componentsInfo.entries()) {
            info.object.scale.copy(info.originalScale);
            info.object.position.copy(info.originalPosition);
            info.object.updateMatrixWorld(true);
        }
        console.log('🔄 Размеры шкафа сброшены к оригинальным значениям');
    }

    /**
     * Получить текущую высоту шкафа в юнитах
     */
    getCurrentUnits(): number {
        return Math.round(this.originalHeight / UNIT_HEIGHT_MM);
    }

    /**
     * Получить информацию о компонентах
     */
    getComponentsInfo(): Map<string, ComponentResizeInfo> {
        return new Map(this.componentsInfo);
    }

    /**
     * Получить статистику по категориям компонентов
     */
    getStatistics(): Record<string, number> {
        const stats: Record<string, number> = {};
        
        for (const info of this.componentsInfo.values()) {
            const type = info.category.type;
            stats[type] = (stats[type] || 0) + 1;
        }
        
        return stats;
    }
}

/**
 * Вспомогательная функция для быстрого изменения размера шкафа
 * 
 * @param cabinet - Экземпляр шкафа
 * @param targetUnits - Целевое количество юнитов
 * @param options - Опции изменения размера
 */
export function resizeCabinet(
    cabinet: CabinetBase,
    targetUnits: number,
    options: {
        scaleDoors?: boolean;
        scalePanels?: boolean;
    } = {}
): void {
    const resizer = new CabinetResizer(cabinet);
    resizer.resize(targetUnits, options);
}

