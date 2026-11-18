/* KODRIXA · Code Generator page controller */
(function () {
  'use strict';
  const K = window.KX;
  const { $, toast, sleep, escapeHtml } = K.core;
  K.ui.injectChrome();
  K.ui.mountModeNote($('#modeNote'));

  const urlParams = new URLSearchParams(location.search);
  const initialLang = K.languages.byId[urlParams.get('lang')] ? urlParams.get('lang') : 'python';
  const langDd = K.dropdown.create($('#genLang'), { value: initialLang, onChange: (id) => { if (editor) editor.setLanguage(id); } });
  let editor = null;
  const stateEl = $('#genState'), wrapEl = $('#genEditorWrap'), notesEl = $('#genNotes');
  const desc = $('#genDesc');
  if (urlParams.get('prompt')) desc.value = urlParams.get('prompt');

  // quick language chips (C featured first)
  $('#genLangChips').innerHTML = ['c', 'python', 'javascript', 'cpp', 'java'].map((id) => {
    const L = K.languages.get(id);
    return '<button type="button" class="chip" data-lang="' + id + '">' + (id === 'c' ? '★ ' : '') + L.name + '</button>';
  }).join('');
  $('#genLangChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    langDd.setValue(b.dataset.lang); if (editor) editor.setLanguage(b.dataset.lang);
  });
  function updateCount() { $('#genCount').textContent = desc.value.length + ' chars'; }
  desc.addEventListener('input', updateCount); updateCount();

  K.ui.showEmpty(stateEl, 'Your code appears here', 'Write any request in your own words, pick a language, then press Generate. KODRIXA composes real code from your description — no predefined examples.');
  K.ui.bindCopy($('#genCopy'), () => editor ? editor.getValue() : '');
  K.ui.bindDownload($('#genDownload'), () => editor ? editor.getValue() : '', () => editor ? editor.getFilename() : 'code.txt');

  async function run() {
    const text = desc.value.trim();
    const lang = langDd.getValue();
    if (!text) { toast('Describe what you want to build first.', { tone: 'warn' }); K.ui.showError(stateEl, 'The description is empty. Add a sentence or two describing the program you want.', run); wrapEl.hidden = true; return; }
    wrapEl.hidden = true; notesEl.innerHTML = '';
    K.ui.showLoading(stateEl, 'Composing ' + K.languages.get(lang).name + ' code…');
    $('#genRun').disabled = true;
    await sleep(420);
    try {
      let code = null, notes = [];
      if (K.api.isLive()) {
        const r = await K.api.call('generate', { description: text, language: lang });
        code = r.code; notes = ['Source: live AI backend'];
      } else {
        const r = K.generate.run(text, lang);
        if (!r.supported) {
          $('#genRun').disabled = false;
          K.ui.showError(stateEl, 'The local engine could not compose code from this description. Try adding more detail (numbers, names, steps) — or connect the AI backend for fully open-ended generation.', run);
          return;
        }
        code = r.code; notes = r.notes;
      }
      if (!editor) { editor = K.editor.create(wrapEl, { language: lang, value: code, filename: 'generated.' + K.languages.get(lang).ext }); }
      else { editor.setLanguage(lang); editor.setFilename('generated.' + K.languages.get(lang).ext); editor.setValue(code); }
      stateEl.innerHTML = ''; wrapEl.hidden = false;
      notesEl.innerHTML = '<div class="note-box"><strong>How this was built:</strong> ' + notes.map(escapeHtml).join(' · ') + '</div>';
      K.core.announce('Code generated in ' + K.languages.get(lang).name);
      toast('Generated ' + K.languages.get(lang).name + ' code.', { tone: 'ok' });
    } catch (err) {
      K.ui.showError(stateEl, err.message || 'The backend request failed.', run);
    }
    $('#genRun').disabled = false;
  }
  $('#genRun').addEventListener('click', run);
})();