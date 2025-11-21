/// <reference types="vite/client" />

/**
 * Типы для Vite окружения
 */

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  // Добавьте другие переменные окружения здесь
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

