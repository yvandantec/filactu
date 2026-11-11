import { expect, test } from '@playwright/test';
import { openNav, startWithData } from './helpers';

const APP_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 FilActuAndroid/1.3.0';

async function exportOpml(page: import('@playwright/test').Page) {
  await openNav(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByRole('button', { name: 'Exporter en OPML' }).click();
}

test.describe('appli Android', () => {
  test.use({ userAgent: APP_UA });

  test('EXG-089 · dans l’appli Android, l’export confie le fichier à l’appli', async ({ page }, info) => {
    test.skip(info.project.name !== 'telephone', 'appli Android');
    // Passerelle de l'appli Android simulée : elle reçoit le nom, le type et le contenu du fichier
    await page.addInitScript(() => {
      const w = window as unknown as { saved: unknown[]; FilActuAndroid: unknown };
      w.saved = [];
      w.FilActuAndroid = { saveFile: (name: string, mime: string, content: string) => w.saved.push({ name, mime, content }) };
    });
    await startWithData(page);
    await exportOpml(page);
    const saved = await page.evaluate(() => (window as unknown as { saved: { name: string; mime: string; content: string }[] }).saved);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('filactu-abonnements.opml');
    expect(saved[0].mime).toBe('text/x-opml');
    expect(saved[0].content).toMatch(/^<\?xml[\s\S]*<opml[\s\S]*xmlUrl=/);
  });

  test('EXG-089 · une ancienne appli Android affiche un message au lieu de ne rien faire', async ({ page }, info) => {
    test.skip(info.project.name !== 'telephone', 'appli Android');
    await startWithData(page);
    await exportOpml(page);
    await expect(page.getByText(/installez la nouvelle version de l’appli/i)).toBeVisible();
  });
});

test('EXG-089 · sur PC, l’export télécharge le fichier', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'PC');
  await startWithData(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByRole('button', { name: 'Exporter en OPML' }).click();
  expect((await download).suggestedFilename()).toBe('filactu-abonnements.opml');
});
