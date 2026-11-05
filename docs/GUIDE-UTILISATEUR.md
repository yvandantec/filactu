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

- **Android (recommandé) : l'appli FilActu.** Téléchargez le fichier **FilActu-x.y.z.apk** depuis la page <https://github.com/yvandantec/filactu/releases> (rubrique *Assets*), ouvrez-le et acceptez l'installation (Android demande d'autoriser une fois l'installation depuis le navigateur ou l'application Fichiers). Avec cette appli, **chaque article s'ouvre directement dans votre navigateur par défaut** (Brave, Firefox…), dans un nouvel onglet, sans onglet intégré ni menu de choix. Le contenu de FilActu se met à jour tout seul ; l'APK ne se réinstalle que si une nouvelle version d'appli est annoncée. Si vous aviez installé FilActu via Chrome, supprimez cette ancienne icône.
- **Android, autre possibilité** : ouvrez l'adresse dans Chrome → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »). L'icône verte FilActu apparaît avec vos autres applis.
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
  - Les images viennent du fil. Quand un site n'en met pas dans son fil, FilActu va chercher l'image que la page de l'article affiche quand on la partage sur les réseaux sociaux. Cela ne vaut que pour les nouveaux articles.
  - **Afficher le début de l'article** : ajoute deux lignes de résumé sous chaque titre. Ce réglage est distinct selon l'écran : **activé par défaut sur PC** (version riche), **désactivé par défaut sur téléphone** (version compacte). Il vaut pour toutes les vues.
  - **Taille du texte** : *Petit*, *Normal* ou *Grand*, pour les titres, le fil / la fraîcheur et le début de l'article. Réglée séparément pour le PC et le téléphone.
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
| Taille du texte des articles | Petit, Normal ou Grand (réglée séparément pour le PC et le téléphone) |
| Ouvrir les articles avec *(Android seulement)* | Navigateur qui ouvre les articles : Brave, Firefox, Edge, Samsung Internet ou Chrome. *Automatique* garde l'onglet intégré de Chrome. |
| Marquer comme lu en défilant | Activé par défaut |
| Afficher le début des articles | Même option que dans ▦, réglée séparément pour le PC et le téléphone |
| Masquer les fils sans articles non lus | Allège le volet de gauche |
| Importer / Exporter OPML | Voir § 2.5 et § 7 |
| Déconnecter cet appareil | Efface la clé et le cache de cet appareil (vos données restent sur GitHub) |

## 12. Questions fréquentes

**Les nouveaux articles n'arrivent pas, ou le bandeau « La dernière collecte date de plus de 2 heures » s'affiche.** GitHub lance le robot moins souvent que prévu (parfois toutes les quelques heures) ; c'est pourquoi FilActu demande lui-même une collecte à chaque ouverture quand la dernière date de plus de 20 minutes. Si le bandeau reste affiché, la **clé du robot a expiré** : renouvelez-la (§ 2.1) puis mettez-la dans le secret `DATA_REPO_TOKEN` (§ 2.2). Attention : « Regenerate token » sur GitHub rend l'ancienne clé inutilisable partout, il faut donc la remplacer **à la fois** dans le secret et sur chaque appareil.

**Après un gros import, certains fils n'ont pas encore d'articles.** Pour ne jamais dépasser le temps que GitHub lui accorde, le robot s'arrête au bout de 6 minutes et garde ce qu'il a déjà récupéré. Les fils qu'il n'a pas eu le temps de lire passent en premier à la collecte suivante. Ils ne sont pas signalés en erreur ; patientez une ou deux collectes.

**Un article n'a pas de vignette.** Ni le fil ni la page de l'article ne proposent d'image, ou le site n'a pas répondu à temps. Les articles collectés avant la version 0.4.1 ne reçoivent pas d'image après coup.

**« Clé refusée » ou « droit manquant ».** La clé a expiré ou il lui manque un droit : refaites les § 2.1 et 2.2, puis Réglages → *Déconnecter cet appareil* et saisissez la nouvelle clé.

**Les articles s'ouvrent dans un onglet intégré de Chrome au lieu de mon navigateur (Brave…).** C'est le comportement normal d'une appli installée par Chrome. Dans Réglages → *Ouvrir les articles avec*, choisissez votre navigateur : les articles s'y ouvriront directement. Si Android affiche à chaque fois un menu « Ouverture avec », choisissez plutôt **Brave — méthode 2 (sans menu de choix)**. Si ce menu persiste encore, c'est Chrome qui l'impose : il suffit alors de toucher Brave.

**Android dit « appli déjà installée » puis « impossible de lancer l'application ».** Une installation précédente a échoué à moitié. Le plus efficace est de **vider le cache de Chrome** (Paramètres du téléphone → Applications → Chrome → Stockage → *Vider le cache*), puis de réinstaller. Sinon, dans l'ordre :
1. Paramètres du téléphone → Applications : si « FilActu » apparaît, désinstallez-la. Supprimez aussi toute icône FilActu de l'écran d'accueil.
2. Chrome → ⋮ → Paramètres → Paramètres des sites → Toutes les données des sites → `yvandantec.github.io` → **Effacer et réinitialiser**.
3. Redémarrez le téléphone, rouvrez l'adresse dans Chrome, puis ⋮ → **Installer l'application**.
4. Sur Samsung, si l'installation échoue encore : Paramètres → Sécurité et confidentialité → **Blocage automatique** peut empêcher l'installation ; désactivez-le le temps d'installer, puis réactivez-le aussitôt.

**J'ai perdu mon téléphone.** Sur GitHub, supprimez la clé (*Settings → Developer settings → Personal access tokens*) et créez-en une nouvelle pour vos autres appareils.

**Combien ça coûte ?** Rien : tout fonctionne avec un compte GitHub gratuit.
