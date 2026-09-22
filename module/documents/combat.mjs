import { HEXAGON } from "../config.mjs";

/** Les deux camps qui disposent d'un pot d'initiative distinct. */
export const GROUPES = {
  heros: { flag: "initiative", libelle: "HEXAGON.Initiative.GroupeHeros" },
  figurants: { flag: "initiativeAdverse", libelle: "HEXAGON.Initiative.GroupeFigurants" }
};

/**
 * Valide un fractionnement de rang d'initiative.
 *
 * Un personnage peut découper son rang en plusieurs rangs dont la somme égale
 * celui de départ, à la seule condition qu'aucun ne soit égal à un autre. Un
 * rang de 6 donne 4 et 2, ou 5 et 1, ou 3, 2 et 1 — mais jamais 3 et 3, ni
 * 4, 1 et 1.
 *
 * @param {number[]} rangs
 * @param {number} total
 * @returns {{valide: boolean, raison: string|null}}
 */
export function validerFractionnement(rangs, total) {
  if (!Array.isArray(rangs) || rangs.length === 0) return { valide: true, raison: null };

  if (rangs.some((r) => !Number.isInteger(r) || r < 1)) {
    return { valide: false, raison: "HEXAGON.Initiative.FractionEntiers" };
  }
  if (new Set(rangs).size !== rangs.length) {
    return { valide: false, raison: "HEXAGON.Initiative.FractionDoublons" };
  }
  if (rangs.reduce((somme, r) => somme + r, 0) !== total) {
    return { valide: false, raison: "HEXAGON.Initiative.FractionSomme" };
  }
  return { valide: true, raison: null };
}

/** Lit une saisie libre — « 4 2 », « 3, 2, 1 » — en liste de rangs. */
export function lireFractionnement(texte) {
  return String(texte ?? "")
    .split(/[^0-9]+/)
    .filter((m) => m.length)
    .map(Number);
}

/**
 * Un combattant appartient à un camp, déduit de la disposition de son jeton.
 * Le camp sert aux libellés ; le groupe, lui, distingue les PJ des figurants.
 */
export class HexagonCombattant extends Combatant {
  get estHeros() {
    return this.actor?.type === "heros";
  }

  /**
   * Trois groupes : les PJ et les figurants tirent leur rang d'un pot, les
   * groupes d'hommes de main agissent au rang de leur Opposition.
   */
  get groupe() {
    if (this.estHeros) return "heros";
    if (["hommesDeMain", "secondCouteau", "brasDroit"].includes(this.actor?.type)) return "pnj";
    return "figurants";
  }

  /** Rang auquel ce PNJ agit : son niveau d'Opposition. */
  get rangsPnj() {
    return [this.actor?.system.opposition ?? 0];
  }

  /** Entrée supplémentaire créée pour un rang fractionné, pas un vrai combattant. */
  get estRangSupplementaire() {
    return Boolean(this.getFlag(HEXAGON.id, "rangSupplementaire"));
  }

  get camp() {
    const force = this.getFlag(HEXAGON.id, "camp");
    if (force !== undefined && force !== null) return Number(force);
    return Number(this.token?.disposition ?? this.actor?.prototypeToken?.disposition ?? 0);
  }

  get libelleCamp() {
    const cle = HEXAGON.combat.camps[String(this.camp)];
    return cle ? game.i18n.localize(cle) : game.i18n.localize("HEXAGON.Combat.CampNeutres");
  }
}

/**
 * L'initiative ne se tire pas combattant par combattant : chaque camp dispose
 * d'un pot de Succès, constitué une fois, puis réparti tour par tour. Le rang
 * d'un personnage vaut son Succès automatique plus la part qu'on lui alloue,
 * éventuellement fractionnée en plusieurs rangs.
 *
 * Les PJ et les figurants ont chacun leur pot, dans deux drapeaux distincts de
 * la rencontre.
 */
export class HexagonCombat extends Combat {
  /* -------------------------------------------- */
  /*  Lecture et écriture des pots                */
  /* -------------------------------------------- */

  pot(groupe = "heros") {
    const brut = GROUPES[groupe] ? this.getFlag(HEXAGON.id, GROUPES[groupe].flag) ?? {} : {};
    return {
      leaderId: brut.leaderId ?? null,
      main: brut.main ?? {},
      des: brut.des ?? 0,
      total: brut.total ?? 0,
      consomme: brut.consomme ?? 0,
      equipe: brut.equipe ?? null,
      attribution: brut.attribution ?? {},
      fractionnement: brut.fractionnement ?? {},
      clos: brut.clos ?? false,
      tour: brut.tour ?? 0
    };
  }

  /** Succès encore disponibles, l'attribution en cours déduite. */
  potRestant(groupe = "heros") {
    const pot = this.pot(groupe);
    const enCours = Object.values(pot.attribution).reduce((t, n) => t + Number(n || 0), 0);
    return pot.total - pot.consomme - enCours;
  }

  /**
   * Combattants d'un groupe, hors lignes créées par un fractionnement.
   *
   * Côté héros, l'équipe peut être restreinte à la main : un PJ présent sur la
   * scène sans faire partie de l'équipe de la scène d'action n'entre ni dans la
   * main collective, ni dans la répartition du pot. Tant qu'aucune liste n'a
   * été posée, tous les héros en sont.
   */
  membres(groupe = "heros") {
    const tous = this.combatants.filter((c) => c.groupe === groupe && !c.estRangSupplementaire);
    if (groupe !== "heros") return tous;

    const equipe = this.pot("heros").equipe;
    if (!Array.isArray(equipe)) return tous;
    return tous.filter((c) => equipe.includes(c.id));
  }

  /** Tous les héros engagés dans la rencontre, équipe ou non. */
  get herosPresents() {
    return this.combatants.filter((c) => c.groupe === "heros" && !c.estRangSupplementaire);
  }

  /** Fixe la composition de l'équipe pour la scène d'action. */
  async definirEquipe(ids) {
    return this.majPot("heros", { equipe: [...ids] });
  }

  get heros() {
    return this.membres("heros");
  }

  /** Succès acquis d'office par un membre du groupe, du seul fait d'être là. */
  succesAutomatique(groupe = "heros") {
    return groupe === "heros"
      ? HEXAGON.initiative.succesAutomatique
      : HEXAGON.initiative.succesAutomatiqueFigurant;
  }

  /**
   * Rangs d'un combattant pour le tour : un seul, ou plusieurs s'il a
   * fractionné. Un fractionnement devenu invalide — parce que la part a changé
   * depuis — est ignoré au profit du rang entier. Après clôture du tour, tout
   * retombe à zéro en attendant une nouvelle répartition.
   */
  rangsDe(combattantId) {
    const combattant = this.combatants.get(combattantId);
    if (!combattant) return [0];

    const groupe = combattant.groupe;

    // Un groupe d'hommes de main ne participe à aucun pot : son rang est son
    // Opposition, dérivée de sa Menace.
    if (!GROUPES[groupe]) return combattant.rangsPnj;

    const pot = this.pot(groupe);
    if (pot.clos) return [0];

    const total = this.succesAutomatique(groupe) + Number(pot.attribution[combattantId] ?? 0);
    const fraction = pot.fractionnement[combattantId];

    if (!HEXAGON.initiative.fractionnementAutorise || !Array.isArray(fraction) || !fraction.length) {
      return [total];
    }
    if (!validerFractionnement(fraction, total).valide) return [total];

    return [...fraction].sort((a, b) => b - a);
  }

  /**
   * Met à jour le pot d'un groupe.
   *
   * setFlag fusionne récursivement : écrire « attribution: {} » laisserait les
   * anciennes parts en place. On recompose donc le pot complet — les clés
   * fournies remplacent intégralement les anciennes — puis on l'écrit après
   * avoir effacé la version précédente.
   */
  async majPot(groupe, modifications) {
    const cle = GROUPES[groupe].flag;
    const actuel = this.getFlag(HEXAGON.id, cle) ?? {};
    const complet = foundry.utils.deepClone({ ...actuel, ...modifications });
    await this.unsetFlag(HEXAGON.id, cle);
    return this.setFlag(HEXAGON.id, cle, complet);
  }

  /** Enregistre le résultat d'une main. Écrase toute phase précédente du groupe. */
  async enregistrerPhase(groupe, { leaderId = null, main = {}, des = 0, total = 0 }) {
    await this.majPot(groupe, {
      leaderId,
      main,
      des,
      total,
      consomme: 0,
      attribution: {},
      fractionnement: {},
      clos: false,
      tour: this.round
    });
    return this;
  }

  /* -------------------------------------------- */
  /*  Rangs                                       */
  /* -------------------------------------------- */

  /**
   * Écrit les rangs d'initiative d'un groupe. Un personnage qui agit à
   * plusieurs rangs occupe autant de lignes dans la barre de combat, toutes
   * rattachées à son jeton ; les lignes du tour précédent sont effacées avant.
   */
  /**
   * Enregistre une répartition — parts du pot, fractionnements — sans rien
   * écrire dans la barre de combat. Les rangs ne sont reportés qu'au moment où
   * le MJ applique explicitement.
   */
  async enregistrerRepartition(groupe, { attribution = null, fractionnement = null } = {}) {
    const modifications = { clos: false, tour: this.round };
    if (attribution) modifications.attribution = attribution;
    if (fractionnement) modifications.fractionnement = fractionnement;
    return this.majPot(groupe, modifications);
  }

  /** Reporte dans la barre de combat les rangs issus de la répartition enregistrée. */
  async appliquerAttribution(groupe) {
    return this.#ecrireRangs(groupe);
  }

  /**
   * Remet l'initiative des héros à blanc : pot vidé, main oubliée, répartition
   * effacée, rangs supprimés de la barre de combat. La composition de l'équipe
   * est conservée, elle ne relève pas de l'initiative.
   */
  async reinitialiserInitiative() {
    await this.majPot("heros", {
      leaderId: null,
      main: {},
      des: 0,
      total: 0,
      consomme: 0,
      attribution: {},
      fractionnement: {},
      clos: false,
      tour: this.round
    });

    const presents = this.herosPresents;
    const ids = new Set(presents.map((c) => c.id));
    const supplementaires = this.combatants
      .filter((c) => c.estRangSupplementaire && ids.has(c.getFlag(HEXAGON.id, "rangSupplementaire")))
      .map((c) => c.id);
    if (supplementaires.length) await this.deleteEmbeddedDocuments("Combatant", supplementaires);

    const effacements = presents.map((c) => ({ _id: c.id, initiative: null }));
    if (effacements.length) await this.updateEmbeddedDocuments("Combatant", effacements);
    return this;
  }

  /**
   * Clôt le tour d'un groupe : les Succès distribués sont définitivement
   * consommés et les rangs retombent à zéro, en attendant la répartition du
   * tour suivant sur ce qui reste du pot.
   */
  async cloturerTour(groupe = "heros") {
    const pot = this.pot(groupe);
    const distribue = Object.values(pot.attribution).reduce((t, n) => t + Number(n || 0), 0);

    await this.majPot(groupe, {
      consomme: HEXAGON.initiative.potConsomme ? pot.consomme + distribue : 0,
      attribution: {},
      fractionnement: {},
      clos: true,
      tour: this.round
    });

    return this.#ecrireRangs(groupe);
  }

  /** Reporte dans la barre de combat les rangs calculés pour le groupe. */
  async #ecrireRangs(groupe) {
    const membres = this.membres(groupe);
    const idsMembres = new Set(membres.map((c) => c.id));

    // Repartir d'une base propre : les rangs supplémentaires sont recréés.
    const anciens = this.combatants
      .filter((c) => c.estRangSupplementaire && idsMembres.has(c.getFlag(HEXAGON.id, "rangSupplementaire")))
      .map((c) => c.id);
    if (anciens.length) await this.deleteEmbeddedDocuments("Combatant", anciens);

    const misesAJour = [];
    const creations = [];

    for (const combattant of membres) {
      const rangs = this.rangsDe(combattant.id);
      misesAJour.push({ _id: combattant.id, initiative: rangs[0] });

      for (const rang of rangs.slice(1)) {
        creations.push({
          tokenId: combattant.tokenId,
          sceneId: combattant.sceneId,
          actorId: combattant.actorId,
          initiative: rang,
          hidden: combattant.hidden,
          flags: { [HEXAGON.id]: { rangSupplementaire: combattant.id } }
        });
      }
    }

    if (misesAJour.length) await this.updateEmbeddedDocuments("Combatant", misesAJour);
    if (creations.length) await this.createEmbeddedDocuments("Combatant", creations);
    return this;
  }

  /* -------------------------------------------- */
  /*  Jets d'initiative                           */
  /* -------------------------------------------- */

  get initiativePartagee() {
    return game.settings.get(HEXAGON.id, "initiativePartagee");
  }

  /**
   * Personne ne lance individuellement tant que son camp dispose d'un pot. Les
   * figurants sans pot conservent l'ancien comportement : un jet par camp, ou
   * un jet chacun selon le réglage de monde.
   */
  async rollInitiative(ids, options = {}) {
    const demandes = typeof ids === "string" ? [ids] : ids;
    const parGroupe = { heros: [], figurants: [], pnj: [] };

    for (const id of demandes) {
      const combattant = this.combatants.get(id);
      if (!combattant || combattant.estRangSupplementaire) continue;
      parGroupe[combattant.groupe].push(combattant);
    }

    // Les PNJ ne tirent rien : leurs rangs découlent de leur Opposition.
    if (parGroupe.pnj.length) await this.#ecrireRangsPnj(parGroupe.pnj);

    for (const groupe of ["heros", "figurants"]) {
      if (!parGroupe[groupe].length) continue;

      // Le dé de la barre de combat ne remplace pas la phase d'initiative : les
      // rangs des héros ne s'écrivent que depuis « Appliquer les rangs ».
      if (groupe === "heros") {
        ui.notifications.info(game.i18n.localize("HEXAGON.Initiative.PassezParLaPhase"));
        continue;
      }

      if (this.initiativePartagee) await this.#initiativeParCamp(parGroupe[groupe], options);
      else await super.rollInitiative(parGroupe[groupe].map((c) => c.id), options);
    }

    return this;
  }

  /**
   * Reporte les rangs d'un ou plusieurs PNJ. Un second couteau soutenu occupe
   * deux lignes dans la barre de combat, comme un PJ qui a fractionné.
   */
  async #ecrireRangsPnj(combattants) {
    const ids = new Set(combattants.map((c) => c.id));

    const anciens = this.combatants
      .filter((c) => c.estRangSupplementaire && ids.has(c.getFlag(HEXAGON.id, "rangSupplementaire")))
      .map((c) => c.id);
    if (anciens.length) await this.deleteEmbeddedDocuments("Combatant", anciens);

    const misesAJour = [];
    const creations = [];

    for (const combattant of combattants) {
      const rangs = combattant.rangsPnj;
      misesAJour.push({ _id: combattant.id, initiative: rangs[0] ?? 0 });

      for (const rang of rangs.slice(1)) {
        creations.push({
          tokenId: combattant.tokenId,
          sceneId: combattant.sceneId,
          actorId: combattant.actorId,
          initiative: rang,
          hidden: combattant.hidden,
          flags: { [HEXAGON.id]: { rangSupplementaire: combattant.id } }
        });
      }
    }

    if (misesAJour.length) await this.updateEmbeddedDocuments("Combatant", misesAJour);
    if (creations.length) await this.createEmbeddedDocuments("Combatant", creations);
  }

  /** Un seul jet par camp de figurants, appliqué à tous ses membres. */
  async #initiativeParCamp(figurants, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    const valeurs = new Map();
    const messages = [];

    for (const combattant of figurants) {
      if (valeurs.has(combattant.camp)) continue;

      const roll = combattant.getInitiativeRoll(formula ?? HEXAGON.combat.formuleInitiative);
      await roll.evaluate();
      valeurs.set(combattant.camp, roll.total);

      messages.push(
        await roll.toMessage(
          {
            speaker: ChatMessage.getSpeaker({
              actor: combattant.actor,
              token: combattant.token,
              alias: combattant.libelleCamp
            }),
            flavor: game.i18n.format("HEXAGON.Combat.JetInitiative", { camp: combattant.libelleCamp }),
            ...messageOptions
          },
          { create: false }
        )
      );
    }

    if (!valeurs.size) return;

    const misesAJour = [];
    for (const combattant of this.membres("figurants")) {
      const valeur = valeurs.get(combattant.camp);
      if (valeur !== undefined) misesAJour.push({ _id: combattant.id, initiative: valeur });
    }

    const idCourant = this.combatant?.id;
    await this.updateEmbeddedDocuments("Combatant", misesAJour);

    if (updateTurn && idCourant) {
      const index = this.turns.findIndex((t) => t.id === idCourant);
      if (index >= 0) await this.update({ turn: index });
    }

    const aPublier = messages.filter(Boolean);
    if (aPublier.length) await ChatMessage.implementation.create(aPublier);
  }
}
