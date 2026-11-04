import { XMLParser } from 'fast-xml-parser';
import { feedIdFor, normalizeUrl, slug } from './hash';
import { safeHttpUrl } from './text';
import { suggestIcon } from './subscriptions';
import type { Category, Feed, Subscriptions } from './types';

export interface OpmlFeed {
  url: string;
  siteUrl?: string;
  title: string;
  categories: string[]; // noms de catégories
}

export class OpmlError extends Error {}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => name === 'outline',
});

type Outline = Record<string, unknown> & { outline?: Outline[] };

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Lit un fichier OPML (export Feedly ou autre lecteur). */
export function parseOpml(xml: string): OpmlFeed[] {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new OpmlError('Fichier OPML illisible');
  }
  const body = doc?.opml?.body;
  if (!body) throw new OpmlError("Ce fichier n'est pas un OPML");
  const byUrl = new Map<string, OpmlFeed>();

  const walk = (nodes: Outline[] | undefined, category?: string) => {
    for (const n of nodes ?? []) {
      const xmlUrl = safeHttpUrl(str(n.xmlUrl));
      const label = str(n.title) || str(n.text);
      if (xmlUrl) {
        const key = normalizeUrl(xmlUrl);
        const existing = byUrl.get(key);
        if (existing) {
          if (category && !existing.categories.includes(category)) existing.categories.push(category);
        } else {
          byUrl.set(key, {
            url: xmlUrl,
            siteUrl: safeHttpUrl(str(n.htmlUrl)),
            title: label || xmlUrl,
            categories: category ? [category] : [],
          });
        }
      } else if (n.outline) {
        walk(n.outline, label || category);
      }
    }
  };
  walk(body.outline as Outline[] | undefined);
  return [...byUrl.values()];
}

export interface ImportStats {
  feedsAdded: number;
  categoriesAdded: number;
  ignored: number;
}

export const UNCATEGORIZED = 'Sans catégorie';

/** Ajoute des fils importés aux abonnements existants, sans doublon (EXG-010). */
export function mergeImport(
  subs: Subscriptions,
  incoming: OpmlFeed[],
  now = new Date(),
): { subs: Subscriptions; stats: ImportStats } {
  const categories: Category[] = subs.categories.map((c) => ({ ...c }));
  const feeds: Feed[] = subs.feeds.map((f) => ({ ...f, categories: [...f.categories] }));
  const stats: ImportStats = { feedsAdded: 0, categoriesAdded: 0, ignored: 0 };

  const catId = (name: string): string => {
    const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (found) return found.id;
    let id = slug(name);
    while (categories.some((c) => c.id === id)) id += '-2';
    categories.push({ id, name, order: categories.length, icon: suggestIcon(name) });
    stats.categoriesAdded++;
    return id;
  };

  for (const f of incoming) {
    const names = f.categories.length ? f.categories : [UNCATEGORIZED];
    const ids = names.map(catId);
    const id = feedIdFor(f.url);
    const existing = feeds.find((x) => x.id === id);
    if (existing) {
      stats.ignored++;
      for (const c of ids) if (!existing.categories.includes(c)) existing.categories.push(c);
      continue;
    }
    const feed: Feed = {
      id,
      url: f.url,
      title: f.title,
      categories: ids,
      addedAt: now.toISOString(),
      status: 'active',
    };
    if (f.siteUrl) feed.siteUrl = f.siteUrl;
    feeds.push(feed);
    stats.feedsAdded++;
  }

  return { subs: { version: 1, updatedAt: now.toISOString(), categories, feeds }, stats };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Exporte les abonnements en OPML (EXG-014). */
export function exportOpml(subs: Subscriptions): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head><title>Abonnements FilActu</title></head>',
    '  <body>',
  ];
  const sorted = [...subs.categories].sort((a, b) => a.order - b.order);
  for (const c of sorted) {
    lines.push(`    <outline text="${esc(c.name)}" title="${esc(c.name)}">`);
    for (const f of subs.feeds.filter((x) => x.categories.includes(c.id))) {
      const html = f.siteUrl ? ` htmlUrl="${esc(f.siteUrl)}"` : '';
      const t = esc(f.title || f.url);
      lines.push(`      <outline type="rss" text="${t}" title="${t}" xmlUrl="${esc(f.url)}"${html}/>`);
    }
    lines.push('    </outline>');
  }
  for (const f of subs.feeds.filter((x) => x.categories.length === 0)) {
    const t = esc(f.title || f.url);
    lines.push(`    <outline type="rss" text="${t}" title="${t}" xmlUrl="${esc(f.url)}"/>`);
  }
  lines.push('  </body>', '</opml>');
  return lines.join('\n') + '\n';
}
