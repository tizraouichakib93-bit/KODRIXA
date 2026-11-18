/* KODRIXA shared UI chrome: fixed header + footer injected on every page, active-page
   state, mobile menu, scroll state, reveal-on-scroll, mode badge, and loading/error/empty
   state helpers plus copy/download bindings. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const { $, escapeHtml, toast, copyText, downloadText } = K.core;
  const NAV = [
    ['home', 'index.html', 'Home'],
    ['generator', 'generator.html', 'Code Generator'],
    ['translator', 'translator.html', 'Code Translator'],
    ['debugger', 'debugger.html', 'Code Debugger'],
    ['explainer', 'explainer.html', 'Code Explainer'],
    ['hardware', 'hardware.html', 'Hardware Projects']
  ];
  const ICON = {
    logo: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M6 5h6v10L23 5h8L19 17l12 10h-9L12 18v9H6z"/></svg>',
    arrow: '<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    menu: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    copy: '<svg class="icon" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></svg>'
  };
  function currentPage() {
    const p = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    return p === '' || p === 'index' ? 'home' : p;
  }
  function injectChrome() {
    const page = currentPage();
    const header = document.createElement('header');
    header.className = 'site-header'; header.id = 'siteHeader';
    header.innerHTML =
      '<div class="container header-inner">' +
      '<a class="brand" href="index.html" aria-label="KODRIXA home"><span class="brand-mark">' + ICON.logo + '</span><span>KODRIXA<span class="brand-period">.</span></span></a>' +
      '<nav class="nav-links" id="navLinks" aria-label="Main navigation">' +
      NAV.map(([id, href, label]) => '<a href="' + href + '" data-page="' + id + '"' + (id === page ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>').join('') +
      '</nav>' +
      '<div class="header-actions">' +
      '<span class="mode-pill" id="modePill" title="Connection status"><span class="mode-dot"></span><span id="modeText">Checking…</span></span>' +
      '<a class="button button-primary button-small header-cta" href="generator.html">Open Generator ' + ICON.arrow + '</a>' +
      '<button type="button" class="icon-button menu-toggle" id="menuToggle" aria-label="Open navigation" aria-expanded="false" aria-controls="navLinks">' + ICON.menu + '</button>' +
      '</div></div>';
    document.body.prepend(header);
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="container footer-inner">' +
      '<div class="footer-brand"><span class="brand-mark">' + ICON.logo + '</span><div><strong>KODRIXA</strong><p>Your next idea. Already in code.</p></div></div>' +
      '<nav class="footer-links" aria-label="Footer">' + NAV.map(([id, href, label]) => '<a href="' + href + '">' + label + '</a>').join('') + '</nav>' +
      '<p class="footer-note">The bundled engine runs entirely in your browser (demo mode). For live AI, run <code>server.py</code> with a provider key set server-side. Keys never reach frontend JavaScript.</p>' +
      '</div>';
    document.body.appendChild(footer);
    // mobile menu
    const toggle = $('#menuToggle'), nav = $('#navLinks');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      header.classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); header.classList.remove('menu-open'); } });
    // scroll state
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    // reveal
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
      document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    } else document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    // mode badge
    K.api.onMode((m) => {
      const pill = $('#modePill'), txt = $('#modeText');
      if (!pill) return;
      pill.classList.toggle('live', m === 'live');
      pill.classList.toggle('demo', m !== 'live');
      txt.textContent = m === 'live' ? 'AI connected' : m === 'checking' ? 'Checking…' : 'Demo mode';
    });
    K.api.detect();
  }
  function mountModeNote(el) {
    const paint = (m) => {
      el.className = 'mode-note ' + (m === 'live' ? 'is-live' : 'is-demo');
      el.innerHTML = m === 'live'
        ? '<span class="mode-dot"></span><div><strong>Live AI backend.</strong> Requests are proxied by <code>server.py</code>; the provider key stays on the server.</div>'
        : '<span class="mode-dot"></span><div><strong>Demo mode — no AI connected.</strong> Results come from the local KODRIXA engine. Run <code>python server.py</code> with <code>KODRIXA_API_KEY</code> set to enable live generation, translation and debugging.</div>';
    };
    K.api.onMode(paint);
  }
  function showLoading(el, label) {
    el.innerHTML = '<div class="state state-loading"><span class="spinner" aria-hidden="true"></span><p class="state-title">' + escapeHtml(label || 'Working…') + '</p><p class="state-sub">Composing results locally unless a live backend is configured.</p></div>';
  }
  function showError(el, msg, onRetry) {
    el.innerHTML = '<div class="state state-error"><span class="state-glyph">!</span><p class="state-title">Something went wrong</p><p class="state-sub">' + escapeHtml(msg) + '</p>' + (onRetry ? '<button type="button" class="button button-subtle button-small state-retry">Try again</button>' : '') + '</div>';
    if (onRetry) el.querySelector('.state-retry').addEventListener('click', onRetry);
  }
  function showEmpty(el, title, body) {
    el.innerHTML = '<div class="state state-empty"><span class="state-glyph spark">✦</span><p class="state-title">' + escapeHtml(title) + '</p><p class="state-sub">' + escapeHtml(body) + '</p></div>';
  }
  function bindCopy(btn, getText) {
    btn.addEventListener('click', async () => {
      const ok = await copyText(getText());
      toast(ok ? 'Copied to clipboard.' : 'Copy failed — select the code and copy manually.', { tone: ok ? 'ok' : 'warn' });
      if (ok) { const svg = btn.querySelector('svg'); if (svg) { const old = svg.outerHTML; svg.outerHTML = ICON.check; setTimeout(() => { const cur = btn.querySelector('svg'); if (cur) cur.outerHTML = old; }, 1300); } }
    });
  }
  function bindDownload(btn, getText, getName, mime) {
    btn.addEventListener('click', () => {
      const text = getText();
      if (!text || !text.trim()) { toast('Nothing to download yet.', { tone: 'warn' }); return; }
      downloadText(getName(), text, mime);
      toast('Downloaded ' + getName() + '.', { tone: 'ok' });
    });
  }
  K.ui = { injectChrome, mountModeNote, showLoading, showError, showEmpty, bindCopy, bindDownload, ICON, NAV, currentPage };
})(window.KX);