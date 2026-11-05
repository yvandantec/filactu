import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { FakeGitHub } from '../support/fake-github';
import { eachScreen, startWithData } from './helpers';

test('ENF-06 · l’appli démarre et s’utilise sans erreur sur l’écran testé', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // les images d'exemple (domaines .test) ne se chargent pas : ce n'est pas une erreur de l'appli
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await startWithData(page, new FakeGitHub());
  await eachScreen(page, async () => {});
  expect(errors).toEqual([]);
});

const ENGLISH = /\b(Settings|Cancel|Save|Close|Loading|Error|Search|Refresh|Mark as (un)?read|Delete|Add feed|Back|Today|All articles|Read later|Unread)\b/;

test('ENF-07 · l’interface est en français', async ({ page }) => {
  expect(readFileSync('index.html', 'utf8')).toMatch(/<html lang="fr">/);
  expect(JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')).lang).toBe('fr');
  await startWithData(page, new FakeGitHub());
  await eachScreen(page, async (name) => {
    const text = await page.locator('body').innerText();
    const labels = await page.locator('[aria-label], [title], [placeholder]').evaluateAll((els) =>
      els.map((e) => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].join(' ')));
    expect(`${text}\n${labels.join('\n')}`, `écran : ${name}`).not.toMatch(ENGLISH);
  });
});
