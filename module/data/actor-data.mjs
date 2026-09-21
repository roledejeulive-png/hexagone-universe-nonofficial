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
      }),
      /** Carnet d'adresses du personnage, tenu à part des notes de jeu. */
      contacts: new f.HTMLField({ required: true, initial: "" })
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

/**
 * Groupe d'hommes de main : une seule entité technique pour tout le groupe.
 *
 * La Menace figure l'effectif, de 1 à 12 ; à 0 le groupe est vaincu, dispersé
 * ou en fuite. L'Opposition en découle — la moitié de la Menace arrondie au
 * supérieur, plafonnée à 6 — et baisse donc avec elle.
 */
export class HommesDeMainData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = ns().fields;
    return {
      menace: new f.SchemaField({
        value: new f.NumberField({
          required: true,
          integer: true,
          initial: 6,
          min: 0,
          max: HEXAGON.hommesDeMain.menaceMax
        }),
        max: new f.NumberField({
          required: true,
          integer: true,
          initial: HEXAGON.hommesDeMain.menaceMax,
          min: 1
        })
      }),
      role: new f.StringField({ required: true, initial: "" }),
      notes: new f.HTMLField({ required: true, initial: "" })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const menace = this.menace.value;
    this.opposition = menace <= 0
      ? 0
      : Math.min(Math.ceil(menace / 2), HEXAGON.hommesDeMain.oppositionMax);
    this.vaincu = menace <= 0;
  }
}


/**
 * Second couteau : PNJ marquant, allié ou adversaire, sans être majeur.
 *
 * L'Opposition est saisie librement par le MJ, contrairement aux hommes de
 * main où elle découle de la Menace. Le renfort est stocké comme un simple
 * identifiant : les valeurs du groupe soutenant sont lues au moment voulu,
 * pour rester justes quand sa Menace évolue de son côté.
 */
export class SecondCouteauData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = ns().fields;
    return {
      menace: new f.NumberField({
        required: true,
        integer: true,
        initial: 6,
        min: 0,
        max: HEXAGON.secondCouteau.menaceMax
      }),
      opposition: new f.NumberField({
        required: true,
        integer: true,
        initial: 3,
        min: 0,
        max: HEXAGON.secondCouteau.oppositionMax
      }),
      role: new f.StringField({ required: true, initial: "" }),
      notes: new f.HTMLField({ required: true, initial: "" })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.vaincu = this.menace <= 0;
  }

}
