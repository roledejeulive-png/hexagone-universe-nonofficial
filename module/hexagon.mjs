import { HEXAGON } from "./config.mjs";
import { preloadTemplates, registerHandlebarsHelpers } from "./helpers.mjs";
import { HerosData, FigurantData, HommesDeMainData, SecondCouteauData } from "./data/actor-data.mjs";
import { TalentData, MotivationData, PouvoirData, EquipementData } from "./data/item-data.mjs";
import { HexagonActor } from "./documents/actor.mjs";
import { HexagonItem } from "./documents/item.mjs";
import { HexagonCombat, HexagonCombattant } from "./documents/combat.mjs";
import { ouvrirPhaseInitiative } from "./apps/phase-initiative.mjs";
import { registerActorSheets } from "./apps/actor-sheet.mjs";
import { HexagonHommesDeMainSheet } from "./apps/hommes-de-main-sheet.mjs";
import { HexagonSecondCouteauSheet } from "./apps/second-couteau-sheet.mjs";
import { registerItemSheets } from "./apps/item-sheet.mjs";
import { lancerPool, construirePool } from "./dice/pool.mjs";

Hooks.once("init", () => {
  console.log("Hexagon Universe | initialisation");

  CONFIG.HEXAGON = HEXAGON;

  // Documents
  CONFIG.Actor.documentClass = HexagonActor;
  CONFIG.Item.documentClass = HexagonItem;
  CONFIG.Combat.documentClass = HexagonCombat;
  CONFIG.Combatant.documentClass = HexagonCombattant;

  // Modèles de données, associés aux sous-types déclarés dans system.json
  Object.assign(CONFIG.Actor.dataModels, {
    heros: HerosData,
    figurant: FigurantData,
    hommesDeMain: HommesDeMainData,
    secondCouteau: SecondCouteauData
  });
  Object.assign(CONFIG.Item.dataModels, {
    motivation: MotivationData,
    talent: TalentData,
    pouvoir: PouvoirData,
    equipement: EquipementData
  });

  CONFIG.Combat.initiative = { formula: HEXAGON.combat.formuleInitiative, decimals: 0 };

  game.settings.register(HEXAGON.id, "initiativePartagee", {
    name: "HEXAGON.Reglage.InitiativePartagee",
    hint: "HEXAGON.Reglage.InitiativePartageeAide",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  registerActorSheets();
  (foundry.documents?.collections?.Actors ?? globalThis.Actors).registerSheet(HEXAGON.id, HexagonHommesDeMainSheet, {
    types: ["hommesDeMain"],
    makeDefault: true,
    label: "HEXAGON.Feuille.HommesDeMain"
  });
  (foundry.documents?.collections?.Actors ?? globalThis.Actors).registerSheet(HEXAGON.id, HexagonSecondCouteauSheet, {
    types: ["secondCouteau"],
    makeDefault: true,
    label: "HEXAGON.Feuille.SecondCouteau"
  });
  registerItemSheets();
  registerHandlebarsHelpers();

  // API exposée pour les macros : game.hexagon.lancerPool({des: 5, difficulte: 2})
  game.hexagon = {
    lancerPool,
    construirePool,
    phaseInitiative: ouvrirPhaseInitiative,
    config: HEXAGON
  };

  return preloadTemplates();
});

Hooks.once("ready", () => {
  console.log("Hexagon Universe | prêt");
});

/**
 * Bouton d'accès à la phase d'initiative, posé dans l'en-tête de la barre de
 * combat. Réservé au MJ : la phase écrit dans la rencontre pour tout le monde.
 */
Hooks.on("renderCombatTracker", (app, element) => {
  if (!game.user.isGM) return;

  const racine = element instanceof HTMLElement ? element : element?.[0];
  if (!racine || racine.querySelector(".hexagon-phase")) return;

  // La structure de la barre de combat change d'une génération à l'autre :
  // on essaie les points d'accroche connus, puis on se rabat sur la racine.
  const hote =
    racine.querySelector(".combat-tracker-header") ??
    racine.querySelector("header.combat-tracker-header") ??
    racine.querySelector(".encounters") ??
    racine.querySelector(".combat-controls") ??
    racine;

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("hexagon-phase");
  bouton.textContent = game.i18n.localize("HEXAGON.Initiative.Titre");
  bouton.addEventListener("click", () => ouvrirPhaseInitiative(game.combat));
  hote.append(bouton);
});

/**
 * Un groupe d'hommes de main agit au rang de son Opposition. Celle-ci bougeant
 * avec la Menace, on répercute chaque changement sur les rencontres en cours.
 */
Hooks.on("updateActor", async (acteur, changement) => {
  if (!game.user.isGM) return;
  if (!["hommesDeMain", "secondCouteau"].includes(acteur.type)) return;
  if (changement.system?.menace === undefined && changement.system?.opposition === undefined) return;

  for (const combat of game.combats) {
    const concernes = combat.combatants.filter((c) => c.actor?.id === acteur.id);
    if (!concernes.length) continue;
    await combat.rollInitiative(concernes.map((c) => c.id));
  }
});

/**
 * Nouveau tour : les Succès distribués au tour écoulé sont consommés et les
 * PJ retombent à leur Succès automatique, prêts pour une nouvelle répartition.
 */
Hooks.on("combatRound", async (combat, donnees, options) => {
  if (!game.user.isGM) return;
  if (!(combat instanceof HexagonCombat)) return;

  for (const groupe of ["heros", "figurants"]) {
    if (combat.pot(groupe).total <= 0) continue;
    await combat.cloturerTour(groupe);
  }
});
