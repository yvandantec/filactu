import { expect, test, type Page } from '@playwright/test';
import { openNav, startWithData } from './helpers';

const themeColor = (page: Page) => page.evaluate(() => {
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const active = metas.find((m) => !m.media || matchMedia(m.media).matches);
  return active?.content.toLowerCase();
});

test('EXG-083 · barre du navigateur aux couleurs du thème affiché', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'une seule vérification suffit');
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithData(page);

  // Barre du navigateur : suit le thème du système…
  expect(await themeColor(page)).toBe('#f7f8fa');
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await themeColor(page)).toBe('#12161c');

  // … ou celui choisi dans Réglages
  await openNav(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByLabel('Thème').selectOption('light');
  await expect.poll(() => themeColor(page)).toBe('#f7f8fa');
});
