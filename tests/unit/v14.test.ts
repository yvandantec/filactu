import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const res = 'android/app/src/main/res';

const YELLOW = '#ffcf3a';
const BLUE = '#2c6bed';
const INK = '#12161c';

describe('V1.4 — icône jaune et bleue', () => {
  test('EXG-085 · l’icône a un fond jaune, des ondes bleues, un fil et un point encre, partout', () => {
    for (const f of ['assets/logo.svg', 'public/icons/logo.svg', 'assets/logo-maskable.svg', 'assets/logo-wordmark.svg', 'src/ui/icons.tsx']) {
      const svg = read(f).toLowerCase();
      // Fond jaune (carré arrondi, ou plein cadre pour la variante maskable)
      expect(svg, f).toMatch(new RegExp(`<rect[^>]*fill="${YELLOW}"`));
      // Les deux ondes en bleu
      expect(svg.match(new RegExp(`a\\d+ \\d+ 0 0 1 \\d+ 348" stroke="${BLUE}"`, 'g'))?.length, f).toBe(2);
      // Fil et point en encre ; plus de fil clair
      expect(svg, f).toMatch(new RegExp(`c 112 236 118 352 178 348" stroke="${INK}"`));
      expect(svg, f).toMatch(new RegExp(`<circle[^>]*fill="${INK}"`));
      expect(svg, f).not.toMatch(/#f4f5f7/);
    }
    expect(read('assets/logo.svg')).toBe(read('public/icons/logo.svg'));

    // Nouvelles adresses : les navigateurs gardent sinon l'ancienne icône en mémoire
    const links = [...read('index.html').matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const href of links) expect(href, href).toMatch(/\?v=jaune$/);
    for (const icon of JSON.parse(read('public/manifest.webmanifest')).icons) expect(icon.src).toMatch(/\?v=jaune$/);

    // Icône adaptative Android : fond jaune ; nouvelle APK à installer
    expect(read(`${res}/mipmap-anydpi-v26/ic_launcher.xml`)).toMatch(/@color\/filactu_icon_bg/);
    expect(read(`${res}/values/colors.xml`)).toMatch(/name="filactu_icon_bg">#FFCF3A</i);
    const gradle = read('android/app/build.gradle.kts');
    expect(Number(/versionCode = (\d+)/.exec(gradle)![1])).toBeGreaterThanOrEqual(3);
    // 1.2.0 ou plus récente (la 1.3.0 ajoute l'export OPML, EXG-089)
    const [major, minor] = /versionName = "(\d+)\.(\d+)\.\d+"/.exec(gradle)!.slice(1).map(Number);
    expect(major * 100 + minor).toBeGreaterThanOrEqual(102);
  });
});
