# FilActu — Guide utilisateur

> Version 0.3 — à jour de FilActu 0.3.0 ; elle sera complétée de captures d'écran à chaque livraison.
> Les sections marquées *(V0.x)* décrivent des fonctions qui arrivent avec cette version.

## 1. Ce qu'est FilActu

FilActu rassemble vos fils RSS (blogs, journaux, sites) dans une seule liste, rangée par catégories, comme Feedly.
Vous lisez le résumé de chaque article ; un clic ouvre l'article complet dans votre navigateur.
Ce que vous avez lu est retenu : vous reprenez votre lecture sur le PC, le téléphone ou la tablette, là où vous l'avez laissée.

Vos données (abonnements, lectures) sont stockées dans **votre** dépôt GitHub privé `filactu-data`. Personne d'autre n'y a accès.

## 2. Première installation (une seule fois)

### 2.1 Créer la clé d'accès GitHub

1. Ouvrez <https://github.com/settings/personal-access-tokens/new>.
2. **Nom** : `FilActu` ; **Expiration** : 1 an (vous la renouvellerez).
3. **Repository access** → *Only select repositories* → cochez `filactu` et `filactu-data`.
4. **Permissions** → *Repository permissions* :
   - **Contents** : *Read and write*
   - **Actions** : *Read and write*
5. Cliquez **Generate token** et copiez la clé (elle commence par `github_pat_`). Gardez-la dans votre gestionnaire de mots de passe : GitHub ne vous la remontrera plus.

### 2.2 Donner la clé au robot de collecte

Le robot qui récupère vos fils toutes les 15 minutes a besoin de la même clé pour écrire dans votre dépôt privé.

1. Ouvrez <https://github.com/yvandantec/filactu/settings/secrets/actions/new>.
2. **Name** : `DATA_REPO_TOKEN`
3. **Secret** : collez la clé créée au § 2.1.
4. Cliquez **Add secret**.

Tant que ce secret n'existe pas, le robot ne fait rien (sans erreur).

### 2.3 Ouvrir FilActu

- Adresse : **<https://yvandantec.github.io/filactu/>**
- Au premier lancement, collez la clé, puis validez. Le dépôt de données `yvandantec/filactu-data` est proposé par défaut.

### 2.4 Installer l'appli

- **Android (téléphone ou tablette)** : ouvrez l'adresse dans Chrome → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »). L'icône verte FilActu apparaît avec vos autres applis.
- **PC** : dans Chrome ou Edge, cliquez l'icône d'installation à droite de la barre d'adresse. Vous pouvez aussi simplement garder l'onglet ouvert.

Répétez l'étape 2.3 sur chaque appareil : la clé est saisie une fois par appareil.

### 2.5 Importer vos abonnements Feedly

1. Dans Feedly : **Organize** (ou *Manage feeds*) → **Export OPML**. Un fichier `feedly-….opml` est téléchargé.
2. Dans FilActu : **Réglages** → **Importer un fichier OPML** → choisissez le fichier.
3. Vos catégories et vos fils apparaissent. Les premiers articles arrivent à la collecte suivante (15 minutes au plus), ou tout de suite si vous appuyez sur **Actualiser** ⟳.

## 3. L'écran principal

| Zone | Rôle |
|---|---|
| **Volet de gauche** | *Aujourd'hui*, *Tous les articles*, *À lire plus tard*, puis vos catégories avec leur icône. Touchez le chevron d'une catégorie pour voir ses fils. Le chiffre indique le nombre d'articles non lus. |
| **En-tête** | Nom de la vue, nombre de non-lus et boutons : 🔍 *Rechercher*, ▦ *Options d'affichage*, ✓✓ *Tout marquer comme lu*, ⟳ *Actualiser* (lance une collecte immédiate). |
| **Liste d'articles** | Par défaut, seuls les articles **non lus** sont affichés, du plus récent au plus ancien. |

Sur téléphone, le volet est caché : touchez ☰ en haut à gauche, ou glissez depuis le bord gauche.

## 4. Lire

- **Toucher ou cliquer un article** ouvre l'article complet dans votre navigateur. Il est alors marqué comme lu.
- **Options d'affichage** (▦), retenues pour chaque vue et synchronisées entre vos appareils :
  - **Titres** : une ligne par article (fil, titre, fraîcheur), pour parcourir très vite. Sur PC, laissez la souris sur un titre pour voir le résumé ; sur mobile, faites un appui long.
  - **Magazine** (par défaut) : affichage compact façon Feedly — titre, « fil / fraîcheur » et vignette à droite. Une dizaine d'articles tiennent sur un écran de téléphone.
  - **Cartes** : grille avec grandes images.
  - **Afficher le début de l'article** : ajoute deux lignes de résumé sous chaque titre (désactivé par défaut pour rester compact). Réglage commun à toutes les vues.
  - **Non lus seulement** : coché par défaut. Un article que vous lisez reste affiché (atténué) jusqu'à ce que vous changiez de vue.
  - **Plus anciens d'abord** : inverse l'ordre.

## 5. Lu / non lu

- Un article devient **lu** quand vous l'ouvrez, ou quand vous le faites **défiler au-delà du haut de l'écran**. Ce second comportement se désactive dans **Réglages → Marquer comme lu en défilant**.
- Bouton ● à droite de chaque article : vert = non lu ; touchez-le pour basculer lu / non lu. Sur mobile, **balayez l'article vers la gauche** ; sur PC, touche `m`.
- **Tout marquer comme lu** (✓✓) : choisissez *Tout*, *Plus vieux qu'un jour* ou *Plus vieux qu'une semaine*. Une notification **Annuler** reste affichée 10 secondes.
- **Marquer la page comme lue** : en bas de la liste, le bouton *Marquer les N articles affichés comme lus* marque d'un coup les articles que vous venez de parcourir.

## 6. À lire plus tard

Bouton 🔖 sur l'article, **balayage vers la droite** sur mobile, ou touche `s` sur PC. Retrouvez-les dans *À lire plus tard* (volet de gauche).
Ces articles sont gardés **pour toujours**, alors que les autres disparaissent après 30 jours. Touchez à nouveau 🔖 pour en retirer un.

## 7. Gérer les abonnements et les catégories

### Ajouter un fil
1. En bas du volet de gauche, touchez **+ Ajouter un fil**.
2. Collez l'adresse du fil, ou simplement celle du site : FilActu trouve le fil tout seul. Pour **YouTube**, l'adresse d'une playlist (`youtube.com/playlist?list=…`) ou d'une chaîne (`youtube.com/channel/…`) suffit : chaque nouvelle vidéo apparaît avec sa miniature et sa description.
3. Donnez-lui un nom si vous le souhaitez ; sinon le titre du fil est repris automatiquement.
4. Choisissez sa **catégorie**, ou *+ Nouvelle catégorie…* pour en créer une au passage : une icône est proposée d'après son nom.
5. Touchez **Ajouter** : une collecte est lancée aussitôt, les articles arrivent en une à deux minutes.

### Renommer un fil, le déplacer, s'en désabonner
Dans le volet, dépliez la catégorie, puis touchez **⋯** à droite du fil (sur PC, il apparaît au survol) :
- changez son **nom** ;
- cochez une ou plusieurs **catégories** (au moins une) ;
- **Se désabonner** le retire de vos abonnements.

### Gérer les catégories
Dans le volet, à droite de « Catégories », touchez **Gérer** :
- **Créer** : saisissez un nom ; **une icône est proposée automatiquement** (⚽ pour « Sport », 💻 pour « Tech », 📰 pour « Actualités »…). Choisissez-en une autre si vous préférez, puis *Créer la catégorie*.
- **Proposer les icônes manquantes** : donne d'un coup une icône à toutes les catégories qui n'en ont pas (par exemple celles importées depuis Feedly).
- **Renommer** : modifiez le nom dans sa case puis appuyez sur Entrée (ou touchez ailleurs).
- **Icône** : touchez la case carrée à gauche du nom, puis choisissez une icône (∅ pour aucune).
- **Ordre** : flèches ˄ ˅ pour monter ou descendre la catégorie dans le volet.
- **Supprimer** : si certains fils ne sont rangés que dans cette catégorie, FilActu vous demande de les **déplacer** vers une autre catégorie ou de vous **désabonner**. Un fil rangé aussi ailleurs y reste simplement.

### Et aussi
- **Fil en erreur** ⚠ : le site n'a pas répondu lors des 3 dernières collectes. Survolez l'icône pour voir depuis quand. Certains sites refusent les lecteurs automatiques : FilActu ne contourne pas ce refus.
- **Exporter** : Réglages → *Exporter en OPML* (sauvegarde, ou retour vers un autre lecteur).

## 8. Rechercher

🔍 ou touche `/`. La recherche porte sur les titres et résumés, sans tenir compte des accents ni des majuscules (« entree » trouve « Entrée »). Elle cherche dans la vue affichée ; cochez **Partout** pour chercher dans tous les articles des 30 derniers jours et dans vos articles à lire plus tard. Fermez avec ✕ ou `Échap`.

## 9. Raccourcis clavier (PC)

| Touche | Action |
|---|---|
| `j` / `k` | Article suivant / précédent |
| `o` ou `Entrée` | Ouvrir l'article dans le navigateur |
| `m` | Lu / non lu |
| `s` | À lire plus tard |
| `Maj` + `A` | Tout marquer comme lu (avec Annuler) |
| `v` | Changer d'affichage |
| `r` | Actualiser |
| `/` | Rechercher |
| `g` puis `t` / `a` / `s` | Aller à Aujourd'hui / Tous / À lire plus tard |
| `?` | Afficher l'aide des raccourcis |

## 10. Plusieurs appareils et hors connexion

- Chaque action (lu, à lire plus tard, préférences d'affichage, thème) est enregistrée sur l'appareil immédiatement, puis envoyée à GitHub dans les secondes qui suivent.
- Sur l'autre appareil, l'état est rafraîchi à l'ouverture, au bouton ⟳ et toutes les 2 minutes quand l'appli est affichée.
- **Sans réseau** : un bandeau « Hors connexion » s'affiche ; vous lisez les articles déjà chargés et vos actions sont envoyées automatiquement au retour du réseau.

## 11. Réglages

| Réglage | Effet |
|---|---|
| Thème | Automatique (comme le téléphone ou le PC), clair ou sombre |
| Marquer comme lu en défilant | Activé par défaut |
| Afficher le début des articles | Même option que dans ▦ |
| Masquer les fils sans articles non lus | Allège le volet de gauche |
| Importer / Exporter OPML | Voir § 2.5 et § 7 |
| Déconnecter cet appareil | Efface la clé et le cache de cet appareil (vos données restent sur GitHub) |

## 12. Questions fréquentes

**Les nouveaux articles n'arrivent pas.** Appuyez sur ⟳. Si un bandeau signale que la dernière collecte date de plus de 2 heures, ouvrez l'onglet *Actions* du dépôt `filactu` sur GitHub et vérifiez que le workflow *Collecte* est activé.

**« Clé refusée » ou « droit manquant ».** La clé a expiré ou il lui manque un droit : refaites les § 2.1 et 2.2, puis Réglages → *Déconnecter cet appareil* et saisissez la nouvelle clé.

**J'ai perdu mon téléphone.** Sur GitHub, supprimez la clé (*Settings → Developer settings → Personal access tokens*) et créez-en une nouvelle pour vos autres appareils.

**Combien ça coûte ?** Rien : tout fonctionne avec un compte GitHub gratuit.
