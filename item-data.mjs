import { ns } from "../helpers.mjs";

/**
 * Trait : Motivation, Talent ou Pouvoir. Même forme pour les trois, mais des
 * plafonds différents : chaque sous-classe fixe son `rangMax`, que
 * `defineSchema` lit via `this` — donc sans redéfinir le schéma entier.
 */
export class TraitData extends foundry.abstract.TypeDataModel {
  static rangMax = 5;

  static defineSchema() {
    const f = ns().fields;
    return {
      rang: new f.NumberField({
        required: true,
        integer: true,
        initial: 1,
        min: 0,
        max: this.rangMax
      }),
      description: new f.HTMLField({ required: true, initial: "" }),
      /** Coché par défaut dans le sélecteur de pool (utile pour un Talent signature). */
      favori: new f.BooleanField({ required: true, initial: false })
    };
  }

  /** Un Trait à rang 0 existe encore sur la fiche mais n'apporte aucun dé. */
  get des() {
    return Math.max(this.rang, 0);
  }
}

/** Motivation : rang 0 à 3, plus le dilemme qui la fait bouger en partie. */
export class MotivationData extends TraitData {
  static rangMax = 3;

  static defineSchema() {
    const f = ns().fields;
    return {
      ...super.defineSchema(),
      dilemme: new f.StringField({ required: true, initial: "" })
    };
  }
}

/** Talent : rang 0 à 3, avec d'éventuelles spécialités. */
export class TalentData extends TraitData {
  static rangMax = 3;

  static defineSchema() {
    const f = ns().fields;
    return {
      ...super.defineSchema(),
      /** Saisies en clair, séparées par des virgules : « Boxe, Filature ». */
      specialites: new f.StringField({ required: true, initial: "" })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData?.();

    // Une spécialité n'existe qu'adossée à un Talent effectivement possédé :
    // au rang 0, la saisie est conservée mais rien n'est publié, ce qui suffit
    // à la rendre invisible et inutilisable partout en aval.
    if (this.rang < 1) {
      this.listeSpecialites = [];
      return;
    }

    this.listeSpecialites = this.specialites
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length);
  }
}

/** Pouvoir : rang 0 à 10, avec coût en énergie et limites. */
export class PouvoirData extends TraitData {
  static rangMax = 10;

  static defineSchema() {
    const f = ns().fields;
    return {
      ...super.defineSchema(),
      /** Coût en énergie, appliqué à la fiche lors d'un jet si non nul. */
      cout: new f.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      limites: new f.HTMLField({ required: true, initial: "" })
    };
  }
}

export class EquipementData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = ns().fields;
    return {
      bonus: new f.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 3 }),
      quantite: new f.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      equipe: new f.BooleanField({ required: true, initial: false }),
      description: new f.HTMLField({ required: true, initial: "" })
    };
  }
}
