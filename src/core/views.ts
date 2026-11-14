import { isRead } from './reading';
import type { Category, Item, ReadingState, Subscriptions } from './types';

export type ViewId = 'today' | 'all' | 'saved' | `category:${string}` | `feed:${string}`;

export const TODAY_HOURS = 24;

export function itemsForView(view: ViewId, items: Item[], subs: Subscriptions, reading: ReadingState, now = new Date()): Item[] {
  if (view === 'saved') {
    return Object.values(reading.saved)
      .filter((s) => !s.removed)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((s) => s.item);
  }
  const known = new Set(subs.feeds.map((f) => f.id));
  const visible = items.filter((i) => known.has(i.feedId));
  if (view === 'all') return visible;
  if (view === 'today') {
    const since = new Date(now.getTime() - TODAY_HOURS * 3600_000).toISOString();
    return visible.filter((i) => i.published >= since || i.fetched >= since);
  }
  if (view.startsWith('feed:')) {
    const id = view.slice(5);
    return visible.filter((i) => i.feedId === id);
  }
  const cat = view.slice(9);
  const feeds = new Set(subs.feeds.filter((f) => f.categories.includes(cat)).map((f) => f.id));
  return visible.filter((i) => feeds.has(i.feedId));
}

/**
 * Catégorie voisine dans l'ordre du volet, en boucle (EXG-090).
 * `dir` = 1 : suivante (glisser vers la gauche) ; -1 : précédente (glisser vers la droite).
 * Hors d'une catégorie : la première (1) ou la dernière (-1). `null` si rien ne doit changer.
 */
export function adjacentCategory(view: ViewId, categories: Category[], dir: 1 | -1): ViewId | null {
  const ids = [...categories].sort((a, b) => a.order - b.order).map((c) => c.id);
  if (!ids.length) return null;
  const idx = view.startsWith('category:') ? ids.indexOf(view.slice(9)) : -1;
  if (idx < 0) return `category:${dir === 1 ? ids[0] : ids[ids.length - 1]}`;
  if (ids.length === 1) return null;
  return `category:${ids[(idx + dir + ids.length) % ids.length]}`;
}

export interface UnreadCounts {
  all: number;
  today: number;
  feeds: Record<string, number>;
  categories: Record<string, number>;
}

export function unreadCounts(items: Item[], subs: Subscriptions, reading: ReadingState, now = new Date()): UnreadCounts {
  const counts: UnreadCounts = { all: 0, today: 0, feeds: {}, categories: {} };
  const since = new Date(now.getTime() - TODAY_HOURS * 3600_000).toISOString();
  const feedCats = new Map(subs.feeds.map((f) => [f.id, f.categories]));
  for (const i of items) {
    const cats = feedCats.get(i.feedId);
    if (!cats) continue;
    if (isRead(reading, i, subs)) continue;
    counts.all++;
    if (i.published >= since || i.fetched >= since) counts.today++;
    counts.feeds[i.feedId] = (counts.feeds[i.feedId] ?? 0) + 1;
    for (const c of cats) counts.categories[c] = (counts.categories[c] ?? 0) + 1;
  }
  return counts;
}

export type DisplayMode = 'titles' | 'magazine' | 'cards';
export const DISPLAY_MODES: DisplayMode[] = ['titles', 'magazine', 'cards'];

/** Clé de préférence propre à une vue (EXG-023, EXG-024, EXG-030). */
export function prefKey(name: 'mode' | 'unreadOnly' | 'oldestFirst', view: ViewId): string {
  return `${name}:${view}`;
}

/** Texte normalisé pour la recherche : sans accents ni majuscules (EXG-060). */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchItems(items: Item[], query: string): Item[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((i) => {
    const hay = normalizeSearch(i.title + ' ' + i.summary);
    return words.every((w) => hay.includes(w));
  });
}

/** Tri par date de publication (EXG-023). */
export function sortItems(items: Item[], oldestFirst: boolean): Item[] {
  const sorted = [...items].sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  return oldestFirst ? sorted.reverse() : sorted;
}

/** Âge lisible en français : « 5 min », « 3 h », « 2 j ». */
export function ageLabel(iso: string, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

/** Raison d'erreur d'un fil en mots simples, sans code technique (EXG-019). */
export function feedErrorReason(raw?: string): string {
  if (!raw) return 'raison inconnue';
  const http = /^HTTP (\d{3})/.exec(raw);
  if (http) {
    const code = Number(http[1]);
    if (code === 404 || code === 410) return 'la page du fil est introuvable';
    if (code === 401 || code === 403) return 'le site refuse l’accès au robot';
    if (code >= 500) return 'le site est en panne';
    return 'le site a répondu par une erreur';
  }
  if (/délai/i.test(raw)) return 'le site met trop de temps à répondre';
  if (/aucun fil/i.test(raw)) return 'aucun fil n’a été trouvé à cette adresse';
  return 'le site est injoignable';
}

/** « depuis le 5 nov. » ou « depuis son ajout » pour un fil en erreur. */
export function failingSince(lastSuccess?: string): string {
  return lastSuccess
    ? `depuis le ${new Date(lastSuccess).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : 'depuis son ajout';
}
