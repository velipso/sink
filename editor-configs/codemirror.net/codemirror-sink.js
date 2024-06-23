//
// sink - Minimal programming language for embedding small scripts in larger programs
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/sink
// SPDX-License-Identifier: 0BSD
//

(function(mod){
  if (typeof exports == 'object' && typeof module == 'object') // CommonJS
    mod(require('../../lib/codemirror'));
  else if (typeof define == 'function' && define.amd) // AMD
    define(['../../lib/codemirror'], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror){

CodeMirror.defineMode('sink', function(config, parserConfig) {
  function has(obj, key){
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  var specials = [
    '+', '-', '%', '*', '/', '^', '~', '+=', '-=', '%=', '*=', '/=', '^=', '~=', '<', '>', '!', '=',
    '||', '&&', '<=', '>=', '!=', '==', '||=', '&&=', '(', '[', '{', ',', '|', '&', ')', ']', '}',
    ':', '.', '...'
  ];

  var libs = {
    'nil': true, 'say': true, 'warn': true, 'ask': true, 'exit': true, 'abort': true,
    'isnum': true, 'isstr': true, 'islist': true, 'isnative': true, 'range': true, 'order': true,
    'pick': true, 'embed': true, 'stacktrace': true,
    'num': [
      'abs', 'sign', 'max', 'min', 'clamp', 'floor', 'ceil', 'round', 'trunc', 'nan', 'inf',
      'isnan', 'isfinite', 'e', 'pi', 'tau', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
      'atan2', 'log', 'log2', 'log10', 'exp', 'lerp', 'hex', 'oct', 'bin'
    ],
    'int': [
      'new', 'not', 'and', 'or', 'xor', 'shl', 'shr', 'sar', 'add', 'sub', 'mul', 'div',
      'mod', 'clz', 'pop', 'bswap'
    ],
    'rand': [
      'seed', 'seedauto', 'int', 'num', 'getstate', 'setstate', 'pick', 'shuffle'
    ],
    'str': [
      'new', 'split', 'replace', 'begins', 'ends', 'pad', 'find', 'rfind', 'lower', 'upper',
      'trim', 'rev', 'rep', 'list', 'byte', 'hash'
    ],
    'utf8': [
      'valid', 'list', 'str'
    ],
    'struct': [
      'size', 'str', 'list', 'isLE', 'U8', 'U16', 'UL16', 'UB16', 'U32', 'UL32', 'UB32', 'S8',
      'S16', 'SL16', 'SB16', 'S32', 'SL32', 'SB32', 'F32', 'FL32', 'FB32', 'F64', 'FL64', 'FB64'
    ],
    'list': [
      'new', 'shift', 'pop', 'push', 'unshift', 'append', 'prepend', 'find', 'rfind', 'join',
      'rev', 'str', 'sort', 'rsort'
    ],
    'pickle': [
      'json', 'bin', 'val', 'valid', 'sibling', 'circular', 'copy'
    ],
    'gc': [
      'getlevel', 'setlevel', 'run', 'NONE', 'DEFAULT', 'LOWMEM'
    ]
  };

  var keywords = [
    'break', 'continue', 'declare', 'def', 'do', 'else', 'elseif', 'end', 'enum', 'for', 'goto',
    'if', 'include', 'namespace', 'return', 'using', 'var', 'while'
  ];

  function ident(id){
    if (keywords.indexOf(id) >= 0)
      return 'keyword';
    return 'variable';
  }

  function isSpace(c){
    return c === ' ' || c === '\n' || c === '\r' || c === '\t';
  }

  function isAlpha(c){
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }

  function isNum(c){
    return c >= '0' && c <= '9';
  }

  function isIdentStart(c){
    return isAlpha(c) || c === '_';
  }

  function isIdentBody(c){
    return isIdentStart(c) || isNum(c);
  }

  return {
    startState: function(basecol) {
      return {
        state: 'start',
        braces: [0],
        lib: ''
      };
    },
    token: function(stream, st){
      var id = '';
      while (!stream.eol()){
        var ch = stream.next();
        switch (st.state){
          case 'start':
            if (isSpace(ch)){
              stream.eatSpace();
              return null;
            }
            else if (ch == '#'){
              stream.skipToEnd();
              return 'comment';
            }
            else if (ch == '/' && stream.eat('*'))
              st.state = 'blockcomment';
            else if (isNum(ch) || ((ch == '-' || ch == '+') && isNum(stream.peek()))){
              var pk = stream.peek();
              if (ch == '0' && (pk == 'x' || pk == 'c' || pk == 'b'))
                stream.next();
              if (isNum(pk))
                st.state = 'number';
              else
                return 'number'
            }
            else if (isIdentStart(ch)){
              if (isIdentBody(stream.peek())){
                id = ch;
                st.state = 'ident';
              }
              else
                return ident(ch);
            }
            else if (specials.indexOf(ch) >= 0){
              if (ch == '{')
                st.braces[0]++;
              else if (ch == '}'){
                if (st.braces[0] > 0)
                  st.braces[0]--;
                else if (st.braces.length > 1){
                  st.braces.shift();
                  st.state = 'strinterp';
                  break;
                }
              }
              while (specials.indexOf(ch + stream.peek()) >= 0)
                ch += stream.next();
              return 'builtin';
            }
            else if (ch == '\''){
              while (!stream.eol()){
                ch = stream.next();
                if (ch == '\''){
                  if (stream.peek() == '\'')
                    stream.next();
                  else
                    return 'string';
                }
              }
              return 'error';
            }
            else if (ch == '"')
              st.state = 'strinterp';
            break;

          case 'blockcomment':
            while (true){
              if (ch == '*' && stream.eat('/')){
                st.state = 'start';
                return 'comment';
              }
              if (stream.eol())
                break;
              ch = stream.next();
            }
            return 'comment';

          case 'number':
            while (true){
              if (stream.eol())
                break;
              if (!isIdentBody(stream.peek()))
                break;
              stream.next();
            }
            st.state = 'start';
            return 'number';

          case 'ident':
            while (true){
              id += ch;
              if (stream.eol())
                break;
              if (!isIdentBody(stream.peek()))
                break;
              ch = stream.next();
            }
            if (has(libs, id)){
              if (libs[id] === true){
                st.state = 'start';
                return 'builtin';
              }
              else if (stream.peek() == '.'){
                st.lib = id;
                id = '';
                st.state = 'lib';
                return 'builtin';
              }
            }
            st.state = 'start';
            return ident(id);

          case 'strinterp':
            while (true){
              if (ch == '\\')
                stream.next();
              else if (ch == '"'){
                st.state = 'start';
                return 'string';
              }
              else if (ch == '$' && stream.peek() == '{'){
                stream.next();
                st.braces.unshift(0);
                st.state = 'start';
                return 'string';
              }
              if (stream.eol())
                break;
              ch = stream.next();
            }
            return 'error';

          case 'lib':
            while (true){
              id += ch == '.' ? '' : ch;
              if (stream.eol())
                break;
              if (!isIdentBody(stream.peek()))
                break;
              ch = stream.next();
            }
            st.state = 'start';
            if (libs[st.lib].indexOf(id) >= 0)
              return 'builtin';
            return 'variable';
        }
      }
      switch (st.state){
        case 'start':
          return null;
        case 'blockcomment':
          return 'comment';
        case 'number':
          st.state = 'start';
          return 'number';
        case 'ident':
          st.state = 'start';
          return ident(id);
        case 'strinterp':
          st.state = 'start';
          return 'error';
        case 'lib':
          st.state = 'start';
          return 'error';
      }
      return 'error';
    }
  };
});

CodeMirror.defineMIME('text/x-sink', 'sink');

});
