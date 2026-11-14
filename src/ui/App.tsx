import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Store, AppState } from '../app/store';
import { DEFAULT_DATA_REPO, STALE_COLLECT_MS } from '../app/store';
import { getPref, isRead, isSaved } from '../core/reading';
import {
  adjacentCategory, ageLabel, DISPLAY_MODES, failingSince, itemsForView, prefKey, searchItems, sortItems, unreadCounts,
  type DisplayMode, type UnreadCounts, type ViewId,
} from '../core/views';
import type { Feed, FeedsStatus, Item, Subscriptions } from '../core/types';
import { feedLabel } from '../core/subscriptions';
import { ANDROID_BROWSERS, articleHref, fontScale, FONT_SIZES, canChooseBrowser, type FontSize } from '../core/links';
import { saveMethod, type AndroidBridge } from '../core/download';
import { AddFeedDialog, CategoriesDialog, Dialog, FeedDialog, useFocusInside } from './dialogs';
import {
  IconAlert, IconAll, IconBookmark, IconBookmarkFilled, IconCheckAll, IconChevron, IconClose, IconCheckCircle, IconCircle, IconMenu,
  IconMore, IconRefresh, IconSearch, IconSettings, IconToday, IconView, Logo,
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

/** Grand écran (PC, tablette paysage) ou petit écran (téléphone, tablette portrait) — EXG-036. */
const WIDE_QUERY = '(min-width: 900px)';
export function useWideScreen(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Clé et valeur par défaut de l'option « début de l'article » selon le type d'écran. */
function summaryPref(wide: boolean): [string, boolean] {
  return wide ? ['showSummary:wide', true] : ['showSummary:narrow', false];
}

/** Clé de la taille du texte selon le type d'écran (EXG-037). */
function fontPref(wide: boolean): string {
  return wide ? 'fontSize:wide' : 'fontSize:narrow';
}

const ANDROID = typeof navigator !== 'undefined' && canChooseBrowser(navigator.userAgent);
/** Écran tactile : le réglage du glissement sur la liste n'a de sens que là (EXG-090). */
const TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Ce que fait un glissement horizontal sur la liste (EXG-090). */
type SwipeAction = 'article' | 'category';

const GUIDE_URL = 'https://github.com/yvandantec/filactu/blob/main/docs/GUIDE-UTILISATEUR.md';
const PAGE_SIZE = 150;
const MODE_LABELS: Record<DisplayMode, string> = { titles: 'Titres', magazine: 'Magazine', cards: 'Cartes' };

export function App({ store }: { store: Store }) {
  const s = useStore(store);
  // Thème clair / sombre / automatique (EXG-061)
  const theme = getPref<string>(s.reading, 'theme', 'auto');
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    // Barre du navigateur : couleur du fond affiché, y compris quand le thème est forcé (EXG-083)
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')) {
      const dark = theme === 'auto' ? meta.media.includes('dark') : theme === 'dark';
      meta.content = dark ? '#12161c' : '#f7f8fa';
    }
  }, [theme]);
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
        <div class="setup-brand"><Logo size={48} /><h1 class="wordmark"><span class="wm-fil">Fil</span><span class="wm-actu">Actu</span></h1></div>
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

function viewTitle(view: ViewId, subs: Subscriptions, status: FeedsStatus): string {
  if (view === 'today') return 'Aujourd’hui';
  if (view === 'all') return 'Tous les articles';
  if (view === 'saved') return 'À lire plus tard';
  if (view.startsWith('feed:')) {
    const f = subs.feeds.find((x) => x.id === view.slice(5));
    return f ? feedLabel(f, status) : 'Fil';
  }
  const c = subs.categories.find((x) => x.id === view.slice(9));
  return c ? `${c.icon ? c.icon + ' ' : ''}${c.name}` : 'Catégorie';
}

type DialogKind = 'add' | 'categories' | 'settings' | 'help' | { feed: string } | null;
type Menu = 'view' | 'markAll' | null;

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function Reader({ store, state }: { store: Store; state: AppState }) {
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [staleClosed, setStaleClosed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const { view, reading, subs } = state;

  const counts = useMemo(() => unreadCounts(state.items, subs, reading), [state.items, subs, reading]);
  const mode = getPref<DisplayMode>(reading, prefKey('mode', view), 'magazine');
  const unreadOnly = view !== 'saved' && getPref<boolean>(reading, prefKey('unreadOnly', view), true);
  const oldestFirst = getPref<boolean>(reading, prefKey('oldestFirst', view), false);
  const wide = useWideScreen();
  const [summaryKey, summaryDefault] = summaryPref(wide);
  const showSummary = getPref<boolean>(reading, summaryKey, summaryDefault);
  const fontKey = fontPref(wide);
  const fontSize = getPref<FontSize>(reading, fontKey, 'normal');
  const browser = getPref<string>(reading, 'androidBrowser', 'auto');
  const swipeAction = getPref<SwipeAction>(reading, 'swipeAction', 'article');
  const activeQuery = searchOpen ? query.trim() : '';

  // Articles lus pendant la consultation : restent affichés jusqu'au changement de vue (EXG-024)
  const shown = useRef({ key: '', ids: new Set<string>() });
  const filterKey = `${view}|${unreadOnly}|${activeQuery}|${searchAll}`;
  if (shown.current.key !== filterKey) shown.current = { key: filterKey, ids: new Set() };

  const list = useMemo(() => {
    const base = activeQuery && searchAll
      ? [...state.items, ...itemsForView('saved', [], subs, reading).filter((s) => !state.items.some((i) => i.id === s.id))]
      : itemsForView(view, state.items, subs, reading);
    let out = sortItems(searchItems(base, activeQuery), oldestFirst);
    // Pendant une recherche, les articles lus sont aussi trouvés (EXG-063)
    if (unreadOnly && !activeQuery) out = out.filter((i) => !isRead(reading, i, subs) || shown.current.ids.has(i.id));
    for (const i of out) shown.current.ids.add(i.id);
    return out;
  }, [view, state.items, subs, reading, unreadOnly, oldestFirst, activeQuery, searchAll]);

  const viewUnread =
    view === 'all' ? counts.all
    : view === 'today' ? counts.today
    : view === 'saved' ? 0
    : view.startsWith('feed:') ? counts.feeds[view.slice(5)] ?? 0
    : counts.categories[view.slice(9)] ?? 0;

  // Glisser depuis le bord gauche pour ouvrir le volet (EXG-021)
  useEffect(() => {
    let startX = -1;
    const down = (e: TouchEvent) => { startX = e.touches[0].clientX < 24 ? e.touches[0].clientX : -1; };
    const move = (e: TouchEvent) => { if (startX >= 0 && e.touches[0].clientX - startX > 60) { setDrawer(true); startX = -1; } };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); };
  }, []);

  const go = (v: ViewId) => {
    store.setView(v);
    setDrawer(false);
    setSelected(null);
    setSlide('');
    document.querySelector('.content')?.scrollTo(0, 0);
  };

  // Glisser sur la liste pour changer de catégorie, en boucle (EXG-090)
  const [slide, setSlide] = useState<'' | 'from-right' | 'from-left'>('');
  const swipeNav = useRef({ x: -1, y: 0 });
  const onListTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    // Le bord gauche reste réservé à l'ouverture du volet (EXG-021)
    swipeNav.current = e.touches.length === 1 && t.clientX >= 24 ? { x: t.clientX, y: t.clientY } : { x: -1, y: 0 };
  };
  const onListTouchEnd = (e: TouchEvent) => {
    const start = swipeNav.current;
    swipeNav.current = { x: -1, y: 0 };
    const t = e.changedTouches[0];
    if (start.x < 0 || !t || drawer || dialog || menu) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const dir = dx < 0 ? 1 : -1;
    const next = adjacentCategory(view, subs.categories, dir);
    if (!next) return;
    go(next);
    setSlide(dir === 1 ? 'from-right' : 'from-left');
  };

  const openItem = (item: Item) => {
    const href = articleHref(item.link, browser, navigator.userAgent);
    if (href !== item.link) window.location.href = href;
    else window.open(item.link, '_blank', 'noopener,noreferrer');
    store.open(item);
  };

  const cycleMode = () => store.setPref(prefKey('mode', view), DISPLAY_MODES[(DISPLAY_MODES.indexOf(mode) + 1) % 3]);
  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };
  const closeSearch = () => { setSearchOpen(false); setQuery(''); };

  // Raccourcis clavier (EXG-062)
  const keys = useRef({ list, selected, gPending: false, dialog, menu });
  keys.current = { ...keys.current, list, selected, dialog, menu };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { setMenu(null); if (searchOpen && !keys.current.dialog) closeSearch(); return; }
      if (isTyping(e) || keys.current.dialog) return;
      const k = keys.current;
      const idx = k.list.findIndex((i) => i.id === k.selected);
      const cur = idx >= 0 ? k.list[idx] : undefined;
      const select = (i: number) => {
        const it = k.list[Math.max(0, Math.min(k.list.length - 1, i))];
        if (!it) return;
        setSelected(it.id);
        document.querySelector(`.article[data-id="${it.id}"]`)?.scrollIntoView({ block: 'nearest' });
      };
      if (k.gPending) {
        k.gPending = false;
        if (e.key === 'a') return go('all');
        if (e.key === 't') return go('today');
        if (e.key === 's') return go('saved');
      }
      switch (e.key) {
        case 'j': select(idx + 1); break;
        case 'k': select(idx - 1); break;
        case 'Enter': {
          const tag = (e.target as HTMLElement | null)?.tagName;
          if (tag === 'BUTTON' || tag === 'A') return;
          if (cur) { e.preventDefault(); openItem(cur); }
          break;
        }
        case 'o': if (cur) { e.preventDefault(); openItem(cur); } break;
        case 'm': if (cur) store.setRead(cur, !isRead(store.state.reading, cur, store.state.subs)); break;
        case 's': if (cur) store.toggleSaved(cur); break;
        case 'A': if (e.shiftKey) store.markAll(store.state.view, 0, k.list); break;
        case 'v': cycleMode(); break;
        case 'r': void store.collectNow(); void store.refresh(); break;
        case '/': e.preventDefault(); openSearch(); break;
        case '?': setDialog('help'); break;
        case 'g': k.gPending = true; setTimeout(() => { k.gPending = false; }, 1200); break;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lastRun = state.status.lastRun;
  const stale = subs.feeds.length > 0 && lastRun && now.getTime() - Date.parse(lastRun) > STALE_COLLECT_MS;
  const feedsById = useMemo(() => new Map(subs.feeds.map((f) => [f.id, f])), [subs]);
  const close = () => setDialog(null);

  return (
    <div class={`app ${drawer ? 'drawer-open' : ''}`}>
      <Sidebar state={state} counts={counts} onGo={go}
        onSettings={() => { setDialog('settings'); setDrawer(false); }}
        onAddFeed={() => { setDialog('add'); setDrawer(false); }}
        onCategories={() => { setDialog('categories'); setDrawer(false); }}
        onEditFeed={(id) => { setDialog({ feed: id }); setDrawer(false); }} />
      <div class="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
      <main class="main">
        <header class={`topbar ${searchOpen ? 'searching' : ''}`}>
          <button class="icon-btn menu-btn" aria-label="Ouvrir le menu" onClick={() => setDrawer(true)}><IconMenu /></button>
          {searchOpen ? (
            <div class="search-bar" role="search">
              <IconSearch class="search-icon" />
              <input ref={searchRef} type="search" aria-label="Rechercher" placeholder="Rechercher…" value={query}
                onInput={(e) => setQuery(e.currentTarget.value)} />
              <label class="search-all"><input type="checkbox" checked={searchAll} onChange={(e) => setSearchAll(e.currentTarget.checked)} /> Partout</label>
              <button class="icon-btn" aria-label="Fermer la recherche" onClick={closeSearch}><IconClose /></button>
            </div>
          ) : (
            <div class="view-head">
              <h1 class="view-title">{viewTitle(view, subs, state.status)}</h1>
              {view !== 'saved' && <span class="view-count" data-testid="view-unread">{viewUnread} non lus</span>}
            </div>
          )}
          <div class="actions">
            {!searchOpen && (
              <button class="icon-btn" aria-label="Rechercher" title="Rechercher (/)" onClick={openSearch}><IconSearch /></button>
            )}
            <div class="menu-anchor">
              <button class="icon-btn" aria-label="Options d’affichage" title="Affichage (v)" aria-expanded={menu === 'view'}
                onClick={() => setMenu(menu === 'view' ? null : 'view')}><IconView /></button>
              {menu === 'view' && (
                <ViewMenu store={store} view={view} mode={mode} unreadOnly={unreadOnly} oldestFirst={oldestFirst}
                  showSummary={showSummary} summaryKey={summaryKey} fontKey={fontKey} fontSize={fontSize}
                  onClose={() => setMenu(null)} />
              )}
            </div>
            {view !== 'saved' && (
              <div class="menu-anchor">
                <button class="icon-btn" aria-label="Tout marquer comme lu" title="Tout marquer comme lu (Maj+A)"
                  aria-expanded={menu === 'markAll'} disabled={viewUnread === 0}
                  onClick={() => setMenu(menu === 'markAll' ? null : 'markAll')}>
                  <IconCheckAll />
                </button>
                {menu === 'markAll' && (
                  <div class="popover" role="menu" aria-label="Tout marquer comme lu">
                    {([[0, 'Tout'], [1, 'Plus vieux qu’un jour'], [7, 'Plus vieux qu’une semaine']] as const).map(([d, label]) => (
                      <button role="menuitem" class="menu-item" key={d} onClick={() => { store.markAll(view, d, list); setMenu(null); }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button class={`icon-btn ${state.loading ? 'spin' : ''}`} aria-label="Actualiser" title="Actualiser (r)"
              onClick={() => { void store.collectNow(); void store.refresh(); }}>
              <IconRefresh />
            </button>
          </div>
        </header>
        {menu && <div class="menu-scrim" onClick={() => setMenu(null)} aria-hidden="true" />}
        {state.error && (
          <div class="banner banner-error" role="alert">
            <span>{state.error}</span>
            <button class="icon-btn" aria-label="Fermer" onClick={() => store.clearError()}><IconClose /></button>
          </div>
        )}
        {state.offline && !state.error && (
          <div class="banner" data-testid="offline">Hors connexion : vous lisez les articles déjà chargés. Vos actions seront envoyées au retour du réseau.</div>
        )}
        {stale && !staleClosed && !state.error && !state.offline && (
          <div class="banner" data-testid="stale">
            <span>
              Les articles n’ont pas été mis à jour depuis {ageLabel(lastRun!, now)}. Une mise à jour vient d’être demandée.{' '}
              <a href={`${GUIDE_URL}#12-questions-fr%C3%A9quentes`} target="_blank" rel="noopener noreferrer">Comment réparer</a>
            </span>
            <button class="icon-btn" aria-label="Fermer" onClick={() => setStaleClosed(true)}><IconClose /></button>
          </div>
        )}
        <section key={view} class={`content ${slide}`} aria-live="polite"
          onTouchStart={swipeAction === 'category' ? onListTouchStart : undefined}
          onTouchEnd={swipeAction === 'category' ? onListTouchEnd : undefined}>
          <ArticleList store={store} state={state} items={list} mode={mode} showSummary={showSummary} feedsById={feedsById}
            fontSize={fontSize} browser={browser} articleSwipe={swipeAction === 'article'}
            selected={selected} searching={!!activeQuery}
            onSettings={() => setDialog('settings')} onAddFeed={() => setDialog('add')} />
        </section>
      </main>
      {dialog === 'settings' && <Settings store={store} state={state} onClose={close} />}
      {dialog === 'help' && <HelpDialog onClose={close} />}
      {dialog === 'add' && (
        <AddFeedDialog store={store} state={state} onClose={close}
          initialCategory={view.startsWith('category:') ? view.slice(9) : undefined} />
      )}
      {dialog === 'categories' && <CategoriesDialog store={store} state={state} onClose={close} />}
      {dialog && typeof dialog === 'object' && <FeedDialog store={store} state={state} feedId={dialog.feed} onClose={close} />}
      {state.toast && (
        <div class="toast" role="status">
          <span>{state.toast.message}</span>
          {state.toast.action && (
            <button class="toast-action" onClick={() => { state.toast!.action!.run(); store.dismissToast(); }}>
              {state.toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Options d'affichage (EXG-023, EXG-024, EXG-030, EXG-036) ----------

function ViewMenu({ store, view, mode, unreadOnly, oldestFirst, showSummary, summaryKey, fontKey, fontSize, onClose }: {
  store: Store; view: ViewId; mode: DisplayMode; unreadOnly: boolean; oldestFirst: boolean; showSummary: boolean;
  summaryKey: string; fontKey: string; fontSize: FontSize; onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useFocusInside(box);
  return (
    <div ref={box} tabIndex={-1} class="popover view-menu" role="dialog" aria-label="Options d’affichage">
      <div class="seg" role="radiogroup" aria-label="Affichage">
        {DISPLAY_MODES.map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} class={`seg-btn ${mode === m ? 'on' : ''}`}
            onClick={() => store.setPref(prefKey('mode', view), m)}>{MODE_LABELS[m]}</button>
        ))}
      </div>
      <span class="menu-label" id="font-size-label">Taille du texte</span>
      <div class="seg" role="radiogroup" aria-labelledby="font-size-label">
        {FONT_SIZES.map((f) => (
          <button key={f.id} role="radio" aria-checked={fontSize === f.id} class={`seg-btn font-${f.id} ${fontSize === f.id ? 'on' : ''}`}
            onClick={() => store.setPref(fontKey, f.id)}>{f.label}</button>
        ))}
      </div>
      <label class="check"><input type="checkbox" checked={showSummary} onChange={(e) => store.setPref(summaryKey, e.currentTarget.checked)} /> Afficher le début de l’article</label>
      {view !== 'saved' && (
        <label class="check"><input type="checkbox" checked={unreadOnly} onChange={(e) => store.setPref(prefKey('unreadOnly', view), e.currentTarget.checked)} /> Non lus seulement</label>
      )}
      <label class="check"><input type="checkbox" checked={oldestFirst} onChange={(e) => store.setPref(prefKey('oldestFirst', view), e.currentTarget.checked)} /> Plus anciens d’abord</label>
      <button class="btn btn-small" onClick={onClose}>Fermer</button>
    </div>
  );
}

// ---------- Volet de navigation (EXG-020) ----------

function Count({ n }: { n: number | undefined }) {
  return n ? <span class="count">{n > 999 ? '999+' : n}</span> : null;
}

function Sidebar({ state, counts, onGo, onSettings, onAddFeed, onCategories, onEditFeed }: {
  state: AppState; counts: UnreadCounts; onGo: (v: ViewId) => void; onSettings: () => void;
  onAddFeed: () => void; onCategories: () => void; onEditFeed: (id: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const cats = [...state.subs.categories].sort((a, b) => a.order - b.order);
  const hideEmpty = getPref<boolean>(state.reading, 'hideEmptyFeeds', false);
  const savedCount = Object.values(state.reading.saved).filter((s) => !s.removed).length;
  const nav = (v: ViewId, label: string, icon: JSX.Element, n?: number) => (
    <button class={`nav-item ${state.view === v ? 'active' : ''}`} onClick={() => onGo(v)} aria-current={state.view === v ? 'page' : undefined}>
      {icon}<span class="nav-label">{label}</span><Count n={n} />
    </button>
  );
  return (
    <aside class="sidebar" aria-label="Navigation">
      <div class="brand"><Logo /><span class="wordmark"><span class="wm-fil">Fil</span><span class="wm-actu">Actu</span></span></div>
      <nav class="nav-scroll">
        {nav('today', 'Aujourd’hui', <IconToday />, counts.today)}
        {nav('all', 'Tous les articles', <IconAll />, counts.all)}
        {nav('saved', 'À lire plus tard', <IconBookmark />, savedCount)}
        <div class="nav-heading-row">
          <h2 class="nav-heading">Catégories</h2>
          <button class="link-btn" onClick={onCategories}>Gérer</button>
        </div>
        {cats.length === 0 && <p class="nav-empty">Aucun abonnement pour l’instant.</p>}
        {cats.map((c) => {
          const feeds = state.subs.feeds
            .filter((f) => f.categories.includes(c.id))
            .filter((f) => !hideEmpty || counts.feeds[f.id] || state.view === `feed:${f.id}`);
          const isOpen = open[c.id] ?? false;
          return (
            <div class="cat" key={c.id}>
              <div class={`nav-item cat-row ${state.view === `category:${c.id}` ? 'active' : ''}`}>
                <button class="chevron" aria-label={isOpen ? `Replier ${c.name}` : `Déplier ${c.name}`} aria-expanded={isOpen}
                  onClick={() => setOpen({ ...open, [c.id]: !isOpen })}>
                  <IconChevron class={isOpen ? 'rot' : ''} />
                </button>
                <button class="cat-name" onClick={() => onGo(`category:${c.id}`)}>
                  {c.icon && <span class="cat-icon" aria-hidden="true">{c.icon}</span>}
                  <span class="nav-label">{c.name}</span><Count n={counts.categories[c.id]} />
                </button>
              </div>
              {isOpen && feeds.map((f) => (
                <FeedRow key={f.id} feed={f} state={state} n={counts.feeds[f.id]} onGo={onGo} onEdit={() => onEditFeed(f.id)} />
              ))}
            </div>
          );
        })}
      </nav>
      <button class="nav-item add-feed-btn" onClick={onAddFeed}><span class="plus" aria-hidden="true">+</span><span class="nav-label">Ajouter un fil</span></button>
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
  return <span class="favicon letter" aria-hidden="true">{(feedLabel(feed, status).trim()[0] ?? '?').toUpperCase()}</span>;
}

function FeedRow({ feed, state, n, onGo, onEdit }: {
  feed: Feed; state: AppState; n?: number; onGo: (v: ViewId) => void; onEdit: () => void;
}) {
  const st = state.status.feeds[feed.id];
  const failing = (st?.failures ?? 0) >= 3;
  const since = failingSince(st?.lastSuccess);
  const label = feedLabel(feed, state.status);
  return (
    <div class="feed-row-wrap">
      <button class={`nav-item feed-row ${state.view === `feed:${feed.id}` ? 'active' : ''}`} onClick={() => onGo(`feed:${feed.id}`)}>
        <FeedIcon feed={feed} status={state.status} />
        <span class="nav-label">{label}</span>
        {failing && (
          <span class="warn" title={`Ce site ne répond plus ${since}`}>
            <IconAlert width={16} height={16} /><span class="sr-only">en erreur</span>
          </span>
        )}
        <Count n={n} />
      </button>
      <button class="feed-more" aria-label={`Modifier le fil ${label}`} onClick={onEdit}><IconMore width={18} height={18} /></button>
    </div>
  );
}

// ---------- Liste d'articles (EXG-030 à EXG-036, EXG-041, EXG-042, EXG-045, EXG-050) ----------

function ArticleList({ store, state, items, mode, showSummary, feedsById, fontSize, browser, articleSwipe, selected, searching, onSettings, onAddFeed }: {
  store: Store; state: AppState; items: Item[]; mode: DisplayMode; showSummary: boolean; feedsById: Map<string, Feed>;
  fontSize: FontSize; browser: string; articleSwipe: boolean; selected: string | null; searching: boolean; onSettings: () => void; onAddFeed: () => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => setLimit(PAGE_SIZE), [state.view]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) setLimit((l) => l + PAGE_SIZE); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length]);

  // Marquer lu en défilant (EXG-041) : article entièrement sorti par le haut
  const markOnScroll = getPref<boolean>(state.reading, 'markOnScroll', true) && state.view !== 'saved';
  useEffect(() => {
    const ul = listRef.current;
    const root = ul?.closest('.content') as HTMLElement | null;
    if (!ul || !root || !markOnScroll || typeof IntersectionObserver === 'undefined') return;
    let pending: string[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting && e.rootBounds && e.boundingClientRect.bottom <= e.rootBounds.top + 1) {
          const id = (e.target as HTMLElement).dataset.id;
          if (id) pending.push(id);
        }
      }
      if (pending.length) {
        clearTimeout(timer);
        timer = setTimeout(() => { store.markIdsRead(pending); pending = []; }, 250);
      }
    }, { root, threshold: 0 });
    ul.querySelectorAll<HTMLElement>('.article').forEach((li) => obs.observe(li));
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, [items, limit, markOnScroll, mode]);

  if (state.subs.feeds.length === 0) {
    return (
      <div class="empty">
        <Logo size={64} />
        <h2>Bienvenue dans FilActu</h2>
        <p>Commencez par importer vos abonnements Feedly (fichier OPML).</p>
        <div class="row center">
          <button class="btn-primary" onClick={onSettings}>Importer mes abonnements</button>
          <button class="btn" onClick={onAddFeed}>Ajouter un fil</button>
        </div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div class="empty">
        <h2>{searching ? 'Aucun résultat' : state.view === 'saved' ? 'Aucun article mis de côté' : 'Tout est lu ici'}</h2>
        <p>
          {searching ? 'Essayez d’autres mots, ou cochez « Partout ».'
            : state.items.length === 0 ? 'Les premiers articles arrivent à la prochaine collecte (15 minutes au plus).'
            : 'Revenez plus tard ou choisissez une autre vue.'}
        </p>
      </div>
    );
  }
  const now = new Date();
  const page = items.slice(0, limit);
  const unreadOnPage = page.filter((i) => !isRead(state.reading, i, state.subs)).length;
  return (
    <>
      <ul ref={listRef} class={`articles ${mode}`} style={{ '--fs': String(fontScale(fontSize)) }}>
        {page.map((item) => (
          <ArticleRow key={item.id} item={item} feed={feedsById.get(item.feedId)} status={state.status} mode={mode}
            showSummary={showSummary} read={isRead(state.reading, item, state.subs)} saved={isSaved(state.reading, item.id)}
            selected={selected === item.id} now={now} store={store} browser={browser} articleSwipe={articleSwipe} />
        ))}
      </ul>
      {/* EXG-045 : marquer lus les articles affichés */}
      <div class="page-end">
        {unreadOnPage > 0 ? (
          <button class="btn mark-page-btn" onClick={() => store.markPageRead(page)}>
            <IconCheckAll /> Marquer {unreadOnPage === 1 ? 'l’article affiché' : `les ${unreadOnPage} articles affichés`} comme lu{unreadOnPage === 1 ? '' : 's'}
          </button>
        ) : (
          <p class="muted">Tout est lu sur cette page.</p>
        )}
      </div>
      <div ref={sentinel} class="sentinel" />
    </>
  );
}

const SWIPE = 80;

function ArticleRow({ item, feed, status, mode, showSummary, read, saved, selected, now, store, browser, articleSwipe }: {
  item: Item; feed?: Feed; status: FeedsStatus; mode: DisplayMode; showSummary: boolean; read: boolean; saved: boolean;
  selected: boolean; now: Date; store: Store; browser: string; articleSwipe: boolean;
}) {
  // Sur Android, lien intent:// vers le navigateur choisi (EXG-038)
  const href = articleHref(item.link, browser, navigator.userAgent);
  const target = href === item.link ? '_blank' : undefined;
  const [imgOk, setImgOk] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dx, setDx] = useState(0);
  const touch = useRef({ x: 0, y: 0, dx: 0, horizontal: false, moved: false, longPress: false, timer: 0 as unknown as ReturnType<typeof setTimeout> });
  const source = feed ? feedLabel(feed, status) : '';
  const age = ageLabel(item.published, now);

  // Gestes tactiles : balayage gauche = lu/non lu (EXG-042), droite = à lire plus tard (EXG-050),
  // appui long en affichage Titres = résumé (EXG-032)
  const onTouchStart = (e: TouchEvent) => {
    const t = touch.current;
    t.x = e.touches[0].clientX; t.y = e.touches[0].clientY; t.dx = 0; t.horizontal = false; t.moved = false; t.longPress = false;
    clearTimeout(t.timer);
    if (mode === 'titles') t.timer = setTimeout(() => { if (!t.moved) { t.longPress = true; setExpanded((x) => !x); } }, 500);
  };
  const onTouchMove = (e: TouchEvent) => {
    const t = touch.current;
    const mx = e.touches[0].clientX - t.x;
    const my = e.touches[0].clientY - t.y;
    if (Math.abs(mx) > 8 || Math.abs(my) > 8) { t.moved = true; clearTimeout(t.timer); }
    // Le balayage d'article est remplacé par le changement de catégorie si l'utilisateur l'a choisi (EXG-090)
    if (articleSwipe && !t.horizontal && Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.5) t.horizontal = true;
    if (t.horizontal) {
      t.dx = Math.max(-140, Math.min(140, mx));
      setDx(t.dx);
    }
  };
  const onTouchEnd = () => {
    const t = touch.current;
    clearTimeout(t.timer);
    if (t.horizontal) {
      if (t.dx <= -SWIPE) store.setRead(item, !read);
      else if (t.dx >= SWIPE) store.toggleSaved(item);
    }
    t.dx = 0;
    setDx(0);
  };
  const onClick = (e: MouseEvent) => {
    const t = touch.current;
    if (t.horizontal || t.longPress) { e.preventDefault(); t.horizontal = false; t.longPress = false; return; }
    store.open(item);
  };

  const actions = (
    <span class="row-actions">
      <button class={`icon-btn save-toggle ${saved ? 'on' : ''}`} aria-label={saved ? 'Retirer de « À lire plus tard »' : 'Lire plus tard'}
        aria-pressed={saved} title={saved ? 'Retirer de « À lire plus tard » (s)' : 'Lire plus tard (s)'} onClick={() => store.toggleSaved(item)}>
        {saved ? <IconBookmarkFilled width={17} height={17} /> : <IconBookmark width={17} height={17} />}
      </button>
      <button class="icon-btn read-toggle" aria-label={read ? 'Marquer comme non lu' : 'Marquer comme lu'}
        title={read ? 'Marquer comme non lu (m)' : 'Marquer comme lu (m)'} onClick={() => store.setRead(item, !read)}>
        {read ? <IconCheckCircle width={19} height={19} /> : <IconCircle width={19} height={19} />}
      </button>
    </span>
  );
  const thumb = item.image && imgOk && (
    <img class="thumb" src={item.image} alt="" loading="lazy" referrerpolicy="no-referrer" onError={() => setImgOk(false)} />
  );
  // Ligne de la source : icône, nom complet, fraîcheur discrète, boutons alignés à droite (EXG-039, EXG-046)
  const top = (
    <div class="article-top">
      {feed ? <FeedIcon feed={feed} status={status} /> : <span class="favicon letter" aria-hidden="true">?</span>}
      <span class="source">{source}</span>
      <time class="age" dateTime={item.published}>{age}</time>
      {actions}
    </div>
  );
  const summary = item.summary && (showSummary || (mode === 'titles' && expanded)) && <p class="summary">{item.summary}</p>;

  return (
    <li class={`article ${read ? 'read' : ''} ${selected ? 'selected' : ''} ${dx <= -SWIPE ? 'swipe-read' : dx >= SWIPE ? 'swipe-save' : ''}`}
      data-id={item.id} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div class="swipe-bg left" aria-hidden="true">{read ? 'Non lu' : 'Lu'}</div>
      <div class="swipe-bg right" aria-hidden="true">{saved ? 'Retirer' : 'Plus tard'}</div>
      <div class={`article-inner ${thumb ? 'has-thumb' : ''}`} style={dx ? { transform: `translateX(${dx}px)` } : undefined}>
        {mode === 'titles' ? (
          <>
            <a class="article-link" href={href} target={target} rel="noopener noreferrer" onClick={onClick}
              title={item.summary || undefined}>
              <span class="source">{source}</span>
              <h3 class="article-title">{item.title}</h3>
              <time class="age" dateTime={item.published}>{age}</time>
            </a>
            {actions}
            {summary}
          </>
        ) : mode === 'cards' ? (
          <>
            {thumb && (
              <a class="thumb-link" href={href} target={target} rel="noopener noreferrer" onClick={onClick} tabIndex={-1} aria-hidden="true">
                {thumb}
              </a>
            )}
            {top}
            <a class="article-link" href={href} target={target} rel="noopener noreferrer" onClick={onClick}>
              <h3 class="article-title">{item.title}</h3>
            </a>
            {summary}
          </>
        ) : (
          <>
            {top}
            <div class="article-main">
              <div class="article-body">
                <a class="article-link" href={href} target={target} rel="noopener noreferrer" onClick={onClick}>
                  <h3 class="article-title">{item.title}</h3>
                </a>
                {summary}
              </div>
              {thumb && (
                <a class="thumb-link" href={href} target={target} rel="noopener noreferrer" onClick={onClick} tabIndex={-1} aria-hidden="true">
                  {thumb}
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

// ---------- Réglages ----------

function Settings({ store, state, onClose }: { store: Store; state: AppState; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const stats = await store.importOpml(await file.text());
    if (stats) onClose();
  };
  const download = () => {
    const name = 'filactu-abonnements.opml';
    const mime = 'text/x-opml';
    const bridge = (window as unknown as { FilActuAndroid?: AndroidBridge }).FilActuAndroid;
    const method = saveMethod(navigator.userAgent, typeof bridge?.saveFile === 'function');
    if (method === 'android') {
      bridge!.saveFile(name, mime, store.exportOpml()); // Android confirme lui-même l'enregistrement
      return;
    }
    if (method === 'old-app') {
      store.toast('Pour exporter depuis le téléphone, installez la nouvelle version de l’appli (1.3.0), ou exportez depuis Chrome ou le PC.', undefined, 8000);
      return;
    }
    const blob = new Blob([store.exportOpml()], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const runAge = state.status.lastRun ? ageLabel(state.status.lastRun, new Date()) : '';
  const lastRun = !runAge ? 'jamais' : runAge === "à l'instant" ? runAge : `il y a ${runAge}`;
  const r = state.reading;
  const wide = useWideScreen();
  const [summaryKey, summaryDefault] = summaryPref(wide);
  const fontKey = fontPref(wide);

  return (
    <Dialog title="Réglages" onClose={onClose}>
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
      <section class="dialog-section settings-grid">
        <h3>Lecture et apparence</h3>
        <label class="field">
          Thème
          <select value={getPref(r, 'theme', 'auto')} onChange={(e) => store.setPref('theme', e.currentTarget.value)}>
            <option value="auto">Automatique (comme le système)</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </label>
        <label class="field">
          Taille du texte des articles {wide ? '(grand écran)' : '(petit écran)'}
          <select value={getPref(r, fontKey, 'normal')} onChange={(e) => store.setPref(fontKey, e.currentTarget.value)}>
            {FONT_SIZES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        {ANDROID && (
          <label class="field">
            Ouvrir les articles avec
            <select value={getPref(r, 'androidBrowser', 'auto')} onChange={(e) => store.setPref('androidBrowser', e.currentTarget.value)}>
              {ANDROID_BROWSERS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
        )}
        {TOUCH && (
          <label class="field">
            Glisser le doigt sur la liste
            <select value={getPref(r, 'swipeAction', 'article')} onChange={(e) => store.setPref('swipeAction', e.currentTarget.value)}>
              <option value="article">Marquer lu / À lire plus tard</option>
              <option value="category">Changer de catégorie</option>
            </select>
          </label>
        )}
        <label class="check"><input type="checkbox" checked={getPref(r, 'markOnScroll', true)}
          onChange={(e) => store.setPref('markOnScroll', e.currentTarget.checked)} /> Marquer comme lu en défilant</label>
        <label class="check"><input type="checkbox" checked={getPref(r, summaryKey, summaryDefault)}
          onChange={(e) => store.setPref(summaryKey, e.currentTarget.checked)} />
          Afficher le début des articles {wide ? 'sur grand écran (PC)' : 'sur petit écran (téléphone)'}</label>
        <label class="check"><input type="checkbox" checked={getPref(r, 'hideEmptyFeeds', false)}
          onChange={(e) => store.setPref('hideEmptyFeeds', e.currentTarget.checked)} /> Masquer les fils sans articles non lus</label>
      </section>
      <section class="dialog-section">
        <h3>Synchronisation</h3>
        <p class="muted">Dernière mise à jour : {lastRun}<br />Vos données : {state.config?.owner}/{state.config?.repo}</p>
      </section>
      <section class="dialog-section">
        <h3>Cet appareil</h3>
        <button class="btn btn-danger" onClick={() => { if (confirm('Effacer la clé et les données de cet appareil ?')) void store.disconnect(); }}>
          Déconnecter cet appareil
        </button>
      </section>
      <p class="version">FilActu {__APP_VERSION__} · <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a> · Raccourcis : touche <kbd>?</kbd></p>
    </Dialog>
  );
}

// ---------- Aide des raccourcis (EXG-062) ----------

const SHORTCUTS: [string, string][] = [
  ['j / k', 'Article suivant / précédent'],
  ['o ou Entrée', 'Ouvrir l’article dans le navigateur'],
  ['m', 'Lu / non lu'],
  ['s', 'À lire plus tard'],
  ['Maj + A', 'Tout marquer comme lu'],
  ['v', 'Changer d’affichage'],
  ['r', 'Actualiser'],
  ['/', 'Rechercher'],
  ['g puis t / a / s', 'Aujourd’hui / Tous / À lire plus tard'],
  ['?', 'Cette aide'],
];

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Raccourcis clavier" onClose={onClose}>
      <table class="shortcuts">
        <tbody>
          {SHORTCUTS.map(([k, label]) => (
            <tr key={k}><td><kbd>{k}</kbd></td><td>{label}</td></tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
