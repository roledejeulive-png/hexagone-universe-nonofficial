import { HEXAGON } from "./config.mjs";
import { preloadTemplates, registerHandlebarsHelpers } from "./helpers.mjs";
import { HerosData, FigurantData } from "./data/actor-data.mjs";
import { TalentData, MotivationData, PouvoirData, EquipementData } from "./data/item-data.mjs";
import { HexagonActor } from "./documents/actor.mjs";
import { HexagonItem } from "./documents/item.mjs";
import { registerActorSheets } from "./apps/actor-sheet.mjs";
import { registerItemSheets } from "./apps/item-sheet.mjs";
import { lancerPool, construirePool } from "./dice/pool.mjs";

Hooks.once("init", () => {
  console.log("Hexagon Universe | initialisation");

  CONFIG.HEXAGON = HEXAGON;

  // Documents
  CONFIG.Actor.documentClass = HexagonActor;
  CONFIG.Item.documentClass = HexagonItem;

  // Modèles de données, associés aux sous-types déclarés dans system.json
  Object.assign(CONFIG.Actor.dataModels, {
    heros: HerosData,
    figurant: FigurantData
  });
  Object.assign(CONFIG.Item.dataModels, {
    motivation: MotivationData,
    talent: TalentData,
    pouvoir: PouvoirData,
    equipement: EquipementData
  });

  // Initiative : pool de base des figurants, sinon 1d6.
  CONFIG.Combat.initiative = { formula: "1d6", decimals: 0 };

  registerActorSheets();
  registerItemSheets();
  registerHandlebarsHelpers();

  // API exposée pour les macros : game.hexagon.lancerPool({des: 5, difficulte: 2})
  game.hexagon = { lancerPool, construirePool, config: HEXAGON };

  return preloadTemplates();
});

Hooks.once("ready", () => {
  console.log("Hexagon Universe | prêt");
});
