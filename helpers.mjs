import { HEXAGON } from "./config.mjs";

/**
 * Foundry a déplacé plusieurs fonctions globales sous des namespaces (v12 → v14).
 * Ces accesseurs résolvent au moment de l'appel, jamais au chargement du module,
 * pour rester valides quelle que soit la version installée.
 */
export function ns() {
  const f = globalThis.foundry;
  return {
    hbs: f.applications.handlebars ?? globalThis,
    fields: f.data.fields,
    Actors: f.documents?.collections?.Actors ?? globalThis.Actors,
    Items: f.documents?.collections?.Items ?? globalThis.Items
  };
}

export function renderTemplate(path, data) {
  return ns().hbs.renderTemplate(path, data);
}

/** Met les templates en cache au démarrage pour éviter un aller-retour au premier rendu. */
export function preloadTemplates() {
  return ns().hbs.loadTemplates([
    `${HEXAGON.path}/templates/actor/parts/header.hbs`,
    `${HEXAGON.path}/templates/actor/parts/nav.hbs`,
    `${HEXAGON.path}/templates/actor/parts/traits.hbs`,
    `${HEXAGON.path}/templates/actor/parts/etat.hbs`,
    `${HEXAGON.path}/templates/actor/parts/notes.hbs`,
    `${HEXAGON.path}/templates/actor/figurant.hbs`,
    `${HEXAGON.path}/templates/item/item-sheet.hbs`,
    `${HEXAGON.path}/templates/chat/pool.hbs`
  ]);
}

export function registerHandlebarsHelpers() {
  /** Classe de l'onglet actif. */
  Handlebars.registerHelper("hexActiveTab", (courant, cible) => (courant === cible ? "active" : ""));
}
