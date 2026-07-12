/* classifier.js v1.0.0
 * Two-stage TF.js maize leaf classifier with temperature scaling and confidence gating.
 *
 * Stage 1: maize_leaf vs not_maize
 *   p_maize >= S1_MIN_MAIZE AND gap >= S1_GAP_MIN  → Stage 2
 *   p_maize < 0.50                                  → not_maize
 *   otherwise                                        → uncertain_non_maize
 *
 * Stage 2: healthy / mln_infected / other_disease
 *   top-1 >= S2_MIN_PROB AND gap >= S2_GAP_MIN      → accept class
 *   otherwise                                        → uncertain_disease
 *
 * Calibration: calibrate(logits, T) = softmax(logits / T).
 * Models export raw logits (no softmax on output layer).
 *
 * S2_MIN_PROB is lower than S1 because other_disease is a catch-all class
 * with naturally lower per-image confidence even when the prediction is correct.
 *
 * All verdict text lives in verdicts.js — this file makes decisions only.
 */

'use strict';

const MskanaClassifier = (function () {

  // ── Configurable thresholds (tune with held-out field validation data) ────────
  const CALIBRATION_T = 1.3;
  const S1_MIN_MAIZE  = 0.85;
  const S1_GAP_MIN    = 0.20;
  const S2_MIN_PROB   = 0.70;  // Lower than S1 — other_disease is a catch-all class.
  const S2_GAP_MIN    = 0.15;

  const DEFAULT_S1_CLASSES = ['maize_leaf', 'not_maize'];
  const DEFAULT_S2_CLASSES = ['healthy', 'mln_infected', 'other_disease'];

  // ── Temperature scaling on raw logits ─────────────────────────────────────────
  function calibrate(logits, T) {
    var t      = (T != null) ? T : CALIBRATION_T;
    var scaled = logits.map(function (v) { return v / t; });
    var maxVal = scaled.reduce(function (a, b) { return a > b ? a : b; }, -Infinity);
    var exps   = scaled.map(function (v) { return Math.exp(v - maxVal); });
    var sum    = exps.reduce(function (a, b) { return a + b; }, 0);
    if (sum === 0) { var u = 1 / logits.length; return logits.map(function () { return u; }); }
    return exps.map(function (v) { return v / sum; });
  }

  // ── Model runner — disposes output tensor before returning ────────────────────
  function runModel(model, tensor, T) {
    var output = model.predict(tensor);
    var logits = Array.from(output.dataSync());
    output.dispose();
    return { logits: logits, probs: calibrate(logits, T) };
  }

  // ── TTA: element-wise average of probability arrays ───────────────────────────
  function avgProbs(probSets) {
    if (!probSets || probSets.length === 0) return [];
    var n = probSets[0].length;
    var sums = new Array(n).fill(0);
    probSets.forEach(function (ps) { ps.forEach(function (v, i) { sums[i] += v; }); });
    return sums.map(function (s) { return s / probSets.length; });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function resolveClasses(getterFn, defaults) {
    try {
      if (window.MskanaModelLoader && typeof getterFn === 'function') {
        var cls = getterFn();
        if (Array.isArray(cls) && cls.length === defaults.length) return cls;
      }
    } catch (_) {}
    return defaults;
  }

  function probsToScores(probs, classNames) {
    return classNames.map(function (label, i) {
      return { label: label, score: (probs[i] !== undefined) ? probs[i] : 0 };
    });
  }

  // Verdict text is owned entirely by verdicts.js — no UI copy in this file.
  function getVerdictMeta(verdict) {
    try {
      if (window.MskanaVerdicts && typeof MskanaVerdicts.get === 'function') {
        var meta = MskanaVerdicts.get(verdict);
        if (meta) return meta;
      }
    } catch (_) {}
    return { title: { sw: '', en: '' }, message: { sw: '', en: '' }, recommendation: { sw: '', en: '' } };
  }

  // ── Stage 1 decision ──────────────────────────────────────────────────────────
  function stage1Decision(probs) {
    var pMaize = probs[0] || 0, pNotMaize = probs[1] || 0, gap = pMaize - pNotMaize;
    console.debug('[Classifier] S1 — maize:', pMaize.toFixed(4), ' not_maize:', pNotMaize.toFixed(4), ' gap:', gap.toFixed(4));
    if (pMaize >= S1_MIN_MAIZE && gap >= S1_GAP_MIN) return { verdict: null, confidence: null };
    if (pMaize < 0.50) return { verdict: 'not_maize', confidence: pNotMaize };
    return { verdict: 'uncertain_non_maize', confidence: null };
  }

  // ── Stage 2 decision ──────────────────────────────────────────────────────────
  function stage2Decision(probs, classNames) {
    var indexed = probs.map(function (p, i) { return { p: p, i: i }; });
    indexed.sort(function (a, b) { return b.p - a.p; });
    var top1 = indexed[0], top2 = indexed[1] || { p: 0 };
    var pmax = top1.p, gap = pmax - top2.p, cls = classNames[top1.i] || 'uncertain_disease';
    console.debug('[Classifier] S2 — top1:', cls, pmax.toFixed(4), ' gap:', gap.toFixed(4));
    if (pmax >= S2_MIN_PROB && gap >= S2_GAP_MIN) return { verdict: cls, confidence: pmax };
    return { verdict: 'uncertain_disease', confidence: null };
  }

  // ── Result builder ────────────────────────────────────────────────────────────
  function buildResult(verdict, confidenceRaw, s1Probs, s1Classes, s2Probs, s2Classes) {
    var isUncertain = (verdict === 'uncertain_non_maize' || verdict === 'uncertain_disease');
    var confidence = null;
    if (!isUncertain && confidenceRaw !== null && confidenceRaw !== undefined) {
      confidence = Math.min(100, Math.round(confidenceRaw * 100));
    }
    var meta = getVerdictMeta(verdict);
    return {
      verdict        : verdict,
      confidence     : confidence,
      stage1Scores   : probsToScores(s1Probs, s1Classes),
      stage2Scores   : s2Probs ? probsToScores(s2Probs, s2Classes) : null,
      timestamp      : new Date().toISOString(),
      labels         : Object.assign({}, meta.title),
      message        : Object.assign({}, meta.message),
      recommendations: Object.assign({}, meta.recommendation),
    };
  }

  // ── Main classify ─────────────────────────────────────────────────────────────
  async function classify(base64Image, onProgress) {
    if (!MskanaModelLoader.isLoaded()) await MskanaModelLoader.load(onProgress);
    onProgress && onProgress(92, 'Inachakata picha...');

    var s1Classes = resolveClasses(MskanaModelLoader.getStage1Classes, DEFAULT_S1_CLASSES);
    var s2Classes = resolveClasses(MskanaModelLoader.getStage2Classes, DEFAULT_S2_CLASSES);

    var prepResult;
    if (typeof MskanaPreprocessor.preprocessVariants === 'function') {
      prepResult = await MskanaPreprocessor.preprocessVariants(base64Image);
    } else {
      prepResult = { tensors: [await MskanaPreprocessor.preprocess(base64Image)], quality: null };
    }
    var tensors = Array.isArray(prepResult) ? prepResult : prepResult.tensors;

    try {
      onProgress && onProgress(94, 'Inachanganua: Hatua 1 ya 2...');
      var s1Probs = avgProbs(tensors.map(function (t) { return runModel(MskanaModelLoader.getStage1(), t, CALIBRATION_T).probs; }));
      var s1 = stage1Decision(s1Probs);
      if (s1.verdict !== null) {
        onProgress && onProgress(100, 'Imekamilika!');
        return buildResult(s1.verdict, s1.confidence, s1Probs, s1Classes, null, null);
      }

      onProgress && onProgress(97, 'Inachanganua: Hatua 2 ya 2...');
      var s2Probs = avgProbs(tensors.map(function (t) { return runModel(MskanaModelLoader.getStage2(), t, CALIBRATION_T).probs; }));
      var s2 = stage2Decision(s2Probs, s2Classes);
      onProgress && onProgress(100, 'Imekamilika!');
      return buildResult(s2.verdict, s2.confidence, s1Probs, s1Classes, s2Probs, s2Classes);

    } finally {
      tensors.forEach(function (t) { try { t.dispose(); } catch (_) {} });
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  return Object.freeze({
    classify, calibrate, CALIBRATION_T,
    S1_MIN_MAIZE, S1_GAP_MIN, S2_MIN_PROB, S2_GAP_MIN,
    STAGE1_CLASSES: DEFAULT_S1_CLASSES,
    STAGE2_CLASSES: DEFAULT_S2_CLASSES,
  });

})();

window.MskanaClassifier = MskanaClassifier;
