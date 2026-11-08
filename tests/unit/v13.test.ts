import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const res = 'android/app/src/main/res';

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? files(p, ext) : ext.test(f) ? [p] : [];
  });
}

describe('V1.3 — icône et thème sur Android', () => {
  test('EXG-083 · le logo et les couleurs de l’appli reprennent l’identité « tableau », sans l’ancien vert', () => {
    const OLD_GREEN = /#(1E9E5F|2BB673|16884F|16a34a)\b/i;
    const sources = [
      'index.html', 'public/manifest.webmanifest', 'src/ui/icons.tsx', 'src/styles.css',
      ...files('assets', /\.svg$/), ...files('public/icons', /\.svg$/), ...files(res, /\.xml$/),
    ];
    for (const f of sources) expect(read(f), f).not.toMatch(OLD_GREEN);

    // Les couleurs de l'icône relèvent désormais d'EXG-085 (tests/unit/v14.test.ts)
    expect(JSON.parse(read('public/manifest.webmanifest')).theme_color).toBe('#12161c');
  });

  test('EXG-084 · l’appli Android annonce au site le thème du téléphone et bascule avec lui', () => {
    // Le site lit le thème via le thème Android de l'appli (attribut isLightTheme) : clair par défaut, sombre la nuit
    const day = read(`${res}/values/themes.xml`);
    const night = read(`${res}/values-night/themes.xml`);
    expect(day).toMatch(/parent="android:Theme\.Material\.Light\.NoActionBar"/);
    expect(night).toMatch(/parent="android:Theme\.Material\.NoActionBar"/);
    // Icônes des barres système lisibles : foncées sur fond clair, claires sur fond sombre
    expect(day).toMatch(/windowLightStatusBar">true/);
    expect(day).toMatch(/windowLightNavigationBar">true/);
    expect(night).toMatch(/windowLightStatusBar">false/);
    // Fond derrière les barres : celui de l'appli dans chaque thème
    expect(read(`${res}/values/colors.xml`)).toMatch(/name="filactu_bg">#F7F8FA</i);
    expect(read(`${res}/values-night/colors.xml`)).toMatch(/name="filactu_bg">#12161C</i);
    expect(read('android/app/src/main/java/fr/yvan/filactu/MainActivity.java')).toMatch(/R\.color\.filactu_bg/);
    // Changer de thème recrée l'écran (l'appli ne garde pas l'ancien thème)
    const configChanges = /android:configChanges="([^"]*)"/.exec(read('android/app/src/main/AndroidManifest.xml'))![1];
    expect(configChanges.split('|')).not.toContain('uiMode');
    // Nouvelle version de l'APK à installer
    const gradle = read('android/app/build.gradle.kts');
    expect(Number(/versionCode = (\d+)/.exec(gradle)![1])).toBeGreaterThanOrEqual(2);
  });
});
