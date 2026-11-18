/* KODRIXA editable code editor: transparent textarea over a highlighted pre,
   synced gutter + scroll, live status bar, Tab / auto-indent support. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const { escapeHtml } = K.core;
  const INDENT = { python: 4, ruby: 4 };
  const indentUnit = (lang) => INDENT[lang] || 2;

  function create(mount, opts) {
    opts = opts || {};
    let language = opts.language || 'python';
    let filename = opts.filename || ('snippet.' + K.languages.get(language).ext);
    const root = document.createElement('div');
    root.className = 'kx-editor';
    root.innerHTML =
      '<div class="kx-editor-top">' +
        '<span class="kx-editor-file"><span class="kx-file-dot"></span><span class="kx-file-name"></span></span>' +
        '<span class="kx-editor-lang"></span>' +
      '</div>' +
      '<div class="kx-editor-body">' +
        '<div class="kx-gutter" aria-hidden="true"><div class="kx-gutter-inner"></div></div>' +
        '<div class="kx-editor-scroll">' +
          '<pre class="kx-pre" aria-hidden="true"><code class="kx-code"></code></pre>' +
          '<textarea class="kx-textarea" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="Code editor"></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="kx-editor-status">' +
        '<span class="kx-status-pos">Ln 1, Col 1</span>' +
        '<span class="kx-status-count"></span>' +
        '<span class="kx-status-lang"></span>' +
      '</div>';
    mount.appendChild(root);
    const ta = root.querySelector('.kx-textarea');
    const pre = root.querySelector('.kx-pre');
    const codeEl = root.querySelector('.kx-code');
    const gutter = root.querySelector('.kx-gutter');
    const gutterInner = root.querySelector('.kx-gutter-inner');
    const fileNameEl = root.querySelector('.kx-file-name');
    const langEl = root.querySelector('.kx-editor-lang');
    const statusLang = root.querySelector('.kx-status-lang');
    const statusPos = root.querySelector('.kx-status-pos');
    const statusCount = root.querySelector('.kx-status-count');
    if (opts.height) root.querySelector('.kx-editor-body').style.height = opts.height;
    if (opts.readOnly) { ta.readOnly = true; root.classList.add('is-readonly'); }

    function render() {
      const value = ta.value;
      codeEl.innerHTML = K.highlight.highlight(value, language) + '\n';
      const lines = value.split('\n').length;
      let g = '';
      for (let i = 1; i <= lines; i++) g += i + '\n';
      gutterInner.textContent = g;
      statusCount.textContent = lines + ' line' + (lines === 1 ? '' : 's') + ' · ' + value.length + ' chars';
      syncScroll();
      updatePos();
    }
    function syncScroll() {
      pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft;
      gutter.scrollTop = ta.scrollTop;
    }
    function updatePos() {
      const upto = ta.value.slice(0, ta.selectionStart);
      const ln = upto.split('\n').length;
      const col = upto.length - upto.lastIndexOf('\n');
      statusPos.textContent = 'Ln ' + ln + ', Col ' + col;
    }
    function setLanguage(id) {
      language = id;
      const L = K.languages.get(id);
      langEl.textContent = L.name;
      statusLang.textContent = L.name;
      ta.style.tabSize = indentUnit(id);
      pre.style.tabSize = indentUnit(id);
      render();
    }
    function setFilename(name) { filename = name; fileNameEl.textContent = name; }
    function setValue(v) { ta.value = v == null ? '' : String(v); render(); if (opts.onChange) opts.onChange(ta.value); }
    function getValue() { return ta.value; }

    ta.addEventListener('input', () => { render(); if (opts.onChange) opts.onChange(ta.value); });
    ta.addEventListener('scroll', syncScroll);
    ta.addEventListener('keyup', updatePos);
    ta.addEventListener('click', updatePos);
    ta.addEventListener('keydown', (e) => {
      const unit = ' '.repeat(indentUnit(language));
      if (e.key === 'Tab') {
        e.preventDefault();
        ta.setRangeText(unit, ta.selectionStart, ta.selectionEnd, 'end');
        render(); if (opts.onChange) opts.onChange(ta.value);
      } else if (e.key === 'Enter') {
        const start = ta.selectionStart;
        const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
        const indent = (/^[ \t]*/.exec(ta.value.slice(lineStart, start)) || [''])[0];
        e.preventDefault();
        ta.setRangeText('\n' + indent, start, ta.selectionEnd, 'end');
        render(); if (opts.onChange) opts.onChange(ta.value);
      }
    });

    fileNameEl.textContent = filename;
    setLanguage(language);
    setValue(opts.value || '');
    return {
      element: root, getValue, setValue, setLanguage,
      getLanguage: () => language, setFilename, getFilename: () => filename,
      focus: () => ta.focus(), refresh: render, textarea: ta
    };
  }
  K.editor = { create, indentUnit };
})(window.KX);