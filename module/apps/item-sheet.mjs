import { HEXAGON } from "../config.mjs";

export class HexagonItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hexagon", "sheet", "objet"],
      template: `${HEXAGON.path}/templates/item/item-sheet.hbs`,
      width: 480,
      height: 520,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  getData(options) {
    const context = super.getData(options);
    const item = this.item;
    context.system = item.system;
    context.estTrait = item.estTrait;
    context.estMotivation = item.type === "motivation";
    context.estTalent = item.type === "talent";
    context.specialitesEnSommeil = context.estTalent && item.system.rang < 1;
    context.estPouvoir = item.type === "pouvoir";
    context.estEquipement = item.type === "equipement";
    context.typeLabel = game.i18n.localize(HEXAGON.typesItems[item.type] ?? item.type);
    context.rangMax = HEXAGON.rangMaxDe(item.type);
    context.bonusMax = HEXAGON.rangMax.equipement;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find("[data-hex='lancerTrait']").on("click", async (event) => {
      event.preventDefault();
      await this.item.lancer();
    });
  }
}

export function registerItemSheets() {
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(HEXAGON.id, HexagonItemSheet, {
    makeDefault: true,
    label: "HEXAGON.Feuille.Objet"
  });
}
