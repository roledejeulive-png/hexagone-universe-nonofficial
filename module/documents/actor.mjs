import { HEXAGON } from "../config.mjs";
import { construirePool, lancerPool } from "../dice/pool.mjs";

export class HexagonActor extends Actor {
  /** Tous les Items qui peuvent alimenter un pool. */
  get traits() {
    return this.items.filter((i) => HEXAGON.typesTraits.includes(i.type));
  }

  /** Traits regroupés par type, dans l'ordre d'affichage de la feuille. */
  get traitsParType() {
    const groupes = Object.fromEntries(HEXAGON.typesTraits.map((t) => [t, []]));
    for (const item of this.traits) groupes[item.type].push(item);
    for (const liste of Object.values(groupes)) liste.sort((a, b) => a.name.localeCompare(b.name));
    return groupes;
  }

  /** Audace disponible, 0 pour un acteur qui n'en a pas (les figurants). */
  get audaceDisponible() {
    return this.system.audace?.value ?? 0;
  }

  /**
   * Lance un pool composé des Traits fournis.
   *
   * Les dépenses sont prélevées avant le jet et en une seule écriture :
   * l'Audace des dés achetés ou sécurisés, l'Énergie des Pouvoirs engagés.
   * Si l'Audace ne suffit pas, rien n'est prélevé et rien n'est lancé.
   *
   * @param {object} options
   * @param {string[]} [options.traitIds]    Ids des Traits à cumuler.
   * @param {string[]} [options.specialites] Noms des spécialités engagées.
   * @param {number} [options.desAchetes]    Dés supplémentaires payés en Audace.
   * @param {number} [options.desSecurises]  Dés convertis en réussites acquises.
   * @param {number} [options.modificateur]
   * @param {number} [options.difficulte]
   * @param {string} [options.label]
   */
  async lancerTraits({
    traitIds = [],
    specialites = [],
    desAchetes = 0,
    desSecurises = 0,
    modificateur = 0,
    difficulte = 1,
    label
  } = {}) {
    const traits = traitIds.map((id) => this.items.get(id)).filter(Boolean);
    const pool = construirePool(traits, {
      modificateur,
      specialites: specialites.length,
      desAchetes,
      desSecurises
    });

    if (pool.coutAudace > this.audaceDisponible) {
      ui.notifications.warn(
        game.i18n.format("HEXAGON.Avertissement.AudaceInsuffisante", {
          cout: pool.coutAudace,
          disponible: this.audaceDisponible
        })
      );
      return null;
    }

    const depenses = {};
    if (pool.coutAudace > 0) {
      depenses["system.audace.value"] = this.system.audace.value - pool.coutAudace;
    }

    const coutEnergie = traits
      .filter((t) => t.type === "pouvoir")
      .reduce((total, t) => total + (t.system.cout ?? 0), 0);
    if (coutEnergie > 0 && this.system.energie) {
      depenses["system.energie.value"] = Math.max(this.system.energie.value - coutEnergie, 0);
    }

    if (Object.keys(depenses).length) await this.update(depenses);

    const intitule =
      label || traits.map((t) => t.name).join(" + ") || game.i18n.localize("HEXAGON.Jet.Libre");

    return lancerPool({
      des: pool.des,
      difficulte,
      label: intitule,
      actor: this,
      detail: pool.detail,
      specialites,
      desAchetes,
      desSecurises
    });
  }

  /* -------------------------------------------- */
  /*  Hommes de main                              */
  /* -------------------------------------------- */

  get estGroupe() {
    return this.type === "hommesDeMain";
  }

  /**
   * Le groupe encaisse une attaque. Les Succès qui dépassent son Opposition
   * lui font perdre autant de points de Menace ; son Opposition suit d'elle-même.
   *
   * @param {number} succes Succès obtenus par le personnage à l'attaque.
   */
  async subirAttaque(succes) {
    const opposition = this.system.opposition;
    const perte = Math.max(Number(succes) - opposition, 0);
    const avant = this.system.menace.value;
    const apres = Math.max(avant - perte, 0);

    if (perte > 0) await this.update({ "system.menace.value": apres });

    return { succes: Number(succes), opposition, perte, avant, apres, vaincu: apres <= 0 };
  }

  /**
   * Le groupe attaque : ce qui manque au personnage pour atteindre l'Opposition
   * lui coûte autant de points d'Énergie. Le calcul ne modifie rien ici, la
   * perte est appliquée au personnage visé par l'appelant.
   *
   * @param {number} succes Succès obtenus par le personnage en défense.
   */
  resoudreDefense(succes) {
    const opposition = this.system.opposition;
    return {
      succes: Number(succes),
      opposition,
      perte: Math.max(opposition - Number(succes), 0)
    };
  }

  /**
   * Fusionne un autre groupe dans celui-ci : les Menaces s'additionnent, sous
   * un plafond propre à la fusion. Le groupe absorbé tombe à zéro.
   */
  async fusionnerAvec(autre) {
    if (!autre?.estGroupe) return null;

    const total = Math.min(
      this.system.menace.value + autre.system.menace.value,
      HEXAGON.hommesDeMain.menaceMaxFusion
    );

    await this.update({ "system.menace.value": total });
    await autre.update({ "system.menace.value": 0 });

    return { total, absorbe: autre.name };
  }

  /**
   * L'Opposition sert de rang d'initiative : quand la Menace bouge, les lignes
   * du groupe dans les rencontres en cours doivent suivre.
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (!this.estGroupe || !game.user.isGM) return;
    if (foundry.utils.getProperty(changed, "system.menace") === undefined) return;

    for (const combat of game.combats) {
      const lignes = combat.combatants.filter((c) => c.actor?.id === this.id);
      if (!lignes.length) continue;
      combat.updateEmbeddedDocuments(
        "Combatant",
        lignes.map((c) => ({ _id: c.id, initiative: this.system.opposition }))
      );
    }
  }
}
