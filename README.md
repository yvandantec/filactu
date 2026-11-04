<p align="center"><img src="assets/logo-wordmark.svg" alt="FilActu" width="420"></p>

<p align="center"><b>Lecteur de fils RSS personnel, inspiré de Feedly, sans serveur.</b><br>
Une seule appli web installable pour le PC, le téléphone et la tablette Android, synchronisée via GitHub.</p>

---

> **Version 0.1 (socle)** — <https://yvandantec.github.io/filactu/> · Mise en route : [guide utilisateur § 2](docs/GUIDE-UTILISATEUR.md#2-première-installation-une-seule-fois)

## Développement

```bash
npm install
npm run dev          # appli en local
npm run verify       # tout vérifier avant un commit (types, tests, couverture, build, bout en bout, traçabilité)
```

Toute évolution suit le [processus décrit dans la stratégie de tests](docs/STRATEGIE-TESTS.md#5-processus-pour-chaque-évolution).

## En bref

- Abonnements regroupés par **catégories**, avec le nombre de non-lus
- **Résumé** de chaque article ; un clic ouvre l'article dans le navigateur par défaut
- Trois affichages : **Titres**, **Magazine**, **Cartes**
- **Lu / non lu** synchronisé entre tous vos appareils, **À lire plus tard**, **Tout marquer comme lu**
- **Import OPML** depuis Feedly, recherche, thème sombre, raccourcis clavier
- Collecte automatique des fils **toutes les 15 minutes** par GitHub Actions
- Vos données restent dans **votre dépôt GitHub privé** ; coût : 0 €

## Documentation

| Document | Contenu |
|---|---|
| [Spécifications](docs/SPECIFICATIONS.md) | Vision, architecture, modèle de données, exigences numérotées, lots de livraison |
| [Guide utilisateur](docs/GUIDE-UTILISATEUR.md) | Installation, import Feedly, utilisation au quotidien |
| [Stratégie de tests](docs/STRATEGIE-TESTS.md) | Harnais de tests, traçabilité et processus pour chaque évolution |
| [Journal des versions](CHANGELOG.md) | Ce qui change à chaque version |

## Architecture

| Dépôt | Visibilité | Rôle |
|---|---|---|
| `filactu` (ce dépôt) | public | Code de l'appli (publiée sur GitHub Pages), collecteur, tests, documentation |
| `filactu-data` | **privé** | Abonnements, état de lecture, articles collectés |

## Licence

MIT
