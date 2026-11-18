/* KODRIXA · Code Translator page controller */
(function () {
  'use strict';
  const K = window.KX;
  const { $, toast, sleep, escapeHtml } = K.core;
  K.ui.injectChrome();
  K.ui.mountModeNote($('#modeNote'));

  const SAMPLES = {
    c: 'int total = 0;\nfor (int i = 1; i <= 5; i++) {\n  total = total + i;\n}\nprintf("%d\\n", total);',
    python: 'total = 0\nfor i in range(1, 6):\n    total = total + i\nprint(total)',
    javascript: 'let total = 0;\nfor (let i = 1; i <= 5; i++) {\n  total = total + i;\n}\nconsole.log(total);',
    typescript: 'let total: number = 0;\nfor (let i = 1; i <= 5; i++) {\n  total = total + i;\n}\nconsole.log(total);',
    cpp: 'int total = 0;\nfor (int i = 1; i <= 5; i++) {\n  total = total + i;\n}\nstd::cout << total << std::endl;',
    java: 'int total = 0;\nfor (int i = 1; i <= 5; i++) {\n  total = total + i;\n}\nSystem.out.println(total);',
    csharp: 'int total = 0;\nfor (int i = 1; i <= 5; i++) {\n  total = total + i;\n}\nConsole.WriteLine(total);',
    go: 'total := 0\nfor i := 1; i < 6; i++ {\n  total = total + i\n}\nfmt.Println(total)',
    rust: 'let total = 0;\nfor i in 1..6 {\n  total = total + i;\n}\nprintln!("{}", total);',
    swift: 'var total = 0\nfor i in 1..<6 {\n  total = total + i\n}\nprint(total)',
    kotlin: 'var total = 0\nfor (i in 1 until 6) {\n  total = total + i\n}\nprintln(total)',
    ruby: 'numbers = [1, 2, 3, 4, 5]\ntotal = 0\nnumbers.each do |n|\n  total = total + n\nend\nputs total',
    php: '$total = 0;\nfor ($i = 1; $i <= 5; $i++) {\n  $total = $total + $i;\n}\necho $total;'
  };

  let fromEditor = null, outEditor = null;
  const fromDd = K.dropdown.create($('#trFrom'), { value: 'c', onChange: (id) => { if (fromEditor) fromEditor.setLanguage(id); paintPair(); } });
  const toDd = K.dropdown.create($('#trTo'), { value: 'python', onChange: () => paintPair() });
  const stateEl = $('#trState'), outWrap = $('#trOutWrap'), notesEl = $('#trNotes');

  function paintPair() {
    $('#trPairLabel').textContent = K.languages.get(fromDd.getValue()).name + ' → ' + K.languages.get(toDd.getValue()).name;
  }

  fromEditor = K.editor.create($('#trSourceWrap'), { language: 'c', value: SAMPLES.c, filename: 'source.c', height: '280px' });

  $('#trSamples').innerHTML = ['c', 'python', 'javascript', 'cpp', 'java', 'go', 'ruby', 'php'].map((id) =>
    '<button type="button" class="chip" data-lang="' + id + '">' + (id === 'c' ? '★ ' : '') + K.languages.get(id).name + ' example</button>'
  ).join('');
  $('#trSamples').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    const id = b.dataset.lang;
    fromDd.setValue(id);
    fromEditor.setLanguage(id);
    fromEditor.setFilename('source.' + K.languages.get(id).ext);
    fromEditor.setValue(SAMPLES[id]);
    paintPair();
    toast('Loaded a ' + K.languages.get(id).name + ' example.', { tone: 'ok' });
  });

  $('#trSwap').addEventListener('click', () => {
    const f = fromDd.getValue(), t = toDd.getValue();
    fromDd.setValue(t); toDd.setValue(f);
    if (outEditor && outWrap.hidden === false) {
      fromEditor.setLanguage(t);
      fromEditor.setFilename('source.' + K.languages.get(t).ext);
      fromEditor.setValue(outEditor.getValue());
    } else {
      fromEditor.setLanguage(t);
      fromEditor.setFilename('source.' + K.languages.get(t).ext);
    }
    paintPair();
    toast('Languages swapped.', { tone: 'ok' });
  });

  K.ui.showEmpty(stateEl, 'Translation appears here', 'Pick a source and a target language, paste code (or load an example), then press Translate. Unsupported constructs are listed honestly instead of being guessed.');
  K.ui.bindCopy($('#trCopy'), () => outEditor ? outEditor.getValue() : '');
  K.ui.bindDownload($('#trDownload'), () => outEditor ? outEditor.getValue() : '', () => outEditor ? outEditor.getFilename() : 'translated.txt');

  function paintNotes(items, note, ok) {
    let html = '';
    if (items && items.length) html += '<ul class="limit-list">' + items.map((l) => '<li>' + escapeHtml(l) + '</li>').join('') + '</ul>';
    if (note) html += '<div class="note-box">' + (ok ? '<strong>Translation note:</strong> ' : '') + escapeHtml(note) + '</div>';
    notesEl.innerHTML = html;
  }

  async function run() {
    const source = fromEditor.getValue();
    const from = fromDd.getValue(), to = toDd.getValue();
    if (!source.trim()) {
      toast('Paste some source code first.', { tone: 'warn' });
      K.ui.showError(stateEl, 'The source editor is empty. Paste code or load one of the examples above.', run);
      outWrap.hidden = true; notesEl.innerHTML = ''; return;
    }
    outWrap.hidden = true; notesEl.innerHTML = '';
    K.ui.showLoading(stateEl, 'Translating ' + K.languages.get(from).name + ' → ' + K.languages.get(to).name + '…');
    $('#trRun').disabled = true;
    await sleep(420);
    try {
      let r;
      if (K.api.isLive()) {
        r = await K.api.call('translate', { source, from, to });
        r.supported = !!r.code;
      } else {
        r = K.translate.translate(source, from, to);
      }
      if (!r.supported || !r.code) {
        paintNotes(r.limitations || [], r.note || 'This pair or these constructs are outside the demo translator’s supported subset. Connect the AI backend for broader coverage.', false);
        K.ui.showError(stateEl, 'An accurate conversion is not possible for this input in demo mode. See the limitations below — nothing was silently mistranslated.', run);
        $('#trRun').disabled = false;
        return;
      }
      if (!outEditor) outEditor = K.editor.create(outWrap, { language: to, value: r.code, filename: 'translated.' + K.languages.get(to).ext, height: '280px' });
      else { outEditor.setLanguage(to); outEditor.setFilename('translated.' + K.languages.get(to).ext); outEditor.setValue(r.code); }
      stateEl.innerHTML = ''; outWrap.hidden = false;
      paintNotes(r.limitations || [], (K.api.isLive() ? 'Source: live AI backend. ' : '') + (r.note || ''), true);
      K.core.announce('Translated to ' + K.languages.get(to).name);
      toast('Translated to ' + K.languages.get(to).name + '.', { tone: 'ok' });
    } catch (err) {
      K.ui.showError(stateEl, err.message || 'The backend request failed.', run);
    }
    $('#trRun').disabled = false;
  }
  $('#trRun').addEventListener('click', run);
  paintPair();
})();