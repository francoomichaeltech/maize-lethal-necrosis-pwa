/* model-loader.js v1.0.0 - Loads and warms TF.js models with backend fallback. */

const MskanaModelLoader = (function () {
  'use strict';

  const STAGE1_URL = '/models/stage1/model1_tfjs/model.json';
  const STAGE2_URL = '/models/stage2/model2_tfjs/model.json';
  const STAGE1_META_URL = '/models/stage1/model1_tfjs/metadata.json';
  const STAGE2_META_URL = '/models/stage2/model2_tfjs/metadata.json';

  // All model files that must be cached for a reliable offline load
  const ALL_MODEL_URLS = [
    STAGE1_URL,
    STAGE1_META_URL,
    '/models/stage1/model1_tfjs/group1-shard1of2.bin',
    '/models/stage1/model1_tfjs/group1-shard2of2.bin',
    STAGE2_URL,
    STAGE2_META_URL,
    '/models/stage2/model2_tfjs/group1-shard1of2.bin',
    '/models/stage2/model2_tfjs/group1-shard2of2.bin',
  ];

  // 30 s gives enough headroom for slow devices loading from SW cache
  const LOAD_TIMEOUT_MS = 30000;

  let _stage1      = null;
  let _stage2      = null;
  let _stage1Classes = ['maize_leaf', 'not_maize'];
  let _stage2Classes = ['healthy', 'mln_infected', 'other_disease'];
  let _loadPromise = null;
  let _loaded      = false;

  function classesFromMeta(meta, fallback) {
    if (!meta || !meta.classes || typeof meta.classes !== 'object') return fallback;
    const entries = Object.entries(meta.classes)
      .filter(function (entry) { return Number.isInteger(entry[1]); })
      .sort(function (a, b) { return a[1] - b[1]; });
    return entries.length ? entries.map(function (entry) { return entry[0]; }) : fallback;
  }

  async function loadMetaClasses(metaUrl, fallback) {
    try {
      const res = await fetch(metaUrl, { cache: 'force-cache' });
      if (!res.ok) return fallback;
      const meta = await res.json();
      return classesFromMeta(meta, fallback);
    } catch (_) {
      return fallback;
    }
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error(label + ' timed out after ' + ms + 'ms'));
      }, ms);
      promise.then(function (v) { clearTimeout(timer); resolve(v); },
                   function (e) { clearTimeout(timer); reject(e); });
    });
  }

  async function ensureBackend() {
    if (typeof tf === 'undefined') throw new Error('TensorFlow.js not loaded');

    // ── Precision guard (CRITICAL for mobile / PWA correctness) ──────────────
    // Mobile WebGL defaults to mediump (16-bit) floats, which produces
    // different logit values than desktop highp (32-bit), causing maize images
    // to be misclassified as "not_maize" on all mobile browsers and PWA.
    // Forcing float32 makes inference identical across all platforms.
    try { tf.env().set('WEBGL_FORCE_F16_TEXTURES', false); } catch (_) {}
    // Disable texture packing — it can silently introduce rounding errors on
    // mobile GPUs that do not fully support packed float32 ops.
    try { tf.env().set('WEBGL_PACK', false); } catch (_) {}
    // Do not let TF.js automatically down-cast weights to float16.
    try { tf.env().set('WEBGL_DOWNLOAD_FLOAT_ENABLED', true); } catch (_) {}

    const candidates = ['webgl', 'wasm', 'cpu'];
    for (let i = 0; i < candidates.length; i += 1) {
      const backend = candidates[i];
      try {
        const ok = await tf.setBackend(backend);
        if (!ok) continue;
        await tf.ready();

        // After activating WebGL, verify the device truly supports float32
        // rendering.  If it only supports float16, skip to WASM which
        // always uses full float32 and is therefore precision-safe.
        if (backend === 'webgl') {
          var f32ok = false;
          try { f32ok = !!tf.env().get('WEBGL_RENDER_FLOAT32_ENABLED'); } catch (_) {}
          if (!f32ok) {
            console.warn('[ModelLoader] WebGL float32 not available — falling back to WASM for precision-safe inference');
            continue;
          }
        }

        console.info('[ModelLoader] Backend ready:', backend);
        return;
      } catch (_) {}
    }
    throw new Error('No supported TensorFlow.js backend available');
  }

  async function load(onProgress) {
    if (_loaded) { onProgress && onProgress(100, 'Iko tayari!'); return; }
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
      await ensureBackend();

      const classLoad = Promise.all([
        loadMetaClasses(STAGE1_META_URL, _stage1Classes),
        loadMetaClasses(STAGE2_META_URL, _stage2Classes),
      ]).then(function (classes) {
        _stage1Classes = classes[0];
        _stage2Classes = classes[1];
        console.info('[ModelLoader] Stage1 classes:', _stage1Classes.join(', '));
        console.info('[ModelLoader] Stage2 classes:', _stage2Classes.join(', '));
      });

      onProgress && onProgress(5, 'Inaandaa mfumo...');
      // Try force-cache so SW cache is preferred; fall back to normal fetch
      _stage1 = await withTimeout(
        tf.loadGraphModel(STAGE1_URL, { requestInit: { cache: 'force-cache' } }),
        LOAD_TIMEOUT_MS, 'Stage1'
      ).catch(async () => {
        return withTimeout(tf.loadGraphModel(STAGE1_URL), LOAD_TIMEOUT_MS, 'Stage1-retry');
      });
      // Warmup compiles GPU kernels so the first real prediction is not penalized by setup cost
      try { tf.tidy(() => { _stage1.predict(tf.zeros([1, 224, 224, 3])); }); } catch (_) {}

      onProgress && onProgress(55, 'Inapakua modeli ya pili...');
      _stage2 = await withTimeout(
        tf.loadGraphModel(STAGE2_URL, { requestInit: { cache: 'force-cache' } }),
        LOAD_TIMEOUT_MS, 'Stage2'
      ).catch(async () => {
        return withTimeout(tf.loadGraphModel(STAGE2_URL), LOAD_TIMEOUT_MS, 'Stage2-retry');
      });
      // Warm stage 2 for the same kernel-compile reason
      try { tf.tidy(() => { _stage2.predict(tf.zeros([1, 224, 224, 3])); }); } catch (_) {}

      await classLoad;

      _loaded = true;
      onProgress && onProgress(100, 'Iko tayari!');
    })();

    _loadPromise = _loadPromise.catch(function (e) {
      _loadPromise = null;
      throw e;
    });

    return _loadPromise;
  }

  function preloadSilently() {
    if (_loaded || _loadPromise) return;
    load(null).catch(function (e) {
      console.warn('[ModelLoader] Background preload failed:', e.message);
      _loadPromise = null;
    });
  }

  async function probeManifest(url) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) return true;
      if (head.status !== 405 && head.status !== 501) return false;
    } catch (_) {}
    try {
      const get = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (get.body && typeof get.body.cancel === 'function') get.body.cancel().catch(() => {});
      return get.ok;
    } catch (_) {
      return false;
    }
  }

  // Check ALL model files (manifests + .bin shards) so partial cache never misleads isAvailable()
  async function hasCachedModels() {
    if (typeof caches === 'undefined') return false;
    try {
      const matches = await Promise.all(
        ALL_MODEL_URLS.map(function (url) { return caches.match(url); })
      );
      return matches.every(function (entry) { return !!entry; });
    } catch (_) {
      return false;
    }
  }

  async function isAvailable() {
    if (_loaded) return true;
    if (await hasCachedModels()) return true;
    const [r1, r2] = await Promise.all([probeManifest(STAGE1_URL), probeManifest(STAGE2_URL)]);
    return r1 && r2;
  }

  return Object.freeze({
    load,
    preloadSilently,
    isAvailable,
    isLoaded:  () => _loaded,
    getStage1Classes: () => _stage1Classes.slice(),
    getStage2Classes: () => _stage2Classes.slice(),
    getStage1: () => { if (!_stage1) throw new Error('Stage 1 not loaded'); return _stage1; },
    getStage2: () => { if (!_stage2) throw new Error('Stage 2 not loaded'); return _stage2; },
    reset: () => {
      try { _stage1 && _stage1.dispose(); } catch (_) {}
      try { _stage2 && _stage2.dispose(); } catch (_) {}
      _stage1 = null; _stage2 = null; _loadPromise = null; _loaded = false;
      _stage1Classes = ['maize_leaf', 'not_maize'];
      _stage2Classes = ['healthy', 'mln_infected', 'other_disease'];
    },
  });
})();

window.MskanaModelLoader = MskanaModelLoader;
