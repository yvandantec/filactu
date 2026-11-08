import { expect, test, type Locator } from '@playwright/test';
import { openNav, startWithData } from './helpers';

// Couleur du texte de chaque moitié du nom, et contraste avec le fond réel derrière
async function wordmark(title: Locator) {
  return title.evaluate((el) => {
    const rgb = (c: string) => (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 4).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bgEl: Element | null = el;
    let bg = 'rgba(0, 0, 0, 0)';
    while (bgEl) {
      bg = getComputedStyle(bgEl).backgroundColor;
      if (rgb(bg)[3] !== 0 && bg !== 'transparent') break;
      bgEl = bgEl.parentElement;
    }
    const part = (sel: string) => {
      const c = rgb(getComputedStyle(el.querySelector(sel)!).color);
      const [a, b] = [lum(c), lum(rgb(bg))].sort((x, y) => y - x);
      return { text: el.querySelector(sel)!.textContent, color: c.slice(0, 3), contrast: (a + 0.05) / (b + 0.05) };
    };
    const cs = getComputedStyle(el);
    return { label: el.textContent, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), fil: part('.wm-fil'), actu: part('.wm-actu') };
  });
}

const expectColours = async (title: Locator, scheme: 'light' | 'dark') => {
  const w = await wordmark(title);
  expect(w.label).toBe('FilActu');
  expect(w.fil.text).toBe('Fil');
  expect(w.actu.text).toBe('Actu');
  // Fil : bleu ; Actu : couleur du texte (blanc sur fond sombre, noir sur fond clair)
  expect(w.fil.color).toEqual(scheme === 'dark' ? [0x5b, 0x8c, 0xff] : [0x2c, 0x6b, 0xed]);
  expect(w.actu.color).toEqual(scheme === 'dark' ? [0xf4, 0xf5, 0xf7] : [0x11, 0x15, 0x1b]);
  // Grand texte gras (WCAG : au moins 18,7 px en gras) : contraste d'au moins 3:1
  expect(w.size).toBeGreaterThanOrEqual(18.7);
  expect(w.weight).toBeGreaterThanOrEqual(700);
  expect(w.fil.contrast).toBeGreaterThanOrEqual(3);
  expect(w.actu.contrast).toBeGreaterThanOrEqual(4.5);
};

for (const scheme of ['light', 'dark'] as const) {
  test(`EXG-086 · le nom FilActu reprend les couleurs du logo (thème ${scheme === 'light' ? 'clair' : 'sombre'})`, async ({ page }, info) => {
    test.skip(info.project.name !== 'telephone', 'une seule vérification suffit');
    await page.emulateMedia({ colorScheme: scheme });

    await page.goto('./');
    await expectColours(page.locator('.setup-brand h1'), scheme);

    await startWithData(page);
    await openNav(page);
    await expectColours(page.locator('.brand .wordmark'), scheme);
  });
}
