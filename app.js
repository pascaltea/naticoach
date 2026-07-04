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
  const EXAM_TOTAL = 48;          // 16 Suisse + 16 canton + 16 commune
  const EXAM_PER_CELL = 4;        // 4 par (niveau × thème)
  const EXAM_MINUTES = 60;
  const EXAM_PASS_PCT = 70;       // réussite officielle : 70 %

  /* ---------------- Persistance ---------------- */
  const defaultState = () => ({
    history: [], sessions: 0, best: 0, streak: 0, lastPlayed: null,
    commune: null,
    mistakes: [],   // [{q, options, answer, theme, scope}]
    stats: {},      // { "Niveau|Thème": {a, c} }
    badges: {},     // { badgeId: true }
  });
  function load() {
    try { const r = localStorage.getItem(STORE_KEY); return r ? Object.assign(defaultState(), JSON.parse(r)) : defaultState(); }
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

  function openSetup(isChange) {
    $("setupBack").hidden = !isChange;
    $("setupTitle").textContent = isChange ? "Changer de commune" : "Bienvenue";
    $("setupSub").textContent = isChange
      ? "Sélectionne ta nouvelle commune."
      : "Choisis ta commune pour personnaliser ton entraînement.";
    $("communeSearch").value = "";
    renderCommuneResults("");
    showScreen("screen-setup");
    setTimeout(() => $("communeSearch").focus(), 100);
  }

  function renderCommuneResults(q) {
    const box = $("communeResults");
    const nq = norm(q.trim());
    const list = nq ? communeIndex.filter((c) => c.key.includes(nq)) : communeIndex;
    if (!list.length) { box.innerHTML = `<p class="results-empty">Aucune commune trouvée.</p>`; return; }
    box.innerHTML = list.slice(0, 60).map((c) =>
      `<button class="commune-row${c.id === state.commune ? " selected" : ""}" data-id="${c.id}">
         <span><b>${c.name}</b><small>District de ${c.district}</small></span>
         <span class="pin">📍</span>
       </button>`).join("") +
      (list.length > 60 ? `<p class="results-empty">Affine ta recherche (${list.length} résultats)…</p>` : "");
    box.querySelectorAll(".commune-row").forEach((el) =>
      el.addEventListener("click", () => selectCommune(el.dataset.id)));
  }

  function selectCommune(id) {
    state.commune = id; save();
    renderHome(); showScreen("screen-home");
  }

  /* ======================================================================
   *  ACCUEIL
   * ==================================================================== */
  function renderHome() {
    const c = VD_DATA.communes[state.commune];
    $("homeCommune").textContent = c ? c.name : "Choisir…";

    const recent = state.history.slice(-5);
    const readiness = recent.length ? Math.round(recent.reduce((s, h) => s + h.pct, 0) / recent.length) : 0;
    $("readinessPct").textContent = readiness + "%";
    $("statBest").textContent = state.best + "%";
    $("statSessions").textContent = state.sessions;
    $("statStreak").textContent = state.streak;
    setTimeout(() => setRing($("readinessRing"), readiness), 60);

    const mc = state.mistakes.length;
    $("btnMistakes").hidden = mc === 0;
    $("mistakesCount").textContent = mc;

    $("badgeCount").textContent = ACHIEVEMENTS.filter((a) => state.badges && state.badges[a.id]).length;

    renderSparkline();
  }

  function renderSparkline() {
    const svg = $("sparkline"), empty = $("emptyHistory");
    const data = state.history.slice(-12);
    if (data.length < 2) { svg.innerHTML = ""; empty.hidden = false; $("trendLabel").textContent = ""; return; }
    empty.hidden = true;
    const W = 300, H = 90, pad = 8;
    const xs = (i) => pad + (i * (W - pad * 2)) / (data.length - 1);
    const ys = (v) => H - pad - (v / 100) * (H - pad * 2);
    let line = "", area = `M ${xs(0)} ${H - pad} `;
    data.forEach((d, i) => { const cmd = i === 0 ? "M" : "L"; line += `${cmd} ${xs(i).toFixed(1)} ${ys(d.pct).toFixed(1)} `; area += `L ${xs(i).toFixed(1)} ${ys(d.pct).toFixed(1)} `; });
    area += `L ${xs(data.length - 1)} ${H - pad} Z`;
    const last = data[data.length - 1];
    svg.innerHTML = `<path class="area" d="${area}"/><path class="line" d="${line}"/><circle cx="${xs(data.length - 1).toFixed(1)}" cy="${ys(last.pct).toFixed(1)}" r="4"/>`;
    const delta = last.pct - data[0].pct;
    $("trendLabel").textContent = (delta >= 0 ? "▲ +" : "▼ ") + Math.abs(delta) + " pts";
    $("trendLabel").style.color = delta >= 0 ? "var(--ok)" : "var(--bad)";
  }

  /* ======================================================================
   *  RÉVISION (toutes les questions, réponses affichées)
   * ==================================================================== */
  let study = null; // { scope, items, i }
  const STUDY_SCOPES = [
    { key: "all", label: "Tout" },
    { key: "federal", label: "Suisse" },
    { key: "cantonal", label: "Vaud" },
    { key: "commune", label: "Commune" },
  ];

  const STUDY_MODES = [
    { key: "quiz", label: "✍️ Quiz" },
    { key: "reveal", label: "👁️ Découverte" },
  ];

  function openStudy() {
    const seg = $("studyScopes");
    seg.innerHTML = STUDY_SCOPES.map((s, i) =>
      `<button data-scope="${s.key}" class="${i === 0 ? "active" : ""}">${s.label}</button>`).join("");
    seg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => { seg.querySelectorAll("button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); loadStudyScope(b.dataset.scope); }));
    if (!study) study = { interactive: true, items: [], i: 0 }; // Quiz par défaut
    renderStudyMode();
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

  function loadStudyScope(scope) {
    const d = communeDeck(state.commune);
    const src = scope === "all" ? d.federal.concat(d.cantonal, d.commune) : d[scope];
    const interactive = study ? study.interactive : false;
    study = { scope, items: src.map(buildQuestion), i: 0, interactive };
    renderStudy();
  }

  function renderStudy() {
    const cur = study.items[study.i];
    const answered = cur.chosen !== undefined && cur.chosen !== null;
    $("studyChip").textContent = cur.ref.scope + " · " + cur.ref.theme;
    $("studyCount").textContent = (study.i + 1) + "/" + study.items.length;
    $("studyQuestion").textContent = cur.ref.q;

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
        head.textContent = good ? "✅ Bonne réponse" : "❌ À retenir";
        head.className = "explain-head " + (good ? "ok" : "bad");
      } else {
        head.textContent = "💡 Le savais-tu ?";
        head.className = "explain-head ok";
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
        `<span class="legend-item"><span class="legend-dot" style="background:${REGION_COLORS[k]}"></span>${REGION_LABEL[k]}</span>`).join("");
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
    if (!c) { box.innerHTML = EXPLORE_INTRO; return; }
    box.innerHTML =
      `<div class="cd-head"><span class="cd-badge" style="background:${REGION_COLORS[c.region]}">${c.code}</span>
         <div><b>${c.name}</b><small>Canton ${c.code} · ${REGION_LABEL[c.region]}</small></div></div>
       <div class="cd-rows">
         <div><span>Chef-lieu</span><b>${c.capital}</b></div>
         <div><span>Entré dans la Confédération</span><b>${c.year}</b></div>
         <div><span>Langue(s)</span><b>${c.langs}</b></div>
       </div>
       <p class="cd-fact">💡 ${c.fact}</p>`;
  }

  /* ======================================================================
   *  STATISTIQUES
   * ==================================================================== */
  const STAT_THEMES = ["Géographie", "Histoire", "Politique", "Social"];
  const STAT_LEVELS = ["Suisse", "Vaud", "Commune"];

  function statColor(pct) { return pct >= 70 ? "var(--ok)" : (pct >= 40 ? "var(--warning)" : "var(--bad)"); }

  function openStats() {
    const box = $("statsBody");
    let tot = { a: 0, c: 0 };
    Object.values(state.stats).forEach((s) => { tot.a += s.a; tot.c += s.c; });

    if (!tot.a) {
      box.innerHTML = `<p class="stats-empty">Réponds à quelques questions (examen, entraînement ou révision en mode Quiz) pour voir tes statistiques apparaître ici. 📊</p>`;
      showScreen("screen-stats"); return;
    }

    const agg = (filterFn) => {
      let a = 0, c = 0;
      Object.entries(state.stats).forEach(([k, s]) => { if (filterFn(k)) { a += s.a; c += s.c; } });
      return { a, c, pct: a ? Math.round((c / a) * 100) : 0 };
    };
    const row = (label, r) => {
      if (!r.a) return `<div class="stat-row"><div class="stat-head"><b>${label}</b><span>— </span></div><div class="stat-bar"><i style="width:0"></i></div></div>`;
      return `<div class="stat-row">
          <div class="stat-head"><b>${label}</b><span>${r.pct}% · ${r.c}/${r.a}</span></div>
          <div class="stat-bar"><i style="width:${r.pct}%;background:${statColor(r.pct)}"></i></div>
        </div>`;
    };

    const overallPct = Math.round((tot.c / tot.a) * 100);
    box.innerHTML =
      `<div class="stats-card"><div class="stats-overall">
         <div class="big-pct" style="color:${statColor(overallPct)}">${overallPct}%</div>
         <small>${tot.c} bonnes réponses sur ${tot.a}</small>
       </div></div>` +
      `<div class="stats-card"><h3>Par thème</h3>` +
        STAT_THEMES.map((t) => row(t, agg((k) => k.split("|")[1] === t))).join("") + `</div>` +
      `<div class="stats-card"><h3>Par niveau</h3>` +
        STAT_LEVELS.map((l) => row(l === "Suisse" ? "Suisse" : (l === "Vaud" ? "Canton de Vaud" : "Ma commune"),
          agg((k) => k.split("|")[0] === l))).join("") + `</div>` +
      `<button class="btn btn-reset" id="btnResetStats">Réinitialiser mes statistiques et erreurs</button>`;

    $("btnResetStats").addEventListener("click", () => {
      if (confirm("Réinitialiser toutes tes statistiques et ta liste d'erreurs ?")) {
        state.stats = {}; state.mistakes = []; save(); openStats();
      }
    });
    showScreen("screen-stats");
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
  function openTimeline() {
    const box = $("timelineList");
    if (!box.dataset.filled) {
      box.innerHTML = TIMELINE.map((t) =>
        `<div class="tl-item ${t.scope}">
           <div class="tl-dot">${t.icon}</div>
           <div class="tl-body">
             <div class="tl-year">${t.year}</div>
             <h3>${t.title}</h3>
             <p>${t.desc}</p>
           </div>
         </div>`).join("");
      $("timelineLegend").innerHTML =
        `<span class="legend-item"><span class="legend-dot" style="background:var(--red)"></span>Suisse</span>` +
        `<span class="legend-item"><span class="legend-dot" style="background:var(--ok)"></span>Vaud</span>`;
      box.dataset.filled = "1";
    }
    showScreen("screen-timeline");
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
    const pool = buildExam(state.commune);
    quiz = { mode: "exam", items: pool.map(buildQuestion), i: 0, correct: 0, answered: false, endAt: Date.now() + EXAM_MINUTES * 60000 };
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

  function finishQuiz() {
    if (!quiz) return;
    clearExamTimer();
    const total = quiz.mode === "exam" ? EXAM_TOTAL : quiz.items.length;
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

    $("resultFrac").textContent = quiz.correct + "/" + total;
    setTimeout(() => { setRing($("resultRing"), pct); countUp($("resultPct"), pct, 900); }, 120);

    // Gamification : badges, confettis, défi
    const examPass = quiz.mode === "exam" && pct >= EXAM_PASS_PCT;
    if (examPass) unlock("exam");
    if (quiz.mode === "exam" && quiz.correct === EXAM_TOTAL) unlock("perfect");
    const clearedAll = quiz.isMistakes && state.mistakes.length === 0;
    if (clearedAll) unlock("cleaner");
    checkBadges();
    // Confettis uniquement pour une vraie réussite (jamais sur un échec).
    if (examPass || clearedAll) setTimeout(launchConfetti, 250);

    const badge = $("resultBadge");
    let title, msg;
    if (quiz.mode === "exam") {
      const pass = pct >= EXAM_PASS_PCT;
      badge.hidden = false;
      badge.className = "result-badge " + (pass ? "pass" : "fail");
      badge.textContent = pass ? "✓ Réussi" : "✕ Échoué";
      title = pass ? "Examen réussi ! 🎉" : "Pas encore… 💪";
      msg = `Réussite dès ${EXAM_PASS_PCT} % de bonnes réponses (${quiz.correct}/${EXAM_TOTAL}). ` +
        (pass ? "Tu es prêt·e pour le vrai test." : "Continue à réviser les réponses, tu y es presque.");
    } else {
      badge.hidden = true;
      if (pct >= 80) { title = "Bravo ! 🎉"; msg = "Excellent. Passe en simulation d'examen pour te tester en conditions réelles."; }
      else if (pct >= 60) { title = "Bien joué 👍"; msg = "Tu progresses. Un tour de révision et ça rentre."; }
      else { title = "Continue 💪"; msg = "Utilise le mode révision pour apprendre les bonnes réponses."; }
    }
    $("resultTitle").textContent = title;
    $("resultMsg").textContent = msg;
    $("btnReview").hidden = false;

    // Message de partage (WhatsApp & co.) — avec défi famille pour l'examen.
    const commune = VD_DATA.communes[state.commune];
    const lieu = commune ? " (commune de " + commune.name + ")" : "";
    if (quiz.mode === "exam") {
      const pass = pct >= EXAM_PASS_PCT;
      lastShareText =
        `NatiCoach — Simulation du test de naturalisation${lieu}\n` +
        `Mon score : ${quiz.correct}/${EXAM_TOTAL} (${pct}%) — ${pass ? "réussi ✅" : "pas encore 💪"}`;
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
  function openBadges() {
    const b = state.badges || {};
    const n = ACHIEVEMENTS.filter((a) => b[a.id]).length;
    $("badgeProgress").textContent = n + " / " + ACHIEVEMENTS.length + " succès débloqués";
    $("badgeGrid").innerHTML = ACHIEVEMENTS.map((a) =>
      `<div class="badge-card ${b[a.id] ? "on" : "locked"}">
         <div class="badge-ico">${a.ico}</div><b>${a.title}</b><small>${a.desc}</small>
       </div>`).join("");
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
  $("setupBack").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });
  $("btnChangeCommune").addEventListener("click", () => openSetup(true));

  $("btnExam").addEventListener("click", startExam);
  $("btnStudy").addEventListener("click", openStudy);
  $("btnExplore").addEventListener("click", openExplore);
  $("btnQuitExplore").addEventListener("click", () => showScreen("screen-home"));
  $("zoomIn").addEventListener("click", () => zoomMap(0.7));
  $("zoomOut").addEventListener("click", () => zoomMap(1.4));
  $("zoomReset").addEventListener("click", () => { mapView.v = Object.assign({}, mapView.base); applyView(); });
  $("btnTimeline").addEventListener("click", openTimeline);
  $("btnQuitTimeline").addEventListener("click", () => showScreen("screen-home"));
  $("btnMistakes").addEventListener("click", startMistakes);
  $("btnStats").addEventListener("click", openStats);
  $("btnQuitStats").addEventListener("click", () => showScreen("screen-home"));
  $("btnBadges").addEventListener("click", openBadges);
  $("btnQuitBadges").addEventListener("click", () => showScreen("screen-home"));

  $("btnPrev").addEventListener("click", studyPrev);
  $("btnNextStudy").addEventListener("click", studyNext);
  $("btnQuitStudy").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });

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
  if (state.commune && VD_DATA.communes[state.commune]) { renderHome(); showScreen("screen-home"); }
  else { openSetup(false); }
})();
