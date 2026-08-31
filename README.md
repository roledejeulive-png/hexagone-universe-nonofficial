# Hexagon Universe — système Foundry VTT (non officiel)

Moteur de jeu pour parties de super-héros à pools de d6 : Traits notés (Motivations, Talents, Pouvoirs), on cumule les rangs, on lance autant de d6, on compte les réussites.

**Non officiel.** Ce dépôt ne contient aucun texte de règles, aucun personnage, aucun visuel de la licence Hexagon (Lug / Hexagon Comics / Rivière Blanche / Les XII Singes). Il fournit des structures de données et une interface. Pour jouer, il faut le livre.

---

## Installation

1. Copier le dossier `hexagon-universe/` dans `Data/systems/` de votre installation Foundry.
2. Relancer Foundry, créer un monde et choisir le système « Hexagon Universe (non officiel) ».

**Build pour Foundry VTT v12.** Sous-types déclarés dans `template.json`, schémas en `TypeDataModel`, feuilles classiques (`ActorSheet` / `ItemSheet`) avec les onglets natifs. Le manifeste est borné à la v12 : pour passer en v13+, il faudra remonter `compatibility` et migrer les feuilles vers `ApplicationV2`.

## Ce qu'il y a dedans

| Élément | Détail |
| --- | --- |
| Acteurs | `heros` (identité, santé, énergie, audace, XP) et `figurant` (pool par défaut, effectif) |
| Objets | `motivation` (+ dilemme), `talent`, `pouvoir` (+ coût en énergie, limites), `equipement` (+ dés apportés) |
| Jets | sélection de Traits sur la feuille → pool → `Nd6`, réussites sur 3+, comparaison à une difficulté, carte de chat détaillée |
| Automatisme | le coût en énergie des Pouvoirs engagés est déduit au moment du jet |
| Spécialités | portées par les Talents : −1 dé, +1 réussite acquise, cumulables |
| API macro | `game.hexagon.lancerPool({ des: 6, difficulte: 2, label: "Esquive" })` |

Sur la feuille de héros, chaque Trait porte un jeton hexagonal affichant son rang : cliquer dessus l'engage dans le pool, la jauge en haut affiche le total de dés. Le bouton « Lancer » résout, « Vider » remet à zéro.

### Spécialités

Un Talent peut porter des spécialités, saisies en clair sur sa fiche et séparées par des virgules. Un Talent au rang 0 n'en a aucune : la saisie reste en mémoire mais rien n'est publié tant que le rang n'est pas remonté. Elles apparaissent alors sous le Talent dans la liste de la feuille. En engager une retire un dé du pool et offre une réussite acquise d'avance ; le Talent est engagé automatiquement avec elle. Le troc est réglable dans `config.mjs` (`HEXAGON.specialite`).

Attention à l'interaction avec `dice.poolMinimum` : tant qu'il vaut 1, une spécialité engagée sur un tout petit pool ne coûte rien de réel — le pool ne peut pas descendre sous un dé. Passer ce minimum à 0 rend le troc cohérent à tous les niveaux.

## Ce qu'il faut caler sur les vraies règles

Tout est regroupé dans `module/config.mjs`. Les valeurs actuelles sont des choix par défaut, à confirmer avec le livre :

- `dice.seuilReussite` — actuellement 3.
- `dice.poolMinimum` — ce qui se passe quand aucun Trait ne s'applique (actuellement : 1 dé).
- `difficultes` — l'échelle en nombre de réussites (10 crans par défaut).
- `rangMax` — plafond par type de Trait : Motivations 3, Talents 3, Pouvoirs 10, dés d'équipement 0 à 3.
- `HerosData` dans `module/data/actor-data.mjs` — santé, énergie et audace sont des jauges génériques (valeurs de départ 10, 10 et 3) ; à caler sur les vraies ressources du jeu.
- Le comptage des 6 (« éclats ») est affiché mais n'a aucun effet : accroche libre pour une règle maison.

## Limites connues

- Les champs longs sont des `textarea` : pas d'éditeur enrichi ProseMirror pour l'instant.
- Pas de compendium fourni (voir la note de licence plus haut).
- Pas d'Active Effects ni d'automatisation de combat au-delà de l'initiative à 1d6.
- Le dépôt d'un Item sur une fiche passe par le comportement natif des feuilles v1 ; le tri par glisser-déposer n'est pas implémenté.

## Structure

```
system.json              manifeste (compatibilité v12)
template.json            déclaration des sous-types
module/config.mjs        toutes les valeurs chiffrées
module/hexagon.mjs       point d'entrée, hook init
module/data/             modèles de données (TypeDataModel)
module/documents/        classes Actor et Item
module/dice/pool.mjs     construction du pool, jet, carte de chat
module/apps/             feuilles ApplicationV2
templates/               Handlebars
css/hexagon.css          habillage
lang/                    fr, en
```

## Licence

Code sous licence MIT (voir `LICENSE.txt`). Les marques et contenus Hexagon appartiennent à leurs ayants droit et ne sont pas inclus.
