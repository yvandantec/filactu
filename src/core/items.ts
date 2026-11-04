import { hash, itemIdFor } from './hash';
import type { ParsedItem } from './feed';
import { RETENTION_DAYS, type DayFile, type Item } from './types';

/** Clé de fichier journalier (UTC) : AAAA-MM-JJ */
export function dayKey(d: Date | string): string {
  return (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10);
}

export function dayPath(key: string): string {
  return `items/${key}.json`;
}

export function dayFromPath(path: string): string | undefined {
  return /(\d{4}-\d{2}-\d{2})\.json$/.exec(path)?.[1];
}

/** Premier jour conservé (inclus) : aujourd'hui - (RETENTION_DAYS - 1). */
export function oldestKeptDay(now: Date, days = RETENTION_DAYS): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return dayKey(d);
}

/** Jours à supprimer (EXG-072). */
export function expiredDays(keys: string[], now: Date, days = RETENTION_DAYS): string[] {
  const limit = oldestKeptDay(now, days);
  return keys.filter((k) => k < limit);
}

/** Clé secondaire de dédoublonnage par lien (EXG-077). */
export function linkKey(feedId: string, link: string): string {
  return 'l_' + hash(feedId + '|' + link.replace(/#.*$/, ''));
}

export class SeenIndex {
  private seen = new Set<string>();
  constructor(items: Iterable<Item> = []) {
    for (const i of items) this.add(i);
  }
  add(i: Pick<Item, 'id' | 'feedId' | 'link'>): void {
    this.seen.add(i.id);
    this.seen.add(linkKey(i.feedId, i.link));
  }
  has(i: Pick<Item, 'id' | 'feedId' | 'link'>): boolean {
    return this.seen.has(i.id) || this.seen.has(linkKey(i.feedId, i.link));
  }
}

/**
 * Transforme les éléments d'un fil en nouveaux articles, sans doublons
 * ni articles plus anciens que la durée de conservation.
 */
export function newItemsFrom(
  feedId: string,
  parsed: ParsedItem[],
  seen: SeenIndex,
  now: Date,
  days = RETENTION_DAYS,
): Item[] {
  const minDate = new Date(now.getTime() - days * 86400_000).toISOString();
  const fetched = now.toISOString();
  const out: Item[] = [];
  for (const p of parsed) {
    const published = p.published && p.published <= fetched ? p.published : fetched;
    if (published < minDate) continue;
    const item: Item = {
      id: itemIdFor(feedId, p.key),
      feedId,
      title: p.title,
      link: p.link,
      published,
      fetched,
      summary: p.summary,
    };
    if (p.author) item.author = p.author;
    if (p.image) item.image = p.image;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function sortByDateDesc(items: Item[]): Item[] {
  return [...items].sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
}

/** Fusionne plusieurs fichiers journaliers en une liste unique sans doublon. */
export function flattenDays(days: DayFile[]): Item[] {
  const seen = new Set<string>();
  const all: Item[] = [];
  for (const d of days) {
    for (const i of d.items) {
      if (seen.has(i.id)) continue;
      seen.add(i.id);
      all.push(i);
    }
  }
  return sortByDateDesc(all);
}
