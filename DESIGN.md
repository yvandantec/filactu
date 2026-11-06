---
name: FilActu
description: Lecteur RSS personnel pour trier l'actualité sur téléphone, en quelques minutes.
colors:
  platform-blue: "#2c6bed"
  platform-blue-deep: "#1f56c9"
  platform-blue-soft: "#e7eefc"
  platform-blue-dark: "#5b8cff"
  platform-blue-strong-dark: "#8aaeff"
  platform-blue-hover-dark: "#3d7bff"
  platform-blue-soft-dark: "#1a2540"
  on-accent: "#ffffff"
  signal-amber: "#8a5a00"
  signal-amber-chip: "#fff1c4"
  signal-yellow: "#ffcf3a"
  signal-yellow-chip: "#2a2a1f"
  ground-light: "#f7f8fa"
  side-light: "#eef0f3"
  hover-light: "#e6e9ee"
  active-light: "#dde1e7"
  ink: "#11151b"
  text-2-light: "#4a535f"
  text-3-light: "#5b6470"
  hairline-light: "#e3e6eb"
  board-ink: "#12161c"
  side-dark: "#171b22"
  hover-dark: "#222831"
  active-dark: "#2a313b"
  text-dark: "#f4f5f7"
  text-2-dark: "#b8c0cb"
  text-3-dark: "#9aa3af"
  hairline-dark: "#232931"
  danger: "#c0392b"
  danger-dark: "#f0857a"
  warn: "#b26b00"
  banner-bg: "#fff4d6"
  banner-fg: "#6b4500"
  error-bg: "#fdecea"
  error-fg: "#8a1f14"
  toast-bg-dark: "#262c35"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "Barlow, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Barlow, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  summary:
    fontFamily: "Barlow, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.45
  label-source:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.05em"
  label-section:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  meta:
    fontFamily: "Barlow, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  action-large:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  image: "12px"
  card: "14px"
  sheet: "16px"
  full: "9999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter-phone: "14px"
  dialog: "22px"
  gutter-pc: "28px"
components:
  button-primary:
    backgroundColor: "{colors.platform-blue}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.platform-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.ground-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-light}"
  icon-button:
    textColor: "{colors.text-2-light}"
    rounded: "{rounded.full}"
    size: "44px"
  mark-page-button:
    backgroundColor: "{colors.platform-blue}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action-large}"
    rounded: "{rounded.lg}"
    width: "100%"
    height: "52px"
  source-chip:
    backgroundColor: "{colors.signal-amber-chip}"
    textColor: "{colors.signal-amber}"
    rounded: "{rounded.full}"
    size: "18px"
  source-name:
    textColor: "{colors.signal-amber}"
    typography: "{typography.label-source}"
  nav-item:
    textColor: "{colors.text-2-light}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.active-light}"
    textColor: "{colors.ink}"
  input-field:
    backgroundColor: "{colors.ground-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  input-search:
    backgroundColor: "{colors.side-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  article-card:
    backgroundColor: "{colors.ground-light}"
    rounded: "{rounded.card}"
  popover:
    backgroundColor: "{colors.ground-light}"
    rounded: "{rounded.image}"
    padding: "8px"
  dialog:
    backgroundColor: "{colors.ground-light}"
    rounded: "{rounded.card}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "10px 10px 10px 18px"
---

# Design System: FilActu

## Overview

**Creative North Star: "Le tableau des départs"**

FilActu emprunte la discipline d'un tableau des départs, sans en reprendre le décor : des lignes strictes, une seule couleur signal, des étiquettes condensées en capitales, pour que l'œil descende la colonne des titres sans s'arrêter. Le thème sombre est le tableau lui-même (fond encre, titres presque blancs, sources en jaune signal) ; le thème clair garde exactement la même mise en page sur un fond gris très clair, avec les sources en ambre foncé. Le thème suit le téléphone et peut être forcé dans les Réglages.

L'interface est un outil de tri, pas une surface de lecture. Chaque ligne se lit dans l'ordre : la source d'abord (on la reconnaît d'un coup d'œil), le titre ensuite, en entier et jamais coupé, la fraîcheur en dernier, en gris. Le bleu « quai » ne sert qu'aux actions principales et au focus ; tout le reste est neutre. La densité est celle d'un téléphone tenu d'une main : six à huit articles par écran, zones de toucher d'au moins 44 px.

L'analogie s'arrête à la discipline : pas de lamelles qui basculent, pas de mots de gare, pas d'horloge. La géométrie est douce (pastille ronde, images à coins de 12 px, boutons d'icône ronds, filets fins), ce qui distingue FilActu d'un vrai panneau d'affichage.

**Key Characteristics:**
- Une seule couleur signal par thème, réservée au nom des sources et aux états « lu » / « enregistré ».
- Un seul bleu, réservé aux actions principales, aux liens et au focus.
- Barlow pour les titres et le texte, Barlow Condensed en capitales pour les sources, les titres de vue et les intitulés de section.
- Lignes séparées par des filets d'un pixel ; aucune ombre au repos.
- Même mise en page en clair et en sombre ; seules les couleurs changent.

## Colors

Deux neutres froids (encre et gris clair), un bleu d'action et un jaune signal qui change de teinte selon le thème pour rester lisible.

### Primary
- **Bleu quai** (`platform-blue`) : fond des boutons principaux (y compris en sombre, où il garde du texte blanc lisible), anneau de focus en clair, curseur de saisie, cases cochées. Survol : `platform-blue-deep` en clair, `platform-blue-hover-dark` en sombre.
- **Bleu quai, version sombre** (`platform-blue-dark`) : anneau de focus et contour de l'article sélectionné en thème sombre. Les liens et boutons-liens utilisent `platform-blue-deep` en clair et `platform-blue-strong-dark` en sombre (plus clair, donc plus contrasté sur l'encre).
- **Bleu pâle** (`platform-blue-soft` / `platform-blue-soft-dark`) : fond des encarts d'aide dans les fenêtres et de l'icône de catégorie choisie.

### Secondary
- **Jaune signal** (`signal-yellow`) : nom des sources en thème sombre, pictogramme « lu » et « enregistré » actifs, avertissements. C'est la couleur du tableau.
- **Ambre profond** (`signal-amber`) : le même rôle en thème clair, foncé pour tenir le contraste AA sur fond clair.
- **Pastille signal** (`signal-amber-chip` / `signal-yellow-chip`) : fond de la pastille ronde portant l'initiale de la source, et de la sélection de texte.

### Neutral
- **Encre du tableau** (`board-ink`) : fond principal en sombre ; `side-dark`, `hover-dark`, `active-dark` en forment les paliers (volet, survol, élément actif).
- **Gris quai** (`ground-light`) : fond principal en clair ; `side-light`, `hover-light`, `active-light` en forment les paliers.
- **Encre** (`ink`) / **Blanc tableau** (`text-dark`) : titres et texte principal.
- **Texte secondaire** (`text-2-light` / `text-2-dark`) : résumés, éléments de navigation au repos, icônes de la barre du haut.
- **Texte discret** (`text-3-light` / `text-3-dark`) : âge de l'article, compteurs, intitulés de section, titres déjà lus.
- **Filet** (`hairline-light` / `hairline-dark`) : séparation entre articles, bordure des champs, des cartes et des fenêtres.
- **États** : `danger` / `danger-dark` pour les actions destructrices, `banner-bg` / `banner-fg` pour les bandeaux d'information, `error-bg` / `error-fg` pour les erreurs de fil. Chacun a sa variante sombre définie dans `src/styles.css`.

### Named Rules
**La règle du signal unique.** Le jaune (ou l'ambre en clair) ne marque que l'identité de la source, les états de l'article (lu, enregistré), les avertissements et l'action « Annuler » de la notification sur fond encre. Jamais un fond de bouton, jamais un fond de zone, jamais un titre.

**La règle du bleu d'action.** Le bleu désigne ce qu'on peut faire : bouton principal, lien, focus. Un élément bleu qui ne réagit pas au toucher est une erreur.

**La règle des deux thèmes jumeaux.** Toute couleur passe par une variable de `:root` redéfinie pour le thème sombre (système et réglage). Une couleur écrite en dur ne suit pas le thème.

## Typography

**Display Font:** Barlow Condensed (avec Barlow, Arial Narrow), hébergée avec l'appli, graisses 500, 600 et 700
**Body Font:** Barlow (avec Segoe UI, Roboto, Helvetica Neue, Arial, system-ui), hébergée avec l'appli, graisses 400, 500 et 600

**Character:** Une famille unique en deux largeurs. La version condensée en capitales donne la voix du tableau (sources, titres de vue) ; la version normale porte les titres d'articles, qui doivent se lire vite et en entier.

### Hierarchy
- **Display** (`display`) : titre de la vue dans la barre du haut (« Aujourd'hui »), 24 px sur téléphone. Le nom FilActu dans le volet utilise la même famille en 700, 22 px.
- **Headline** (`headline`) : titre des fenêtres (Réglages, Ajouter un fil).
- **Title** (`title`) : titre d'article en mode Magazine ; 18 px sur téléphone, 18 px en Cartes, 16 px en Titres (15 px sur téléphone). Toujours affiché en entier, sur plusieurs lignes si besoin. Un article lu passe en 400 et en texte discret.
- **Body** (`body`) : texte courant, champs, boutons (600 pour les boutons).
- **Summary** (`summary`) : résumé sous le titre, limité à 2 lignes (3 en Cartes, 4 en Titres).
- **Label source** (`label-source`) : nom de la source, en capitales, couleur signal ; 14 px en Titres, 13 px en Titres sur téléphone.
- **Label section** (`label-section`) : intitulés de groupe dans le volet (« CATÉGORIES »), en capitales, texte discret.
- **Meta** (`meta`) : âge de l'article, précédé d'un point médian ; compteurs en chiffres tabulaires à 12 px.
- **Action large** (`action-large`) : libellé du bouton de fin de page.

Les tailles de la liste d'articles sont multipliées par `--fs` (réglage de taille du texte).

### Named Rules
**La règle du titre entier.** Un titre d'article n'est jamais tronqué ni coupé par des points de suspension ; seuls le nom de la source et les résumés peuvent l'être.

**La règle des capitales condensées.** Les capitales ne s'emploient qu'en Barlow Condensed avec un interlettrage ouvert (0,05 à 0,1 em), et seulement pour les sources et les intitulés de section du volet.

## Layout

Sur PC (900 px et plus) : volet latéral fixe de 272 px (`--side-w`) et zone principale ; barre du haut de 64 px de haut, marges latérales de 28 px ; liste centrée sur 760 px au plus (1100 px en Cartes, grille de colonnes d'au moins 260 px, espacées de 18 px).

Sur téléphone et tablette portrait (moins de 900 px) : une seule colonne ; le volet devient un tiroir de 86 vw (320 px au plus) avec un voile ; barre du haut de 56 px, titre de vue et compteur empilés ; marges de 14 px ; les menus deviennent des panneaux pleine largeur et les fenêtres des feuilles ancrées en bas (92 vh au plus). Pendant une recherche, le champ occupe toute la barre.

Rythme d'une ligne d'article : ligne 1 de 32 px au moins (pastille, source, âge, puis boutons enregistrer et lu alignés à droite en colonne), ligne 2 le titre, avec l'image à droite (160 × 106 px sur PC, 112 × 84 px sur téléphone). Espacements dominants : 8, 12 et 16 px ; 22 px de marge dans les fenêtres.

Sur écran tactile, toute cible fait au moins 44 px ; les boutons d'article sont agrandis par marges négatives pour ne pas espacer les lignes.

## Elevation & Depth

Le système est plat. La profondeur vient de paliers de tons (fond, volet, survol, actif) et de filets d'un pixel. Une seule ombre existe, réservée à ce qui flotte au-dessus de la liste : menus, fenêtres, tiroir ouvert et notification.

### Shadow Vocabulary
- **Flottant** (`--shadow` : `0 10px 30px rgba(17, 21, 27, 0.18)` en clair, `0 10px 30px rgba(0, 0, 0, 0.55)` en sombre) : menus, fenêtres, tiroir ouvert, notification.
- **Segment actif** (`0 1px 3px rgba(0,0,0,.12)`) : option choisie du sélecteur segmenté du menu Affichage.

### Named Rules
**La règle du plat au repos.** Les articles, la barre du haut et le volet n'ont jamais d'ombre. L'article sélectionné au clavier se signale par un contour intérieur d'un pixel bleu et un fond de palier, pas par une ombre.

## Shapes

Géométrie douce et ronde sur une structure rectiligne. Les rangées sont des bandes droites séparées par des filets ; ce qui s'y pose est arrondi : pastille de source et boutons d'icône en cercle parfait, images à 12 px, boutons et champs à 8 px, cartes et fenêtres à 14 px, feuilles du téléphone à 16 px en haut seulement. Les images en mode Cartes sont à bords francs, au format 16/9, la carte portant l'arrondi.

## Components

### Buttons
- **Shape:** coins doux (`rounded.md`, 8 px), 44 px de haut, texte 600.
- **Primary:** fond bleu quai, texte blanc. Survol : bleu plus profond (clair) ou plus vif (sombre).
- **Secondary:** fond du thème, filet d'un pixel ; survol au palier `hover`.
- **Danger:** texte rouge `danger` sur bouton secondaire ; version pleine pour la confirmation finale.
- **Small:** 36 px (44 px sur écran tactile), 13 px.
- **Focus:** contour de 2 px bleu décalé de 2 px, sur tous les éléments.

### Icon buttons
Cercles de 40 px (44 px au toucher), sans fond au repos, icônes au trait de 1,8 px en 20 px. Survol au palier `hover` uniquement avec une vraie souris. Dans la ligne d'article, texte discret ; l'état actif (lu, enregistré) passe en couleur signal, le « lu » devenant un disque plein avec la coche couleur fond.

### Source chip
Pastille ronde de 18 px : favicon du site, ou initiale en Barlow Condensed 700 sur fond de pastille signal. Toujours suivie du nom de la source en capitales signal.

### Cards / Containers
- **Corner Style:** 14 px en mode Cartes et pour les fenêtres.
- **Background:** fond du thème ; sous-panneaux au palier `side`.
- **Shadow Strategy:** aucune pour les cartes ; ombre flottante pour fenêtres et menus.
- **Border:** filet d'un pixel ; panneau de danger bordé de `danger-border` sur `danger-bg`.
- **Internal Padding:** 14 px dans les cartes et sous-panneaux, 22 px dans les fenêtres.

### Inputs / Fields
- **Style:** filet d'un pixel, coins de 8 px, 44 px de haut, fond du thème ; le champ de recherche est au palier `side`.
- **Focus:** contour bleu de 2 px ; curseur de saisie bleu.

### Navigation
Barre du haut : bouton menu (téléphone), titre de vue en condensé, compteur de non-lus en texte discret, puis boutons d'icône (recherche, affichage, tout marquer lu, actualiser). Volet : éléments de 38 px (44 px au toucher), coins de 8 px, texte secondaire ; survol au palier `hover`, élément actif au palier `active` en 600 ; compteurs en chiffres tabulaires.

### Mark-page button (signature)
Bouton pleine largeur de 52 px en fin de liste, bleu quai, coins de 10 px, libellé en Barlow Condensed 19 px. C'est le geste principal de l'appli : il n'en existe qu'un par vue.

### Toast
Notification centrée en bas, fond encre, texte blanc, coins de 10 px, ombre flottante ; l'action (« Annuler ») est en jaune signal gras. Placée sous les fenêtres et le tiroir.

## Do's and Don'ts

### Do:
- **Do** afficher chaque titre d'article en entier, sur autant de lignes qu'il le faut.
- **Do** ouvrir chaque ligne d'article par la pastille, le nom de la source en capitales signal, puis l'âge discret précédé de « · ».
- **Do** passer toute couleur par une variable de `:root` qui a sa valeur sombre.
- **Do** garder 44 px au moins pour toute cible sur écran tactile.
- **Do** dessiner les icônes en SVG au trait (1,8 px, extrémités rondes) dans `src/ui/icons.tsx`.
- **Do** réserver l'ombre `--shadow` à ce qui flotte (menus, fenêtres, tiroir, notification).

### Don't:
- **Don't** utiliser le jaune ou l'ambre signal comme fond de bouton ou de zone, ni pour un titre.
- **Don't** utiliser le bleu sur un élément qui ne réagit pas.
- **Don't** reprendre le décor du tableau des départs : pas de lamelles, pas de vocabulaire de gare, pas d'horloge.
- **Don't** poser une ombre sur les articles, la barre du haut ou le volet.
- **Don't** écrire de capitales en Barlow normale, ni de capitales hors des sources et intitulés de section.
- **Don't** charger une police depuis un service externe : la politique de sécurité l'interdit, les polices sont hébergées avec l'appli.
