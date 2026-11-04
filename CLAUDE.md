# FilActu — consignes pour les sessions de développement

Lecteur RSS personnel (PWA) inspiré de Feedly. Propriétaire : Yvan, non technique : lui parler en français simple.

## Sources de vérité
- `docs/SPECIFICATIONS.md` : exigences numérotées `EXG-xxx` / `ENF-xx`, décisions `DEC-xx`, lots de livraison.
- `docs/STRATEGIE-TESTS.md` : harnais de tests et **processus obligatoire pour toute évolution**.
- `docs/GUIDE-UTILISATEUR.md` : documentation utilisateur, à tenir à jour.

## Règles
1. Toute évolution suit le processus : exigence écrite → test nommé `EXG-xxx · …` qui échoue → code → `npm run verify` vert → guide + `CHANGELOG.md` mis à jour.
2. Ne jamais renuméroter une exigence ; barrer celles qui sont abandonnées.
3. Le dépôt `filactu` est **public** : aucune URL de fil, aucun titre, aucune donnée de lecture dans le code, les tests (utiliser `tests/fixtures/`), les commits ni les journaux du collecteur (DEC-03, ENF-04).
4. Aucun test n'appelle le vrai GitHub ni un vrai site : utiliser `tests/support/fake-github.ts` et le serveur de fils local.
5. Contenu des fils toujours réduit à du texte brut (ENF-03).
6. Les données de l'utilisateur sont dans `yvandantec/filactu-data` (privé).
