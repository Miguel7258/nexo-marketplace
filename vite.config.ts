import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Caminhos relativos permitem publicar sob qualquer nome de repositorio.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
  }
});
