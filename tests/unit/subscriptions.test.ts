import { describe, expect, test } from 'vitest';
import {
  addFeed, CATEGORY_ICONS, createCategory, deleteCategory, exclusiveFeeds, feedLabel, moveCategory,
  SubscriptionError, updateCategory,
} from '../../src/core/subscriptions';
import { feedIdFor } from '../../src/core/hash';
import { emptySubscriptions, type Subscriptions } from '../../src/core/types';

const now = new Date('2026-11-04T12:00:00Z');

function base(): Subscriptions {
  let s = createCategory(emptySubscriptions(now), 'Tech', '💻', now).subs;
  s = createCategory(s, 'Actualités', undefined, now).subs;
  s = addFeed(s, { url: 'https://a.example.test/rss', title: 'A', categoryId: 'tech' }, now).subs;
  s = addFeed(s, { url: 'https://b.example.test/rss', title: 'B', categoryId: 'tech' }, now).subs;
  // B aussi dans Actualités
  s = { ...s, feeds: s.feeds.map((f) => (f.title === 'B' ? { ...f, categories: ['tech', 'actualites'] } : f)) };
  return s;
}

describe('catégories', () => {
  test('EXG-013 · créer une catégorie (nom nettoyé, ordre en fin de liste)', () => {
    const s = base();
    const r = createCategory(s, '  Science   et  nature ', undefined, now);
    expect(r.id).toBe('science-et-nature');
    expect(r.subs.categories.at(-1)).toEqual({ id: 'science-et-nature', name: 'Science et nature', order: 2 });
    expect(r.subs.updatedAt).toBe(now.toISOString());
  });

  test('EXG-013 · un nom vide ou déjà pris est refusé', () => {
    expect(() => createCategory(base(), '   ')).toThrow(SubscriptionError);
    expect(() => createCategory(base(), 'tech')).toThrow(/existe déjà/);
  });

  test('EXG-013 · deux noms proches donnent des identifiants distincts', () => {
    const r = createCategory(base(), 'Tech !', undefined, now);
    expect(r.id).toBe('tech-2');
  });

  test('EXG-013 · renommer une catégorie', () => {
    const s = updateCategory(base(), 'tech', { name: 'Technologie' }, now);
    expect(s.categories[0].name).toBe('Technologie');
    expect(s.categories[0].id).toBe('tech'); // l'identifiant ne change pas : les fils restent rangés
    expect(() => updateCategory(base(), 'tech', { name: 'Actualités' })).toThrow(/existe déjà/);
    expect(() => updateCategory(base(), 'inconnue', { name: 'X' })).toThrow(/introuvable/);
    expect(updateCategory(base(), 'tech', { name: 'TECH' }).categories[0].name).toBe('TECH');
  });

  test('EXG-016 · associer, changer et retirer une icône', () => {
    expect(base().categories[0].icon).toBe('💻');
    let s = updateCategory(base(), 'actualites', { icon: '📰' }, now);
    expect(s.categories[1].icon).toBe('📰');
    s = updateCategory(s, 'actualites', { icon: null }, now);
    expect(s.categories[1]).not.toHaveProperty('icon');
    expect(CATEGORY_ICONS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
  });

  test('EXG-013 · réordonner', () => {
    let s = moveCategory(base(), 'actualites', -1, now);
    expect([...s.categories].sort((a, b) => a.order - b.order).map((c) => c.id)).toEqual(['actualites', 'tech']);
    s = moveCategory(s, 'actualites', -1, now); // déjà en tête : rien ne change
    expect([...s.categories].sort((a, b) => a.order - b.order).map((c) => c.id)).toEqual(['actualites', 'tech']);
    expect(moveCategory(s, 'inconnue', 1)).toBe(s);
  });

  test('EXG-013 · supprimer en déplaçant les fils vers une autre catégorie', () => {
    const s = base();
    expect(exclusiveFeeds(s, 'tech').map((f) => f.title)).toEqual(['A']);
    const r = deleteCategory(s, 'tech', { moveTo: 'actualites' }, now);
    expect(r.categories.map((c) => [c.id, c.order])).toEqual([['actualites', 0]]);
    expect(r.feeds.map((f) => [f.title, f.categories])).toEqual([['A', ['actualites']], ['B', ['actualites']]]);
  });

  test('EXG-013 · supprimer en se désabonnant des fils (un fil rangé ailleurs reste)', () => {
    const r = deleteCategory(base(), 'tech', 'unsubscribe', now);
    expect(r.feeds.map((f) => [f.title, f.categories])).toEqual([['B', ['actualites']]]);
  });

  test('EXG-013 · suppression : destination invalide refusée', () => {
    expect(() => deleteCategory(base(), 'tech', { moveTo: 'tech' })).toThrow(SubscriptionError);
    expect(() => deleteCategory(base(), 'tech', { moveTo: 'nope' })).toThrow(SubscriptionError);
    expect(() => deleteCategory(base(), 'nope', 'unsubscribe')).toThrow(/introuvable/);
  });
});

describe('ajout d’abonnement', () => {
  test('EXG-011 · ajouter un fil dans une catégorie existante', () => {
    const r = addFeed(base(), { url: 'https://c.example.test/feed.xml', categoryId: 'actualites' }, now);
    expect(r.feed).toMatchObject({
      id: feedIdFor('https://c.example.test/feed.xml'),
      url: 'https://c.example.test/feed.xml',
      title: '',
      categories: ['actualites'],
      status: 'pending',
      addedAt: now.toISOString(),
    });
    expect(r.subs.feeds).toHaveLength(3);
  });

  test('EXG-011 · ajouter un fil dans une nouvelle catégorie avec icône', () => {
    const r = addFeed(base(), { url: 'c.example.test', title: ' Site C ', newCategory: { name: 'Cuisine', icon: '🍳' } }, now);
    expect(r.feed.url).toBe('https://c.example.test/');
    expect(r.feed.title).toBe('Site C');
    expect(r.feed.categories).toEqual(['cuisine']);
    expect(r.subs.categories.at(-1)).toMatchObject({ name: 'Cuisine', icon: '🍳' });
  });

  test('EXG-011 · adresse invalide, doublon ou catégorie manquante refusés', () => {
    expect(() => addFeed(base(), { url: 'pas une adresse', categoryId: 'tech' })).toThrow(/Adresse invalide/);
    expect(() => addFeed(base(), { url: 'javascript:alert(1)', categoryId: 'tech' })).toThrow(/Adresse invalide/);
    expect(() => addFeed(base(), { url: 'https://A.example.test/rss/', categoryId: 'tech' })).toThrow(/déjà abonné/);
    const legacy = { ...base(), feeds: [{ ...base().feeds[0], id: 'ancien-id' }] };
    expect(() => addFeed(legacy, { url: 'https://a.example.test/rss', categoryId: 'tech' })).toThrow(/déjà abonné/);
    expect(() => addFeed(base(), { url: 'https://d.example.test/rss' })).toThrow(/catégorie/);
    expect(() => addFeed(base(), { url: 'https://d.example.test/rss', categoryId: 'nope' })).toThrow(/catégorie/);
  });

  test('EXG-011 · nom affiché : saisi, sinon trouvé par le collecteur, sinon le site', () => {
    const f = { id: 'f1', url: 'https://www.site.example.test/rss', title: '' };
    expect(feedLabel({ ...f, title: 'Perso' })).toBe('Perso');
    expect(feedLabel(f, { feeds: { f1: { failures: 0, title: 'Titre du fil' } } })).toBe('Titre du fil');
    expect(feedLabel(f)).toBe('site.example.test');
    expect(feedLabel({ ...f, url: 'bizarre' })).toBe('bizarre');
  });
});
