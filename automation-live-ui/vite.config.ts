import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + WS traffic to automation-live-server (port 4545)
// so the UI can be developed independently of the backend origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4545', changeOrigin: true },
      '/ws': { target: 'ws://localhost:4545', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
