# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.3.0] — 2026-11-04 — Lots V0.2 et V0.3, affichage compact

### Ajouté
- Trois affichages au choix par vue : Titres, Magazine compact façon Feedly, Cartes (EXG-030).
- Option « Afficher le début de l'article », désactivée par défaut : une dizaine d'articles par écran de téléphone (EXG-036).
- Résumé au survol (PC) ou à l'appui long (mobile) en affichage Titres (EXG-032).
- Filtre « Non lus seulement » (par défaut) et tri « Plus anciens d'abord » par vue (EXG-023, EXG-024).
- Marquer lu en défilant, réglable (EXG-041).
- Balayage sur mobile : gauche = lu / non lu, droite = à lire plus tard (EXG-042, EXG-050).
- « Tout marquer comme lu » : tout, plus vieux qu'un jour, plus vieux qu'une semaine, avec Annuler pendant 10 s (EXG-043).
- À lire plus tard : bouton, liste dédiée, conservation sans limite (EXG-050, EXG-051).
- Renommer un fil, changer ses catégories, se désabonner (EXG-012).
- Icône proposée automatiquement d'après le nom de la catégorie, y compris à l'import, et bouton « Proposer les icônes manquantes » (EXG-018).
- Recherche sans accents, dans la vue ou partout (EXG-060).
- Thème clair, sombre ou automatique, synchronisé (EXG-061).
- Raccourcis clavier sur PC et aide (`?`) (EXG-062).
- Mode hors connexion : bandeau, lecture du cache, actions envoyées au retour du réseau (EXG-074).
- Rechargement automatique après « Actualiser », et message si la collecte tarde (EXG-071).
- Réglage « Masquer les fils sans articles non lus » (EXG-020).

### Modifié
- Préférences d'affichage synchronisées entre appareils.

## [0.1.3] — 2026-11-04 — Fils YouTube

### Ajouté
- Les adresses de playlist et de chaîne YouTube sont reconnues et converties en fil (EXG-017).
- Les vidéos YouTube affichent leur description comme résumé et leur miniature comme vignette.

## [0.1.2] — 2026-11-04 — Abonnements et catégories

### Ajouté
- Bouton « Ajouter un fil » : adresse du fil ou du site, nom facultatif, catégorie existante ou nouvelle (EXG-011).
- Écran « Gérer les catégories » : créer, renommer, réordonner, supprimer (avec déplacement des fils ou désabonnement) (EXG-013).
- Icône au choix pour chaque catégorie, affichée dans le volet (EXG-016).
- En bas de la liste, bouton pour marquer comme lus les articles affichés (EXG-045).

### Modifié
- Un fil sans nom saisi prend le titre trouvé par le collecteur, sinon le nom du site.
- Un doublon d'abonnement est détecté aussi par son adresse.

## [0.1.1] — 2026-11-04

### Corrigé
- Le robot de collecte ne démarrait pas (fichier de workflow invalide) : le bouton Actualiser affichait « Collecte impossible à lancer (422) ».
- Nouveau test qui vérifie la validité de tous les workflows GitHub.

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
