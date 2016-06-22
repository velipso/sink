
var CompilerError = require('./compiler-error');

module.exports = function Lexer(file, source, readFile){
	var txt = (function(){
		var pos = 0;
		var line = 1;
		var chr = 1;
		return {
			peek: function(n){
				if (pos + n >= source.length)
					return false;
				return source.charAt(pos + n);
			},
			next: function(n){
				while (n > 0 && pos < source.length){
					var c = source.charAt(pos);
					pos++;
					n--;
					if ((c === '\r' && source.charAt(pos) !== '\n') || c === '\n'){
						line++;
						chr = 1;
					}
					else
						chr++;
				}
			},
			pos: function(){
				return {
					file: file,
					line: line,
					chr: chr,
					toString: function(){
						return this.file + ':' + this.line + ':' + this.chr;
					}
				};
			},
			eof: function(){
				return pos >= source.length;
			}
		};
	})();

	function isSpace(c){ return c === ' ' || c === '\n' || c === '\r' || c === '\t'; }
	function isAlpha(c){ return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
	function isNum(c){ return c >= '0' && c <= '9'; }
	function isIdentStart(c){ return isAlpha(c) || c === '_'; }
	function isIdentBody(c){ return isIdentStart(c) || isNum(c); }
	function isNumBody(c){ return isIdentBody(c) || c === '.'; }
	function is2PowNum(s){ return s === '0b' || s === '0c' || s === '0x'; }
	function isHex(c){ return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

	var specials = [
		'+', '+=',
		'-', '-=',
		'%', '%=',
		'*', '*=',
		'/', '/=',
		'^', '^=',
		'<', '<=',
		'>', '>=',
		'!', '!=',
		'=', '==',
		'~', '~=',
		'~+', '+~',
		'&&', '||', '||=',
		':', ',', '.', '(', ')', '[', ']', '{', '}'
	];
	var keywords = [
		'ask',
		'break',
		'continue',
		'declare',
		'def',
		'do',
		'else',
		'elseif',
		'end',
		'for',
		'goto',
		'if',
		'namespace',
		'pick',
		'pop',
		'return',
		'say',
		'shift',
		'typenum',
		'typestr',
		'typelist',
		'var',
		'while'
	];

	var tokens = [];
	function PushToken(kind, data){
		tokens.push({
			kind: kind,
			data: data,
			newline: false,
			isData: function(){
				if (this.kind !== 'keyspec')
					return false;
				for (var i = 0; i < arguments.length; i++){
					if (this.data === arguments[i])
						return true;
				}
				return false;
			},
			pos: txt.pos()
		});
	}

	function Keyspec(data){ PushToken('keyspec', data); }
	function Str(str){ PushToken('str', str); }
	function Num(s){
		var data;
		if (s.substr(0, 2) === '0b')
			data = parseInt(s.substr(2), 2);
		else if (s.substr(0, 2) === '0c')
			data = parseInt(s.substr(2), 8);
		else if (s.substr(0, 2) === '0x')
			data = parseInt(s.substr(2), 16);
		else
			data = parseFloat(s);
		PushToken('num', data);
	}
	function IdentOrKeyword(data){
		if (keywords.indexOf(data) >= 0)
			Keyspec(data);
		else
			PushToken('ident', data);
	}
	function Ident(data){
		if (keywords.indexOf(data) >= 0)
			throw CompilerError(txt.pos(), 'Invalid identifier');
		else
			PushToken('ident', data);
	}
	function MarkNewline(){
		if (tokens.length > 0)
			tokens[tokens.length - 1].newline = true;
	}

	function checkPreprocessor(str){
		var inc = str.match(/^\s*include\s+<([^>]+)>\s*$/);
		if (inc === null)
			return;
		var fi = readFile(inc[1], file);
		// TODO: deal with readFile returning a Promise
		if (fi === false)
			throw CompilerError(txt.pos(), 'Invalid include: ' + inc[1]);
		var tk = Lexer(fi.file.replace(/^\s+|\s+$/g, ''), fi.source, readFile);
		tk.pop(); // remove eof
		tokens = tokens.concat(tk);
	}

	var state = 'Start';
	var str;
	var blob;
	var cats;
	var next_cnt = 1;

	while (!txt.eof()){
		var ch = txt.peek(0);
		var nch = txt.peek(1);
		var nnch = txt.peek(2);

		switch (state){
			case 'Start':
				if (ch === '#'){
					if (txt.pos().chr === 1){
						str = '';
						state = 'Preprocessor';
					}
					else
						state = 'LineComment';
					MarkNewline();
				}
				else if (ch === '/' && nch === '*')
					state = 'BlockComment';
				else if (specials.indexOf(ch + nch + nnch) >= 0){
					Keyspec(ch + nch + nnch);
					next_cnt = 3;
				}
				else if (specials.indexOf(ch + nch) >= 0){
					Keyspec(ch + nch);
					next_cnt = 2;
				}
				else if (specials.indexOf(ch) >= 0)
					Keyspec(ch);
				else if (isIdentStart(ch)){
					if (isIdentBody(nch)){
						str = ch;
						state = 'Ident';
					}
					else
						IdentOrKeyword(ch);
				}
				else if (isNum(ch)){
					if (isNumBody(nch)){
						str = ch;
						state = 'Number';
					}
					else
						Num(ch);
				}
				else if (ch === '\''){
					blob = [];
					state = 'BasicString';
				}
				else if (ch === '"'){
					Keyspec('(');
					blob = false;
					cats = [];
					state = 'InterpString';
				}
				else if (ch === '\\')
					state = 'Backslash';
				else if (isSpace(ch) || ch === ';'){
					if (ch === '\r' || ch === '\n' || ch === ';')
						MarkNewline();
				}
				else
					throw CompilerError(txt.pos(), 'Unexpected character: ' + ch);
				break;
			case 'LineComment':
				if (ch === '\r' && nch === '\n'){
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n')
					state = 'Start';
				break;
			case 'Preprocessor':
				if (ch === '\r' && nch === '\n'){
					checkPreprocessor(str);
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n'){
					checkPreprocessor(str);
					state = 'Start';
				}
				else
					str += ch;
				break;
			case 'BlockComment':
				if (ch === '*' && nch === '/'){
					next_cnt = 2;
					state = 'Start';
				}
				break;
			case 'Ident':
				str += ch;
				if (!isIdentBody(nch)){
					IdentOrKeyword(str);
					state = 'Start';
				}
				break;
			case 'Number':
				str += ch;
				if (!isNumBody(nch)){
					Num(str);
					state = 'Start';
				}
				break;
			case 'BasicString':
				if (ch === '\r' || ch === '\n')
					throw CompilerError(txt.pos(), 'String missing end quote');
				else if (ch === '\\')
					state = 'BasicStringEscape';
				else if (ch === '\''){
					Str(blob);
					state = 'Start';
				}
				else
					blob.push(ch.charCodeAt(0));
				break;
			case 'BasicStringEscape':
				state = 'BasicString';
				if (ch === '\'' || ch === '\\')
					blob.push(ch.charCodeAt(0));
				else
					throw CompilerError(txt.pos(), 'Invalid escape sequence: \\' + ch);
			case 'InterpString':
				if (ch === '\r' || ch === '\n')
					throw CompilerError(txt.pos(), 'String missing end quote');
				else if (ch === '\\'){
					if (blob === false){
						blob = [];
						cats.push({ kind: Str, data: blob });
					}
					state = 'InterpStringEscape';
				}
				else if (ch === '$'){
					if (!isIdentStart(nch))
						throw CompilerError(txt.pos(), 'Invalid variable');
					blob = false;
					cats.push({ kind: Ident, data: '' });
					state = 'InterpStringIdent';
				}
				else if (ch === '"'){
					if (cats.length <= 0)
						Str([]);
					else{
						for (var i = 0; i < cats.length; i++){
							if (i > 0)
								Keyspec('~');
							cats[i].kind(cats[i].data);
						}
					}
					Keyspec(')');
					state = 'Start';
				}
				else{
					if (blob === false){
						blob = [];
						cats.push({ kind: Str, data: blob });
					}
					blob.push(ch.charCodeAt(0));
				}
				break;
			case 'InterpStringEscape':
				state = 'InterpString';
				switch (ch){
					case '"':
					case '\\':
					case '$':
						blob.push(ch.charCodeAt(0));
						break;
					case '0': blob.push(0); break;
					case 'b': blob.push('\b'.charCodeAt(0)); break;
					case 'f': blob.push('\f'.charCodeAt(0)); break;
					case 'n': blob.push('\n'.charCodeAt(0)); break;
					case 'r': blob.push('\r'.charCodeAt(0)); break;
					case 't': blob.push('\t'.charCodeAt(0)); break;
					case 'x':
						if (!isHex(nch) || !isHex(nnch)){
							throw CompilerError(txt.pos(),
								'Invalid escape sequence: \\' + ch + nch + nnch);
						}
						blob.push(parseInt(nch + nnch, 16));
						next_cnt = 3;
						break;
					default:
						throw CompileError(txt.pos(), 'Invalid escape sequence: \\' + ch);
				}
				break;
			case 'InterpStringIdent':
				cats[cats.length - 1].data += ch;
				if (!isIdentBody(nch))
					state = 'InterpString';
				break;
			case 'Backslash':
				if (ch === '#')
					state = 'LineComment';
				else if (ch === '\r' && nch === '\n'){
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n')
					state = 'Start';
				else if (!isSpace(ch))
					throw CompilerError(txt.pos(), 'Invalid backslash');
				break;
		}

		txt.next(next_cnt);
		next_cnt = 1;
	}

	switch (state){
		case 'Start':
		case 'LineComment':
		case 'Preprocessor':
		case 'BlockComment':
		case 'Backslash':
			break;
		case 'Ident':
			IdentOrKeyword(str);
			break;
		case 'Number':
			Num(str);
			break;
		case 'BasicString':
		case 'BasicStringEscape':
		case 'InterpString':
		case 'InterpStringEscape':
		case 'InterpStringIdent':
			throw CompilerError(txt.pos(), 'String missing end quote');
	}

	PushToken('eof');
	return tokens;
};
