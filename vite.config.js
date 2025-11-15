import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    laravel({
      input: ['resources/js/app.jsx'],
      refresh: true,
    })
  ],
  build: {
    outDir: 'public/build',
    manifest: true
  },
  server: {
    port: 5174,  // Используем 5174 (5173 занят)
    strictPort: false,  // Автоматически переключаться на другой порт, если занят
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/assets': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': '/resources/js',
      '@public': '/public/js'
    }
  }
});
