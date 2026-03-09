import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Optimize chunk size to reduce memory usage
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            // Manual chunk splitting to reduce memory during build
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-is'],
              'charts': ['recharts'],
              'maps': ['leaflet', 'react-leaflet'],
            }
          }
        },
        // Reduce memory usage during build
        minify: 'esbuild',
        // Target modern browsers to reduce polyfills
        target: 'es2015',
        // Smaller source maps for production
        sourcemap: false,
      }
    };
});
