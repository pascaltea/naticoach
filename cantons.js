/* =========================================================================
 * Les 26 cantons suisses — données pour la carte interactive « Explorer la Suisse ».
 * x,y = position (centre) sur une carte-cartogramme schématique (viewBox 100×72),
 * approximativement géographique (ouest→est, nord→sud).
 * region : de = alémanique · fr = romand · it = italophone · multi = plurilingue.
 * ========================================================================= */

const REGION_COLORS = { de: "#5B7DB1", fr: "#C65D3B", it: "#3C9E74", multi: "#B08A34" };
const REGION_LABEL = { de: "Alémanique", fr: "Romand", it: "Italophone", multi: "Plurilingue" };

const CANTONS = [
  { code: "ZH", name: "Zurich",              capital: "Zurich",      year: 1351, region: "de",    langs: "Allemand",                       x: 48, y: 15, fact: "Plus grande ville et principal pôle économique et financier du pays." },
  { code: "BE", name: "Berne",               capital: "Berne",       year: 1353, region: "multi", langs: "Allemand, Français",             x: 31, y: 35, fact: "Abrite la ville fédérale ; 2ᵉ canton le plus peuplé." },
  { code: "LU", name: "Lucerne",             capital: "Lucerne",     year: 1332, region: "de",    langs: "Allemand",                       x: 38, y: 27, fact: "Son pont de la Chapelle est l'un des plus anciens ponts de bois d'Europe." },
  { code: "UR", name: "Uri",                 capital: "Altdorf",     year: 1291, region: "de",    langs: "Allemand",                       x: 51, y: 38, fact: "Canton fondateur de 1291, terre de la légende de Guillaume Tell." },
  { code: "SZ", name: "Schwytz",             capital: "Schwytz",     year: 1291, region: "de",    langs: "Allemand",                       x: 52, y: 28, fact: "A donné son nom à la Suisse ; canton fondateur de 1291." },
  { code: "OW", name: "Obwald",              capital: "Sarnen",      year: 1291, region: "de",    langs: "Allemand",                       x: 40, y: 39, fact: "Demi-canton ; patrie de Nicolas de Flüe, figure spirituelle de la Suisse." },
  { code: "NW", name: "Nidwald",             capital: "Stans",       year: 1291, region: "de",    langs: "Allemand",                       x: 45, y: 33, fact: "Demi-canton de Suisse centrale, au bord du lac des Quatre-Cantons." },
  { code: "GL", name: "Glaris",              capital: "Glaris",      year: 1352, region: "de",    langs: "Allemand",                       x: 58, y: 31, fact: "Vote encore à main levée lors de sa Landsgemeinde annuelle." },
  { code: "ZG", name: "Zoug",                capital: "Zoug",        year: 1352, region: "de",    langs: "Allemand",                       x: 47, y: 23, fact: "Petit canton réputé pour sa fiscalité avantageuse." },
  { code: "FR", name: "Fribourg",            capital: "Fribourg",    year: 1481, region: "multi", langs: "Français, Allemand",             x: 23, y: 36, fact: "Canton bilingue français-allemand ; patrie du fromage de Gruyère." },
  { code: "SO", name: "Soleure",             capital: "Soleure",     year: 1481, region: "de",    langs: "Allemand",                       x: 26, y: 20, fact: "Ville baroque où le chiffre 11 est partout (tours, cloches, fontaines)." },
  { code: "BS", name: "Bâle-Ville",          capital: "Bâle",        year: 1501, region: "de",    langs: "Allemand",                       x: 16, y: 7,  fact: "Demi-canton urbain : grand carnaval (Fasnacht) et industrie pharmaceutique." },
  { code: "BL", name: "Bâle-Campagne",       capital: "Liestal",     year: 1501, region: "de",    langs: "Allemand",                       x: 19, y: 15, fact: "Demi-canton, séparé de Bâle-Ville en 1833." },
  { code: "SH", name: "Schaffhouse",         capital: "Schaffhouse", year: 1501, region: "de",    langs: "Allemand",                       x: 49, y: 6,  fact: "Au nord du Rhin ; on y admire les chutes du Rhin, les plus grandes d'Europe." },
  { code: "AR", name: "Appenzell Rh.-Ext.",  capital: "Herisau",     year: 1513, region: "de",    langs: "Allemand",                       x: 62, y: 17, fact: "Demi-canton d'Appenzell, de tradition protestante." },
  { code: "AI", name: "Appenzell Rh.-Int.",  capital: "Appenzell",   year: 1513, region: "de",    langs: "Allemand",                       x: 62, y: 24, fact: "Dernier canton à accorder le vote aux femmes (1990) ; Landsgemeinde." },
  { code: "SG", name: "Saint-Gall",          capital: "Saint-Gall",  year: 1803, region: "de",    langs: "Allemand",                       x: 70, y: 21, fact: "Sa bibliothèque abbatiale est inscrite au patrimoine mondial de l'UNESCO." },
  { code: "GR", name: "Grisons",             capital: "Coire",       year: 1803, region: "multi", langs: "Allemand, Romanche, Italien",    x: 69, y: 37, fact: "Plus grand canton et seul trilingue (allemand, romanche, italien)." },
  { code: "AG", name: "Argovie",             capital: "Aarau",       year: 1803, region: "de",    langs: "Allemand",                       x: 35, y: 14, fact: "Surnommé le « canton des châteaux »." },
  { code: "TG", name: "Thurgovie",           capital: "Frauenfeld",  year: 1803, region: "de",    langs: "Allemand",                       x: 59, y: 10, fact: "Pays des vergers et des pommes, au bord du lac de Constance." },
  { code: "TI", name: "Tessin",              capital: "Bellinzone",  year: 1803, region: "it",    langs: "Italien",                        x: 55, y: 61, fact: "Seul canton de langue italienne ; les châteaux de Bellinzone sont à l'UNESCO." },
  { code: "VD", name: "Vaud",                capital: "Lausanne",    year: 1803, region: "fr",    langs: "Français",                       x: 13, y: 45, fact: "Terrasses de Lavaux (UNESCO) ; Lausanne, capitale olympique." },
  { code: "VS", name: "Valais",              capital: "Sion",        year: 1815, region: "multi", langs: "Français, Allemand",             x: 33, y: 53, fact: "Bilingue ; abrite le Cervin et la Pointe Dufour, plus haut sommet du pays." },
  { code: "NE", name: "Neuchâtel",           capital: "Neuchâtel",   year: 1815, region: "fr",    langs: "Français",                       x: 15, y: 28, fact: "Berceau de l'horlogerie de précision." },
  { code: "GE", name: "Genève",              capital: "Genève",      year: 1815, region: "fr",    langs: "Français",                       x: 6,  y: 58, fact: "Ville internationale : siège européen de l'ONU, célèbre jet d'eau." },
  { code: "JU", name: "Jura",                capital: "Delémont",    year: 1979, region: "fr",    langs: "Français",                       x: 10, y: 20, fact: "Le plus jeune canton, créé en 1979 en se séparant de Berne." },
];

if (typeof module !== "undefined") { module.exports = { CANTONS, REGION_COLORS, REGION_LABEL }; }
