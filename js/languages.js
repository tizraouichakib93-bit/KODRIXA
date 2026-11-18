/* KODRIXA language registry: 15 languages, honest capability matrix, highlight config.
   cap: gen / translate / debug / explain  =>  'full' | 'partial' | 'none'
   C is listed first and featured as a primary language. */
window.KX = window.KX || {};
(function (K) {
  'use strict';
  const L = (id, name, ext, mime, family, cap, hl, extra) => Object.assign({ id, name, ext, mime, family, cap, hl }, extra || {});
  const gp = { gen: 'full', translate: 'full', debug: 'full', explain: 'full' };
  const LANGS = [
    L('c', 'C', 'c', 'text/x-c', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['auto', 'break', 'case', 'const', 'continue', 'default', 'do', 'else', 'enum', 'extern', 'for', 'goto', 'if', 'register', 'return', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'volatile', 'while', 'include', 'define'],
      type: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'size_t', 'FILE', 'bool'],
      builtin: ['printf', 'scanf', 'malloc', 'calloc', 'realloc', 'free', 'strlen', 'strcpy', 'strcmp', 'strcat', 'memcpy', 'memset', 'fopen', 'fclose', 'fprintf', 'fscanf', 'exit', 'abs', 'rand', 'srand', 'pow', 'sqrt']
    }, { featured: true, blurb: 'The foundation language. Full generation, translation, debugging and explanation.' }),
    L('python', 'Python', 'py', 'text/x-python', 'python', gp, {
      line: '#', block: false, strings: ['"', "'", '```'], triple: true,
      kw: ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'import', 'from', 'as', 'class', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'pass', 'break', 'continue', 'global', 'yield', 'async', 'await', 'assert', 'del', 'is', 'None', 'True', 'False'],
      type: ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set', 'bytes'],
      builtin: ['print', 'len', 'range', 'input', 'str', 'int', 'float', 'list', 'dict', 'set', 'sum', 'max', 'min', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'abs', 'round', 'open', 'type', 'append', 'join', 'split', 'replace', 'upper', 'lower', 'strip']
    }, { featured: true, blurb: 'Readable and versatile. Full support across every tool.' }),
    L('javascript', 'JavaScript', 'js', 'text/javascript', 'c', gp, {
      line: '//', block: true, strings: ['"', "'", '`'],
      kw: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'typeof', 'instanceof', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'import', 'export', 'from', 'default', 'delete', 'in', 'of', 'void', 'null', 'undefined', 'true', 'false'],
      type: ['Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Map', 'Set', 'Date', 'Math', 'JSON', 'console', 'document', 'window'],
      builtin: ['parseInt', 'parseFloat', 'isNaN', 'setTimeout', 'setInterval', 'fetch', 'require', 'push', 'pop', 'shift', 'map', 'filter', 'reduce', 'join', 'split', 'slice', 'indexOf', 'includes', 'forEach', 'sort', 'reverse', 'keys', 'values', 'entries', 'log', 'trim', 'toUpperCase', 'toLowerCase', 'replace']
    }, { featured: true, blurb: 'The language of the web. Full support across every tool.' }),
    L('typescript', 'TypeScript', 'ts', 'text/typescript', 'c', gp, {
      line: '//', block: true, strings: ['"', "'", '`'],
      kw: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'super', 'this', 'typeof', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'import', 'export', 'from', 'default', 'as', 'readonly', 'public', 'private', 'protected', 'static', 'abstract', 'namespace', 'declare', 'null', 'undefined', 'true', 'false', 'keyof', 'in', 'of'],
      type: ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'Array', 'Object', 'Promise', 'Map', 'Set', 'Record', 'Partial', 'Readonly'],
      builtin: ['parseInt', 'parseFloat', 'setTimeout', 'fetch', 'console', 'push', 'map', 'filter', 'reduce', 'join', 'split', 'slice', 'includes', 'forEach', 'sort', 'keys', 'values', 'log']
    }, { blurb: 'Typed JavaScript. Full support across every tool.' }),
    L('cpp', 'C++', 'cpp', 'text/x-c++src', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['alignas', 'auto', 'break', 'case', 'catch', 'class', 'const', 'constexpr', 'continue', 'decltype', 'default', 'delete', 'do', 'else', 'enum', 'explicit', 'extern', 'for', 'friend', 'goto', 'if', 'inline', 'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private', 'protected', 'public', 'return', 'sizeof', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'try', 'typedef', 'typename', 'union', 'using', 'virtual', 'volatile', 'while', 'include', 'define', 'true', 'false'],
      type: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'bool', 'string', 'vector', 'map', 'set', 'size_t', 'auto'],
      builtin: ['cout', 'cin', 'cerr', 'endl', 'printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'push_back', 'pop_back', 'size', 'begin', 'end', 'sort', 'reverse', 'find', 'substr', 'append', 'to_string', 'stoi', 'sqrt', 'pow', 'abs', 'max', 'min']
    }, { featured: true, blurb: 'Systems and Arduino. Full support across every tool.' }),
    L('csharp', 'C#', 'cs', 'text/x-csharp', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['abstract', 'as', 'base', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delegate', 'do', 'else', 'enum', 'event', 'explicit', 'extern', 'finally', 'fixed', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'interface', 'internal', 'is', 'lock', 'namespace', 'new', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sealed', 'sizeof', 'stackalloc', 'static', 'struct', 'switch', 'this', 'throw', 'try', 'typeof', 'unchecked', 'unsafe', 'using', 'virtual', 'volatile', 'while', 'async', 'await', 'var', 'yield', 'true', 'false', 'null'],
      type: ['int', 'string', 'bool', 'double', 'float', 'decimal', 'char', 'long', 'short', 'byte', 'object', 'void', 'List', 'Dictionary', 'Task', 'Console', 'Math', 'IEnumerable'],
      builtin: ['WriteLine', 'Write', 'ReadLine', 'Parse', 'TryParse', 'ToString', 'Add', 'Remove', 'Count', 'Length', 'Sort', 'Reverse', 'Contains', 'Split', 'Join', 'Substring', 'Replace', 'ToUpper', 'ToLower', 'Trim', 'Abs', 'Max', 'Min', 'Sqrt', 'Pow']
    }, { blurb: '.NET and Unity. Full support across every tool.' }),
    L('java', 'Java', 'java', 'text/x-java-source', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['abstract', 'assert', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'enum', 'extends', 'final', 'finally', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'interface', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'volatile', 'while', 'true', 'false', 'null', 'var', 'record', 'sealed', 'yield'],
      type: ['int', 'long', 'short', 'byte', 'float', 'double', 'boolean', 'char', 'void', 'String', 'Integer', 'Double', 'Boolean', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'System', 'Math', 'Arrays', 'Collections', 'StringBuilder'],
      builtin: ['println', 'print', 'printf', 'valueOf', 'parseInt', 'parseDouble', 'toString', 'length', 'size', 'add', 'get', 'put', 'remove', 'contains', 'sort', 'reverse', 'split', 'join', 'substring', 'replace', 'toUpperCase', 'toLowerCase', 'trim', 'charAt', 'equals', 'abs', 'max', 'min', 'sqrt', 'pow']
    }, { blurb: 'Enterprise and Android. Full support across every tool.' }),
    L('go', 'Go', 'go', 'text/x-go', 'c', gp, {
      line: '//', block: true, strings: ['"', "'", '`'],
      kw: ['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var', 'true', 'false', 'nil', 'iota'],
      type: ['int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint32', 'uint64', 'float32', 'float64', 'string', 'bool', 'byte', 'rune', 'error', 'any'],
      builtin: ['make', 'new', 'len', 'cap', 'append', 'copy', 'delete', 'close', 'panic', 'recover', 'print', 'println', 'fmt', 'Println', 'Printf', 'Sprintf', 'Print', 'strconv', 'Atoi', 'Itoa', 'strings', 'Split', 'Join', 'ToUpper', 'ToLower', 'TrimSpace', 'Contains', 'sort', 'Ints', 'math', 'Sqrt', 'Abs']
    }, { blurb: 'Cloud and concurrency. Full support across every tool.' }),
    L('rust', 'Rust', 'rs', 'text/x-rust', 'c', gp, {
      line: '//', block: true, strings: ['"'],
      kw: ['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'union'],
      type: ['i8', 'i16', 'i32', 'i64', 'i128', 'u8', 'u16', 'u32', 'u64', 'u128', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'HashMap', 'Box'],
      builtin: ['println', 'print', 'format', 'vec', 'len', 'push', 'pop', 'insert', 'remove', 'contains', 'iter', 'map', 'filter', 'collect', 'sum', 'max', 'min', 'sort', 'reverse', 'split', 'join', 'to_uppercase', 'to_lowercase', 'trim', 'replace', 'parse', 'unwrap', 'expect', 'to_string', 'sqrt', 'abs', 'powi']
    }, { blurb: 'Memory-safe systems. Full support across every tool.' }),
    L('swift', 'Swift', 'swift', 'text/x-swift', 'c', gp, {
      line: '//', block: true, strings: ['"'],
      kw: ['associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'switch', 'where', 'while', 'as', 'catch', 'false', 'is', 'nil', 'super', 'self', 'throw', 'throws', 'true', 'try', 'async', 'await'],
      type: ['Int', 'Double', 'Float', 'Bool', 'String', 'Character', 'Array', 'Dictionary', 'Set', 'Optional', 'Any', 'Void'],
      builtin: ['print', 'count', 'append', 'insert', 'remove', 'contains', 'sorted', 'reversed', 'map', 'filter', 'reduce', 'joined', 'split', 'uppercased', 'lowercased', 'trimmingCharacters', 'replacingOccurrences', 'abs', 'max', 'min', 'sqrt', 'pow', 'random', 'Int.random']
    }, { blurb: 'Apple platforms. Full support across every tool.' }),
    L('kotlin', 'Kotlin', 'kt', 'text/x-kotlin', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import', 'init', 'param', 'property', 'receiver', 'set', 'setparam', 'value', 'where', 'abstract', 'actual', 'annotation', 'companion', 'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal', 'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec', 'vararg'],
      type: ['Int', 'Long', 'Short', 'Byte', 'Float', 'Double', 'Boolean', 'Char', 'String', 'Unit', 'Any', 'List', 'MutableList', 'Map', 'Set', 'Array'],
      builtin: ['println', 'print', 'readLine', 'toInt', 'toDouble', 'toString', 'size', 'add', 'get', 'put', 'remove', 'contains', 'sorted', 'reversed', 'map', 'filter', 'joinToString', 'split', 'uppercase', 'lowercase', 'trim', 'replace', 'substring', 'abs', 'max', 'min', 'sqrt', 'pow', 'random']
    }, { blurb: 'Modern JVM and Android. Full support across every tool.' }),
    L('ruby', 'Ruby', 'rb', 'text/x-ruby', 'ruby', gp, {
      line: '#', block: false, strings: ['"', "'"],
      kw: ['alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry', 'return', 'self', 'super', 'then', 'true', 'undef', 'unless', 'until', 'when', 'while', 'yield', 'require', 'attr_accessor', 'attr_reader', 'puts', 'loop'],
      type: ['Integer', 'Float', 'String', 'Symbol', 'Array', 'Hash', 'Range', 'Proc', 'Lambda', 'TrueClass', 'FalseClass', 'NilClass'],
      builtin: ['puts', 'print', 'p', 'gets', 'chomp', 'to_i', 'to_f', 'to_s', 'length', 'size', 'push', 'pop', 'shift', 'map', 'select', 'reject', 'reduce', 'inject', 'each', 'join', 'split', 'upcase', 'downcase', 'strip', 'gsub', 'sub', 'include?', 'sort', 'reverse', 'abs', 'max', 'min', 'sqrt', 'rand', 'times', 'upto', 'downto']
    }, { blurb: 'Elegant scripting. Full support across every tool.' }),
    L('php', 'PHP', 'php', 'text/x-php', 'c', gp, {
      line: '//', block: true, strings: ['"', "'"],
      kw: ['abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile', 'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'goto', 'if', 'implements', 'include', 'instanceof', 'insteadof', 'interface', 'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'require', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield', 'true', 'false', 'null'],
      type: ['int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'iterable', 'void', 'mixed', 'self', 'parent'],
      builtin: ['echo', 'print_r', 'var_dump', 'count', 'strlen', 'strpos', 'str_replace', 'substr', 'strtolower', 'strtoupper', 'trim', 'explode', 'implode', 'array_push', 'array_pop', 'array_map', 'array_filter', 'array_merge', 'in_array', 'sort', 'rsort', 'array_reverse', 'intval', 'floatval', 'strval', 'rand', 'mt_rand', 'abs', 'max', 'min', 'sqrt', 'pow', 'sprintf', 'printf', 'json_encode', 'json_decode', 'file_get_contents', 'file_put_contents']
    }, { blurb: 'Server-side web. Full support across every tool.' }),
    L('sql', 'SQL', 'sql', 'text/x-sql', 'sql', { gen: 'full', translate: 'partial', debug: 'partial', explain: 'full' }, {
      line: '--', block: true, strings: ["'", '"'],
      kw: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT', 'UNIQUE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'IS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ASC', 'DESC', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'IF', 'AUTO_INCREMENT', 'SERIAL', 'VARCHAR', 'INT', 'INTEGER', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'DECIMAL', 'FLOAT', 'DOUBLE', 'CHAR', 'BIGINT', 'SMALLINT'],
      type: [], builtin: []
    }, { blurb: 'Queries: generation + explanation full; translation/debug dialect-limited.' }),
    L('html', 'HTML/CSS', 'html', 'text/html', 'html', { gen: 'full', translate: 'none', debug: 'partial', explain: 'full' }, {
      line: null, block: true, strings: ['"', "'"], markup: true,
      kw: ['DOCTYPE', 'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script', 'div', 'span', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'form', 'input', 'button', 'label', 'select', 'option', 'textarea', 'canvas', 'svg', 'video', 'audio', 'iframe', 'br', 'hr', 'strong', 'em', 'code', 'pre', 'blockquote'],
      type: [], builtin: ['class', 'id', 'href', 'src', 'alt', 'type', 'name', 'value', 'placeholder', 'style', 'width', 'height', 'charset', 'content', 'rel', 'media', 'target', 'role', 'aria-label']
    }, { blurb: 'Markup: generation + explanation full; debugging structural; not translatable.' })
  ];
  const byId = {};
  LANGS.forEach((l) => { byId[l.id] = l; });
  const get = (id) => byId[id] || byId.python;
  const capLabel = (v) => v === 'full' ? 'Supported' : v === 'partial' ? 'Limited' : 'Not available';
  K.languages = { LANGS, get, byId, capLabel, ids: LANGS.map((l) => l.id) };
})(window.KX);