# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.3.0] — 2026-11-06 — Icône et thème sur Android

### Modifié
- Nouvelle icône aux couleurs « tableau » : carré encre, fil clair, ondes et point en jaune signal. Elle remplace l'ancien carré vert partout : écran d'accueil, onglet du navigateur, logo du volet et de l'écran de connexion (EXG-083).
- La barre du navigateur prend la couleur du fond affiché (clair ou encre), y compris quand le thème est forcé dans Réglages (EXG-083).

### Corrigé
- Appli Android 1.1.0 : le thème « Automatique » suit enfin le téléphone. L'appli annonçait toujours un thème sombre au site ; elle annonce désormais le thème du téléphone et bascule dès qu'il change. Les barres du haut et du bas prennent la couleur du fond, avec des icônes lisibles (EXG-084). **Installer la nouvelle APK** (`FilActu-1.1.0.apk`).

## [1.2.2] — 2026-11-06

### Corrigé
- Le lien « Guide » des Réglages offre toujours une zone de toucher d'au moins 44 px, quelle que soit la largeur de la police (ENF-02).
- Mesure de vitesse (ENF-01) : l'instant d'affichage est relevé dans la page elle-même, sans compter les échanges entre le test et le navigateur, très lents sur les machines de GitHub. Les versions 1.2.0 et 1.2.1 n'avaient pas été mises en ligne à cause de ces deux tests.

## [1.2.1] — 2026-11-06

### Corrigé
- La touche Échap ferme une fenêtre dès qu'elle s'affiche (auparavant, un appui très rapide juste après l'ouverture pouvait être ignoré). La version 1.2.0 n'avait pas été mise en ligne à cause de ce défaut, détecté par les tests de GitHub.

## [1.2.0] — 2026-11-06 — Identité visuelle

Nouvelle identité choisie par le propriétaire (piste « tableau », sans l'analogie de la gare).

### Modifié
- Thème sombre « tableau » : fond encre, titres presque blancs, sources en jaune signal, actions en bleu ; thème clair avec la même mise en page (sources en ambre). Le thème suit le téléphone et peut être forcé dans Réglages.
- Affichage Magazine : la source (icône ronde et nom complet) et la fraîcheur, discrète, sur une ligne, avec les boutons alignés à droite ; le titre dessous, plus grand et **jamais coupé** ; l'image à droite, plus grande (112 × 84 sur téléphone) et aux coins arrondis (EXG-039).
- Polices Barlow et Barlow Condensed, hébergées avec l'appli.
- Formes adoucies : boutons ronds, pastilles rondes, images aux coins arrondis ; bouton de fin de page plein, en bleu.
- Cartes sans image : plus de grand bloc vide.

## [1.1.0] — 2026-11-06 — Lisibilité

Suite de l'analyse d'interface du 2026-11-06.

### Modifié
- La recherche trouve aussi les articles déjà lus ; sur téléphone, le champ de recherche prend toute la barre du haut (EXG-063).
- Les boutons « Lire plus tard » et « lu / non lu » restent alignés d'un article à l'autre, avec ou sans image ; le bouton lu / non lu devient un cercle vide (non lu) ou un cercle vert coché (lu), lisible dans les deux thèmes (EXG-046).
- Le bandeau « articles pas à jour » est écrit en langage courant, avec un lien « Comment réparer » et un bouton pour le fermer ; Réglages indiquent « Dernière mise à jour : il y a … » (EXG-082).
- Un fil en erreur explique depuis quand et pourquoi il ne répond plus, en mots simples ; les lecteurs d'écran annoncent « en erreur » (EXG-019).

### Corrigé
- La notification « Annuler » cachait les boutons des fenêtres et, sur téléphone, le bouton « Réglages » du volet (EXG-047).
- Capture d'écran du guide « options d'affichage » prise pendant la fermeture du volet.

## [1.0.1] — 2026-11-06

### Modifié
- Quand GitHub refuse passagèrement l'enregistrement d'une collecte (erreur de ses serveurs), le robot réessaie 6 fois avec des attentes croissantes, pendant près de 2 minutes, au lieu d'abandonner après 18 secondes (EXG-081).

## [1.0.0] — 2026-11-05 — Version 1

### Ajouté
- Accessibilité vérifiée à chaque modification sur tous les écrans, en thème clair et sombre (outil axe-core) : contrastes, libellés, zones de toucher d'au moins 44 px sur téléphone et tablette, parcours complet au clavier (ENF-02).
- Les fenêtres reçoivent le focus à l'ouverture, gardent `Tab` à l'intérieur et le rendent au bouton d'origine à la fermeture (ENF-02).
- Mesure de vitesse : liste affichée depuis le cache en moins de 1,5 s avec 2 000 articles sur un téléphone simulé de milieu de gamme (environ 0,7 s mesuré), défilement à 60 images par seconde (ENF-01).
- Audit Lighthouse à chaque modification (performance, accessibilité, bonnes pratiques : 100/100 en local) ; la mise en ligne attend qu'il soit vert.
- Tests ciblés des fenêtres et de la palette d'icônes ; tests de compatibilité (ENF-06), de langue (ENF-07), de coût nul (ENF-05) et de confidentialité (ENF-04).
- Guide utilisateur illustré de captures d'écran ; fiche de recette manuelle (`docs/RECETTE.md`).

### Modifié
- Boutons verts plus contrastés (vert plus foncé en thème clair, texte foncé en thème sombre) ; texte secondaire et rouge d'alerte du thème sombre éclaircis pour la lisibilité.
- Sur téléphone et tablette, les boutons des articles, de l'en-tête, du volet et des fenêtres sont plus grands (44 px).

### Retiré
- Firefox sur PC ne fait plus partie des navigateurs visés (ENF-06).

## [0.4.2] — 2026-11-05 — Grands volumes

### Ajouté
- La collecte se termine toujours avant la limite de 10 minutes de GitHub : au bout de 6 minutes, le robot n'entame plus de fil ni de page d'article, enregistre ce qu'il a collecté et reporte les fils restants au passage suivant, sans les compter en erreur (EXG-080).
- Les fils interrogés il y a le plus longtemps passent en premier, pour qu'aucun ne soit oublié.
- Test de charge : 300 fils et 6 000 articles sans image collectés en une fois (ENF-08).

### Corrigé
- Le nombre de vignettes trouvées sur les pages, affiché dans le journal de collecte, était sous-estimé.

## [0.4.1] — 2026-11-05 — Vignettes

### Ajouté
- Quand un nouvel article n'a pas d'image dans son fil, le collecteur va chercher l'image de partage de sa page (`og:image`, sinon `twitter:image`) : au plus 20 pages par fil et par collecte, 10 s par page, sans mettre le fil en erreur si la page ne répond pas (EXG-079).

## [0.4.0] — 2026-11-05 — Appli Android

### Ajouté
- Appli Android FilActu (APK, dossier `android/`) : affiche FilActu et ouvre chaque article directement dans le navigateur par défaut du téléphone (Brave…), sans onglet intégré ni menu de choix (EXG-004, DEC-08).
- Dans l'appli Android, le réglage « Ouvrir les articles avec » est masqué (inutile).
- CI : tests et fabrication de l'appli Android à chaque modification.

## [0.3.4] — 2026-11-05 — Fraîcheur des articles

### Ajouté
- L'appli lance elle-même une collecte à l'ouverture si la dernière date de plus de 20 minutes, car GitHub espace les collectes planifiées de plusieurs heures (EXG-078).

### Modifié
- Le bandeau « dernière collecte de plus de 2 heures » indique la cause la plus probable : la clé du robot (`DATA_REPO_TOKEN`) a expiré.

## [0.3.3] — 2026-11-04

### Ajouté
- Option « Brave — méthode 2 » : vise directement l'écran de Brave pour éviter le menu « Ouverture avec » (EXG-038).

## [0.3.2] — 2026-11-04 — Confort de lecture

### Ajouté
- Taille du texte des articles sur 3 niveaux (Petit, Normal, Grand), réglée séparément pour le PC et le téléphone (EXG-037).
- Sur Android, choix du navigateur qui ouvre les articles (Brave, Firefox, Edge, Samsung Internet, Chrome) au lieu de l'onglet intégré de Chrome (EXG-038).

### Documentation
- Guide : vider le cache de Chrome règle le message « appli déjà installée ».

## [0.3.1] — 2026-11-04

### Modifié
- « Afficher le début de l'article » se règle séparément sur grand écran (activé par défaut, version riche) et sur téléphone (désactivé par défaut, version compacte) (EXG-036).
- Le manifeste porte un identifiant d'application stable (`id`), et il est toujours relu depuis le réseau : une installation Android ratée auparavant ne bloque plus une nouvelle installation (EXG-003).

### Documentation
- Guide : marche à suivre quand Android indique « appli déjà installée » / « impossible de lancer l'application ».

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
