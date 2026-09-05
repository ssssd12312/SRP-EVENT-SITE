import { randomUUID } from 'node:crypto';
import { defineConfig } from '@playwright/test';
import chromium from '@sparticuz/chromium';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.CHROMIUM_EXECUTABLE || (await chromium.executablePath()),
      args: chromium.args.filter((a) => a !== '--single-process'),
    },
  },
  webServer: {
    command: 'node scripts/browser-test-server.mjs',
    url: 'http://127.0.0.1:3001/api/bootstrap',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      PORT: '3001',
      NODE_ENV: 'production',
      DATABASE_PATH: '.data/tests/' + randomUUID() + '.sqlite',
      SRP_ADMIN_KEY: process.env.SRP_TEST_ADMIN_KEY || 'browser-test-key-not-for-production-7f963aac',
    },
  },
});
