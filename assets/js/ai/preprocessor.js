/* preprocessor.js - Converts a base64 image to a TF.js tensor [1, 224, 224, 3].
   MobileNetV2 requires pixel values normalised to [-1, 1] via (pixel / 127.5) - 1.
   The caller is responsible for disposing the returned tensor after use. */

const MskanaPreprocessor = (function () {
  'use strict';

  const IMG_SIZE = 224;
  const HARD_MIN_INPUT_DIMENSION = 224;
  const RECOMMENDED_INPUT_DIMENSION = 512;
  const MIN_SHARPNESS_SCORE = 6;

  function evaluateImageQuality(img) {
    const sharpness = estimateSharpness(img);
    const isSmall = img.naturalWidth < RECOMMENDED_INPUT_DIMENSION || img.naturalHeight < RECOMMENDED_INPUT_DIMENSION;
    const isLowSharpness = sharpness < MIN_SHARPNESS_SCORE;
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      sharpness,
      isSmall,
      isLowSharpness,
      isLowQuality: isSmall || isLowSharpness,
    };
  }

  function estimateSharpness(img) {
    const sample = 96;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = sample;
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sample, sample);

    const data = ctx.getImageData(0, 0, sample, sample).data;
    let edgeSum = 0;
    let count = 0;

    for (let y = 0; y < sample - 1; y += 1) {
      for (let x = 0; x < sample - 1; x += 1) {
        const i = (y * sample + x) * 4;
        const j = (y * sample + (x + 1)) * 4;
        const k = ((y + 1) * sample + x) * 4;

        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const lumX = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        const lumY = 0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2];

        edgeSum += Math.abs(lum - lumX) + Math.abs(lum - lumY);
        count += 2;
      }
    }

    return count ? edgeSum / count : 0;
  }

  function validateInputImage(img) {
    if (img.naturalWidth < HARD_MIN_INPUT_DIMENSION || img.naturalHeight < HARD_MIN_INPUT_DIMENSION) {
      throw new Error(
        'Image too small (' + img.naturalWidth + 'x' + img.naturalHeight + '). Use at least 224x224 pixels.'
      );
    }

    if (img.naturalWidth < RECOMMENDED_INPUT_DIMENSION || img.naturalHeight < RECOMMENDED_INPUT_DIMENSION) {
      console.warn(
        '[Preprocessor] Small image may reduce accuracy:',
        img.naturalWidth + 'x' + img.naturalHeight,
        '(recommended >= 512x512)'
      );
    }

    const sharpness = estimateSharpness(img);
    if (sharpness < MIN_SHARPNESS_SCORE) {
      console.warn('[Preprocessor] Low sharpness detected:', sharpness.toFixed(2));
    }
  }

  // ctx2d - returns a 2D context with consistent color handling across all platforms.
  // colorSpace:'srgb' ensures identical pixel values on all browsers / OS / GPU.
  // willReadFrequently:'true' tells the browser the pixels will be read back by
  // tf.browser.fromPixels, avoiding GPU→CPU round-trip surprises on mobile.
  function ctx2d(canvas) {
    return canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  }

  function toInputTensor(canvas) {
    // Validate tensor shape before inference to catch any preprocessing errors.
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(canvas, 3)
        .toFloat()
        .div(tf.scalar(127.5))
        .sub(tf.scalar(1.0))
        .expandDims(0);
      // Shape must always be [1, 224, 224, 3]; log a warning if not.
      const shape = tensor.shape;
      if (shape[1] !== IMG_SIZE || shape[2] !== IMG_SIZE || shape[3] !== 3) {
        console.warn('[Preprocessor] Unexpected tensor shape:', shape);
      }
      return tensor;
    });
  }

  function drawSquareCrop(img, opts) {
    const cropRatio = opts && typeof opts.cropRatio === 'number' ? opts.cropRatio : 1.0;
    const shiftX = opts && typeof opts.shiftX === 'number' ? opts.shiftX : 0;
    const shiftY = opts && typeof opts.shiftY === 'number' ? opts.shiftY : 0;
    const flipX = !!(opts && opts.flipX);

    const side = Math.max(1, Math.floor(Math.min(img.naturalWidth, img.naturalHeight) * cropRatio));
    const maxX = Math.max(0, img.naturalWidth - side);
    const maxY = Math.max(0, img.naturalHeight - side);

    let sx = Math.floor((img.naturalWidth - side) / 2 + shiftX * maxX);
    let sy = Math.floor((img.naturalHeight - side) / 2 + shiftY * maxY);
    sx = Math.max(0, Math.min(maxX, sx));
    sy = Math.max(0, Math.min(maxY, sy));

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = IMG_SIZE;
    // Use ctx2d() to enforce sRGB color space — prevents mobile GPU color
    // space differences from producing different pixel values than desktop.
    const ctx = ctx2d(canvas);
    if (flipX) {
      ctx.save();
      ctx.translate(IMG_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, IMG_SIZE, IMG_SIZE);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, side, side, 0, 0, IMG_SIZE, IMG_SIZE);
    }
    return canvas;
  }

  function drawSquareContain(img) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = IMG_SIZE;
    const ctx = ctx2d(canvas);

    const scale = Math.min(IMG_SIZE / img.naturalWidth, IMG_SIZE / img.naturalHeight);
    const dw = Math.max(1, Math.round(img.naturalWidth * scale));
    const dh = Math.max(1, Math.round(img.naturalHeight * scale));
    const dx = Math.round((IMG_SIZE - dw) / 2);
    const dy = Math.round((IMG_SIZE - dh) / 2);

    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
    return canvas;
  }

  function loadImage(base64String) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.onload = () => resolve(img);
      img.src = base64String;
    });
  }

  async function preprocessVariants(base64String) {
    const img = await loadImage(base64String);
    validateInputImage(img);
    const quality = evaluateImageQuality(img);

    const views = [
      { cropRatio: 1.0, shiftX: 0, shiftY: 0, flipX: false },
      { cropRatio: 0.92, shiftX: -0.25, shiftY: 0, flipX: false },
      { cropRatio: 0.92, shiftX: 0.25, shiftY: 0, flipX: false },
      { cropRatio: 0.92, shiftX: 0, shiftY: -0.25, flipX: false },
      { cropRatio: 0.92, shiftX: 0, shiftY: 0.25, flipX: false },
      { cropRatio: 0.84, shiftX: 0, shiftY: 0, flipX: false },
      { cropRatio: 1.0, shiftX: 0, shiftY: 0, flipX: true },
    ];

    const tensors = views.map((view) => {
      const canvas = drawSquareCrop(img, view);
      return toInputTensor(canvas);
    });

    tensors.push(toInputTensor(drawSquareContain(img)));

    return { tensors, quality };
  }

  function preprocess(base64String) {
    return new Promise((resolve, reject) => {
      preprocessVariants(base64String)
        .then(function (result) {
          const tensors = result && result.tensors ? result.tensors : [];
          resolve(tensors[0]);
          for (let i = 1; i < tensors.length; i += 1) tensors[i].dispose();
        })
        .catch(function (e) {
          reject(new Error('Tensor creation failed: ' + e.message));
        });
    });
  }

  return Object.freeze({
    IMG_SIZE,
    HARD_MIN_INPUT_DIMENSION,
    RECOMMENDED_INPUT_DIMENSION,
    MIN_SHARPNESS_SCORE,
    preprocess,
    preprocessVariants,
    validateInputImage,
    estimateSharpness,
    evaluateImageQuality,
  });
})();

window.MskanaPreprocessor = MskanaPreprocessor;
