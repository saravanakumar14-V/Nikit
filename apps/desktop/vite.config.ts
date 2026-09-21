import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@nikit/tokens': path.resolve(__dirname, '../../packages/tokens/src'),
      '@nikit/types': path.resolve(__dirname, '../../packages/types/src'),
      '@nikit/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
