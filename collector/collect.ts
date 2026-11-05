// Collecteur FilActu (EXG-070, EXG-072, EXG-077, EXG-011, EXG-015, EXG-079)
// IMPORTANT (DEC-03) : les journaux sont publics ; on n'y écrit QUE des compteurs.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { discoverFeedUrl, knownFeedUrl, looksLikeFeed, parseFeed } from '../src/core/feed';
import { dayFromPath, dayKey, expiredDays, newItemsFrom, SeenIndex } from '../src/core/items';
import { pageImage, safeHttpUrl } from '../src/core/text';
import type { DayFile, Feed, FeedRunStatus, FeedsStatus, Item, Subscriptions } from '../src/core/types';

export const USER_AGENT = 'FilActu/0.1 (+https://github.com/yvandantec/filactu)';
export const ERROR_THRESHOLD = 3;
/** Pages d'articles consultées au plus, par fil et par collecte, pour trouver une vignette (EXG-079). */
export const PAGE_IMAGE_LIMIT = 20;
const PAGE_TIMEOUT_MS = 10_000;
const PAGE_CONCURRENCY = 4;

export interface CollectOptions {
  dataDir: string;
  now?: Date;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
  timeoutMs?: number;
  concurrency?: number;
}

export interface CollectStats {
  feeds: number;
  ok: number;
  notModified: number;
  errors: number;
  discovered: number;
  newItems: number;
  purgedDays: number;
  pageImages: number;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 1) + '\n', 'utf8');
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string; etag?: string; lastModified?: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5', ...headers },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const body = res.status === 304 ? '' : await res.text();
    return {
      status: res.status,
      body,
      etag: res.headers.get('etag') ?? undefined,
      lastModified: res.headers.get('last-modified') ?? undefined,
      finalUrl: res.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function pool<T>(items: T[], size: number, fn: (t: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

/**
 * Pour les nouveaux articles sans image, lit l'image de partage de leur page (EXG-079).
 * Une page injoignable est simplement ignorée : le fil n'est pas mis en erreur.
 */
async function addPageImages(items: Item[], fetchImpl: typeof fetch, timeoutMs: number): Promise<number> {
  const todo = items.filter((i) => !i.image).slice(0, PAGE_IMAGE_LIMIT);
  let found = 0;
  await pool(todo, PAGE_CONCURRENCY, async (item) => {
    try {
      const res = await fetchText(item.link, fetchImpl, Math.min(timeoutMs, PAGE_TIMEOUT_MS), { Accept: 'text/html' });
      if (res.status >= 400) return;
      const image = pageImage(res.body, res.finalUrl);
      if (image) {
        item.image = image;
        found++;
      }
    } catch {
      // page injoignable ou trop lente : l'article reste sans vignette
    }
  });
  return found;
}

function shortError(e: unknown): string {
  if (e instanceof Error) return e.name === 'AbortError' ? 'Délai dépassé' : e.message.slice(0, 120);
  return 'Erreur inconnue';
}

export async function collect(opts: CollectOptions): Promise<CollectStats> {
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? (() => {});
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const dir = opts.dataDir;

  const stats: CollectStats = { feeds: 0, ok: 0, notModified: 0, errors: 0, discovered: 0, newItems: 0, purgedDays: 0, pageImages: 0 };
  const subs = await readJson<Subscriptions>(join(dir, 'state/subscriptions.json'));
  const statusPath = join(dir, 'meta/feeds-status.json');
  const status: FeedsStatus = (await readJson<FeedsStatus>(statusPath)) ?? { feeds: {} };

  // Purge des fichiers journaliers expirés (EXG-072)
  const itemsDir = join(dir, 'items');
  await mkdir(itemsDir, { recursive: true });
  const dayKeys = (await readdir(itemsDir)).map((f) => dayFromPath(f)).filter((k): k is string => !!k);
  for (const k of expiredDays(dayKeys, now)) {
    await rm(join(itemsDir, `${k}.json`));
    stats.purgedDays++;
  }

  // Index des articles déjà connus (EXG-077)
  const existing: Item[] = [];
  for (const k of dayKeys) {
    if (expiredDays([k], now).length) continue;
    const d = await readJson<DayFile>(join(itemsDir, `${k}.json`));
    if (d) existing.push(...d.items);
  }
  const seen = new SeenIndex(existing);

  const feeds: Feed[] = subs?.feeds ?? [];
  stats.feeds = feeds.length;
  const fresh: Item[] = [];

  await pool(feeds, opts.concurrency ?? 8, async (feed) => {
    const st: FeedRunStatus = status.feeds[feed.id] ?? { failures: 0 };
    status.feeds[feed.id] = st;
    try {
      // Adresses de pages connues (YouTube…) : fil déduit sans téléchargement (EXG-017)
      if (!st.resolvedUrl) {
        const known = knownFeedUrl(feed.url);
        if (known) st.resolvedUrl = known;
      }
      let url = st.resolvedUrl ?? feed.url;
      const conditional: Record<string, string> = {};
      if (st.etag) conditional['If-None-Match'] = st.etag;
      if (st.lastModified) conditional['If-Modified-Since'] = st.lastModified;
      let res = await fetchText(url, fetchImpl, timeoutMs, conditional);
      if (res.status === 304) {
        stats.notModified++;
        st.failures = 0;
        st.lastSuccess = now.toISOString();
        return;
      }
      if (res.status >= 400) throw new Error(`HTTP ${res.status}`);

      // Adresse de site plutôt que de fil : découverte (EXG-011)
      if (!looksLikeFeed(res.body)) {
        const found = discoverFeedUrl(res.body, res.finalUrl);
        if (!found) throw new Error('Aucun fil trouvé à cette adresse');
        url = found;
        st.resolvedUrl = found;
        stats.discovered++;
        res = await fetchText(url, fetchImpl, timeoutMs);
        if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
      }

      const parsed = parseFeed(res.body, url);
      const items = newItemsFrom(feed.id, parsed.items, seen, now);
      stats.pageImages += await addPageImages(items, fetchImpl, timeoutMs);
      fresh.push(...items);
      st.failures = 0;
      st.lastSuccess = now.toISOString();
      delete st.lastError;
      delete st.lastErrorAt;
      st.etag = res.etag;
      st.lastModified = res.lastModified;
      if (parsed.title) st.title = parsed.title;
      if (parsed.siteUrl) {
        st.siteUrl = parsed.siteUrl;
        st.favicon = safeHttpUrl('/favicon.ico', parsed.siteUrl);
      }
      stats.ok++;
    } catch (e) {
      st.failures = (st.failures ?? 0) + 1;
      st.lastError = shortError(e);
      st.lastErrorAt = now.toISOString();
      stats.errors++;
    }
  });

  if (fresh.length) {
    const todayPath = join(itemsDir, `${dayKey(now)}.json`);
    const today = (await readJson<DayFile>(todayPath)) ?? { date: dayKey(now), items: [] };
    today.items.push(...fresh);
    await writeJson(todayPath, today);
  }
  stats.newItems = fresh.length;
  status.lastRun = now.toISOString();
  await writeJson(statusPath, status);

  log(
    `Collecte : ${stats.feeds} fils, ${stats.ok} lus, ${stats.notModified} inchangés, ${stats.errors} en erreur, ` +
      `${stats.discovered} découverts, ${stats.newItems} nouveaux articles, ${stats.pageImages} vignettes trouvées sur les pages, ${stats.purgedDays} jours purgés`,
  );
  return stats;
}
