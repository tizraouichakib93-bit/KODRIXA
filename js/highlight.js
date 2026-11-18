/* KODRIXA syntax highlighter: per-language tokenizer producing safe HTML spans. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function buildPatterns(cfg) {
    const p = [];
    if (cfg.block) p.push({ re: /\/\*[\s\S]*?(?:\*\/|$)/y, cls: 'tok-com' });
    if (cfg.line) p.push({ re: new RegExp(reEsc(cfg.line) + '[^\\n]*', 'y'), cls: 'tok-com' });
    if (cfg.triple) p.push({ re: /"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)/y, cls: 'tok-str' });
    const strAlts = (cfg.strings || ['"', "'"]).map((q) => reEsc(q) + '(?:\\\\.|[^' + reEsc(q) + '\\\\\\n])*' + reEsc(q)).join('|');
    p.push({ re: new RegExp(strAlts, 'y'), cls: 'tok-str' });
    p.push({ re: /\b(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y, cls: 'tok-num' });
    p.push({ re: /[A-Za-z_$][\w$]*/y, cls: 'ident' });
    p.push({ re: /\s+/y, cls: null });
    p.push({ re: /[+\-*/%=<>!&|^~?]+/y, cls: 'tok-op' });
    p.push({ re: /[{}()[\];,.:@#]/y, cls: 'tok-punc' });
    return p;
  }
  const cache = {};
  function patternsFor(lang) {
    if (!cache[lang.id]) cache[lang.id] = buildPatterns(lang.hl);
    return cache[lang.id];
  }
  const sets = {};
  function setsFor(lang) {
    if (!sets[lang.id]) sets[lang.id] = { kw: new Set(lang.hl.kw || []), type: new Set(lang.hl.type || []), bi: new Set(lang.hl.builtin || []) };
    return sets[lang.id];
  }

  function highlightCode(code, langId) {
    const lang = K.languages.get(langId);
    if (lang.hl.markup) return highlightMarkup(code);
    const pats = patternsFor(lang);
    const S = setsFor(lang);
    const kwCase = lang.id === 'sql' ? (t) => t.toUpperCase() : (t) => t;
    let out = '';
    let pos = 0;
    const n = code.length;
    while (pos < n) {
      let matched = false;
      for (const p of pats) {
        p.re.lastIndex = pos;
        const m = p.re.exec(code);
        if (m && m.index === pos && m[0].length) {
          const text = m[0];
          if (p.cls === 'ident') {
            const key = kwCase(text);
            let cls = 'tok-id';
            if (S.kw.has(key) || S.kw.has(text)) cls = 'tok-kw';
            else if (S.type.has(key) || S.type.has(text)) cls = 'tok-type';
            else if (S.bi.has(key) || S.bi.has(text)) cls = 'tok-builtin';
            else {
              let j = pos + text.length;
              while (j < n && /\s/.test(code[j])) j++;
              if (code[j] === '(') cls = 'tok-fn';
            }
            out += '<span class="' + cls + '">' + esc(text) + '</span>';
          } else if (p.cls) {
            out += '<span class="' + p.cls + '">' + esc(text) + '</span>';
          } else {
            out += esc(text);
          }
          pos += text.length;
          matched = true;
          break;
        }
      }
      if (!matched) { out += esc(code[pos]); pos++; }
    }
    return out;
  }

  function highlightMarkup(code) {
    let out = '';
    let pos = 0;
    const n = code.length;
    const push = (cls, text) => { out += cls ? '<span class="' + cls + '">' + esc(text) + '</span>' : esc(text); };
    while (pos < n) {
      if (code.startsWith('<!--', pos)) {
        const end = code.indexOf('-->', pos);
        const stop = end === -1 ? n : end + 3;
        push('tok-com', code.slice(pos, stop)); pos = stop; continue;
      }
      if (code[pos] === '<') {
        const m = /^<\/?([A-Za-z][\w-]*)/.exec(code.slice(pos));
        if (m) {
          push('tok-punc', code[pos] === '<' && code[pos + 1] === '/' ? '</' : '<');
          pos += code[pos + 1] === '/' ? 2 : 1;
          push('tok-kw', m[1]); pos += m[1].length;
          // attributes until '>'
          while (pos < n && code[pos] !== '>') {
            if (/\s/.test(code[pos])) { push(null, code[pos]); pos++; continue; }
            if (code[pos] === '"' || code[pos] === "'") {
              const q = code[pos]; let j = pos + 1;
              while (j < n && code[j] !== q) j++;
              push('tok-str', code.slice(pos, Math.min(j + 1, n))); pos = Math.min(j + 1, n); continue;
            }
            if (code[pos] === '/' ) { push('tok-punc', '/'); pos++; continue; }
            const am = /^[A-Za-z_][\w-]*/.exec(code.slice(pos));
            if (am) { push('tok-builtin', am[0]); pos += am[0].length; continue; }
            if (code[pos] === '=') { push('tok-op', '='); pos++; continue; }
            push(null, code[pos]); pos++;
          }
          if (pos < n && code[pos] === '>') { push('tok-punc', '>'); pos++; }
          continue;
        }
      }
      // CSS-ish inside style or plain text: highlight { } props minimally
      if (code[pos] === '{' || code[pos] === '}' || code[pos] === ';') { push('tok-punc', code[pos]); pos++; continue; }
      const cm = /^[A-Za-z-]+(?=\s*:)/.exec(code.slice(pos));
      if (cm) { push('tok-type', cm[0]); pos += cm[0].length; continue; }
      const nm = /^#[0-9a-fA-F]{3,8}\b|^\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)?\b/.exec(code.slice(pos));
      if (nm) { push('tok-num', nm[0]); pos += nm[0].length; continue; }
      push(null, code[pos]); pos++;
    }
    return out;
  }

  function highlight(code, langId) { return highlightCode(String(code == null ? '' : code), langId); }
  K.highlight = { highlight, highlightCode, highlightMarkup, esc };
})(window.KX);