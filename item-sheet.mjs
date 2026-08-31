import { HEXAGON } from "../config.mjs";
import { ns } from "../helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class HexagonItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hexagon", "sheet", "objet"],
    position: { width: 480, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      lancerTrait: HexagonItemSheet.#onLancerTrait
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/item/item-sheet.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    return Object.assign(context, {
      item,
      system: item.system,
      editable: this.isEditable,
      estTrait: item.estTrait,
      estMotivation: item.type === "motivation",
      estTalent: item.type === "talent",
      specialitesEnSommeil: item.type === "talent" && item.system.rang < 1,
      estPouvoir: item.type === "pouvoir",
      estEquipement: item.type === "equipement",
      typeLabel: game.i18n.localize(HEXAGON.typesItems[item.type] ?? item.type),
      rangMax: HEXAGON.rangMaxDe(item.type),
      bonusMax: HEXAGON.rangMax.equipement
    });
  }

  static async #onLancerTrait() {
    await this.item.lancer();
  }
}

export function registerItemSheets() {
  const { Items } = ns();
  Items.registerSheet(HEXAGON.id, HexagonItemSheet, {
    makeDefault: true,
    label: "HEXAGON.Feuille.Objet"
  });
}
