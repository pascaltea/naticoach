/* =========================================================================
 * Frise chronologique — repères d'histoire.
 * scope : "ch" = Suisse (fédéral, affiché pour tous les cantons)
 *         "VD" / "GE" / "NE" / "VS" = événements propres au canton.
 * La frise n'affiche que : Suisse + le canton choisi par l'utilisateur.
 * ========================================================================= */

const TIMELINE = [
  /* -------- Suisse (fédéral) -------- */
  { year: "1291", scope: "ch", title: "Pacte fédéral",
    desc: "Uri, Schwytz et Unterwald s'allient sur la prairie du Grütli : acte fondateur de la Confédération, fêté chaque 1er août." },
  { year: "1315", scope: "ch", title: "Bataille de Morgarten",
    desc: "Les Confédérés remportent une première grande victoire face aux Habsbourg." },
  { year: "1476", scope: "ch", title: "Guerres de Bourgogne",
    desc: "Victoires confédérées à Grandson et Morat contre Charles le Téméraire." },
  { year: "1798", scope: "ch", title: "République helvétique",
    desc: "La France impose une république centralisée ; fin de l'Ancienne Confédération." },
  { year: "1815", scope: "ch", title: "Congrès de Vienne",
    desc: "La neutralité suisse est reconnue ; Genève, le Valais et Neuchâtel rejoignent la Confédération (23 cantons)." },
  { year: "1848", scope: "ch", title: "Constitution fédérale",
    desc: "Après la guerre du Sonderbund, la Suisse devient un État fédéral moderne (Conseil fédéral, Parlement)." },
  { year: "1863", scope: "ch", title: "Fondation de la Croix-Rouge",
    desc: "Henri Dunant fonde la Croix-Rouge à Genève ; il recevra le tout premier prix Nobel de la paix." },
  { year: "1971", scope: "ch", title: "Vote des femmes (fédéral)",
    desc: "Les Suissesses obtiennent le droit de vote et d'éligibilité au niveau fédéral." },
  { year: "1979", scope: "ch", title: "Naissance du canton du Jura",
    desc: "Le Jura devient le 26e canton, en se séparant du canton de Berne." },
  { year: "2002", scope: "ch", title: "La Suisse entre à l'ONU",
    desc: "Par votation populaire, la Suisse adhère à l'Organisation des Nations Unies." },
  { year: "2008", scope: "ch", title: "Espace Schengen",
    desc: "La Suisse rejoint l'espace Schengen (libre circulation), sans adhérer à l'Union européenne." },

  /* -------- Vaud -------- */
  { year: "~15 av. J.-C.", scope: "VD", title: "Époque romaine",
    desc: "Rome fonde Aventicum (Avenches), capitale de l'Helvétie, ainsi que Lousonna (Lausanne) et Noviodunum (Nyon)." },
  { year: "1536", scope: "VD", title: "Berne conquiert Vaud",
    desc: "Berne s'empare du Pays de Vaud et y impose la Réforme. Vaud restera bernois jusqu'en 1798." },
  { year: "1723", scope: "VD", title: "Révolte du Major Davel",
    desc: "Le patriote vaudois tente de libérer Vaud de la tutelle bernoise ; il est décapité." },
  { year: "1798", scope: "VD", title: "Indépendance vaudoise",
    desc: "Le 24 janvier, le Pays de Vaud proclame son indépendance (République lémanique)." },
  { year: "1803", scope: "VD", title: "Vaud rejoint la Confédération",
    desc: "L'Acte de Médiation de Napoléon fait de Vaud un canton suisse à part entière (14 avril)." },
  { year: "1959", scope: "VD", title: "Vaud, pionnier du vote des femmes",
    desc: "Vaud est le premier canton à accorder le droit de vote aux femmes au niveau cantonal." },
  { year: "2007", scope: "VD", title: "Lavaux au patrimoine de l'UNESCO",
    desc: "Les terrasses viticoles de Lavaux, entre Lausanne et Montreux, sont inscrites à l'UNESCO." },
  { year: "2019", scope: "VD", title: "Fête des Vignerons",
    desc: "La Fête des Vignerons de Vevey (patrimoine immatériel de l'UNESCO) rassemble des centaines de milliers de visiteurs." },

  /* -------- Genève -------- */
  { year: "1536", scope: "GE", title: "La Réforme à Genève",
    desc: "Genève adopte la Réforme ; Jean Calvin en fait la « Rome protestante »." },
  { year: "1602", scope: "GE", title: "L'Escalade",
    desc: "Dans la nuit du 11 au 12 décembre, Genève repousse l'attaque du duc de Savoie. Fêté chaque 12 décembre." },
  { year: "1815", scope: "GE", title: "Genève rejoint la Confédération",
    desc: "Après l'entrée des troupes suisses au Port-Noir (1814), Genève devient un canton suisse." },
  { year: "1920", scope: "GE", title: "La Société des Nations",
    desc: "La SDN s'installe à Genève : c'est le début de la « Genève internationale »." },
  { year: "1946", scope: "GE", title: "Siège européen de l'ONU",
    desc: "L'ONU installe son siège européen à Genève (Palais des Nations)." },

  /* -------- Neuchâtel -------- */
  { year: "1707", scope: "NE", title: "Neuchâtel à la Prusse",
    desc: "La principauté de Neuchâtel passe au roi de Prusse." },
  { year: "1815", scope: "NE", title: "Neuchâtel rejoint la Confédération",
    desc: "Neuchâtel entre dans la Confédération — tout en restant une principauté prussienne (cas unique en Suisse)." },
  { year: "1848", scope: "NE", title: "La République neuchâteloise",
    desc: "La révolution met fin à la principauté : Neuchâtel devient une République." },
  { year: "1849", scope: "NE", title: "Vote des étrangers",
    desc: "La Constitution accorde le droit de vote communal aux étrangers — une première en Suisse." },
  { year: "2009", scope: "NE", title: "Urbanisme horloger à l'UNESCO",
    desc: "La Chaux-de-Fonds et Le Locle, villes de l'horlogerie, sont inscrites au patrimoine mondial." },

  /* -------- Valais -------- */
  { year: "1802", scope: "VS", title: "République du Valais",
    desc: "Éphémère République indépendante du Valais (République rhodanienne)." },
  { year: "1810", scope: "VS", title: "Annexion française",
    desc: "Napoléon annexe le Valais : il devient le département du Simplon." },
  { year: "1815", scope: "VS", title: "Le Valais rejoint la Confédération",
    desc: "Le Valais devient un canton suisse à part entière (23 cantons)." },
  { year: "1865", scope: "VS", title: "Première ascension du Cervin",
    desc: "Edward Whymper gravit le Cervin depuis Zermatt ; la descente tourne au drame." },
  { year: "1964", scope: "VS", title: "Tunnel du Grand-Saint-Bernard",
    desc: "Ouverture du premier tunnel routier des Alpes, reliant le Valais à l'Italie." },
];

if (typeof module !== "undefined") { module.exports = { TIMELINE }; }
