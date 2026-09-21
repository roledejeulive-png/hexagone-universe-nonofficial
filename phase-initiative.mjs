import { HEXAGON } from "../config.mjs";
import { validerFractionnement, lireFractionnement } from "../documents/combat.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Phase d'initiative.
 *
 * Deux camps, deux pots. Pour les PJ, la main collective est constituée par un
 * leader désigné qui pose un Trait de chaque type, complétée d'un Trait par
 * joueur. Pour les adversaires, le MJ pose directement le nombre de dés de sa
 * main : les figurants n'ont pas de liste de Traits à sélectionner.
 *
 * Réservée au MJ : elle écrit dans la rencontre pour tout le monde.
 */
export class PhaseInitiative extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(combat, options = {}) {
    super(options);
    this.combat = combat;
  }

  /** Sélection en cours côté PJ, non encore lancée. */
  #selection = { leaderId: null, leader: {}, joueurs: {} };

  static DEFAULT_OPTIONS = {
    id: "hexagon-phase-initiative",
    classes: ["hexagon", "phase-initiative"],
    tag: "form",
    position: { width: 640, height: "auto" },
    window: { title: "HEXAGON.Initiative.Titre", resizable: true },
    form: {
      handler: PhaseInitiative.#onChangement,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      lancerPhase: PhaseInitiative.#onLancerPhase,
      ajusterPart: PhaseInitiative.#onAjusterPart,
      appliquer: PhaseInitiative.#onAppliquer,
      cloturerTour: PhaseInitiative.#onCloturerTour
    }
  };

  static PARTS = {
    corps: { template: `${HEXAGON.path}/templates/apps/phase-initiative.hbs` }
  };

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  /** Traits d'un acteur utilisables dans une main, sous forme d'options. */
  #optionsTraits(acteur, type = null) {
    if (!acteur) return [];
    const types = type ? [type] : HEXAGON.typesTraits;
    return acteur.items
      .filter((i) => types.includes(i.type) && (i.system.rang ?? 0) > 0)
      .map((i) => ({ id: i.id, nom: `${i.name} (${i.system.rang})`, rang: i.system.rang }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }

  /** Somme des rangs de la main des PJ en cours de construction. */
  #desDeLaMain() {
    const combat = this.combat;
    let total = 0;

    const leader = combat.combatants.get(this.#selection.leaderId)?.actor;
    if (leader) {
      for (const itemId of Object.values(this.#selection.leader)) {
        total += leader.items.get(itemId)?.system.rang ?? 0;
      }
    }

    for (const [combattantId, itemId] of Object.entries(this.#selection.joueurs)) {
      const acteur = combat.combatants.get(combattantId)?.actor;
      total += acteur?.items.get(itemId)?.system.rang ?? 0;
    }

    return total;
  }

  /** Bloc de répartition, identique pour les deux camps. */
  #repartition(groupe) {
    const combat = this.combat;
    const pot = combat.pot(groupe);
    const automatique = combat.succesAutomatique(groupe);

    return combat.membres(groupe).map((c) => {
      const part = Number(pot.attribution[c.id] ?? 0);
      const rang = automatique + part;
      const fraction = pot.fractionnement[c.id] ?? [];
      const controle = validerFractionnement(fraction, rang);
      const rangs = combat.rangsDe(c.id);

      return {
        id: c.id,
        groupe,
        nom: c.name,
        part,
        rang,
        saisie: fraction.join(" "),
        rangs,
        fractionne: rangs.length > 1,
        erreur: controle.valide ? null : game.i18n.localize(controle.raison)
      };
    });
  }

  async _prepareContext(options) {
    const combat = this.combat;
    const potPJ = combat.pot("heros");
    const equipe = potPJ.equipe;
    const presents = combat.herosPresents.filter((c) => c.actor);
    const heros = combat.membres("heros").filter((c) => c.actor);

    const leaderId = this.#selection.leaderId ?? potPJ.leaderId;
    this.#selection.leaderId = leaderId;
    const leader = combat.combatants.get(leaderId);

    return {
      combat,
      fractionnementAutorise: HEXAGON.initiative.fractionnementAutorise,

      presents: presents.map((c) => ({
        id: c.id,
        nom: c.name,
        membre: !Array.isArray(equipe) || equipe.includes(c.id)
      })),

      pj: {
        groupe: "heros",
        pot: potPJ,
        restant: combat.potRestant("heros"),
        phaseFaite: potPJ.total > 0,
        clos: potPJ.clos,
        desDeLaMain: this.#desDeLaMain(),
        candidats: heros.map((c) => ({ id: c.id, nom: c.name, choisi: c.id === leaderId })),
        leader: leader
          ? {
              id: leader.id,
              nom: leader.name,
              emplacements: HEXAGON.initiative.typesDuLeader.map((type) => ({
                type,
                label: game.i18n.localize(HEXAGON.typesItems[type]),
                options: this.#optionsTraits(leader.actor, type),
                choisi: this.#selection.leader[type] ?? ""
              }))
            }
          : null,
        autres: heros
          .filter((c) => c.id !== leaderId)
          .map((c) => ({
            id: c.id,
            nom: c.name,
            options: this.#optionsTraits(c.actor),
            choisi: this.#selection.joueurs[c.id] ?? ""
          })),
        repartition: this.#repartition("heros")
      }
    };
  }

  /* -------------------------------------------- */
  /*  Formulaire                                  */
  /* -------------------------------------------- */

  /** Les listes alimentent la sélection ; les fractionnements sont écrits aussitôt. */
  static async #onChangement(event, form, formData) {
    const donnees = formData.object;

    if (donnees.leaderId !== undefined && donnees.leaderId !== this.#selection.leaderId) {
      this.#selection.leaderId = donnees.leaderId || null;
      // Changer de leader invalide sa main, pas celle des autres.
      this.#selection.leader = {};
    }

    const equipe = [];
    let equipeTouchee = false;
    const fractions = { heros: null, figurants: null };

    for (const [cle, valeur] of Object.entries(donnees)) {
      if (cle.startsWith("leader.")) this.#selection.leader[cle.slice(7)] = valeur;
      else if (cle.startsWith("joueur.")) this.#selection.joueurs[cle.slice(7)] = valeur;
      else if (cle.startsWith("equipe.")) {
        equipeTouchee = true;
        if (valeur) equipe.push(cle.slice(7));
      }
      else if (cle.startsWith("fraction.")) {
        const id = cle.slice(9);
        const combattant = this.combat.combatants.get(id);
        if (!combattant) continue;

        const groupe = combattant.groupe;
        fractions[groupe] ??= { ...this.combat.pot(groupe).fractionnement };

        const rangs = lireFractionnement(valeur);
        if (rangs.join(" ") !== (fractions[groupe][id] ?? []).join(" ")) {
          fractions[groupe][id] = rangs;
          fractions[groupe].__modifie = true;
        }
      }
    }

    const equipeActuelle = this.combat.pot("heros").equipe;
    if (equipeTouchee && equipe.join("|") !== (equipeActuelle ?? []).join("|")) {
      // Un PJ retiré de l'équipe sort aussi de la main en cours de construction.
      for (const id of Object.keys(this.#selection.joueurs)) {
        if (!equipe.includes(id)) delete this.#selection.joueurs[id];
      }
      if (this.#selection.leaderId && !equipe.includes(this.#selection.leaderId)) {
        this.#selection.leaderId = null;
        this.#selection.leader = {};
      }
      await this.combat.definirEquipe(equipe);
    }

    for (const groupe of ["heros", "figurants"]) {
      const bloc = fractions[groupe];
      if (!bloc?.__modifie) continue;
      delete bloc.__modifie;
      await this.combat.appliquerAttribution(groupe, null, bloc);
    }

    this.render();
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** Publie le résultat d'une main dans le chat. */
  async #publier({ titre, leader, emplacements, contributions, des, roll, total }) {
    const resultats = roll.dice[0]?.results ?? [];
    const contenu = await foundry.applications.handlebars.renderTemplate(
      `${HEXAGON.path}/templates/chat/initiative.hbs`,
      {
        titre,
        leader,
        emplacements,
        contributions,
        des,
        resultats: resultats.map((d) => ({
          valeur: d.result,
          reussite: d.result >= HEXAGON.dice.seuilReussite
        })),
        total,
        seuil: HEXAGON.dice.seuilReussite
      }
    );

    await roll.toMessage(
      { speaker: ChatMessage.getSpeaker({ alias: titre }), content: contenu },
      { rollMode: game.settings.get("core", "rollMode") }
    );
  }

  /** Lance la main collective des PJ. */
  static async #onLancerPhase() {
    const combat = this.combat;
    const leader = combat.combatants.get(this.#selection.leaderId);

    if (!leader) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.Initiative.LeaderManquant"));
      return;
    }

    const manquants = HEXAGON.initiative.typesDuLeader.filter((type) => !this.#selection.leader[type]);
    if (manquants.length) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.Initiative.MainIncomplete"));
      return;
    }

    const des = this.#desDeLaMain();
    if (des < 1) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.Initiative.MainVide"));
      return;
    }

    const roll = new Roll(`${des}d${HEXAGON.dice.faces}`);
    await roll.evaluate();
    const resultats = roll.dice[0]?.results ?? [];
    const total = resultats.filter((d) => d.result >= HEXAGON.dice.seuilReussite).length;

    // Détail lisible de la main, pour la carte de chat et la mémoire de partie.
    const main = { leader: {}, joueurs: {} };
    const emplacements = [];
    for (const [type, itemId] of Object.entries(this.#selection.leader)) {
      const nom = leader.actor?.items.get(itemId)?.name ?? "";
      main.leader[type] = nom;
      emplacements.push({ label: game.i18n.localize(HEXAGON.typesItems[type]), nom });
    }

    const contributions = [];
    for (const [combattantId, itemId] of Object.entries(this.#selection.joueurs)) {
      const combattant = combat.combatants.get(combattantId);
      const item = combattant?.actor?.items.get(itemId);
      if (!combattant || !item) continue;
      main.joueurs[combattantId] = item.name;
      contributions.push({ nom: combattant.name, trait: item.name, rang: item.system.rang });
    }

    await combat.enregistrerPhase("heros", { leaderId: leader.id, main, des, total });
    await this.#publier({
      titre: game.i18n.localize("HEXAGON.Initiative.Titre"),
      leader: leader.name,
      emplacements,
      contributions,
      des,
      roll,
      total
    });

    this.render();
  }

  /** Alloue ou reprend un Succès du pot d'un camp. */
  static async #onAjusterPart(event, target) {
    const combat = this.combat;
    const id = target.dataset.combattant;
    const groupe = target.dataset.groupe ?? "heros";
    const delta = Number(target.dataset.delta ?? 1);

    const attribution = { ...combat.pot(groupe).attribution };
    const actuelle = Number(attribution[id] ?? 0);

    if (delta > 0 && combat.potRestant(groupe) < delta) {
      ui.notifications.warn(game.i18n.localize("HEXAGON.Initiative.PotVide"));
      return;
    }

    attribution[id] = Math.max(actuelle + delta, 0);
    await combat.appliquerAttribution(groupe, attribution);
    this.render();
  }

  /** Réécrit les rangs à partir de la répartition en cours. */
  static async #onAppliquer(event, target) {
    const groupe = target.dataset.groupe ?? "heros";
    await this.combat.appliquerAttribution(groupe, this.combat.pot(groupe).attribution);
    ui.notifications.info(game.i18n.localize("HEXAGON.Initiative.RangsAppliques"));
    this.render();
  }

  /** Clôt le tour : Succès consommés, rangs remis à zéro. */
  static async #onCloturerTour(event, target) {
    const groupe = target.dataset.groupe ?? "heros";
    await this.combat.cloturerTour(groupe);
    this.render();
  }
}

/** Ouvre la phase pour la rencontre en cours. */
export function ouvrirPhaseInitiative(combat = game.combat) {
  if (!combat) {
    ui.notifications.warn(game.i18n.localize("HEXAGON.Initiative.PasDeRencontre"));
    return null;
  }
  return new PhaseInitiative(combat).render(true);
}
