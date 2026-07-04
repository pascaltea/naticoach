/* =========================================================================
 * Illustrations SVG intégrées (aucune image externe → fonctionne hors-ligne).
 * Chaque clé renvoie une chaîne SVG utilisée dans la carte d'explication.
 * Palette sobre, style « plat », cohérente avec l'app.
 * ========================================================================= */

const ILLUSTRATIONS = {
  drapeau: `
    <svg viewBox="0 0 120 120" role="img" aria-label="Drapeau suisse">
      <rect x="10" y="10" width="100" height="100" rx="10" fill="#D8232A"/>
      <rect x="52" y="30" width="16" height="60" rx="3" fill="#fff"/>
      <rect x="30" y="52" width="60" height="16" rx="3" fill="#fff"/>
    </svg>`,

  croixrouge: `
    <svg viewBox="0 0 120 120" role="img" aria-label="Emblème Croix-Rouge">
      <rect x="10" y="10" width="100" height="100" rx="10" fill="#fff" stroke="#e5e5e5"/>
      <rect x="52" y="30" width="16" height="60" rx="3" fill="#D8232A"/>
      <rect x="30" y="52" width="60" height="16" rx="3" fill="#D8232A"/>
    </svg>`,

  carte: `
    <svg viewBox="0 0 160 110" role="img" aria-label="Carte stylisée de la Suisse">
      <path d="M12 60 L30 40 L55 46 L72 30 L96 36 L120 28 L146 44 L150 66 L128 82 L100 74 L80 88 L54 80 L34 86 L16 74 Z"
            fill="#2E7D8C" opacity="0.15" stroke="#2E7D8C" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="70" cy="58" r="4" fill="#D8232A"/>
      <text x="70" y="52" font-size="9" text-anchor="middle" fill="#2E7D8C" font-family="sans-serif">Berne</text>
      <text x="80" y="103" font-size="10" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">26 cantons</text>
    </svg>`,

  montagne: `
    <svg viewBox="0 0 160 110" role="img" aria-label="Sommet alpin">
      <rect width="160" height="110" fill="#e8f1f4"/>
      <circle cx="130" cy="26" r="12" fill="#ffd35c"/>
      <path d="M0 100 L45 40 L70 72 L95 30 L130 80 L160 55 L160 110 L0 110 Z" fill="#5b7d8a"/>
      <path d="M95 30 L108 47 L100 50 L112 63 L95 63 Z" fill="#fff"/>
      <path d="M45 40 L56 55 L49 57 L58 68 L45 68 Z" fill="#fff"/>
      <text x="80" y="104" font-size="9" text-anchor="middle" fill="#fff" font-family="sans-serif">Pointe Dufour — 4634 m</text>
    </svg>`,

  langues: `
    <svg viewBox="0 0 200 90" role="img" aria-label="Quatre langues nationales">
      ${["DE","FR","IT","RM"].map((t,i)=>`
        <g transform="translate(${10+i*48},20)">
          <rect width="40" height="50" rx="8" fill="${["#4A5DB0","#D8232A","#2E7D8C","#C08A2E"][i]}"/>
          <text x="20" y="30" font-size="16" fill="#fff" text-anchor="middle" font-family="sans-serif" font-weight="700">${t}</text>
        </g>`).join("")}
      <text x="100" y="84" font-size="9" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">Allemand · Français · Italien · Romanche</text>
    </svg>`,

  conseil: `
    <svg viewBox="0 0 200 90" role="img" aria-label="Sept conseillers fédéraux">
      ${Array.from({length:7}).map((_,i)=>`
        <g transform="translate(${12+i*27},22)">
          <circle cx="10" cy="10" r="9" fill="#4A5DB0"/>
          <rect x="1" y="20" width="18" height="20" rx="6" fill="#4A5DB0"/>
        </g>`).join("")}
      <text x="100" y="82" font-size="10" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">Conseil fédéral — 7 membres (collège)</text>
    </svg>`,

  parlement: `
    <svg viewBox="0 0 200 100" role="img" aria-label="Parlement bicaméral">
      <rect x="12" y="18" width="80" height="44" rx="8" fill="#4A5DB0" opacity="0.15" stroke="#4A5DB0"/>
      <text x="52" y="38" font-size="10" text-anchor="middle" fill="#4A5DB0" font-family="sans-serif" font-weight="700">Conseil national</text>
      <text x="52" y="54" font-size="9" text-anchor="middle" fill="#4A5DB0" font-family="sans-serif">200 · le peuple</text>
      <rect x="108" y="18" width="80" height="44" rx="8" fill="#2E7D8C" opacity="0.15" stroke="#2E7D8C"/>
      <text x="148" y="38" font-size="10" text-anchor="middle" fill="#2E7D8C" font-family="sans-serif" font-weight="700">Conseil des États</text>
      <text x="148" y="54" font-size="9" text-anchor="middle" fill="#2E7D8C" font-family="sans-serif">46 · les cantons</text>
      <text x="100" y="82" font-size="10" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">= Assemblée fédérale</text>
    </svg>`,

  piliers: `
    <svg viewBox="0 0 200 100" role="img" aria-label="Système des trois piliers">
      ${[["1","AVS","#D8232A"],["2","LPP","#4A5DB0"],["3","3e pilier","#C08A2E"]].map((p,i)=>`
        <g transform="translate(${20+i*58},18)">
          <rect width="44" height="52" rx="6" fill="${p[2]}" opacity="0.15" stroke="${p[2]}"/>
          <text x="22" y="24" font-size="16" text-anchor="middle" fill="${p[2]}" font-weight="700" font-family="sans-serif">${p[0]}</text>
          <text x="22" y="42" font-size="9" text-anchor="middle" fill="${p[2]}" font-family="sans-serif">${p[1]}</text>
        </g>`).join("")}
      <text x="100" y="86" font-size="10" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">Prévoyance vieillesse</text>
    </svg>`,

  rutli: `
    <svg viewBox="0 0 160 100" role="img" aria-label="Prairie du Grütli, 1291">
      <rect width="160" height="100" fill="#e8f1f4"/>
      <path d="M0 70 Q80 50 160 70 L160 100 L0 100 Z" fill="#7cae7a"/>
      <path d="M0 40 L40 20 L70 40 L110 15 L160 45 L160 70 Q80 50 0 70 Z" fill="#9fb9c4"/>
      <text x="80" y="90" font-size="13" text-anchor="middle" fill="#B4472E" font-family="sans-serif" font-weight="700">1291 · Grütli</text>
    </svg>`,

  pouvoirs: `
    <svg viewBox="0 0 200 100" role="img" aria-label="Séparation des trois pouvoirs">
      ${[["Législatif","fait les lois","#4A5DB0"],["Exécutif","applique","#3a862d"],["Judiciaire","juge","#C08A2E"]].map((p,i)=>`
        <g transform="translate(${8+i*63},16)">
          <rect width="56" height="56" rx="8" fill="${p[2]}" opacity="0.14" stroke="${p[2]}"/>
          <text x="28" y="26" font-size="10" text-anchor="middle" fill="${p[2]}" font-weight="700" font-family="sans-serif">${p[0]}</text>
          <text x="28" y="42" font-size="8" text-anchor="middle" fill="${p[2]}" font-family="sans-serif">${p[1]}</text>
        </g>`).join("")}
      <text x="100" y="90" font-size="9" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">Séparation des pouvoirs</text>
    </svg>`,

  chillon: `
    <svg viewBox="0 0 160 100" role="img" aria-label="Château de Chillon">
      <rect width="160" height="100" fill="#dcebf2"/>
      <rect y="72" width="160" height="28" fill="#9fc3d4"/>
      <g fill="#b9a58a" stroke="#8a7860">
        <rect x="46" y="34" width="70" height="42"/>
        <rect x="40" y="24" width="16" height="52"/>
        <rect x="106" y="20" width="18" height="56"/>
        <rect x="72" y="26" width="20" height="50"/>
      </g>
      <path d="M40 24 l8 -8 l8 8 Z" fill="#7a5a3a"/>
      <path d="M106 20 l9 -9 l9 9 Z" fill="#7a5a3a"/>
      <path d="M72 26 l10 -9 l10 9 Z" fill="#7a5a3a"/>
      <text x="80" y="92" font-size="9" text-anchor="middle" fill="#3a5a68" font-family="sans-serif">Château de Chillon</text>
    </svg>`,

  lavaux: `
    <svg viewBox="0 0 160 100" role="img" aria-label="Terrasses de Lavaux">
      <rect width="160" height="100" fill="#eaf3ea"/>
      <rect y="74" width="160" height="26" fill="#9fc3d4"/>
      ${[0,1,2,3].map(i=>`<path d="M0 ${34+i*11} Q80 ${28+i*11} 160 ${34+i*11}" fill="none" stroke="#5a8f4e" stroke-width="6" opacity="${0.9-i*0.15}"/>`).join("")}
      <text x="80" y="92" font-size="9" text-anchor="middle" fill="#3a5a3a" font-family="sans-serif">Vignoble en terrasses · UNESCO</text>
    </svg>`,

  vaud: `
    <svg viewBox="0 0 120 120" role="img" aria-label="Drapeau vaudois">
      <rect x="10" y="10" width="100" height="100" rx="10" fill="#0a8a3f"/>
      <rect x="10" y="10" width="100" height="50" rx="10" fill="#fff"/>
      <rect x="10" y="50" width="100" height="12" fill="#fff"/>
      <text x="60" y="34" font-size="12" font-weight="700" text-anchor="middle" fill="#c9a227" font-family="sans-serif">LIBERTÉ</text>
      <text x="60" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="#c9a227" font-family="sans-serif">ET PATRIE</text>
    </svg>`,

  tell: `
    <svg viewBox="0 0 120 110" role="img" aria-label="Guillaume Tell et la pomme">
      <circle cx="60" cy="28" r="14" fill="#b5341f"/>
      <path d="M60 14 a3 3 0 0 1 3 -3 a3 3 0 0 1 -3 4" fill="#4a7a37"/>
      <rect x="52" y="42" width="16" height="34" rx="5" fill="#B4472E"/>
      <line x1="20" y1="60" x2="100" y2="60" stroke="#7a5a3a" stroke-width="3"/>
      <text x="60" y="98" font-size="11" text-anchor="middle" fill="#7a8a90" font-family="sans-serif">Liberté & résistance</text>
    </svg>`,
};

if (typeof module !== "undefined") { module.exports = { ILLUSTRATIONS }; }
