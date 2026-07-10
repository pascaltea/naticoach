/* =========================================================================
 * NatiCoach — logique (vanilla JS, zéro dépendance)
 * Données officielles Canton de Vaud (window.VD_DATA).
 * Modes : Configuration commune · Révision · Simulation d'examen · Entraînement.
 * ========================================================================= */
(function () {
  "use strict";

  const RING_LEN = 2 * Math.PI * 52;
  const STORE_KEY = "swisscitoyen.v1";
  const THEMES = ["Géographie", "Histoire", "Politique", "Social"];
  const EXAM_TOTAL = 48;          // Vaud : 16 Suisse + 16 canton + 16 commune
  const EXAM_PER_CELL = 4;        // 4 par (niveau × thème)
  const EXAM_MINUTES = 60;
  const EXAM_PASS_PCT = 70;       // réussite officielle Vaud : 70 %

  /* Configuration d'examen par canton (QCM : Vaud / Genève). */
  const EXAM_CFG = {
    VD: { total: 48, passCorrect: 34, minutes: 60, passLabel: "70 % de bonnes réponses", passLabelEn: "70% correct answers", passLabelPt: "70% de respostas corretas" },
    GE: { total: 45, passCorrect: 40, minutes: 45, passLabel: "40 bonnes réponses sur 45 (5 fautes maximum)", passLabelEn: "40 correct answers out of 45 (5 mistakes max)", passLabelPt: "40 respostas corretas em 45 (máx. 5 erros)" },
  };
  const cantonOf = () => (["VD", "GE", "NE", "VS"].indexOf(state.canton) >= 0 ? state.canton : "VD");
  /* Format d'un canton : "mcq" (QCM Vaud/Genève) ou "cards" (fiches Q→R : Neuchâtel/Valais). */
  const CANTON_FORMAT = { VD: "mcq", GE: "mcq", NE: "cards", VS: "cards" };
  const isCards = () => CANTON_FORMAT[cantonOf()] === "cards";
  const CANTON_NAME = { VD: "Vaud", GE: "Genève", NE: "Neuchâtel", VS: "Valais" };
  const CANTON_SCOPE = { VD: "Canton de Vaud", GE: "Canton de Genève", NE: "Canton de Neuchâtel", VS: "Canton du Valais" };
  const CANTON_NAME_L = {
    en: { VD: "Vaud", GE: "Geneva", NE: "Neuchâtel", VS: "Valais" },
    pt: { VD: "Vaud", GE: "Genebra", NE: "Neuchâtel", VS: "Valais" },
  };
  const CANTON_SCOPE_L = {
    en: { VD: "Canton of Vaud", GE: "Canton of Geneva", NE: "Canton of Neuchâtel", VS: "Canton of Valais" },
    pt: { VD: "Cantão de Vaud", GE: "Cantão de Genebra", NE: "Cantão de Neuchâtel", VS: "Cantão do Valais" },
  };
  const cnName = (cn) => { cn = cn || cantonOf(); const m = CANTON_NAME_L[state.lang]; return (m && m[cn]) || CANTON_NAME[cn]; };
  const cScope = (cn) => { cn = cn || cantonOf(); const m = CANTON_SCOPE_L[state.lang]; return (m && m[cn]) || CANTON_SCOPE[cn]; };
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ""));
  /* Accès à un champ traduit suffixé par langue : pf(obj,"title") → obj.titlePt / obj.titleEn / obj.title. */
  const LSUF = { en: "En", pt: "Pt" };
  function pf(obj, base) {
    if (!obj) return "";
    const suf = LSUF[state.lang];
    const v = suf && obj[base + suf];
    return (v != null) ? v : obj[base];
  }
  const THEME_L = {
    en: { "Géographie": "Geography", "Histoire": "History", "Politique": "Politics", "Social": "Society" },
    pt: { "Géographie": "Geografia", "Histoire": "História", "Politique": "Política", "Social": "Sociedade" },
  };
  const trTheme = (th) => { const m = THEME_L[state.lang]; return (m && m[th]) || th; };
  const SCOPE_L = {
    en: { "Suisse": "Switzerland", "Canton de Vaud": "Canton of Vaud", "Canton de Genève": "Canton of Geneva", "Canton de Neuchâtel": "Canton of Neuchâtel", "Canton du Valais": "Canton of Valais", commune: "Municipality of " },
    pt: { "Suisse": "Suíça", "Canton de Vaud": "Cantão de Vaud", "Canton de Genève": "Cantão de Genebra", "Canton de Neuchâtel": "Cantão de Neuchâtel", "Canton du Valais": "Cantão do Valais", commune: "Município de " },
  };
  function trScope(s) {
    const m = SCOPE_L[state.lang];
    if (!m || !s) return s;
    if (m[s]) return m[s];
    if (s.indexOf("Commune de ") === 0) return m.commune + s.slice(11);
    return s;
  }
  /* Traduction optionnelle d'une question (window.QUESTION_TR). Null si absente. */
  function qTrans(frQ) {
    const d = (typeof window.QUESTION_TR !== "undefined") && window.QUESTION_TR[state.lang];
    return (d && d[frQ]) || null;
  }
  function cardsData() {
    if (state.canton === "NE" && typeof NE_DATA !== "undefined") return NE_DATA;
    if (state.canton === "VS" && typeof VS_DATA !== "undefined") return VS_DATA;
    return { questions: [] };
  }

  /* ---------------- Persistance ---------------- */
  const defaultState = () => ({
    history: [], sessions: 0, best: 0, streak: 0, lastPlayed: null,
    lang: "fr",     // "fr" (source) | "en" | "pt"
    premium: false, // déblocage « premium » (achat unique) — branché sur RevenueCat plus tard
    examNoticeAck: null, // langue pour laquelle l'avertissement « examen en français » a été vu
    canton: null,   // "VD" | "GE"
    commune: null,  // (Vaud uniquement)
    mistakes: [],   // [{q, options, answer, theme, scope}]
    stats: {},      // { "Niveau|Thème": {a, c} }
    badges: {},     // { badgeId: true }
    seenCantons: [], // codes de cantons ouverts dans « Explorer »
    seenDates: [],   // années/repères de frise déjà consultés
  });
  function load() {
    try {
      const r = localStorage.getItem(STORE_KEY);
      const s = r ? Object.assign(defaultState(), JSON.parse(r)) : defaultState();
      // Migration : un utilisateur existant avec une commune est un utilisateur Vaud.
      if (!s.canton && s.commune) s.canton = "VD";
      return s;
    }
    catch (e) { return defaultState(); }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
  let state = load();

  /* ---------------- Utils ---------------- */
  const $ = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  /* Coche / croix en SVG (jamais d'émoji). */
  const MK_OK = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'><path d='M5 13l4 4 10-10'/></svg>";
  const MK_NO = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'><path d='M6 6l12 12'/><path d='M18 6L6 18'/></svg>";
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active"); window.scrollTo(0, 0);
  }
  function setRing(el, pct) {
    el.style.strokeDasharray = RING_LEN;
    el.style.strokeDashoffset = RING_LEN * (1 - Math.max(0, Math.min(100, pct)) / 100);
  }

  /* ---------------- i18n (français source, anglais en surcouche) ---------------- */
  const LANGS = ["fr", "en", "pt"];   // langues disponibles (fr = source)
  const DICT = () => (window.I18N && window.I18N[state.lang]) || {};
  /* t("clé", "repli fr") : renvoie la traduction de la langue courante si la clé existe, sinon le français. */
  function t(key, fr) {
    if (state.lang !== "fr") { const d = DICT(); if (d[key] != null) return d[key]; }
    return fr != null ? fr : key;
  }
  /* ---------------- Freemium (aperçu gratuit → premium) ---------------- */
  const isPremium = () => state.premium === true;
  const FREE_STUDY = 20;   // questions accessibles gratuitement en révision (aperçu)
  const FREE_EXAM = 12;    // questions de l'« examen d'essai » gratuit

  /* Avertit (dans la langue de l'interface) que les questions restent en français, puis exécute proceed. */
  let _noticeCb = null;
  function frenchNotice(proceed) {
    if (state.lang === "fr" || state.examNoticeAck === state.lang) { proceed(); return; }
    _noticeCb = proceed;
    $("examNoticeTitle").textContent = t("examNotice.title", "L'examen officiel est en français");
    $("examNoticeText").textContent = t("examNotice.body", "Le test officiel de naturalisation se déroule en français. NatiCoach t'aide à te préparer, mais les questions restent en français pour t'entraîner en conditions réelles.");
    $("examNoticeGo").textContent = t("examNotice.go", "Compris, continuer");
    $("examNotice").hidden = false;
  }

  const _frSnap = {};   // texte français d'origine, capturé une fois, pour restaurer
  function applyStaticI18n() {
    const d = DICT();
    const tr = state.lang !== "fr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (!(k in _frSnap)) _frSnap[k] = el.innerHTML;
      el.innerHTML = (tr && d[k] != null) ? d[k] : _frSnap[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const k = el.getAttribute("data-i18n-ph");
      if (!(k in _frSnap)) _frSnap[k] = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", (tr && d[k] != null) ? d[k] : _frSnap[k]);
    });
    document.documentElement.lang = state.lang;
    document.querySelectorAll(".lang-btn").forEach((b) =>
      b.classList.toggle("on", b.dataset.lang === state.lang));
  }
  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0) return;
    state.lang = lang; save();
    applyStaticI18n();
    rerenderActive();
  }
  /* Re-rend l'écran courant après un changement de langue (contenu généré en JS). */
  function rerenderActive() {
    const active = document.querySelector(".screen.active");
    const id = active ? active.id : "";
    const map = {
      "screen-home": renderHome, "screen-politique": openPolitique, "screen-piliers": openPiliers,
      "screen-sante": openSante, "screen-assurances": openAssurances, "screen-democratie": openDemocratie,
      "screen-droits": openDroits, "screen-moncanton": openMonCanton, "screen-naturalisation": openNaturalisation,
      "screen-federalisme": openFederalisme, "screen-langues": openLangues, "screen-neutralite": openNeutralite,
      "screen-symboles": openSymboles, "screen-timeline": openTimeline, "screen-vsmap": openDistricts,
      "screen-explore": openExplore, "screen-stats": openStats, "screen-badges": openBadges,
      "screen-about": openAbout, "screen-premium": openPremium,
    };
    if (map[id]) { try { map[id](); } catch (e) {} }
  }

  /* ---------------- Animations ---------------- */
  function launchConfetti() {
    const c = document.createElement("canvas");
    c.className = "confetti-canvas";
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const W = c.width = window.innerWidth, H = c.height = window.innerHeight;
    const cols = ["#C8442E", "#ffffff", "#ffcc00", "#3a862d", "#4A5DB0", "#ff7043", "#25D366"];
    const P = [];
    for (let i = 0; i < 150; i++) P.push({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.4, r: 4 + Math.random() * 7,
      col: cols[Math.floor(Math.random() * cols.length)], vy: 2 + Math.random() * 4.5,
      vx: -2.5 + Math.random() * 5, rot: Math.random() * 6.28, vr: -0.25 + Math.random() * 0.5,
    });
    const t0 = performance.now();
    (function anim(now) {
      const dt = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = dt > 2000 ? Math.max(0, 1 - (dt - 2000) / 800) : 1;
      P.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.62); ctx.restore();
      });
      if (dt < 2800) requestAnimationFrame(anim); else c.remove();
    })(t0);
  }

  function countUp(el, to, dur) {
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to) + "%";
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ---------------- Notifications (toast) ---------------- */
  let toastQueue = [], toastBusy = false;
  function toast(ico, html) {
    toastQueue.push({ ico, html });
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    if (!toastQueue.length) { toastBusy = false; return; }
    toastBusy = true;
    const t = toastQueue.shift(), el = $("toast");
    el.innerHTML = `<span class="t-ico">${t.ico}</span><span>${t.html}</span>`;
    el.classList.add("show");
    setTimeout(() => { el.classList.remove("show"); setTimeout(nextToast, 450); }, 2300);
  }

  /* ---------------- Succès (badges) ---------------- */
  const ACHIEVEMENTS = [
    { id: "first",    ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4'/></svg>", title: "Premiers pas",    desc: "Terminer une première session" },
    { id: "exam",     ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-4 9 4-9 4z'/><path d='M7 11v5c0 1.5 2.5 2.5 5 2.5s5-1 5-2.5v-5'/></svg>", title: "Citoyen·ne",      desc: "Réussir une simulation d'examen" },
    { id: "perfect",  ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='9' r='5'/><path d='M8.8 13.2L7.5 21l4.5-2.7 4.5 2.7-1.3-7.8'/></svg>", title: "Sans-faute",      desc: "Réussir un examen à 100 %" },
    { id: "streak3",  ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1-3 3 2 4 5 4 7a7 7 0 0 1-14 0c0-4 3-6 5-8z'/></svg>", title: "Assidu·e",        desc: "Atteindre une série de 3 jours" },
    { id: "cleaner",  ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M14 3l7 7'/><path d='M11 6l7 7-3 3-9 2-3-3 8-3z'/></svg>", title: "Perfectionniste", desc: "Vider sa liste d'erreurs" },
    { id: "marathon", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l2.5 6 6.5.5-5 4 1.7 6.5L12 17l-5.7 3 1.7-6.5-5-4 6.5-.5z'/></svg>", title: "Marathonien·ne",  desc: "Réaliser 10 sessions" },
  ];
  function unlock(id) {
    if (state.badges[id]) return;
    state.badges[id] = true; save();
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) toast(a.ico, fmt(t("badges.toast", "Succès débloqué : <b>{x}</b>"), { x: t("badge." + a.id + ".title", a.title) }));
  }
  function checkBadges() {
    if (state.sessions >= 1) unlock("first");
    if (state.sessions >= 10) unlock("marathon");
    if (state.streak >= 3) unlock("streak3");
  }

  /* Niveau à partir de la portée (pour les stats). */
  function levelOf(scope) {
    if (scope && scope.indexOf("Canton de Vaud") >= 0) return "Vaud";
    if (scope && scope.indexOf("Canton de Genève") >= 0) return "Genève";
    if (scope && scope.indexOf("Canton de Neuchâtel") >= 0) return "Neuchâtel";
    if (scope && scope.indexOf("Canton du Valais") >= 0 || scope && scope.indexOf("Canton de Valais") >= 0) return "Valais";
    if (scope && scope.indexOf("Commune") >= 0) return "Commune";
    return "Suisse";
  }

  /* Enregistre une réponse : met à jour les stats et la liste d'erreurs. */
  function recordAnswer(ref, correct) {
    const key = levelOf(ref.scope) + "|" + (ref.theme || "?");
    const s = state.stats[key] || { a: 0, c: 0 };
    s.a++; if (correct) s.c++;
    state.stats[key] = s;
    if (correct) {
      state.mistakes = state.mistakes.filter((m) => m.q !== ref.q);
    } else if (!state.mistakes.some((m) => m.q === ref.q)) {
      state.mistakes.push({ q: ref.q, options: ref.options, answer: ref.answer, theme: ref.theme, scope: ref.scope });
    }
    save();
  }

  /* Prépare une question (mélange les options, retrouve la bonne). */
  function buildQuestion(q) {
    const order = shuffle(q.options.map((_, i) => i));
    return { ref: q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  }

  /* ---------------- Decks (depuis VD_DATA) ---------------- */
  /* Attache l'explication rédigée + l'illustration (si disponibles). */
  function enrich(q, scope) {
    const ex = (typeof EXPLANATIONS !== "undefined") ? EXPLANATIONS[q.q] : null;
    if (ex) return Object.assign({}, q, { scope }, { explanation: ex.e, illustration: ex.img || null });
    // Questions communales : explication rédigée (communes-phares) sinon moteur de règles.
    if (scope && scope.indexOf("Commune de ") === 0) {
      if (typeof COMMUNE_EXPLANATIONS !== "undefined" && COMMUNE_EXPLANATIONS[q.q])
        return Object.assign({}, q, { scope }, { explanation: COMMUNE_EXPLANATIONS[q.q] });
      if (typeof COMMUNE_RULES !== "undefined") {
        const name = scope.slice("Commune de ".length);
        const e = COMMUNE_RULES.explain(q.q, name, q.options[q.answer]);
        if (e) return Object.assign({}, q, { scope }, { explanation: e });
      }
    }
    return Object.assign({}, q, { scope });
  }

  function communeDeck(id) {
    const c = VD_DATA.communes[id];
    const tag = (arr, scope) => arr.map((q) => enrich(q, scope));
    return {
      name: c.name, district: c.district,
      federal: tag(VD_DATA.federal, "Suisse"),
      cantonal: tag(VD_DATA.cantonal, "Canton de Vaud"),
      commune: tag(c.questions, "Commune de " + c.name),
    };
  }
  function allDeck(id) { const d = communeDeck(id); return d.federal.concat(d.cantonal, d.commune); }

  /* Deck Genève : questions officielles (window.GE_DATA), scindées Suisse / Genève. */
  function geDeck() {
    const map = (q, scope) => enrich({ q: q.q, options: q.options, answer: q.answer, theme: q.theme }, scope);
    const src = (typeof GE_DATA !== "undefined") ? GE_DATA.questions : [];
    return {
      name: "Genève",
      federal: src.filter((q) => q.level === "Suisse").map((q) => map(q, "Suisse")),
      cantonal: src.filter((q) => q.level === "Genève").map((q) => map(q, "Canton de Genève")),
      commune: [],
    };
  }

  /* Deck de fiches (Neuchâtel / Valais) : {q, a, theme, scope}, scindé Suisse / canton. */
  function cardsDeck() {
    const src = cardsData().questions;
    const cLabel = CANTON_SCOPE[cantonOf()];
    const mk = (q) => ({ q: q.q, a: q.a, options: q.options, answer: q.answer, type: q.type || "card", theme: q.theme, scope: q.level === "Suisse" ? "Suisse" : cLabel });
    return {
      federal: src.filter((q) => q.level === "Suisse").map(mk),
      cantonal: src.filter((q) => q.level !== "Suisse").map(mk),
      commune: [],
    };
  }

  /* Deck du canton courant. */
  function currentDeck() { return cantonOf() === "GE" ? geDeck() : communeDeck(state.commune); }
  function allCurrentDeck() { const d = currentDeck(); return d.federal.concat(d.cantonal, d.commune); }

  /* Compose un examen fidèle : 4 questions par (niveau × thème) = 48. */
  function buildExam(id) {
    const d = communeDeck(id);
    let out = [];
    [d.federal, d.cantonal, d.commune].forEach((bank) => {
      THEMES.forEach((t) => {
        out = out.concat(shuffle(bank.filter((q) => q.theme === t)).slice(0, EXAM_PER_CELL));
      });
    });
    return shuffle(out);
  }

  /* ======================================================================
   *  CONFIGURATION / CHOIX DE COMMUNE
   * ==================================================================== */
  const communeIndex = Object.entries(VD_DATA.communes)
    .map(([id, c]) => ({ id, name: c.name, district: c.district, key: norm(c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  let pendingCommune = null;

  function openSetup(isChange) {
    $("setupBack").hidden = !isChange;
    showCantonStep();
    showScreen("screen-setup");
  }

  function showCantonStep() {
    $("setupCantonStep").hidden = false;
    $("setupCommuneStep").hidden = true;
    document.querySelectorAll(".canton-card").forEach((el) =>
      el.classList.toggle("sel", el.dataset.canton === state.canton));
  }

  function pickCanton(canton) {
    if (canton !== "VD") {
      // Genève, Neuchâtel, Valais : test cantonal, pas de commune.
      state.canton = canton; state.commune = null; save();
      renderHome(); showScreen("screen-home");
    } else {
      $("setupCantonStep").hidden = true;
      $("setupCommuneStep").hidden = false;
      $("communeSearch").value = "";
      pendingCommune = (state.canton === "VD" ? state.commune : null);
      renderCommuneResults("");
      updateSetupCta();
      setTimeout(() => $("communeSearch").focus(), 100);
    }
  }

  function updateSetupCta() {
    const cta = $("setupCta");
    if (pendingCommune && VD_DATA.communes[pendingCommune]) {
      $("btnSetupConfirm").textContent = "C'est parti avec " + VD_DATA.communes[pendingCommune].name;
      cta.hidden = false;
    } else {
      cta.hidden = true;
    }
  }

  function renderCommuneResults(q) {
    const box = $("communeResults");
    const nq = norm(q.trim());
    const list = nq ? communeIndex.filter((c) => c.key.includes(nq)) : communeIndex;
    if (!list.length) { box.innerHTML = `<p class="results-empty">Aucune commune trouvée.</p>`; return; }
    const shown = list.slice(0, 60);

    // Regroupe par district (ordre alphabétique), en préservant le tri des communes.
    const groups = [];
    const byDist = {};
    shown.forEach((c) => {
      if (!byDist[c.district]) { byDist[c.district] = []; groups.push(c.district); }
      byDist[c.district].push(c);
    });
    groups.sort((a, b) => a.localeCompare(b, "fr"));

    box.innerHTML = groups.map((dist) => {
      const items = byDist[dist];
      const rows = items.map((c) => {
        const sel = c.id === pendingCommune;
        return `<button class="commune-row${sel ? " selected" : ""}" data-id="${c.id}">
             <span><b>${c.name}</b></span>
             ${sel ? `<span class="commune-check">${MK_OK}</span>` : `<span class="commune-chev">›</span>`}
           </button>`;
      }).join("");
      return `<div class="dist-label">District de ${dist} · ${items.length} commune${items.length > 1 ? "s" : ""}</div>
              <div class="dist-group">${rows}</div>`;
    }).join("") +
      (list.length > 60 ? `<p class="results-empty">Affine ta recherche (${list.length} résultats)…</p>` : "");

    box.querySelectorAll(".commune-row").forEach((el) =>
      el.addEventListener("click", () => {
        pendingCommune = el.dataset.id;
        renderCommuneResults($("communeSearch").value);
        updateSetupCta();
      }));
  }

  function selectCommune(id) {
    state.canton = "VD"; state.commune = id; save();
    renderHome(); showScreen("screen-home");
  }

  /* ======================================================================
   *  ACCUEIL
   * ==================================================================== */
  function renderHome() {
    const cn = cantonOf();
    const cards = isCards();
    const pb = $("premiumBanner");
    if (pb) {
      pb.hidden = isPremium();
      if (!isPremium()) {
        $("premiumBannerTitle").textContent = t("premium.bannerTitle", "Débloquer tout");
        $("premiumBannerSub").textContent = t("premium.bannerSub", "Accès complet · achat unique");
        $("premiumBannerPrice").textContent = PREMIUM_PRICE;
      }
    }
    const c = VD_DATA.communes[state.commune];
    $("homeCommune").textContent = cn === "VD" ? (c ? c.name : t("misc.chooseCommune", "Choisir…")) : cnName(cn);
    // Jauges « Découvrir & suivre » (disponibles pour tous les cantons)
    const seenC = state.seenCantons.length;
    setGauge($("gaugeExplore"), seenC / 26, 4);
    $("exploreProg").textContent = seenC > 0
      ? fmt(t("home.cantonsSeen", "{n} / 26 cantons vus"), { n: seenC })
      : t("home.exploreSub", "26 cantons");
    const tlBase = timelineBase();
    const seenD = tlBase.filter((e) => state.seenDates.indexOf(e.year + "|" + e.scope) >= 0).length;
    setGauge($("gaugeFrise"), tlBase.length ? seenD / tlBase.length : 0, 4);
    $("friseTileSub").textContent = seenD > 0
      ? fmt(t("home.datesSeen", "{n} / {t} dates vues"), { n: seenD, t: tlBase.length })
      : t("misc.swiss", "Suisse") + " · " + cnName(cn);
    const nBadges = ACHIEVEMENTS.filter((a) => state.badges && state.badges[a.id]).length;
    setGauge($("gaugeBadges"), ACHIEVEMENTS.length ? nBadges / ACHIEVEMENTS.length : 0, ACHIEVEMENTS.length);

    // Ressource « districts » : cantons ayant une carte (Vaud, Valais).
    const dm = districtMap();
    $("btnVsMap").hidden = !dm;
    if (dm) {
      $("districtTileTitle").textContent = dm.districts.length + " " + t("misc.districts", "districts");
      $("districtTileSub").textContent = cn === "VS" ? t("district.subVS", "du Valais") : t("district.subVD", "vaudois");
    }

    // Blocs à score (prépa, révision QCM, suivi) : uniquement pour les cantons QCM.
    const pc = document.querySelector(".prep-card"); if (pc) pc.hidden = cards;
    $("grpReviser").hidden = cards;

    if (cards) {
      const n = cardsData().questions.length;
      $("examTitle").textContent = t("exam.train", "S'entraîner");
      $("examSub").textContent = fmt(t("exam.subCards", "{n} questions officielles · QCM & fiches"), { n: n });
      $("homeFooter").textContent = fmt(t("home.footerCards", "Questions officielles Suisse & {c} · hors-ligne"), { c: cScope(cn) });
      return;
    }

    const cfg = EXAM_CFG[cn];
    $("examTitle").textContent = t("exam.simulate", "Simuler l'examen");
    $("examSub").textContent = cn === "GE"
      ? fmt(t("exam.subGE", "{n} questions · max 5 fautes"), { n: cfg.total })
      : fmt(t("exam.subVD", "{n} questions · {m} min · réussite 70 %"), { n: cfg.total, m: cfg.minutes });
    $("homeFooter").textContent = cn === "GE"
      ? t("home.footerGE", "Questions officielles Suisse & Canton de Genève · hors-ligne")
      : t("home.footerVD", "Questions officielles du Canton de Vaud · hors-ligne");

    const recent = state.history.slice(-5);
    const readiness = recent.length ? Math.round(recent.reduce((s, h) => s + h.pct, 0) / recent.length) : 0;
    $("readinessPct").textContent = readiness + "%";
    $("statBest").textContent = state.best + "%";
    $("statSessions").textContent = state.sessions;
    $("statStreak").textContent = state.streak + " " + t("misc.dayUnit", "j");
    $("statsTileSub").textContent = readiness > 0
      ? fmt(t("home.statsGlobal", "{n}% global · par thème"), { n: readiness })
      : t("home.statsSub", "par thème");
    setTimeout(() => setRing($("readinessRing"), readiness), 60);

    const mc = state.mistakes.length;
    $("btnMistakes").hidden = mc === 0;
    $("mistakesCount").textContent = mc;
    { const mb = $("mistakesBadge"); if (mb) mb.textContent = mc; }
    $("mistakesLabel").textContent = t("home.mistakesSub", "question(s) à retravailler");
    $("badgeLabel").textContent = t("home.badgesSub", "badge(s)");

    $("badgeCount").textContent = ACHIEVEMENTS.filter((a) => state.badges && state.badges[a.id]).length;

    renderSparkline();
  }

  /* Jauge segmentée (design system nc-gauge) : remplit `segs` segments,
     dont round(ratio·segs) allumés. La couleur vient de `color:` sur le parent. */
  function setGauge(el, ratio, segs) {
    if (!el) return;
    ratio = Math.max(0, Math.min(1, ratio || 0));
    const on = Math.round(ratio * segs);
    let h = "";
    for (let i = 0; i < segs; i++) h += `<span class="${i < on ? "on" : ""}"></span>`;
    el.innerHTML = h;
  }
  /* Triangles de tendance en SVG (jamais de caractère glyphe, hors charte). */
  const TRI_UP = "<svg class='tri' viewBox='0 0 10 10' fill='currentColor'><path d='M5 1.5l3.6 6.5h-7.2z'/></svg>";
  const TRI_DN = "<svg class='tri' viewBox='0 0 10 10' fill='currentColor'><path d='M5 8.5l3.6-6.5h-7.2z'/></svg>";

  /* Mini-courbe de progression en aire (carte préparation, viewBox 150×54). */
  function renderSparkline() {
    const svg = $("sparkline");
    const data = state.history.slice(-12);
    $("sparkSessions").textContent = fmt(t("home.sessionsCount", "{n} sessions"), { n: state.sessions });
    const sd = $("sparkDelta");
    if (data.length < 2) { svg.innerHTML = ""; svg.style.visibility = "hidden"; if (sd) sd.innerHTML = ""; return; }
    svg.style.visibility = "visible";
    const W = 150, H = 54, padX = 3, padY = 6;
    const xs = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
    const ys = (v) => H - padY - (v / 100) * (H - padY * 2);
    let line = "";
    data.forEach((d, i) => { line += `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(d.pct).toFixed(1)} `; });
    const last = data[data.length - 1];
    const area = line + `L ${xs(data.length - 1).toFixed(1)} ${H} L ${xs(0).toFixed(1)} ${H} Z`;
    svg.innerHTML = `<path class="area" d="${area}"/><path class="line" d="${line}"/><circle cx="${xs(data.length - 1).toFixed(1)}" cy="${ys(last.pct).toFixed(1)}" r="3"/>`;
    if (sd) {
      const delta = Math.round(last.pct - data[0].pct);
      if (delta === 0) { sd.className = "prep-delta"; sd.innerHTML = ""; }
      else { sd.className = "prep-delta " + (delta > 0 ? "up" : "down"); sd.innerHTML = (delta > 0 ? TRI_UP : TRI_DN) + " " + (delta > 0 ? "+" : "") + delta + " pts"; }
    }
  }

  /* ======================================================================
   *  RÉVISION (toutes les questions, réponses affichées)
   * ==================================================================== */
  let study = null; // { scope, items, i, interactive }
  function studyScopes() {
    const c = cantonOf();
    const all = { key: "all", label: t("scope.all", "Tout"), long: t("scope.allLong", "Toutes les questions") };
    const fed = { key: "federal", label: t("misc.swiss", "Suisse"), long: t("scope.fedLong", "Suisse (fédéral)") };
    if (c === "GE" || c === "NE" || c === "VS") return [
      all, fed,
      { key: "cantonal", label: cnName(c), long: cScope(c) },
    ];
    return [
      all, fed,
      { key: "cantonal", label: cnName("VD"), long: cScope("VD") },
      { key: "commune", label: t("scope.commune", "Commune"), long: t("scope.communeLong", "Ma commune") },
    ];
  }

  // Ordre d'affichage : Découverte puis Quiz. Quiz reste le mode par défaut.
  const STUDY_MODES = [
    { key: "reveal", i18n: "study.discovery", fr: "Découverte" },
    { key: "quiz", i18n: "study.quiz", fr: "Quiz" },
  ];

  function openStudy() {
    const cards = isCards();
    $("studyModebar").hidden = cards;   // pas de toggle Découverte/Quiz pour les fiches
    if (!study) study = { interactive: true, items: [], i: 0 }; // Quiz par défaut (QCM)
    if (!cards) renderStudyMode();
    loadStudyScope("all");
    showScreen("screen-study");
  }

  function renderStudyMode() {
    const cur = (study && study.interactive) ? "quiz" : "reveal";
    const seg = $("studyMode");
    seg.innerHTML = STUDY_MODES.map((m) =>
      `<button data-m="${m.key}" class="${m.key === cur ? "active" : ""}">${t(m.i18n, m.fr)}</button>`).join("");
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const wantQuiz = b.dataset.m === "quiz";
      if (study) study.interactive = wantQuiz;
      // en passant en Quiz, on ré-interroge (on masque les réponses déjà vues)
      if (wantQuiz) study.items.forEach((it) => { delete it.chosen; });
      renderStudyMode(); renderStudy();
    }));
  }

  /* Feuille de sélection de la portée (Tout / Suisse / Vaud / Commune). */
  function openScopeSheet() {
    const box = $("scopeOptions");
    box.innerHTML = studyScopes().map((s) =>
      `<button data-scope="${s.key}" class="${study && study.scope === s.key ? "sel" : ""}">
         <span>${s.long}</span>${study && study.scope === s.key ? '<span class="sheet-check">'+MK_OK+'</span>' : ""}
       </button>`).join("");
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      loadStudyScope(b.dataset.scope); closeScopeSheet();
    }));
    $("scopeSheet").hidden = false;
  }
  function closeScopeSheet() { $("scopeSheet").hidden = true; }

  function loadStudyScope(scope) {
    const sc = studyScopes().find((s) => s.key === scope);
    if (isCards()) {
      const d = cardsDeck();
      const src = scope === "all" ? d.federal.concat(d.cantonal) : (d[scope] || []);
      const full = src.map((c) => Object.assign({}, c));
      const locked = isPremium() ? 0 : Math.max(0, full.length - FREE_STUDY);
      study = { scope, items: locked ? full.slice(0, FREE_STUDY) : full, i: 0, cards: true, lockedCount: locked };
      $("studyScopeLabel").textContent = t("study.label", "Révision") + " · " + (sc ? sc.label : t("scope.all", "Tout"));
      renderStudy(); return;
    }
    const d = currentDeck();
    const src = scope === "all" ? d.federal.concat(d.cantonal, d.commune) : (d[scope] || []);
    const interactive = study ? study.interactive : true;
    const full = src.map(buildQuestion);
    const locked = isPremium() ? 0 : Math.max(0, full.length - FREE_STUDY);
    study = { scope, items: locked ? full.slice(0, FREE_STUDY) : full, i: 0, interactive, lockedCount: locked };
    $("studyScopeLabel").textContent = t("study.label", "Révision") + " · " + (sc ? sc.label : t("scope.all", "Tout"));
    renderStudy();
  }

  /* Sépare une question de ses propositions listées après le « ? » (« … ? a/ b/ c »). */
  function splitChoices(q) {
    const i = q.indexOf("?");
    if (i < 0) return { text: q, choices: null };
    const head = q.slice(0, i + 1).trim();
    const rest = q.slice(i + 1).trim();
    if (rest && rest.indexOf("/") >= 0) {
      const choices = rest.split("/").map((s) => s.trim()).filter(Boolean);
      if (choices.length >= 2) return { text: head, choices };
    }
    return { text: q, choices: null };
  }

  /* Rendu d'un item NE/VS : QCM (choix + feedback) ou fiche (question → réponse). */
  function renderStudyCard() {
    const cur = study.items[study.i];
    $("studyChip").textContent = trScope(cur.scope) + " · " + trTheme(cur.theme);
    $("studyCount").textContent = (study.i + 1) + "/" + study.items.length;
    $("studyProgressFill").style.width = ((study.i + 1) / study.items.length) * 100 + "%";
    $("studyIllus").innerHTML = "";
    const box = $("studyOptions"); box.innerHTML = "";
    $("btnPrev").disabled = study.i === 0;
    $("btnNextStudy").textContent = study.i + 1 < study.items.length ? t("study.next", "Suivant ›") : t("study.done", "Terminé");

    if (cur.type === "mcq") {
      $("studyQuestion").textContent = cur.q;
      const answered = cur.chosen !== undefined && cur.chosen !== null;
      cur.options.forEach((opt, i) => {
        if (!answered) {
          const b = document.createElement("button");
          b.className = "option";
          b.innerHTML = `<span class="mark">${LETTERS[i] || ""}</span><span>${esc(opt)}</span>`;
          b.addEventListener("click", () => { cur.chosen = i; renderStudy(); });
          box.appendChild(b);
        } else {
          const ok = i === cur.answer, wrong = i === cur.chosen && !ok;
          const el = document.createElement("div");
          el.className = "option " + (ok ? "correct" : (wrong ? "wrong" : "dim"));
          el.innerHTML = `<span class="mark">${ok ? MK_OK : (wrong ? MK_NO : (LETTERS[i] || ""))}</span><span>${esc(opt)}</span>`;
          box.appendChild(el);
        }
      });
      $("studyExplain").hidden = !answered;
      if (answered) {
        const good = cur.chosen === cur.answer;
        const head = $("studyExplainHead");
        head.textContent = good ? t("study.wellSeen", "Bien vu !") : t("study.officialAnswer", "Réponse officielle");
        head.className = "explain-head savais-head " + (good ? "ok" : "bad");
        $("studyExplainText").textContent = cur.options[cur.answer];
      }
      return;
    }

    // Fiche (question ouverte)
    const parsed = splitChoices(cur.q);
    $("studyQuestion").textContent = parsed.text;
    if (parsed.choices) {
      const ul = document.createElement("ul"); ul.className = "card-choices";
      parsed.choices.forEach((ch) => { const li = document.createElement("li"); li.textContent = ch; ul.appendChild(li); });
      box.appendChild(ul);
    }
    if (!cur.revealed) {
      const b = document.createElement("button");
      b.className = "btn btn-outline reveal-btn";
      b.textContent = t("study.reveal", "Voir la réponse officielle");
      b.addEventListener("click", () => { cur.revealed = true; renderStudy(); });
      box.appendChild(b);
    }
    $("studyExplain").hidden = !cur.revealed;
    if (cur.revealed) {
      const head = $("studyExplainHead");
      head.textContent = t("study.officialAnswer", "Réponse officielle");
      head.className = "explain-head savais-head";
      $("studyExplainText").textContent = cur.a;
    }
  }

  function updateStudyLock() {
    const el = $("studyLock"); if (!el) return;
    const n = study && study.lockedCount;
    if (n > 0) { el.hidden = false; el.innerHTML = `<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/></svg> ${fmt(t("premium.studyLock", "Aperçu gratuit · {n} questions verrouillées"), { n: n })} — <b>${t("premium.unlock", "Débloquer")}</b>`; }
    else el.hidden = true;
  }
  function renderStudy() {
    updateStudyLock();
    if (study.cards) { renderStudyCard(); return; }
    const cur = study.items[study.i];
    const answered = cur.chosen !== undefined && cur.chosen !== null;
    $("studyChip").textContent = trScope(cur.ref.scope) + " · " + trTheme(cur.ref.theme);
    $("studyCount").textContent = (study.i + 1) + "/" + study.items.length;
    $("studyQuestion").textContent = cur.ref.q;
    $("studyProgressFill").style.width = ((study.i + 1) / study.items.length) * 100 + "%";

    const revealed = !study.interactive || answered;
    const box = $("studyOptions"); box.innerHTML = "";
    cur.options.forEach((opt, i) => {
      if (study.interactive && !answered) {
        const b = document.createElement("button");
        b.className = "option";
        b.innerHTML = `<span class="mark">${LETTERS[i] || ""}</span><span>${opt}</span>`;
        b.addEventListener("click", () => { cur.chosen = i; recordAnswer(cur.ref, i === cur.answer); renderStudy(); });
        box.appendChild(b);
      } else {
        const ok = i === cur.answer;
        const wrongPick = study.interactive && answered && i === cur.chosen && !ok;
        const el = document.createElement("div");
        el.className = "option " + (ok ? "reveal" : (wrongPick ? "wrong" : "muted-opt"));
        el.innerHTML = `<span class="mark">${ok ? MK_OK : (wrongPick ? MK_NO : (LETTERS[i] || ""))}</span><span>${opt}</span>`;
        box.appendChild(el);
      }
    });

    $("studyExplain").hidden = !revealed;
    if (revealed) {
      const head = $("studyExplainHead");
      if (study.interactive) {
        const good = cur.chosen === cur.answer;
        head.textContent = good ? t("study.wellSeen", "Bien vu !") : t("study.remember", "À retenir");
        head.className = "explain-head savais-head " + (good ? "ok" : "bad");
      } else {
        head.textContent = t("study.savais", "Le savais-tu ?");
        head.className = "explain-head savais-head";
      }
      const exp = (cur.ref.explanation && cur.ref.explanation.trim())
        ? cur.ref.explanation
        : t("study.correctAnswer", "Réponse correcte : ") + cur.options[cur.answer];
      $("studyExplainText").textContent = exp;
      const ik = cur.ref.illustration;
      $("studyIllus").innerHTML = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik]) ? ILLUSTRATIONS[ik] : "";
    }

    $("btnPrev").disabled = study.i === 0;
    $("btnNextStudy").textContent = study.i + 1 < study.items.length ? t("study.next", "Suivant ›") : t("study.done", "Terminé");
  }

  function studyNext() {
    if (study.i + 1 < study.items.length) { study.i++; renderStudy(); }
    else { showScreen("screen-home"); renderHome(); }
  }
  function studyPrev() { if (study.i > 0) { study.i--; renderStudy(); } }

  /* ======================================================================
   *  EXPLORER LA SUISSE (carte interactive des cantons)
   * ==================================================================== */
  const exploreIntro = () =>
    `<p class="cd-intro">${t("explore.intro", "<b>26 cantons</b>, 4 langues nationales, ~9 millions d'habitants.<br>Touche un canton sur la carte pour l'explorer.")}</p>`;

  const REGION_OF = {};
  CANTONS.forEach((c) => { REGION_OF[c.code] = c.region; });
  const REGION_LONG = { de: "Suisse alémanique", fr: "Suisse romande", it: "Suisse italienne", multi: "Canton plurilingue" };
  const REGION_LONG_L = {
    en: { de: "German-speaking Switzerland", fr: "French-speaking Switzerland", it: "Italian-speaking Switzerland", multi: "Multilingual canton" },
    pt: { de: "Suíça alemã", fr: "Suíça francófona", it: "Suíça italiana", multi: "Cantão multilingue" },
  };
  const regionLong = (r) => { const m = REGION_LONG_L[state.lang]; return (m && m[r]) || REGION_LONG[r]; };
  const REGION_LABEL_L = {
    en: (typeof REGION_LABEL_EN !== "undefined") ? REGION_LABEL_EN : null,
    pt: { de: "Alemão", fr: "Francês", it: "Italiano", multi: "Multilíngue" },
  };
  const regionLabelMap = () => (REGION_LABEL_L[state.lang]) || (typeof REGION_LABEL !== "undefined" ? REGION_LABEL : {});

  function openExplore() {
    const svg = $("cantonMap");
    if (!svg.dataset.filled) {
      svg.setAttribute("viewBox", SWISS_MAP.viewBox);
      svg.innerHTML = Object.entries(SWISS_MAP.cantons).map(([code, g]) =>
        `<g class="canton" data-code="${code}" tabindex="0" role="button" aria-label="${code}">
           <path d="${g.d}" fill="${REGION_COLORS[REGION_OF[code]]}" fill-rule="evenodd"/>
           <text x="${g.cx}" y="${g.cy + 0.9}" text-anchor="middle" font-size="2.4" fill="#fff" font-weight="700">${code}</text>
         </g>`).join("");
      svg.querySelectorAll(".canton").forEach((g) => {
        const pick = () => selectCanton(g.dataset.code);
        g.addEventListener("click", pick);
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
      $("mapLegend").innerHTML = Object.keys(REGION_LABEL).map((k) =>
        `<span class="legend-item" data-region="${k}"><span class="legend-dash" style="background:${REGION_COLORS[k]}"></span>${regionLabelMap()[k]}</span>`).join("");
      setupMap();
      svg.dataset.filled = "1";
    }
    selectCanton(null);
    showScreen("screen-explore");
  }

  /* Zoom / déplacement de la carte (manipulation du viewBox). */
  const mapView = { base: null, v: null, dragging: false, moved: false, sx: 0, sy: 0, vx: 0, vy: 0 };
  function parseVB(s) { const p = s.trim().split(/\s+/).map(Number); return { x: p[0], y: p[1], w: p[2], h: p[3] }; }
  function applyView() {
    const v = mapView.v, b = mapView.base, svg = $("cantonMap");
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    // Épaisseur du trait pilotée par le zoom → reste fine et constante à l'écran (pas de pâté).
    const f = v.w / b.w;
    svg.style.setProperty("--csw", (0.22 * f).toFixed(3));
    svg.style.setProperty("--csw-sel", (0.55 * f).toFixed(3));
  }
  function clampPan() {
    const b = mapView.base, v = mapView.v;
    v.x = Math.min(Math.max(v.x, b.x), b.x + b.w - v.w);
    v.y = Math.min(Math.max(v.y, b.y), b.y + b.h - v.h);
  }
  function zoomMap(f) {
    const b = mapView.base, v = mapView.v;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    let nw = Math.min(Math.max(v.w * f, b.w * 0.35), b.w);
    const r = nw / v.w;
    v.w = nw; v.h = v.h * r; v.x = cx - v.w / 2; v.y = cy - v.h / 2;
    clampPan(); applyView();
  }
  function setupMap() {
    mapView.base = parseVB(SWISS_MAP.viewBox);
    mapView.v = Object.assign({}, mapView.base);
    const svg = $("cantonMap");
    svg.addEventListener("pointerdown", (e) => {
      mapView.dragging = true; mapView.moved = false;
      mapView.sx = e.clientX; mapView.sy = e.clientY; mapView.vx = mapView.v.x; mapView.vy = mapView.v.y;
      svg.classList.add("grabbing");
    });
    svg.addEventListener("pointermove", (e) => {
      if (!mapView.dragging) return;
      // Ne déplace la carte qu'au-delà d'un vrai mouvement (sinon un simple tap = déplacement).
      if (!mapView.moved && Math.abs(e.clientX - mapView.sx) + Math.abs(e.clientY - mapView.sy) < 8) return;
      mapView.moved = true;
      const rect = svg.getBoundingClientRect();
      const dx = (e.clientX - mapView.sx) * mapView.v.w / rect.width;
      const dy = (e.clientY - mapView.sy) * mapView.v.h / rect.height;
      mapView.v.x = mapView.vx - dx; mapView.v.y = mapView.vy - dy;
      clampPan(); applyView();
    });
    const end = () => { mapView.dragging = false; $("cantonMap").classList.remove("grabbing"); };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    applyView(); // fixe le viewBox + l'épaisseur initiale du trait
  }

  function selectCanton(code) {
    if (mapView.moved) { mapView.moved = false; return; } // c'était un déplacement, pas un clic
    const svg = $("cantonMap");
    svg.querySelectorAll(".canton").forEach((g) => {
      const on = g.dataset.code === code;
      g.classList.toggle("sel", on);
      if (on) svg.appendChild(g); // passe au premier plan (bordure visible)
    });
    const box = $("cantonDetail");
    const c = code && CANTONS.find((x) => x.code === code);
    // Légende : l'item de la région du canton sélectionné passe en gras/encre.
    $("mapLegend").querySelectorAll(".legend-item").forEach((el) =>
      el.classList.toggle("on", !!(c && el.dataset.region === c.region)));
    if (!c) {
      box.classList.remove("as-card");
      box.innerHTML = exploreIntro();
      return;
    }
    if (state.seenCantons.indexOf(c.code) < 0) { state.seenCantons.push(c.code); save(); }
    const col = REGION_COLORS[c.region];
    const cta = (c.code === "VD" && cantonOf() === "VD")
      ? `<div class="cid-cta-wrap"><button class="cid-cta" id="cantonQuizBtn" style="border-color:${col};color:${col}">${t("explore.cantonQuiz", "5 questions sur le canton de Vaud →")}</button></div>`
      : "";
    box.classList.add("as-card");
    box.innerHTML =
      `<div class="cid-head" style="background:${col}">
         <div class="cid-head-top"><span class="cid-name">${pf(c, "name")}</span><span class="cid-code">${c.code}</span></div>
         <div class="cid-region">${regionLong(c.region)}</div>
       </div>
       <div class="cid-cols">
         <div><div class="cid-val">${c.capital}</div><div class="cid-lab">${t("explore.capital", "Chef-lieu")}</div></div>
         <div><div class="cid-val">${c.year}</div><div class="cid-lab">${t("explore.confed", "Confédération")}</div></div>
         <div><div class="cid-val">${pf(c, "langs")}</div><div class="cid-lab">${t("explore.language", "Langue")}</div></div>
       </div>
       <div class="cid-quote"><span class="cid-q" style="color:${col}">«</span><p>${pf(c, "fact")}</p></div>
       ${cta}`;
    const qb = $("cantonQuizBtn");
    if (qb) qb.addEventListener("click", startCantonQuiz);
  }

  /* Mini-quiz de 5 questions sur le canton de Vaud (depuis la banque cantonale). */
  function startCantonQuiz() {
    const d = communeDeck(state.commune);
    const items = shuffle(d.cantonal.slice()).slice(0, 5).map(buildQuestion);
    if (!items.length) return;
    quiz = { mode: "practice", items: items, i: 0, correct: 0, answered: false };
    showScreen("screen-quiz"); renderQuestion();
  }

  /* ======================================================================
   *  STATISTIQUES
   * ==================================================================== */
  const STAT_THEMES = ["Géographie", "Histoire", "Politique", "Social"];
  const statLevels = () => (cantonOf() === "GE" ? ["Suisse", "Genève"] : ["Suisse", "Vaud", "Commune"]);
  const LEVEL_L = {
    fr: { Suisse: "Suisse", Vaud: "Canton de Vaud", "Genève": "Canton de Genève", Commune: "Ma commune" },
    en: { Suisse: "Switzerland", Vaud: "Canton of Vaud", "Genève": "Canton of Geneva", Commune: "My municipality" },
    pt: { Suisse: "Suíça", Vaud: "Cantão de Vaud", "Genève": "Cantão de Genebra", Commune: "Meu município" },
  };
  const levelLabel = (l) => (LEVEL_L[state.lang] || LEVEL_L.fr)[l] || (LEVEL_L.fr[l] || l);

  /* Palier de couleur d'une barre (seuil examen à 60 %). */
  function barColor(pct) { return pct < 30 ? "#C8442E" : pct < 45 ? "#D8836F" : pct < 60 ? "#C08A2E" : "#3E7A4E"; }
  const THEME_ART = { "Géographie": "la Géographie", "Histoire": "l'Histoire", "Politique": "la Politique", "Social": "le Social" };
  const elle = (th) => (state.lang === "fr" ? (THEME_ART[th] || th) : trTheme(th));

  function openStats() {
    const box = $("statsBody");
    let tot = { a: 0, c: 0 };
    Object.values(state.stats).forEach((s) => { tot.a += s.a; tot.c += s.c; });

    if (!tot.a) {
      box.innerHTML = `<p class="stats-empty">${t("stats.empty", "Réponds à quelques questions (examen ou révision en mode Quiz) pour voir ton bilan apparaître ici.")}</p>`;
      showScreen("screen-stats"); return;
    }

    const agg = (filterFn) => {
      let a = 0, c = 0;
      Object.entries(state.stats).forEach(([k, s]) => { if (filterFn(k)) { a += s.a; c += s.c; } });
      return { a, c, pct: a ? Math.round((c / a) * 100) : 0 };
    };

    // Thèmes avec données, triés du plus faible au plus fort.
    const themeStats = STAT_THEMES
      .map((th) => Object.assign({ theme: th }, agg((k) => k.split("|")[1] === th)))
      .filter((r) => r.a > 0)
      .sort((x, y) => x.pct - y.pct);

    const sbar = (r, threshold) => `
        <div class="sbar-row">
          <div class="sbar-head"><b>${r.label}</b><span class="${r.weak ? "weak" : ""}">${r.pct}%${r.frac ? " · " + r.frac : ""}</span></div>
          <div class="sbar"><i style="width:${r.pct}%;background:${barColor(r.pct)}"></i><u style="left:${threshold}%"></u></div>
        </div>`;

    const overallPct = Math.round((tot.c / tot.a) * 100);

    // Héros : point faible
    let hero = "";
    if (themeStats.length) {
      const w = themeStats[0];
      const toReview = w.a - w.c;
      hero =
        `<div class="stats-hero">
           <div class="stats-hero-sur">${t("stats.focusOn", "Concentre-toi sur")}</div>
           <div class="stats-hero-theme">${elle(w.theme)}</div>
           <p class="stats-hero-msg">${fmt(t("stats.weakMsg", "C'est ton thème le plus fragile : {p}% de réussite, soit {n} question{s} à retravailler."), { p: w.pct, n: toReview, s: toReview > 1 ? "s" : "" })}</p>
           <button class="btn btn-primary stats-hero-cta" id="statsHeroCta" data-theme="${w.theme}">${fmt(t("stats.reviseX", "Réviser {x}"), { x: elle(w.theme) })}</button>
         </div>`;
    }

    box.innerHTML =
      hero +
      `<div class="stats-card">
         <div class="stats-card-head"><span class="stats-card-title">${t("stats.allThemes", "Tous les thèmes")}</span><span class="stats-thresh">${t("stats.threshExam", "┃ seuil examen 60%")}</span></div>
         <div class="sbar-list">` +
           themeStats.map((r, i) => sbar({ label: trTheme(r.theme), pct: r.pct, weak: i === 0 }, 60)).join("") +
         `</div>
       </div>` +
      `<div class="stats-tiles">
         <div class="stats-tile"><div class="stats-tile-val">${overallPct}%</div><div class="stats-tile-lab">${t("stats.global", "Global")}</div></div>
         <div class="stats-tile"><div class="stats-tile-val">${tot.a}</div><div class="stats-tile-lab">${t("stats.answered", "Répondues")}</div></div>
         <div class="stats-tile"><div class="stats-tile-val">${state.mistakes.length}</div><div class="stats-tile-lab">${t("stats.toReview", "À revoir")}</div></div>
       </div>` +
      `<div class="stats-card">
         <div class="stats-card-head"><span class="stats-card-title">${t("stats.byLevel", "Par niveau")}</span></div>
         <div class="sbar-list">` +
           statLevels().map((l) => {
             const r = agg((k) => k.split("|")[0] === l);
             const label = levelLabel(l);
             return r.a ? sbar({ label, pct: r.pct, frac: r.c + "/" + r.a }, 60)
                        : `<div class="sbar-row"><div class="sbar-head"><b>${label}</b><span>—</span></div><div class="sbar"><i style="width:0"></i></div></div>`;
           }).join("") +
         `</div>
       </div>` +
      `<button class="btn btn-reset" id="btnResetStats">${t("stats.reset", "Réinitialiser mes statistiques et erreurs")}</button>`;

    const hc = $("statsHeroCta");
    if (hc) hc.addEventListener("click", () => startThemeReview(hc.dataset.theme));
    $("btnResetStats").addEventListener("click", () => {
      if (confirm(t("stats.resetConfirm", "Réinitialiser toutes tes statistiques et ta liste d'erreurs ?"))) {
        state.stats = {}; state.mistakes = []; save(); openStats();
      }
    });
    showScreen("screen-stats");
  }

  /* Révision ciblée d'un thème (quiz de correction immédiate). */
  function startThemeReview(theme) {
    const pool = allCurrentDeck().filter((q) => q.theme === theme);
    const items = shuffle(pool).slice(0, 12).map(buildQuestion);
    if (!items.length) return;
    quiz = { mode: "practice", items: items, i: 0, correct: 0, answered: false };
    showScreen("screen-quiz"); renderQuestion();
  }

  /* ======================================================================
   *  LIGHTBOX (illustrations agrandissables)
   * ==================================================================== */
  document.addEventListener("click", (e) => {
    const box = $("lightbox");
    if (!box.hidden && (e.target === box || box.contains(e.target))) { box.hidden = true; $("lightboxInner").innerHTML = ""; return; }
    const holder = e.target.closest(".explain-illus, .review-illus, #studyIllus");
    if (holder && holder.querySelector("svg")) {
      $("lightboxInner").innerHTML = holder.innerHTML;
      box.hidden = false;
    }
  });

  /* ======================================================================
   *  FRISE CHRONOLOGIQUE
   * ==================================================================== */
  const TL_KEY_YEARS = { "1291": 1, "1848": 1, "1971": 1 };
  let timelineFilter = "all";

  function yearVal(yearStr) {
    if (/av\.?\s*J/i.test(yearStr)) return -(parseInt((yearStr.match(/\d+/) || [100])[0], 10));
    const m = yearStr.match(/\d{3,4}/); return m ? parseInt(m[0], 10) : 0;
  }
  function eraOf(yearStr) {
    const y = yearVal(yearStr);
    if (y < 500) return t("tl.eraAntiquity", "Antiquité");
    if (y < 1500) return t("tl.eraMiddleAges", "Moyen Âge");
    if (y < 1798) return t("tl.eraModern", "Époque moderne");
    return t("tl.eraContemporary", "Époque contemporaine");
  }

  /* Événements affichés = Suisse (fédéral) + canton courant. */
  function timelineBase() {
    const cn = cantonOf();
    return TIMELINE.filter((t) => t.scope === "ch" || t.scope === cn);
  }

  function renderTimeline() {
    const cn = cantonOf();
    const items = timelineBase()
      .filter((t) => timelineFilter === "all" || t.scope === timelineFilter)
      .slice().sort((a, b) => yearVal(a.year) - yearVal(b.year));
    let html = "", currentEra = null, open = false;
    items.forEach((ev) => {
      const era = eraOf(ev.year);
      if (era !== currentEra) {
        if (open) html += `</div>`;
        html += `<div class="tl-era"><span></span>${era}<span></span></div><div class="tl-rail">`;
        currentEra = era; open = true;
      }
      const isCanton = ev.scope !== "ch";
      const key = TL_KEY_YEARS[ev.year] || /rejoint la Confédération/i.test(ev.title);
      const tag = isCanton ? ` <em>${cnName(cn).toUpperCase()}</em>` : "";
      const title = pf(ev, "title");
      const desc = pf(ev, "desc");
      html += `<div class="tl-node ${isCanton ? "vd" : "ch"}">
          <span class="tl-pin"></span>
          <div class="tl-year">${ev.year}${tag}</div>
          <div class="tl-card${key ? " key" : ""}">
            <b>${title}</b>
            <p>${desc}${key ? ` <i>${t("tl.keyNote", "À retenir pour l'examen.")}</i>` : ""}</p>
          </div>
        </div>`;
    });
    if (open) html += `</div>`;
    $("timelineList").innerHTML = html;
  }

  function openTimeline() {
    const cn = cantonOf();
    // Le filtre courant peut être invalide après un changement de canton.
    if (timelineFilter !== "all" && timelineFilter !== "ch" && timelineFilter !== cn) timelineFilter = "all";
    const base = timelineBase();
    // Repères consultés : ouvrir la frise marque comme « vus » les événements affichés.
    let sd = false;
    base.forEach((e) => { const k = e.year + "|" + e.scope; if (state.seenDates.indexOf(k) < 0) { state.seenDates.push(k); sd = true; } });
    if (sd) save();
    const filters = [
      { key: "all", label: t("scope.all", "Tout"), dot: null },
      { key: "ch", label: t("misc.swiss", "Suisse"), dot: "var(--red)" },
      { key: cn, label: cnName(cn), dot: "var(--ok)" },
    ];
    const bar = $("timelineFilter");
    bar.innerHTML = filters.map((f) => {
      const n = f.key === "all" ? base.length : base.filter((t) => t.scope === f.key).length;
      const active = f.key === timelineFilter;
      const dot = f.dot ? `<span class="tl-fdot" style="background:${f.dot}"></span>` : "";
      return `<button class="tl-pill${active ? " active" : ""}" data-f="${f.key}">${dot}${f.label}${f.key === "all" ? " · " + n : ""}</button>`;
    }).join("");
    bar.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      timelineFilter = b.dataset.f; openTimeline();
    }));
    renderTimeline();
    showScreen("screen-timeline");
  }

  /* ---------------- Carte des districts (Vaud / Valais) ---------------- */
  const VS_REGION = {
    bas:  { color: "#3E7A4E", label: "Bas-Valais", labelEn: "Lower Valais", labelPt: "Baixo Valais" },
    cen:  { color: "#C8442E", label: "Valais central", labelEn: "Central Valais", labelPt: "Valais central" },
    haut: { color: "#5B7DB1", label: "Haut-Valais", labelEn: "Upper Valais", labelPt: "Alto Valais" },
  };
  const regionLabel = (k) => pf(VS_REGION[k], "label");
  function districtMap() { return (typeof DISTRICTS_MAPS !== "undefined") ? DISTRICTS_MAPS[cantonOf()] : null; }

  /* Fiche par district : chef-lieu + repère. Pour le Valais, la langue est déduite
     de la région (Haut-Valais = allemand, Valais central & Bas-Valais = français). */
  const DISTRICT_INFO = {
    // Vaud
    2221: { chef: "Aigle", note: "Chablais vaudois, vignobles ; Villars, Leysin, Bex.", en: "Vaud Chablais, vineyards; Villars, Leysin, Bex.", pt: "Chablais de Vaud, vinhedos; Villars, Leysin, Bex." },
    2222: { chef: "Payerne", note: "Broye ; abbatiale de Payerne, Avenches la romaine, lac de Morat.", en: "Broye; Payerne abbey, Roman Avenches, Lake Morat.", pt: "Broye; abadia de Payerne, Avenches romana, lago de Morat." },
    2223: { chef: "Échallens", note: "Le « grenier à blé » du canton, cœur agricole.", en: "The canton's « breadbasket », farming heartland.", pt: "O « celeiro » do cantão, coração agrícola." },
    2224: { chef: "Yverdon-les-Bains", note: "Nord vaudois ; Yverdon (thermes), Sainte-Croix, Vallorbe, Grandson.", en: "Northern Vaud; Yverdon (thermal baths), Sainte-Croix, Vallorbe, Grandson.", pt: "Norte de Vaud; Yverdon (termas), Sainte-Croix, Vallorbe, Grandson." },
    2225: { chef: "Lausanne", note: "Capitale du canton ; siège du CIO, cathédrale gothique.", en: "Cantonal capital; seat of the IOC, Gothic cathedral.", pt: "Capital do cantão; sede do COI, catedral gótica." },
    2226: { chef: "Bourg-en-Lavaux", note: "Terrasses viticoles de Lavaux (UNESCO), région d'Oron.", en: "Lavaux vineyard terraces (UNESCO), Oron region.", pt: "Terraços vinícolas de Lavaux (UNESCO), região de Oron." },
    2227: { chef: "Morges", note: "La Côte lémanique, vignobles, château de Morges.", en: "La Côte lakeshore, vineyards, Morges castle.", pt: "A Côte lemânica, vinhedos, castelo de Morges." },
    2228: { chef: "Nyon", note: "La Côte ; Nyon la romaine, Coppet, Rolle.", en: "La Côte; Roman Nyon, Coppet, Rolle.", pt: "A Côte; Nyon romana, Coppet, Rolle." },
    2229: { chef: "Renens", note: "Agglomération lausannoise ; EPFL et UNIL à Ecublens.", en: "Lausanne agglomeration; EPFL and UNIL in Ecublens.", pt: "Aglomeração de Lausanne; EPFL e UNIL em Ecublens." },
    2230: { chef: "Vevey", note: "Riviera ; Montreux (jazz), Vevey (Nestlé, Chaplin), Château-d'Œx.", en: "Riviera; Montreux (jazz), Vevey (Nestlé, Chaplin), Château-d'Œx.", pt: "Riviera; Montreux (jazz), Vevey (Nestlé, Chaplin), Château-d'Œx." },
    // Valais
    2301: { chef: "Brigue", note: "Château Stockalper, col et tunnel du Simplon.", en: "Stockalper Castle, Simplon pass and tunnel.", pt: "Castelo Stockalper, colo e túnel do Simplon." },
    2302: { chef: "Conthey", note: "Coteaux et vignobles au-dessus de la plaine du Rhône.", en: "Slopes and vineyards above the Rhône plain.", pt: "Encostas e vinhedos acima da planície do Ródano." },
    2303: { chef: "Sembrancher", note: "Verbier, val de Bagnes, col du Grand-Saint-Bernard.", en: "Verbier, Bagnes valley, Great St Bernard pass.", pt: "Verbier, vale de Bagnes, colo do Grande São Bernardo." },
    2304: { chef: "Münster", note: "Haute vallée du Rhône ; proche du glacier d'Aletsch (UNESCO).", en: "Upper Rhône valley; near the Aletsch Glacier (UNESCO).", pt: "Alto vale do Ródano; perto do glaciar de Aletsch (UNESCO)." },
    2305: { chef: "Vex", note: "Val d'Hérens, Évolène ; célèbre pour les combats de reines.", en: "Hérens valley, Évolène; famous for the cow fights (combats de reines).", pt: "Vale de Hérens, Évolène; famoso pelos combates de vacas (reines)." },
    2306: { chef: "Loèche", note: "Loèche-les-Bains, plus grande station thermale des Alpes.", en: "Leukerbad, the largest thermal resort in the Alps.", pt: "Loèche-les-Bains, a maior estância termal dos Alpes." },
    2307: { chef: "Martigny", note: "Coude du Rhône ; amphithéâtre romain, Fondation Gianadda.", en: "Bend of the Rhône; Roman amphitheatre, Gianadda Foundation.", pt: "Cotovelo do Ródano; anfiteatro romano, Fundação Gianadda." },
    2308: { chef: "Monthey", note: "Val d'Illiez, Champéry, domaine des Portes du Soleil.", en: "Illiez valley, Champéry, Portes du Soleil ski area.", pt: "Vale de Illiez, Champéry, domínio das Portes du Soleil." },
    2309: { chef: "Rarogne", note: "Église dans le rocher ; tombe du poète Rilke.", en: "Church carved into the rock; grave of the poet Rilke.", pt: "Igreja escavada na rocha; túmulo do poeta Rilke." },
    2310: { chef: "Saint-Maurice", note: "Abbaye fondée en 515, la plus ancienne d'Occident encore active.", en: "Abbey founded in 515, the oldest still active in the West.", pt: "Abadia fundada em 515, a mais antiga do Ocidente ainda ativa." },
    2311: { chef: "Sierre", note: "Crans-Montana, val d'Anniviers ; ville la plus ensoleillée.", en: "Crans-Montana, Anniviers valley; the sunniest town.", pt: "Crans-Montana, vale de Anniviers; a cidade mais soalheira." },
    2312: { chef: "Sion", note: "Capitale du canton ; châteaux de Valère et Tourbillon.", en: "Cantonal capital; Valère and Tourbillon castles.", pt: "Capital do cantão; castelos de Valère e Tourbillon." },
    2313: { chef: "Viège", note: "Vallées de Zermatt (Cervin) et de Saas-Fee.", en: "Valleys of Zermatt (Matterhorn) and Saas-Fee.", pt: "Vales de Zermatt (Matterhorn) e de Saas-Fee." },
  };
  const VS_LANG = { haut: "Allemand (Haut-Valais)", cen: "Français (Valais central)", bas: "Français (Bas-Valais)" };
  const VS_LANG_L = {
    en: { haut: "German (Upper Valais)", cen: "French (Central Valais)", bas: "French (Lower Valais)" },
    pt: { haut: "Alemão (Alto Valais)", cen: "Francês (Valais central)", bas: "Francês (Baixo Valais)" },
  };
  const vsLang = (r) => { const m = VS_LANG_L[state.lang]; return (m && m[r]) || VS_LANG[r] || ""; };

  function showDistrictInfo(d) {
    const box = $("vsdInfo");
    if (!box) return;
    const info = DISTRICT_INFO[d.id];
    const rows = [];
    if (info && info.chef) rows.push(`<div class="vsd-row"><span><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg> ${t("district.chef", "Chef-lieu")}</span><b>${info.chef}</b></div>`);
    if (cantonOf() === "VS" && d.region) rows.push(`<div class="vsd-row"><span><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M5 9v6h4l5 4V5L9 9z'/><path d='M17 9a3 3 0 0 1 0 6'/></svg> ${t("district.lang", "Langue")}</span><b>${vsLang(d.region)}</b></div>`);
    const note = info ? (state.lang === "fr" ? info.note : (info[state.lang] || info.note)) : "";
    box.innerHTML = `<div class="vsd-info-h"><span class="vsd-dot" style="background:${d.color}"></span>${d.name}</div>` +
      rows.join("") + (note ? `<p class="vsd-note">${note}</p>` : "");
    box.hidden = false;
  }
  function hideDistrictInfo() { const box = $("vsdInfo"); if (box) box.hidden = true; }

  function openDistricts() {
    const m = districtMap();
    if (!m) return;
    const svg = $("vsMapSvg");
    $("vsMapTitle").textContent = fmt(t(cantonOf() === "VS" ? "district.titleVS" : "district.titleVD", "Les {n} districts " + (cantonOf() === "VS" ? "du Valais" : "vaudois")), { n: m.districts.length });
    $("vsMapNote").innerHTML = cantonOf() === "VS"
      ? t("district.noteVS", "Les <b>13 étoiles</b> du drapeau valaisan représentent ces <b>13 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes).")
      : t("district.noteVD", "Le canton de Vaud compte <b>10 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes).");

    hideDistrictInfo();

    // (Re)construire la carte si le canton a changé.
    if (svg.dataset.canton !== cantonOf()) {
      svg.setAttribute("viewBox", m.viewBox);
      svg.innerHTML =
        m.districts.map((d) => `<path class="vsd-path" data-id="${d.id}" d="${d.d}" fill="${d.color}" fill-rule="evenodd"/>`).join("") +
        m.districts.map((d) => `<text class="vsd-label" data-id="${d.id}" x="${d.cx}" y="${d.cy}" text-anchor="middle">${d.name}</text>`).join("");
      svg.dataset.canton = cantonOf();
    }

    // Sélection partagée entre la carte et les puces de la liste.
    function selectDistrict(id) {
      const p = svg.querySelector(`.vsd-path[data-id="${id}"]`);
      const on = p && !p.classList.contains("sel");
      svg.querySelectorAll(".vsd-path").forEach((x) => x.classList.remove("sel"));
      document.querySelectorAll(".vsd-chip").forEach((x) => x.classList.remove("on"));
      if (on) {
        p.classList.add("sel"); svg.appendChild(p);
        const lbl = svg.querySelector(`.vsd-label[data-id="${id}"]`);
        if (lbl) svg.appendChild(lbl);
        const chip = document.querySelector(`.vsd-chip[data-id="${id}"]`);
        if (chip) chip.classList.add("on");
        const d = m.districts.find((x) => String(x.id) === String(id));
        if (d) showDistrictInfo(d);
      } else {
        hideDistrictInfo();
      }
    }
    svg.querySelectorAll(".vsd-path").forEach((p) => { p.onclick = () => selectDistrict(p.dataset.id); });

    // Légende (par région) + liste.
    if (m.hasRegions) {
      $("vsMapLegend").innerHTML = Object.keys(VS_REGION).map((k) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${VS_REGION[k].color}"></span>${regionLabel(k)}</span>`).join("");
      const byReg = { bas: [], cen: [], haut: [] };
      m.districts.forEach((d) => byReg[d.region].push(d));
      $("vsdList").innerHTML = Object.keys(VS_REGION).map((k) =>
        `<div class="vsd-group">
           <div class="vsd-region"><span class="vsd-dot" style="background:${VS_REGION[k].color}"></span>${regionLabel(k)}</div>
           <div class="vsd-items">` +
           byReg[k].map((d) => `<span class="vsd-chip" data-id="${d.id}">${d.name}</span>`).join("") +
           `</div></div>`).join("");
    } else {
      $("vsMapLegend").innerHTML = "";
      $("vsdList").innerHTML =
        `<div class="vsd-group"><div class="vsd-items">` +
        m.districts.map((d) => `<span class="vsd-chip" data-id="${d.id}"><span class="vsd-dot" style="background:${d.color};display:inline-block;vertical-align:-1px;margin-right:6px"></span>${d.name}</span>`).join("") +
        `</div></div>`;
    }
    document.querySelectorAll(".vsd-chip").forEach((c) => { c.onclick = () => selectDistrict(c.dataset.id); c.style.cursor = "pointer"; });
    showScreen("screen-vsmap");
  }

  /* ======================================================================
   *  COMPRENDRE LA SUISSE (système politique · piliers · santé)
   * ==================================================================== */
  /* Institutions communales par canton (les noms diffèrent). */
  const COMMUNE_INST = {
    VD: { legis: "Conseil communal (ou Conseil général)", exec: "Municipalité", head: "syndic" },
    GE: { legis: "Conseil municipal", exec: "Conseil administratif", head: "maire" },
    NE: { legis: "Conseil général", exec: "Conseil communal", head: "président·e de commune" },
    VS: { legis: "Conseil général (ou Assemblée primaire)", exec: "Conseil municipal", head: "président·e de commune" },
  };

  /* Données d'élection par canton (composition + durée du mandat, en années). */
  const ELECT = {
    VD: { gc: 150, ce: 7, tCant: 5, tCom: 5 },
    GE: { gc: 100, ce: 7, tCant: 5, tCom: 5 },
    NE: { gc: 100, ce: 5, tCant: 4, tCom: 4 },
    VS: { gc: 130, ce: 5, tCant: 4, tCom: 4 },
  };
  const termLabel = (yrs) => state.lang === "en" ? (yrs + "-year term") : (state.lang === "pt" ? ("mandato de " + yrs + " anos") : ("mandat " + yrs + " ans"));

  function qeCard(kind, role, name, meta, by, byKind) {
    return `<div class="qe-card qe-${kind}">
        <span class="qe-role">${role}</span>
        <b>${name}</b>
        <span class="qe-meta">${meta}</span>
        <span class="qe-by qe-by-${byKind}">${by}</span>
      </div>`;
  }
  function qeLevel(title, cards) {
    return `<div class="qe-level"><span class="qe-lvl">${title}</span><div class="qe-cards">${cards}</div></div>`;
  }

  function polLevel(title, sub, rows) {
    return `<div class="pol-level">
        <div class="pol-head"><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</div>` +
        rows.map((r) => `<div class="pol-row pol-${r.k}">
            <span class="pol-ico">${r.ico}</span>
            <div class="pol-txt"><span class="pol-power">${r.power}</span><b>${r.body}</b>${r.note ? `<small>${r.note}</small>` : ""}</div>
          </div>`).join("") +
      `</div>`;
  }

  function openPolitique() {
    const cn = cantonOf();
    const ci = COMMUNE_INST[cn] || COMMUNE_INST.VD;
    const cantonNm = cnName(cn);
    const legis = t("commune.legis." + cn, ci.legis);
    const exec = t("commune.exec." + cn, ci.exec);
    const head = t("commune.head." + cn, ci.head);
    const cantonTitle = fmt(t("pol.cantonT", "Canton de {c}"), { c: cantonNm });
    const gc = t("pol.gc", "Grand Conseil"), ce = t("pol.ce", "Conseil d'État");
    const chairedBy = state.lang === "en" ? ("chaired by the " + head) : (state.lang === "pt" ? ("presidido por " + head) : ("présidé·e par le·la " + head));
    $("politiqueBody").innerHTML =
      `<p class="cs-intro">${t("pol.intro", "La Suisse repose sur <b>3 niveaux</b> (Confédération · Canton · Commune) et sur la <b>séparation des 3 pouvoirs</b> : qui fait les lois, qui gouverne, qui juge.")}</p>` +
      polLevel(t("pol.confedT", "Confédération"), t("pol.confedSub", "niveau fédéral · Suisse"), [
        { k: "leg", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3h9a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V6'/><path d='M5 6a2 2 0 0 1 4 0v11'/></svg>", power: t("pol.legis", "Législatif — fait les lois"), body: t("pol.assemblee", "Assemblée fédérale"), note: t("pol.assembleeNote", "Conseil national (200 · élu par le peuple) + Conseil des États (46 · représente les cantons)") },
        { k: "exe", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg>", power: t("pol.exec", "Exécutif — gouverne"), body: t("pol.cf", "Conseil fédéral (7 ministres)"), note: t("pol.cfNote", "Présidence tournante 1 an : le·la Président·e de la Confédération") },
        { k: "jud", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 4v16'/><path d='M6 21h12'/><path d='M4 8l16-2'/><path d='M6 8l-2.5 6a3 3 0 0 0 5 0z'/><path d='M18 6l-2.5 6a3 3 0 0 0 5 0z'/></svg>", power: t("pol.judic", "Judiciaire — juge"), body: t("pol.tf", "Tribunal fédéral"), note: t("pol.tfNote", "à Lausanne") },
      ]) +
      polLevel(cantonTitle, t("pol.cantonSub", "niveau cantonal"), [
        { k: "leg", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3h9a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V6'/><path d='M5 6a2 2 0 0 1 4 0v11'/></svg>", power: t("pol.legisShort", "Législatif"), body: gc, note: t("pol.gcNote", "le parlement cantonal") },
        { k: "exe", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg>", power: t("pol.execShort", "Exécutif"), body: ce, note: t("pol.ceNote", "le gouvernement cantonal") },
        { k: "jud", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 4v16'/><path d='M6 21h12'/><path d='M4 8l16-2'/><path d='M6 8l-2.5 6a3 3 0 0 0 5 0z'/><path d='M18 6l-2.5 6a3 3 0 0 0 5 0z'/></svg>", power: t("pol.judic", "Judiciaire"), body: t("pol.tc", "Tribunal cantonal"), note: "" },
      ]) +
      polLevel(t("pol.communeT", "Commune"), fmt(t("pol.communeSub", "niveau communal · {c}"), { c: cantonNm }), [
        { k: "leg", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3h9a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V6'/><path d='M5 6a2 2 0 0 1 4 0v11'/></svg>", power: t("pol.legisShort", "Législatif"), body: legis, note: "" },
        { k: "exe", ico: "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg>", power: t("pol.execShort", "Exécutif"), body: exec, note: chairedBy },
      ]) +
      (() => {
        const e = ELECT[cn] || ELECT.VD;
        const gcN = e.gc + " " + t("pol.deputes", "député·es");
        const ceN = e.ce + " " + t("pol.conseillers", "conseiller·ères");
        return `<h3 class="cs-h">${t("pol.qeH", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> Qui élit qui ?")}</h3>
          <p class="cs-intro">${t("pol.qeIntro", "Le <b>peuple</b> (Suisses dès <b>18 ans</b>) élit directement les <b>parlements</b> aux 3 niveaux, et aussi les <b>gouvernements</b> — sauf au niveau fédéral, où le Conseil fédéral est élu par le Parlement.")}</p>
          <div class="qe-peuple">${t("pol.people", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><path d='M16 5.5a3 3 0 0 1 0 5'/><path d='M17.5 20a6 6 0 0 0-3-5'/></svg> Le peuple &nbsp;·&nbsp; citoyen·nes suisses dès 18 ans")}</div>
          <div class="qe-arrow">${t("pol.elects", "élit ↓")}</div>` +
          qeLevel(t("pol.confedT", "Confédération"),
            qeCard("leg", t("pol.roleLegFed", "Législatif · fait les lois"), t("pol.cnCe", "Conseil national + Conseil des États"), t("pol.cnCeMeta", "200 + 46 · mandat 4 ans"), t("pol.byPeopleFed", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> élus directement par le peuple"), "people") +
            qeCard("exe", t("pol.roleExeFed", "Exécutif · gouverne"), t("pol.cf", "Conseil fédéral"), t("pol.cfMeta", "7 ministres · mandat 4 ans"), t("pol.byParl", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg> élu par le Parlement (pas le peuple)"), "parl")
          ) +
          qeLevel(cantonTitle,
            qeCard("leg", t("pol.legisShort", "Législatif"), gc, gcN + " · " + termLabel(e.tCant), t("pol.byPeople", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> élu directement par le peuple"), "people") +
            qeCard("exe", t("pol.execShort", "Exécutif"), ce, ceN + " · " + termLabel(e.tCant), t("pol.byPeople", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> élu directement par le peuple"), "people")
          ) +
          qeLevel(t("pol.communeT", "Commune"),
            qeCard("leg", t("pol.legisShort", "Législatif"), legis, termLabel(e.tCom), t("pol.byPeopleOr", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> élu par le peuple (ou assemblée)"), "people") +
            qeCard("exe", t("pol.execShort", "Exécutif"), exec, chairedBy + " · " + termLabel(e.tCom), t("pol.byPeople", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg> élu directement par le peuple"), "people")
          ) +
          `<div class="cs-card cs-highlight">
             <div class="cs-card-h">${t("pol.takeawayH", "À retenir")}</div>
             <ul class="cs-list">${t("pol.takeaway", [
               "<b>Canton & commune</b> : le peuple élit <b>parlement ET gouvernement</b> directement.",
               "<b>Confédération</b> : le peuple élit le <b>Parlement</b> (les 2 chambres) ; c'est ensuite ce Parlement qui élit le <b>Conseil fédéral</b>.",
               "La <b>présidence de la Confédération</b> tourne chaque année entre les 7 conseiller·ères fédéraux.",
               "<b>Démocratie directe</b> : le peuple vote aussi les <b>initiatives</b> et <b>référendums</b> (les votations).",
             ]).map((li) => `<li>${li}</li>`).join("")}</ul>
           </div>`;
      })();
    showScreen("screen-politique");
  }

  function openPiliers() {
    const sysLbl = t("pil.sys", "Système"), butLbl = t("pil.but", "But");
    const pillar = (n, color, name, sub, tag, sys, but) =>
      `<div class="cs-pillar">
         <div class="cs-pillar-top"><span class="cs-pillar-n" style="background:${color}">${n}</span>
           <div><b>${name}</b><small>${sub}</small></div></div>
         <span class="cs-tag" style="color:${color};border-color:${color}">${tag}</span>
         <div class="cs-pillar-row"><span>${sysLbl}</span><b>${sys}</b></div>
         <div class="cs-pillar-row"><span>${butLbl}</span><b>${but}</b></div>
       </div>`;
    $("piliersBody").innerHTML =
      `<p class="cs-intro">${t("pil.intro", "La <b>prévoyance vieillesse</b> suisse repose sur <b>3 piliers</b>, pour garder son niveau de vie une fois à la retraite.")}</p>` +
      pillar("1", "#C8442E", t("pil.1name", "AVS / AI"), t("pil.1sub", "Assurance-vieillesse, survivants et invalidité"), t("pil.1tag", "Obligatoire · État"),
             t("pil.1sys", "Répartition : les personnes qui travaillent financent les retraité·es"), t("pil.1but", "Couvrir les besoins vitaux (minimum)")) +
      pillar("2", "#3E7A4E", t("pil.2name", "LPP"), t("pil.2sub", "Prévoyance professionnelle (caisse de pension)"), t("pil.2tag", "Obligatoire dès ~22 050 CHF/an"),
             t("pil.2sys", "Capitalisation : on épargne pour soi (employeur + employé cotisent)"), t("pil.2but", "Maintenir le niveau de vie habituel")) +
      pillar("3", "#5B7DB1", t("pil.3name", "3ᵉ pilier"), t("pil.3sub", "Prévoyance privée — 3a (lié) · 3b (libre)"), t("pil.3tag", "Facultatif"),
             t("pil.3sys", "Épargne individuelle (avantages fiscaux pour le 3a)"), t("pil.3but", "Compléter les 1er et 2e piliers")) +
      `<p class="cs-note">${t("pil.note", "Avec les 1er et 2e piliers réunis, on vise environ <b>60 %</b> du dernier salaire à la retraite.")}</p>`;
    showScreen("screen-piliers");
  }

  function openSante() {
    const card = (ico, title, body) =>
      `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
    $("santeBody").innerHTML =
      `<p class="cs-intro">${t("san.intro", "En Suisse, l'<b>assurance maladie de base est obligatoire</b> — mais fournie par des <b>caisses privées</b> que chacun choisit librement.")}</p>` +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M6 3v6a4 4 0 0 0 8 0V3'/><path d='M10 13a5 5 0 0 0 5 5 3 3 0 0 0 3-3v-1'/><circle cx='18' cy='11' r='2'/></svg>", t("san.baseT", "Assurance de base (LAMal)"), t("san.base", "Obligatoire pour toute personne qui habite en Suisse (à souscrire dans les 3 mois). Les prestations de base sont les mêmes partout.")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 10a8 8 0 0 1 13.9-4.4'/><path d='M20 14a8 8 0 0 1-13.9 4.4'/><path d='M18 2v4h-4'/><path d='M6 22v-4h4'/></svg>", t("san.freeT", "Libre choix de la caisse"), t("san.free", "On choisit librement sa caisse maladie (assureur), et on peut en changer chaque année. Les caisses ne peuvent pas refuser l'assurance de base.")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='8' cy='8' r='5'/><path d='M15 6a5 5 0 1 1 0 10'/><path d='M6 8h4'/></svg>", t("san.primeT", "Prime & participation"), t("san.prime", "Chacun paie une <b>prime</b> mensuelle par personne (indépendante du revenu). S'ajoutent une <b>franchise</b> annuelle et une <b>quote-part</b> (part des frais à sa charge).")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><path d='M16 5.5a3 3 0 0 1 0 5'/><path d='M17.5 20a6 6 0 0 0-3-5'/></svg>", t("san.subT", "Subsides"), t("san.sub", "Les personnes et familles à revenu modeste reçoivent des <b>subsides</b> (réductions de primes) versés par le canton.")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M12 8v8'/><path d='M8 12h8'/></svg>", t("san.compT", "Assurances complémentaires"), t("san.comp", "Facultatives (LCA) : chambre privée à l'hôpital, soins dentaires, médecines alternatives… Les caisses peuvent y poser des conditions."));
    showScreen("screen-sante");
  }

  function openAssurances() {
    const branch = (sig, name, desc) =>
      `<div class="as-branch"><span class="as-sig">${sig}</span>
         <div class="as-txt"><b>${name}</b><small>${desc}</small></div></div>`;
    const domain = (ico, title, rows) =>
      `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div>${rows}</div>`;
    $("assurancesBody").innerHTML =
      `<p class="cs-intro">${t("asr.intro", "La Suisse protège chacun contre les grands risques de la vie par un système d'<b>assurances sociales</b>. La plupart sont <b>obligatoires</b> et financées par des <b>cotisations</b> prélevées sur les salaires.")}</p>` +
      domain("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='8' r='4'/><path d='M5 21a7 7 0 0 1 14 0'/></svg>", t("asr.d1", "Vieillesse · invalidité · décès"),
        branch("AVS", t("asr.avsN", "Assurance-vieillesse et survivants"), t("asr.avsD", "Rente de retraite (âge de référence 65 ans) et rentes aux survivants (conjoint, orphelins). <b>1er pilier</b>, obligatoire.")) +
        branch("AI", t("asr.aiN", "Assurance-invalidité"), t("asr.aiD", "Mesures de réadaptation et rente en cas d'incapacité de gain durable. 1er pilier.")) +
        branch("PC", t("asr.pcN", "Prestations complémentaires"), t("asr.pcD", "Complètent l'AVS/AI lorsqu'elles ne suffisent pas à couvrir les besoins vitaux.")) +
        branch("LPP", t("asr.lppN", "Prévoyance professionnelle"), t("asr.lppD", "La caisse de pension complète l'AVS pour garder son niveau de vie. <b>2e pilier</b> → voir « Les 3 piliers »."))) +
      domain("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M6 3v6a4 4 0 0 0 8 0V3'/><path d='M10 13a5 5 0 0 0 5 5 3 3 0 0 0 3-3v-1'/><circle cx='18' cy='11' r='2'/></svg>", t("asr.d2", "Maladie · accident"),
        branch("LAMal", t("asr.lamalN", "Assurance-maladie"), t("asr.lamalD", "Soins en cas de maladie et de maternité. Obligatoire pour tout résident → voir « Système de santé ».")) +
        branch("LAA", t("asr.laaN", "Assurance-accidents"), t("asr.laaD", "Accidents professionnels, non professionnels et maladies professionnelles. Obligatoire pour les salarié·es (l'employeur paie la part accidents pro)."))) +
      domain("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='7' width='18' height='13' rx='2'/><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M3 12h18'/></svg>", t("asr.d3", "Revenu remplacé"),
        branch("APG", t("asr.apgN", "Allocations pour perte de gain"), t("asr.apgD", "Compensent le salaire pendant le <b>service militaire/civil</b>, le <b>congé maternité</b> (14 sem.) et le <b>congé paternité</b> (2 sem.).")) +
        branch("AC", t("asr.acN", "Assurance-chômage"), t("asr.acD", "Indemnités en cas de perte d'emploi (après au moins 12 mois de cotisation) et aide à la réinsertion. Obligatoire pour les salarié·es."))) +
      domain("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><path d='M16 5.5a3 3 0 0 1 0 5'/><path d='M17.5 20a6 6 0 0 0-3-5'/></svg>", t("asr.d4", "Famille"),
        branch("AF", t("asr.afN", "Allocations familiales"), t("asr.afD", "Allocation pour enfant (min. <b>200 CHF</b>/mois) et de formation (min. <b>250 CHF</b>/mois). Minimums fédéraux — les cantons peuvent faire plus."))) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='8' cy='8' r='5'/><path d='M15 6a5 5 0 1 1 0 10'/><path d='M6 8h4'/></svg> ${t("asr.finT", "Comment est-ce financé ?")}</div>
         <p>${t("asr.fin", "La plupart des assurances sociales sont payées par des <b>cotisations paritaires</b> : un pourcentage du salaire, <b>moitié par l'employé, moitié par l'employeur</b>. Exception : l'assurance-maladie (LAMal), payée par une <b>prime individuelle</b> par personne, indépendante du revenu.")}</p></div>` +
      `<p class="cs-note">${t("asr.note", "La prévoyance vieillesse (AVS + LPP + 3ᵉ pilier) est détaillée dans « Les 3 piliers » ; l'assurance-maladie dans « Système de santé ».")}</p>`;
    showScreen("screen-assurances");
  }

  /* Sources officielles des banques de questions, par canton (+ dates connues). */
  const SOURCES = {
    VD: { auth: "État de Vaud", srcFr: "Outil officiel d'entraînement au test de connaissances", srcEn: "Official knowledge-test practice tool", url: "https://www.vd.ch/prestations/naturalisation", host: "vd.ch", dateFr: "consulté en juillet 2026", dateEn: "accessed July 2026" },
    GE: { auth: "République et canton de Genève", srcFr: "E-learning officiel « Connaître la Suisse et Genève »", srcEn: "Official e-learning « Getting to know Switzerland and Geneva »", url: "https://outils.ge.ch/e-learning/connaitre-suisse/", host: "outils.ge.ch", dateFr: "consulté en juillet 2026", dateEn: "accessed July 2026" },
    NE: { auth: "République et canton de Neuchâtel", srcFr: "Questionnaire officiel avec réponses", srcEn: "Official questionnaire with answers", url: "https://www.ne.ch", host: "ne.ch", dateFr: "édition janvier 2026", dateEn: "January 2026 edition" },
    VS: { auth: "Canton du Valais", srcFr: "Questionnaire officiel (questions et réponses)", srcEn: "Official questionnaire (questions and answers)", url: "https://www.vs.ch", host: "vs.ch", dateFr: "questions : novembre 2021 · réponses : août 2022", dateEn: "questions: November 2021 · answers: August 2022" },
  };

  function openAbout() {
    const cn = cantonOf();
    const en = state.lang === "en";
    const srcRow = (k) => {
      const s = SOURCES[k];
      return `<div class="src-row${k === cn ? " src-cur" : ""}">
          <span class="src-canton">${cnName(k)}</span>
          <div class="src-detail">
            <b>${s.auth}</b>
            <span>${en ? s.srcEn : s.srcFr}</span>
            <span class="src-date"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='5' width='16' height='16' rx='2'/><path d='M4 9h16'/><path d='M8 3v4'/><path d='M16 3v4'/></svg> ${en ? s.dateEn : s.dateFr}</span>
            <a href="${s.url}" target="_blank" rel="noopener">${s.host} ↗</a>
          </div>
        </div>`;
    };
    const order = [cn].concat(["VD", "GE", "NE", "VS"].filter((x) => x !== cn));
    $("aboutBody").innerHTML =
      `<div class="cs-card cs-highlight about-disclaimer">
         <div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l9 16H3z'/><path d='M12 10v4'/><path d='M12 17h.01'/></svg> ${t("about.discH", "Application non officielle")}</div>
         <p>${t("about.disc", "NatiCoach est un outil d'entraînement <b>indépendant</b>, <b>non affilié aux autorités cantonales</b> et sans lien officiel avec elles. Les questions proviennent des <b>questionnaires officiels</b> publiés par les cantons sur leurs sites, mais <b>ce n'est pas une application officielle</b> et nous <b>ne pouvons pas garantir</b> qu'il s'agit de la version la plus récente. Les questionnaires peuvent évoluer : vérifie toujours les informations à jour auprès de ta <b>commune</b> ou de ton <b>canton</b>.")}</p>
       </div>` +
      `<h3 class="cs-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z'/><path d='M4 19a2 2 0 0 1 2-2h13'/></svg> ${t("about.sourcesH", "Sources des questions")}</h3>` +
      `<div class="cs-card src-list">${order.map(srcRow).join("")}</div>` +
      csCard("", t("about.answersH", "Réponses & propositions"), t("about.answers", "Seule la <b>bonne réponse</b> est officielle. Pour Neuchâtel et le Valais, les <b>fausses propositions</b> des QCM sont générées par l'app pour aider à mémoriser — elles ne proviennent pas des questionnaires officiels.")) +
      `<p class="cs-note">${t("about.offline", "NatiCoach fonctionne hors-ligne ; aucune donnée ne quitte ton téléphone.")}</p>` +
      `<div class="legal-links">
         <button class="legal-link" id="btnCgu">${t("about.cgu", "Conditions générales")} ›</button>
         <button class="legal-link" id="btnPrivacy">${t("about.privacy", "Politique de confidentialité")} ›</button>
       </div>`;
    const bc = $("btnCgu"); if (bc) bc.addEventListener("click", openCgu);
    const bp = $("btnPrivacy"); if (bp) bp.addEventListener("click", openPrivacy);
    showScreen("screen-about");
  }

  /* ---------------- Premium (achat unique) ---------------- */
  const PREMIUM_PRICE = "CHF 14.90";

  function openPremium() {
    if (isPremium()) {
      $("premiumBody").innerHTML =
        `<div class="pr-hero pr-owned"><div class="pr-badge">${MK_OK}</div>
           <h3>${t("premium.ownedTitle", "Tu as la version premium")}</h3>
           <p>${t("premium.ownedMsg", "Merci ! Tout est débloqué. Bonne préparation.")}</p></div>`;
      showScreen("screen-premium"); return;
    }
    const feat = (ico, txt) => `<li><span class="pr-ico">${ico}</span>${txt}</li>`;
    $("premiumBody").innerHTML =
      `<div class="pr-hero">
         <img class="pr-flower" src="logo-edelweiss-red.svg" alt="" width="40" height="40" />
         <h3>${t("premium.title", "Débloque toute ta préparation")}</h3>
         <p>${t("premium.sub", "Un seul achat, à vie. Aucun abonnement.")}</p>
       </div>
       <ul class="pr-feats">
         ${feat("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z'/><path d='M4 19a2 2 0 0 1 2-2h13'/></svg>", t("premium.f1", "<b>Toutes les questions</b> officielles de ton canton"))}
         ${feat("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4'/></svg>", t("premium.f2", "La <b>simulation d'examen complète</b> (conditions réelles, minuteur)"))}
         ${feat("", t("premium.f3", "<b>Statistiques</b> et suivi de progression"))}
         ${feat("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 10a8 8 0 0 1 13.9-4.4'/><path d='M20 14a8 8 0 0 1-13.9 4.4'/><path d='M18 2v4h-4'/><path d='M6 22v-4h4'/></svg>", t("premium.f4", "Révision de <b>toutes tes erreurs</b>"))}
         ${feat("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M3 12h18'/><path d='M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z'/></svg>", t("premium.f5", "Les futures <b>langues et mises à jour</b>, sans repayer"))}
       </ul>
       <div class="pr-cta-wrap">
         <button class="btn btn-primary big" id="btnPremiumBuy">${fmt(t("premium.buy", "Débloquer · {p}"), { p: PREMIUM_PRICE })}</button>
         <button class="btn btn-ghost" id="btnPremiumRestore">${t("premium.restore", "Restaurer mon achat")}</button>
         <p class="pr-note">${t("premium.note", "Paiement unique via l'App Store / Google Play. Débloqué à vie sur cet appareil.")}</p>
       </div>`;
    const buy = $("btnPremiumBuy"); if (buy) buy.addEventListener("click", purchasePremium);
    const res = $("btnPremiumRestore"); if (res) res.addEventListener("click", restorePurchase);
    showScreen("screen-premium");
  }

  /* Achat premium. TODO : brancher RevenueCat (Purchases.purchasePackage) une fois l'app emballée en Capacitor.
     Pour l'instant (app web / test) : déblocage local après confirmation. */
  function purchasePremium() {
    if (typeof window.NatiPurchase === "function") { window.NatiPurchase(); return; } // point d'ancrage IAP natif
    if (confirm(t("premium.testConfirm", "(Version de test) Débloquer NatiCoach Premium sans paiement ?"))) {
      state.premium = true; save();
      toast("", t("premium.unlocked", "Premium débloqué — merci !"));
      renderHome(); showScreen("screen-home");
    }
  }
  function restorePurchase() {
    if (typeof window.NatiRestore === "function") { window.NatiRestore(); return; }
    alert(t("premium.restoreTodo", "La restauration d'achat sera disponible dans la version publiée sur les stores."));
  }

  /* ---------------- Mentions légales (CGU + confidentialité) ---------------- */
  /* Modèles rédactionnels — à faire valider par un·e avocat·e. Zones [entre crochets] à compléter. */
  const legalSec = (n, title, body) => `<div class="legal-sec"><h3>${n}. ${title}</h3><p>${body}</p></div>`;
  const legalDraftNote = () => `<p class="legal-draft">${t("legal.draft", "Modèle à faire valider par un·e avocat·e avant publication.")}</p>`;

  function openCgu() {
    $("cguBody").innerHTML = legalDraftNote() +
      `<p class="legal-meta">${t("legal.cguIntro", "Conditions Générales d'Utilisation et de Vente — NatiCoach · Version 1.0")}</p>` +
      legalSec(1, "Éditeur", "L'application <b>NatiCoach</b> (« l'Application ») est éditée par <b>Pascal Tea</b>, personne physique exerçant en <b>raison individuelle</b>, <b>Route d'Arnex 9, 1262 Eysins</b>, Suisse (« l'Éditeur »). Contact : <b>contact@naticoach.ch</b>.") +
      legalSec(2, "Objet", "Les présentes conditions régissent l'accès et l'utilisation de l'Application, un <b>outil d'entraînement pédagogique</b> à la préparation du test de connaissances de la naturalisation suisse. En utilisant l'Application, l'utilisateur·rice les accepte.") +
      legalSec(3, "Absence de caractère officiel", "NatiCoach est un outil <b>indépendant</b>, <b>non affilié</b> et non approuvé par les autorités (Confédération, cantons, communes). Les questions s'inspirent de questionnaires officiels rendus publics ; l'Éditeur ne garantit ni leur exactitude ni leur mise à jour. Seule fait foi l'information de l'autorité compétente.") +
      legalSec(4, "Absence de garantie de résultat", "L'Application est fournie « en l'état » et <b>ne garantit pas la réussite</b> au test ni l'obtention de la nationalité. Les explications et propositions de réponses sont à visée pédagogique ; seule la bonne réponse reflète le contenu officiel.") +
      legalSec(5, "Version gratuite et premium", "L'Application propose un accès gratuit limité et un accès complet « premium » par <b>achat unique</b>. L'achat s'effectue exclusivement via <b>l'App Store</b> ou <b>Google Play</b>. Le déblocage est définitif : aucune somme supplémentaire n'est due pour les mises à jour futures.") +
      legalSec(6, "Prix, facturation, remboursement", "Le prix est indiqué en CHF. La facturation, l'encaissement et les demandes de <b>remboursement</b> relèvent des politiques d'<b>Apple / Google</b> ; l'Éditeur n'a pas accès aux moyens de paiement.") +
      legalSec(7, "Propriété intellectuelle", "L'Application, son code, son design, la marque « NatiCoach », les textes explicatifs et illustrations sont protégés et demeurent la propriété de l'Éditeur. L'utilisateur·rice bénéficie d'un droit d'usage <b>personnel</b>. Toute revente, extraction ou rediffusion non autorisée est interdite.") +
      legalSec(8, "Données personnelles", "L'Application fonctionne <b>hors-ligne</b> ; la progression est stockée <b>localement</b> sur l'appareil. Voir la <b>Politique de confidentialité</b>.") +
      legalSec(9, "Responsabilité", "Dans les limites de la loi, l'Éditeur décline toute responsabilité pour les dommages indirects, les décisions prises sur la base du contenu, ou l'inexactitude des questions. La responsabilité est limitée au montant payé pour l'accès premium.") +
      legalSec(10, "Modifications", "L'Éditeur peut modifier l'Application et les présentes conditions ; la version applicable est celle en vigueur lors de l'utilisation.") +
      legalSec(11, "Droit applicable et for", "Droit <b>suisse</b>. For au domicile de l'Éditeur, canton de <b>Vaud</b>, sous réserve des dispositions impératives protégeant les consommateurs.");
    showScreen("screen-cgu");
  }

  function openPrivacy() {
    $("privacyBody").innerHTML = legalDraftNote() +
      `<p class="legal-meta">${t("legal.privIntro", "Politique de confidentialité — NatiCoach · Version 1.0")}</p>` +
      legalSec(1, "Responsable", "<b>Pascal Tea</b>, <b>Route d'Arnex 9, 1262 Eysins</b>, Suisse. Contact : <b>contact@naticoach.ch</b>.") +
      legalSec(2, "Principe : hors-ligne", "NatiCoach est conçue pour fonctionner <b>hors-ligne</b>. Ta progression (scores, statistiques, réglages) est enregistrée <b>uniquement sur ton appareil</b> et <b>n'est pas transmise</b> à l'Éditeur ni à des tiers.") +
      legalSec(3, "Aucun compte, aucun traceur", "L'Application ne demande <b>aucun compte</b>, n'utilise <b>ni cookie ni outil d'analyse tiers</b>, et ne collecte aucune donnée de localisation.") +
      legalSec(4, "Achats", "Les achats sont gérés par <b>Apple</b> ou <b>Google</b>, qui traitent le paiement selon leurs propres politiques. L'Éditeur ne reçoit <b>jamais</b> tes moyens de paiement, uniquement des données de vente agrégées.") +
      legalSec(5, "Tes droits (nLPD)", "Conformément à la loi suisse sur la protection des données, tu disposes de droits d'accès, de rectification et d'effacement. Tes données étant <b>locales</b>, tu peux les effacer à tout moment en réinitialisant ou désinstallant l'Application.") +
      legalSec(6, "Conservation", "Les données restent sur ton appareil tant que l'Application est installée.") +
      legalSec(7, "Contact & modifications", "Pour toute question : <b>contact@naticoach.ch</b>. La présente politique peut être mise à jour ; la version applicable est celle en vigueur dans l'Application. Droit applicable : <b>suisse</b>.");
    showScreen("screen-privacy");
  }

  function openDemocratie() {
    const card = (ico, title, body) =>
      `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
    $("democratieBody").innerHTML =
      `<p class="cs-intro">${t("dem.intro", "La <b>démocratie directe</b> permet au peuple de décider lui-même, en plus d'élire ses représentant·es. On vote environ <b>4 fois par an</b>.")}</p>` +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='4' width='16' height='16' rx='2'/><path d='M8.5 12l2.5 2.5 4.5-5'/></svg>", t("dem.voteT", "Les votations"), t("dem.vote", "Aux 3 niveaux (fédéral, cantonal, communal), le peuple se prononce directement sur des objets — pas seulement sur des personnes.")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 20h4L18 10l-4-4L4 16z'/><path d='M13 5l4 4'/></svg>", t("dem.iniT", "Initiative populaire"), t("dem.ini", "Proposer une modification de la <b>Constitution</b>. Au niveau fédéral : <b>100 000 signatures</b> en <b>18 mois</b>. Elle est ensuite soumise au vote du peuple.")) +
      card("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M8 3h8l5 5v8l-5 5H8l-5-5V8z'/><path d='M12 8v4'/><path d='M12 16h.01'/></svg>", t("dem.refFT", "Référendum facultatif"), t("dem.refF", "S'opposer à une <b>loi</b> votée par le Parlement. Il faut <b>50 000 signatures</b> (ou 8 cantons) en <b>100 jours</b> pour la soumettre au vote.")) +
      card("", t("dem.refOT", "Référendum obligatoire"), t("dem.refO", "Toute modification de la Constitution (et certaines adhésions internationales) est <b>automatiquement</b> soumise au vote.")) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 4v16'/><path d='M6 21h12'/><path d='M4 8l16-2'/><path d='M6 8l-2.5 6a3 3 0 0 0 5 0z'/><path d='M18 6l-2.5 6a3 3 0 0 0 5 0z'/></svg> ${t("dem.dblT", "La double majorité")}</div><p>${t("dem.dbl", "Pour modifier la Constitution, il faut la majorité du <b>peuple</b> <b>ET</b> la majorité des <b>cantons</b>.")}</p></div>` +
      `<p class="cs-note">${t("dem.note", "Droits politiques dès <b>18 ans</b> pour les Suisses. Dans quelques cantons (Glaris, Appenzell Rhodes-Intérieures), on vote encore à main levée : la <b>Landsgemeinde</b>.")}</p>`;
    showScreen("screen-democratie");
  }

  function openDroits() {
    const section = (cls, ico, title, items) =>
      `<div class="cs-card cs-${cls}">
         <div class="cs-card-h">${ico} ${title}</div>
         <ul class="cs-list">${items.map((t) => `<li>${t}</li>`).join("")}</ul>
       </div>`;
    $("droitsBody").innerHTML =
      `<p class="cs-intro">${t("dro.intro", "La citoyenneté, c'est un équilibre entre des <b>droits</b> et des <b>devoirs</b>.")}</p>` +
      section("duty", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='6' y='4' width='12' height='17' rx='2'/><path d='M9 4V3h6v1'/><path d='M9 10h6'/><path d='M9 14h4'/></svg>", t("dro.dutyT", "Mes devoirs"), t("dro.duty", [
        "Respecter la <b>Constitution</b> et les <b>lois</b>",
        "Payer ses <b>impôts</b>",
        "Envoyer ses enfants à l'école (<b>scolarité obligatoire</b>)",
        "S'assurer (<b>assurance maladie</b> de base obligatoire)",
        "<b>Service militaire ou civil</b> (hommes suisses) — sinon taxe d'exemption",
      ])) +
      section("right", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='9' r='5'/><path d='M8.8 13.2L7.5 21l4.5-2.7 4.5 2.7-1.3-7.8'/></svg>", t("dro.rightT", "Mes droits"), t("dro.right", [
        "<b>Libertés fondamentales</b> : opinion & information, croyance & conscience, réunion & association, langue",
        "<b>Droits politiques</b> dès 18 ans : voter, élire, être élu·e, signer initiatives & référendums",
        "<b>Liberté d'établissement</b> : s'installer où l'on veut en Suisse",
        "<b>Égalité</b> devant la loi ; interdiction de discrimination",
        "<b>Protection consulaire</b> de la Suisse à l'étranger",
      ]));
    showScreen("screen-droits");
  }

  /* Fiche d'identité du canton de l'utilisateur. */
  const CANTON_PROFILE = {
    VD: { capital: "Lausanne", joined: "1803", langs: "Français", communes: "~300", districts: "10", pop: "~815 000", gc: 150, ce: 7, motto: "Liberté et patrie",
      facts: ["Terrasses de Lavaux inscrites à l'UNESCO", "Lausanne, capitale olympique (siège du CIO)", "Bordé par le lac Léman ; le plus peuplé des cantons romands"],
      en: { langs: "French", motto: "Liberté et patrie — « Liberty and homeland »",
        facts: ["Lavaux terraces listed by UNESCO", "Lausanne, Olympic Capital (seat of the IOC)", "Bordered by Lake Geneva; the most populous French-speaking canton"] },
      pt: { langs: "Francês", motto: "Liberté et patrie — « Liberdade e pátria »",
        facts: ["Terraços de Lavaux inscritos na UNESCO", "Lausanne, capital olímpica (sede do COI)", "Junto ao lago Léman; o mais populoso dos cantões francófonos"] } },
    GE: { capital: "Genève", joined: "1815", langs: "Français", communes: "45", districts: "—", pop: "~510 000", gc: 100, ce: 7, motto: "Post Tenebras Lux — « Après les ténèbres, la lumière »",
      facts: ["Genève internationale : ONU, CICR, OMS…", "Le jet d'eau et la rade", "L'Escalade (1602) ; ville de Calvin et de la Réforme"],
      en: { langs: "French", motto: "Post Tenebras Lux — « After darkness, light »",
        facts: ["International Geneva: UN, ICRC, WHO…", "The Jet d'Eau and the harbour", "The Escalade (1602); city of Calvin and the Reformation"] },
      pt: { langs: "Francês", motto: "Post Tenebras Lux — « Depois das trevas, a luz »",
        facts: ["Genebra internacional: ONU, CICV, OMS…", "O jato de água e a baía", "A Escalada (1602); cidade de Calvino e da Reforma"] } },
    NE: { capital: "Neuchâtel", joined: "1815 (république dès 1848)", langs: "Français", communes: "~27", districts: "— (abolis en 2018)", pop: "~176 000", gc: 100, ce: 5, motto: "",
      facts: ["Berceau de l'horlogerie ; urbanisme horloger (La Chaux-de-Fonds / Le Locle) à l'UNESCO", "1er canton à accorder le droit de vote aux étrangers (niveau communal)", "République et Canton de Neuchâtel"],
      en: { langs: "French", joined: "1815 (republic from 1848)", districts: "— (abolished in 2018)",
        facts: ["Cradle of watchmaking; watchmaking urban planning (La Chaux-de-Fonds / Le Locle) at UNESCO", "First canton to grant foreigners the right to vote (communal level)", "Republic and Canton of Neuchâtel"] },
      pt: { langs: "Francês", joined: "1815 (república desde 1848)", districts: "— (abolidos em 2018)",
        facts: ["Berço da relojoaria; urbanismo relojoeiro (La Chaux-de-Fonds / Le Locle) na UNESCO", "1.º cantão a conceder o direito de voto aos estrangeiros (nível municipal)", "República e Cantão de Neuchâtel"] } },
    VS: { capital: "Sion", joined: "1815", langs: "Français et Allemand (canton bilingue)", communes: "~122", districts: "13", pop: "~355 000", gc: 130, ce: 5, motto: "",
      facts: ["Le Cervin et la Pointe Dufour, plus haut sommet de Suisse", "Canton bilingue français / allemand", "Les 13 étoiles du drapeau = les 13 districts ; vignoble et grands barrages"],
      en: { langs: "French and German (bilingual canton)",
        facts: ["The Matterhorn and Dufourspitze, Switzerland's highest peak", "Bilingual French / German canton", "The 13 stars of the flag = the 13 districts; vineyards and large dams"] },
      pt: { langs: "Francês e Alemão (cantão bilingue)",
        facts: ["O Matterhorn (Cervin) e a Pointe Dufour, ponto mais alto da Suíça", "Cantão bilingue francês / alemão", "As 13 estrelas da bandeira = os 13 distritos; vinhedos e grandes barragens"] } },
  };
  function openMonCanton() {
    const cn = cantonOf();
    const p = CANTON_PROFILE[cn];
    const loc = state.lang !== "fr" ? (p[state.lang] || {}) : {};
    const pv = (k) => (loc[k] != null ? loc[k] : p[k]);
    const nm = cnName(cn);
    const col = (typeof REGION_COLORS !== "undefined") ? REGION_COLORS[cn === "VS" ? "multi" : "fr"] : "#C65D3B";
    const regLong = cn === "VS" ? t("mc.region.multi", "Canton plurilingue") : t("mc.region.fr", "Suisse romande");
    $("monCantonTitle").textContent = cScope(cn);
    const row = (label, val) => `<div class="mc-row"><span>${label}</span><b>${val}</b></div>`;
    $("monCantonBody").innerHTML =
      `<div class="mc-head" style="background:${col}">
         <div class="mc-head-top"><span class="mc-name">${nm}</span><span class="mc-code">${cn}</span></div>
         <div class="mc-region">${regLong}</div>
       </div>
       <div class="cs-card">
         ${row(t("mc.capital", "Chef-lieu"), pv("capital"))}
         ${row(t("mc.joined", "Entrée dans la Confédération"), pv("joined"))}
         ${row(t("mc.langs", "Langue(s)"), pv("langs"))}
         ${row(t("mc.communes", "Communes"), pv("communes"))}
         ${row(t("mc.districts", "Districts"), pv("districts"))}
         ${row(t("mc.pop", "Population"), pv("pop") + " " + t("mc.popUnit", "hab."))}
       </div>
       <div class="cs-card">
         <div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg> ${t("mc.instT", "Institutions cantonales")}</div>
         ${row(t("mc.gc", "Grand Conseil (législatif)"), p.gc + " " + t("mc.gcUnit", "sièges"))}
         ${row(t("mc.ce", "Conseil d'État (exécutif)"), p.ce + " " + t("mc.ceUnit", "membres"))}
         ${row(t("mc.legislature", "Législature"), t("mc.years5", "5 ans"))}
       </div>` +
      (pv("motto") ? `<div class="cs-card"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z'/></svg> ${t("mc.mottoT", "Devise")}</div><p><i>${pv("motto")}</i></p></div>` : "") +
      `<div class="cs-card cs-highlight">
         <div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5z'/><path d='M5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9z'/></svg> ${t("mc.knowT", "À savoir")}</div>
         <ul class="cs-list">${pv("facts").map((f) => `<li>${f}</li>`).join("")}</ul>
       </div>
       <p class="cs-note">${t("mc.note", "Chiffres indicatifs (population et nombre de communes évoluent avec les fusions).")}</p>`;
    showScreen("screen-moncanton");
  }

  const csCard = (ico, title, body) => `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
  const csList = (cls, ico, title, items) =>
    `<div class="cs-card ${cls || ""}"><div class="cs-card-h">${ico} ${title}</div><ul class="cs-list">${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;

  function openNaturalisation() {
    $("naturalisationBody").innerHTML =
      `<p class="cs-intro">${t("nat.intro", "Devenir suisse par <b>naturalisation ordinaire</b> : les conditions et les étapes principales.")}</p>` +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 11l8-7 8 7'/><path d='M6 10v10h12V10'/></svg>", t("nat.resT", "Résidence"), t("nat.res", [
        "<b>10 ans</b> de résidence en Suisse (les années entre 8 et 18 ans comptent double, min. 6 ans réels)",
        "Être titulaire d'un <b>permis C</b> (établissement)",
        "+ une durée de résidence dans le <b>canton</b> et la <b>commune</b> (variable selon les lieux)",
      ])) +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><path d='M16 5.5a3 3 0 0 1 0 5'/><path d='M17.5 20a6 6 0 0 0-3-5'/></svg>", t("nat.intT", "Intégration"), t("nat.int", [
        "Respecter la <b>Constitution</b> et l'ordre juridique ; ne pas mettre en danger la sécurité",
        "Participer à la <b>vie économique</b> ou suivre une <b>formation</b>",
        "Encourager l'intégration de sa famille",
      ])) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z'/></svg>", t("nat.langT", "Langue"), t("nat.lang", "Maîtriser une <b>langue nationale</b> : à l'<b>oral (niveau B1)</b> et à l'<b>écrit (niveau A2)</b> selon le cadre européen (CECR).")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M9 18h6'/><path d='M10 21h4'/><path d='M12 3a6 6 0 0 1 4 10c-.7.7-1 1.5-1 2H9c0-.5-.3-1.3-1-2a6 6 0 0 1 4-10z'/></svg>", t("nat.knowT", "Connaissances"), t("nat.know", "Connaître la <b>Suisse</b>, le <b>canton</b> et la <b>commune</b> — géographie, histoire, institutions, us et coutumes. C'est l'objet du <b>test</b> que tu prépares ici.")) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg> ${t("nat.threeT", "Trois niveaux décident")}</div><p>${t("nat.three", "La naturalisation ordinaire nécessite l'accord des <b>trois</b> : autorisation de la <b>Confédération</b>, décision du <b>canton</b> et de la <b>commune</b>.")}</p></div>` +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2L4 14h6l-1 8 9-12h-6z'/></svg>", t("nat.easyT", "Naturalisation facilitée"), t("nat.easy", "Procédure allégée (fédérale) dans certains cas : par ex. <b>conjoint·e de Suisse</b> (env. 5 ans de résidence + 3 ans d'union), ou personnes de la <b>3ᵉ génération</b>.")) +
      `<p class="cs-note">${t("nat.note", "Des émoluments (frais) s'appliquent et la procédure peut durer <b>plusieurs années</b>. Les détails exacts dépendent du canton et de la commune.")}</p>`;
    showScreen("screen-naturalisation");
  }

  function openFederalisme() {
    $("federalismeBody").innerHTML =
      `<p class="cs-intro">${t("fed.intro", "La Suisse est un <b>État fédéral</b> : le pouvoir est réparti entre <b>3 niveaux</b>, chacun avec ses compétences et ses impôts.")}</p>` +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 20l6-11 4 6 2.5-4L21 20z'/></svg>", t("fed.confedT", "Confédération"), t("fed.confed", ["Armée · monnaie (franc suisse) · affaires étrangères · douanes", "AVS/AI · routes nationales (autoroutes) · énergie"])) +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 21h18'/><path d='M5 21V10'/><path d='M9 21V10'/><path d='M15 21V10'/><path d='M19 21V10'/><path d='M12 3l8 5H4z'/></svg>", t("fed.cantonsT", "Cantons (26)"), t("fed.cantons", ["Police · écoles · santé et hôpitaux · culture", "Chaque canton a sa <b>Constitution</b>, ses lois et ses tribunaux"])) +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='5' y='3' width='14' height='18' rx='1'/><path d='M9 7h2'/><path d='M13 7h2'/><path d='M9 11h2'/><path d='M13 11h2'/><path d='M9 15h2'/><path d='M13 15h2'/></svg>", t("fed.communesT", "Communes (~2 100)"), t("fed.communes", ["Écoles primaires · eau · déchets · aménagement local", "État civil · pompiers · routes communales"])) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l9 5-9 5-9-5 9-5z'/><path d='M3 12l9 5 9-5'/><path d='M3 16l9 5 9-5'/></svg> ${t("fed.subT", "Subsidiarité")}</div><p>${t("fed.sub", "Ce qu'un niveau <b>inférieur</b> peut faire, il le fait ; le niveau supérieur n'intervient que si nécessaire. On paie donc des impôts aux <b>3 niveaux</b>.")}</p></div>`;
    showScreen("screen-federalisme");
  }

  function openLangues() {
    $("languesBody").innerHTML =
      `<p class="cs-intro">${t("lang.intro", "La Suisse a <b>4 langues nationales</b>. Chacun a le droit de parler la sienne (liberté de la langue).")}</p>` +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5h9'/><path d='M8 3v2c0 5-2.5 8-6 9'/><path d='M6 9c0 3 2.5 5 6 6'/><path d='M13 20l4-9 4 9'/><path d='M14.5 17h5'/></svg>", t("lang.deT", "Allemand — ~62 %"), t("lang.de", "La plus parlée. Majorité des cantons (Zurich, Berne, Bâle, Lucerne…). En Suisse on parle surtout le <b>suisse allemand</b> (dialecte).")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5h9'/><path d='M8 3v2c0 5-2.5 8-6 9'/><path d='M6 9c0 3 2.5 5 6 6'/><path d='M13 20l4-9 4 9'/><path d='M14.5 17h5'/></svg>", t("lang.frT", "Français — ~23 %"), t("lang.fr", "La <b>Suisse romande</b> : Vaud, Genève, Neuchâtel, Jura, et une partie du Valais, de Fribourg et de Berne.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5h9'/><path d='M8 3v2c0 5-2.5 8-6 9'/><path d='M6 9c0 3 2.5 5 6 6'/><path d='M13 20l4-9 4 9'/><path d='M14.5 17h5'/></svg>", t("lang.itT", "Italien — ~8 %"), t("lang.it", "Le <b>Tessin</b> et quelques vallées du sud des Grisons.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M3 20l6-11 4 6 2.5-4L21 20z'/></svg>", t("lang.rmT", "Romanche — ~0,5 %"), t("lang.rm", "Parlé dans les <b>Grisons</b> ; 4ᵉ langue nationale, langue officielle pour les échanges avec les romanchophones.")) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z'/><path d='M9 4v14'/><path d='M15 6v14'/></svg> ${t("lang.multiT", "Cantons plurilingues")}</div><p>${t("lang.multi", "<b>Bilingues</b> : Berne, Fribourg, Valais (français-allemand). <b>Trilingue</b> : Grisons (allemand, romanche, italien). Langues officielles de la Confédération : allemand, français, italien.")}</p></div>`;
    showScreen("screen-langues");
  }

  function openNeutralite() {
    $("neutraliteBody").innerHTML =
      `<p class="cs-intro">${t("neu.intro", "La Suisse est <b>neutre</b> et une terre de dialogue et d'action humanitaire.")}</p>` +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M20 7l-3-1a3 3 0 0 0-6 0c-4 0-6 3-8 6 2-1 4-1 5 0-1 3-1 6 1 9 2-2 3-4 3-6 2 3 6 3 8 0 1-2 1-5-1-7z'/></svg>", t("neu.neuT", "La neutralité"), t("neu.neu", "La Suisse ne participe pas aux conflits armés et ne prend pas parti militairement. Neutralité <b>permanente et armée</b>, reconnue au <b>Congrès de Vienne (1815)</b>.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M3 12h18'/><path d='M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z'/></svg>", t("neu.onuT", "ONU"), t("neu.onu", "La Suisse a adhéré à l'<b>ONU en 2002</b>, par votation populaire.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='2'/><circle cx='8' cy='11' r='2'/><path d='M13 10h5'/><path d='M13 14h5'/><path d='M5 16a3 3 0 0 1 6 0'/></svg>", t("neu.schT", "Schengen — mais pas l'UE"), t("neu.sch", "La Suisse fait partie de l'espace <b>Schengen</b> (libre circulation), mais n'est <b>pas membre de l'Union européenne</b>.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M12 8v8'/><path d='M8 12h8'/></svg>", t("neu.crT", "La Croix-Rouge"), t("neu.cr", "Fondée à <b>Genève</b> par <b>Henri Dunant</b> (1863), qui reçut le tout premier <b>prix Nobel de la paix</b>.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='5' y='3' width='14' height='18' rx='1'/><path d='M9 7h2'/><path d='M13 7h2'/><path d='M9 11h2'/><path d='M13 11h2'/><path d='M9 15h2'/><path d='M13 15h2'/></svg>", t("neu.gvaT", "La Genève internationale"), t("neu.gva", "Siège européen de l'<b>ONU</b>, du <b>CICR</b>, de l'<b>OMS</b>, de l'<b>OMC</b>… La Suisse offre ses « bons offices » pour la médiation."));
    showScreen("screen-neutralite");
  }

  function openSymboles() {
    $("symbolesBody").innerHTML =
      `<p class="cs-intro">${t("sym.intro", "Quelques symboles et traditions qui font la Suisse — souvent au programme du test.")}</p>` +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5z'/><path d='M5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9z'/></svg>", t("sym.natT", "Fête nationale : 1er août"), t("sym.nat", "Elle commémore le <b>Pacte de 1291</b> (alliance sur la prairie du <b>Grütli</b>). On allume des feux et des lampions.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><path d='M16 5.5a3 3 0 0 1 0 5'/><path d='M17.5 20a6 6 0 0 0-3-5'/></svg>", t("sym.pacteT", "Le Pacte fédéral (1291)"), t("sym.pacte", "<b>Uri, Schwytz et Unterwald</b> s'allient : acte fondateur de la Confédération.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4'/></svg>", t("sym.tellT", "Guillaume Tell"), t("sym.tell", "Héros <b>légendaire</b> (la pomme, l'arbalète), symbole de la liberté et de la résistance à l'oppression.")) +
      csCard("<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M5 21V4'/><path d='M5 4h11l-2 4 2 4H5'/></svg>", t("sym.flagT", "Le drapeau"), t("sym.flag", "Une <b>croix blanche</b> sur fond <b>rouge</b> — l'un des rares drapeaux carrés. (Emblème protégé par la loi.)")) +
      csList("", "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='7' cy='18' r='2.5'/><circle cx='17' cy='16' r='2.5'/><path d='M9.5 18V6l10-2v10'/></svg>", t("sym.custT", "Us et coutumes"), t("sym.cust", ["Cor des Alpes · yodel · lutte suisse (Schwingen)", "Désalpe · carnaval · Fête des Vignerons", "Chocolat · fromage (fondue, raclette, Gruyère)"]));
    showScreen("screen-symboles");
  }

  /* ======================================================================
   *  QUIZ (entraînement + examen)
   * ==================================================================== */
  let quiz = null;          // { mode, items, i, correct, answered }
  let examTimerId = null;
  let lastShareText = "";   // message de partage du dernier résultat

  function startMistakes() {
    if (!state.mistakes.length) return;
    const items = shuffle(state.mistakes.slice()).map((m) =>
      buildQuestion(enrich({ q: m.q, options: m.options, answer: m.answer, theme: m.theme }, m.scope)));
    quiz = { mode: "practice", items: items, i: 0, correct: 0, answered: false, isMistakes: true };
    showScreen("screen-quiz"); renderQuestion();
  }

  function startExam() {
    if (!isPremium()) { startTrialExam(); return; }   // gratuit → examen d'essai
    const cfg = EXAM_CFG[cantonOf()];
    let items;
    if (cantonOf() === "GE") {
      const d = geDeck();
      items = shuffle(d.federal.concat(d.cantonal)).slice(0, cfg.total).map(buildQuestion);
    } else {
      items = buildExam(state.commune).map(buildQuestion);
    }
    quiz = {
      mode: "exam", items: items, i: 0, correct: 0, answered: false,
      total: cfg.total, passCorrect: cfg.passCorrect, passLabel: cfg.passLabel,
      endAt: Date.now() + cfg.minutes * 60000,
    };
    showScreen("screen-quiz"); renderQuestion(); startExamTimer();
  }

  /* Examen d'essai gratuit : court échantillon, correction immédiate, sans minuteur ni score enregistré. */
  function startTrialExam() {
    let bank;
    if (isCards()) { const d = cardsDeck(); bank = d.federal.concat(d.cantonal).filter((q) => q.type === "mcq"); }
    else if (cantonOf() === "GE") { const d = geDeck(); bank = d.federal.concat(d.cantonal); }
    else { const d = communeDeck(state.commune); bank = d.federal.concat(d.cantonal); }
    let out = [];
    THEMES.forEach((th) => { out = out.concat(shuffle(bank.filter((q) => q.theme === th)).slice(0, 3)); });
    const items = shuffle(out).slice(0, FREE_EXAM).map(buildQuestion);
    quiz = { mode: "practice", items: items, i: 0, correct: 0, answered: false, trial: true };
    showScreen("screen-quiz"); renderQuestion();
  }

  function startExamTimer() {
    const el = $("examTimer"); el.hidden = false;
    const tick = () => {
      const ms = Math.max(0, quiz.endAt - Date.now());
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      el.textContent = m + ":" + String(s).padStart(2, "0");
      el.classList.toggle("warn", ms < 5 * 60000);
      if (ms <= 0) { clearExamTimer(); finishQuiz(); }
    };
    tick(); examTimerId = setInterval(tick, 1000);
  }
  function clearExamTimer() { if (examTimerId) { clearInterval(examTimerId); examTimerId = null; } $("examTimer").hidden = true; $("examTimer").classList.remove("warn"); }

  /* Affiche (si disponible) un bouton « Voir la traduction » sous la question française. */
  function renderQTrans(frQ) {
    const btn = $("qtrBtn"), txt = $("qtrText");
    if (!btn || !txt) return;
    const tr = state.lang !== "fr" ? qTrans(frQ) : null;
    txt.hidden = true; txt.innerHTML = "";
    if (!tr) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.textContent = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M3 12h18'/><path d='M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z'/></svg> " + t("qtr.show", "Voir la traduction");
    const opts = (tr.options && tr.options.length) ? `<ul>${tr.options.map((o) => `<li>${o}</li>`).join("")}</ul>` : "";
    txt.innerHTML = `<p>${tr.q || ""}</p>${opts}`;
    btn.onclick = () => { txt.hidden = !txt.hidden; };
  }

  function renderQuestion() {
    const cur = quiz.items[quiz.i];
    quiz.answered = false;
    $("quizCat").textContent = trScope(cur.ref.scope) + (quiz.mode === "exam" ? "" : " · " + trTheme(cur.ref.theme));
    $("quizCount").textContent = (quiz.i + 1) + "/" + quiz.items.length;
    $("quizProgressFill").style.width = ((quiz.i) / quiz.items.length) * 100 + "%";
    $("questionText").textContent = cur.ref.q;
    renderQTrans(cur.ref.q);
    $("explainBox").hidden = true;
    $("btnNext").hidden = true;
    const box = $("optionsList"); box.innerHTML = "";
    cur.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "option";
      b.style.animationDelay = (i * 0.05) + "s";
      b.innerHTML = `<span class="mark">${LETTERS[i] || ""}</span><span>${opt}</span>`;
      b.addEventListener("click", () => answer(i));
      box.appendChild(b);
    });
  }

  function answer(chosen) {
    if (quiz.answered) return;
    quiz.answered = true;
    const cur = quiz.items[quiz.i];
    cur.chosen = chosen;               // mémorisé pour la correction
    const correct = chosen === cur.answer;
    if (correct) quiz.correct++;
    recordAnswer(cur.ref, correct);
    const btns = $("optionsList").querySelectorAll(".option");

    if (quiz.mode === "exam") {
      // Examen : pas de correction immédiate, on marque seulement le choix.
      btns.forEach((b, i) => { b.setAttribute("disabled", ""); if (i === chosen) { b.classList.add("chosen"); } }); // garde la lettre (A/B/C/D), sélection neutre
    } else {
      btns.forEach((b, i) => {
        b.setAttribute("disabled", "");
        const mark = b.querySelector(".mark");
        if (i === cur.answer) { b.classList.add("correct"); mark.innerHTML = MK_OK; }
        else if (i === chosen) { b.classList.add("wrong"); mark.innerHTML = MK_NO; }
        else { b.classList.add("dim"); }
      });
      const head = $("explainHead");
      head.textContent = correct ? t("quiz.correct", "Bonne réponse") : t("study.remember", "À retenir");
      head.className = "explain-head " + (correct ? "ok" : "bad");
      const exp = (cur.ref.explanation && cur.ref.explanation.trim())
        ? cur.ref.explanation
        : t("study.correctAnswer", "Réponse correcte : ") + cur.options[cur.answer];
      $("explainText").textContent = exp;
      const ik = cur.ref.illustration;
      $("explainIllus").innerHTML = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik]) ? ILLUSTRATIONS[ik] : "";
      $("explainBox").hidden = false;
    }

    $("quizProgressFill").style.width = ((quiz.i + 1) / quiz.items.length) * 100 + "%";
    const nb = $("btnNext");
    nb.textContent = quiz.i + 1 < quiz.items.length ? t("quiz.continue", "Continuer") : (quiz.mode === "exam" ? t("quiz.finishExam", "Terminer l'examen") : t("quiz.seeResult", "Voir mon résultat"));
    nb.hidden = false;
  }

  function nextQuestion() {
    if (quiz.i + 1 < quiz.items.length) { quiz.i++; renderQuestion(); }
    else finishQuiz();
  }

  /* Palier de couleur d'une barre d'examen (seuil de réussite à 70 %). */
  function barColorExam(pct) { return pct < 30 ? "#C8442E" : pct < 50 ? "#D8836F" : pct < 70 ? "#C08A2E" : "#3E7A4E"; }

  /* Carte « Ton bilan par thème » (résultat d'examen échoué), triée du plus faible au plus fort. */
  function themeBilan() {
    const rows = THEMES.map((th) => {
      const its = quiz.items.filter((it) => it.ref.theme === th);
      const c = its.filter((it) => it.chosen === it.answer).length;
      const a = its.length;
      return { theme: th, a, c, pct: a ? Math.round((c / a) * 100) : 0 };
    }).filter((r) => r.a > 0).sort((x, y) => x.pct - y.pct);

    return `<div class="result-card">
        <div class="stats-card-head"><span class="stats-card-title">${t("result.bilanTitle", "Ton bilan par thème")}</span><span class="stats-thresh">┃ 70%</span></div>
        <div class="sbar-list">` +
        rows.map((r) => `
          <div class="sbar-row">
            <div class="sbar-head"><b>${trTheme(r.theme)}</b><span class="${r.pct < 70 ? "weak" : "good"}">${r.c}/${r.a}</span></div>
            <div class="sbar"><i style="width:${r.pct}%;background:${barColorExam(r.pct)}"></i><u style="left:70%"></u></div>
          </div>`).join("") +
        `</div></div>`;
  }

  /* 3 tuiles récap (résultat d'examen réussi) : Sessions / Progression / Série. */
  function recapTiles(prevPct) {
    const pct = state.history.length ? state.history[state.history.length - 1].pct : 0;
    let prog = "—";
    if (prevPct !== null) { const d = pct - prevPct; prog = (d >= 0 ? TRI_UP + " +" : TRI_DN + " ") + Math.abs(d); }
    return `<div class="recap-tiles">
        <div class="recap-tile"><div class="recap-val">${state.sessions}</div><div class="recap-lab">${t("recap.sessions", "Sessions")}</div></div>
        <div class="recap-tile"><div class="recap-val">${prog}</div><div class="recap-lab">${t("recap.progress", "Progression")}</div></div>
        <div class="recap-tile"><div class="recap-val">${state.streak} ${t("misc.dayUnit", "j")}</div><div class="recap-lab">${t("recap.streak", "Série")}</div></div>
      </div>`;
  }

  function finishQuiz() {
    if (!quiz) return;
    clearExamTimer();
    const total = quiz.mode === "exam" ? (quiz.total || EXAM_TOTAL) : quiz.items.length;
    const pct = Math.round((quiz.correct / total) * 100);

    // L'examen d'essai gratuit ne compte pas dans les stats (pas de session enregistrée).
    if (!quiz.trial) {
      state.sessions++;
      state.best = Math.max(state.best, pct);
      state.history.push({ date: todayISO(), pct });
      if (state.history.length > 60) state.history = state.history.slice(-60);
      const today = todayISO();
      if (state.lastPlayed !== today) {
        const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        state.streak = state.lastPlayed === y ? state.streak + 1 : 1;
        state.lastPlayed = today;
      }
      save();
    }

    const prevPct = state.history.length >= 2 ? state.history[state.history.length - 2].pct : null;

    $("resultFrac").textContent = quiz.correct + "/" + total;
    const pass = quiz.mode === "exam" && quiz.correct >= quiz.passCorrect;
    $("resultRing").style.stroke = pass ? "var(--ok)" : "var(--red)";
    setTimeout(() => { setRing($("resultRing"), pct); countUp($("resultPct"), pct, 900); }, 120);

    // Gamification : badges, confettis
    const examPass = pass;
    if (examPass) unlock("exam");
    if (quiz.mode === "exam" && quiz.correct === total) unlock("perfect");
    const clearedAll = quiz.isMistakes && state.mistakes.length === 0;
    if (clearedAll) unlock("cleaner");
    checkBadges();

    // Confettis : sobres (points statiques) pour un examen réussi ; blast pour la liste d'erreurs vidée.
    $("resultConfetti").hidden = !examPass;
    if (clearedAll) setTimeout(launchConfetti, 250);

    const badge = $("resultBadge");
    const errs = quiz.items.filter((it) => it.chosen !== it.answer).length;
    let titleHTML, msg;

    if (quiz.mode === "exam") {
      badge.hidden = false;
      badge.className = "result-badge " + (pass ? "pass" : "fail");
      badge.innerHTML = pass ? (MK_OK + " " + t("result.examPass", "Examen réussi")) : (MK_NO + " " + t("result.examFail", "Pas encore réussi"));
      if (pass) {
        titleHTML = t("result.congrats", "Félicitations,<br><i>tu es prêt·e.</i>");
        const rec = pct >= state.best ? t("result.bestYet", " Ton meilleur score à ce jour.") : "";
        msg = fmt(t("result.passMsg", "{c}/{n} bonnes réponses ({p}%) — au-dessus du seuil requis.{r}"), { c: quiz.correct, n: total, p: pct, r: rec });
      } else {
        titleHTML = t("result.keepGoing", "Continue, tu avances.");
        const cfgL = EXAM_CFG[cantonOf()];
        const pl = (state.lang !== "fr" && cfgL) ? (cfgL["passLabel" + state.lang.charAt(0).toUpperCase() + state.lang.slice(1)] || quiz.passLabel) : (quiz.passLabel || t("result.passDefault", "70 % de bonnes réponses"));
        msg = fmt(t("result.failMsg", "Réussite : {l}. Chaque session compte."), { l: pl });
      }
      $("resultBilan").innerHTML = pass ? recapTiles(prevPct) : themeBilan();
    } else if (quiz.trial) {
      badge.hidden = true;
      titleHTML = t("premium.trialDone", "Aperçu terminé");
      msg = fmt(t("premium.trialMsg", "Tu viens de tester {n} questions. Débloque la simulation d'examen complète et toutes les questions."), { n: total });
      $("resultBilan").innerHTML = `<button class="btn btn-primary big pr-result-cta" id="resultPremiumCta"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 7.5-2'/></svg> ${fmt(t("premium.buy", "Débloquer · {p}"), { p: PREMIUM_PRICE })}</button>`;
    } else {
      badge.hidden = true;
      $("resultBilan").innerHTML = "";
      if (pct >= 80) { titleHTML = t("result.t80", "Bravo !"); msg = t("result.m80", "Excellent. Passe en simulation d'examen pour te tester en conditions réelles."); }
      else if (pct >= 60) { titleHTML = t("result.t60", "Bien joué"); msg = t("result.m60", "Tu progresses. Un tour de révision et ça rentre."); }
      else { titleHTML = t("result.t0", "Continue"); msg = t("result.m0", "Utilise le mode révision pour apprendre les bonnes réponses."); }
    }
    $("resultTitle").innerHTML = titleHTML;
    $("resultMsg").textContent = msg;

    // Actions : hiérarchie selon le résultat.
    const rv = $("btnReview"), rt = $("btnRetry"), sh = $("btnShare"), hm = $("btnHome");
    hm.hidden = false; hm.style.order = 4;
    if (quiz.mode === "exam" && pass) {
      sh.hidden = false; sh.className = "btn btn-primary big"; sh.textContent = t("result.share", "Partager mon score"); sh.style.order = 1;
      rv.hidden = false; rv.className = "btn btn-outline"; rv.textContent = t("result.reviewAnswers", "Revoir mes réponses"); rv.style.order = 2;
      rt.hidden = true;
    } else if (quiz.mode === "exam") {
      rv.hidden = false; rv.className = "btn btn-primary big"; rv.textContent = fmt(t("result.reviewErrs", "Revoir mes {n} erreur{s}"), { n: errs, s: errs > 1 ? "s" : "" }); rv.style.order = 1;
      rt.hidden = false; rt.className = "btn btn-outline"; rt.textContent = t("result.retryExam", "Recommencer l'examen"); rt.style.order = 2;
      sh.hidden = true;
    } else {
      rv.hidden = false; rv.className = "btn btn-primary big"; rv.textContent = t("result.review", "Revoir mes réponses"); rv.style.order = 1;
      const canRetry = quiz.isMistakes && state.mistakes.length;
      rt.hidden = !canRetry; rt.className = "btn btn-outline"; rt.textContent = t("result.retry", "Recommencer"); rt.style.order = 2;
      sh.hidden = true;
    }

    // Message de partage (WhatsApp & co.).
    let lieu = "";
    if (cantonOf() === "GE") lieu = " (" + cScope("GE") + ")";
    else { const commune = VD_DATA.communes[state.commune]; if (commune) lieu = " (" + trScope("Commune de " + commune.name) + ")"; }
    if (quiz.mode === "exam") {
      lastShareText =
        fmt(t("share.examLine1", "NatiCoach — Simulation du test de naturalisation{l}"), { l: lieu }) + "\n" +
        fmt(t("share.examLine2", "Mon score : {c}/{n} ({p}%) — {r}"), { c: quiz.correct, n: total, p: pct, r: pass ? t("share.passed", "réussi") : t("share.notYet", "pas encore") });
    } else {
      lastShareText =
        fmt(t("share.trainLine1", "NatiCoach — Entraînement au test de naturalisation{l}"), { l: lieu }) + "\n" +
        fmt(t("share.trainLine2", "Mon score : {c}/{n} ({p}%). À toi de jouer !"), { c: quiz.correct, n: total, p: pct });
    }

    showScreen("screen-result");
    const rpc = $("resultPremiumCta"); if (rpc) rpc.addEventListener("click", openPremium);
  }

  function shareResult() {
    const text = lastShareText || t("share.fallback", "NatiCoach — je m'entraîne au test de naturalisation suisse !");
    if (navigator.share) {
      navigator.share({ title: "NatiCoach", text: text }).catch(function () {});
    } else {
      // Repli : ouvre WhatsApp (web ou app) avec le message pré-rempli.
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    }
  }

  /* ---------------- Écran Succès ---------------- */
  /* Progression vers le déblocage d'un badge encore verrouillé. */
  function badgeProgress(id) {
    const b = state.best, s = state.sessions, k = state.streak, m = state.mistakes.length;
    switch (id) {
      case "first":    return { pct: Math.min(100, s * 100), hint: s + " / 1 " + t("badges.session", "session") };
      case "marathon": return { pct: Math.min(100, s / 10 * 100), hint: fmt(t("badges.outOf10", "{n} sur 10"), { n: s }) };
      case "streak3":  return { pct: Math.min(100, k / 3 * 100), hint: k + " / 3 " + t("badges.days", "jours") };
      case "exam":     return { pct: Math.min(100, b / 70 * 100), hint: t("badges.best", "meilleur : ") + b + "%" };
      case "perfect":  return { pct: Math.min(100, b), hint: t("badges.best", "meilleur : ") + b + "%" };
      case "cleaner":  return { pct: m ? Math.max(8, 100 - Math.min(90, m * 6)) : 100, hint: m ? fmt(t("badges.clearLeft", "plus que {n} à vider"), { n: m }) : t("badges.readyUnlock", "prêt à débloquer") };
      default:         return { pct: 0, hint: "" };
    }
  }

  function openBadges() {
    const b = state.badges || {};
    const n = ACHIEVEMENTS.filter((a) => b[a.id]).length;
    const N = ACHIEVEMENTS.length;
    const half = n >= N ? t("badges.all", "tous débloqués !") : (n >= N / 2 ? t("badges.half", "à mi-chemin !") : t("badges.onway", "en bonne voie !"));
    $("badgeHero").innerHTML =
      `<div class="badge-count"><span>${n}</span><em> / ${N}</em></div>
       <p class="badge-sub">${t("badges.unlockedSub", "succès débloqués")} — ${half}</p>
       <div class="badge-segs">` +
        ACHIEVEMENTS.map((a) => `<span class="${b[a.id] ? "on" : ""}"></span>`).join("") +
       `</div>`;
    $("badgeGrid").innerHTML = ACHIEVEMENTS.map((a) => {
      const title = t("badge." + a.id + ".title", a.title), desc = t("badge." + a.id + ".desc", a.desc);
      if (b[a.id]) {
        return `<div class="badge-card on">
           <div class="badge-medal">${a.ico}</div>
           <b>${title}</b><small>${desc}</small>
           <span class="badge-done">${MK_OK} ${t("badges.unlocked", "Débloqué")}</span>
         </div>`;
      }
      const p = badgeProgress(a.id);
      return `<div class="badge-card locked">
         <div class="badge-medal">${a.ico}</div>
         <b>${title}</b><small>${desc}</small>
         <div class="badge-bar"><i style="width:${p.pct}%"></i></div>
         <span class="badge-hint">${p.hint}</span>
       </div>`;
    }).join("");
    showScreen("screen-badges");
  }


  /* ---------------- Correction (revoir ses réponses) ---------------- */
  let reviewMode = "errors";
  function openReview() {
    const errs = quiz.items.filter((it) => it.chosen !== it.answer).length;
    const seg = $("reviewFilter");
    seg.innerHTML =
      `<button data-f="errors" class="active">${fmt(t("review.errors", "Mes erreurs ({n})"), { n: errs })}</button>` +
      `<button data-f="all">${fmt(t("review.all", "Toutes ({n})"), { n: quiz.items.length })}</button>`;
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); reviewMode = b.dataset.f; renderReview();
    }));
    reviewMode = "errors"; renderReview(); showScreen("screen-review"); window.scrollTo(0, 0);
  }

  function renderReview() {
    const items = reviewMode === "errors" ? quiz.items.filter((it) => it.chosen !== it.answer) : quiz.items;
    $("reviewCount").textContent = items.length + (reviewMode === "errors" ? t("review.toReview", " à revoir") : t("review.total", " au total"));
    const box = $("reviewList");
    if (!items.length) { box.innerHTML = `<p class="results-empty">${t("review.noErrors", "Aucune erreur — parfait !")}</p>`; return; }
    box.innerHTML = items.map((it) => {
      const answered = it.chosen !== undefined && it.chosen !== null;
      const ok = it.chosen === it.answer;
      const opts = it.options.map((o, i) => {
        let cls = "option";
        if (i === it.answer) cls += " correct";
        else if (i === it.chosen) cls += " wrong";
        else cls += " dim";
        const mark = i === it.answer ? MK_OK : (i === it.chosen ? MK_NO : "");
        return `<div class="${cls}"><span class="mark">${mark}</span><span>${esc(o)}</span></div>`;
      }).join("");
      const exp = (it.ref.explanation && it.ref.explanation.trim())
        ? esc(it.ref.explanation) : t("study.correctAnswer", "Réponse correcte : ") + esc(it.options[it.answer]);
      const ik = it.ref.illustration;
      const ill = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik])
        ? `<div class="review-illus">${ILLUSTRATIONS[ik]}</div>` : "";
      return `<div class="review-card">
        <div class="review-head"><span class="chip">${esc(trScope(it.ref.scope))} · ${esc(trTheme(it.ref.theme))}</span>
          <span class="review-flag ${ok ? "ok" : "bad"}">${ok ? MK_OK : MK_NO}</span></div>
        <h3 class="review-qtext">${esc(it.ref.q)}</h3>
        <div class="options">${opts}</div>
        ${answered ? "" : `<p class="review-noans">${t("review.noAnswer", "Non répondu (temps écoulé)")}</p>`}
        <div class="review-exp">${ill}<span>${exp}</span></div>
      </div>`;
    }).join("");
  }

  function retry() {
    if (!quiz) { renderHome(); showScreen("screen-home"); return; }
    if (quiz.mode === "exam") startExam();
    else if (quiz.isMistakes && state.mistakes.length) startMistakes();
    else { renderHome(); showScreen("screen-home"); }
  }

  /* ======================================================================
   *  ÉVÉNEMENTS
   * ==================================================================== */
  $("communeSearch").addEventListener("input", (e) => renderCommuneResults(e.target.value));
  $("btnSetupConfirm").addEventListener("click", () => { if (pendingCommune) selectCommune(pendingCommune); });
  $("setupBack").addEventListener("click", () => {
    if (!$("setupCommuneStep").hidden) showCantonStep();
    else { renderHome(); showScreen("screen-home"); }
  });
  document.querySelectorAll(".canton-card").forEach((el) =>
    el.addEventListener("click", () => pickCanton(el.dataset.canton)));
  $("btnChangeCommune").addEventListener("click", () => openSetup(true));

  $("btnExam").addEventListener("click", () => frenchNotice(() => { if (isCards()) openStudy(); else startExam(); }));
  $("btnStudy").addEventListener("click", () => frenchNotice(openStudy));
  $("examNoticeGo").addEventListener("click", () => {
    state.examNoticeAck = state.lang; save();
    $("examNotice").hidden = true;
    if (_noticeCb) { const cb = _noticeCb; _noticeCb = null; cb(); }
  });
  $("btnExplore").addEventListener("click", openExplore);
  $("btnQuitExplore").addEventListener("click", () => showScreen("screen-home"));
  $("zoomIn").addEventListener("click", () => zoomMap(0.7));
  $("zoomOut").addEventListener("click", () => zoomMap(1.4));
  $("zoomReset").addEventListener("click", () => { mapView.v = Object.assign({}, mapView.base); applyView(); });
  $("btnTimeline").addEventListener("click", openTimeline);
  $("btnQuitTimeline").addEventListener("click", () => showScreen("screen-home"));
  $("btnVsMap").addEventListener("click", openDistricts);
  $("btnQuitVsmap").addEventListener("click", () => showScreen("screen-home"));
  $("btnPolitique").addEventListener("click", openPolitique);
  $("btnQuitPolitique").addEventListener("click", () => showScreen("screen-home"));
  $("btnDemocratie").addEventListener("click", openDemocratie);
  $("btnQuitDemocratie").addEventListener("click", () => showScreen("screen-home"));
  $("btnDroits").addEventListener("click", openDroits);
  $("btnQuitDroits").addEventListener("click", () => showScreen("screen-home"));
  $("btnMonCanton").addEventListener("click", openMonCanton);
  $("btnQuitMonCanton").addEventListener("click", () => showScreen("screen-home"));
  $("btnNaturalisation").addEventListener("click", openNaturalisation);
  $("btnQuitNaturalisation").addEventListener("click", () => showScreen("screen-home"));
  $("btnFederalisme").addEventListener("click", openFederalisme);
  $("btnQuitFederalisme").addEventListener("click", () => showScreen("screen-home"));
  $("btnLangues").addEventListener("click", openLangues);
  $("btnQuitLangues").addEventListener("click", () => showScreen("screen-home"));
  $("btnNeutralite").addEventListener("click", openNeutralite);
  $("btnQuitNeutralite").addEventListener("click", () => showScreen("screen-home"));
  $("btnSymboles").addEventListener("click", openSymboles);
  $("btnQuitSymboles").addEventListener("click", () => showScreen("screen-home"));
  $("btnPiliers").addEventListener("click", openPiliers);
  $("btnQuitPiliers").addEventListener("click", () => showScreen("screen-home"));
  $("btnSante").addEventListener("click", openSante);
  $("btnQuitSante").addEventListener("click", () => showScreen("screen-home"));
  $("btnAssurances").addEventListener("click", openAssurances);
  $("btnQuitAssurances").addEventListener("click", () => showScreen("screen-home"));
  $("btnAbout").addEventListener("click", openAbout);
  $("btnQuitAbout").addEventListener("click", () => showScreen("screen-home"));
  $("btnQuitPremium").addEventListener("click", () => showScreen("screen-home"));
  $("btnQuitCgu").addEventListener("click", () => showScreen("screen-about"));
  $("btnQuitPrivacy").addEventListener("click", () => showScreen("screen-about"));
  $("studyLock").addEventListener("click", openPremium);
  $("premiumBanner").addEventListener("click", openPremium);
  $("btnMistakes").addEventListener("click", startMistakes);
  $("btnStats").addEventListener("click", openStats);
  $("btnQuitStats").addEventListener("click", () => showScreen("screen-home"));
  $("btnBadges").addEventListener("click", openBadges);
  $("btnQuitBadges").addEventListener("click", () => showScreen("screen-home"));

  $("btnPrev").addEventListener("click", studyPrev);
  $("btnNextStudy").addEventListener("click", studyNext);
  $("btnQuitStudy").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });
  $("studyScopeBtn").addEventListener("click", openScopeSheet);
  $("scopeSheet").addEventListener("click", (e) => { if (e.target === $("scopeSheet")) closeScopeSheet(); });

  $("btnNext").addEventListener("click", nextQuestion);
  $("btnQuitQuiz").addEventListener("click", () => { clearExamTimer(); renderHome(); showScreen("screen-home"); });
  $("btnRetry").addEventListener("click", retry);
  $("btnHome").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });
  $("btnReview").addEventListener("click", openReview);
  $("btnShare").addEventListener("click", shareResult);
  $("btnQuitReview").addEventListener("click", () => showScreen("screen-result"));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang)));

  /* ---------------- Démarrage ---------------- */
  applyStaticI18n();
  checkBadges();
  const ready = state.canton === "GE" || state.canton === "NE" || state.canton === "VS"
    || (state.canton === "VD" && state.commune && VD_DATA.communes[state.commune]);
  if (ready) { renderHome(); showScreen("screen-home"); }
  else { openSetup(false); }
})();
