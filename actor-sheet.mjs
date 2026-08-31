import { HEXAGON } from "../config.mjs";
import { ns } from "../helpers.mjs";
import { construirePool } from "../dice/pool.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille du héros. La sélection de Traits vit dans la feuille (état d'interface),
 * pas dans le document : elle est remise à zéro à chaque ouverture.
 */
export class HexagonHerosSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @type {Set<string>} ids des Traits actuellement engagés dans le pool. */
  #selection = new Set();
  /** @type {Set<string>} clés « itemId|nom de spécialité » engagées. */
  #specialites = new Set();

  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "acteur", "heros"],
    position: { width: 780, height: 700 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      selectTab: HexagonHerosSheet.#onSelectTab,
      toggleTrait: HexagonHerosSheet.#onToggleTrait,
      toggleSpecialite: HexagonHerosSheet.#onToggleSpecialite,
      viderPool: HexagonHerosSheet.#onViderPool,
      lancerPool: HexagonHerosSheet.#onLancerPool,
      creerItem: HexagonHerosSheet.#onCreerItem,
      editerItem: HexagonHerosSheet.#onEditerItem,
      supprimerItem: HexagonHerosSheet.#onSupprimerItem,
      lancerTrait: HexagonHerosSheet.#onLancerTrait,
      ajusterValeur: HexagonHerosSheet.#onAjusterValeur,
      ajusterActeur: HexagonHerosSheet.#onAjusterActeur
    }
  };

  static PARTS = {
    header: { template: `${HEXAGON.path}/templates/actor/parts/header.hbs` },
    nav: { template: `${HEXAGON.path}/templates/actor/parts/nav.hbs` },
    traits: { template: `${HEXAGON.path}/templates/actor/parts/traits.hbs` },
    etat: { template: `${HEXAGON.path}/templates/actor/parts/etat.hbs` },
    notes: { template: `${HEXAGON.path}/templates/actor/parts/notes.hbs` }
  };

  tabGroups = { primary: "traits" };

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const selection = [...this.#selection].map((id) => actor.items.get(id)).filter(Boolean);
    const specialites = this.#specialitesActives();
    const pool = construirePool(selection, 0, specialites.length);

    return Object.assign(context, {
      actor,
      system: actor.system,
      editable: this.isEditable,
      tab: this.tabGroups.primary,
      config: HEXAGON,
      groupes: Object.entries(actor.traitsParType).map(([type, items]) => ({
        type,
        label: game.i18n.localize(HEXAGON.typesItems[type]),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          img: i.img,
          rang: i.system.rang,
          cout: i.system.cout ?? 0,
          selectionne: this.#selection.has(i.id),
          specialites: (i.system.listeSpecialites ?? []).map((nom) => ({
            nom,
            cle: `${i.id}|${nom}`,
            active: this.#specialites.has(`${i.id}|${nom}`)
          }))
        }))
      })),
      equipements: actor.items.filter((i) => i.type === "equipement"),
      pool: {
        des: pool.des,
        vide: this.#selection.size === 0,
        detail: pool.detail,
        specialites,
        auto: specialites.length * HEXAGON.specialite.reussitesOffertes
      },
      difficultes: Object.entries(HEXAGON.difficultes).map(([valeur, cle]) => ({
        valeur: Number(valeur),
        label: game.i18n.localize(cle)
      }))
    });
  }

  /** Marque l'onglet actif sur les parties du corps de la feuille. */
  async _preparePartContext(partId, context) {
    context.partId = partId;
    context.actif = this.tabGroups.primary === partId;
    return context;
  }

  /*
   * Pas de gestion de dépôt ici : ActorSheetV2 s'en charge nativement depuis la
   * v13 — liaison du DragDrop au rendu, contrôle des permissions, délégation à
   * _onDropItem qui crée l'Item dans l'acteur. En ajouter une seconde créait
   * l'Item en double. Pour personnaliser, surcharger _onDropItem plutôt que
   * poser un écouteur.
   */

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onSelectTab(event, target) {
    this.tabGroups.primary = target.dataset.tab;
    this.render();
  }

  /** Spécialités réellement applicables : Trait engagé et spécialité toujours définie. */
  #specialitesActives() {
    const noms = [];
    for (const cle of this.#specialites) {
      const [id, nom] = cle.split("|");
      const item = this.actor.items.get(id);
      if (!item || !this.#selection.has(id)) continue;
      if (!(item.system.listeSpecialites ?? []).includes(nom)) continue;
      noms.push(nom);
    }
    return noms;
  }

  /** Retire de la sélection les spécialités rattachées à un Trait donné. */
  #purgerSpecialites(itemId) {
    for (const cle of [...this.#specialites]) {
      if (cle.startsWith(`${itemId}|`)) this.#specialites.delete(cle);
    }
  }

  static #onToggleTrait(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if (!id) return;
    if (this.#selection.has(id)) {
      this.#selection.delete(id);
      this.#purgerSpecialites(id);
    } else {
      this.#selection.add(id);
    }
    this.render();
  }

  /** Engager une spécialité engage aussi son Talent : les deux vont ensemble. */
  static #onToggleSpecialite(event, target) {
    const cle = target.dataset.cle;
    if (!cle) return;
    if (this.#specialites.has(cle)) {
      this.#specialites.delete(cle);
    } else {
      this.#specialites.add(cle);
      this.#selection.add(cle.split("|")[0]);
    }
    this.render();
  }

  static #onViderPool() {
    this.#selection.clear();
    this.#specialites.clear();
    this.render();
  }

  static async #onLancerPool(event, target) {
    const form = target.closest(".pool-console");
    const modificateur = Number(form?.querySelector("[data-pool='modificateur']")?.value ?? 0);
    const difficulte = Number(form?.querySelector("[data-pool='difficulte']")?.value ?? 1);
    await this.actor.lancerTraits({
      traitIds: [...this.#selection],
      specialites: this.#specialitesActives(),
      modificateur,
      difficulte
    });
  }

  static async #onCreerItem(event, target) {
    const type = target.dataset.type;
    const nom = game.i18n.format("HEXAGON.Item.Nouveau", {
      type: game.i18n.localize(HEXAGON.typesItems[type])
    });
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name: nom, type }]);
    item?.sheet.render(true);
  }

  static #onEditerItem(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    this.actor.items.get(id)?.sheet.render(true);
  }

  static async #onSupprimerItem(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;
    const confirme = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("HEXAGON.Item.SupprimerTitre") },
      content: `<p>${game.i18n.format("HEXAGON.Item.SupprimerQuestion", { nom: item.name })}</p>`
    });
    if (!confirme) return;
    this.#selection.delete(id);
    this.#purgerSpecialites(id);
    await item.delete();
  }

  static async #onLancerTrait(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    await this.actor.items.get(id)?.lancer();
  }

  /**
   * Ajuste une valeur numérique d'un Item sans ouvrir sa fiche.
   * La borne haute dépend du champ : rang maximum du type pour un Trait,
   * plafond des dés d'équipement sinon.
   */
  static async #onAjusterValeur(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;

    const champ = target.dataset.champ ?? "system.rang";
    const delta = Number(target.dataset.delta ?? 1);
    const actuel = Number(foundry.utils.getProperty(item, champ) ?? 0);
    const plafond = champ === "system.rang" ? HEXAGON.rangMaxDe(item.type) : HEXAGON.rangMax.equipement;
    const valeur = Math.clamp(actuel + delta, 0, plafond);
    if (valeur === actuel) return;

    // Un Talent ramené à 0 perd ses spécialités : on nettoie la sélection en cours.
    if (champ === "system.rang" && valeur === 0) this.#purgerSpecialites(item.id);

    await item.update({ [champ]: valeur });
  }

  /**
   * Ajuste une jauge de l'acteur (Énergie, Audace) sans passer par le champ.
   * La valeur reste comprise entre 0 et le maximum déclaré de la jauge.
   */
  static async #onAjusterActeur(event, target) {
    const champ = target.dataset.champ;
    if (!champ) return;
    const delta = Number(target.dataset.delta ?? 1);
    const actuel = Number(foundry.utils.getProperty(this.actor, champ) ?? 0);
    const plafond = Number(foundry.utils.getProperty(this.actor, champ.replace(/\.value$/, ".max")) ?? Infinity);
    const valeur = Math.clamp(actuel + delta, 0, plafond);
    if (valeur === actuel) return;
    await this.actor.update({ [champ]: valeur });
  }
}

/** Feuille allégée pour les figurants : un pool par défaut, pas de sélecteur. */
export class HexagonFigurantSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "acteur", "figurant"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      lancerDefaut: HexagonFigurantSheet.#onLancerDefaut,
      ajusterActeur: HexagonFigurantSheet.#onAjusterActeur
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/actor/figurant.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      actor: this.actor,
      system: this.actor.system,
      editable: this.isEditable,
      difficultes: Object.entries(HEXAGON.difficultes).map(([valeur, cle]) => ({
        valeur: Number(valeur),
        label: game.i18n.localize(cle)
      }))
    });
  }

  /** Même ajustement de jauge que sur la feuille de héros. */
  static async #onAjusterActeur(event, target) {
    const champ = target.dataset.champ;
    if (!champ) return;
    const delta = Number(target.dataset.delta ?? 1);
    const actuel = Number(foundry.utils.getProperty(this.actor, champ) ?? 0);
    const plafond = Number(foundry.utils.getProperty(this.actor, champ.replace(/\.value$/, ".max")) ?? Infinity);
    const valeur = Math.clamp(actuel + delta, 0, plafond);
    if (valeur === actuel) return;
    await this.actor.update({ [champ]: valeur });
  }

  static async #onLancerDefaut(event, target) {
    const difficulte = Number(this.element.querySelector("[data-pool='difficulte']")?.value ?? 1);
    const { lancerPool } = await import("../dice/pool.mjs");
    await lancerPool({
      des: this.actor.system.poolDefaut,
      difficulte,
      label: this.actor.system.role || this.actor.name,
      actor: this.actor
    });
  }
}

/** Enregistrement des feuilles auprès du collectionneur d'acteurs. */
export function registerActorSheets() {
  const { Actors } = ns();
  Actors.registerSheet(HEXAGON.id, HexagonHerosSheet, {
    types: ["heros"],
    makeDefault: true,
    label: "HEXAGON.Feuille.Heros"
  });
  Actors.registerSheet(HEXAGON.id, HexagonFigurantSheet, {
    types: ["figurant"],
    makeDefault: true,
    label: "HEXAGON.Feuille.Figurant"
  });
}
