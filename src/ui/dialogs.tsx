import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppState, Store } from '../app/store';
import { CATEGORY_ICONS, exclusiveFeeds, feedLabel, suggestIcon } from '../core/subscriptions';
import type { Category } from '../core/types';
import { failingSince, feedErrorReason } from '../core/views';
import { IconChevron, IconClose } from './icons';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibilité au clavier d'une fenêtre (ENF-02) : à l'ouverture, le focus entre dans la fenêtre ;
 * avec `trap`, Tab y reste ; à la fermeture, le focus revient à l'élément qui l'avait ouverte.
 */
export function useFocusInside(ref: { current: HTMLElement | null }, trap = false) {
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const previous = document.activeElement as HTMLElement | null;
    // un champ peut déjà avoir pris le focus (saisie directe) : on ne le lui vole pas
    const settle = setTimeout(() => { if (!box.contains(document.activeElement)) box.focus(); }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab') return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    box.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(settle);
      box.removeEventListener('keydown', onKey);
      if (previous && previous.isConnected && previous !== document.body) previous.focus();
    };
  }, []);
}

export function Dialog({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: ComponentChildren; wide?: boolean;
}) {
  const id = 'dlg-' + title.replace(/\W+/g, '-');
  const box = useRef<HTMLDivElement>(null);
  useFocusInside(box, true);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div class="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} tabIndex={-1} class={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header class="dialog-head">
          <h2 id={id}>{title}</h2>
          <button class="icon-btn" aria-label="Fermer" onClick={onClose}><IconClose /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function sortedCategories(state: AppState): Category[] {
  return [...state.subs.categories].sort((a, b) => a.order - b.order);
}

// ---------- Palette d'icônes (EXG-016) ----------

export function IconPicker({ value, onChange, label }: { value?: string; onChange: (icon: string | null) => void; label: string }) {
  return (
    <div class="icon-picker" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={!value} aria-label="Aucune icône"
        class={`icon-choice none ${!value ? 'selected' : ''}`} onClick={() => onChange(null)}>∅</button>
      {CATEGORY_ICONS.map((ic) => (
        <button type="button" role="radio" aria-checked={value === ic} aria-label={`Icône ${ic}`} key={ic}
          class={`icon-choice ${value === ic ? 'selected' : ''}`} onClick={() => onChange(ic)}>{ic}</button>
      ))}
    </div>
  );
}

/**
 * Icône suggérée d'après le nom saisi (EXG-018), tant que l'utilisateur n'a pas choisi lui-même.
 * Renvoie [icône, choisir, nom saisi, réinitialiser].
 */
function useSuggestedIcon(): [string | undefined, (i: string | undefined) => void, (name: string) => void, () => void] {
  const [icon, setIcon] = useState<string | undefined>();
  const touched = useRef(false);
  const choose = (i: string | undefined) => { touched.current = true; setIcon(i); };
  const onName = (name: string) => { if (!touched.current) setIcon(name.trim() ? suggestIcon(name) : undefined); };
  const reset = () => { touched.current = false; setIcon(undefined); };
  return [icon, choose, onName, reset];
}

// ---------- Ajouter un abonnement (EXG-011) ----------

const NEW = '__new__';

export function AddFeedDialog({ store, state, onClose, initialCategory }: {
  store: Store; state: AppState; onClose: () => void; initialCategory?: string;
}) {
  const cats = sortedCategories(state);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState(initialCategory ?? cats[0]?.id ?? NEW);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon, onNameForIcon] = useSuggestedIcon();
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    store.clearError();
    first.current?.focus();
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    const ok = await store.addFeed({
      url,
      title,
      ...(cat === NEW ? { newCategory: { name: newName, icon: newIcon } } : { categoryId: cat }),
    });
    if (ok) onClose();
  };

  return (
    <Dialog title="Ajouter un fil" onClose={onClose}>
      <form class="dialog-form" onSubmit={submit}>
        <label>
          Adresse du fil ou du site
          <input ref={first} type="url" inputMode="url" placeholder="https://exemple.fr/rss" required spellcheck={false}
            value={url} onInput={(e) => setUrl(e.currentTarget.value)} />
        </label>
        <label>
          <span>Nom <span class="optional">(facultatif)</span></span>
          <input type="text" placeholder="Repris du fil si vide" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
        </label>
        <label>
          Catégorie
          <select value={cat} onChange={(e) => setCat(e.currentTarget.value)}>
            {cats.map((c) => <option value={c.id} key={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
            <option value={NEW}>+ Nouvelle catégorie…</option>
          </select>
        </label>
        {cat === NEW && (
          <div class="subpanel">
            <label>
              Nom de la nouvelle catégorie
              <input type="text" required value={newName} onInput={(e) => { setNewName(e.currentTarget.value); onNameForIcon(e.currentTarget.value); }} />
            </label>
            <span class="field-label">Icône</span>
            <IconPicker value={newIcon} onChange={(i) => setNewIcon(i ?? undefined)} label="Icône de la nouvelle catégorie" />
          </div>
        )}
        {state.error && <p class="form-error" role="alert">{state.error}</p>}
        <div class="row end">
          <button type="button" class="btn" onClick={onClose}>Annuler</button>
          <button type="submit" class="btn-primary" disabled={state.loading}>{state.loading ? 'Ajout…' : 'Ajouter'}</button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------- Gérer les catégories (EXG-013, EXG-016) ----------

export function CategoriesDialog({ store, state, onClose }: { store: Store; state: AppState; onClose: () => void }) {
  const cats = sortedCategories(state);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon, onNameForIcon, resetIcon] = useSuggestedIcon();
  const [iconFor, setIconFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => store.clearError(), []);
  const missing = cats.filter((c) => !c.icon).length;

  const create = async (e: Event) => {
    e.preventDefault();
    if (await store.createCategory(newName, newIcon)) {
      setNewName('');
      resetIcon();
    }
  };

  return (
    <Dialog title="Gérer les catégories" onClose={onClose} wide>
      {missing > 0 && (
        <div class="dialog-hint">
          <span>{missing === 1 ? '1 catégorie n’a' : `${missing} catégories n’ont`} pas d’icône.</span>
          <button class="btn btn-small" onClick={() => void store.fillMissingIcons()}>Proposer les icônes manquantes</button>
        </div>
      )}
      <ul class="cat-list">
        {cats.length === 0 && <li class="muted cat-empty">Aucune catégorie pour l’instant.</li>}
        {cats.map((c, i) => (
          <li key={c.id} class="cat-item" data-cat={c.id}>
            <div class="cat-line">
              <button class="icon-slot" aria-label={`Changer l’icône de ${c.name}`} aria-expanded={iconFor === c.id}
                onClick={() => setIconFor(iconFor === c.id ? null : c.id)}>
                {c.icon ?? <span class="icon-placeholder">＋</span>}
              </button>
              <RenameInput category={c} store={store} />
              <span class="cat-feeds muted">{state.subs.feeds.filter((f) => f.categories.includes(c.id)).length} fils</span>
              <button class="icon-btn" aria-label={`Monter ${c.name}`} disabled={i === 0} onClick={() => void store.moveCategory(c.id, -1)}>
                <IconChevron class="up" />
              </button>
              <button class="icon-btn" aria-label={`Descendre ${c.name}`} disabled={i === cats.length - 1}
                onClick={() => void store.moveCategory(c.id, 1)}>
                <IconChevron class="down" />
              </button>
              <button class="btn btn-small btn-danger" onClick={() => setDeleting(deleting === c.id ? null : c.id)}>Supprimer</button>
            </div>
            {iconFor === c.id && (
              <IconPicker value={c.icon} label={`Icône de ${c.name}`}
                onChange={(icon) => { void store.updateCategory(c.id, { icon }); setIconFor(null); }} />
            )}
            {deleting === c.id && (
              <DeletePanel category={c} state={state} store={store} onDone={() => setDeleting(null)} />
            )}
          </li>
        ))}
      </ul>
      <form class="dialog-section dialog-form" onSubmit={create}>
        <h3>Nouvelle catégorie</h3>
        <label>
          Nom
          <input type="text" required value={newName} onInput={(e) => { setNewName(e.currentTarget.value); onNameForIcon(e.currentTarget.value); }} />
        </label>
        <span class="field-label">Icône</span>
        <IconPicker value={newIcon} onChange={(i) => setNewIcon(i ?? undefined)} label="Icône de la nouvelle catégorie" />
        {state.error && <p class="form-error" role="alert">{state.error}</p>}
        <div class="row end">
          <button type="submit" class="btn-primary" disabled={state.loading}>Créer la catégorie</button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------- Modifier un fil (EXG-012) ----------

export function FeedDialog({ store, state, feedId, onClose }: { store: Store; state: AppState; feedId: string; onClose: () => void }) {
  const feed = state.subs.feeds.find((f) => f.id === feedId);
  const [title, setTitle] = useState(feed?.title || (feed ? feedLabel(feed, state.status) : ''));
  const [cats, setCats] = useState<string[]>(feed?.categories ?? []);
  useEffect(() => store.clearError(), []);
  if (!feed) return null;

  const save = async (e: Event) => {
    e.preventDefault();
    if (await store.updateFeed(feed.id, { title, categories: cats })) onClose();
  };
  const unsubscribe = async () => {
    if (!confirm(`Se désabonner de « ${feedLabel(feed, state.status)} » ?`)) return;
    if (await store.removeFeed(feed.id)) onClose();
  };
  const st = state.status.feeds[feed.id];

  return (
    <Dialog title="Modifier le fil" onClose={onClose}>
      <form class="dialog-form" onSubmit={save}>
        <label>
          Nom du fil
          <input type="text" value={title} required onInput={(e) => setTitle(e.currentTarget.value)} />
        </label>
        <fieldset class="cat-checks">
          <legend>Catégories</legend>
          {sortedCategories(state).map((c) => (
            <label class="check" key={c.id}>
              <input type="checkbox" checked={cats.includes(c.id)}
                onChange={(e) => setCats(e.currentTarget.checked ? [...cats, c.id] : cats.filter((x) => x !== c.id))} />
              {c.icon ? `${c.icon} ` : ''}{c.name}
            </label>
          ))}
        </fieldset>
        <p class="muted feed-url">Adresse : {feed.url}</p>
        {(st?.failures ?? 0) >= 3 && (
          <p class="feed-error">
            Ce site ne répond plus {failingSince(st?.lastSuccess)} : {feedErrorReason(st?.lastError)}. FilActu réessaie à chaque mise à jour.
          </p>
        )}
        {state.error && <p class="form-error" role="alert">{state.error}</p>}
        <div class="row spread">
          <button type="button" class="btn btn-danger" onClick={() => void unsubscribe()}>Se désabonner</button>
          <span class="row">
            <button type="button" class="btn" onClick={onClose}>Annuler</button>
            <button type="submit" class="btn-primary" disabled={state.loading}>Enregistrer</button>
          </span>
        </div>
      </form>
    </Dialog>
  );
}

function RenameInput({ category, store }: { category: Category; store: Store }) {
  const [value, setValue] = useState(category.name);
  useEffect(() => setValue(category.name), [category.name]);
  const save = () => {
    if (value.trim() && value.trim() !== category.name) void store.updateCategory(category.id, { name: value });
    else setValue(category.name);
  };
  return (
    <input class="rename" type="text" aria-label={`Nom de la catégorie ${category.name}`} value={value}
      onInput={(e) => setValue(e.currentTarget.value)} onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />
  );
}

function DeletePanel({ category, state, store, onDone }: { category: Category; state: AppState; store: Store; onDone: () => void }) {
  const orphans = exclusiveFeeds(state.subs, category.id);
  const others = sortedCategories(state).filter((c) => c.id !== category.id);
  const [choice, setChoice] = useState<string>(others[0]?.id ?? 'unsubscribe');
  const confirm = async () => {
    const ok = await store.deleteCategory(category.id, choice === 'unsubscribe' ? 'unsubscribe' : { moveTo: choice });
    if (ok) onDone();
  };
  return (
    <div class="subpanel danger-panel" role="group" aria-label={`Suppression de ${category.name}`}>
      {orphans.length === 0 ? (
        <p>Supprimer la catégorie « {category.name} » ? Ses fils restent rangés dans leurs autres catégories.</p>
      ) : (
        <>
          <p>
            {orphans.length === 1 ? '1 fil n’est rangé' : `${orphans.length} fils ne sont rangés`} que dans « {category.name} ».
            Que faire {orphans.length === 1 ? 'de ce fil' : 'de ces fils'} ?
          </p>
          <label>
            <select aria-label="Destination des fils" value={choice} onChange={(e) => setChoice(e.currentTarget.value)}>
              {others.map((c) => <option key={c.id} value={c.id}>Déplacer vers « {c.name} »</option>)}
              <option value="unsubscribe">Me désabonner de ces fils</option>
            </select>
          </label>
        </>
      )}
      <div class="row end">
        <button class="btn" onClick={onDone}>Annuler</button>
        <button class="btn btn-danger-solid" onClick={() => void confirm()}>Confirmer la suppression</button>
      </div>
    </div>
  );
}
