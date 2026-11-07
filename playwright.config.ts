import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['junit', { outputFile: './reports/playwright-junit.xml' }],
    ['html', { outputFolder: './reports/playwright-html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx tsx tests/mock-server/server.ts',
    url: 'http://127.0.0.1:3000/api/v1/health',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
