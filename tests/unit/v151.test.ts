import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { saveMethod } from '../../src/core/download';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const PHONE = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const APP = 'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 FilActuAndroid/1.3.0';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

describe('V1.5.1 — export sur Android', () => {
  test('EXG-089 · le fichier exporté passe par l’appli Android, ou par le navigateur ailleurs', () => {
    // Appli Android récente : elle reçoit le fichier et ouvre la fenêtre d'enregistrement
    expect(saveMethod(APP, true)).toBe('android');
    // Ancienne appli (sans passerelle) : message au lieu de ne rien faire
    expect(saveMethod(APP, false)).toBe('old-app');
    // PC et navigateur du téléphone : téléchargement normal
    expect(saveMethod(PC, false)).toBe('browser');
    expect(saveMethod(PHONE, false)).toBe('browser');
  });

  test('EXG-089 · l’appli Android ouvre la fenêtre d’enregistrement et confirme', () => {
    const java = read('android/app/src/main/java/fr/yvan/filactu/MainActivity.java');
    expect(java).toMatch(/addJavascriptInterface\(new Bridge\(\), "FilActuAndroid"\)/);
    expect(java).toMatch(/@JavascriptInterface\s+public void saveFile\(String name, String mime, String content\)/);
    expect(java).toMatch(/Intent\.ACTION_CREATE_DOCUMENT/);
    expect(java).toMatch(/Intent\.EXTRA_TITLE/);
    const strings = read('android/app/src/main/res/values/strings.xml');
    expect(strings).toMatch(/name="file_saved"/);
    expect(strings).toMatch(/name="file_not_saved"/);
    // Nouvelle version de l'APK à installer (1.3.0)
    const gradle = read('android/app/build.gradle.kts');
    expect(Number(/versionCode = (\d+)/.exec(gradle)![1])).toBeGreaterThanOrEqual(4);
    expect(gradle).toMatch(/versionName = "1\.3\.0"/);
  });
});
