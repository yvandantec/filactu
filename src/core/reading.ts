import type { Item, ReadingState, Subscriptions } from './types';
import { emptyReading } from './types';

/** Clés « tout marquer lu » qui couvrent un article : son fil, ses catégories, et « all ». */
export function coverKeys(item: Pick<Item, 'feedId'>, subs?: Subscriptions): string[] {
  const keys = ['all', `feed:${item.feedId}`];
  const feed = subs?.feeds.find((f) => f.id === item.feedId);
  for (const c of feed?.categories ?? []) keys.push(`category:${c}`);
  return keys;
}

function max(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Date à laquelle l'article est devenu lu, ou undefined s'il est non lu. */
export function readAt(state: ReadingState, item: Pick<Item, 'id' | 'feedId' | 'fetched'>, subs?: Subscriptions): string | undefined {
  let at: string | undefined = state.read[item.id];
  for (const k of coverKeys(item, subs)) {
    const before = state.markedBefore[k];
    if (before && item.fetched <= before) at = max(at, before);
  }
  const un = state.unread[item.id];
  if (at && un && un >= at) return undefined;
  return at;
}

export function isRead(state: ReadingState, item: Pick<Item, 'id' | 'feedId' | 'fetched'>, subs?: Subscriptions): boolean {
  return readAt(state, item, subs) !== undefined;
}

/** Applique une modification et renvoie un nouvel état (immutabilité pour l'interface). */
export function markRead(state: ReadingState, itemId: string, read: boolean, now = new Date()): ReadingState {
  const at = now.toISOString();
  if (read) return { ...state, read: { ...state.read, [itemId]: at } };
  return { ...state, unread: { ...state.unread, [itemId]: at } };
}

/** Marque lus plusieurs articles d'un coup (EXG-045). */
export function markManyRead(state: ReadingState, itemIds: string[], now = new Date()): ReadingState {
  const at = now.toISOString();
  const read = { ...state.read };
  for (const id of itemIds) read[id] = at;
  return { ...state, read };
}

export function markAllBefore(state: ReadingState, key: string, before: Date): ReadingState {
  return { ...state, markedBefore: { ...state.markedBefore, [key]: before.toISOString() } };
}

function mergeMax(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = max(out[k], v)!;
  return out;
}

/**
 * Fusion sans perte de deux états (DEC-05, EXG-075) :
 * lu/non lu/tout-marquer : horodatage le plus récent ; favoris : dernier gagnant ; préférences : dernier gagnant.
 */
export function mergeReading(a: ReadingState | null | undefined, b: ReadingState | null | undefined): ReadingState {
  const x = a ?? emptyReading();
  const y = b ?? emptyReading();
  const saved = { ...x.saved };
  for (const [k, v] of Object.entries(y.saved)) {
    if (!saved[k] || saved[k].at < v.at) saved[k] = v;
  }
  const px = x.prefs.updatedAt ?? '';
  const py = y.prefs.updatedAt ?? '';
  return {
    version: 1,
    read: mergeMax(x.read, y.read),
    unread: mergeMax(x.unread, y.unread),
    markedBefore: mergeMax(x.markedBefore, y.markedBefore),
    saved,
    prefs: py > px ? { ...x.prefs, ...y.prefs } : { ...y.prefs, ...x.prefs },
  };
}

/** Retire les marques devenues inutiles (articles purgés). Les favoris sont conservés. */
export function pruneReading(state: ReadingState, now: Date, days = 35): ReadingState {
  const limit = new Date(now.getTime() - days * 86400_000).toISOString();
  const keep = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([, v]) => v >= limit));
  return { ...state, read: keep(state.read), unread: keep(state.unread) };
}

/** Différence « à envoyer » : ce qui est dans next mais pas (ou plus ancien) dans base. */
export function diffReading(base: ReadingState, next: ReadingState): ReadingState {
  const d = (a: Record<string, string>, b: Record<string, string>) =>
    Object.fromEntries(Object.entries(b).filter(([k, v]) => !a[k] || a[k] < v));
  const saved = Object.fromEntries(Object.entries(next.saved).filter(([k, v]) => !base.saved[k] || base.saved[k].at < v.at));
  const prefs = (next.prefs.updatedAt ?? '') > (base.prefs.updatedAt ?? '') ? next.prefs : {};
  return {
    version: 1,
    read: d(base.read, next.read),
    unread: d(base.unread, next.unread),
    markedBefore: d(base.markedBefore, next.markedBefore),
    saved,
    prefs,
  };
}

export function isEmptyDelta(s: ReadingState): boolean {
  return (
    !Object.keys(s.read).length &&
    !Object.keys(s.unread).length &&
    !Object.keys(s.markedBefore).length &&
    !Object.keys(s.saved).length &&
    !Object.keys(s.prefs).length
  );
}
