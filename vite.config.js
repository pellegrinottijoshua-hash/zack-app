import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The API lives on 5174; proxying keeps the frontend origin-free.
      '/api': 'http://localhost:5174',
    },
  },
});
