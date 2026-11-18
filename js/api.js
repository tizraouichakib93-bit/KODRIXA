/* KODRIXA API client. Talks ONLY to the same-origin backend (/api/*).
   API keys live exclusively in server.py environment variables — never here.
   When the backend is absent or unconfigured the client reports demo mode and the
   pages fall back to the local engine, clearly labelled. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  let mode = 'checking';
  let detectPromise = null;
  const listeners = [];
  function emit() { listeners.forEach((fn) => fn(mode)); }
  function onMode(fn) { listeners.push(fn); fn(mode); }
  async function detect() {
    if (detectPromise) return detectPromise;
    detectPromise = (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1800);
        const res = await fetch('api/health', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        clearTimeout(t);
        if (!res.ok) throw new Error('no backend');
        const j = await res.json();
        mode = j && j.configured === true ? 'live' : 'demo';
      } catch (e) { mode = 'demo'; }
      emit();
      return mode;
    })();
    return detectPromise;
  }
  const isLive = () => mode === 'live';
  async function call(op, payload) {
    const res = await fetch('api/' + op, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    let j = null;
    try { j = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) throw new Error((j && j.error) || ('Backend error ' + res.status));
    return j;
  }
  K.api = { detect, isLive, call, onMode, get mode() { return mode; } };
})(window.KX);