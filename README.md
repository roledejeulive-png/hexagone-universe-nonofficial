# Hexagon Universe — système Foundry VTT (non officiel)

Moteur de jeu pour parties de super-héros à pools de d6 : Traits notés (Motivations, Talents, Pouvoirs), on cumule les rangs, on lance autant de d6, on compte les réussites.

**Non officiel.** Ce dépôt ne contient aucun texte de règles, aucun personnage, aucun visuel de la licence Hexagon (Lug / Hexagon Comics / Rivière Blanche / Les XII Singes). Il fournit des structures de données et une interface. Pour jouer, il faut le livre.

Compatible **Foundry VTT v12**.

---

## Installation

### URL de manifeste

```
https://github.com/roledejeulive-png/hexagone-universe-nonofficial/releases/latest/download/system.json
```

**Sur la Forge** — onglet *Game Systems*, bouton d'installation, coller l'URL ci-dessus dans le champ *Manifest URL*.

**Sur une installation Foundry classique** — écran de configuration, onglet *Game Systems*, *Install System*, même URL dans le champ *Manifest URL* en bas de la fenêtre.

Tant qu'aucune release n'a été publiée, cette URL renvoie une erreur : voir la section suivante.

### Installation manuelle

Télécharger `hexagon-universe.zip` depuis les releases, décompresser dans `Data/systems/hexagon-universe/` — `system.json` doit se trouver directement dans ce dossier, sans niveau intermédiaire — puis redémarrer le serveur Foundry.

## Publier une version

Le dépôt contient deux workflows GitHub Actions.

`verification.yml` tourne à chaque poussée sur `main` : syntaxe des modules, validité des JSON, cohérence entre le manifeste et les fichiers réellement présents, parité des traductions. Un JSON invalide fait disparaître le système de la liste de Foundry sans message clair, autant s'en apercevoir ici.

`release.yml` se déclenche sur un tag de version :

```bash
git tag v0.1.0
git push origin v0.1.0
```

Il réécrit `system.json` avec le numéro du tag et les URLs de la release, construit l'archive, puis publie les deux fichiers comme *assets*. C'est ce qui rend l'URL de manifeste fonctionnelle et permet aux mises à jour d'être détectées.

Le numéro de version inscrit dans `system.json` sert de valeur de repli pour le développement local ; lors d'une publication, c'est toujours le tag qui fait foi.

## Ce qu'il y a dedans

| Élément | Détail |
| --- | --- |
| Acteurs | `heros` (identité, Énergie, Audace, XP) et `figurant` (Énergie, pool par défaut, effectif) |
| Objets | `motivation`, `talent` (+ spécialités), `pouvoir` (+ coût en énergie, limites), `equipement` (+ dés apportés) |
| Rangs | Motivations 3, Talents 3, Pouvoirs 10, dés d'équipement 0 à 3 |
| Jets | sélection de Traits sur la feuille → pool → `Nd6`, réussites sur 3+, difficulté sur dix crans, carte de chat détaillée |
| Spécialités | portées par les Talents : −1 dé, +1 réussite acquise, cumulables, inactives si le Talent est au rang 0 |
| Automatisme | le coût en énergie des Pouvoirs engagés est déduit au moment du jet |
| API macro | `game.hexagon.lancerPool({ des: 6, difficulte: 2, label: "Esquive" })` |

Sur la feuille de héros, chaque Trait porte un jeton hexagonal affichant son rang : cliquer dessus l'engage dans le pool, la jauge en haut affiche le total de dés. Les chevrons ▴▾ règlent les rangs et les jauges sans ouvrir de fenêtre.

## Ce qu'il faut caler sur les vraies règles

Les valeurs chiffrées sont regroupées dans `module/config.mjs` :

- `dice.seuilReussite` — actuellement 3.
- `dice.poolMinimum` — ce qui se passe quand le pool tombe à zéro (actuellement : 1 dé). Tant qu'il vaut 1, une spécialité engagée sur un très petit pool ne coûte rien de réel.
- `difficultes` — l'échelle en nombre de réussites, dix crans par défaut.
- `rangMax` — plafond par type de Trait.
- `specialite` — le troc dé contre réussite.
- `HerosData` dans `module/data/actor-data.mjs` — l'Énergie sert à la fois de jauge vitale et de carburant aux Pouvoirs ; l'Audace est une ressource dramatique laissée libre d'usage.

## Limites connues

- Les champs longs sont des `textarea` : pas d'éditeur enrichi ProseMirror.
- Pas de compendium fourni (voir la note de licence plus haut).
- Pas d'Active Effects ni d'automatisation de combat au-delà de l'initiative à 1d6.
- Le tri des Traits par glisser-déposer n'est pas implémenté.

## Structure

```
system.json              manifeste (id, compatibilité, URLs de publication)
template.json            déclaration des sous-types d'Acteurs et d'Objets
module/config.mjs        toutes les valeurs chiffrées
module/hexagon.mjs       point d'entrée, hook init
module/data/             modèles de données (TypeDataModel)
module/documents/        classes Actor et Item
module/dice/pool.mjs     construction du pool, jet, carte de chat
module/apps/             feuilles de personnage et d'objet
templates/               Handlebars
css/hexagon.css          habillage
lang/                    fr, en
.github/workflows/       vérification et publication
```

## Licence

Code sous licence MIT (voir `LICENSE.txt`). Les marques et contenus Hexagon appartiennent à leurs ayants droit et ne sont pas inclus.
