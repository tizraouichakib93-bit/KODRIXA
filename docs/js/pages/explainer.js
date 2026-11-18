/* KODRIXA · Code Explainer page controller */
(function () {
  'use strict';
  const K = window.KX;
  const { $, toast, sleep, escapeHtml } = K.core;
  K.ui.injectChrome();
  K.ui.mountModeNote($('#modeNote'));

  const SAMPLES = {
    c: { label: '★ C countdown', code: '#include <stdio.h>\n\nint main(void) {\n  int seconds = 5;\n  for (int i = seconds; i > 0; i--) {\n    printf("%d\\n", i);\n  }\n  return 0;\n}\n' },
    python: { label: 'Python Fibonacci', code: 'def fibonacci(count):\n    previous = 0\n    current = 1\n    for i in range(count):\n        print(previous)\n        next_value = previous + current\n        previous = current\n        current = next_value\n' },
    javascript: { label: 'JavaScript loop', code: 'const names = ["Ada", "Grace", "Linus"];\nfor (const name of names) {\n  console.log(name);\n}\n' },
    cpp: { label: 'Arduino blink', code: 'const int ledPin = 13;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(1000);\n}\n' },
    sql: { label: 'SQL query', code: "CREATE TABLE students (id INT, name TEXT);\nINSERT INTO students VALUES (1, 'Ada');\nSELECT name FROM students WHERE id = 1;\n" },
    html: { label: 'HTML page', code: '<html>\n  <head>\n    <title>KODRIXA demo</title>\n  </head>\n  <body>\n    <h1>Hello, world</h1>\n    <p>A tiny page explained line by line.</p>\n  </body>\n</html>\n' }
  };

  let srcEditor = null, lastResult = null;
  const langDd = K.dropdown.create($('#expLang'), { value: 'c', onChange: (id) => { if (srcEditor) srcEditor.setLanguage(id); } });
  const stateEl = $('#expState'), resultsEl = $('#expResults'), summaryEl = $('#expSummary');

  srcEditor = K.editor.create($('#expSourceWrap'), { language: 'c', value: SAMPLES.c.code, filename: 'example.c', height: '280px' });

  $('#expSamples').innerHTML = Object.keys(SAMPLES).map((id) =>
    '<button type="button" class="chip" data-lang="' + id + '">' + escapeHtml(SAMPLES[id].label) + '</button>'
  ).join('');
  $('#expSamples').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    const id = b.dataset.lang;
    langDd.setValue(id);
    srcEditor.setLanguage(id);
    srcEditor.setFilename('example.' + K.languages.get(id).ext);
    srcEditor.setValue(SAMPLES[id].code);
    toast('Loaded the ' + K.languages.get(id).name + ' walkthrough example.', { tone: 'ok' });
  });

  K.ui.showEmpty(stateEl, 'The walkthrough appears here', 'Paste any snippet, pick its language, then press Explain. Each line gets a plain-language step; lines outside the built-in guide are labelled honestly.');

  function walkthroughText() {
    if (!lastResult) return '';
    return lastResult.summary + '\n\n' + lastResult.items.map((it) => 'Line ' + it.line + ': ' + it.code + '\n  → ' + it.text).join('\n\n');
  }
  K.ui.bindCopy($('#expCopy'), walkthroughText);
  K.ui.bindDownload($('#expDownload'), walkthroughText, () => 'walkthrough-' + langDd.getValue() + '.txt');

  async function run() {
    const code = srcEditor.getValue();
    const lang = langDd.getValue();
    if (!code.trim()) {
      toast('Paste some code to explain first.', { tone: 'warn' });
      K.ui.showError(stateEl, 'The editor is empty. Paste code or load one of the curated examples above.', run);
      resultsEl.innerHTML = ''; summaryEl.innerHTML = ''; return;
    }
    resultsEl.innerHTML = ''; summaryEl.innerHTML = '';
    K.ui.showLoading(stateEl, 'Reading your ' + K.languages.get(lang).name + ' line by line…');
    $('#expRun').disabled = true;
    await sleep(420);
    try {
      let r;
      if (K.api.isLive()) {
        r = await K.api.call('explain', { code, language: lang });
      } else {
        r = K.explain.explain(code, lang);
      }
      lastResult = r;
      stateEl.innerHTML = '';
      summaryEl.innerHTML = '<div class="note-box"><strong>Summary:</strong> ' + escapeHtml(r.summary) + (K.api.isLive() ? ' · source: live AI backend' : '') + '</div>';
      resultsEl.innerHTML = '<div class="explain-list">' + r.items.map((it, i) =>
        '<div class="explain-item">' +
        '<span class="explain-num">' + (i + 1) + '</span>' +
        '<div><div class="explain-code">' + escapeHtml(it.code || ' ') + '</div>' +
        '<p class="explain-text">' + escapeHtml(it.text) + '</p>' +
        '<span class="explain-tag' + (it.tag === 'Outside demo' ? ' tag-out' : '') + '">' + escapeHtml(it.tag || 'Step') + ' · line ' + it.line + '</span></div></div>'
      ).join('') + '</div>';
      K.core.announce('Explanation ready: ' + r.items.length + ' steps');
      toast('Explained ' + r.items.length + ' line' + (r.items.length === 1 ? '' : 's') + '.', { tone: 'ok' });
    } catch (err) {
      K.ui.showError(stateEl, err.message || 'The backend request failed.', run);
    }
    $('#expRun').disabled = false;
  }
  $('#expRun').addEventListener('click', run);
})();