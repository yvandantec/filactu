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

/** Écrans principaux de l'appli, parcourus un par un (le rappel `visit` est appelé sur chacun). */
export async function eachScreen(page: Page, visit: (name: string) => Promise<void>) {
  await visit('liste');
  await page.getByRole('button', { name: 'Options d’affichage' }).click();
  await expect(page.getByRole('dialog', { name: 'Options d’affichage' })).toBeVisible();
  await visit('options d’affichage');
  await page.getByRole('dialog', { name: 'Options d’affichage' }).getByRole('button', { name: 'Fermer' }).click();
  for (const mode of ['Titres', 'Cartes', 'Magazine'] as const) {
    await displayMode(page, mode);
    await expect(page.locator('.articles')).toHaveClass(new RegExp(mode === 'Titres' ? 'titles' : mode === 'Cartes' ? 'cards' : 'magazine'));
    if (mode !== 'Magazine') await visit(`affichage ${mode}`);
  }
  await openNav(page);
  await visit('volet');
  await page.locator('.sidebar').getByRole('button', { name: 'Réglages' }).click();
  await expect(page.getByRole('dialog', { name: 'Réglages' })).toBeVisible();
  await visit('réglages');
  await page.getByRole('dialog', { name: 'Réglages' }).getByRole('button', { name: 'Fermer' }).click();
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Ajouter un fil' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouter un fil' })).toBeVisible();
  await visit('ajout d’un fil');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Gérer' }).click();
  await expect(page.getByRole('dialog', { name: 'Gérer les catégories' })).toBeVisible();
  await visit('gestion des catégories');
  await page.keyboard.press('Escape');
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Déplier Tech' }).click();
  await page.locator('.sidebar').getByRole('button', { name: /^Modifier le fil/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Modifier le fil' })).toBeVisible();
  await visit('modification d’un fil');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
