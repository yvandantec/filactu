import { expect, test } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import type { DayFile, FeedsStatus } from '../../src/core/types';
import { connect } from './helpers';

function seedWithLastRun(minutesAgo: number) {
  const gh = new FakeGitHub();
  seed(gh);
  const st = gh.get<FeedsStatus>('meta/feeds-status.json')!;
  st.lastRun = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  gh.set('meta/feeds-status.json', st);
  return gh;
}

test('EXG-078 · à l’ouverture, une collecte est lancée si la dernière est trop ancienne', async ({ page }) => {
  const gh = seedWithLastRun(180);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  await expect.poll(() => gh.dispatches).toBe(1);
  // Bandeau explicite si la collecte reste ancienne
  await expect(page.getByTestId('stale')).toBeVisible();
  // Pas de nouvelle demande au rechargement (au plus une toutes les 15 minutes)
  await page.reload();
  await expect(page.locator('.article').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(gh.dispatches).toBe(1);
});

/** Simule le robot : il termine `afterMs` après la demande, avec un nouvel article. */
function robotFinishes(gh: FakeGitHub, afterMs: number) {
  gh.onDispatch = () => {
    setTimeout(() => {
      const st = gh.get<FeedsStatus>('meta/feeds-status.json')!;
      st.lastRun = new Date().toISOString();
      gh.set('meta/feeds-status.json', st);
      const day = st.lastRun.slice(0, 10);
      const file = gh.get<DayFile>(`items/${day}.json`)!;
      file.items.unshift({
        id: 'i_new', feedId: 'f_blog', title: 'Article tout frais', link: 'https://f_blog.example.test/i_new',
        published: st.lastRun, fetched: st.lastRun, summary: 'Arrivé avec la dernière collecte.',
      });
      gh.set(`items/${day}.json`, file);
    }, afterMs);
  };
}

test('EXG-088 · à l’ouverture, les articles arrivent dès que le robot a fini et le bandeau disparaît', async ({ page }) => {
  const gh = seedWithLastRun(180);
  robotFinishes(gh, 2000);
  await gh.install(page.context());
  await connect(page);
  await expect(page.getByTestId('stale')).toBeVisible();
  // Bien avant l'ancienne attente fixe de 75 s
  await expect(page.getByText('Article tout frais')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('stale')).toBeHidden();
  expect(gh.dispatches).toBe(1);
});

test('EXG-088 · Actualiser affiche les nouveaux articles dès la fin de la collecte', async ({ page }) => {
  const gh = seedWithLastRun(5);
  robotFinishes(gh, 2000);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect(page.getByText('Article tout frais')).toBeVisible({ timeout: 15_000 });
  expect(gh.dispatches).toBe(1);
});

test('EXG-088 · une seule demande de collecte à la fois', async ({ page }) => {
  const gh = seedWithLastRun(5);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  // La dernière collecte devient ancienne : l'actualisation déclencherait aussi une collecte automatique
  const st = gh.get<FeedsStatus>('meta/feeds-status.json')!;
  st.lastRun = new Date(Date.now() - 180 * 60_000).toISOString();
  gh.set('meta/feeds-status.json', st);
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.poll(() => gh.dispatches).toBe(1);
  await page.waitForTimeout(1500);
  expect(gh.dispatches).toBe(1);
  // Nouvel appui pendant la collecte : pas de seconde demande
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect(page.getByRole('status')).toContainText('déjà en cours');
  expect(gh.dispatches).toBe(1);
});

test('EXG-078 · pas de collecte inutile si la dernière est récente', async ({ page }) => {
  const gh = seedWithLastRun(5);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(gh.dispatches).toBe(0);
});
