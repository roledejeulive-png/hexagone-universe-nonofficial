import { HEXAGON } from "../config.mjs";
import { ns } from "../helpers.mjs";

/**
 * Champs partagés par tous les acteurs.
 * L'Énergie est la jauge vitale (ancienne « Santé ») ; elle sert aussi de
 * carburant aux Pouvoirs, dont le coût y est prélevé au moment du jet.
 */
function socle() {
  const f = ns().fields;
  return {
    energie: new f.SchemaField({
      value: new f.NumberField({ required: true, integer: true, initial: 10, min: 0 }),
      max: new f.NumberField({ required: true, integer: true, initial: 10, min: 0 })
    }),
    notes: new f.HTMLField({ required: true, initial: "" })
  };
}

export class HerosData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = ns().fields;
    return {
      ...socle(),
      identite: new f.SchemaField({
        nomDeCode: new f.StringField({ required: true, initial: "" }),
        identiteCivile: new f.StringField({ required: true, initial: "" }),
        origine: new f.StringField({ required: true, initial: "" }),
        equipe: new f.StringField({ required: true, initial: "" })
      }),
      /** Ressource dramatique, dépensée pour forcer le destin. */
      audace: new f.SchemaField({
        value: new f.NumberField({ required: true, integer: true, initial: 3, min: 0 }),
        max: new f.NumberField({ required: true, integer: true, initial: 3, min: 0 })
      }),
      xp: new f.SchemaField({
        gagnee: new f.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        depensee: new f.NumberField({ required: true, integer: true, initial: 0, min: 0 })
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.xp.disponible = this.xp.gagnee - this.xp.depensee;
    // Pool maximal théorique : somme des rangs de tous les Traits. Indicateur
    // d'interface, pas une règle.
    this.poolTotal = this.parent.items
      .filter((i) => HEXAGON.typesTraits.includes(i.type))
      .reduce((total, i) => total + (i.system.rang ?? 0), 0);
  }
}

export class FigurantData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = ns().fields;
    return {
      ...socle(),
      role: new f.StringField({ required: true, initial: "" }),
      /** Pool par défaut quand le figurant agit sans Trait détaillé. */
      poolDefaut: new f.NumberField({ required: true, integer: true, initial: 3, min: 0 }),
      /** Nombre de figurants identiques regroupés sous cette fiche. */
      effectif: new f.NumberField({ required: true, integer: true, initial: 1, min: 1 })
    };
  }
}
