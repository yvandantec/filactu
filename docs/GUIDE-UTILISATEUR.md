# FilActu — Guide utilisateur

> Version 0.1 — rédigée à partir des spécifications ; elle sera complétée de captures d'écran à chaque livraison.
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

### 2.2 Ouvrir FilActu

- Adresse : **<https://yvandantec.github.io/filactu/>**
- Au premier lancement, collez la clé, puis validez. Le dépôt de données `yvandantec/filactu-data` est proposé par défaut.

### 2.3 Installer l'appli

- **Android (téléphone ou tablette)** : ouvrez l'adresse dans Chrome → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »). L'icône verte FilActu apparaît avec vos autres applis.
- **PC** : dans Chrome ou Edge, cliquez l'icône d'installation à droite de la barre d'adresse. Vous pouvez aussi simplement garder l'onglet ouvert.

Répétez l'étape 2.2 sur chaque appareil : la clé est saisie une fois par appareil.

### 2.4 Importer vos abonnements Feedly

1. Dans Feedly : **Organize** (ou *Manage feeds*) → **Export OPML**. Un fichier `feedly-….opml` est téléchargé.
2. Dans FilActu : **Réglages** → **Importer un fichier OPML** → choisissez le fichier.
3. Vos catégories et vos fils apparaissent. Les premiers articles arrivent à la collecte suivante (15 minutes au plus), ou tout de suite si vous appuyez sur **Actualiser** ⟳.

## 3. L'écran principal

| Zone | Rôle |
|---|---|
| **Volet de gauche** | *Aujourd'hui*, *Tous les articles*, *À lire plus tard*, puis vos catégories. Touchez le chevron d'une catégorie pour voir ses fils. Le chiffre indique le nombre d'articles non lus. |
| **En-tête** | Nom de la vue et boutons : ✓ *Tout marquer comme lu*, ▤ *Affichage*, ⟳ *Actualiser*, 🔍 *Rechercher*. |
| **Liste d'articles** | Les articles du plus récent au plus ancien. Les articles lus sont atténués. |

Sur téléphone, le volet est caché : touchez ☰ en haut à gauche, ou glissez depuis le bord gauche.

## 4. Lire

- **Toucher ou cliquer un article** ouvre l'article complet dans votre navigateur. Il est alors marqué comme lu.
- **Changer d'affichage** (▤) :
  - *Titres* : une ligne par article, pour survoler beaucoup d'articles ; appui long ou survol pour voir le résumé ;
  - *Magazine* : vignette et début du résumé (par défaut) ;
  - *Cartes* : grandes images en grille.
  Le choix est retenu pour chaque catégorie ou fil.
- **Non lus seulement / Tous** : filtre dans l'en-tête.

## 5. Lu / non lu

- Un article devient **lu** quand vous l'ouvrez ou quand vous le faites défiler au-delà du haut de l'écran *(V0.2)*. Ce comportement se règle dans **Réglages → Marquer comme lu en défilant**.
- Pour remettre un article en **non lu** : bouton ● sur l'article, balayage vers la gauche sur mobile, ou touche `m` sur PC.
- **Tout marquer comme lu** (✓) *(V0.2)* : choisissez *Tout*, *Plus vieux qu'un jour* ou *Plus vieux qu'une semaine*. Une notification **Annuler** reste affichée 10 secondes.

## 6. À lire plus tard *(V0.2)*

Bouton 🔖 sur l'article, balayage vers la droite sur mobile, ou touche `s`.
Ces articles sont gardés **pour toujours**, alors que les autres disparaissent après 30 jours.

## 7. Gérer les abonnements *(V0.2)*

- **Ajouter un fil** : bouton **+** en bas du volet. Collez l'adresse du fil ou simplement celle du site : FilActu trouve le fil tout seul à la collecte suivante.
- **Renommer, changer de catégorie, se désabonner** : menu ⋯ à côté du fil.
- **Catégories** : menu ⋯ à côté de la catégorie pour la renommer, la déplacer ou la supprimer.
- **Fil en erreur** ⚠ : le site n'a pas répondu lors des 3 dernières collectes. Survolez l'icône pour voir depuis quand.
- **Exporter** : Réglages → *Exporter en OPML* (sauvegarde, ou retour vers un autre lecteur).

## 8. Rechercher *(V0.3)*

🔍 ou touche `/`. La recherche porte sur les titres et résumés des 30 derniers jours et sur vos articles à lire plus tard, sans tenir compte des accents ni des majuscules.

## 9. Raccourcis clavier (PC) *(V0.3)*

| Touche | Action |
|---|---|
| `j` / `k` | Article suivant / précédent |
| `o` ou `Entrée` | Ouvrir l'article dans le navigateur |
| `m` | Lu / non lu |
| `s` | À lire plus tard |
| `Maj` + `A` | Tout marquer comme lu |
| `v` | Changer d'affichage |
| `r` | Actualiser |
| `/` | Rechercher |
| `g` puis `t` / `a` | Aller à Aujourd'hui / Tous |
| `?` | Afficher l'aide des raccourcis |

## 10. Plusieurs appareils et hors connexion

- Chaque action est enregistrée sur l'appareil immédiatement, puis envoyée à GitHub dans les secondes qui suivent.
- Sur l'autre appareil, l'état est rafraîchi à l'ouverture, au bouton ⟳ et toutes les 2 minutes quand l'appli est affichée.
- **Sans réseau** *(V0.3)* : vous lisez les articles déjà chargés ; vos actions sont envoyées au retour du réseau.

## 11. Réglages

| Réglage | Effet |
|---|---|
| Thème | Clair, sombre ou automatique *(V0.3)* |
| Marquer comme lu en défilant | Activé par défaut *(V0.2)* |
| Masquer les fils sans non-lus | Allège le volet de gauche |
| Importer / Exporter OPML | Voir § 2.4 et § 7 |
| Déconnecter cet appareil | Efface la clé et le cache de cet appareil (vos données restent sur GitHub) |

## 12. Questions fréquentes

**Les nouveaux articles n'arrivent pas.** Appuyez sur ⟳. Si un bandeau signale que la dernière collecte date de plus de 2 heures, ouvrez l'onglet *Actions* du dépôt `filactu` sur GitHub et vérifiez que le workflow *Collecte* est activé.

**« Clé refusée » ou « droit manquant ».** La clé a expiré ou il lui manque un droit : refaites le § 2.1 puis Réglages → *Changer de clé*.

**J'ai perdu mon téléphone.** Sur GitHub, supprimez la clé (*Settings → Developer settings → Personal access tokens*) et créez-en une nouvelle pour vos autres appareils.

**Combien ça coûte ?** Rien : tout fonctionne avec un compte GitHub gratuit.
