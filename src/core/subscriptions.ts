// Opérations sur les abonnements et les catégories (EXG-011, EXG-013, EXG-016).
// Fonctions pures : elles sont rejouées sur la version distante en cas de conflit (EXG-075).
import { feedIdFor, normalizeUrl, slug } from './hash';
import { safeHttpUrl } from './text';
import type { Category, Feed, FeedsStatus, Subscriptions } from './types';

export class SubscriptionError extends Error {}

/** Palette d'icônes proposée pour les catégories (EXG-016). */
export const CATEGORY_ICONS = [
  '📰', '💻', '🔬', '🧠', '🎮', '🎲', '🎬', '📺', '🎵', '📚', '⚽', '🏀',
  '🚴', '🍳', '🍷', '✈️', '💼', '💰', '🏛️', '🌍', '🚗', '🏠', '🎨', '📷',
  '🩺', '🌱', '🐾', '👶', '🎭', '🔧', '🛒', '⭐', '📁',
];

/** Mots-clés → icône (EXG-018). Ordre important : le premier mot-clé trouvé gagne. */
const ICON_RULES: [RegExp, string][] = [
  [/jeux? de societe|board ?game|ludique|plateau/, '🎲'],
  [/basket|nba/, '🏀'],
  [/velo|cycl|running|course a pied|marathon|trail|triathlon/, '🚴'],
  [/sport|foot|rugby|tennis|ligue|olymp|f1|formule 1/, '⚽'],
  [/\bia\b|intelligence artificielle|\bai\b|cerveau|psycho/, '🧠'],
  [/jeu|jeux|gaming|gamer|vid[eé]oludique|\bjv\b|console|nintendo|playstation|xbox/, '🎮'],
  [/cinema|film|serie|netflix|streaming/, '🎬'],
  [/youtube|video|tele|\btv\b|podcast/, '📺'],
  [/musique|music|concert|rock|jazz|rap/, '🎵'],
  [/livre|lecture|litterature|\bbd\b|manga|roman|book/, '📚'],
  [/science|recherche|espace|astro|physique|chimie|biolog/, '🔬'],
  [/tech|informatique|numerique|digital|dev|code|programm|logiciel|geek|high-tech|android|apple|linux|web/, '💻'],
  [/cuisine|recette|food|gastro|resto|patisserie/, '🍳'],
  [/\bvins?\b|biere|oenolog|cocktail/, '🍷'],
  [/nature|ecolo|environnement|climat|planete|green/, '🌱'],
  [/voyage|travel|tourisme|vacances/, '✈️'],
  [/travail|emploi|business|entreprise|pro\b|carriere|management|startup|rh\b/, '💼'],
  [/financ|argent|bourse|\beco\b|economi|crypto|banque|invest|immobilier/, '💰'],
  [/politi|gouvern|election|societe|droit|justice/, '🏛️'],
  [/monde|international|europe|geopoliti/, '🌍'],
  [/auto|voiture|moto|mobilite|transport/, '🚗'],
  [/maison|deco|habitat|bricolage|diy|jardin/, '🏠'],
  [/\barts?\b|design|graphi|dessin|archi/, '🎨'],
  [/photo/, '📷'],
  [/sante|medec|bien-etre|nutrition|fitness/, '🩺'],
  [/animal|animaux|chien|chat|nature sauvage/, '🐾'],
  [/famille|enfant|parent|bebe/, '👶'],
  [/humour|rire|blague|satire|parodie|gorafi/, '🎭'],
  [/shopping|bon plan|promo|achat|deal/, '🛒'],
  [/actu|news|info|presse|journal|quotidien|medias?/, '📰'],
];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Icône proposée pour un nom de catégorie ; 📁 si rien ne correspond (EXG-018). */
export function suggestIcon(name: string): string {
  const n = normalize(name);
  for (const [re, icon] of ICON_RULES) if (re.test(n)) return icon;
  return '📁';
}

/** Ajoute une icône suggérée aux catégories qui n'en ont pas. */
export function fillMissingIcons(subs: Subscriptions, now = new Date()): Subscriptions {
  if (subs.categories.every((c) => c.icon)) return subs;
  return touch(subs, now, {
    categories: subs.categories.map((c) => (c.icon ? c : { ...c, icon: suggestIcon(c.name) })),
  });
}

function touch(subs: Subscriptions, now: Date, patch: Partial<Subscriptions>): Subscriptions {
  return { ...subs, ...patch, updatedAt: now.toISOString() };
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function assertFreeName(subs: Subscriptions, name: string, exceptId?: string) {
  if (!name) throw new SubscriptionError('Donnez un nom à la catégorie');
  if (subs.categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())) {
    throw new SubscriptionError(`La catégorie « ${name} » existe déjà`);
  }
}

function newCategoryId(subs: Subscriptions, name: string): string {
  let id = slug(name);
  while (subs.categories.some((c) => c.id === id)) id += '-2';
  return id;
}

export function createCategory(
  subs: Subscriptions,
  name: string,
  icon?: string,
  now = new Date(),
): { subs: Subscriptions; id: string } {
  const n = cleanName(name);
  assertFreeName(subs, n);
  const id = newCategoryId(subs, n);
  const order = subs.categories.reduce((m, c) => Math.max(m, c.order + 1), 0);
  const cat: Category = { id, name: n, order };
  if (icon) cat.icon = icon;
  return { subs: touch(subs, now, { categories: [...subs.categories, cat] }), id };
}

export function updateCategory(
  subs: Subscriptions,
  id: string,
  patch: { name?: string; icon?: string | null },
  now = new Date(),
): Subscriptions {
  const cat = subs.categories.find((c) => c.id === id);
  if (!cat) throw new SubscriptionError('Catégorie introuvable');
  const next: Category = { ...cat };
  if (patch.name !== undefined) {
    const n = cleanName(patch.name);
    assertFreeName(subs, n, id);
    next.name = n;
  }
  if (patch.icon !== undefined) {
    if (patch.icon) next.icon = patch.icon;
    else delete next.icon;
  }
  return touch(subs, now, { categories: subs.categories.map((c) => (c.id === id ? next : c)) });
}

/** Fils qui n'appartiennent qu'à cette catégorie (ceux qu'il faut déplacer ou désabonner). */
export function exclusiveFeeds(subs: Subscriptions, id: string): Feed[] {
  return subs.feeds.filter((f) => f.categories.length === 1 && f.categories[0] === id);
}

export type DeleteMode = { moveTo: string } | 'unsubscribe';

export function deleteCategory(subs: Subscriptions, id: string, mode: DeleteMode, now = new Date()): Subscriptions {
  if (!subs.categories.some((c) => c.id === id)) throw new SubscriptionError('Catégorie introuvable');
  const moveTo = mode === 'unsubscribe' ? undefined : mode.moveTo;
  if (moveTo !== undefined && (moveTo === id || !subs.categories.some((c) => c.id === moveTo))) {
    throw new SubscriptionError('Choisissez une autre catégorie de destination');
  }
  const feeds: Feed[] = [];
  for (const f of subs.feeds) {
    if (!f.categories.includes(id)) {
      feeds.push(f);
      continue;
    }
    const rest = f.categories.filter((c) => c !== id);
    if (rest.length) feeds.push({ ...f, categories: rest });
    else if (moveTo) feeds.push({ ...f, categories: [moveTo] });
    // sinon : désabonnement
  }
  const categories = subs.categories
    .filter((c) => c.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));
  return touch(subs, now, { categories, feeds });
}

/** Déplace une catégorie d'un cran vers le haut (-1) ou le bas (+1). */
export function moveCategory(subs: Subscriptions, id: string, delta: -1 | 1, now = new Date()): Subscriptions {
  const sorted = [...subs.categories].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= sorted.length) return subs;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  return touch(subs, now, { categories: sorted.map((c, k) => ({ ...c, order: k })) });
}

export interface NewFeed {
  url: string;
  title?: string;
  categoryId?: string; // catégorie existante
  newCategory?: { name: string; icon?: string }; // ou catégorie à créer
}

export function addFeed(subs: Subscriptions, input: NewFeed, now = new Date()): { subs: Subscriptions; feed: Feed } {
  let raw = input.url.trim();
  if (raw && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
  const url = safeHttpUrl(raw);
  if (!url || !/^https?:\/\/[^/]+\.[^/]+/.test(url)) throw new SubscriptionError('Adresse invalide : saisissez une adresse web (https://…)');
  const id = feedIdFor(url);
  const norm = normalizeUrl(url);
  const existing = subs.feeds.find((f) => f.id === id || normalizeUrl(f.url) === norm);
  if (existing) throw new SubscriptionError(`Vous êtes déjà abonné à ce fil (« ${existing.title || url} »)`);

  let next = subs;
  let categoryId = input.categoryId;
  if (input.newCategory) {
    const r = createCategory(next, input.newCategory.name, input.newCategory.icon, now);
    next = r.subs;
    categoryId = r.id;
  }
  if (!categoryId || !next.categories.some((c) => c.id === categoryId)) {
    throw new SubscriptionError('Choisissez une catégorie');
  }
  const feed: Feed = {
    id,
    url,
    title: cleanName(input.title ?? ''),
    categories: [categoryId],
    addedAt: now.toISOString(),
    status: 'pending',
  };
  return { subs: touch(next, now, { feeds: [...next.feeds, feed] }), feed };
}

/** Renommer un fil ou changer ses catégories (EXG-012). */
export function updateFeed(
  subs: Subscriptions,
  id: string,
  patch: { title?: string; categories?: string[] },
  now = new Date(),
): Subscriptions {
  const feed = subs.feeds.find((f) => f.id === id);
  if (!feed) throw new SubscriptionError('Fil introuvable');
  const next: Feed = { ...feed };
  if (patch.title !== undefined) next.title = cleanName(patch.title);
  if (patch.categories !== undefined) {
    const cats = [...new Set(patch.categories)].filter((c) => subs.categories.some((x) => x.id === c));
    if (!cats.length) throw new SubscriptionError('Un fil doit rester rangé dans au moins une catégorie');
    next.categories = cats;
  }
  return touch(subs, now, { feeds: subs.feeds.map((f) => (f.id === id ? next : f)) });
}

/** Se désabonner d'un fil (EXG-012). */
export function removeFeed(subs: Subscriptions, id: string, now = new Date()): Subscriptions {
  if (!subs.feeds.some((f) => f.id === id)) throw new SubscriptionError('Fil introuvable');
  return touch(subs, now, { feeds: subs.feeds.filter((f) => f.id !== id) });
}

/** Nom affiché d'un fil : nom saisi, sinon titre trouvé par le collecteur, sinon nom du site. */
export function feedLabel(feed: Pick<Feed, 'id' | 'title' | 'url'>, status?: FeedsStatus): string {
  if (feed.title) return feed.title;
  const fromCollector = status?.feeds[feed.id]?.title;
  if (fromCollector) return fromCollector;
  try {
    return new URL(feed.url).hostname.replace(/^www\./, '');
  } catch {
    return feed.url;
  }
}
