// Enregistrement d'un fichier produit par l'appli (export OPML) — EXG-014, EXG-089
import { isAndroidApp } from './links';

/** Passerelle exposée par l'appli Android FilActu (1.3.0 et plus) : ouvre la fenêtre d'enregistrement d'Android. */
export interface AndroidBridge {
  saveFile(name: string, mime: string, content: string): void;
}

/**
 * Comment enregistrer le fichier :
 * - `android` : l'appli Android le reçoit et l'enregistre (la WebView ignore les téléchargements) ;
 * - `old-app` : ancienne appli Android sans passerelle, il faut installer la nouvelle APK ;
 * - `browser` : téléchargement normal du navigateur.
 */
export function saveMethod(userAgent: string, hasBridge: boolean): 'android' | 'old-app' | 'browser' {
  if (hasBridge) return 'android';
  return isAndroidApp(userAgent) ? 'old-app' : 'browser';
}
