/* home.js - Home page animations: hero fade-in and stat counter pop effect. */

(function () {
  'use strict';

  function animateHeroOnLoad() {
    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;
    heroContent.style.cssText = 'opacity:0;transform:translateY(24px);transition:opacity 600ms ease,transform 600ms ease;';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }));
  }

  function animateStatsOnScroll() {
    const stats = document.querySelectorAll('.stat-number');
    if (!stats.length || !('IntersectionObserver' in window)) return;

    if (!document.getElementById('stat-pop-style')) {
      const style = document.createElement('style');
      style.id = 'stat-pop-style';
      style.textContent = '@keyframes stat-pop{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}';
      document.head.appendChild(style);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.animation = 'none';
        entry.target.offsetHeight; // force reflow
        entry.target.style.animation = 'stat-pop 500ms cubic-bezier(0.34,1.56,0.64,1) both';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    stats.forEach(s => observer.observe(s));
  }

  function init() { animateHeroOnLoad(); animateStatsOnScroll(); }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
