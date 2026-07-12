/* modal.js - Terms modal with required acceptance and focus trap. */

const MskanaModal = (function () {
  'use strict';

  let previousFocus = null;

  function show() {
    const modal = document.getElementById('terms-modal');
    if (!modal) return;
    previousFocus = document.activeElement;
    modal.hidden  = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const acceptBtn = document.getElementById('accept-terms-btn');
      if (acceptBtn) acceptBtn.focus();
    });
    trapFocus(modal);
  }

  function hide() {
    const modal = document.getElementById('terms-modal');
    if (!modal) return;
    if (modal._trapCleanup) { modal._trapCleanup(); delete modal._trapCleanup; }
    modal.style.animation = 'modal-exit 220ms ease-in both';
    document.body.style.overflow = '';
    setTimeout(() => {
      modal.hidden = true;
      modal.style.animation = '';
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }, 220);
  }

  function trapFocus(container) {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function handleKey(e) {
      if (e.key !== 'Tab') return;
      const els = Array.from(container.querySelectorAll(FOCUSABLE));
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0])           { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    }
    container.addEventListener('keydown', handleKey);
    container._trapCleanup = () => container.removeEventListener('keydown', handleKey);
  }

  function accept() {
    MskanaStorage.acceptTerms();
    hide();
    document.dispatchEvent(new CustomEvent('mskana:termsAccepted'));
  }

  function init() {
    const acceptBtn = document.getElementById('accept-terms-btn');
    // Skip wiring if terms-guard.js already handled it to prevent double-firing
    if (acceptBtn && !acceptBtn._guardWired) acceptBtn.addEventListener('click', accept);

    const backdrop = document.getElementById('terms-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', (e) => e.stopPropagation());

    // terms-guard.js enforces acceptance on all pages; only show here as fallback
    if (!window.MskanaTermsGuard && !MskanaStorage.hasAcceptedTerms()) setTimeout(show, 300);
  }

  return Object.freeze({ init, show, hide, accept });
})();

window.MskanaModal = MskanaModal;
