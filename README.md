# Hexagon Universe — système Foundry VTT (non officiel)

Moteur de jeu pour parties de super-héros à pools de d6 : Traits notés (Motivations, Talents, Pouvoirs), on cumule les rangs, on lance autant de d6, on compte les réussites.

**Non officiel.** Ce dépôt ne contient aucun texte de règles, aucun personnage, aucun visuel de la licence Hexagon (Lug / Hexagon Comics / Rivière Blanche / Les XII Singes). Il fournit des structures de données et une interface. Pour jouer, il faut le livre.

**Branche `foundry-v13`** — build pour Foundry VTT v13 (vérifié sur la build 351). La branche `main` porte le build v12, fonctionnellement identique. Les deux partagent l'id `hexagon-universe` : ils ne peuvent pas cohabiter sur une même installation.

---

## Installation

### URL de manifeste

```
https://raw.githubusercontent.com/roledejeulive-png/hexagone-universe-nonofficial/foundry-v13/system.json
```

**Sur la Forge** — onglet *Game Systems*, bouton d'installation, coller l'URL dans le champ *Manifest URL*.

**Sur une installation classique** — écran de configuration, onglet *Game Systems*, *Install System*, même URL.

Cette adresse est servie dès que la branche est poussée, sans attendre de release. L'archive téléchargée est celle que GitHub génère pour la branche ; elle contient un dossier racine que Foundry retire à l'installation.

### Installation manuelle

Décompresser l'archive dans `Data/systems/hexagon-universe/` — `system.json` doit se trouver directement dans ce dossier, sans niveau intermédiaire — puis redémarrer le serveur.

## Différences avec le build v12

Même comportement en jeu, API différente :

| | branche `main` (v12) | branche `foundry-v13` |
| --- | --- | --- |
| Sous-types | `template.json` | `documentTypes` dans `system.json` |
| Feuilles | `ActorSheet` / `ItemSheet` | `ApplicationV2` + `HandlebarsApplicationMixin` |
| Onglets | mécanisme natif des feuilles v1 | gérés par la feuille, action `selectTab` |
| Confirmations | `Dialog.confirm` | `DialogV2.confirm` |
| Templates | un fichier par feuille, partials Handlebars | `PARTS` assemblées par l'application |

## Publier une version

`verification.yml` tourne à chaque poussée sur la branche. `release.yml` se déclenche sur un tag préfixé, pour ne pas se mélanger avec ceux du build v12 :

```bash
git tag v13-0.1.0
git push origin v13-0.1.0
```

## Ce qu'il y a dedans

| Élément | Détail |
| --- | --- |
| Acteurs | `heros` (identité, Énergie, Audace, XP) et `figurant` (Énergie, pool par défaut, effectif) |
| Objets | `motivation`, `talent` (+ spécialités), `pouvoir` (+ coût en énergie, limites), `equipement` (+ dés apportés) |
| Rangs | Motivations 3, Talents 3, Pouvoirs 10, dés d'équipement 0 à 3 |
| Jets | sélection de Traits sur la feuille → pool → `Nd6`, réussites sur 3+, difficulté sur dix crans |
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

## Licence

Code sous licence MIT (voir `LICENSE.txt`). Les marques et contenus Hexagon appartiennent à leurs ayants droit et ne sont pas inclus.
