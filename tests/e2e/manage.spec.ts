import { expect, test, type Page } from '@playwright/test';
import type { ReadingState, Subscriptions } from '../../src/core/types';
import { openNav, startWithData } from './helpers';

async function openAddFeed(page: Page) {
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Ajouter un fil' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouter un fil' })).toBeVisible();
}

async function openCategories(page: Page) {
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Gérer' }).click();
  return page.getByRole('dialog', { name: 'Gérer les catégories' });
}

test('EXG-011 · ajouter un abonnement dans une catégorie existante', async ({ page }) => {
  const gh = await startWithData(page);
  await openAddFeed(page);
  const dlg = page.getByRole('dialog', { name: 'Ajouter un fil' });
  await dlg.getByLabel('Adresse du fil ou du site').fill('https://nouveau.example.test/rss');
  await dlg.getByLabel(/^Nom/).fill('Mon nouveau fil');
  await dlg.getByLabel('Catégorie').selectOption('actu');
  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByRole('status')).toContainText('Abonnement ajouté');
  const subs = gh.get<Subscriptions>('state/subscriptions.json')!;
  expect(subs.feeds.at(-1)).toMatchObject({ url: 'https://nouveau.example.test/rss', title: 'Mon nouveau fil', categories: ['actu'] });
  await expect.poll(() => gh.dispatches).toBe(1);
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Déplier Actualités' }).click();
  await expect(page.locator('.sidebar').getByRole('button', { name: /^Mon nouveau fil/ })).toBeVisible();
});

test('EXG-011 · une adresse déjà suivie est refusée', async ({ page }) => {
  const gh = await startWithData(page);
  await openAddFeed(page);
  const dlg = page.getByRole('dialog', { name: 'Ajouter un fil' });
  await dlg.getByLabel('Adresse du fil ou du site').fill('https://blog.example.test/rss');
  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(dlg.getByRole('alert')).toContainText('déjà abonné');
  expect(gh.get<Subscriptions>('state/subscriptions.json')!.feeds).toHaveLength(3);
});

test('EXG-011 · EXG-016 · ajouter un abonnement dans une nouvelle catégorie avec icône', async ({ page }) => {
  const gh = await startWithData(page);
  await openAddFeed(page);
  const dlg = page.getByRole('dialog', { name: 'Ajouter un fil' });
  await dlg.getByLabel('Adresse du fil ou du site').fill('https://cuisine.example.test/');
  await dlg.getByLabel('Catégorie').selectOption({ label: '+ Nouvelle catégorie…' });
  await dlg.getByLabel('Nom de la nouvelle catégorie').fill('Cuisine');
  await dlg.getByRole('radio', { name: 'Icône 🍳' }).click();
  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(dlg).toBeHidden();
  const subs = gh.get<Subscriptions>('state/subscriptions.json')!;
  expect(subs.categories.at(-1)).toMatchObject({ id: 'cuisine', name: 'Cuisine', icon: '🍳' });
  expect(subs.feeds.at(-1)).toMatchObject({ categories: ['cuisine'], title: '' });
  await openNav(page);
  await expect(page.locator('.sidebar .cat-name', { hasText: 'Cuisine' }).locator('.cat-icon')).toHaveText('🍳');
});

test('EXG-013 · EXG-016 · créer une catégorie avec icône, la renommer, changer son icône, la réordonner', async ({ page }) => {
  const gh = await startWithData(page);
  const dlg = await openCategories(page);
  await dlg.getByLabel('Nom', { exact: true }).fill('Science');
  await dlg.getByRole('radiogroup', { name: 'Icône de la nouvelle catégorie' }).getByRole('radio', { name: 'Icône 🔬' }).click();
  await dlg.getByRole('button', { name: 'Créer la catégorie' }).click();
  await expect(dlg.locator('[data-cat="science"]')).toBeVisible();
  await expect(dlg.getByLabel('Nom', { exact: true })).toHaveValue('');

  // Renommer
  const rename = dlg.getByLabel('Nom de la catégorie Tech');
  await rename.fill('Technologie');
  await rename.press('Enter');
  await expect.poll(() => gh.get<Subscriptions>('state/subscriptions.json')!.categories.find((c) => c.id === 'tech')?.name).toBe('Technologie');

  // Changer l'icône
  await dlg.getByRole('button', { name: 'Changer l’icône de Actualités' }).click();
  await dlg.getByRole('radiogroup', { name: 'Icône de Actualités' }).getByRole('radio', { name: 'Icône 📰' }).click();
  await expect.poll(() => gh.get<Subscriptions>('state/subscriptions.json')!.categories.find((c) => c.id === 'actu')?.icon).toBe('📰');

  // Réordonner : Science remonte d'un cran
  await dlg.getByRole('button', { name: 'Monter Science' }).click();
  await expect.poll(() => {
    const cats = gh.get<Subscriptions>('state/subscriptions.json')!.categories;
    return [...cats].sort((a, b) => a.order - b.order).map((c) => c.id);
  }).toEqual(['tech', 'science', 'actu']);

  await dlg.getByRole('button', { name: 'Fermer' }).click();
  await openNav(page);
  const names = await page.locator('.sidebar .cat-name').allInnerTexts();
  expect(names.map((n) => n.replace(/\s+/g, ' ').trim())).toEqual(['Technologie 3', '🔬 Science', '📰 Actualités 2']);
});

test('EXG-013 · un nom de catégorie déjà pris est refusé', async ({ page }) => {
  await startWithData(page);
  const dlg = await openCategories(page);
  await dlg.getByLabel('Nom', { exact: true }).fill('tech');
  await dlg.getByRole('button', { name: 'Créer la catégorie' }).click();
  await expect(dlg.getByRole('alert')).toContainText('existe déjà');
});

test('EXG-013 · supprimer une catégorie non vide en déplaçant ses fils', async ({ page }) => {
  const gh = await startWithData(page);
  const dlg = await openCategories(page);
  await dlg.locator('[data-cat="tech"]').getByRole('button', { name: 'Supprimer' }).click();
  const panel = dlg.getByRole('group', { name: 'Suppression de Tech' });
  await expect(panel).toContainText('1 fil n’est rangé que dans « Tech »');
  await panel.getByLabel('Destination des fils').selectOption('actu');
  await panel.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(dlg.locator('[data-cat="tech"]')).toHaveCount(0);
  const subs = gh.get<Subscriptions>('state/subscriptions.json')!;
  expect(subs.categories.map((c) => c.id)).toEqual(['actu']);
  expect(subs.feeds.map((f) => [f.id, f.categories])).toEqual([['f_blog', ['actu']], ['f_atom', ['actu']], ['f_news', ['actu']]]);
});

test('EXG-013 · supprimer une catégorie en se désabonnant de ses fils', async ({ page }) => {
  const gh = await startWithData(page);
  const dlg = await openCategories(page);
  await dlg.locator('[data-cat="actu"]').getByRole('button', { name: 'Supprimer' }).click();
  const panel = dlg.getByRole('group', { name: 'Suppression de Actualités' });
  await panel.getByLabel('Destination des fils').selectOption('unsubscribe');
  await panel.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(dlg.locator('[data-cat="actu"]')).toHaveCount(0);
  const subs = gh.get<Subscriptions>('state/subscriptions.json')!;
  // « Nouvelles » n'était que dans Actualités : désabonné ; « Journal Atom » reste dans Tech
  expect(subs.feeds.map((f) => [f.id, f.categories])).toEqual([['f_blog', ['tech']], ['f_atom', ['tech']]]);
});

test('EXG-045 · le bouton de bas de page marque lus les articles affichés', async ({ page }) => {
  const gh = await startWithData(page);
  await page.locator('.article').first().locator('.read-toggle').click(); // un article déjà lu
  const btn = page.getByRole('button', { name: 'Marquer les 3 articles affichés comme lus' });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.getByTestId('view-unread')).toHaveText('0 non lus');
  await expect(page.locator('.article.read')).toHaveCount(4);
  await expect(page.getByText('Tout est lu sur cette page.')).toBeVisible();
  await expect.poll(() => Object.keys(gh.get<ReadingState>('state/reading.json')?.read ?? {}).sort(), { timeout: 5000 })
    .toEqual(['i_1', 'i_2', 'i_3', 'i_4']);
});
