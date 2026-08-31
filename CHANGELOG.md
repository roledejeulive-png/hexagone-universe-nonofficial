# Journal des versions

## 0.1.2 — build v13

- Correction : déposer un Item sur une feuille de personnage en créait deux. `ActorSheetV2` gère nativement le glisser-déposer depuis la v13 ; le gestionnaire ajouté par le système faisait double emploi et a été retiré.
- Les lignes de Traits et d'équipement sont désormais glissables : tri interne et copie vers une autre fiche fonctionnent sans code supplémentaire.

## 0.1.1 — build v13

- Correction : déposer un Item sur une feuille de personnage en créait plusieurs. Les écouteurs de dépôt s'empilaient à chaque rendu de la feuille au lieu d'être remplacés.

## 0.1.0 — build v13

Première version publiée.

- Acteurs `heros` (Énergie, Audace, XP, identité) et `figurant` (Énergie, pool par défaut, effectif)
- Objets `motivation`, `talent`, `pouvoir`, `equipement`
- Rangs plafonnés par type : Motivations 3, Talents 3, Pouvoirs 10, dés d'équipement 0 à 3
- Spécialités de Talent : −1 dé, +1 réussite acquise, inactives au rang 0
- Sélection de pool par jetons hexagonaux, réglage des rangs et des jauges par chevrons
- Résolution en Nd6, réussites sur 3+, échelle de difficulté à dix crans
- Carte de chat détaillée : dés, réussites acquises, marge
