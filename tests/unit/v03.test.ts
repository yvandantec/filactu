import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  addFeed, CATEGORY_ICONS, createCategory, fillMissingIcons, removeFeed, suggestIcon, SubscriptionError, updateFeed,
} from '../../src/core/subscriptions';
import { mergeImport, parseOpml } from '../../src/core/opml';
import { getPref, isRead, isSaved, markManyRead, markManyUnread, mergeReading, setPref, setSaved } from '../../src/core/reading';
import { itemsForView, normalizeSearch, prefKey, searchItems, sortItems } from '../../src/core/views';
import { emptyReading, emptySubscriptions, type Item } from '../../src/core/types';

const now = new Date('2026-11-04T12:00:00Z');
const item = (id: string, title: string, published: string, summary = ''): Item => ({
  id, feedId: 'f1', title, link: `https://x.example.test/${id}`, published, fetched: published, summary,
});

function subs() {
  let s = createCategory(emptySubscriptions(now), 'Tech', '💻', now).subs;
  s = createCategory(s, 'Sport', undefined, now).subs;
  return addFeed(s, { url: 'https://a.example.test/rss', title: 'A', categoryId: 'tech' }, now).subs;
}

describe('icônes suggérées', () => {
  test('EXG-018 · une icône est proposée d’après le nom de la catégorie', () => {
    const cases: [string, string][] = [
      ['Sport', '⚽'], ['Basket', '🏀'], ['Tech', '💻'], ['High-Tech', '💻'], ['Actualités', '📰'],
      ['Jeux de société', '🎲'], ['Jeux vidéo', '🎮'], ['Cuisine', '🍳'], ['Sciences', '🔬'], ['Écologie', '🌱'],
      ['Économie', '💰'], ['YouTube', '📺'], ['Cinéma', '🎬'], ['Humour', '🎭'], ['Information', '📰'],
      ['Divers', '📁'],
    ];
    for (const [name, icon] of cases) expect([name, suggestIcon(name)]).toEqual([name, icon]);
  });

  test('EXG-018 · toutes les icônes proposées font partie de la palette', () => {
    const names = ['Sport', 'Basket', 'Vélo', 'IA', 'Jeux', 'Films', 'Musique', 'BD', 'Science', 'Tech', 'Recettes', 'Vins',
      'Nature', 'Voyage', 'Emploi', 'Bourse', 'Politique', 'Monde', 'Auto', 'Maison', 'Design', 'Photo', 'Santé',
      'Animaux', 'Famille', 'Satire', 'Bons plans', 'Presse', 'Zzz'];
    for (const n of names) expect(CATEGORY_ICONS).toContain(suggestIcon(n));
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
  });

  test('EXG-018 · les catégories importées reçoivent une icône suggérée', () => {
    const opml = readFileSync(new URL('../fixtures/opml/feedly.opml', import.meta.url), 'utf8');
    const { subs: s } = mergeImport(emptySubscriptions(), parseOpml(opml));
    expect(s.categories.map((c) => [c.name, c.icon])).toEqual([['Tech', '💻'], ['Actualités', '📰'], ['Sans catégorie', '📁']]);
  });

  test('EXG-018 · compléter les icônes manquantes sans toucher aux autres', () => {
    const s = fillMissingIcons(subs(), now);
    expect(s.categories.map((c) => c.icon)).toEqual(['💻', '⚽']);
    expect(fillMissingIcons(s)).toBe(s);
  });
});

describe('modifier un fil', () => {
  test('EXG-012 · renommer et changer de catégories', () => {
    const id = subs().feeds[0].id;
    const s = updateFeed(subs(), id, { title: '  Nouveau  nom ', categories: ['sport', 'tech', 'sport', 'inconnue'] }, now);
    expect(s.feeds[0]).toMatchObject({ title: 'Nouveau nom', categories: ['sport', 'tech'] });
  });

  test('EXG-012 · un fil garde au moins une catégorie', () => {
    const id = subs().feeds[0].id;
    expect(() => updateFeed(subs(), id, { categories: [] })).toThrow(/au moins une catégorie/);
    expect(() => updateFeed(subs(), 'nope', { title: 'x' })).toThrow(SubscriptionError);
  });

  test('EXG-012 · se désabonner', () => {
    const s0 = subs();
    expect(removeFeed(s0, s0.feeds[0].id, now).feeds).toHaveLength(0);
    expect(() => removeFeed(s0, 'nope')).toThrow(/introuvable/);
  });
});

describe('préférences, favoris, recherche, tri', () => {
  const a = item('a', 'Entrée Atom', '2026-11-04T10:00:00Z', 'Un résumé sur le vélo');
  const b = item('b', 'Blog Exemple', '2026-11-03T10:00:00Z', 'Autre chose');

  test('EXG-030 · EXG-036 · préférences synchronisées entre appareils (la plus récente gagne)', () => {
    const d1 = setPref(emptyReading(), prefKey('mode', 'all'), 'cards', new Date('2026-11-04T10:00:00Z'));
    const d2 = setPref(emptyReading(), 'showSummary', true, new Date('2026-11-04T11:00:00Z'));
    const m = mergeReading(d1, d2);
    expect(getPref(m, 'showSummary', false)).toBe(true);
    expect(getPref(m, prefKey('mode', 'all'), 'magazine')).toBe('cards');
    expect(getPref(emptyReading(), 'absent', 42)).toBe(42);
  });

  test('EXG-050 · EXG-051 · à lire plus tard garde une copie de l’article, même purgé', () => {
    let r = setSaved(emptyReading(), a, true, now);
    expect(isSaved(r, 'a')).toBe(true);
    expect(itemsForView('saved', [], emptySubscriptions(), r).map((i) => i.title)).toEqual(['Entrée Atom']);
    r = setSaved(r, a, false, new Date('2026-11-04T13:00:00Z'));
    expect(isSaved(r, 'a')).toBe(false);
    expect(itemsForView('saved', [], emptySubscriptions(), r)).toEqual([]);
  });

  test('EXG-043 · annuler un « tout marquer lu » remet les articles non lus', () => {
    let r = markManyRead(emptyReading(), ['a', 'b'], now);
    r = markManyUnread(r, ['a', 'b'], new Date('2026-11-04T12:00:05Z'));
    expect(isRead(r, a)).toBe(false);
    expect(isRead(r, b)).toBe(false);
  });

  test('EXG-060 · recherche insensible aux accents et à la casse, sur titre et résumé', () => {
    expect(searchItems([a, b], 'entree').map((i) => i.id)).toEqual(['a']);
    expect(searchItems([a, b], 'VELO').map((i) => i.id)).toEqual(['a']);
    expect(searchItems([a, b], 'blog exemple').map((i) => i.id)).toEqual(['b']);
    expect(searchItems([a, b], '   ')).toHaveLength(2);
    expect(normalizeSearch('Été')).toBe('ete');
  });

  test('EXG-060 · recherche rapide sur 20 000 articles', () => {
    const many = Array.from({ length: 20000 }, (_, i) => item(`i${i}`, `Titre numéro ${i}`, now.toISOString(), 'résumé assez long '.repeat(10)));
    const t = performance.now();
    expect(searchItems(many, 'numéro 19999')).toHaveLength(1);
    expect(performance.now() - t).toBeLessThan(1000);
  });

  test('EXG-023 · tri du plus récent au plus ancien, ou l’inverse', () => {
    expect(sortItems([b, a], false).map((i) => i.id)).toEqual(['a', 'b']);
    expect(sortItems([a, b], true).map((i) => i.id)).toEqual(['b', 'a']);
  });
});
