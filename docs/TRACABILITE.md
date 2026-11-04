# Matrice de traçabilité

> Générée par `npm run trace` — lots livrés : V0.1, V0.1.2, V0.1.3. Ne pas modifier à la main.

| Exigence | Lot livré | Tests | Statut |
|---|---|---|---|
| **EXG-001** Au premier lancement sur un appareil, l'appli demande la clé GitHub et le nom du dépôt de données. | oui | 4 | ✅ couverte |
| **EXG-002** La clé est mémorisée sur l'appareil et peut être effacée depuis les réglages (« Déconnecter cet appareil »). | oui | 1 | ✅ couverte |
| **EXG-003** L'appli s'installe sur Android (téléphone et tablette) et sur PC (Chrome/Edge). | oui | 1 | ✅ couverte |
| **EXG-010** Importer un fichier OPML (export Feedly). | oui | 5 | ✅ couverte |
| **EXG-011** Ajouter un abonnement par URL de fil ou de site, avec un nom facultatif, et le ranger dans une catégorie existante ou nouvelle. | oui | 9 | ✅ couverte |
| **EXG-012** Renommer, déplacer (changer de catégorie), désabonner un fil. |  | 0 | — à venir |
| **EXG-013** Créer, renommer, réordonner, supprimer une catégorie. | oui | 12 | ✅ couverte |
| **EXG-017** Accepter les adresses de pages YouTube (playlist, chaîne) comme abonnements. | oui | 5 | ✅ couverte |
| **EXG-016** Associer une icône à une catégorie. | oui | 3 | ✅ couverte |
| **EXG-014** Exporter les abonnements en OPML. |  | 1 | ✅ couverte |
| **EXG-015** Signaler les fils en erreur. |  | 1 | ✅ couverte |
| **EXG-020** Volet de navigation avec : Aujourd'hui, Tous les articles, À lire plus tard, puis les catégories dépliables contenant leurs fils. | oui | 3 | ✅ couverte |
| **EXG-021** Disposition adaptée à l'écran. | oui | 1 | ✅ couverte |
| **EXG-022** En-tête de liste : nom de la vue, nombre de non-lus, boutons *Tout marquer comme lu*, *Changer d'affichage*, *Actualiser*, *Rechercher*. | oui | 1 | ✅ couverte |
| **EXG-023** Les articles sont triés du plus récent au plus ancien ; l'option « plus ancien d'abord » est disponible par vue. |  | 0 | — à venir |
| **EXG-024** Filtre « non lus seulement » / « tous ». |  | 0 | — à venir |
| **EXG-030** Trois affichages : Titres (une ligne : source, titre, âge), Magazine (vignette, titre, source, âge, 2–3 lignes de résumé), Cartes (grille, grande image, titre, début du résumé). | oui | 3 | ✅ couverte |
| **EXG-031** Résumé de chaque article : texte brut sans HTML, environ 400 caractères maximum, coupé au mot. | oui | 5 | ✅ couverte |
| **EXG-032** En affichage Titres, un appui long (mobile) ou le survol (PC) montre le résumé. |  | 0 | — à venir |
| **EXG-033** Un clic sur un article l'ouvre dans le navigateur par défaut (nouvel onglet sur PC). | oui | 1 | ✅ couverte |
| **EXG-034** Les articles lus sont affichés atténués. |  | 0 | — à venir |
| **EXG-035** Les images distantes sont chargées en différé (*lazy loading*), sans transmettre de référent. |  | 0 | — à venir |
| **EXG-040** Marquer lu à l'ouverture d'un article. | oui | 2 | ✅ couverte |
| **EXG-041** Marquer lu en défilant (réglable, activé par défaut). |  | 0 | — à venir |
| **EXG-042** Basculer lu/non lu manuellement sur un article. |  | 1 | ✅ couverte |
| **EXG-043** *Tout marquer comme lu* sur la vue en cours (fil, catégorie, Aujourd'hui, Tous) avec le choix : tout, plus vieux qu'un jour, plus vieux qu'une semaine. |  | 2 | ✅ couverte |
| **EXG-044** Les compteurs de non-lus se mettent à jour immédiatement. |  | 0 | — à venir |
| **EXG-045** En bas de la liste, un bouton marque comme lus tous les articles affichés sur la page. | oui | 2 | ✅ couverte |
| **EXG-050** Ajouter ou retirer un article de « À lire plus tard ». |  | 0 | — à venir |
| **EXG-051** Les articles mis de côté sont conservés sans limite de durée, même après la purge des 30 jours. |  | 0 | — à venir |
| **EXG-060** Rechercher dans les titres et résumés des articles conservés (30 jours + à lire plus tard), dans la vue courante ou partout. |  | 0 | — à venir |
| **EXG-061** Thème clair, sombre ou automatique (suit le système). |  | 0 | — à venir |
| **EXG-062** Raccourcis clavier sur PC : `j`/`k` article suivant/précédent, `o` ou `Entrée` ouvrir, `m` lu/non lu, `s` à lire plus tard, `Maj+A` tout marquer lu, `r` actualiser, `/` rechercher, `v` changer d'affichage, `g a` Tous, `g t` Aujourd'hui, `?` aide. |  | 0 | — à venir |
| **EXG-070** Le collecteur récupère tous les fils actifs toutes les 15 minutes. | oui | 10 | ✅ couverte |
| **EXG-071** Le bouton *Actualiser* déclenche une collecte immédiate puis recharge les articles. |  | 2 | ✅ couverte |
| **EXG-072** Les articles de plus de 30 jours sont purgés (hors « À lire plus tard »). | oui | 4 | ✅ couverte |
| **EXG-073** Chaque action (lu, favori, abonnement, préférence) est enregistrée localement tout de suite, puis envoyée au dépôt de données au plus tard 5 secondes après, ou dès que l'appli passe en arrière-plan. | oui | 2 | ✅ couverte |
| **EXG-074** Hors connexion, l'appli affiche les articles en cache et met les actions en file d'attente. |  | 0 | — à venir |
| **EXG-075** Écritures concurrentes depuis deux appareils. |  | 3 | ✅ couverte |
| **EXG-076** Reprise sur un autre appareil. |  | 1 | ✅ couverte |
| **EXG-077** Pas de doublon. | oui | 6 | ✅ couverte |
| **ENF-01** Performance : affichage de la liste en moins de 1,5 s à l'ouverture sur un téléphone de milieu de gamme (articles en cache), défilement fluide avec 2 000 articles chargés. |  | 0 | — à venir |
| **ENF-02** Accessibilité : navigation complète au clavier, contrastes conformes RGAA/WCAG AA, libellés pour les lecteurs d'écran, zones tactiles d'au moins 44 px. |  | 0 | — à venir |
| **ENF-03** Sécurité : CSP stricte, aucun script tiers, contenu des fils toujours réduit à du texte brut, clé envoyée uniquement à `api.github.com`. |  | 1 | ✅ couverte |
| **ENF-04** Confidentialité : aucune donnée personnelle (URL de fil, titre, lecture) dans le dépôt public ni dans ses journaux. |  | 0 | — à venir |
| **ENF-05** Coût : 0 € (GitHub gratuit). |  | 0 | — à venir |
| **ENF-06** Compatibilité : Chrome et Edge récents sur PC ; Chrome Android récent ; Firefox PC (sans installation). |  | 0 | — à venir |
| **ENF-07** Langue : interface en français. |  | 0 | — à venir |
| **ENF-08** Volume cible : jusqu'à 300 fils et 1 000 nouveaux articles par jour. |  | 0 | — à venir |

## Détail des tests

### ENF-03
- tests/unit/text.test.ts › ENF-03 · seules les URL http(s) sont acceptées

### EXG-001
- tests/e2e/setup.spec.ts › EXG-001 · une clé valide affiche les abonnements
- tests/e2e/setup.spec.ts › EXG-001 · une clé invalide est refusée avec un message clair
- tests/e2e/setup.spec.ts › EXG-001 · une clé sans droit d’écriture indique le droit manquant
- tests/e2e/setup.spec.ts › EXG-001 · un dépôt introuvable est signalé

### EXG-002
- tests/e2e/setup.spec.ts › EXG-002 · la clé est mémorisée, puis effacée par « Déconnecter cet appareil »

### EXG-003
- tests/e2e/setup.spec.ts › EXG-003 · l’appli est installable (manifeste, icônes, service worker)

### EXG-010
- tests/e2e/reader.spec.ts › EXG-010 · import du fichier OPML Feedly
- tests/unit/opml.test.ts › EXG-010 · lit un export Feedly : catégories et fils
- tests/unit/opml.test.ts › EXG-010 · un fil dans plusieurs catégories est rattaché à toutes
- tests/unit/opml.test.ts › EXG-010 · ré-importer le même OPML ne crée pas de doublon
- tests/unit/opml.test.ts › EXG-010 · un fichier qui n’est pas un OPML est refusé

### EXG-011
- tests/collector/collect.test.ts › EXG-011 · une adresse de site est résolue vers son fil
- tests/e2e/manage.spec.ts › EXG-011 · ajouter un abonnement dans une catégorie existante
- tests/e2e/manage.spec.ts › EXG-011 · une adresse déjà suivie est refusée
- tests/e2e/manage.spec.ts › EXG-011 · EXG-016 · ajouter un abonnement dans une nouvelle catégorie avec icône
- tests/unit/feed.test.ts › EXG-011 · découvre le fil annoncé par une page HTML
- tests/unit/subscriptions.test.ts › EXG-011 · ajouter un fil dans une catégorie existante
- tests/unit/subscriptions.test.ts › EXG-011 · ajouter un fil dans une nouvelle catégorie avec icône
- tests/unit/subscriptions.test.ts › EXG-011 · adresse invalide, doublon ou catégorie manquante refusés
- tests/unit/subscriptions.test.ts › EXG-011 · nom affiché : saisi, sinon trouvé par le collecteur, sinon le site

### EXG-013
- tests/e2e/manage.spec.ts › EXG-013 · EXG-016 · créer une catégorie avec icône, la renommer, changer son icône, la réordonner
- tests/e2e/manage.spec.ts › EXG-013 · un nom de catégorie déjà pris est refusé
- tests/e2e/manage.spec.ts › EXG-013 · supprimer une catégorie non vide en déplaçant ses fils
- tests/e2e/manage.spec.ts › EXG-013 · supprimer une catégorie en se désabonnant de ses fils
- tests/unit/subscriptions.test.ts › EXG-013 · créer une catégorie (nom nettoyé, ordre en fin de liste)
- tests/unit/subscriptions.test.ts › EXG-013 · un nom vide ou déjà pris est refusé
- tests/unit/subscriptions.test.ts › EXG-013 · deux noms proches donnent des identifiants distincts
- tests/unit/subscriptions.test.ts › EXG-013 · renommer une catégorie
- tests/unit/subscriptions.test.ts › EXG-013 · réordonner
- tests/unit/subscriptions.test.ts › EXG-013 · supprimer en déplaçant les fils vers une autre catégorie
- tests/unit/subscriptions.test.ts › EXG-013 · supprimer en se désabonnant des fils (un fil rangé ailleurs reste)
- tests/unit/subscriptions.test.ts › EXG-013 · suppression : destination invalide refusée

### EXG-014
- tests/unit/opml.test.ts › EXG-014 · l’export se ré-importe sans perte

### EXG-015
- tests/collector/collect.test.ts › EXG-015 · les échecs consécutifs sont comptés puis remis à zéro

### EXG-016
- tests/e2e/manage.spec.ts › EXG-011 · EXG-016 · ajouter un abonnement dans une nouvelle catégorie avec icône
- tests/e2e/manage.spec.ts › EXG-013 · EXG-016 · créer une catégorie avec icône, la renommer, changer son icône, la réordonner
- tests/unit/subscriptions.test.ts › EXG-016 · associer, changer et retirer une icône

### EXG-017
- tests/collector/collect.test.ts › EXG-017 · une adresse de playlist YouTube est collectée via le fil officiel
- tests/unit/youtube.test.ts › EXG-017 · une playlist YouTube est convertie en fil
- tests/unit/youtube.test.ts › EXG-017 · une chaîne YouTube (/channel/UC…) est convertie en fil
- tests/unit/youtube.test.ts › EXG-017 · les autres adresses ne sont pas modifiées
- tests/unit/youtube.test.ts › EXG-017 · résumé et vignette d’une vidéo viennent de media:group

### EXG-020
- tests/e2e/reader.spec.ts › EXG-020 · volet : vues fixes, catégories dépliables et compteurs de non-lus
- tests/unit/reading.test.ts › EXG-020 · vues Aujourd’hui, Tous, catégorie, fil, à lire plus tard
- tests/unit/reading.test.ts › EXG-020 · compteurs de non-lus par fil et par catégorie

### EXG-021
- tests/e2e/reader.spec.ts › EXG-021 · disposition adaptée à l’écran

### EXG-022
- tests/e2e/reader.spec.ts › EXG-022 · en-tête : nom de la vue, non-lus, actions

### EXG-030
- tests/e2e/reader.spec.ts › EXG-030 · affichage Magazine : vignette, titre, source, âge, résumé
- tests/unit/reading.test.ts › EXG-030 · âge lisible
- tests/unit/text.test.ts › EXG-030 · trouve la première image, en ignorant les pixels de suivi

### EXG-031
- tests/e2e/reader.spec.ts › EXG-031 · le résumé est affiché en texte brut
- tests/unit/feed.test.ts › EXG-031 · le résumé est du texte brut, sans script ni balise
- tests/unit/text.test.ts › EXG-031 · décode les entités nommées et numériques
- tests/unit/text.test.ts › EXG-031 · retire scripts, styles, commentaires et balises
- tests/unit/text.test.ts › EXG-031 · coupe le résumé au mot, sans dépasser 400 caractères

### EXG-033
- tests/e2e/reader.spec.ts › EXG-033 · EXG-040 · un clic ouvre l’article dans le navigateur et le marque lu

### EXG-040
- tests/e2e/reader.spec.ts › EXG-033 · EXG-040 · un clic ouvre l’article dans le navigateur et le marque lu
- tests/unit/reading.test.ts › EXG-040 · marquer lu puis non lu

### EXG-042
- tests/e2e/reader.spec.ts › EXG-042 · EXG-075 · une écriture en conflit est fusionnée et réessayée sans perte

### EXG-043
- tests/e2e/reader.spec.ts › EXG-043 · tout marquer comme lu sur la vue
- tests/unit/reading.test.ts › EXG-043 · tout marquer lu couvre le fil, la catégorie ou tout

### EXG-045
- tests/e2e/manage.spec.ts › EXG-045 · le bouton de bas de page marque lus les articles affichés
- tests/unit/reading.test.ts › EXG-045 · marquer lus plusieurs articles d’un coup, sans toucher aux autres

### EXG-070
- tests/collector/collect.test.ts › EXG-070 · collecte RSS, Atom et RDF dans le fichier du jour
- tests/collector/collect.test.ts › EXG-070 · un fil en erreur ou trop lent ne bloque pas les autres
- tests/collector/collect.test.ts › EXG-070 · sans abonnements, la collecte se termine sans erreur
- tests/unit/feed.test.ts › EXG-070 · lit un fil RSS 2.0 (titre, lien, date, auteur, image)
- tests/unit/feed.test.ts › EXG-070 · ignore les articles dont le lien n
- tests/unit/feed.test.ts › EXG-070 · lit un fil Atom (liens relatifs, titre html, auteur)
- tests/unit/feed.test.ts › EXG-070 · lit un fil RSS 1.0 (RDF)
- tests/unit/feed.test.ts › EXG-070 · un document qui n’est pas un fil est rejeté
- tests/unit/items.test.ts › EXG-070 · date absente ou future → date de collecte
- tests/unit/workflows.test.ts › EXG-070 · la collecte est planifiée toutes les 15 minutes

### EXG-071
- tests/e2e/reader.spec.ts › EXG-071 · le bouton Actualiser demande une collecte
- tests/unit/workflows.test.ts › EXG-071 · la collecte peut être lancée à la demande (bouton Actualiser)

### EXG-072
- tests/collector/collect.test.ts › EXG-072 · les fichiers de plus de 30 jours sont supprimés
- tests/unit/items.test.ts › EXG-072 · les articles publiés il y a plus de 30 jours ne sont pas collectés
- tests/unit/items.test.ts › EXG-072 · fichiers journaliers expirés après 30 jours
- tests/unit/reading.test.ts › EXG-072 · les marques anciennes sont purgées

### EXG-073
- tests/e2e/reader.spec.ts › EXG-073 · EXG-076 · l’article lu est enregistré sur GitHub et retrouvé sur un autre appareil
- tests/unit/reading.test.ts › EXG-073 · seul le delta non envoyé est transmis

### EXG-075
- tests/e2e/reader.spec.ts › EXG-042 · EXG-075 · une écriture en conflit est fusionnée et réessayée sans perte
- tests/unit/reading.test.ts › EXG-075 · la fusion de deux appareils ne perd rien
- tests/unit/reading.test.ts › EXG-075 · favoris et préférences : le plus récent gagne

### EXG-076
- tests/e2e/reader.spec.ts › EXG-073 · EXG-076 · l’article lu est enregistré sur GitHub et retrouvé sur un autre appareil

### EXG-077
- tests/collector/collect.test.ts › EXG-077 · une deuxième collecte n’ajoute aucun doublon (et respecte ETag)
- tests/unit/items.test.ts › EXG-077 · un article déjà vu (même guid) n’est pas ajouté deux fois, même republié
- tests/unit/items.test.ts › EXG-077 · même lien avec un guid différent = doublon
- tests/unit/items.test.ts › EXG-077 · l’index se reconstruit à partir des articles existants
- tests/unit/items.test.ts › EXG-077 · la liste fusionnée est triée et sans doublon
- tests/unit/text.test.ts › EXG-077 · identifiants stables et URL normalisées
