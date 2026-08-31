import { HEXAGON } from "./config.mjs";

/** Accès aux champs de schéma (foundry.data.fields existe depuis la v11). */
export function ns() {
  return { fields: foundry.data.fields };
}

/**
 * En v12, renderTemplate et loadTemplates sont encore des fonctions globales.
 * loadTemplates enregistre au passage chaque fichier comme partial Handlebars,
 * nommé d'après son chemin : c'est ce qui permet les {{> "systems/..."}}.
 */
export function preloadTemplates() {
  return loadTemplates([
    `${HEXAGON.path}/templates/actor/parts/header.hbs`,
    `${HEXAGON.path}/templates/actor/parts/traits.hbs`,
    `${HEXAGON.path}/templates/actor/parts/etat.hbs`,
    `${HEXAGON.path}/templates/actor/parts/notes.hbs`,
    `${HEXAGON.path}/templates/actor/heros.hbs`,
    `${HEXAGON.path}/templates/actor/figurant.hbs`,
    `${HEXAGON.path}/templates/item/item-sheet.hbs`,
    `${HEXAGON.path}/templates/chat/pool.hbs`
  ]);
}

export function registerHandlebarsHelpers() {
  /** Libellé localisé d'un type d'Item. */
  Handlebars.registerHelper("hexTypeLabel", (type) => game.i18n.localize(HEXAGON.typesItems[type] ?? type));
}
