/// <reference types="vitest" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// GitHub Pages sert l'appli sous /filactu/
export default defineConfig({
  base: process.env.FILACTU_BASE ?? '/filactu/',
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  publicDir: 'public',
  build: { outDir: 'dist', sourcemap: false },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/collector/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    environment: 'node',
    environmentMatchGlobs: [['tests/components/**', 'jsdom']],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'collector/**'],
      exclude: ['collector/main.ts'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
    },
  },
});
