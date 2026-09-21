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
  seuilReussite: 4,
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

/**
 * Dépenses d'Audace au moment du jet. Deux usages, cumulables :
 *  — acheter un dé : un dé de plus dans le pool, avec son aléa ;
 *  — sécuriser un dé : un dé quitte le pool et devient une réussite acquise.
 * Le second ne change pas le total potentiel, il échange du hasard contre de
 * la certitude.
 */
HEXAGON.audace = {
  coutDeAchete: 1,
  coutDeSecurise: 1
};

/**
 * Phase d'initiative.
 *
 * Avant le premier tour, le groupe constitue une main collective : le leader
 * désigné pose un Trait de chaque type, puis chaque autre joueur ajoute un et
 * un seul Trait de son personnage. Le leader lance la main entière ; les
 * Succès obtenus forment un pot commun, réparti tour par tour.
 *
 * Chaque PJ conserve par ailleurs un Succès qui lui est propre, du seul fait
 * de sa présence : il agit même sans rien recevoir du pot.
 */
HEXAGON.initiative = {
  /** Types que le leader doit poser, un de chaque. */
  typesDuLeader: ["motivation", "talent", "pouvoir"],
  /** Traits apportés par chacun des autres joueurs. */
  traitsParJoueur: 1,
  /** Succès acquis par PJ, indépendant du pot. */
  succesAutomatique: 1,

  /**
   * Équivalent pour les figurants. À zéro, un figurant n'agit que s'il reçoit
   * une part du pot adverse constitué par le MJ.
   */
  succesAutomatiqueFigurant: 0,
  /**
   * Le pot se vide à mesure qu'il est dépensé. Passer à false pour qu'il soit
   * reconstitué à chaque tour au lieu d'être consommé.
   */
  potConsomme: true,

  /**
   * Actions multiples : un PJ peut fractionner son rang en plusieurs rangs
   * dont la somme égale celui de départ, à condition qu'ils soient tous
   * différents. Un rang de 6 donne 4 et 2, ou 3, 2 et 1 — jamais 3 et 3.
   */
  fractionnementAutorise: true
};

/** Combat des figurants, qui ne participent pas au pot. */
HEXAGON.combat = {
  formuleInitiative: "1d6",
  /** Dispositions de jeton utilisées comme camps. */
  camps: {
    "1": "HEXAGON.Combat.CampAllies",
    "0": "HEXAGON.Combat.CampNeutres",
    "-1": "HEXAGON.Combat.CampAdversaires",
    "-2": "HEXAGON.Combat.CampSecret"
  }
};

/**
 * Hommes de main.
 *
 * Un groupe est une seule entité technique. Sa Menace figure grossièrement son
 * effectif ; son Opposition, qui en découle, mesure son efficacité en scène
 * d'action : c'est le seuil à battre pour l'attaquer comme pour s'en défendre,
 * et c'est aussi son rang d'initiative.
 */
HEXAGON.hommesDeMain = {
  menaceMax: 12,
  oppositionMax: 6,
  /** Deux groupes qui fusionnent additionnent leur Menace, plafonnée ici. */
  menaceMaxFusion: 10
};

/**
 * Seconds couteaux : PNJ notables sans être majeurs. Même couple Menace /
 * Opposition que les hommes de main, à ceci près que l'Opposition est fixée
 * librement par le MJ au lieu de découler de la Menace.
 *
 * Renforts : un groupe d'hommes de main peut soutenir le PNJ. Les Menaces
 * s'additionnent alors, les Oppositions non — seule celle du PNJ compte — et
 * le PNJ gagne une action au rang d'initiative de l'Opposition du groupe.
 */
HEXAGON.secondCouteau = {
  menaceMax: 12,
  oppositionMax: 6,
  /**
   * En soutien, les pertes de Menace entament d'abord le groupe, le PNJ
   * n'encaissant que le débordement. Passer à false pour l'inverse.
   */
  pertesSurSoutienDabord: true
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
