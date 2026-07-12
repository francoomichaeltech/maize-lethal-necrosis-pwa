/* language.js - Applies and persists Swahili/English UI translations. */

const MskanaLanguage = (function () {
  'use strict';

  const DEFAULT_LANG = 'sw';
  let currentLang = DEFAULT_LANG;

  function applyTranslations(lang) {
    document.querySelectorAll('[data-sw]').forEach(el => {
      const text = el.getAttribute(`data-${lang}`);
      if (text !== null) el.textContent = text;
    });
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-lang]').forEach(btn => {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('lang-option--active', isActive);
      btn.classList.toggle('mobile-lang-option--active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      const check = btn.querySelector('.check-icon');
      if (check) check.classList.toggle('check-icon--hidden', !isActive);
    });

    const labelEl = document.getElementById('current-lang-label');
    if (labelEl) labelEl.textContent = lang.toUpperCase();
  }

  function switchLanguage(lang) {
    if (lang !== 'sw' && lang !== 'en') return;
    if (lang === currentLang) return;
    currentLang = lang;
    MskanaStorage.setLanguage(lang);
    applyTranslations(lang);
    document.dispatchEvent(new CustomEvent('mskana:languageChanged', { detail: { lang } }));
    closeLangDropdown();
  }

  function closeLangDropdown() {
    const dropdown = document.getElementById('lang-dropdown');
    const btn      = document.getElementById('lang-selector-btn');
    if (!dropdown || !btn) return;
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function toggleLangDropdown() {
    const dropdown = document.getElementById('lang-dropdown');
    const btn      = document.getElementById('lang-selector-btn');
    if (!dropdown || !btn) return;
    if (dropdown.hidden) {
      dropdown.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    } else {
      closeLangDropdown();
    }
  }

  function wireLanguageButtons() {
    const selectorBtn = document.getElementById('lang-selector-btn');
    if (selectorBtn) selectorBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLangDropdown(); });

    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => switchLanguage(btn.getAttribute('data-lang')));
    });

    document.addEventListener('click', (e) => {
      const selector = document.getElementById('lang-selector');
      if (selector && !selector.contains(e.target)) closeLangDropdown();
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLangDropdown(); });
  }

  function init() {
    currentLang = MskanaStorage.getLanguage();
    applyTranslations(currentLang);
    wireLanguageButtons();
  }

  return Object.freeze({
    init,
    get current() { return currentLang; },
    switch: switchLanguage,
    apply:  applyTranslations,
  });
})();

window.MskanaLanguage = MskanaLanguage;
