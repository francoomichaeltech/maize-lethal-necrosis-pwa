/* history-detail.js - Displays the full details of a single scan record from history. */
(function () {
  "use strict";

  const FALLBACK_VERDICT = {
    icon: "help",
    cardMod: "verdict-card--uncertain",
    barMod: "confidence-bar-fill--uncertain",
    title: { sw: "Matokeo", en: "Result" },
    recommendation: {
      sw: "Rekodi hii haina maelezo ya kutosha.",
      en: "This record does not contain enough details.",
    },
  };

  function getVerdictData(verdict) {
    if (window.MskanaVerdicts && typeof window.MskanaVerdicts.get === "function") {
      return window.MskanaVerdicts.get(verdict);
    }
    return FALLBACK_VERDICT;
  }

  // Returns true when running as an installed standalone PWA
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           navigator.standalone === true ||
           new URL(window.location.href).searchParams.get('app') === 'pwa';
  }

  // Appends ?app=pwa to a path when inside installed-PWA context
  function pwaHref(path) {
    if (!isStandalone()) return path;
    try {
      var url = new URL(path, window.location.origin);
      url.searchParams.set('app', 'pwa');
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return path;
    }
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const lang = MskanaStorage.getLanguage();
      return new Intl.DateTimeFormat(lang === "en" ? "en-TZ" : "sw-TZ", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        hour12: true,
      }).format(new Date(iso));
    } catch (_) {
      return iso.replace("T", " ").slice(0, 16);
    }
  }

  function renderEntry(entry) {
    const lang = MskanaStorage.getLanguage();
    const verdictData = getVerdictData(entry.verdict);

    const imgWrap = document.getElementById("detail-image-wrap");
    const imgEl   = document.getElementById("detail-image");
    if (imgEl && entry.imageThumb) {
      imgEl.src = entry.imageThumb;
      imgEl.hidden = false;
      if (imgWrap) imgWrap.hidden = false;
    } else if (imgWrap) {
      imgWrap.hidden = true;
    }

    const card = document.getElementById("detail-verdict-card");
    if (card) {
      const allMods = window.MskanaVerdicts && window.MskanaVerdicts.DATA
        ? Object.values(window.MskanaVerdicts.DATA).map((v) => v.cardMod)
        : [FALLBACK_VERDICT.cardMod];
      allMods.forEach((c) => c && card.classList.remove(c));
      if (verdictData.cardMod) card.classList.add(verdictData.cardMod);
    }

    const icon = document.getElementById("detail-icon");
    if (icon) icon.textContent = verdictData.icon || "help";

    const title = document.getElementById("detail-title");
    if (title)
      title.textContent =
        (verdictData.title && (verdictData.title[lang] || verdictData.title.sw)) ||
        entry.label || entry.verdict;

    const confVal = document.getElementById("detail-conf-value");
    if (confVal) confVal.textContent = `${entry.confidence}%`;

    const bar = document.getElementById("detail-conf-bar");
    if (bar) {
      const allBarMods = window.MskanaVerdicts && window.MskanaVerdicts.DATA
        ? Object.values(window.MskanaVerdicts.DATA).map((v) => v.barMod).filter(Boolean)
        : [FALLBACK_VERDICT.barMod];
      allBarMods.forEach((c) => bar.classList.remove(c));
      if (verdictData.barMod) bar.classList.add(verdictData.barMod);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => { bar.style.width = `${entry.confidence}%`; })
      );
    }

    const recEl = document.getElementById("detail-rec");
    if (recEl)
      recEl.textContent =
        (verdictData.recommendation &&
          (verdictData.recommendation[lang] || verdictData.recommendation.sw)) || "";

    const dateEl = document.getElementById("detail-date");
    if (dateEl)
      dateEl.textContent = formatDate(entry.date);

    const delBtn = document.getElementById("detail-delete-btn");
    if (delBtn) {
      delBtn.onclick = () => {
        const msg = lang === "en"
          ? "Delete this scan record? This cannot be undone."
          : "Futa rekodi hii ya ukaguzi? Haitaweza kurudishwa.";
        if (!confirm(msg)) return;
        MskanaStorage.deleteHistoryEntry(entry.id);
        // Preserve ?app=pwa so back navigation stays inside installed-app context
        window.location.href = pwaHref("/history.html");
      };
    }

    document.getElementById("detail-content").hidden = false;
    document.title = `${(verdictData.title && (verdictData.title[lang] || verdictData.title.sw)) || entry.verdict} \u00B7 M-Skana`;
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) { document.getElementById("not-found").hidden = false; return; }
    const entry = MskanaStorage.getHistory().find((e) => e.id === id);
    if (!entry) { document.getElementById("not-found").hidden = false; return; }
    renderEntry(entry);
    document.addEventListener("mskana:languageChanged", () => renderEntry(entry));
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
