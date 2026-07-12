/* app.js - App bootstrap entrypoint. */

(function () {
  'use strict';

  /* Disable browser scroll restore to avoid jumpy back/forward transitions. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function init() {
    if (window.MskanaLanguage) MskanaLanguage.init();
    if (window.MskanaNav)      MskanaNav.init();
    if (window.MskanaModal)    MskanaModal.init();
    if (window.MskanaGreeting) MskanaGreeting.init();
    if (window.MskanaPWA)      MskanaPWA.init();
    /* Reveal after module init to avoid staged paint/flicker. */
    document.body.classList.add('ready');
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
