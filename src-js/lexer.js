// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

function isSpace(c){ return c === ' ' || c === '\n' || c === '\r' || c === '\t'; }
function isAlpha(c){ return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
function isNum(c){ return c >= '0' && c <= '9'; }
function isIdentStart(c){ return isAlpha(c) || c === '_'; }
function isIdentBody(c){ return isIdentStart(c) || isNum(c); }
function isHex(c){ return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

function toHex(c){
	if (isNum(c))
		return c.charCodeAt(0) - 48;
	else if (c >= 'a')
		return c.charCodeAt(0) - 87;
	return c.charCodeAt(0) - 55;
}

function isSpecial1(c){
	return false ||
		c == '+' ||
		c == '-' ||
		c == '%' ||
		c == '*' ||
		c == '/' ||
		c == '^' ||
		c == '<' ||
		c == '>' ||
		c == '!' ||
		c == '=' ||
		c == '~' ||
		c == ':' ||
		c == ',' ||
		c == '.' ||
		c == '(' || c == ')' ||
		c == '[' || c == ']' ||
		c == '{' || c == '}';
}

function isSpecial2(c1, c2){
	return false ||
		(c1 == '+' && c2 == '=') ||
		(c1 == '-' && c2 == '=') ||
		(c1 == '%' && c2 == '=') ||
		(c1 == '*' && c2 == '=') ||
		(c1 == '/' && c2 == '=') ||
		(c1 == '^' && c2 == '=') ||
		(c1 == '<' && c2 == '=') ||
		(c1 == '>' && c2 == '=') ||
		(c1 == '!' && c2 == '=') ||
		(c1 == '=' && c2 == '=') ||
		(c1 == '~' && c2 == '=') ||
		(c1 == '~' && c2 == '+') ||
		(c1 == '+' && c2 == '~') ||
		(c1 == '~' && c2 == '-') ||
		(c1 == '-' && c2 == '~') ||
		(c1 == '&' && c2 == '&') ||
		(c1 == '|' && c2 == '|');
}

function isSpecial3(c1, c2, c3){
	return false ||
		(c1 == '~' && c2 == '~' && c3 == '+') ||
		(c1 == '+' && c2 == '~' && c3 == '~') ||
		(c1 == '|' && c2 == '|' && c3 == '=') ||
		(c1 == '&' && c2 == '&' && c3 == '=');
}

function isSpecialAny(c){
	return isSpecial1(c) || c == '&' || c == '|';
}

function isKeyword(s){
	return false ||
		s == 'break'     ||
		s == 'continue'  ||
		s == 'declare'   ||
		s == 'def'       ||
		s == 'do'        ||
		s == 'else'      ||
		s == 'elseif'    ||
		s == 'end'       ||
		s == 'for'       ||
		s == 'goto'      ||
		s == 'if'        ||
		s == 'include'   ||
		s == 'namespace' ||
		s == 'return'    ||
		s == 'typenum'   ||
		s == 'typestr'   ||
		s == 'typelist'  ||
		s == 'using'     ||
		s == 'var'       ||
		s == 'while'     ;
}

function token_new(type, data){
	return { type: type, data: data };
}

module.exports = function(){
	var state = 'LEX_START';
	var chR = false;
	var ch1 = false;
	var ch2 = false;
	var ch3 = false;
	var str = '';
	var blob;
	var num_val = 0;
	var num_base = 0;
	var num_frac = 0;
	var num_flen = 0;
	var num_esign = 0;
	var num_eval = 0;
	var num_elen = 0;
	var str_depth = 0;
	var str_hexval = 0;
	var str_hexleft = 0;

	function fwd(ch){
		ch3 = ch2;
		ch2 = ch1;
		ch1 = ch;
	}

	function rewind(){
		chR = ch1;
		ch1 = ch2;
		ch2 = ch3;
		ch3 = false;
	}

	function processChar(){
		switch (state){
			case 'LEX_START':
				if (ch1 == '#'){
					state = 'LEX_COMMENT_LINE';
					return [token_new('TOK_NEWLINE', null)];
				}
				else if (isSpecialAny(ch1)){
					if (ch1 == '}' && str_depth > 0){
						str_depth--;
						blob = [];
						state = 'LEX_STR_INTERP';
						return [token_new('TOK_STR_EXPR_END', null)];
					}
					state = 'LEX_SPECIAL1';
					return [];
				}
				else if (isIdentStart(ch1)){
					str = ch1;
					state = 'LEX_IDENT';
					return [];
				}
				else if (isNum(ch1)){
					num_val = toHex(ch1);
					num_base = 10;
					if (num_val == 0)
						state = 'LEX_NUM_0';
					else
						state = 'LEX_NUM';
					return [];
				}
				else if (ch1 == '\''){
					blob = [];
					state = 'LEX_STR_BASIC';
					return [];
				}
				else if (ch1 == '"'){
					blob = [];
					state = 'LEX_STR_INTERP';
					return [token_new('TOK_STR_START', null)];
				}
				else if (ch1 == '\\'){
					state = 'LEX_BACKSLASH';
					return [];
				}
				else if (ch1 == '\r'){
					state = 'LEX_RETURN';
					return [token_new('TOK_NEWLINE', null)];
				}
				else if (ch1 == '\n' || ch1 == ';')
					return [token_new('TOK_NEWLINE', null)];
				else if (isSpace(ch1))
					return [];
				return [token_new('TOK_ERROR', 'Unexpected character: ' + ch1)];

			case 'LEX_COMMENT_LINE':
				if (ch1 == '\r')
					state = 'LEX_RETURN';
				else if (ch1 == '\n')
					state = 'LEX_START';
				return [];

			case 'LEX_BACKSLASH':
				if (ch1 == '#')
					state = 'LEX_COMMENT_LINE';
				else if (ch1 == '\r')
					state = 'LEX_RETURN';
				else if (ch1 == '\n')
					state = 'LEX_START';
				else if (!isSpace(ch1))
					return [token_new('TOK_ERROR', 'Invalid character after backslash')];
				return [];

			case 'LEX_RETURN':
				if (ch1 == '\n')
					return [];
				state = 'LEX_START';
				return processChar();

			case 'LEX_COMMENT_BLOCK':
				if (ch2 == '*' && ch1 == '/')
					state = 'LEX_START';
				return [];

			case 'LEX_SPECIAL1':
				if (isSpecialAny(ch1)){
					if (ch2 == '/' && ch1 == '*')
						state = 'LEX_COMMENT_BLOCK';
					else
						state = 'LEX_SPECIAL2';
					return [];
				}
				if (isSpecial1(ch2)){
					var tk = token_new('TOK_KEYSPEC', ch2);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				return [token_new('TOK_ERROR', 'Unexpected characters: ' + ch2 + ch1)];

			case 'LEX_SPECIAL2':
				if (isSpecial3(ch3, ch2, ch1)){
					state = 'LEX_START';
					return [token_new('TOK_KEYSPEC', ch3 + ch2 + ch1)];
				}
				if (isSpecial2(ch3, ch2)){
					var tk = token_new('TOK_KEYSPEC', ch3 + ch2);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				if (isSpecial1(ch3)){
					var tk = token_new('TOK_KEYSPEC', ch3);
					state = 'LEX_START';
					rewind();
					var t1 = processChar();
					fwd(chR);
					var t2 = processChar();
					t1.unshift(tk);
					return t1.concat(t2);
				}
				return [token_new('TOK_ERROR', 'Unexpected characters: ' + ch3 + ch2 + ch1)];

			case 'LEX_IDENT':
				if (!isIdentBody(ch1)){
					var tk;
					if (isKeyword(str))
						tk = token_new('TOK_KEYSPEC', str);
					else
						tk = token_new('TOK_IDENT', str);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				str += ch1;
				if (str.length > 1024)
					return [token_new('TOK_ERROR', 'Identifier too long')];
				return [];

			case 'LEX_NUM_0':
				if (ch1 == 'b'){
					num_base = 2;
					state = 'LEX_NUM_2';
					return [];
				}
				else if (ch1 == 'c'){
					num_base = 8;
					state = 'LEX_NUM_2';
					return [];
				}
				else if (ch1 == 'x'){
					num_base = 16;
					state = 'LEX_NUM_2';
					return [];
				}
				else if (ch1 == '_'){
					state = 'LEX_NUM';
					return [];
				}
				else if (ch1 == '.'){
					num_frac = 0;
					num_flen = 0;
					state = 'LEX_NUM_FRAC';
					return [];
				}
				else if (ch1 == 'e' || ch1 == 'E'){
					num_frac = 0;
					num_flen = 0;
					num_esign = 0;
					num_eval = 0;
					num_elen = 0;
					state = 'LEX_NUM_EXP';
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid number')];

			case 'LEX_NUM_2':
				if (isHex(ch1)){
					num_val = toHex(ch1);
					if (num_val > num_base)
						return [token_new('TOK_ERROR', 'Invalid number')];
					state = 'LEX_NUM';
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid number')];

			case 'LEX_NUM':
				if (ch1 == '_')
					return [];
				else if (ch1 == '.'){
					num_frac = 0;
					num_flen = 0;
					state = 'LEX_NUM_FRAC';
					return [];
				}
				else if ((num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
					(num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
					num_frac = 0;
					num_flen = 0;
					num_esign = 0;
					num_eval = 0;
					num_elen = 0;
					state = 'LEX_NUM_EXP';
					return [];
				}
				else if (isHex(ch1)){
					var v = toHex(ch1);
					if (v > num_base)
						return [token_new('TOK_ERROR', 'Invalid number')];
					num_val = num_val * num_base + v;
					return [];
				}
				else if (!isIdentStart(ch1)){
					var tk = token_new('TOK_NUM', num_val);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				return [token_new('TOK_ERROR', 'Invalid number')];

			case 'LEX_NUM_FRAC':
				if (ch1 == '_')
					return [];
				else if ((num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
					(num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
					num_esign = 0;
					num_eval = 0;
					num_elen = 0;
					state = 'LEX_NUM_EXP';
					return [];
				}
				else if (isHex(ch1)){
					var v = toHex(ch1);
					if (v > num_base)
						return [token_new('TOK_ERROR', 'Invalid number')];
					num_frac = num_frac * num_base + v;
					num_flen++;
					return [];
				}
				else if (!isIdentStart(ch1)){
					if (num_flen <= 0)
						return [token_new('TOK_ERROR', 'Invalid number')];
					var d = Math.pow(num_base, num_flen);
					num_val = (num_val * d + num_frac) / d;
					var tk = token_new('TOK_NUM', num_val);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				return [token_new('TOK_ERROR', 'Invalid number')];

			case 'LEX_NUM_EXP':
				if (ch1 == '_')
					return [];
				num_esign = ch1 == '-' ? -1 : 1;
				state = 'LEX_NUM_EXP_BODY';
				if (ch1 == '+' || ch1 == '-')
					return [];
				return processChar();

			case 'LEX_NUM_EXP_BODY':
				if (ch1 == '_')
					return [];
				else if (isNum(ch1)){
					num_eval = num_eval * 10 + toHex(ch1);
					num_elen++;
					return [];
				}
				else if (!isIdentStart(ch1)){
					if (num_elen <= 0)
						return [token_new('TOK_ERROR', 'Invalid number')];
					var e = Math.pow(num_base == 10 ? 10 : 2, num_esign * num_eval);
					num_val *= e;
					if (num_flen > 0){
						var d = Math.pow(num_base, num_flen);
						num_val = (num_val * d + num_frac * e) / d;
					}
					var tk = token_new('TOK_NUM', num_val);
					state = 'LEX_START';
					var t = processChar();
					t.unshift(tk);
					return t;
				}
				return [token_new('TOK_ERROR', 'Invalid number')];

			case 'LEX_STR_BASIC':
				if (ch1 == '\r' || ch1 == '\n')
					return [token_new('TOK_ERROR', 'Missing end of string')];
				else if (ch1 == '\''){
					state = 'LEX_START';
					return [
						token_new('TOK_STR_START', null),
						token_new('TOK_STR_BLOB', blob),
						token_new('TOK_STR_END', null)
					];
				}
				else if (ch1 == '\\'){
					state = 'LEX_STR_BASIC_ESC';
					return [];
				}
				blob.push(ch1.charCodeAt(0));
				return [];

			case 'LEX_STR_BASIC_ESC':
				if (ch1 == '\\' || ch1 == '\''){
					blob.push(ch1.charCodeAt(0));
					state = 'LEX_STR_BASIC';
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid escape sequence: \\' + ch1)];

			case 'LEX_STR_INTERP':
				if (ch1 == '\r' || ch1 == '\n')
					return [token_new('TOK_ERROR', 'Missing end of string')];
				else if (ch1 == '"'){
					state = 'LEX_START';
					return [
						token_new('TOK_STR_BLOB', blob),
						token_new('TOK_STR_END', null)
					];
				}
				else if (ch1 == '$'){
					state = 'LEX_STR_INTERP_DLR';
					return [token_new('TOK_STR_BLOB', blob)];
				}
				else if (ch1 == '\\'){
					state = 'LEX_STR_INTERP_ESC';
					return [];
				}
				blob.push(ch1.charCodeAt(0));
				return [];

			case 'LEX_STR_INTERP_DLR':
				if (ch1 == '{'){
					str_depth++;
					state = 'LEX_START';
					return [token_new('TOK_STR_EXPR_START', null)];
				}
				else if (isIdentStart(ch1)){
					str = ch1;
					state = 'LEX_STR_INTERP_DLR_ID';
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid substitution')];

			case 'LEX_STR_INTERP_DLR_ID':
				if (!isIdentBody(ch1)){
					if (isKeyword(str))
						return [token_new('TOK_ERROR', 'Invalid substitution')];
					var tk = token_new('TOK_IDENT', str);
					blob = [];
					state = 'LEX_STR_INTERP';
					var t = processChar();
					t.unshift(token_new('TOK_STR_EXPR_END', null));
					t.unshift(tk);
					t.unshift(token_new('TOK_STR_EXPR_START', null));
					return t;
				}
				str += ch1;
				if (str.length > 1024)
					return [token_new('TOK_ERROR', 'Identifier too long')];
				return [];

			case 'LEX_STR_INTERP_ESC':
				if (ch1 == '\r' || ch1 == '\n')
					return [token_new('TOK_ERROR', 'Missing end of string')];
				else if (ch1 == 'x'){
					str_hexval = 0;
					str_hexleft = 2;
					state = 'LEX_STR_INTERP_ESC_HEX';
					return [];
				}
				else if (ch1 == '0'){
					blob.push(0);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 'b'){
					blob.push(8);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 't'){
					blob.push(9);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 'n'){
					blob.push(10);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 'v'){
					blob.push(11);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 'f'){
					blob.push(12);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == 'r'){
					blob.push(13);
					state = 'LEX_STR_INTERP';
					return [];
				}
				else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
					blob.push(ch1.charCodeAt(0));
					state = 'LEX_STR_INTERP';
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid escape sequence: \\' + ch1)];

			case 'LEX_STR_INTERP_ESC_HEX':
				if (isHex(ch1)){
					str_hexval = (str_hexval * 16) + toHex(ch1);
					str_hexleft--;
					if (str_hexleft <= 0){
						blob.push(str_hexval);
						state = 'LEX_STR_INTERP';
					}
					return [];
				}
				return [token_new('TOK_ERROR', 'Invalid escape sequence; expecting hexadecimal value')];
		}
		throw new Error('Unknown state: ' + state);
	}

	return {
		add: function(ch){
			fwd(ch);
			return processChar();
		},
		close: function(){
			switch (state){
				case 'LEX_START':
				case 'LEX_COMMENT_LINE':
				case 'LEX_BACKSLASH':
				case 'LEX_RETURN':
					return [token_new('TOK_NEWLINE', null)];

				case 'LEX_COMMENT_BLOCK':
					return [token_new('TOK_ERROR', 'Missing end of block comment')];

				case 'LEX_SPECIAL1':
					if (isSpecial1(ch1))
						return [token_new('TOK_KEYSPEC', ch1), token_new('TOK_NEWLINE', null)];
					return [token_new('TOK_ERROR', 'Unexpected character: ' + ch1)];

				case 'LEX_SPECIAL2':
					if (isSpecial2(ch2, ch1)){
						return [
							token_new('TOK_KEYSPEC', ch2 + ch1),
							token_new('TOK_NEWLINE', null)
						];
					}
					if (isSpecial1(ch2)){
						var tk = token_new('TOK_KEYSPEC', ch2);
						if (isSpecial1(ch1)){
							return [
								tk,
								token_new('TOK_KEYSPEC', ch1),
								token_new('TOK_NEWLINE', null)
							];
						}
						return [tk, token_new('TOK_ERROR', 'Unexpected character: ' + ch1)];
					}
					return [token_new('TOK_ERROR', 'Unexpected character: ' + ch2)];

				case 'LEX_IDENT':
					if (isKeyword(str))
						return [token_new('TOK_KEYSPEC', str), token_new('TOK_NEWLINE', null)];
					return [token_new('TOK_IDENT', str), token_new('TOK_NEWLINE', null)];

				case 'LEX_NUM_0':
					return [token_new('TOK_NUM', 0), token_new('TOK_NEWLINE', null)];

				case 'LEX_NUM_2':
					return [token_new('TOK_ERROR', 'Invalid number')];

				case 'LEX_NUM':
					return [token_new('TOK_NUM', num_val), token_new('TOK_NEWLINE', null)];

				case 'LEX_NUM_FRAC':
					if (num_flen <= 0)
						return [token_new('TOK_ERROR', 'Invalid number')];
					var d = Math.pow(num_base, num_flen);
					num_val = (num_val * d + num_frac) / d;
					return [token_new('TOK_NUM', num_val), token_new('TOK_NEWLINE', null)];

				case 'LEX_NUM_EXP':
					return [token_new('TOK_ERROR', 'Invalid number')];

				case 'LEX_NUM_EXP_BODY':
					if (num_elen <= 0)
						return [token_new('TOK_ERROR', 'Invalid number')];
					var e = Math.pow(num_base == 10 ? 10 : 2, num_esign * num_eval);
					num_val *= e;
					if (num_flen > 0){
						var d = Math.pow(num_base, num_flen);
						num_val = (num_val * d + num_frac * e) / d;
					}
					return [token_new('TOK_NUM', num_val), token_new('TOK_NEWLINE', null)];

				case 'LEX_STR_BASIC':
				case 'LEX_STR_BASIC_ESC':
				case 'LEX_STR_INTERP':
				case 'LEX_STR_INTERP_DLR':
				case 'LEX_STR_INTERP_DLR_ID':
				case 'LEX_STR_INTERP_ESC':
				case 'LEX_STR_INTERP_ESC_HEX':
					return [token_new('TOK_ERROR', 'Missing end of string')];
			}
			throw new Error('Unknown state: ' + state);
		}
	};
};
