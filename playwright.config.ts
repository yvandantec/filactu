import { defineConfig, devices } from '@playwright/test';

// En local on utilise Edge déjà installé ; en CI, le Chromium de Playwright.
const channel = process.env.CI ? undefined : process.env.PW_CHANNEL ?? 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/filactu/',
    channel,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'pc', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablette', use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'telephone', use: { ...devices['Pixel 7'], channel, defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/filactu/',
    reuseExistingServer: !process.env.CI,
  },
});
