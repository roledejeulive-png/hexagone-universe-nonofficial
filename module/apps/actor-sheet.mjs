import { HEXAGON } from "../config.mjs";
import { construirePool, lancerPool } from "../dice/pool.mjs";

/**
 * Feuille du héros (API v1 : getData + activateListeners).
 * La sélection de Traits et de spécialités est un état d'interface : elle vit
 * dans la feuille, pas dans le document, et repart à zéro à chaque ouverture.
 */
export class HexagonHerosSheet extends ActorSheet {
  /** @type {Set<string>} ids des Traits engagés. */
  #selection = new Set();
  /** @type {Set<string>} clés « itemId|nom de spécialité » engagées. */
  #specialites = new Set();

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hexagon", "sheet", "acteur", "heros"],
      template: `${HEXAGON.path}/templates/actor/heros.hbs`,
      width: 780,
      height: 700,
      submitOnChange: true,
      closeOnSubmit: false,
      tabs: [{ navSelector: ".hex-onglets", contentSelector: ".hex-corps", initial: "traits" }]
    });
  }

  /* -------------------------------------------- */

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

  getData(options) {
    const context = super.getData(options);
    const actor = this.actor;
    const selection = [...this.#selection].map((id) => actor.items.get(id)).filter(Boolean);
    const specialites = this.#specialitesActives();
    const pool = construirePool(selection, 0, specialites.length);

    context.system = actor.system;
    context.config = HEXAGON;
    context.groupes = Object.entries(actor.traitsParType).map(([type, items]) => ({
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
    }));
    context.equipements = actor.items.filter((i) => i.type === "equipement");
    context.pool = {
      des: pool.des,
      vide: this.#selection.size === 0,
      detail: pool.detail,
      specialites,
      auto: specialites.length * HEXAGON.specialite.reussitesOffertes
    };
    context.difficultes = Object.entries(HEXAGON.difficultes).map(([valeur, cle]) => ({
      valeur: Number(valeur),
      label: game.i18n.localize(cle)
    }));
    return context;
  }

  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("[data-hex='toggleTrait']").on("click", this.#onToggleTrait.bind(this));
    html.find("[data-hex='toggleSpecialite']").on("click", this.#onToggleSpecialite.bind(this));
    html.find("[data-hex='viderPool']").on("click", () => {
      this.#selection.clear();
      this.#specialites.clear();
      this.render();
    });
    html.find("[data-hex='lancerPool']").on("click", this.#onLancerPool.bind(this));
    html.find("[data-hex='creerItem']").on("click", this.#onCreerItem.bind(this));
    html.find("[data-hex='editerItem']").on("click", this.#onEditerItem.bind(this));
    html.find("[data-hex='supprimerItem']").on("click", this.#onSupprimerItem.bind(this));
    html.find("[data-hex='lancerTrait']").on("click", this.#onLancerTrait.bind(this));
    html.find("[data-hex='ajuster']").on("click", this.#onAjuster.bind(this));
    html.find("[data-hex='ajusterActeur']").on("click", this.#onAjusterActeur.bind(this));
  }

  /** Id de l'Item porté par la ligne cliquée. */
  #itemId(event) {
    return event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
  }

  /** Retire de la sélection les spécialités rattachées à un Trait donné. */
  #purgerSpecialites(itemId) {
    for (const cle of [...this.#specialites]) {
      if (cle.startsWith(`${itemId}|`)) this.#specialites.delete(cle);
    }
  }

  #onToggleTrait(event) {
    event.preventDefault();
    const id = this.#itemId(event);
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
  #onToggleSpecialite(event) {
    event.preventDefault();
    const cle = event.currentTarget.dataset.cle;
    if (!cle) return;
    if (this.#specialites.has(cle)) {
      this.#specialites.delete(cle);
    } else {
      this.#specialites.add(cle);
      this.#selection.add(cle.split("|")[0]);
    }
    this.render();
  }

  async #onLancerPool(event) {
    event.preventDefault();
    const console_ = event.currentTarget.closest(".pool-console");
    const modificateur = Number(console_?.querySelector("[data-pool='modificateur']")?.value ?? 0);
    const difficulte = Number(console_?.querySelector("[data-pool='difficulte']")?.value ?? 1);
    await this.actor.lancerTraits({
      traitIds: [...this.#selection],
      specialites: this.#specialitesActives(),
      modificateur,
      difficulte
    });
  }

  async #onCreerItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const nom = game.i18n.format("HEXAGON.Item.Nouveau", {
      type: game.i18n.localize(HEXAGON.typesItems[type])
    });
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name: nom, type }]);
    item?.sheet.render(true);
  }

  #onEditerItem(event) {
    event.preventDefault();
    this.actor.items.get(this.#itemId(event))?.sheet.render(true);
  }

  async #onSupprimerItem(event) {
    event.preventDefault();
    const id = this.#itemId(event);
    const item = this.actor.items.get(id);
    if (!item) return;
    const confirme = await Dialog.confirm({
      title: game.i18n.localize("HEXAGON.Item.SupprimerTitre"),
      content: `<p>${game.i18n.format("HEXAGON.Item.SupprimerQuestion", { nom: item.name })}</p>`
    });
    if (!confirme) return;
    this.#selection.delete(id);
    this.#purgerSpecialites(id);
    await item.delete();
  }

  async #onLancerTrait(event) {
    event.preventDefault();
    await this.actor.items.get(this.#itemId(event))?.lancer();
  }

  /**
   * Ajuste une valeur numérique d'un Item sans ouvrir sa fiche.
   * La borne haute dépend du champ : rang maximum du type pour un Trait,
   * plafond des dés d'équipement sinon.
   */
  async #onAjuster(event) {
    event.preventDefault();
    const bouton = event.currentTarget;
    const item = this.actor.items.get(this.#itemId(event));
    if (!item) return;

    const champ = bouton.dataset.champ ?? "system.rang";
    const delta = Number(bouton.dataset.delta ?? 1);
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
  async #onAjusterActeur(event) {
    event.preventDefault();
    const bouton = event.currentTarget;
    const champ = bouton.dataset.champ;
    if (!champ) return;
    const delta = Number(bouton.dataset.delta ?? 1);
    const actuel = Number(foundry.utils.getProperty(this.actor, champ) ?? 0);
    const plafond = Number(foundry.utils.getProperty(this.actor, champ.replace(/\.value$/, ".max")) ?? Infinity);
    const valeur = Math.clamp(actuel + delta, 0, plafond);
    if (valeur === actuel) return;

    await this.actor.update({ [champ]: valeur });
  }
}

/** Feuille allégée pour les figurants : un pool par défaut, pas de sélecteur. */
export class HexagonFigurantSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hexagon", "sheet", "acteur", "figurant"],
      template: `${HEXAGON.path}/templates/actor/figurant.hbs`,
      width: 520,
      height: 480,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  getData(options) {
    const context = super.getData(options);
    context.system = this.actor.system;
    context.difficultes = Object.entries(HEXAGON.difficultes).map(([valeur, cle]) => ({
      valeur: Number(valeur),
      label: game.i18n.localize(cle)
    }));
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find("[data-hex='ajusterActeur']").on("click", async (event) => {
      event.preventDefault();
      const champ = event.currentTarget.dataset.champ;
      const delta = Number(event.currentTarget.dataset.delta ?? 1);
      const actuel = Number(foundry.utils.getProperty(this.actor, champ) ?? 0);
      const plafond = Number(foundry.utils.getProperty(this.actor, champ.replace(/\.value$/, ".max")) ?? Infinity);
      const valeur = Math.clamp(actuel + delta, 0, plafond);
      if (valeur !== actuel) await this.actor.update({ [champ]: valeur });
    });
    html.find("[data-hex='lancerDefaut']").on("click", async (event) => {
      event.preventDefault();
      const difficulte = Number(html.find("[data-pool='difficulte']").val() ?? 1);
      await lancerPool({
        des: this.actor.system.poolDefaut,
        difficulte,
        label: this.actor.system.role || this.actor.name,
        actor: this.actor
      });
    });
  }
}

/** Enregistrement des feuilles. */
export function registerActorSheets() {
  Actors.unregisterSheet("core", ActorSheet);
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
