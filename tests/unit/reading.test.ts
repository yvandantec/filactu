import { describe, expect, test } from 'vitest';
import { diffReading, isEmptyDelta, isRead, markAllBefore, markManyRead, markRead, mergeReading, pruneReading } from '../../src/core/reading';
import { ageLabel, itemsForView, unreadCounts } from '../../src/core/views';
import { emptyReading, type Item, type Subscriptions } from '../../src/core/types';

const item = (id: string, feedId: string, fetched: string): Item => ({
  id, feedId, title: id, link: `https://x.example.test/${id}`, published: fetched, fetched, summary: '',
});
const subs: Subscriptions = {
  version: 1, updatedAt: '', categories: [{ id: 'tech', name: 'Tech', order: 0 }],
  feeds: [
    { id: 'f1', url: 'https://a.example.test/f', title: 'A', categories: ['tech'], addedAt: '', status: 'active' },
    { id: 'f2', url: 'https://b.example.test/f', title: 'B', categories: [], addedAt: '', status: 'active' },
  ],
};
const a = item('a', 'f1', '2026-11-04T10:00:00Z');
const b = item('b', 'f2', '2026-11-03T10:00:00Z');
const t = (s: string) => new Date(s);

describe('état de lecture', () => {
  test('EXG-040 · marquer lu puis non lu', () => {
    let s = markRead(emptyReading(), 'a', true, t('2026-11-04T11:00:00Z'));
    expect(isRead(s, a)).toBe(true);
    s = markRead(s, 'a', false, t('2026-11-04T11:05:00Z'));
    expect(isRead(s, a)).toBe(false);
    s = markRead(s, 'a', true, t('2026-11-04T11:10:00Z'));
    expect(isRead(s, a)).toBe(true);
  });

  test('EXG-043 · tout marquer lu couvre le fil, la catégorie ou tout', () => {
    const before = t('2026-11-04T12:00:00Z');
    expect(isRead(markAllBefore(emptyReading(), 'category:tech', before), a, subs)).toBe(true);
    expect(isRead(markAllBefore(emptyReading(), 'category:tech', before), b, subs)).toBe(false);
    expect(isRead(markAllBefore(emptyReading(), 'feed:f2', before), b, subs)).toBe(true);
    expect(isRead(markAllBefore(emptyReading(), 'all', t('2026-11-03T12:00:00Z')), a, subs)).toBe(false);
    // remis en non lu après un « tout marquer lu »
    const s = markRead(markAllBefore(emptyReading(), 'all', before), 'a', false, t('2026-11-04T13:00:00Z'));
    expect(isRead(s, a, subs)).toBe(false);
  });

  test('EXG-045 · marquer lus plusieurs articles d’un coup, sans toucher aux autres', () => {
    const c = item('c', 'f1', '2026-11-04T09:00:00Z');
    const s = markManyRead(markRead(emptyReading(), 'a', false, t('2026-11-04T10:30:00Z')), ['a', 'b'], t('2026-11-04T11:00:00Z'));
    expect(isRead(s, a)).toBe(true); // remis lu après un « non lu » antérieur
    expect(isRead(s, b)).toBe(true);
    expect(isRead(s, c)).toBe(false);
  });

  test('EXG-075 · la fusion de deux appareils ne perd rien', () => {
    const d1 = markRead(emptyReading(), 'a', true, t('2026-11-04T11:00:00Z'));
    const d2 = markRead(markRead(emptyReading(), 'b', true, t('2026-11-04T11:01:00Z')), 'a', false, t('2026-11-04T11:02:00Z'));
    const m = mergeReading(d1, d2);
    expect(isRead(m, b)).toBe(true);
    expect(isRead(m, a)).toBe(false); // l'action la plus récente gagne
    expect(mergeReading(d1, d2)).toEqual(mergeReading(d2, d1));
    expect(mergeReading(null, undefined)).toEqual(emptyReading());
  });

  test('EXG-075 · favoris et préférences : le plus récent gagne', () => {
    const x = { ...emptyReading(), saved: { a: { at: '2026-11-04T10:00:00Z', removed: false, item: a } }, prefs: { theme: 'dark', updatedAt: '1' } };
    const y = { ...emptyReading(), saved: { a: { at: '2026-11-04T11:00:00Z', removed: true, item: a } }, prefs: { theme: 'light', updatedAt: '2' } };
    const m = mergeReading(x, y);
    expect(m.saved.a.removed).toBe(true);
    expect(m.prefs.theme).toBe('light');
    expect(mergeReading(y, x).prefs.theme).toBe('light');
  });

  test('EXG-073 · seul le delta non envoyé est transmis', () => {
    const base = markRead(emptyReading(), 'a', true, t('2026-11-04T11:00:00Z'));
    const next = markRead(base, 'b', true, t('2026-11-04T11:01:00Z'));
    const d = diffReading(base, next);
    expect(Object.keys(d.read)).toEqual(['b']);
    expect(isEmptyDelta(d)).toBe(false);
    expect(isEmptyDelta(diffReading(next, next))).toBe(true);
    const withPrefs = { ...next, prefs: { updatedAt: '9' }, saved: { a: { at: '1', removed: false, item: a } } };
    const d2 = diffReading(next, withPrefs);
    expect(Object.keys(d2.saved)).toEqual(['a']);
    expect(d2.prefs.updatedAt).toBe('9');
  });

  test('EXG-072 · les marques anciennes sont purgées', () => {
    const s = markRead(markRead(emptyReading(), 'old', true, t('2026-09-01T00:00:00Z')), 'new', true, t('2026-11-04T00:00:00Z'));
    expect(Object.keys(pruneReading(s, t('2026-11-04T12:00:00Z')).read)).toEqual(['new']);
  });
});

describe('vues et compteurs', () => {
  const now = t('2026-11-04T12:00:00Z');
  const orphan = item('o', 'inconnu', '2026-11-04T10:00:00Z');

  test('EXG-020 · vues Aujourd’hui, Tous, catégorie, fil, à lire plus tard', () => {
    const items = [a, b, orphan];
    const r = emptyReading();
    expect(itemsForView('all', items, subs, r, now).map((i) => i.id)).toEqual(['a', 'b']);
    expect(itemsForView('today', items, subs, r, now).map((i) => i.id)).toEqual(['a']);
    expect(itemsForView('category:tech', items, subs, r, now).map((i) => i.id)).toEqual(['a']);
    expect(itemsForView('feed:f2', items, subs, r, now).map((i) => i.id)).toEqual(['b']);
    const saved = { ...r, saved: { b: { at: '2', removed: false, item: b }, a: { at: '1', removed: true, item: a } } };
    expect(itemsForView('saved', items, subs, saved, now).map((i) => i.id)).toEqual(['b']);
  });

  test('EXG-020 · compteurs de non-lus par fil et par catégorie', () => {
    const r = markRead(emptyReading(), 'b', true, now);
    const c = unreadCounts([a, b, orphan], subs, r, now);
    expect(c).toEqual({ all: 1, today: 1, feeds: { f1: 1 }, categories: { tech: 1 } });
  });

  test('EXG-030 · âge lisible', () => {
    expect(ageLabel('2026-11-04T11:59:30Z', now)).toBe("à l'instant");
    expect(ageLabel('2026-11-04T11:55:00Z', now)).toBe('5 min');
    expect(ageLabel('2026-11-04T09:00:00Z', now)).toBe('3 h');
    expect(ageLabel('2026-11-02T12:00:00Z', now)).toBe('2 j');
  });
});
