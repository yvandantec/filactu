import { expect, test } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import type { DayFile } from '../../src/core/types';
import { startWithData } from './helpers';

const LONG = 'Transports : le tram de nuit sera prolongé jusqu’à la gare dès janvier, avec un passage toutes les vingt minutes le week-end et de nouveaux arrêts dans trois quartiers jusqu’ici mal desservis';

function data(extra = 0) {
  const gh = new FakeGitHub();
  seed(gh, new Date(), extra);
  const path = [...gh.files.keys()].find((p) => p.startsWith('items/'))!;
  const day = gh.get<DayFile>(path)!;
  day.items.find((i) => i.id === 'i_2')!.title = LONG;
  gh.set(path, day);
  return gh;
}

test('EXG-039 · le titre est entier et le plus lisible, la source se reconnaît', async ({ page }) => {
  await startWithData(page, data(), false);
  const row = page.locator('.article[data-id="i_2"]');
  const title = row.locator('.article-title');
  await expect(title).toHaveText(LONG);
  const m = await title.evaluate((el) => {
    const s = getComputedStyle(el);
    const row = el.closest('.article')!;
    const size = (sel: string) => parseFloat(getComputedStyle(row.querySelector(sel)!).fontSize);
    return {
      clipped: el.scrollHeight > el.clientHeight + 1,
      clamp: s.webkitLineClamp,
      family: s.fontFamily,
      title: parseFloat(s.fontSize),
      source: size('.source'),
      age: size('.age'),
    };
  });
  expect(m.clipped, 'titre coupé').toBe(false);
  expect(m.clamp === 'none' || m.clamp === '').toBe(true);
  expect(m.family).toMatch(/^"?Barlow"?/);
  expect(m.title).toBeGreaterThan(m.source);
  expect(m.title).toBeGreaterThan(m.age);
  // la source : icône (ou initiale) et nom complet, sur la même ligne que les boutons
  const top = row.locator('.article-top');
  await expect(top.locator('.favicon')).toBeVisible();
  await expect(top.locator('.source')).toHaveText('Journal Atom');
  const box = (await top.boundingBox())!;
  const btn = (await row.locator('.read-toggle').boundingBox())!;
  expect(btn.y + btn.height / 2).toBeGreaterThan(box.y);
  expect(btn.y + btn.height / 2).toBeLessThan(box.y + box.height);
  // polices hébergées avec l'appli
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 18px Barlow') && document.fonts.check('600 15px "Barlow Condensed"'); })).toBe(true);
});

test('EXG-039 · sur téléphone, image d’au moins 112 × 84 et au moins 5 articles illustrés à l’écran', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'téléphone');
  await startWithData(page, data(12), false);
  const thumb = (await page.locator('.article[data-id="i_1"] .thumb').boundingBox())!;
  expect(thumb.width).toBeGreaterThanOrEqual(112);
  expect(thumb.height).toBeGreaterThanOrEqual(84);
  await page.locator('.article[data-id="x_0"]').scrollIntoViewIfNeeded();
  await page.locator('.content').evaluate((el, id) => { el.scrollTop = (document.querySelector(`[data-id="${id}"]`) as HTMLElement).offsetTop; }, 'x_0');
  const visible = await page.locator('.article.has-image, .article').evaluateAll((els) => els.filter((e) => {
    const r = e.getBoundingClientRect();
    return e.querySelector('.thumb') && r.top >= 0 && r.bottom <= innerHeight;
  }).length);
  expect(visible).toBeGreaterThanOrEqual(5);
});

test('EXG-061 · thème sombre « tableau » et thème clair', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await startWithData(page, data(), false);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 22, 28)');
  await expect(page.locator('.article[data-id="i_2"] .source')).toHaveCSS('color', 'rgb(255, 207, 58)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
  await expect(page.locator('.article[data-id="i_2"] .source')).toHaveCSS('color', 'rgb(138, 90, 0)');
});
