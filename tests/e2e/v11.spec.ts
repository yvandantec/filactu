import { expect, test, type Locator, type Page } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import type { FeedsStatus } from '../../src/core/types';
import { connect, goTo, openNav, startWithData } from './helpers';

/** Contraste WCAG entre deux couleurs CSS « rgb(...) ». */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Couleur du bouton lu / non lu et du fond réel de la ligne. */
async function toggleColors(row: Locator) {
  return row.evaluate((li) => {
    const btn = li.querySelector('.read-toggle') as HTMLElement;
    let el: HTMLElement | null = btn;
    let bg = 'rgba(0, 0, 0, 0)';
    while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
    if (/rgba\(0, 0, 0, 0\)/.test(bg)) bg = getComputedStyle(document.body).backgroundColor;
    return { fg: getComputedStyle(btn).color, bg };
  });
}

test('EXG-063 · la recherche trouve aussi les articles déjà lus', async ({ page }) => {
  await startWithData(page);
  // « Entrée Atom » est lu, puis on change de vue : il disparaît de la liste des non-lus
  await page.locator('.article[data-id="i_2"] .read-toggle').click();
  await goTo(page, /Tous les articles/);
  await expect(page.locator('.article[data-id="i_2"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('entree');
  await expect(page.locator('.article')).toHaveCount(1);
  await expect(page.locator('.article-title')).toHaveText('Entrée Atom');
});

test('EXG-063 · sur téléphone, le champ de recherche occupe la barre du haut', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'téléphone');
  await startWithData(page);
  await page.getByRole('button', { name: 'Rechercher' }).click();
  const box = await page.getByRole('searchbox', { name: 'Rechercher' }).boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.width).toBeGreaterThan(width * 0.55);
  await expect(page.getByRole('button', { name: 'Options d’affichage' })).toBeHidden();
  await page.getByRole('button', { name: 'Fermer la recherche' }).click();
  await expect(page.getByRole('button', { name: 'Options d’affichage' })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`EXG-046 · boutons d’article alignés, bouton lu / non lu lisible (thème ${scheme === 'light' ? 'clair' : 'sombre'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await startWithData(page);
    // i_1 a une image, i_2 non : les boutons sont pourtant à la même position horizontale
    const x = async (id: string) => (await page.locator(`.article[data-id="${id}"] .read-toggle`).boundingBox())!.x;
    expect(Math.abs((await x('i_1')) - (await x('i_2')))).toBeLessThan(2);
    const row = page.locator('.article[data-id="i_2"]');
    const toggle = row.locator('.read-toggle');
    await expect(toggle.locator('svg.ic-circle')).toHaveCount(1);
    let c = await toggleColors(row);
    expect(contrast(c.fg, c.bg), 'non lu').toBeGreaterThanOrEqual(3);
    await toggle.click();
    await expect(toggle.locator('svg.ic-check-circle')).toHaveCount(1);
    c = await toggleColors(row);
    expect(contrast(c.fg, c.bg), 'lu').toBeGreaterThanOrEqual(3);
  });
}

test('EXG-047 · la notification « Annuler » ne cache pas les boutons d’une fenêtre', async ({ page }) => {
  await startWithData(page);
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).first().click();
  await page.getByRole('menuitem', { name: 'Tout' }).click();
  const toast = page.getByRole('status').filter({ hasText: 'Annuler' });
  await expect(toast).toBeVisible();
  await openNav(page);
  // le volet ouvert n'est pas caché non plus : « Réglages » se touche aussitôt
  await page.locator('.sidebar').getByRole('button', { name: 'Réglages' }).click({ timeout: 2000 });
  const dialog = page.getByRole('dialog', { name: 'Réglages' });
  // la notification reste disponible (sous la fenêtre) pendant son délai
  await expect(dialog).toBeVisible();
  await expect(toast).toBeAttached();
  const covered = async (p: Page) => p.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')!;
    return [...d.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      if (!r.width || r.bottom > innerHeight || r.top < 0) return false;
      const cy = r.top + r.height / 2;
      // bouton hors de la partie visible de la fenêtre (elle défile) : non concerné
      const box = (d.querySelector('.dialog') ?? d).getBoundingClientRect();
      if (cy < box.top || cy > box.bottom) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, cy);
      return !(hit && b.contains(hit));
    }).map((b) => b.textContent?.trim() || b.getAttribute('aria-label'));
  });
  await dialog.locator('.btn-danger').scrollIntoViewIfNeeded();
  expect(await covered(page)).toEqual([]);
});

function staleData(minutesAgo: number) {
  const gh = new FakeGitHub();
  seed(gh);
  const st = gh.get<FeedsStatus>('meta/feeds-status.json')!;
  st.lastRun = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  gh.set('meta/feeds-status.json', st);
  return gh;
}

test('EXG-082 · le bandeau « articles pas à jour » est en langage courant et se ferme', async ({ page }) => {
  const gh = staleData(180);
  await gh.install(page.context());
  await connect(page);
  const banner = page.getByTestId('stale');
  await expect(banner).toContainText('Les articles n’ont pas été mis à jour depuis 3 h');
  await expect(banner).not.toContainText(/DATA_REPO_TOKEN|secret|§/);
  await expect(banner.getByRole('link', { name: 'Comment réparer' })).toHaveAttribute('href', /GUIDE-UTILISATEUR\.md#/);
  await banner.getByRole('button', { name: 'Fermer' }).click();
  await expect(banner).toBeHidden();
  await openNav(page);
  await page.locator('.sidebar').getByRole('button', { name: 'Réglages' }).click();
  await expect(page.getByRole('dialog', { name: 'Réglages' })).toContainText('Dernière mise à jour : il y a 3 h');
});

test('EXG-019 · un fil en erreur s’explique en mots simples', async ({ page }) => {
  await startWithData(page);
  await openNav(page);
  const side = page.locator('.sidebar');
  await side.getByRole('button', { name: 'Déplier Actualités' }).click();
  await expect(side.getByRole('button', { name: /^Nouvelles.*en erreur/ })).toBeVisible();
  await side.getByRole('button', { name: 'Modifier le fil Nouvelles' }).click();
  const dialog = page.getByRole('dialog', { name: 'Modifier le fil' });
  await expect(dialog).toContainText('Ce site ne répond plus depuis le');
  await expect(dialog).toContainText('le site est en panne');
  await expect(dialog).not.toContainText('HTTP 500');
});
