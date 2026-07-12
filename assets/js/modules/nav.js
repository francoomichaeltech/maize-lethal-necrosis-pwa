/* nav.js - Handles mobile nav state, active links, and smart back buttons. */

const MskanaNav = (function () {
  'use strict';

  let isOpen = false;

  function open() {
    const nav      = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const menuBtn  = document.getElementById('mobile-menu-btn');
    if (!nav) return;
    nav.classList.add('is-open');
    nav.removeAttribute('aria-hidden');
    nav.removeAttribute('inert');
    if (backdrop) backdrop.classList.add('is-visible');
    if (menuBtn)  { menuBtn.classList.add('is-open'); menuBtn.setAttribute('aria-expanded', 'true'); }
    document.body.classList.add('nav-open');
    isOpen = true;
    const firstLink = nav.querySelector('a, button');
    if (firstLink) firstLink.focus();
  }

  function close() {
    const nav      = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const menuBtn  = document.getElementById('mobile-menu-btn');
    if (!nav) return;
    nav.classList.remove('is-open');
    nav.setAttribute('aria-hidden', 'true');
    nav.setAttribute('inert', '');
    if (backdrop) backdrop.classList.remove('is-visible');
    if (menuBtn)  { menuBtn.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); }
    document.body.classList.remove('nav-open');
    isOpen = false;
  }

  function toggle() { isOpen ? close() : open(); }

  function wireNavEvents() {
    const menuBtn  = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-nav-close');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (menuBtn)  menuBtn.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => setTimeout(close, 120));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
  }

  function initScrollHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;width:100%;pointer-events:none;';
    document.body.insertAdjacentElement('afterbegin', sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-scrolled', !entry.isIntersecting);
    }, { rootMargin: '-64px 0px 0px 0px' }).observe(sentinel);
  }

  function markActiveLinks() {
    const rawPath = window.location.pathname;
    const page = rawPath.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-link, .mobile-nav-link, .pwa-nav-item').forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkPage = href.split('/').pop();

      link.classList.remove('nav-link--active', 'mobile-nav-link--active', 'is-active');
      link.removeAttribute('aria-current');

      const isActive =
        linkPage === page ||
        href === rawPath ||
        (page === 'index.html' && (href === '/index.html' || href === 'index.html')) ||
        (page === '' && (href === '/index.html' || href === 'index.html'));

      if (!isActive) return;

      if (link.classList.contains('nav-link'))        link.classList.add('nav-link--active');
      if (link.classList.contains('mobile-nav-link')) link.classList.add('mobile-nav-link--active');
      if (link.classList.contains('pwa-nav-item'))    link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    });
  }

  function initSmartBack() {
    document.querySelectorAll('[data-back-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fallback = btn.getAttribute('data-back-fallback') || 'index.html';
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = fallback;
        }
      });
    });
  }

  function init() { wireNavEvents(); initScrollHeader(); markActiveLinks(); initSmartBack(); }

  return Object.freeze({ init, open, close, toggle });
})();

window.MskanaNav = MskanaNav;

