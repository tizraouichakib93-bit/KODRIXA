/* KODRIXA synthesis engine.
   Builds an intermediate representation (IR) from the user's description, then emits
   real, language-specific source. Output varies with task, parameters, modifiers and
   language — it is never a single fixed example. SQL and HTML use dedicated builders. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  const lit = (v, kind) => ({ e: 'lit', v, kind: kind || (typeof v === 'number' ? 'num' : typeof v === 'boolean' ? 'bool' : 'str') });
  const id = (name) => ({ e: 'id', name });
  const bin = (op, a, b) => ({ e: 'bin', op, a, b });
  const call = (name, args) => ({ e: 'call', name, args: args || [] });
  const method = (obj, name, args) => ({ e: 'method', obj, name, args: args || [] });
  const list = (items) => ({ e: 'list', items });
  const index = (obj, idx) => ({ e: 'index', obj, idx });
  const S = {
    comment: (text) => ({ t: 'comment', text }),
    blank: () => ({ t: 'blank' }),
    assign: (name, expr, type) => ({ t: 'assign', name, expr, type: type || 'auto' }),
    print: (...args) => ({ t: 'print', args }),
    input: (name, prompt) => ({ t: 'input', name, prompt }),
    for: (v, start, end, step, body) => ({ t: 'for', v, start, end, step: step == null ? 1 : step, body }),
    foreach: (v, listExpr, body) => ({ t: 'foreach', v, list: listExpr, body }),
    while: (cond, body) => ({ t: 'while', cond, body }),
    if: (cond, then, els) => ({ t: 'if', cond, then, else: els || [] }),
    func: (name, params, body, ret) => ({ t: 'func', name, params, body, ret: ret || 'auto' }),
    ret: (expr) => ({ t: 'return', expr }),
    method: (obj, name, args) => ({ t: 'method', obj, name, args: args || [] }),
    call: (name, args) => ({ t: 'call', name, args: args || [] }),
    import: (mod) => ({ t: 'import', mod })
  };

  /* ---------- per-language emission profiles ---------- */
  const P = {};
  function brace(id, o) { P[id] = Object.assign({ family: 'brace', end: ';', comment: '//', boolT: 'true', boolF: 'false', needsMain: false }, o); }

  const strType = { c: 'const char*', cpp: 'std::string', csharp: 'string', java: 'String', javascript: 'string', typescript: 'string', go: 'string', rust: 'String', swift: 'String', kotlin: 'String', php: 'string' };
  const intType = { c: 'int', cpp: 'int', csharp: 'int', java: 'int', javascript: 'number', typescript: 'number', go: 'int', rust: 'i32', swift: 'Int', kotlin: 'Int', php: 'int' };
  const floatType = { c: 'double', cpp: 'double', csharp: 'double', java: 'double', javascript: 'number', typescript: 'number', go: 'float64', rust: 'f64', swift: 'Double', kotlin: 'Double', php: 'float' };
  const boolType = { c: 'int', cpp: 'bool', csharp: 'bool', java: 'boolean', javascript: 'boolean', typescript: 'boolean', go: 'bool', rust: 'bool', swift: 'Bool', kotlin: 'Boolean', php: 'bool' };
  function typeFor(lang, t) {
    if (t === 'str') return strType[lang]; if (t === 'int') return intType[lang];
    if (t === 'float') return floatType[lang]; if (t === 'bool') return boolType[lang];
    return null;
  }

  brace('c', {
    needsMain: true,
    decl: (l, n, t, e) => (typeFor('c', t) || 'int') + ' ' + n + ' = ' + e,
    param: (p) => (typeFor('c', p.type) || 'int') + ' ' + p.name,
    funcSig: (l, n, ps, ret) => (ret === 'auto' ? 'void' : (typeFor('c', ret) || 'int')) + ' ' + n + '(' + (ps.length ? ps.map((p) => P.c.param(p)).join(', ') : 'void') + ')',
    print: (l, args) => 'printf("' + args.map((a) => a.kind === 'str' ? '%s' : a.kind === 'float' ? '%f' : '%d').join(' ') + '", ' + args.map((a) => a.src).join(', ') + '); putchar(10)',
    input: (l, n, prompt) => ['printf(' + q(prompt) + ')', 'int ' + n + ' = 0', 'scanf("%d", &' + n + ')'],
    forRange: (l, v, s, e, st) => 'for (int ' + v + ' = ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
    foreach: (l, v, le) => 'for (int i = 0; i < ' + le.len + '; i++)',
    whileH: (l, c) => 'while (' + c + ')',
    ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => '{' + items.join(', ') + '}',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '_len', abs: 'abs(' + a[0] + ')', sqrt: 'sqrt(' + a[0] + ')', rand: 'rand() % ' + (a[0] || '100'), str: a[0], int: a[0] }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ join: o, upper: o, lower: o, split: o, contains: 'strstr(' + o + ', ' + a[0] + ') != NULL' }[n] || o),
    top: (body, pre) => ['#include <stdio.h>', '#include <stdlib.h>', '#include <string.h>', '#include <math.h>', '', ...(pre || []), 'int main(void) {', ...body.map((x) => '  ' + x), '  return 0;', '}']
  });
  brace('cpp', {
    needsMain: true,
    decl: (l, n, t, e) => (t === 'auto' ? 'auto' : (typeFor('cpp', t) || 'auto')) + ' ' + n + ' = ' + e,
    param: (p) => (typeFor('cpp', p.type) || 'int') + ' ' + p.name,
    funcSig: (l, n, ps, ret) => (ret === 'auto' ? 'void' : (typeFor('cpp', ret) || 'int')) + ' ' + n + '(' + ps.map((p) => P.cpp.param(p)).join(', ') + ')',
    print: (l, args) => 'std::cout << ' + args.map((a) => a.src).join(' << ') + ' << std::endl',
    input: (l, n, prompt) => ['std::cout << ' + q(prompt), 'int ' + n + ' = 0', 'std::cin >> ' + n],
    forRange: (l, v, s, e, st) => 'for (int ' + v + ' = ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
    foreach: (l, v, le) => 'for (auto ' + v + ' : ' + le.src + ')',
    whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => 'std::vector<int>{' + items.join(', ') + '}',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.size()', abs: 'std::abs(' + a[0] + ')', sqrt: 'std::sqrt(' + a[0] + ')', rand: 'std::rand() % ' + (a[0] || '100'), str: 'std::to_string(' + a[0] + ')', int: a[0] }[n] || 'std::' + n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.push_back(' + a[0] + ')', push: o + '.push_back(' + a[0] + ')', sort: 'std::sort(' + o + '.begin(), ' + o + '.end())', reverse: 'std::reverse(' + o + '.begin(), ' + o + '.end())', join: o, upper: o, lower: o, split: o, contains: 'std::find(' + o + '.begin(), ' + o + '.end(), ' + a[0] + ') != ' + o + '.end()' }[n] || o),
    top: (body, pre) => ['#include <iostream>', '#include <vector>', '#include <string>', '#include <algorithm>', '#include <cmath>', '', ...(pre || []), 'int main() {', ...body.map((x) => '  ' + x), '  return 0;', '}']
  });
  function jsvm(id, ts) {
    brace(id, {
      decl: (l, n, t, e) => (ts ? 'let ' + n + ': ' + (typeFor(id, t) || 'any') : 'let ' + n) + ' = ' + e,
      param: (p) => p.name + (ts ? ': ' + (typeFor(id, p.type) || 'any') : ''),
      funcSig: (l, n, ps, ret) => 'function ' + n + '(' + ps.map((p) => P[id].param(p)).join(', ') + ')' + (ts && ret !== 'auto' ? ': ' + (typeFor(id, ret) || 'void') : ''),
      print: (l, args) => 'console.log(' + args.map((a) => a.src).join(', ') + ')',
      input: (l, n, prompt) => ['const ' + n + ' = prompt(' + q(prompt) + ')'],
      forRange: (l, v, s, e, st) => 'for (let ' + v + ' = ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
      foreach: (l, v, le) => 'for (const ' + v + ' of ' + le.src + ')',
      whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
      list: (l, items) => '[' + items.join(', ') + ']',
      index: (l, o, i) => o + '[' + i + ']',
      call: (l, n, a) => ({ len: a[0] + '.length', abs: 'Math.abs(' + a[0] + ')', sqrt: 'Math.sqrt(' + a[0] + ')', rand: 'Math.floor(Math.random() * ' + (a[0] || '100') + ')', str: 'String(' + a[0] + ')', int: 'parseInt(' + a[0] + ', 10)' }[n] || n + '(' + a.join(', ') + ')'),
      method: (l, o, n, a) => ({ append: o + '.push(' + a[0] + ')', push: o + '.push(' + a[0] + ')', sort: o + '.sort((a, b) => a - b)', reverse: o + '.reverse()', join: o + '.join(' + (a[0] || q(' ')) + ')', upper: o + '.toUpperCase()', lower: o + '.toLowerCase()', split: o + '.split(' + (a[0] || q(' ')) + ')', contains: o + '.includes(' + a[0] + ')' }[n] || o),
      top: (body) => body
    });
  }
  jsvm('javascript', false); jsvm('typescript', true);
  brace('java', {
    needsMain: true,
    decl: (l, n, t, e) => (typeFor('java', t) || 'var') + ' ' + n + ' = ' + e,
    param: (p) => (typeFor('java', p.type) || 'int') + ' ' + p.name,
    funcSig: (l, n, ps, ret) => 'static ' + (ret === 'auto' ? 'void' : (typeFor('java', ret) || 'int')) + ' ' + n + '(' + ps.map((p) => P.java.param(p)).join(', ') + ')',
    print: (l, args) => 'System.out.println(' + args.map((a) => a.src).join(' + " " + ') + ')',
    input: (l, n, prompt) => ['System.out.print(' + q(prompt) + ')', 'String ' + n + ' = new java.util.Scanner(System.in).nextLine()'],
    forRange: (l, v, s, e, st) => 'for (int ' + v + ' = ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
    foreach: (l, v, le) => 'for (int ' + v + ' : ' + le.src + ')',
    whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => 'new int[]{' + items.join(', ') + '}',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.length', abs: 'Math.abs(' + a[0] + ')', sqrt: 'Math.sqrt(' + a[0] + ')', rand: '(int)(Math.random() * ' + (a[0] || '100') + ')', str: 'String.valueOf(' + a[0] + ')', int: 'Integer.parseInt(' + a[0] + ')' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ sort: 'java.util.Arrays.sort(' + o + ')', reverse: 'for (int i = 0, j = ' + o + '.length - 1; i < j; i++, j--) { int t = ' + o + '[i]; ' + o + '[i] = ' + o + '[j]; ' + o + '[j] = t; }', join: 'String.join(" ", ' + o + ')', upper: o + '.toUpperCase()', lower: o + '.toLowerCase()', split: o + '.split(" ")', contains: o + '.contains(' + a[0] + ')' }[n] || o),
    top: (body, pre) => ['public class Main {', ...(pre || []).map((x) => x ? '  ' + x : ''), '  public static void main(String[] args) {', ...body.map((x) => '    ' + x), '  }', '}']
  });
  brace('csharp', {
    needsMain: true,
    decl: (l, n, t, e) => (typeFor('csharp', t) || 'var') + ' ' + n + ' = ' + e,
    param: (p) => (typeFor('csharp', p.type) || 'int') + ' ' + p.name,
    funcSig: (l, n, ps, ret) => 'static ' + (ret === 'auto' ? 'void' : (typeFor('csharp', ret) || 'int')) + ' ' + n + '(' + ps.map((p) => P.csharp.param(p)).join(', ') + ')',
    print: (l, args) => 'Console.WriteLine(' + args.map((a) => a.src).join(' + " " + ') + ')',
    input: (l, n, prompt) => ['Console.Write(' + q(prompt) + ')', 'string ' + n + ' = Console.ReadLine()'],
    forRange: (l, v, s, e, st) => 'for (int ' + v + ' = ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
    foreach: (l, v, le) => 'foreach (var ' + v + ' in ' + le.src + ')',
    whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => 'new int[]{' + items.join(', ') + '}',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.Length', abs: 'Math.Abs(' + a[0] + ')', sqrt: 'Math.Sqrt(' + a[0] + ')', rand: 'new Random().Next(' + (a[0] || '100') + ')', str: a[0] + '.ToString()', int: 'int.Parse(' + a[0] + ')' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ sort: 'Array.Sort(' + o + ')', reverse: 'Array.Reverse(' + o + ')', join: 'string.Join(" ", ' + o + ')', upper: o + '.ToUpper()', lower: o + '.ToLower()', split: o + '.Split(\' \')', contains: o + '.Contains(' + a[0] + ')' }[n] || o),
    top: (body, pre) => ['using System;', '', 'class Program {', ...(pre || []).map((x) => x ? '  ' + x : ''), '  static void Main() {', ...body.map((x) => '    ' + x), '  }', '}']
  });
  brace('go', {
    end: '', needsMain: true,
    decl: (l, n, t, e) => n + ' := ' + e,
    param: (p) => p.name + ' ' + (typeFor('go', p.type) || 'int'),
    funcSig: (l, n, ps, ret) => 'func ' + n + '(' + ps.map((p) => P.go.param(p)).join(', ') + ')' + (ret !== 'auto' ? ' ' + (typeFor('go', ret) || 'int') : ''),
    print: (l, args) => 'fmt.Println(' + args.map((a) => a.src).join(', ') + ')',
    input: (l, n, prompt) => ['fmt.Print(' + q(prompt) + ')', 'var ' + n + ' string', 'fmt.Scanln(&' + n + ')'],
    forRange: (l, v, s, e, st) => 'for ' + v + ' := ' + s + '; ' + v + (st > 0 ? ' < ' : ' > ') + e + '; ' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st),
    foreach: (l, v, le) => 'for _, ' + v + ' := range ' + le.src,
    whileH: (l, c) => 'for ' + c, ifH: (l, c) => 'if ' + c,
    list: (l, items) => '[]int{' + items.join(', ') + '}',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: 'len(' + a[0] + ')', abs: 'math.Abs(' + a[0] + ')', sqrt: 'math.Sqrt(' + a[0] + ')', rand: 'rand.Intn(' + (a[0] || '100') + ')', str: 'strconv.Itoa(' + a[0] + ')', int: 'strconv.Atoi(' + a[0] + ')' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + ' = append(' + o + ', ' + a[0] + ')', push: o + ' = append(' + o + ', ' + a[0] + ')', sort: 'sort.Ints(' + o + ')', reverse: 'sort.Sort(sort.Reverse(sort.IntSlice(' + o + ')))', join: 'strings.Join(' + o + ', " ")', upper: 'strings.ToUpper(' + o + ')', lower: 'strings.ToLower(' + o + ')', split: 'strings.Split(' + o + ', " ")', contains: 'strings.Contains(' + o + ', ' + a[0] + ')' }[n] || o),
    top: (body, pre) => {
      const all = (pre || []).concat(body).join('\n');
      const imps = ['  "fmt"'];
      if (/\bmath\./.test(all)) imps.push('  "math"');
      if (/\brand\./.test(all)) imps.push('  "math/rand"');
      if (/\bsort\./.test(all)) imps.push('  "sort"');
      if (/\bstrconv\./.test(all)) imps.push('  "strconv"');
      if (/\bstrings\./.test(all)) imps.push('  "strings"');
      return ['package main', '', 'import ('].concat(imps, [')', ''], pre || [], ['func main() {'], body.map((x) => '  ' + x), ['}']);
    }
  });
  brace('rust', {
    needsMain: true,
    decl: (l, n, t, e) => 'let mut ' + n + ' = ' + e,
    param: (p) => p.name + ': ' + (typeFor('rust', p.type) || 'i32'),
    funcSig: (l, n, ps, ret) => 'fn ' + n + '(' + ps.map((p) => P.rust.param(p)).join(', ') + ')' + (ret !== 'auto' ? ' -> ' + (typeFor('rust', ret) || 'i32') : ''),
    print: (l, args) => 'println!("' + args.map(() => '{}').join(' ') + '", ' + args.map((a) => a.src).join(', ') + ')',
    input: (l, n, prompt) => ['println!("' + prompt.replace(/"/g, '') + '");', 'let mut ' + n + ' = String::new();', 'std::io::stdin().read_line(&mut ' + n + ').unwrap();', 'let ' + n + ' = ' + n + '.trim().to_string();'],
    forRange: (l, v, s, e, st) => st < 0 ? 'for ' + v + ' in (' + (e + 1) + '..' + (s + 1) + ').rev()' : st > 1 ? 'for ' + v + ' in (' + s + '..' + e + ').step_by(' + st + ')' : 'for ' + v + ' in (' + s + '..' + e + ')',
    foreach: (l, v, le) => 'for ' + v + ' in &' + le.src,
    whileH: (l, c) => 'while ' + c, ifH: (l, c) => 'if ' + c,
    list: (l, items) => 'vec![' + items.join(', ') + ']',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.len()', abs: a[0] + '.abs()', sqrt: '(' + a[0] + ' as f64).sqrt()', rand: 'rand::random::<u32>() % ' + (a[0] || '100'), str: a[0] + '.to_string()', int: a[0] + '.parse::<i32>().unwrap()' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.push(' + a[0] + ')', push: o + '.push(' + a[0] + ')', sort: o + '.sort()', reverse: o + '.reverse()', join: o + '.join(" ")', upper: o + '.to_uppercase()', lower: o + '.to_lowercase()', split: o + '.split(\' \').collect::<Vec<_>>()', contains: o + '.contains(&' + a[0] + ')' }[n] || o),
    top: (body, pre) => [...(pre || []), 'fn main() {', ...body.map((x) => '    ' + x), '}']
  });
  brace('swift', {
    end: '',
    decl: (l, n, t, e) => 'var ' + n + ' = ' + e,
    param: (p) => '_ ' + p.name + ': ' + (typeFor('swift', p.type) || 'Int'),
    funcSig: (l, n, ps, ret) => 'func ' + n + '(' + ps.map((p) => P.swift.param(p)).join(', ') + ')' + (ret !== 'auto' ? ' -> ' + (typeFor('swift', ret) || 'Int') : ''),
    print: (l, args) => 'print(' + args.map((a) => a.src).join(', ') + ')',
    input: (l, n, prompt) => ['print(' + q(prompt) + ', terminator: " ")', 'let ' + n + ' = readLine() ?? ""'],
    forRange: (l, v, s, e, st) => st !== 1 ? 'for ' + v + ' in stride(from: ' + s + ', to: ' + e + ', by: ' + st + ')' : 'for ' + v + ' in ' + s + '..<' + e,
    foreach: (l, v, le) => 'for ' + v + ' in ' + le.src,
    whileH: (l, c) => 'while ' + c, ifH: (l, c) => 'if ' + c,
    list: (l, items) => '[' + items.join(', ') + ']',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.count', abs: 'abs(' + a[0] + ')', sqrt: 'sqrt(Double(' + a[0] + '))', rand: 'Int.random(in: 0..<' + (a[0] || '100') + ')', str: 'String(' + a[0] + ')', int: 'Int(' + a[0] + ') ?? 0' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.append(' + a[0] + ')', push: o + '.append(' + a[0] + ')', sort: o + '.sort()', reverse: o + '.reverse()', join: o + '.joined(separator: " ")', upper: o + '.uppercased()', lower: o + '.lowercased()', split: o + '.split(separator: " ")', contains: o + '.contains(' + a[0] + ')' }[n] || o),
    top: (body) => ['import Foundation', '', ...body]
  });
  brace('kotlin', {
    end: '', needsMain: true,
    decl: (l, n, t, e) => 'var ' + n + ' = ' + e,
    param: (p) => p.name + ': ' + (typeFor('kotlin', p.type) || 'Int'),
    funcSig: (l, n, ps, ret) => 'fun ' + n + '(' + ps.map((p) => P.kotlin.param(p)).join(', ') + ')' + (ret !== 'auto' ? ': ' + (typeFor('kotlin', ret) || 'Int') : ''),
    print: (l, args) => 'println(' + args.map((a) => a.src).join(' + " " + ') + ')',
    input: (l, n, prompt) => ['print(' + q(prompt) + ')', 'val ' + n + ' = readLine() ?: ""'],
    forRange: (l, v, s, e, st) => 'for (' + v + ' in ' + s + ' until ' + e + (st !== 1 ? ' step ' + st : '') + ')',
    foreach: (l, v, le) => 'for (' + v + ' in ' + le.src + ')',
    whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => 'mutableListOf(' + items.join(', ') + ')',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.size', abs: 'kotlin.math.abs(' + a[0] + ')', sqrt: 'kotlin.math.sqrt(' + a[0] + '.toDouble())', rand: '(0 until ' + (a[0] || '100') + ').random()', str: a[0] + '.toString()', int: a[0] + '.toInt()' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.add(' + a[0] + ')', push: o + '.add(' + a[0] + ')', sort: o + '.sort()', reverse: o + '.reverse()', join: o + '.joinToString(" ")', upper: o + '.uppercase()', lower: o + '.lowercase()', split: o + '.split(" ")', contains: o + '.contains(' + a[0] + ')' }[n] || o),
    top: (body, pre) => [...(pre || []), 'fun main() {', ...body.map((x) => '    ' + x), '}']
  });
  brace('php', {
    decl: (l, n, t, e) => '$' + n + ' = ' + e,
    param: (p) => (typeFor('php', p.type) || '') + ' $' + p.name,
    funcSig: (l, n, ps, ret) => 'function ' + n + '(' + ps.map((p) => P.php.param(p)).join(', ') + ')' + (ret !== 'auto' ? ': ' + (typeFor('php', ret) || 'int') : ''),
    print: (l, args) => 'echo ' + args.map((a) => a.src).join(' . " " . ') + ' . PHP_EOL',
    input: (l, n, prompt) => ['echo ' + q(prompt), '$' + n + ' = trim(fgets(STDIN))'],
    forRange: (l, v, s, e, st) => 'for ($' + v + ' = ' + s + '; $' + v + (st > 0 ? ' < ' : ' > ') + e + '; $' + v + (st > 0 ? ' += ' : ' -= ') + Math.abs(st) + ')',
    foreach: (l, v, le) => 'foreach (' + le.src + ' as $' + v + ')',
    whileH: (l, c) => 'while (' + c + ')', ifH: (l, c) => 'if (' + c + ')',
    list: (l, items) => '[' + items.join(', ') + ']',
    index: (l, o, i) => '$' + o + '[' + i + ']',
    call: (l, n, a) => ({ len: 'count($' + a[0] + ')', abs: 'abs($' + a[0] + ')', sqrt: 'sqrt($' + a[0] + ')', rand: 'rand(0, ' + (a[0] || '100') + ' - 1)', str: 'strval($' + a[0] + ')', int: 'intval($' + a[0] + ')' }[n] || n + '(' + a.map((x) => '$' + x).join(', ') + ')'),
    method: (l, o, n, a) => ({ append: '$' + o + '[] = ' + a[0], push: '$' + o + '[] = ' + a[0], sort: 'sort($' + o + ')', reverse: '$' + o + ' = array_reverse($' + o + ')', join: 'implode(" ", $' + o + ')', upper: 'strtoupper($' + o + ')', lower: 'strtolower($' + o + ')', split: 'explode(" ", $' + o + ')', contains: 'in_array(' + a[0] + ', $' + o + ')' }[n] || '$' + o),
    top: (body) => ['<?php', '', ...body],
    ident: (n) => '$' + n
  });
  P.python = {
    family: 'python', end: '', comment: '#', boolT: 'True', boolF: 'False',
    decl: (l, n, t, e) => n + ' = ' + e,
    param: (p) => p.name,
    funcSig: (l, n, ps) => 'def ' + n + '(' + ps.map((p) => p.name).join(', ') + ')',
    print: (l, args) => 'print(' + args.map((a) => a.src).join(', ') + ')',
    input: (l, n, prompt) => [n + ' = input(' + q(prompt) + ')'],
    forRange: (l, v, s, e, st) => 'for ' + v + ' in range(' + s + ', ' + e + (st !== 1 ? ', ' + st : '') + ')',
    foreach: (l, v, le) => 'for ' + v + ' in ' + le.src,
    whileH: (l, c) => 'while ' + c, ifH: (l, c) => 'if ' + c,
    list: (l, items) => '[' + items.join(', ') + ']',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: 'len(' + a[0] + ')', abs: 'abs(' + a[0] + ')', sqrt: 'math.sqrt(' + a[0] + ')', rand: 'random.randint(0, ' + (a[0] || '100') + ' - 1)', str: 'str(' + a[0] + ')', int: 'int(' + a[0] + ')' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.append(' + a[0] + ')', push: o + '.append(' + a[0] + ')', sort: o + '.sort()', reverse: o + '.reverse()', join: '" ".join(map(str, ' + o + '))', upper: o + '.upper()', lower: o + '.lower()', split: o + '.split()', contains: a[0] + ' in ' + o }[n] || o),
    top: (body) => {
      const all = body.join('\n');
      const imps = [];
      if (/\bmath\./.test(all)) imps.push('import math');
      if (/\brandom\./.test(all)) imps.push('import random');
      return imps.length ? imps.concat([''], body) : body;
    }
  };
  P.ruby = {
    family: 'ruby', end: '', comment: '#', boolT: 'true', boolF: 'false',
    decl: (l, n, t, e) => n + ' = ' + e,
    param: (p) => p.name,
    funcSig: (l, n, ps) => 'def ' + n + '(' + ps.map((p) => p.name).join(', ') + ')',
    print: (l, args) => 'puts ' + args.map((a) => a.src).join(', '),
    input: (l, n, prompt) => ['print ' + q(prompt), n + ' = gets.chomp'],
    forRange: (l, v, s, e, st) => (st > 0 ? s + '.upto(' + (e - 1) + ')' : s + '.downto(' + (e + 1) + ')') + ' do |' + v + '|',
    foreach: (l, v, le) => le.src + '.each do |' + v + '|',
    whileH: (l, c) => 'while ' + c, ifH: (l, c) => 'if ' + c,
    list: (l, items) => '[' + items.join(', ') + ']',
    index: (l, o, i) => o + '[' + i + ']',
    call: (l, n, a) => ({ len: a[0] + '.length', abs: a[0] + '.abs', sqrt: 'Math.sqrt(' + a[0] + ')', rand: 'rand(' + (a[0] || '100') + ')', str: a[0] + '.to_s', int: a[0] + '.to_i' }[n] || n + '(' + a.join(', ') + ')'),
    method: (l, o, n, a) => ({ append: o + '.push(' + a[0] + ')', push: o + '.push(' + a[0] + ')', sort: o + '.sort!', reverse: o + '.reverse!', join: o + '.join(" ")', upper: o + '.upcase', lower: o + '.downcase', split: o + '.split', contains: o + '.include?(' + a[0] + ')' }[n] || o),
    top: (body) => body
  };

  /* ---------- expression + statement emission ---------- */
  function fixRaw(src, lang) {
    let s = String(src);
    const py = lang === 'python', rb = lang === 'ruby';
    s = s.replace(/\blen\(([^)]+)\)/g, (m, x) => {
      x = x.trim();
      if (py) return 'len(' + x + ')';
      if (lang === 'javascript' || lang === 'typescript' || lang === 'java' || lang === 'ruby') return x + '.length';
      if (lang === 'cpp') return x + '.size()';
      if (lang === 'csharp') return x + '.Length';
      if (lang === 'go') return 'len(' + x + ')';
      if (lang === 'rust') return x + '.len()';
      if (lang === 'swift') return x + '.count';
      if (lang === 'kotlin') return x + '.size';
      if (lang === 'php') return 'count($' + x.replace(/^\$/, '') + ')';
      if (lang === 'c') return x + '_len';
      return m;
    });
    s = s.replace(/\bTrue\b/g, py || rb ? 'True' : 'true').replace(/\bFalse\b/g, py || rb ? 'False' : 'false');
    s = s.replace(/\btrue\b/g, py ? 'True' : rb ? 'true' : 'true').replace(/\bfalse\b/g, py ? 'False' : rb ? 'false' : 'false');
    if (py || rb) { s = s.replace(/&&/g, ' and ').replace(/\|\|/g, ' or '); }
    else { s = s.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||'); }
    return s;
  }
  function expr(node, lang) {
    const p = P[lang];
    const ident = p.ident || ((n) => n);
    switch (node.e) {
      case 'raw': return fixRaw(node.src, lang);
      case 'lit': return node.kind === 'str' ? q(node.v) : node.kind === 'bool' ? (node.v ? p.boolT : p.boolF) : String(node.v);
      case 'id': return ident(node.name);
      case 'bin': {
        const a = expr(node.a, lang), b = expr(node.b, lang);
        let op = node.op;
        const js = lang === 'javascript' || lang === 'typescript';
        if (op === '===') op = js ? '===' : '==';
        if (op === '!==') op = js ? '!==' : '!=';
        if (op === 'fdiv') {
          // True floating-point division even when both operands are integers, so an average
          // is never silently truncated. Each language gets the cast/coercion it requires.
          switch (lang) {
            case 'c': case 'cpp': case 'java': case 'csharp': return '((double) ' + a + ' / ' + b + ')';
            case 'go': return '(float64(' + a + ') / float64(' + b + '))';
            case 'rust': return '(' + a + ' as f64 / ' + b + ' as f64)';
            case 'swift': return '(Double(' + a + ') / Double(' + b + '))';
            case 'kotlin': return '(' + a + '.toDouble() / ' + b + '.toDouble())';
            case 'ruby': return '(' + a + '.to_f / ' + b + ')';
            default: return '(' + a + ' / ' + b + ')';
          }
        }
        if (op === 'idiv') {
          if (lang === 'python') return '(' + a + ' // ' + b + ')';
          if (js) return 'Math.floor(' + a + ' / ' + b + ')';
          op = '/';
        }
        return '(' + a + ' ' + op + ' ' + b + ')';
      }
      case 'list': return p.list(lang, node.items.map((x) => expr(x, lang)));
      case 'index': return p.index(lang, expr(node.obj, lang).replace(/^\$/, ''), expr(node.idx, lang));
      case 'call': return p.call(lang, node.name, node.args.map((x) => expr(x, lang).replace(/^\$/, '')));
      case 'method': return p.method(lang, expr(node.obj, lang).replace(/^\$/, ''), node.name, node.args.map((x) => expr(x, lang)));
      default: return '';
    }
  }
  let FUNC_TYPES = {};
  function exprMeta(node, lang) {
    let kind = 'int';
    if (node.e === 'lit') kind = node.kind;
    else if (node.e === 'call') kind = FUNC_TYPES[node.name] === 'float' ? 'float' : (node.name === 'sqrt' ? 'float' : 'int');
    else if (node.e === 'bin') {
      if (node.op === 'fdiv') kind = 'float';
      else {
        const ka = exprMeta(node.a, lang).kind, kb = exprMeta(node.b, lang).kind;
        kind = (ka === 'float' || kb === 'float') ? 'float' : (ka === 'str' || kb === 'str') ? 'str' : 'int';
      }
    }
    return { src: expr(node, lang), kind };
  }

  /* Print a collection as a space-separated line, correctly and safely per language. */
  function joinOutput(lang, obj) {
    const p = P[lang];
    const o = (p.ident || ((n) => n))(obj);
    switch (lang) {
      case 'python': return ['print(" ".join(map(str, ' + o + ')))'];
      case 'ruby': return ['puts ' + o + '.join(" ")'];
      case 'javascript': case 'typescript': return ['console.log(' + o + '.join(" "))'];
      case 'java': return ['System.out.println(java.util.Arrays.toString(' + o + '));'];
      case 'csharp': return ['Console.WriteLine(string.Join(" ", ' + o + '));'];
      case 'cpp': return ['for (auto v : ' + o + ') std::cout << v << " ";', 'std::cout << std::endl;'];
      case 'go': return ['fmt.Println(' + o + ')'];
      case 'rust': return ['println!("{:?}", ' + o + ');'];
      case 'swift': return ['print(' + o + '.map(String.init).joined(separator: " "))'];
      case 'kotlin': return ['println(' + o + '.joinToString(" "))'];
      case 'php': return ['echo implode(" ", ' + o + ') . PHP_EOL;'];
      default: return [p.print(lang, [{ src: o, kind: 'str' }]) + p.end];
    }
  }

  function emitStmts(stmts, lang, depth, out, declared) {
    declared = declared || new Set();
    const p = P[lang];
    const pad = '  '.repeat(depth);
    const end = p.end;
    const push = (line) => out.push(pad + line);
    /* Each block inherits the variables currently in scope, then tracks its own locals
       separately so a re-assignment never re-declares an outer variable. */
    const child = (extra) => { const c = new Set(declared); (extra || []).forEach((v) => c.add(v)); return c; };
    const block = (header, body, elseBody, extra) => {
      if (p.family === 'python') { push(header + ':'); emitStmts(body, lang, depth + 1, out, child(extra)); if (elseBody && elseBody.length) { push('else:'); emitStmts(elseBody, lang, depth + 1, out, child()); } }
      else if (p.family === 'ruby') { push(header); emitStmts(body, lang, depth + 1, out, child(extra)); if (elseBody && elseBody.length) { push('else'); emitStmts(elseBody, lang, depth + 1, out, child()); } push('end'); }
      else { push(header + ' {'); emitStmts(body, lang, depth + 1, out, child(extra)); if (elseBody && elseBody.length) { push('} else {'); emitStmts(elseBody, lang, depth + 1, out, child()); } push('}'); }
    };
    for (const s of stmts) {
      switch (s.t) {
        case 'comment': push(p.comment + ' ' + s.text); break;
        case 'blank': out.push(''); break;
        case 'import': push(lang === 'python' ? 'import ' + s.mod : lang === 'ruby' ? 'require ' + q(s.mod) : '// import ' + s.mod); break;
        case 'assign': {
          const e = expr(s.expr, lang);
          if (lang === 'c' && s.expr.e === 'list') {
            if (s.expr.items.length === 0) { push('int ' + s.name + '[1024]' + end); push('int ' + s.name + '_len = 0' + end); }
            else { push('int ' + s.name + '[] = ' + e + end); push('int ' + s.name + '_len = ' + s.expr.items.length + end); }
            declared.add(s.name);
          } else if (declared.has(s.name)) {
            push((p.ident || ((n) => n))(s.name) + ' = ' + e + end);
          } else {
            push(p.decl(lang, s.name, s.type, e) + end);
            declared.add(s.name);
          }
          break;
        }
        case 'print': push(p.print(lang, s.args.map((a) => exprMeta(a, lang))) + end); break;
        case 'input': p.input(lang, s.name, s.prompt).forEach((ln) => push(ln + end)); declared.add(s.name); break;
        case 'for': {
          const h = p.forRange(lang, s.v, expr(s.start, lang), expr(s.end, lang), s.step);
          if (p.family === 'ruby') { push(h); emitStmts(s.body, lang, depth + 1, out, child([s.v])); push('end'); }
          else block(h, s.body, null, [s.v]);
          break;
        }
        case 'foreach': {
          const le = { src: expr(s.list, lang), len: expr(call('len', [s.list]), lang) };
          const h = p.foreach(lang, s.v, le);
          if (p.family === 'ruby') { push(h); emitStmts(s.body, lang, depth + 1, out, child([s.v])); push('end'); }
          else if (lang === 'c') { push(h + ' {'); push('  '.repeat(depth + 1) + 'int ' + s.v + ' = ' + expr(s.list, lang) + '[i]' + end); emitStmts(s.body, lang, depth + 1, out, child([s.v, 'i'])); push('}'); }
          else block(h, s.body, null, [s.v]);
          break;
        }
        case 'while': block(p.whileH(lang, expr(s.cond, lang)), s.body); break;
        case 'if': block(p.ifH(lang, expr(s.cond, lang)), s.then, s.else); break;
        case 'func': {
          const h = p.funcSig(lang, s.name, s.params, s.ret);
          const fset = new Set(s.params.map((prm) => prm.name));
          if (p.family === 'python') { push(h + ':'); emitStmts(s.body, lang, depth + 1, out, fset); }
          else if (p.family === 'ruby') { push(h); emitStmts(s.body, lang, depth + 1, out, fset); push('end'); }
          else { push(h + ' {'); emitStmts(s.body, lang, depth + 1, out, fset); push('}'); }
          break;
        }
        case 'return': push('return ' + (s.expr ? expr(s.expr, lang) : '') + end); break;
        case 'method': {
          // Pass the bare name: emission profiles apply their own sigil (PHP prepends `$`),
          // exactly as expr() does. Applying ident here too produced `$$data` in PHP.
          const obj = s.obj;
          const args = s.args.map((a) => expr(a, lang));
          if (lang === 'c') {
            if (s.name === 'append' || s.name === 'push') { push(obj + '[' + obj + '_len++] = ' + args[0] + end); break; }
            if (s.name === 'sort') {
              push('for (int i = 0; i < ' + obj + '_len - 1; i++) {');
              push('  for (int j = 0; j < ' + obj + '_len - 1 - i; j++) {');
              push('    if (' + obj + '[j] > ' + obj + '[j + 1]) { int t = ' + obj + '[j]; ' + obj + '[j] = ' + obj + '[j + 1]; ' + obj + '[j + 1] = t; }');
              push('  }');
              push('}');
              break;
            }
            if (s.name === 'reverse') { push('for (int i = 0, j = ' + obj + '_len - 1; i < j; i++, j--) { int t = ' + obj + '[i]; ' + obj + '[i] = ' + obj + '[j]; ' + obj + '[j] = t; }' + end); break; }
            if (s.name === 'join') { push('for (int i = 0; i < ' + obj + '_len; i++) printf("%d ", ' + obj + '[i]); putchar(10)' + end); break; }
          }
          if (s.name === 'join') { joinOutput(lang, s.obj).forEach((ln) => push(ln)); break; }
          push(p.method(lang, obj, s.name, args) + end);
          break;
        }
        case 'call': push(p.call(lang, s.name, s.args.map((a) => expr(a, lang).replace(/^\$/, ''))) + end); break;
        default: break;
      }
    }
    return out;
  }
  function emitProgram(stmts, lang) {
    if (lang === 'sql') return emitSQL(stmts);
    if (lang === 'html') return emitHTML(stmts);
    const p = P[lang];
    FUNC_TYPES = {};
    stmts.forEach((s) => { if (s.t === 'func') FUNC_TYPES[s.name] = s.ret; });
    /* Languages with a main() wrapper require function definitions at file/class scope,
       never nested inside main — hoist them into the prelude. */
    const funcs = stmts.filter((s) => s.t === 'func');
    const hoist = p.needsMain && funcs.length > 0;
    const rest = hoist ? stmts.filter((s) => s.t !== 'func') : stmts;
    let pre = [];
    if (hoist) { pre = emitStmts(funcs, lang, 0, [], new Set()); pre.push(''); }
    const body = emitStmts(rest, lang, 0, [], new Set());
    const top = p.top(body, pre);
    return top.join('\n') + '\n';
  }
  function emitSQL(stmts) {
    const lines = [];
    for (const s of stmts) {
      if (s.t === 'comment') lines.push('-- ' + s.text);
      else if (s.t === 'sql') lines.push(s.text);
      else if (s.t === 'blank') lines.push('');
    }
    return lines.join('\n') + '\n';
  }
  function emitHTML(stmts) {
    const lines = [];
    for (const s of stmts) {
      if (s.t === 'comment') lines.push('<!-- ' + s.text + ' -->');
      else if (s.t === 'html') lines.push(s.text);
      else if (s.t === 'blank') lines.push('');
    }
    return lines.join('\n') + '\n';
  }

  K.synth = { S, lit, id, bin, call, method, list, index, emitProgram, expr, P };
})(window.KX);