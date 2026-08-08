import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron loads production files through file://, so asset paths must be relative.
  base: './',
  plugins: [react()],
});
