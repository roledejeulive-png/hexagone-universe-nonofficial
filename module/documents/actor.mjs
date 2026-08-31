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

  /**
   * Lance un pool composé des Traits fournis.
   *
   * @param {object} options
   * @param {string[]} [options.traitIds]    Ids des Traits à cumuler.
   * @param {string[]} [options.specialites] Noms des spécialités engagées : chacune
   *                                         coûte un dé et offre une réussite.
   * @param {number} [options.modificateur]
   * @param {number} [options.difficulte]
   * @param {string} [options.label]
   */
  async lancerTraits({
    traitIds = [],
    specialites = [],
    modificateur = 0,
    difficulte = 1,
    label
  } = {}) {
    const traits = traitIds.map((id) => this.items.get(id)).filter(Boolean);
    const pool = construirePool(traits, modificateur, specialites.length);

    // Coût en énergie des Pouvoirs engagés.
    const cout = traits
      .filter((t) => t.type === "pouvoir")
      .reduce((total, t) => total + (t.system.cout ?? 0), 0);
    if (cout > 0 && this.system.energie) {
      await this.update({ "system.energie.value": Math.max(this.system.energie.value - cout, 0) });
    }

    const intitule = label || traits.map((t) => t.name).join(" + ") || game.i18n.localize("HEXAGON.Jet.Libre");

    return lancerPool({
      des: pool.des,
      difficulte,
      label: intitule,
      actor: this,
      detail: pool.detail,
      specialites
    });
  }
}
