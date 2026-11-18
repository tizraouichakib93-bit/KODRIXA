(() => {
  'use strict';

  const DATA = window.KODRIXA_DATA;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const KEYWORDS = {
    python: ['import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'try', 'except', 'finally', 'with', 'raise', 'lambda', 'pass', 'break', 'continue', 'global', 'nonlocal', 'assert', 'del', 'yield', 'async', 'await'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'throw', 'class', 'extends', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'of', 'in', 'do', 'yield', 'static', 'get', 'set', 'true', 'false', 'null', 'undefined'],
    cpp: ['include', 'define', 'int', 'void', 'double', 'float', 'bool', 'long', 'char', 'auto', 'const', 'return', 'if', 'else', 'for', 'while', 'new', 'delete', 'class', 'struct', 'public', 'private', 'protected', 'namespace', 'using', 'template', 'typename', 'try', 'catch', 'throw', 'switch', 'case', 'break', 'continue', 'true', 'false', 'nullptr', 'std'],
    arduino: ['include', 'define', 'int', 'void', 'double', 'float', 'bool', 'long', 'char', 'auto', 'const', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'true', 'false', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN'],
    html: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'document', 'window', 'true', 'false', 'null']
  };

  function highlightLine(line, language) {
    const lang = KEYWORDS[language] ? language : 'javascript';
    const patterns = [];
    if (lang === 'python') patterns.push({ re: /#.*$/g, cls: 'tk-cm' });
    if (lang === 'javascript' || lang === 'cpp' || lang === 'arduino' || lang === 'html') {
      patterns.push({ re: /\/\/.*$|\/\*.*?\*\//g, cls: 'tk-cm' });
    }
    if (lang === 'html') patterns.push({ re: /<!--.*?-->/g, cls: 'tk-cm' });
    patterns.push({ re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, cls: 'tk-str' });
    if (lang === 'html') patterns.push({ re: /<\/?[A-Za-z][^>]*>/g, cls: 'tk-type' });
    if (lang === 'cpp' || lang === 'arduino') patterns.push({ re: /^#\s*[a-z]+/g, cls: 'tk-key' });
    patterns.push({ re: new RegExp('\\b(?:' + KEYWORDS[lang].join('|') + ')\\b', 'g'), cls: 'tk-key' });
    patterns.push({ re: /\b\d+(?:\.\d+)?\b/g, cls: 'tk-num' });
    patterns.push({ re: /\b[A-Za-z_$][\w$]*(?=\s*\()/g, cls: 'tk-fn' });

    let result = '';
    let pos = 0;
    while (pos < line.length) {
      let best = null;
      for (const pattern of patterns) {
        pattern.re.lastIndex = pos;
        const match = pattern.re.exec(line);
        if (match && match[0] && (!best || match.index < best.index)) {
          best = { index: match.index, text: match[0], cls: pattern.cls };
        }
      }
      if (!best) {
        result += escapeHtml(line.slice(pos));
        break;
      }
      result += escapeHtml(line.slice(pos, best.index));
      result += '<span class="' + best.cls + '">' + escapeHtml(best.text) + '</span>';
      pos = best.index + best.text.length;
    }
    return result || '&#8203;';
  }

  function normalizePrompt(value) {
    return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findGeneratorRecipe(prompt, language) {
    const recipes = DATA.generator[language] || [];
    const normalized = normalizePrompt(prompt);
    if (!normalized) return null;
    const exact = recipes.find((recipe) => normalizePrompt(recipe.prompt) === normalized);
    if (exact) return exact;
    let best = null;
    let bestScore = 0;
    for (const recipe of recipes) {
      let score = 0;
      for (const keyword of recipe.keywords) {
        if (keyword === 'convert') continue;
        if (normalized.includes(keyword)) score += keyword.length;
      }
      if (score > bestScore) {
        best = recipe;
        bestScore = score;
      }
    }
    if (best && best.id === 'temperature' && !/temperature|celsius|fahrenheit/.test(normalized)) return null;
    return bestScore > 0 ? best : null;
  }

  function normalizeCode(code) {
    return String(code)
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }

  function convertCode(code, source, target) {
    if (source === target) return null;
    const normalized = normalizeCode(code);
    const recipe = DATA.converter.recipes.find((item) => normalizeCode(item.codes[source]) === normalized);
    if (!recipe) return null;
    return { recipe, code: recipe.codes[target] };
  }

  function scanStructure(code, language) {
    const issues = [];
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    let line = 1;
    let state = 'normal';
    let quote = '';
    let stringLine = 1;
    let commentLine = 1;
    let escaped = false;

    for (let i = 0; i < code.length; i += 1) {
      const ch = code[i];
      const next = code[i + 1];
      if (ch === '\n') {
        if (state === 'string' && quote !== '`') {
          issues.push({ line: stringLine, severity: 'error', type: 'string', title: 'Unterminated string', detail: 'A quoted value opens on this line but never closes before the line ends.', suggestion: 'Close the string with a matching quote mark.', auto: false });
          state = 'normal';
        }
        state = state === 'line-comment' ? 'normal' : state;
        line += 1;
        continue;
      }
      if (state === 'line-comment') continue;
      if (state === 'block-comment') {
        if (ch === '*' && next === '/') {
          state = 'normal';
          i += 1;
        }
        continue;
      }
      if (state === 'string') {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === quote) {
          state = 'normal';
        }
        continue;
      }
      if ((language === 'javascript' || language === 'cpp' || language === 'arduino') && ch === '/' && next === '/') {
        state = 'line-comment';
        i += 1;
        continue;
      }
      if ((language === 'javascript' || language === 'cpp' || language === 'arduino') && ch === '/' && next === '*') {
        state = 'block-comment';
        commentLine = line;
        i += 1;
        continue;
      }
      if (language === 'python' && ch === '#') {
        state = 'line-comment';
        continue;
      }
      if (ch === '"' || ch === "'" || (language === 'javascript' && ch === '`')) {
        state = 'string';
        quote = ch;
        stringLine = line;
        escaped = false;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push({ char: ch, line });
      } else if (ch === ')' || ch === ']' || ch === '}') {
        const top = stack[stack.length - 1];
        if (top && top.char === pairs[ch]) {
          stack.pop();
        } else {
          issues.push({ line, severity: 'error', type: 'mismatch', title: 'Unexpected closing bracket', detail: 'Found "' + ch + '" without a matching opening bracket.', suggestion: 'Remove it or add the matching opening bracket earlier in the code.', auto: false });
        }
      }
    }

    if (state === 'block-comment') {
      issues.push({ line: commentLine, severity: 'error', type: 'comment', title: 'Unclosed block comment', detail: 'A /* comment opens but never closes.', suggestion: 'Add */ where the comment should end.', auto: false });
    }
    if (state === 'string') {
      issues.push({ line: stringLine, severity: 'error', type: 'string', title: 'Unterminated string', detail: 'A quoted value opens but never closes.', suggestion: 'Add the matching closing quote mark.', auto: false });
    }
    for (const open of stack) {
      const expected = Object.keys(pairs).find((key) => pairs[key] === open.char);
      issues.push({ line: open.line, severity: 'error', type: 'unclosed-bracket', title: 'Unclosed "' + open.char + '"', detail: 'This bracket is never closed.', suggestion: 'Add "' + expected + '" to close it. The demo appends missing closers at the end; verify their placement.', auto: true, expected });
    }
    return { issues, stack };
  }

  function analyzeCode(code, language) {
    const original = String(code).replace(/\r\n?/g, '\n');
    const lines = original.split('\n');
    const fixedLines = lines.slice();
    const issues = [];
    const structure = scanStructure(original, language);
    issues.push(...structure.issues);

    const onlyUnclosed = structure.issues.length > 0 && structure.issues.every((issue) => issue.type === 'unclosed-bracket');
    if (onlyUnclosed) {
      const closers = structure.stack.slice().reverse().map((open) => Object.keys({ ')': '(', ']': '[', '}': '{' }).find((key) => ({ ')': '(', ']': '[', '}': '{' })[key] === open.char)).join('');
      if (fixedLines.length && fixedLines[fixedLines.length - 1].trim() === '') {
        fixedLines[fixedLines.length - 1] = closers;
      } else {
        fixedLines.push(closers);
      }
    }

    if (language === 'python') {
      lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        const keyword = line.match(/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/);
        if (keyword && !line.endsWith(':') && !/[\\(,]$/.test(line) && !line.includes('#')) {
          const opens = (line.match(/[([{]/g) || []).length;
          const closes = (line.match(/[)\]}]/g) || []).length;
          if (opens === closes) {
            issues.push({ line: index + 1, severity: 'error', type: 'colon', title: 'Missing colon', detail: 'This ' + keyword[1] + ' statement needs a colon before its indented block.', suggestion: 'Add ":" at the end of the statement.', auto: true });
            fixedLines[index] = rawLine.replace(/\s*$/, '') + ':';
          }
        }
        const legacyPrint = rawLine.match(/^(\s*)print\s+(?!\()(.+?)\s*$/);
        if (legacyPrint) {
          issues.push({ line: index + 1, severity: 'error', type: 'print', title: 'Python 2 print statement', detail: 'Python 3 requires print to be called as a function.', suggestion: 'Wrap the printed value in parentheses: print(...).', auto: true });
          fixedLines[index] = legacyPrint[1] + 'print(' + legacyPrint[2] + ')';
        }
      });
    }

    if (language === 'javascript') {
      const declarations = new Map();
      lines.forEach((rawLine, index) => {
        const declaration = rawLine.match(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=/);
        if (declaration) declarations.set(declaration[1], index);
      });
      lines.forEach((rawLine, index) => {
        for (const [name, declarationIndex] of declarations) {
          if (index <= declarationIndex) continue;
          const assignment = new RegExp('^\\s*' + name.replace(/\$/g, '\\$') + '\\s*=(?!=)');
          if (assignment.test(rawLine)) {
            issues.push({ line: index + 1, severity: 'error', type: 'const', title: 'Reassigning a const', detail: '"' + name + '" was declared with const and cannot be assigned again.', suggestion: 'Declare it with let if its value needs to change.', auto: true });
            fixedLines[declarationIndex] = fixedLines[declarationIndex].replace(/^(\s*)const\b/, '$1let');
          }
        }
      });
    }

    if (language === 'cpp' || language === 'arduino') {
      lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        const nextLine = (lines[index + 1] || '').trim();
        const candidate = /^(std::cout\b.*|return\b[^;]*|(?:int|long|double|float|bool|auto|std::string|char)\s+[A-Za-z_]\w*\s*=.*)$/.test(line);
        const continuation = /^(<<|>>|\.|,|\?)/.test(nextLine);
        if (candidate && !/[;{}]$/.test(line) && !line.endsWith('\\') && !continuation && !line.startsWith('//')) {
          issues.push({ line: index + 1, severity: 'error', type: 'semicolon', title: 'Missing semicolon', detail: 'This statement appears to end without a semicolon.', suggestion: 'Add ";" at the end of the statement. Multi-line statements may need a different fix.', auto: true });
          fixedLines[index] = rawLine.replace(/\s*$/, '') + ';';
        }
      });
    }

    issues.sort((a, b) => a.line - b.line);
    const fixedCode = fixedLines.join('\n');
    return { issues, fixedCode, canApply: fixedCode !== original };
  }

  function explainLine(rawLine, language) {
    const line = rawLine.trim();
    if (!line) return { text: 'A blank line separates ideas and keeps the code easier to read.', tag: 'Formatting' };
    if ((language === 'python' && line.startsWith('#')) || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/')) {
      return { text: 'A note for people reading the code. The computer ignores it.', tag: 'Comment' };
    }

    let match = line.match(/^import\s+([\w.]+)/);
    if (match) return { text: 'Loads the "' + match[1] + '" module so the program can use its built-in tools.', tag: 'Import' };
    match = line.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
    if (match) return { text: 'Brings specific tools from "' + match[1] + '" into this file.', tag: 'Import' };
    match = line.match(/^#include\s+[<"]([^>"]+)[>"]/);
    if (match) return { text: 'Tells the compiler to bring in the "' + match[1] + '" library before building the program.', tag: 'Include' };
    match = line.match(/^import\s+.*\s+from\s+['"]([^'"]+)['"]/);
    if (match) return { text: 'Imports code from the "' + match[1] + '" module.', tag: 'Import' };

    if (/^void\s+setup\s*\(/.test(line)) return { text: 'Defines setup(), which runs once when the Arduino starts or resets. Use it for one-time preparation.', tag: 'Hardware' };
    if (/^void\s+loop\s*\(/.test(line)) return { text: 'Defines loop(), which repeats forever after setup() finishes. This is where the ongoing behavior lives.', tag: 'Hardware' };
    match = line.match(/^pinMode\s*\(\s*([^,]+),\s*(\w+)\s*\)/);
    if (match) return { text: 'Configures pin ' + match[1] + ' as ' + match[2] + ', so the board knows whether it will send or receive signals.', tag: 'Hardware' };
    match = line.match(/^digitalWrite\s*\(\s*([^,]+),\s*(.+?)\s*\)/);
    if (match) return { text: 'Sets pin ' + match[1] + ' to ' + match[2] + '. HIGH usually means on/5V; LOW means off/0V.', tag: 'Hardware' };
    match = line.match(/^delay\s*\(\s*(\d+)\s*\)/);
    if (match) return { text: 'Pauses the sketch for ' + match[1] + ' milliseconds before continuing.', tag: 'Hardware' };
    match = line.match(/^delayMicroseconds\s*\(\s*(\d+)\s*\)/);
    if (match) return { text: 'Pauses for ' + match[1] + ' microseconds — a much shorter wait than delay().', tag: 'Hardware' };
    match = line.match(/^(?:int\s+\w+\s*=\s*)?analogRead\s*\(\s*([^)]+)\s*\)/);
    if (match) return { text: 'Reads an analog voltage from pin ' + match[1] + ' and returns a number from 0 to 1023.', tag: 'Hardware' };
    match = line.match(/^Serial\.begin\s*\(\s*(\d+)\s*\)/);
    if (match) return { text: 'Starts serial communication at ' + match[1] + ' baud so the board can talk to the Serial Monitor.', tag: 'Hardware' };
    match = line.match(/^Serial\.print(?:ln)?\s*\((.*)\)/);
    if (match) return { text: 'Sends ' + (match[1] || 'a value') + ' to the Serial Monitor. println adds a new line afterward.', tag: 'Output' };
    match = line.match(/^long\s+\w+\s*=\s*pulseIn\s*\((.*)\)/);
    if (match) return { text: 'Measures how long a pin stays HIGH, with a timeout. Ultrasonic sensors use this timing to estimate distance.', tag: 'Hardware' };
    match = line.match(/^tone\s*\(/);
    if (match) return { text: 'Plays a tone on a connected speaker or buzzer pin.', tag: 'Hardware' };
    match = line.match(/^noTone\s*\(/);
    if (match) return { text: 'Stops a tone that was previously started on a pin.', tag: 'Hardware' };

    match = line.match(/^def\s+(\w+)\s*\((.*)\)\s*:/);
    if (match) return { text: 'Defines a reusable function named "' + match[1] + '". It accepts ' + (match[2] || 'no inputs') + ' and runs when called.', tag: 'Function' };
    match = line.match(/^(?:async\s+)?function\s+(\w+)\s*\((.*)\)/);
    if (match) return { text: 'Defines a reusable function named "' + match[1] + '" with ' + (match[2] || 'no parameters') + '.', tag: 'Function' };
    if (/^int\s+main\s*\(/.test(line)) return { text: 'Defines main(), the starting point of a C++ program.', tag: 'Function' };
    match = line.match(/^(?:const\s+)?(?:int|void|double|float|bool|long|char|auto|std::string)\s+(\w+)\s*\((.*)\)\s*\{?/);
    if (match) return { text: 'Defines a function named "' + match[1] + '". The code inside its braces runs when it is called.', tag: 'Function' };

    match = line.match(/^for\s+(\w+)\s+in\s+range\s*\((.*)\)\s*:/);
    if (match) return { text: 'Repeats the indented block, letting "' + match[1] + '" take each value produced by range(' + match[2] + ').', tag: 'Loop' };
    match = line.match(/^for\s*\((.*)\)/);
    if (match) return { text: 'Repeats a block while the loop condition holds. The header sets the starting value, test, and update step.', tag: 'Loop' };
    match = line.match(/^while\s+(.+?)\s*[:{]?\s*$/);
    if (match) return { text: 'Keeps repeating while this condition is true: ' + match[1] + '.', tag: 'Loop' };

    match = line.match(/^(?:if|elif)\s+(.+?)\s*[:{]?\s*$/);
    if (match) return { text: 'Checks a condition. The following block runs only when "' + match[1] + '" is true.', tag: 'Decision' };
    if (/^else\s*[:{]?\s*$/.test(line)) return { text: 'Provides the fallback path when the earlier condition was false.', tag: 'Decision' };
    match = line.match(/^return\s*(.*?);?$/);
    if (match) return { text: match[1] ? 'Sends "' + match[1] + '" back to whoever called this function and exits it.' : 'Exits the function and returns control to the caller.', tag: 'Return' };

    match = line.match(/^(?:const|let|var)\s+([\w$]+)\s*=\s*(.+?);?$/);
    if (match) return { text: 'Creates a variable named "' + match[1] + '" and stores ' + match[2] + ' in it for later use.', tag: 'Variable' };
    match = line.match(/^(?:const\s+)?(?:int|long|double|float|bool|char|auto|std::string)\s+(\w+)\s*=\s*(.+?);?$/);
    if (match) return { text: 'Declares "' + match[1] + '" with an explicit type and gives it the starting value ' + match[2] + '.', tag: 'Variable' };
    match = line.match(/^([\w,\s]+)\s*=\s*(.+)$/);
    if (match && !line.includes('==')) return { text: 'Assigns ' + match[2] + ' to ' + match[1].trim() + '. Multiple names on the left receive values in order.', tag: 'Variable' };

    match = line.match(/^print\s*\((.*)\)/);
    if (match) return { text: 'Prints ' + (match[1] || 'a value') + ' to the terminal so you can see the result.', tag: 'Output' };
    match = line.match(/^console\.log\s*\((.*)\)/);
    if (match) return { text: 'Writes ' + (match[1] || 'a value') + ' to the browser or Node.js console.', tag: 'Output' };
    if (/^std::cout\s*<</.test(line)) return { text: 'Sends text or values to the standard output stream, usually the terminal.', tag: 'Output' };
    match = line.match(/^(\w+)\.append\s*\((.*)\)/);
    if (match) return { text: 'Adds ' + match[2] + ' to the end of the "' + match[1] + '" list.', tag: 'Method' };
    if (line === '{') return { text: 'Opens a block. The indented or enclosed lines belong to the statement above.', tag: 'Block' };
    if (/^}[;]?$/.test(line)) return { text: 'Closes the current block and returns to the surrounding code.', tag: 'Block' };
    match = line.match(/^([\w.]+)\s*\((.*)\)\s*;?$/);
    if (match) return { text: 'Calls "' + match[1] + '" with ' + (match[2] || 'no arguments') + '. Its exact behavior depends on how that function is defined.', tag: 'Call' };

    return { text: 'This line is outside the demo’s built-in phrase guide. Try one of the curated examples for a complete line-by-line walkthrough.', tag: 'Outside demo' };
  }

  function explainCode(code, language) {
    const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
    const items = lines.map((line, index) => ({ line: index + 1, code: line, ...explainLine(line, language) }));
    const counts = items.reduce((acc, item) => {
      acc[item.tag] = (acc[item.tag] || 0) + 1;
      return acc;
    }, {});
    const labels = { python: 'Python', javascript: 'JavaScript', cpp: 'C++', arduino: 'Arduino C++' };
    const parts = [];
    if (counts.Function) parts.push(counts.Function + ' function definition' + (counts.Function > 1 ? 's' : ''));
    if (counts.Loop) parts.push(counts.Loop + ' loop' + (counts.Loop > 1 ? 's' : ''));
    if (counts.Decision) parts.push(counts.Decision + ' decision point' + (counts.Decision > 1 ? 's' : ''));
    if (counts.Output) parts.push(counts.Output + ' output statement' + (counts.Output > 1 ? 's' : ''));
    if (counts.Hardware) parts.push(counts.Hardware + ' hardware instruction' + (counts.Hardware > 1 ? 's' : ''));
    const label = labels[language] || 'code';
    let summary = (/^[aeiou]/i.test(label) ? 'An ' : 'A ') + label + ' snippet';
    summary += parts.length ? ' with ' + parts.join(', ') + '.' : ' walked through line by line.';
    if (counts['Outside demo']) summary += ' ' + counts['Outside demo'] + ' line(s) fall outside the built-in guide.';
    return { items, summary, unknownCount: counts['Outside demo'] || 0 };
  }

  function findHardwareProject(prompt) {
    const normalized = normalizePrompt(prompt);
    if (!normalized) return null;
    let best = null;
    let bestScore = 0;
    for (const project of DATA.hardware) {
      let score = 0;
      if (normalized.includes(project.label.toLowerCase())) score += 20;
      for (const keyword of project.keywords) {
        if (normalized.includes(keyword)) score += keyword.length;
      }
      if (score > bestScore) {
        best = project;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function wiringDiagram(project) {
    const rows = project.wiring;
    const height = 92 + rows.length * 42;
    const rowSvg = rows.map((wire, index) => {
      const y = 78 + index * 42;
      return '<g>' +
        '<text x="34" y="' + (y + 3) + '" font-size="8" fill="#c7bbd6">' + escapeHtml(wire.from) + '</text>' +
        '<circle cx="196" cy="' + y + '" r="3" fill="' + wire.color + '"/>' +
        '<path d="M196 ' + y + ' H264" stroke="' + wire.color + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="264" cy="' + y + '" r="3" fill="' + wire.color + '"/>' +
        '<text x="276" y="' + (y + 3) + '" font-size="8" fill="#c7bbd6">' + escapeHtml(wire.to) + '</text>' +
        '</g>';
    }).join('');
    return '<svg viewBox="0 0 460 ' + height + '" role="img" aria-label="Logical wiring map for ' + escapeHtml(project.title) + '">' +
      '<rect x="0" y="0" width="460" height="' + height + '" rx="10" fill="#090b11"/>' +
      '<text x="20" y="24" font-size="8" letter-spacing="1.5" fill="#9fb37f">LOGICAL CONNECTION MAP</text>' +
      '<rect x="20" y="38" width="176" height="' + (rows.length * 42 + 24) + '" rx="8" fill="#101820" stroke="#5b8cff55"/>' +
      '<rect x="264" y="38" width="176" height="' + (rows.length * 42 + 24) + '" rx="8" fill="#141021" stroke="#a78bfa55"/>' +
      '<text x="34" y="56" font-size="7" letter-spacing="1" fill="#7f9dc9">FROM</text>' +
      '<text x="276" y="56" font-size="7" letter-spacing="1" fill="#a892c9">TO</text>' +
      rowSvg +
      '<text x="20" y="' + (height - 14) + '" font-size="7" fill="#6f6480">Connection reference only — not a physical breadboard layout.</text>' +
      '</svg>';
  }

  window.KODRIXA_ENGINE = {
    escapeHtml,
    highlightLine,
    findGeneratorRecipe,
    convertCode,
    analyzeCode,
    explainCode,
    findHardwareProject,
    wiringDiagram,
    normalizeCode
  };
})();