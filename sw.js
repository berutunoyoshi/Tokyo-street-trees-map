/* オフラインで使うためのサービスワーカー
 * - アプリ本体・樹木データ・ライブラリを端末に保存し、通信がなくても起動できるようにします
 * - 地図タイル（地理院タイル）は「オフライン用の地図を保存」で保存した範囲と、表示したことのある範囲を使います
 * アプリを更新したときは VERSION を変えると、古い保存データが入れ替わります。 */
const VERSION = "2026-10-29-1";
const APP = "app-" + VERSION, DATA = "data-v1", LIB = "lib-v1", TILES = "tiles-saved", AUTO = "tiles-auto";
const APP_FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const DATA_FILES = ["data/trees.json"];
const LIBS = [
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
];
const LIB_HOSTS = ["unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"];
const AUTO_MAX = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const a = await caches.open(APP); await a.addAll(APP_FILES);
    const d = await caches.open(DATA); if (!(await d.match(DATA_FILES[0]))) await d.addAll(DATA_FILES);
    const l = await caches.open(LIB);
    await Promise.allSettled(LIBS.map(async (u) => { if (!(await l.match(u))) { const r = await fetch(u, { mode: "cors" }); if (r.ok) await l.put(u, r); } }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("app-") && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => {
  if (e.data === "status") e.waitUntil((async () => {
    const ok = !!(await caches.match("index.html")) && !!(await caches.match(DATA_FILES[0])) && !!(await caches.match(LIBS[0]));
    e.source && e.source.postMessage({ type: "status", ready: ok, version: VERSION });
  })());
});

async function cacheFirst(req, store) {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (store && res.ok) { const c = await caches.open(store); c.put(req, res.clone()); if (store === AUTO) trimAuto(c); }
  return res;
}
let trimming = false;
async function trimAuto(c) {
  if (trimming) return; trimming = true;
  try { const keys = await c.keys(); if (keys.length > AUTO_MAX) for (const k of keys.slice(0, keys.length - AUTO_MAX + 500)) await c.delete(k); } finally { trimming = false; }
}
async function networkFirst(req, store, ms, fallback) {
  const c = await caches.open(store);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await c.match(req, { ignoreSearch: true })) || (fallback && (await c.match(fallback)));
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req, store) {
  const c = await caches.open(store), hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 地理院タイル：保存済みならそれを使い、なければ取得して自動保存（OSM は利用規約上保存しない）
  if (url.hostname === "cyberjapandata.gsi.go.jp" && url.pathname.startsWith("/xyz/")) { e.respondWith(cacheFirst(req, AUTO)); return; }
  if (LIB_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req, LIB)); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/trees.json")) { e.respondWith(staleWhileRevalidate(req, DATA)); return; }
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, APP, 4000, "index.html")); return; }
  e.respondWith(networkFirst(req, APP, 4000));
});
