/* service-worker.js v1.0.0
 * Strategy: Cache-first for all local assets. Network fallback -> offline.html.
 *
 * skipWaiting() called ONLY after ALL phases (shell + assets + models) succeed.
 * On failure the SW stays in "waiting" - no home-screen icon appears until
 * the full offline pack is ready. No .catch() on install = intentional.
 *
 * Messages emitted to all clients:
 *   { type: 'CACHE_PROGRESS', phase: 'shell'|'assets'|'models', pct: 0-100 }
 *   { type: 'CACHE_COMPLETE' }
 *   { type: 'CACHE_STATUS', modelsReady, modelsCached, modelsTotal }
 */

"use strict";

const VERSION = "mskana-v1.0.0";
const SHELL_CACHE = VERSION + "-shell";
const ASSET_CACHE = VERSION + "-assets";
const MODEL_CACHE = VERSION + "-models";
const ALL_CACHES = [SHELL_CACHE, ASSET_CACHE, MODEL_CACHE];

const SHELL_URLS = [
  "/","/index.html","/index.html?app=pwa",
  "/scan.html","/scan.html?app=pwa",
  "/camera.html","/camera.html?app=pwa",
  "/results.html","/results.html?app=pwa",
  "/history.html","/history.html?app=pwa",
  "/history-detail.html","/history-detail.html?app=pwa",
  "/guide.html","/guide.html?app=pwa",
  "/about.html","/about.html?app=pwa",
  "/feedback.html","/feedback.html?app=pwa",
  "/support.html","/support.html?app=pwa",
  "/legal/terms.html","/legal/terms.html?app=pwa",
  "/legal/privacy.html","/legal/privacy.html?app=pwa",
  "/offline.html","/manifest.json",
];

const ASSET_URLS = [
  "/assets/fonts/material-icons.css","/assets/fonts/material-icons.woff2","/assets/fonts/material-icons.woff",
  "/assets/css/tokens.css","/assets/css/reset.css","/assets/css/base.css","/assets/css/layout.css",
  "/assets/css/components/header.css","/assets/css/components/nav.css","/assets/css/components/footer.css",
  "/assets/css/components/pwa-nav.css","/assets/css/components/buttons.css","/assets/css/components/cards.css",
  "/assets/css/components/modal.css","/assets/css/components/badge.css","/assets/css/components/forms.css",
  "/assets/css/components/loader.css","/assets/css/pages/home.css","/assets/css/pages/scan.css",
  "/assets/css/pages/results.css","/assets/css/pages/history.css",
  "/assets/js/core/storage.js","/assets/js/core/events.js","/assets/js/core/app.js",
  "/assets/js/modules/language.js","/assets/js/modules/nav.js","/assets/js/modules/modal.js",
  "/assets/js/modules/terms-guard.js","/assets/js/modules/greeting.js","/assets/js/modules/pwa.js",
  "/assets/js/data/verdicts.js","/assets/js/ai/model-loader.js","/assets/js/ai/preprocessor.js",
  "/assets/js/ai/classifier.js","/assets/js/pages/home.js","/assets/js/pages/scan.js",
  "/assets/js/pages/results.js","/assets/js/pages/guide.js","/assets/js/pages/about.js",
  "/assets/js/pages/feedback.js","/assets/js/pages/support.js","/assets/js/pages/history.js",
  "/assets/js/pages/history-detail.js","/tf.min.js",
  "/assets/images/maize.png",
  "/assets/images/icons/android/icon-48x48.png","/assets/images/icons/android/icon-72x72.png",
  "/assets/images/icons/android/icon-96x96.png","/assets/images/icons/android/icon-128x128.png",
  "/assets/images/icons/android/icon-192x192.png",
  "/assets/images/icons/pwa/icon-48x48.png","/assets/images/icons/pwa/icon-72x72.png",
  "/assets/images/icons/pwa/icon-96x96.png","/assets/images/icons/pwa/icon-128x128.png",
  "/assets/images/icons/pwa/icon-144x144.png","/assets/images/icons/pwa/icon-152x152.png",
  "/assets/images/icons/pwa/icon-167x167.png","/assets/images/icons/pwa/icon-180x180.png",
  "/assets/images/icons/pwa/icon-192x192.png","/assets/images/icons/pwa/icon-256x256.png",
  "/assets/images/icons/pwa/icon-384x384.png","/assets/images/icons/pwa/icon-512x512.png",
  "/assets/images/icons/pwa/icon-192x192-maskable.png","/assets/images/icons/pwa/icon-512x512-maskable.png",
  "/assets/images/icons/pwa/apple-touch-120x120.png","/assets/images/icons/pwa/apple-touch-152x152.png",
  "/assets/images/icons/pwa/apple-touch-167x167.png","/assets/images/icons/pwa/apple-touch-180x180.png",
];

const MODEL_URLS = [
  "/models/stage1/model1_tfjs/model.json",
  "/models/stage1/model1_tfjs/metadata.json",
  "/models/stage1/model1_tfjs/group1-shard1of2.bin",
  "/models/stage1/model1_tfjs/group1-shard2of2.bin",
  "/models/stage2/model2_tfjs/model.json",
  "/models/stage2/model2_tfjs/metadata.json",
  "/models/stage2/model2_tfjs/group1-shard1of2.bin",
  "/models/stage2/model2_tfjs/group1-shard2of2.bin",
];

/* -- Broadcast ---------------------------------------------------------------- */
function broadcast(msg) {
  return self.clients.matchAll({ includeUncontrolled: true, type: "window" })
    .then(function(cs) { cs.forEach(function(c) { c.postMessage(msg); }); })
    .catch(function() {});
}

/* -- Cache helpers ------------------------------------------------------------ */
function cacheOne(cache, url) {
  return cache.match(url, { ignoreSearch: true }).then(function(hit) {
    if (hit) return;
    return fetch(new Request(url, { cache: "no-cache" }))
      .then(function(res) { if (res && res.ok) return cache.put(url, res); })
      .catch(function() {});
  });
}

function fillSeq(cacheName, urls, onProgress) {
  return caches.open(cacheName).then(function(cache) {
    return urls.reduce(function(chain, url, idx) {
      return chain.then(function() {
        return cacheOne(cache, url).then(function() {
          if (onProgress) onProgress(idx + 1, urls.length);
        });
      });
    }, Promise.resolve());
  });
}

/* -- Lifecycle ---------------------------------------------------------------- */
self.addEventListener("install", function(event) {
  event.waitUntil(
    fillSeq(SHELL_CACHE, SHELL_URLS, function(done, total) {
      broadcast({ type:"CACHE_PROGRESS", phase:"shell", pct: Math.round(done/total*30) });
    })
    .then(function() {
      return fillSeq(ASSET_CACHE, ASSET_URLS, function(done, total) {
        broadcast({ type:"CACHE_PROGRESS", phase:"assets", pct: 30 + Math.round(done/total*40) });
      });
    })
    .then(function() {
      return fillSeq(MODEL_CACHE, MODEL_URLS, function(done, total) {
        broadcast({ type:"CACHE_PROGRESS", phase:"models", pct: 70 + Math.round(done/total*30) });
      });
    })
    .then(function() {
      broadcast({ type:"CACHE_COMPLETE" });
      return self.skipWaiting();
      /* NO .catch() - if any phase fails, install rejects, SW stays in waiting.
         Browser install prompt stays deferred. App won't be added to home screen
         until everything is successfully cached on retry. */
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(k) { return !ALL_CACHES.includes(k); })
              .map(function(k) { return caches.delete(k); })
        );
      })
      .then(function() { return self.clients.claim(); })
      .then(function() { return broadcast({ type: "CACHE_COMPLETE" }); })
  );
});

/* -- Messaging --------------------------------------------------------------- */
self.addEventListener("message", function(event) {
  if (!event.data) return;

  if (event.data.type === "ENSURE_OFFLINE_PACK") {
    event.waitUntil(
      fillSeq(SHELL_CACHE, SHELL_URLS)
        .then(function() { return fillSeq(ASSET_CACHE, ASSET_URLS); })
        .then(function() { return fillSeq(MODEL_CACHE, MODEL_URLS); })
        .then(function() { return broadcast({ type: "CACHE_COMPLETE" }); })
        .catch(function() {})
    );
  }

  if (event.data.type === "CHECK_CACHE_STATUS") {
    Promise.all(MODEL_URLS.map(function(url) {
      return caches.match(url).then(function(hit) { return !!hit; });
    })).then(function(results) {
      var allCached = results.every(Boolean);
      if (event.source) {
        event.source.postMessage({
          type: "CACHE_STATUS",
          modelsReady: allCached,
          modelsCached: results.filter(Boolean).length,
          modelsTotal: MODEL_URLS.length,
        });
      }
    }).catch(function() {});
  }

  if (event.data.type === "GET_VERSION") {
    if (event.source) event.source.postMessage({ type: "SW_VERSION", version: VERSION });
  }
});

/* -- Fetch routing ----------------------------------------------------------- */
self.addEventListener("fetch", function(event) {
  try {
    var req = event.request;
    var url;
    try { url = new URL(req.url); } catch(_) { return; }
    if (req.method !== "GET") return;
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin !== self.location.origin) return;
    var path = url.pathname;
    if (path.startsWith("/models/"))           { event.respondWith(safe(cacheFirst(url, MODEL_CACHE))); return; }
    if (path.startsWith("/assets/") || path === "/tf.min.js") { event.respondWith(safe(cacheFirst(url, ASSET_CACHE))); return; }
    if (path === "/manifest.json")             { event.respondWith(safe(cacheFirst(url, SHELL_CACHE))); return; }
    if (req.mode === "navigate")               { event.respondWith(safe(navigate(url))); return; }
    event.respondWith(safe(cacheFirst(url, SHELL_CACHE)));
  } catch(_) { try { event.respondWith(fallback()); } catch(__) {} }
});

/* -- Route helpers ----------------------------------------------------------- */
function safe(p) { return Promise.resolve(p).catch(function() { return fallback(); }); }

function cacheFirst(url, cacheName) {
  var path = url.pathname, opts = { ignoreSearch: true };
  var candidates = [path, url.href];
  if (path.startsWith("/") && path.length > 1) candidates.push(path.substring(1));
  else if (!path.startsWith("/")) candidates.push("/"+path);
  return caches.open(cacheName).then(function(cache) {
    function tryCandidate(i) {
      if (i >= candidates.length) {
        return fetch(url.href).then(function(res) {
          if (res && res.ok) cache.put(path, res.clone()).catch(function(){});
          return res || new Response("Not found",{status:404});
        }).catch(function() {
          return new Response("Huduma haipatikani.", {status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}});
        });
      }
      return cache.match(candidates[i], opts).then(function(hit) { return hit || tryCandidate(i+1); });
    }
    return tryCandidate(0);
  }).catch(function() { return fallback(); });
}

function navigate(url) {
  var path = url.pathname, opts = { ignoreSearch: true };
  var candidates = [path];
  if (path === "/" || path === "") candidates.push("/index.html");
  if (path.endsWith("/") && path !== "/") candidates.push(path+"index.html");
  if (!path.endsWith("/") && !path.includes(".") && path !== "/") { candidates.push(path+".html"); candidates.push(path+"/index.html"); }
  if (!path.startsWith("/")) candidates.push("/"+path);
  if (path.startsWith("/") && path.length > 1) candidates.push(path.substring(1));
  candidates.push(url.href);
  candidates = candidates.filter(function(v,i,a){return a.indexOf(v)===i;});
  function tryCandidate(i) {
    if (i >= candidates.length) {
      return fetch(url.href).then(function(res) {
        if (res && res.ok) caches.open(SHELL_CACHE).then(function(c){c.put(path,res.clone()).catch(function(){});}).catch(function(){});
        return res || fallback();
      }).catch(function() { return fallback(); });
    }
    return caches.match(candidates[i], opts).then(function(hit) { return hit || tryCandidate(i+1); });
  }
  return tryCandidate(0).catch(function() { return fallback(); });
}

function fallback() {
  return caches.match("/offline.html",{ignoreSearch:true}).catch(function(){return null;})
    .then(function(f) { return f || caches.match("/index.html",{ignoreSearch:true}).catch(function(){return null;}); })
    .then(function(f) {
      return f || new Response(
        '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-Skana</title><style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4;color:#14532d;padding:24px;text-align:center}h2{font-size:1.4rem;margin:0 0 8px}p{margin:0 0 24px;color:#166534;font-size:.95rem}button{padding:12px 28px;background:#16a34a;color:#fff;border:none;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:600}</style></head><body><h2>\uD83C\uDF3D M-Skana</h2><p>Hakuna mtandao.<br>Tafadhali rudi ukiwa na muunganiko.</p><button onclick="location.reload()">Jaribu Tena</button></body></html>',
        { headers: {"Content-Type":"text/html;charset=utf-8"} }
      );
    }).catch(function() { return new Response("<h2>Offline</h2>",{headers:{"Content-Type":"text/html"}}); });
}
