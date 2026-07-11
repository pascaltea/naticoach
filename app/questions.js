/* =========================================================================
 * Banque de questions — Naturalisation suisse
 * Chaque question apporte de la valeur : explication de contexte + illustration.
 * illustration = clé d'un dessin SVG défini dans illustrations.js (ou null).
 * ========================================================================= */

const CATEGORIES = {
  histoire:    { label: "Histoire",              icon: "📜", color: "#B4472E" },
  geo:         { label: "Géographie",            icon: "🏔️", color: "#2E7D8C" },
  institutions:{ label: "Institutions & Politique", icon: "🏛️", color: "#4A5DB0" },
  societe:     { label: "Société & Vie quotidienne", icon: "🤝", color: "#C08A2E" },
  symboles:    { label: "Symboles & Culture",    icon: "🇨🇭", color: "#D8232A" },
  communal:    { label: "Questions communales 2026", icon: "📍", color: "#6B4EAA", premium: true },
};

const QUESTIONS = [
  /* ---------------------- HISTOIRE ---------------------- */
  {
    id: "h1", cat: "histoire",
    q: "En quelle année se situe la fondation légendaire de la Confédération suisse ?",
    options: ["1191", "1291", "1315", "1848"],
    answer: 1,
    explanation:
      "Le Pacte fédéral de 1291 unit les trois cantons primitifs Uri, Schwyz et Unterwald. " +
      "C'est la date symbolique de naissance de la Suisse : elle est célébrée chaque 1er août, " +
      "la fête nationale. L'État fédéral moderne, lui, naît bien plus tard, en 1848.",
    illustration: "rutli",
  },
  {
    id: "h2", cat: "histoire",
    q: "Quels sont les trois cantons dits « primitifs » à l'origine de la Confédération ?",
    options: ["Berne, Zurich, Lucerne", "Uri, Schwyz, Unterwald", "Genève, Vaud, Valais", "Tessin, Grisons, Glaris"],
    answer: 1,
    explanation:
      "Uri, Schwyz et Unterwald (Waldstätten) scellent le pacte de 1291 sur la prairie du Grütli. " +
      "Le nom même du pays, « Suisse », vient du canton de Schwyz.",
    illustration: null,
  },
  {
    id: "h3", cat: "histoire",
    q: "En quelle année la Suisse moderne, avec sa Constitution fédérale, est-elle fondée ?",
    options: ["1291", "1798", "1848", "1918"],
    answer: 2,
    explanation:
      "La Constitution fédérale de 1848 transforme une alliance de cantons en un véritable État fédéral, " +
      "après la brève guerre du Sonderbund (1847). Elle crée le Conseil fédéral et le Parlement bicaméral " +
      "encore en place aujourd'hui.",
    illustration: null,
  },
  {
    id: "h4", cat: "histoire",
    q: "Qui a fondé la Croix-Rouge, à Genève en 1863 ?",
    options: ["Guillaume Tell", "Henri Dunant", "Nicolas de Flüe", "Le général Guisan"],
    answer: 1,
    explanation:
      "Henri Dunant, bouleversé par la bataille de Solférino, fonde la Croix-Rouge à Genève en 1863. " +
      "Il reçoit le tout premier prix Nobel de la paix en 1901. L'emblème reprend, en couleurs inversées, " +
      "le drapeau suisse.",
    illustration: "croixrouge",
  },
  {
    id: "h5", cat: "histoire",
    q: "En quelle année les femmes obtiennent-elles le droit de vote au niveau fédéral ?",
    options: ["1948", "1971", "1981", "1991"],
    answer: 1,
    explanation:
      "Le droit de vote et d'éligibilité des femmes au niveau fédéral est accepté en votation le 7 février 1971. " +
      "Le dernier canton à l'accorder au niveau cantonal fut Appenzell Rhodes-Intérieures, contraint par le " +
      "Tribunal fédéral en 1990.",
    illustration: null,
  },

  /* ---------------------- GÉOGRAPHIE ---------------------- */
  {
    id: "g1", cat: "geo",
    q: "Combien la Suisse compte-t-elle de cantons ?",
    options: ["20", "23", "26", "29"],
    answer: 2,
    explanation:
      "La Suisse compte 26 cantons. Six d'entre eux sont historiquement des « demi-cantons » " +
      "(Obwald, Nidwald, Bâle-Ville, Bâle-Campagne, Appenzell Rhodes-Extérieures et Rhodes-Intérieures), " +
      "ce qui a une incidence sur leur poids au Conseil des États et lors de la double majorité.",
    illustration: "carte",
  },
  {
    id: "g2", cat: "geo",
    q: "Quelle ville est le siège des autorités fédérales (la « ville fédérale ») ?",
    options: ["Zurich", "Genève", "Berne", "Lucerne"],
    answer: 2,
    explanation:
      "Contrairement à une idée reçue, la Suisse n'a pas de « capitale » inscrite dans la Constitution. " +
      "Berne est la « ville fédérale » : elle accueille le Parlement, le Conseil fédéral et l'administration. " +
      "Zurich est la plus grande ville, mais n'a pas ce rôle politique.",
    illustration: null,
  },
  {
    id: "g3", cat: "geo",
    q: "Quel est le point culminant de la Suisse ?",
    options: ["Le Cervin", "La Jungfrau", "La Pointe Dufour", "Le Mont-Blanc"],
    answer: 2,
    explanation:
      "La Pointe Dufour (Dufourspitze), dans le massif du Mont Rose (Valais), culmine à 4 634 m. " +
      "Le Cervin (4 478 m) est plus célèbre par sa silhouette, mais moins haut. Le Mont-Blanc, lui, " +
      "est en France.",
    illustration: "montagne",
  },
  {
    id: "g4", cat: "geo",
    q: "Combien de langues nationales la Suisse reconnaît-elle ?",
    options: ["2", "3", "4", "5"],
    answer: 2,
    explanation:
      "Quatre langues nationales : l'allemand, le français, l'italien et le romanche. " +
      "Les trois premières sont langues officielles de la Confédération ; le romanche l'est " +
      "partiellement, pour les échanges avec les personnes romanchophones (surtout aux Grisons).",
    illustration: "langues",
  },
  {
    id: "g5", cat: "geo",
    q: "Avec combien de pays la Suisse partage-t-elle une frontière ?",
    options: ["3", "4", "5", "6"],
    answer: 2,
    explanation:
      "Cinq voisins : l'Allemagne, la France, l'Italie, l'Autriche et le Liechtenstein. " +
      "Cette position centrale a nourri le rôle de la Suisse comme terre de neutralité et de diplomatie.",
    illustration: null,
  },

  /* ---------------------- INSTITUTIONS & POLITIQUE ---------------------- */
  {
    id: "i1", cat: "institutions",
    q: "Combien de membres compte le Conseil fédéral (gouvernement) ?",
    options: ["5", "7", "9", "12"],
    answer: 1,
    explanation:
      "Le Conseil fédéral compte 7 membres, élus par l'Assemblée fédérale. Il fonctionne de façon " +
      "collégiale : les décisions sont prises ensemble et défendues par tous. Le président de la " +
      "Confédération change chaque année ; il n'est qu'un « premier parmi ses pairs ».",
    illustration: "conseil",
  },
  {
    id: "i2", cat: "institutions",
    q: "De quelles deux chambres se compose l'Assemblée fédérale ?",
    options: [
      "Sénat et Chambre des députés",
      "Conseil national et Conseil des États",
      "Conseil fédéral et Tribunal fédéral",
      "Grand Conseil et Conseil d'État",
    ],
    answer: 1,
    explanation:
      "Le Parlement est bicaméral : le Conseil national (200 sièges) représente le peuple " +
      "proportionnellement à la population ; le Conseil des États (46 sièges) représente les cantons, " +
      "à raison de 2 par canton et 1 par demi-canton. Les deux chambres ont un pouvoir égal.",
    illustration: "parlement",
  },
  {
    id: "i3", cat: "institutions",
    q: "Combien de signatures faut-il réunir pour une initiative populaire fédérale ?",
    options: ["10 000", "50 000", "100 000", "500 000"],
    answer: 2,
    explanation:
      "Une initiative populaire demande une modification de la Constitution : il faut 100 000 signatures " +
      "valables en 18 mois. À ne pas confondre avec le référendum facultatif (50 000 signatures en 100 jours) " +
      "qui permet de contester une loi votée par le Parlement.",
    illustration: null,
  },
  {
    id: "i4", cat: "institutions",
    q: "Pour modifier la Constitution en votation, quelle majorité est nécessaire ?",
    options: [
      "La majorité du peuple uniquement",
      "La majorité des cantons uniquement",
      "La double majorité : du peuple ET des cantons",
      "Les deux tiers du Parlement",
    ],
    answer: 2,
    explanation:
      "La « double majorité » protège les petits cantons : un changement constitutionnel doit être accepté " +
      "à la fois par la majorité des votants du pays et par la majorité des cantons. Un projet peut donc être " +
      "refusé même s'il obtient une majorité populaire.",
    illustration: null,
  },
  {
    id: "i5", cat: "institutions",
    q: "Où siège le Tribunal fédéral, plus haute instance judiciaire du pays ?",
    options: ["Berne", "Lausanne", "Zurich", "Bellinzone"],
    answer: 1,
    explanation:
      "Le Tribunal fédéral siège à Lausanne (avec une partie à Lucerne). Répartir les institutions entre " +
      "les villes et les régions linguistiques est typiquement suisse : cela équilibre le pouvoir et " +
      "respecte la diversité du pays.",
    illustration: null,
  },
  {
    id: "i6", cat: "institutions",
    q: "La Suisse est-elle membre de l'Union européenne ?",
    options: [
      "Oui, depuis 1992",
      "Oui, depuis 2002",
      "Non, elle collabore via des accords bilatéraux",
      "Non, mais elle utilise l'euro",
    ],
    answer: 2,
    explanation:
      "La Suisse n'est pas membre de l'UE. Elle a refusé l'Espace économique européen en 1992 et règle ses " +
      "relations par des accords bilatéraux. Elle a rejoint l'ONU en 2002 et l'espace Schengen en 2008, " +
      "mais garde le franc suisse comme monnaie.",
    illustration: null,
  },

  /* ---------------------- SOCIÉTÉ & VIE QUOTIDIENNE ---------------------- */
  {
    id: "s1", cat: "societe",
    q: "Sur quel principe repose le système de prévoyance vieillesse suisse ?",
    options: [
      "Un système à trois piliers",
      "Une caisse unique de l'État",
      "L'épargne privée uniquement",
      "Les seules cotisations de l'employeur",
    ],
    answer: 0,
    explanation:
      "Le système des « trois piliers » : 1er pilier l'AVS (État, minimum vital, obligatoire), " +
      "2e pilier la prévoyance professionnelle (LPP, via l'employeur), 3e pilier l'épargne privée " +
      "facultative et fiscalement avantagée. Ensemble, ils assurent le niveau de vie à la retraite.",
    illustration: "piliers",
  },
  {
    id: "s2", cat: "societe",
    q: "L'assurance-maladie de base est-elle obligatoire en Suisse ?",
    options: [
      "Non, elle est facultative",
      "Oui, pour toute personne domiciliée en Suisse",
      "Seulement pour les salariés",
      "Seulement pour les Suisses",
    ],
    answer: 1,
    explanation:
      "L'assurance-maladie de base (LAMal) est obligatoire pour toute personne résidant en Suisse, " +
      "à souscrire dans les 3 mois suivant l'arrivée. Chacun choisit sa caisse ; des subsides existent " +
      "pour les revenus modestes.",
    illustration: null,
  },
  {
    id: "s3", cat: "societe",
    q: "À quel âge devient-on majeur et électeur au niveau fédéral en Suisse ?",
    options: ["16 ans", "18 ans", "20 ans", "21 ans"],
    answer: 1,
    explanation:
      "La majorité civile et les droits politiques fédéraux s'acquièrent à 18 ans. Quelques cantons " +
      "(comme Glaris) accordent le droit de vote cantonal dès 16 ans, illustrant l'autonomie cantonale.",
    illustration: null,
  },
  {
    id: "s4", cat: "societe",
    q: "Que faut-il généralement respecter dans un immeuble le dimanche et la nuit ?",
    options: [
      "Rien de particulier",
      "Les heures de repos (bruit, lessive, etc.)",
      "Une interdiction totale de sortir",
      "Le silence uniquement le 1er août",
    ],
    answer: 1,
    explanation:
      "Le respect du repos nocturne (souvent 22h–6h/7h) et dominical fait partie des règles de vie " +
      "communes. Beaucoup de règlements limitent le bruit, parfois la lessive ou la douche tard le soir. " +
      "Ce civisme du quotidien est très valorisé en Suisse.",
    illustration: null,
  },

  /* ---------------------- SYMBOLES & CULTURE ---------------------- */
  {
    id: "y1", cat: "symboles",
    q: "Quelle est la particularité du drapeau national suisse ?",
    options: [
      "Il est rectangulaire",
      "Il est carré, croix blanche sur fond rouge",
      "Il porte trois bandes horizontales",
      "Il comporte 26 étoiles",
    ],
    answer: 1,
    explanation:
      "Le drapeau suisse est carré (cas unique parmi les États souverains avec le Vatican) : une croix " +
      "blanche sur fond rouge. Sur les navires et à l'ONU, une version rectangulaire est utilisée. " +
      "La croix inversée a donné l'emblème de la Croix-Rouge.",
    illustration: "drapeau",
  },
  {
    id: "y2", cat: "symboles",
    q: "Quelle est la monnaie officielle de la Suisse ?",
    options: ["L'euro", "Le franc suisse (CHF)", "Le franc CFA", "La couronne"],
    answer: 1,
    explanation:
      "Le franc suisse (CHF) est la monnaie officielle. Réputé stable, il joue un rôle de valeur refuge " +
      "internationale. La Suisse a conservé sa monnaie en refusant d'adhérer à l'UE et à l'euro.",
    illustration: null,
  },
  {
    id: "y3", cat: "symboles",
    q: "Quel héros légendaire est associé à la lutte pour la liberté des Suisses ?",
    options: ["Guillaume Tell", "Winkelried seul", "Jean Calvin", "Le général Guisan"],
    answer: 0,
    explanation:
      "Guillaume Tell, arbalétrier légendaire du canton d'Uri, aurait refusé de saluer le chapeau du " +
      "bailli Gessler et transpercé une pomme sur la tête de son fils. Symbole de la résistance à " +
      "l'oppression, il fut popularisé par la pièce de Schiller.",
    illustration: "tell",
  },
  {
    id: "y4", cat: "symboles",
    q: "Quand a lieu la fête nationale suisse ?",
    options: ["Le 14 juillet", "Le 1er août", "Le 1er mai", "Le 6 décembre"],
    answer: 1,
    explanation:
      "Le 1er août commémore le Pacte de 1291. C'est un jour férié dans tout le pays, marqué par des feux, " +
      "des lampions, des discours et des feux d'artifice. C'est une date-clé à retenir pour la naturalisation.",
    illustration: null,
  },

  /* ---------------------- PREMIUM : COMMUNAL (verrouillé) ---------------------- */
  {
    id: "c1", cat: "communal", premium: true,
    q: "[Exemple] Quel est le nom du/de la président·e de votre commune ?",
    options: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
    answer: 0,
    explanation:
      "Les questions communales portent sur VOTRE commune : autorités, armoiries, histoire locale, " +
      "nombre d'habitants, sites remarquables… Elles sont personnalisées et mises à jour pour 2026 " +
      "dans la version Premium.",
    illustration: null,
  },
];

if (typeof module !== "undefined") { module.exports = { QUESTIONS, CATEGORIES }; }
