// Opérations sur les abonnements et les catégories (EXG-011, EXG-013, EXG-016).
// Fonctions pures : elles sont rejouées sur la version distante en cas de conflit (EXG-075).
import { feedIdFor, normalizeUrl, slug } from './hash';
import { safeHttpUrl } from './text';
import type { Category, Feed, FeedsStatus, Subscriptions } from './types';

export class SubscriptionError extends Error {}

/** Palette d'icônes proposée pour les catégories (EXG-016). */
export const CATEGORY_ICONS = [
  '📰', '💻', '🔬', '🧠', '🎮', '🎬', '🎵', '📚', '⚽', '🍳', '✈️', '💼',
  '💰', '🏛️', '🌍', '🚗', '🏠', '🎨', '📷', '🩺', '🌱', '🔧', '🛒', '⭐',
];

function touch(subs: Subscriptions, now: Date, patch: Partial<Subscriptions>): Subscriptions {
  return { ...subs, ...patch, updatedAt: now.toISOString() };
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function assertFreeName(subs: Subscriptions, name: string, exceptId?: string) {
  if (!name) throw new SubscriptionError('Donnez un nom à la catégorie');
  if (subs.categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())) {
    throw new SubscriptionError(`La catégorie « ${name} » existe déjà`);
  }
}

function newCategoryId(subs: Subscriptions, name: string): string {
  let id = slug(name);
  while (subs.categories.some((c) => c.id === id)) id += '-2';
  return id;
}

export function createCategory(
  subs: Subscriptions,
  name: string,
  icon?: string,
  now = new Date(),
): { subs: Subscriptions; id: string } {
  const n = cleanName(name);
  assertFreeName(subs, n);
  const id = newCategoryId(subs, n);
  const order = subs.categories.reduce((m, c) => Math.max(m, c.order + 1), 0);
  const cat: Category = { id, name: n, order };
  if (icon) cat.icon = icon;
  return { subs: touch(subs, now, { categories: [...subs.categories, cat] }), id };
}

export function updateCategory(
  subs: Subscriptions,
  id: string,
  patch: { name?: string; icon?: string | null },
  now = new Date(),
): Subscriptions {
  const cat = subs.categories.find((c) => c.id === id);
  if (!cat) throw new SubscriptionError('Catégorie introuvable');
  const next: Category = { ...cat };
  if (patch.name !== undefined) {
    const n = cleanName(patch.name);
    assertFreeName(subs, n, id);
    next.name = n;
  }
  if (patch.icon !== undefined) {
    if (patch.icon) next.icon = patch.icon;
    else delete next.icon;
  }
  return touch(subs, now, { categories: subs.categories.map((c) => (c.id === id ? next : c)) });
}

/** Fils qui n'appartiennent qu'à cette catégorie (ceux qu'il faut déplacer ou désabonner). */
export function exclusiveFeeds(subs: Subscriptions, id: string): Feed[] {
  return subs.feeds.filter((f) => f.categories.length === 1 && f.categories[0] === id);
}

export type DeleteMode = { moveTo: string } | 'unsubscribe';

export function deleteCategory(subs: Subscriptions, id: string, mode: DeleteMode, now = new Date()): Subscriptions {
  if (!subs.categories.some((c) => c.id === id)) throw new SubscriptionError('Catégorie introuvable');
  const moveTo = mode === 'unsubscribe' ? undefined : mode.moveTo;
  if (moveTo !== undefined && (moveTo === id || !subs.categories.some((c) => c.id === moveTo))) {
    throw new SubscriptionError('Choisissez une autre catégorie de destination');
  }
  const feeds: Feed[] = [];
  for (const f of subs.feeds) {
    if (!f.categories.includes(id)) {
      feeds.push(f);
      continue;
    }
    const rest = f.categories.filter((c) => c !== id);
    if (rest.length) feeds.push({ ...f, categories: rest });
    else if (moveTo) feeds.push({ ...f, categories: [moveTo] });
    // sinon : désabonnement
  }
  const categories = subs.categories
    .filter((c) => c.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));
  return touch(subs, now, { categories, feeds });
}

/** Déplace une catégorie d'un cran vers le haut (-1) ou le bas (+1). */
export function moveCategory(subs: Subscriptions, id: string, delta: -1 | 1, now = new Date()): Subscriptions {
  const sorted = [...subs.categories].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= sorted.length) return subs;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  return touch(subs, now, { categories: sorted.map((c, k) => ({ ...c, order: k })) });
}

export interface NewFeed {
  url: string;
  title?: string;
  categoryId?: string; // catégorie existante
  newCategory?: { name: string; icon?: string }; // ou catégorie à créer
}

export function addFeed(subs: Subscriptions, input: NewFeed, now = new Date()): { subs: Subscriptions; feed: Feed } {
  let raw = input.url.trim();
  if (raw && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
  const url = safeHttpUrl(raw);
  if (!url || !/^https?:\/\/[^/]+\.[^/]+/.test(url)) throw new SubscriptionError('Adresse invalide : saisissez une adresse web (https://…)');
  const id = feedIdFor(url);
  const norm = normalizeUrl(url);
  const existing = subs.feeds.find((f) => f.id === id || normalizeUrl(f.url) === norm);
  if (existing) throw new SubscriptionError(`Vous êtes déjà abonné à ce fil (« ${existing.title || url} »)`);

  let next = subs;
  let categoryId = input.categoryId;
  if (input.newCategory) {
    const r = createCategory(next, input.newCategory.name, input.newCategory.icon, now);
    next = r.subs;
    categoryId = r.id;
  }
  if (!categoryId || !next.categories.some((c) => c.id === categoryId)) {
    throw new SubscriptionError('Choisissez une catégorie');
  }
  const feed: Feed = {
    id,
    url,
    title: cleanName(input.title ?? ''),
    categories: [categoryId],
    addedAt: now.toISOString(),
    status: 'pending',
  };
  return { subs: touch(next, now, { feeds: [...next.feeds, feed] }), feed };
}

/** Nom affiché d'un fil : nom saisi, sinon titre trouvé par le collecteur, sinon nom du site. */
export function feedLabel(feed: Pick<Feed, 'id' | 'title' | 'url'>, status?: FeedsStatus): string {
  if (feed.title) return feed.title;
  const fromCollector = status?.feeds[feed.id]?.title;
  if (fromCollector) return fromCollector;
  try {
    return new URL(feed.url).hostname.replace(/^www\./, '');
  } catch {
    return feed.url;
  }
}
