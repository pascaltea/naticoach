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
    VD: { total: 48, passCorrect: 34, minutes: 60, passLabel: "70 % de bonnes réponses" },
    GE: { total: 45, passCorrect: 40, minutes: 45, passLabel: "40 bonnes réponses sur 45 (5 fautes maximum)" },
  };
  const cantonOf = () => (["VD", "GE", "NE", "VS"].indexOf(state.canton) >= 0 ? state.canton : "VD");
  /* Format d'un canton : "mcq" (QCM Vaud/Genève) ou "cards" (fiches Q→R : Neuchâtel/Valais). */
  const CANTON_FORMAT = { VD: "mcq", GE: "mcq", NE: "cards", VS: "cards" };
  const isCards = () => CANTON_FORMAT[cantonOf()] === "cards";
  const CANTON_NAME = { VD: "Vaud", GE: "Genève", NE: "Neuchâtel", VS: "Valais" };
  const CANTON_SCOPE = { VD: "Canton de Vaud", GE: "Canton de Genève", NE: "Canton de Neuchâtel", VS: "Canton du Valais" };
  function cardsData() {
    if (state.canton === "NE" && typeof NE_DATA !== "undefined") return NE_DATA;
    if (state.canton === "VS" && typeof VS_DATA !== "undefined") return VS_DATA;
    return { questions: [] };
  }

  /* ---------------- Persistance ---------------- */
  const defaultState = () => ({
    history: [], sessions: 0, best: 0, streak: 0, lastPlayed: null,
    canton: null,   // "VD" | "GE"
    commune: null,  // (Vaud uniquement)
    mistakes: [],   // [{q, options, answer, theme, scope}]
    stats: {},      // { "Niveau|Thème": {a, c} }
    badges: {},     // { badgeId: true }
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
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active"); window.scrollTo(0, 0);
  }
  function setRing(el, pct) {
    el.style.strokeDasharray = RING_LEN;
    el.style.strokeDashoffset = RING_LEN * (1 - Math.max(0, Math.min(100, pct)) / 100);
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
    { id: "first",    ico: "🎯", title: "Premiers pas",    desc: "Terminer une première session" },
    { id: "exam",     ico: "🎓", title: "Citoyen·ne",      desc: "Réussir une simulation d'examen" },
    { id: "perfect",  ico: "💯", title: "Sans-faute",      desc: "Réussir un examen à 100 %" },
    { id: "streak3",  ico: "🔥", title: "Assidu·e",        desc: "Atteindre une série de 3 jours" },
    { id: "cleaner",  ico: "🧹", title: "Perfectionniste", desc: "Vider sa liste d'erreurs" },
    { id: "marathon", ico: "⭐", title: "Marathonien·ne",  desc: "Réaliser 10 sessions" },
  ];
  function unlock(id) {
    if (state.badges[id]) return;
    state.badges[id] = true; save();
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) toast(a.ico, `Succès débloqué : <b>${a.title}</b>`);
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
             ${sel ? `<span class="commune-check">✓</span>` : `<span class="commune-chev">›</span>`}
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
    const c = VD_DATA.communes[state.commune];
    $("homeCommune").textContent = cn === "VD" ? (c ? c.name : "Choisir…") : CANTON_NAME[cn];
    $("friseTileSub").textContent = "Suisse · " + CANTON_NAME[cn];

    // Ressource « districts » : cantons ayant une carte (Vaud, Valais).
    const dm = districtMap();
    $("btnVsMap").hidden = !dm;
    if (dm) {
      $("districtTileTitle").textContent = dm.districts.length + " districts";
      $("districtTileSub").textContent = cn === "VS" ? "du Valais" : "vaudois";
    }

    // Blocs à score (prépa, révision QCM, suivi) : uniquement pour les cantons QCM.
    const pc = document.querySelector(".prep-card"); if (pc) pc.hidden = cards;
    $("grpReviser").hidden = cards;
    $("grpSuivre").hidden = cards;

    if (cards) {
      const n = cardsData().questions.length;
      $("examTitle").textContent = "S'entraîner";
      $("examSub").textContent = `${n} questions officielles · QCM & fiches`;
      $("examZoneSub").textContent = "Le questionnaire officiel — c'est uniquement là-dessus que tu es évalué·e.";
      $("homeFooter").textContent = `Questions officielles Suisse & Canton de ${CANTON_NAME[cn]} · hors-ligne`;
      return;
    }

    const cfg = EXAM_CFG[cn];
    $("examZoneSub").textContent = "Le questionnaire officiel et ton suivi — c'est uniquement là-dessus que tu es évalué·e.";
    $("examTitle").textContent = "Simuler l'examen";
    $("examSub").textContent = cn === "GE"
      ? `${cfg.total} questions · max 5 fautes`
      : `${cfg.total} questions · ${cfg.minutes} min · réussite 70 %`;
    $("homeFooter").textContent = cn === "GE"
      ? "Questions officielles Suisse & Canton de Genève · hors-ligne"
      : "Questions officielles du Canton de Vaud · hors-ligne";

    const recent = state.history.slice(-5);
    const readiness = recent.length ? Math.round(recent.reduce((s, h) => s + h.pct, 0) / recent.length) : 0;
    $("readinessPct").textContent = readiness + "%";
    $("statBest").textContent = state.best + "%";
    $("statSessions").textContent = state.sessions;
    $("statStreak").textContent = state.streak + " j";
    setTimeout(() => setRing($("readinessRing"), readiness), 60);

    const mc = state.mistakes.length;
    $("btnMistakes").hidden = mc === 0;
    $("mistakesCount").textContent = mc;

    $("badgeCount").textContent = ACHIEVEMENTS.filter((a) => state.badges && state.badges[a.id]).length;

    renderSparkline();
  }

  /* Mini-courbe de progression (carte préparation, viewBox 80×40). */
  function renderSparkline() {
    const svg = $("sparkline");
    const data = state.history.slice(-12);
    if (data.length < 2) { svg.innerHTML = ""; svg.style.visibility = "hidden"; return; }
    svg.style.visibility = "visible";
    const W = 80, H = 40, padX = 2, padY = 6;
    const xs = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
    const ys = (v) => H - padY - (v / 100) * (H - padY * 2);
    let line = "";
    data.forEach((d, i) => { line += `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(d.pct).toFixed(1)} `; });
    const last = data[data.length - 1];
    svg.innerHTML = `<path class="line" d="${line}"/><circle cx="${xs(data.length - 1).toFixed(1)}" cy="${ys(last.pct).toFixed(1)}" r="3"/>`;
  }

  /* ======================================================================
   *  RÉVISION (toutes les questions, réponses affichées)
   * ==================================================================== */
  let study = null; // { scope, items, i, interactive }
  function studyScopes() {
    const c = cantonOf();
    if (c === "GE" || c === "NE" || c === "VS") return [
      { key: "all", label: "Tout", long: "Toutes les questions" },
      { key: "federal", label: "Suisse", long: "Suisse (fédéral)" },
      { key: "cantonal", label: CANTON_NAME[c], long: CANTON_SCOPE[c] },
    ];
    return [
      { key: "all", label: "Tout", long: "Toutes les questions" },
      { key: "federal", label: "Suisse", long: "Suisse (fédéral)" },
      { key: "cantonal", label: "Vaud", long: "Canton de Vaud" },
      { key: "commune", label: "Commune", long: "Ma commune" },
    ];
  }

  // Ordre d'affichage : Découverte puis Quiz. Quiz reste le mode par défaut.
  const STUDY_MODES = [
    { key: "reveal", label: "Découverte" },
    { key: "quiz", label: "Quiz" },
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
      `<button data-m="${m.key}" class="${m.key === cur ? "active" : ""}">${m.label}</button>`).join("");
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
         <span>${s.long}</span>${study && study.scope === s.key ? '<span class="sheet-check">✓</span>' : ""}
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
      study = { scope, items: src.map((c) => Object.assign({}, c)), i: 0, cards: true };
      $("studyScopeLabel").textContent = "Révision · " + (sc ? sc.label : "Tout");
      renderStudy(); return;
    }
    const d = currentDeck();
    const src = scope === "all" ? d.federal.concat(d.cantonal, d.commune) : (d[scope] || []);
    const interactive = study ? study.interactive : true;
    study = { scope, items: src.map(buildQuestion), i: 0, interactive };
    $("studyScopeLabel").textContent = "Révision · " + (sc ? sc.label : "Tout");
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
    $("studyChip").textContent = cur.scope + " · " + cur.theme;
    $("studyCount").textContent = (study.i + 1) + "/" + study.items.length;
    $("studyProgressFill").style.width = ((study.i + 1) / study.items.length) * 100 + "%";
    $("studyIllus").innerHTML = "";
    const box = $("studyOptions"); box.innerHTML = "";
    $("btnPrev").disabled = study.i === 0;
    $("btnNextStudy").textContent = study.i + 1 < study.items.length ? "Suivant ›" : "Terminé ✓";

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
          el.innerHTML = `<span class="mark">${ok ? "✓" : (wrong ? "✕" : (LETTERS[i] || ""))}</span><span>${esc(opt)}</span>`;
          box.appendChild(el);
        }
      });
      $("studyExplain").hidden = !answered;
      if (answered) {
        const good = cur.chosen === cur.answer;
        const head = $("studyExplainHead");
        head.textContent = good ? "Bien vu !" : "Réponse officielle";
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
      b.textContent = "Voir la réponse officielle";
      b.addEventListener("click", () => { cur.revealed = true; renderStudy(); });
      box.appendChild(b);
    }
    $("studyExplain").hidden = !cur.revealed;
    if (cur.revealed) {
      const head = $("studyExplainHead");
      head.textContent = "Réponse officielle";
      head.className = "explain-head savais-head";
      $("studyExplainText").textContent = cur.a;
    }
  }

  function renderStudy() {
    if (study.cards) { renderStudyCard(); return; }
    const cur = study.items[study.i];
    const answered = cur.chosen !== undefined && cur.chosen !== null;
    $("studyChip").textContent = cur.ref.scope + " · " + cur.ref.theme;
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
        el.innerHTML = `<span class="mark">${ok ? "✓" : (wrongPick ? "✕" : (LETTERS[i] || ""))}</span><span>${opt}</span>`;
        box.appendChild(el);
      }
    });

    $("studyExplain").hidden = !revealed;
    if (revealed) {
      const head = $("studyExplainHead");
      if (study.interactive) {
        const good = cur.chosen === cur.answer;
        head.textContent = good ? "Bien vu !" : "À retenir";
        head.className = "explain-head savais-head " + (good ? "ok" : "bad");
      } else {
        head.textContent = "Le savais-tu ?";
        head.className = "explain-head savais-head";
      }
      const exp = (cur.ref.explanation && cur.ref.explanation.trim())
        ? cur.ref.explanation
        : "Réponse correcte : " + cur.options[cur.answer];
      $("studyExplainText").textContent = exp;
      const ik = cur.ref.illustration;
      $("studyIllus").innerHTML = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik]) ? ILLUSTRATIONS[ik] : "";
    }

    $("btnPrev").disabled = study.i === 0;
    $("btnNextStudy").textContent = study.i + 1 < study.items.length ? "Suivant ›" : "Terminé ✓";
  }

  function studyNext() {
    if (study.i + 1 < study.items.length) { study.i++; renderStudy(); }
    else { showScreen("screen-home"); renderHome(); }
  }
  function studyPrev() { if (study.i > 0) { study.i--; renderStudy(); } }

  /* ======================================================================
   *  EXPLORER LA SUISSE (carte interactive des cantons)
   * ==================================================================== */
  const EXPLORE_INTRO =
    `<p class="cd-intro"><b>26 cantons</b>, 4 langues nationales, ~9 millions d'habitants.<br>` +
    `Touche un canton sur la carte pour l'explorer.</p>`;

  const REGION_OF = {};
  CANTONS.forEach((c) => { REGION_OF[c.code] = c.region; });
  const REGION_LONG = { de: "Suisse alémanique", fr: "Suisse romande", it: "Suisse italienne", multi: "Canton plurilingue" };

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
        `<span class="legend-item" data-region="${k}"><span class="legend-dash" style="background:${REGION_COLORS[k]}"></span>${REGION_LABEL[k]}</span>`).join("");
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
      box.innerHTML = EXPLORE_INTRO;
      return;
    }
    const col = REGION_COLORS[c.region];
    const cta = (c.code === "VD" && cantonOf() === "VD")
      ? `<div class="cid-cta-wrap"><button class="cid-cta" id="cantonQuizBtn" style="border-color:${col};color:${col}">5 questions sur le canton de Vaud →</button></div>`
      : "";
    box.classList.add("as-card");
    box.innerHTML =
      `<div class="cid-head" style="background:${col}">
         <div class="cid-head-top"><span class="cid-name">${c.name}</span><span class="cid-code">${c.code}</span></div>
         <div class="cid-region">${REGION_LONG[c.region]}</div>
       </div>
       <div class="cid-cols">
         <div><div class="cid-val">${c.capital}</div><div class="cid-lab">Chef-lieu</div></div>
         <div><div class="cid-val">${c.year}</div><div class="cid-lab">Confédération</div></div>
         <div><div class="cid-val">${c.langs}</div><div class="cid-lab">Langue</div></div>
       </div>
       <div class="cid-quote"><span class="cid-q" style="color:${col}">«</span><p>${c.fact}</p></div>
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
  const levelLabel = (l) => ({ Suisse: "Suisse", Vaud: "Canton de Vaud", "Genève": "Canton de Genève", Commune: "Ma commune" }[l] || l);

  /* Palier de couleur d'une barre (seuil examen à 60 %). */
  function barColor(pct) { return pct < 30 ? "#C8442E" : pct < 45 ? "#D8836F" : pct < 60 ? "#C08A2E" : "#3E7A4E"; }
  const THEME_ART = { "Géographie": "la Géographie", "Histoire": "l'Histoire", "Politique": "la Politique", "Social": "le Social" };
  const elle = (t) => THEME_ART[t] || t;

  function openStats() {
    const box = $("statsBody");
    let tot = { a: 0, c: 0 };
    Object.values(state.stats).forEach((s) => { tot.a += s.a; tot.c += s.c; });

    if (!tot.a) {
      box.innerHTML = `<p class="stats-empty">Réponds à quelques questions (examen ou révision en mode Quiz) pour voir ton bilan apparaître ici. 📊</p>`;
      showScreen("screen-stats"); return;
    }

    const agg = (filterFn) => {
      let a = 0, c = 0;
      Object.entries(state.stats).forEach(([k, s]) => { if (filterFn(k)) { a += s.a; c += s.c; } });
      return { a, c, pct: a ? Math.round((c / a) * 100) : 0 };
    };

    // Thèmes avec données, triés du plus faible au plus fort.
    const themeStats = STAT_THEMES
      .map((t) => Object.assign({ theme: t }, agg((k) => k.split("|")[1] === t)))
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
           <div class="stats-hero-sur">Concentre-toi sur</div>
           <div class="stats-hero-theme">${elle(w.theme)}</div>
           <p class="stats-hero-msg">C'est ton thème le plus fragile : ${w.pct}% de réussite, soit ${toReview} question${toReview > 1 ? "s" : ""} à retravailler.</p>
           <button class="btn btn-primary stats-hero-cta" id="statsHeroCta" data-theme="${w.theme}">Réviser ${elle(w.theme)}</button>
         </div>`;
    }

    box.innerHTML =
      hero +
      `<div class="stats-card">
         <div class="stats-card-head"><span class="stats-card-title">Tous les thèmes</span><span class="stats-thresh">┃ seuil examen 60%</span></div>
         <div class="sbar-list">` +
           themeStats.map((r, i) => sbar({ label: r.theme, pct: r.pct, weak: i === 0 }, 60)).join("") +
         `</div>
       </div>` +
      `<div class="stats-tiles">
         <div class="stats-tile"><div class="stats-tile-val">${overallPct}%</div><div class="stats-tile-lab">Global</div></div>
         <div class="stats-tile"><div class="stats-tile-val">${tot.a}</div><div class="stats-tile-lab">Répondues</div></div>
         <div class="stats-tile"><div class="stats-tile-val">${state.mistakes.length}</div><div class="stats-tile-lab">À revoir</div></div>
       </div>` +
      `<div class="stats-card">
         <div class="stats-card-head"><span class="stats-card-title">Par niveau</span></div>
         <div class="sbar-list">` +
           statLevels().map((l) => {
             const r = agg((k) => k.split("|")[0] === l);
             const label = levelLabel(l);
             return r.a ? sbar({ label, pct: r.pct, frac: r.c + "/" + r.a }, 60)
                        : `<div class="sbar-row"><div class="sbar-head"><b>${label}</b><span>—</span></div><div class="sbar"><i style="width:0"></i></div></div>`;
           }).join("") +
         `</div>
       </div>` +
      `<button class="btn btn-reset" id="btnResetStats">Réinitialiser mes statistiques et erreurs</button>`;

    const hc = $("statsHeroCta");
    if (hc) hc.addEventListener("click", () => startThemeReview(hc.dataset.theme));
    $("btnResetStats").addEventListener("click", () => {
      if (confirm("Réinitialiser toutes tes statistiques et ta liste d'erreurs ?")) {
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
    if (y < 500) return "Antiquité";
    if (y < 1500) return "Moyen Âge";
    if (y < 1798) return "Époque moderne";
    return "Époque contemporaine";
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
    items.forEach((t) => {
      const era = eraOf(t.year);
      if (era !== currentEra) {
        if (open) html += `</div>`;
        html += `<div class="tl-era"><span></span>${era}<span></span></div><div class="tl-rail">`;
        currentEra = era; open = true;
      }
      const isCanton = t.scope !== "ch";
      const key = TL_KEY_YEARS[t.year] || /rejoint la Confédération/i.test(t.title);
      const tag = isCanton ? ` <em>${CANTON_NAME[cn].toUpperCase()}</em>` : "";
      html += `<div class="tl-node ${isCanton ? "vd" : "ch"}">
          <span class="tl-pin"></span>
          <div class="tl-year">${t.year}${tag}</div>
          <div class="tl-card${key ? " key" : ""}">
            <b>${t.title}</b>
            <p>${t.desc}${key ? ` <i>À retenir pour l'examen.</i>` : ""}</p>
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
    const filters = [
      { key: "all", label: "Tout", dot: null },
      { key: "ch", label: "Suisse", dot: "var(--red)" },
      { key: cn, label: CANTON_NAME[cn], dot: "var(--ok)" },
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
    bas:  { color: "#3E7A4E", label: "Bas-Valais" },
    cen:  { color: "#C8442E", label: "Valais central" },
    haut: { color: "#5B7DB1", label: "Haut-Valais" },
  };
  function districtMap() { return (typeof DISTRICTS_MAPS !== "undefined") ? DISTRICTS_MAPS[cantonOf()] : null; }

  /* Fiche par district : chef-lieu + repère. Pour le Valais, la langue est déduite
     de la région (Haut-Valais = allemand, Valais central & Bas-Valais = français). */
  const DISTRICT_INFO = {
    // Vaud
    2221: { chef: "Aigle", note: "Chablais vaudois, vignobles ; Villars, Leysin, Bex." },
    2222: { chef: "Payerne", note: "Broye ; abbatiale de Payerne, Avenches la romaine, lac de Morat." },
    2223: { chef: "Échallens", note: "Le « grenier à blé » du canton, cœur agricole." },
    2224: { chef: "Yverdon-les-Bains", note: "Nord vaudois ; Yverdon (thermes), Sainte-Croix, Vallorbe, Grandson." },
    2225: { chef: "Lausanne", note: "Capitale du canton ; siège du CIO, cathédrale gothique." },
    2226: { chef: "Bourg-en-Lavaux", note: "Terrasses viticoles de Lavaux (UNESCO), région d'Oron." },
    2227: { chef: "Morges", note: "La Côte lémanique, vignobles, château de Morges." },
    2228: { chef: "Nyon", note: "La Côte ; Nyon la romaine, Coppet, Rolle." },
    2229: { chef: "Renens", note: "Agglomération lausannoise ; EPFL et UNIL à Ecublens." },
    2230: { chef: "Vevey", note: "Riviera ; Montreux (jazz), Vevey (Nestlé, Chaplin), Château-d'Œx." },
    // Valais
    2301: { chef: "Brigue", note: "Château Stockalper, col et tunnel du Simplon." },
    2302: { chef: "Conthey", note: "Coteaux et vignobles au-dessus de la plaine du Rhône." },
    2303: { chef: "Sembrancher", note: "Verbier, val de Bagnes, col du Grand-Saint-Bernard." },
    2304: { chef: "Münster", note: "Haute vallée du Rhône ; proche du glacier d'Aletsch (UNESCO)." },
    2305: { chef: "Vex", note: "Val d'Hérens, Évolène ; célèbre pour les combats de reines." },
    2306: { chef: "Loèche", note: "Loèche-les-Bains, plus grande station thermale des Alpes." },
    2307: { chef: "Martigny", note: "Coude du Rhône ; amphithéâtre romain, Fondation Gianadda." },
    2308: { chef: "Monthey", note: "Val d'Illiez, Champéry, domaine des Portes du Soleil." },
    2309: { chef: "Rarogne", note: "Église dans le rocher ; tombe du poète Rilke." },
    2310: { chef: "Saint-Maurice", note: "Abbaye fondée en 515, la plus ancienne d'Occident encore active." },
    2311: { chef: "Sierre", note: "Crans-Montana, val d'Anniviers ; ville la plus ensoleillée." },
    2312: { chef: "Sion", note: "Capitale du canton ; châteaux de Valère et Tourbillon." },
    2313: { chef: "Viège", note: "Vallées de Zermatt (Cervin) et de Saas-Fee." },
  };
  const VS_LANG = { haut: "Allemand (Haut-Valais)", cen: "Français (Valais central)", bas: "Français (Bas-Valais)" };

  function showDistrictInfo(d) {
    const box = $("vsdInfo");
    if (!box) return;
    const info = DISTRICT_INFO[d.id];
    const rows = [];
    if (info && info.chef) rows.push(`<div class="vsd-row"><span>🏛️ Chef-lieu</span><b>${info.chef}</b></div>`);
    if (cantonOf() === "VS" && d.region) rows.push(`<div class="vsd-row"><span>🗣️ Langue</span><b>${VS_LANG[d.region] || ""}</b></div>`);
    box.innerHTML = `<div class="vsd-info-h"><span class="vsd-dot" style="background:${d.color}"></span>${d.name}</div>` +
      rows.join("") + (info && info.note ? `<p class="vsd-note">${info.note}</p>` : "");
    box.hidden = false;
  }
  function hideDistrictInfo() { const box = $("vsdInfo"); if (box) box.hidden = true; }

  function openDistricts() {
    const m = districtMap();
    if (!m) return;
    const svg = $("vsMapSvg");
    $("vsMapTitle").textContent = `Les ${m.districts.length} districts ${cantonOf() === "VS" ? "du Valais" : "vaudois"}`;
    $("vsMapNote").innerHTML = cantonOf() === "VS"
      ? "Les <b>13 étoiles</b> du drapeau valaisan représentent ces <b>13 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes)."
      : "Le canton de Vaud compte <b>10 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes).";

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
        `<span class="legend-item"><span class="legend-dot" style="background:${VS_REGION[k].color}"></span>${VS_REGION[k].label}</span>`).join("");
      const byReg = { bas: [], cen: [], haut: [] };
      m.districts.forEach((d) => byReg[d.region].push(d));
      $("vsdList").innerHTML = Object.keys(VS_REGION).map((k) =>
        `<div class="vsd-group">
           <div class="vsd-region"><span class="vsd-dot" style="background:${VS_REGION[k].color}"></span>${VS_REGION[k].label}</div>
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

  /* Données d'élection par canton (composition + durée du mandat). */
  const ELECT = {
    VD: { gcN: "150 député·es", ceN: "7 conseiller·ères", tCant: "5 ans", tCom: "5 ans" },
    GE: { gcN: "100 député·es", ceN: "7 conseiller·ères", tCant: "5 ans", tCom: "5 ans" },
    NE: { gcN: "100 député·es", ceN: "5 conseiller·ères", tCant: "4 ans", tCom: "4 ans" },
    VS: { gcN: "130 député·es", ceN: "5 conseiller·ères", tCant: "4 ans", tCom: "4 ans" },
  };

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
    const ci = COMMUNE_INST[cantonOf()] || COMMUNE_INST.VD;
    const cantonNm = CANTON_NAME[cantonOf()];
    $("politiqueBody").innerHTML =
      `<p class="cs-intro">La Suisse repose sur <b>3 niveaux</b> (Confédération · Canton · Commune) et sur la <b>séparation des 3 pouvoirs</b> : qui fait les lois, qui gouverne, qui juge.</p>` +
      polLevel("Confédération", "niveau fédéral · Suisse", [
        { k: "leg", ico: "📜", power: "Législatif — fait les lois", body: "Assemblée fédérale", note: "Conseil national (200 · élu par le peuple) + Conseil des États (46 · représente les cantons)" },
        { k: "exe", ico: "🏛️", power: "Exécutif — gouverne", body: "Conseil fédéral (7 ministres)", note: "Présidence tournante 1 an : le·la Président·e de la Confédération" },
        { k: "jud", ico: "⚖️", power: "Judiciaire — juge", body: "Tribunal fédéral", note: "à Lausanne" },
      ]) +
      polLevel("Canton de " + cantonNm, "niveau cantonal", [
        { k: "leg", ico: "📜", power: "Législatif", body: "Grand Conseil", note: "le parlement cantonal" },
        { k: "exe", ico: "🏛️", power: "Exécutif", body: "Conseil d'État", note: "le gouvernement cantonal" },
        { k: "jud", ico: "⚖️", power: "Judiciaire", body: "Tribunal cantonal", note: "" },
      ]) +
      polLevel("Commune", "niveau communal · " + cantonNm, [
        { k: "leg", ico: "📜", power: "Législatif", body: ci.legis, note: "" },
        { k: "exe", ico: "🏛️", power: "Exécutif", body: ci.exec, note: "présidé·e par le·la " + ci.head },
      ]) +
      (() => {
        const e = ELECT[cantonOf()] || ELECT.VD;
        return `<h3 class="cs-h">🗳️ Qui élit qui ?</h3>
          <p class="cs-intro">Le <b>peuple</b> (Suisses dès <b>18 ans</b>) élit directement les <b>parlements</b> aux 3 niveaux, et aussi les <b>gouvernements</b> — sauf au niveau fédéral, où le Conseil fédéral est élu par le Parlement.</p>
          <div class="qe-peuple">👥 Le peuple &nbsp;·&nbsp; citoyen·nes suisses dès 18 ans</div>
          <div class="qe-arrow">élit ↓</div>` +
          qeLevel("Confédération",
            qeCard("leg", "Législatif · fait les lois", "Conseil national + Conseil des États", "200 + 46 · mandat 4 ans", "🗳️ élus directement par le peuple", "people") +
            qeCard("exe", "Exécutif · gouverne", "Conseil fédéral", "7 ministres · mandat 4 ans", "🏛️ élu par le Parlement (pas le peuple)", "parl")
          ) +
          qeLevel("Canton de " + cantonNm,
            qeCard("leg", "Législatif", "Grand Conseil", e.gcN + " · mandat " + e.tCant, "🗳️ élu directement par le peuple", "people") +
            qeCard("exe", "Exécutif", "Conseil d'État", e.ceN + " · mandat " + e.tCant, "🗳️ élu directement par le peuple", "people")
          ) +
          qeLevel("Commune",
            qeCard("leg", "Législatif", ci.legis, "mandat " + e.tCom, "🗳️ élu par le peuple (ou assemblée)", "people") +
            qeCard("exe", "Exécutif", ci.exec, "présidé·e par le·la " + ci.head + " · mandat " + e.tCom, "🗳️ élu directement par le peuple", "people")
          ) +
          `<div class="cs-card cs-highlight">
             <div class="cs-card-h">✅ À retenir</div>
             <ul class="cs-list">
               <li><b>Canton & commune</b> : le peuple élit <b>parlement ET gouvernement</b> directement.</li>
               <li><b>Confédération</b> : le peuple élit le <b>Parlement</b> (les 2 chambres) ; c'est ensuite ce Parlement qui élit le <b>Conseil fédéral</b>.</li>
               <li>La <b>présidence de la Confédération</b> tourne chaque année entre les 7 conseiller·ères fédéraux.</li>
               <li><b>Démocratie directe</b> : le peuple vote aussi les <b>initiatives</b> et <b>référendums</b> (les votations).</li>
             </ul>
           </div>`;
      })();
    showScreen("screen-politique");
  }

  function openPiliers() {
    const pillar = (n, color, name, sub, tag, sys, but) =>
      `<div class="cs-pillar">
         <div class="cs-pillar-top"><span class="cs-pillar-n" style="background:${color}">${n}</span>
           <div><b>${name}</b><small>${sub}</small></div></div>
         <span class="cs-tag" style="color:${color};border-color:${color}">${tag}</span>
         <div class="cs-pillar-row"><span>Système</span><b>${sys}</b></div>
         <div class="cs-pillar-row"><span>But</span><b>${but}</b></div>
       </div>`;
    $("piliersBody").innerHTML =
      `<p class="cs-intro">La <b>prévoyance vieillesse</b> suisse repose sur <b>3 piliers</b>, pour garder son niveau de vie une fois à la retraite.</p>` +
      pillar("1", "#C8442E", "AVS / AI", "Assurance-vieillesse, survivants et invalidité", "Obligatoire · État",
             "Répartition : les personnes qui travaillent financent les retraité·es", "Couvrir les besoins vitaux (minimum)") +
      pillar("2", "#3E7A4E", "LPP", "Prévoyance professionnelle (caisse de pension)", "Obligatoire dès ~22 050 CHF/an",
             "Capitalisation : on épargne pour soi (employeur + employé cotisent)", "Maintenir le niveau de vie habituel") +
      pillar("3", "#5B7DB1", "3ᵉ pilier", "Prévoyance privée — 3a (lié) · 3b (libre)", "Facultatif",
             "Épargne individuelle (avantages fiscaux pour le 3a)", "Compléter les 1er et 2e piliers") +
      `<p class="cs-note">Avec les 1er et 2e piliers réunis, on vise environ <b>60 %</b> du dernier salaire à la retraite.</p>`;
    showScreen("screen-piliers");
  }

  function openSante() {
    const card = (ico, title, body) =>
      `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
    $("santeBody").innerHTML =
      `<p class="cs-intro">En Suisse, l'<b>assurance maladie de base est obligatoire</b> — mais fournie par des <b>caisses privées</b> que chacun choisit librement.</p>` +
      card("🩺", "Assurance de base (LAMal)", "Obligatoire pour toute personne qui habite en Suisse (à souscrire dans les 3 mois). Les prestations de base sont les mêmes partout.") +
      card("🔄", "Libre choix de la caisse", "On choisit librement sa caisse maladie (assureur), et on peut en changer chaque année. Les caisses ne peuvent pas refuser l'assurance de base.") +
      card("💰", "Prime & participation", "Chacun paie une <b>prime</b> mensuelle par personne (indépendante du revenu). S'ajoutent une <b>franchise</b> annuelle et une <b>quote-part</b> (part des frais à sa charge).") +
      card("🤝", "Subsides", "Les personnes et familles à revenu modeste reçoivent des <b>subsides</b> (réductions de primes) versés par le canton.") +
      card("➕", "Assurances complémentaires", "Facultatives (LCA) : chambre privée à l'hôpital, soins dentaires, médecines alternatives… Les caisses peuvent y poser des conditions.");
    showScreen("screen-sante");
  }

  function openDemocratie() {
    const card = (ico, title, body) =>
      `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
    $("democratieBody").innerHTML =
      `<p class="cs-intro">La <b>démocratie directe</b> permet au peuple de décider lui-même, en plus d'élire ses représentant·es. On vote environ <b>4 fois par an</b>.</p>` +
      card("🗳️", "Les votations", "Aux 3 niveaux (fédéral, cantonal, communal), le peuple se prononce directement sur des objets — pas seulement sur des personnes.") +
      card("📝", "Initiative populaire", "Proposer une modification de la <b>Constitution</b>. Au niveau fédéral : <b>100 000 signatures</b> en <b>18 mois</b>. Elle est ensuite soumise au vote du peuple.") +
      card("🛑", "Référendum facultatif", "S'opposer à une <b>loi</b> votée par le Parlement. Il faut <b>50 000 signatures</b> (ou 8 cantons) en <b>100 jours</b> pour la soumettre au vote.") +
      card("✅", "Référendum obligatoire", "Toute modification de la Constitution (et certaines adhésions internationales) est <b>automatiquement</b> soumise au vote.") +
      `<div class="cs-card cs-highlight"><div class="cs-card-h">⚖️ La double majorité</div><p>Pour modifier la Constitution, il faut la majorité du <b>peuple</b> <b>ET</b> la majorité des <b>cantons</b>.</p></div>` +
      `<p class="cs-note">Droits politiques dès <b>18 ans</b> pour les Suisses. Dans quelques cantons (Glaris, Appenzell Rhodes-Intérieures), on vote encore à main levée : la <b>Landsgemeinde</b>.</p>`;
    showScreen("screen-democratie");
  }

  function openDroits() {
    const section = (cls, ico, title, items) =>
      `<div class="cs-card cs-${cls}">
         <div class="cs-card-h">${ico} ${title}</div>
         <ul class="cs-list">${items.map((t) => `<li>${t}</li>`).join("")}</ul>
       </div>`;
    $("droitsBody").innerHTML =
      `<p class="cs-intro">La citoyenneté, c'est un équilibre entre des <b>droits</b> et des <b>devoirs</b>.</p>` +
      section("duty", "📋", "Mes devoirs", [
        "Respecter la <b>Constitution</b> et les <b>lois</b>",
        "Payer ses <b>impôts</b>",
        "Envoyer ses enfants à l'école (<b>scolarité obligatoire</b>)",
        "S'assurer (<b>assurance maladie</b> de base obligatoire)",
        "<b>Service militaire ou civil</b> (hommes suisses) — sinon taxe d'exemption",
      ]) +
      section("right", "🗽", "Mes droits", [
        "<b>Libertés fondamentales</b> : opinion & information, croyance & conscience, réunion & association, langue",
        "<b>Droits politiques</b> dès 18 ans : voter, élire, être élu·e, signer initiatives & référendums",
        "<b>Liberté d'établissement</b> : s'installer où l'on veut en Suisse",
        "<b>Égalité</b> devant la loi ; interdiction de discrimination",
        "<b>Protection consulaire</b> de la Suisse à l'étranger",
      ]);
    showScreen("screen-droits");
  }

  /* Fiche d'identité du canton de l'utilisateur. */
  const CANTON_PROFILE = {
    VD: { capital: "Lausanne", joined: "1803", langs: "Français", communes: "~300", districts: "10", pop: "~815 000", gc: 150, ce: 7, motto: "Liberté et patrie",
      facts: ["Terrasses de Lavaux inscrites à l'UNESCO", "Lausanne, capitale olympique (siège du CIO)", "Bordé par le lac Léman ; le plus peuplé des cantons romands"] },
    GE: { capital: "Genève", joined: "1815", langs: "Français", communes: "45", districts: "—", pop: "~510 000", gc: 100, ce: 7, motto: "Post Tenebras Lux — « Après les ténèbres, la lumière »",
      facts: ["Genève internationale : ONU, CICR, OMS…", "Le jet d'eau et la rade", "L'Escalade (1602) ; ville de Calvin et de la Réforme"] },
    NE: { capital: "Neuchâtel", joined: "1815 (république dès 1848)", langs: "Français", communes: "~27", districts: "— (abolis en 2018)", pop: "~176 000", gc: 100, ce: 5, motto: "",
      facts: ["Berceau de l'horlogerie ; urbanisme horloger (La Chaux-de-Fonds / Le Locle) à l'UNESCO", "1er canton à accorder le droit de vote aux étrangers (niveau communal)", "République et Canton de Neuchâtel"] },
    VS: { capital: "Sion", joined: "1815", langs: "Français et Allemand (canton bilingue)", communes: "~122", districts: "13", pop: "~355 000", gc: 130, ce: 5, motto: "",
      facts: ["Le Cervin et la Pointe Dufour, plus haut sommet de Suisse", "Canton bilingue français / allemand", "Les 13 étoiles du drapeau = les 13 districts ; vignoble et grands barrages"] },
  };
  function openMonCanton() {
    const cn = cantonOf();
    const p = CANTON_PROFILE[cn];
    const nm = CANTON_NAME[cn];
    const col = (typeof REGION_COLORS !== "undefined") ? REGION_COLORS[cn === "VS" ? "multi" : "fr"] : "#C65D3B";
    const regLong = cn === "VS" ? "Canton plurilingue" : "Suisse romande";
    $("monCantonTitle").textContent = CANTON_SCOPE[cn];
    const row = (label, val) => `<div class="mc-row"><span>${label}</span><b>${val}</b></div>`;
    $("monCantonBody").innerHTML =
      `<div class="mc-head" style="background:${col}">
         <div class="mc-head-top"><span class="mc-name">${nm}</span><span class="mc-code">${cn}</span></div>
         <div class="mc-region">${regLong}</div>
       </div>
       <div class="cs-card">
         ${row("Chef-lieu", p.capital)}
         ${row("Entrée dans la Confédération", p.joined)}
         ${row("Langue(s)", p.langs)}
         ${row("Communes", p.communes)}
         ${row("Districts", p.districts)}
         ${row("Population", p.pop + " hab.")}
       </div>
       <div class="cs-card">
         <div class="cs-card-h">🏛️ Institutions cantonales</div>
         ${row("Grand Conseil (législatif)", p.gc + " sièges")}
         ${row("Conseil d'État (exécutif)", p.ce + " membres")}
         ${row("Législature", "5 ans")}
       </div>` +
      (p.motto ? `<div class="cs-card"><div class="cs-card-h">🛡️ Devise</div><p><i>${p.motto}</i></p></div>` : "") +
      `<div class="cs-card cs-highlight">
         <div class="cs-card-h">✨ À savoir</div>
         <ul class="cs-list">${p.facts.map((f) => `<li>${f}</li>`).join("")}</ul>
       </div>
       <p class="cs-note">Chiffres indicatifs (population et nombre de communes évoluent avec les fusions).</p>`;
    showScreen("screen-moncanton");
  }

  const csCard = (ico, title, body) => `<div class="cs-card"><div class="cs-card-h">${ico} ${title}</div><p>${body}</p></div>`;
  const csList = (cls, ico, title, items) =>
    `<div class="cs-card ${cls || ""}"><div class="cs-card-h">${ico} ${title}</div><ul class="cs-list">${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;

  function openNaturalisation() {
    $("naturalisationBody").innerHTML =
      `<p class="cs-intro">Devenir suisse par <b>naturalisation ordinaire</b> : les conditions et les étapes principales.</p>` +
      csList("", "🏠", "Résidence", [
        "<b>10 ans</b> de résidence en Suisse (les années entre 8 et 18 ans comptent double, min. 6 ans réels)",
        "Être titulaire d'un <b>permis C</b> (établissement)",
        "+ une durée de résidence dans le <b>canton</b> et la <b>commune</b> (variable selon les lieux)",
      ]) +
      csList("", "🤝", "Intégration", [
        "Respecter la <b>Constitution</b> et l'ordre juridique ; ne pas mettre en danger la sécurité",
        "Participer à la <b>vie économique</b> ou suivre une <b>formation</b>",
        "Encourager l'intégration de sa famille",
      ]) +
      csCard("💬", "Langue", "Maîtriser une <b>langue nationale</b> : à l'<b>oral (niveau B1)</b> et à l'<b>écrit (niveau A2)</b> selon le cadre européen (CECR).") +
      csCard("🧠", "Connaissances", "Connaître la <b>Suisse</b>, le <b>canton</b> et la <b>commune</b> — géographie, histoire, institutions, us et coutumes. C'est l'objet du <b>test</b> que tu prépares ici. 💪") +
      `<div class="cs-card cs-highlight"><div class="cs-card-h">🏛️ Trois niveaux décident</div><p>La naturalisation ordinaire nécessite l'accord des <b>trois</b> : autorisation de la <b>Confédération</b>, décision du <b>canton</b> et de la <b>commune</b>.</p></div>` +
      csCard("⚡", "Naturalisation facilitée", "Procédure allégée (fédérale) dans certains cas : par ex. <b>conjoint·e de Suisse</b> (env. 5 ans de résidence + 3 ans d'union), ou personnes de la <b>3ᵉ génération</b>.") +
      `<p class="cs-note">Des émoluments (frais) s'appliquent et la procédure peut durer <b>plusieurs années</b>. Les détails exacts dépendent du canton et de la commune.</p>`;
    showScreen("screen-naturalisation");
  }

  function openFederalisme() {
    $("federalismeBody").innerHTML =
      `<p class="cs-intro">La Suisse est un <b>État fédéral</b> : le pouvoir est réparti entre <b>3 niveaux</b>, chacun avec ses compétences et ses impôts.</p>` +
      csList("", "🏔️", "Confédération", ["Armée · monnaie (franc suisse) · affaires étrangères · douanes", "AVS/AI · routes nationales (autoroutes) · énergie"]) +
      csList("", "🏛️", "Cantons (26)", ["Police · écoles · santé et hôpitaux · culture", "Chaque canton a sa <b>Constitution</b>, ses lois et ses tribunaux"]) +
      csList("", "🏘️", "Communes (~2 100)", ["Écoles primaires · eau · déchets · aménagement local", "État civil · pompiers · routes communales"]) +
      `<div class="cs-card cs-highlight"><div class="cs-card-h">🧩 Subsidiarité</div><p>Ce qu'un niveau <b>inférieur</b> peut faire, il le fait ; le niveau supérieur n'intervient que si nécessaire. On paie donc des impôts aux <b>3 niveaux</b>.</p></div>`;
    showScreen("screen-federalisme");
  }

  function openLangues() {
    $("languesBody").innerHTML =
      `<p class="cs-intro">La Suisse a <b>4 langues nationales</b>. Chacun a le droit de parler la sienne (liberté de la langue).</p>` +
      csCard("🇩🇪", "Allemand — ~62 %", "La plus parlée. Majorité des cantons (Zurich, Berne, Bâle, Lucerne…). En Suisse on parle surtout le <b>suisse allemand</b> (dialecte).") +
      csCard("🇫🇷", "Français — ~23 %", "La <b>Suisse romande</b> : Vaud, Genève, Neuchâtel, Jura, et une partie du Valais, de Fribourg et de Berne.") +
      csCard("🇮🇹", "Italien — ~8 %", "Le <b>Tessin</b> et quelques vallées du sud des Grisons.") +
      csCard("🏔️", "Romanche — ~0,5 %", "Parlé dans les <b>Grisons</b> ; 4ᵉ langue nationale, langue officielle pour les échanges avec les romanchophones.") +
      `<div class="cs-card cs-highlight"><div class="cs-card-h">🗺️ Cantons plurilingues</div><p><b>Bilingues</b> : Berne, Fribourg, Valais (français-allemand). <b>Trilingue</b> : Grisons (allemand, romanche, italien). Langues officielles de la Confédération : allemand, français, italien.</p></div>`;
    showScreen("screen-langues");
  }

  function openNeutralite() {
    $("neutraliteBody").innerHTML =
      `<p class="cs-intro">La Suisse est <b>neutre</b> et une terre de dialogue et d'action humanitaire.</p>` +
      csCard("🕊️", "La neutralité", "La Suisse ne participe pas aux conflits armés et ne prend pas parti militairement. Neutralité <b>permanente et armée</b>, reconnue au <b>Congrès de Vienne (1815)</b>.") +
      csCard("🌍", "ONU", "La Suisse a adhéré à l'<b>ONU en 2002</b>, par votation populaire.") +
      csCard("🛂", "Schengen — mais pas l'UE", "La Suisse fait partie de l'espace <b>Schengen</b> (libre circulation), mais n'est <b>pas membre de l'Union européenne</b>.") +
      csCard("➕", "La Croix-Rouge", "Fondée à <b>Genève</b> par <b>Henri Dunant</b> (1863), qui reçut le tout premier <b>prix Nobel de la paix</b>.") +
      csCard("🏢", "La Genève internationale", "Siège européen de l'<b>ONU</b>, du <b>CICR</b>, de l'<b>OMS</b>, de l'<b>OMC</b>… La Suisse offre ses « bons offices » pour la médiation.");
    showScreen("screen-neutralite");
  }

  function openSymboles() {
    $("symbolesBody").innerHTML =
      `<p class="cs-intro">Quelques symboles et traditions qui font la Suisse — souvent au programme du test.</p>` +
      csCard("🎇", "Fête nationale : 1er août", "Elle commémore le <b>Pacte de 1291</b> (alliance sur la prairie du <b>Grütli</b>). On allume des feux et des lampions.") +
      csCard("🤝", "Le Pacte fédéral (1291)", "<b>Uri, Schwytz et Unterwald</b> s'allient : acte fondateur de la Confédération.") +
      csCard("🏹", "Guillaume Tell", "Héros <b>légendaire</b> (la pomme, l'arbalète), symbole de la liberté et de la résistance à l'oppression.") +
      csCard("🚩", "Le drapeau", "Une <b>croix blanche</b> sur fond <b>rouge</b> — l'un des rares drapeaux carrés. (Emblème protégé par la loi.)") +
      csList("", "🎶", "Us et coutumes", ["Cor des Alpes · yodel · lutte suisse (Schwingen)", "Désalpe · carnaval · Fête des Vignerons", "Chocolat · fromage (fondue, raclette, Gruyère)"]);
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

  function renderQuestion() {
    const cur = quiz.items[quiz.i];
    quiz.answered = false;
    $("quizCat").textContent = cur.ref.scope + (quiz.mode === "exam" ? "" : " · " + cur.ref.theme);
    $("quizCount").textContent = (quiz.i + 1) + "/" + quiz.items.length;
    $("quizProgressFill").style.width = ((quiz.i) / quiz.items.length) * 100 + "%";
    $("questionText").textContent = cur.ref.q;
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
        if (i === cur.answer) { b.classList.add("correct"); mark.textContent = "✓"; }
        else if (i === chosen) { b.classList.add("wrong"); mark.textContent = "✕"; }
        else { b.classList.add("dim"); }
      });
      const head = $("explainHead");
      head.textContent = correct ? "Bonne réponse" : "À retenir";
      head.className = "explain-head " + (correct ? "ok" : "bad");
      const exp = (cur.ref.explanation && cur.ref.explanation.trim())
        ? cur.ref.explanation
        : "Réponse correcte : " + cur.options[cur.answer];
      $("explainText").textContent = exp;
      const ik = cur.ref.illustration;
      $("explainIllus").innerHTML = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik]) ? ILLUSTRATIONS[ik] : "";
      $("explainBox").hidden = false;
    }

    $("quizProgressFill").style.width = ((quiz.i + 1) / quiz.items.length) * 100 + "%";
    const nb = $("btnNext");
    nb.textContent = quiz.i + 1 < quiz.items.length ? "Continuer" : (quiz.mode === "exam" ? "Terminer l'examen" : "Voir mon résultat");
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
    const rows = THEMES.map((t) => {
      const its = quiz.items.filter((it) => it.ref.theme === t);
      const c = its.filter((it) => it.chosen === it.answer).length;
      const a = its.length;
      return { theme: t, a, c, pct: a ? Math.round((c / a) * 100) : 0 };
    }).filter((r) => r.a > 0).sort((x, y) => x.pct - y.pct);

    return `<div class="result-card">
        <div class="stats-card-head"><span class="stats-card-title">Ton bilan par thème</span><span class="stats-thresh">┃ 70%</span></div>
        <div class="sbar-list">` +
        rows.map((r) => `
          <div class="sbar-row">
            <div class="sbar-head"><b>${r.theme}</b><span class="${r.pct < 70 ? "weak" : "good"}">${r.c}/${r.a}</span></div>
            <div class="sbar"><i style="width:${r.pct}%;background:${barColorExam(r.pct)}"></i><u style="left:70%"></u></div>
          </div>`).join("") +
        `</div></div>`;
  }

  /* 3 tuiles récap (résultat d'examen réussi) : Sessions / Progression / Série. */
  function recapTiles(prevPct) {
    const pct = state.history.length ? state.history[state.history.length - 1].pct : 0;
    let prog = "—";
    if (prevPct !== null) { const d = pct - prevPct; prog = (d >= 0 ? "▲ +" : "▼ ") + Math.abs(d); }
    return `<div class="recap-tiles">
        <div class="recap-tile"><div class="recap-val">${state.sessions}</div><div class="recap-lab">Sessions</div></div>
        <div class="recap-tile"><div class="recap-val">${prog}</div><div class="recap-lab">Progression</div></div>
        <div class="recap-tile"><div class="recap-val">${state.streak} j</div><div class="recap-lab">Série</div></div>
      </div>`;
  }

  function finishQuiz() {
    if (!quiz) return;
    clearExamTimer();
    const total = quiz.mode === "exam" ? (quiz.total || EXAM_TOTAL) : quiz.items.length;
    const pct = Math.round((quiz.correct / total) * 100);

    state.sessions++;
    state.best = Math.max(state.best, pct);
    state.history.push({ date: todayISO(), pct });
    if (state.history.length > 60) state.history = state.history.slice(-60);
    const t = todayISO();
    if (state.lastPlayed !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      state.streak = state.lastPlayed === y ? state.streak + 1 : 1;
      state.lastPlayed = t;
    }
    save();

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
      badge.textContent = pass ? "✓ Examen réussi" : "✕ Pas encore réussi";
      if (pass) {
        titleHTML = "Félicitations,<br><i>tu es prêt·e.</i>";
        const rec = pct >= state.best ? " Ton meilleur score à ce jour." : "";
        msg = `${quiz.correct}/${total} bonnes réponses (${pct}%) — au-dessus du seuil requis.${rec}`;
      } else {
        titleHTML = "Continue, tu avances.";
        msg = `Réussite : ${quiz.passLabel || "70 % de bonnes réponses"}. Chaque session compte.`;
      }
      $("resultBilan").innerHTML = pass ? recapTiles(prevPct) : themeBilan();
    } else {
      badge.hidden = true;
      $("resultBilan").innerHTML = "";
      if (pct >= 80) { titleHTML = "Bravo ! 🎉"; msg = "Excellent. Passe en simulation d'examen pour te tester en conditions réelles."; }
      else if (pct >= 60) { titleHTML = "Bien joué 👍"; msg = "Tu progresses. Un tour de révision et ça rentre."; }
      else { titleHTML = "Continue 💪"; msg = "Utilise le mode révision pour apprendre les bonnes réponses."; }
    }
    $("resultTitle").innerHTML = titleHTML;
    $("resultMsg").textContent = msg;

    // Actions : hiérarchie selon le résultat.
    const rv = $("btnReview"), rt = $("btnRetry"), sh = $("btnShare"), hm = $("btnHome");
    hm.hidden = false; hm.style.order = 4;
    if (quiz.mode === "exam" && pass) {
      sh.hidden = false; sh.className = "btn btn-primary big"; sh.textContent = "📲 Partager mon score"; sh.style.order = 1;
      rv.hidden = false; rv.className = "btn btn-outline"; rv.textContent = "Revoir mes réponses"; rv.style.order = 2;
      rt.hidden = true;
    } else if (quiz.mode === "exam") {
      rv.hidden = false; rv.className = "btn btn-primary big"; rv.textContent = `🔎 Revoir mes ${errs} erreur${errs > 1 ? "s" : ""}`; rv.style.order = 1;
      rt.hidden = false; rt.className = "btn btn-outline"; rt.textContent = "Recommencer l'examen"; rt.style.order = 2;
      sh.hidden = true;
    } else {
      rv.hidden = false; rv.className = "btn btn-primary big"; rv.textContent = "🔎 Revoir mes réponses"; rv.style.order = 1;
      const canRetry = quiz.isMistakes && state.mistakes.length;
      rt.hidden = !canRetry; rt.className = "btn btn-outline"; rt.textContent = "Recommencer"; rt.style.order = 2;
      sh.hidden = true;
    }

    // Message de partage (WhatsApp & co.).
    let lieu = "";
    if (cantonOf() === "GE") lieu = " (canton de Genève)";
    else { const commune = VD_DATA.communes[state.commune]; if (commune) lieu = " (commune de " + commune.name + ")"; }
    if (quiz.mode === "exam") {
      lastShareText =
        `NatiCoach — Simulation du test de naturalisation${lieu}\n` +
        `Mon score : ${quiz.correct}/${total} (${pct}%) — ${pass ? "réussi ✅" : "pas encore 💪"}`;
    } else {
      lastShareText =
        `NatiCoach — Entraînement au test de naturalisation${lieu}\n` +
        `Mon score : ${quiz.correct}/${total} (${pct}%). À toi de jouer !`;
    }

    showScreen("screen-result");
  }

  function shareResult() {
    const text = lastShareText || "NatiCoach — je m'entraîne au test de naturalisation suisse !";
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
      case "first":    return { pct: Math.min(100, s * 100), hint: s + " / 1 session" };
      case "marathon": return { pct: Math.min(100, s / 10 * 100), hint: s + " sur 10" };
      case "streak3":  return { pct: Math.min(100, k / 3 * 100), hint: k + " / 3 jours" };
      case "exam":     return { pct: Math.min(100, b / 70 * 100), hint: "meilleur : " + b + "%" };
      case "perfect":  return { pct: Math.min(100, b), hint: "meilleur : " + b + "%" };
      case "cleaner":  return { pct: m ? Math.max(8, 100 - Math.min(90, m * 6)) : 100, hint: m ? "plus que " + m + " à vider" : "prêt à débloquer" };
      default:         return { pct: 0, hint: "" };
    }
  }

  function openBadges() {
    const b = state.badges || {};
    const n = ACHIEVEMENTS.filter((a) => b[a.id]).length;
    const N = ACHIEVEMENTS.length;
    const half = n >= N ? "tous débloqués !" : (n >= N / 2 ? "à mi-chemin !" : "en bonne voie !");
    $("badgeHero").innerHTML =
      `<div class="badge-count"><span>${n}</span><em> / ${N}</em></div>
       <p class="badge-sub">succès débloqués — ${half}</p>
       <div class="badge-segs">` +
        ACHIEVEMENTS.map((a) => `<span class="${b[a.id] ? "on" : ""}"></span>`).join("") +
       `</div>`;
    $("badgeGrid").innerHTML = ACHIEVEMENTS.map((a) => {
      if (b[a.id]) {
        return `<div class="badge-card on">
           <div class="badge-medal">${a.ico}</div>
           <b>${a.title}</b><small>${a.desc}</small>
           <span class="badge-done">✓ Débloqué</span>
         </div>`;
      }
      const p = badgeProgress(a.id);
      return `<div class="badge-card locked">
         <div class="badge-medal">${a.ico}</div>
         <b>${a.title}</b><small>${a.desc}</small>
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
      `<button data-f="errors" class="active">Mes erreurs (${errs})</button>` +
      `<button data-f="all">Toutes (${quiz.items.length})</button>`;
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); reviewMode = b.dataset.f; renderReview();
    }));
    reviewMode = "errors"; renderReview(); showScreen("screen-review"); window.scrollTo(0, 0);
  }

  function renderReview() {
    const items = reviewMode === "errors" ? quiz.items.filter((it) => it.chosen !== it.answer) : quiz.items;
    $("reviewCount").textContent = items.length + (reviewMode === "errors" ? " à revoir" : " au total");
    const box = $("reviewList");
    if (!items.length) { box.innerHTML = `<p class="results-empty">Aucune erreur — parfait ! 🎉</p>`; return; }
    box.innerHTML = items.map((it) => {
      const answered = it.chosen !== undefined && it.chosen !== null;
      const ok = it.chosen === it.answer;
      const opts = it.options.map((o, i) => {
        let cls = "option";
        if (i === it.answer) cls += " correct";
        else if (i === it.chosen) cls += " wrong";
        else cls += " dim";
        const mark = i === it.answer ? "✓" : (i === it.chosen ? "✕" : "");
        return `<div class="${cls}"><span class="mark">${mark}</span><span>${esc(o)}</span></div>`;
      }).join("");
      const exp = (it.ref.explanation && it.ref.explanation.trim())
        ? esc(it.ref.explanation) : "Réponse correcte : " + esc(it.options[it.answer]);
      const ik = it.ref.illustration;
      const ill = (ik && typeof ILLUSTRATIONS !== "undefined" && ILLUSTRATIONS[ik])
        ? `<div class="review-illus">${ILLUSTRATIONS[ik]}</div>` : "";
      return `<div class="review-card">
        <div class="review-head"><span class="chip">${esc(it.ref.scope)} · ${esc(it.ref.theme)}</span>
          <span class="review-flag ${ok ? "ok" : "bad"}">${ok ? "✓" : "✕"}</span></div>
        <h3 class="review-qtext">${esc(it.ref.q)}</h3>
        <div class="options">${opts}</div>
        ${answered ? "" : `<p class="review-noans">Non répondu (temps écoulé)</p>`}
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

  $("btnExam").addEventListener("click", () => { if (isCards()) openStudy(); else startExam(); });
  $("btnStudy").addEventListener("click", openStudy);
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

  /* ---------------- Démarrage ---------------- */
  checkBadges();
  const ready = state.canton === "GE" || state.canton === "NE" || state.canton === "VS"
    || (state.canton === "VD" && state.commune && VD_DATA.communes[state.commune]);
  if (ready) { renderHome(); showScreen("screen-home"); }
  else { openSetup(false); }
})();
