import { expect, test, type Page } from '@playwright/test';
import { openNav, startWithData } from './helpers';

const themeColor = (page: Page) => page.evaluate(() => {
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const active = metas.find((m) => !m.media || matchMedia(m.media).matches);
  return active?.content.toLowerCase();
});

test('EXG-083 · icône « tableau » et barre du navigateur aux couleurs du thème affiché', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'une seule vérification suffit');
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithData(page);

  // L'icône installée : fond encre, ondes en jaune signal
  const px = await page.evaluate(async () => {
    const img = new Image();
    img.src = 'icons/icon-512.png';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const at = (x: number, y: number) => [...g.getImageData(x, y, 1, 1).data.slice(0, 3)];
    return { fond: at(256, 40), point: at(208, 352) };
  });
  expect(px.fond).toEqual([0x12, 0x16, 0x1c]);
  expect(px.point).toEqual([0xff, 0xcf, 0x3a]);

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
