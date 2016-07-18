// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

//
// opcodes
//

var OP_NOP         = 0x00; //
var OP_NIL         = 0x01; // [TGT]
var OP_MOVE        = 0x02; // [TGT], [SRC]
var OP_NUM_POS     = 0x03; // [TGT], [VALUE]
var OP_NUM_NEG     = 0x04; // [TGT], [VALUE]
var OP_NUM_TBL     = 0x05; // [TGT], [INDEX]
var OP_STR         = 0x06; // [TGT], [INDEX]
var OP_ADD         = 0x07; // [TGT], [SRC1], [SRC2]
var OP_MOD         = 0x08; // [TGT], [SRC1], [SRC2]
var OP_SUB         = 0x09; // [TGT], [SRC1], [SRC2]
var OP_MUL         = 0x0A; // [TGT], [SRC1], [SRC2]
var OP_DIV         = 0x0B; // [TGT], [SRC1], [SRC2]
var OP_POW         = 0x0C; // [TGT], [SRC1], [SRC2]
var OP_CAT         = 0x0D; // [TGT], [SRC1], [SRC2]
var OP_PUSH        = 0x0E; // [TGT], [SRC1], [SRC2]
var OP_UNSHIFT     = 0x0F; // [TGT], [SRC1], [SRC2]
var OP_APPEND      = 0x10; // [TGT], [SRC1], [SRC2]
var OP_PREPEND     = 0x11; // [TGT], [SRC1], [SRC2]
var OP_LTE         = 0x12; // [TGT], [SRC1], [SRC2]
var OP_LT          = 0x13; // [TGT], [SRC1], [SRC2]
var OP_GTE         = 0x14; // [TGT], [SRC1], [SRC2]
var OP_GT          = 0x15; // [TGT], [SRC1], [SRC2]
var OP_NEQ         = 0x16; // [TGT], [SRC1], [SRC2]
var OP_EQU         = 0x17; // [TGT], [SRC1], [SRC2]
var OP_SAY         = 0x30; // [TGT], [SRC]
var OP_ASK         = 0x31; // [TGT], [SRC]
var OP_NUM_FLOOR   = 0x32; // [TGT], [SRC]
var OP_NUM_CEIL    = 0x33; // [TGT], [SRC]
var OP_NUM_ROUND   = 0x34; // [TGT], [SRC]
var OP_NUM_SIN     = 0x35; // [TGT], [SRC]
var OP_NUM_COS     = 0x36; // [TGT], [SRC]
var OP_NUM_TAN     = 0x37; // [TGT], [SRC]
var OP_NUM_ASIN    = 0x38; // [TGT], [SRC]
var OP_NUM_ACOS    = 0x39; // [TGT], [SRC]
var OP_NUM_ATAN    = 0x3A; // [TGT], [SRC]
var OP_NUM_ATAN2   = 0x3B; // [TGT], [SRC1], [SRC2]
var OP_NUM_LOG     = 0x3C; // [TGT], [SRC]
var OP_NUM_LOG2    = 0x3D; // [TGT], [SRC]
var OP_NUM_LOG10   = 0x3E; // [TGT], [SRC]
var OP_NUM_ABS     = 0x3F; // [TGT], [SRC]
var OP_NUM_PI      = 0x40; // [TGT]
var OP_NUM_TAU     = 0x41; // [TGT]
var OP_NUM_LERP    = 0x42; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_NUM_MAX     = 0x43; // [TGT], [SRC]
var OP_NUM_MIN     = 0x44; // [TGT], [SRC]
var OP_LIST_NEW    = 0x45; // [TGT], [SRC1], [SRC2]
var OP_LIST_FIND   = 0x46; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_FINDREV= 0x47; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_REV    = 0x48; // [SRC]
var OP_LIST_JOIN   = 0x49; // [TGT], [SRC1], [SRC2]

//
// helper
//

function varloc_new(fdiff, index){
	return { fdiff: fdiff, index: index };
}

//
// keywords/specials
//

var KS_INVALID    =  0;
var KS_PLUS       =  1;
var KS_MINUS      =  2;
var KS_PERCENT    =  3;
var KS_STAR       =  4;
var KS_SLASH      =  5;
var KS_CARET      =  6;
var KS_LT         =  7;
var KS_GT         =  8;
var KS_BANG       =  9;
var KS_EQU        = 10;
var KS_TILDE      = 11;
var KS_COLON      = 12;
var KS_COMMA      = 13;
var KS_PERIOD     = 14;
var KS_LPAREN     = 15;
var KS_LBRACKET   = 16;
var KS_LBRACE     = 17;
var KS_RPAREN     = 18;
var KS_RBRACKET   = 19;
var KS_RBRACE     = 20;
var KS_PLUSEQU    = 21;
var KS_MINUSEQU   = 22;
var KS_PERCENTEQU = 23;
var KS_STAREQU    = 24;
var KS_SLASHEQU   = 25;
var KS_CARETEQU   = 26;
var KS_LTEQU      = 27;
var KS_GTEQU      = 28;
var KS_BANGEQU    = 29;
var KS_EQU2       = 30;
var KS_TILDEEQU   = 31;
var KS_TILDEPLUS  = 32;
var KS_PLUSTILDE  = 33;
var KS_TILDEMINUS = 34;
var KS_MINUSTILDE = 35;
var KS_AMP2       = 36;
var KS_PIPE2      = 37;
var KS_TILDE2PLUS = 38;
var KS_PLUSTILDE2 = 39;
var KS_PIPE2EQU   = 40;
var KS_AMP2EQU    = 41;
var KS_BREAK      = 42;
var KS_CONTINUE   = 43;
var KS_DECLARE    = 44;
var KS_DEF        = 45;
var KS_DO         = 46;
var KS_ELSE       = 47;
var KS_ELSEIF     = 48;
var KS_END        = 49;
var KS_FOR        = 50;
var KS_GOTO       = 51;
var KS_IF         = 52;
var KS_INCLUDE    = 53;
var KS_NAMESPACE  = 54;
var KS_RETURN     = 55;
var KS_TYPENUM    = 56;
var KS_TYPESTR    = 57;
var KS_TYPELIST   = 58;
var KS_USING      = 59;
var KS_VAR        = 60;
var KS_WHILE      = 61;

function ks_char(c){
	if      (c == '+') return KS_PLUS;
	else if (c == '-') return KS_MINUS;
	else if (c == '%') return KS_PERCENT;
	else if (c == '*') return KS_STAR;
	else if (c == '/') return KS_SLASH;
	else if (c == '^') return KS_CARET;
	else if (c == '<') return KS_LT;
	else if (c == '>') return KS_GT;
	else if (c == '!') return KS_BANG;
	else if (c == '=') return KS_EQU;
	else if (c == '~') return KS_TILDE;
	else if (c == ':') return KS_COLON;
	else if (c == ',') return KS_COMMA;
	else if (c == '.') return KS_PERIOD;
	else if (c == '(') return KS_LPAREN;
	else if (c == '[') return KS_LBRACKET;
	else if (c == '{') return KS_LBRACE;
	else if (c == ')') return KS_RPAREN;
	else if (c == ']') return KS_RBRACKET;
	else if (c == '}') return KS_RBRACE;
	return KS_INVALID;
}

function ks_char2(c1, c2){
	if      (c1 == '+' && c2 == '=') return KS_PLUSEQU;
	else if (c1 == '-' && c2 == '=') return KS_MINUSEQU;
	else if (c1 == '%' && c2 == '=') return KS_PERCENTEQU;
	else if (c1 == '*' && c2 == '=') return KS_STAREQU;
	else if (c1 == '/' && c2 == '=') return KS_SLASHEQU;
	else if (c1 == '^' && c2 == '=') return KS_CARETEQU;
	else if (c1 == '<' && c2 == '=') return KS_LTEQU;
	else if (c1 == '>' && c2 == '=') return KS_GTEQU;
	else if (c1 == '!' && c2 == '=') return KS_BANGEQU;
	else if (c1 == '=' && c2 == '=') return KS_EQU2;
	else if (c1 == '~' && c2 == '=') return KS_TILDEEQU;
	else if (c1 == '~' && c2 == '+') return KS_TILDEPLUS;
	else if (c1 == '+' && c2 == '~') return KS_PLUSTILDE;
	else if (c1 == '~' && c2 == '-') return KS_TILDEMINUS;
	else if (c1 == '-' && c2 == '~') return KS_MINUSTILDE;
	else if (c1 == '&' && c2 == '&') return KS_AMP2;
	else if (c1 == '|' && c2 == '|') return KS_PIPE2;
	return KS_INVALID;
}

function ks_char3(c1, c2, c3){
	if      (c1 == '~' && c2 == '~' && c3 == '+') return KS_TILDE2PLUS;
	else if (c1 == '+' && c2 == '~' && c3 == '~') return KS_PLUSTILDE2;
	else if (c1 == '|' && c2 == '|' && c3 == '=') return KS_PIPE2EQU;
	else if (c1 == '&' && c2 == '&' && c3 == '=') return KS_AMP2EQU;
	return KS_INVALID;
}

function ks_isSpecial(c){
	return ks_char(c) != KS_INVALID || c == '&' || c == '|';
}

function ks_str(s){
	if      (s == 'break'    ) return KS_BREAK;
	else if (s == 'continue' ) return KS_CONTINUE;
	else if (s == 'declare'  ) return KS_DECLARE;
	else if (s == 'def'      ) return KS_DEF;
	else if (s == 'do'       ) return KS_DO;
	else if (s == 'else'     ) return KS_ELSE;
	else if (s == 'elseif'   ) return KS_ELSEIF;
	else if (s == 'end'      ) return KS_END;
	else if (s == 'for'      ) return KS_FOR;
	else if (s == 'goto'     ) return KS_GOTO;
	else if (s == 'if'       ) return KS_IF;
	else if (s == 'include'  ) return KS_INCLUDE;
	else if (s == 'namespace') return KS_NAMESPACE;
	else if (s == 'return'   ) return KS_RETURN;
	else if (s == 'typenum'  ) return KS_TYPENUM;
	else if (s == 'typestr'  ) return KS_TYPESTR;
	else if (s == 'typelist' ) return KS_TYPELIST;
	else if (s == 'using'    ) return KS_USING;
	else if (s == 'var'      ) return KS_VAR;
	else if (s == 'while'    ) return KS_WHILE;
	return KS_INVALID;
}

//
// tokens
//

var TOK_NEWLINE = 0;
var TOK_KS      = 1;
var TOK_IDENT   = 2;
var TOK_NUM     = 3;
var TOK_BLOB    = 4;
var TOK_ERROR   = 5;

function tok_newline(){
	return { type: TOK_NEWLINE };
}

function tok_ks(k){
	return { type: TOK_KS, k: k };
}

function tok_ident(str){
	return { type: TOK_IDENT, str: str };
}

function tok_num(num){
	return { type: TOK_NUM, num: num };
}

function tok_blob(blob){
	return { type: TOK_BLOB, blob: blob };
}

function tok_error(msg){
	return { type: TOK_ERROR, msg: msg };
}

//
// expr
//

var EXPR_NIL        =  0;
var EXPR_NUM        =  1;
var EXPR_STR        =  2;
var EXPR_LOOKUP     =  3;
var EXPR_CMD_LOCAL  =  4;
var EXPR_CMD_NATIVE =  5;
var EXPR_CMD_OPCODE =  6;
var EXPR_POSTFIX    =  7;
var EXPR_PREFIX     =  8;
var EXPR_INFIX      =  9;
var EXPR_GROUP      = 10;
var EXPR_CALL       = 11;

function expr_nil(){
	return { type: EXPR_NIL };
}

function expr_num(num){
	return { type: EXPR_NUM, num: num };
}

function expr_str(str){
	return { type: EXPR_STR, str: str };
}

function expr_lookup(vl){
	return { type: EXPR_LOOKUP, vl: vl };
}

function expr_cmdLocal(lbl){
	return { type: EXPR_CMD_LOCAL, lbl: lbl };
}

function expr_cmdNative(cmd){
	return { type: EXPR_CMD_NATIVE, cmd: cmd };
}

function expr_cmdOpcode(opcode, params){
	return { type: EXPR_CMD_OPCODE, opcode: opcode, params: params };
}

function expr_postfix(tk, ex){
	return { type: EXPR_POSTFIX, tk: tk, ex: ex };
}

function expr_prefix(tk, ex){
	return { type: EXPR_PREFIX, tk: tk, ex: ex };
}

function expr_group(left, right){
	if (left.type == EXPR_GROUP){
		if (right.type == EXPR_GROUP)
			return { type: EXPR_GROUP, group: left.group.concat(right.group) };
		var g = left.group.concat();
		g.push(right);
		return { type: EXPR_GROUP, group: g };
	}
	else if (right.type == EXPR_GROUP){
		var g = right.group.concat();
		g.unshift(left);
		return { type: EXPR_GROUP: group: g };
	}
	return { type: EXPR_GROUP, group: [left, right] };
}

function expr_infix(tk, left, right){
	if (tk.type == TOK_KS && tk.k == KS_COMMA)
		return expr_group(left, right);
	return { type: EXPR_INFIX, tk: tk, left: left, right: right };
}

function expr_call(cmd, params){
	return { type: EXPR_CALL, cmd: cmd, params: params };
}

//
// lexer helper functions
//

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

function toHex(c){
	if (isNum(c))
		return c.charCodeAt(0) - 48;
	else if (c >= 'a')
		return c.charCodeAt(0) - 87;
	return c.charCodeAt(0) - 55;
}

//
// lexer
//

var LEX_START              =  0;
var LEX_COMMENT_LINE       =  1;
var LEX_BACKSLASH          =  2;
var LEX_RETURN             =  3;
var LEX_COMMENT_BLOCK      =  4;
var LEX_SPECIAL1           =  5;
var LEX_SPECIAL2           =  6;
var LEX_IDENT              =  7;
var LEX_NUM_0              =  8;
var LEX_NUM_2              =  9;
var LEX_NUM                = 10;
var LEX_NUM_FRAC           = 11;
var LEX_NUM_EXP            = 12;
var LEX_NUM_EXP_BODY       = 13;
var LEX_STR_BASIC          = 14;
var LEX_STR_BASIC_ESC      = 15;
var LEX_STR_INTERP         = 16;
var LEX_STR_INTERP_DLR     = 17;
var LEX_STR_INTERP_DLR_ID  = 18;
var LEX_STR_INTERP_ESC     = 19;
var LEX_STR_INTERP_ESC_HEX = 20;

function lex_new(){
	return {
		state: LEX_START,
		chR: 0,
		ch1: 0,
		ch2: 0,
		ch3: 0,
		str: '',
		blob: null,
		num_val: 0,
		num_base: 0,
		num_frac: 0,
		num_flen: 0,
		num_esign: 0,
		num_eval: 0,
		num_elen: 0,
		str_depth: 0,
		str_hexval: 0,
		str_hexleft: 0
	};
}

function lex_fwd(lx, ch){
	lx.ch3 = lx.ch2;
	lx.ch2 = lx.ch1;
	lx.ch1 = ch;
}

function lex_rewind(lx){
	lx.chR = lx.ch1;
	lx.ch1 = lx.ch2;
	lx.ch2 = lx.ch3;
	lx.ch3 = 0;
}

function lex_process(lx){
	var ch1 = lx.ch1;

	switch (lx.state){
		case LEX_START:
			if (ch1 == '#'){
				lx.state = LEX_COMMENT_LINE;
				return [tok_newline()];
			}
			else if (ks_isSpecial(ch1)){
				if (ch1 == '}' && lx.str_depth > 0){
					lx.str_depth--;
					lx.blob = [];
					lx.state = LEX_STR_INTERP;
					return [tok_ks(KS_RPAREN), tok_ks(KS_TILDE)];
				}
				lx.state = LEX_SPECIAL1;
				return [];
			}
			else if (isIdentStart(ch1)){
				lx.str = ch1;
				lx.state = LEX_IDENT;
				return [];
			}
			else if (isNum(ch1)){
				lx.num_val = toHex(ch1);
				lx.num_base = 10;
				if (num_val == 0)
					lx.state = LEX_NUM_0;
				else
					lx.state = LEX_NUM;
				return [];
			}
			else if (ch1 == '\''){
				lx.blob = [];
				lx.state = LEX_STR_BASIC;
				return [];
			}
			else if (ch1 == '"'){
				lx.blob = [];
				lx.state = LEX_STR_INTERP;
				return [tok_ks(KS_LPAREN)];
			}
			else if (ch1 == '\\'){
				lx.state = LEX_BACKSLASH;
				return [];
			}
			else if (ch1 == '\r'){
				lx.state = LEX_RETURN;
				return [tok_newline()];
			}
			else if (ch1 == '\n' || ch1 == ';')
				return [tok_newline()];
			else if (isSpace(ch1))
				return [];
			return [tok_error('Unexpected character: ' + ch1)];

		case LEX_COMMENT_LINE:
			if (ch1 == '\r')
				lx.state = LEX_RETURN;
			else if (ch1 == '\n')
				lx.state = LEX_START;
			return [];

		case LEX_BACKSLASH:
			if (ch1 == '#')
				lx.state = LEX_COMMENT_LINE;
			else if (ch1 == '\r')
				lx.state = LEX_RETURN;
			else if (ch1 == '\n')
				lx.state = LEX_START;
			else if (!isSpace(ch1))
				return [tok_error('Invalid character after backslash')];
			return [];

		case LEX_RETURN:
			if (ch1 == '\n')
				return [];
			lx.state = LEX_START;
			return lex_process(lx);

		case LEX_COMMENT_BLOCK:
			if (lx.ch2 == '*' && ch1 == '/')
				lx.state = LEX_START;
			return [];

		case LEX_SPECIAL1: {
			if (ks_isSpecial(ch1)){
				if (lx.ch2 == '/' && ch1 == '*')
					lx.state = LEX_COMMENT_BLOCK;
				else
					lx.state = LEX_SPECIAL2;
				return [];
			}
			var ks1 = ks_char(lx.ch2);
			if (ks1 != KS_INVALID){
				var tk = tok_ks(ks1);
				state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			return [tok_error('Unexpected characters: ' + lx.ch2 + ch1)];
		} break;

		case LEX_SPECIAL2: {
			var ks3 = ks_char3(lx.ch3, lx.ch2, ch1);
			if (ks3 != KS_INVALID){
				state = LEX_START;
				return [tok_ks(ks3)];
			}
			var ks2 = ks_char2(lx.ch3, lx.ch2);
			if (ks2 != KS_INVALID){
				var tk = tok_ks(ks2);
				state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			var ks1 = ks_char(lx.ch3);
			if (ks1 != KS_INVALID){
				var tk = tok_ks(ks1);
				state = LEX_START;
				lex_rewind(lx);
				var t1 = lex_process(lx);
				lex_fwd(lx, chR);
				var t2 = lex_process(lx);
				t1.unshift(tk);
				return t1.concat(t2);
			}
			return [tok_error('Unexpected characters: ' + lx.ch3 + lx.ch2 + ch1)];
		} break;

		case LEX_IDENT:
			if (!isIdentBody(ch1)){
				var tk;
				var ksk = ks_str(str);
				if (ksk != KS_INVALID)
					tk = tok_ks(ksk);
				else
					tk = tok_ident(lx.str);
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			lx.str += ch1;
			if (lx.str.length > 1024)
				return [tok_error('Identifier too long')];
			return [];

		case LEX_NUM_0:
			if (ch1 == 'b'){
				lx.num_base = 2;
				lx.state = LEX_NUM_2;
				return [];
			}
			else if (ch1 == 'c'){
				lx.num_base = 8;
				lx.state = LEX_NUM_2;
				return [];
			}
			else if (ch1 == 'x'){
				lx.num_base = 16;
				lx.state = LEX_NUM_2;
				return [];
			}
			else if (ch1 == '_'){
				lx.state = LEX_NUM;
				return [];
			}
			else if (ch1 == '.'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.state = LEX_NUM_FRAC;
				return [];
			}
			else if (ch1 == 'e' || ch1 == 'E'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
				return [];
			}
			return [tok_error('Invalid number')];

		case LEX_NUM_2:
			if (isHex(ch1)){
				lx.num_val = toHex(ch1);
				if (lx.num_val > lx.num_base)
					return [tok_error('Invalid number')];
				lx.state = LEX_NUM;
				return [];
			}
			return [tok_error('Invalid number')];

		case LEX_NUM:
			if (ch1 == '_')
				return [];
			else if (ch1 == '.'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.state = LEX_NUM_FRAC;
				return [];
			}
			else if ((lx.num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx.num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
				return [];
			}
			else if (isHex(ch1)){
				var v = toHex(ch1);
				if (v > lx.num_base)
					return [tok_error('Invalid number')];
				lx.num_val = lx.num_val * lx.num_base + v;
				return [];
			}
			else if (!isIdentStart(ch1)){
				var tk = tok_num(lx.num_val);
				state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			return [tok_error('Invalid number')];

		case LEX_NUM_FRAC:
			if (ch1 == '_')
				return [];
			else if ((lx.num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx.num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
				return [];
			}
			else if (isHex(ch1)){
				var v = toHex(ch1);
				if (v > lx.num_base)
					return [tok_error('Invalid number')];
				lx.num_frac = lx.num_frac * lx.num_base + v;
				lx.num_flen++;
				return [];
			}
			else if (!isIdentStart(ch1)){
				if (lx.num_flen <= 0)
					return [tok_error('Invalid number')];
				var d = Math.pow(lx.num_base, lx.num_flen);
				lx.num_val = (lx.num_val * d + lx.num_frac) / d;
				var tk = tok_num(lx.num_val);
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			return [tok_error('Invalid number')];

		case LEX_NUM_EXP:
			if (ch1 == '_')
				return [];
			lx.num_esign = ch1 == '-' ? -1 : 1;
			lx.state = LEX_NUM_EXP_BODY;
			if (ch1 == '+' || ch1 == '-')
				return [];
			return lex_process(lx);

		case LEX_NUM_EXP_BODY:
			if (ch1 == '_')
				return [];
			else if (isNum(ch1)){
				lx.num_eval = lx.num_eval * 10 + toHex(ch1);
				lx.num_elen++;
				return [];
			}
			else if (!isIdentStart(ch1)){
				if (lx.num_elen <= 0)
					return [tok_error('Invalid number')];
				var e = Math.pow(lx.num_base == 10 ? 10 : 2, lx.num_esign * lx.num_eval);
				lx.num_val *= e;
				if (lx.num_flen > 0){
					var d = Math.pow(lx.num_base, lx.num_flen);
					lx.num_val = (lx.num_val * d + lx.num_frac * e) / d;
				}
				var tk = tok_num(lx.num_val);
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			return [tok_error('Invalid number')];

		case LEX_STR_BASIC:
			if (ch1 == '\r' || ch1 == '\n')
				return [tok_error('Missing end of string')];
			else if (ch1 == '\''){
				lx.state = LEX_START;
				return [tok_blob(lx.blob)];
			}
			else if (ch1 == '\\'){
				lx.state = LEX_STR_BASIC_ESC;
				return [];
			}
			lx.blob.push(ch1.charCodeAt(0));
			return [];

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\\' || ch1 == '\''){
				lx.blob.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_BASIC;
				return [];
			}
			return [tok_error('Invalid escape sequence: \\' + ch1)];

		case LEX_STR_INTERP:
			if (ch1 == '\r' || ch1 == '\n')
				return [tok_error('Missing end of string')];
			else if (ch1 == '"'){
				lx.state = LEX_START;
				return [tok_blob(lx.blob), tok_ks(KS_RPAREN)];
			}
			else if (ch1 == '$'){
				lx.state = LEX_STR_INTERP_DLR;
				if (lx.blob.length <= 0)
					return [];
				return [tok_blob(lx.blob), tok_ks(KS_TILDE)];
			}
			else if (ch1 == '\\'){
				lx.state = LEX_STR_INTERP_ESC;
				return [];
			}
			lx.blob.push(ch1.charCodeAt(0));
			return [];

		case LEX_STR_INTERP_DLR:
			if (ch1 == '{'){
				lx.str_depth++;
				lx.state = LEX_START;
				return [tok_ks(KS_LPAREN)];
			}
			else if (isIdentStart(ch1)){
				lx.str = ch1;
				lx.state = LEX_STR_INTERP_DLR_ID;
				return [];
			}
			return [tok_error('Invalid substitution')];

		case LEX_STR_INTERP_DLR_ID:
			if (!isIdentBody(ch1)){
				if (ks_str(str) != KS_INVALID)
					return [tok_error('Invalid substitution')];
				var tk = tok_ident(str);
				if (ch1 == '"'){
					lx.state = LEX_START;
					return [tk, tok_ks(KS_RPAREN)];
				}
				lx.blob = [];
				lx.state = LEX_STR_INTERP;
				var t = lex_process(lx);
				t.unshift(tok_ks(KS_TILDE));
				t.unshift(tk);
				return t;
			}
			lx.str += ch1;
			if (lx.str.length > 1024)
				return [tok_error('Identifier too long')];
			return [];

		case LEX_STR_INTERP_ESC:
			if (ch1 == '\r' || ch1 == '\n')
				return [tok_error('Missing end of string')];
			else if (ch1 == 'x'){
				lx.str_hexval = 0;
				lx.str_hexleft = 2;
				lx.state = LEX_STR_INTERP_ESC_HEX;
				return [];
			}
			else if (ch1 == '0'){
				lx.blob.push(0);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'b'){
				lx.blob.push(8);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 't'){
				lx.blob.push(9);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'n'){
				lx.blob.push(10);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'v'){
				lx.blob.push(11);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'f'){
				lx.blob.push(12);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'r'){
				lx.blob.push(13);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				lx.blob.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_INTERP;
				return [];
			}
			return [tok_error('Invalid escape sequence: \\' + ch1)];

		case LEX_STR_INTERP_ESC_HEX:
			if (isHex(ch1)){
				lx.str_hexval = (str_hexval * 16) + toHex(ch1);
				lx.str_hexleft--;
				if (lx.str_hexleft <= 0){
					lx.blob.push(lx.str_hexval);
					lx.state = LEX_STR_INTERP;
				}
				return [];
			}
			return [tok_error('Invalid escape sequence; expecting hex value')];
	}
}

function lex_add(lx, ch){
	lex_fwd(lx, ch);
	return lex_process(lx);
}

function lex_close(lx){
	if (lx.str_depth > 0)
		return [tok_error('Missing end of string')];
	switch (lx.state){
		case LEX_START:
		case LEX_COMMENT_LINE:
		case LEX_BACKSLASH:
		case LEX_RETURN:
			return [tok_newline()];

		case LEX_COMMENT_BLOCK:
			return [tok_error('Missing end of block comment')];

		case LEX_SPECIAL1: {
			var ks1 = ks_char(lx.ch1);
			if (ks1 != KS_INVALID)
				return [tok_ks(ks1), tok_newline()];
			return [tok_error('Unexpected character: ' + lx.ch1)];
		} break;

		case LEX_SPECIAL2: {
			var ks2 = ks_char2(lx.ch2, ls.ch1);
			if (ks2 != KS_INVALID){
				return [tok_ks(ks2), tok_newline()];
			}
			var ks1 = ks_char(lx.ch2);
			ks2 = ks_char(lx.ch1);
			if (ks1 != KS_INVALID){
				var tk = tok_ks(ks1);
				if (ks2 != KS_INVALID){
					return [tk, tok_ks(ks2), tok_newline()];
				return [tk, tok_error('Unexpected character: ' + lx.ch1)];
			}
			return [tok_error('Unexpected character: ' + lx.ch2)];

		case LEX_IDENT: {
			var ksk = ks_str(lx.str);
			if (ksk != KS_INVALID)
				return [tok_ks(ksk), tok_newline()];
			return [tok_ident(lx.str), tok_newline()];

		case LEX_NUM_0:
			return [tok_num(0), tok_newline()];

		case LEX_NUM_2:
			return [tok_error('Invalid number')];

		case LEX_NUM:
			return [tok_num(lx.num_val), tok_newline()];

		case LEX_NUM_FRAC: {
			if (lx.num_flen <= 0)
				return [tok_error('Invalid number')];
			var d = Math.pow(lx.num_base, lx.num_flen);
			lx.num_val = (lx.num_val * d + lx.num_frac) / d;
			return [tok_num(lx.num_val), tok_newline()];
		} break;

		case LEX_NUM_EXP:
			return [tok_error('Invalid number')];

		case LEX_NUM_EXP_BODY: {
			if (lx.num_elen <= 0)
				return [tok_error('Invalid number')];
			var e = Math.pow(lx.num_base == 10 ? 10 : 2, lx.num_esign * lx.num_eval);
			lx.num_val *= e;
			if (lx.num_flen > 0){
				var d = Math.pow(lx.num_base, lx.num_flen);
				lx.num_val = (lx.num_val * d + lx.num_frac * e) / d;
			}
			return [tok_num(lx.num_val), tok_newline()];
		} break;

		case LEX_STR_BASIC:
		case LEX_STR_BASIC_ESC:
		case LEX_STR_INTERP:
		case LEX_STR_INTERP_DLR:
		case LEX_STR_INTERP_DLR_ID:
		case LEX_STR_INTERP_ESC:
		case LEX_STR_INTERP_ESC_HEX:
			return [tok_error('Missing end of string')];
	}
}




