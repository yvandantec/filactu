import { expect, type Page } from '@playwright/test';
import { FakeGitHub, GOOD_TOKEN, seed } from '../support/fake-github';

export async function connect(page: Page, token = GOOD_TOKEN) {
  await page.goto('./');
  await page.getByLabel('Clé d’accès GitHub').fill(token);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

export async function startWithData(page: Page, gh = new FakeGitHub()) {
  seed(gh);
  await gh.install(page.context());
  page.on('dialog', (d) => void d.accept());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  return gh;
}

/** Ouvre le volet de navigation s'il est escamoté (téléphone, tablette portrait). */
export async function openNav(page: Page) {
  const menu = page.getByRole('button', { name: 'Ouvrir le menu' });
  if (await menu.isVisible()) await menu.click();
  await expect(page.locator('.sidebar')).toBeInViewport();
}
