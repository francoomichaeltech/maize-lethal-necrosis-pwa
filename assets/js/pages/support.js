/* support.js v1.0.0 - Support form: sends to francoomichaeldev@gmail.com via FormSubmit.
 * Saves locally when offline and queues for retry when back online. */
(function () {
  "use strict";

  var SUPPORT_EMAIL = "francoomichaeldev@gmail.com";
  var QUEUE_KEY = "mskana_support_queue";

  function getLang() {
    return window.MskanaStorage && MskanaStorage.getLanguage
      ? MskanaStorage.getLanguage()
      : "sw";
  }

  function showError(msg) {
    alert(msg);
  }

  // Save support message locally (for history and offline queue).
  function saveLocal(entry) {
    try {
      var existing = JSON.parse(localStorage.getItem("mskana_support") || "[]");
      existing.push(entry);
      localStorage.setItem("mskana_support", JSON.stringify(existing));
    } catch (_) {}
  }

  // Add to offline queue for retry.
  function addToQueue(entry) {
    try {
      var queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      queue.push(entry);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (_) {}
  }

  // Process queued messages when back online.
  function processQueue() {
    try {
      var queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      if (!queue.length) return;

      var remaining = [];
      queue.forEach(function (entry) {
        var payload = JSON.stringify({
          name: entry.name,
          email: entry.email,
          message: entry.message,
        });
        fetch("https://formsubmit.co/ajax/" + SUPPORT_EMAIL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: payload,
        }).catch(function () {
          remaining.push(entry);
        });
      });

      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch (_) {}
  }

  function handleSubmit() {
    var lang = getLang();
    var name = (document.getElementById("support-name").value || "").trim();
    var email = (document.getElementById("support-email").value || "").trim();
    var message = (
      document.getElementById("support-message").value || ""
    ).trim();

    // All fields required.
    if (!name) {
      showError(
        lang === "en"
          ? "Please enter your full name."
          : "Tafadhali weka jina lako kamili.",
      );
      return;
    }
    var emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRx.test(email)) {
      showError(
        lang === "en"
          ? "Please enter a valid email address."
          : "Tafadhali weka anwani sahihi ya barua pepe.",
      );
      return;
    }
    if (!message) {
      showError(
        lang === "en"
          ? "Please write your message."
          : "Tafadhali andika ujumbe wako.",
      );
      return;
    }

    var btn = document.getElementById("support-submit-btn");
    if (btn) {
      btn.disabled = true;
    }

    var entry = {
      name: name,
      email: email,
      message: message,
      date: new Date().toISOString(),
      lang: lang,
      sent: false,
    };

    // Always save locally first.
    saveLocal(entry);

    // Send via FormSubmit AJAX endpoint — works without a backend.
    var payload = JSON.stringify({
      name: name,
      email: email,
      message: message,
    });
    fetch("https://formsubmit.co/ajax/" + SUPPORT_EMAIL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload,
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.success === "true") {
          showSuccess();
        } else {
          // Failed but online — queue for retry.
          addToQueue(entry);
          showSuccess();
        }
      })
      .catch(function () {
        // Offline — queue for retry when back online.
        addToQueue(entry);
        showSuccess();
      });
  }

  function showSuccess() {
    var wrap = document.getElementById("support-form-wrap");
    var success = document.getElementById("support-success");
    var header = document.getElementById("support-header");
    if (wrap) wrap.hidden = true;
    if (header) header.hidden = true;
    if (success) success.hidden = false;
  }

  function init() {
    var btn = document.getElementById("support-submit-btn");
    if (btn) btn.addEventListener("click", handleSubmit);

    // Process queued messages when back online.
    window.addEventListener("online", processQueue);
    // Try to process queue on page load if online.
    if (navigator.onLine) processQueue();

    document.addEventListener("mskana:languageChanged", function (e) {
      var lang = e.detail.lang;
      var name = document.getElementById("support-name");
      var email = document.getElementById("support-email");
      var msg = document.getElementById("support-message");
      if (name)
        name.placeholder =
          lang === "en" ? "Your full name" : "Jina lako kamili";
      if (email)
        email.placeholder = lang === "en" ? "your@email.com" : "barua@pepe.com";
      if (msg)
        msg.placeholder =
          lang === "en" ? "Describe your issue..." : "Elezea tatizo lako...";
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
