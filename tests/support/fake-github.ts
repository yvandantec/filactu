// Faux GitHub en mémoire pour les tests de bout en bout (voir STRATEGIE-TESTS.md § 1).
// Imite : GET /repos/{o}/{r}, GET/PUT contents (sha + conflits 409), POST workflow dispatches.
import type { BrowserContext, Page, Route } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const GOOD_TOKEN = 'github_pat_TEST_ok';
export const READONLY_TOKEN = 'github_pat_TEST_readonly';

interface StoredFile {
  content: string;
  sha: string;
}

export class FakeGitHub {
  files = new Map<string, StoredFile>();
  dispatches = 0;
  writes: string[] = [];
  offline = false;
  /** Prochaines écritures à faire échouer en conflit (simulation d'un autre appareil). */
  forceConflicts = 0;
  /** Délai de réponse simulé (réseau lent), en millisecondes. */
  delayMs = 0;
  /** Appelé à chaque demande de collecte (pour simuler le robot qui termine). */
  onDispatch?: () => void;

  constructor(public owner = 'yvandantec', public repo = 'filactu-data') {}

  set(path: string, data: unknown) {
    const content = JSON.stringify(data);
    this.files.set(path, { content, sha: sha(content) });
  }

  get<T>(path: string): T | undefined {
    const f = this.files.get(path);
    return f ? (JSON.parse(f.content) as T) : undefined;
  }

  async install(target: Page | BrowserContext) {
    await target.route('https://api.github.com/**', (route) => this.handle(route));
    // Aucun vrai site n'est contacté : images et articles des fils de test sont simulés
    await target.route(/^https?:\/\/[^/]*example\.test\//, (route) => {
      const type = route.request().resourceType();
      if (type === 'document') return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Article</title><h1>Article</h1>' });
      if (type === 'image' && route.request().url().startsWith('https://img.example.test/')) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: readFileSync('public/icons/icon-192.png') });
      }
      return route.fulfill({ status: 404, body: '' });
    });
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  }

  private async handle(route: Route) {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.offline) return route.abort('internetdisconnected');
    const req = route.request();
    const auth = req.headers()['authorization'] ?? '';
    const token = auth.replace(/^Bearer /, '');
    if (token !== GOOD_TOKEN && token !== READONLY_TOKEN) return this.json(route, 401, { message: 'Bad credentials' });

    const url = new URL(req.url());
    const prefix = `/repos/${this.owner}/${this.repo}`;
    const method = req.method();

    if (method === 'GET' && url.pathname === prefix) {
      return this.json(route, 200, { full_name: `${this.owner}/${this.repo}`, permissions: { push: token === GOOD_TOKEN, pull: true } });
    }
    if (method === 'POST' && /\/repos\/[^/]+\/filactu\/actions\/workflows\/collect\.yml\/dispatches$/.test(url.pathname)) {
      this.dispatches++;
      this.onDispatch?.();
      return route.fulfill({ status: 204 });
    }
    if (!url.pathname.startsWith(prefix + '/contents/')) return this.json(route, 404, { message: 'Not Found' });
    const path = decodeURIComponent(url.pathname.slice(prefix.length + '/contents/'.length));

    if (method === 'GET') {
      const f = this.files.get(path);
      if (f) {
        return this.json(route, 200, {
          name: path.split('/').pop(), path, sha: f.sha, encoding: 'base64',
          content: Buffer.from(f.content, 'utf8').toString('base64'),
        });
      }
      const children = [...this.files.entries()].filter(([p]) => p.startsWith(path + '/') && !p.slice(path.length + 1).includes('/'));
      if (children.length) {
        return this.json(route, 200, children.map(([p, v]) => ({ name: p.split('/').pop(), path: p, sha: v.sha, type: 'file' })));
      }
      return this.json(route, 404, { message: 'Not Found' });
    }

    if (method === 'PUT') {
      if (token !== GOOD_TOKEN) return this.json(route, 403, { message: 'Resource not accessible' });
      const body = JSON.parse(req.postData() ?? '{}') as { content: string; sha?: string };
      const current = this.files.get(path);
      if (this.forceConflicts > 0 || (current && current.sha !== body.sha) || (!current && body.sha)) {
        if (this.forceConflicts > 0) this.forceConflicts--;
        return this.json(route, 409, { message: 'Conflict' });
      }
      const content = Buffer.from(body.content, 'base64').toString('utf8');
      const stored = { content, sha: sha(content) };
      this.files.set(path, stored);
      this.writes.push(path);
      return this.json(route, current ? 200 : 201, { content: { path, sha: stored.sha } });
    }

    return this.json(route, 405, { message: 'Method not allowed' });
  }
}

function sha(s: string) {
  return createHash('sha1').update(s).digest('hex');
}

/** Jeu de données de démonstration : 2 catégories, 3 fils, articles du jour. */
export function seed(gh: FakeGitHub, now = new Date(), extra = 0) {
  const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const day = iso(0).slice(0, 10);
  gh.set('state/subscriptions.json', {
    version: 1,
    updatedAt: iso(0),
    categories: [
      { id: 'tech', name: 'Tech', order: 0 },
      { id: 'actu', name: 'Actualités', order: 1 },
    ],
    feeds: [
      { id: 'f_blog', url: 'https://blog.example.test/rss', title: 'Blog Exemple', categories: ['tech'], addedAt: iso(0), status: 'active' },
      { id: 'f_atom', url: 'https://atom.example.test/feed', title: 'Journal Atom', categories: ['tech', 'actu'], addedAt: iso(0), status: 'active' },
      { id: 'f_news', url: 'https://news.example.test/rss', title: 'Nouvelles', categories: ['actu'], addedAt: iso(0), status: 'active' },
    ],
  });
  gh.set('meta/feeds-status.json', {
    lastRun: iso(5),
    feeds: { f_news: { failures: 3, lastError: 'HTTP 500', lastSuccess: iso(60 * 30) } },
  });
  const item = (id: string, feedId: string, title: string, minutesAgo: number, extra: object = {}) => ({
    id, feedId, title, link: `https://${feedId}.example.test/${id}`, published: iso(minutesAgo), fetched: iso(minutesAgo),
    summary: `Résumé de ${title}. Un texte de présentation de l'article.`, ...extra,
  });
  gh.set(`items/${day}.json`, {
    date: day,
    items: [
      item('i_1', 'f_blog', 'Premier article du blog', 10, { author: 'Alice', image: 'https://img.example.test/1.jpg' }),
      item('i_2', 'f_atom', 'Entrée Atom', 20),
      item('i_3', 'f_news', 'Une nouvelle', 30),
      item('i_4', 'f_blog', 'Deuxième article du blog', 40),
      // Articles supplémentaires pour les tests de défilement et d'affichage compact
      ...Array.from({ length: extra }, (_, n) =>
        item(`x_${n}`, 'f_news', `Article supplémentaire numéro ${n + 1} avec un titre de longueur moyenne`, 50 + n,
          { image: 'https://img.example.test/x.jpg' })),
    ],
  });
}
