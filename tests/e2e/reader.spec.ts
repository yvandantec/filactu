import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { FakeGitHub, seed, GOOD_TOKEN } from '../support/fake-github';
import { connect, goTo, openNav, startWithData, viewOption } from './helpers';
import type { ReadingState, Subscriptions } from '../../src/core/types';

test('EXG-020 · EXG-015 · volet : vues fixes, catégories dépliables, compteurs, fils en erreur', async ({ page }) => {
  await startWithData(page);
  await openNav(page);
  const side = page.locator('.sidebar');
  await expect(side.getByRole('button', { name: /Aujourd’hui\s*4/ })).toBeVisible();
  await expect(side.getByRole('button', { name: /Tous les articles\s*4/ })).toBeVisible();
  await expect(side.getByRole('button', { name: /À lire plus tard/ })).toBeVisible();
  await expect(side.getByRole('button', { name: /^Tech\s*3$/ })).toBeVisible();
  await expect(side.getByRole('button', { name: /^Actualités\s*2$/ })).toBeVisible();
  await side.getByRole('button', { name: 'Déplier Tech' }).click();
  await expect(side.getByRole('button', { name: /Blog Exemple\s*2/ })).toBeVisible();
  await side.getByRole('button', { name: 'Déplier Actualités' }).click();
  // EXG-015 : fil en erreur signalé
  await expect(side.locator('.feed-row', { hasText: 'Nouvelles' }).locator('.warn')).toHaveAttribute('title', /ne répond plus/);
  // Navigation vers un fil
  await side.getByRole('button', { name: /^Blog Exemple/ }).click();
  await expect(page.locator('.view-title')).toHaveText('Blog Exemple');
  await expect(page.locator('.article')).toHaveCount(2);
});

test('EXG-021 · disposition adaptée à l’écran', async ({ page }, info) => {
  await startWithData(page);
  const menu = page.getByRole('button', { name: 'Ouvrir le menu' });
  if (info.project.name === 'pc') {
    await expect(menu).toBeHidden();
    await expect(page.locator('.sidebar')).toBeInViewport();
  } else {
    await expect(page.locator('.sidebar')).not.toBeInViewport();
    await menu.click();
    await expect(page.locator('.sidebar')).toBeInViewport();
    await page.locator('.sidebar').getByRole('button', { name: /Tous les articles/ }).click();
    await expect(page.locator('.sidebar')).not.toBeInViewport();
  }
});

test('EXG-022 · en-tête : nom de la vue, non-lus, actions', async ({ page }) => {
  await startWithData(page);
  await expect(page.locator('.view-title')).toHaveText('Aujourd’hui');
  await expect(page.getByTestId('view-unread')).toHaveText('4 non lus');
  await expect(page.getByRole('button', { name: 'Tout marquer comme lu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualiser' })).toBeVisible();
});

test('EXG-030 · EXG-035 · affichage Magazine : titre, fil / fraîcheur, début de l’article en option', async ({ page }) => {
  await startWithData(page);
  const first = page.locator('.article').first();
  await expect(page.locator('.articles')).toHaveClass(/magazine/);
  await expect(first.locator('.article-title')).toHaveText('Premier article du blog');
  await expect(first.locator('.article-top .source')).toHaveText('Blog Exemple');
  await expect(first.locator('.article-top .age')).toHaveText('10 min');
  await viewOption(page, 'Afficher le début de l’article', false);
  await expect(page.locator('.summary')).toHaveCount(0);
  await viewOption(page, 'Afficher le début de l’article', true);
  await expect(first.locator('.summary')).toContainText('Résumé de Premier article du blog');
  // EXG-035 : image chargée en différé et sans référent (masquée si elle ne se charge pas)
  const titles = await page.locator('.article-title').allTextContents();
  expect(titles).toEqual(['Premier article du blog', 'Entrée Atom', 'Une nouvelle', 'Deuxième article du blog']);
});

test('EXG-031 · le résumé est affiché en texte brut', async ({ page }) => {
  const gh = new FakeGitHub();
  seed(gh);
  const day = new Date().toISOString().slice(0, 10);
  const file = gh.get<{ items: { summary: string }[] }>(`items/${day}.json`)!;
  file.items[0].summary = '<b>pas du HTML</b>';
  gh.set(`items/${day}.json`, file);
  await gh.install(page.context());
  await connect(page);
  await viewOption(page, 'Afficher le début de l’article', true);
  await expect(page.locator('.summary').first()).toHaveText('<b>pas du HTML</b>');
  await expect(page.locator('.summary b')).toHaveCount(0);
});

test('EXG-033 · EXG-034 · EXG-040 · EXG-044 · un clic ouvre l’article dans le navigateur et le marque lu', async ({ page }) => {
  await startWithData(page);
  const first = page.locator('.article').first();
  const link = first.locator('a.article-link');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  expect(popup.url()).toBe('https://f_blog.example.test/i_1');
  await expect(first).toHaveClass(/read/);
  await expect(page.getByTestId('view-unread')).toHaveText('3 non lus');
});

test('EXG-073 · EXG-076 · l’article lu est enregistré sur GitHub et retrouvé sur un autre appareil', async ({ page, browser }) => {
  const gh = await startWithData(page);
  const first = page.locator('.article').first();
  await Promise.all([page.waitForEvent('popup'), first.locator('a.article-link').click()]);
  await expect.poll(() => gh.get<ReadingState>('state/reading.json')?.read['i_1'], { timeout: 5000 }).toBeTruthy();

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await gh.install(other);
  await connect(page2, GOOD_TOKEN);
  await expect(page2.getByTestId('view-unread')).toHaveText('3 non lus');
  // EXG-024 : non lus seulement par défaut → l'article lu ailleurs n'est pas affiché
  await expect(page2.locator('.article[data-id="i_2"]')).toBeVisible();
  await expect(page2.locator('.article[data-id="i_1"]')).toHaveCount(0);
  await viewOption(page2, 'Non lus seulement');
  await expect(page2.locator('.article[data-id="i_1"]')).toHaveClass(/read/);
  await other.close();
});

test('EXG-042 · EXG-075 · une écriture en conflit est fusionnée et réessayée sans perte', async ({ page }) => {
  const gh = await startWithData(page);
  gh.forceConflicts = 1;
  await page.locator('.article').nth(1).locator('.read-toggle').click();
  await expect.poll(() => gh.get<ReadingState>('state/reading.json')?.read['i_2'], { timeout: 6000 }).toBeTruthy();
});

test('EXG-010 · import du fichier OPML Feedly', async ({ page }) => {
  const gh = new FakeGitHub();
  await gh.install(page.context());
  page.on('dialog', (d) => void d.accept());
  await connect(page);
  await expect(page.getByText('Bienvenue dans FilActu')).toBeVisible();
  await page.getByRole('button', { name: 'Importer mes abonnements' }).click();
  await page.getByTestId('opml-input').setInputFiles({
    name: 'feedly.opml',
    mimeType: 'text/xml',
    buffer: readFileSync('tests/fixtures/opml/feedly.opml'),
  });
  await expect(page.getByRole('status')).toContainText('4 fils et 3 catégories importés');
  await openNav(page);
  await expect(page.locator('.sidebar').getByRole('button', { name: /^Tech/ })).toBeVisible();
  const subs = gh.get<Subscriptions>('state/subscriptions.json')!;
  expect(subs.feeds).toHaveLength(4);
  await expect.poll(() => gh.dispatches).toBe(1); // collecte lancée aussitôt
});

test('EXG-071 · le bouton Actualiser demande une collecte', async ({ page }) => {
  const gh = await startWithData(page);
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.poll(() => gh.dispatches).toBe(1);
  await expect(page.getByRole('status')).toContainText('Collecte demandée');
});

test('EXG-043 · tout marquer comme lu sur la vue, puis annuler', async ({ page }) => {
  await startWithData(page);
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  await page.getByRole('menuitem', { name: 'Tout' }).click();
  await expect(page.getByTestId('view-unread')).toHaveText('0 non lus');
  await expect(page.locator('.article.read')).toHaveCount(4);
  await expect(page.getByRole('status')).toContainText('4 articles marqués comme lus');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByTestId('view-unread')).toHaveText('4 non lus');
});

test('EXG-043 · « plus vieux qu’un jour » ne touche pas aux articles récents', async ({ page }) => {
  const gh = new FakeGitHub();
  seed(gh);
  const old = new Date(Date.now() - 2 * 86400_000);
  const day = old.toISOString().slice(0, 10);
  gh.set(`items/${day}.json`, { date: day, items: [{
    id: 'i_old', feedId: 'f_blog', title: 'Vieil article', link: 'https://f_blog.example.test/old',
    published: old.toISOString(), fetched: old.toISOString(), summary: '',
  }] });
  await gh.install(page.context());
  await connect(page);
  await goTo(page, /^Tous les articles/);
  await expect(page.getByTestId('view-unread')).toHaveText('5 non lus');
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  await page.getByRole('menuitem', { name: 'Plus vieux qu’un jour' }).click();
  await expect(page.getByTestId('view-unread')).toHaveText('4 non lus');
  await expect(page.locator('.article[data-id="i_old"]')).toHaveClass(/read/);
});
