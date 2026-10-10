import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/teacher': 'http://localhost:8080',
      '/cards':   'http://localhost:8080',
      '/students':'http://localhost:8080',
      '/attendance':'http://localhost:8080',
      '/admin':   'http://localhost:8080',
      '/logout':  'http://localhost:8080',
    },
  },
});
