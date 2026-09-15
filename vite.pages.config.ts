import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  root: 'cf-pages',
  publicDir: '../public',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.',import.meta.url)) } },
  build: { outDir: '../pages-dist', emptyOutDir: true },
});
