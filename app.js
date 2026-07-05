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
    const mk = (q) => ({ q: q.q, a: q.a, theme: q.theme, scope: q.level === "Suisse" ? "Suisse" : cLabel });
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
      $("examTitle").textContent = "Réviser les fiches";
      $("examSub").textContent = `${n} questions officielles · réponse à l'appui`;
      $("homeFooter").textContent = `Questions officielles Suisse & Canton de ${CANTON_NAME[cn]} · hors-ligne`;
      return;
    }

    const cfg = EXAM_CFG[cn];
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
      $("studyScopeLabel").textContent = "Fiches · " + (sc ? sc.label : "Tout");
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

  /* Rendu d'une fiche (Neuchâtel / Valais) : question → réponse officielle révélée. */
  function renderStudyCard() {
    const cur = study.items[study.i];
    const parsed = splitChoices(cur.q);
    $("studyChip").textContent = cur.scope + " · " + cur.theme;
    $("studyCount").textContent = (study.i + 1) + "/" + study.items.length;
    $("studyQuestion").textContent = parsed.text;
    $("studyProgressFill").style.width = ((study.i + 1) / study.items.length) * 100 + "%";
    const box = $("studyOptions"); box.innerHTML = "";
    if (parsed.choices) {
      const ul = document.createElement("ul");
      ul.className = "card-choices";
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
      $("studyIllus").innerHTML = "";
    }
    $("btnPrev").disabled = study.i === 0;
    $("btnNextStudy").textContent = study.i + 1 < study.items.length ? "Suivant ›" : "Terminé ✓";
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
  const TL_KEY_YEARS = { "1291": 1, "1803": 1, "1848": 1, "1971": 1 };
  let timelineFilter = "all";

  function eraOf(yearStr) {
    let y;
    if (/av\.?\s*J/i.test(yearStr)) y = -(parseInt((yearStr.match(/\d+/) || [100])[0], 10));
    else { const m = yearStr.match(/\d{3,4}/); y = m ? parseInt(m[0], 10) : 0; }
    if (y < 500) return "Antiquité";
    if (y < 1500) return "Moyen Âge";
    if (y < 1798) return "Époque moderne";
    return "Époque contemporaine";
  }

  function renderTimeline() {
    const items = TIMELINE.filter((t) => timelineFilter === "all" || t.scope === timelineFilter);
    let html = "", currentEra = null, open = false;
    items.forEach((t) => {
      const era = eraOf(t.year);
      if (era !== currentEra) {
        if (open) html += `</div>`;
        html += `<div class="tl-era"><span></span>${era}<span></span></div><div class="tl-rail">`;
        currentEra = era; open = true;
      }
      const isVd = t.scope === "vd";
      const key = TL_KEY_YEARS[t.year];
      const tag = isVd ? ` <em>VAUD</em>` : "";
      html += `<div class="tl-node ${t.scope}">
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

  const TL_FILTERS = [
    { key: "all", label: "Tout" },
    { key: "ch", label: "Suisse", dot: "var(--red)" },
    { key: "vd", label: "Vaud", dot: "var(--ok)" },
  ];

  function openTimeline() {
    const bar = $("timelineFilter");
    bar.innerHTML = TL_FILTERS.map((f) => {
      const n = f.key === "all" ? TIMELINE.length : TIMELINE.filter((t) => t.scope === f.key).length;
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

  function openDistricts() {
    const m = districtMap();
    if (!m) return;
    const svg = $("vsMapSvg");
    $("vsMapTitle").textContent = `Les ${m.districts.length} districts ${cantonOf() === "VS" ? "du Valais" : "vaudois"}`;
    $("vsMapNote").innerHTML = cantonOf() === "VS"
      ? "Les <b>13 étoiles</b> du drapeau valaisan représentent ces <b>13 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes)."
      : "Le canton de Vaud compte <b>10 districts</b>. Fond de carte : limites officielles swisstopo (données ouvertes).";

    // (Re)construire la carte si le canton a changé.
    if (svg.dataset.canton !== cantonOf()) {
      svg.setAttribute("viewBox", m.viewBox);
      svg.innerHTML =
        m.districts.map((d) => `<path class="vsd-path" data-id="${d.id}" d="${d.d}" fill="${d.color}" fill-rule="evenodd"/>`).join("") +
        m.districts.map((d) => `<text class="vsd-label" data-id="${d.id}" x="${d.cx}" y="${d.cy}" text-anchor="middle">${d.name}</text>`).join("");
      svg.querySelectorAll(".vsd-path").forEach((p) => p.addEventListener("click", () => {
        const on = !p.classList.contains("sel");
        svg.querySelectorAll(".vsd-path").forEach((x) => x.classList.remove("sel"));
        document.querySelectorAll(".vsd-chip").forEach((x) => x.classList.remove("on"));
        if (on) {
          p.classList.add("sel"); svg.appendChild(p);
          const lbl = svg.querySelector(`.vsd-label[data-id="${p.dataset.id}"]`);
          if (lbl) svg.appendChild(lbl);
          const chip = document.querySelector(`.vsd-chip[data-id="${p.dataset.id}"]`);
          if (chip) chip.classList.add("on");
        }
      }));
      svg.dataset.canton = cantonOf();
    }

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
    showScreen("screen-vsmap");
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
