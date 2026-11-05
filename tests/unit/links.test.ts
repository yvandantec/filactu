import { describe, expect, test } from 'vitest';
import {
  ANDROID_BROWSERS, articleHref, canChooseBrowser, fontScale, FONT_SIZES, intentUrl, isAndroid, isAndroidApp,
} from '../../src/core/links';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

describe('navigateur des articles sur Android', () => {
  test('EXG-038 · lien intent:// vers Brave avec retour à l’adresse normale', () => {
    const link = 'https://www.example.test/article/42?ref=rss#haut';
    expect(intentUrl(link, 'com.brave.browser')).toBe(
      'intent://www.example.test/article/42?ref=rss#Intent;scheme=https;action=android.intent.action.VIEW;' +
        'category=android.intent.category.BROWSABLE;package=com.brave.browser;' +
        `S.browser_fallback_url=${encodeURIComponent(link)};end`,
    );
    expect(intentUrl('http://a.example.test/', 'x')).toContain('scheme=http;');
  });

  test('EXG-038 · seulement sur Android, et seulement si un navigateur est choisi', () => {
    const link = 'https://a.example.test/x';
    expect(articleHref(link, 'brave', ANDROID)).toMatch(/^intent:\/\/.*package=com\.brave\.browser;/);
    expect(articleHref(link, 'auto', ANDROID)).toBe(link);
    expect(articleHref(link, 'inconnu', ANDROID)).toBe(link);
    expect(articleHref(link, 'brave', WINDOWS)).toBe(link);
    expect(isAndroid(ANDROID)).toBe(true);
    expect(isAndroid(WINDOWS)).toBe(false);
  });

  test('EXG-038 · adresses invalides laissées telles quelles', () => {
    expect(intentUrl('pas une url', 'x')).toBe('pas une url');
    expect(intentUrl('mailto:a@example.test', 'x')).toBe('mailto:a@example.test');
  });

  test('EXG-038 · liste des navigateurs proposés', () => {
    expect(ANDROID_BROWSERS.map((b) => b.id)).toEqual(['auto', 'brave', 'brave2', 'firefox', 'edge', 'samsung', 'chrome']);
  });

  test('EXG-038 · méthode 2 : écran de Brave visé directement (sans menu de choix)', () => {
    const href = articleHref('https://a.example.test/x', 'brave2', ANDROID);
    expect(href).toContain(';package=com.brave.browser;');
    expect(href).toContain(';component=com.brave.browser/org.chromium.chrome.browser.document.ChromeLauncherActivity;');
    expect(href).toContain('S.browser_fallback_url=');
  });
});

describe('appli Android FilActu', () => {
  const APP = ANDROID + ' FilActuAndroid/1.0.0';
  test('EXG-004 · dans l’appli Android, les liens restent normaux et le réglage est masqué', () => {
    expect(isAndroidApp(APP)).toBe(true);
    expect(isAndroidApp(ANDROID)).toBe(false);
    expect(canChooseBrowser(APP)).toBe(false);
    expect(canChooseBrowser(ANDROID)).toBe(true);
    expect(canChooseBrowser(WINDOWS)).toBe(false);
    expect(articleHref('https://a.example.test/x', 'brave2', APP)).toBe('https://a.example.test/x');
  });
});

describe('taille du texte', () => {
  test('EXG-037 · trois niveaux, Normal par défaut', () => {
    expect(FONT_SIZES.map((f) => f.label)).toEqual(['Petit', 'Normal', 'Grand']);
    expect(fontScale('small')).toBeLessThan(1);
    expect(fontScale('normal')).toBe(1);
    expect(fontScale('large')).toBeGreaterThan(1);
    expect(fontScale('inconnu')).toBe(1);
  });
});
