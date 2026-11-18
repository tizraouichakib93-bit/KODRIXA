/* KODRIXA code translator: structural parse of a supported subset into IR, then
   re-emit in the target language. Unsupported constructs are reported as limitations
   rather than silently mistranslated. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const raw = (src) => ({ e: 'raw', src: String(src).trim().replace(/;$/, '') });
  const fam = (lang) => (lang === 'python' ? 'python' : lang === 'ruby' ? 'ruby' : 'brace');
  const commentTok = (lang) => K.languages.get(lang).hl.line;

  function toFlat(source, lang) {
    const lines = String(source).split('\n');
    const f = fam(lang);
    const out = [];
    if (f === 'python') {
      const indents = lines.map((l) => (/^[ ]*/.exec(l)[0].length)).filter((n) => n > 0);
      const unit = indents.length ? Math.min(...indents) : 4;
      for (const l of lines) {
        const indent = /^[ ]*/.exec(l)[0].length;
        out.push({ text: l.trim().replace(/:$/, ''), depth: Math.floor(indent / unit) });
      }
    } else if (f === 'ruby') {
      let d = 0;
      for (const l of lines) {
        const t = l.trim();
        if (/^end\b/.test(t)) { d = Math.max(0, d - 1); continue; }
        if (/^else\b/.test(t)) { out.push({ text: t, depth: Math.max(0, d - 1) }); continue; }
        out.push({ text: t, depth: d });
        if (/^(def|if|unless|while|until|for|loop|begin|class|module)\b/.test(t) || /\bdo\b(\s*\|.*)?$/.test(t)) d++;
      }
    } else {
      let d = 0;
      for (const l of lines) {
        let t = l.trim();
        if (!t) { out.push({ text: '', depth: d }); continue; }
        if (/^\}\s*else\s*\{$/.test(t)) { d = Math.max(0, d - 1); out.push({ text: 'else', depth: d }); d++; continue; }
        if (/^\}/.test(t)) { d = Math.max(0, d - 1); continue; }
        if (/\{$/.test(t)) { out.push({ text: t.replace(/\{$/, '').trim(), depth: d }); d++; continue; }
        out.push({ text: t.replace(/;$/, ''), depth: d });
      }
    }
    return out;
  }

  function matchLine(t, lang) {
    const ct = commentTok(lang);
    if (!t) return { t: 'blank' };
    if (ct && t.startsWith(ct)) return { t: 'comment', text: t.slice(ct.length).trim() };
    if (lang === 'html' && t.startsWith('<!--')) return { t: 'comment', text: t.replace(/^<!--|-- >$/g, '').trim() };
    let m;
    // print
    const printRe = {
      python: /^print\((.*)\)$/, javascript: /^console\.log\((.*)\)$/, typescript: /^console\.log\((.*)\)$/,
      c: /^printf\((.*)\)$/, cpp: /^std::cout\s*<<\s*(.*)$/, java: /^System\.out\.println\((.*)\)$/,
      csharp: /^Console\.WriteLine\((.*)\)$/, go: /^fmt\.Println\((.*)\)$/, rust: /^println!\((.*)\)$/,
      swift: /^print\((.*)\)$/, kotlin: /^println\((.*)\)$/, ruby: /^puts\s+(.*)$/, php: /^echo\s+(.*)$/
    }[lang];
    if (printRe && (m = printRe.exec(t))) {
      let inner = m[1];
      if (lang === 'cpp') inner = inner.replace(/\s*<<\s*std::endl\s*$/, '').split('<<').map((x) => x.trim()).join(', ');
      if (lang === 'rust') inner = inner.replace(/^"[^"]*"\s*,\s*/, '');
      if (lang === 'c') inner = inner.replace(/^"[^"]*"\s*,\s*/, '');
      if (lang === 'php') inner = inner.replace(/\s*\.\s*PHP_EOL\s*$/, '').split('. " " .').join(', ');
      if (lang === 'java' || lang === 'csharp' || lang === 'kotlin') inner = inner.split('+ " " +').join(', ');
      return { t: 'print', args: [raw(inner)] };
    }
    // for-range
    if ((m = /^for\s+(\w+)\s+in\s+range\(([^)]*)\)$/.exec(t))) {
      const p = m[2].split(',').map((x) => x.trim());
      return { t: 'for', v: m[1], start: raw(p[0] || '0'), end: raw(p[1] || p[0]), step: p[2] ? Number(p[2]) : 1, block: true };
    }
    if ((m = /^for\s*\(\s*(?:int|let|var|auto)?\s*\$?(\w+)\s*=\s*([^;]+);\s*\$?\1\s*(<=|<|>=|>)\s*([^;]+);\s*\$?\1\s*(\+\+|--|\+=\s*\d+|-=\s*\d+)\s*\)$/.exec(t))) {
      const inc = m[5]; const step = inc === '++' ? 1 : inc === '--' ? -1 : Number(inc.replace(/[^\d-]/g, '')) * (inc.startsWith('-') ? -1 : 1);
      let end = m[4]; if (m[3] === '<=') end = '(' + end + ' + 1)'; if (m[3] === '>=') end = '(' + end + ' - 1)';
      return { t: 'for', v: m[1], start: raw(m[2]), end: raw(end), step: step || 1, block: true };
    }
    if ((m = /^for\s+(\w+)\s*:=\s*([^;]+);\s*\1\s*<\s*([^;]+);\s*\1\+\+$/.exec(t))) return { t: 'for', v: m[1], start: raw(m[2]), end: raw(m[3]), step: 1, block: true };
    if ((m = /^for\s+(\w+)\s+in\s+(\S+)\.\.(?:<)?(\S+)$/.exec(t))) return { t: 'for', v: m[1], start: raw(m[2]), end: raw(m[3]), step: 1, block: true };
    if ((m = /^for\s*\(\s*(\w+)\s+in\s+(\S+)\s+until\s+(\S+)\s*\)$/.exec(t))) return { t: 'for', v: m[1], start: raw(m[2]), end: raw(m[3]), step: 1, block: true };
    if ((m = /^(\S+)\.upto\(([^)]+)\)\s+do\s+\|(\w+)\|$/.exec(t))) return { t: 'for', v: m[3], start: raw(m[1]), end: raw('(' + m[2] + ' + 1)'), step: 1, block: true };
    // foreach
    const feRe = {
      python: /^for\s+(\w+)\s+in\s+(\w+)$/, javascript: /^for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+(\w+)\s*\)$/,
      typescript: /^for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+(\w+)\s*\)$/, cpp: /^for\s*\(\s*auto\s+(\w+)\s*:\s*(\w+)\s*\)$/,
      java: /^for\s*\(\s*int\s+(\w+)\s*:\s*(\w+)\s*\)$/, csharp: /^foreach\s*\(\s*var\s+(\w+)\s+in\s+(\w+)\s*\)$/,
      go: /^for\s+_,\s*(\w+)\s*:=\s+range\s+(\w+)$/, ruby: /^(\w+)\.each\s+do\s+\|(\w+)\|$/,
      php: /^foreach\s*\(\s*\$(\w+)\s+as\s+\$(\w+)\s*\)$/, kotlin: /^for\s*\(\s*(\w+)\s+in\s+(\w+)\s*\)$/,
      swift: /^for\s+(\w+)\s+in\s+(\w+)$/, rust: /^for\s+(\w+)\s+in\s+&(\w+)$/
    }[lang];
    if (feRe && (m = feRe.exec(t))) {
      const v = lang === 'ruby' || lang === 'php' ? m[2] : m[1];
      const lst = lang === 'ruby' || lang === 'php' ? m[1] : m[2];
      return { t: 'foreach', v, list: raw(lst), block: true };
    }
    // while / if / else
    if ((m = /^while\s*\(?(.+?)\)?\s*(?:do)?$/.exec(t))) return { t: 'while', cond: raw(m[1]), block: true };
    if (/^else\s*$/.test(t) || /^else:$/.test(t)) return { t: 'else' };
    if ((m = /^(?:else\s+if|elif)\s*\(?(.+?)\)?\s*(?:then)?$/.exec(t))) return { t: 'elif', cond: raw(m[1]), block: true };
    if ((m = /^if\s*\(?(.+?)\)?\s*(?:then)?$/.exec(t))) return { t: 'if', cond: raw(m[1]), block: true };
    // return
    if ((m = /^return\s*(.*)$/.exec(t))) return { t: 'return', expr: m[1] ? raw(m[1]) : null };
    // function
    if ((m = /^def\s+(\w+)\s*\(([^)]*)\)$/.exec(t)) || (m = /^function\s+(\w+)\s*\(([^)]*)\)$/.exec(t)) || (m = /^func\s+(\w+)\s*\(([^)]*)\)/.exec(t)) || (m = /^fn\s+(\w+)\s*\(([^)]*)\)/.exec(t)) || (m = /^fun\s+(\w+)\s*\(([^)]*)\)/.exec(t))) {
      return { t: 'func', name: m[1], params: m[2] ? m[2].split(',').map((x) => ({ name: x.trim().split(/[\s:]+/).pop().replace(/^\$/, ''), type: 'int' })) : [], block: true };
    }
    if ((m = /^(?:static\s+|public\s+|private\s+)?(?:void|int|double|float|bool|boolean|string|String|auto|long|char)\s+(\w+)\s*\(([^)]*)\)$/.exec(t))) {
      return { t: 'func', name: m[1], params: m[2] && m[2] !== 'void' ? m[2].split(',').map((x) => ({ name: x.trim().split(/\s+/).pop(), type: 'int' })) : [], block: true };
    }
    // assign
    if ((m = /^(?:let|const|var)\s+(\w+)\s*(?::[^=]+)?=\s*(.+)$/.exec(t))) return { t: 'assign', name: m[1], expr: raw(m[2]), type: 'auto' };
    if ((m = /^\$(\w+)\s*=\s*(.+)$/.exec(t))) return { t: 'assign', name: m[1], expr: raw(m[2]), type: 'auto' };
    if ((m = /^(\w+)\s*:=\s*(.+)$/.exec(t))) return { t: 'assign', name: m[1], expr: raw(m[2]), type: 'auto' };
    if ((m = /^(?:const\s+)?(?:int|float|double|char|bool|boolean|string|String|auto|var|val|long|short|size_t|i32|f64|Int|Double|Bool|std::string|const char\*)\s*\*?\s*(\w+)\s*(?::[^=]+)?=\s*(.+)$/.exec(t))) return { t: 'assign', name: m[1], expr: raw(m[2]), type: 'auto' };
    if ((m = /^(\w+)\s*=\s*(.+)$/.exec(t))) return { t: 'assign', name: m[1], expr: raw(m[2]), type: 'auto' };
    return null;
  }

  function build(flat, i, depth, limitations) {
    const stmts = [];
    while (i < flat.length && flat[i].depth >= depth) {
      if (flat[i].depth > depth) { i++; continue; }
      const node = matchLine(flat[i].text, build.lang);
      if (!node) { limitations.push(flat[i].text); i++; continue; }
      if (node.t === 'else' || node.t === 'elif') { i++; continue; }
      if (node.block) {
        const header = node; i++;
        const body = build(flat, i, depth + 1, limitations); i = body.next;
        let els = [];
        if (header.t === 'if' && i < flat.length && flat[i].depth === depth && /^else$/.test(flat[i].text)) {
          i++; const eb = build(flat, i, depth + 1, limitations); els = eb.stmts; i = eb.next;
        }
        if (header.t === 'for') stmts.push({ t: 'for', v: header.v, start: header.start, end: header.end, step: header.step, body: body.stmts });
        else if (header.t === 'foreach') stmts.push({ t: 'foreach', v: header.v, list: header.list, body: body.stmts });
        else if (header.t === 'while') stmts.push({ t: 'while', cond: header.cond, body: body.stmts });
        else if (header.t === 'if') stmts.push({ t: 'if', cond: header.cond, then: body.stmts, else: els });
        else if (header.t === 'func') stmts.push({ t: 'func', name: header.name, params: header.params, body: body.stmts, ret: 'auto' });
      } else { stmts.push(node); i++; }
    }
    return { stmts, next: i };
  }

  function translate(source, from, to) {
    if (from === to) return { supported: true, code: source, limitations: [], note: 'Source and target are the same language; returned unchanged.' };
    const fromCap = K.languages.get(from).cap.translate;
    const toCap = K.languages.get(to).cap.translate;
    if (fromCap === 'none' || toCap === 'none') {
      return { supported: false, code: '', limitations: [K.languages.get(from).name + ' → ' + K.languages.get(to).name + ' is not a supported translation pair (markup/SQL are not general-purpose translation targets).'] };
    }
    const flat = toFlat(source, from);
    const limitations = [];
    build.lang = from;
    const res = build(flat, 0, 0, limitations);
    if (limitations.length) {
      return { supported: false, code: '', limitations: limitations.slice(0, 12).map((l) => 'Unsupported construct: ' + l), partial: res.stmts.length };
    }
    if (!res.stmts.length) return { supported: false, code: '', limitations: ['No translatable statements were detected in the source.'] };
    const code = K.synth.emitProgram(res.stmts, to);
    return { supported: true, code, limitations: [], note: 'Structural translation of the supported subset (loops, conditionals, functions, assignments, output). Review language-specific idioms before production use.' + (fromCap === 'partial' || toCap === 'partial' ? ' One endpoint has limited translation support.' : '') };
  }
  K.translate = { translate, toFlat, matchLine };
})(window.KX);