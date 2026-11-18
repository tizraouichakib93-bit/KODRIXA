/* KODRIXA debugger: syntax-level static checks across all 15 languages.
   Detects unbalanced brackets, unterminated strings, missing terminators/colons,
   assignment-in-condition and const reassignment; produces explanations + a fixable copy.
   This is a syntax heuristic, not a compiler — disclosed in the UI. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const SEMI = ['c', 'cpp', 'csharp', 'java', 'javascript', 'typescript', 'rust', 'php'];
  const LINE_STR = { c: '"', cpp: '"', csharp: '"', java: '"', javascript: '"', typescript: '"', go: '"', rust: '"', swift: '"', kotlin: '"', php: '"', python: '"', ruby: '"', sql: "'" };
  const CONTROL = /^(if|else|for|while|switch|class|struct|func|function|fn|fun|def|try|catch|finally|except|elif|foreach|do|match|impl|enum|interface|namespace|package|import|using|include|define|elif|else if)\b/;

  function stripStringsComments(line, lang) {
    const ct = K.languages.get(lang).hl.line;
    let s = line;
    if (ct) { const i = s.indexOf(ct); if (i >= 0) s = s.slice(0, i); }
    s = s.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
    return s;
  }

  function analyze(code, lang) {
    const lines = String(code).split('\n');
    const issues = [];
    const fixes = {};
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const consts = {};
    lines.forEach((rawLine, idx) => {
      const ln = idx + 1;
      const line = rawLine.trim();
      const clean = stripStringsComments(rawLine, lang);
      // brackets
      for (const ch of clean) {
        if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch, ln });
        else if (ch === ')' || ch === ']' || ch === '}') {
          const top = stack.pop();
          if (!top) issues.push({ line: ln, severity: 'error', title: 'Unexpected closing "' + ch + '"', detail: 'There is no matching opening bracket for this closer. Remove it or add the missing opener earlier.', fix: null });
          else if (top.ch !== pairs[ch]) issues.push({ line: ln, severity: 'error', title: 'Mismatched bracket', detail: 'Opened "' + top.ch + '" on line ' + top.ln + ' but closed with "' + ch + '". Brackets must nest in order.', fix: null });
        }
      }
      // unterminated string (single-line languages)
      const qch = LINE_STR[lang];
      if (qch && !/"""|'''/.test(line)) {
        const noCom = stripStringsComments(rawLine, lang);
        const count = (noCom.match(/"/g) || []).length;
        if (count % 2 === 1) issues.push({ line: ln, severity: 'error', title: 'Unterminated string literal', detail: 'A double-quoted string opens on this line but never closes. Add the closing quote.', fix: { type: 'append', text: '"' } });
      }
      if (!line || (ct => ct && line.startsWith(ct))(K.languages.get(lang).hl.line)) return;
      // python colon
      if (lang === 'python' && CONTROL.test(line) && !line.endsWith(':') && !line.endsWith('\\')) {
        issues.push({ line: ln, severity: 'error', title: 'Missing colon', detail: 'Python block headers (def / if / for / while / class …) must end with a colon before the indented body.', fix: { type: 'append', text: ':' } });
      }
      // python2 print
      if (lang === 'python' && /^print\s+[^(=]/.test(line)) {
        issues.push({ line: ln, severity: 'error', title: 'Python 2 print statement', detail: 'Modern Python requires print(...) as a function call.', fix: { type: 'replace', text: 'print(' + line.replace(/^print\s+/, '') + ')' } });
      }
      // missing semicolon
      const funcDef = /^(?:static\s+|public\s+|private\s+)?(?:void|int|double|float|bool|boolean|string|String|auto|func|fn|fun|long|char)\s+\w+\s*\(/;
      if (SEMI.includes(lang) && !CONTROL.test(line) && !funcDef.test(line) && /[A-Za-z0-9_)\]"']$/.test(line) && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}') && !line.endsWith(',')) {
        issues.push({ line: ln, severity: 'warning', title: 'Possibly missing semicolon', detail: 'This statement appears to end without a ";" terminator, which ' + K.languages.get(lang).name + ' expects at the end of most statements.', fix: { type: 'append', text: ';' } });
      }
      // assignment in condition
      const ifm = /^if\s*\(([^)]*)\)/.exec(line);
      if (ifm && /[^=!<>]=[^=]/.test(ifm[1])) issues.push({ line: ln, severity: 'warning', title: 'Assignment inside condition', detail: 'The condition uses "=" (assignment) rather than a comparison. Use == (or ===) to compare values.', fix: null });
      // const reassignment
      const cm = /^(?:const)\s+(\w+)\s*=/.exec(line);
      if (cm) consts[cm[1]] = ln;
      const am = /^(\w+)\s*=[^=]/.exec(line);
      if (am && consts[am[1]] && !/^(const|let|var)\b/.test(line)) issues.push({ line: ln, severity: 'error', title: 'Reassigning a const', detail: '"' + am[1] + '" was declared const on line ' + consts[am[1]] + ' and cannot be reassigned. Use let/var or a new name.', fix: null });
      const last = issues[issues.length - 1];
      if (last && last.line === ln && last.fix) fixes[idx] = last.fix;
    });
    stack.forEach((s) => issues.push({ line: s.ln, severity: 'error', title: 'Unclosed "' + s.ch + '"', detail: 'This opening bracket is never closed. Add the matching closer at the end of the block.', fix: null }));
    // build fixed code
    let fixed = lines.map((l, i) => {
      const f = fixes[i];
      if (!f) return l;
      const indent = (/^\s*/.exec(l) || [''])[0];
      if (f.type === 'append') return l + f.text;
      if (f.type === 'replace') return indent + f.text;
      return l;
    });
    const closers = stack.slice().reverse().map((s) => ({ '(': ')', '[': ']', '{': '}' }[s.ch])).join('');
    let fixedCode = fixed.join('\n');
    if (closers) fixedCode += '\n' + closers;
    issues.sort((a, b) => a.line - b.line);
    return { issues, fixedCode, canApply: fixedCode !== String(code) };
  }
  K.debug = { analyze };
})(window.KX);