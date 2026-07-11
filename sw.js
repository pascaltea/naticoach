/* Service worker — mises à jour fiables (réseau d'abord pour le code), cache pour l'offline. */
const CACHE = "swisscitoyen-v99";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js","./i18n.js","./questions_i18n.js",
  "./questions.js",
  "./illustrations.js",
  "./explanations.js",
  "./commune_explanations.js",
  "./commune_rules.js",
  "./cantons.js",
  "./swissmap.js",
  "./timeline.js",
  "./districts.js",
  "./vd_official.js",
  "./ge_official.js",
  "./ne_official.js",
  "./vs_official.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./logo-app-icon.svg",
  "./logo-edelweiss-flower.svg",
  "./logo-edelweiss-red.svg",
  "./fonts/archivo.woff2",
  "./fonts/lora.woff2",
  "./fonts/lora-italic.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Gros fichiers de données → cache d'abord (évite de retélécharger ~2 Mo à chaque fois).
const BIG_DATA = /(vd_official|swissmap)\.js$/;

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isShell = e.request.mode === "navigate" || /\.(css|js|html|webmanifest)$/.test(url.pathname);

  if (isShell && !BIG_DATA.test(url.pathname)) {
    // Réseau d'abord : toujours la dernière version en ligne, cache en secours (offline).
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then((h) => h || caches.match("./index.html")))
    );
  } else {
    // Cache d'abord pour le reste (grosses données, images).
    e.respondWith(
      caches.match(e.request).then((hit) =>
        hit || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match("./index.html"))
      )
    );
  }
});
