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
}
