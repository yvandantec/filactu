import { expect, test, type Page } from '@playwright/test';
import type { ReadingState } from '../../src/core/types';
import { goTo, openNav, startWithData } from './helpers';

/** Simule un glissement de doigt sur la liste d'articles (dx horizontal, dy vertical). */
async function swipe(page: Page, dx: number, dy = 0, startX?: number) {
  await page.evaluate(([deltaX, deltaY, x]) => {
    const el = document.querySelector('.article .article-title')!;
    const r = el.getBoundingClientRect();
    const x0 = (x as number | null) ?? r.left + r.width / 2;
    const y0 = r.top + r.height / 2;
    const t = (i: number) => new Touch({ identifier: 1, target: el, clientX: x0 + ((deltaX as number) * i) / 6, clientY: y0 + ((deltaY as number) * i) / 6 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(0)], changedTouches: [t(0)], bubbles: true }));
    for (let i = 1; i <= 6; i++) el.dispatchEvent(new TouchEvent('touchmove', { touches: [t(i)], changedTouches: [t(i)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(6)], bubbles: true }));
  }, [dx, dy, startX ?? null] as const);
}

async function chooseCategorySwipe(page: Page) {
  await openNav(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByLabel('Glisser le doigt sur la liste').selectOption('category');
  await page.getByRole('button', { name: 'Fermer' }).click();
}

const title = (page: Page) => page.locator('.view-title');

test.describe('V1.6 — glisser entre catégories', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name === 'pc', 'geste tactile'); });

  test('EXG-090 · glisser change de catégorie, en boucle, et le réglage est synchronisé', async ({ page }) => {
    const gh = await startWithData(page);
    await chooseCategorySwipe(page);
    await expect.poll(() => gh.get<ReadingState>('state/reading.json')?.prefs.swipeAction, { timeout: 5000 }).toBe('category');
    // Depuis « Aujourd'hui » : vers la gauche, première catégorie
    await swipe(page, -150);
    await expect(title(page)).toHaveText(/Tech$/);
    await swipe(page, -150);
    await expect(title(page)).toHaveText(/Actualités$/);
    // Après la dernière : retour à la première
    await swipe(page, -150);
    await expect(title(page)).toHaveText(/Tech$/);
    // Vers la droite depuis la première : la dernière
    await swipe(page, 150);
    await expect(title(page)).toHaveText(/Actualités$/);
    // Le glissement n'a marqué aucun article comme lu
    await expect(page.locator('.article.read')).toHaveCount(0);
  });

  test('EXG-090 · un défilement vertical ou un geste trop court ne change pas de catégorie', async ({ page }) => {
    await startWithData(page);
    await chooseCategorySwipe(page);
    await goTo(page, /^Tech/);
    await expect(title(page)).toHaveText(/Tech$/);
    await swipe(page, -60, 220);
    await swipe(page, -40);
    await page.waitForTimeout(300);
    await expect(title(page)).toHaveText(/Tech$/);
  });

  test('EXG-090 · par défaut, glisser sur un article garde son rôle (lu / à lire plus tard)', async ({ page }) => {
    await startWithData(page);
    await openNav(page);
    await page.getByRole('button', { name: 'Réglages' }).click();
    await expect(page.getByLabel('Glisser le doigt sur la liste')).toHaveValue('article');
    await page.getByRole('button', { name: 'Fermer' }).click();
    await swipe(page, -150);
    await expect(page.locator('.article').first()).toHaveClass(/read/);
    await expect(title(page)).toHaveText('Aujourd’hui');
  });
});

test('EXG-090 · sur PC (sans écran tactile), le réglage n’apparaît pas', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'PC');
  await startWithData(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await expect(page.getByLabel('Glisser le doigt sur la liste')).toHaveCount(0);
});
