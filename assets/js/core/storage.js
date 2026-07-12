/* storage.js - Safe local/session storage wrapper for app state and scan history. */

const MskanaStorage = (function () {
  'use strict';

  const KEYS = {
    LANGUAGE:          'mskana_language',
    TERMS_ACCEPTED:    'mskana_terms_accepted',
    TERMS_TIMESTAMP:   'mskana_terms_timestamp',
    INSTALL_DISMISSED: 'mskana_install_dismissed',
    INSTALL_TIME:      'mskana_install_dismiss_time',
    SCAN_HISTORY:      'mskana_scan_history',
    SCAN_IMAGE:        'mskana_scan_image',
    SCAN_RESULT:       'mskana_scan_result',
  };

  const MAX_HISTORY      = 50;
  const DISMISS_DURATION = 30 * 60 * 1000;    // Re-show install prompt after 30 minutes

  function get(key, storage)   { try { return (storage || localStorage).getItem(key);    } catch (_) { return null;  } }
  function set(key, val, store){ try { (store || localStorage).setItem(key, val); return true; } catch (_) { return false; } }
  function remove(key, store)  { try { (store || localStorage).removeItem(key); return true; } catch (_) { return false; } }

  function getLanguage()       { return get(KEYS.LANGUAGE) || 'sw'; }
  function setLanguage(lang)   { return set(KEYS.LANGUAGE, lang === 'en' ? 'en' : 'sw'); }

  function hasAcceptedTerms()  { return get(KEYS.TERMS_ACCEPTED) === 'true'; }
  function acceptTerms()       { set(KEYS.TERMS_ACCEPTED, 'true'); set(KEYS.TERMS_TIMESTAMP, Date.now().toString()); }

  function isInstallDismissed() {
    if (get(KEYS.INSTALL_DISMISSED) !== 'true') return false;
    return Date.now() - parseInt(get(KEYS.INSTALL_TIME) || '0', 10) < DISMISS_DURATION;
  }
  function dismissInstall()      { set(KEYS.INSTALL_DISMISSED, 'true'); set(KEYS.INSTALL_TIME, Date.now().toString()); }
  function resetInstallDismiss() { remove(KEYS.INSTALL_DISMISSED); remove(KEYS.INSTALL_TIME); }

  /* History is persisted as newest-first JSON array. */
  function getHistory() {
    const raw = get(KEYS.SCAN_HISTORY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (_) { return []; }
  }

  function saveHistory(entries) {
    try { set(KEYS.SCAN_HISTORY, JSON.stringify(entries)); return true; } catch (_) { return false; }
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift({
      id:         entry.id         || Date.now().toString(36),
      date:       entry.date       || new Date().toISOString(),
      imageThumb: entry.imageThumb || null,
      verdict:    entry.verdict    || 'unknown',
      confidence: entry.confidence || 0,
      label:      entry.label      || '',
      labelEn:    entry.labelEn    || '',
    });
    // FIFO cap: keep newest entries at the front and remove oldest from the tail.
    while (history.length > MAX_HISTORY) history.pop();
    return saveHistory(history);
  }

  function deleteHistoryEntry(id) { return saveHistory(getHistory().filter(e => e.id !== id)); }
  function clearHistory()         { return remove(KEYS.SCAN_HISTORY); }

  /* Session keys pass scan payload from camera flow into results page. */
  function getScanImage()          { return get(KEYS.SCAN_IMAGE, sessionStorage); }
  function setScanImage(base64)    { return set(KEYS.SCAN_IMAGE, base64, sessionStorage); }
  function clearScanImage()        { return remove(KEYS.SCAN_IMAGE, sessionStorage); }

  function getScanResult() {
    const raw = get(KEYS.SCAN_RESULT, sessionStorage);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }
  function setScanResult(result)   { return set(KEYS.SCAN_RESULT, JSON.stringify(result), sessionStorage); }
  function clearScanResult()       { return remove(KEYS.SCAN_RESULT, sessionStorage); }

  return Object.freeze({
    KEYS, get, set, remove,
    getLanguage, setLanguage,
    hasAcceptedTerms, acceptTerms,
    isInstallDismissed, dismissInstall, resetInstallDismiss,
    getHistory, addHistoryEntry, deleteHistoryEntry, clearHistory,
    getScanImage, setScanImage, clearScanImage,
    getScanResult, setScanResult, clearScanResult,
  });
})();

window.MskanaStorage = MskanaStorage;
