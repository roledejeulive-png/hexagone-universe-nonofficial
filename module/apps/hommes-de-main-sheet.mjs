import { HEXAGON } from "../config.mjs";
import { signalerLimite } from "../helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille d'un groupe d'hommes de main.
 *
 * La Menace est la seule valeur saisie ; l'Opposition en découle et se
 * recalcule à chaque écriture, la fiche étant redessinée dans la foulée.
 */
export class HexagonHommesDeMainSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "acteur", "hommes-de-main"],
    position: { width: 520, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      ajusterMenace: HexagonHommesDeMainSheet.#onAjusterMenace
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/actor/hommes-de-main.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    return Object.assign(context, {
      actor: this.actor,
      system,
      // L'Opposition est recalculée ici plutôt que lue : la fiche affiche
      // toujours une valeur cohérente avec la Menace, même si les données
      // dérivées n'ont pas encore été rafraîchies.
      opposition: HexagonHommesDeMainSheet.oppositionPour(system.menace),
      editable: this.isEditable,
      menaceMax: HEXAGON.hommesDeMain.menaceMax
    });
  }

  /** Moitié de la Menace arrondie au supérieur, plafonnée, nulle si vaincu. */
  static oppositionPour(menace) {
    const valeur = Number(menace) || 0;
    if (valeur <= 0) return 0;
    return Math.min(Math.ceil(valeur / 2), HEXAGON.hommesDeMain.oppositionMax);
  }

  /* -------------------------------------------- */

  /** Chevrons de Menace. L'écriture est suivie d'un rendu explicite. */
  static async #onAjusterMenace(event, target) {
    event?.preventDefault?.();
    if (!this.isEditable) return;

    const delta = Number(target.dataset.delta ?? 1);
    const actuelle = Number(this.actor.system.menace) || 0;
    const plafond = HEXAGON.hommesDeMain.menaceMax;
    const valeur = actuelle + delta;
    if (valeur < 0 || valeur > plafond) {
      signalerLimite(0, plafond);
      return;
    }

    await this.actor.update({ "system.menace": valeur });
    await this.render();
  }
}
