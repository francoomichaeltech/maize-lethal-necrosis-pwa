/* pwa.js v1.0.0
 *
 * Install timing — how it works:
 *
 *   Browser shows beforeinstallprompt ONLY after a Service Worker is active.
 *   Our SW calls skipWaiting() ONLY after shell + assets + models are ALL
 *   fully cached. Therefore the browser install prompt appears naturally
 *   and automatically only after everything is cached — no JavaScript
 *   trickery needed, no custom UI, no prompt() calls.
 *
 *   We do NOT intercept beforeinstallprompt at all. The browser handles
 *   the entire install flow with its own native UI.
 *
 * Why the old approach (preventDefault + deferred prompt()) failed on Netlify:
 *   prompt() can only be called inside a user-gesture handler. Calling it
 *   from a SW message event (not a gesture) is silently ignored by browsers
 *   on HTTPS — so the prompt never appeared.
 */

const MskanaPWA = (function () {
  'use strict';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  function isPwaUrl() {
    try { return new URL(window.location.href).searchParams.get('app') === 'pwa'; }
    catch (_) { return false; }
  }
  function isModelRoute() {
    try {
      var p = new URL(window.location.href).pathname;
      return p.endsWith('/scan.html') || p.endsWith('/results.html');
    } catch (_) { return false; }
  }

  async function requestPersistentStorage() {
    if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return;
    try { if (!(await navigator.storage.persisted())) await navigator.storage.persist(); }
    catch (_) {}
  }

  function sendToSW(msg) {
    if (!('serviceWorker' in navigator)) return;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg); return;
    }
    navigator.serviceWorker.ready
      .then(function (reg) { if (reg.active) reg.active.postMessage(msg); })
      .catch(function () {});
  }

  /* After install: make sure offline pack is intact */
  function initInstallEvents() {
    window.addEventListener('appinstalled', function () {
      requestPersistentStorage();
      sendToSW({ type: 'ENSURE_OFFLINE_PACK' });
    });
  }

  /* URL helpers */
  function normalizeHref(href) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || href.startsWith('javascript:') ||
        href.startsWith('http://') || href.startsWith('https://')) return href;
    return href.startsWith('/') ? href : '/' + href;
  }
  function asPwaUrl(href) {
    var url;
    try { url = new URL(href, window.location.origin); } catch (_) { return href; }
    if (url.origin !== window.location.origin) return href;
    if (url.searchParams.get('app') !== 'pwa') url.searchParams.set('app', 'pwa');
    return url.pathname + url.search + url.hash;
  }
  function tagCurrentUrl() {
    if (!isStandalone()) return;
    var c = new URL(window.location.href);
    if (c.searchParams.get('app') === 'pwa') return;
    c.searchParams.set('app', 'pwa');
    window.history.replaceState({}, '', c.pathname + c.search + c.hash);
  }
  function decorateLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('javascript:')) return;
      var normalized = normalizeHref(href);
      if (isStandalone()) normalized = asPwaUrl(normalized);
      a.setAttribute('href', normalized);
    });
  }

  async function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      navigator.serviceWorker.ready.then(function () {
        if (isStandalone() || isPwaUrl()) sendToSW({ type: 'ENSURE_OFFLINE_PACK' });
        if (window.MskanaModelLoader && (isStandalone() || isModelRoute())) {
          MskanaModelLoader.preloadSilently();
        }
      }).catch(function () {});
    } catch (_) {}
  }

  function init() {
    tagCurrentUrl();
    decorateLinks();
    requestPersistentStorage();
    registerSW();
    initInstallEvents();
  }

  return Object.freeze({ init: init, decorateLinks: decorateLinks });
})();

window.MskanaPWA = MskanaPWA;
