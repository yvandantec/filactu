# FilActu — Spécifications

> Version 0.1 — 2026-11-04 — validée ; lots **V0.1 à V0.3.1 livrés** (voir [TRACABILITE.md](TRACABILITE.md))
> Chaque exigence porte un identifiant (`EXG-…`). Les tests y font référence : voir [STRATEGIE-TESTS.md](STRATEGIE-TESTS.md).

## 1. Vision

FilActu est un lecteur de fils RSS personnel, inspiré de Feedly :

- une **seule application web installable** (PWA) qui s'utilise sur PC, sur téléphone et sur tablette Android ;
- un **robot GitHub** qui récupère les fils toutes les 15 minutes ;
- un **état synchronisé** (abonnements, articles lus, articles à lire plus tard) rangé dans un dépôt GitHub privé, pour reprendre la lecture depuis n'importe quel appareil ;
- pas de serveur à administrer et un coût nul.

### Hors périmètre (V1)

- Lecture de l'article complet dans l'appli : un clic ouvre toujours le navigateur par défaut.
- Multi-utilisateur, partage, annotations, surlignage, IA, filtres automatiques, notifications push.
- Fils nécessitant une authentification.

## 2. Glossaire

| Terme | Définition |
|---|---|
| **Fil** (feed) | Une source RSS/Atom/RDF identifiée par son URL. |
| **Abonnement** | Un fil suivi par l'utilisateur, avec un titre personnalisable, rangé dans une ou plusieurs catégories. |
| **Catégorie** | Regroupement nommé d'abonnements (équivalent des « Feeds » de Feedly). |
| **Article** (item) | Un élément d'un fil : titre, lien, date, auteur, résumé, image. |
| **Résumé** | Texte brut extrait de la description de l'article, tronqué à environ 400 caractères. |
| **Lu / non lu** | État d'un article pour l'utilisateur. |
| **À lire plus tard** | Liste d'articles mis de côté, conservés sans limite de durée. |
| **Collecteur** | Le programme lancé par GitHub Actions qui télécharge les fils et produit les fichiers d'articles. |
| **Dépôt app** | `yvandantec/filactu` (public) : code, documentation, tests, collecteur, workflows, site GitHub Pages. |
| **Dépôt données** | `yvandantec/filactu-data` (privé) : abonnements, état de lecture, articles collectés. |
| **Clé** | Jeton d'accès personnel GitHub (fine-grained) saisi une fois par appareil. |

## 3. Architecture

```
            ┌────────────────────────── GitHub ───────────────────────────┐
            │                                                              │
            │  filactu (public)                 filactu-data (privé)       │
            │  ├─ app PWA ──► GitHub Pages      ├─ state/subscriptions.json│
            │  ├─ collector/                    ├─ state/reading.json      │
            │  └─ .github/workflows/collect.yml ├─ items/2026-11-04.json   │
            │        │  toutes les 15 min       ├─ items/…                 │
            │        └─ lit les abonnements ───►└─ meta/feeds-status.json  │
            │           écrit les articles ────►                           │
            └──────────────────────────────────────────────────────────────┘
                    ▲                         ▲
     charge l'app   │                         │  lit/écrit via l'API GitHub
     (HTTPS)        │                         │  avec la clé de l'appareil
              ┌─────┴─────────────────────────┴─────┐
              │  PC (navigateur) · Téléphone · Tablette │
              └─────────────────────────────────────────┘
```

### 3.1 Choix structurants (décisions)

| ID | Décision | Raison |
|---|---|---|
| DEC-01 | PWA unique pour tous les appareils | Un seul code à faire évoluer et à tester ; installable sur Android. |
| DEC-02 | Le collecteur tourne dans le **dépôt public** et écrit dans le dépôt privé | Les minutes GitHub Actions sont illimitées pour un dépôt public. Une collecte toutes les 15 min dans un dépôt privé (~2 900 min/mois) dépasserait le quota gratuit (2 000 min/mois). |
| DEC-03 | Les journaux du collecteur ne contiennent **aucune URL, aucun titre de fil ni d'article** | Ils sont publics (voir DEC-02). On n'y écrit que des compteurs. |
| DEC-04 | Articles stockés **par jour** (`items/AAAA-MM-JJ.json`) | L'appareil ne télécharge que les jours qui lui manquent et le jour en cours ; il garde le reste en cache. |
| DEC-05 | État de lecture fusionnable (union des « lus », dernier gagnant pour les favoris) | Deux appareils peuvent écrire en même temps sans perdre de données. |
| DEC-06 | Pas de framework lourd : TypeScript + Vite + Preact | Appli légère, démarrage rapide sur mobile, outillage de test standard (Vitest, Playwright). |
| DEC-07 | La clé GitHub est stockée sur l'appareil et n'est jamais envoyée ailleurs qu'à `api.github.com` | Sécurité. |

### 3.2 Modèle de données (dépôt `filactu-data`)

**`state/subscriptions.json`**
```json
{
  "version": 1,
  "updatedAt": "2026-11-04T08:00:00Z",
  "categories": [{ "id": "tech", "name": "Tech", "order": 0, "icon": "💻" }],
  "feeds": [{
    "id": "f_3a9c…",              // hash de l'URL du fil
    "url": "https://exemple.fr/feed.xml",
    "siteUrl": "https://exemple.fr",
    "title": "Exemple",             // titre personnalisé ou titre du fil
    "categories": ["tech"],
    "addedAt": "2026-11-04T08:00:00Z",
    "status": "active"              // active | pending (URL à découvrir) | error
  }]
}
```

**`state/reading.json`**
```json
{
  "version": 1,
  "read":    { "<itemId>": "2026-11-04T08:05:00Z" },
  "unread":  { "<itemId>": "2026-11-04T08:06:00Z" },
  "markedBefore": { "feed:f_3a9c…": "2026-11-03T00:00:00Z", "category:tech": "…", "all": "…" },
  "saved":   { "<itemId>": { "at": "…", "removed": false, "item": { /* copie de l'article */ } } },
  "prefs":   { "view:category:tech": "magazine", "markOnScroll": true, "theme": "auto", "updatedAt": "…" }
}
```
Un article est **lu** si : (horodatage dans `read` > horodatage dans `unread`) **ou** (sa date de collecte est antérieure à un `markedBefore` qui le couvre, et il n'est pas dans `unread` après cette date).

**`items/AAAA-MM-JJ.json`** (articles collectés ce jour-là, heure UTC)
```json
{
  "date": "2026-11-04",
  "items": [{
    "id": "i_8be1…",               // hash(feedId + guid || link)
    "feedId": "f_3a9c…",
    "title": "…", "link": "https://…", "author": "…",
    "published": "2026-11-04T07:30:00Z", "fetched": "2026-11-04T07:45:00Z",
    "summary": "texte brut ≤ 400 car.", "image": "https://…/vignette.jpg"
  }]
}
```

**`meta/feeds-status.json`** : par fil, date du dernier succès, dernière erreur, favicon, nombre d'échecs consécutifs.

## 4. Exigences fonctionnelles

### 4.1 Mise en route et connexion

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-001 | Au premier lancement sur un appareil, l'appli demande la clé GitHub et le nom du dépôt de données. | Une clé valide affiche la liste des abonnements. Une clé invalide ou sans droits affiche un message clair qui dit quel droit manque. |
| EXG-002 | La clé est mémorisée sur l'appareil et peut être effacée depuis les réglages (« Déconnecter cet appareil »). | Après déconnexion, l'appli ne contient plus aucune donnée en cache. |
| EXG-003 | L'appli s'installe sur Android (téléphone et tablette) et sur PC (Chrome/Edge). | Le manifeste et le service worker sont valides ; l'icône FilActu apparaît sur l'écran d'accueil ; l'appli s'ouvre en plein écran. |

### 4.2 Abonnements et catégories

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-010 | Importer un fichier OPML (export Feedly). | Les catégories et les fils sont créés ; un fil présent dans plusieurs catégories est rattaché à toutes ; une ré-importation ne crée pas de doublon ; un résumé « X fils, Y catégories importés, Z ignorés » s'affiche. |
| EXG-011 | Ajouter un abonnement par URL de fil **ou** de site, avec un nom facultatif, et le ranger dans une catégorie existante ou nouvelle. | Bouton « Ajouter un fil » dans le volet. Une adresse invalide ou déjà suivie est refusée avec un message. Sans nom saisi, le titre du fil est repris après la première collecte. Une URL de site est résolue par le collecteur (balise `<link rel="alternate">`) ; une collecte est lancée aussitôt. |
| EXG-012 | Renommer, déplacer (changer de catégorie), désabonner un fil. | Menu ⋯ sur le fil dans le volet. Un fil garde au moins une catégorie. Effet visible immédiatement et sur les autres appareils après synchronisation. |
| EXG-013 | Créer, renommer, réordonner, supprimer une catégorie. | Écran « Gérer les catégories » accessible depuis le volet. Un nom vide ou déjà pris est refusé. Supprimer une catégorie non vide demande où déplacer ses fils (ou de les désabonner) ; un fil rangé aussi dans une autre catégorie y reste simplement. |
| EXG-017 | Accepter les adresses de pages YouTube (playlist, chaîne) comme abonnements. | Une adresse `youtube.com/playlist?list=…` ou `youtube.com/channel/…` est convertie par le collecteur en fil YouTube officiel (`feeds/videos.xml`) ; la description et la miniature de chaque vidéo servent de résumé et de vignette. |
| EXG-018 | Proposer automatiquement une icône d'après le nom de la catégorie. | Pendant la saisie du nom (création, ajout de fil), l'icône suggérée est présélectionnée tant que l'utilisateur n'en a pas choisi une autre ; les catégories importées reçoivent une icône suggérée ; un bouton « Proposer les icônes manquantes » complète les catégories sans icône. |
| EXG-016 | Associer une icône à une catégorie. | Choix parmi une palette d'icônes (ou aucune) à la création et ensuite ; l'icône s'affiche devant le nom de la catégorie dans le volet et est synchronisée. |
| EXG-014 | Exporter les abonnements en OPML. | Le fichier se réimporte dans Feedly ou dans FilActu sans perte. |
| EXG-015 | Signaler les fils en erreur. | Une icône d'alerte apparaît sur un fil après 3 échecs consécutifs, avec la date du dernier succès. |

### 4.3 Navigation (inspirée de Feedly)

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-020 | Volet de navigation avec : **Aujourd'hui**, **Tous les articles**, **À lire plus tard**, puis les catégories dépliables contenant leurs fils. | Chaque catégorie et chaque fil affiche son nombre de non-lus ; l'option « masquer les fils sans non-lus » est disponible. |
| EXG-021 | Disposition adaptée à l'écran. | PC et tablette paysage : volet fixe à gauche. Téléphone et tablette portrait : volet escamotable (bouton menu, glissement depuis le bord). |
| EXG-022 | En-tête de liste : nom de la vue, nombre de non-lus, boutons *Tout marquer comme lu*, *Changer d'affichage*, *Actualiser*, *Rechercher*. | — |
| EXG-023 | Les articles sont triés du plus récent au plus ancien ; l'option « plus ancien d'abord » est disponible par vue. | — |
| EXG-024 | Filtre « non lus seulement » / « tous ». | Mémorisé par vue ; « non lus seulement » par défaut. Un article lu pendant la consultation reste affiché (atténué) jusqu'au changement de vue. |

### 4.4 Liste d'articles et résumé

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-030 | Trois affichages : **Titres** (une ligne : source, titre, âge), **Magazine** compact façon Feedly (titre de taille modérée sur 3 lignes au plus, vignette à droite, « fil / fraîcheur » sur une ligne), **Cartes** (grille, grande image, titre, fil, fraîcheur). | Le choix est mémorisé par fil ou catégorie et synchronisé. Par défaut : Magazine. |
| EXG-036 | Option « Afficher le début de l'article » (désactivée par défaut) pour garder un affichage compact. | En Magazine sans début d'article, au moins 5 articles sont visibles sur un écran de téléphone (390 × 844). L'option est synchronisée entre appareils. |
| EXG-031 | Résumé de chaque article : texte brut sans HTML, environ 400 caractères maximum, coupé au mot. | Pas de script, pas de style ni de traqueur hérité du fil. |
| EXG-032 | En affichage Titres, un appui long (mobile) ou le survol (PC) montre le résumé. | — |
| EXG-033 | Un clic sur un article l'ouvre dans le **navigateur par défaut** (nouvel onglet sur PC). | L'article est marqué lu. |
| EXG-034 | Les articles lus sont affichés atténués. | — |
| EXG-035 | Les images distantes sont chargées en différé (*lazy loading*), sans transmettre de référent. | `loading="lazy"`, `referrerpolicy="no-referrer"`. |

### 4.5 Lu / non lu

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-040 | Marquer lu à l'ouverture d'un article. | — |
| EXG-041 | Marquer lu en défilant (réglable, activé par défaut). | Un article est marqué lu quand il est entièrement sorti par le haut de l'écran. |
| EXG-042 | Basculer lu/non lu manuellement sur un article. | Bouton sur l'article ; balayage vers la gauche sur mobile. |
| EXG-043 | *Tout marquer comme lu* sur la vue en cours (fil, catégorie, Aujourd'hui, Tous) avec le choix : tout, plus vieux qu'un jour, plus vieux qu'une semaine. | Une notification « Annuler » est proposée pendant 10 secondes. |
| EXG-044 | Les compteurs de non-lus se mettent à jour immédiatement. | — |
| EXG-045 | En bas de la liste, un bouton marque comme lus tous les articles affichés sur la page. | Le bouton indique le nombre d'articles non lus concernés et n'apparaît que s'il y en a ; les articles non encore chargés plus bas ne sont pas touchés. |

### 4.6 À lire plus tard

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-050 | Ajouter ou retirer un article de « À lire plus tard ». | Bouton sur l'article ; balayage vers la droite sur mobile ; touche `s` sur PC. |
| EXG-051 | Les articles mis de côté sont conservés **sans limite de durée**, même après la purge des 30 jours. | Une copie de l'article est stockée dans `reading.json`. |

### 4.7 Recherche, apparence, raccourcis

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-060 | Rechercher dans les titres et résumés des articles conservés (30 jours + à lire plus tard), dans la vue courante ou partout. | Résultats en moins d'une seconde pour 20 000 articles ; recherche insensible aux accents et à la casse. |
| EXG-061 | Thème clair, sombre ou automatique (suit le système). | — |
| EXG-062 | Raccourcis clavier sur PC : `j`/`k` article suivant/précédent, `o` ou `Entrée` ouvrir, `m` lu/non lu, `s` à lire plus tard, `Maj+A` tout marquer lu, `r` actualiser, `/` rechercher, `v` changer d'affichage, `g a` Tous, `g t` Aujourd'hui, `?` aide. | La touche `?` affiche la liste des raccourcis. |

### 4.8 Synchronisation et collecte

| ID | Exigence | Critères d'acceptation |
|---|---|---|
| EXG-070 | Le collecteur récupère tous les fils actifs toutes les 15 minutes. | Prend en charge RSS 0.9x/1.0 (RDF)/2.0 et Atom ; respecte `ETag`/`Last-Modified` ; délai maximal de 20 s par fil ; un fil en erreur ne bloque pas les autres. |
| EXG-071 | Le bouton *Actualiser* déclenche une collecte immédiate puis recharge les articles. | Indicateur de progression ; message si la collecte n'est pas terminée au bout de 3 minutes. |
| EXG-072 | Les articles de plus de 30 jours sont purgés (hors « À lire plus tard »). | Les fichiers `items/` de plus de 30 jours sont supprimés. |
| EXG-073 | Chaque action (lu, favori, abonnement, préférence) est enregistrée localement tout de suite, puis envoyée au dépôt de données au plus tard 5 secondes après, ou dès que l'appli passe en arrière-plan. | — |
| EXG-074 | Hors connexion, l'appli affiche les articles en cache et met les actions en file d'attente. | Les actions sont envoyées au retour du réseau, sans perte. |
| EXG-075 | Écritures concurrentes depuis deux appareils. | Aucune perte : en cas de conflit, l'appli relit le fichier distant, fusionne (DEC-05) et réessaie. |
| EXG-076 | Reprise sur un autre appareil. | Un article lu sur un appareil apparaît lu sur l'autre au plus tard à la prochaine ouverture ou actualisation (et toutes les 2 minutes quand l'appli est au premier plan). |
| EXG-077 | Pas de doublon. | Un même article (même fil, même guid ou même lien) n'apparaît qu'une fois, même s'il est republié avec une nouvelle date. |

## 5. Exigences non fonctionnelles

| ID | Exigence |
|---|---|
| ENF-01 | **Performance** : affichage de la liste en moins de 1,5 s à l'ouverture sur un téléphone de milieu de gamme (articles en cache), défilement fluide avec 2 000 articles chargés. |
| ENF-02 | **Accessibilité** : navigation complète au clavier, contrastes conformes RGAA/WCAG AA, libellés pour les lecteurs d'écran, zones tactiles d'au moins 44 px. |
| ENF-03 | **Sécurité** : CSP stricte, aucun script tiers, contenu des fils toujours réduit à du texte brut, clé envoyée uniquement à `api.github.com`. |
| ENF-04 | **Confidentialité** : aucune donnée personnelle (URL de fil, titre, lecture) dans le dépôt public ni dans ses journaux. |
| ENF-05 | **Coût** : 0 € (GitHub gratuit). |
| ENF-06 | **Compatibilité** : Chrome et Edge récents sur PC ; Chrome Android récent ; Firefox PC (sans installation). |
| ENF-07 | **Langue** : interface en français. |
| ENF-08 | **Volume cible** : jusqu'à 300 fils et 1 000 nouveaux articles par jour. |

## 6. Design (repris de Feedly, à l'identité FilActu)

- **Couleurs** : vert FilActu `#1E9E5F` (accent), gris neutres, fond blanc / fond sombre `#16181D`.
- **Typographie** : police système (Segoe UI, Roboto…), titres d'articles en gras, résumé en gris.
- **Volet gauche** : logo, entrées fixes (Aujourd'hui, Tous, À lire plus tard), catégories avec chevron et compteur, bouton « + Ajouter un fil » en bas, accès Réglages.
- **Zone principale** : en-tête de vue (titre, compteur, actions à droite), liste d'articles centrée (largeur de lecture ~720 px en Magazine), grille en Cartes.
- **Mobile** : barre supérieure avec menu, titre de vue et actions ; bouton flottant « Tout marquer lu » en bas de liste ; balayages sur les articles.

## 7. Sécurité de la clé GitHub

Clé *fine-grained* créée par l'utilisateur, limitée à :

| Dépôt | Droits |
|---|---|
| `filactu-data` | Contents : lecture et écriture |
| `filactu` | Actions : lecture et écriture (pour le bouton *Actualiser*) |

Le workflow du collecteur lit la clé dans le **secret** `DATA_REPO_TOKEN` du dépôt `filactu`. Pour rester simple, c'est la même clé. Une clé dédiée, limitée à Contents sur `filactu-data`, reste possible. Sans ce secret, la collecte est ignorée sans erreur.

## 8. Risques identifiés

| Risque | Parade |
|---|---|
| GitHub désactive les workflows planifiés d'un dépôt public sans activité pendant 60 jours. | Un workflow mensuel réactive la planification ; une alerte s'affiche dans l'appli si la dernière collecte date de plus de 2 heures. |
| Les planifications GitHub peuvent prendre du retard (5 à 20 min aux heures chargées). | Accepté ; le bouton *Actualiser* lance une collecte immédiate. |
| L'historique du dépôt de données grossit (un commit par collecte). | Un workflow mensuel compacte l'historique (nouveau commit racine). |
| Certains sites bloquent les robots ou exigent un navigateur. | Identifiant de robot explicite, statut d'erreur visible (EXG-015). |
| Limite de l'API GitHub (5 000 requêtes/h). | Requêtes conditionnelles (ETag), regroupement des écritures (EXG-073). |

## 9. Lots de livraison

| Lot | Contenu | Exigences |
|---|---|---|
| **V0.1 — Socle** | Squelette PWA, connexion, collecteur, import OPML, liste Magazine, ouverture dans le navigateur, lu à l'ouverture | EXG-001→003, 010, 020→022, 030 (Magazine), 031, 033, 040, 070, 072, 073, 077 |
| **V0.1.2 — Abonnements et catégories** | Ajout d'un fil, gestion et icônes des catégories, marquer la page lue | EXG-011, 013, 016, 045 |
| **V0.1.3 — Fils YouTube** | Adresses de pages YouTube reconnues | EXG-017 |
| **V0.2 — Feedly-like** | 3 affichages, lu en défilant, tout marquer lu, à lire plus tard, renommer/déplacer un fil | EXG-012, 014, 015, 023, 024, 030, 032, 034, 041→044, 050, 051 |
| **V0.3.1 — Affichage compact, icônes suggérées** | Demandes du 2026-11-04 | EXG-018, 036 |
| **V0.3 — Confort** | Recherche, thème sombre, raccourcis, hors connexion, actualisation à la demande, robustesse de la synchro | EXG-060→062, 071, 074→076 |
| **V1.0** | Finitions, accessibilité, performance, documentation complète | ENF-01→08 |
