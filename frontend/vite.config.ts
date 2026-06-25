import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false,
      },
      '/copilot': {
        target: 'http://localhost:4005',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/metrics': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
