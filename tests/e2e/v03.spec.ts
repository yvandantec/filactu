import { expect, test, type Page } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import type { ReadingState, Subscriptions } from '../../src/core/types';
import { connect, displayMode, goTo, openNav, startWithData, viewOption } from './helpers';

async function startWith(page: Page, extra: number) {
  const gh = new FakeGitHub();
  seed(gh, new Date(), extra);
  return startWithData(page, gh, false);
}

/** Simule un balayage horizontal au doigt sur un élément. */
async function swipe(page: Page, selector: string, dx: number) {
  await page.evaluate(([sel, delta]) => {
    const el = document.querySelector(sel as string)!;
    const r = el.getBoundingClientRect();
    const x0 = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const t = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x0)], bubbles: true }));
    for (let i = 1; i <= 6; i++) el.dispatchEvent(new TouchEvent('touchmove', { touches: [t(x0 + ((delta as number) * i) / 6)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
  }, [selector, dx] as const);
}

const reading = (gh: FakeGitHub) => gh.get<ReadingState>('state/reading.json');

test.describe('affichage', () => {
  test('EXG-036 · affichage compact : au moins 5 articles visibles sur un téléphone', async ({ page }, info) => {
    test.skip(info.project.name !== 'telephone', 'mesure propre au téléphone');
    await startWith(page, 10);
    await expect(page.locator('.summary')).toHaveCount(0);
    const vh = page.viewportSize()!.height;
    const visible = await page.locator('.article').evaluateAll((els, h) =>
      els.filter((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= h; }).length, vh);
    expect(visible).toBeGreaterThanOrEqual(5);
  });

  test('EXG-036 · l’option « début de l’article » est synchronisée', async ({ page }) => {
    const gh = await startWithData(page);
    await viewOption(page, 'Afficher le début de l’article');
    await expect(page.locator('.summary').first()).toBeVisible();
    await expect.poll(() => reading(gh)?.prefs.showSummary, { timeout: 5000 }).toBe(true);
  });

  test('EXG-030 · trois affichages, mémorisés par vue et synchronisés', async ({ page }) => {
    const gh = await startWithData(page);
    await displayMode(page, 'Titres');
    await expect(page.locator('.articles')).toHaveClass(/titles/);
    await expect(page.locator('.article').first().locator('.source')).toHaveText('Blog Exemple');
    await displayMode(page, 'Cartes');
    await expect(page.locator('.articles')).toHaveClass(/cards/);
    await expect(page.locator('.article').first().locator('.thumb')).toBeVisible();
    await expect.poll(() => reading(gh)?.prefs['mode:today'], { timeout: 5000 }).toBe('cards');
    await goTo(page, /^Tous les articles/);
    await expect(page.locator('.articles')).toHaveClass(/magazine/);
  });

  test('EXG-032 · en affichage Titres, le résumé apparaît au survol ou à l’appui long', async ({ page }, info) => {
    await startWithData(page);
    await displayMode(page, 'Titres');
    const link = page.locator('.article').first().locator('a.article-link');
    await expect(link).toHaveAttribute('title', /Résumé de Premier article du blog/);
    if (info.project.name !== 'pc') {
      await page.evaluate(() => {
        const el = document.querySelector('.article')!;
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: el, clientX: r.left + 20, clientY: r.top + 10 })], bubbles: true }));
      });
      await page.waitForTimeout(650);
      await page.evaluate(() => document.querySelector('.article')!.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })));
      await expect(page.locator('.article').first().locator('.summary')).toBeVisible();
    }
  });

  test('EXG-023 · plus anciens d’abord', async ({ page }) => {
    await startWithData(page);
    await viewOption(page, 'Plus anciens d’abord');
    await expect(page.locator('.article-title').first()).toHaveText('Deuxième article du blog');
  });

  test('EXG-024 · non lus seulement : l’article lu reste affiché jusqu’au changement de vue', async ({ page }) => {
    await startWithData(page);
    await page.locator('.article[data-id="i_2"] .read-toggle').click();
    await expect(page.locator('.article[data-id="i_2"]')).toHaveClass(/read/);
    await goTo(page, /^Tous les articles/);
    await expect(page.locator('.article')).toHaveCount(3);
    await expect(page.locator('.article[data-id="i_2"]')).toHaveCount(0);
  });
});

test.describe('lecture', () => {
  test('EXG-041 · les articles sortis de l’écran par le haut sont marqués lus', async ({ page }) => {
    const gh = await startWith(page, 30);
    await expect(page.getByTestId('view-unread')).toHaveText('34 non lus');
    await page.locator('.content').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect.poll(async () => Number((await page.getByTestId('view-unread').textContent())!.split(' ')[0]), { timeout: 5000 })
      .toBeLessThan(30);
    await expect(page.locator('.article[data-id="i_1"]')).toHaveClass(/read/);
    await expect.poll(() => Object.keys(reading(gh)?.read ?? {}).length, { timeout: 6000 }).toBeGreaterThan(4);
  });

  test('EXG-041 · réglage : ne pas marquer lu en défilant', async ({ page }) => {
    await startWith(page, 30);
    await openNav(page);
    await page.getByRole('button', { name: 'Réglages' }).click();
    await page.getByLabel('Marquer comme lu en défilant').uncheck();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('.content').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(800);
    await expect(page.getByTestId('view-unread')).toHaveText('34 non lus');
  });

  test('EXG-042 · EXG-050 · balayage : gauche = lu, droite = à lire plus tard', async ({ page }, info) => {
    test.skip(info.project.name === 'pc', 'geste tactile');
    const gh = await startWithData(page);
    await swipe(page, '.article[data-id="i_1"]', -120);
    await expect(page.locator('.article[data-id="i_1"]')).toHaveClass(/read/);
    await swipe(page, '.article[data-id="i_2"]', 120);
    await expect.poll(() => reading(gh)?.saved['i_2']?.removed, { timeout: 5000 }).toBe(false);
  });

  test('EXG-050 · EXG-051 · à lire plus tard : ajout, liste dédiée, retrait', async ({ page }) => {
    const gh = await startWithData(page);
    await page.locator('.article[data-id="i_3"]').getByRole('button', { name: 'Lire plus tard' }).click();
    await expect(page.getByRole('status')).toContainText('Ajouté à « À lire plus tard »');
    await expect.poll(() => reading(gh)?.saved['i_3']?.item.title, { timeout: 5000 }).toBe('Une nouvelle');
    await goTo(page, /^À lire plus tard/);
    await expect(page.locator('.view-title')).toHaveText('À lire plus tard');
    await expect(page.locator('.article')).toHaveCount(1);
    await page.locator('.article').getByRole('button', { name: 'Retirer de « À lire plus tard »' }).click();
    await expect.poll(() => reading(gh)?.saved['i_3']?.removed, { timeout: 5000 }).toBe(true);
  });
});

test.describe('recherche, thème, raccourcis', () => {
  test('EXG-060 · recherche sans accents, dans la vue ou partout', async ({ page }) => {
    await startWithData(page);
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('entree');
    await expect(page.locator('.article')).toHaveCount(1);
    await expect(page.locator('.article-title')).toHaveText('Entrée Atom');
    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('aucun mot présent');
    await expect(page.getByText('Aucun résultat')).toBeVisible();
    await page.getByLabel('Partout').check();
    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('blog');
    await expect(page.locator('.article')).toHaveCount(2);
    await page.getByRole('button', { name: 'Fermer la recherche' }).click();
    await expect(page.locator('.article')).toHaveCount(4);
  });

  test('EXG-061 · thème sombre au choix, synchronisé', async ({ page }) => {
    const gh = await startWithData(page);
    await openNav(page);
    await page.getByRole('button', { name: 'Réglages' }).click();
    await page.getByLabel('Thème').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 29)');
    await page.getByLabel('Thème').selectOption('light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect.poll(() => reading(gh)?.prefs.theme, { timeout: 5000 }).toBe('light');
  });

  test('EXG-062 · raccourcis clavier', async ({ page }, info) => {
    test.skip(info.project.name !== 'pc', 'clavier sur PC');
    const gh = await startWithData(page);
    await page.keyboard.press('j');
    await expect(page.locator('.article.selected')).toHaveAttribute('data-id', 'i_1');
    await page.keyboard.press('j');
    await expect(page.locator('.article.selected')).toHaveAttribute('data-id', 'i_2');
    await page.keyboard.press('m');
    await expect(page.locator('.article[data-id="i_2"]')).toHaveClass(/read/);
    await page.keyboard.press('s');
    await expect.poll(() => reading(gh)?.saved['i_2']?.removed, { timeout: 5000 }).toBe(false);
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.keyboard.press('o')]);
    expect(popup.url()).toBe('https://f_atom.example.test/i_2');
    await page.bringToFront();
    await page.keyboard.press('v');
    await expect(page.locator('.articles')).toHaveClass(/cards/);
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox', { name: 'Rechercher' })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('g');
    await page.keyboard.press('a');
    await expect(page.locator('.view-title')).toHaveText('Tous les articles');
    await page.keyboard.press('Shift+A');
    await expect(page.getByTestId('view-unread')).toHaveText('0 non lus');
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Raccourcis clavier' })).toBeVisible();
  });
});

test.describe('hors connexion', () => {
  test('EXG-074 · hors connexion, les actions sont gardées puis envoyées au retour du réseau', async ({ page }) => {
    const gh = await startWithData(page);
    gh.offline = true;
    await page.locator('.article[data-id="i_1"] .read-toggle').click();
    await expect(page.getByTestId('offline')).toBeVisible({ timeout: 6000 });
    expect(reading(gh)?.read?.['i_1']).toBeUndefined();
    gh.offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => reading(gh)?.read['i_1'], { timeout: 6000 }).toBeTruthy();
    await expect(page.getByTestId('offline')).toBeHidden();
  });

  test('EXG-074 · les articles en cache restent lisibles sans réseau', async ({ page }) => {
    const gh = await startWithData(page);
    gh.offline = true;
    await page.reload();
    await expect(page.locator('.article')).toHaveCount(4);
    await expect(page.getByTestId('offline')).toBeVisible();
  });
});

test.describe('fils et icônes', () => {
  test('EXG-012 · renommer un fil et changer sa catégorie', async ({ page }) => {
    const gh = await startWithData(page);
    await openNav(page);
    await page.locator('.sidebar').getByRole('button', { name: 'Déplier Tech' }).click();
    await page.getByRole('button', { name: 'Modifier le fil Blog Exemple' }).click();
    const dlg = page.getByRole('dialog', { name: 'Modifier le fil' });
    await dlg.getByLabel('Nom du fil').fill('Mon blog');
    await dlg.getByLabel('Tech').uncheck();
    await dlg.getByLabel('Actualités').check();
    await dlg.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(dlg).toBeHidden();
    const f = gh.get<Subscriptions>('state/subscriptions.json')!.feeds.find((x) => x.id === 'f_blog')!;
    expect(f).toMatchObject({ title: 'Mon blog', categories: ['actu'] });
  });

  test('EXG-012 · un fil garde au moins une catégorie', async ({ page }) => {
    await startWithData(page);
    await openNav(page);
    await page.locator('.sidebar').getByRole('button', { name: 'Déplier Tech' }).click();
    await page.getByRole('button', { name: 'Modifier le fil Blog Exemple' }).click();
    const dlg = page.getByRole('dialog', { name: 'Modifier le fil' });
    await dlg.getByLabel('Tech').uncheck();
    await dlg.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(dlg.getByRole('alert')).toContainText('au moins une catégorie');
  });

  test('EXG-012 · se désabonner d’un fil', async ({ page }) => {
    const gh = await startWithData(page);
    await openNav(page);
    await page.locator('.sidebar').getByRole('button', { name: 'Déplier Actualités' }).click();
    await page.getByRole('button', { name: 'Modifier le fil Nouvelles' }).click();
    await page.getByRole('dialog', { name: 'Modifier le fil' }).getByRole('button', { name: 'Se désabonner' }).click();
    await expect(page.getByRole('status')).toContainText('Abonnement supprimé');
    expect(gh.get<Subscriptions>('state/subscriptions.json')!.feeds.map((f) => f.id)).toEqual(['f_blog', 'f_atom']);
  });

  test('EXG-018 · icône proposée d’après le nom, et complétion des icônes manquantes', async ({ page }) => {
    const gh = await startWithData(page);
    await openNav(page);
    await page.locator('.sidebar').getByRole('button', { name: 'Gérer' }).click();
    const dlg = page.getByRole('dialog', { name: 'Gérer les catégories' });
    await dlg.getByLabel('Nom', { exact: true }).fill('Sport');
    const picker = dlg.getByRole('radiogroup', { name: 'Icône de la nouvelle catégorie' });
    await expect(picker.getByRole('radio', { name: 'Icône ⚽' })).toHaveAttribute('aria-checked', 'true');
    // un choix manuel n'est plus remplacé par la suggestion
    await picker.getByRole('radio', { name: 'Icône 🏀' }).click();
    await dlg.getByLabel('Nom', { exact: true }).fill('Sport collectif');
    await expect(picker.getByRole('radio', { name: 'Icône 🏀' })).toHaveAttribute('aria-checked', 'true');
    await dlg.getByRole('button', { name: 'Créer la catégorie' }).click();
    await expect(dlg.locator('[data-cat="sport-collectif"]')).toBeVisible();

    await dlg.getByRole('button', { name: 'Proposer les icônes manquantes' }).click();
    await expect.poll(() => gh.get<Subscriptions>('state/subscriptions.json')!.categories.map((c) => c.icon))
      .toEqual(['💻', '📰', '🏀']);
  });
});

test('EXG-001 · la reconnexion fonctionne après une déconnexion', async ({ page }) => {
  const gh = new FakeGitHub();
  seed(gh);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article')).toHaveCount(4);
});
