import { collect } from './collect';

const dataDir = process.env.FILACTU_DATA_DIR ?? './data';

collect({ dataDir, log: (l) => console.log(l) })
  .then((s) => {
    // Code de sortie 0 même si certains fils sont en erreur : ils sont signalés dans l'appli (EXG-015)
    if (s.feeds > 0 && s.errors === s.feeds) console.log('Attention : tous les fils sont en erreur.');
  })
  .catch((e) => {
    // Message générique uniquement (DEC-03)
    console.error('Échec de la collecte :', e instanceof Error ? e.name : 'erreur');
    process.exit(1);
  });
