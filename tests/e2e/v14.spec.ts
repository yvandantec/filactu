import { expect, test } from '@playwright/test';
import { startWithData } from './helpers';

test('EXG-085 · les icônes installées sont jaunes avec des ondes bleues', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'une seule vérification suffit');
  await startWithData(page);

  const px = await page.evaluate(async () => {
    const sample = async (src: string, pts: Record<string, [number, number]>) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0, 512, 512);
      return Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => [k, [...g.getImageData(x, y, 1, 1).data.slice(0, 3)]]));
    };
    return {
      // Icône « any » : motif à taille normale
      any: await sample('icons/icon-512.png', { fond: [256, 40], point: [208, 352], onde: [406, 340] }),
      // Icône « maskable » : motif réduit à 80 % au centre
      maskable: await sample('icons/icon-maskable-512.png', { fond: [10, 10], point: [218, 333], onde: [376, 324] }),
    };
  });
  for (const icon of [px.any, px.maskable]) {
    expect(icon.fond).toEqual([0xff, 0xcf, 0x3a]);
    expect(icon.point).toEqual([0x12, 0x16, 0x1c]);
    expect(icon.onde).toEqual([0x2c, 0x6b, 0xed]);
  }
});
