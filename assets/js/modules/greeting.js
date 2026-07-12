/* greeting.js - Displays a time-based greeting banner on the home page. */

const MskanaGreeting = (function () {
  'use strict';

  const GREETINGS = [
    { from:  5, to: 12, sw: 'Habari za asubuhi, mkulima!',  en: 'Good morning, farmer!',   emoji: '🌅' },
    { from: 12, to: 15, sw: 'Habari za mchana, mkulima!',   en: 'Good midday, farmer!',    emoji: '☀️' },
    { from: 15, to: 16, sw: 'Habari za alasiri, mkulima!',  en: 'Good afternoon, farmer!', emoji: '🌿' },
    { from: 16, to: 20, sw: 'Habari za jioni, mkulima!',    en: 'Good evening, farmer!',   emoji: '🌾' },
    { from: 20, to:  5, sw: 'Habari za usiku, mkulima!',    en: 'Good night, farmer!',     emoji: '🌙' },
  ];

  function getGreeting(lang) {
    const hour  = new Date().getHours();
    const entry = GREETINGS.find(g => g.from > g.to ? hour >= g.from || hour < g.to : hour >= g.from && hour < g.to) || GREETINGS[0];
    return `${entry.emoji} ${lang === 'en' ? entry.en : entry.sw}`;
  }

  function render(lang) {
    const banner = document.getElementById('greeting-banner');
    const textEl = document.getElementById('greeting-text');
    if (!banner || !textEl) return;
    textEl.textContent = getGreeting(lang || (window.MskanaLanguage && MskanaLanguage.current) || 'sw');
    banner.hidden = false;
  }

  function init() {
    if (!document.getElementById('greeting-banner')) return;
    render(MskanaStorage.getLanguage());
    document.addEventListener('mskana:languageChanged', (e) => render(e.detail.lang));
  }

  return Object.freeze({ init, getGreeting, render });
})();

window.MskanaGreeting = MskanaGreeting;
