(() => {
  'use strict';

  const DATA = window.KODRIXA_DATA;
  const ENGINE = window.KODRIXA_ENGINE;
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HISTORY_KEY = 'kodrixa-history-v1';

  const LANGUAGE_LABELS = { python: 'Python', javascript: 'JavaScript', cpp: 'C++', html: 'HTML & CSS', arduino: 'Arduino C++' };
  const LANGUAGE_EXTENSIONS = { python: 'py', javascript: 'js', cpp: 'cpp', html: 'html', arduino: 'ino' };

  const TOOLS = {
    generator: {
      icon: 'i-code', eyebrow: 'CREATE / 01', title: 'What are we building?',
      description: 'Describe a small project, or start with one of our hand-built examples.',
      inputLabel: 'DESCRIBE YOUR IDEA', languageLabel: 'NATURAL LANGUAGE',
      placeholder: 'e.g. Make a countdown timer in Python that counts down from 10 seconds…',
      runLabel: 'Generate code', emptyText: 'Try a countdown timer',
      hint: 'Curated demo recipes. No AI service is connected.'
    },
    debugger: {
      icon: 'i-bug', eyebrow: 'REFINE / 02', title: 'Let’s find the friction.',
      description: 'Paste code and run limited pattern checks. This is a helper, not a full compiler.',
      inputLabel: 'PASTE YOUR CODE', languageLabel: 'PYTHON',
      placeholder: 'Paste a small snippet with a common syntax issue…',
      runLabel: 'Check code', emptyText: 'Try a missing-colon example',
      hint: 'Checks brackets, strings, Python colons/print, JS const reassignment, and C++ semicolons.'
    },
    converter: {
      icon: 'i-swap', eyebrow: 'TRANSLATE / 03', title: 'Same idea. New language.',
      description: 'Move a curated example between Python, JavaScript, and C++.',
      inputLabel: 'PASTE SOURCE CODE', languageLabel: 'PYTHON',
      placeholder: 'Load a sample below, then choose a target language…',
      runLabel: 'Convert code', emptyText: 'Try a hello-world conversion',
      hint: 'Template-based demo. Only the curated examples convert; this is not a general transpiler.'
    },
    explainer: {
      icon: 'i-book', eyebrow: 'UNDERSTAND / 04', title: 'Make every line click.',
      description: 'Walk through code in simple language, one line at a time.',
      inputLabel: 'PASTE CODE TO EXPLAIN', languageLabel: 'PYTHON',
      placeholder: 'Paste a short snippet, or try a guided example…',
      runLabel: 'Explain code', emptyText: 'Try a Fibonacci walkthrough',
      hint: 'Built-in line guide. Lines outside the guide are labeled honestly.'
    },
    hardware: {
      icon: 'i-chip', eyebrow: 'MAKE IT REAL / 05', title: 'Let’s make it physical.',
      description: 'Generate an Arduino sketch, parts list, wiring map, and upload guide.',
      inputLabel: 'DESCRIBE YOUR PROJECT', languageLabel: 'NATURAL LANGUAGE',
      placeholder: 'e.g. Blink an LED every second on an Arduino Uno…',
      runLabel: 'Generate project', emptyText: 'Try an LED blink project',
      hint: 'Curated Arduino projects. Always check your board, sensor datasheet, and wiring before powering up.'
    }
  };

  const DEFAULT_OPTIONS = {
    generator: { language: 'python' },
    debugger: { language: 'python' },
    converter: { source: 'python', target: 'javascript' },
    explainer: { language: 'python' },
    hardware: { board: 'Arduino Uno' }
  };

  const state = {
    tool: 'generator',
    inputs: { generator: '', debugger: '', converter: '', explainer: '', hardware: '' },
    options: JSON.parse(JSON.stringify(DEFAULT_OPTIONS)),
    results: {},
    activeTab: {},
    selectedSample: {},
    history: [],
    busy: false
  };

  const els = {
    header: $('siteHeader'), nav: $('navLinks'), menuToggle: $('menuToggle'),
    panel: $('toolPanel'), panelEyebrow: $('panelEyebrow'), panelTitle: $('panelTitle'),
    panelDescription: $('panelDescription'), panelIcon: $('panelIcon'), controls: $('toolControls'),
    input: $('codeInput'), inputLabel: $('inputLabel'), inputLanguageLabel: $('inputLanguageLabel'),
    charCount: $('charCount'), clearInput: $('clearInput'), samples: $('sampleChips'),
    run: $('runTool'), runLabel: $('runLabel'), inputHint: $('inputHint'),
    outputFilename: $('outputFilename'), outputTabs: $('outputTabs'), outputBody: $('outputBody'),
    outputFooter: $('outputFooter'), outputStatus: $('outputStatus'),
    copy: $('copyOutput'), download: $('downloadOutput'), sendToExplainer: $('sendToExplainer'),
    announcement: $('runAnnouncement'), historyToggle: $('historyToggle'), historyCount: $('historyCount'),
    historyDialog: $('historyDialog'), historyList: $('historyList'), closeHistory: $('closeHistory'),
    clearHistory: $('clearHistory'), reset: $('resetWorkspace'), toastRegion: $('toastRegion'),
    heroRun: $('heroRun'), heroVisual: $('heroVisual'), backToTop: $('backToTop')
  };

  function icon(name, className = 'icon') {
    return '<svg class="' + className + '" aria-hidden="true"><use href="#' + name + '"/></svg>';
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : ms));
  }

  let toastTimer = null;
  function showToast(message, options = {}) {
    clearTimeout(toastTimer);
    const action = options.actionLabel ? '<button class="toast-action" type="button">' + ENGINE.escapeHtml(options.actionLabel) + '</button>' : '';
    els.toastRegion.innerHTML = '<div class="toast" role="status">' + icon(options.icon || 'i-check') +
      '<span class="toast-message">' + ENGINE.escapeHtml(message) + '</span>' + action +
      '<button class="icon-button toast-close" type="button" aria-label="Dismiss notification">' + icon('i-close') + '</button></div>';
    const toast = els.toastRegion.firstElementChild;
    const dismiss = () => { clearTimeout(toastTimer); els.toastRegion.innerHTML = ''; };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    if (options.actionLabel) {
      toast.querySelector('.toast-action').addEventListener('click', () => { dismiss(); if (options.onAction) options.onAction(); });
    }
    toastTimer = setTimeout(dismiss, options.duration || 4200);
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      state.history = Array.isArray(stored) ? stored.slice(0, 8) : [];
    } catch {
      state.history = [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 8)));
    } catch {
      return false;
    }
    return true;
  }

  function addHistory(entry) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, 8);
    saveHistory();
    renderHistoryCount();
  }

  function renderHistoryCount() {
    els.historyCount.textContent = String(state.history.length);
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historyList.innerHTML = '<div class="history-empty">' + icon('i-history') + '<p>No builds yet.<br>Run a tool and your result will appear here.</p></div>';
      els.clearHistory.disabled = true;
      return;
    }
    els.clearHistory.disabled = false;
    els.historyList.innerHTML = state.history.map((entry) => {
      const meta = TOOLS[entry.tool] || TOOLS.generator;
      const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<div class="history-item">' +
        '<button class="history-restore" type="button" data-restore="' + ENGINE.escapeHtml(entry.id) + '">' + icon(meta.icon) +
        '<span><strong>' + ENGINE.escapeHtml(entry.title) + '</strong><small>' + ENGINE.escapeHtml(meta.title) + ' · ' + time + '</small></span></button>' +
        '<button class="icon-button" type="button" data-delete="' + ENGINE.escapeHtml(entry.id) + '" aria-label="Delete ' + ENGINE.escapeHtml(entry.title) + '">' + icon('i-trash') + '</button></div>';
    }).join('');
  }

  function selectWrap(id, label, value, options) {
    return '<div class="control-group"><label for="' + id + '">' + label + '</label><span class="select-wrap">' +
      '<select id="' + id + '">' + options.map((option) => '<option value="' + ENGINE.escapeHtml(option.value) + '"' + (option.value === value ? ' selected' : '') + '>' + ENGINE.escapeHtml(option.label) + '</option>').join('') + '</select>' +
      icon('i-chevron') + '</span></div>';
  }

  function renderControls() {
    const tool = state.tool;
    let html = '';
    if (tool === 'generator') {
      html = selectWrap('generatorLanguage', 'LANGUAGE', state.options.generator.language, [
        { value: 'python', label: 'Python' }, { value: 'javascript', label: 'JavaScript' },
        { value: 'cpp', label: 'C++' }, { value: 'html', label: 'HTML & CSS' }
      ]) + '<span class="control-note">' + icon('i-info') + 'Recipes change with the language</span>';
    } else if (tool === 'debugger') {
      html = selectWrap('debuggerLanguage', 'CODE LANGUAGE', state.options.debugger.language, [
        { value: 'python', label: 'Python' }, { value: 'javascript', label: 'JavaScript' }, { value: 'cpp', label: 'C++' }
      ]) + '<span class="control-note">' + icon('i-info') + 'Limited static pattern checks</span>';
    } else if (tool === 'converter') {
      const languages = DATA.converter.languages.map((language) => ({ value: language.id, label: language.label }));
      html = selectWrap('converterSource', 'FROM', state.options.converter.source, languages) +
        '<button class="swap-button" id="swapLanguages" type="button" aria-label="Swap source and target languages" title="Swap languages">' + icon('i-swap') + '</button>' +
        selectWrap('converterTarget', 'TO', state.options.converter.target, languages.filter((language) => language.value !== state.options.converter.source)) +
        '<span class="control-note">' + icon('i-info') + 'Curated, semantically matched examples</span>';
    } else if (tool === 'explainer') {
      html = selectWrap('explainerLanguage', 'CODE LANGUAGE', state.options.explainer.language, [
        { value: 'python', label: 'Python' }, { value: 'javascript', label: 'JavaScript' },
        { value: 'cpp', label: 'C++' }, { value: 'arduino', label: 'Arduino C++' }
      ]) + '<span class="control-note">' + icon('i-info') + 'Simple-language, line-by-line guide</span>';
    } else if (tool === 'hardware') {
      html = selectWrap('hardwareBoard', 'BOARD', state.options.hardware.board, [
        { value: 'Arduino Uno', label: 'Arduino Uno' }, { value: 'Arduino Nano', label: 'Arduino Nano' }, { value: 'Arduino Mega 2560', label: 'Arduino Mega 2560' }
      ]) + '<span class="control-note">' + icon('i-info') + 'Classic 5V boards; verify your module ratings</span>';
    }
    els.controls.innerHTML = html;
    const swap = $('swapLanguages');
    if (swap) swap.addEventListener('click', swapLanguages);
  }

  function currentSamples() {
    if (state.tool === 'generator') return DATA.generator[state.options.generator.language].map((recipe) => ({ id: recipe.id, label: recipe.label, value: recipe.prompt }));
    if (state.tool === 'debugger') return DATA.debuggerSamples.map((sample) => ({ id: sample.id, label: sample.label, value: sample.code, language: sample.language }));
    if (state.tool === 'converter') return DATA.converter.recipes.map((recipe) => ({ id: recipe.id, label: recipe.label, value: recipe.codes[state.options.converter.source] }));
    if (state.tool === 'explainer') return DATA.explainerSamples.map((sample) => ({ id: sample.id, label: sample.label, value: sample.code, language: sample.language }));
    return DATA.hardware.map((project) => ({ id: project.id, label: project.label, value: 'Build an Arduino ' + project.label.toLowerCase() + ' project.' }));
  }

  function renderSamples() {
    const samples = currentSamples();
    els.samples.innerHTML = samples.map((sample) => '<button class="sample-chip' + (state.selectedSample[state.tool] === sample.id ? ' active' : '') + '" type="button" data-sample="' + ENGINE.escapeHtml(sample.id) + '">' + ENGINE.escapeHtml(sample.label) + '</button>').join('');
  }

  function updateCharCount() {
    els.charCount.textContent = state.inputs[state.tool].length.toLocaleString() + ' / 20,000';
  }

  function updateInputLabel() {
    const meta = TOOLS[state.tool];
    let label = meta.languageLabel;
    if (state.tool === 'debugger') label = LANGUAGE_LABELS[state.options.debugger.language].toUpperCase();
    if (state.tool === 'converter') label = LANGUAGE_LABELS[state.options.converter.source].toUpperCase() + ' SOURCE';
    if (state.tool === 'explainer') label = LANGUAGE_LABELS[state.options.explainer.language].toUpperCase();
    els.inputLanguageLabel.textContent = label;
  }

  function setInput(value) {
    state.inputs[state.tool] = value;
    els.input.value = value;
    updateCharCount();
  }

  function renderEmpty() {
    const meta = TOOLS[state.tool];
    els.outputFilename.textContent = 'Your next creation';
    els.outputTabs.hidden = true;
    els.outputTabs.innerHTML = '';
    els.outputFooter.hidden = true;
    els.copy.disabled = true;
    els.download.disabled = true;
    els.outputBody.setAttribute('role', 'region');
    els.outputBody.setAttribute('aria-label', meta.title + ' output');
    els.outputBody.innerHTML = '<div class="output-empty"><div class="empty-orbit" aria-hidden="true"><span></span><svg><use href="#i-k"/></svg></div>' +
      '<h4>A little idea goes a long way.</h4><p>Pick an example or write your own.<br>Your next starting point is one click away.</p>' +
      '<button class="button button-subtle" type="button" data-action="empty-example">' + icon('i-spark') + '<span>' + ENGINE.escapeHtml(meta.emptyText) + '</span>' + icon('i-arrow') + '</button>' +
      '<span class="empty-note">HAND-BUILT EXAMPLES. REAL, USABLE OUTPUT.</span></div>';
  }

  function renderLoading() {
    els.outputTabs.hidden = true;
    els.outputFooter.hidden = true;
    els.copy.disabled = true;
    els.download.disabled = true;
    els.outputFilename.textContent = 'Preparing example…';
    els.outputBody.innerHTML = '<div class="output-loading"><div class="loading-spinner" aria-hidden="true"></div><strong>Assembling your example…</strong><p>Matching your input against the local demo library.</p><div class="loading-bars" aria-hidden="true"><i></i><i></i><i></i></div></div>';
  }

  function codeBlock(code, language) {
    const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
    return '<pre class="code-output"><code>' + lines.map((line, index) =>
      '<span class="code-line"><span class="line-number">' + (index + 1) + '</span><span class="line-content">' + ENGINE.highlightLine(line, language) + '</span></span>'
    ).join('') + '</code></pre>';
  }

  function notice(text, kind = '') {
    return '<div class="output-notice ' + kind + '">' + icon(kind === 'warning' ? 'i-info' : kind === 'success' ? 'i-check' : 'i-info') + '<span>' + ENGINE.escapeHtml(text) + '</span></div>';
  }

  function renderResult(result) {
    if (!result) {
      renderEmpty();
      return;
    }
    if (result.kind === 'unsupported') {
      els.outputFilename.textContent = 'No matching example';
      els.outputTabs.hidden = true;
      els.outputFooter.hidden = true;
      els.copy.disabled = true;
      els.download.disabled = true;
      els.outputBody.innerHTML = '<div class="unsupported-state">' + icon('i-info') + '<h4>' + ENGINE.escapeHtml(result.title) + '</h4><p>' + ENGINE.escapeHtml(result.message) + '</p>' +
        '<button class="button button-subtle" type="button" data-action="empty-example">' + icon('i-spark') + '<span>' + ENGINE.escapeHtml(TOOLS[state.tool].emptyText) + '</span>' + icon('i-arrow') + '</button></div>';
      return;
    }

    const tabs = result.tabs || [];
    const activeId = state.activeTab[state.tool] && tabs.some((tab) => tab.id === state.activeTab[state.tool]) ? state.activeTab[state.tool] : (tabs[0] && tabs[0].id);
    state.activeTab[state.tool] = activeId;
    els.outputFilename.textContent = result.filename;
    els.outputTabs.hidden = tabs.length <= 1;
    els.outputTabs.innerHTML = tabs.map((tab) => '<button class="output-tab' + (tab.id === activeId ? ' active' : '') + '" type="button" role="tab" id="outtab-' + tab.id + '" aria-selected="' + (tab.id === activeId) + '" aria-controls="outputBody" data-output-tab="' + tab.id + '">' + ENGINE.escapeHtml(tab.label) + '</button>').join('');
    els.outputBody.setAttribute('role', 'tabpanel');
    els.outputBody.setAttribute('aria-labelledby', 'outtab-' + activeId);
    els.outputBody.innerHTML = renderResultTab(result, activeId);
    els.outputFooter.hidden = false;
    els.outputStatus.innerHTML = '<span class="status-dot"></span><span>' + ENGINE.escapeHtml(result.status || 'Ready') + '</span>';
    els.copy.disabled = false;
    els.download.disabled = false;
    els.sendToExplainer.hidden = !result.explainCode || result.explainLanguage === 'html';
    els.outputBody.scrollTop = 0;
  }

  function renderResultTab(result, tabId) {
    if (result.kind === 'code') {
      return (result.notice ? notice(result.notice) : '') + codeBlock(result.code, result.language);
    }
    if (result.kind === 'diagnostics') {
      if (tabId === 'fixed') return notice('Suggested fixes applied locally. Review the result before using it.', 'warning') + codeBlock(result.fixedCode, result.language);
      const count = result.issues.length;
      let html = count
        ? '<div class="diagnostic-summary">' + icon('i-bug') + '<div><strong>' + count + ' possible issue' + (count > 1 ? 's' : '') + ' found</strong><span>Limited pattern checks — not a full compile or lint pass.</span></div></div>'
        : '<div class="diagnostic-summary clean">' + icon('i-check') + '<div><strong>No known patterns found</strong><span>This does not prove the code is valid. Test it with your language toolchain.</span></div></div>';
      html += result.issues.map((issue) => '<article class="diagnostic-item"><div class="diagnostic-item-head"><span class="severity-badge ' + (issue.severity === 'warning' ? 'warning' : '') + '">' + ENGINE.escapeHtml(issue.severity) + '</span><span class="diagnostic-line">Line ' + issue.line + '</span></div>' +
        '<h5>' + ENGINE.escapeHtml(issue.title) + '</h5><div class="diagnostic-context">' + ENGINE.escapeHtml(issue.detail) + '</div>' +
        '<div class="diagnostic-fix">' + icon('i-check') + '<span>' + ENGINE.escapeHtml(issue.suggestion) + '</span></div></article>').join('');
      if (result.canApply) html += '<button class="button button-subtle apply-fixes" type="button" data-action="apply-fixes">' + icon('i-bolt') + 'Apply suggested fixes</button>';
      return html;
    }
    if (result.kind === 'explanation') {
      return '<div class="explanation-intro"><strong>Overview.</strong> ' + ENGINE.escapeHtml(result.summary) + '</div><div class="explanation-list">' +
        result.items.map((item) => '<article class="explanation-item"><span class="explanation-step">' + item.line + '</span><div><code class="explanation-code">' + ENGINE.escapeHtml(item.code || ' ') + '</code><p class="explanation-text">' + ENGINE.escapeHtml(item.text) + '</p><span class="concept-tag">' + ENGINE.escapeHtml(item.tag) + '</span></div></article>').join('') + '</div>';
    }
    if (result.kind === 'hardware') {
      const project = result.project;
      if (tabId === 'code') return notice('Upload with the Arduino IDE. Select "' + result.board + '" and the correct port.', 'success') + codeBlock(project.code, 'arduino');
      if (tabId === 'components') {
        return '<table class="components-table"><thead><tr><th>Component</th><th>Notes</th><th>Qty</th></tr></thead><tbody>' +
          project.components.map((component) => '<tr><td>' + ENGINE.escapeHtml(component.name) + '</td><td>' + ENGINE.escapeHtml(component.note) + '</td><td>' + component.qty + '</td></tr>').join('') +
          '</tbody></table><p class="components-note">Quantities are for one demo build. Check your board and module documentation before buying or wiring.</p>';
      }
      if (tabId === 'wiring') {
        return '<div class="wiring-diagram">' + ENGINE.wiringDiagram(project) + '</div><ul class="wiring-list">' +
          project.wiring.map((wire) => '<li><span class="wire-dot" style="--wire-color:' + wire.color + '"></span><span><strong>' + ENGINE.escapeHtml(wire.from) + '</strong> → <strong>' + ENGINE.escapeHtml(wire.to) + '</strong><br>' + ENGINE.escapeHtml(wire.note) + '</span></li>').join('') +
          '</ul>' + notice(project.safety, 'warning');
      }
      if (tabId === 'guide') {
        return '<ol class="guide-steps">' + project.guide.map((step) => '<li>' + step + '</li>').join('') + '</ol>' + notice(project.safety, 'warning');
      }
      return '<div class="hardware-overview"><h4>' + ENGINE.escapeHtml(project.title) + '</h4><div class="hardware-meta"><span>' + icon('i-bolt') + ENGINE.escapeHtml(project.difficulty) + '</span><span>' + icon('i-clock') + ENGINE.escapeHtml(project.time) + '</span><span>' + icon('i-chip') + ENGINE.escapeHtml(result.board) + '</span></div>' +
        '<p>' + ENGINE.escapeHtml(project.description) + '</p><div class="wiring-diagram">' + ENGINE.wiringDiagram(project) + '</div>' +
        notice(project.boardNote) + notice(project.safety, 'warning') + '</div>';
    }
    return '';
  }

  function activeContent(result, tabId) {
    if (!result || result.kind === 'unsupported') return null;
    if (result.kind === 'code') return { text: result.code, filename: result.filename };
    if (result.kind === 'explanation') {
      const text = result.summary + '\n\n' + result.items.map((item) => String(item.line).padStart(2, '0') + ' | ' + item.code + '\n   ' + item.text + ' [' + item.tag + ']').join('\n\n');
      return { text, filename: result.filename.replace(/\.[^.]+$/, '') + '-explanation.txt' };
    }
    if (result.kind === 'diagnostics') {
      if (tabId === 'fixed') return { text: result.fixedCode, filename: result.filename.replace(/\.[^.]+$/, '') + '-fixed.' + (LANGUAGE_EXTENSIONS[result.language] || 'txt') };
      const text = result.issues.length
        ? 'KODRIXA local demo — limited pattern check\n\n' + result.issues.map((issue) => 'Line ' + issue.line + ' [' + issue.severity + '] ' + issue.title + '\n' + issue.detail + '\nFix: ' + issue.suggestion).join('\n\n')
        : 'No known patterns found. This is not a full validation.';
      return { text, filename: 'debug-report.txt' };
    }
    if (result.kind === 'hardware') {
      const project = result.project;
      if (tabId === 'code') return { text: project.code, filename: project.filename };
      if (tabId === 'components') return { text: project.components.map((component) => component.qty + '× ' + component.name + ' — ' + component.note).join('\n'), filename: project.id + '-components.txt' };
      if (tabId === 'wiring') return { text: project.wiring.map((wire) => wire.from + ' → ' + wire.to + '\n  ' + wire.note).join('\n\n') + '\n\nSafety: ' + project.safety, filename: project.id + '-wiring.txt' };
      if (tabId === 'guide') return { text: project.guide.map((step, index) => (index + 1) + '. ' + step.replace(/<[^>]+>/g, '')).join('\n\n') + '\n\nSafety: ' + project.safety, filename: project.id + '-guide.txt' };
      return { text: project.title + '\n' + project.difficulty + ' · ' + project.time + ' · ' + result.board + '\n\n' + project.description + '\n\n' + project.boardNote + '\n\n' + project.safety, filename: project.id + '-overview.txt' };
    }
    return null;
  }

  function setTool(tool, options = {}) {
    if (!TOOLS[tool]) return;
    state.tool = tool;
    const meta = TOOLS[tool];
    document.querySelectorAll('.tool-tab').forEach((tab) => {
      const active = tab.dataset.tool === tool;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    els.panel.setAttribute('aria-labelledby', 'tab-' + tool);
    els.panelEyebrow.textContent = meta.eyebrow;
    els.panelTitle.textContent = meta.title;
    els.panelDescription.textContent = meta.description;
    els.panelIcon.innerHTML = icon(meta.icon);
    els.inputLabel.textContent = meta.inputLabel;
    els.input.placeholder = meta.placeholder;
    els.input.value = state.inputs[tool] || '';
    els.runLabel.textContent = meta.runLabel;
    els.inputHint.innerHTML = icon('i-info') + '<span>' + ENGINE.escapeHtml(meta.hint) + '</span>';
    updateInputLabel();
    updateCharCount();
    renderControls();
    renderSamples();
    renderResult(state.results[tool]);
    if (options.focus) els.input.focus({ preventScroll: true });
  }

  function loadSample(sampleId) {
    const sample = currentSamples().find((item) => item.id === sampleId);
    if (!sample) return;
    state.selectedSample[state.tool] = sample.id;
    if (sample.language) {
      if (state.tool === 'debugger') state.options.debugger.language = sample.language;
      if (state.tool === 'explainer') state.options.explainer.language = sample.language;
      renderControls();
      updateInputLabel();
    }
    setInput(sample.value);
    renderSamples();
  }

  function loadFirstExample() {
    const samples = currentSamples();
    if (!samples.length) return;
    loadSample(samples[0].id);
  }

  function unsupported(title, message) {
    return { kind: 'unsupported', title, message };
  }

  function buildGeneratorResult(input) {
    const language = state.options.generator.language;
    const recipe = ENGINE.findGeneratorRecipe(input, language);
    if (!recipe) {
      const labels = DATA.generator[language].map((item) => item.label).join(', ');
      return unsupported('No matching demo recipe', 'This local demo generates a fixed set of examples, not arbitrary AI code. Available ' + LANGUAGE_LABELS[language] + ' recipes: ' + labels + '.');
    }
    return {
      kind: 'code', title: recipe.label, filename: recipe.filename, code: recipe.code, language,
      notice: recipe.note, status: 'Curated recipe ready', tabs: [{ id: 'code', label: 'Code' }],
      explainCode: recipe.code, explainLanguage: language
    };
  }

  function buildDebuggerResult(input) {
    const language = state.options.debugger.language;
    const analysis = ENGINE.analyzeCode(input, language);
    const filename = 'checked-code.' + (LANGUAGE_EXTENSIONS[language] || 'txt');
    const tabs = [{ id: 'diagnosis', label: 'Diagnosis' }];
    if (analysis.canApply) tabs.push({ id: 'fixed', label: 'Suggested fix' });
    return {
      kind: 'diagnostics', title: 'Code check · ' + LANGUAGE_LABELS[language], filename, language,
      issues: analysis.issues, fixedCode: analysis.fixedCode, canApply: analysis.canApply,
      status: analysis.issues.length ? analysis.issues.length + ' possible issue(s)' : 'No known patterns found',
      tabs, explainCode: analysis.canApply ? analysis.fixedCode : input, explainLanguage: language
    };
  }

  function buildConverterResult(input) {
    const { source, target } = state.options.converter;
    const conversion = ENGINE.convertCode(input, source, target);
    if (!conversion) {
      return unsupported('No curated equivalent found', 'This demo converts only its sample programs between Python, JavaScript, and C++. Load one of the examples below, or connect a real transpiler for general code.');
    }
    const extension = LANGUAGE_EXTENSIONS[target];
    return {
      kind: 'code', title: conversion.recipe.label + ' → ' + LANGUAGE_LABELS[target],
      filename: conversion.recipe.id + '.' + extension, code: conversion.code, language: target,
      notice: 'Matched curated example: ' + conversion.recipe.label + '. Template-based demonstration, not a general transpiler.',
      status: 'Converted example ready', tabs: [{ id: 'code', label: 'Converted code' }],
      explainCode: conversion.code, explainLanguage: target
    };
  }

  function buildExplainerResult(input) {
    const language = state.options.explainer.language;
    const explanation = ENGINE.explainCode(input, language);
    return {
      kind: 'explanation', title: 'Line-by-line · ' + LANGUAGE_LABELS[language],
      filename: 'explanation.' + (LANGUAGE_EXTENSIONS[language] || 'txt'),
      summary: explanation.summary, items: explanation.items, status: explanation.items.length + ' lines walked through',
      tabs: [{ id: 'lines', label: 'Line by line' }]
    };
  }

  function buildHardwareResult(input) {
    const project = ENGINE.findHardwareProject(input);
    if (!project) {
      return unsupported('No matching hardware demo', 'This local lab includes three complete Arduino projects: Blink an LED, Distance alert, and Plant monitor. Describe one of those, or load a project below.');
    }
    return {
      kind: 'hardware', title: project.title, filename: project.filename, project,
      board: state.options.hardware.board, language: 'arduino', status: 'Project guide ready',
      tabs: [
        { id: 'overview', label: 'Overview' }, { id: 'code', label: 'Sketch' },
        { id: 'components', label: 'Components' }, { id: 'wiring', label: 'Wiring' }, { id: 'guide', label: 'Upload guide' }
      ],
      explainCode: project.code, explainLanguage: 'arduino'
    };
  }

  async function runCurrentTool() {
    if (state.busy) return;
    const tool = state.tool;
    const input = state.inputs[tool].trim();
    if (!input) {
      showToast('Add an idea or load an example first.', { icon: 'i-info' });
      els.input.focus();
      return;
    }
    state.busy = true;
    els.run.disabled = true;
    els.runLabel.textContent = 'Working…';
    renderLoading();
    await delay(420);

    let result;
    if (tool === 'generator') result = buildGeneratorResult(input);
    else if (tool === 'debugger') result = buildDebuggerResult(input);
    else if (tool === 'converter') result = buildConverterResult(input);
    else if (tool === 'explainer') result = buildExplainerResult(input);
    else result = buildHardwareResult(input);

    state.results[tool] = result;
    state.activeTab[tool] = result.tabs && result.tabs[0] ? result.tabs[0].id : null;
    if (result.kind !== 'unsupported') {
      addHistory({
        id: 'build-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        tool, title: result.title, filename: result.filename, time: Date.now(),
        input: state.inputs[tool], options: JSON.parse(JSON.stringify(state.options[tool])), result
      });
      els.announcement.textContent = result.title + ' output ready.';
    } else {
      els.announcement.textContent = result.title + '. ' + result.message;
    }
    if (state.tool === tool) renderResult(result);
    state.busy = false;
    els.run.disabled = false;
    els.runLabel.textContent = TOOLS[tool].runLabel;
  }

  function swapLanguages() {
    const options = state.options.converter;
    const previousSource = options.source;
    options.source = options.target;
    options.target = previousSource;
    const result = state.results.converter;
    if (result && result.kind === 'code') setInput(result.code);
    state.selectedSample.converter = null;
    renderControls();
    renderSamples();
    updateInputLabel();
    showToast('Languages swapped.', { icon: 'i-swap' });
  }

  async function copyActiveOutput() {
    const result = state.results[state.tool];
    const content = activeContent(result, state.activeTab[state.tool]);
    if (!content) return;
    try {
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(content.text);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        const helper = document.createElement('textarea');
        helper.value = content.text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        copied = document.execCommand('copy');
        helper.remove();
      }
      if (!copied) throw new Error('Copy unavailable');
      showToast('Copied to clipboard.');
      const use = els.copy.querySelector('use');
      use.setAttribute('href', '#i-check');
      setTimeout(() => use.setAttribute('href', '#i-copy'), 1400);
    } catch {
      showToast('Copy failed. Select the output and copy manually.', { icon: 'i-info' });
    }
  }

  function downloadActiveOutput() {
    const result = state.results[state.tool];
    const content = activeContent(result, state.activeTab[state.tool]);
    if (!content) return;
    const blob = new Blob([content.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = content.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Downloaded ' + content.filename + '.', { icon: 'i-download' });
  }

  function sendToExplainer() {
    const result = state.results[state.tool];
    if (!result || !result.explainCode) return;
    state.options.explainer.language = result.explainLanguage || 'python';
    state.inputs.explainer = result.explainCode;
    state.selectedSample.explainer = null;
    setTool('explainer');
    runCurrentTool();
    showToast('Sent to the Code Explainer.', { icon: 'i-book' });
  }

  function applyFixes() {
    const result = state.results.debugger;
    if (!result || !result.canApply) return;
    setInput(result.fixedCode);
    state.selectedSample.debugger = null;
    renderSamples();
    runCurrentTool();
    showToast('Suggested fixes applied to the input.', { icon: 'i-bolt' });
  }

  function resetWorkspace() {
    state.inputs = { generator: '', debugger: '', converter: '', explainer: '', hardware: '' };
    state.options = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
    state.results = {};
    state.activeTab = {};
    state.selectedSample = {};
    setTool('generator');
    showToast('Workspace reset. Your history is still saved.', { icon: 'i-reset' });
  }

  function restoreHistory(id) {
    const entry = state.history.find((item) => item.id === id);
    if (!entry) return;
    state.options[entry.tool] = { ...DEFAULT_OPTIONS[entry.tool], ...entry.options };
    state.inputs[entry.tool] = entry.input;
    state.results[entry.tool] = entry.result;
    state.selectedSample[entry.tool] = null;
    setTool(entry.tool);
    els.historyDialog.close();
    $('playground').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    showToast('Restored “' + entry.title + '”.', { icon: 'i-history' });
  }

  function deleteHistory(id) {
    const index = state.history.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [removed] = state.history.splice(index, 1);
    saveHistory();
    renderHistory();
    renderHistoryCount();
    showToast('Build removed.', {
      icon: 'i-trash', actionLabel: 'Undo', duration: 6000,
      onAction: () => {
        state.history.splice(Math.min(index, state.history.length), 0, removed);
        state.history = state.history.slice(0, 8);
        saveHistory(); renderHistory(); renderHistoryCount();
      }
    });
  }

  function clearHistory() {
    if (!state.history.length) return;
    const previous = state.history.slice();
    state.history = [];
    saveHistory();
    renderHistory();
    renderHistoryCount();
    showToast('History cleared.', {
      icon: 'i-trash', actionLabel: 'Undo', duration: 6000,
      onAction: () => { state.history = previous; saveHistory(); renderHistory(); renderHistoryCount(); }
    });
  }

  function closeMenu() {
    els.nav.classList.remove('open');
    els.header.classList.remove('menu-open');
    els.menuToggle.setAttribute('aria-expanded', 'false');
    els.menuToggle.setAttribute('aria-label', 'Open navigation');
    els.menuToggle.querySelector('use').setAttribute('href', '#i-menu');
  }

  function toggleMenu() {
    const open = els.nav.classList.toggle('open');
    els.header.classList.toggle('menu-open', open);
    els.menuToggle.setAttribute('aria-expanded', String(open));
    els.menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    els.menuToggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  function initNavigation() {
    els.menuToggle.addEventListener('click', toggleMenu);
    els.nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    const onScroll = () => {
      els.header.classList.toggle('scrolled', window.scrollY > 12);
      if (!reducedMotion && els.heroVisual && window.scrollY < 900) {
        els.heroVisual.style.transform = 'translateY(' + Math.min(window.scrollY * 0.045, 28) + 'px)';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const sections = ['tools', 'playground', 'how-it-works', 'demo-info'].map((id) => $(id)).filter(Boolean);
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-links a').forEach((link) => link.classList.toggle('active', link.dataset.section === entry.target.id));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach((section) => navObserver.observe(section));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.reveal').forEach((element) => {
      if (reducedMotion) element.classList.add('revealed');
      else revealObserver.observe(element);
    });
  }

  function initToolTabs() {
    const tabs = Array.from(document.querySelectorAll('.tool-tab'));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setTool(tab.dataset.tool));
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          event.preventDefault();
          tabs[next].focus();
          setTool(tabs[next].dataset.tool);
        }
      });
    });
    document.querySelectorAll('[data-open-tool]').forEach((link) => {
      link.addEventListener('click', () => {
        setTool(link.dataset.openTool);
        closeMenu();
      });
    });
  }

  function initEditor() {
    els.input.addEventListener('input', () => {
      state.inputs[state.tool] = els.input.value;
      updateCharCount();
    });
    els.input.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        runCurrentTool();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = els.input.selectionStart;
        const end = els.input.selectionEnd;
        els.input.value = els.input.value.slice(0, start) + '  ' + els.input.value.slice(end);
        els.input.selectionStart = els.input.selectionEnd = start + 2;
        state.inputs[state.tool] = els.input.value;
        updateCharCount();
      }
    });
    els.clearInput.addEventListener('click', () => {
      setInput('');
      state.selectedSample[state.tool] = null;
      state.results[state.tool] = null;
      renderSamples();
      renderEmpty();
      els.input.focus();
    });
    els.samples.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-sample]');
      if (chip) loadSample(chip.dataset.sample);
    });
    els.run.addEventListener('click', runCurrentTool);
    els.controls.addEventListener('change', (event) => {
      const target = event.target;
      if (target.id === 'generatorLanguage') {
        state.options.generator.language = target.value;
        state.selectedSample.generator = null;
        renderSamples();
      } else if (target.id === 'debuggerLanguage') {
        state.options.debugger.language = target.value;
        updateInputLabel();
      } else if (target.id === 'converterSource') {
        state.options.converter.source = target.value;
        if (state.options.converter.target === target.value) {
          state.options.converter.target = DATA.converter.languages.find((language) => language.id !== target.value).id;
        }
        state.selectedSample.converter = null;
        renderControls(); renderSamples(); updateInputLabel();
      } else if (target.id === 'converterTarget') {
        state.options.converter.target = target.value;
      } else if (target.id === 'explainerLanguage') {
        state.options.explainer.language = target.value;
        updateInputLabel();
      } else if (target.id === 'hardwareBoard') {
        state.options.hardware.board = target.value;
      }
    });
    els.outputTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-output-tab]');
      if (!tab) return;
      state.activeTab[state.tool] = tab.dataset.outputTab;
      renderResult(state.results[state.tool]);
    });
    els.outputTabs.addEventListener('keydown', (event) => {
      const tabs = Array.from(els.outputTabs.querySelectorAll('.output-tab'));
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (next !== null) {
        event.preventDefault();
        state.activeTab[state.tool] = tabs[next].dataset.outputTab;
        renderResult(state.results[state.tool]);
        els.outputTabs.querySelectorAll('.output-tab')[next].focus();
      }
    });
    els.outputBody.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'empty-example') {
        loadFirstExample();
        runCurrentTool();
      } else if (action.dataset.action === 'apply-fixes') {
        applyFixes();
      }
    });
    els.copy.addEventListener('click', copyActiveOutput);
    els.download.addEventListener('click', downloadActiveOutput);
    els.sendToExplainer.addEventListener('click', sendToExplainer);
    els.reset.addEventListener('click', resetWorkspace);
    els.heroRun.addEventListener('click', () => {
      state.options.generator.language = 'python';
      state.inputs.generator = DATA.generator.python[0].prompt;
      state.selectedSample.generator = DATA.generator.python[0].id;
      setTool('generator');
      $('playground').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      runCurrentTool();
    });
    els.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && document.activeElement !== els.input && els.panel.contains(document.activeElement)) {
        event.preventDefault();
        runCurrentTool();
      }
    });
  }

  function initHistory() {
    loadHistory();
    renderHistoryCount();
    els.historyToggle.addEventListener('click', () => {
      renderHistory();
      els.historyDialog.showModal();
      els.closeHistory.focus();
    });
    els.closeHistory.addEventListener('click', () => els.historyDialog.close());
    els.historyDialog.addEventListener('click', (event) => {
      if (event.target === els.historyDialog) els.historyDialog.close();
    });
    els.historyList.addEventListener('click', (event) => {
      const restore = event.target.closest('[data-restore]');
      const remove = event.target.closest('[data-delete]');
      if (restore) restoreHistory(restore.dataset.restore);
      if (remove) deleteHistory(remove.dataset.delete);
    });
    els.clearHistory.addEventListener('click', clearHistory);
  }

  function init() {
    initNavigation();
    initToolTabs();
    initEditor();
    initHistory();
    setTool('generator');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();