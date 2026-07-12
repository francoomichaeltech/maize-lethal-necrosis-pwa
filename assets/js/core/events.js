/* events.js - Simple publish/subscribe event bus for inter-module communication. */

const MskanaEvents = (function () {
  'use strict';

  const handlers = {};

  function on(event, handler)  { if (!handlers[event]) handlers[event] = []; handlers[event].push(handler); }
  function off(event, handler) { if (handlers[event]) handlers[event] = handlers[event].filter(h => h !== handler); }
  function emit(event, data)   { if (handlers[event]) handlers[event].forEach(h => h(data)); }

  return Object.freeze({ on, off, emit });
})();

window.MskanaEvents = MskanaEvents;
