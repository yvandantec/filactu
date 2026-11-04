// Accès au dépôt de données via l'API GitHub (DEC-07 : la clé ne part que vers api.github.com)

export const API = 'https://api.github.com';
export const APP_REPO = 'filactu';
export const COLLECT_WORKFLOW = 'collect.yml';

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export class ConflictError extends GitHubError {}

export interface RemoteFile<T> {
  data: T;
  sha: string;
}

export interface DirEntry {
  name: string;
  path: string;
  sha: string;
}

function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class GitHubClient {
  constructor(
    private token: string,
    public owner: string,
    public repo: string,
    private fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  private async call(method: string, path: string, body?: unknown): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(API + path, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new GitHubError(0, 'Pas de connexion réseau');
    }
    if (res.status === 401) throw new GitHubError(401, 'Clé refusée par GitHub (invalide ou expirée)');
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      throw new GitHubError(403, 'Limite de requêtes GitHub atteinte, réessayez dans quelques minutes');
    }
    return res;
  }

  private repoPath(p: string): string {
    return `/repos/${this.owner}/${this.repo}/${p}`;
  }

  /** Vérifie l'accès au dépôt de données (EXG-001). */
  async checkAccess(): Promise<void> {
    const res = await this.call('GET', `/repos/${this.owner}/${this.repo}`);
    if (res.status === 404) {
      throw new GitHubError(404, `Dépôt ${this.owner}/${this.repo} introuvable, ou la clé n'y a pas accès`);
    }
    if (!res.ok) throw new GitHubError(res.status, `GitHub a répondu ${res.status}`);
    const info = (await res.json()) as { permissions?: { push?: boolean } };
    if (info.permissions && !info.permissions.push) {
      throw new GitHubError(403, 'Droit manquant : « Contents : Read and write » sur le dépôt de données');
    }
  }

  async getFile<T>(path: string): Promise<RemoteFile<T> | null> {
    const res = await this.call('GET', this.repoPath(`contents/${path}`));
    if (res.status === 404) return null;
    if (!res.ok) throw new GitHubError(res.status, `Lecture impossible (${res.status})`);
    const meta = (await res.json()) as { sha: string; content?: string; encoding?: string };
    let content = meta.content ?? '';
    if (meta.encoding !== 'base64' || !content) {
      // Fichier de plus de 1 Mo : passage par l'API blobs
      const blob = await this.call('GET', this.repoPath(`git/blobs/${meta.sha}`));
      if (!blob.ok) throw new GitHubError(blob.status, `Lecture impossible (${blob.status})`);
      content = ((await blob.json()) as { content: string }).content;
    }
    return { data: JSON.parse(b64decode(content)) as T, sha: meta.sha };
  }

  async listDir(path: string): Promise<DirEntry[]> {
    const res = await this.call('GET', this.repoPath(`contents/${path}`));
    if (res.status === 404) return [];
    if (!res.ok) throw new GitHubError(res.status, `Lecture impossible (${res.status})`);
    const list = (await res.json()) as DirEntry[];
    return Array.isArray(list) ? list.map(({ name, path: p, sha }) => ({ name, path: p, sha })) : [];
  }

  async putFile(path: string, data: unknown, sha: string | undefined, message: string): Promise<string> {
    const res = await this.call('PUT', this.repoPath(`contents/${path}`), {
      message,
      content: b64encode(JSON.stringify(data, null, 1) + '\n'),
      ...(sha ? { sha } : {}),
    });
    if (res.status === 409 || res.status === 422) throw new ConflictError(res.status, 'Conflit d’écriture');
    if (res.status === 403 || res.status === 404) {
      throw new GitHubError(res.status, 'Droit manquant : « Contents : Read and write » sur le dépôt de données');
    }
    if (!res.ok) throw new GitHubError(res.status, `Écriture impossible (${res.status})`);
    return ((await res.json()) as { content: { sha: string } }).content.sha;
  }

  /** Lit, transforme et réécrit un fichier en gérant les conflits (EXG-075). */
  async update<T>(path: string, mutate: (current: T | undefined) => T, message: string, attempts = 4): Promise<RemoteFile<T>> {
    for (let i = 0; ; i++) {
      const cur = await this.getFile<T>(path);
      const next = mutate(cur?.data);
      try {
        const sha = await this.putFile(path, next, cur?.sha, message);
        return { data: next, sha };
      } catch (e) {
        if (!(e instanceof ConflictError) || i >= attempts - 1) throw e;
      }
    }
  }

  /** Lance une collecte immédiate (EXG-071). */
  async dispatchCollect(): Promise<void> {
    const res = await this.call('POST', `/repos/${this.owner}/${APP_REPO}/actions/workflows/${COLLECT_WORKFLOW}/dispatches`, {
      ref: 'main',
    });
    if (res.status === 403 || res.status === 404) {
      throw new GitHubError(res.status, 'Droit manquant : « Actions : Read and write » sur le dépôt filactu');
    }
    if (!res.ok) throw new GitHubError(res.status, `Collecte impossible à lancer (${res.status})`);
  }
}
