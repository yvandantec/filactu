import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseDocument } from 'yaml';

const dir = new URL('../../.github/workflows/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));

function load(name: string) {
  const doc = parseDocument(readFileSync(new URL(name, dir), 'utf8'), { strict: true });
  return { errors: doc.errors.map((e) => e.message), data: doc.toJS() as Record<string, any> };
}

describe('workflows GitHub Actions', () => {
  test.each(files)('EXG-070 · %s est un YAML valide', (name) => {
    expect(load(name).errors).toEqual([]);
  });

  test('EXG-070 · la collecte est planifiée toutes les 15 minutes', () => {
    const { data } = load('collect.yml');
    const minutes = String(data.on.schedule[0].cron).split(' ')[0].split(',').map(Number);
    expect(minutes).toHaveLength(4);
    expect(minutes.map((m, i) => (i ? m - minutes[i - 1] : 15))).toEqual([15, 15, 15, 15]);
  });

  test('EXG-087 · la collecte évite les minutes 0, 15, 30 et 45', () => {
    const { data } = load('collect.yml');
    const minutes = String(data.on.schedule[0].cron).split(' ')[0].split(',').map(Number);
    expect(minutes.every((m) => Number.isInteger(m) && m % 15 !== 0)).toBe(true);
  });

  test('EXG-071 · la collecte peut être lancée à la demande (bouton Actualiser)', () => {
    const { data } = load('collect.yml');
    expect(data.on).toHaveProperty('workflow_dispatch');
  });

  test('EXG-081 · l’enregistrement réessaie assez longtemps pendant une panne de GitHub', () => {
    const { data } = load('collect.yml');
    const save = data.jobs.collect.steps.find((st: Record<string, string>) => st.name === 'Enregistrer');
    const run: string = save.run;
    const waits = /for wait in ([^;\n]+)/.exec(run)?.[1].trim().split(/\s+/) ?? [];
    const delays = waits.filter((w) => w !== '-').map(Number);
    expect(waits.length, 'nombre d’essais').toBeGreaterThanOrEqual(6);
    expect(delays.every((d, i) => i === 0 || d >= delays[i - 1]), 'attentes croissantes').toBe(true);
    const total = delays.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(90);
    expect(total).toBeLessThanOrEqual(180);
    expect(run).toMatch(/git rebase --abort/);
    // budget de collecte (6 min) + attentes : sous la limite du travail
    expect(data.jobs.collect['timeout-minutes']).toBeGreaterThanOrEqual(6 + Math.ceil(total / 60) + 1);
  });

  test('ENF-05 · tout tourne sur les machines gratuites de GitHub', () => {
    for (const name of files) {
      const { data } = load(name);
      for (const job of Object.values<Record<string, any>>(data.jobs)) expect(job['runs-on']).toBe('ubuntu-latest');
    }
    // aucune autre plateforme payante : l'appli ne parle qu'à GitHub (politique de sécurité de la page)
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const connect = /connect-src ([^;]+);/.exec(html)?.[1].trim().split(/\s+/);
    expect(connect).toEqual(["'self'", 'https://api.github.com', 'ws:']);
  });

  test('DEC-03 · ENF-04 · la collecte écrit uniquement dans le dépôt de données', () => {
    const text = readFileSync(new URL('collect.yml', dir), 'utf8');
    expect(text).toContain('filactu-data');
    expect(text).toMatch(/git add -A items meta/);
  });
});
