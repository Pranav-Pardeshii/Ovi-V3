import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api is proxied to the FastAPI backend (uvicorn default port 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
