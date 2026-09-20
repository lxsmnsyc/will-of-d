import solid from '@solidjs/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [solid()],
  server: { port: 3000 },
  preview: { port: 3000 },
});
