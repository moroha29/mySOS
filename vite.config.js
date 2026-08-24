import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/mySOS/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        site: resolve(import.meta.dirname, 'index.html'),
        quotation_engine: resolve(import.meta.dirname, 'quotation_engine/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
