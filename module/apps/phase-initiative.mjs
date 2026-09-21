import { HEXAGON } from "../config.mjs";
import { validerFractionnement, lireFractionnement } from "../documents/combat.mjs";
import { signalerLimite } from "../helpers.mjs";

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
      cloturerTour: PhaseInitiative.#onCloturerTour,
      reinitialiser: PhaseInitiative.#onReinitialiser
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

      // Les rangs ne sont reportés qu'à l'application : on signale l'écart
      // entre ce qui est préparé ici et ce qu'affiche la barre de combat.
      const lignes = [c.initiative, ...combat.combatants
        .filter((l) => l.estRangSupplementaire && l.getFlag(HEXAGON.id, "rangSupplementaire") === c.id)
        .map((l) => l.initiative)]
        .filter((v) => v !== null && v !== undefined)
        .sort((a, b) => b - a);

      return {
        id: c.id,
        groupe,
        nom: c.name,
        part,
        rang,
        enAttente: lignes.join(",") !== rangs.join(","),
        saisie: fraction.join(" "),
        rangs,
        fractionne: rangs.length > 1,
        erreur: controle.valide ? null : game.i18n.localize(controle.raison)
      };
    });
  }

  /**
   * Une erreur de préparation empêcherait le rendu et ferait disparaître la
   * fenêtre. On la signale, et on affiche une fenêtre vide mais ouverte.
   */
  async _prepareContext(options) {
    try {
      return await this.#construireContexte();
    } catch (erreur) {
      console.error("Hexagon Universe | phase d'initiative", erreur);
      ui.notifications.error(game.i18n.localize("HEXAGON.Initiative.Erreur"));
      return {
        presents: [],
        fractionnementAutorise: false,
        pj: { candidats: [], leader: null, autres: [], repartition: [], pot: { total: 0 }, phaseFaite: false, desDeLaMain: 0 }
      };
    }
  }

  async #construireContexte() {
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
        repartition: this.#repartition("heros"),
        get aAppliquer() {
          return this.repartition.some((r) => r.enAttente);
        }
      }
    };
  }

  /* -------------------------------------------- */
  /*  Formulaire                                  */
  /* -------------------------------------------- */

  /**
   * Point d'entrée du formulaire. Toute erreur est rapportée plutôt que
   * propagée : une exception ne doit jamais faire disparaître la fenêtre.
   */
  static async #onChangement(event, form, formData) {
    try {
      await this.#traiterChangement(event, formData);
    } catch (erreur) {
      console.error("Hexagon Universe | phase d'initiative", erreur);
      ui.notifications.error(game.i18n.localize("HEXAGON.Initiative.Erreur"));
    }
    this.render();
  }

  /**
   * Le formulaire renvoie tous ses champs à chaque modification. On ne traite
   * donc que celui qui vient de changer : sinon, choisir un leader passerait
   * aussi pour une modification de l'équipe, et réécrirait la rencontre.
   */
  async #traiterChangement(event, formData) {
    // Aplatissement défensif : les clés pointées restent lisibles, que la
    // version de Foundry les rende à plat ou déjà développées.
    const donnees = foundry.utils.flattenObject(formData.object ?? {});
    const champ = event?.target?.name ?? "";

    if (champ === "leaderId") {
      const leaderId = donnees.leaderId || null;
      if (leaderId !== this.#selection.leaderId) {
        this.#selection.leaderId = leaderId;
        // Changer de leader invalide sa main, pas celle des autres joueurs.
        this.#selection.leader = {};
        if (leaderId) delete this.#selection.joueurs[leaderId];
      }
      return;
    }

    if (champ.startsWith("leader.")) {
      this.#selection.leader[champ.slice(7)] = donnees[champ] ?? "";
      return;
    }

    if (champ.startsWith("joueur.")) {
      this.#selection.joueurs[champ.slice(7)] = donnees[champ] ?? "";
      return;
    }

    if (champ.startsWith("equipe.")) {
      await this.#majEquipe(donnees);
      return;
    }

    if (champ.startsWith("fraction.")) {
      const id = champ.slice(9);
      const combattant = this.combat.combatants.get(id);
      if (!combattant) return;

      const groupe = combattant.groupe;
      const fractionnement = { ...this.combat.pot(groupe).fractionnement };
      const rangs = lireFractionnement(donnees[champ]);
      if (rangs.join(" ") === (fractionnement[id] ?? []).join(" ")) return;

      fractionnement[id] = rangs;
      await this.combat.enregistrerRepartition(groupe, { fractionnement });
    }
  }

  /** Relit l'ensemble des cases de l'équipe et n'écrit qu'en cas de différence réelle. */
  async #majEquipe(donnees) {
    const equipe = Object.entries(donnees)
      .filter(([cle, valeur]) => cle.startsWith("equipe.") && valeur)
      .map(([cle]) => cle.slice(7));

    // Tant qu'aucune liste n'est posée, l'équipe effective est l'ensemble des
    // héros présents : c'est à elle qu'on compare, pas à une liste vide.
    const posee = this.combat.pot("heros").equipe;
    const effective = Array.isArray(posee) ? posee : this.combat.herosPresents.map((c) => c.id);
    const identique = equipe.length === effective.length && equipe.every((id) => effective.includes(id));
    if (identique) return;

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

  /**
   * Alloue ou reprend un Succès du pot. La répartition est enregistrée, mais
   * rien n'est écrit dans la barre de combat avant « Appliquer les rangs ».
   */
  static async #onAjusterPart(event, target) {
    const combat = this.combat;
    const id = target.dataset.combattant;
    const groupe = target.dataset.groupe ?? "heros";
    const delta = Number(target.dataset.delta ?? 1);

    const attribution = { ...combat.pot(groupe).attribution };
    const actuelle = Number(attribution[id] ?? 0);
    const visee = actuelle + delta;

    if (visee < 0) {
      signalerLimite(0, actuelle + combat.potRestant(groupe));
      return;
    }
    if (delta > 0 && combat.potRestant(groupe) < delta) {
      ui.notifications.error(game.i18n.localize("HEXAGON.Initiative.PotVide"));
      return;
    }

    attribution[id] = visee;
    await combat.enregistrerRepartition(groupe, { attribution });
    this.render();
  }

  /** Réécrit les rangs à partir de la répartition en cours. */
  static async #onAppliquer(event, target) {
    const groupe = target.dataset.groupe ?? "heros";
    await this.combat.appliquerAttribution(groupe);
    ui.notifications.info(game.i18n.localize("HEXAGON.Initiative.RangsAppliques"));
    this.render();
  }

  /** Remet l'initiative à blanc, après confirmation : l'opération est destructive. */
  static async #onReinitialiser() {
    const confirme = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("HEXAGON.Initiative.Reinitialiser") },
      content: `<p>${game.i18n.localize("HEXAGON.Initiative.ReinitialiserQuestion")}</p>`
    });
    if (!confirme) return;

    await this.combat.reinitialiserInitiative();
    this.#selection = { leaderId: null, leader: {}, joueurs: {} };
    ui.notifications.info(game.i18n.localize("HEXAGON.Initiative.Reinitialisee"));
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
