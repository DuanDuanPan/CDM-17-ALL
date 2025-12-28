import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:3000',
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
      url: 'http://localhost:3001/api',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm exec next dev -H 127.0.0.1 -p 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
