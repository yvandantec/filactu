// Ouverture des articles dans un navigateur choisi sur Android (EXG-038)

export interface AndroidBrowser {
  id: string;
  label: string;
  pkg?: string; // nom du paquet Android ; absent = comportement standard
}

export const ANDROID_BROWSERS: AndroidBrowser[] = [
  { id: 'auto', label: 'Automatique (onglet intégré de Chrome)' },
  { id: 'brave', label: 'Brave', pkg: 'com.brave.browser' },
  { id: 'firefox', label: 'Firefox', pkg: 'org.mozilla.firefox' },
  { id: 'edge', label: 'Microsoft Edge', pkg: 'com.microsoft.emmx' },
  { id: 'samsung', label: 'Samsung Internet', pkg: 'com.sec.android.app.sbrowser' },
  { id: 'chrome', label: 'Chrome (application complète)', pkg: 'com.android.chrome' },
];

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/**
 * Lien intent:// qui demande à Android d'ouvrir l'adresse avec une application précise,
 * et revient à l'adresse normale si cette application n'est pas installée.
 */
export function intentUrl(link: string, pkg: string): string {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return link;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return link;
  const scheme = u.protocol.slice(0, -1);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;package=${pkg};S.browser_fallback_url=${encodeURIComponent(link)};end`;
}

/** Adresse à utiliser pour ouvrir un article selon le navigateur choisi. */
export function articleHref(link: string, browserId: string, userAgent: string): string {
  if (!isAndroid(userAgent)) return link;
  const b = ANDROID_BROWSERS.find((x) => x.id === browserId);
  return b?.pkg ? intentUrl(link, b.pkg) : link;
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
