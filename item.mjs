import { HEXAGON } from "../config.mjs";

export class HexagonItem extends Item {
  get estTrait() {
    return HEXAGON.typesTraits.includes(this.type);
  }

  /** Jet rapide sur ce seul Trait, depuis la feuille ou une macro. */
  async lancer({ difficulte = 1, modificateur = 0 } = {}) {
    if (!this.estTrait) return null;
    if (!this.actor) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.Avertissement.TraitSansActeur"));
      return null;
    }
    return this.actor.lancerTraits({
      traitIds: [this.id],
      difficulte,
      modificateur,
      label: this.name
    });
  }
}
