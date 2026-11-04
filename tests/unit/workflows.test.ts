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
    expect(data.on.schedule[0].cron).toBe('*/15 * * * *');
  });

  test('EXG-071 · la collecte peut être lancée à la demande (bouton Actualiser)', () => {
    const { data } = load('collect.yml');
    expect(data.on).toHaveProperty('workflow_dispatch');
  });

  test('DEC-03 · la collecte écrit uniquement dans le dépôt de données', () => {
    const text = readFileSync(new URL('collect.yml', dir), 'utf8');
    expect(text).toContain('filactu-data');
    expect(text).toMatch(/git add -A items meta/);
  });
});
