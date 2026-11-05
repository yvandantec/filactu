import { expect, test, type Page } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import { displayMode, openNav, startWithData } from '../e2e/helpers';

const shot = (page: Page, name: string) => page.screenshot({ path: `docs/images/${name}.png` });

async function start(page: Page) {
  const gh = new FakeGitHub();
  seed(gh, new Date(), 6);
  await startWithData(page, gh, false);
  await page.mouse.move(0, 0);
}

test('PC', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await start(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Déplier Tech' }).click();
  await shot(page, 'pc-magazine');
  await displayMode(page, 'Cartes');
  await shot(page, 'pc-cartes');
  await displayMode(page, 'Titres');
  await shot(page, 'pc-titres');
});

test('Téléphone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  await start(page);
  await shot(page, 'telephone-magazine');
  await openNav(page);
  await page.waitForTimeout(300);
  await shot(page, 'telephone-volet');
  await page.locator('.sidebar').getByRole('button', { name: /Tous les articles/ }).click();
  await page.getByRole('button', { name: 'Options d’affichage' }).click();
  await expect(page.getByRole('dialog', { name: 'Options d’affichage' })).toBeVisible();
  await shot(page, 'telephone-options');
  await ctx.close();
});
