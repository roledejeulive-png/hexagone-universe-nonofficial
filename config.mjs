/**
 * Configuration centrale.
 * Tout ce qui touche aux valeurs chiffrées du système est ici, pour être ajusté
 * sans toucher au reste du code (voir README, section « Ce qu'il faut caler »).
 */
export const HEXAGON = {};

/** Identifiant du système, réutilisé partout (flags, chemins de templates, i18n). */
HEXAGON.id = "hexagon-universe";

/** Chemin racine des templates. */
HEXAGON.path = `systems/${HEXAGON.id}`;

/** Résolution : on lance N d6, chaque dé >= seuil est une réussite. */
HEXAGON.dice = {
  faces: 6,
  seuilReussite: 3,
  /** Un 6 est compté à part : sert d'accroche pour une règle maison (relance, effet bonus…). */
  faceEclat: 6,
  /** Taille de pool minimale quand aucun Trait ne s'applique. */
  poolMinimum: 1,
  /** Taille de pool maximale acceptée par le lanceur (garde-fou anti-faute de frappe). */
  poolMaximum: 30
};

/** Difficultés proposées dans le dialogue de jet, en nombre de réussites à atteindre. */
HEXAGON.difficultes = {
  1: "HEXAGON.Difficulte.Routine",
  2: "HEXAGON.Difficulte.Simple",
  3: "HEXAGON.Difficulte.Delicate",
  4: "HEXAGON.Difficulte.Serieuse",
  5: "HEXAGON.Difficulte.Ardue",
  6: "HEXAGON.Difficulte.Redoutable",
  7: "HEXAGON.Difficulte.Heroique",
  8: "HEXAGON.Difficulte.Titanesque",
  9: "HEXAGON.Difficulte.Legendaire",
  10: "HEXAGON.Difficulte.Cosmique"
};

/**
 * Spécialité d'un Talent : elle retire des dés du pool et offre en échange
 * des réussites acquises d'avance. Un dé contre une réussite par défaut.
 */
HEXAGON.specialite = {
  coutEnDes: 1,
  reussitesOffertes: 1
};

/** Types d'Items qui comptent comme des Traits : ils entrent dans les pools. */
HEXAGON.typesTraits = ["motivation", "talent", "pouvoir"];

/** Rang maximum, par type de Trait. */
HEXAGON.rangMax = {
  motivation: 3,
  talent: 3,
  pouvoir: 10,
  /** Dés apportés par un équipement : de 0 à 3. */
  equipement: 3
};

/** Plafond applicable à un type donné, avec repli sur 5 pour un type inconnu. */
HEXAGON.rangMaxDe = (type) => HEXAGON.rangMax[type] ?? 5;

/** Libellés des types d'Items. */
HEXAGON.typesItems = {
  motivation: "HEXAGON.Type.Motivation",
  talent: "HEXAGON.Type.Talent",
  pouvoir: "HEXAGON.Type.Pouvoir",
  equipement: "HEXAGON.Type.Equipement"
};
