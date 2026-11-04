import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { exportOpml, mergeImport, OpmlError, parseOpml, UNCATEGORIZED } from '../../src/core/opml';
import { emptySubscriptions } from '../../src/core/types';

const opml = readFileSync(new URL('../fixtures/opml/feedly.opml', import.meta.url), 'utf8');

describe('import / export OPML', () => {
  test('EXG-010 · lit un export Feedly : catégories et fils', () => {
    const feeds = parseOpml(opml);
    expect(feeds.map((f) => f.title)).toEqual(["Blog d'exemple", 'Journal Atom', 'Fil RDF', 'Fil isolé']);
    expect(feeds[0].categories).toEqual(['Tech', 'Actualités']);
    expect(feeds[0].siteUrl).toBe('https://blog.example.test/');
    expect(feeds[3].categories).toEqual([]);
  });

  test('EXG-010 · un fil dans plusieurs catégories est rattaché à toutes', () => {
    const { subs, stats } = mergeImport(emptySubscriptions(), parseOpml(opml));
    expect(stats).toEqual({ feedsAdded: 4, categoriesAdded: 3, ignored: 0 });
    expect(subs.categories.map((c) => c.name)).toEqual(['Tech', 'Actualités', UNCATEGORIZED]);
    expect(subs.feeds[0].categories).toEqual(['tech', 'actualites']);
  });

  test('EXG-010 · ré-importer le même OPML ne crée pas de doublon', () => {
    const once = mergeImport(emptySubscriptions(), parseOpml(opml)).subs;
    const { subs, stats } = mergeImport(once, parseOpml(opml));
    expect(subs.feeds).toHaveLength(4);
    expect(subs.categories).toHaveLength(3);
    expect(stats).toEqual({ feedsAdded: 0, categoriesAdded: 0, ignored: 4 });
  });

  test('EXG-010 · un fichier qui n’est pas un OPML est refusé', () => {
    expect(() => parseOpml('<html><body/></html>')).toThrow(OpmlError);
  });

  test('EXG-014 · l’export se ré-importe sans perte', () => {
    const subs = mergeImport(emptySubscriptions(), parseOpml(opml)).subs;
    const again = mergeImport(emptySubscriptions(), parseOpml(exportOpml(subs))).subs;
    expect(again.feeds.map((f) => [f.url, f.title, f.categories])).toEqual(subs.feeds.map((f) => [f.url, f.title, f.categories]));
    expect(exportOpml({ ...subs, feeds: [{ ...subs.feeds[0], categories: [] }] })).toContain('xmlUrl=');
  });
});
