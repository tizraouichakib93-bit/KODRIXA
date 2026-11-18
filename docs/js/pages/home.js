/* KODRIXA · Home page controller: language strip + living hero code preview. */
(function () {
  'use strict';
  const K = window.KX;
  const { $ } = K.core;
  K.ui.injectChrome();

  /* 15-language strip — C first, featured languages highlighted */
  $('#langStrip').innerHTML = K.languages.LANGS.map((l) =>
    '<a class="lang-chip' + (l.featured ? ' core' : '') + '" href="generator.html?lang=' + l.id + '" title="' + K.core.escapeHtml(l.blurb || l.name) + '">' +
    '<b style="background:' + (K.dropdown.COLOR[l.id] || '#7c3aed') + '">' + (K.dropdown.MONO[l.id] || l.name.slice(0, 2)) + '</b>' +
    K.core.escapeHtml(l.name) + (l.id === 'c' ? ' ★' : '') + '</a>'
  ).join('');

  /* hero preview cycles real highlighted snippets */
  const SNIPPETS = [
    { lang: 'c', label: 'main.c', code: '#include <stdio.h>\n\nint main(void) {\n  for (int i = 5; i > 0; i--) {\n    printf("%d\\n", i);\n  }\n  printf("Lift off!\\n");\n  return 0;\n}' },
    { lang: 'python', label: 'fib.py', code: 'def fib(count):\n    a, b = 0, 1\n    for _ in range(count):\n        print(a)\n        a, b = b, a + b\n\nfib(12)' },
    { lang: 'javascript', label: 'greet.js', code: 'const crew = ["Ada", "Grace", "Linus"];\n\nfor (const name of crew) {\n  console.log(`Hello, ${name}!`);\n}' },
    { lang: 'cpp', label: 'blink.ino', code: 'const int ledPin = 13;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(1000);\n  digitalWrite(ledPin, LOW);\n  delay(1000);\n}' }
  ];
  const codeEl = $('#heroCode'), labelEl = $('#heroCodeLabel'), langEl = $('#heroCodeLang');
  let idx = 0;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paint() {
    const s = SNIPPETS[idx];
    labelEl.textContent = s.label;
    langEl.textContent = K.languages.get(s.lang).name;
    codeEl.innerHTML = K.highlight.highlight(s.code, s.lang);
  }
  paint();
  if (!reduced) {
    setInterval(() => {
      if (document.hidden) return;
      idx = (idx + 1) % SNIPPETS.length;
      const win = $('#heroWindow');
      win.classList.remove('swap'); void win.offsetWidth; win.classList.add('swap');
      paint();
    }, 4200);
  }
})();