import { HEXAGON } from "../config.mjs";

/**
 * Construit un pool à partir d'une liste de Traits (Items) et de modificateurs.
 * Chaque spécialité engagée retire des dés — la contrepartie (les réussites
 * offertes) est appliquée au moment du jet, pas ici.
 *
 * @param {Item[]} traits         Traits sélectionnés.
 * @param {number} modificateur   Dés ajoutés ou retirés (équipement, circonstances).
 * @param {number} nbSpecialites  Nombre de spécialités engagées.
 */
export function construirePool(traits = [], modificateur = 0, nbSpecialites = 0) {
  const detail = traits.map((t) => ({ nom: t.name, rang: t.system.rang ?? 0 }));
  const coutSpecialites = nbSpecialites * HEXAGON.specialite.coutEnDes;
  const brut = detail.reduce((total, t) => total + t.rang, 0) + modificateur - coutSpecialites;
  const des = Math.clamp(brut, HEXAGON.dice.poolMinimum, HEXAGON.dice.poolMaximum);
  return { des, detail, modificateur, nbSpecialites, coutSpecialites, brut };
}

/** Réussites offertes par les spécialités engagées. */
export function reussitesOffertes(nbSpecialites = 0) {
  return nbSpecialites * HEXAGON.specialite.reussitesOffertes;
}

/**
 * Lance un pool de d6 et publie le résultat dans le chat.
 *
 * @param {object} options
 * @param {number} options.des            Nombre de dés lancés.
 * @param {number} [options.difficulte]   Réussites à atteindre.
 * @param {string} [options.label]        Intitulé du jet.
 * @param {Actor}  [options.actor]        Acteur à l'origine du jet.
 * @param {object[]} [options.detail]     Traits ayant composé le pool.
 * @param {string[]} [options.specialites] Noms des spécialités engagées.
 * @returns {Promise<Roll>}
 */
export async function lancerPool({
  des = 1,
  difficulte = 1,
  label = "",
  actor = null,
  detail = [],
  specialites = []
} = {}) {
  const nb = Math.clamp(Math.round(des), HEXAGON.dice.poolMinimum, HEXAGON.dice.poolMaximum);
  const roll = new Roll(`${nb}d${HEXAGON.dice.faces}`);
  await roll.evaluate();

  const des6 = roll.dice[0]?.results ?? [];
  const reussitesDes = des6.filter((d) => d.result >= HEXAGON.dice.seuilReussite).length;
  const auto = reussitesOffertes(specialites.length);
  const reussites = reussitesDes + auto;
  const eclats = des6.filter((d) => d.result === HEXAGON.dice.faceEclat).length;
  const marge = reussites - difficulte;

  const contenu = await renderTemplate(`${HEXAGON.path}/templates/chat/pool.hbs`, {
    label,
    des: nb,
    detail,
    specialites,
    resultats: des6.map((d) => ({
      valeur: d.result,
      reussite: d.result >= HEXAGON.dice.seuilReussite,
      eclat: d.result === HEXAGON.dice.faceEclat
    })),
    reussitesDes,
    auto,
    reussites,
    eclats,
    difficulte,
    marge,
    succes: marge >= 0,
    seuil: HEXAGON.dice.seuilReussite
  });

  await roll.toMessage(
    {
      speaker: ChatMessage.getSpeaker({ actor }),
      content: contenu,
      flags: {
        [HEXAGON.id]: { reussites, reussitesDes, auto, eclats, difficulte, marge }
      }
    },
    { rollMode: game.settings.get("core", "rollMode") }
  );

  return roll;
}
