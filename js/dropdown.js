/* KODRIXA searchable language dropdown (combobox + filterable listbox).
   Shows honest per-tool capability badges so unsupported features are never implied. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const { escapeHtml, uid } = K.core;
  const MONO = { c: 'C', python: 'Py', javascript: 'JS', typescript: 'TS', cpp: 'C++', csharp: 'C#', java: 'Jv', go: 'Go', rust: 'Rs', swift: 'Sw', kotlin: 'Kt', ruby: 'Rb', php: 'PHP', sql: 'SQL', html: '</>' };
  const COLOR = { c: '#2563eb', python: '#0d9488', javascript: '#d97706', typescript: '#3b82f6', cpp: '#7c3aed', csharp: '#9333ea', java: '#e11d48', go: '#06b6d4', rust: '#ea580c', swift: '#f472b6', kotlin: '#8b5cf6', ruby: '#dc2626', php: '#6366f1', sql: '#0891b2', html: '#ec4899' };
  const CAPS = [['gen', 'G', 'Generate'], ['translate', 'T', 'Translate'], ['debug', 'D', 'Debug'], ['explain', 'E', 'Explain']];

  function capBadges(lang) {
    return '<span class="kx-dd-caps">' + CAPS.map(([key, letter, title]) =>
      '<i class="cap-' + lang.cap[key] + '" title="' + title + ': ' + K.languages.capLabel(lang.cap[key]) + '">' + letter + '</i>'
    ).join('') + '</span>';
  }

  function create(mount, opts) {
    opts = opts || {};
    let value = opts.value || 'python';
    const id = uid();
    const root = document.createElement('div');
    root.className = 'kx-dd';
    root.innerHTML =
      '<button type="button" class="kx-dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="ddlist-' + id + '">' +
        '<span class="kx-dd-badge"></span><span class="kx-dd-value"></span>' +
        '<svg class="kx-dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="kx-dd-panel" hidden>' +
        '<div class="kx-dd-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input type="text" placeholder="Search languages…" aria-label="Search languages" autocomplete="off"></div>' +
        '<ul class="kx-dd-list" id="ddlist-' + id + '" role="listbox" tabindex="-1"></ul>' +
        '<div class="kx-dd-empty" hidden>No language matches your search.</div>' +
        '<div class="kx-dd-legend"><span><i class="cap-full"></i>supported</span><span><i class="cap-partial"></i>limited</span><span><i class="cap-none"></i>n/a</span><em>G·T·D·E = generate·translate·debug·explain</em></div>' +
      '</div>';
    mount.appendChild(root);
    const trigger = root.querySelector('.kx-dd-trigger');
    const badge = root.querySelector('.kx-dd-badge');
    const valueEl = root.querySelector('.kx-dd-value');
    const panel = root.querySelector('.kx-dd-panel');
    const search = root.querySelector('.kx-dd-search input');
    const list = root.querySelector('.kx-dd-list');
    const empty = root.querySelector('.kx-dd-empty');
    let open = false;
    let active = -1;
    let visible = [];

    function paintTrigger() {
      const L = K.languages.get(value);
      badge.textContent = MONO[L.id] || L.name.slice(0, 2);
      badge.style.background = COLOR[L.id] || '#7c3aed';
      valueEl.textContent = L.name;
    }
    function renderList(filter) {
      const q = (filter || '').trim().toLowerCase();
      visible = K.languages.LANGS.filter((l) => !q || l.name.toLowerCase().includes(q) || l.id.includes(q));
      list.innerHTML = visible.map((l, i) =>
        '<li role="option" id="ddopt-' + id + '-' + l.id + '" data-id="' + l.id + '" aria-selected="' + (l.id === value) + '" class="kx-dd-opt' + (l.id === value ? ' selected' : '') + (i === active ? ' active' : '') + '">' +
        '<span class="kx-dd-opt-badge" style="background:' + (COLOR[l.id] || '#7c3aed') + '">' + (MONO[l.id] || l.name.slice(0, 2)) + '</span>' +
        '<span class="kx-dd-opt-name">' + escapeHtml(l.name) + (l.featured ? '<em class="kx-featured">core</em>' : '') + '</span>' +
        capBadges(l) + '</li>'
      ).join('');
      empty.hidden = visible.length > 0;
    }
    function setOpen(v) {
      open = v;
      panel.hidden = !v;
      trigger.setAttribute('aria-expanded', String(v));
      root.classList.toggle('open', v);
      if (v) { search.value = ''; active = visible.findIndex((l) => l.id === value); renderList(''); search.focus(); }
    }
    function commit(id) {
      value = id;
      paintTrigger();
      setOpen(false);
      trigger.focus();
      if (opts.onChange) opts.onChange(id);
    }
    function move(delta) {
      if (!visible.length) return;
      active = (active + delta + visible.length) % visible.length;
      renderList(search.value);
      const el = list.children[active];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
    trigger.addEventListener('click', () => setOpen(!open));
    search.addEventListener('input', () => { active = 0; renderList(search.value); });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (visible[active]) commit(visible[active].id); }
      else if (e.key === 'Escape') { setOpen(false); trigger.focus(); }
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.kx-dd-opt');
      if (li) commit(li.dataset.id);
    });
    list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.kx-dd-opt');
      if (li) { const i = visible.findIndex((l) => l.id === li.dataset.id); if (i !== active) { active = i; renderList(search.value); } }
    });
    document.addEventListener('click', (e) => { if (open && !root.contains(e.target)) setOpen(false); });
    paintTrigger();
    renderList('');
    return {
      element: root,
      getValue: () => value,
      setValue: (v) => { value = v; paintTrigger(); renderList(search.value); },
      open: () => setOpen(true), close: () => setOpen(false)
    };
  }
  K.dropdown = { create, MONO, COLOR };
})(window.KX);