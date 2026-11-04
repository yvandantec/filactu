import { expect, type Page } from '@playwright/test';
import { FakeGitHub, GOOD_TOKEN, seed } from '../support/fake-github';

export async function connect(page: Page, token = GOOD_TOKEN) {
  await page.goto('./');
  await page.getByLabel('Clé d’accès GitHub').fill(token);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

export async function startWithData(page: Page, gh = new FakeGitHub(), doSeed = true) {
  if (doSeed) seed(gh);
  await gh.install(page.context());
  page.on('dialog', (d) => void d.accept());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  return gh;
}

/** Coche / décoche une option du menu « Options d’affichage ». */
export async function viewOption(page: Page, label: string, checked?: boolean) {
  await page.getByRole('button', { name: 'Options d’affichage' }).click();
  const menu = page.getByRole('dialog', { name: 'Options d’affichage' });
  if (checked === undefined) await menu.getByLabel(label).click();
  else await menu.getByLabel(label).setChecked(checked);
  await menu.getByRole('button', { name: 'Fermer' }).click();
  await expect(menu).toBeHidden();
}

/** Choisit un affichage (Titres, Magazine, Cartes). */
export async function displayMode(page: Page, name: 'Titres' | 'Magazine' | 'Cartes') {
  await page.getByRole('button', { name: 'Options d’affichage' }).click();
  const menu = page.getByRole('dialog', { name: 'Options d’affichage' });
  await menu.getByRole('radio', { name }).click();
  await menu.getByRole('button', { name: 'Fermer' }).click();
}

/** Va dans une vue du volet (en l'ouvrant si besoin). */
export async function goTo(page: Page, name: RegExp) {
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name }).first().click();
}

/** Ouvre le volet de navigation s'il est escamoté (téléphone, tablette portrait). */
export async function openNav(page: Page) {
  await expect(page.locator('.app')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Ouvrir le menu' });
  if (await menu.isVisible()) await menu.click();
  await expect(page.locator('.sidebar')).toBeInViewport();
}
