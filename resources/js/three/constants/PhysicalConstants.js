/**
 * Физические константы и стандарты
 * Используются для расчётов и валидации
 */

/**
 * Электрические константы
 */
export const ELECTRICAL = {
    /** Стандартное напряжение в РФ (В) */
    STANDARD_VOLTAGE_V: 230,
    
    /** Коэффициент мощности (cos φ) для расчёта тока (упрощённо) */
    POWER_FACTOR: 1.0
};

/**
 * Физические размеры и стандарты
 */
export const PHYSICAL = {
    /** Высота одного rack unit (U) в миллиметрах (стандарт DIN 43880) */
    RACK_UNIT_HEIGHT_MM: 44.45,
    
    /** Конвертация миллиметров в метры */
    MM_TO_M: 0.001,
    
    /** Конвертация метров в миллиметры */
    M_TO_MM: 1000,
    
    /** Конвертация ватт в киловатты */
    W_TO_KW: 0.001,
    
    /** Конвертация киловатт в ватты */
    KW_TO_W: 1000
};

/**
 * Термические константы
 */
export const THERMAL = {
    /** Коэффициент теплопередачи (Вт/(м³·°C)) - упрощённая модель */
    HEAT_TRANSFER_COEFFICIENT: 0.5,
    
    /** Коэффициент для перевода мощности в тепловыделение (обычно 1:1) */
    POWER_TO_HEAT_RATIO: 1.0
};

/**
 * Математические константы
 */
export const MATH = {
    /** 90 градусов в радианах */
    DEG_90_RAD: Math.PI / 2,
    
    /** 180 градусов в радианах */
    DEG_180_RAD: Math.PI,
    
    /** Конвертация градусов в радианы */
    DEG_TO_RAD: Math.PI / 180,
    
    /** Конвертация радиан в градусы */
    RAD_TO_DEG: 180 / Math.PI
};

/**
 * Анимация и UI
 */
export const ANIMATION = {
    /** Длительность анимации двери (мс) */
    DOOR_ANIMATION_DURATION_MS: 500,
    
    /** Длительность анимации drag & drop (мс) */
    DRAG_ANIMATION_DURATION_MS: 300,
    
    /** Длительность fade-in/fade-out (мс) */
    FADE_DURATION_MS: 200
};

/**
 * Пороги для валидации (проценты)
 */
export const VALIDATION_THRESHOLDS = {
    /** Порог для критического предупреждения (90% от максимума) */
    CRITICAL_WARNING_PERCENT: 0.9,
    
    /** Порог для информационного сообщения (75% от максимума) */
    INFO_THRESHOLD_PERCENT: 0.75,
    
    /** Порог для предупреждения о высокой загрузке (80% от максимума) */
    HIGH_LOAD_WARNING_PERCENT: 0.8
};

/**
 * Типы монтажа (строковые константы)
 */
export const MOUNT_TYPES = {
    DIN_RAIL: 'din_rail',
    RACK_UNIT: 'rack_unit',
    MOUNTING_PLATE: 'mounting_plate'
};

/**
 * Категории шкафов (строковые константы)
 */
export const CABINET_CATEGORIES = {
    THERMAL: 'thermal',
    TELECOM: 'telecom',
    SERVER: 'server',
    OUTDOOR: 'outdoor', // Алиас для thermal
    NETWORK: 'network', // Алиас для telecom
    DATACENTER: 'datacenter' // Алиас для server
};

/**
 * Категории оборудования (строковые константы)
 */
export const EQUIPMENT_CATEGORIES = {
    PROTECTION: 'protection',
    POWER: 'power',
    ACCESSORIES: 'accessories',
    NETWORK: 'network',
    SERVER: 'server',
    STORAGE: 'storage',
    PDU: 'pdu'
};

/**
 * Углы камеры (радианы)
 */
export const CAMERA = {
    /** Угол камеры по умолчанию (Math.PI / 2.5 ≈ 68°) */
    DEFAULT_POLAR_ANGLE: Math.PI / 2.5,
    
    /** Минимальный угол камеры (радианы) */
    MIN_POLAR_ANGLE: Math.PI / 6, // 30°
    
    /** Максимальный угол камеры (радианы) */
    MAX_POLAR_ANGLE: Math.PI / 2 // 90°
};

/**
 * Значения по умолчанию (fallback values)
 * Используются когда данные не указаны в конфигурации
 */
export const DEFAULTS = {
    /** Максимальный ток по умолчанию (А) - используется как fallback в расчётах */
    MAX_CURRENT_A: 16,
    
    /** Высота rack-шкафа по умолчанию (U) - используется как fallback в расчётах */
    RACK_HEIGHT_U: 42,
    
    /** Количество фаз по умолчанию */
    PHASES: 1,
    
    /** Температура окружающей среды по умолчанию (°C) - используется в расчётах */
    AMBIENT_TEMP_C: 25,
    
    /** Мощность обогревателя по умолчанию (Вт) - используется в рекомендациях */
    HEATING_POWER_W: 500
};

