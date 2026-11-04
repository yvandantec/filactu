import { describe, expect, test } from 'vitest';
import {
  dayFromPath,
  dayKey,
  dayPath,
  expiredDays,
  flattenDays,
  newItemsFrom,
  oldestKeptDay,
  SeenIndex,
} from '../../src/core/items';
import type { ParsedItem } from '../../src/core/feed';

const now = new Date('2026-11-04T12:00:00Z');
const p = (key: string, link: string, published?: string): ParsedItem => ({ key, title: key, link, summary: '', published });

describe('articles', () => {
  test('EXG-077 · un article déjà vu (même guid) n’est pas ajouté deux fois, même republié', () => {
    const seen = new SeenIndex();
    const first = newItemsFrom('f1', [p('g1', 'https://a.example.test/1', '2026-11-04T10:00:00Z')], seen, now);
    expect(first).toHaveLength(1);
    const again = newItemsFrom('f1', [p('g1', 'https://a.example.test/1', '2026-11-04T11:00:00Z')], seen, now);
    expect(again).toHaveLength(0);
  });

  test('EXG-077 · même lien avec un guid différent = doublon', () => {
    const seen = new SeenIndex();
    newItemsFrom('f1', [p('g1', 'https://a.example.test/1')], seen, now);
    expect(newItemsFrom('f1', [p('g2', 'https://a.example.test/1#comments')], seen, now)).toHaveLength(0);
    // même lien dans un autre fil : article distinct
    expect(newItemsFrom('f2', [p('g1', 'https://a.example.test/1')], seen, now)).toHaveLength(1);
  });

  test('EXG-077 · l’index se reconstruit à partir des articles existants', () => {
    const items = newItemsFrom('f1', [p('g1', 'https://a.example.test/1')], new SeenIndex(), now);
    const seen = new SeenIndex(items);
    expect(newItemsFrom('f1', [p('g1', 'https://a.example.test/1')], seen, now)).toHaveLength(0);
  });

  test('EXG-072 · les articles publiés il y a plus de 30 jours ne sont pas collectés', () => {
    const out = newItemsFrom('f1', [p('old', 'https://a.example.test/old', '2026-09-01T00:00:00Z')], new SeenIndex(), now);
    expect(out).toHaveLength(0);
  });

  test('EXG-070 · date absente ou future → date de collecte', () => {
    const [a, b] = newItemsFrom(
      'f1',
      [p('a', 'https://a.example.test/a'), p('b', 'https://a.example.test/b', '2027-01-01T00:00:00Z')],
      new SeenIndex(),
      now,
    );
    expect(a.published).toBe(now.toISOString());
    expect(b.published).toBe(now.toISOString());
    expect(a.fetched).toBe(now.toISOString());
  });

  test('EXG-072 · fichiers journaliers expirés après 30 jours', () => {
    expect(dayKey(now)).toBe('2026-11-04');
    expect(dayPath('2026-11-04')).toBe('items/2026-11-04.json');
    expect(dayFromPath('items/2026-11-04.json')).toBe('2026-11-04');
    expect(dayFromPath('README.md')).toBeUndefined();
    expect(oldestKeptDay(now)).toBe('2026-10-06');
    expect(expiredDays(['2026-10-05', '2026-10-06', '2026-11-04'], now)).toEqual(['2026-10-05']);
  });

  test('EXG-077 · la liste fusionnée est triée et sans doublon', () => {
    const i1 = newItemsFrom('f1', [p('a', 'https://a.example.test/a', '2026-11-03T00:00:00Z')], new SeenIndex(), now)[0];
    const i2 = newItemsFrom('f1', [p('b', 'https://a.example.test/b', '2026-11-04T00:00:00Z')], new SeenIndex(), now)[0];
    const list = flattenDays([
      { date: '2026-11-03', items: [i1] },
      { date: '2026-11-04', items: [i2, i1] },
    ]);
    expect(list.map((i) => i.id)).toEqual([i2.id, i1.id]);
  });
});
