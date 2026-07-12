/* scan.js v1.0.0 - Scan page: file picker, EXIF-safe image resize, preview overlay, then navigate to results.
 *
 * FIX: Mobile phones embed EXIF rotation metadata in JPEG photos.
 * The old FileReader + new Image() path drew the raw (unrotated) pixels to canvas,
 * so a portrait photo appeared sideways → classifier always returned "not_maize".
 * Solution: createImageBitmap(file, { imageOrientation:'from-image' }) applies the
 * EXIF rotation before pixels hit the canvas.  Falls back to legacy path on older browsers.
 */
(function () {
  'use strict';

  const MAX_SIZE = 1024;
  const QUALITY  = 0.90;

  let pendingImage = null; // Holds the processed base64 image while user confirms

  // Returns true when running as an installed standalone PWA
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  // Appends ?app=pwa to a path when running in installed-PWA mode
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

  function init() {
    const galleryBtn   = document.getElementById('gallery-option');
    const galleryInput = document.getElementById('gallery-file-input');
    const confirmBtn   = document.getElementById('preview-confirm-btn');
    const retakeBtn    = document.getElementById('preview-retake-btn');
    const overlay      = document.getElementById('scan-preview-overlay');

    if (!galleryBtn || !galleryInput) return;

    galleryBtn.addEventListener('click', () => galleryInput.click());
    galleryInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processFile(file);
      galleryInput.value = '';
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!pendingImage) return;
        try {
          MskanaStorage.setScanImage(pendingImage);
          window.location.href = pwaHref('/results.html');
        } catch (err) {
          const lang = MskanaStorage.getLanguage();
          alert(lang === 'en' ? 'Storage error. Please try again.' : 'Hitilafu wakati wa kuhifadhi. Jaribu tena.');
        }
      });
    }

    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        pendingImage = null;
        if (overlay) overlay.classList.remove('is-visible');
        galleryInput.click();
      });
    }
  }

  /**
   * drawBitmapToDataURL - resize a bitmap/image to MAX_SIZE and return a JPEG dataURL.
   * The source must already be EXIF-corrected (upright) before calling this.
   */
  function drawBitmapToDataURL(source) {
    let w = source.width, h = source.height;
    if (Math.max(w, h) > MAX_SIZE) {
      if (w >= h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
      else        { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
    }
    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    cvs.getContext('2d').drawImage(source, 0, 0, w, h);
    return cvs.toDataURL('image/jpeg', QUALITY);
  }

  /**
   * processFile - entry point for gallery file selection.
   *
   * PRIMARY PATH (modern browsers - Android Chrome, iOS Safari >=15):
   *   createImageBitmap(file, { imageOrientation: 'from-image' }) decodes the JPEG
   *   and applies the EXIF rotation flag BEFORE returning the bitmap, so
   *   ctx.drawImage always receives correctly-oriented (upright) pixels.
   *   This fixes the "not_maize" bug on mobile where rotated photos were
   *   passed to the classifier sideways.
   *
   * FALLBACK PATH (very old browsers without createImageBitmap options support):
   *   FileReader -> new Image() - no EXIF correction, last resort only.
   */
  function processFile(file) {
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image', resizeQuality: 'high' })
        .then(function (bitmap) {
          pendingImage = drawBitmapToDataURL(bitmap);
          bitmap.close();
          showPreview(pendingImage);
        })
        .catch(function () {
          // Browser supports createImageBitmap but not the options object - try without options
          createImageBitmap(file)
            .then(function (bitmap) {
              pendingImage = drawBitmapToDataURL(bitmap);
              bitmap.close();
              showPreview(pendingImage);
            })
            .catch(function () {
              legacyProcessFile(file);
            });
        });
    } else {
      legacyProcessFile(file);
    }
  }

  /** Legacy path: FileReader + Image (no EXIF correction - last resort for very old browsers). */
  function legacyProcessFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        pendingImage = drawBitmapToDataURL(img);
        showPreview(pendingImage);
      };
      img.onerror = function () {
        const lang = MskanaStorage.getLanguage();
        alert(lang === 'en' ? 'Could not read image. Please try another.' : 'Picha haikuweza kusomwa. Jaribu nyingine.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showPreview(src) {
    const overlay = document.getElementById('scan-preview-overlay');
    const prevImg = document.getElementById('scan-preview-image');
    if (!overlay || !prevImg) {
      try { MskanaStorage.setScanImage(src); window.location.href = pwaHref('/results.html'); } catch (_) {}
      return;
    }
    prevImg.src = src;
    overlay.classList.add('is-visible');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
