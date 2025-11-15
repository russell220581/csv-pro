import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Add this to fix CommonJS module issues
  optimizeDeps: {
    exclude: ['postal-codes-js']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      exclude: ['postal-codes-js']
    }
  }
});