/* KODRIXA · Code Debugger page controller */
(function () {
  'use strict';
  const K = window.KX;
  const { $, toast, sleep, escapeHtml } = K.core;
  K.ui.injectChrome();
  K.ui.mountModeNote($('#modeNote'));

  const SAMPLES = {
    c: { label: 'C · missing terminator', code: '#include <stdio.h>\n\nint main(void) {\n  int count = 5\n  printf("%d\\n", count);\n' },
    python: { label: 'Python · colon + legacy print', code: 'def launch()\n    print "Ready"\n    countdown = 3\n' },
    javascript: { label: 'JavaScript · const + brace', code: 'const score = 10;\nfunction boost() {\n  score = score + 5;\n' },
    java: { label: 'Java · missing semicolon', code: 'public class Main {\n  public static void main(String[] args) {\n    int total = 7\n    System.out.println(total);\n  }\n}\n' },
    cpp: { label: 'C++ · open string', code: '#include <iostream>\n\nint main() {\n  std::cout << "Hello;\n  return 0;\n}\n' }
  };

  let srcEditor = null, fixedEditor = null, lastResult = null;
  const langDd = K.dropdown.create($('#dbgLang'), { value: 'c', onChange: (id) => { if (srcEditor) srcEditor.setLanguage(id); paintCap(); } });
  const stateEl = $('#dbgState'), resultsEl = $('#dbgResults'), fixedWrap = $('#dbgFixedWrap'), summaryEl = $('#dbgSummary');

  function paintCap() {
    const cap = K.languages.get(langDd.getValue()).cap.debug;
    $('#dbgCapNote').innerHTML = cap === 'full'
      ? 'Syntax heuristics: brackets, strings, terminators, colons, const reassignment and assignment-in-condition. This is a static check, not a compiler.'
      : 'Limited support for ' + escapeHtml(K.languages.get(langDd.getValue()).name) + ': structural checks only (brackets / strings). Dialect-specific rules are not covered in demo mode.';
  }

  srcEditor = K.editor.create($('#dbgSourceWrap'), { language: 'c', value: SAMPLES.c.code, filename: 'buggy.c', height: '280px' });

  $('#dbgSamples').innerHTML = Object.keys(SAMPLES).map((id) =>
    '<button type="button" class="chip" data-lang="' + id + '">' + (id === 'c' ? '★ ' : '') + escapeHtml(SAMPLES[id].label) + '</button>'
  ).join('');
  $('#dbgSamples').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    const id = b.dataset.lang;
    langDd.setValue(id);
    srcEditor.setLanguage(id);
    srcEditor.setFilename('buggy.' + K.languages.get(id).ext);
    srcEditor.setValue(SAMPLES[id].code);
    paintCap();
    toast('Loaded a buggy ' + K.languages.get(id).name + ' sample.', { tone: 'ok' });
  });

  K.ui.showEmpty(stateEl, 'Diagnostics appear here', 'Paste code, choose its language, then press Analyze. Every finding includes the line, an explanation and — where safe — an automatic fix.');
  K.ui.bindCopy($('#dbgCopy'), () => fixedEditor ? fixedEditor.getValue() : '');
  K.ui.bindDownload($('#dbgDownload'), () => fixedEditor ? fixedEditor.getValue() : '', () => fixedEditor ? fixedEditor.getFilename() : 'fixed.txt');

  $('#dbgApply').addEventListener('click', () => {
    if (!lastResult || !lastResult.canApply) return;
    srcEditor.setValue(lastResult.fixedCode);
    toast('Fix applied to the source editor. Re-analyze to confirm.', { tone: 'ok' });
  });

  function renderIssues(issues) {
    if (!issues.length) {
      resultsEl.innerHTML = '<div class="note-box" style="background:rgba(22,163,74,.07);border-color:rgba(22,163,74,.3);color:#166534"><strong>No syntax issues detected.</strong> The checked rules found nothing wrong. Logic errors and runtime behaviour still need real tests.</div>';
      return;
    }
    resultsEl.innerHTML = '<div class="diag-list">' + issues.map((it) =>
      '<div class="diag' + (it.severity === 'warning' ? ' warn' : '') + '">' +
      '<div class="diag-head"><span class="diag-line">Line ' + it.line + '</span><span>' + escapeHtml(it.title) + '</span><span class="diag-sev">' + (it.severity === 'warning' ? 'warning' : 'error') + '</span></div>' +
      '<p>' + escapeHtml(it.detail) + '</p></div>'
    ).join('') + '</div>';
  }

  async function run() {
    const code = srcEditor.getValue();
    const lang = langDd.getValue();
    if (!code.trim()) {
      toast('Paste some code to analyze first.', { tone: 'warn' });
      K.ui.showError(stateEl, 'The editor is empty. Paste code or load one of the buggy samples above.', run);
      resultsEl.innerHTML = ''; fixedWrap.hidden = true; summaryEl.innerHTML = ''; return;
    }
    resultsEl.innerHTML = ''; fixedWrap.hidden = true; summaryEl.innerHTML = '';
    K.ui.showLoading(stateEl, 'Scanning ' + K.languages.get(lang).name + ' for syntax issues…');
    $('#dbgRun').disabled = true; $('#dbgApply').disabled = true;
    await sleep(420);
    try {
      let r;
      if (K.api.isLive()) {
        r = await K.api.call('debug', { code, language: lang });
        r.canApply = !!r.fixedCode && r.fixedCode !== code;
      } else {
        r = K.debug.analyze(code, lang);
      }
      lastResult = r;
      stateEl.innerHTML = '';
      const errors = r.issues.filter((i) => i.severity !== 'warning').length;
      const warns = r.issues.length - errors;
      summaryEl.innerHTML = '<div class="note-box"><strong>' + r.issues.length + ' finding' + (r.issues.length === 1 ? '' : 's') + ':</strong> ' + errors + ' error' + (errors === 1 ? '' : 's') + ', ' + warns + ' warning' + (warns === 1 ? '' : 's') + (K.api.isLive() ? ' · source: live AI backend' : ' · source: local demo engine') + '</div>';
      renderIssues(r.issues);
      if (r.canApply) {
        if (!fixedEditor) fixedEditor = K.editor.create(fixedWrap, { language: lang, value: r.fixedCode, filename: 'fixed.' + K.languages.get(lang).ext, height: '240px' });
        else { fixedEditor.setLanguage(lang); fixedEditor.setFilename('fixed.' + K.languages.get(lang).ext); fixedEditor.setValue(r.fixedCode); }
        fixedWrap.hidden = false; $('#dbgApply').disabled = false;
      }
      K.core.announce(r.issues.length + ' findings');
      toast(r.issues.length ? r.issues.length + ' finding' + (r.issues.length === 1 ? '' : 's') + ' reported.' : 'No syntax issues detected.', { tone: r.issues.length ? 'warn' : 'ok' });
    } catch (err) {
      K.ui.showError(stateEl, err.message || 'The backend request failed.', run);
    }
    $('#dbgRun').disabled = false;
  }
  $('#dbgRun').addEventListener('click', run);
  paintCap();
})();