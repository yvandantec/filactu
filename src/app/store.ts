import { clear, get, set } from 'idb-keyval';
import { dayFromPath, dayPath, expiredDays, flattenDays } from '../core/items';
import { mergeImport, parseOpml, exportOpml, type ImportStats } from '../core/opml';
import { diffReading, isEmptyDelta, isRead, markAllBefore, markRead, mergeReading, pruneReading } from '../core/reading';
import {
  emptyReading,
  emptySubscriptions,
  type DayFile,
  type FeedsStatus,
  type Item,
  type ReadingState,
  type Subscriptions,
} from '../core/types';
import type { ViewId } from '../core/views';
import { GitHubClient, GitHubError } from './github';

export const DEFAULT_DATA_REPO = 'yvandantec/filactu-data';
export const FLUSH_DELAY_MS = 2000; // EXG-073 : envoi au plus tard 5 s après l'action
export const POLL_MS = 120_000; // EXG-076
export const STALE_COLLECT_MS = 2 * 3600_000;

const PATHS = {
  subs: 'state/subscriptions.json',
  reading: 'state/reading.json',
  status: 'meta/feeds-status.json',
};

export interface Config {
  token: string;
  owner: string;
  repo: string;
}

interface CachedDays {
  [key: string]: { sha: string; items: Item[] };
}

export interface AppState {
  phase: 'boot' | 'setup' | 'ready';
  config?: Config;
  subs: Subscriptions;
  status: FeedsStatus;
  reading: ReadingState;
  items: Item[];
  view: ViewId;
  loading: boolean;
  error?: string;
  toast?: string;
  lastSync?: string;
}

type Listener = (s: AppState) => void;

export class Store {
  state: AppState = {
    phase: 'boot',
    subs: emptySubscriptions(),
    status: { feeds: {} },
    reading: emptyReading(),
    items: [],
    view: 'today',
    loading: false,
  };
  private listeners = new Set<Listener>();
  private client?: GitHubClient;
  private remoteReading: ReadingState = emptyReading();
  private days: CachedDays = {};
  private flushTimer?: ReturnType<typeof setTimeout>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private flushing?: Promise<void>;

  constructor(private makeClient = (c: Config) => new GitHubClient(c.token, c.owner, c.repo)) {}

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setState(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  toast(message: string) {
    this.setState({ toast: message });
    setTimeout(() => {
      if (this.state.toast === message) this.setState({ toast: undefined });
    }, 4000);
  }

  // ---------- Démarrage et connexion (EXG-001, EXG-002) ----------

  async boot(): Promise<void> {
    const config = await safeGet<Config>('config');
    if (!config) return this.setState({ phase: 'setup' });
    this.client = this.makeClient(config);
    const [subs, status, reading, remoteReading, days, view] = await Promise.all([
      safeGet<Subscriptions>('subs'),
      safeGet<FeedsStatus>('status'),
      safeGet<ReadingState>('reading'),
      safeGet<ReadingState>('remoteReading'),
      safeGet<CachedDays>('days'),
      safeGet<ViewId>('view'),
    ]);
    this.days = days ?? {};
    this.remoteReading = remoteReading ?? emptyReading();
    this.setState({
      phase: 'ready',
      config,
      subs: subs ?? emptySubscriptions(),
      status: status ?? { feeds: {} },
      reading: reading ?? emptyReading(),
      items: flattenDays(Object.entries(this.days).map(([date, d]) => ({ date, items: d.items }))),
      view: view ?? 'today',
    });
    this.startBackground();
    await this.refresh();
  }

  async connect(token: string, repoFull: string): Promise<void> {
    const [owner, repo] = repoFull.trim().split('/');
    if (!token.trim() || !owner || !repo) {
      this.setState({ error: 'Renseignez la clé et le dépôt sous la forme propriétaire/nom' });
      return;
    }
    const config: Config = { token: token.trim(), owner, repo };
    const client = this.makeClient(config);
    this.setState({ loading: true, error: undefined });
    try {
      await client.checkAccess();
    } catch (e) {
      this.setState({ loading: false, error: errorText(e) });
      return;
    }
    this.client = client;
    await set('config', config);
    this.setState({ phase: 'ready', config, loading: false });
    this.startBackground();
    await this.refresh();
  }

  async disconnect(): Promise<void> {
    this.stopBackground();
    await clear();
    this.client = undefined;
    this.days = {};
    this.remoteReading = emptyReading();
    this.setState({
      phase: 'setup',
      config: undefined,
      subs: emptySubscriptions(),
      status: { feeds: {} },
      reading: emptyReading(),
      items: [],
      view: 'today',
      error: undefined,
    });
  }

  private startBackground() {
    this.stopBackground();
    this.pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.refresh();
    }, POLL_MS);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('online', this.onOnline);
  }

  private stopBackground() {
    clearInterval(this.pollTimer);
    clearTimeout(this.flushTimer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('online', this.onOnline);
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') void this.flush();
    else void this.refresh();
  };

  private onOnline = () => void this.flush().then(() => this.refresh());

  // ---------- Synchronisation ----------

  async refresh(): Promise<void> {
    const client = this.client;
    if (!client) return;
    this.setState({ loading: true });
    try {
      const [subs, status, reading, listing] = await Promise.all([
        client.getFile<Subscriptions>(PATHS.subs),
        client.getFile<FeedsStatus>(PATHS.status),
        client.getFile<ReadingState>(PATHS.reading),
        client.listDir('items'),
      ]);

      // Articles : on ne télécharge que les jours nouveaux ou modifiés (DEC-04)
      const remoteDays = new Map<string, string>();
      for (const e of listing) {
        const k = dayFromPath(e.name);
        if (k) remoteDays.set(k, e.sha);
      }
      const expired = new Set(expiredDays([...remoteDays.keys()], new Date()));
      const nextDays: CachedDays = {};
      await Promise.all(
        [...remoteDays].filter(([k]) => !expired.has(k)).map(async ([k, sha]) => {
          const cached = this.days[k];
          if (cached && cached.sha === sha) {
            nextDays[k] = cached;
            return;
          }
          const f = await client.getFile<DayFile>(dayPath(k));
          if (f) nextDays[k] = { sha: f.sha, items: f.data.items };
        }),
      );
      this.days = nextDays;

      this.remoteReading = reading?.data ?? emptyReading();
      const merged = mergeReading(this.state.reading, this.remoteReading);
      const nextState = {
        subs: subs?.data ?? emptySubscriptions(),
        status: status?.data ?? { feeds: {} },
        reading: merged,
        items: flattenDays(Object.entries(nextDays).map(([date, d]) => ({ date, items: d.items }))),
        lastSync: new Date().toISOString(),
        loading: false,
        error: undefined,
      };
      this.setState(nextState);
      await Promise.all([
        safeSet('subs', nextState.subs),
        safeSet('status', nextState.status),
        safeSet('reading', merged),
        safeSet('remoteReading', this.remoteReading),
        safeSet('days', nextDays),
      ]);
      if (!isEmptyDelta(diffReading(this.remoteReading, merged))) this.scheduleFlush();
    } catch (e) {
      this.setState({ loading: false, error: errorText(e) });
    }
  }

  private scheduleFlush() {
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DELAY_MS);
  }

  /** Envoie l'état de lecture local au dépôt (EXG-073, EXG-075). */
  async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    const client = this.client;
    if (!client) return;
    clearTimeout(this.flushTimer);
    const local = this.state.reading;
    if (isEmptyDelta(diffReading(this.remoteReading, local))) return;
    this.flushing = (async () => {
      try {
        const res = await client.update<ReadingState>(
          PATHS.reading,
          (remote) => pruneReading(mergeReading(remote, local), new Date()),
          'FilActu : état de lecture',
        );
        this.remoteReading = res.data;
        const merged = mergeReading(this.state.reading, res.data);
        this.setState({ reading: merged, lastSync: new Date().toISOString() });
        await Promise.all([safeSet('reading', merged), safeSet('remoteReading', res.data)]);
      } catch (e) {
        // Hors connexion : l'action reste en attente et sera renvoyée (EXG-074)
        if (!(e instanceof GitHubError && e.status === 0)) this.setState({ error: errorText(e) });
      } finally {
        this.flushing = undefined;
      }
    })();
    await this.flushing;
    if (!isEmptyDelta(diffReading(this.remoteReading, this.state.reading))) this.scheduleFlush();
  }

  private updateReading(next: ReadingState) {
    this.setState({ reading: next });
    void safeSet('reading', next);
    this.scheduleFlush();
  }

  // ---------- Actions utilisateur ----------

  setView(view: ViewId) {
    this.setState({ view });
    void safeSet('view', view);
  }

  /** Ouverture d'un article : marqué lu (EXG-033, EXG-040). */
  open(item: Item) {
    if (!isRead(this.state.reading, item, this.state.subs)) {
      this.updateReading(markRead(this.state.reading, item.id, true));
    }
  }

  setRead(item: Item, read: boolean) {
    this.updateReading(markRead(this.state.reading, item.id, read));
  }

  markViewRead(view: ViewId) {
    const key = view === 'today' || view === 'saved' ? 'all' : view;
    this.updateReading(markAllBefore(this.state.reading, key, new Date()));
  }

  async importOpml(text: string): Promise<ImportStats | undefined> {
    const client = this.client;
    if (!client) return;
    let parsed;
    try {
      parsed = parseOpml(text);
    } catch (e) {
      this.setState({ error: errorText(e) });
      return;
    }
    this.setState({ loading: true });
    try {
      let stats: ImportStats = { feedsAdded: 0, categoriesAdded: 0, ignored: 0 };
      const res = await client.update<Subscriptions>(
        PATHS.subs,
        (cur) => {
          const r = mergeImport(cur ?? emptySubscriptions(), parsed);
          stats = r.stats;
          return r.subs;
        },
        'FilActu : import OPML',
      );
      this.setState({ subs: res.data, loading: false, error: undefined });
      void safeSet('subs', res.data);
      this.toast(`${stats.feedsAdded} fils et ${stats.categoriesAdded} catégories importés, ${stats.ignored} déjà présents`);
      void this.collectNow(true);
      return stats;
    } catch (e) {
      this.setState({ loading: false, error: errorText(e) });
    }
  }

  exportOpml(): string {
    return exportOpml(this.state.subs);
  }

  /** Demande une collecte immédiate au robot GitHub. */
  async collectNow(silent = false): Promise<void> {
    const client = this.client;
    if (!client) return;
    try {
      await client.dispatchCollect();
      if (!silent) this.toast('Collecte demandée : les nouveaux articles arrivent d’ici une à deux minutes');
    } catch (e) {
      if (!silent) this.toast(errorText(e));
    }
  }

  clearError() {
    this.setState({ error: undefined });
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Erreur inattendue';
}

async function safeGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await get(key)) as T | undefined;
  } catch {
    return undefined;
  }
}

async function safeSet(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
  } catch {
    /* stockage indisponible : l'appli reste utilisable en ligne */
  }
}
