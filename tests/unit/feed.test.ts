import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { discoverFeedUrl, FeedParseError, looksLikeFeed, parseFeed } from '../../src/core/feed';

const fx = (name: string) => readFileSync(new URL(`../fixtures/feeds/${name}`, import.meta.url), 'utf8');

describe('analyse des fils', () => {
  test('EXG-070 · lit un fil RSS 2.0 (titre, lien, date, auteur, image)', () => {
    const f = parseFeed(fx('rss2.xml'), 'https://blog.example.test/rss2.xml');
    expect(f.title).toBe("Blog d'exemple");
    expect(f.siteUrl).toBe('https://blog.example.test/');
    expect(f.items).toHaveLength(3);
    const [a, b, c] = f.items;
    expect(a.title).toBe('Premier article & accents éàü');
    expect(a.link).toBe('https://blog.example.test/premier');
    expect(a.key).toBe('post-1');
    expect(a.author).toBe('Alice');
    expect(a.published).toBe('2026-11-03T09:00:00.000Z');
    expect(a.image).toBe('https://img.example.test/1.jpg');
    expect(b.key).toBe('https://blog.example.test/deuxieme');
    expect(b.image).toBe('https://img.example.test/2.png');
    expect(c.image).toBe('https://img.example.test/3.jpg');
    expect(c.summary).toBe('Contenu complet seulement.');
  });

  test('EXG-031 · le résumé est du texte brut, sans script ni balise', () => {
    const f = parseFeed(fx('rss2.xml'));
    expect(f.items[0].summary).toBe('Bonjour tout le monde.');
    expect(f.items[1].summary).toBe('Texte échappé avec espace.');
    for (const i of f.items) expect(i.summary).not.toMatch(/[<>]|alert/);
  });

  test("EXG-070 · ignore les articles dont le lien n'est pas http(s)", () => {
    const f = parseFeed(fx('rss2.xml'));
    expect(f.items.map((i) => i.link).some((l) => l.startsWith('javascript'))).toBe(false);
  });

  test('EXG-070 · lit un fil Atom (liens relatifs, titre html, auteur)', () => {
    const f = parseFeed(fx('atom.xml'), 'https://atom.example.test/feed.atom');
    expect(f.title).toBe('Journal Atom');
    expect(f.siteUrl).toBe('https://atom.example.test/');
    expect(f.items).toHaveLength(2);
    expect(f.items[0].title).toBe('Entrée Atom un');
    expect(f.items[0].author).toBe('Bob');
    expect(f.items[0].published).toBe('2026-11-04T05:00:00.000Z');
    expect(f.items[0].summary).toBe("Résumé de l'entrée un.");
    expect(f.items[1].link).toBe('https://atom.example.test/deux');
    expect(f.items[1].published).toBe('2026-11-03T05:00:00.000Z');
    expect(f.items[1].image).toBe('https://img.example.test/b.jpg');
  });

  test('EXG-070 · lit un fil RSS 1.0 (RDF)', () => {
    const f = parseFeed(fx('rdf.xml'));
    expect(f.title).toBe('Fil RDF');
    expect(f.items).toHaveLength(1);
    expect(f.items[0]).toMatchObject({ title: 'Article RDF', author: 'Carole', published: '2026-11-04T07:00:00.000Z' });
  });

  test('EXG-070 · un document qui n’est pas un fil est rejeté', () => {
    expect(() => parseFeed(fx('broken.xml'))).toThrow(FeedParseError);
    expect(() => parseFeed('<<<')).toThrow(FeedParseError);
    expect(looksLikeFeed(fx('broken.xml'))).toBe(false);
    expect(looksLikeFeed(fx('atom.xml'))).toBe(true);
  });

  test('EXG-011 · découvre le fil annoncé par une page HTML', () => {
    expect(discoverFeedUrl(fx('site.html'), 'https://site.example.test/')).toBe('https://site.example.test/rss2.xml');
    expect(discoverFeedUrl('<html></html>', 'https://x.example.test/')).toBeUndefined();
  });
});
