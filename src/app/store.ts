import { clear, get, set } from 'idb-keyval';
import { dayFromPath, dayPath, expiredDays, flattenDays } from '../core/items';
import { mergeImport, parseOpml, exportOpml, type ImportStats } from '../core/opml';
import {
  addFeed, createCategory, deleteCategory, fillMissingIcons, moveCategory, removeFeed, updateCategory, updateFeed,
  type DeleteMode, type NewFeed,
} from '../core/subscriptions';
import {
  diffReading, getPref, isEmptyDelta, isRead, isSaved, markAllBefore, markManyRead, markManyUnread, markRead,
  mergeReading, pruneReading, setPref, setSaved,
} from '../core/reading';
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
export const AUTO_COLLECT_AFTER_MS = 20 * 60_000; // EXG-078
export const AUTO_COLLECT_EVERY_MS = 15 * 60_000;

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
  toast?: Toast;
  lastSync?: string;
  offline: boolean;
}

export interface Toast {
  message: string;
  action?: { label: string; run: () => void };
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
    offline: false,
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

  toast(message: string, action?: Toast['action'], durationMs = 4000) {
    const t: Toast = { message, action };
    this.setState({ toast: t });
    setTimeout(() => {
      if (this.state.toast === t) this.setState({ toast: undefined });
    }, durationMs);
  }

  dismissToast() {
    this.setState({ toast: undefined });
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
        offline: false,
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
      void this.autoCollect();
    } catch (e) {
      // Hors connexion : on garde les articles en cache, sans message d'erreur (EXG-074)
      if (e instanceof GitHubError && e.status === 0) this.setState({ loading: false, offline: true });
      else this.setState({ loading: false, error: errorText(e) });
    }
  }

  /**
   * GitHub espace en pratique les collectes planifiées de plusieurs heures :
   * l'appli lance elle-même une collecte si la dernière date de plus de 20 minutes (EXG-078).
   */
  private async autoCollect(): Promise<void> {
    const { subs, status } = this.state;
    if (!subs.feeds.length) return;
    const now = Date.now();
    const last = status.lastRun ? Date.parse(status.lastRun) : 0;
    if (now - last < AUTO_COLLECT_AFTER_MS) return;
    const lastAsk = (await safeGet<number>('lastAutoCollect')) ?? 0;
    if (now - lastAsk < AUTO_COLLECT_EVERY_MS) return;
    await safeSet('lastAutoCollect', now);
    await this.collectNow(true);
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
    let offlineRetry = false;
    this.flushing = (async () => {
      try {
        const res = await client.update<ReadingState>(
          PATHS.reading,
          (remote) => pruneReading(mergeReading(remote, local), new Date()),
          'FilActu : état de lecture',
        );
        this.remoteReading = res.data;
        const merged = mergeReading(this.state.reading, res.data);
        this.setState({ reading: merged, lastSync: new Date().toISOString(), offline: false });
        await Promise.all([safeSet('reading', merged), safeSet('remoteReading', res.data)]);
      } catch (e) {
        // Hors connexion : l'action reste en attente et sera renvoyée (EXG-074)
        if (e instanceof GitHubError && e.status === 0) {
          this.setState({ offline: true });
          offlineRetry = true;
        } else this.setState({ error: errorText(e) });
      } finally {
        this.flushing = undefined;
      }
    })();
    await this.flushing;
    // Hors connexion, on attend le retour du réseau (événement « online ») plutôt que de réessayer en boucle
    if (!offlineRetry && !isEmptyDelta(diffReading(this.remoteReading, this.state.reading))) this.scheduleFlush();
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

  /**
   * Tout marquer lu dans une vue (EXG-043) : tout, ou seulement les articles de plus d'un jour / d'une semaine.
   * Une notification « Annuler » reste affichée 10 secondes.
   */
  markAll(view: ViewId, olderThanDays: 0 | 1 | 7, viewItems: Item[]) {
    const now = new Date();
    const before = new Date(now.getTime() - olderThanDays * 86400_000);
    const { reading, subs } = this.state;
    const affected = viewItems.filter((i) => !isRead(reading, i, subs) && i.fetched <= before.toISOString()).map((i) => i.id);
    if (!affected.length) {
      this.toast('Aucun article à marquer comme lu');
      return;
    }
    const key = view === 'today' || view === 'saved' ? 'all' : view;
    // « Aujourd'hui » : seuls les articles affichés sont marqués, pas tout l'historique
    const next = view === 'today' ? markManyRead(reading, affected, now) : markAllBefore(reading, key, before);
    this.updateReading(next);
    const n = affected.length;
    this.toast(
      `${n} article${n > 1 ? 's' : ''} marqué${n > 1 ? 's' : ''} comme lu${n > 1 ? 's' : ''}`,
      { label: 'Annuler', run: () => this.updateReading(markManyUnread(this.state.reading, affected)) },
      10_000,
    );
  }

  /** Marque lus des articles sortis de l'écran par le haut (EXG-041). */
  markIdsRead(ids: string[]) {
    const todo = ids.filter((id) => !this.state.reading.read[id] || this.state.reading.unread[id]);
    if (todo.length) this.updateReading(markManyRead(this.state.reading, todo));
  }

  /** À lire plus tard (EXG-050). */
  toggleSaved(item: Item) {
    const saved = isSaved(this.state.reading, item.id);
    this.updateReading(setSaved(this.state.reading, item, !saved));
    this.toast(saved ? 'Retiré de « À lire plus tard »' : 'Ajouté à « À lire plus tard »');
  }

  /** Préférence synchronisée entre appareils (affichage, filtres, thème…). */
  setPref(key: string, value: unknown) {
    this.updateReading(setPref(this.state.reading, key, value));
  }

  pref<T>(key: string, fallback: T): T {
    return getPref(this.state.reading, key, fallback);
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

  /**
   * Applique une opération sur les abonnements, rejouée sur la version distante en cas de conflit.
   * Renvoie true si l'opération a réussi ; sinon le message d'erreur est dans state.error.
   */
  private async mutateSubs(op: (s: Subscriptions) => Subscriptions, message: string): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    // Validation immédiate sur l'état local (message d'erreur sans attendre le réseau)
    try {
      op(this.state.subs);
    } catch (e) {
      this.setState({ error: errorText(e) });
      return false;
    }
    this.setState({ loading: true, error: undefined });
    try {
      const res = await client.update<Subscriptions>(PATHS.subs, (cur) => op(cur ?? emptySubscriptions()), message);
      this.setState({ subs: res.data, loading: false });
      void safeSet('subs', res.data);
      return true;
    } catch (e) {
      this.setState({ loading: false, error: errorText(e) });
      return false;
    }
  }

  /** Ajout d'un abonnement (EXG-011). */
  async addFeed(input: NewFeed): Promise<boolean> {
    const ok = await this.mutateSubs((s) => addFeed(s, input).subs, 'FilActu : nouvel abonnement');
    if (ok) {
      this.toast('Abonnement ajouté : les articles arrivent d’ici une à deux minutes');
      void this.collectNow(true);
    }
    return ok;
  }

  /** Catégories (EXG-013, EXG-016). */
  createCategory(name: string, icon?: string) {
    return this.mutateSubs((s) => createCategory(s, name, icon).subs, 'FilActu : nouvelle catégorie');
  }

  updateCategory(id: string, patch: { name?: string; icon?: string | null }) {
    return this.mutateSubs((s) => updateCategory(s, id, patch), 'FilActu : catégorie modifiée');
  }

  async deleteCategory(id: string, mode: DeleteMode) {
    const ok = await this.mutateSubs((s) => deleteCategory(s, id, mode), 'FilActu : catégorie supprimée');
    if (ok && this.state.view === `category:${id}`) this.setView('today');
    return ok;
  }

  moveCategory(id: string, delta: -1 | 1) {
    return this.mutateSubs((s) => moveCategory(s, id, delta), 'FilActu : ordre des catégories');
  }

  /** Icônes suggérées pour les catégories qui n'en ont pas (EXG-018). */
  fillMissingIcons() {
    return this.mutateSubs((s) => fillMissingIcons(s), 'FilActu : icônes des catégories');
  }

  /** Renommer / déplacer un fil (EXG-012). */
  updateFeed(id: string, patch: { title?: string; categories?: string[] }) {
    return this.mutateSubs((s) => updateFeed(s, id, patch), 'FilActu : fil modifié');
  }

  /** Se désabonner d'un fil (EXG-012). */
  async removeFeed(id: string) {
    const ok = await this.mutateSubs((s) => removeFeed(s, id), 'FilActu : désabonnement');
    if (ok && this.state.view === `feed:${id}`) this.setView('today');
    if (ok) this.toast('Abonnement supprimé');
    return ok;
  }

  /** Marque lus les articles affichés sur la page (EXG-045). */
  markPageRead(items: Item[]) {
    const ids = items.filter((i) => !isRead(this.state.reading, i, this.state.subs)).map((i) => i.id);
    if (ids.length) this.updateReading(markManyRead(this.state.reading, ids));
  }

  exportOpml(): string {
    return exportOpml(this.state.subs);
  }

  /** Demande une collecte immédiate au robot GitHub. */
  async collectNow(silent = false): Promise<void> {
    const client = this.client;
    if (!client) return;
    try {
      const requested = new Date().toISOString();
      await client.dispatchCollect();
      if (!silent) this.toast('Collecte demandée : les nouveaux articles arrivent d’ici une à deux minutes');
      // Rechargement automatique, puis message si la collecte tarde (EXG-071)
      setTimeout(() => void this.refresh(), 75_000);
      setTimeout(() => {
        void this.refresh().then(() => {
          if (!silent && !((this.state.status.lastRun ?? '') > requested)) {
            this.toast('La collecte n’est pas encore terminée : GitHub est peut-être chargé. Réessayez dans quelques minutes.');
          }
        });
      }, 180_000);
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
