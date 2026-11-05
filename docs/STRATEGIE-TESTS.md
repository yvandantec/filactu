# FilActu — Stratégie de tests et processus d'évolution

> Version 1.0 — 2026-11-05

Objectif : **aucune évolution n'entre dans `main` sans exigence écrite, sans test qui la prouve et sans documentation à jour.**

## 1. Pyramide de tests

| Niveau | Outil | Ce qui est testé | Où |
|---|---|---|---|
| **Unitaires** | Vitest | Logique pure : analyse RSS/Atom/RDF, extraction du résumé, identifiants d'articles, dédoublonnage, calcul lu/non lu, fusion de l'état (DEC-05), import/export OPML, recherche sans accents, purge 30 jours. | `tests/unit/` |
| **Collecteur** | Vitest + serveur HTTP local | Le collecteur de bout en bout sur des **fils d'exemple** (RSS 2.0, Atom, RDF, encodages, flux malformé, 404, délai dépassé, `304 Not Modified`, découverte depuis une page HTML). Vérifie les fichiers produits et l'absence d'URL dans les journaux (DEC-03). | `tests/collector/` + `tests/fixtures/feeds/` |
| **Composants** | Vitest + Testing Library | Volet de navigation, compteurs, 3 affichages, menus, boîte « Tout marquer lu », réglages. | `tests/components/` |
| **Bout en bout** | Playwright | Parcours utilisateur réels dans un navigateur, avec un **faux GitHub** (API simulée en mémoire) : premier lancement, import OPML, lecture, synchro entre deux « appareils », hors connexion. Trois formats d'écran : téléphone (390×844), tablette (820×1180), PC (1440×900). | `tests/e2e/` |
| **Accessibilité** | axe-core (dans Playwright) | Aucune violation « serious » ou « critical » sur chaque écran, thèmes clair et sombre ; zones tactiles ≥ 44 px ; parcours complet au clavier. | `tests/e2e/a11y.spec.ts` |
| **Performance** | Playwright, processeur ralenti ×4 | Liste affichée depuis le cache en moins de 1,5 s avec 2 000 articles ; défilement fluide (ENF-01). Charge du collecteur : 300 fils (ENF-08). | `tests/e2e/perf.spec.ts`, `tests/collector/` |
| **Qualité** | Lighthouse CI (`npm run quality`) | Performance ≥ 90 sur mobile, accessibilité ≥ 95, bonnes pratiques ≥ 90 (seuils dans `lighthouserc.json`). L'installabilité est vérifiée par EXG-003. | CI (travail « qualite ») |

### Le faux GitHub

Un module `tests/support/fake-github.ts` imite les points d'accès utilisés (`GET/PUT /repos/{o}/{r}/contents/{path}` avec `sha` et conflits 409, `POST …/actions/workflows/{id}/dispatches`). Il permet de :
- simuler deux appareils qui écrivent en même temps (EXG-075) ;
- simuler une clé invalide ou sans droit (EXG-001) ;
- couper le réseau (EXG-074).

Aucun test n'appelle le vrai GitHub ni un vrai site.

## 2. Traçabilité exigences ↔ tests

Chaque test porte dans son nom l'identifiant de l'exigence qu'il vérifie :

```ts
test('EXG-010 · ré-importer le même OPML ne crée pas de doublon', …)
```

Le script `npm run trace` produit `docs/TRACABILITE.md` : pour chaque exigence de [SPECIFICATIONS.md](SPECIFICATIONS.md), la liste des tests qui la couvrent. **La CI échoue si une exigence d'un lot livré n'a aucun test.**

## 3. Commandes

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires, collecteur et composants (rapide, < 30 s) |
| `npm run test:e2e` | Parcours Playwright sur les 3 formats d'écran |
| `npm run check` | Typage TypeScript + lint + formatage |
| `npm run trace` | Matrice de traçabilité |
| `npm run quality` | Audit Lighthouse de la version construite (`npm run build` avant) |
| `npm run captures` | Refait les captures d'écran du guide (`docs/images/`) avec les données d'exemple |
| `npm run verify` | **Tout ce qui précède** : à lancer avant chaque commit |

## 4. Intégration continue (GitHub Actions, dépôt `filactu`)

À chaque *pull request* et à chaque envoi sur `main` :
1. `npm ci`
2. `npm run check`
3. `npm test` avec couverture : **≥ 90 %** sur `src/core/` et `collector/` (logique pure), **≥ 70 %** au global
4. `npm run test:e2e`
5. `npm run trace` (échoue si une exigence livrée n'est pas couverte)
6. Lighthouse CI sur la version construite

`main` est protégée : fusion uniquement si tout est vert. Le déploiement sur GitHub Pages n'a lieu qu'après une CI verte sur `main`.

## 5. Processus pour chaque évolution

1. **Exprimer le besoin** : un ticket GitHub (modèle « Évolution ») décrit le besoin en langage courant.
2. **Spécifier** : ajouter ou modifier l'exigence dans `SPECIFICATIONS.md` (nouvel identifiant `EXG-…`, critères d'acceptation testables). Une exigence n'est jamais renumérotée ; une exigence abandonnée est barrée.
3. **Tester d'abord** : écrire le ou les tests qui portent l'identifiant, et vérifier qu'ils échouent.
4. **Développer** jusqu'à ce que `npm run verify` soit vert.
5. **Documenter** : mettre à jour `GUIDE-UTILISATEUR.md` si l'usage change, et ajouter une ligne dans `CHANGELOG.md`.
6. **Livrer** : *pull request* avec la liste de contrôle ci-dessous ; la CI doit être verte.

### Liste de contrôle (reprise dans le modèle de *pull request*)

- [ ] Exigence(s) ajoutée(s) ou mise(s) à jour dans `SPECIFICATIONS.md`
- [ ] Test(s) nommé(s) avec l'identifiant de l'exigence
- [ ] `npm run verify` vert en local
- [ ] Guide utilisateur à jour (ou « sans impact utilisateur »)
- [ ] `CHANGELOG.md` à jour
- [ ] Aucune donnée personnelle dans le dépôt public ni dans les journaux

## 6. Recette manuelle avant chaque version

Courte vérification sur les vrais appareils, notée dans `docs/RECETTE.md` (une section par version) puis reprise dans la *release* GitHub :
- installation et ouverture sur téléphone Android, tablette Android et PC ;
- lecture d'un article sur le téléphone → l'article apparaît lu sur le PC après ⟳ ;
- import d'un vrai OPML Feedly ;
- passage en mode avion : lecture du cache, puis envoi des actions au retour du réseau.
