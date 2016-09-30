// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

(function(mod){
  if (typeof exports == 'object' && typeof module == 'object') // CommonJS
    mod(require('../../lib/codemirror'));
  else if (typeof define == 'function' && define.amd) // AMD
    define(['../../lib/codemirror'], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror){

CodeMirror.defineMode('sink', function(config, parserConfig) {
  var specials = [
    '+', '-', '%', '*', '/', '^', '@', '&', '<', '>', '!', '=', '~', ':', ',', '.', '|', '(',
    '[', '{', ')', ']', '}', '+=', '-=', '%=', '*=', '/=', '^=', '<=', '>=', '!=', '==', '~=',
    '&&', '||', '...', '||=', '&&='
  ];

  var libs = {
    'pick': true, 'say': true, 'warn': true, 'ask': true, 'exit': true, 'abort': true,
    'num': [
      'abs', 'sign', 'max', 'min', 'clamp', 'floor', 'ceil', 'round', 'trunc', 'nan', 'inf',
      'isnan', 'isfinite', 'e', 'pi', 'tau', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
      'atan2', 'log', 'log2', 'log10', 'exp', 'lerp', 'hex', 'oct', 'bin'
    ],
    'int': [
      'new', 'not', 'and', 'or', 'xor', 'shl', 'shr', 'sar', 'add', 'sub', 'mul', 'div',
      'mod', 'clz'
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
      'size', 'str', 'list'
    ],
    'list': [
      'new', 'shift', 'pop', 'push', 'unshift', 'append', 'prepend', 'find', 'rfind', 'join',
      'rev', 'str', 'sort', 'rsort', 'sortcmp'
    ],
    'pickle': [
      'valid', 'str', 'val'
    ],
    'gc': [
      'get', 'set', 'run'
    ]
  };

  var keywords = [
    'break', 'continue', 'declare', 'def', 'do', 'else', 'elseif', 'end', 'for', 'goto', 'if',
    'include', 'namespace', 'nil', 'return', 'typenum', 'typestr', 'typelist', 'using', 'var',
    'while'
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

  function isHex(c){
    return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
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
              st.skipToEnd();
              return 'comment';
            }
            else if (ch == '/' && st.eat('*'))
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
                if (ch == '\\')
                  stream.next();
                else if (ch == '\'')
                  return 'string';
              }
              return 'error';
            }
            else if (ch == '"')
              st.state = 'strinterp';
            break;

          case 'blockcomment':
            while (true){
              if (ch == '*' && st.eat('/')){
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
              if (!isIdentBody(stream.peek()))
                break;
              if (stream.eol())
                break;
              stream.next();
            }
            st.state = 'start';
            return 'number';

          case 'ident':
            while (true){
              id += ch;
              if (!isIdentBody(stream.peek()))
                break;
              if (stream.eol())
                break;
              ch = stream.next();
            }
            if (libs.hasOwnProperty(id)){
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
              if (!isIdentBody(stream.peek()))
                break;
              if (stream.eol())
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
