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

var KS_INVALID    = 'KS_INVALID';
var KS_PLUS       = 'KS_PLUS';
var KS_MINUS      = 'KS_MINUS';
var KS_PERCENT    = 'KS_PERCENT';
var KS_STAR       = 'KS_STAR';
var KS_SLASH      = 'KS_SLASH';
var KS_CARET      = 'KS_CARET';
var KS_AMP        = 'KS_AMP';
var KS_LT         = 'KS_LT';
var KS_GT         = 'KS_GT';
var KS_BANG       = 'KS_BANG';
var KS_EQU        = 'KS_EQU';
var KS_TILDE      = 'KS_TILDE';
var KS_COLON      = 'KS_COLON';
var KS_COMMA      = 'KS_COMMA';
var KS_PERIOD     = 'KS_PERIOD';
var KS_LPAREN     = 'KS_LPAREN';
var KS_LBRACKET   = 'KS_LBRACKET';
var KS_LBRACE     = 'KS_LBRACE';
var KS_RPAREN     = 'KS_RPAREN';
var KS_RBRACKET   = 'KS_RBRACKET';
var KS_RBRACE     = 'KS_RBRACE';
var KS_PLUSEQU    = 'KS_PLUSEQU';
var KS_MINUSEQU   = 'KS_MINUSEQU';
var KS_PERCENTEQU = 'KS_PERCENTEQU';
var KS_STAREQU    = 'KS_STAREQU';
var KS_SLASHEQU   = 'KS_SLASHEQU';
var KS_CARETEQU   = 'KS_CARETEQU';
var KS_LTEQU      = 'KS_LTEQU';
var KS_GTEQU      = 'KS_GTEQU';
var KS_BANGEQU    = 'KS_BANGEQU';
var KS_EQU2       = 'KS_EQU2';
var KS_TILDEEQU   = 'KS_TILDEEQU';
var KS_TILDEPLUS  = 'KS_TILDEPLUS';
var KS_PLUSTILDE  = 'KS_PLUSTILDE';
var KS_TILDEMINUS = 'KS_TILDEMINUS';
var KS_MINUSTILDE = 'KS_MINUSTILDE';
var KS_AMP2       = 'KS_AMP2';
var KS_PIPE2      = 'KS_PIPE2';
var KS_PERIOD3    = 'KS_PERIOD3';
var KS_TILDE2PLUS = 'KS_TILDE2PLUS';
var KS_PLUSTILDE2 = 'KS_PLUSTILDE2';
var KS_PIPE2EQU   = 'KS_PIPE2EQU';
var KS_AMP2EQU    = 'KS_AMP2EQU';
var KS_BREAK      = 'KS_BREAK';
var KS_CONTINUE   = 'KS_CONTINUE';
var KS_DECLARE    = 'KS_DECLARE';
var KS_DEF        = 'KS_DEF';
var KS_DO         = 'KS_DO';
var KS_ELSE       = 'KS_ELSE';
var KS_ELSEIF     = 'KS_ELSEIF';
var KS_END        = 'KS_END';
var KS_FOR        = 'KS_FOR';
var KS_GOTO       = 'KS_GOTO';
var KS_IF         = 'KS_IF';
var KS_INCLUDE    = 'KS_INCLUDE';
var KS_NAMESPACE  = 'KS_NAMESPACE';
var KS_RETURN     = 'KS_RETURN';
var KS_TYPENUM    = 'KS_TYPENUM';
var KS_TYPESTR    = 'KS_TYPESTR';
var KS_TYPELIST   = 'KS_TYPELIST';
var KS_USING      = 'KS_USING';
var KS_VAR        = 'KS_VAR';
var KS_WHILE      = 'KS_WHILE';

function ks_char(c){
	if      (c == '+') return KS_PLUS;
	else if (c == '-') return KS_MINUS;
	else if (c == '%') return KS_PERCENT;
	else if (c == '*') return KS_STAR;
	else if (c == '/') return KS_SLASH;
	else if (c == '^') return KS_CARET;
	else if (c == '&') return KS_AMP;
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
	if      (c1 == '.' && c2 == '.' && c3 == '.') return KS_PERIOD3;
	else if (c1 == '~' && c2 == '~' && c3 == '+') return KS_TILDE2PLUS;
	else if (c1 == '+' && c2 == '~' && c3 == '~') return KS_PLUSTILDE2;
	else if (c1 == '|' && c2 == '|' && c3 == '=') return KS_PIPE2EQU;
	else if (c1 == '&' && c2 == '&' && c3 == '=') return KS_AMP2EQU;
	return KS_INVALID;
}

function ks_isSpecial(c){
	return ks_char(c) != KS_INVALID || c == '|';
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

var TOK_NEWLINE = 'TOK_NEWLINE';
var TOK_KS      = 'TOK_KS';
var TOK_IDENT   = 'TOK_IDENT';
var TOK_NUM     = 'TOK_NUM';
var TOK_STR     = 'TOK_STR';
var TOK_ERROR   = 'TOK_ERROR';

function tok_newline(){
	return { type: TOK_NEWLINE };
}

function tok_ks(k){
	return { type: TOK_KS, k: k };
}

function tok_ident(ident){
	return { type: TOK_IDENT, ident: ident };
}

function tok_num(num){
	return { type: TOK_NUM, num: num };
}

function tok_str(str){
	return { type: TOK_STR, str: str };
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
			tk.k == KS_AMP        ||
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
		tk.type == TOK_IDENT ||
		tk.type == TOK_NUM   ||
		tk.type == TOK_STR;
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

var EXPR_NIL     = 'EXPR_NIL';
var EXPR_NUM     = 'EXPR_NUM';
var EXPR_STR     = 'EXPR_STR';
var EXPR_LIST    = 'EXPR_LIST';
var EXPR_NAMES   = 'EXPR_NAMES';
var EXPR_POSTFIX = 'EXPR_POSTFIX';
var EXPR_PREFIX  = 'EXPR_PREFIX';
var EXPR_INFIX   = 'EXPR_INFIX';
var EXPR_GROUP   = 'EXPR_GROUP';
var EXPR_CALL    = 'EXPR_CALL';
var EXPR_INDEX   = 'EXPR_INDEX';
var EXPR_SLICE   = 'EXPR_SLICE';

function expr_nil(){
	return { type: EXPR_NIL };
}

function expr_num(num){
	return { type: EXPR_NUM, num: num };
}

function expr_str(str){
	return { type: EXPR_STR, str: str };
}

function expr_list(ex){
	return { type: EXPR_LIST, ex: ex };
}

function expr_names(names){
	return { type: EXPR_NAMES, names: names };
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
		return { type: EXPR_GROUP, group: g };
	}
	return { type: EXPR_GROUP, group: [left, right] };
}

function expr_infix(k, left, right){
	if (k == KS_COMMA)
		return expr_group(left, right);
	return { type: EXPR_INFIX, k: k, left: left, right: right };
}

function expr_call(cmd, params){
	return { type: EXPR_CALL, cmd: cmd, params: params };
}

function expr_index(ex, index){
	return { type: EXPR_INDEX, ex: ex, index: index };
}

function expr_slice(ex, left, right){
	return { type: EXPR_SLICE, ex: ex, left: left, right: right };
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

var LEX_START              = 'LEX_START';
var LEX_COMMENT_LINE       = 'LEX_COMMENT_LINE';
var LEX_BACKSLASH          = 'LEX_BACKSLASH';
var LEX_RETURN             = 'LEX_RETURN';
var LEX_COMMENT_BLOCK      = 'LEX_COMMENT_BLOCK';
var LEX_SPECIAL1           = 'LEX_SPECIAL1';
var LEX_SPECIAL2           = 'LEX_SPECIAL2';
var LEX_IDENT              = 'LEX_IDENT';
var LEX_NUM_0              = 'LEX_NUM_0';
var LEX_NUM_2              = 'LEX_NUM_2';
var LEX_NUM                = 'LEX_NUM';
var LEX_NUM_FRAC           = 'LEX_NUM_FRAC';
var LEX_NUM_EXP            = 'LEX_NUM_EXP';
var LEX_NUM_EXP_BODY       = 'LEX_NUM_EXP_BODY';
var LEX_STR_BASIC          = 'LEX_STR_BASIC';
var LEX_STR_BASIC_ESC      = 'LEX_STR_BASIC_ESC';
var LEX_STR_INTERP         = 'LEX_STR_INTERP';
var LEX_STR_INTERP_DLR     = 'LEX_STR_INTERP_DLR';
var LEX_STR_INTERP_DLR_ID  = 'LEX_STR_INTERP_DLR_ID';
var LEX_STR_INTERP_ESC     = 'LEX_STR_INTERP_ESC';
var LEX_STR_INTERP_ESC_HEX = 'LEX_STR_INTERP_ESC_HEX';

function lex_new(){
	return {
		state: LEX_START,
		chR: 0,
		ch1: 0,
		ch2: 0,
		ch3: 0,
		ident: '',
		str: null,
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

function lex_rev(lx){
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
					lx.str = [];
					lx.state = LEX_STR_INTERP;
					return [tok_ks(KS_RPAREN), tok_ks(KS_TILDE)];
				}
				lx.state = LEX_SPECIAL1;
				return [];
			}
			else if (isIdentStart(ch1)){
				lx.ident = ch1;
				lx.state = LEX_IDENT;
				return [];
			}
			else if (isNum(ch1)){
				lx.num_val = toHex(ch1);
				lx.num_base = 10;
				if (lx.num_val == 0)
					lx.state = LEX_NUM_0;
				else
					lx.state = LEX_NUM;
				return [];
			}
			else if (ch1 == '\''){
				lx.str = [];
				lx.state = LEX_STR_BASIC;
				return [];
			}
			else if (ch1 == '"'){
				lx.str = [];
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
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			return [tok_error('Unexpected characters: ' + lx.ch2 + ch1)];
		} break;

		case LEX_SPECIAL2: {
			var ks3 = ks_char3(lx.ch3, lx.ch2, ch1);
			if (ks3 != KS_INVALID){
				lx.state = LEX_START;
				return [tok_ks(ks3)];
			}
			var ks2 = ks_char2(lx.ch3, lx.ch2);
			if (ks2 != KS_INVALID){
				var tk = tok_ks(ks2);
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			var ks1 = ks_char(lx.ch3);
			if (ks1 != KS_INVALID){
				var tk = tok_ks(ks1);
				lx.state = LEX_START;
				lex_rev(lx);
				var t1 = lex_process(lx);
				lex_fwd(lx, lx.chR);
				var t2 = lex_process(lx);
				t1.unshift(tk);
				return t1.concat(t2);
			}
			return [tok_error('Unexpected characters: ' + lx.ch3 + lx.ch2 + ch1)];
		} break;

		case LEX_IDENT:
			if (!isIdentBody(ch1)){
				var tk;
				var ksk = ks_str(lx.ident);
				if (ksk != KS_INVALID)
					tk = tok_ks(ksk);
				else
					tk = tok_ident(lx.ident);
				lx.state = LEX_START;
				var t = lex_process(lx);
				t.unshift(tk);
				return t;
			}
			lx.ident += ch1;
			if (lx.ident.length > 1024)
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
				lx.state = LEX_START;
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
				return [tok_ks(KS_LPAREN), tok_str(lx.str), tok_ks(KS_RPAREN)];
			}
			else if (ch1 == '\\'){
				lx.state = LEX_STR_BASIC_ESC;
				return [];
			}
			lx.str.push(ch1.charCodeAt(0));
			return [];

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\\' || ch1 == '\''){
				lx.str.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_BASIC;
				return [];
			}
			return [tok_error('Invalid escape sequence: \\' + ch1)];

		case LEX_STR_INTERP:
			if (ch1 == '\r' || ch1 == '\n')
				return [tok_error('Missing end of string')];
			else if (ch1 == '"'){
				lx.state = LEX_START;
				return [tok_str(lx.str), tok_ks(KS_RPAREN)];
			}
			else if (ch1 == '$'){
				lx.state = LEX_STR_INTERP_DLR;
				if (lx.str.length <= 0)
					return [];
				return [tok_str(lx.str), tok_ks(KS_TILDE)];
			}
			else if (ch1 == '\\'){
				lx.state = LEX_STR_INTERP_ESC;
				return [];
			}
			lx.str.push(ch1.charCodeAt(0));
			return [];

		case LEX_STR_INTERP_DLR:
			if (ch1 == '{'){
				lx.str_depth++;
				lx.state = LEX_START;
				return [tok_ks(KS_LPAREN)];
			}
			else if (isIdentStart(ch1)){
				lx.ident = ch1;
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
				lx.str = [];
				lx.state = LEX_STR_INTERP;
				var t = lex_process(lx);
				t.unshift(tok_ks(KS_TILDE));
				t.unshift(tk);
				return t;
			}
			lx.ident += ch1;
			if (lx.ident.length > 1024)
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
				lx.str.push(0);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'b'){
				lx.str.push(8);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 't'){
				lx.str.push(9);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'n'){
				lx.str.push(10);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'v'){
				lx.str.push(11);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'f'){
				lx.str.push(12);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == 'r'){
				lx.str.push(13);
				lx.state = LEX_STR_INTERP;
				return [];
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				lx.str.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_INTERP;
				return [];
			}
			return [tok_error('Invalid escape sequence: \\' + ch1)];

		case LEX_STR_INTERP_ESC_HEX:
			if (isHex(ch1)){
				lx.str_hexval = (str_hexval * 16) + toHex(ch1);
				lx.str_hexleft--;
				if (lx.str_hexleft <= 0){
					lx.str.push(lx.str_hexval);
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
			var ks2 = ks_char2(lx.ch2, lx.ch1);
			if (ks2 != KS_INVALID)
				return [tok_ks(ks2), tok_newline()];
			var ks1 = ks_char(lx.ch2);
			ks2 = ks_char(lx.ch1);
			if (ks1 != KS_INVALID){
				var tk = tok_ks(ks1);
				if (ks2 != KS_INVALID)
					return [tk, tok_ks(ks2), tok_newline()];
				return [tk, tok_error('Unexpected character: ' + lx.ch1)];
			}
			return [tok_error('Unexpected character: ' + lx.ch2)];
		} break;

		case LEX_IDENT: {
			var ksk = ks_str(lx.ident);
			if (ksk != KS_INVALID)
				return [tok_ks(ksk), tok_newline()];
			return [tok_ident(lx.ident), tok_newline()];
		} break;

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
// ast
//

var AST_BREAK     = 'AST_BREAK';
var AST_CONTINUE  = 'AST_CONTINUE';
var AST_LABEL     = 'AST_LABEL';
var AST_EVAL      = 'AST_EVAL';
var AST_GOTO      = 'AST_GOTO';
var AST_DO_END    = 'AST_DO_END';
var AST_DO_WHILE  = 'AST_DO_WHILE';
var AST_NAMESPACE = 'AST_NAMESPACE';
var AST_IF        = 'AST_IF';
var AST_RETURN    = 'AST_RETURN';
var AST_USING     = 'AST_USING';
var AST_DECLARE   = 'AST_DECLARE';

function ast_break(){
	return { type: AST_BREAK };
}

function ast_continue(){
	return { type: AST_CONTINUE };
}

function ast_label(names){
	return { type: AST_LABEL, names: names };
}

function ast_eval(ex){
	return { type: AST_EVAL, ex: ex };
}

function ast_goto(names){
	return { type: AST_GOTO, names: names };
}

function ast_doEnd(body){
	return { type: AST_DO_END, body: body };
}

function ast_doWhile(doBody, cond, whileBody){
	return { type: AST_DO_WHILE, doBody: doBody, cond: cond, whileBody: whileBody };
}

function ast_namespace(names, body){
	return { type: AST_NAMESPACE, names: names, body: body };
}

function ast_if(conds, elseBody){
	return { type: AST_IF, conds: conds, elseBody: elseBody };
}

function ast_return(ex){
	return { type: AST_RETURN, ex: ex };
}

function ast_using(namesList){
	return { type: AST_USING, namesList: namesList };
}

function ast_declare(decls){
	return { type: AST_DECLARE, decls: decls };
}

//
// parser state helpers
//

function cond_new(ex, body){ // conds
	return { ex: ex, body: body };
}

var DECL_LOCAL  = 'DECL_LOCAL';
var DECL_NATIVE = 'DECL_NATIVE';

function decl_local(names){
	return { type: DECL_LOCAL, names: names };
}

function decl_native(names, key){
	return { type: DECL_NATIVE, names: names, key: key };
}

function ets_new(tk, next){ // exprPreStack, exprMidStack
	return { tk: tk, next: next };
}

function exs_new(ex, next){ // exprStack
	return { ex: ex, next: next };
}

function eps_new(ets, next){ // exprPreStackStack
	return { ets: ets, next: next };
}

//
// parser state
//

var PRS_START                       = 'PRS_START';
var PRS_START_STATEMENT             = 'PRS_START_STATEMENT';
var PRS_STATEMENT                   = 'PRS_STATEMENT';
var PRS_LOOKUP                      = 'PRS_LOOKUP';
var PRS_LOOKUP_IDENT                = 'PRS_LOOKUP_IDENT';
var PRS_BODY                        = 'PRS_BODY';
var PRS_BODY_STATEMENT              = 'PRS_BODY_STATEMENT';
var PRS_BREAK                       = 'PRS_BREAK';
var PRS_CONTINUE                    = 'PRS_CONTINUE';
var PRS_DECLARE                     = 'PRS_DECLARE';
var PRS_DECLARE2                    = 'PRS_DECLARE2';
var PRS_DECLARE_LOOKUP              = 'PRS_DECLARE_LOOKUP';
var PRS_DECLARE_STR                 = 'PRS_DECLARE_STR';
var PRS_DECLARE_STR2                = 'PRS_DECLARE_STR2';
var PRS_DECLARE_STR3                = 'PRS_DECLARE_STR3';
var PRS_DEF                         = 'PRS_DEF';
var PRS_DO                          = 'PRS_DO';
var PRS_DO_BODY                     = 'PRS_DO_BODY';
var PRS_DO_DONE                     = 'PRS_DO_DONE';
var PRS_DO_WHILE_EXPR               = 'PRS_DO_WHILE_EXPR';
var PRS_DO_WHILE_BODY               = 'PRS_DO_WHILE_BODY';
var PRS_DO_WHILE_DONE               = 'PRS_DO_WHILE_DONE';
var PRS_FOR                         = 'PRS_FOR';
var PRS_GOTO                        = 'PRS_GOTO';
var PRS_GOTO_LOOKUP                 = 'PRS_GOTO_LOOKUP';
var PRS_IF                          = 'PRS_IF';
var PRS_IF_EXPR                     = 'PRS_IF_EXPR';
var PRS_IF_BODY                     = 'PRS_IF_BODY';
var PRS_IF_DONE                     = 'PRS_IF_DONE';
var PRS_ELSE_BODY                   = 'PRS_ELSE_BODY';
var PRS_ELSE_DONE                   = 'PRS_ELSE_DONE';
var PRS_NAMESPACE                   = 'PRS_NAMESPACE';
var PRS_NAMESPACE_LOOKUP            = 'PRS_NAMESPACE_LOOKUP';
var PRS_NAMESPACE_BODY              = 'PRS_NAMESPACE_BODY';
var PRS_NAMESPACE_DONE              = 'PRS_NAMESPACE_DONE';
var PRS_RETURN                      = 'PRS_RETURN';
var PRS_RETURN_DONE                 = 'PRS_RETURN_DONE';
var PRS_USING                       = 'PRS_USING';
var PRS_USING2                      = 'PRS_USING2';
var PRS_USING_LOOKUP                = 'PRS_USING_LOOKUP';
var PRS_VAR                         = 'PRS_VAR';
var PRS_IDENTS                      = 'PRS_IDENTS';
var PRS_EVAL                        = 'PRS_EVAL';
var PRS_EVAL_EXPR                   = 'PRS_EVAL_EXPR';
var PRS_EXPR                        = 'PRS_EXPR';
var PRS_EXPR_TERM                   = 'PRS_EXPR_TERM';
var PRS_EXPR_TERM_ISEMPTYLIST       = 'PRS_EXPR_TERM_ISEMPTYLIST';
var PRS_EXPR_TERM_CLOSEBRACE        = 'PRS_EXPR_TERM_CLOSEBRACE';
var PRS_EXPR_TERM_ISNIL             = 'PRS_EXPR_TERM_ISNIL';
var PRS_EXPR_TERM_CLOSEPAREN        = 'PRS_EXPR_TERM_CLOSEPAREN';
var PRS_EXPR_TERM_LOOKUP            = 'PRS_EXPR_TERM_LOOKUP';
var PRS_EXPR_POST                   = 'PRS_EXPR_POST';
var PRS_EXPR_POST_CALL              = 'PRS_EXPR_POST_CALL';
var PRS_EXPR_INDEX_CHECK            = 'PRS_EXPR_INDEX_CHECK';
var PRS_EXPR_INDEX_COLON_CHECK      = 'PRS_EXPR_INDEX_COLON_CHECK';
var PRS_EXPR_INDEX_COLON_EXPR       = 'PRS_EXPR_INDEX_COLON_EXPR';
var PRS_EXPR_INDEX_EXPR_CHECK       = 'PRS_EXPR_INDEX_EXPR_CHECK';
var PRS_EXPR_INDEX_EXPR_COLON_CHECK = 'PRS_EXPR_INDEX_EXPR_COLON_CHECK';
var PRS_EXPR_INDEX_EXPR_COLON_EXPR  = 'PRS_EXPR_INDEX_EXPR_COLON_EXPR';
var PRS_EXPR_COMMA                  = 'PRS_EXPR_COMMA';
var PRS_EXPR_MID                    = 'PRS_EXPR_MID';
var PRS_EXPR_FINISH                 = 'PRS_EXPR_FINISH';

function prs_new(state, next){
	return {
		state: state,
		stmt: null,              // single ast_*
		body: null,              // list of ast_*'s
		body2: null,             // list of ast_*'s
		conds: null,             // list of cond_new's
		decls: null,             // list of decl_*'s
		exprComma: false,
		exprPreStackStack: null, // linked list of eps_new's
		exprPreStack: null,      // linked list of ets_new's
		exprMidStack: null,      // linked list of ets_new's
		exprStack: null,         // linked list of exs_new's
		exprTerm: null,          // expr
		exprTerm2: null,         // expr
		exprTerm3: null,         // expr
		names: null,             // list of strings
		namesList: null,         // list of list of strings
		next: next
	};
}

//
// parser result
//

var PRR_MORE      = 'PRR_MORE';
var PRR_STATEMENT = 'PRR_STATEMENT';
var PRR_ERROR     = 'PRR_ERROR';

function prr_more(){
	return { type: PRR_MORE };
}

function prr_statement(stmt){
	return { type: PRR_STATEMENT, stmt: stmt };
}

function prr_error(msg){
	return { type: PRR_ERROR, msg: msg };
}

//
// parser
//

function parser_new(){
	return {
		state: prs_new(PRS_START, null),
		tkR: null,
		tk1: null,
		tk2: null,
		level: 0
	};
}

function parser_fwd(pr, tk){
	pr.tk2 = pr.tk1;
	pr.tk1 = tk;
	pr.tkR = null;
}

function parser_rev(pr){
	pr.tkR = pr.tk1;
	pr.tk1 = pr.tk2;
	pr.tk2 = null;
}

function parser_statement(pr, stmt){
	pr.level--;
	pr.state = pr.state.next;
	pr.state.stmt = stmt;
	return parser_process(pr);
}

function parser_push(pr, state){
	pr.state = prs_new(state, pr.state);
}

function parser_start(pr, state){
	pr.level++;
	pr.state.state = state;
	return prr_more();
}

function parser_process(pr){
	var tk1 = pr.tk1;
	var st = pr.state;
	switch (st.state){
		case PRS_START:
			st.state = PRS_START_STATEMENT;
			st.stmt = null;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr);

		case PRS_START_STATEMENT:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_START;
			return prr_statement(st.stmt);

		case PRS_STATEMENT:
			if      (tk1.type == TOK_NEWLINE    ) return prr_more();
			else if (tok_isKS(tk1, KS_BREAK    )) return parser_start(pr, PRS_BREAK    );
			else if (tok_isKS(tk1, KS_CONTINUE )) return parser_start(pr, PRS_CONTINUE );
			else if (tok_isKS(tk1, KS_DECLARE  )) return parser_start(pr, PRS_DECLARE  );
			else if (tok_isKS(tk1, KS_DEF      )) return parser_start(pr, PRS_DEF      );
			else if (tok_isKS(tk1, KS_DO       )) return parser_start(pr, PRS_DO       );
			else if (tok_isKS(tk1, KS_FOR      )) return parser_start(pr, PRS_FOR      );
			else if (tok_isKS(tk1, KS_GOTO     )) return parser_start(pr, PRS_GOTO     );
			else if (tok_isKS(tk1, KS_IF       )) return parser_start(pr, PRS_IF       );
			else if (tok_isKS(tk1, KS_NAMESPACE)) return parser_start(pr, PRS_NAMESPACE);
			else if (tok_isKS(tk1, KS_RETURN   )) return parser_start(pr, PRS_RETURN   );
			else if (tok_isKS(tk1, KS_USING    )) return parser_start(pr, PRS_USING    );
			else if (tok_isKS(tk1, KS_VAR      )) return parser_start(pr, PRS_VAR      );
			else if (tk1.type == TOK_IDENT){
				st.state = PRS_IDENTS;
				parser_push(pr, PRS_LOOKUP);
				pr.state.names = [tk1.ident];
				return prr_more();
			}
			else if (tok_isPre(tk1) || tok_isTerm(tk1)){
				st.state = PRS_EVAL;
				return parser_process(pr);
			}
			else if (tok_isKS(tk1, KS_END) || tok_isKS(tk1, KS_ELSE) || tok_isKS(tk1, KS_ELSEIF) ||
				tok_isKS(tk1, KS_WHILE)){
				// stmt is already null, so don't touch it, so we return null
				pr.state = st.next;
				return parser_process(pr);
			}
			return prr_error('Invalid statement');

		case PRS_LOOKUP:
			if (!tok_isKS(tk1, KS_PERIOD)){
				st.next.names = st.names;
				pr.state = st.next;
				return parser_process(pr);
			}
			st.state = PRS_LOOKUP_IDENT;
			return prr_more();

		case PRS_LOOKUP_IDENT:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.names.push(tk1.ident);
			st.state = PRS_LOOKUP;
			return prr_more();

		case PRS_BODY:
			st.state = PRS_BODY_STATEMENT;
			st.stmt = null;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr);

		case PRS_BODY_STATEMENT:
			if (st.stmt == null){
				st.next.body = st.body;
				pr.state = st.next;
				return parser_process(pr);
			}
			st.body.push(st.stmt);
			st.stmt = null;
			parser_push(pr, PRS_STATEMENT);
			return prr_more();

		case PRS_BREAK:
			return parser_statement(pr, ast_break());

		case PRS_CONTINUE:
			return parser_statement(pr, ast_continue());

		case PRS_DECLARE:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Expecting identifier');
			st.decls = [];
			st.state = PRS_DECLARE2;
			return parser_process(pr);

		case PRS_DECLARE2:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_DECLARE_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_DECLARE_LOOKUP:
			if (tok_isKS(tk1, KS_LPAREN)){
				st.state = PRS_DECLARE_STR;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st.decls.push(decl_local(st.names));
				st.state = PRS_DECLARE2;
				return prr_more();
			}
			st.decls.push(decl_local(st.names));
			return parser_statement(pr, ast_declare(st.decls));

		case PRS_DECLARE_STR:
			if (tk1.type != TOK_STR)
				return prr_error('Expecting string constant');
			st.decls.push(decl_native(st.names, tk1.str));
			st.state = PRS_DECLARE_STR2;
			return prr_more();

		case PRS_DECLARE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error('Expecting string constant');
			st.state = PRS_DECLARE_STR3;
			return prr_more();

		case PRS_DECLARE_STR3:
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_DECLARE2;
				return prr_more();
			}
			return parser_statement(pr, ast_declare(st.decls));

		case PRS_DEF:
			throw 'TODO: def';

		case PRS_DO:
			st.state = PRS_DO_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return parser_process(pr);

		case PRS_DO_BODY:
			if (tok_isKS(tk1, KS_WHILE)){
				st.body2 = st.body;
				st.body = null;
				st.state = PRS_DO_WHILE_EXPR;
				parser_push(pr, PRS_EXPR);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				st.state = PRS_DO_DONE;
				return prr_more();
			}
			return prr_error('Missing `while` or `end` of do block');

		case PRS_DO_DONE:
			return parser_statement(pr, ast_doEnd(st.body));

		case PRS_DO_WHILE_EXPR:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_DO_WHILE_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return prr_more();

		case PRS_DO_WHILE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of do-while block');
			st.state = PRS_DO_WHILE_DONE;
			return prr_more();

		case PRS_DO_WHILE_DONE:
			return parser_statement(pr, ast_doWhile(st.body2, st.exprTerm, st.body));

		case PRS_FOR:
			throw 'TODO: for';

		case PRS_GOTO:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_GOTO_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_GOTO_LOOKUP:
			return parser_statement(pr, ast_goto(st.names));

		case PRS_IF:
			st.state = PRS_IF_EXPR;
			st.conds = [];
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_IF_EXPR:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_IF_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return prr_more();

		case PRS_IF_BODY:
			st.conds.push(cond_new(st.exprTerm, st.body));
			st.exprTerm = null;
			st.body = null;
			if (tok_isKS(tk1, KS_ELSEIF)){
				st.state = PRS_IF_EXPR;
				parser_push(pr, PRS_EXPR);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_ELSE)){
				st.state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				pr.state.body = [];
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				st.state = PRS_IF_DONE;
				return prr_more();
			}
			return prr_error('Missing `elseif`, `else`, or `end` of if block');

		case PRS_IF_DONE:
			return parser_statement(pr, ast_if(st.conds, []));

		case PRS_ELSE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of if block');
			st.state = PRS_ELSE_DONE;
			return prr_more();

		case PRS_ELSE_DONE:
			return parser_statement(pr, ast_if(st.conds, st.body));

		case PRS_NAMESPACE:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_NAMESPACE_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_NAMESPACE_LOOKUP:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_NAMESPACE_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return prr_more();

		case PRS_NAMESPACE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of namespace block');
			st.state = PRS_NAMESPACE_DONE;
			return prr_more();

		case PRS_NAMESPACE_DONE:
			return parser_statement(pr, ast_namespace(st.names, st.body));

		case PRS_RETURN:
			if (tk1.type == TOK_NEWLINE)
				return parser_statement(pr, ast_return(expr_nil()));
			st.state = PRS_RETURN_DONE;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_RETURN_DONE:
			return parser_statement(pr, ast_return(st.exprTerm));

		case PRS_USING:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Expecting identifier');
			st.namesList = [];
			st.state = PRS_USING2;
			return parser_process(pr);

		case PRS_USING2:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_USING_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_USING_LOOKUP:
			st.namesList.push(st.names);
			st.names = null;
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_USING2;
				return prr_more();
			}
			return parser_statement(pr, ast_using(st.namesList));

		case PRS_VAR:
			throw 'TODO: var';

		case PRS_IDENTS:
			if (tok_isKS(tk1, KS_COLON)){
				pr.state = st.next;
				return parser_statement(pr, ast_label(st.names));
			}
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR_POST);
			pr.state.exprTerm = expr_names(st.names);
			return parser_process(pr);

		case PRS_EVAL:
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_EVAL_EXPR:
			pr.level++;
			return parser_statement(pr, ast_eval(st.exprTerm));

		case PRS_EXPR:
			if (tok_isPre(tk1)){
				st.exprPreStack = ets_new(tk1, st.exprPreStack);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM;
			return parser_process(pr);

		case PRS_EXPR_TERM:
			if (tk1.type == TOK_NUM){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_num(tk1.num);
				return prr_more();
			}
			else if (tk1.type == TOK_STR){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_str(tk1.str);
				return prr_more();
			}
			else if (tk1.type == TOK_IDENT){
				st.state = PRS_EXPR_TERM_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr.state.names = [tk1.ident];
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LBRACE)){
				st.state = PRS_EXPR_TERM_ISEMPTYLIST;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LPAREN)){
				st.state = PRS_EXPR_TERM_ISNIL;
				return prr_more();
			}
			return prr_error('Invalid expression');

		case PRS_EXPR_TERM_ISEMPTYLIST:
			if (tok_isKS(tk1, KS_RBRACE)){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_list(null);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM_CLOSEBRACE;
			parser_push(pr, PRS_EXPR);
			pr.state.exprComma = true;
			pr.level++;
			return parser_process(pr);

		case PRS_EXPR_TERM_CLOSEBRACE:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error('Expecting close brace');
			st.exprTerm = expr_list(st.exprTerm);
			st.state = PRS_EXPR_POST;
			pr.level--;
			return prr_more();

		case PRS_EXPR_TERM_ISNIL:
			if (tok_isKS(tk1, KS_RPAREN)){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_nil();
				return prr_more();
			}
			st.state = PRS_EXPR_TERM_CLOSEPAREN;
			parser_push(pr, PRS_EXPR);
			pr.state.exprComma = true;
			pr.level++;
			return parser_process(pr);

		case PRS_EXPR_TERM_CLOSEPAREN:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error('Expecting close parenthesis');
			st.state = PRS_EXPR_POST;
			pr.level--;
			return prr_more();

		case PRS_EXPR_TERM_LOOKUP:
			st.exprTerm = expr_names(st.names);
			st.state = PRS_EXPR_POST;
			return parser_process(pr);

		case PRS_EXPR_POST:
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr);
			}
			else if (tok_isKS(tk1, KS_LBRACKET)){
				st.state = PRS_EXPR_INDEX_CHECK;
				return prr_more();
			}
			else if (tok_isMid(tk1)){
				if (st.exprComma && tok_isKS(pr, KS_COMMA)){
					st.state = PRS_EXPR_COMMA;
					return prr_more();
				}
				st.state = PRS_EXPR_MID;
				return parser_process(pr);
			}
			else if (tok_isKS(tk1, KS_RBRACE) || tok_isKS(tk1, KS_RBRACKET) ||
				tok_isKS(tk1, KS_RPAREN) || tok_isKS(tk1, KS_COLON)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr);
			}
			// otherwise, this should be a call
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_POST_CALL;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_EXPR_POST_CALL:
			st.exprTerm = expr_call(st.exprTerm2, st.exprTerm);
			st.exprTerm2 = null;
			st.state = PRS_EXPR_POST;
			return parser_process(pr);

		case PRS_EXPR_INDEX_CHECK:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_EXPR_INDEX_COLON_CHECK;
				return prr_more();
			}
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_EXPR_CHECK;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_EXPR_INDEX_COLON_CHECK:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st.exprTerm = expr_slice(st.exprTerm, null, null);
				st.state = PRS_EXPR_POST;
				return prr_more();
			}
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_EXPR_INDEX_COLON_EXPR:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_slice(st.exprTerm2, null, st.exprTerm);
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_CHECK:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_EXPR_INDEX_EXPR_COLON_CHECK;
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_index(st.exprTerm2, st.exprTerm);
			st.exprTerm2 = null;
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_COLON_CHECK:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st.exprTerm = expr_slice(st.exprTerm2, st.exprTerm, null);
				st.state = PRS_EXPR_POST;
				return prr_more();
			}
			st.exprTerm3 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_EXPR_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr);

		case PRS_EXPR_INDEX_EXPR_COLON_EXPR:
			if (tk1.type == TOK_NEWLINE)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_slice(st.exprTerm2, st.exprTerm3, st.exprTerm);
			st.exprTerm2 = null;
			st.exprTerm3 = null;
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_COMMA:
			if (tk1.type == TOK_NEWLINE){
				parser_rev(pr); // keep the comma in tk1
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RPAREN) && !tok_isKS(tk1, KS_RBRACE)){
				st.state = PRS_EXPR_MID;
				parser_rev(pr);
				parser_process(pr);
				parser_fwd(pr, pr.tkR);
				return parser_process(pr);
			}
			// found a trailing comma
			st.state = PRS_EXPR_FINISH;
			return parser_process(pr);

		case PRS_EXPR_MID:
			if (!tok_isMid(tk1)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr);
			}
			while (true){
				// fight between the Pre and the Mid
				while (st.exprPreStack != null && tok_isPreBeforeMid(st.exprPreStack.tk, tk1)){
					// apply the Pre
					st.exprTerm = expr_prefix(st.exprPreStack.tk, st.exprTerm);
					st.exprPreStack = st.exprPreStack.next;
				}

				// if we've exhaused the exprPreStack, then check against the exprMidStack
				if (st.exprPreStack == null && st.exprMidStack != null &&
					tok_isMidBeforeMid(st.exprMidStack.tk, tk1)){
					// apply the previous mMid
					st.exprTerm = expr_infix(st.exprMidStack.tk.k, st.exprStack.ex, st.exprTerm);
					st.exprPreStack = st.exprPreStackStack.ets;
					st.exprPreStackStack = st.exprPreStackStack.next;
					st.exprMidStack = st.exprMidStack.next;
					pr.level--;
				}
				else // otherwise, the current Mid wins
					break;
			}
			// finally, we're safe to apply the Mid...
			// except instead of applying it, we need to schedule to apply it, in case another
			// operator takes precedence over this one
			st.exprPreStackStack = eps_new(st.exprPreStack, st.exprPreStackStack);
			st.exprPreStack = null;
			st.exprStack = exs_new(st.exprTerm, st.exprStack);
			st.exprMidStack = ets_new(tk1, st.exprMidStack);
			st.state = PRS_EXPR;
			pr.level++;
			return prr_more();

		case PRS_EXPR_FINISH:
			while (true){
				// fight between the Pre and the Mid
				while (st.exprPreStack != null &&
					(st.exprMidStack == null ||
						tok_isPreBeforeMid(st.exprPreStack.tk, st.exprMidStack.tk))){
					// apply the Pre
					st.exprTerm = expr_prefix(st.exprPreStack.tk, st.exprTerm);
					st.exprPreStack = st.exprPreStack.next;
				}

				if (st.exprMidStack == null)
					break;

				// apply the Mid
				st.exprTerm = expr_infix(st.exprMidStack.tk.k, st.exprStack.ex, st.exprTerm);
				st.exprStack = st.exprStack.next;
				st.exprPreStack = st.exprPreStackStack.ets;
				st.exprPreStackStack = st.exprPreStackStack.next;
				st.exprMidStack = st.exprMidStack.next;
				pr.level--;
			}
			// everything has been applied, and exprTerm has been set!
			st.next.exprTerm = st.exprTerm;
			pr.state = st.next;
			return parser_process(pr);
	}
}

function parser_add(pr, tk){
	parser_fwd(pr, tk);
	return parser_process(pr);
}

//
// frame
//

var FVR_VAR        = 'FVR_VAR';
var FVR_TEMP_AVAIL = 'FVR_TEMP_AVAIL';
var FVR_TEMP_INUSE = 'FVR_TEMP_INUSE';

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

var NSN_VAR        = 'NSN_VAR';
var NSN_NAMESPACE  = 'NSN_NAMESPACE';
var NSN_CMD_LOCAL  = 'NSN_CMD_LOCAL';
var NSN_CMD_NATIVE = 'NSN_CMD_NATIVE';
var NSN_CMD_OPCODE = 'NSN_CMD_OPCODE';

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
	return scope_tryLookup(sc.parent, names, err);
}

//
// chunk
//

function chunk_loadStandardOps(chk){
	chunk_defOp(chk, 'say'        , OP_SAY         , -1);
	chunk_defOp(chk, 'ask'        , OP_ASK         , -1);
	chunk_defOp(chk, 'pick'       , -1             ,  3);
	chunk_pushNamespace(chk, 'num');
		chunk_defOp(chk, 'floor'  , OP_NUM_FLOOR   ,  1);
		chunk_defOp(chk, 'ceil'   , OP_NUM_CEIL    ,  1);
		chunk_defOp(chk, 'round'  , OP_NUM_ROUND   ,  1);
		chunk_defOp(chk, 'sin'    , OP_NUM_SIN     ,  1);
		chunk_defOp(chk, 'cos'    , OP_NUM_COS     ,  1);
		chunk_defOp(chk, 'tan'    , OP_NUM_TAN     ,  1);
		chunk_defOp(chk, 'asin'   , OP_NUM_ASIN    ,  1);
		chunk_defOp(chk, 'acos'   , OP_NUM_ACOS    ,  1);
		chunk_defOp(chk, 'atan'   , OP_NUM_ATAN    ,  1);
		chunk_defOp(chk, 'atan2'  , OP_NUM_ATAN2   ,  2);
		chunk_defOp(chk, 'log'    , OP_NUM_LOG     ,  1);
		chunk_defOp(chk, 'log2'   , OP_NUM_LOG2    ,  1);
		chunk_defOp(chk, 'log10'  , OP_NUM_LOG10   ,  1);
		chunk_defOp(chk, 'abs'    , OP_NUM_ABS     ,  1);
		chunk_defOp(chk, 'pi'     , OP_NUM_PI      ,  0);
		chunk_defOp(chk, 'tau'    , OP_NUM_TAU     ,  0);
		chunk_defOp(chk, 'lerp'   , OP_NUM_LERP    ,  3);
		chunk_defOp(chk, 'max'    , OP_NUM_MAX     ,  1);
		chunk_defOp(chk, 'min'    , OP_NUM_MIN     ,  1);
	chunk_popNamespace(chk);
	chunk_pushNamespace(chk, 'list');
		chunk_defOp(chk, 'new'    , OP_LIST_NEW    ,  2);
		chunk_defOp(chk, 'find'   , OP_LIST_FIND   ,  3);
		chunk_defOp(chk, 'findRev', OP_LIST_FINDREV,  3);
		chunk_defOp(chk, 'rev'    , OP_LIST_REV    ,  1);
		chunk_defOp(chk, 'join'   , OP_LIST_JOIN   ,  2);
	chunk_popNamespace(chk);
}

//
// compiler
//

var UTF8 = require('./utf8');

function compiler_new(){
	return {
		pr: parser_new(),
		file: null
	};
}

function compiler_makeError(cmp, msg){
	return (cmp.file.file == null ? '' : cmp.file.file + ':') +
		cmp.file.line + ':' + cmp.file.chr + ': ' + msg;
}

function compiler_processTokens(cmp, tks, err){
	for (var i = 0; i < tks.length; i++){
		var tk = tks[i];
		if (tk.type == TOK_ERROR){
			err[0] = compiler_makeError(cmp, tk.msg);
			return false;
		}
		console.log('token:', tk);
		var res = parser_add(cmp.pr, tk);
		if (res.type == PRR_STATEMENT)
			console.log(JSON.stringify(res.stmt, null, '  '));
		else if (res.type == PRR_ERROR){
			err[0] = res.msg;
			cmp.pr = parser_new();
			return false;
		}
	}
	return true;
}

function compiler_pushFile(cmp, file){
	cmp.file = {
		file: file,
		line: 1,
		chr: 1,
		lastret: false,
		lx: lex_new(),
		next: cmp.file
	};
}

function compiler_popFile(cmp, err){
	var tks = lex_close(cmp.lx);
	var res = compiler_processTokens(cmp, tks, err);
	cmp.file = cmp.file.next;
	return res;
}

function compiler_add(cmp, str, err){
	return compiler_addBytes(cmp, UTF8.encode(str), err);
}

function compiler_addBytes(cmp, bytes, err){
	for (var i = 0; i < bytes.length; i++){
		var line = cmp.file.line;
		var chr = cmp.file.chr;

		var ch = String.fromCharCode(bytes[i]);

		// calculate future line/chr
		if (ch == '\r'){
			cmp.file.lastret = true;
			cmp.file.line++;
			cmp.file.chr = 1;
		}
		else{
			if (ch == '\n'){
				if (!cmp.file.lastret){
					cmp.file.line++;
					cmp.file.chr = 1;
				}
			}
			else
				cmp.file.chr++;
			cmp.file.lastret = false;
		}

		var tks = lex_add(cmp.file.lx, ch);
		var res = compiler_processTokens(cmp, tks, err);
		if (!res)
			return false;
	}
	return true;
}

//
// JavaScript API
//

module.exports = {
	create: function(){
		var cmp = compiler_new();
		return {
			pushFile: function(file){
				compiler_pushFile(cmp, file);
			},
			popFile: function(){
				var err = [null];
				if (compiler_popFile(cmp, err) == false)
					return err[0];
				return false;
			},
			add: function(str){
				var err = [null];
				if (compiler_add(cmp, str, err) == false)
					return err[0];
				return false;
			}
		};
	}
};
