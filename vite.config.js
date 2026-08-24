import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 127.0.0.1, never "localhost": the API binds IPv4 only, while localhost
      // resolves to ::1 first — anything squatting IPv6 answers silently in its
      // place, and the failure then looks like a routing bug that isn't there.
      '/api': 'http://127.0.0.1:5174',
    },
  },
});
