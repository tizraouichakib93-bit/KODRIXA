/* KODRIXA code generator: maps a natural-language description to an IR program.
   Variability comes from task detection + extracted parameters + hash-derived defaults
   + modifiers + target language. Never a single fixed example. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const { S, lit, id, bin, call, method, list, index, emitProgram } = K.synth;
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
  // Lowercase + strip diacritics so free-form requests match in any spelling
  // ("compte à rebours" === "compte a rebours", "trié" === "trie").
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function extract(desc) {
    const t = norm(desc);
    const nums = (t.match(/\d+/g) || []).map(Number);
    const nameM = /(?:called|named|appelee?|nommee?)\s+([a-z_]\w*)/.exec(t) || /(?:function|fonction)\s+(?!called\b|named\b|appelee?\b|nommee?\b)([a-z_]\w*)/.exec(t);
    // Capture the user's ACTUAL numbers. A greedy, structured sequence (a number followed by
    // one-or-more separator/number pairs) grabs the whole list. The previous lazy [\d\s,]+?
    // stopped at the first digit, failed the length check and silently used hash defaults —
    // ignoring the request. Prefer a list introduced by list/array/numbers/values, then any run.
    const seq = '-?\\d+(?:\\.\\d+)?(?:[\\s,]+-?\\d+(?:\\.\\d+)?)+';
    let raw = null;
    const anchored = new RegExp('(?:list|array|numbers|values|liste|tableau|nombres|valeurs)\\s*(?:of|de|:|=)?\\s*\\[?\\s*(' + seq + ')').exec(t);
    if (anchored) raw = anchored[1];
    else { const loose = new RegExp('(?:\\[\\s*)?(' + seq + ')(?:\\s*\\])?').exec(t); if (loose) raw = loose[1]; }
    let items = null;
    if (raw) { const parsed = raw.split(/[\s,]+/).filter(Boolean).map(Number); if (parsed.length >= 2 && parsed.every((n) => Number.isFinite(n))) items = parsed; }
    const h = hash(t);
    return {
      count: nums.length ? Math.min(Math.max(nums[0], 1), 200) : 5 + (h % 12),
      value: nums.length ? nums[0] : 10 + (h % 90),
      fname: nameM ? nameM[1] : null,
      items: items || [3 + (h % 5), 1 + (h % 9), 7 + (h % 4), 2 + (h % 6), 9 + (h % 3)],
      wantsComments: /comment|documented|explain|documente|expliqu/.test(t),
      wantsFunction: /as a function|into a function|wrap.*function|reusable function|function named|called\s+\w+|en fonction|une fonction|fonction\s+(?:nommee?|appelee?)|nommee?\s+\w+|appelee?\s+\w+/.test(t),
      wantsRecursive: /recursi/.test(t),
      h
    };
  }

  const T = [];
  const task = (id, label, keywords, build, opts) => T.push(Object.assign({ id, label, keywords, build }, opts || {}));

  task('countdown', 'Countdown timer', ['countdown', 'count down', 'timer', 'stopwatch', 'compte a rebours', 'decompte', 'minuteur', 'chronometre'], (l, p) => [
    S.comment('Count down from ' + p.count + ' to 1'),
    S.for('i', lit(p.count), lit(0), -1, [S.print(id('i'))]),
    S.print(lit('Lift off!'))
  ]);
  task('countup', 'Counting loop', ['count to', 'count up', 'counting', 'count from', 'compter', 'compte de', 'compte jusqu'], (l, p) => [
    S.comment('Count from 1 up to ' + p.count),
    S.for('i', lit(1), lit(p.count + 1), 1, [S.print(id('i'))]),
    S.print(lit('Done counting.'))
  ]);
  task('fibonacci', 'Fibonacci sequence', ['fibonacci', 'fib', 'sequence', 'series'], (l, p) => {
    if (p.wantsRecursive) return [
      S.func('fib', [{ name: 'n', type: 'int' }], [
        S.if(bin('<', id('n'), lit(2)), [S.ret(id('n'))]),
        S.ret(bin('+', call('fib', [bin('-', id('n'), lit(1))]), call('fib', [bin('-', id('n'), lit(2))])))
      ], 'int'),
      S.for('i', lit(0), lit(p.count), 1, [S.print(call('fib', [id('i')]))])
    ];
    return [
      S.comment('First ' + p.count + ' Fibonacci numbers'),
      S.assign('a', lit(0), 'int'), S.assign('b', lit(1), 'int'),
      S.for('i', lit(0), lit(p.count), 1, [
        S.print(id('a')),
        S.assign('next', bin('+', id('a'), id('b')), 'int'),
        S.assign('a', id('b'), 'int'), S.assign('b', id('next'), 'int')
      ])
    ];
  });
  task('factorial', 'Factorial', ['factorial', 'fact', 'factorielle', 'factoriel'], (l, p) => {
    if (p.wantsRecursive) return [
      S.func('fact', [{ name: 'n', type: 'int' }], [
        S.if(bin('<=', id('n'), lit(1)), [S.ret(lit(1))]),
        S.ret(bin('*', id('n'), call('fact', [bin('-', id('n'), lit(1))])))
      ], 'int'),
      S.print(lit(p.value + '! ='), call('fact', [lit(p.value)]))
    ];
    return [
      S.assign('result', lit(1), 'int'),
      S.for('i', lit(2), lit(p.value + 1), 1, [S.assign('result', bin('*', id('result'), id('i')), 'int')]),
      S.print(lit(p.value + '! ='), id('result'))
    ];
  });
  task('primes', 'Prime numbers', ['prime', 'primes', 'nombre premier', 'nombres premiers'], (l, p) => [
    S.comment('Print primes up to ' + p.count),
    S.for('n', lit(2), lit(p.count + 1), 1, [
      S.assign('is_prime', lit(1), 'int'),
      S.for('d', lit(2), id('n'), 1, [
        S.if(bin('===', bin('%', id('n'), id('d')), lit(0)), [S.assign('is_prime', lit(0), 'int')])
      ]),
      S.if(bin('===', id('is_prime'), lit(1)), [S.print(id('n'))])
    ])
  ]);
  task('palindrome', 'Palindrome check', ['palindrome'], (l, p) => [
    S.assign('n', lit(p.value), 'int'), S.assign('original', id('n'), 'int'), S.assign('rev', lit(0), 'int'),
    S.while(bin('>', id('n'), lit(0)), [
      S.assign('rev', bin('+', bin('*', id('rev'), lit(10)), bin('%', id('n'), lit(10))), 'int'),
      S.assign('n', bin('idiv', id('n'), lit(10)), 'int')
    ]),
    S.if(bin('===', id('original'), id('rev')), [S.print(lit('Palindrome'))], [S.print(lit('Not a palindrome'))])
  ]);
  task('reverse', 'Reverse a list', ['reverse', 'inverser', 'inverse', 'renverser'], (l, p) => [
    S.assign('data', list(p.items.map((n) => lit(n))), 'list'),
    S.method('data', 'reverse'),
    S.print(lit('Reversed:')), S.method('data', 'join')
  ]);
  task('sort', 'Sort a list', ['sort', 'ascending', 'ordering', 'order the', 'trier', 'trie ', 'tri ascendant', 'tri croissant', 'tri decroissant', 'ordonner', 'classer', 'ordre croissant', 'ordre decroissant'], (l, p) => [
    S.assign('data', list(p.items.map((n) => lit(n))), 'list'),
    S.method('data', 'sort'),
    S.print(lit('Sorted:')), S.method('data', 'join')
  ]);
  task('stats', 'List statistics', ['average', 'mean', 'sum', 'maximum', 'minimum', 'statistics', 'total', 'moyenne', 'somme', 'statistique'], (l, p) => [
    S.assign('data', list(p.items.map((n) => lit(n))), 'list'),
    S.assign('total', lit(0), 'int'), S.assign('big', index(id('data'), lit(0)), 'int'), S.assign('small', index(id('data'), lit(0)), 'int'),
    S.foreach('x', id('data'), [
      S.assign('total', bin('+', id('total'), id('x')), 'int'),
      S.if(bin('>', id('x'), id('big')), [S.assign('big', id('x'), 'int')]),
      S.if(bin('<', id('x'), id('small')), [S.assign('small', id('x'), 'int')])
    ]),
    S.print(lit('Sum:'), id('total')),
    S.print(lit('Max:'), id('big'), lit('Min:'), id('small')),
    S.print(lit('Average:'), bin('fdiv', id('total'), call('len', [id('data')])))
  ]);
  task('evenodd', 'Even / odd filter', ['even', 'odd', 'filter', 'pair', 'impair', 'filtrer'], (l, p) => [
    S.assign('data', list(p.items.map((n) => lit(n))), 'list'),
    S.assign('evens', list([]), 'list'),
    S.foreach('x', id('data'), [
      S.if(bin('===', bin('%', id('x'), lit(2)), lit(0)), [S.method('evens', 'append', [id('x')])])
    ]),
    S.print(lit('Even values:')), S.method('evens', 'join')
  ]);
  task('multiplication', 'Multiplication table', ['multiplication', 'times table', 'table of', 'table de multiplication'], (l, p) => [
    S.comment(p.count + ' x ' + p.count + ' multiplication table'),
    S.for('i', lit(1), lit(p.count + 1), 1, [
      S.for('j', lit(1), lit(p.count + 1), 1, [S.print(bin('*', id('i'), id('j')))])
    ])
  ]);
  task('guess', 'Number guessing game', ['guess', 'game', 'devine', 'devinette', 'jeu'], (l, p) => [
    S.assign('secret', bin('+', call('rand', [lit(p.count)]), lit(1)), 'int'),
    S.assign('tries', lit(0), 'int'), S.assign('won', lit(0), 'int'),
    S.while(bin('===', id('won'), lit(0)), [
      S.input('guess', 'Your guess: '),
      S.assign('tries', bin('+', id('tries'), lit(1)), 'int'),
      S.if(bin('===', call('int', [id('guess')]), id('secret')), [S.assign('won', lit(1), 'int'), S.print(lit('Correct!'))],
        [S.if(bin('<', call('int', [id('guess')]), id('secret')), [S.print(lit('Too low'))], [S.print(lit('Too high'))])])
    ]),
    S.print(lit('Tries:'), id('tries'))
  ], { exclude: ['html', 'sql'] });
  task('temperature', 'Temperature converter', ['temperature', 'celsius', 'fahrenheit'], (l, p) => [
    S.func('c_to_f', [{ name: 'c', type: 'float' }], [S.ret(bin('+', bin('*', id('c'), lit(1.8, 'float')), lit(32)))], 'float'),
    S.print(lit(p.value + 'C ='), call('c_to_f', [lit(p.value)]), lit('F'))
  ]);
  task('greeting', 'Greeting', ['hello', 'greet', 'greeting', 'hi there', 'bonjour', 'salut', 'saluer', 'coucou'], (l, p) => [
    S.assign('name', lit(p.fname ? p.fname : 'World'), 'str'),
    S.print(lit('Hello,'), id('name')),
    S.print(lit('Welcome to KODRIXA.'))
  ]);
  task('bmi', 'BMI calculator', ['bmi', 'body mass', 'imc', 'indice de masse', 'masse corporelle'], (l, p) => [
    S.assign('weight', lit(60 + (p.h % 30), 'float'), 'float'),
    S.assign('height', lit(1.7, 'float'), 'float'),
    S.assign('bmi', bin('/', id('weight'), bin('*', id('height'), id('height'))), 'float'),
    S.print(lit('BMI:'), id('bmi'))
  ]);
  task('todo', 'Simple list manager', ['todo', 'to-do', 'task list', 'checklist', 'manage', 'tache', 'liste de taches', 'a faire'], (l, p) => [
    S.assign('items', list([]), 'list'),
    S.method('items', 'append', [lit(p.value)]),
    S.method('items', 'append', [lit(p.value + 1)]),
    S.print(lit('Count:'), call('len', [id('items')])),
    S.foreach('x', id('items'), [S.print(id('x'))])
  ], { exclude: ['c', 'html', 'sql'] });

  function detect(desc, lang) {
    const t = norm(desc);
    let best = null, bestScore = 0;
    for (const tk of T) {
      if (tk.exclude && tk.exclude.includes(lang)) continue;
      let score = 0;
      for (const k of tk.keywords) if (t.includes(k)) score += k.length;
      if (score > bestScore) { best = tk; bestScore = score; }
    }
    return bestScore > 0 ? best : null;
  }

  // Free-form safety net: ALWAYS composes a runnable program from the request.
  // Known features drive the structure; quoted text is printed verbatim; a request
  // with no recognised feature still yields a starter scaffold (clearly labelled
  // in the notes) instead of a dead end. Live AI handles fully open-ended intent.
  function fallback(desc, lang, p) {
    const t = norm(desc);
    const feats = [];
    if (/loop|repeat|iterate|each|every|boucle|repet|chaque/.test(t)) feats.push('loop');
    if (/list|array|collection|items|numbers|liste|tableau|nombres|valeurs/.test(t)) feats.push('list');
    if (/input|ask|user|read|demande|saisir|saisie|utilisateur|lire/.test(t)) feats.push('input');
    if (/random|shuffle|chance|aleatoire|hasard|melanger/.test(t)) feats.push('random');
    if (/sort|order|trier|ordonner|classer/.test(t)) feats.push('sort');
    if (/print|display|show|say|affich|imprim|ecri/.test(t)) feats.push('print');
    if (/calcul|comput/.test(t)) feats.push('calculate');
    const quoted = /"([^"\n]{1,120})"|'([^'\n]{1,120})'|«\s*([^»\n]{1,120})\s*»/.exec(String(desc));
    const message = quoted ? (quoted[1] || quoted[2] || quoted[3]).trim() : null;
    const usesList = feats.includes('list') || feats.includes('sort') || feats.includes('loop') || feats.includes('random') || feats.includes('calculate');
    const scaffold = !feats.length && !message;
    const stmts = [S.comment(scaffold ? 'Best-effort starter composed from your free-form request' : 'Composed from detected features: ' + feats.join(', '))];
    if (feats.includes('input')) stmts.push(S.input('value', 'Enter a number: '));
    if (usesList) stmts.push(S.assign('data', list(p.items.map((n) => lit(n))), 'list'));
    if (feats.includes('random')) stmts.push(S.assign('pick', index(id('data'), call('rand', [call('len', [id('data')])])), 'int'));
    if (feats.includes('sort')) stmts.push(S.method('data', 'sort'));
    if (feats.includes('calculate')) {
      stmts.push(S.assign('total', lit(0), 'int'));
      stmts.push(S.foreach('x', id('data'), [S.assign('total', bin('+', id('total'), id('x')), 'int')]));
      stmts.push(S.print(lit('Total:'), id('total')));
    }
    if (feats.includes('loop')) stmts.push(S.foreach('x', id('data'), [S.print(id('x'))]));
    else if (feats.includes('list') || feats.includes('sort')) stmts.push(S.print(lit('Values:')), S.method('data', 'join'));
    if (feats.includes('random')) stmts.push(S.print(lit('Random pick:'), id('pick')));
    if (message) stmts.push(S.print(lit(message)));
    if (scaffold) {
      const request = String(desc).replace(/\s+/g, ' ').trim().slice(0, 100);
      stmts.push(S.comment('Request: ' + request));
      stmts.push(S.assign('request', lit(request), 'str'));
      stmts.push(S.print(lit('Request received:'), id('request')));
      stmts.push(S.comment('Extend this starter, or connect the live AI backend for a complete program.'));
    }
    return { stmts, label: scaffold ? 'Free-form starter' : 'Custom composition (' + (feats.join(' + ') || 'quoted text') + ')', scaffold };
  }

  function sqlBuild(desc, p) {
    const t = norm(desc);
    const tm = /(?:table|called|named)\s+([a-z_]\w*)/.exec(t);
    const table = tm ? tm[1] : ['users', 'products', 'orders', 'tasks', 'events'][p.h % 5];
    const col = /price|cost|amount/.test(t) ? 'price' : /age|year/.test(t) ? 'age' : 'score';
    const stmts = [
      { t: 'comment', text: 'Schema and sample queries for ' + table },
      { t: 'sql', text: 'CREATE TABLE ' + table + ' (' },
      { t: 'sql', text: '  id INTEGER PRIMARY KEY,' },
      { t: 'sql', text: '  name VARCHAR(120) NOT NULL,' },
      { t: 'sql', text: '  ' + col + ' INTEGER DEFAULT 0' },
      { t: 'sql', text: ');' },
      { t: 'blank' },
      { t: 'sql', text: "INSERT INTO " + table + " (name, " + col + ") VALUES ('alpha', " + p.value + "), ('beta', " + (p.value + 1) + "), ('gamma', " + (p.value + 2) + ');' },
      { t: 'blank' },
      { t: 'sql', text: 'SELECT name, ' + col + ' FROM ' + table + ' WHERE ' + col + ' >= ' + p.value + ' ORDER BY ' + col + ' DESC;' },
      { t: 'sql', text: 'SELECT COUNT(*) AS total, AVG(' + col + ') AS average FROM ' + table + ';' }
    ];
    return { stmts, label: 'SQL schema + queries (' + table + ')' };
  }
  function htmlBuild(desc, p) {
    const t = norm(desc);
    const kind = /form|input|signup/.test(t) ? 'form' : /nav|menu|header/.test(t) ? 'nav' : /gallery|grid|photos/.test(t) ? 'gallery' : 'card';
    const titleM = /(?:titled|called|heading)\s+"?([^",.\n]+)"?/.exec(t);
    const title = titleM ? titleM[1].trim() : ['Launch pad', 'Studio kit', 'Signal board', 'Nova panel'][p.h % 4];
    const hue = [262, 190, 330, 210][p.h % 4];
    const head = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '  <meta charset="UTF-8">', '  <meta name="viewport" content="width=device-width, initial-scale=1.0">', '  <title>' + title + '</title>', '  <style>', '    :root { --accent: hsl(' + hue + ' 85% 55%); }', '    body { margin: 0; font-family: system-ui, sans-serif; background: #f6f5ff; color: #1c1b2e; display: grid; place-items: center; min-height: 100vh; }', '    .panel { background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 18px 44px rgba(80, 60, 200, .16); max-width: 420px; width: calc(100% - 40px); }', '    h1 { margin: 0 0 8px; font-size: 26px; }', '    p { color: #5b5872; line-height: 1.6; }', '    .btn { display: inline-block; margin-top: 14px; padding: 11px 20px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }', '    .btn:hover { filter: brightness(1.08); }', '  </style>', '</head>', '<body>'];
    let body = [];
    if (kind === 'form') body = ['  <form class="panel">', '    <h1>' + title + '</h1>', '    <p>Join the list to get early access.</p>', '    <label>Email <input type="email" placeholder="you@example.com" required style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #ddd;border-radius:8px"></label>', '    <button class="btn" type="submit">Sign up</button>', '  </form>'];
    else if (kind === 'nav') body = ['  <nav class="panel" style="display:flex;gap:18px;align-items:center">', '    <strong>' + title + '</strong>', '    <a href="#">Home</a><a href="#">Docs</a><a href="#">About</a>', '    <button class="btn" style="margin-left:auto">Get started</button>', '  </nav>'];
    else if (kind === 'gallery') body = ['  <section class="panel">', '    <h1>' + title + '</h1>', '    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">', ...[0, 1, 2, 3, 4, 5].map((i) => '      <div style="aspect-ratio:1;border-radius:10px;background:hsl(' + ((hue + i * 24) % 360) + ' 80% 70%)"></div>'), '    </div>', '  </section>'];
    else body = ['  <article class="panel">', '    <h1>' + title + '</h1>', '    <p>A bright, responsive card generated from your description. Edit the markup and styles to make it yours.</p>', '    <button class="btn" onclick="this.textContent=\'Clicked!\'">Try me</button>', '  </article>'];
    const stmts = [...head, ...body, '</body>', '</html>'].map((line) => ({ t: 'html', text: line }));
    return { stmts, label: 'HTML/CSS ' + kind + ' (' + title + ')' };
  }

  function run(desc, lang) {
    const p = extract(desc);
    let stmts = null, label = null, scaffold = false;
    if (lang === 'sql') { const b = sqlBuild(desc, p); stmts = b.stmts; label = b.label; }
    else if (lang === 'html') { const b = htmlBuild(desc, p); stmts = b.stmts; label = b.label; }
    else {
      const tk = detect(desc, lang);
      if (tk) { stmts = tk.build(lang, p); label = tk.label; }
      else { const fb = fallback(desc, lang, p); if (fb) { stmts = fb.stmts; label = fb.label; scaffold = !!fb.scaffold; } }
    }
    if (!stmts) return { supported: false, code: '', notes: [], task: null };
    if (p.wantsFunction && !/func/.test(JSON.stringify(stmts.map((s) => s.t)))) {
      const fname = p.fname || 'solve';
      stmts = [S.func(fname, [], stmts, 'auto'), S.call(fname, [])];
    }
    if (p.wantsComments) stmts = [S.comment('Generated by KODRIXA from: ' + String(desc).slice(0, 80)), S.blank(), ...stmts];
    const code = emitProgram(stmts, lang);
    const notes = [
      'Pattern: ' + label,
      'Parameters: count=' + p.count + ', value=' + p.value + (p.fname ? ', name=' + p.fname : ''),
      'Modifiers: ' + [p.wantsComments && 'comments', p.wantsFunction && 'function wrapper', p.wantsRecursive && 'recursive'].filter(Boolean).join(', ') || 'none',
      'Target: ' + K.languages.get(lang).name
    ];
    if (scaffold) notes.push('Free-form starter: best-effort local composition — connect the live AI backend for a complete program from any description');
    return { supported: true, code, notes, task: label, params: p };
  }
  K.generate = { run, detect, extract, tasks: T };
})(window.KX);