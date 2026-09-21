import { HEXAGON } from "../config.mjs";
import { renderTemplate } from "../helpers.mjs";

/**
 * Construit un pool.
 *
 * Trois choses retirent des dés et rendent des réussites acquises ou de la
 * certitude : les spécialités, les dés sécurisés, et à l'inverse les dés
 * achetés en ajoutent. Tout passe par ici pour que la feuille et le jet
 * affichent exactement le même chiffre.
 *
 * @param {Item[]} traits Traits sélectionnés.
 * @param {object} [options]
 * @param {number} [options.modificateur]  Dés de circonstance.
 * @param {number} [options.specialites]   Spécialités engagées.
 * @param {number} [options.desAchetes]    Dés payés en Audace.
 * @param {number} [options.desSecurises]  Dés convertis en réussites, payés en Audace.
 */
export function construirePool(
  traits = [],
  { modificateur = 0, specialites = 0, desAchetes = 0, desSecurises = 0 } = {}
) {
  const detail = traits.map((t) => ({ nom: t.name, rang: t.system.rang ?? 0 }));
  const rangs = detail.reduce((total, t) => total + t.rang, 0);

  const brut =
    rangs +
    modificateur +
    desAchetes -
    desSecurises -
    specialites * HEXAGON.specialite.coutEnDes;

  const des = Math.clamp(brut, HEXAGON.dice.poolMinimum, HEXAGON.dice.poolMaximum);
  const auto = specialites * HEXAGON.specialite.reussitesOffertes + desSecurises;
  const coutAudace =
    desAchetes * HEXAGON.audace.coutDeAchete + desSecurises * HEXAGON.audace.coutDeSecurise;

  return { des, detail, modificateur, specialites, desAchetes, desSecurises, auto, coutAudace, brut };
}

/** Réussites acquises avant même de lancer. */
export function reussitesOffertes(nbSpecialites = 0, desSecurises = 0) {
  return nbSpecialites * HEXAGON.specialite.reussitesOffertes + desSecurises;
}

/**
 * Lance un pool de d6 et publie le résultat dans le chat.
 *
 * @param {object} options
 * @param {number} options.des             Nombre de dés effectivement lancés.
 * @param {number} [options.difficulte]    Réussites à atteindre.
 * @param {string} [options.label]         Intitulé du jet.
 * @param {Actor}  [options.actor]         Acteur à l'origine du jet.
 * @param {object[]} [options.detail]      Traits ayant composé le pool.
 * @param {string[]} [options.specialites] Noms des spécialités engagées.
 * @param {number} [options.desAchetes]    Dés ajoutés par dépense d'Audace.
 * @param {number} [options.desSecurises]  Dés sécurisés par dépense d'Audace.
 * @returns {Promise<Roll>}
 */
export async function lancerPool({
  des = 1,
  difficulte = 1,
  label = "",
  actor = null,
  detail = [],
  specialites = [],
  desAchetes = 0,
  desSecurises = 0
} = {}) {
  const nb = Math.clamp(Math.round(des), HEXAGON.dice.poolMinimum, HEXAGON.dice.poolMaximum);
  const roll = new Roll(`${nb}d${HEXAGON.dice.faces}`);
  await roll.evaluate();

  const des6 = roll.dice[0]?.results ?? [];
  const reussitesDes = des6.filter((d) => d.result >= HEXAGON.dice.seuilReussite).length;
  const auto = reussitesOffertes(specialites.length, desSecurises);
  const reussites = reussitesDes + auto;
  const eclats = des6.filter((d) => d.result === HEXAGON.dice.faceEclat).length;
  const marge = reussites - difficulte;

  const contenu = await renderTemplate(`${HEXAGON.path}/templates/chat/pool.hbs`, {
    label,
    des: nb,
    detail,
    specialites,
    desAchetes,
    desSecurises,
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
        [HEXAGON.id]: { reussites, reussitesDes, auto, eclats, difficulte, marge, desAchetes, desSecurises }
      }
    },
    { rollMode: game.settings.get("core", "rollMode") }
  );

  return roll;
}
