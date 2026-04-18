import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
