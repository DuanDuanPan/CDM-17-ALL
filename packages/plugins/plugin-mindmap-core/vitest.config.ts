import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  ssr: {
    // X6 ESM build uses directory imports (e.g. './shape').
    // Bundle it via Vite SSR pipeline so resolution works consistently.
    noExternal: ['@antv/x6'],
  },
  resolve: {
    // X6 package.json declares "type": "module" but its "main" points to CJS output.
    // Force the real ESM entry so Vite/Vitest can import it correctly.
    alias: {
      '@antv/x6': '@antv/x6/es/index.js',
    },
  },
});
