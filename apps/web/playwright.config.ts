import { defineConfig, devices } from '@playwright/test';

// Ensure local test traffic bypasses any system proxy (common on developer machines)
const localNoProxy = '127.0.0.1,localhost';
process.env.NO_PROXY = process.env.NO_PROXY ? `${process.env.NO_PROXY},${localNoProxy}` : localNoProxy;
process.env.no_proxy = process.env.no_proxy ? `${process.env.no_proxy},${localNoProxy}` : localNoProxy;

export default defineConfig({
  testDir: './e2e',
  // Disable parallel execution for collaboration tests - they share a single Hocuspocus server
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use single worker to avoid resource contention with collaboration server
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'pnpm -C ../api dev:no-watch',
      url: 'http://127.0.0.1:3001/api',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm exec next dev -H 127.0.0.1 -p 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
