import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { mockDataPlugin } from './scripts/mockQuotationData.mjs';

export default defineConfig(({ mode }) => {
  const mock = mode === 'mock';
  return {
    base: '/mySOS/',
    preview: { allowedHosts: ['host.docker.internal'] },
    plugins: [react(), ...(mock ? [mockDataPlugin(import.meta.dirname)] : [])],
    define: { 'import.meta.env.VITE_QUOTATION_DEMO': JSON.stringify(mock ? 'true' : 'false') },
    build: {
      outDir: 'dist',
      emptyOutDir: !mock,
      copyPublicDir: !mock,
      manifest: !mock,
      assetsDir: mock ? 'mock-assets' : 'assets',
      rollupOptions: {
        input: mock ? { mock_quotation_engine: resolve(import.meta.dirname, 'mock_quotation_engine/index.html') } : {
          site: resolve(import.meta.dirname, 'index.html'),
          quotation_engine: resolve(import.meta.dirname, 'quotation_engine/index.html'),
        },
      },
    },
    test: { environment: 'node' },
  };
});
