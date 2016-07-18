// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

//
// helper
//

function varloc_new(fdiff, index){
	return { fdiff: fdiff, index: index };
}

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
var OP_LIST_REV    = 0x48; // [TGT], [SRC]
var OP_LIST_JOIN   = 0x49; // [TGT], [SRC1], [SRC2]

function op_nop(b){
	b.push(OP_NOP);
}

function op_nil(b, tgt){
	b.push(OP_NIL, tgt.fdiff, tgt.index);
}

function op_move(b, tgt, src){
	b.push(OP_MOVE, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_num(b, tgt, num){
	if (num >= 0)
		b.push(OP_NUM_POS, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	else{
		num += 65536;
		b.push(OP_NUM_NEG, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	}
}

function op_num_tbl(b, tgt, index){
	b.push(OP_NUM_TBL, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_str(b, tgt, index){
	b.push(OP_STR, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_binop(b, opcode, tgt, src1, src2){
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_param0(b, opcode, tgt){
	b.push(opcode, tgt.fdiff, tgt.index);
}

function op_param1(b, opcode, tgt, src){
	b.push(opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_param2(b, opcode, tgt, src1, src2){
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_param3(b, opcode, tgt, src1, src2, src3){
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
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

function tok_isKS(tk, k){
	return tk.type == TOK_KS && tk.k == k;
}

function tok_isPre(tk){
	if (tk.type == TOK_KS){
		return false ||
			tk.k == KS_PLUS       ||
			tk.k == KS_MINUS      ||
			tk.k == KS_BANG       ||
			tk.k == KS_MINUSTILDE ||
			tk.k == KS_TILDEMINUS ||
			tk.k == KS_TYPENUM    ||
			tk.k == KS_TYPESTR    ||
			tk.k == KS_TYPELIST;
	}
	return false;
}

function tok_isMid(tk){
	if (tk.type == TOK_KS){
		return false ||
			tk.k == KS_PLUS       ||
			tk.k == KS_PLUSEQU    ||
			tk.k == KS_MINUS      ||
			tk.k == KS_MINUSEQU   ||
			tk.k == KS_PERCENT    ||
			tk.k == KS_PERCENTEQU ||
			tk.k == KS_STAR       ||
			tk.k == KS_STAREQU    ||
			tk.k == KS_SLASH      ||
			tk.k == KS_SLASHEQU   ||
			tk.k == KS_CARET      ||
			tk.k == KS_CARETEQU   ||
			tk.k == KS_LT         ||
			tk.k == KS_LTEQU      ||
			tk.k == KS_GT         ||
			tk.k == KS_GTEQU      ||
			tk.k == KS_BANGEQU    ||
			tk.k == KS_EQU        ||
			tk.k == KS_EQU2       ||
			tk.k == KS_TILDE      ||
			tk.k == KS_TILDEEQU   ||
			tk.k == KS_TILDEPLUS  ||
			tk.k == KS_PLUSTILDE  ||
			tk.k == KS_TILDE2PLUS ||
			tk.k == KS_PLUSTILDE2 ||
			tk.k == KS_AMP2       ||
			tk.k == KS_PIPE2      ||
			tk.k == KS_AMP2EQU    ||
			tk.k == KS_PIPE2EQU   ||
			tk.k == KS_COMMA;
	}
	return false;
}

function tok_isTerm(tk){
	return false ||
		(tk.type == TOK_KS && (tk.k == KS_LPAREN || tk.k == KS_LBRACE)) ||
		tk.type == TOK_IDENT    ||
		tk.type == TOK_BLOB     ||
		tk.type == TOK_NUM;
}

function tok_isPreBeforeMid(pre, mid){
	//assert(pre.type == TOK_KS);
	//assert(mid.type == TOK_KS);
	// -5^2 is -25, not 25
	if (pre.k == KS_MINUS && mid.k == KS_CARET)
		return false;
	// otherwise, apply the Pre first
	return true;
}

function tok_midPrecedence(tk){
	//assert(tk.type == TOK_KS);
	if      (tk.k == KS_CARET     ) return  1;
	else if (tk.k == KS_PERCENT   ) return  2;
	else if (tk.k == KS_STAR      ) return  2;
	else if (tk.k == KS_SLASH     ) return  2;
	else if (tk.k == KS_PLUS      ) return  3;
	else if (tk.k == KS_MINUS     ) return  3;
	else if (tk.k == KS_TILDEPLUS ) return  4;
	else if (tk.k == KS_PLUSTILDE ) return  4;
	else if (tk.k == KS_TILDE2PLUS) return  5;
	else if (tk.k == KS_PLUSTILDE2) return  5;
	else if (tk.k == KS_TILDE     ) return  6;
	else if (tk.k == KS_LTEQU     ) return  7;
	else if (tk.k == KS_LT        ) return  7;
	else if (tk.k == KS_GTEQU     ) return  7;
	else if (tk.k == KS_GT        ) return  7;
	else if (tk.k == KS_BANGEQU   ) return  8;
	else if (tk.k == KS_EQU2      ) return  8;
	else if (tk.k == KS_AMP2      ) return  9;
	else if (tk.k == KS_PIPE2     ) return 10;
	else if (tk.k == KS_EQU       ) return 20;
	else if (tk.k == KS_PLUSEQU   ) return 20;
	else if (tk.k == KS_PERCENTEQU) return 20;
	else if (tk.k == KS_MINUSEQU  ) return 20;
	else if (tk.k == KS_STAREQU   ) return 20;
	else if (tk.k == KS_SLASHEQU  ) return 20;
	else if (tk.k == KS_CARETEQU  ) return 20;
	else if (tk.k == KS_TILDEEQU  ) return 20;
	else if (tk.k == KS_COMMA     ) return 30;
	//assert(false);
	return -1;
}

function tok_isMidBeforeMid(lmid, rmid){
	//assert(lmid.type == TOK_KS);
	//assert(rmid.type == TOK_KS);
	var lp = tok_midPrecedence(lmid);
	var rp = tok_midPrecedence(rmid);
	if (lp < rp)
		return true;
	else if (lp > rp)
		return false;
	// otherwise, same precedence...
	if (lp === 20 || lmid.k == KS_CARET) // mutation and pow are right to left
		return false;
	return true;
}

function tok_toMutateOp(tk){
	if (tk.type == TOK_KS){
		if      (tk.k == KS_TILDEPLUS ) return OP_PUSH;
		else if (tk.k == KS_PLUSTILDE ) return OP_UNSHIFT;
		else if (tk.k == KS_TILDE2PLUS) return OP_APPEND;
		else if (tk.k == KS_PLUETILDE2) return OP_PREPEND;
		else if (tk.k == KS_EQU       ) return -1;
		else if (tk.k == KS_PLUSEQU   ) return OP_ADD;
		else if (tk.k == KS_PERCENTEQU) return OP_MOD;
		else if (tk.k == KS_MINUSEQU  ) return OP_SUB;
		else if (tk.k == KS_STAREQU   ) return OP_MUL;
		else if (tk.k == KS_SLASHEQU  ) return OP_DIV;
		else if (tk.k == KS_CARETEQU  ) return OP_POW;
		else if (tk.k == KS_TILDEEQU  ) return OP_CAT;
		// does not include &&= and ||= because those are tested specifically for short circuit
	}
	return -2;
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

function expr_isCmd(ex){
	return ex.type == EXPR_CMD_LOCAL || ex.type == EXPR_CMD_NATIVE || ex.type == EXPR_CMD_OPCODE;
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

//
// body
//




//
// frame
//

var FVR_VAR        = 0;
var FVR_TEMP_AVAIL = 1;
var FVR_TEMP_INUSE = 2;

function frame_new(parent){
	return { vars: [], parent: parent };
}

function frame_tempClear(fr, idx){
	if (fr.vars[idx] == FVR_TEMP_INUSE)
		fr.vars[idx] = FVR_TEMP_AVAIL;
}

function frame_newTemp(fr){
	for (var i = 0; i < fr.vars.length; i++){
		if (fr.vars[i] == FVR_TEMP_AVAIL){
			fr.vars[i] = FVR_TEMP_INUSE;
			return i;
		}
	}
	fr.vars.push(FVR_TEMP_INUSE);
	return fr.vars.length - 1;
}

function frame_newVar(fr){
	fr.vars.push(FVR_VAR);
	return fr.vars.length - 1;
}

function frame_diff(fr, child){
	var dist = 0;
	while (child != fr){
		child = child.parent;
		dist++;
	}
	return dist;
}

//
// scope/namespace
//

function using_new(ns, next){
	return { ns: ns, next: next };
}

var NSN_VAR        = 0;
var NSN_NAMESPACE  = 1;
var NSN_CMD_LOCAL  = 2;
var NSN_CMD_NATIVE = 3;
var NSN_CMD_OPCODE = 4;

function nsname_newVar(name, fr, index, next){
	return { name: name, type: NSN_VAR, fr: fr, index: index, next: next };
}

function nsname_newNamespace(name, ns, next){
	return { name: name, type: NSN_NAMESPACE, ns: ns, next: next };
}

function nsname_newCmdLocal(name, lbl, next){
	return { name: name, type: NSN_CMD_LOCAL, lbl: lbl, next: next };
}

function nsname_newCmdNative(name, cmd, next){
	return { name: name, type: NSN_CMD_NATIVE, cmd: cmd, next: next };
}

function nsname_newCmdOpcode(name, opcode, params, next){
	return { name: name, type: NSN_CMD_OPCODE, opcode: opcode, params: params, next: next };
}

var LKUP_NSNAME   = 0;
var LKUP_NOTFOUND = 1;
var LKUP_ERROR    = 2;

function lkup_nsname(nsn){
	return { type: LKUP_NSNAME, nsn: nsn };
}

function lkup_notfound(){
	return { type: LKUP_NOTFOUND };
}

function lkup_error(msg){
	return { type: LKUP_ERROR, msg: msg };
}

function namespace_new(fr, next){
	return {
		fr: fr, // frame that the namespace is in
		usings: null, // linked list of using_new's
		names: null, // linked list of nsname_new*'s
		next: next // next namespace in the scope list
	};
}

function namespace_has(ns, name){
	var here = ns.names;
	while (here != null){
		if (here.name == name)
			return true;
		here = here.next;
	}
	return false;
}

function namespace_lookup(ns, names, idx, err){
	// first try name's defined within this namespace
	var here = ns.names;
	while (here != null){
		if (here.name == names[idx]){
			if (idx == names.length - 1)
				return lkup_nsname(here);
			switch (here.type){
				case NSN_VAR:
					if (err[0] == null)
						err[0] = 'Variable "' + here.name + '" is not a namespace';
					break;
				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
					if (err[0] == null)
						err[0] = 'Function "' + here.name + '" is not a namespace';
					break;
				case NSN_NAMESPACE: {
					var lk = namespace_lookup(here.ns, names, idx + 1, err);
					if (lk.type == LKUP_NSNAME)
						return lk;
				} break;
			}
		}
		here = here.next;
	}

	// failed to find result in namespace's names... check using's
	var usi = ns.usings;
	while (usi != null){
		var lk = namespace_lookup(usi.ns, names, idx, err);
		if (lk.type == LKUP_NSNAME)
			return lk;
		usi = usi.next;
	}

	// failed entirely
	return lkup_notfound();
}

function scope_new(fr, parent){
	var ns = namespace_new(fr, null);
	return {
		ns: ns, // linked list of namespace's, via ns.next
		parent: parent
	};
}

function scope_tryLookup(sc, names, err){
	// first try the current scope's namespaces
	var here = sc.ns;
	while (here != null){
		var lk = namespace_lookup(here, names, 0, err);
		if (lk.type == LKUP_NSNAME)
			return lk;
		here = here.next;
	}

	// failed, try parent scope
	if (sc.parent == null)
		return lkup_notfound();
	return scope_lookup(sc.parent, names);
}

function scope_lookup(sc, names){
	var err = [null];
	var lk = scope_tryLookup(sc, names, err);
	if (lk == LKUP_NOTFOUND && err[0] != null)
		return lkup_error(err[0]);
	return lk;
}

//
// chunk process result
//

var CPR_OK      = 0;
var CPR_INCLUDE = 1;
var CPR_ERROR   = 2;

function cpr_ok(){
	return { type: CPR_OK };
}

function cpr_include(file){
	return { type: CPR_INCLUDE, file: file };
}

function cpr_error(msg){
	return { type: CPR_ERROR, msg: msg };
}

//
// chunk state helpers
//

function ets_new(tk, next){ // exprPreStack, exprMidStack
	return { tk: tk, next: next };
}

function exs_new(ex, next){ // exprStack
	return { ex: ex, next: next };
}

function eps_new(ets, next){ // exprPreStackStack
	return { ets: ets, next: next };
}

function vn_new(vl, ns, name){ // varNames
	return { vl: vl, ns: ns, name: name };
}

//
// chunk state
//

var CST_STATEMENT = 0;

function cst_new(state, next){
	return {
		state: state,
		exprComma: false,
		exprPreStackStack: null, // linked list of eps_new's
		exprPreStack: null,      // linked list of ets_new's
		exprMidStack: null,      // linked list of ets_new's
		exprStack: null,         // linked list of exs_new's
		exprTerm: null,          // expr
		exprTerm2: null,         // expr
		lookupNames: null,       // list of strings
		varNames: null,          // list of vn_new's
		next: next
	};
}

function cst_newPush(state, next){
	return cst_new(state, next);
}

//
// chunk
//

function chunk_new(parent){
	var fr = frame_new(null);
	return {
		state: cst_new(CST_STATEMENT, null),
		fr: fr,
		sc: scope_new(fr, null),
		tkR: null,
		tk1: null,
		tk2: null,
		level: 0,
		parent: parent
	};
}

function chunk_loadStandardLib(chk){
	([
		{ name: 'say'        , opcode: OP_SAY         , params: -1 },
		{ name: 'ask'        , opcode: OP_ASK         , params: -1 },
		{ name: 'pick'       , opcode: -1             , params:  3 },
		{ namespace: 'num' },
			{ name: 'floor'  , opcode: OP_NUM_FLOOR   , params:  1 },
			{ name: 'ceil'   , opcode: OP_NUM_CEIL    , params:  1 },
			{ name: 'round'  , opcode: OP_NUM_ROUND   , params:  1 },
			{ name: 'sin'    , opcode: OP_NUM_SIN     , params:  1 },
			{ name: 'cos'    , opcode: OP_NUM_COS     , params:  1 },
			{ name: 'tan'    , opcode: OP_NUM_TAN     , params:  1 },
			{ name: 'asin'   , opcode: OP_NUM_ASIN    , params:  1 },
			{ name: 'acos'   , opcode: OP_NUM_ACOS    , params:  1 },
			{ name: 'atan'   , opcode: OP_NUM_ATAN    , params:  1 },
			{ name: 'atan2'  , opcode: OP_NUM_ATAN2   , params:  2 },
			{ name: 'log'    , opcode: OP_NUM_LOG     , params:  1 },
			{ name: 'log2'   , opcode: OP_NUM_LOG2    , params:  1 },
			{ name: 'log10'  , opcode: OP_NUM_LOG10   , params:  1 },
			{ name: 'abs'    , opcode: OP_NUM_ABS     , params:  1 },
			{ name: 'pi'     , opcode: OP_NUM_PI      , params:  0 },
			{ name: 'tau'    , opcode: OP_NUM_TAU     , params:  0 },
			{ name: 'lerp'   , opcode: OP_NUM_LERP    , params:  3 },
			{ name: 'max'    , opcode: OP_NUM_MAX     , params:  1 },
			{ name: 'min'    , opcode: OP_NUM_MIN     , params:  1 },
		{ endnamespace: true },
		{ namespace: 'list' },
			{ name: 'new'    , opcode: OP_LIST_NEW    , params:  2 },
			{ name: 'find'   , opcode: OP_LIST_FIND   , params:  3 },
			{ name: 'findRev', opcode: OP_LIST_FINDREV, params:  3 },
			{ name: 'rev'    , opcode: OP_LIST_REV    , params:  1 },
			{ name: 'join'   , opcode: OP_LIST_JOIN   , params:  2 },
		{ endnamespace: true }
	]).forEach(function(s){
		if (s.namespace){
			var ns = namespace_new(chk.fr, chk.sc.ns);
			chk.sc.ns.names = nsname_newNamespace(s.namespace, ns, chk.sc.ns.names);
			chk.sc.ns = ns;
		}
		else if (s.endnamespace)
			chk.sc.ns = chk.sc.ns.next;
		else
			chk.sc.ns.names = nsname_newCmdOpcode(s.name, s.opcode, s.params, chk.sc.ns.names);
	});
}

function chunk_process(chk, tk){
}





