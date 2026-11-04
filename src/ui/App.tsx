import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store, AppState } from '../app/store';
import { DEFAULT_DATA_REPO, STALE_COLLECT_MS } from '../app/store';
import { isRead } from '../core/reading';
import { ageLabel, itemsForView, unreadCounts, type UnreadCounts, type ViewId } from '../core/views';
import type { Feed, Item, Subscriptions, FeedsStatus } from '../core/types';
import {
  IconAlert, IconAll, IconBookmark, IconCheckAll, IconChevron, IconClose, IconDot, IconMenu,
  IconRefresh, IconSettings, IconToday, Logo,
} from './icons';

export function useStore(store: Store): AppState {
  const [s, set] = useState(store.state);
  useEffect(() => {
    const off = store.subscribe(set);
    set(store.state); // rattrape un changement survenu avant l'abonnement
    return off;
  }, [store]);
  return s;
}

const GUIDE_URL = 'https://github.com/yvandantec/filactu/blob/main/docs/GUIDE-UTILISATEUR.md';
const PAGE_SIZE = 150;

export function App({ store }: { store: Store }) {
  const s = useStore(store);
  if (s.phase === 'boot') return <div class="boot" aria-busy="true"><Logo size={56} /></div>;
  if (s.phase === 'setup') return <Setup store={store} state={s} />;
  return <Reader store={store} state={s} />;
}

// ---------- Premier lancement (EXG-001) ----------

function Setup({ store, state }: { store: Store; state: AppState }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(DEFAULT_DATA_REPO);
  return (
    <main class="setup">
      <form
        class="setup-card"
        onSubmit={(e) => {
          e.preventDefault();
          void store.connect(token, repo);
        }}
      >
        <div class="setup-brand"><Logo size={48} /><h1>FilActu</h1></div>
        <p class="setup-lead">Vos fils RSS, rangés par catégories, synchronisés sur tous vos appareils.</p>
        <label>
          Clé d’accès GitHub
          <input type="password" name="token" autocomplete="off" spellcheck={false} placeholder="github_pat_…"
            value={token} onInput={(e) => setToken(e.currentTarget.value)} required />
        </label>
        <label>
          Dépôt de données
          <input type="text" name="repo" spellcheck={false} value={repo} onInput={(e) => setRepo(e.currentTarget.value)} required />
        </label>
        {state.error && <p class="form-error" role="alert">{state.error}</p>}
        <button class="btn-primary" type="submit" disabled={state.loading}>
          {state.loading ? 'Vérification…' : 'Se connecter'}
        </button>
        <p class="setup-help">
          La clé reste sur cet appareil. <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Comment créer la clé ?</a>
        </p>
      </form>
    </main>
  );
}

// ---------- Lecteur ----------

function viewTitle(view: ViewId, subs: Subscriptions): string {
  if (view === 'today') return 'Aujourd’hui';
  if (view === 'all') return 'Tous les articles';
  if (view === 'saved') return 'À lire plus tard';
  if (view.startsWith('feed:')) return subs.feeds.find((f) => f.id === view.slice(5))?.title ?? 'Fil';
  return subs.categories.find((c) => c.id === view.slice(9))?.name ?? 'Catégorie';
}

function Reader({ store, state }: { store: Store; state: AppState }) {
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false);
  const now = new Date();
  const counts = useMemo(() => unreadCounts(state.items, state.subs, state.reading), [state.items, state.subs, state.reading]);
  const items = useMemo(
    () => itemsForView(state.view, state.items, state.subs, state.reading),
    [state.view, state.items, state.subs, state.reading],
  );
  const viewUnread =
    state.view === 'all' ? counts.all
    : state.view === 'today' ? counts.today
    : state.view === 'saved' ? 0
    : state.view.startsWith('feed:') ? counts.feeds[state.view.slice(5)] ?? 0
    : counts.categories[state.view.slice(9)] ?? 0;

  // Glisser depuis le bord gauche pour ouvrir le volet (EXG-021)
  useEffect(() => {
    let startX = -1;
    const down = (e: TouchEvent) => { startX = e.touches[0].clientX < 24 ? e.touches[0].clientX : -1; };
    const move = (e: TouchEvent) => { if (startX >= 0 && e.touches[0].clientX - startX > 60) { setDrawer(true); startX = -1; } };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); };
  }, []);

  const lastRun = state.status.lastRun;
  const stale = state.subs.feeds.length > 0 && lastRun && now.getTime() - Date.parse(lastRun) > STALE_COLLECT_MS;
  const feedsById = useMemo(() => new Map(state.subs.feeds.map((f) => [f.id, f])), [state.subs]);

  const go = (v: ViewId) => {
    store.setView(v);
    setDrawer(false);
    document.querySelector('.content')?.scrollTo(0, 0);
  };

  return (
    <div class={`app ${drawer ? 'drawer-open' : ''}`}>
      <Sidebar state={state} counts={counts} onGo={go} onSettings={() => { setSettings(true); setDrawer(false); }} />
      <div class="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
      <main class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" aria-label="Ouvrir le menu" onClick={() => setDrawer(true)}><IconMenu /></button>
          <div class="view-head">
            <h1 class="view-title">{viewTitle(state.view, state.subs)}</h1>
            {state.view !== 'saved' && <span class="view-count" data-testid="view-unread">{viewUnread} non lus</span>}
          </div>
          <div class="actions">
            {state.view !== 'saved' && (
              <button class="icon-btn" aria-label="Tout marquer comme lu" title="Tout marquer comme lu"
                disabled={viewUnread === 0}
                onClick={() => { if (confirm('Marquer tous les articles de cette vue comme lus ?')) store.markViewRead(state.view); }}>
                <IconCheckAll />
              </button>
            )}
            <button class={`icon-btn ${state.loading ? 'spin' : ''}`} aria-label="Actualiser" title="Actualiser"
              onClick={() => { void store.collectNow(); void store.refresh(); }}>
              <IconRefresh />
            </button>
          </div>
        </header>
        {state.error && (
          <div class="banner banner-error" role="alert">
            <span>{state.error}</span>
            <button class="icon-btn" aria-label="Fermer" onClick={() => store.clearError()}><IconClose /></button>
          </div>
        )}
        {stale && !state.error && (
          <div class="banner">La dernière collecte date de plus de 2 heures. Vérifiez le robot de collecte sur GitHub (voir le guide).</div>
        )}
        <section class="content" aria-live="polite">
          <ArticleList store={store} state={state} items={items} feedsById={feedsById} onSettings={() => setSettings(true)} />
        </section>
      </main>
      {settings && <Settings store={store} state={state} onClose={() => setSettings(false)} />}
      {state.toast && <div class="toast" role="status">{state.toast}</div>}
    </div>
  );
}

// ---------- Volet de navigation (EXG-020) ----------

function Count({ n }: { n: number | undefined }) {
  return n ? <span class="count">{n > 999 ? '999+' : n}</span> : null;
}

function Sidebar({ state, counts, onGo, onSettings }: {
  state: AppState; counts: UnreadCounts; onGo: (v: ViewId) => void; onSettings: () => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const cats = [...state.subs.categories].sort((a, b) => a.order - b.order);
  const savedCount = Object.values(state.reading.saved).filter((s) => !s.removed).length;
  const nav = (v: ViewId, label: string, icon: preact.JSX.Element, n?: number) => (
    <button class={`nav-item ${state.view === v ? 'active' : ''}`} onClick={() => onGo(v)} aria-current={state.view === v ? 'page' : undefined}>
      {icon}<span class="nav-label">{label}</span><Count n={n} />
    </button>
  );
  return (
    <aside class="sidebar" aria-label="Navigation">
      <div class="brand"><Logo /><span>FilActu</span></div>
      <nav class="nav-scroll">
        {nav('today', 'Aujourd’hui', <IconToday />, counts.today)}
        {nav('all', 'Tous les articles', <IconAll />, counts.all)}
        {nav('saved', 'À lire plus tard', <IconBookmark />, savedCount)}
        <h2 class="nav-heading">Catégories</h2>
        {cats.length === 0 && <p class="nav-empty">Aucun abonnement pour l’instant.</p>}
        {cats.map((c) => {
          const feeds = state.subs.feeds.filter((f) => f.categories.includes(c.id));
          const isOpen = open[c.id] ?? false;
          return (
            <div class="cat" key={c.id}>
              <div class={`nav-item cat-row ${state.view === `category:${c.id}` ? 'active' : ''}`}>
                <button class="chevron" aria-label={isOpen ? `Replier ${c.name}` : `Déplier ${c.name}`} aria-expanded={isOpen}
                  onClick={() => setOpen({ ...open, [c.id]: !isOpen })}>
                  <IconChevron class={isOpen ? 'rot' : ''} />
                </button>
                <button class="cat-name" onClick={() => onGo(`category:${c.id}`)}>
                  <span class="nav-label">{c.name}</span><Count n={counts.categories[c.id]} />
                </button>
              </div>
              {isOpen && feeds.map((f) => <FeedRow key={f.id} feed={f} state={state} n={counts.feeds[f.id]} onGo={onGo} />)}
            </div>
          );
        })}
      </nav>
      <button class="nav-item settings-btn" onClick={onSettings}><IconSettings /><span class="nav-label">Réglages</span></button>
    </aside>
  );
}

function FeedIcon({ feed, status }: { feed: Feed; status: FeedsStatus }) {
  const [broken, setBroken] = useState(false);
  const src = status.feeds[feed.id]?.favicon;
  if (src && !broken) {
    return <img class="favicon" src={src} alt="" loading="lazy" referrerpolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span class="favicon letter" aria-hidden="true">{(feed.title.trim()[0] ?? '?').toUpperCase()}</span>;
}

function FeedRow({ feed, state, n, onGo }: { feed: Feed; state: AppState; n?: number; onGo: (v: ViewId) => void }) {
  const st = state.status.feeds[feed.id];
  const failing = (st?.failures ?? 0) >= 3;
  const since = st?.lastSuccess ? `depuis le ${new Date(st.lastSuccess).toLocaleDateString('fr-FR')}` : 'jamais récupéré';
  return (
    <button class={`nav-item feed-row ${state.view === `feed:${feed.id}` ? 'active' : ''}`} onClick={() => onGo(`feed:${feed.id}`)}>
      <FeedIcon feed={feed} status={state.status} />
      <span class="nav-label">{feed.title}</span>
      {failing && <span class="warn" title={`Fil en erreur ${since}`}><IconAlert width={16} height={16} /></span>}
      <Count n={n} />
    </button>
  );
}

// ---------- Liste d'articles, affichage Magazine (EXG-030, EXG-031, EXG-033) ----------

function ArticleList({ store, state, items, feedsById, onSettings }: {
  store: Store; state: AppState; items: Item[]; feedsById: Map<string, Feed>; onSettings: () => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => setLimit(PAGE_SIZE), [state.view]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) setLimit((l) => l + PAGE_SIZE); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length]);

  if (state.subs.feeds.length === 0) {
    return (
      <div class="empty">
        <Logo size={64} />
        <h2>Bienvenue dans FilActu</h2>
        <p>Commencez par importer vos abonnements Feedly (fichier OPML).</p>
        <button class="btn-primary" onClick={onSettings}>Importer mes abonnements</button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div class="empty">
        <h2>{state.view === 'saved' ? 'Aucun article mis de côté' : 'Rien de nouveau ici'}</h2>
        <p>{state.items.length === 0 ? 'Les premiers articles arrivent à la prochaine collecte (15 minutes au plus).' : 'Revenez plus tard ou choisissez une autre vue.'}</p>
      </div>
    );
  }
  const now = new Date();
  return (
    <>
      <ul class="articles magazine">
        {items.slice(0, limit).map((item) => (
          <ArticleCard key={item.id} item={item} feed={feedsById.get(item.feedId)}
            read={isRead(state.reading, item, state.subs)} now={now} store={store} />
        ))}
      </ul>
      <div ref={sentinel} class="sentinel" />
    </>
  );
}

function ArticleCard({ item, feed, read, now, store }: { item: Item; feed?: Feed; read: boolean; now: Date; store: Store }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <li class={`article ${read ? 'read' : ''}`} data-id={item.id}>
      <a class="article-link" href={item.link} target="_blank" rel="noopener noreferrer" onClick={() => store.open(item)}>
        {item.image && imgOk && (
          <img class="thumb" src={item.image} alt="" loading="lazy" referrerpolicy="no-referrer" onError={() => setImgOk(false)} />
        )}
        <div class="article-body">
          <h3 class="article-title">{item.title}</h3>
          <p class="article-meta">
            <span class="source">{feed?.title ?? ''}</span>
            {item.author && <span> · {item.author}</span>}
            <span> · <time dateTime={item.published}>{ageLabel(item.published, now)}</time></span>
          </p>
          {item.summary && <p class="summary">{item.summary}</p>}
        </div>
      </a>
      <button class="icon-btn read-toggle" aria-label={read ? 'Marquer comme non lu' : 'Marquer comme lu'}
        title={read ? 'Marquer comme non lu' : 'Marquer comme lu'} onClick={() => store.setRead(item, !read)}>
        <IconDot width={14} height={14} />
      </button>
    </li>
  );
}

// ---------- Réglages ----------

function Settings({ store, state, onClose }: { store: Store; state: AppState; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const onFile = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const stats = await store.importOpml(await file.text());
    if (stats) onClose();
  };
  const download = () => {
    const blob = new Blob([store.exportOpml()], { type: 'text/x-opml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'filactu-abonnements.opml';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const lastRun = state.status.lastRun ? new Date(state.status.lastRun).toLocaleString('fr-FR') : 'jamais';

  return (
    <div class="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="dialog-head">
          <h2 id="settings-title">Réglages</h2>
          <button class="icon-btn" aria-label="Fermer" onClick={onClose}><IconClose /></button>
        </header>
        <section class="dialog-section">
          <h3>Abonnements</h3>
          <p class="muted">{state.subs.feeds.length} fils dans {state.subs.categories.length} catégories.</p>
          <div class="row">
            <button class="btn-primary" onClick={() => fileRef.current?.click()} disabled={state.loading}>Importer un fichier OPML</button>
            <button class="btn" onClick={download} disabled={state.subs.feeds.length === 0}>Exporter en OPML</button>
          </div>
          <input ref={fileRef} type="file" accept=".opml,.xml,text/xml,text/x-opml,application/xml" hidden
            data-testid="opml-input" onChange={onFile} />
        </section>
        <section class="dialog-section">
          <h3>Synchronisation</h3>
          <p class="muted">Dépôt : {state.config?.owner}/{state.config?.repo}<br />Dernière collecte : {lastRun}</p>
        </section>
        <section class="dialog-section">
          <h3>Cet appareil</h3>
          <button class="btn btn-danger" onClick={() => { if (confirm('Effacer la clé et les données de cet appareil ?')) void store.disconnect(); }}>
            Déconnecter cet appareil
          </button>
        </section>
        <p class="version">FilActu {__APP_VERSION__} · <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a></p>
      </div>
    </div>
  );
}
