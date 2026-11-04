# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.1.0] — 2026-11-04 — Socle

### Ajouté
- Application web installable (PC, téléphone, tablette Android) publiée sur GitHub Pages.
- Connexion par clé GitHub, mémorisée sur l'appareil ; déconnexion qui efface tout (EXG-001, 002, 003).
- Import des abonnements Feedly (OPML) et export OPML (EXG-010, 014).
- Volet de navigation façon Feedly : Aujourd'hui, Tous les articles, À lire plus tard, catégories dépliables, compteurs de non-lus, fils en erreur signalés (EXG-015, 020, 021).
- Affichage Magazine : vignette, titre, source, auteur, âge, résumé en texte brut (EXG-030, 031).
- Un clic ouvre l'article dans le navigateur et le marque lu ; bascule lu/non lu ; tout marquer lu (EXG-033, 040, 042, 043).
- Synchronisation de l'état de lecture via le dépôt privé, fusion sans perte entre appareils (EXG-073, 075, 076).
- Robot de collecte toutes les 15 minutes : RSS, Atom, RDF, découverte du fil depuis une adresse de site, dédoublonnage, purge à 30 jours, journaux sans données personnelles (EXG-070, 072, 077, DEC-03).
- Bouton Actualiser qui lance une collecte immédiate (EXG-071).
- Harnais de tests : unitaires, collecteur, bout en bout sur 3 formats d'écran avec un faux GitHub, matrice de traçabilité, CI GitHub Actions.

### Cadrage
- Nom, logo, spécifications, guide utilisateur, stratégie de tests et processus d'évolution.
- Dépôts GitHub `filactu` (public) et `filactu-data` (privé).
