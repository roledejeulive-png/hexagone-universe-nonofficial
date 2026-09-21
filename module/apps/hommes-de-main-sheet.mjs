import { HEXAGON } from "../config.mjs";
import { signalerLimite } from "../helpers.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
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
      ajusterMenace: HexagonHommesDeMainSheet.#onAjusterMenace,
      fusionner: HexagonHommesDeMainSheet.#onFusionner
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
      menaceMax: HEXAGON.hommesDeMain.menaceMax,
      menaceMaxFusion: HEXAGON.hommesDeMain.menaceMaxFusion
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

  /**
   * Fusion de deux groupes : les Menaces s'additionnent, plafonnées, et le
   * groupe absorbé tombe à zéro. L'Opposition suit d'elle-même.
   */
  static async #onFusionner() {
    const candidats = game.actors.filter(
      (a) => a.type === "hommesDeMain" && a.id !== this.actor.id && a.system.menace > 0
    );

    if (!candidats.length) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.HommesDeMain.AucunGroupe"));
      return;
    }

    const options = candidats
      .map((a) => `<option value="${a.id}">${a.name} — ${game.i18n.localize("HEXAGON.HommesDeMain.Menace")} ${a.system.menace}</option>`)
      .join("");

    const choix = await DialogV2.prompt({
      window: { title: game.i18n.localize("HEXAGON.HommesDeMain.Fusionner") },
      content: `<p>${game.i18n.localize("HEXAGON.HommesDeMain.FusionnerAide")}</p>
        <select name="cible" style="width:100%">${options}</select>`,
      ok: {
        label: game.i18n.localize("HEXAGON.HommesDeMain.Fusionner"),
        callback: (event, bouton) => bouton.form.elements.cible.value
      },
      rejectClose: false
    });

    if (!choix) return;

    const absorbe = game.actors.get(choix);
    if (!absorbe) return;

    const somme = Math.min(
      this.actor.system.menace + absorbe.system.menace,
      HEXAGON.hommesDeMain.menaceMaxFusion
    );

    await this.actor.update({ "system.menace": somme });
    await absorbe.update({ "system.menace": 0 });
    await this.render();

    ui.notifications.info(
      game.i18n.format("HEXAGON.HommesDeMain.FusionFaite", {
        groupe: this.actor.name,
        absorbe: absorbe.name,
        menace: somme
      })
    );
  }
}
