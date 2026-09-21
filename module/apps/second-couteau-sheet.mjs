import { HEXAGON } from "../config.mjs";
import { signalerLimite } from "../helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille d'un second couteau : Menace et Opposition, toutes deux saisies.
 * Contrairement aux hommes de main, l'Opposition ne découle pas de la Menace,
 * elle est posée librement par le MJ.
 */
export class HexagonSecondCouteauSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "acteur", "second-couteau"],
    position: { width: 540, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      ajusterMenace: HexagonSecondCouteauSheet.#onAjusterMenace
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/actor/second-couteau.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return Object.assign(context, {
      actor: this.actor,
      system: this.actor.system,
      editable: this.isEditable,
      menaceMax: HEXAGON.secondCouteau.menaceMax,
      oppositionMax: HEXAGON.secondCouteau.oppositionMax
    });
  }

  /** Chevrons de Menace. L'écriture est suivie d'un rendu explicite. */
  static async #onAjusterMenace(event, target) {
    event?.preventDefault?.();
    if (!this.isEditable) return;

    const delta = Number(target.dataset.delta ?? 1);
    const actuelle = Number(this.actor.system.menace) || 0;
    const plafond = HEXAGON.secondCouteau.menaceMax;
    const valeur = actuelle + delta;
    if (valeur < 0 || valeur > plafond) {
      signalerLimite(0, plafond);
      return;
    }

    await this.actor.update({ "system.menace": valeur });
    await this.render();
  }
}
