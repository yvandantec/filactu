import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Captures d'écran du guide utilisateur (docs/images), faites avec les données d'exemple : `npm run captures`.
export default defineConfig({
  ...base,
  testDir: 'tests/captures',
  projects: [{ name: 'captures' }],
  retries: 0,
  reporter: 'list',
});
