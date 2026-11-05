import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FakeGitHub } from '../support/fake-github';
import { eachScreen, startWithData } from './helpers';

/** Problèmes d'accessibilité « sérieux » ou « critiques » (WCAG 2.1 A/AA, contrastes compris). */
async function axeProblems(page: Page): Promise<string[]> {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return res.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `${v.id} : ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`));
}

for (const scheme of ['light', 'dark'] as const) {
  test(`ENF-02 · aucun problème d’accessibilité sérieux, thème ${scheme === 'light' ? 'clair' : 'sombre'}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('./');
    await expect(page.getByLabel('Clé d’accès GitHub')).toBeVisible();
    expect(await axeProblems(page), 'écran : connexion').toEqual([]);
    await startWithData(page, new FakeGitHub());
    await eachScreen(page, async (name) => {
      expect(await axeProblems(page), `écran : ${name}`).toEqual([]);
    });
  });
}

test('ENF-02 · zones tactiles d’au moins 44 px sur écran tactile', async ({ page }, info) => {
  test.skip(info.project.name === 'pc', 'concerne les écrans tactiles');
  const check = async (name: string) => {
    const small = await page.locator('button, a[href], input, select, textarea, [role="radio"], [role="checkbox"]').evaluateAll((els) =>
      els.flatMap((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!box.width || !box.height || style.visibility === 'hidden') return [];
        // une case à cocher ou un bouton radio dans une étiquette : c'est l'étiquette qu'on touche
        const target = (el.closest('label') ?? el).getBoundingClientRect();
        const name = el.getAttribute('aria-label') ?? (el.textContent || el.getAttribute('name') || el.tagName).trim().slice(0, 30);
        return target.width < 43.5 || target.height < 43.5 ? [`${name} (${Math.round(target.width)}×${Math.round(target.height)})`] : [];
      }));
    expect(small, `écran : ${name}`).toEqual([]);
  };
  await page.goto('./');
  await expect(page.getByLabel('Clé d’accès GitHub')).toBeVisible();
  await check('connexion');
  await startWithData(page, new FakeGitHub());
  await eachScreen(page, check);
});

test('ENF-02 · tout se fait au clavier, avec un repère de focus visible', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'clavier : sur PC');
  await startWithData(page, new FakeGitHub());
  const reached = new Set<string>();
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
      return { name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' '), visible };
    });
    if (!f) continue;
    expect(f.visible, `repère de focus visible sur « ${f.name} »`).toBe(true);
    reached.add(f.name);
  }
  const all = [...reached].join(' | ');
  for (const want of [/Tous les articles/, /Ajouter un fil/, /Réglages/, /Options d’affichage/, /Actualiser/, /Premier article du blog/]) {
    expect(all).toMatch(want);
  }
  // une fenêtre ouverte au clavier reçoit le focus, se ferme avec Échap et rend le focus au bouton
  const opener = page.getByRole('button', { name: 'Options d’affichage' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog', { name: 'Options d’affichage' });
  await expect(dlg).toBeVisible();
  expect(await dlg.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(opener).toBeFocused();
});
