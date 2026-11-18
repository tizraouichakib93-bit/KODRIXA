/* KODRIXA code explainer: beginner-friendly, line-by-line walkthrough across all
   15 languages. Lines outside the built-in phrase guide are labelled honestly. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  function explainLine(line, lang) {
    const t = line.trim();
    const ct = K.languages.get(lang).hl.line;
    if (!t) return { text: 'A blank line separates ideas and keeps the code easier to read.', tag: 'Formatting' };
    if (ct && t.startsWith(ct)) return { text: 'A note for people reading the code. The computer ignores it.', tag: 'Comment' };
    if (t.startsWith('<!--')) return { text: 'An HTML comment; browsers do not display it.', tag: 'Comment' };
    let m;
    if ((m = /^#include\s+[<"]([^>"]+)[>"]/.exec(t))) return { text: 'Tells the C/C++ compiler to bring in the "' + m[1] + '" library before building the program.', tag: 'Include' };
    if ((m = /^(?:import|from)\s+([\w.]+)/.exec(t))) return { text: 'Loads the "' + m[1] + '" module so the program can use its built-in tools.', tag: 'Import' };
    if ((m = /^using\s+([\w.]+)\s*;/.exec(t))) return { text: 'Imports the "' + m[1] + '" namespace so its types can be used without a prefix.', tag: 'Import' };
    if ((m = /^package\s+([\w.]+)/.exec(t))) return { text: 'Declares the package this file belongs to.', tag: 'Import' };
    if ((m = /^require\s+["']([^"']+)["']/.exec(t))) return { text: 'Loads the "' + m[1] + '" library.', tag: 'Import' };
    if (/^void\s+setup\s*\(/.test(t)) return { text: 'Defines setup(), which runs once when the Arduino starts.', tag: 'Hardware' };
    if (/^void\s+loop\s*\(/.test(t)) return { text: 'Defines loop(), which repeats forever after setup().', tag: 'Hardware' };
    if ((m = /^(?:def|function|fn|func|fun)\s+(\w+)\s*\(([^)]*)\)/.exec(t))) return { text: 'Defines a reusable function named "' + m[1] + '". It accepts ' + (m[2] || 'no inputs') + ' and runs when called.', tag: 'Function' };
    if (/^(?:int|void)\s+main\s*\(/.test(t)) return { text: 'Defines main(), the starting point of a C / C++ / Java-style program.', tag: 'Function' };
    if ((m = /^(?:static\s+|public\s+|private\s+)?(?:void|int|double|float|bool|string|String|auto)\s+(\w+)\s*\(([^)]*)\)/.exec(t))) return { text: 'Defines a function named "' + m[1] + '" with ' + (m[2] || 'no parameters') + '.', tag: 'Function' };
    if ((m = /^return\s*(.*)$/.exec(t))) return { text: m[1] ? 'Sends "' + m[1] + '" back to whoever called this function and exits it.' : 'Exits the function and returns control to the caller.', tag: 'Return' };
    if ((m = /^for\s+(\w+)\s+in\s+range\(([^)]*)\)/.exec(t))) return { text: 'Repeats the indented block, letting "' + m[1] + '" take each value produced by range(' + m[2] + ').', tag: 'Loop' };
    if ((m = /^for\s*\(([^;]+);([^;]+);([^)]+)\)/.exec(t))) return { text: 'A counted loop: start at ' + m[1].trim() + ', keep going while ' + m[2].trim() + ', and update with ' + m[3].trim() + ' each pass.', tag: 'Loop' };
    if ((m = /^for\s+(\w+)\s+in\s+(.+)$/.exec(t))) return { text: 'Loops "' + m[1] + '" over each item in ' + m[2] + '.', tag: 'Loop' };
    if ((m = /^for\s*\(\s*(?:const|let|var|int|auto)\s+(\w+)\s+(?:of|:)\s*(.+?)\s*\)/.exec(t))) return { text: 'Walks through every element of ' + m[2] + ', calling it "' + m[1] + '" inside the block.', tag: 'Loop' };
    if ((m = /^foreach\s*\((.+)\)/.exec(t))) return { text: 'Iterates over a collection: ' + m[1] + '.', tag: 'Loop' };
    if ((m = /^(?:while)\s*\(?(.+?)\)?\s*(?::|do)?$/.exec(t))) return { text: 'Keeps repeating while this condition is true: ' + m[1] + '.', tag: 'Loop' };
    if ((m = /^if\s*\(?(.+?)\)?\s*(?::|then)?$/.exec(t))) return { text: 'Checks a condition. The following block runs only when "' + m[1] + '" is true.', tag: 'Decision' };
    if (/^(else|elif|else if)/.test(t)) return { text: 'Provides the fallback / alternative path when the earlier condition was false.', tag: 'Decision' };
    if ((m = /^(?:let|const|var)\s+(\w+)\s*(?::[^=]+)?=\s*(.+)$/.exec(t))) return { text: 'Creates a variable named "' + m[1] + '" and stores ' + m[2] + ' in it for later use.', tag: 'Variable' };
    if ((m = /^\$(\w+)\s*=\s*(.+)$/.exec(t))) return { text: 'Creates a PHP variable "$' + m[1] + '" holding ' + m[2] + '.', tag: 'Variable' };
    if ((m = /^(?:const\s+)?(?:int|float|double|char|bool|boolean|string|String|auto|val|long|size_t|i32|f64|Int|Double|std::string|const char\*)\s*\*?\s*(\w+)\s*(?::[^=]+)?=\s*(.+)$/.exec(t))) return { text: 'Declares "' + m[1] + '" with an explicit type and gives it the starting value ' + m[2] + '.', tag: 'Variable' };
    if ((m = /^(\w+)\s*=\s*(.+)$/.exec(t)) && !t.includes('==')) return { text: 'Assigns ' + m[2] + ' to "' + m[1] + '".', tag: 'Variable' };
    if ((m = /^printf\s*\(\s*"([^"]*)"/.exec(t))) return { text: 'Prints formatted text to the terminal: "' + m[1] + '". Placeholders like %d / %s are filled by the extra arguments.', tag: 'Output' };
    if ((m = /^print\((.*)\)$/.exec(t))) return { text: 'Prints ' + (m[1] || 'a value') + ' to the terminal so you can see the result.', tag: 'Output' };
    if ((m = /^console\.log\((.*)\)$/.exec(t))) return { text: 'Writes ' + (m[1] || 'a value') + ' to the browser or Node.js console.', tag: 'Output' };
    if (/^std::cout\s*<</.test(t)) return { text: 'Sends text or values to the standard output stream (the terminal).', tag: 'Output' };
    if ((m = /^(?:System\.out\.println|Console\.WriteLine|fmt\.Println|println!|puts|echo|print)\s*\(?(.*)$/.exec(t))) return { text: 'Outputs ' + (m[1] || 'a value') + ' followed by a new line.', tag: 'Output' };
    if ((m = /^(?:scanf|fmt\.Scanln|std::cin|Console\.ReadLine|readLine|gets|input|fgets|prompt|readLine\(\))/.exec(t))) return { text: 'Reads a value from the user / standard input and stores it for later use.', tag: 'Input' };
    if ((m = /^(\w+)\.(append|push|push_back|add)\((.+)\)$/.exec(t))) return { text: 'Adds ' + m[3] + ' to the end of the "' + m[1] + '" list.', tag: 'Method' };
    if ((m = /^(\w+)\.(sort|reverse|sort!|reverse!)\(?\)?$/.exec(t))) return { text: 'Reorders the "' + m[1] + '" list in place (' + m[2].replace('!', '') + ').', tag: 'Method' };
    if (t === '{') return { text: 'Opens a block; the enclosed lines belong to the statement above.', tag: 'Block' };
    if (/^}[;]?$/.test(t)) return { text: 'Closes the current block and returns to the surrounding code.', tag: 'Block' };
    if (lang === 'sql' && /^(SELECT|INSERT|CREATE|UPDATE|DELETE|FROM|WHERE|VALUES|ORDER|GROUP)/i.test(t)) return { text: 'A SQL clause: ' + t.split(/\s+/)[0].toUpperCase() + ' tells the database what to do with the rows.', tag: 'Query' };
    if (lang === 'html' && /^<\/?[a-zA-Z]/.test(t)) return { text: 'An HTML tag that structures or styles part of the page.', tag: 'Markup' };
    if ((m = /^(\w+)\((.*)\)$/.exec(t))) return { text: 'Calls "' + m[1] + '" with ' + (m[2] || 'no arguments') + '.', tag: 'Call' };
    return { text: 'This line is outside the demo’s built-in phrase guide. Try a curated example for a complete walkthrough, or connect the AI backend for full coverage.', tag: 'Outside demo' };
  }
  function explain(code, lang) {
    const lines = String(code).split('\n');
    const items = lines.map((codeLine, i) => Object.assign({ line: i + 1, code: codeLine }, explainLine(codeLine, lang)));
    const counts = {};
    items.forEach((it) => { counts[it.tag] = (counts[it.tag] || 0) + 1; });
    const known = items.length - (counts['Outside demo'] || 0);
    const summary = 'Read ' + items.length + ' line' + (items.length === 1 ? '' : 's') + ' of ' + K.languages.get(lang).name + ': ' + known + ' explained step by step' + (counts['Outside demo'] ? ', ' + counts['Outside demo'] + ' outside the built-in guide' : '') + '.';
    return { items, summary, unknownCount: counts['Outside demo'] || 0 };
  }
  K.explain = { explain, explainLine };
})(window.KX);