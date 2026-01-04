import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    // Fix: 使用 forks 进程池避免 JSDOM + threads 导致的进程残留
    pool: 'forks',
    teardownTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
