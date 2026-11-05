import { createServer, type Server } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { collect } from '../../collector/collect';
import { feedIdFor } from '../../src/core/hash';
import type { DayFile, FeedsStatus, Subscriptions } from '../../src/core/types';

const fx = (name: string) => readFileSync(new URL(`../fixtures/feeds/${name}`, import.meta.url), 'utf8');

let server: Server;
let base = '';
let dir = '';
const hits: Record<string, number> = {};

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = req.url ?? '/';
    hits[path] = (hits[path] ?? 0) + 1;
    const send = (type: string, body: string, headers: Record<string, string> = {}) => {
      res.writeHead(200, { 'Content-Type': type, ...headers });
      res.end(body);
    };
    if (path === '/rss2.xml') {
      if (req.headers['if-none-match'] === '"v1"') {
        res.writeHead(304);
        return res.end();
      }
      return send('application/rss+xml', fx('rss2.xml'), { ETag: '"v1"' });
    }
    if (path === '/atom.xml') return send('application/atom+xml', fx('atom.xml'));
    if (path === '/rdf.xml') return send('application/rdf+xml', fx('rdf.xml'));
    if (path === '/broken.xml') return send('text/html', fx('broken.xml'));
    if (path === '/site') return send('text/html', fx('site.html'));
    if (path === '/sans-image.xml') return send('application/rss+xml', fx('sans-image.xml'));
    if (path === '/beaucoup.xml') {
      const items = Array.from({ length: 25 }, (_, i) =>
        `<item><title>N${i}</title><link>/pages/n${i}</link><pubDate>Wed, 04 Nov 2026 0${i % 10}:00:00 GMT</pubDate></item>`).join('');
      return send('application/rss+xml', `<?xml version="1.0"?><rss version="2.0"><channel><title>B</title><link>${base}/</link>${items}</channel></rss>`);
    }
    if (path === '/pages/og' || /^\/pages\/n\d+$/.test(path)) {
      return send('text/html', `<html><head><meta property="og:image" content="/img${path}.jpg"></head><body>…</body></html>`);
    }
    if (path === '/pages/twitter') {
      return send('text/html', '<html><head><meta content="https://img.example.test/t.jpg" name="twitter:image"></head></html>');
    }
    if (path === '/pages/nue') return send('text/html', '<html><head><title>Rien</title></head></html>');
    if (path === '/slow') return void setTimeout(() => send('application/rss+xml', fx('rss2.xml')), 1500);
    res.writeHead(404);
    res.end('not found');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

/** fetch limité au serveur local : toute autre adresse est refusée (aucun vrai site). */
const asked: string[] = [];
const localFetch = ((input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  asked.push(url);
  return url.startsWith(base + '/') ? fetch(input, init) : Promise.reject(new Error('réseau extérieur interdit'));
}) as typeof fetch;

const feed = (path: string, title: string) => ({
  id: feedIdFor(base + path), url: base + path, title, categories: ['tech'], addedAt: '', status: 'active' as const,
});

async function writeSubs(paths: [string, string][]) {
  const subs: Subscriptions = {
    version: 1, updatedAt: '', categories: [{ id: 'tech', name: 'Tech', order: 0 }],
    feeds: paths.map(([p, t]) => feed(p, t)),
  };
  await mkdir(join(dir, 'state'), { recursive: true });
  await writeFile(join(dir, 'state/subscriptions.json'), JSON.stringify(subs));
  return subs;
}

const readJson = async <T>(p: string) => JSON.parse(await readFile(join(dir, p), 'utf8')) as T;
const now = new Date('2026-11-04T12:00:00Z');

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'filactu-'));
  for (const k of Object.keys(hits)) delete hits[k];
  asked.length = 0;
  return () => rm(dir, { recursive: true, force: true });
});

describe('collecteur', () => {
  test('EXG-070 · collecte RSS, Atom et RDF dans le fichier du jour', async () => {
    await writeSubs([['/rss2.xml', 'R'], ['/atom.xml', 'A'], ['/rdf.xml', 'D']]);
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(stats).toMatchObject({ feeds: 3, ok: 3, errors: 0, newItems: 6 });
    const day = await readJson<DayFile>('items/2026-11-04.json');
    expect(day.items).toHaveLength(6);
    expect(day.items.every((i) => i.fetched === now.toISOString())).toBe(true);
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.lastRun).toBe(now.toISOString());
    expect(status.feeds[feedIdFor(base + '/rss2.xml')]).toMatchObject({ failures: 0, etag: '"v1"', title: "Blog d'exemple" });
  });

  test('EXG-077 · une deuxième collecte n’ajoute aucun doublon (et respecte ETag)', async () => {
    await writeSubs([['/rss2.xml', 'R'], ['/atom.xml', 'A']]);
    await collect({ dataDir: dir, now, fetchImpl: localFetch });
    const later = new Date('2026-11-04T12:15:00Z');
    const stats = await collect({ dataDir: dir, now: later, fetchImpl: localFetch });
    expect(stats).toMatchObject({ notModified: 1, ok: 1, newItems: 0 });
    const day = await readJson<DayFile>('items/2026-11-04.json');
    expect(day.items).toHaveLength(5);
  });

  test('EXG-070 · un fil en erreur ou trop lent ne bloque pas les autres', async () => {
    await writeSubs([['/404', 'X'], ['/slow', 'S'], ['/broken.xml', 'B'], ['/atom.xml', 'A']]);
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch, timeoutMs: 300 });
    expect(stats).toMatchObject({ ok: 1, errors: 3, newItems: 2 });
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.feeds[feedIdFor(base + '/404')].lastError).toBe('HTTP 404');
    expect(status.feeds[feedIdFor(base + '/slow')].lastError).toBe('Délai dépassé');
    expect(status.feeds[feedIdFor(base + '/broken.xml')].lastError).toBe('Aucun fil trouvé à cette adresse');
  });

  test('EXG-015 · les échecs consécutifs sont comptés puis remis à zéro', async () => {
    await writeSubs([['/404', 'X']]);
    for (let i = 0; i < 3; i++) await collect({ dataDir: dir, now, fetchImpl: localFetch });
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.feeds[feedIdFor(base + '/404')].failures).toBe(3);
  });

  test('EXG-011 · une adresse de site est résolue vers son fil', async () => {
    await writeSubs([['/site', 'Site']]);
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(stats).toMatchObject({ ok: 1, discovered: 1, newItems: 3 });
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.feeds[feedIdFor(base + '/site')].resolvedUrl).toBe(base + '/rss2.xml');
    // la collecte suivante interroge directement le fil trouvé
    await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(hits['/site']).toBe(1);
  });

  test('EXG-017 · une adresse de playlist YouTube est collectée via le fil officiel', async () => {
    const page = 'https://www.youtube.com/playlist?list=UUtest';
    const subs: Subscriptions = {
      version: 1, updatedAt: '', categories: [{ id: 'tech', name: 'Tech', order: 0 }],
      feeds: [{ id: feedIdFor(page), url: page, title: '', categories: ['tech'], addedAt: '', status: 'pending' }],
    };
    await mkdir(join(dir, 'state'), { recursive: true });
    await writeFile(join(dir, 'state/subscriptions.json'), JSON.stringify(subs));
    const asked: string[] = [];
    const fakeFetch = (async (input: string | URL | Request) => {
      const url = String(input);
      asked.push(url);
      return url === 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUtest'
        ? new Response(fx('youtube.xml'), { status: 200, headers: { 'content-type': 'application/atom+xml' } })
        : new Response('<html>page</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    }) as typeof fetch;
    const stats = await collect({ dataDir: dir, now, fetchImpl: fakeFetch });
    expect(stats).toMatchObject({ ok: 1, errors: 0, newItems: 1 });
    expect(asked).toEqual(['https://www.youtube.com/feeds/videos.xml?playlist_id=UUtest']);
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.feeds[feedIdFor(page)]).toMatchObject({
      resolvedUrl: 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUtest',
      title: 'Chaîne de test',
    });
  });

  test('EXG-072 · les fichiers de plus de 30 jours sont supprimés', async () => {
    await writeSubs([]);
    await mkdir(join(dir, 'items'), { recursive: true });
    await writeFile(join(dir, 'items/2026-10-01.json'), JSON.stringify({ date: '2026-10-01', items: [] }));
    await writeFile(join(dir, 'items/2026-10-20.json'), JSON.stringify({ date: '2026-10-20', items: [] }));
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(stats.purgedDays).toBe(1);
    expect((await readdir(join(dir, 'items'))).sort()).toEqual(['2026-10-20.json']);
  });

  test('EXG-070 · sans abonnements, la collecte se termine sans erreur', async () => {
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(stats.feeds).toBe(0);
  });

  test('DEC-03 · les journaux ne contiennent ni adresse ni titre', async () => {
    await writeSubs([['/rss2.xml', 'Titre secret'], ['/404', 'Autre secret']]);
    const lines: string[] = [];
    await collect({ dataDir: dir, now, fetchImpl: localFetch, log: (l) => lines.push(l) });
    const out = lines.join('\n');
    expect(out).toMatch(/2 fils/);
    expect(out).not.toMatch(/127\.0\.0\.1|http|example|secret|Blog|Premier|rss2/i);
  });

  test('EXG-079 · sans image dans le fil, l’image de partage de la page est retenue', async () => {
    await writeSubs([['/sans-image.xml', 'J']]);
    const lines: string[] = [];
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch, log: (l) => lines.push(l) });
    expect(stats).toMatchObject({ ok: 1, errors: 0, newItems: 5, pageImages: 2 });
    const day = await readJson<DayFile>('items/2026-11-04.json');
    const image = (t: string) => day.items.find((i) => i.title.startsWith(t))?.image;
    expect(image('Article avec og:image')).toBe(base + '/img/pages/og.jpg');
    expect(image('Article avec twitter:image')).toBe('https://img.example.test/t.jpg');
    expect(image('Article dont la page est introuvable')).toBeUndefined();
    expect(image('Article dont la page n')).toBeUndefined();
    expect(image('Article qui a déjà')).toBe('https://img.example.test/fil.jpg');
    // la page d'un article qui a déjà son image n'est pas téléchargée
    expect(hits['/pages/deja']).toBeUndefined();
    // une page introuvable ne met pas le fil en erreur
    const status = await readJson<FeedsStatus>('meta/feeds-status.json');
    expect(status.feeds[feedIdFor(base + '/sans-image.xml')]).toMatchObject({ failures: 0 });
    expect(status.feeds[feedIdFor(base + '/sans-image.xml')].lastError).toBeUndefined();
    // journaux : un simple nombre (DEC-03)
    const out = lines.join('\n');
    expect(out).toMatch(/2 vignettes trouvées sur les pages/);
    expect(out).not.toMatch(/127\.0\.0\.1|http|example|\.jpg|Journal sans|Article avec|og:image/);
  });

  test('EXG-079 · seuls les articles nouveaux sont concernés', async () => {
    await writeSubs([['/sans-image.xml', 'J']]);
    await collect({ dataDir: dir, now, fetchImpl: localFetch });
    const before = hits['/pages/og'];
    const stats = await collect({ dataDir: dir, now: new Date('2026-11-04T12:15:00Z'), fetchImpl: localFetch });
    expect(stats).toMatchObject({ newItems: 0, pageImages: 0 });
    expect(hits['/pages/og']).toBe(before);
  });

  test('EXG-079 · au plus 20 pages par fil et par collecte', async () => {
    await writeSubs([['/beaucoup.xml', 'B']]);
    const stats = await collect({ dataDir: dir, now, fetchImpl: localFetch });
    expect(stats).toMatchObject({ newItems: 25, pageImages: 20 });
    expect(asked.filter((u) => u.includes('/pages/'))).toHaveLength(20);
    const day = await readJson<DayFile>('items/2026-11-04.json');
    expect(day.items.filter((i) => i.image)).toHaveLength(20);
  });

  test('EXG-079 · une page trop lente est abandonnée sans bloquer la collecte', async () => {
    const xml = '<?xml version="1.0"?><rss version="2.0"><channel><title>L</title>' +
      '<item><title>Lent</title><link>https://lent.example.test/a</link></item></channel></rss>';
    await writeSubs([['/lent.xml', 'L']]);
    const slowFetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === base + '/lent.xml') return Promise.resolve(new Response(xml, { status: 200 }));
      // la page de l'article ne répond jamais : seul le délai l'interrompt
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError'))));
    }) as typeof fetch;
    const stats = await collect({ dataDir: dir, now, fetchImpl: slowFetch, timeoutMs: 200 });
    expect(stats).toMatchObject({ ok: 1, errors: 0, newItems: 1, pageImages: 0 });
  });
});
