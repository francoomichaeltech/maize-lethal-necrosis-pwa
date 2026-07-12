/* results.js — Runs scan result flow and renders verdict UI. */

(function () {
  "use strict";

  const FALLBACK_VERDICT = {
    icon: "help",
    cardMod: "verdict-card--uncertain",
    barMod: "confidence-bar-fill--uncertain",
    title: { sw: "Matokeo", en: "Result" },
    message: {
      sw: "Matokeo hayakupatikana.",
      en: "Result data is unavailable.",
    },
    tips: {
      sw: ["Jaribu tena"],
      en: ["Please try again"],
    },
    disclaimer: {
      sw: "Matokeo haya ni msaada wa awali tu.",
      en: "This result is only an early assistive indication.",
    },
  };

  const VERDICT_DATA =
    (window.MskanaVerdicts && window.MskanaVerdicts.DATA) || {
      uncertain: FALLBACK_VERDICT,
    };

  const HISTORY_ALLOWED_VERDICTS = new Set([
    "healthy",
    "mln_infected",
    "mln_suspected",
    "other_disease",
  ]);

  function getVerdictData(verdict) {
    return VERDICT_DATA[verdict] || VERDICT_DATA.uncertain || FALLBACK_VERDICT;
  }

  let _val = 0;
  let _hard = 0;
  let _rafId = null;
  let _last = null;

  function initProgress() {
    _val = 0;
    _hard = 0;
    _last = null;
    updateProgressBar(0);
    const lang = getLang();
    setStageLabel(lang === "en" ? "Analysing…" : "Inachanganua…");
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(_tick);
  }

  function _tick(now) {
    if (!_last) _last = now;
    const dt = Math.min(now - _last, 80);
    _last = now;

    /* Smooth progress: can drift 3% above hard target, but never pass 97 before completion. */
    const ceiling = _hard >= 100 ? 100 : Math.min(_hard + 3, 97);

    if (_val < ceiling) {
      const gap = ceiling - _val;
      const speed = gap > 15 ? 45 : gap > 5 ? 18 : 4;
      _val = Math.min(ceiling, _val + speed * (dt / 1000));
      updateProgressBar(Math.floor(_val));
    }

    if (_val < 100) _rafId = requestAnimationFrame(_tick);
  }

  function onProgress(pct) {
    _hard = Math.max(_hard, pct);
    if (!_rafId) {
      _last = null;
      _rafId = requestAnimationFrame(_tick);
    }
  }

  function updateProgressBar(pct) {
    const v = Math.min(100, Math.max(0, Math.round(pct)));
    const bar = document.getElementById("proc-bar-fill");
    const ctr = document.getElementById("proc-pct");
    if (bar) bar.style.width = `${v}%`;
    if (ctr) ctr.textContent = `${v}%`;
  }

  function setStageLabel(text) {
    const el = document.getElementById("proc-stage");
    if (el && text) el.textContent = text;
  }

  function stopProgress() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    _last = null;
  }

  function getLang() {
    return window.MskanaStorage ? MskanaStorage.getLanguage() : "sw";
  }

  function showProcessing() {
    document.body.classList.remove("page-loading");
    const overlay = document.getElementById("processing-overlay");
    const content = document.getElementById("results-content");
    const error = document.getElementById("results-error");
    if (overlay) {
      overlay.classList.remove("is-hiding");
      overlay.classList.add("is-visible");
    }
    if (content) content.hidden = true;
    if (error) error.hidden = true;
  }

  function showResults() {
    stopProgress();
    updateProgressBar(100);
    const overlay = document.getElementById("processing-overlay");
    const content = document.getElementById("results-content");
    if (content) content.hidden = false;
    if (overlay) {
      setTimeout(function () {
        overlay.classList.add("is-hiding");
        setTimeout(function () {
          overlay.classList.remove("is-visible", "is-hiding");
        }, 320);
      }, 150);
    }
  }

  function showError(titleSw, titleEn, bodySw, bodyEn) {
    stopProgress();
    const overlay = document.getElementById("processing-overlay");
    const content = document.getElementById("results-content");
    const error = document.getElementById("results-error");
    if (overlay) {
      overlay.classList.remove("is-visible");
    }
    if (content) content.hidden = true;
    if (error) error.hidden = false;
    const lang = getLang();
    const t = document.getElementById("error-title");
    const b = document.getElementById("error-body");
    if (t) t.textContent = lang === "en" ? titleEn : titleSw;
    if (b) b.textContent = lang === "en" ? bodyEn : bodySw;
  }

  function renderResult(result, imageBase64) {
    const lang = getLang();
    const data = getVerdictData(result.verdict);

    const imgEl = document.getElementById("result-image");
    if (imgEl && imageBase64) imgEl.src = imageBase64;

    const cardEl = document.getElementById("verdict-card");
    if (cardEl) {
      Object.values(VERDICT_DATA).forEach((d) =>
        cardEl.classList.remove(d.cardMod),
      );
      if (data.cardMod) cardEl.classList.add(data.cardMod);
    }

    const iconEl = document.getElementById("verdict-icon");
    if (iconEl) iconEl.textContent = data.icon;

    const titleEl = document.getElementById("verdict-title");
    if (titleEl) {
      titleEl.textContent =
        (result.labels && result.labels[lang]) ||
        data.title[lang] ||
        data.title.sw;
    }

    /* Verdicts that show the confidence bar — ONLY definitive Stage 2 results */
    const SHOW_CONFIDENCE = new Set(["healthy", "mln_infected", "other_disease"]);
    const showConf = SHOW_CONFIDENCE.has(result.verdict) && result.confidence != null;

    const confSection = document.getElementById("confidence-section");
    if (confSection) confSection.style.display = showConf ? "" : "none";

    if (showConf) {
      const confValEl = document.getElementById("confidence-value");
      if (confValEl) confValEl.textContent = `${result.confidence}%`;

      const barEl = document.getElementById("confidence-bar");
      if (barEl) {
        Object.values(VERDICT_DATA).forEach((d) => {
          if (d.barMod) barEl.classList.remove(d.barMod);
        });
        if (data.barMod) barEl.classList.add(data.barMod);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            barEl.style.width = `${result.confidence}%`;
          }),
        );
      }
    }

    const msgEl = document.getElementById("verdict-message");
    if (msgEl) msgEl.textContent = data.message[lang] || data.message.sw;

    const tipsEl = document.getElementById("recommendation-tips");
    if (tipsEl) {
      const items = data.tips[lang] || data.tips.sw;
      tipsEl.innerHTML = items
        .map((tip) => `<li class="recommendation-tip">${tip}</li>`)
        .join("");
    }

    const disclaimerEl = document.getElementById("result-disclaimer");
    if (disclaimerEl) {
      const text = data.disclaimer[lang] || data.disclaimer.sw;
      const textEl = disclaimerEl.querySelector(".disclaimer-text");
      if (textEl) textEl.textContent = text;
      disclaimerEl.hidden = false;
    }

    if (result.isDemo) injectDemoBanner();
    showResults();
  }

  function injectDemoBanner() {
    if (document.getElementById("demo-banner")) return;
    const lang = getLang();
    const msg =
      lang === "en"
        ? "Demo mode — AI models are still downloading. Please connect to the internet, wait for the download to complete, then try again for real results."
        : "Hali ya mfano — Mifano ya AI bado inapakuwa. Tafadhali unganisha intaneti, subiri upakuzi ukamilike, kisha jaribu tena kupata matokeo halisi.";
    const banner = document.createElement("div");
    banner.id = "demo-banner";
    banner.style.cssText =
      "background:var(--clr-amber-50);border:1.5px solid var(--clr-amber-200);border-radius:var(--radius-xl);padding:var(--sp-3) var(--sp-4);display:flex;align-items:flex-start;gap:var(--sp-2);margin-bottom:var(--sp-5);font-size:var(--text-sm);color:var(--clr-amber-700);line-height:1.5;";
    banner.innerHTML = `<span class="material-icons" style="font-size:18px;flex-shrink:0;margin-top:1px;">info</span><span>${msg}</span>`;
    const container = document.querySelector(".container--narrow");
    if (container) container.insertBefore(banner, container.firstElementChild);
  }

  function saveToHistory(result, imageBase64) {
    if (!imageBase64 || !window.MskanaStorage) return;
    if (!result || !HISTORY_ALLOWED_VERDICTS.has(result.verdict)) return;
    try {
      const img = new Image();
      img.onload = () => {
        /* Store a bounded thumbnail to keep history responsive and localStorage usage predictable. */
        const maxPx = 640;
        let w = img.width,
          h = img.height;
        if (Math.max(w, h) > maxPx) {
          if (w >= h) {
            h = Math.round((h * maxPx) / w);
            w = maxPx;
          } else {
            w = Math.round((w * maxPx) / h);
            h = maxPx;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        MskanaStorage.addHistoryEntry({
          id: Date.now().toString(36),
          date: result.timestamp || new Date().toISOString(),
          imageThumb: canvas.toDataURL("image/jpeg", 0.88),
          verdict: result.verdict,
          confidence: result.confidence,
          label: result.labels ? result.labels.sw : result.verdict,
          labelEn: result.labels ? result.labels.en : result.verdict,
        });
      };
      img.src = imageBase64;
    } catch (err) {
      console.warn("[results] History save failed:", err);
    }
  }

  async function areModelsPresent() {
    if (window.MskanaModelLoader && typeof MskanaModelLoader.isAvailable === "function") {
      try {
        return !!(await MskanaModelLoader.isAvailable());
      } catch (_) {
      }
    }

    if (!("caches" in window)) return false;
    try {
      const [c1, c2] = await Promise.all([
        caches.match("/models/stage1/model1_tfjs/model.json"),
        caches.match("/models/stage2/model2_tfjs/model.json"),
      ]);
      return !!(c1 && c2);
    } catch (_) {
      return false;
    }
  }

  function buildDemoResult() {
    return {
      verdict: "healthy",
      confidence: 89,
      isDemo: true,
      timestamp: new Date().toISOString(),
      labels: {
        sw: "Jani lenye Afya Nzuri (Mfano)",
        en: "Healthy Maize Leaf (Demo)",
      },
    };
  }

  async function init() {
    showProcessing();
    initProgress();

    const imageBase64 = window.MskanaStorage
      ? MskanaStorage.getScanImage()
      : null;
    if (!imageBase64) {
      // No pending scan image — go back to scan, preserving ?app=pwa in standalone mode
      var _isPwa = window.matchMedia('(display-mode:standalone)').matches ||
                   navigator.standalone === true ||
                   new URL(window.location.href).searchParams.get('app') === 'pwa';
      window.location.href = _isPwa ? '/scan.html?app=pwa' : '/scan.html';
      return;
    }

    const modelsExist = await areModelsPresent();

    if (!modelsExist) {
      /* Demo mode keeps the page usable when model files are unavailable on first run. */
      for (const pct of [10, 30, 60, 85, 100]) {
        await new Promise((r) => setTimeout(r, 300));
        onProgress(pct);
      }
      const demo = buildDemoResult();
      if (window.MskanaStorage) {
        MskanaStorage.setScanResult(demo);
        saveToHistory(demo, imageBase64);
        MskanaStorage.clearScanImage();
      }
      await new Promise((r) => setTimeout(r, 400));
      renderResult(demo, imageBase64);
      return;
    }

    try {
      const result = await MskanaClassifier.classify(imageBase64, onProgress);
      if (window.MskanaStorage) {
        MskanaStorage.setScanResult(result);
        saveToHistory(result, imageBase64);
        MskanaStorage.clearScanImage();
      }
      await new Promise((r) => setTimeout(r, 400));
      renderResult(result, imageBase64);
    } catch (err) {
      console.error("[results] Classification error:", err.message);
      if (window.MskanaStorage) MskanaStorage.clearScanImage();
      if (window.MskanaModelLoader && MskanaModelLoader.reset)
        MskanaModelLoader.reset();
      showError(
        "Hitilafu ya Uchambuzi",
        "Analysis Error",
        `Hitilafu: ${err.message}. Tafadhali jaribu tena.`,
        `Error: ${err.message}. Please try again.`,
      );
    }
  }

  document.addEventListener("mskana:languageChanged", () => {
    const result = window.MskanaStorage ? MskanaStorage.getScanResult() : null;
    if (!result) return;

    const lang = getLang();
    const data = getVerdictData(result.verdict);

    const titleEl = document.getElementById("verdict-title");
    if (titleEl) {
      titleEl.textContent =
        (result.labels && result.labels[lang]) ||
        data.title[lang] ||
        data.title.sw;
    }

    const msgEl = document.getElementById("verdict-message");
    if (msgEl) msgEl.textContent = data.message[lang] || data.message.sw;

    const tipsEl = document.getElementById("recommendation-tips");
    if (tipsEl) {
      tipsEl.innerHTML = (data.tips[lang] || data.tips.sw)
        .map((tip) => `<li class="recommendation-tip">${tip}</li>`)
        .join("");
    }

    const disclaimerEl = document.getElementById("result-disclaimer");
    if (disclaimerEl) {
      const textEl = disclaimerEl.querySelector(".disclaimer-text");
      if (textEl)
        textEl.textContent = data.disclaimer[lang] || data.disclaimer.sw;
    }

    const banner = document.getElementById("demo-banner");
    if (banner) {
      banner.remove();
      if (result.isDemo) injectDemoBanner();
    }
  });

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
