import { XMLParser } from 'fast-xml-parser';
import { firstImage, htmlToText, makeSummary, safeHttpUrl, truncate } from './text';

export interface ParsedItem {
  key: string; // guid / id / lien : sert au calcul de l'identifiant
  title: string;
  link: string;
  author?: string;
  published?: string;
  summary: string;
  image?: string;
}

export interface ParsedFeed {
  title: string;
  siteUrl?: string;
  items: ParsedItem[];
}

export class FeedParseError extends Error {}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
});

type Node = unknown;

function arr<T = Node>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function txt(v: Node): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return txt(v[0]);
  if (typeof v === 'object') {
    const o = v as Record<string, Node>;
    if ('#text' in o) return txt(o['#text']);
    if ('name' in o) return txt(o['name']); // auteur Atom
  }
  return '';
}

function attr(v: Node, name: string): string | undefined {
  for (const n of arr(v)) {
    if (n && typeof n === 'object') {
      const a = (n as Record<string, Node>)['@_' + name];
      if (typeof a === 'string') return a;
    }
  }
  return undefined;
}

function toIso(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = Date.parse(v.trim());
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function mediaImage(o: Record<string, Node>, base?: string): string | undefined {
  for (const enc of arr(o['enclosure'])) {
    const type = attr(enc, 'type') ?? '';
    if (type.startsWith('image/')) return safeHttpUrl(attr(enc, 'url'), base);
  }
  const thumb = attr(o['media:thumbnail'], 'url');
  if (thumb) return safeHttpUrl(thumb, base);
  for (const m of arr(o['media:content'])) {
    const type = attr(m, 'type') ?? '';
    const medium = attr(m, 'medium') ?? '';
    if (type.startsWith('image/') || medium === 'image') return safeHttpUrl(attr(m, 'url'), base);
    const inner = attr((m as Record<string, Node>)?.['media:thumbnail'], 'url');
    if (inner) return safeHttpUrl(inner, base);
  }
  const group = o['media:group'] as Record<string, Node> | undefined;
  if (group && typeof group === 'object') return mediaImage(group, base);
  return undefined;
}

function rssItem(o: Record<string, Node>, base?: string): ParsedItem | null {
  const link = safeHttpUrl(txt(o['link']), base) ?? safeHttpUrl(attr(o['link'], 'href'), base) ??
    (attr(o['guid'], 'isPermaLink') !== 'false' ? safeHttpUrl(txt(o['guid']), base) : undefined);
  if (!link) return null;
  const description = txt(o['description']);
  const content = txt(o['content:encoded']);
  const title = truncate(htmlToText(txt(o['title'])), 300) || truncate(htmlToText(description), 120) || link;
  return {
    key: txt(o['guid']) || link,
    title,
    link,
    author: htmlToText(txt(o['dc:creator']) || txt(o['author'])) || undefined,
    published: toIso(txt(o['pubDate']) || txt(o['dc:date'])),
    summary: makeSummary(description || content),
    image: mediaImage(o, base) ?? firstImage(content, base) ?? firstImage(description, base),
  };
}

function atomLink(v: Node, base?: string): string | undefined {
  const links = arr(v);
  const pick =
    links.find((l) => (attr(l, 'rel') ?? 'alternate') === 'alternate' && !(attr(l, 'type') ?? '').includes('xml')) ??
    links.find((l) => (attr(l, 'rel') ?? 'alternate') === 'alternate') ??
    links[0];
  return safeHttpUrl(attr(pick, 'href') ?? txt(pick), base);
}

function atomEntry(o: Record<string, Node>, base?: string): ParsedItem | null {
  const link = atomLink(o['link'], base);
  if (!link) return null;
  const group = o['media:group'] as Record<string, Node> | undefined;
  const summary = txt(o['summary']) || txt(group?.['media:description']);
  const content = txt(o['content']);
  const title = truncate(htmlToText(txt(o['title'])), 300) || link;
  return {
    key: txt(o['id']) || link,
    title,
    link,
    author: htmlToText(txt(arr(o['author'])[0])) || undefined,
    published: toIso(txt(o['published']) || txt(o['updated'])),
    summary: makeSummary(summary || content),
    image: mediaImage(o, base) ?? firstImage(content, base) ?? firstImage(summary, base),
  };
}

/** Analyse un document RSS 0.9x/2.0, RSS 1.0 (RDF) ou Atom. */
export function parseFeed(xml: string, feedUrl?: string): ParsedFeed {
  let doc: Record<string, Node>;
  try {
    doc = parser.parse(xml) as Record<string, Node>;
  } catch (e) {
    throw new FeedParseError('XML illisible');
  }
  if (!doc || typeof doc !== 'object') throw new FeedParseError('XML vide');

  const rss = doc['rss'] as Record<string, Node> | undefined;
  if (rss && typeof rss === 'object') {
    const ch = (arr(rss['channel'])[0] ?? {}) as Record<string, Node>;
    const siteUrl = safeHttpUrl(txt(ch['link']), feedUrl);
    return {
      title: htmlToText(txt(ch['title'])),
      siteUrl,
      items: arr(ch['item'] as Record<string, Node>[]).map((i) => rssItem(i, siteUrl ?? feedUrl)).filter(isItem),
    };
  }

  const rdf = doc['rdf:RDF'] as Record<string, Node> | undefined;
  if (rdf && typeof rdf === 'object') {
    const ch = (arr(rdf['channel'])[0] ?? {}) as Record<string, Node>;
    const siteUrl = safeHttpUrl(txt(ch['link']), feedUrl);
    return {
      title: htmlToText(txt(ch['title'])),
      siteUrl,
      items: arr(rdf['item'] as Record<string, Node>[]).map((i) => rssItem(i, siteUrl ?? feedUrl)).filter(isItem),
    };
  }

  const feed = doc['feed'] as Record<string, Node> | undefined;
  if (feed && typeof feed === 'object') {
    const siteUrl = atomLink(feed['link'], feedUrl);
    return {
      title: htmlToText(txt(feed['title'])),
      siteUrl,
      items: arr(feed['entry'] as Record<string, Node>[]).map((e) => atomEntry(e, feedUrl)).filter(isItem),
    };
  }

  throw new FeedParseError('Format de fil non reconnu');
}

function isItem(i: ParsedItem | null): i is ParsedItem {
  return i !== null;
}

/** Cherche l'adresse d'un fil annoncé dans une page HTML (<link rel="alternate">). */
export function discoverFeedUrl(html: string, pageUrl: string): string | undefined {
  const re = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  const found: { href: string; atom: boolean }[] = [];
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/\brel\s*=\s*["']?[^"'>]*alternate/i.test(tag)) continue;
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    if (!/(rss|atom|rdf)\+xml/.test(type)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const url = safeHttpUrl(href, pageUrl);
    if (url && !/comments/i.test(url)) found.push({ href: url, atom: type.includes('atom') });
  }
  return found[0]?.href;
}

/**
 * Adresses de pages connues dont le fil se déduit directement (EXG-017) :
 * playlist et chaîne YouTube → fil officiel feeds/videos.xml.
 */
export function knownFeedUrl(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  if (!/(^|\.)youtube\.com$/i.test(u.hostname) || u.pathname.startsWith('/feeds/')) return undefined;
  const yt = 'https://www.youtube.com/feeds/videos.xml';
  const list = u.searchParams.get('list');
  if (u.pathname === '/playlist' && list) return `${yt}?playlist_id=${encodeURIComponent(list)}`;
  const channel = /^\/channel\/(UC[\w-]+)/.exec(u.pathname)?.[1];
  if (channel) return `${yt}?channel_id=${channel}`;
  return undefined;
}

/** Vrai si le texte ressemble à un fil plutôt qu'à une page HTML. */
export function looksLikeFeed(body: string): boolean {
  const head = body.slice(0, 2000).toLowerCase();
  return /<(rss|feed|rdf:rdf)[\s>]/.test(head);
}
