import { expect, test } from '@playwright/test';
import { FakeGitHub, READONLY_TOKEN, seed } from '../support/fake-github';
import { connect, openNav, startWithData } from './helpers';

test('EXG-001 · une clé valide affiche les abonnements', async ({ page }) => {
  await startWithData(page);
  await openNav(page);
  await expect(page.getByRole('button', { name: /^Tech/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Actualités/ })).toBeVisible();
});

test('EXG-001 · une clé invalide est refusée avec un message clair', async ({ page }) => {
  const gh = new FakeGitHub();
  await gh.install(page.context());
  await connect(page, 'github_pat_mauvaise');
  await expect(page.getByRole('alert')).toContainText('Clé refusée');
});

test('EXG-001 · une clé sans droit d’écriture indique le droit manquant', async ({ page }) => {
  const gh = new FakeGitHub();
  await gh.install(page.context());
  await connect(page, READONLY_TOKEN);
  await expect(page.getByRole('alert')).toContainText('Contents : Read and write');
});

test('EXG-001 · un dépôt introuvable est signalé', async ({ page }) => {
  const gh = new FakeGitHub();
  await gh.install(page.context());
  await page.goto('./');
  await page.getByLabel('Clé d’accès GitHub').fill('github_pat_TEST_ok');
  await page.getByLabel('Dépôt de données').fill('yvandantec/autre');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toContainText('introuvable');
});

test('EXG-002 · la clé est mémorisée, puis effacée par « Déconnecter cet appareil »', async ({ page }) => {
  const gh = await startWithData(page);
  await page.reload();
  await expect(page.locator('.article').first()).toBeVisible();
  await openNav(page);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByRole('button', { name: 'Déconnecter cet appareil' }).click();
  await expect(page.getByLabel('Clé d’accès GitHub')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Clé d’accès GitHub')).toBeVisible();
  const keys = await page.evaluate(
    () => new Promise<number>((resolve) => {
      const req = indexedDB.open('keyval-store');
      req.onsuccess = () => {
        const db = req.result;
        const r = db.transaction('keyval').objectStore('keyval').count();
        r.onsuccess = () => resolve(r.result);
      };
    }),
  );
  expect(keys).toBe(0);
  expect(gh.files.size).toBeGreaterThan(0); // les données restent sur GitHub
});

test('EXG-003 · l’appli est installable (manifeste, icônes, service worker)', async ({ page, request }) => {
  const gh = new FakeGitHub();
  seed(gh);
  await gh.install(page.context());
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: 'FilActu', display: 'standalone', start_url: './' });
  const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toContain('/filactu/');
});
