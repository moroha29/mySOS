import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mySOS/quotation_engine/',
  plugins: [react()],
  build: {
    outDir: 'dist/quotation_engine',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
});
