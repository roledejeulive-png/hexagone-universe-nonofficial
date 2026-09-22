import { HEXAGON } from "../config.mjs";
import { signalerLimite } from "../helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille commune aux PNJ à Opposition libre : Menace et Opposition saisies
 * toutes deux par le MJ. Chaque déclinaison fournit ses bornes et le préfixe
 * de ses libellés ; le template et la logique sont partagés.
 */
class HexagonPnjOppositionSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** Bornes du type, lues dans la configuration. */
  static get reglages() {
    return HEXAGON.secondCouteau;
  }

  /** Préfixe des clés de traduction propres au type. */
  static get libelles() {
    return "HEXAGON.SecondCouteau";
  }

  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "acteur", "pnj-opposition"],
    position: { width: 540, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      ajusterMenace: HexagonPnjOppositionSheet.#onAjusterMenace,
      ajusterOpposition: HexagonPnjOppositionSheet.#onAjusterOpposition
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/actor/pnj-opposition.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const r = this.constructor.reglages;
    const prefixe = this.constructor.libelles;

    return Object.assign(context, {
      actor: this.actor,
      system: this.actor.system,
      editable: this.isEditable,
      menaceMax: r.menaceMax,
      oppositionMin: r.oppositionMin ?? 0,
      oppositionMax: r.oppositionMax,
      libelles: {
        role: `${prefixe}.Role`,
        roleAide: `${prefixe}.RoleAide`,
        vaincu: `${prefixe}.Vaincu`
      }
    });
  }

  /**
   * Ajuste un champ numérique dans ses bornes, ou signale le dépassement.
   * L'écriture est suivie d'un rendu explicite.
   */
  async #ajuster(champ, delta, min, max) {
    if (!this.isEditable) return;
    const actuelle = Number(foundry.utils.getProperty(this.actor, champ)) || 0;
    const valeur = actuelle + delta;
    if (valeur < min || valeur > max) {
      signalerLimite(min, max);
      return;
    }
    await this.actor.update({ [champ]: valeur });
    await this.render();
  }

  static async #onAjusterMenace(event, target) {
    event?.preventDefault?.();
    const r = this.constructor.reglages;
    await this.#ajuster("system.menace", Number(target.dataset.delta ?? 1), 0, r.menaceMax);
  }

  static async #onAjusterOpposition(event, target) {
    event?.preventDefault?.();
    const r = this.constructor.reglages;
    await this.#ajuster("system.opposition", Number(target.dataset.delta ?? 1), r.oppositionMin ?? 0, r.oppositionMax);
  }
}

/** Second couteau : Menace de 1 à 12, Opposition de 1 à 6. */
export class HexagonSecondCouteauSheet extends HexagonPnjOppositionSheet {
  static DEFAULT_OPTIONS = { classes: ["second-couteau"] };

  static get reglages() {
    return HEXAGON.secondCouteau;
  }

  static get libelles() {
    return "HEXAGON.SecondCouteau";
  }
}

/** Bras droit : Menace de 1 à 15, Opposition de 1 à 8. */
export class HexagonBrasDroitSheet extends HexagonPnjOppositionSheet {
  static DEFAULT_OPTIONS = { classes: ["bras-droit"] };

  static get reglages() {
    return HEXAGON.brasDroit;
  }

  static get libelles() {
    return "HEXAGON.BrasDroit";
  }
}
