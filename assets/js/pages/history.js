/* history.js — Renders scan history list and filter controls. */
(function () {
  'use strict';

  let activeFilter = 'all';

  const VERDICT_META = {
    healthy:       { icon: 'check_circle',   badge: 'badge--healthy'  },
    mln_infected:  { icon: 'warning',        badge: 'badge--infected' },
    mln_suspected: { icon: 'info',           badge: 'badge--warning'  },
    other_disease: { icon: 'report_problem', badge: 'badge--warning'  },
    uncertain:     { icon: 'help',           badge: 'badge--warning'  },
    not_maize:     { icon: 'block',          badge: 'badge--neutral'  },
  };

  const ALLOWED_HISTORY_VERDICTS = ['healthy', 'mln_infected', 'mln_suspected', 'other_disease'];

  function getVerdictTitle(verdict, lang) {
    if (window.MskanaVerdicts && typeof window.MskanaVerdicts.get === 'function') {
      const data = window.MskanaVerdicts.get(verdict);
      if (data && data.title) return data.title[lang] || data.title.sw || verdict;
    }
    return verdict;
  }

  const FILTERS = ['all', 'healthy', 'mln_infected', 'mln_suspected', 'other_disease'];

  const FILTER_LABELS = {
    sw: {
      all: 'Zote',
      healthy: 'Afya',
      mln_infected: 'MLN',
      mln_suspected: 'MLN Inashukiwa',
      other_disease: 'Ugonjwa Mwingine'
    },
    en: {
      all: 'All',
      healthy: 'Healthy',
      mln_infected: 'MLN',
      mln_suspected: 'Suspected MLN',
      other_disease: 'Other Disease'
    },
  };

  function formatDate(iso) {
    try {
      const lang = MskanaStorage.getLanguage();
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-TZ' : 'sw-TZ', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso));
    } catch (_) {
      return iso ? iso.slice(0, 16).replace('T', ' ') : '';
    }
  }

  /* Show only supported scan verdicts in history. */
  function applyFilter(history) {
    const valid = history.filter(e => ALLOWED_HISTORY_VERDICTS.includes(e.verdict));
    if (activeFilter === 'all') return valid;
    return valid.filter(e => e.verdict === activeFilter);
  }

  function createListItem(entry) {
    const lang  = MskanaStorage.getLanguage();
    const shared = window.MskanaVerdicts && typeof window.MskanaVerdicts.get === 'function'
      ? window.MskanaVerdicts.get(entry.verdict)
      : null;
    const meta  = {
      ...(VERDICT_META[entry.verdict] || VERDICT_META.uncertain),
      icon: (shared && shared.icon) || (VERDICT_META[entry.verdict] || VERDICT_META.uncertain).icon,
    };
    const label = getVerdictTitle(entry.verdict, lang) || entry.label || entry.verdict;
    const li    = document.createElement('li');

    const thumbHtml = entry.imageThumb
      ? `<img src="${entry.imageThumb}" alt="" class="history-thumb" loading="lazy" aria-hidden="true"/>`
      : `<div class="history-thumb" style="background:var(--clr-surface-2);display:flex;align-items:center;justify-content:center;color:var(--clr-text-muted);" aria-hidden="true"><span class="material-icons" style="font-size:20px;">image</span></div>`;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const detailUrl = new URL('/history-detail.html', window.location.origin);
    detailUrl.searchParams.set('id', entry.id);
    /* Preserve app=pwa context so history detail opens inside installed-app navigation mode. */
    if (isStandalone || new URL(window.location.href).searchParams.get('app') === 'pwa') {
      detailUrl.searchParams.set('app', 'pwa');
    }

    li.innerHTML = `
      <a href="${detailUrl.pathname + detailUrl.search}" class="history-item" aria-label="${label} — ${entry.confidence}%">
        ${thumbHtml}
        <div class="history-info">
          <div class="history-verdict">
            <span class="badge ${meta.badge}">
              <span class="material-icons" style="font-size:12px;">${meta.icon}</span> ${label}
            </span>
          </div>
          <div class="history-meta">${formatDate(entry.date)} · ${entry.confidence}%</div>
        </div>
        <span class="material-icons" style="font-size:20px;color:var(--clr-text-muted);flex-shrink:0;margin-left:auto;" aria-hidden="true">chevron_right</span>
      </a>`;

    /* Keep delete action from triggering the detail-link navigation. */
    const del = document.createElement('button');
    del.className = 'history-delete-btn';
    del.type = 'button';
    del.setAttribute('aria-label', lang === 'en' ? 'Delete this scan' : 'Futa ukaguzi huu');
    del.innerHTML = '<span class="material-icons" style="font-size:18px;">delete</span>';
    del.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); deleteEntry(entry.id); });
    li.querySelector('.history-item').appendChild(del);

    return li;
  }

  function renderFilters() {
    const container = document.getElementById('history-filters');
    if (!container) return;
    const labels = (FILTER_LABELS[MskanaStorage.getLanguage()] || FILTER_LABELS.sw);
    container.innerHTML = FILTERS.map(f =>
      `<button class="filter-chip${activeFilter === f ? ' filter-chip--active' : ''}" data-filter="${f}" type="button">${labels[f]}</button>`
    ).join('');
    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => { activeFilter = btn.dataset.filter; renderFilters(); renderList(); });
    });
  }

  function renderList() {
    const allHistory   = MskanaStorage.getHistory();
    const validHistory = allHistory.filter(e => ALLOWED_HISTORY_VERDICTS.includes(e.verdict));
    const history      = applyFilter(allHistory);
    const listEl       = document.getElementById('history-list');
    const emptyEl      = document.getElementById('history-empty');
    const countEl      = document.getElementById('history-count');
    const clearBtn     = document.getElementById('clear-history-btn');
    const lang         = MskanaStorage.getLanguage();

    if (!listEl) return;
    listEl.innerHTML = '';

    if (countEl) countEl.textContent = lang === 'en'
      ? `${validHistory.length} scan${validHistory.length !== 1 ? 's' : ''}`
      : `Ukaguzi ${validHistory.length}`;

    if (clearBtn) clearBtn.hidden = allHistory.length === 0;

    if (history.length === 0) { if (emptyEl) emptyEl.hidden = false; return; }
    if (emptyEl) emptyEl.hidden = true;
    history.forEach(entry => listEl.appendChild(createListItem(entry)));
    // Re-decorate injected anchors so ?app=pwa is applied in standalone mode
    if (window.MskanaPWA && typeof MskanaPWA.decorateLinks === 'function') MskanaPWA.decorateLinks();
  }

  function deleteEntry(id) {
    const lang = MskanaStorage.getLanguage();
    if (!confirm(lang === 'en' ? 'Delete this scan? This cannot be undone.' : 'Futa ukaguzi huu? Haitaweza kurudishwa.')) return;
    MskanaStorage.deleteHistoryEntry(id);
    renderList();
  }

  function clearAll() {
    const lang = MskanaStorage.getLanguage();
    if (!confirm(lang === 'en' ? 'Delete all scan history? This cannot be undone.' : 'Futa historia yote ya ukaguzi? Haitaweza kurudishwa.')) return;
    MskanaStorage.clearHistory();
    renderList();
  }

  function init() {
    renderFilters();
    renderList();
    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
    document.addEventListener('mskana:languageChanged', () => { renderFilters(); renderList(); });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
