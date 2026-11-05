// Ouverture des articles dans un navigateur choisi sur Android (EXG-038)

export interface AndroidBrowser {
  id: string;
  label: string;
  pkg?: string; // nom du paquet Android ; absent = comportement standard
  activity?: string; // écran précis à ouvrir (évite le menu « Ouverture avec » si Chrome le respecte)
}

export const ANDROID_BROWSERS: AndroidBrowser[] = [
  { id: 'auto', label: 'Automatique (onglet intégré de Chrome)' },
  { id: 'brave', label: 'Brave', pkg: 'com.brave.browser' },
  {
    id: 'brave2',
    label: 'Brave — méthode 2 (sans menu de choix)',
    pkg: 'com.brave.browser',
    activity: 'org.chromium.chrome.browser.document.ChromeLauncherActivity',
  },
  { id: 'firefox', label: 'Firefox', pkg: 'org.mozilla.firefox' },
  { id: 'edge', label: 'Microsoft Edge', pkg: 'com.microsoft.emmx' },
  { id: 'samsung', label: 'Samsung Internet', pkg: 'com.sec.android.app.sbrowser' },
  { id: 'chrome', label: 'Chrome (application complète)', pkg: 'com.android.chrome' },
];

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** Vrai dans l'appli Android FilActu (EXG-004) : elle confie elle-même les liens au navigateur par défaut. */
export function isAndroidApp(userAgent: string): boolean {
  return /FilActuAndroid\//.test(userAgent);
}

/** Le réglage « Ouvrir les articles avec » n'a de sens que sur Android, hors de l'appli FilActu. */
export function canChooseBrowser(userAgent: string): boolean {
  return isAndroid(userAgent) && !isAndroidApp(userAgent);
}

/**
 * Lien intent:// qui demande à Android d'ouvrir l'adresse avec une application précise,
 * et revient à l'adresse normale si cette application n'est pas installée.
 */
export function intentUrl(link: string, pkg: string, activity?: string): string {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return link;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return link;
  const scheme = u.protocol.slice(0, -1);
  const component = activity ? `component=${pkg}/${activity};` : '';
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;package=${pkg};${component}S.browser_fallback_url=${encodeURIComponent(link)};end`;
}

/** Adresse à utiliser pour ouvrir un article selon le navigateur choisi. */
export function articleHref(link: string, browserId: string, userAgent: string): string {
  if (!canChooseBrowser(userAgent)) return link;
  const b = ANDROID_BROWSERS.find((x) => x.id === browserId);
  return b?.pkg ? intentUrl(link, b.pkg, b.activity) : link;
}

export type FontSize = 'small' | 'normal' | 'large';
export const FONT_SIZES: { id: FontSize; label: string; scale: number }[] = [
  { id: 'small', label: 'Petit', scale: 0.88 },
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'large', label: 'Grand', scale: 1.15 },
];

export function fontScale(size: string): number {
  return FONT_SIZES.find((f) => f.id === size)?.scale ?? 1;
}
