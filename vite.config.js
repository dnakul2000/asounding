import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/asounding/',
  plugins: [basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true
  }
});
