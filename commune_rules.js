/* =========================================================================
 * Explications des questions COMMUNALES (canton de Vaud), générées à la volée.
 * Beaucoup de questions se répètent d'une commune à l'autre (institutions,
 * district, Municipalité, syndic…) : on leur donne une vraie explication civique.
 * Le trivia purement local reçoit une explication contextuelle avec la réponse.
 * ========================================================================= */
(function () {
  "use strict";

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();
  }
  function clean(a) { return String(a || "").replace(/^[«»\s]+|[«»\s]+$/g, "").trim(); }
  // élision : "de Eysins" -> "d'Eysins" (devant voyelle)
  function deC(c) { return /^[aeiouyàâäéèêëïîôöûü]/i.test(c) ? "d'" + c : "de " + c; }

  // Règles ordonnées : la première qui matche gagne. n = question normalisée,
  // a = bonne réponse (nettoyée), c = nom de la commune.
  const RULES = [
    // --- Questions « intrus » (négation) : à traiter en premier ---
    { t: (n) => /(n existe pas|a pas lieu|n est pas|pas limitrophe|jamais venu|n a jamais|n est jamais|jamais habite)/.test(n),
      e: (a, c) => `Réponse : ${a}. C'est l'« intrus », le seul élément qui ne correspond pas à ${c}.` },

    // --- Institutions communales (récurrentes et éducatives) ---
    { t: (n) => /quel district|dans quel district/.test(n),
      e: (a, c) => `${c} fait partie du ${/^district/i.test(a) ? a : "district de " + a}, l'un des 10 districts du canton de Vaud.` },
    { t: (n) => /combien de communes.*district/.test(n),
      e: (a) => `Ce district regroupe ${a} communes. Le canton de Vaud en compte 300, répartis en 10 districts.` },
    { t: (n) => /chef lieu.*district/.test(n),
      e: (a) => `Le chef-lieu de ce district est ${a} : la localité où siègent ses institutions.` },
    { t: (n) => /systeme (majoritaire|proportionnel)|selon quel systeme/.test(n),
      e: (a) => `L'élection se fait au système majoritaire (proportionnel dans certaines grandes communes). Réponse : ${a}.` },
    { t: (n) => /municipalite/.test(n) && /(qui elit|par qui|est elle elue|elue|elues|elu par)/.test(n),
      e: () => `La Municipalité est élue directement par les citoyens de la commune, au scrutin majoritaire.` },
    { t: (n) => /municipalite/.test(n) && /membre/.test(n),
      e: (a, c) => `La Municipalité — l'exécutif communal — compte ${a} membres à ${c}. Dans le canton de Vaud, elle en compte de 3 à 9 selon la commune.` },
    { t: (n) => (/municipalite/.test(n) && /pouvoir/.test(n)) || /pouvoir executif/.test(n),
      e: () => `La Municipalité détient le pouvoir exécutif : elle gouverne la commune et applique les décisions, comme un « gouvernement » local.` },
    { t: (n) => /municipalite/.test(n) && /(preside|dirige|debats|seances)/.test(n),
      e: (a, c) => `C'est le syndic qui préside la Municipalité et en dirige les séances : le « premier citoyen » ${deC(c)}.` },
    { t: (n) => /(role du syndic|qui est le syndic|premier citoyen|responsable de la commune|appelle t on le responsable)/.test(n),
      e: (a, c) => `Le syndic préside la Municipalité et dirige l'exécutif : c'est le « premier citoyen » ${deC(c)}.` },
    { t: (n) => /(dirige|preside).*seances du conseil|qui preside le conseil/.test(n),
      e: (a) => `Les séances sont présidées par ${a}, élu chaque année parmi les membres du conseil.` },
    { t: (n) => /conseil (communal|general)/.test(n) && /membre/.test(n),
      e: (a, c) => `Le conseil législatif ${deC(c)} compte ${a} membres. C'est l'organe qui vote le budget et les règlements communaux.` },
    { t: (n) => /legislatif/.test(n),
      e: (a) => `L'organe législatif communal est ${a} : le Conseil communal (élu) dans les grandes communes, le Conseil général (tous les citoyens) dans les petites.` },
    { t: (n) => /conseil general/.test(n),
      e: (a) => `Le Conseil général réunit l'ensemble des citoyens actifs et fait office de législatif dans les petites communes. Réponse : ${a}.` },
    { t: (n) => /legislature/.test(n),
      e: (a) => `Dans le canton de Vaud, une législature communale dure 5 ans (réponse : ${a}).` },
    { t: (n) => /administration/.test(n),
      e: (a, c) => `L'administration communale ${deC(c)} se situe : ${a}.` },
    { t: (n) => /parti/.test(n) && /politique/.test(n),
      e: (a, c) => `Vie politique locale ${deC(c)} : ${a}.` },

    // --- Histoire locale (avant la géographie : "région"/"siècle" sont ambigus) ---
    { t: (n) => /(plus ancien nom|nom du village|ancien nom|s appelait)/.test(n),
      e: (a, c) => `Le plus ancien nom connu ${deC(c)} est ${a}.` },
    { t: (n) => /(royaume|seigneurs|savoie|berne|dominait|faisait partie|reforme|moyen age|siecle|occupation|independance)/.test(n),
      e: (a, c) => `Repère historique pour ${c} : ${a}.` },

    // --- Population / identité ---
    { t: (n) => /(nombre d habitants|combien d habitants|population|combien de personnes)/.test(n),
      e: (a, c) => `${c} compte ${a} habitants.` },
    { t: (n) => /(habitants|surnom|sobriquet|gentile)/.test(n),
      e: (a, c) => `Les habitants ${deC(c)} sont appelés « ${a} » — chaque commune vaudoise a son gentilé.` },

    // --- Géographie locale ---
    { t: (n) => /(superficie|surface de la commune|combien d hectares)/.test(n),
      e: (a, c) => `${c} s'étend sur une superficie de ${a}.` },
    { t: (n) => /(point le plus haut|plus haut sommet|point culminant|sommet le plus)/.test(n),
      e: (a, c) => `Le point culminant ${deC(c)} : ${a}.` },
    { t: (n) => /altitude/.test(n),
      e: (a, c) => `${c} se situe à une altitude d'environ ${a}.` },
    { t: (n) => /voisin/.test(n),
      e: (a, c) => `Communes voisines ${deC(c)} : ${a}.` },
    { t: (n) => /(riviere|cours d eau|ruisseau)/.test(n),
      e: (a, c) => `Le cours d'eau lié à ${c} est ${a}.` },
    { t: (n) => /hameau/.test(n),
      e: (a, c) => `Un hameau rattaché à ${c} : ${a}.` },
    { t: (n) => /zone geographique/.test(n),
      e: (a, c) => `${c} se situe dans la zone : ${a}.` },

    // --- Patrimoine / symboles ---
    { t: (n) => /drapeau/.test(n),
      e: (a, c) => `Le drapeau ${deC(c)} : ${a}.` },
    { t: (n) => /(ecusson|armoiries|blason)/.test(n),
      e: (a, c) => `Les armoiries ${deC(c)} représentent : ${a}.` },
    { t: (n) => /journal/.test(n),
      e: (a, c) => `Le journal d'information ${deC(c)} s'appelle « ${a} ».` },
    { t: (n) => /(eglise|temple|chateau|monument|patrimoine|vestige|romain|abbaye|chapelle)/.test(n),
      e: (a, c) => `Élément du patrimoine ${deC(c)} : ${a}.` },

    // --- Vie locale ---
    { t: (n) => /(specialite culinaire|plat|gastronomie|culinaire)/.test(n),
      e: (a, c) => `Spécialité associée à ${c} : ${a}.` },
    { t: (n) => /(manifestation|fete|marche|festival)/.test(n),
      e: (a, c) => `Manifestation de la vie locale à ${c} : ${a}.` },
    { t: (n) => /(sport|club|societe locale|infrastructure|loisirs)/.test(n),
      e: (a, c) => `Vie associative et sportive à ${c} : ${a}.` },
  ];

  function explain(question, commune, answer) {
    const n = norm(question);
    const a = clean(answer);
    for (const r of RULES) {
      if (r.t(n)) { try { return r.e(a, commune); } catch (e) {} }
    }
    return `À ${commune}, la bonne réponse est : ${a}.`;
  }

  window.COMMUNE_RULES = { explain: explain };
})();
