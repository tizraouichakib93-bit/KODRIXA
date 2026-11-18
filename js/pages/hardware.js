/* KODRIXA · Hardware Projects page controller.
   Curated Arduino builds from data.js: search, prompt matching, project cards and a
   tabbed detail view (code / components / light wiring diagram / step-by-step guide). */
(function () {
  'use strict';
  const K = window.KX;
  const { $, $$, toast, escapeHtml } = K.core;
  K.ui.injectChrome();

  const PROJECTS = (window.KODRIXA_DATA && window.KODRIXA_DATA.hardware) || [];
  const gridEl = $('#hwGrid'), emptyEl = $('#hwEmpty'), detailEl = $('#hwDetail'), browseEl = $('#hwBrowse');
  let activeProject = null, codeEditor = null, filter = 'All';

  /* ---- prompt matching (keyword scoring, same spirit as the original engine) ---- */
  function findProject(prompt) {
    const n = String(prompt).toLowerCase();
    if (!n.trim()) return null;
    let best = null, bestScore = 0;
    for (const p of PROJECTS) {
      let score = 0;
      if (n.includes(p.label.toLowerCase())) score += 20;
      for (const kw of p.keywords) if (n.includes(kw)) score += kw.length;
      if (score > bestScore) { best = p; bestScore = score; }
    }
    return best;
  }

  /* ---- light wiring diagram (replaces the old dark SVG) ---- */
  function wiringSvg(project) {
    const rows = project.wiring;
    const height = 96 + rows.length * 44;
    const rowSvg = rows.map((wire, index) => {
      const y = 82 + index * 44;
      return '<g>' +
        '<text x="36" y="' + (y + 3) + '" font-size="8.5" fill="#4c4666">' + escapeHtml(wire.from) + '</text>' +
        '<circle cx="198" cy="' + y + '" r="3.4" fill="' + wire.color + '"/>' +
        '<path d="M198 ' + y + ' H262" stroke="' + wire.color + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="262" cy="' + y + '" r="3.4" fill="' + wire.color + '"/>' +
        '<text x="274" y="' + (y + 3) + '" font-size="8.5" fill="#4c4666">' + escapeHtml(wire.to) + '</text>' +
        '</g>';
    }).join('');
    return '<svg class="wiring-svg" viewBox="0 0 460 ' + height + '" role="img" aria-label="Logical wiring map for ' + escapeHtml(project.title) + '">' +
      '<rect x="0" y="0" width="460" height="' + height + '" rx="12" fill="#fbfaff"/>' +
      '<text x="22" y="26" font-size="8.5" letter-spacing="1.6" fill="#7c3aed" font-weight="600">LOGICAL CONNECTION MAP</text>' +
      '<rect x="22" y="40" width="176" height="' + (rows.length * 44 + 26) + '" rx="9" fill="#eef2ff" stroke="#2563eb" stroke-opacity=".28"/>' +
      '<rect x="262" y="40" width="176" height="' + (rows.length * 44 + 26) + '" rx="9" fill="#f5f0ff" stroke="#7c3aed" stroke-opacity=".28"/>' +
      '<text x="36" y="59" font-size="7.5" letter-spacing="1.2" fill="#2563eb" font-weight="600">FROM</text>' +
      '<text x="274" y="59" font-size="7.5" letter-spacing="1.2" fill="#7c3aed" font-weight="600">TO</text>' +
      rowSvg +
      '<text x="22" y="' + (height - 14) + '" font-size="7.5" fill="#8b88a0">Connection reference only — not a physical breadboard layout.</text>' +
      '</svg>';
  }

  /* ---- browse grid ---- */
  function renderGrid() {
    const q = $('#hwSearch').value.trim().toLowerCase();
    const visible = PROJECTS.filter((p) =>
      (filter === 'All' || p.difficulty === filter) &&
      (!q || (p.title + ' ' + p.label + ' ' + p.description + ' ' + p.keywords.join(' ')).toLowerCase().includes(q))
    );
    emptyEl.hidden = visible.length > 0;
    gridEl.innerHTML = visible.map((p) =>
      '<article class="card hw-card reveal in">' +
      '<div class="hw-card-top"><span class="hw-diff ' + (p.difficulty === 'Beginner' ? 'is-beginner' : 'is-intermediate') + '">' + escapeHtml(p.difficulty) + '</span><span class="hw-time">⏱ ' + escapeHtml(p.time) + '</span></div>' +
      '<h3>' + escapeHtml(p.title) + '</h3>' +
      '<p>' + escapeHtml(p.description) + '</p>' +
      '<div class="hw-card-foot"><span class="hw-parts">' + p.components.length + ' components · ' + p.wiring.length + ' connections</span>' +
      '<button type="button" class="button button-primary button-small" data-open="' + p.id + '">Open build ' + K.ui.ICON.arrow + '</button></div>' +
      '</article>'
    ).join('');
  }

  $('#hwFilterChips').innerHTML = ['All', 'Beginner', 'Intermediate'].map((f) =>
    '<button type="button" class="chip' + (f === 'All' ? ' chip-active' : '') + '" data-filter="' + f + '">' + f + '</button>'
  ).join('');
  $('#hwFilterChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    filter = b.dataset.filter;
    $$('#hwFilterChips .chip').forEach((c) => c.classList.toggle('chip-active', c === b));
    renderGrid();
  });
  $('#hwSearch').addEventListener('input', K.core.debounce(renderGrid, 160));
  gridEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    openProject(PROJECTS.find((p) => p.id === b.dataset.open));
  });

  $('#hwFind').addEventListener('click', () => {
    const prompt = $('#hwPrompt').value;
    if (!prompt.trim()) { toast('Describe the hardware project you want first.', { tone: 'warn' }); return; }
    const p = findProject(prompt);
    if (!p) {
      toast('No curated build matches that description yet.', { tone: 'warn' });
      $('#hwMatchNote').innerHTML = '<div class="note-box">No curated project matches those keywords. Try <strong>blink / LED</strong>, <strong>distance / ultrasonic</strong> or <strong>plant / soil moisture</strong> — or browse all builds below.</div>';
      return;
    }
    $('#hwMatchNote').innerHTML = '';
    openProject(p);
    toast('Matched: ' + p.title, { tone: 'ok' });
  });

  /* ---- detail view ---- */
  function openProject(p) {
    if (!p) return;
    activeProject = p;
    browseEl.hidden = true; detailEl.hidden = false;
    $('#hwTitle').textContent = p.title;
    $('#hwMeta').innerHTML = '<span class="hw-diff ' + (p.difficulty === 'Beginner' ? 'is-beginner' : 'is-intermediate') + '">' + escapeHtml(p.difficulty) + '</span><span class="hw-time">⏱ ' + escapeHtml(p.time) + '</span><span class="hw-file">' + escapeHtml(p.filename) + '</span>';
    $('#hwDesc').textContent = p.description;
    $('#hwBoard').innerHTML = '<strong>Board note:</strong> ' + escapeHtml(p.boardNote);
    $('#hwSafety').innerHTML = '<strong>Safety first:</strong> ' + escapeHtml(p.safety);
    if (!codeEditor) codeEditor = K.editor.create($('#hwCodeWrap'), { language: 'cpp', value: p.code, filename: p.filename, height: '340px' });
    else { codeEditor.setFilename(p.filename); codeEditor.setValue(p.code); }
    $('#hwComponents').innerHTML = '<table class="components-table"><thead><tr><th>Component</th><th>Qty</th><th>Notes</th></tr></thead><tbody>' +
      p.components.map((c) => '<tr><td>' + escapeHtml(c.name) + '</td><td>' + c.qty + '</td><td>' + escapeHtml(c.note) + '</td></tr>').join('') + '</tbody></table>';
    $('#hwWiringSvg').innerHTML = wiringSvg(p);
    $('#hwWiringList').innerHTML = '<ul class="wiring-list">' + p.wiring.map((w) =>
      '<li><span class="wire-swatch" style="background:' + w.color + '"></span><div><strong>' + escapeHtml(w.from) + '</strong> → <strong>' + escapeHtml(w.to) + '</strong><br>' + escapeHtml(w.note) + '</div></li>'
    ).join('') + '</ul>';
    $('#hwGuide').innerHTML = '<ol class="guide-list">' + p.guide.map((g) => '<li>' + g + '</li>').join('') + '</ol>';
    selectTab('code');
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    K.core.announce('Opened project: ' + p.title);
  }

  function selectTab(name) {
    $$('#hwTabs .tab').forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    ['code', 'components', 'wiring', 'guide'].forEach((n) => { $('#hwTab-' + n).hidden = n !== name; });
  }
  $('#hwTabs').addEventListener('click', (e) => {
    const t = e.target.closest('.tab'); if (t) selectTab(t.dataset.tab);
  });
  $('#hwBack').addEventListener('click', () => {
    detailEl.hidden = true; browseEl.hidden = false; activeProject = null;
    browseEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  K.ui.bindCopy($('#hwCopy'), () => codeEditor ? codeEditor.getValue() : '');
  K.ui.bindDownload($('#hwDownload'), () => codeEditor ? codeEditor.getValue() : '', () => activeProject ? activeProject.filename : 'sketch.ino', 'text/x-c++src');

  renderGrid();
})();