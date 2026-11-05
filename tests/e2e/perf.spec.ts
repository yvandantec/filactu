import { expect, test } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import { goTo, startWithData } from './helpers';

// ENF-01 : mesuré sur l'écran « téléphone », processeur ralenti 4 fois pour imiter un téléphone de milieu de gamme.
test.describe('performance (ENF-01)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'telephone', 'mesure sur téléphone'));

  test('ENF-01 · avec 2 000 articles en cache, la liste s’affiche en moins de 1,5 s', async ({ page }) => {
    const gh = new FakeGitHub();
    seed(gh, new Date(), 1996);
    await startWithData(page, gh, false);
    await goTo(page, /Tous les articles/);
    await expect(page.getByTestId('view-unread')).toHaveText('2000 non lus');
    // réseau très lent à la réouverture : seuls les articles en cache peuvent s'afficher à temps
    gh.delayMs = 10_000;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.reload();
    await page.locator('.article').first().waitFor({ state: 'visible', timeout: 8000 });
    const shownAt = await page.evaluate(() => performance.now());
    console.log(`ENF-01 mesure : liste affichée en ${Math.round(shownAt)} ms`);
    expect(shownAt).toBeLessThan(1500);
  });

  test('ENF-01 · le défilement reste fluide avec 2 000 articles chargés', async ({ page }) => {
    const gh = new FakeGitHub();
    seed(gh, new Date(), 1996);
    await startWithData(page, gh, false);
    await goTo(page, /Tous les articles/);
    test.setTimeout(90_000);
    // on fait défiler jusqu'en bas : les articles s'ajoutent par paquets jusqu'aux 2 000
    for (let i = 0; i < 40 && (await page.locator('.article').count()) < 2000; i++) {
      await page.locator('.article').last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
    }
    await expect(page.locator('.article')).toHaveCount(2000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // défilement continu vers le haut, image par image : on mesure l'écart entre deux images affichées
    const frames = await page.evaluate(async () => {
      const list = document.querySelector('.articles')!;
      let scroller: Element | null = list.parentElement;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) scroller = scroller.parentElement;
      const el = (scroller ?? document.scrollingElement)!;
      const gaps: number[] = [];
      let last = performance.now();
      for (let i = 0; i < 120; i++) {
        el.scrollTop -= 40;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const t = performance.now();
        gaps.push(t - last);
        last = t;
      }
      return gaps.sort((a, b) => a - b);
    });
    const median = frames[Math.floor(frames.length / 2)];
    const p95 = frames[Math.floor(frames.length * 0.95)];
    console.log(`ENF-01 mesure : image médiane ${median.toFixed(1)} ms, 95 % sous ${p95.toFixed(1)} ms`);
    expect(median).toBeLessThan(34); // au moins 30 images par seconde
    expect(p95).toBeLessThan(100); // pas d'à-coup visible
  });
});
