import { render } from 'preact';
import { Store } from './app/store';
import { App } from './ui/App';
// Polices hébergées avec l'appli (EXG-039) : la politique de sécurité interdit les polices externes
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';

const store = new Store();
render(<App store={store} />, document.getElementById('app')!);
void store.boot();

// Application installable et utilisable hors connexion (EXG-003)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

// Accès pour les tests de bout en bout
(window as unknown as { __filactu: Store }).__filactu = store;
