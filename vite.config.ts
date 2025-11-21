import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    laravel({
      input: [
        'resources/frontend/app.jsx', // Текущий entry point (можно переименовать в .tsx позже)
        'resources/css/app.css'
      ],
      refresh: true,
    })
  ],
  build: {
    outDir: 'public/build',
    manifest: 'manifest.json',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          // Выделяем Three.js в отдельный чанк
          'three-core': ['three'],
          // Выделяем React в отдельный чанк
          'react-vendor': ['react', 'react-dom'],
          // Выделяем Three.js примеры/утилиты
          'three-utils': [
            'three/examples/jsm/loaders/GLTFLoader',
            'three/examples/jsm/loaders/DRACOLoader',
            'three/examples/jsm/controls/OrbitControls'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Увеличиваем лимит для Three.js приложений
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
      '@': '/resources/frontend',
      '@public': '/public/js'
    }
  }
});

