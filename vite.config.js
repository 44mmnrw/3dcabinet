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
    host: '127.0.0.1',  // Явно указываем localhost
    port: 5174,
    strictPort: false,
    cors: true,  // Включаем CORS для Laravel
    hmr: {
      host: 'localhost',  // HMR через localhost
    },
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
