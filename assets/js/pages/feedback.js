/* feedback.js v1.0.0 - Feedback form with star rating.
 * Saves to localStorage AND sends to francoomichaeldev@gmail.com via FormSubmit.
 * Queues for retry when offline. */
(function () {
  'use strict';

  var FEEDBACK_EMAIL = 'francoomichaeldev@gmail.com';
  var QUEUE_KEY = 'mskana_feedback_queue';
  var selectedRating = 0;

  function getLang() {
    return (window.MskanaStorage && MskanaStorage.getLanguage) ? MskanaStorage.getLanguage() : 'sw';
  }

  function initStarRating() {
    document.querySelectorAll('.star-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedRating = parseInt(btn.getAttribute('data-value'), 10);
        updateStars(selectedRating);
      });
    });
  }

  function updateStars(count) {
    document.querySelectorAll('.star-btn').forEach(function (btn, i) {
      var icon = btn.querySelector('.material-icons');
      icon.textContent = i < count ? 'star' : 'star_border';
      btn.classList.toggle('is-active', i < count);
    });
  }

  // Add to offline queue for retry.
  function addToQueue(entry) {
    try {
      var queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      queue.push(entry);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (_) {}
  }

  // Process queued messages when back online.
  function processQueue() {
    try {
      var queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (!queue.length) return;
      
      var remaining = [];
      queue.forEach(function(entry) {
        var payload = JSON.stringify({
          name   : entry.name || 'Anonymous',
          email  : 'feedback@mskana',
          rating : entry.rating + '/5',
          category: entry.category || 'general',
          message: entry.message,
          lang   : entry.lang,
        });
        fetch('https://formsubmit.co/ajax/' + FEEDBACK_EMAIL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: payload,
        }).catch(function() {
          remaining.push(entry);
        });
      });
      
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch (_) {}
  }

  function handleSubmit() {
    var lang     = getLang();
    var category = document.getElementById('feedback-category').value;
    var message  = (document.getElementById('feedback-message').value || '').trim();
    var name     = (document.getElementById('feedback-name').value || '').trim();

    if (!selectedRating) {
      alert(lang === 'en' ? 'Please select a star rating.' : 'Tafadhali chagua kiwango cha nyota.');
      return;
    }
    if (!message) {
      alert(lang === 'en' ? 'Please write your feedback.' : 'Tafadhali andika maoni yako.');
      return;
    }

    var entry = {
      rating: selectedRating, category: category || 'general',
      message: message, name: name, date: new Date().toISOString(), lang: lang,
    };

    // Save locally regardless of network state.
    try {
      var existing = JSON.parse(localStorage.getItem('mskana_feedback') || '[]');
      existing.push(entry);
      localStorage.setItem('mskana_feedback', JSON.stringify(existing));
    } catch (_) {}

    var btn = document.getElementById('feedback-submit-btn');
    if (btn) btn.disabled = true;

    // Send via FormSubmit — queue for retry if offline.
    var payload = JSON.stringify({
      name   : name || 'Anonymous',
      email  : 'feedback@mskana',
      rating : selectedRating + '/5',
      category: category || 'general',
      message: message,
      lang   : lang,
    });
    fetch('https://formsubmit.co/ajax/' + FEEDBACK_EMAIL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body   : payload,
    }).catch(function () {
      // Offline — queue for retry when back online.
      addToQueue(entry);
    });

    showSuccess();
  }

  function showSuccess() {
    var wrap    = document.getElementById('feedback-form-wrap');
    var success = document.getElementById('feedback-success');
    var header  = document.getElementById('feedback-header');
    if (wrap)    wrap.hidden    = true;
    if (header)  header.hidden  = true;
    if (success) success.hidden = false;
  }

  function init() {
    initStarRating();
    var btn = document.getElementById('feedback-submit-btn');
    if (btn) btn.addEventListener('click', handleSubmit);

    // Process queued messages when back online.
    window.addEventListener('online', processQueue);
    // Try to process queue on page load if online.
    if (navigator.onLine) processQueue();

    document.addEventListener('mskana:languageChanged', function (e) {
      var lang = e.detail.lang;
      var msg  = document.getElementById('feedback-message');
      var name = document.getElementById('feedback-name');
      if (msg)  msg.placeholder  = lang === 'en' ? 'Write your feedback here...' : 'Andika maoni yako hapa...';
      if (name) name.placeholder = lang === 'en' ? 'Your name...' : 'Jina lako...';
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
