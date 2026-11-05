import { expect, test } from '@playwright/test';
import { openNav, startWithData } from './helpers';

// Simule l'appli Android FilActu (WebView) : son identifiant contient « FilActuAndroid/ »
test.use({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 FilActuAndroid/1.0.0',
});

test('EXG-004 · dans l’appli Android, liens normaux et réglage du navigateur masqué', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'appli Android');
  await startWithData(page);
  const link = page.locator('.article').first().locator('a.article-link');
  await expect(link).toHaveAttribute('href', 'https://f_blog.example.test/i_1');
  await openNav(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await expect(page.getByLabel('Ouvrir les articles avec')).toHaveCount(0);
});
