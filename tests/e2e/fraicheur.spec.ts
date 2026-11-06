import { expect, test } from '@playwright/test';
import { FakeGitHub, seed } from '../support/fake-github';
import type { FeedsStatus } from '../../src/core/types';
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

test('EXG-078 · pas de collecte inutile si la dernière est récente', async ({ page }) => {
  const gh = seedWithLastRun(5);
  await gh.install(page.context());
  await connect(page);
  await expect(page.locator('.article').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(gh.dispatches).toBe(0);
});
