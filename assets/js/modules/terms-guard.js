/* terms-guard.js - Enforces terms acceptance on every page, even on direct URL navigation. */

(function () {
  'use strict';

  // Skip pages that don't need the guard (legal docs, offline fallback)
  var EXEMPT_PATHS = ['/legal/terms.html', '/legal/privacy.html', '/offline.html'];
  if (EXEMPT_PATHS.indexOf(window.location.pathname) !== -1) return;

  // Read stored language directly so guard works before MskanaLanguage initialises
  function getLang() {
    try { return localStorage.getItem('mskana_language') === 'en' ? 'en' : 'sw'; } catch (_) { return 'sw'; }
  }

  // Check acceptance via MskanaStorage if available, otherwise read key directly
  function hasAccepted() {
    if (window.MskanaStorage && typeof MskanaStorage.hasAcceptedTerms === 'function') {
      return MskanaStorage.hasAcceptedTerms();
    }
    try { return localStorage.getItem('mskana_terms_accepted') === 'true'; } catch (_) { return false; }
  }

  function storeAccepted() {
    if (window.MskanaStorage && typeof MskanaStorage.acceptTerms === 'function') {
      MskanaStorage.acceptTerms();
    } else {
      try {
        localStorage.setItem('mskana_terms_accepted', 'true');
        localStorage.setItem('mskana_terms_timestamp', Date.now().toString());
      } catch (_) {}
    }
  }

  // Ensure modal.css is loaded (pages other than index/scan may not include it)
  function ensureModalCss() {
    if (document.querySelector('link[href*="modal.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/components/modal.css';
    document.head.appendChild(link);
  }

  // Build and inject the terms modal HTML if it isn't already in the DOM (non-index pages)
  function injectModalIfAbsent() {
    if (document.getElementById('terms-modal')) return; // already present (index.html)

    var lang = getLang();
    var sw = {
      title:    'Karibu M-Skana!',
      subtitle: 'Kabla ya kuendelea, tafadhali soma na kukubaliana na Masharti yetu ya Matumizi na Sera ya Faragha.',
      terms:    'Masharti',
      privacy:  'Faragha',
      accept:   'Ninakubali Masharti',
    };
    var en = {
      title:    'Welcome to M-Skana!',
      subtitle: 'Before continuing, please read and agree to our Terms of Use and Privacy Policy.',
      terms:    'Terms',
      privacy:  'Privacy',
      accept:   'I Accept the Terms',
    };
    var t = lang === 'en' ? en : sw;

    var div = document.createElement('div');
    div.innerHTML =
      '<div class="modal-overlay" id="terms-modal" role="dialog"' +
      '     aria-labelledby="terms-modal-title" aria-describedby="terms-modal-desc"' +
      '     aria-modal="true" hidden>' +
      '  <div class="modal-backdrop" id="terms-modal-backdrop"></div>' +
      '  <div class="modal-container modal--terms" role="document">' +
      '    <div class="modal-body">' +
      '      <div class="modal-icon-wrap" aria-hidden="true">' +
      '        <img src="/assets/images/icons/android/icon-96x96.png" alt="M-Skana Logo"' +
      '             style="width:36px;height:36px;border-radius:8px;" />' +
      '      </div>' +
      '      <h2 class="modal-title" id="terms-modal-title"' +
      '          data-sw="' + sw.title + '" data-en="' + en.title + '">' + t.title + '</h2>' +
      '      <p class="modal-subtitle" id="terms-modal-desc"' +
      '         data-sw="' + sw.subtitle + '" data-en="' + en.subtitle + '">' + t.subtitle + '</p>' +
      '      <div class="modal-legal-links">' +
      '        <a href="/legal/terms.html" target="_blank" rel="noopener noreferrer" class="modal-legal-link">' +
      '          <span class="material-icons" aria-hidden="true">description</span>' +
      '          <span data-sw="' + sw.terms + '" data-en="' + en.terms + '">' + t.terms + '</span>' +
      '        </a>' +
      '        <a href="/legal/privacy.html" target="_blank" rel="noopener noreferrer" class="modal-legal-link">' +
      '          <span class="material-icons" aria-hidden="true">shield</span>' +
      '          <span data-sw="' + sw.privacy + '" data-en="' + en.privacy + '">' + t.privacy + '</span>' +
      '        </a>' +
      '      </div>' +
      '      <button id="accept-terms-btn" class="modal-accept-btn" type="button"' +
      '              data-sw="' + sw.accept + '" data-en="' + en.accept + '">' + t.accept + '</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(div.firstElementChild);
  }

  // Focus trap: keeps keyboard nav inside the modal while it is open
  function trapFocus(container) {
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function handle(e) {
      if (e.key !== 'Tab') return;
      var els = Array.from(container.querySelectorAll(FOCUSABLE));
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) {
        e.preventDefault(); els[els.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
        e.preventDefault(); els[0].focus();
      }
    }
    container.addEventListener('keydown', handle);
    container._guardTrapCleanup = function () { container.removeEventListener('keydown', handle); };
  }

  function showModal() {
    var modal = document.getElementById('terms-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden'; // block scroll while modal is open
    trapFocus(modal);
    // Delay focus so screen readers announce the dialog correctly after paint
    setTimeout(function () {
      var btn = document.getElementById('accept-terms-btn');
      if (btn) btn.focus();
    }, 80);
  }

  function hideModal() {
    var modal = document.getElementById('terms-modal');
    if (!modal) return;
    if (modal._guardTrapCleanup) { modal._guardTrapCleanup(); delete modal._guardTrapCleanup; }
    modal.style.animation = 'modal-exit 220ms ease-in both';
    document.body.style.overflow = '';
    setTimeout(function () {
      modal.hidden = true;
      modal.style.animation = '';
    }, 220);
  }

  function wireAcceptButton() {
    var btn = document.getElementById('accept-terms-btn');
    if (!btn || btn._guardWired) return; // prevent double-wiring with modal.js on index.html
    btn._guardWired = true;
    btn.addEventListener('click', function () {
      storeAccepted();
      hideModal();
      // Notify other modules (language switcher, etc.) that terms are now accepted
      document.dispatchEvent(new CustomEvent('mskana:termsAccepted'));
    });
    // Backdrop click does nothing - user must actively accept (cannot dismiss by accident)
    var backdrop = document.getElementById('terms-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function init() {
    if (hasAccepted()) return; // user already accepted - nothing to do

    ensureModalCss();
    injectModalIfAbsent();
    wireAcceptButton();
    showModal();
  }

  // Run after DOM is ready so injection targets document.body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose minimal API so modal.js can detect guard and skip duplicate logic
  window.MskanaTermsGuard = Object.freeze({ hasAccepted: hasAccepted });
})();
