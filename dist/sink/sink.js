// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

(function(){

// used for detecting async objects
function isPromise(obj){
	return !!obj && (typeof obj === 'object' || typeof obj === 'function') &&
		typeof obj.then === 'function';
}

//
// opcodes
//

function varloc_new(fdiff, index){
	return { fdiff: fdiff, index: index };
}

var OP_NOP           = 0x00; //
var OP_ABORTERR      = 0x01; // ERRNO
var OP_MOVE          = 0x02; // [TGT], [SRC]
var OP_INC           = 0x03; // [TGT/SRC]
var OP_NIL           = 0x04; // [TGT]
var OP_NUMPOS        = 0x05; // [TGT], [VALUE]
var OP_NUMNEG        = 0x06; // [TGT], [VALUE]
var OP_NUMTBL        = 0x07; // [TGT], [INDEX]
var OP_STR           = 0x08; // [TGT], [INDEX]
var OP_LIST          = 0x09; // [TGT], HINT
var OP_ISNUM         = 0x0A; // [TGT], [SRC]
var OP_ISSTR         = 0x0B; // [TGT], [SRC]
var OP_ISLIST        = 0x0C; // [TGT], [SRC]
var OP_NOT           = 0x0D; // [TGT], [SRC]
var OP_SIZE          = 0x0E; // [TGT], [SRC]
var OP_TONUM         = 0x0F; // [TGT], [SRC]
var OP_CAT           = 0x10; // [TGT], [SRC1], [SRC2]
var OP_LT            = 0x11; // [TGT], [SRC1], [SRC2]
var OP_LTE           = 0x12; // [TGT], [SRC1], [SRC2]
var OP_NEQ           = 0x13; // [TGT], [SRC1], [SRC2]
var OP_EQU           = 0x14; // [TGT], [SRC1], [SRC2]
var OP_GETAT         = 0x15; // [TGT], [SRC1], [SRC2]
var OP_SLICE         = 0x16; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_SETAT         = 0x17; // [SRC1], [SRC2], [SRC3]
var OP_SPLICE        = 0x18; // [SRC1], [SRC2], [SRC3], [SRC4]
var OP_JUMP          = 0x19; // [[LOCATION]]
var OP_JUMPTRUE      = 0x1A; // [SRC], [[LOCATION]]
var OP_JUMPFALSE     = 0x1B; // [SRC], [[LOCATION]]
var OP_CALL          = 0x1C; // [TGT], [SRC], LEVEL, [[LOCATION]]
var OP_NATIVE        = 0x1D; // [TGT], [SRC], [INDEX]
var OP_RETURN        = 0x1E; // [SRC]
var OP_RETURNTAIL    = 0x1F; // [SRC], [[LOCATION]]
var OP_RANGE         = 0x20; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_SAY           = 0x21; // [TGT], [SRC...]
var OP_WARN          = 0x22; // [TGT], [SRC...]
var OP_ASK           = 0x23; // [TGT], [SRC...]
var OP_EXIT          = 0x24; // [TGT], [SRC...]
var OP_ABORT         = 0x25; // [TGT], [SRC...]
var OP_NUM_NEG       = 0x26; // [TGT], [SRC]
var OP_NUM_ADD       = 0x27; // [TGT], [SRC1], [SRC2]
var OP_NUM_SUB       = 0x28; // [TGT], [SRC1], [SRC2]
var OP_NUM_MUL       = 0x29; // [TGT], [SRC1], [SRC2]
var OP_NUM_DIV       = 0x2A; // [TGT], [SRC1], [SRC2]
var OP_NUM_MOD       = 0x2B; // [TGT], [SRC1], [SRC2]
var OP_NUM_POW       = 0x2C; // [TGT], [SRC1], [SRC2]
var OP_NUM_ABS       = 0x2D; // [TGT], [SRC]
var OP_NUM_SIGN      = 0x2E; // [TGT], [SRC]
var OP_NUM_MAX       = 0x2F; // [TGT], [SRC...]
var OP_NUM_MIN       = 0x30; // [TGT], [SRC...]
var OP_NUM_CLAMP     = 0x31; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_NUM_FLOOR     = 0x32; // [TGT], [SRC]
var OP_NUM_CEIL      = 0x33; // [TGT], [SRC]
var OP_NUM_ROUND     = 0x34; // [TGT], [SRC]
var OP_NUM_TRUNC     = 0x35; // [TGT], [SRC]
var OP_NUM_NAN       = 0x36; // [TGT]
var OP_NUM_INF       = 0x37; // [TGT]
var OP_NUM_ISNAN     = 0x38; // [TGT], [SRC]
var OP_NUM_ISFINITE  = 0x39; // [TGT], [SRC]
var OP_NUM_E         = 0x3A; // [TGT]
var OP_NUM_PI        = 0x3B; // [TGT]
var OP_NUM_TAU       = 0x3C; // [TGT]
var OP_NUM_SIN       = 0x3D; // [TGT], [SRC]
var OP_NUM_COS       = 0x3E; // [TGT], [SRC]
var OP_NUM_TAN       = 0x3F; // [TGT], [SRC]
var OP_NUM_ASIN      = 0x40; // [TGT], [SRC]
var OP_NUM_ACOS      = 0x41; // [TGT], [SRC]
var OP_NUM_ATAN      = 0x42; // [TGT], [SRC]
var OP_NUM_ATAN2     = 0x43; // [TGT], [SRC1], [SRC2]
var OP_NUM_LOG       = 0x44; // [TGT], [SRC]
var OP_NUM_LOG2      = 0x45; // [TGT], [SRC]
var OP_NUM_LOG10     = 0x46; // [TGT], [SRC]
var OP_NUM_EXP       = 0x47; // [TGT], [SRC]
var OP_NUM_LERP      = 0x48; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_NUM_HEX       = 0x49; // [TGT], [SRC1], [SRC2]
var OP_NUM_OCT       = 0x4A; // [TGT], [SRC1], [SRC2]
var OP_NUM_BIN       = 0x4B; // [TGT], [SRC1], [SRC2]
var OP_INT_NEW       = 0x4C; // [TGT], [SRC]
var OP_INT_NOT       = 0x4D; // [TGT], [SRC]
var OP_INT_AND       = 0x4E; // [TGT], [SRC1], [SRC2]
var OP_INT_OR        = 0x4F; // [TGT], [SRC1], [SRC2]
var OP_INT_XOR       = 0x50; // [TGT], [SRC1], [SRC2]
var OP_INT_SHL       = 0x51; // [TGT], [SRC1], [SRC2]
var OP_INT_SHR       = 0x52; // [TGT], [SRC1], [SRC2]
var OP_INT_SAR       = 0x53; // [TGT], [SRC1], [SRC2]
var OP_INT_ADD       = 0x54; // [TGT], [SRC1], [SRC2]
var OP_INT_SUB       = 0x55; // [TGT], [SRC1], [SRC2]
var OP_INT_MUL       = 0x56; // [TGT], [SRC1], [SRC2]
var OP_INT_DIV       = 0x57; // [TGT], [SRC1], [SRC2]
var OP_INT_MOD       = 0x58; // [TGT], [SRC1], [SRC2]
var OP_INT_CLZ       = 0x59; // [TGT], [SRC]
var OP_RAND_SEED     = 0x5A; // [TGT], [SRC]
var OP_RAND_SEEDAUTO = 0x5B; // [TGT]
var OP_RAND_INT      = 0x5C; // [TGT]
var OP_RAND_NUM      = 0x5D; // [TGT]
var OP_RAND_GETSTATE = 0x5E; // [TGT]
var OP_RAND_SETSTATE = 0x5F; // [TGT], [SRC]
var OP_RAND_PICK     = 0x60; // [TGT], [SRC]
var OP_RAND_SHUFFLE  = 0x61; // [TGT], [SRC]
var OP_STR_NEW       = 0x62; // [TGT], [SRC...]
var OP_STR_SPLIT     = 0x63; // [TGT], [SRC1], [SRC2]
var OP_STR_REPLACE   = 0x64; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_BEGINS    = 0x65; // [TGT], [SRC1], [SRC2]
var OP_STR_ENDS      = 0x66; // [TGT], [SRC1], [SRC2]
var OP_STR_PAD       = 0x67; // [TGT], [SRC1], [SRC2]
var OP_STR_FIND      = 0x68; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_RFIND     = 0x69; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_LOWER     = 0x6A; // [TGT], [SRC]
var OP_STR_UPPER     = 0x6B; // [TGT], [SRC]
var OP_STR_TRIM      = 0x6C; // [TGT], [SRC]
var OP_STR_REV       = 0x6D; // [TGT], [SRC]
var OP_STR_REP       = 0x6E; // [TGT], [SRC]
var OP_STR_LIST      = 0x6F; // [TGT], [SRC]
var OP_STR_BYTE      = 0x70; // [TGT], [SRC1], [SRC2]
var OP_STR_HASH      = 0x71; // [TGT], [SRC1], [SRC2]
var OP_UTF8_VALID    = 0x72; // [TGT], [SRC]
var OP_UTF8_LIST     = 0x73; // [TGT], [SRC]
var OP_UTF8_STR      = 0x74; // [TGT], [SRC]
var OP_STRUCT_SIZE   = 0x75; // [TGT], [SRC]
var OP_STRUCT_STR    = 0x76; // [TGT], [SRC1], [SRC2]
var OP_STRUCT_LIST   = 0x77; // [TGT], [SRC1], [SRC2]
var OP_LIST_NEW      = 0x78; // [TGT], [SRC1], [SRC2]
var OP_LIST_SHIFT    = 0x79; // [TGT], [SRC]
var OP_LIST_POP      = 0x7A; // [TGT], [SRC]
var OP_LIST_PUSH     = 0x7B; // [TGT], [SRC1], [SRC2]
var OP_LIST_UNSHIFT  = 0x7C; // [TGT], [SRC1], [SRC2]
var OP_LIST_APPEND   = 0x7D; // [TGT], [SRC1], [SRC2]
var OP_LIST_PREPEND  = 0x7E; // [TGT], [SRC1], [SRC2]
var OP_LIST_FIND     = 0x7F; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_RFIND    = 0x80; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_JOIN     = 0x81; // [TGT], [SRC1], [SRC2]
var OP_LIST_REV      = 0x82; // [TGT], [SRC]
var OP_LIST_STR      = 0x83; // [TGT], [SRC]
var OP_LIST_SORT     = 0x84; // [TGT], [SRC]
var OP_LIST_RSORT    = 0x85; // [TGT], [SRC]
var OP_LIST_SORTCMP  = 0x86; // [TGT], [SRC1], [SRC2]
var OP_PICKLE_VALID  = 0x87; // [TGT], [SRC]
var OP_PICKLE_STR    = 0x88; // [TGT], [SRC]
var OP_PICKLE_VAL    = 0x89; // [TGT], [SRC]
var OP_GC_GET        = 0x8A; // [TGT]
var OP_GC_SET        = 0x8B; // [TGT], [SRC]
var OP_GC_RUN        = 0x8C; // [TGT]

var ABORT_LISTFUNC   = 0x01;

function oplog(){
	return;
	var out = arguments[0];
	for (var i = 1; i < arguments.length; i++){
		var a = arguments[i];
		if (typeof a == 'object' && typeof a.fdiff == 'number')
			a = a.fdiff + ':' + a.index;
		out += (i == 1 ? ' ' : ', ') + a;
	}
	console.error('> ' + out);
}

function op_aborterr(b, errno){
	oplog('ABORTERR', errno);
	b.push(OP_ABORTERR, errno);
}

function op_move(b, tgt, src){
	if (tgt.fdiff == src.fdiff && tgt.index == src.index)
		return;
	oplog('MOVE', tgt, src);
	b.push(OP_MOVE, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_inc(b, src){
	oplog('INC', src);
	b.push(OP_INC, src.fdiff, src.index);
}

function op_nil(b, tgt){
	oplog('NIL', tgt);
	b.push(OP_NIL, tgt.fdiff, tgt.index);
}

function op_num(b, tgt, num){
	oplog('NUM', tgt, num);
	if (num >= 0)
		b.push(OP_NUMPOS, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	else{
		num += 65536;
		b.push(OP_NUMNEG, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	}
}

function op_numtbl(b, tgt, index){
	oplog('NUMTBL', tgt, index);
	b.push(OP_NUMTBL, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_str(b, tgt, index){
	oplog('STR', tgt, index);
	b.push(OP_STR, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_list(b, tgt, hint){
	if (hint > 255)
		hint = 255;
	oplog('LIST', tgt, hint);
	b.push(OP_LIST, tgt.fdiff, tgt.index, hint);
}

function op_unop(b, opcode, tgt, src){
	var opstr = '???';
	if      (opcode == OP_ISNUM      ) opstr = 'ISNUM';
	else if (opcode == OP_ISSTR      ) opstr = 'ISSTR';
	else if (opcode == OP_ISLIST     ) opstr = 'ISLIST';
	else if (opcode == OP_NOT        ) opstr = 'NOT';
	else if (opcode == OP_SIZE       ) opstr = 'SIZE';
	else if (opcode == OP_TONUM      ) opstr = 'TONUM';
	else if (opcode == OP_NUM_NEG    ) opstr = 'NUM_NEG';
	else if (opcode == OP_LIST_SHIFT ) opstr = 'LIST_SHIFT';
	else if (opcode == OP_LIST_POP   ) opstr = 'LIST_POP';
	oplog(opstr, tgt, src);
	b.push(opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_binop(b, opcode, tgt, src1, src2){
	// rewire GT to LT and GTE to LTE
	if (opcode == 0x100){ // GT
		opcode = OP_LT;
		var t = src1;
		src1 = src2;
		src2 = t;
	}
	else if (opcode == 0x101){ // GTE
		opcode = OP_LTE;
		var t = src1;
		src1 = src2;
		src2 = t;
	}

	var opstr = '???';
	if      (opcode == OP_CAT    ) opstr = 'CAT';
	else if (opcode == OP_LT     ) opstr = 'LT';
	else if (opcode == OP_LTE    ) opstr = 'LTE';
	else if (opcode == OP_NEQ    ) opstr = 'NEQ';
	else if (opcode == OP_EQU    ) opstr = 'EQU';
	else if (opcode == OP_NUM_ADD) opstr = 'NUM_ADD';
	else if (opcode == OP_NUM_SUB) opstr = 'NUM_SUB';
	else if (opcode == OP_NUM_MUL) opstr = 'NUM_MUL';
	else if (opcode == OP_NUM_DIV) opstr = 'NUM_DIV';
	else if (opcode == OP_NUM_MOD) opstr = 'NUM_MOD';
	else if (opcode == OP_NUM_POW) opstr = 'NUM_POW';
	oplog(opstr, tgt, src1, src2);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_getat(b, tgt, src1, src2){
	oplog('GETAT', tgt, src1, src2);
	b.push(OP_GETAT, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_slice(b, tgt, src1, src2, src3){
	oplog('SLICE', tgt, src1, src2, src3);
	b.push(OP_SLICE, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

function op_setat(b, src1, src2, src3){
	oplog('SETAT', src1, src2, src3);
	b.push(OP_SETAT, src1.fdiff, src1.index, src2.fdiff, src2.index, src3.fdiff, src3.index);
}

function op_splice(b, src1, src2, src3, src4){
	oplog('SPLICE', src1, src2, src3, src4);
	b.push(OP_SPLICE,
		src1.fdiff, src1.index,
		src2.fdiff, src2.index,
		src3.fdiff, src3.index,
		src4.fdiff, src4.index);
}

function op_jump(b, index, hint){
	oplog('JUMP', hint);
	b.push(OP_JUMP,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_jumpTrue(b, src, index, hint){
	oplog('JUMPTRUE', src, hint);
	b.push(OP_JUMPTRUE, src.fdiff, src.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_jumpFalse(b, src, index, hint){
	oplog('JUMPFALSE', src, hint);
	b.push(OP_JUMPFALSE, src.fdiff, src.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_call(b, ret, arg, level, index, hint){
	oplog('CALL', ret, arg, level, hint);
	b.push(OP_CALL, ret.fdiff, ret.index, arg.fdiff, arg.index, level,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_native(b, ret, arg, index){
	oplog('NATIVE', ret, arg, index);
	b.push(OP_NATIVE, ret.fdiff, ret.index, arg.fdiff, arg.index,
		index % 256, Math.floor(index / 256) % 256);
}

function op_return(b, src){
	oplog('RETURN', src);
	b.push(OP_RETURN, src.fdiff, src.index);
}

function op_returntail(b, arg, index, hint){
	oplog('RETURNTAIL', arg, hint);
	b.push(OP_RETURNTAIL, arg.fdiff, arg.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_param0(b, opcode, tgt){
	oplog('0x' + opcode.toString(16).toUpperCase(), tgt);
	b.push(opcode, tgt.fdiff, tgt.index);
}

function op_param1(b, opcode, tgt, src){
	oplog('0x' + opcode.toString(16).toUpperCase(), tgt, src);
	b.push(opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_param2(b, opcode, tgt, src1, src2){
	oplog('0x' + opcode.toString(16).toUpperCase(), tgt, src1, src2);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_param3(b, opcode, tgt, src1, src2, src3){
	oplog('0x' + opcode.toString(16).toUpperCase(), tgt, src1, src2, src3);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

//
// file position
//

function filepos_new(file, line, chr){
	return { file: file, line: line, chr: chr };
}

function filepos_copy(flp){
	return filepos_new(flp.file, flp.line, flp.chr);
}

function filepos_err(flp, msg){
	return (flp.file == null ? '' : flp.file + ':') + flp.line + ':' + flp.chr + ': ' + msg;
}

//
// keywords/specials
//

var KS_INVALID    = 'KS_INVALID';
var KS_PLUS       = 'KS_PLUS';
var KS_UNPLUS     = 'KS_UNPLUS';
var KS_MINUS      = 'KS_MINUS';
var KS_UNMINUS    = 'KS_UNMINUS';
var KS_PERCENT    = 'KS_PERCENT';
var KS_STAR       = 'KS_STAR';
var KS_SLASH      = 'KS_SLASH';
var KS_CARET      = 'KS_CARET';
var KS_AT         = 'KS_AT';
var KS_AMP        = 'KS_AMP';
var KS_LT         = 'KS_LT';
var KS_GT         = 'KS_GT';
var KS_BANG       = 'KS_BANG';
var KS_EQU        = 'KS_EQU';
var KS_TILDE      = 'KS_TILDE';
var KS_COLON      = 'KS_COLON';
var KS_COMMA      = 'KS_COMMA';
var KS_PERIOD     = 'KS_PERIOD';
var KS_PIPE       = 'KS_PIPE';
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
var KS_AMP2       = 'KS_AMP2';
var KS_PIPE2      = 'KS_PIPE2';
var KS_PERIOD3    = 'KS_PERIOD3';
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
var KS_NIL        = 'KS_NIL';
var KS_RETURN     = 'KS_RETURN';
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
	else if (c == '@') return KS_AT;
	else if (c == '&') return KS_AMP;
	else if (c == '<') return KS_LT;
	else if (c == '>') return KS_GT;
	else if (c == '!') return KS_BANG;
	else if (c == '=') return KS_EQU;
	else if (c == '~') return KS_TILDE;
	else if (c == ':') return KS_COLON;
	else if (c == ',') return KS_COMMA;
	else if (c == '.') return KS_PERIOD;
	else if (c == '|') return KS_PIPE;
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
	else if (c1 == '&' && c2 == '&') return KS_AMP2;
	else if (c1 == '|' && c2 == '|') return KS_PIPE2;
	return KS_INVALID;
}

function ks_char3(c1, c2, c3){
	if      (c1 == '.' && c2 == '.' && c3 == '.') return KS_PERIOD3;
	else if (c1 == '|' && c2 == '|' && c3 == '=') return KS_PIPE2EQU;
	else if (c1 == '&' && c2 == '&' && c3 == '=') return KS_AMP2EQU;
	return KS_INVALID;
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
	else if (s == 'nil'      ) return KS_NIL;
	else if (s == 'return'   ) return KS_RETURN;
	else if (s == 'using'    ) return KS_USING;
	else if (s == 'var'      ) return KS_VAR;
	else if (s == 'while'    ) return KS_WHILE;
	return KS_INVALID;
}

function ks_toUnaryOp(k){
	if      (k == KS_PLUS   ) return OP_TONUM;
	else if (k == KS_UNPLUS ) return OP_TONUM;
	else if (k == KS_MINUS  ) return OP_NUM_NEG;
	else if (k == KS_UNMINUS) return OP_NUM_NEG;
	else if (k == KS_AMP    ) return OP_SIZE;
	else if (k == KS_BANG   ) return OP_NOT;
	return -1;
}

function ks_toBinaryOp(k){
	if      (k == KS_PLUS   ) return OP_NUM_ADD;
	else if (k == KS_MINUS  ) return OP_NUM_SUB;
	else if (k == KS_PERCENT) return OP_NUM_MOD;
	else if (k == KS_STAR   ) return OP_NUM_MUL;
	else if (k == KS_SLASH  ) return OP_NUM_DIV;
	else if (k == KS_CARET  ) return OP_NUM_POW;
	else if (k == KS_LT     ) return OP_LT;
	else if (k == KS_GT     ) return 0x100; // intercepted by op_binop
	else if (k == KS_TILDE  ) return OP_CAT;
	else if (k == KS_LTEQU  ) return OP_LTE;
	else if (k == KS_GTEQU  ) return 0x101; // intercepted by op_binop
	else if (k == KS_BANGEQU) return OP_NEQ;
	else if (k == KS_EQU2   ) return OP_EQU;
	return -1;
}

function ks_toMutateOp(k){
	if      (k == KS_PLUSEQU   ) return OP_NUM_ADD;
	else if (k == KS_PERCENTEQU) return OP_NUM_MOD;
	else if (k == KS_MINUSEQU  ) return OP_NUM_SUB;
	else if (k == KS_STAREQU   ) return OP_NUM_MUL;
	else if (k == KS_SLASHEQU  ) return OP_NUM_DIV;
	else if (k == KS_CARETEQU  ) return OP_NUM_POW;
	else if (k == KS_TILDEEQU  ) return OP_CAT;
	return -1;
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

function tok_newline(soft){
	return { type: TOK_NEWLINE, soft: soft };
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

function tok_isMidStmt(tk){
	return tok_isKS(tk, KS_END) || tok_isKS(tk, KS_ELSE) || tok_isKS(tk, KS_ELSEIF) ||
		tok_isKS(tk, KS_WHILE);
}

function tok_isPre(tk){
	if (tk.type != TOK_KS)
		return false;
	return false ||
		tk.k == KS_PLUS    ||
		tk.k == KS_UNPLUS  ||
		tk.k == KS_MINUS   ||
		tk.k == KS_UNMINUS ||
		tk.k == KS_AMP     ||
		tk.k == KS_BANG    ||
		tk.k == KS_PERIOD3;
}

function tok_isMid(tk, allowComma, allowPipe){
	if (tk.type != TOK_KS)
		return false;
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
		tk.k == KS_AT         ||
		tk.k == KS_LT         ||
		tk.k == KS_LTEQU      ||
		tk.k == KS_GT         ||
		tk.k == KS_GTEQU      ||
		tk.k == KS_BANGEQU    ||
		tk.k == KS_EQU        ||
		tk.k == KS_EQU2       ||
		tk.k == KS_TILDE      ||
		tk.k == KS_TILDEEQU   ||
		tk.k == KS_AMP2       ||
		tk.k == KS_PIPE2      ||
		tk.k == KS_AMP2EQU    ||
		tk.k == KS_PIPE2EQU   ||
		(allowComma && tk.k == KS_COMMA) ||
		(allowPipe  && tk.k == KS_PIPE );
}

function tok_isTerm(tk){
	return false ||
		(tk.type == TOK_KS && (tk.k == KS_NIL || tk.k == KS_LPAREN || tk.k == KS_LBRACE)) ||
		tk.type == TOK_IDENT ||
		tk.type == TOK_NUM   ||
		tk.type == TOK_STR;
}

function tok_isPreBeforeMid(pre, mid){
	//assert(pre.type == TOK_KS);
	//assert(mid.type == TOK_KS);
	// -5^2 is -25, not 25
	if ((pre.k == KS_MINUS || pre.k == KS_UNMINUS) && mid.k == KS_CARET)
		return false;
	// otherwise, apply the Pre first
	return true;
}

function tok_midPrecedence(tk){
	//assert(tk.type == TOK_KS);
	var k = tk.k;
	if      (k == KS_CARET     ) return  1;
	else if (k == KS_STAR      ) return  2;
	else if (k == KS_SLASH     ) return  2;
	else if (k == KS_PERCENT   ) return  2;
	else if (k == KS_PLUS      ) return  3;
	else if (k == KS_MINUS     ) return  3;
	else if (k == KS_TILDE     ) return  4;
	else if (k == KS_AT        ) return  5;
	else if (k == KS_LTEQU     ) return  6;
	else if (k == KS_LT        ) return  6;
	else if (k == KS_GTEQU     ) return  6;
	else if (k == KS_GT        ) return  6;
	else if (k == KS_BANGEQU   ) return  7;
	else if (k == KS_EQU2      ) return  7;
	else if (k == KS_AMP2      ) return  8;
	else if (k == KS_PIPE2     ) return  9;
	else if (k == KS_COMMA     ) return 10;
	else if (k == KS_PIPE      ) return 11;
	else if (k == KS_EQU       ) return 20;
	else if (k == KS_PLUSEQU   ) return 20;
	else if (k == KS_PERCENTEQU) return 20;
	else if (k == KS_MINUSEQU  ) return 20;
	else if (k == KS_STAREQU   ) return 20;
	else if (k == KS_SLASHEQU  ) return 20;
	else if (k == KS_CARETEQU  ) return 20;
	else if (k == KS_TILDEEQU  ) return 20;
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
	if (lp === 20 || lp == 1) // mutation and pow are right to left
		return false;
	return true;
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

function lex_reset(lx){
	lx.state = LEX_START;
	lx.chR = 0;
	lx.ch1 = 0;
	lx.ch2 = 0;
	lx.ch3 = 0;
	lx.ch4 = 0;
	lx.str = '';
	lx.num_val = 0;
	lx.num_base = 0;
	lx.num_frac = 0;
	lx.num_flen = 0;
	lx.num_esign = 0;
	lx.num_eval = 0;
	lx.num_elen = 0;
	lx.braces = [0];
	lx.str_hexval = 0;
	lx.str_hexleft = 0;
}

function lex_new(){
	var lx = {};
	lex_reset(lx);
	return lx;
}

function lex_fwd(lx, ch){
	lx.ch4 = lx.ch3;
	lx.ch3 = lx.ch2;
	lx.ch2 = lx.ch1;
	lx.ch1 = ch;
}

function lex_rev(lx){
	lx.chR = lx.ch1;
	lx.ch1 = lx.ch2;
	lx.ch2 = lx.ch3;
	lx.ch3 = lx.ch4;
	lx.ch4 = 0;
}

function lex_process(lx, tks){
	var ch1 = lx.ch1;

	switch (lx.state){
		case LEX_START:
			if (ch1 == '#'){
				lx.state = LEX_COMMENT_LINE;
				tks.push(tok_newline(false));
			}
			else if (ks_char(ch1) != KS_INVALID){
				if (ch1 == '{')
					lx.braces[0]++;
				else if (ch1 == '}'){
					if (lx.braces[0] > 0)
						lx.braces[0]--;
					else if (lx.braces.length > 1){
						lx.braces.shift();
						lx.str = '';
						lx.state = LEX_STR_INTERP;
						tks.push(tok_ks(KS_RPAREN));
						tks.push(tok_ks(KS_TILDE));
						break;
					}
					else
						tks.push(tok_error('Mismatched brace'));
				}
				lx.state = LEX_SPECIAL1;
			}
			else if (isIdentStart(ch1)){
				lx.str = ch1;
				lx.state = LEX_IDENT;
			}
			else if (isNum(ch1)){
				lx.num_val = toHex(ch1);
				lx.num_base = 10;
				if (lx.num_val == 0)
					lx.state = LEX_NUM_0;
				else
					lx.state = LEX_NUM;
			}
			else if (ch1 == '\''){
				lx.str = '';
				lx.state = LEX_STR_BASIC;
			}
			else if (ch1 == '"'){
				lx.str = '';
				lx.state = LEX_STR_INTERP;
				tks.push(tok_ks(KS_LPAREN));
			}
			else if (ch1 == '\\')
				lx.state = LEX_BACKSLASH;
			else if (ch1 == '\r'){
				lx.state = LEX_RETURN;
				tks.push(tok_newline(false));
			}
			else if (ch1 == '\n' || ch1 == ';')
				tks.push(tok_newline(ch1 == ';'));
			else if (isSpace(ch1))
				/* do nothing */;
			else
				tks.push(tok_error('Unexpected character: ' + ch1));
			break;

		case LEX_COMMENT_LINE:
			if (ch1 == '\r')
				lx.state = LEX_RETURN;
			else if (ch1 == '\n')
				lx.state = LEX_START;
			break;

		case LEX_BACKSLASH:
			if (ch1 == '#')
				lx.state = LEX_COMMENT_LINE;
			else if (ch1 == '\r')
				lx.state = LEX_RETURN;
			else if (ch1 == '\n')
				lx.state = LEX_START;
			else if (!isSpace(ch1))
				tks.push(tok_error('Invalid character after backslash'));
			break;

		case LEX_RETURN:
			lx.state = LEX_START;
			if (ch1 != '\n')
				lex_process(lx, tks);
			break;

		case LEX_COMMENT_BLOCK:
			if (lx.ch2 == '*' && ch1 == '/')
				lx.state = LEX_START;
			break;

		case LEX_SPECIAL1:
			if (ks_char(ch1) != KS_INVALID){
				if (lx.ch2 == '/' && ch1 == '*')
					lx.state = LEX_COMMENT_BLOCK;
				else
					lx.state = LEX_SPECIAL2;
			}
			else{
				var ks1 = ks_char(lx.ch2);
				if (ks1 != KS_INVALID){
					// hack to detect difference between binary and unary +/-
					if (ks1 == KS_PLUS){
						if (!isSpace(ch1) && isSpace(lx.ch3))
							ks1 = KS_UNPLUS;
					}
					else if (ks1 == KS_MINUS){
						if (!isSpace(ch1) && isSpace(lx.ch3))
							ks1 = KS_UNMINUS;
					}
					tks.push(tok_ks(ks1));
					lx.state = LEX_START;
					lex_process(lx, tks);
				}
				else
					tks.push(tok_error('Unexpected character: ' + lx.ch2));
			}
			break;

		case LEX_SPECIAL2: {
			var ks3 = ks_char3(lx.ch3, lx.ch2, ch1);
			if (ks3 != KS_INVALID){
				lx.state = LEX_START;
				tks.push(tok_ks(ks3));
			}
			else{
				var ks2 = ks_char2(lx.ch3, lx.ch2);
				if (ks2 != KS_INVALID){
					tks.push(tok_ks(ks2));
					lx.state = LEX_START;
					lex_process(lx, tks);
				}
				else{
					var ks1 = ks_char(lx.ch3);
					if (ks1 != KS_INVALID){
						// hack to detect difference between binary and unary +/-
						if (ks1 == KS_PLUS){
							if (!isSpace(lx.ch2) && isSpace(lx.ch4))
								ks1 = KS_UNPLUS;
						}
						else if (ks1 == KS_MINUS){
							if (!isSpace(lx.ch2) && isSpace(lx.ch4))
								ks1 = KS_UNMINUS;
						}
						tks.push(tok_ks(ks1));
						lx.state = LEX_START;
						lex_rev(lx);
						lex_process(lx, tks);
						lex_fwd(lx, lx.chR);
						lex_process(lx, tks);
					}
					else
						tks.push(tok_error('Unexpected character: ' + lx.ch3));
				}
			}
		} break;

		case LEX_IDENT:
			if (!isIdentBody(ch1)){
				var ksk = ks_str(lx.str);
				if (ksk != KS_INVALID)
					tks.push(tok_ks(ksk));
				else
					tks.push(tok_ident(lx.str));
				lx.state = LEX_START;
				lex_process(lx, tks);
			}
			else{
				lx.str += ch1;
				if (lx.str.length > 1024)
					tks.push(tok_error('Identifier too long'));
			}
			break;

		case LEX_NUM_0:
			if (ch1 == 'b'){
				lx.num_base = 2;
				lx.state = LEX_NUM_2;
			}
			else if (ch1 == 'c'){
				lx.num_base = 8;
				lx.state = LEX_NUM_2;
			}
			else if (ch1 == 'x'){
				lx.num_base = 16;
				lx.state = LEX_NUM_2;
			}
			else if (ch1 == '_')
				lx.state = LEX_NUM;
			else if (ch1 == '.'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.state = LEX_NUM_FRAC;
			}
			else if (ch1 == 'e' || ch1 == 'E'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
			}
			else if (!isIdentStart(ch1)){
				tks.push(tok_num(0));
				lx.state = LEX_START;
				lex_process(lx, tks);
			}
			else
				tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM_2:
			if (isHex(ch1)){
				lx.num_val = toHex(ch1);
				if (lx.num_val > lx.num_base)
					tks.push(tok_error('Invalid number'));
				else
					lx.state = LEX_NUM;
			}
			else if (ch1 != '_')
				tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM:
			if (ch1 == '_')
				/* do nothing */;
			else if (ch1 == '.'){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.state = LEX_NUM_FRAC;
			}
			else if ((lx.num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx.num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx.num_frac = 0;
				lx.num_flen = 0;
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
			}
			else if (isHex(ch1)){
				var v = toHex(ch1);
				if (v > lx.num_base)
					tks.push(tok_error('Invalid number'));
				else
					lx.num_val = lx.num_val * lx.num_base + v;
			}
			else if (!isAlpha(ch1)){
				tks.push(tok_num(lx.num_val));
				lx.state = LEX_START;
				lex_process(lx, tks);
			}
			else
				tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM_FRAC:
			if (ch1 == '_')
				/* do nothing */;
			else if ((lx.num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx.num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx.num_esign = 0;
				lx.num_eval = 0;
				lx.num_elen = 0;
				lx.state = LEX_NUM_EXP;
			}
			else if (isHex(ch1)){
				var v = toHex(ch1);
				if (v > lx.num_base)
					tks.push(tok_error('Invalid number'));
				else{
					lx.num_frac = lx.num_frac * lx.num_base + v;
					lx.num_flen++;
				}
			}
			else if (!isAlpha(ch1)){
				if (lx.num_flen <= 0)
					tks.push(tok_error('Invalid number'));
				else{
					var d = Math.pow(lx.num_base, lx.num_flen);
					lx.num_val = (lx.num_val * d + lx.num_frac) / d;
					tks.push(tok_num(lx.num_val));
					lx.state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM_EXP:
			if (ch1 != '_'){
				lx.num_esign = ch1 == '-' ? -1 : 1;
				lx.state = LEX_NUM_EXP_BODY;
				if (ch1 != '+' && ch1 != '-')
					lex_process(lx, tks);
			}
			break;

		case LEX_NUM_EXP_BODY:
			if (ch1 == '_')
				/* do nothing */;
			else if (isNum(ch1)){
				lx.num_eval = lx.num_eval * 10 + toHex(ch1);
				lx.num_elen++;
			}
			else if (!isAlpha(ch1)){
				if (lx.num_elen <= 0)
					tks.push(tok_error('Invalid number'));
				else{
					var e = Math.pow(lx.num_base == 10 ? 10 : 2, lx.num_esign * lx.num_eval);
					lx.num_val *= e;
					if (lx.num_flen > 0){
						var d = Math.pow(lx.num_base, lx.num_flen);
						lx.num_val = (lx.num_val * d + lx.num_frac * e) / d;
					}
					tks.push(tok_num(lx.num_val));
					lx.state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				tks.push(tok_error('Invalid number'));
			break;

		case LEX_STR_BASIC:
			if (ch1 == '\r' || ch1 == '\n')
				tks.push(tok_error('Missing end of string'));
			else if (ch1 == '\'')
				lx.state = LEX_STR_BASIC_ESC;
			else{
				if (ch1.charCodeAt(0) < 0 || ch1.charCodeAt(0) >= 256)
					tks.push(tok_error('Invalid string character'));
				else
					lx.str += ch1;
			}
			break;

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\''){
				lx.str += ch1;
				lx.state = LEX_STR_BASIC;
			}
			else{
				lx.state = LEX_START;
				tks.push(tok_ks(KS_LPAREN));
				tks.push(tok_str(lx.str));
				tks.push(tok_ks(KS_RPAREN));
				lex_process(lx, tks);
			}
			break;

		case LEX_STR_INTERP:
			if (ch1 == '\r' || ch1 == '\n')
				tks.push(tok_error('Missing end of string'));
			else if (ch1 == '"'){
				lx.state = LEX_START;
				tks.push(tok_str(lx.str));
				tks.push(tok_ks(KS_RPAREN));
			}
			else if (ch1 == '$'){
				lx.state = LEX_STR_INTERP_DLR;
				if (lx.str.length > 0){
					tks.push(tok_str(lx.str));
					tks.push(tok_ks(KS_TILDE));
				}
			}
			else if (ch1 == '\\')
				lx.state = LEX_STR_INTERP_ESC;
			else{
				if (ch1.charCodeAt(0) < 0 || ch1.charCodeAt(0) >= 256)
					tks.push(tok_error('Invalid string character'));
				else
					lx.str += ch1;
			}
			break;

		case LEX_STR_INTERP_DLR:
			if (ch1 == '{'){
				lx.braces.unshift(0);
				lx.state = LEX_START;
				tks.push(tok_ks(KS_LPAREN));
			}
			else if (isIdentStart(ch1)){
				lx.str = ch1;
				lx.state = LEX_STR_INTERP_DLR_ID;
			}
			else
				tks.push(tok_error('Invalid substitution'));
			break;

		case LEX_STR_INTERP_DLR_ID:
			if (!isIdentBody(ch1)){
				if (ks_str(lx.str) != KS_INVALID)
					tks.push(tok_error('Invalid substitution'));
				else{
					tks.push(tok_ident(lx.str));
					if (ch1 == '"'){
						lx.state = LEX_START;
						tks.push(tok_ks(KS_RPAREN));
					}
					else{
						lx.str = '';
						lx.state = LEX_STR_INTERP;
						tks.push(tok_ks(KS_TILDE));
						lex_process(lx, tks);
					}
				}
			}
			else{
				lx.str += ch1;
				if (lx.str.length > 1024)
					tks.push(tok_error('Identifier too long'));
			}
			break;

		case LEX_STR_INTERP_ESC:
			if (ch1 == '\r' || ch1 == '\n')
				tks.push(tok_error('Missing end of string'));
			else if (ch1 == 'x'){
				lx.str_hexval = 0;
				lx.str_hexleft = 2;
				lx.state = LEX_STR_INTERP_ESC_HEX;
			}
			else if (ch1 == '0'){
				lx.str += '\0';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'b'){
				lx.str += '\b';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 't'){
				lx.str += '\t';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'n'){
				lx.str += '\n';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'v'){
				lx.str += '\v';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'f'){
				lx.str += '\f';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'r'){
				lx.str += '\r';
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'e'){
				lx.str += String.fromCharCode(27);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				lx.str += ch1;
				lx.state = LEX_STR_INTERP;
			}
			else
				tks.push(tok_error('Invalid escape sequence: \\' + ch1));
			break;

		case LEX_STR_INTERP_ESC_HEX:
			if (isHex(ch1)){
				lx.str_hexval = (lx.str_hexval * 16) + toHex(ch1);
				lx.str_hexleft--;
				if (lx.str_hexleft <= 0){
					lx.str += String.fromCharCode(lx.str_hexval);
					lx.state = LEX_STR_INTERP;
				}
			}
			else
				tks.push(tok_error('Invalid escape sequence; expecting hex value'));
			break;
	}
}

function lex_add(lx, ch, tks){
	lex_fwd(lx, ch);
	return lex_process(lx, tks);
}

function lex_close(lx, tks){
	if (lx.braces.length > 1){
		tks.push(tok_error('Missing end of string'));
		return;
	}
	switch (lx.state){
		case LEX_START:
		case LEX_COMMENT_LINE:
		case LEX_BACKSLASH:
		case LEX_RETURN:
			break;

		case LEX_COMMENT_BLOCK:
			tks.push(tok_error('Missing end of block comment'));
			return;

		case LEX_SPECIAL1: {
			var ks1 = ks_char(lx.ch1);
			if (ks1 != KS_INVALID)
				tks.push(tok_ks(ks1));
			else
				tks.push(tok_error('Unexpected character: ' + lx.ch1));
		} break;

		case LEX_SPECIAL2: {
			var ks2 = ks_char2(lx.ch2, lx.ch1);
			if (ks2 != KS_INVALID)
				tks.push(tok_ks(ks2));
			else{
				var ks1 = ks_char(lx.ch2);
				ks2 = ks_char(lx.ch1);
				if (ks1 != KS_INVALID){
					tks.push(tok_ks(ks1));
					if (ks2 != KS_INVALID)
						tks.push(tok_ks(ks2));
					else
						tks.push(tok_error('Unexpected character: ' + lx.ch1));
				}
				else
					tks.push(tok_error('Unexpected character: ' + lx.ch2));
			}
		} break;

		case LEX_IDENT: {
			var ksk = ks_str(lx.str);
			if (ksk != KS_INVALID)
				tks.push(tok_ks(ksk));
			else
				tks.push(tok_ident(lx.str));
		} break;

		case LEX_NUM_0:
			tks.push(tok_num(0));
			break;

		case LEX_NUM_2:
			tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM:
			tks.push(tok_num(lx.num_val));
			break;

		case LEX_NUM_FRAC:
			if (lx.num_flen <= 0)
				tks.push(tok_error('Invalid number'));
			else{
				var d = Math.pow(lx.num_base, lx.num_flen);
				lx.num_val = (lx.num_val * d + lx.num_frac) / d;
				tks.push(tok_num(lx.num_val));
			}
			break;

		case LEX_NUM_EXP:
			tks.push(tok_error('Invalid number'));
			break;

		case LEX_NUM_EXP_BODY:
			if (lx.num_elen <= 0)
				tks.push(tok_error('Invalid number'));
			else{
				var e = Math.pow(lx.num_base == 10 ? 10 : 2, lx.num_esign * lx.num_eval);
				lx.num_val *= e;
				if (lx.num_flen > 0){
					var d = Math.pow(lx.num_base, lx.num_flen);
					lx.num_val = (lx.num_val * d + lx.num_frac * e) / d;
				}
				tks.push(tok_num(lx.num_val));
			}
			break;

		case LEX_STR_BASIC:
		case LEX_STR_BASIC_ESC:
		case LEX_STR_INTERP:
		case LEX_STR_INTERP_DLR:
		case LEX_STR_INTERP_DLR_ID:
		case LEX_STR_INTERP_ESC:
		case LEX_STR_INTERP_ESC_HEX:
			tks.push(tok_error('Missing end of string'));
			break;
	}
	tks.push(tok_newline(false));
}

//
// expr
//

var EXPR_NIL    = 'EXPR_NIL';
var EXPR_NUM    = 'EXPR_NUM';
var EXPR_STR    = 'EXPR_STR';
var EXPR_LIST   = 'EXPR_LIST';
var EXPR_NAMES  = 'EXPR_NAMES';
var EXPR_VAR    = 'EXPR_VAR';
var EXPR_PAREN  = 'EXPR_PAREN';
var EXPR_GROUP  = 'EXPR_GROUP';
var EXPR_PREFIX = 'EXPR_PREFIX';
var EXPR_INFIX  = 'EXPR_INFIX';
var EXPR_CALL   = 'EXPR_CALL';
var EXPR_INDEX  = 'EXPR_INDEX';
var EXPR_SLICE  = 'EXPR_SLICE';

function expr_nil(flp){
	return { flp: flp, type: EXPR_NIL };
}

function expr_num(flp, num){
	return { flp: flp, type: EXPR_NUM, num: num };
}

function expr_str(flp, str){
	return { flp: flp, type: EXPR_STR, str: str };
}

function expr_list(flp, ex){
	return { flp: flp, type: EXPR_LIST, ex: ex };
}

function expr_names(flp, names){
	return { flp: flp, type: EXPR_NAMES, names: names };
}

function expr_var(flp, vlc){
	return { flp: flp, type: EXPR_VAR, vlc: vlc };
}

function expr_paren(flp, ex){
	return { flp: flp, type: EXPR_PAREN, ex: ex };
}

function expr_group(flp, left, right){
	var g;
	if (left.type == EXPR_GROUP){
		if (right.type == EXPR_GROUP)
			g = left.group.concat(right.group);
		else
			g = left.group.concat([right]);
	}
	else if (right.type == EXPR_GROUP)
		g = [left].concat(right.group);
	else
		g = [left, right];
	return { flp: flp, type: EXPR_GROUP, group: g };
}

function expr_prefix(flp, k, ex){
	if ((k == KS_MINUS || k == KS_UNMINUS) && ex.type == EXPR_NUM)
		return expr_num(flp, -ex.num);
	else if ((k == KS_PLUS || k == KS_UNPLUS) && ex.type == EXPR_NUM)
		return ex;
	return { flp: flp, type: EXPR_PREFIX, k: k, ex: ex };
}

function expr_infix(flp, k, left, right){
	if (k == KS_COMMA)
		return expr_group(flp, left, right);
	return { flp: flp, type: EXPR_INFIX, k: k, left: left, right: right };
}

function expr_call(flp, cmd, params){
	return { flp: flp, type: EXPR_CALL, cmd: cmd, params: params };
}

function expr_index(flp, obj, key){
	return { flp: flp, type: EXPR_INDEX, obj: obj, key: key };
}

function expr_slice(flp, obj, start, len){
	return { flp: flp, type: EXPR_SLICE, obj: obj, start: start, len: len };
}

//
// ast
//

var AST_BREAK      = 'AST_BREAK';
var AST_CONTINUE   = 'AST_CONTINUE';
var AST_DECLARE    = 'AST_DECLARE';
var AST_DEF1       = 'AST_DEF1';
var AST_DEF2       = 'AST_DEF2';
var AST_DOWHILE1   = 'AST_DOWHILE1';
var AST_DOWHILE2   = 'AST_DOWHILE2';
var AST_DOWHILE3   = 'AST_DOWHILE3';
var AST_FOR1       = 'AST_FOR1';
var AST_FOR2       = 'AST_FOR2';
var AST_LOOP1      = 'AST_LOOP1';
var AST_LOOP2      = 'AST_LOOP2';
var AST_GOTO       = 'AST_GOTO';
var AST_IF1        = 'AST_IF1';
var AST_IF2        = 'AST_IF2';
var AST_IF3        = 'AST_IF3';
var AST_IF4        = 'AST_IF4';
var AST_INCLUDE    = 'AST_INCLUDE';
var AST_NAMESPACE1 = 'AST_NAMESPACE1';
var AST_NAMESPACE2 = 'AST_NAMESPACE2';
var AST_RETURN     = 'AST_RETURN';
var AST_USING      = 'AST_USING';
var AST_VAR        = 'AST_VAR';
var AST_EVAL       = 'AST_EVAL';
var AST_LABEL      = 'AST_LABEL';

function ast_break(flp){
	return { flp: flp, type: AST_BREAK };
}

function ast_continue(flp){
	return { flp: flp, type: AST_CONTINUE };
}

function ast_declare(flp, dc){
	return { flp: flp, type: AST_DECLARE, dc: dc };
}

function ast_def1(flp, names, lvalues){
	return { flp: flp, type: AST_DEF1, names: names, lvalues: lvalues };
}

function ast_def2(flp){
	return { flp: flp, type: AST_DEF2 };
}

function ast_dowhile1(flp){
	return { flp: flp, type: AST_DOWHILE1 };
}

function ast_dowhile2(flp, cond){
	return { flp: flp, type: AST_DOWHILE2, cond: cond };
}

function ast_dowhile3(flp){
	return { flp: flp, type: AST_DOWHILE3 };
}

function ast_for1(flp, forVar, names1, names2, ex){
	return {
		flp: flp,
		type: AST_FOR1,
		forVar: forVar,
		names1: names1,
		names2: names2,
		ex: ex
	};
}

function ast_for2(flp){
	return { flp: flp, type: AST_FOR2 };
}

function ast_loop1(flp){
	return { flp: flp, type: AST_LOOP1 };
}

function ast_loop2(flp){
	return { flp: flp, type: AST_LOOP2 };
}

function ast_goto(flp, ident){
	return { flp: flp, type: AST_GOTO, ident: ident };
}

function ast_if1(flp){
	return { flp: flp, type: AST_IF1 };
}

function ast_if2(flp, cond){
	return { flp: flp, type: AST_IF2, cond: cond };
}

function ast_if3(flp){
	return { flp: flp, type: AST_IF3 };
}

function ast_if4(flp){
	return { flp: flp, type: AST_IF4 };
}

function incl_new(names, file){
	return { names: names, file: file };
}

function ast_include(flp, incls){
	return { flp: flp, type: AST_INCLUDE, incls: incls };
}

function ast_namespace1(flp, names){
	return { flp: flp, type: AST_NAMESPACE1, names: names };
}

function ast_namespace2(flp){
	return { flp: flp, type: AST_NAMESPACE2 };
}

function ast_return(flp, ex){
	return { flp: flp, type: AST_RETURN, ex: ex };
}

function ast_using(flp, names){
	return { flp: flp, type: AST_USING, names: names };
}

function ast_var(flp, lvalues){
	return { flp: flp, type: AST_VAR, lvalues: lvalues };
}

function ast_eval(flp, ex){
	return { flp: flp, type: AST_EVAL, ex: ex };
}

function ast_label(flp, ident){
	return { flp: flp, type: AST_LABEL, ident: ident };
}

//
// parser state helpers
//

var DECL_LOCAL  = 'DECL_LOCAL';
var DECL_NATIVE = 'DECL_NATIVE';

function decl_local(names){ // decls
	return { type: DECL_LOCAL, names: names };
}

function decl_native(names, key){ // decls
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

var PRS_STATEMENT                     = 'PRS_STATEMENT';
var PRS_STATEMENT_END                 = 'PRS_STATEMENT_END';
var PRS_LOOKUP                        = 'PRS_LOOKUP';
var PRS_LOOKUP_IDENT                  = 'PRS_LOOKUP_IDENT';
var PRS_BODY                          = 'PRS_BODY';
var PRS_BODY_STATEMENT                = 'PRS_BODY_STATEMENT';
var PRS_LVALUES                       = 'PRS_LVALUES';
var PRS_LVALUES_TERM                  = 'PRS_LVALUES_TERM';
var PRS_LVALUES_TERM_LOOKUP           = 'PRS_LVALUES_TERM_LOOKUP';
var PRS_LVALUES_TERM_LIST             = 'PRS_LVALUES_TERM_LIST';
var PRS_LVALUES_TERM_LIST_TERM_DONE   = 'PRS_LVALUES_TERM_LIST_TERM_DONE';
var PRS_LVALUES_TERM_LIST_TAIL        = 'PRS_LVALUES_TERM_LIST_TAIL';
var PRS_LVALUES_TERM_LIST_TAIL_LOOKUP = 'PRS_LVALUES_TERM_LIST_TAIL_LOOKUP';
var PRS_LVALUES_TERM_LIST_TAIL_DONE   = 'PRS_LVALUES_TERM_LIST_TAIL_DONE';
var PRS_LVALUES_TERM_LIST_DONE        = 'PRS_LVALUES_TERM_LIST_DONE';
var PRS_LVALUES_TERM_DONE             = 'PRS_LVALUES_TERM_DONE';
var PRS_LVALUES_TERM_EXPR             = 'PRS_LVALUES_TERM_EXPR';
var PRS_LVALUES_MORE                  = 'PRS_LVALUES_MORE';
var PRS_LVALUES_DEF_TAIL              = 'PRS_LVALUES_DEF_TAIL';
var PRS_LVALUES_DEF_TAIL_DONE         = 'PRS_LVALUES_DEF_TAIL_DONE';
var PRS_BREAK                         = 'PRS_BREAK';
var PRS_CONTINUE                      = 'PRS_CONTINUE';
var PRS_DECLARE                       = 'PRS_DECLARE';
var PRS_DECLARE_LOOKUP                = 'PRS_DECLARE_LOOKUP';
var PRS_DECLARE_STR                   = 'PRS_DECLARE_STR';
var PRS_DECLARE_STR2                  = 'PRS_DECLARE_STR2';
var PRS_DECLARE_STR3                  = 'PRS_DECLARE_STR3';
var PRS_DEF                           = 'PRS_DEF';
var PRS_DEF_LOOKUP                    = 'PRS_DEF_LOOKUP';
var PRS_DEF_LVALUES                   = 'PRS_DEF_LVALUES';
var PRS_DEF_BODY                      = 'PRS_DEF_BODY';
var PRS_DO                            = 'PRS_DO';
var PRS_DO_BODY                       = 'PRS_DO_BODY';
var PRS_DO_WHILE_EXPR                 = 'PRS_DO_WHILE_EXPR';
var PRS_DO_WHILE_BODY                 = 'PRS_DO_WHILE_BODY';
var PRS_FOR                           = 'PRS_FOR';
var PRS_LOOP_BODY                     = 'PRS_LOOP_BODY';
var PRS_FOR_VARS                      = 'PRS_FOR_VARS';
var PRS_FOR_VARS_LOOKUP               = 'PRS_FOR_VARS_LOOKUP';
var PRS_FOR_VARS2                     = 'PRS_FOR_VARS2';
var PRS_FOR_VARS2_LOOKUP              = 'PRS_FOR_VARS2_LOOKUP';
var PRS_FOR_VARS_DONE                 = 'PRS_FOR_VARS_DONE';
var PRS_FOR_EXPR                      = 'PRS_FOR_EXPR';
var PRS_FOR_BODY                      = 'PRS_FOR_BODY';
var PRS_GOTO                          = 'PRS_GOTO';
var PRS_IF                            = 'PRS_IF';
var PRS_IF2                           = 'PRS_IF2';
var PRS_IF_EXPR                       = 'PRS_IF_EXPR';
var PRS_IF_BODY                       = 'PRS_IF_BODY';
var PRS_ELSE_BODY                     = 'PRS_ELSE_BODY';
var PRS_INCLUDE                       = 'PRS_INCLUDE';
var PRS_INCLUDE_LOOKUP                = 'PRS_INCLUDE_LOOKUP';
var PRS_INCLUDE_STR                   = 'PRS_INCLUDE_STR';
var PRS_INCLUDE_STR2                  = 'PRS_INCLUDE_STR2';
var PRS_INCLUDE_STR3                  = 'PRS_INCLUDE_STR3';
var PRS_NAMESPACE                     = 'PRS_NAMESPACE';
var PRS_NAMESPACE_LOOKUP              = 'PRS_NAMESPACE_LOOKUP';
var PRS_NAMESPACE_BODY                = 'PRS_NAMESPACE_BODY';
var PRS_RETURN                        = 'PRS_RETURN';
var PRS_RETURN_DONE                   = 'PRS_RETURN_DONE';
var PRS_USING                         = 'PRS_USING';
var PRS_USING2                        = 'PRS_USING2';
var PRS_USING_LOOKUP                  = 'PRS_USING_LOOKUP';
var PRS_VAR                           = 'PRS_VAR';
var PRS_VAR_LVALUES                   = 'PRS_VAR_LVALUES';
var PRS_IDENTS                        = 'PRS_IDENTS';
var PRS_EVAL                          = 'PRS_EVAL';
var PRS_EVAL_EXPR                     = 'PRS_EVAL_EXPR';
var PRS_EXPR                          = 'PRS_EXPR';
var PRS_EXPR_TERM                     = 'PRS_EXPR_TERM';
var PRS_EXPR_TERM_ISEMPTYLIST         = 'PRS_EXPR_TERM_ISEMPTYLIST';
var PRS_EXPR_TERM_CLOSEBRACE          = 'PRS_EXPR_TERM_CLOSEBRACE';
var PRS_EXPR_TERM_CLOSEPAREN          = 'PRS_EXPR_TERM_CLOSEPAREN';
var PRS_EXPR_TERM_LOOKUP              = 'PRS_EXPR_TERM_LOOKUP';
var PRS_EXPR_POST                     = 'PRS_EXPR_POST';
var PRS_EXPR_POST_CALL                = 'PRS_EXPR_POST_CALL';
var PRS_EXPR_INDEX_CHECK              = 'PRS_EXPR_INDEX_CHECK';
var PRS_EXPR_INDEX_COLON_CHECK        = 'PRS_EXPR_INDEX_COLON_CHECK';
var PRS_EXPR_INDEX_COLON_EXPR         = 'PRS_EXPR_INDEX_COLON_EXPR';
var PRS_EXPR_INDEX_EXPR_CHECK         = 'PRS_EXPR_INDEX_EXPR_CHECK';
var PRS_EXPR_INDEX_EXPR_COLON_CHECK   = 'PRS_EXPR_INDEX_EXPR_COLON_CHECK';
var PRS_EXPR_INDEX_EXPR_COLON_EXPR    = 'PRS_EXPR_INDEX_EXPR_COLON_EXPR';
var PRS_EXPR_COMMA                    = 'PRS_EXPR_COMMA';
var PRS_EXPR_MID                      = 'PRS_EXPR_MID';
var PRS_EXPR_FINISH                   = 'PRS_EXPR_FINISH';

function prs_new(state, next){
	return {
		state: state,
		lvalues: null,              // list of expr
		lvaluesPeriods: 0,          // 0 off, 1 def, 2 nested list
		forVar: false,
		str: null,
		exprAllowComma: true,
		exprAllowPipe: true,
		exprAllowTrailComma: false,
		exprPreStackStack: null,    // linked list of eps_new's
		exprPreStack: null,         // linked list of ets_new's
		exprMidStack: null,         // linked list of ets_new's
		exprStack: null,            // linked list of exs_new's
		exprTerm: null,             // expr
		exprTerm2: null,            // expr
		exprTerm3: null,            // expr
		names: null,                // list of strings
		names2: null,               // list of strings
		incls: null,                // list of incl's
		next: next
	};
}

//
// parser
//

function parser_new(){
	return {
		state: prs_new(PRS_STATEMENT, null),
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

var PRR_MORE  = 'PRR_MORE';
var PRR_ERROR = 'PRR_ERROR';

function prr_more(){
	return { type: PRR_MORE };
}

function prr_error(msg){
	return { type: PRR_ERROR, msg: msg };
}

function parser_push(pr, state){
	pr.state = prs_new(state, pr.state);
}

var PRI_OK    = 'PRI_OK';
var PRI_ERROR = 'PRI_ERROR';

function pri_ok(ex){
	return { type: PRI_OK, ex: ex };
}

function pri_error(msg){
	return { type: PRI_ERROR, msg: msg };
}

function parser_infix(flp, k, left, right){
	if (k == KS_PIPE){
		if (right.type == EXPR_CALL){
			right.params = expr_infix(flp, KS_COMMA, expr_paren(flp, left), right.params);
			return pri_ok(right);
		}
		else if (right.type == EXPR_NAMES)
			return pri_ok(expr_call(flp, right, left));
		return pri_error('Invalid pipe');
	}
	return pri_ok(expr_infix(flp, k, left, right));
}

function parser_start(pr, state){
	pr.level++;
	pr.state.state = state;
	return prr_more();
}

function parser_statement(pr, flp, stmts, more){
	pr.level--;
	pr.state.state = PRS_STATEMENT_END;
	return more ? prr_more() : parser_process(pr, flp, stmts);
}

function parser_lookup(pr, retstate){
	pr.state.state = retstate;
	parser_push(pr, PRS_LOOKUP);
	pr.state.names = [pr.tk1.ident];
	return prr_more();
}

function parser_process(pr, flp, stmts){
	var tk1 = pr.tk1;
	var st = pr.state;
	switch (st.state){
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
			else if (tok_isKS(tk1, KS_INCLUDE  )) return parser_start(pr, PRS_INCLUDE  );
			else if (tok_isKS(tk1, KS_NAMESPACE)) return parser_start(pr, PRS_NAMESPACE);
			else if (tok_isKS(tk1, KS_RETURN   )) return parser_start(pr, PRS_RETURN   );
			else if (tok_isKS(tk1, KS_USING    )) return parser_start(pr, PRS_USING    );
			else if (tok_isKS(tk1, KS_VAR      )) return parser_start(pr, PRS_VAR      );
			else if (tk1.type == TOK_IDENT)
				return parser_lookup(pr, PRS_IDENTS);
			else if (tok_isPre(tk1) || tok_isTerm(tk1)){
				pr.level++;
				st.state = PRS_EVAL;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isMidStmt(tk1)){
				if (st.next === null)
					return prr_error('Invalid statement');
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
			}
			return prr_error('Invalid statement');

		case PRS_STATEMENT_END:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_STATEMENT;
			return prr_more();

		case PRS_LOOKUP:
			if (!tok_isKS(tk1, KS_PERIOD)){
				st.next.names = st.names;
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
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
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr, flp, stmts);

		case PRS_BODY_STATEMENT:
			if (st.stmt == null){
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
			}
			parser_push(pr, PRS_STATEMENT);
			return prr_more();

		case PRS_LVALUES:
			if (tk1.type == TOK_NEWLINE){
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
			}
			st.state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr.state.lvaluesPeriods = st.lvaluesPeriods;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM:
			if (tk1.type == TOK_IDENT)
				return parser_lookup(pr, PRS_LVALUES_TERM_LOOKUP);
			else if (tok_isKS(tk1, KS_LBRACE)){
				st.state = PRS_LVALUES_TERM_LIST_DONE;
				parser_push(pr, PRS_LVALUES_TERM_LIST);
				return prr_more();
			}
			else if (st.lvaluesPeriods > 0 && tok_isKS(tk1, KS_PERIOD3)){
				if (st.lvaluesPeriods == 1) // specifying end of a def
					st.state = PRS_LVALUES_DEF_TAIL;
				else // otherwise, specifying end of a list
					st.state = PRS_LVALUES_TERM_LIST_TAIL;
				return prr_more();
			}
			return prr_error('Expecting variable');

		case PRS_LVALUES_TERM_LOOKUP:
			st.next.exprTerm = expr_names(flp, st.names);
			pr.state = st.next;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_RBRACE)){
				st.next.exprTerm = st.exprTerm;
				pr.state = st.next;
				return prr_more();
			}
			st.state = PRS_LVALUES_TERM_LIST_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr.state.lvaluesPeriods = 2;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST_TERM_DONE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (st.exprTerm2 == null){
				st.exprTerm2 = st.exprTerm;
				st.exprTerm = null;
			}
			else{
				st.exprTerm2 = expr_infix(flp, KS_COMMA, st.exprTerm2, st.exprTerm);
				st.exprTerm = null;
			}
			if (tok_isKS(tk1, KS_RBRACE)){
				st.next.exprTerm = st.exprTerm2;
				pr.state = st.next;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				parser_push(pr, PRS_LVALUES_TERM);
				pr.state.lvaluesPeriods = 2;
				return prr_more();
			}
			return prr_error('Invalid list');

		case PRS_LVALUES_TERM_LIST_TAIL:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_LVALUES_TERM_LIST_TAIL_LOOKUP);

		case PRS_LVALUES_TERM_LIST_TAIL_LOOKUP:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			st.state = PRS_LVALUES_TERM_LIST_TAIL_DONE;
			if (tok_isKS(tk1, KS_COMMA))
				return prr_more();
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST_TAIL_DONE:
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error('Missing end of list');
			st.next.exprTerm = expr_prefix(flp, KS_PERIOD3, expr_names(flp, st.names));
			pr.state = st.next;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST_DONE:
			st.next.exprTerm = expr_list(flp, st.exprTerm);
			pr.state = st.next;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_DONE:
			if (tk1.type == TOK_NEWLINE){
				st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm, null));
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_EQU)){
				st.exprTerm2 = st.exprTerm;
				st.state = PRS_LVALUES_TERM_EXPR;
				parser_push(pr, PRS_EXPR);
				pr.state.exprAllowComma = false;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm, null));
				st.state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error('Invalid declaration');

		case PRS_LVALUES_TERM_EXPR:
			st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm2, st.exprTerm));
			if (tk1.type == TOK_NEWLINE){
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error('Invalid declaration');

		case PRS_LVALUES_MORE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			st.state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr.state.lvaluesPeriods = st.lvaluesPeriods;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_DEF_TAIL:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_LVALUES_DEF_TAIL_DONE);

		case PRS_LVALUES_DEF_TAIL_DONE:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.next.names = st.names;
			st = st.next; // pop *twice*
			st.lvalues.push(expr_prefix(flp, KS_PERIOD3, expr_names(flp, st.names)));
			st.next.lvalues = st.lvalues;
			pr.state = st.next;
			return parser_process(pr, flp, stmts);

		case PRS_BREAK:
			stmts.push(ast_break(flp));
			return parser_statement(pr, flp, stmts, false);

		case PRS_CONTINUE:
			stmts.push(ast_continue(flp));
			return parser_statement(pr, flp, stmts, false);

		case PRS_DECLARE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_DECLARE_LOOKUP);

		case PRS_DECLARE_LOOKUP:
			if (tok_isKS(tk1, KS_LPAREN)){
				st.state = PRS_DECLARE_STR;
				return prr_more();
			}
			stmts.push(ast_declare(flp, decl_local(st.names)));
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_DECLARE;
				return prr_more();
			}
			return parser_statement(pr, flp, stmts, false);

		case PRS_DECLARE_STR:
			if (tk1.type != TOK_STR)
				return prr_error('Expecting string constant');
			stmts.push(ast_declare(flp, decl_native(st.names, tk1.str)));
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
			return parser_statement(pr, flp, stmts, false);

		case PRS_DEF:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_DEF_LOOKUP);

		case PRS_DEF_LOOKUP:
			st.state = PRS_DEF_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr.state.lvalues = [];
			pr.state.lvaluesPeriods = 1;
			return parser_process(pr, flp, stmts);

		case PRS_DEF_LVALUES:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			stmts.push(ast_def1(flp, st.names, st.lvalues));
			st.state = PRS_DEF_BODY;
			parser_push(pr, PRS_BODY);
			return parser_process(pr, flp, stmts);

		case PRS_DEF_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of def block');
			stmts.push(ast_def2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_DO:
			stmts.push(ast_dowhile1(flp));
			st.state = PRS_DO_BODY;
			parser_push(pr, PRS_BODY);
			return parser_process(pr, flp, stmts);

		case PRS_DO_BODY:
			if (tok_isKS(tk1, KS_WHILE)){
				st.state = PRS_DO_WHILE_EXPR;
				parser_push(pr, PRS_EXPR);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				stmts.push(ast_dowhile2(flp, null));
				stmts.push(ast_dowhile3(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error('Missing `while` or `end` of do block');

		case PRS_DO_WHILE_EXPR:
			stmts.push(ast_dowhile2(flp, st.exprTerm));
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_DO_WHILE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				stmts.push(ast_dowhile3(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error('Missing newline or semicolon');

		case PRS_DO_WHILE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of do-while block');
			stmts.push(ast_dowhile3(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_FOR:
			if (tk1.type == TOK_NEWLINE){
				stmts.push(ast_loop1(flp));
				st.state = PRS_LOOP_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			st.state = PRS_FOR_VARS;
			if (tok_isKS(tk1, KS_VAR)){
				st.forVar = true;
				return prr_more();
			}
			return parser_process(pr, flp, stmts);

		case PRS_LOOP_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of for block');
			stmts.push(ast_loop2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_FOR_VARS:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_FOR_VARS_LOOKUP);

		case PRS_FOR_VARS_LOOKUP:
			st.names2 = st.names;
			st.names = null; // required
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_FOR_VARS2;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_FOR_VARS_DONE;
				return prr_more();
			}
			return prr_error('Invalid for loop');

		case PRS_FOR_VARS2:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_FOR_VARS2_LOOKUP);

		case PRS_FOR_VARS2_LOOKUP:
			if (!tok_isKS(tk1, KS_COLON))
				return prr_error('Expecting `:`');
			st.state = PRS_FOR_VARS_DONE;
			return prr_more();

		case PRS_FOR_VARS_DONE:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Expecting expression in for statement');
			st.state = PRS_FOR_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_FOR_EXPR:
			stmts.push(ast_for1(flp, st.forVar, st.names2, st.names, st.exprTerm));
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_FOR_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				stmts.push(ast_for2(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error('Missing newline or semicolon');

		case PRS_FOR_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of for block');
			stmts.push(ast_for2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_GOTO:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			stmts.push(ast_goto(flp, tk1.ident));
			return parser_statement(pr, flp, stmts, true);

		case PRS_IF:
			stmts.push(ast_if1(flp));
			st.state = PRS_IF2;
			return parser_process(pr, flp, stmts);

		case PRS_IF2:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Missing conditional expression');
			st.state = PRS_IF_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_IF_EXPR:
			stmts.push(ast_if2(flp, st.exprTerm));
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_IF_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_ELSEIF)){
				st.state = PRS_IF2;
				return prr_more();
			}
			stmts.push(ast_if3(flp));
			if (tok_isKS(tk1, KS_ELSE)){
				st.state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				stmts.push(ast_if4(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error('Missing newline or semicolon');

		case PRS_IF_BODY:
			if (tok_isKS(tk1, KS_ELSEIF)){
				st.state = PRS_IF2;
				return prr_more();
			}
			stmts.push(ast_if3(flp));
			if (tok_isKS(tk1, KS_ELSE)){
				st.state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				stmts.push(ast_if4(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error('Missing `elseif`, `else`, or `end` of if block');

		case PRS_ELSE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of if block');
			stmts.push(ast_if4(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_INCLUDE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			else if (tk1.type == TOK_IDENT)
				return parser_lookup(pr, PRS_INCLUDE_LOOKUP);
			else if (tok_isKS(tk1, KS_LPAREN)){
				st.names = null; // required
				st.state = PRS_INCLUDE_STR;
				return prr_more();
			}
			return prr_error('Expecting file as constant string literal');

		case PRS_INCLUDE_LOOKUP:
			if (!tok_isKS(tk1, KS_LPAREN))
				return prr_error('Expecting file as constant string literal');
			st.state = PRS_INCLUDE_STR;
			return prr_more();

		case PRS_INCLUDE_STR:
			if (tk1.type != TOK_STR)
				return prr_error('Expecting file as constant string literal');
			st.str = tk1.str;
			st.state = PRS_INCLUDE_STR2;
			return prr_more();

		case PRS_INCLUDE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error('Expecting file as constant string literal');
			st.state = PRS_INCLUDE_STR3;
			return prr_more();

		case PRS_INCLUDE_STR3:
			if (st.incls == null)
				st.incls = [];
			st.incls.push(incl_new(st.names, st.str));
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_INCLUDE;
				return prr_more();
			}
			stmts.push(ast_include(flp, st.incls));
			st.incls = null;
			return parser_statement(pr, flp, stmts, false);

		case PRS_NAMESPACE:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_NAMESPACE_LOOKUP);

		case PRS_NAMESPACE_LOOKUP:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			stmts.push(ast_namespace1(flp, st.names));
			st.state = PRS_NAMESPACE_BODY;
			parser_push(pr, PRS_BODY);
			return prr_more();

		case PRS_NAMESPACE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of namespace block');
			stmts.push(ast_namespace2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_RETURN:
			if (tk1.type == TOK_NEWLINE){
				stmts.push(ast_return(flp, expr_nil(flp)));
				return parser_statement(pr, flp, stmts, false);
			}
			st.state = PRS_RETURN_DONE;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_RETURN_DONE:
			stmts.push(ast_return(flp, st.exprTerm));
			return parser_statement(pr, flp, stmts, false);

		case PRS_USING:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Expecting identifier');
			st.state = PRS_USING2;
			return parser_process(pr, flp, stmts);

		case PRS_USING2:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			return parser_lookup(pr, PRS_USING_LOOKUP);

		case PRS_USING_LOOKUP:
			stmts.push(ast_using(flp, st.names));
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_USING2;
				return prr_more();
			}
			return parser_statement(pr, flp, stmts, false);

		case PRS_VAR:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			st.state = PRS_VAR_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr.state.lvalues = [];
			return parser_process(pr, flp, stmts);

		case PRS_VAR_LVALUES:
			if (st.lvalues.length <= 0)
				return prr_error('Invalid variable declaration');
			stmts.push(ast_var(flp, st.lvalues));
			return parser_statement(pr, flp, stmts, false);

		case PRS_IDENTS:
			if (st.names.length == 1 && tok_isKS(tk1, KS_COLON)){
				stmts.push(ast_label(flp, st.names[0]));
				st.state = PRS_STATEMENT;
				return prr_more();
			}
			pr.level++;
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR_POST);
			pr.state.exprTerm = expr_names(flp, st.names);
			return parser_process(pr, flp, stmts);

		case PRS_EVAL:
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EVAL_EXPR:
			stmts.push(ast_eval(flp, st.exprTerm));
			return parser_statement(pr, flp, stmts, false);

		case PRS_EXPR:
			if (tok_isPre(tk1)){
				st.exprPreStack = ets_new(tk1, st.exprPreStack);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_TERM:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_NIL)){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_nil(flp);
				return prr_more();
			}
			else if (tk1.type == TOK_NUM){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_num(flp, tk1.num);
				return prr_more();
			}
			else if (tk1.type == TOK_STR){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_str(flp, tk1.str);
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
				st.state = PRS_EXPR_TERM_CLOSEPAREN;
				parser_push(pr, PRS_EXPR);
				pr.state.exprAllowTrailComma = true;
				return prr_more();
			}
			return prr_error('Invalid expression');

		case PRS_EXPR_TERM_ISEMPTYLIST:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_RBRACE)){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_list(flp, null);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM_CLOSEBRACE;
			parser_push(pr, PRS_EXPR);
			pr.state.exprAllowTrailComma = true;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_TERM_CLOSEBRACE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error('Expecting close brace');
			st.exprTerm = expr_list(flp, st.exprTerm);
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_CLOSEPAREN:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error('Expecting close parenthesis');
			st.exprTerm = expr_paren(flp, st.exprTerm);
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_LOOKUP:
			st.exprTerm = expr_names(flp, st.names);
			st.state = PRS_EXPR_POST;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_POST:
			if (tk1.type == TOK_NEWLINE ||
				tok_isKS(tk1, KS_END) || tok_isKS(tk1, KS_ELSE) || tok_isKS(tk1, KS_ELSEIF)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_LBRACKET)){
				st.state = PRS_EXPR_INDEX_CHECK;
				return prr_more();
			}
			else if (tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)){
				if (st.exprAllowTrailComma && tok_isKS(tk1, KS_COMMA)){
					st.state = PRS_EXPR_COMMA;
					return prr_more();
				}
				st.state = PRS_EXPR_MID;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_RBRACE) || tok_isKS(tk1, KS_RBRACKET) ||
				tok_isKS(tk1, KS_RPAREN) || tok_isKS(tk1, KS_COLON) || tok_isKS(tk1, KS_COMMA) ||
				tok_isKS(tk1, KS_PIPE)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
			}
			// otherwise, this should be a call
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_POST_CALL;
			parser_push(pr, PRS_EXPR);
			pr.state.exprAllowPipe = false;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_POST_CALL:
			st.exprTerm = expr_call(flp, st.exprTerm2, st.exprTerm);
			st.exprTerm2 = null;
			st.state = PRS_EXPR_POST;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_CHECK:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_EXPR_INDEX_COLON_CHECK;
				return prr_more();
			}
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_EXPR_CHECK;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_COLON_CHECK:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st.exprTerm = expr_slice(flp, st.exprTerm, null, null);
				st.state = PRS_EXPR_POST;
				return prr_more();
			}
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_COLON_EXPR:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_slice(flp, st.exprTerm2, null, st.exprTerm);
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_CHECK:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_EXPR_INDEX_EXPR_COLON_CHECK;
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_index(flp, st.exprTerm2, st.exprTerm);
			st.exprTerm2 = null;
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_COLON_CHECK:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st.exprTerm = expr_slice(flp, st.exprTerm2, st.exprTerm, null);
				st.state = PRS_EXPR_POST;
				return prr_more();
			}
			st.exprTerm3 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_INDEX_EXPR_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_EXPR_COLON_EXPR:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error('Missing close bracket');
			st.exprTerm = expr_slice(flp, st.exprTerm2, st.exprTerm3, st.exprTerm);
			st.exprTerm2 = null;
			st.exprTerm3 = null;
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_COMMA:
			if (tk1.type == TOK_NEWLINE && !tk1.soft){
				parser_rev(pr); // keep the comma in tk1
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RPAREN) && !tok_isKS(tk1, KS_RBRACE)){
				st.state = PRS_EXPR_MID;
				parser_rev(pr);
				parser_process(pr, flp, stmts);
				parser_fwd(pr, pr.tkR);
				return parser_process(pr, flp, stmts);
			}
			// found a trailing comma
			st.state = PRS_EXPR_FINISH;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_MID:
			if (!tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
			}
			while (true){
				// fight between the Pre and the Mid
				while (st.exprPreStack != null && tok_isPreBeforeMid(st.exprPreStack.tk, tk1)){
					// apply the Pre
					st.exprTerm = expr_prefix(flp, st.exprPreStack.tk.k, st.exprTerm);
					st.exprPreStack = st.exprPreStack.next;
				}

				// if we've exhaused the exprPreStack, then check against the exprMidStack
				if (st.exprPreStack == null && st.exprMidStack != null &&
					tok_isMidBeforeMid(st.exprMidStack.tk, tk1)){
					// apply the previous Mid
					var pri = parser_infix(flp, st.exprMidStack.tk.k, st.exprStack.ex, st.exprTerm)
					if (pri.type == PRI_ERROR)
						return prr_error(pri.msg);
					st.exprTerm = pri.ex;
					st.exprStack = st.exprStack.next;
					st.exprPreStack = st.exprPreStackStack.ets;
					st.exprPreStackStack = st.exprPreStackStack.next;
					st.exprMidStack = st.exprMidStack.next;
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
			return prr_more();

		case PRS_EXPR_FINISH:
			while (true){
				// fight between the Pre and the Mid
				while (st.exprPreStack != null &&
					(st.exprMidStack == null ||
						tok_isPreBeforeMid(st.exprPreStack.tk, st.exprMidStack.tk))){
					// apply the Pre
					st.exprTerm = expr_prefix(flp, st.exprPreStack.tk.k, st.exprTerm);
					st.exprPreStack = st.exprPreStack.next;
				}

				if (st.exprMidStack == null)
					break;

				// apply the Mid
				var pri = parser_infix(flp, st.exprMidStack.tk.k, st.exprStack.ex, st.exprTerm);
				if (pri.type == PRI_ERROR)
					return prr_error(pri.msg);
				st.exprTerm = pri.ex;
				st.exprStack = st.exprStack.next;
				st.exprPreStack = st.exprPreStackStack.ets;
				st.exprPreStackStack = st.exprPreStackStack.next;
				st.exprMidStack = st.exprMidStack.next;
			}
			// everything has been applied, and exprTerm has been set!
			st.next.exprTerm = st.exprTerm;
			pr.state = st.next;
			return parser_process(pr, flp, stmts);
	}
}

function parser_add(pr, tk, flp, stmts){
	parser_fwd(pr, tk);
	return parser_process(pr, flp, stmts);
}

function parser_close(pr){
	if (pr.state.next !== null)
		return prr_error('Invalid end of file');
	return prr_more();
}

//
// labels
//

function label_new(name){
	return {
		name: name,
		pos: -1,
		rewrites: []
	};
}

function label_refresh(lbl, ops, start){
	for (var i = start; i < lbl.rewrites.length; i++){
		var index = lbl.rewrites[i];
		ops[index + 0] = lbl.pos % 256;
		ops[index + 1] = Math.floor(lbl.pos /     0x100) % 256;
		ops[index + 2] = Math.floor(lbl.pos /   0x10000) % 256;
		ops[index + 3] = Math.floor(lbl.pos / 0x1000000) % 256;
	}
}

function label_jump(lbl, ops){
	op_jump(ops, 0xFFFFFFFF, lbl.name);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_jumpTrue(lbl, ops, src){
	op_jumpTrue(ops, src, 0xFFFFFFFF, lbl.name);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_jumpFalse(lbl, ops, src){
	op_jumpFalse(ops, src, 0xFFFFFFFF, lbl.name);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_call(lbl, ops, ret, arg, level){
	op_call(ops, ret, arg, level, 0xFFFFFFFF, lbl.name);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_returntail(lbl, ops, arg){
	op_returntail(ops, arg, 0xFFFFFFFF, lbl.name);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_declare(lbl, ops){
	oplog(lbl.name + ':');
	lbl.pos = ops.length;
	label_refresh(lbl, ops, 0);
}

//
// symbol table
//

var FVR_VAR        = 'FVR_VAR';
var FVR_TEMP_INUSE = 'FVR_TEMP_INUSE';
var FVR_TEMP_AVAIL = 'FVR_TEMP_AVAIL';

function frame_new(parent){
	return {
		vars: parent ? [FVR_VAR] : [], // frames with parents have a reserved argument
		lbls: [],
		parent: parent
	};
}

function frame_diff(parent, child){
	var fdiff = 0;
	while (child != parent && child != null){
		child = child.parent;
		fdiff++;
	}
	if (child == null)
		return -1;
	return fdiff;
}

var NSN_VAR        = 'NSN_VAR';
var NSN_CMD_LOCAL  = 'NSN_CMD_LOCAL';
var NSN_CMD_NATIVE = 'NSN_CMD_NATIVE';
var NSN_CMD_OPCODE = 'NSN_CMD_OPCODE';
var NSN_NAMESPACE  = 'NSN_NAMESPACE';

function nsname_var(name, fr, index){
	return {
		name: name,
		type: NSN_VAR,
		fr: fr,
		index: index
	};
}

function nsname_cmdLocal(name, fr, lbl){
	return {
		name: name,
		type: NSN_CMD_LOCAL,
		fr: fr,
		lbl: lbl
	};
}

function nsname_cmdNative(name, index){
	return {
		name: name,
		type: NSN_CMD_NATIVE,
		index: index
	};
}

function nsname_cmdOpcode(name, opcode, params){
	return {
		name: name,
		type: NSN_CMD_OPCODE,
		opcode: opcode,
		params: params
	};
}

function nsname_namespace(name, ns){
	return {
		name: name,
		type: NSN_NAMESPACE,
		ns: ns
	};
}

function namespace_new(fr){
	return {
		fr: fr,
		usings: [],
		names: []
	};
}

var NL_FOUND    = 'NL_FOUND';
var NL_NOTFOUND = 'NL_NOTFOUND';

function nl_found(nsn){
	return { type: NL_FOUND, nsn: nsn };
}

function nl_notfound(){
	return { type: NL_NOTFOUND };
}

function namespace_lookupLevel(ns, names, start, tried){
	for (var nsni = 0; nsni < ns.names.length; nsni++){
		var nsn = ns.names[nsni];
		if (nsn.name === names[start]){
			if (start === names.length - 1) // if we're at the end of names, then report the find
				return nl_found(nsn);
			// otherwise, we need to traverse
			if (nsn.type === NSN_NAMESPACE)
				return namespace_lookup(nsn.ns, names, start + 1, tried);
			return nl_notfound();
		}
	}
	return nl_notfound();
}

function namespace_getSiblings(ns, res, tried){
	if (res.indexOf(ns) >= 0)
		return;
	res.push(ns);
	for (var i = 0; i < ns.usings.length; i++){
		var uns = ns.usings[i];
		if (tried.indexOf(uns) >= 0)
			continue;
		namespace_getSiblings(uns, res, tried);
	}
}

function namespace_lookup(ns, names, start, tried){
	if (tried.indexOf(ns) >= 0)
		return nl_notfound();
	tried.push(ns);

	var allns = [];
	namespace_getSiblings(ns, allns, tried);
	for (var i = 0; i < allns.length; i++){
		var hns = allns[i];
		var n = namespace_lookupLevel(hns, names, start, tried);
		if (n.type == NL_FOUND)
			return n;
	}
	return nl_notfound();
}

function namespace_lookupImmediate(ns, names){
	// should perform the most ideal lookup... if it fails, then there is room to add a symbol
	for (var ni = 0; ni < names.length; ni++){
		var name = names[ni];
		for (var nsni = 0; nsni < ns.names.length; nsni++){
			var nsn = ns.names[nsni];
			if (nsn.name === name){
				if (ni === names.length - 1)
					return nl_found(nsn);
				if (nsn.type !== NSN_NAMESPACE)
					return nl_notfound();
				ns = nsn.ns;
				break;
			}
		}
	}
	return nl_notfound();
}

function scope_new(fr, lblBreak, lblContinue, parent){
	var ns = namespace_new(fr);
	return {
		ns: ns,
		nsStack: [ns],
		lblBreak: lblBreak,
		lblContinue: lblContinue,
		parent: parent
	};
}

function symtbl_new(repl){
	var fr = frame_new(null);
	var sc = scope_new(fr, null, null, null);
	return {
		repl: repl,
		fr: fr,
		sc: sc
	};
}

var SFN_OK    = 'SFN_OK';
var SFN_ERROR = 'SFN_ERROR';

function sfn_ok(ns){
	return { type: SFN_OK, ns: ns };
}

function sfn_error(msg){
	return { type: SFN_ERROR, msg: msg };
}

function symtbl_findNamespace(sym, names, max){
	var ns = sym.sc.ns;
	for (var ni = 0; ni < max; ni++){
		var name = names[ni];
		var found = false;
		for (var i = 0; i < ns.names.length; i++){
			var nsn = ns.names[i];
			if (nsn.name == name){
				if (nsn.type != NSN_NAMESPACE){
					if (!sym.repl)
						return sfn_error('Not a namespace: "' + nsn.name + '"');
					nsn = ns.names[i] = nsname_namespace(nsn.name, namespace_new(ns.fr));
				}
				ns = nsn.ns;
				found = true;
				break;
			}
		}
		if (!found){
			var nns = namespace_new(ns.fr);
			ns.names.push(nsname_namespace(name, nns));
			ns = nns;
		}
	}
	return sfn_ok(ns);
}

var SPN_OK    = 'SPN_OK';
var SPN_ERROR = 'SPN_ERROR';

function spn_ok(){
	return { type: SPN_OK };
}

function spn_error(msg){
	return { type: SPN_ERROR, msg: msg };
}

function symtbl_pushNamespace(sym, names){
	var nsr = symtbl_findNamespace(sym, names, names.length);
	if (nsr.type == SFN_ERROR)
		return spn_error(nsr.msg);
	sym.sc.nsStack.push(nsr.ns);
	sym.sc.ns = nsr.ns;
	return spn_ok();
}

function symtbl_popNamespace(sym){
	sym.sc.nsStack.pop();
	sym.sc.ns = sym.sc.nsStack[sym.sc.nsStack.length - 1];
}

function symtbl_pushScope(sym){
	sym.sc = scope_new(sym.fr, sym.sc.lblBreak, sym.sc.lblContinue, sym.sc);
}

function symtbl_popScope(sym){
	sym.sc = sym.sc.parent;
}

function symtbl_pushFrame(sym){
	sym.fr = frame_new(sym.fr);
	sym.sc = scope_new(sym.fr, null, null, sym.sc);
}

function symtbl_frameOpenLabels(sym){
	for (var i = 0; i < sym.fr.lbls.length; i++){
		if (sym.fr.lbls[i].pos < 0)
			return true;
	}
	return false;
}

function symtbl_popFrame(sym){
	sym.sc = sym.sc.parent;
	sym.fr = sym.fr.parent;
}

var STL_OK    = 'STL_OK';
var STL_ERROR = 'STL_ERROR';

function stl_ok(nsn){
	return { type: STL_OK, nsn: nsn };
}

function stl_error(msg){
	return { type: STL_ERROR, msg: msg };
}

function symtbl_lookup(sym, names){
	var tried = [];
	var trysc = sym.sc;
	while (trysc != null){
		for (var trynsi = trysc.nsStack.length - 1; trynsi >= 0; trynsi--){
			var tryns = trysc.nsStack[trynsi];
			var n = namespace_lookup(tryns, names, 0, tried);
			if (n.type == NL_FOUND)
				return stl_ok(n.nsn);
		}
		trysc = trysc.parent;
	}
	return stl_error('Not found: ' + names.join('.'));
}

var STA_OK    = 'STA_OK';
var STA_VAR   = 'STA_VAR';
var STA_ERROR = 'STA_ERROR';

function sta_ok(){
	return { type: STA_OK };
}

function sta_var(vlc){
	return { type: STA_VAR, vlc: vlc };
}

function sta_error(msg){
	return { type: STA_ERROR, msg: msg };
}

function symtbl_addTemp(sym){
	for (var i = 0; i < sym.fr.vars.length; i++){
		if (sym.fr.vars[i] == FVR_TEMP_AVAIL){
			sym.fr.vars[i] = FVR_TEMP_INUSE;
			return sta_var(varloc_new(0, i));
		}
	}
	if (sym.fr.vars.length >= 256)
		return sta_error('Too many variables in frame');
	sym.fr.vars.push(FVR_TEMP_INUSE);
	return sta_var(varloc_new(0, sym.fr.vars.length - 1));
}

function symtbl_clearTemp(sym, vlc){
	if (vlc.fdiff == 0 && sym.fr.vars[vlc.index] == FVR_TEMP_INUSE)
		sym.fr.vars[vlc.index] = FVR_TEMP_AVAIL;
}

function symtbl_addVar(sym, names){
	var nsr = symtbl_findNamespace(sym, names, names.length - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.msg);
	var ns = nsr.ns;
	for (var i = 0; i < ns.names.length; i++){
		var nsn = ns.names[i];
		if (nsn.name == names[names.length - 1]){
			if (!sym.repl)
				return sta_error('Cannot redefine "' + nsn.name + '"');
			if (nsn.type == NSN_VAR)
				return sta_var(varloc_new(frame_diff(nsn.fr, sym.fr), nsn.index));
			sym.fr.vars.push(FVR_VAR);
			ns.names[i] = nsname_var(nsn.name, sym.fr, sym.fr.vars.length - 1);
			return sta_var(varloc_new(0, sym.fr.vars.length - 1));
		}
	}
	if (sym.fr.vars.length >= 256)
		return sta_error('Too many variables in frame');
	sym.fr.vars.push(FVR_VAR);
	ns.names.push(nsname_var(names[names.length - 1], sym.fr, sym.fr.vars.length - 1));
	return sta_var(varloc_new(0, sym.fr.vars.length - 1));
}

function symtbl_addCmdLocal(sym, names, lbl){
	var nsr = symtbl_findNamespace(sym, names, names.length - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.msg);
	var ns = nsr.ns;
	for (var i = 0; i < ns.names.length; i++){
		var nsn = ns.names[i];
		if (nsn.name == names[names.length - 1]){
			if (!sym.repl)
				return sta_error('Cannot redefine "' + nsn.name + '"');
			ns.names[i] = nsname_cmdLocal(nsn.name, sym.fr, lbl);
			return sta_ok();
		}
	}
	ns.names.push(nsname_cmdLocal(names[names.length - 1], sym.fr, lbl));
	return sta_ok();
}

function symtbl_addCmdNative(sym, names, index){
	var nsr = symtbl_findNamespace(sym, names, names.length - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.msg);
	var ns = nsr.ns;
	for (var i = 0; i < ns.names.length; i++){
		var nsn = ns.names[i];
		if (nsn.name == names[names.length - 1]){
			if (!sym.repl)
				return sta_error('Cannot redefine "' + nsn.name + '"');
			ns.names[i] = nsname_cmdNative(nsn.name, index);
			return sta_ok();
		}
	}
	ns.names.push(nsname_cmdNative(names[names.length - 1], index));
	return sta_ok();
}

function symtbl_addCmdOpcode(sym, name, opcode, params){
	// can simplify this function because it is only called internally
	sym.sc.ns.names.push(nsname_cmdOpcode(name, opcode, params));
}

function symtbl_loadStdlib(sym){
	function SAC(sym, name, opcode, params){
		symtbl_addCmdOpcode(sym, name, opcode, params);
	}
	SAC(sym, 'pick'          ,                -1,  3);
	SAC(sym, 'say'           , OP_SAY           , -1);
	SAC(sym, 'warn'          , OP_WARN          , -1);
	SAC(sym, 'ask'           , OP_ASK           , -1);
	SAC(sym, 'exit'          , OP_EXIT          , -1);
	SAC(sym, 'abort'         , OP_ABORT         , -1);
	SAC(sym, 'isnum'         , OP_ISNUM         ,  1);
	SAC(sym, 'isstr'         , OP_ISSTR         ,  1);
	SAC(sym, 'islist'        , OP_ISLIST        ,  1);
	SAC(sym, 'range'         , OP_RANGE         ,  3);
	symtbl_pushNamespace(sym, ['num']);
		SAC(sym, 'abs'       , OP_NUM_ABS       ,  1);
		SAC(sym, 'sign'      , OP_NUM_SIGN      ,  1);
		SAC(sym, 'max'       , OP_NUM_MAX       , -1);
		SAC(sym, 'min'       , OP_NUM_MIN       , -1);
		SAC(sym, 'clamp'     , OP_NUM_CLAMP     ,  3);
		SAC(sym, 'floor'     , OP_NUM_FLOOR     ,  1);
		SAC(sym, 'ceil'      , OP_NUM_CEIL      ,  1);
		SAC(sym, 'round'     , OP_NUM_ROUND     ,  1);
		SAC(sym, 'trunc'     , OP_NUM_TRUNC     ,  1);
		SAC(sym, 'nan'       , OP_NUM_NAN       ,  0);
		SAC(sym, 'inf'       , OP_NUM_INF       ,  0);
		SAC(sym, 'isnan'     , OP_NUM_ISNAN     ,  1);
		SAC(sym, 'isfinite'  , OP_NUM_ISFINITE  ,  1);
		SAC(sym, 'e'         , OP_NUM_E         ,  0);
		SAC(sym, 'pi'        , OP_NUM_PI        ,  0);
		SAC(sym, 'tau'       , OP_NUM_TAU       ,  0);
		SAC(sym, 'sin'       , OP_NUM_SIN       ,  1);
		SAC(sym, 'cos'       , OP_NUM_COS       ,  1);
		SAC(sym, 'tan'       , OP_NUM_TAN       ,  1);
		SAC(sym, 'asin'      , OP_NUM_ASIN      ,  1);
		SAC(sym, 'acos'      , OP_NUM_ACOS      ,  1);
		SAC(sym, 'atan'      , OP_NUM_ATAN      ,  1);
		SAC(sym, 'atan2'     , OP_NUM_ATAN2     ,  2);
		SAC(sym, 'log'       , OP_NUM_LOG       ,  1);
		SAC(sym, 'log2'      , OP_NUM_LOG2      ,  1);
		SAC(sym, 'log10'     , OP_NUM_LOG10     ,  1);
		SAC(sym, 'exp'       , OP_NUM_EXP       ,  1);
		SAC(sym, 'lerp'      , OP_NUM_LERP      ,  3);
		SAC(sym, 'hex'       , OP_NUM_HEX       ,  2);
		SAC(sym, 'oct'       , OP_NUM_OCT       ,  2);
		SAC(sym, 'bin'       , OP_NUM_BIN       ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['int']);
		SAC(sym, 'new'       , OP_INT_NEW       ,  1);
		SAC(sym, 'not'       , OP_INT_NOT       ,  1);
		SAC(sym, 'and'       , OP_INT_AND       ,  2);
		SAC(sym, 'or'        , OP_INT_OR        ,  2);
		SAC(sym, 'xor'       , OP_INT_XOR       ,  2);
		SAC(sym, 'shl'       , OP_INT_SHL       ,  2);
		SAC(sym, 'shr'       , OP_INT_SHR       ,  2);
		SAC(sym, 'sar'       , OP_INT_SAR       ,  2);
		SAC(sym, 'add'       , OP_INT_ADD       ,  2);
		SAC(sym, 'sub'       , OP_INT_SUB       ,  2);
		SAC(sym, 'mul'       , OP_INT_MUL       ,  2);
		SAC(sym, 'div'       , OP_INT_DIV       ,  2);
		SAC(sym, 'mod'       , OP_INT_MOD       ,  2);
		SAC(sym, 'clz'       , OP_INT_CLZ       ,  1);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['rand']);
		SAC(sym, 'seed'      , OP_RAND_SEED     ,  1);
		SAC(sym, 'seedauto'  , OP_RAND_SEEDAUTO ,  0);
		SAC(sym, 'int'       , OP_RAND_INT      ,  0);
		SAC(sym, 'num'       , OP_RAND_NUM      ,  0);
		SAC(sym, 'getstate'  , OP_RAND_GETSTATE ,  0);
		SAC(sym, 'setstate'  , OP_RAND_SETSTATE ,  1);
		SAC(sym, 'pick'      , OP_RAND_PICK     ,  1);
		SAC(sym, 'shuffle'   , OP_RAND_SHUFFLE  ,  1);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['str']);
		SAC(sym, 'new'       , OP_STR_NEW       , -1);
		SAC(sym, 'split'     , OP_STR_SPLIT     ,  2);
		SAC(sym, 'replace'   , OP_STR_REPLACE   ,  3);
		SAC(sym, 'begins'    , OP_STR_BEGINS    ,  2);
		SAC(sym, 'ends'      , OP_STR_ENDS      ,  2);
		SAC(sym, 'pad'       , OP_STR_PAD       ,  2);
		SAC(sym, 'find'      , OP_STR_FIND      ,  3);
		SAC(sym, 'rfind'     , OP_STR_RFIND     ,  3);
		SAC(sym, 'lower'     , OP_STR_LOWER     ,  1);
		SAC(sym, 'upper'     , OP_STR_UPPER     ,  1);
		SAC(sym, 'trim'      , OP_STR_TRIM      ,  1);
		SAC(sym, 'rev'       , OP_STR_REV       ,  1);
		SAC(sym, 'rep'       , OP_STR_REP       ,  1);
		SAC(sym, 'list'      , OP_STR_LIST      ,  1);
		SAC(sym, 'byte'      , OP_STR_BYTE      ,  2);
		SAC(sym, 'hash'      , OP_STR_HASH      ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['utf8']);
		SAC(sym, 'valid'     , OP_UTF8_VALID    ,  1);
		SAC(sym, 'list'      , OP_UTF8_LIST     ,  1);
		SAC(sym, 'str'       , OP_UTF8_STR      ,  1);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['struct']);
		SAC(sym, 'size'      , OP_STRUCT_SIZE   ,  1);
		SAC(sym, 'str'       , OP_STRUCT_STR    ,  2);
		SAC(sym, 'list'      , OP_STRUCT_LIST   ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['list']);
		SAC(sym, 'new'       , OP_LIST_NEW      ,  2);
		SAC(sym, 'shift'     , OP_LIST_SHIFT    ,  1);
		SAC(sym, 'pop'       , OP_LIST_POP      ,  1);
		SAC(sym, 'push'      , OP_LIST_PUSH     ,  2);
		SAC(sym, 'unshift'   , OP_LIST_UNSHIFT  ,  2);
		SAC(sym, 'append'    , OP_LIST_APPEND   ,  2);
		SAC(sym, 'prepend'   , OP_LIST_PREPEND  ,  2);
		SAC(sym, 'find'      , OP_LIST_FIND     ,  3);
		SAC(sym, 'rfind'     , OP_LIST_RFIND    ,  3);
		SAC(sym, 'join'      , OP_LIST_JOIN     ,  2);
		SAC(sym, 'rev'       , OP_LIST_REV      ,  1);
		SAC(sym, 'str'       , OP_LIST_STR      ,  1);
		SAC(sym, 'sort'      , OP_LIST_SORT     ,  1);
		SAC(sym, 'rsort'     , OP_LIST_RSORT    ,  1);
		SAC(sym, 'sortcmp'   , OP_LIST_SORTCMP  ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['pickle']);
		SAC(sym, 'valid'     , OP_PICKLE_VALID  ,  1);
		SAC(sym, 'str'       , OP_PICKLE_STR    ,  1);
		SAC(sym, 'val'       , OP_PICKLE_VAL    ,  1);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['gc']);
		SAC(sym, 'get'       , OP_GC_GET        ,  0);
		SAC(sym, 'set'       , OP_GC_SET        ,  1);
		SAC(sym, 'run'       , OP_GC_RUN        ,  0);
	symtbl_popNamespace(sym);
}

//
// program
//

function program_new(repl){
	return {
		repl: repl,
		strTable: [],
		numTable: [],
		keyTable: [],
		ops: []
	};
}

var PER_OK    = 'PER_OK';
var PER_ERROR = 'PER_ERROR';

function per_ok(vlc){
	return { type: PER_OK, vlc: vlc };
}

function per_error(flp, msg){
	return { type: PER_ERROR, flp: flp, msg: msg };
}

var PEM_EMPTY  = 'PEM_EMPTY';
var PEM_CREATE = 'PEM_CREATE';
var PEM_INTO   = 'PEM_INTO';

var PSR_OK    = 'PSR_OK';
var PSR_ERROR = 'PSR_ERROR';

function psr_ok(start, len){
	return { type: PSR_OK, start: start, len: len };
}

function psr_error(flp, msg){
	return { type: PSR_ERROR, flp: flp, msg: msg };
}

var LVR_VAR        = 'LVR_VAR';
var LVR_INDEX      = 'LVR_INDEX';
var LVR_SLICE      = 'LVR_SLICE';
var LVR_SLICEINDEX = 'LVR_SLICEINDEX';
var LVR_LIST       = 'LVR_LIST';

function lvr_var(flp, vlc){
	return { flp: flp, vlc: vlc, type: LVR_VAR };
}

function lvr_index(flp, obj, key){
	return { flp: flp, vlc: null, type: LVR_INDEX, obj: obj, key: key };
}

function lvr_slice(flp, obj, start, len){
	return { flp: flp, vlc: null, type: LVR_SLICE, obj: obj, start: start, len: len };
}

function lvr_sliceindex(flp, obj, key, start, len){
	return {
		flp: flp,
		vlc: null,
		type: LVR_SLICEINDEX,
		indexvlc: null,
		obj: obj,
		key: key,
		start: start,
		len: len
	};
}

function lvr_list(flp, body, rest){
	return { flp: flp, vlc: null, type: LVR_LIST, body: body, rest: rest };
}

var PLM_CREATE = 'PLM_CREATE';
var PLM_INTO   = 'PLM_INTO';

var LVP_OK    = 'LVP_OK';
var LVP_ERROR = 'LVP_ERROR';

function lvp_ok(lv){
	return { type: LVP_OK, lv: lv };
}

function lvp_error(flp, msg){
	return { type: LVP_ERROR, flp: flp, msg: msg };
}

function lval_addVars(sym, ex){
	if (ex.type == EXPR_NAMES){
		var sr = symtbl_addVar(sym, ex.names);
		if (sr.type == STA_ERROR)
			return lvp_error(ex.flp, sr.msg);
		return lvp_ok(lvr_var(ex.flp, sr.vlc));
	}
	else if (ex.type == EXPR_LIST){
		if (ex.ex == null)
			return lvp_error(ex.flp, 'Invalid assignment');
		var body = [];
		var rest = null;
		if (ex.ex.type == EXPR_GROUP){
			for (var i = 0; i < ex.ex.group.length; i++){
				var gex = ex.ex.group[i];
				if (i == ex.ex.group.length - 1 && gex.type == EXPR_PREFIX &&
					gex.k == KS_PERIOD3){
					var lp = lval_addVars(sym, gex.ex);
					if (lp.type == LVP_ERROR)
						return lp;
					rest = lp.lv;
				}
				else{
					var lp = lval_addVars(sym, gex);
					if (lp.type == LVP_ERROR)
						return lp;
					body.push(lp.lv);
				}
			}
		}
		else{
			if (ex.ex.type == EXPR_PREFIX && ex.ex.k == KS_PERIOD3){
				var lp = lval_addVars(sym, ex.ex.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				rest = lp.lv;
			}
			else{
				var lp = lval_addVars(sym, ex.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				body.push(lp.lv);
			}
		}
		return lvp_ok(lvr_list(ex.flp, body, rest));
	}
	return lvp_error(ex.flp, 'Invalid assignment');
}

function lval_prepare(prg, sym, ex){
	if (ex.type == EXPR_NAMES){
		var sl = symtbl_lookup(sym, ex.names);
		if (sl.type == STL_ERROR)
			return lvp_error(ex.flp, sl.msg);
		if (sl.nsn.type != NSN_VAR)
			return lvp_error(ex.flp, 'Invalid assignment');
		return lvp_ok(lvr_var(ex.flp, varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index)));
	}
	else if (ex.type == EXPR_INDEX){
		var pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj);
		if (pe.type == PER_ERROR)
			return lvp_error(pe.flp, pe.msg);
		var obj = pe.vlc;
		pe = program_eval(prg, sym, PEM_CREATE, null, ex.key);
		if (pe.type == PER_ERROR)
			return lvp_error(pe.flp, pe.msg);
		return lvp_ok(lvr_index(ex.flp, obj, pe.vlc));
	}
	else if (ex.type == EXPR_SLICE){
		if (ex.obj.type == EXPR_INDEX){
			// we have a slice of an index `foo[1][2:3]`
			var pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj.obj);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.flp, pe.msg);
			var obj = pe.vlc;
			pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj.key);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.flp, pe.msg);
			var key = pe.vlc;
			var sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return lvp_error(sr.flp, sr.msg);
			return lvp_ok(lvr_sliceindex(ex.flp, obj, key, sr.start, sr.len));
		}
		else{
			var pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.flp, pe.msg);
			var obj = pe.vlc;
			var sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return lvp_error(sr.flp, sr.msg);
			return lvp_ok(lvr_slice(ex.flp, obj, sr.start, sr.len));
		}
	}
	else if (ex.type == EXPR_LIST){
		var body = [];
		var rest = null;
		if (ex.ex === null)
			/* do nothing */;
		else if (ex.ex.type == EXPR_GROUP){
			for (var i = 0; i < ex.ex.group.length; i++){
				var gex = ex.ex.group[i];
				if (i == ex.ex.group.length - 1 && gex.type == EXPR_PREFIX &&
					gex.k == KS_PERIOD3){
					var lp = lval_prepare(prg, sym, gex.ex);
					if (lp.type == LVP_ERROR)
						return lp;
					rest = lp.lv;
				}
				else{
					var lp = lval_prepare(prg, sym, gex);
					if (lp.type == LVP_ERROR)
						return lp;
					body.push(lp.lv);
				}
			}
		}
		else{
			if (ex.ex.type == EXPR_PREFIX && ex.ex.k == KS_PERIOD3){
				var lp = lval_prepare(prg, sym, ex.ex.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				rest = lp.lv;
			}
			else{
				var lp = lval_prepare(prg, sym, ex.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				body.push(lp.lv);
			}
		}
		return lvp_ok(lvr_list(ex.flp, body, rest));
	}
	return lvp_error(ex.flp, 'Invalid assignment');
}

function lval_clearTemps(lv, sym){
	if (lv.type != LVR_VAR && lv.vlc != null){
		symtbl_clearTemp(sym, lv.vlc);
		lv.vlc = null;
	}
	switch (lv.type){
		case LVR_VAR:
			return;
		case LVR_INDEX:
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.key);
			return;
		case LVR_SLICE:
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.start);
			symtbl_clearTemp(sym, lv.len);
			return;
		case LVR_SLICEINDEX:
			if (lv.indexvlc != null){
				symtbl_clearTemp(sym, lv.indexvlc);
				lv.indexvlc = null;
			}
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.key);
			symtbl_clearTemp(sym, lv.start);
			symtbl_clearTemp(sym, lv.len);
			return;
		case LVR_LIST:
			for (var i = 0; i < lv.body.length; i++)
				lval_clearTemps(lv.body[i], sym);
			if (lv.rest != null)
				lval_clearTemps(lv.rest, sym);
			return;
	}
	throw new Error('Invalid LVR in lval_clearTemps');
}

function program_evalLval(prg, sym, mode, intoVlc, lv, mutop, valueVlc, clearTemps){
	// first, perform the assignment of valueVlc into lv
	switch (lv.type){
		case LVR_VAR:
			if (mutop < 0)
				op_move(prg.ops, lv.vlc, valueVlc);
			else
				op_binop(prg.ops, mutop, lv.vlc, lv.vlc, valueVlc);
			break;

		case LVR_INDEX: {
			if (mutop < 0)
				op_setat(prg.ops, lv.obj, lv.key, valueVlc);
			else{
				var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, mutop, pe.vlc, pe.vlc, valueVlc);
				op_setat(prg.ops, lv.obj, lv.key, pe.vlc);
			}
		} break;

		case LVR_SLICE: {
			if (mutop < 0)
				op_splice(prg.ops, lv.obj, lv.start, lv.len, valueVlc);
			else{
				var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_evalLval(prg, sym, PEM_EMPTY, null,
					lvr_var(lv.flp, lv.vlc), mutop, valueVlc, true);
				if (pe.type == PER_ERROR)
					return pe;
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv.flp, ts.msg);
				var t = ts.vlc;
				op_num(prg.ops, t, 0);
				op_slice(prg.ops, t, lv.vlc, t, lv.len);
				op_splice(prg.ops, lv.obj, lv.start, lv.len, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, lv.vlc);
				lv.vlc = null; // clear out the lval VLC, since it has changed
			}
		} break;

		case LVR_SLICEINDEX: {
			if (mutop < 0){
				var pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				op_splice(prg.ops, pe.vlc, lv.start, lv.len, valueVlc);
				op_setat(prg.ops, lv.obj, lv.key, pe.vlc);
			}
			else{
				var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_evalLval(prg, sym, PEM_EMPTY, null,
					lvr_var(lv.flp, lv.vlc), mutop, valueVlc, true);
				if (pe.type == PER_ERROR)
					return pe;
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv.flp, ts.msg);
				var t = ts.vlc;
				op_num(prg.ops, t, 0);
				op_slice(prg.ops, t, lv.vlc, t, lv.len);
				op_splice(prg.ops, lv.indexvlc, lv.start, lv.len, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, lv.indexvlc);
				symtbl_clearTemp(sym, lv.vlc);
				lv.indexvlc = null; // clear out the lval VLC, since it has changed
				lv.vlc = null;
			}
		} break;

		case LVR_LIST: {
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var t = ts.vlc;

			for (var i = 0; i < lv.body.length; i++){
				op_num(prg.ops, t, i);
				op_getat(prg.ops, t, valueVlc, t);
				var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lv.body[i], mutop, t, false);
				if (pe.type == PER_ERROR)
					return pe;
			}

			if (lv.rest != null){
				ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv.flp, ts.msg);
				var t2 = ts.vlc;

				op_num(prg.ops, t, lv.body.length);
				op_nil(prg.ops, t2);
				op_slice(prg.ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lv.rest, mutop, t, false);
				if (pe.type == PER_ERROR)
					return pe;
			}
			symtbl_clearTemp(sym, t);
		} break;
	}

	// now, see if we need to put the result into anything
	if (mode == PEM_EMPTY){
		if (clearTemps)
			lval_clearTemps(lv, sym);
		return per_ok(null);
	}
	else if (mode == PEM_CREATE){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return per_error(lv.flp, ts.msg);
		intoVlc = ts.vlc;
	}

	var pe = program_lvalGet(prg, sym, PLM_INTO, intoVlc, lv);
	if (pe.type == PER_ERROR)
		return pe;
	if (clearTemps)
		lval_clearTemps(lv, sym);
	return per_ok(intoVlc);
}

function program_slice(prg, sym, ex){
	var start;
	if (ex.start == null){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex.flp, ts.msg);
		start = ts.vlc;
		op_num(prg.ops, start, 0);
	}
	else{
		var pe = program_eval(prg, sym, PEM_CREATE, null, ex.start);
		if (pe.type == PER_ERROR)
			return psr_error(pe.flp, pe.msg);
		start = pe.vlc;
	}

	var len;
	if (ex.len == null){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex.flp, ts.msg);
		len = ts.vlc;
		op_nil(prg.ops, len);
	}
	else{
		var pe = program_eval(prg, sym, PEM_CREATE, null, ex.len);
		if (pe.type == PER_ERROR)
			return psr_error(pe.flp, pe.msg);
		len = pe.vlc;
	}

	return psr_ok(start, len);
}

function program_lvalGetIndex(prg, sym, lv){
	// specifically for LVR_SLICEINDEX in order to fill lv.indexvlc
	if (lv.indexvlc != null)
		return per_ok(lv.indexvlc);

	var ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR)
		return per_error(lv.flp, ts.msg);
	lv.indexvlc = ts.vlc;

	op_getat(prg.ops, lv.indexvlc, lv.obj, lv.key);
	return per_ok(lv.indexvlc);
}

function program_lvalGet(prg, sym, mode, intoVlc, lv){
	if (lv.vlc != null){
		if (mode == PLM_CREATE)
			return per_ok(lv.vlc);
		op_move(prg.ops, intoVlc, lv.vlc);
		return per_ok(intoVlc);
	}

	if (mode == PLM_CREATE){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return per_error(lv.flp, ts.msg);
		intoVlc = lv.vlc = ts.vlc;
	}

	switch (lv.type){
		case LVR_VAR:
			throw new Error('LVR_VAR doesn\'t have vlc set');

		case LVR_INDEX:
			op_getat(prg.ops, intoVlc, lv.obj, lv.key);
			break;

		case LVR_SLICE:
			op_slice(prg.ops, intoVlc, lv.obj, lv.start, lv.len);
			break;

		case LVR_SLICEINDEX: {
			var pe = program_lvalGetIndex(prg, sym, lv);
			if (pe.type == PER_ERROR)
				return pe;
			op_slice(prg.ops, intoVlc, pe.vlc, lv.start, lv.len);
		} break;

		case LVR_LIST: {
			op_list(prg.ops, intoVlc, lv.body.length);

			for (var i = 0; i < lv.body.length; i++){
				var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv.body[i]);
				if (pe.type == PER_ERROR)
					return pe;
				op_param2(prg.ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.vlc);
			}

			if (lv.rest != null){
				var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv.rest);
				if (pe.type == PER_ERROR)
					return pe;
				op_param2(prg.ops, OP_LIST_APPEND, intoVlc, intoVlc, pe.vlc);
			}
		} break;
	}

	return per_ok(intoVlc);
}

function program_evalCall_checkList(prg, sym, flp, vlc){
	var ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR)
		return per_error(flp, ts.msg);
	var t = ts.vlc;
	var skip = label_new('^skip');
	op_unop(prg.ops, OP_ISLIST, t, vlc);
	label_jumpTrue(skip, prg.ops, t);
	op_aborterr(prg.ops, ABORT_LISTFUNC);
	label_declare(skip, prg.ops);
	symtbl_clearTemp(sym, t);
	return per_ok(null);
}

function program_evalCall(prg, sym, mode, intoVlc, flp, nsn, paramsAt, params){
	// params can be null to indicate emptiness
	if (nsn.type == NSN_CMD_OPCODE && nsn.opcode == -1){ // short-circuit `pick`
		if (paramsAt || params == null || params.type != EXPR_GROUP || params.group.length != 3)
			return per_error(flp, 'Using `pick` requires exactly three arguments');

		var pe = program_eval(prg, sym, PEM_CREATE, null, params.group[0]);
		if (pe.type == PER_ERROR)
			return pe;
		if (mode == PEM_CREATE){
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			intoVlc = ts.vlc;
		}

		var pickfalse = label_new('^pickfalse');
		var finish = label_new('^pickfinish');

		label_jumpFalse(pickfalse, prg.ops, pe.vlc);
		symtbl_clearTemp(sym, pe.vlc);

		if (mode == PEM_EMPTY)
			pe = program_eval(prg, sym, PEM_EMPTY, intoVlc, params.group[1]);
		else
			pe = program_eval(prg, sym, PEM_INTO, intoVlc, params.group[1]);
		if (pe.type == PER_ERROR)
			return pe;
		label_jump(finish, prg.ops);

		label_declare(pickfalse, prg.ops);
		if (mode == PEM_EMPTY)
			pe = program_eval(prg, sym, PEM_EMPTY, intoVlc, params.group[2]);
		else
			pe = program_eval(prg, sym, PEM_INTO, intoVlc, params.group[2]);
		if (pe.type == PER_ERROR)
			return pe;

		label_declare(finish, prg.ops);
		return per_ok(intoVlc);
	}

	if (nsn.type == NSN_CMD_LOCAL || nsn.type == NSN_CMD_NATIVE ||
		(nsn.type == NSN_CMD_OPCODE && nsn.params == -1)){
		if (mode == PEM_EMPTY || mode == PEM_CREATE){
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			intoVlc = ts.vlc;
		}

		var args;
		if (!paramsAt)
			params = expr_list(flp, params);
		var pe = program_eval(prg, sym, PEM_CREATE, null, params);
		if (pe.type == PER_ERROR)
			return pe;
		args = pe.vlc;

		if (nsn.type == NSN_CMD_LOCAL)
			label_call(nsn.lbl, prg.ops, intoVlc, args, frame_diff(nsn.fr, sym.fr));
		else if (nsn.type == NSN_CMD_NATIVE)
			op_native(prg.ops, intoVlc, args, nsn.index);
		else // variable argument NSN_CMD_OPCODE
			op_param1(prg.ops, nsn.opcode, intoVlc, args);

		symtbl_clearTemp(sym, args);
	}
	else if (nsn.type == NSN_CMD_OPCODE){
		if (nsn.params == 0){
			if (params != null){
				if (paramsAt){
					// this needs to fail: `var x = 1; num.tau @ x;`
					// even though `num.tau` takes zero parameters
					var pe = program_eval(prg, sym, PEM_CREATE, null, params);
					if (pe.type == PER_ERROR)
						return pe;
					var args = pe.vlc;
					pe = program_evalCall_checkList(prg, sym, flp, args);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, args);
				}
				else{
					var pe = program_eval(prg, sym, PEM_EMPTY, null, params);
					if (pe.type == PER_ERROR)
						return pe;
				}
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.msg);
				intoVlc = ts.vlc;
			}
			op_param0(prg.ops, nsn.opcode, intoVlc);
		}
		else if (nsn.params == 1 || nsn.params == 2 || nsn.params == 3){
			var p1, p2, p3;

			if (paramsAt){
				var pe = program_eval(prg, sym, PEM_CREATE, null, params);
				if (pe.type == PER_ERROR)
					return pe;
				var args = pe.vlc;
				pe = program_evalCall_checkList(prg, sym, flp, args);
				if (pe.type == PER_ERROR)
					return pe;

				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.msg);
				p1 = ts.vlc;
				op_num(prg.ops, p1, 0);
				op_getat(prg.ops, p1, args, p1);

				if (nsn.params >= 2){
					ts = symtbl_addTemp(sym);
					if (ts.type == STA_ERROR)
						return per_error(flp, ts.msg);
					p2 = ts.vlc;
					op_num(prg.ops, p2, 1);
					op_getat(prg.ops, p2, args, p2);

					if (nsn.params >= 3){
						ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(flp, ts.msg);
						p3 = ts.vlc;
						op_num(prg.ops, p3, 2);
						op_getat(prg.ops, p3, args, p3);
					}
				}

				symtbl_clearTemp(sym, args);
			}
			else if (params == null){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.msg);
				p1 = p2 = p3 = ts.vlc;
				op_nil(prg.ops, p1);
			}
			else{
				if (params.type == EXPR_GROUP){
					var pe = program_eval(prg, sym, PEM_CREATE, null, params.group[0]);
					if (pe.type == PER_ERROR)
						return pe;
					p1 = pe.vlc;

					if (nsn.params > 1)
						pe = program_eval(prg, sym, PEM_CREATE, null, params.group[1]);
					else
						pe = program_eval(prg, sym, PEM_EMPTY, null, params.group[1]);
					if (pe.type == PER_ERROR)
						return pe;
					if (nsn.params > 1)
						p2 = pe.vlc;

					var rest = 2;
					if (nsn.params >= 3){
						if (params.group.length <= 2){
							var ts = symtbl_addTemp(sym);
							if (ts.type == STA_ERROR)
								return per_error(params.flp, ts.msg);
							p3 = ts.vlc;
							op_nil(prg.ops, p3);
						}
						else{
							rest = 3;
							pe = program_eval(prg, sym, PEM_CREATE, null, params.group[2]);
							if (pe.type == PER_ERROR)
								return pe;
							p3 = pe.vlc;
						}
					}

					for (var i = rest; i < params.group.length; i++){
						pe = program_eval(prg, sym, PEM_EMPTY, null, params.group[i]);
						if (pe.type == PER_ERROR)
							return pe;
					}
				}
				else{
					var pe = program_eval(prg, sym, PEM_CREATE, null, params);
					if (pe.type == PER_ERROR)
						return pe;
					p1 = pe.vlc;
					if (nsn.params > 1){
						var ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(params.flp, ts.msg);
						p2 = p3 = ts.vlc;
						op_nil(prg.ops, p2);
					}
				}
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.msg);
				intoVlc = ts.vlc;
			}
			if (nsn.params == 1)
				op_param1(prg.ops, nsn.opcode, intoVlc, p1);
			else if (nsn.params == 2)
				op_param2(prg.ops, nsn.opcode, intoVlc, p1, p2);
			else // nsn.params == 3
				op_param3(prg.ops, nsn.opcode, intoVlc, p1, p2, p3);

			symtbl_clearTemp(sym, p1);
			if (nsn.params >= 2){
				symtbl_clearTemp(sym, p2);
				if (nsn.params >= 3)
					symtbl_clearTemp(sym, p3);
			}
		}
		else
			throw new Error('Invalid opcode params');
	}
	else
		return per_error(flp, 'Invalid call');

	if (mode == PEM_EMPTY){
		symtbl_clearTemp(sym, intoVlc);
		return per_ok(null);
	}
	return per_ok(intoVlc);
}

function program_lvalCheckNil(prg, sym, lv, jumpFalse, inverted, skip){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv);
			if (pe.type == PER_ERROR)
				return pe;
			if (jumpFalse == !inverted)
				label_jumpFalse(skip, prg.ops, pe.vlc);
			else
				label_jumpTrue(skip, prg.ops, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX: {
			var obj;
			if (lv.type == LVR_SLICE)
				obj = lv.obj;
			else{
				var pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				obj = lv.indexvlc;
			}

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var idx = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var t = ts.vlc;

			op_num(prg.ops, idx, 0);

			var next = label_new('^condslicenext');

			op_nil(prg.ops, t);
			op_binop(prg.ops, OP_EQU, t, t, lv.len);
			label_jumpFalse(next, prg.ops, t);
			op_unop(prg.ops, OP_SIZE, t, obj);
			op_binop(prg.ops, OP_NUM_SUB, lv.len, t, lv.start);

			label_declare(next, prg.ops);

			op_binop(prg.ops, OP_LT, t, idx, lv.len);

			var keep = label_new('^condslicekeep');
			label_jumpFalse(inverted ? keep : skip, prg.ops, t);

			op_binop(prg.ops, OP_NUM_ADD, t, idx, lv.start);
			op_getat(prg.ops, t, obj, t);
			if (jumpFalse)
				label_jumpTrue(inverted ? skip : keep, prg.ops, t);
			else
				label_jumpFalse(inverted ? skip : keep, prg.ops, t);

			op_inc(prg.ops, idx);
			label_jump(next, prg.ops);
			label_declare(keep, prg.ops);

			symtbl_clearTemp(sym, idx);
			symtbl_clearTemp(sym, t);
		} break;

		case LVR_LIST: {
			var keep = label_new('^condkeep');
			for (var i = 0; i < lv.body.length; i++)
				program_lvalCheckNil(prg, sym, lv.body[i], jumpFalse, true, inverted ? skip : keep);
			if (lv.rest != null)
				program_lvalCheckNil(prg, sym, lv.rest, jumpFalse, true, inverted ? skip : keep);
			if (!inverted)
				label_jump(skip, prg.ops);
			label_declare(keep, prg.ops);
		} break;
	}
	return per_ok(null);
}

function program_lvalCondAssignPart(prg, sym, lv, jumpFalse, valueVlc){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, null, lv);
			if (pe.type == PER_ERROR)
				return pe;
			var skip = label_new('^condskippart');
			if (jumpFalse)
				label_jumpFalse(skip, prg.ops, pe.vlc);
			else
				label_jumpTrue(skip, prg.ops, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);
			pe = program_evalLval(prg, sym, PEM_EMPTY, null, lv, -1, valueVlc, true);
			if (pe.type == PER_ERROR)
				return pe;
			label_declare(skip, prg.ops);
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX: {
			var obj;
			if (lv.type == LVR_SLICE)
				obj = lv.obj;
			else{
				var pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				obj = lv.indexvlc;
			}

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var idx = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var t = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var t2 = ts.vlc;

			op_num(prg.ops, idx, 0);

			var next = label_new('^condpartslicenext');

			op_nil(prg.ops, t);
			op_binop(prg.ops, OP_EQU, t, t, lv.len);
			label_jumpFalse(next, prg.ops, t);
			op_unop(prg.ops, OP_SIZE, t, obj);
			op_binop(prg.ops, OP_NUM_SUB, lv.len, t, lv.start);

			label_declare(next, prg.ops);

			op_binop(prg.ops, OP_LT, t, idx, lv.len);

			var done = label_new('^condpartslicedone');
			label_jumpFalse(done, prg.ops, t);

			var inc = label_new('^condpartsliceinc');
			op_binop(prg.ops, OP_NUM_ADD, t, idx, lv.start);
			op_getat(prg.ops, t2, obj, t);
			if (jumpFalse)
				label_jumpFalse(inc, prg.ops, t2);
			else
				label_jumpTrue(inc, prg.ops, t2);

			op_getat(prg.ops, t2, valueVlc, idx);
			op_setat(prg.ops, obj, t, t2);

			label_declare(inc, prg.ops);
			op_inc(prg.ops, idx);
			label_jump(next, prg.ops);
			label_declare(done, prg.ops);

			symtbl_clearTemp(sym, idx);
			symtbl_clearTemp(sym, t);
			symtbl_clearTemp(sym, t2);
		} break;

		case LVR_LIST: {
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv.flp, ts.msg);
			var t = ts.vlc;
			for (var i = 0; i < lv.body.length; i++){
				op_num(prg.ops, t, i);
				op_getat(prg.ops, t, valueVlc, t);
				var pe = program_lvalCondAssignPart(prg, sym, lv.body[i], jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			if (lv.rest != null){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv.flp, ts.msg);
				var t2 = ts.vlc;
				op_num(prg.ops, t, lv.body.length);
				op_nil(prg.ops, t2);
				op_slice(prg.ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				var pe = program_lvalCondAssignPart(prg, sym, lv.rest, jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			symtbl_clearTemp(sym, t);
		} break;
	}
	return per_ok(null);
}

function program_lvalCondAssign(prg, sym, lv, jumpFalse, valueVlc){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lv, -1, valueVlc, true);
			if (pe.type == PER_ERROR)
				return pe;
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX:
		case LVR_LIST:
			return program_lvalCondAssignPart(prg, sym, lv, jumpFalse, valueVlc);
	}
	symtbl_clearTemp(sym, valueVlc);
	return per_ok(null);
}

function program_eval(prg, sym, mode, intoVlc, ex){
	switch (ex.type){
		case EXPR_NIL: {
			if (mode == PEM_EMPTY)
				return per_ok(null);
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			op_nil(prg.ops, intoVlc);
			return per_ok(intoVlc);
		} break;

		case EXPR_NUM: {
			if (mode == PEM_EMPTY)
				return per_ok(null);
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			if (Math.floor(ex.num) == ex.num && ex.num >= -65536 && ex.num < 65536){
				op_num(prg.ops, intoVlc, ex.num);
				return per_ok(intoVlc);
			}
			var found = false;
			var index;
			for (index = 0; index < prg.numTable.length; index++){
				found = prg.numTable[index] == ex.num;
				if (found)
					break;
			}
			if (!found){
				if (index >= 65536)
					return per_error(ex.flp, 'Too many number constants');
				prg.numTable.push(ex.num);
			}
			op_numtbl(prg.ops, intoVlc, index);
			return per_ok(intoVlc);
		} break;

		case EXPR_STR: {
			if (mode == PEM_EMPTY)
				return per_ok(null);
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			var found = false;
			var index;
			for (index = 0; index < prg.strTable.length; index++){
				found = ex.str == prg.strTable[index];
				if (found)
					break;
			}
			if (!found){
				if (index >= 65536)
					return per_error(ex.flp, 'Too many string constants');
				prg.strTable.push(ex.str);
			}
			op_str(prg.ops, intoVlc, index);
			return per_ok(intoVlc);
		} break;

		case EXPR_LIST: {
			if (mode == PEM_EMPTY){
				if (ex.ex != null)
					return program_eval(prg, sym, PEM_EMPTY, null, ex.ex);
				return per_ok(null);
			}
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			if (ex.ex != null){
				if (ex.ex.type == EXPR_GROUP){
					op_list(prg.ops, intoVlc, ex.ex.group.length);
					for (var i = 0; i < ex.ex.group.length; i++){
						var pe = program_eval(prg, sym, PEM_CREATE, null, ex.ex.group[i]);
						if (pe.type == PER_ERROR)
							return pe;
						symtbl_clearTemp(sym, pe.vlc);
						op_param2(prg.ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.vlc);
					}
				}
				else{
					op_list(prg.ops, intoVlc, 1);
					var pe = program_eval(prg, sym, PEM_CREATE, null, ex.ex);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, pe.vlc);
					op_param2(prg.ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.vlc);
				}
			}
			else
				op_list(prg.ops, intoVlc, 0);
			return per_ok(intoVlc);
		} break;

		case EXPR_NAMES: {
			var sl = symtbl_lookup(sym, ex.names);
			if (sl.type == STL_ERROR)
				return per_error(ex.flp, sl.msg);
			switch (sl.nsn.type){
				case NSN_VAR: {
					if (mode == PEM_EMPTY)
						return per_ok(null);
					var varVlc = varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index);
					if (mode == PEM_CREATE)
						return per_ok(varVlc);
					op_move(prg.ops, intoVlc, varVlc);
					return per_ok(intoVlc);
				} break;

				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
				case NSN_CMD_OPCODE:
					return program_evalCall(prg, sym, mode, intoVlc, ex.flp, sl.nsn, false, null);

				case NSN_NAMESPACE:
					return per_error(ex.flp, 'Invalid expression');
			}
			throw new Error('Unknown NSN type');
		} break;

		case EXPR_VAR: {
			if (mode == PEM_EMPTY)
				return per_ok(null);
			else if (mode == PEM_CREATE)
				return per_ok(ex.vlc);
			op_move(prg.ops, intoVlc, ex.vlc);
			return per_ok(intoVlc);
		} break;

		case EXPR_PAREN:
			return program_eval(prg, sym, mode, intoVlc, ex.ex);

		case EXPR_GROUP:
			for (var i = 0; i < ex.group.length; i++){
				if (i == ex.group.length - 1)
					return program_eval(prg, sym, mode, intoVlc, ex.group[i]);
				var pe = program_eval(prg, sym, PEM_EMPTY, null, ex.group[i]);
				if (pe.type == PER_ERROR)
					return pe;
			}
			break;

		case EXPR_PREFIX: {
			var unop = ks_toUnaryOp(ex.k);
			if (unop < 0)
				return per_error(ex.flp, 'Invalid unary operator');
			var pe = program_eval(prg, sym, PEM_CREATE, null, ex.ex);
			if (pe.type == PER_ERROR)
				return pe;
			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			op_unop(prg.ops, unop, intoVlc, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(null);
			}
			return per_ok(intoVlc);
		} break;

		case EXPR_INFIX: {
			var mutop = ks_toMutateOp(ex.k);
			if (ex.k == KS_EQU || ex.k == KS_AMP2EQU || ex.k == KS_PIPE2EQU || mutop >= 0){
				var lp = lval_prepare(prg, sym, ex.left);
				if (lp.type == LVP_ERROR)
					return per_error(lp.flp, lp.msg);

				if (ex.k == KS_AMP2EQU || ex.k == KS_PIPE2EQU){
					var skip = label_new('^condsetskip');

					var pe = program_lvalCheckNil(prg, sym, lp.lv, ex.k == KS_AMP2EQU, false, skip);
					if (pe.type == PER_ERROR)
						return pe;

					pe = program_eval(prg, sym, PEM_CREATE, null, ex.right);
					if (pe.type == PER_ERROR)
						return pe;

					pe = program_lvalCondAssign(prg, sym, lp.lv, ex.k == KS_AMP2EQU, pe.vlc);
					if (pe.type == PER_ERROR)
						return pe;

					if (mode == PEM_EMPTY){
						label_declare(skip, prg.ops);
						lval_clearTemps(lp.lv, sym);
						return per_ok(null);
					}

					label_declare(skip, prg.ops);

					if (mode == PEM_CREATE){
						var ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex.flp, ts.msg);
						intoVlc = ts.vlc;
					}

					var ple = program_lvalGet(prg, sym, PLM_INTO, intoVlc, lp.lv);
					if (ple.type == PER_ERROR)
						return ple;

					lval_clearTemps(lp.lv, sym);
					return per_ok(intoVlc);
				}

				// special handling for basic variable assignment to avoid a temporary
				if (ex.k == KS_EQU && lp.lv.type == LVR_VAR){
					var pe = program_eval(prg, sym, PEM_INTO, lp.lv.vlc, ex.right);
					if (pe.type == PER_ERROR)
						return pe;
					if (mode == PEM_EMPTY)
						return per_ok(null);
					else if (mode == PEM_CREATE){
						var ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex.flp, ts.msg);
						intoVlc = ts.vlc;
					}
					op_move(prg.ops, intoVlc, lp.lv.vlc);
					return per_ok(intoVlc);
				}

				var pe = program_eval(prg, sym, PEM_CREATE, null, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				return program_evalLval(prg, sym, mode, intoVlc, lp.lv, mutop, pe.vlc, true);
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}

			var binop = ks_toBinaryOp(ex.k);
			if (binop >= 0){
				var pe = program_eval(prg, sym, PEM_CREATE, null, ex.left);
				if (pe.type == PER_ERROR)
					return pe;
				var left = pe.vlc;
				pe = program_eval(prg, sym, PEM_CREATE, null, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, binop, intoVlc, left, pe.vlc);
				symtbl_clearTemp(sym, left);
				symtbl_clearTemp(sym, pe.vlc);
			}
			else if (ex.k == KS_AT){
				if (ex.left.type != EXPR_NAMES)
					return per_error(ex.flp, 'Invalid call');
				var sl = symtbl_lookup(sym, ex.left.names);
				if (sl.type == STL_ERROR)
					return per_error(ex.flp, sl.msg);
				var pe = program_evalCall(prg, sym, PEM_INTO, intoVlc, ex.flp, sl.nsn, true,
					ex.right);
				if (pe.type == PER_ERROR)
					return pe;
			}
			else if (ex.k == KS_AMP2 || ex.k == KS_PIPE2){
				var pe = program_eval(prg, sym, PEM_CREATE, null, ex.left);
				if (pe.type == PER_ERROR)
					return pe;
				var left = pe.vlc;
				var useleft = label_new('^useleft');
				if (ex.k == KS_AMP2)
					label_jumpFalse(useleft, prg.ops, left);
				else
					label_jumpTrue(useleft, prg.ops, left);
				pe = program_eval(prg, sym, PEM_INTO, intoVlc, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				var finish = label_new('^finish');
				label_jump(finish, prg.ops);
				label_declare(useleft, prg.ops);
				op_move(prg.ops, intoVlc, left);
				label_declare(finish, prg.ops);
				symtbl_clearTemp(sym, left);
			}
			else
				return per_error(ex.flp, 'Invalid operation');

			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(null);
			}
			return per_ok(intoVlc);
		} break;

		case EXPR_CALL: {
			if (ex.cmd.type != EXPR_NAMES)
				return per_error(ex.flp, 'Invalid call');
			var sl = symtbl_lookup(sym, ex.cmd.names);
			if (sl.type == STL_ERROR)
				return per_error(ex.flp, sl.msg);
			return program_evalCall(prg, sym, mode, intoVlc, ex.flp, sl.nsn, false, ex.params);
		} break;

		case EXPR_INDEX: {
			if (mode == PEM_EMPTY){
				var pe = program_eval(prg, sym, PEM_EMPTY, null, ex.obj);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_eval(prg, sym, PEM_EMPTY, null, ex.key);
				if (pe.type == PER_ERROR)
					return pe;
				return per_ok(null);
			}
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}

			var pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			pe = program_eval(prg, sym, PEM_CREATE, null, ex.key);
			if (pe.type == PER_ERROR)
				return pe;
			var key = pe.vlc;

			op_getat(prg.ops, intoVlc, obj, key);
			symtbl_clearTemp(sym, obj);
			symtbl_clearTemp(sym, key);
			return per_ok(intoVlc);
		} break;

		case EXPR_SLICE: {
			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}

			var pe = program_eval(prg, sym, PEM_CREATE, null, ex.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			var sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return per_error(sr.flp, sr.msg);

			op_slice(prg.ops, intoVlc, obj, sr.start, sr.len);
			symtbl_clearTemp(sym, obj);
			symtbl_clearTemp(sym, sr.start);
			symtbl_clearTemp(sym, sr.len);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(null);
			}
			return per_ok(intoVlc);
		} break;
	}
}

var PGR_OK    = 'PGR_OK';
var PGR_PUSH  = 'PGR_PUSH';
var PGR_POP   = 'PGR_POP';
var PGR_ERROR = 'PGR_ERROR';

function pgr_ok(){
	return { type: PGR_OK };
}

function pgr_push(state){
	return { type: PGR_PUSH, state: state };
}

function pgr_pop(){
	return { type: PGR_POP };
}

function pgr_error(flp, msg){
	return { type: PGR_ERROR, flp: flp, msg: msg };
}

function pgs_dowhile_new(top, cond, finish){
	return { top: top, cond: cond, finish: finish };
}

function pgs_for_new(t, exp_vlc, val_vlc, idx_vlc, top, inc, finish){
	return {
		t: t,
		exp_vlc: exp_vlc,
		val_vlc: val_vlc,
		idx_vlc: idx_vlc,
		top: top,
		inc: inc,
		finish: finish
	};
}

function pgs_loop_new(lcont, lbrk){
	return { lcont: lcont, lbrk: lbrk };
}

function pgs_if_new(nextcond, ifdone){
	return { nextcond: nextcond, ifdone: ifdone };
}

function program_gen(prg, sym, stmt, pst, sayexpr){
	switch (stmt.type){
		case AST_BREAK: {
			if (sym.sc.lblBreak == null)
				return pgr_error(stmt.flp, 'Invalid `break`');
			label_jump(sym.sc.lblBreak, prg.ops);
			return pgr_ok();
		} break;

		case AST_CONTINUE: {
			if (sym.sc.lblContinue == null)
				return pgr_error(stmt.flp, 'Invalid `continue`');
			label_jump(sym.sc.lblContinue, prg.ops);
			return pgr_ok();
		} break;

		case AST_DECLARE: {
			var dc = stmt.dc;
			switch (dc.type){
				case DECL_LOCAL: {
					var lbl = label_new('^def');
					sym.fr.lbls.push(lbl);
					var sr = symtbl_addCmdLocal(sym, dc.names, lbl);
					if (sr.type == STA_ERROR)
						return pgr_error(dc.flp, sr.msg);
				} break;
				case DECL_NATIVE: {
					var found = false;
					var index;
					for (index = 0; index < prg.keyTable.length; index++){
						found = prg.keyTable[index] == dc.key;
						if (found)
							break;
					}
					if (!found){
						if (index >= 65536)
							return pgr_error(dc.flp, 'Too many native functions');
						prg.keyTable.push(dc.key);
					}
					var sr = symtbl_addCmdNative(sym, dc.names, index);
					if (sr.type == STA_ERROR)
						return pgr_error(dc.flp, sr.msg);
				} break;
			}
			return pgr_ok();
		} break;

		case AST_DEF1: {
			var n = namespace_lookupImmediate(sym.sc.ns, stmt.names);
			var lbl;
			if (n.type == NL_FOUND && n.nsn.type == NSN_CMD_LOCAL){
				lbl = n.nsn.lbl;
				if (!sym.repl && lbl.pos >= 0) // if already defined, error
					return pgr_error(stmt.flp, 'Cannot redefine "' + stmt.names.join('.') + '"');
			}
			else{
				lbl = label_new('^def');
				var sr = symtbl_addCmdLocal(sym, stmt.names, lbl);
				if (sr.type == STA_ERROR)
					return pgr_error(stmt.flp, sr.msg);
			}

			var skip = label_new('^after_def');
			label_jump(skip, prg.ops);

			label_declare(lbl, prg.ops);
			symtbl_pushFrame(sym);

			if (stmt.lvalues.length > 0){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return pgr_error(stmt.flp, ts.msg);
				var t = ts.vlc;
				var args = varloc_new(0, 0);
				for (var i = 0; i < stmt.lvalues.length; i++){
					var ex = stmt.lvalues[i];
					if (ex.type == EXPR_INFIX){
						// init code has to happen first, because we want name resolution to be
						// as though these variables haven't been defined yet... so a bit of goofy
						// jumping, but not bad
						var pr = null;
						var perfinit = null;
						var doneinit = null;
						if (ex.right != null){
							perfinit = label_new('^perfinit');
							doneinit = label_new('^doneinit');
							var skipinit = label_new('^skipinit');
							label_jump(skipinit, prg.ops);
							label_declare(perfinit, prg.ops);
							pr = program_eval(prg, sym, PEM_CREATE, null, ex.right);
							if (pr.type == PER_ERROR)
								return pgr_error(pr.flp, pr.msg);
							label_jump(doneinit, prg.ops);
							label_declare(skipinit, prg.ops);
						}

						// now we can add the param symbols
						var lr = lval_addVars(sym, ex.left);
						if (lr.type == LVP_ERROR)
							return pgr_error(lr.flp, lr.msg);

						// and grab the appropriate value from the args
						op_num(prg.ops, t, i);
						op_getat(prg.ops, t, args, t); // 0:0 are passed in arguments

						var finish = null;
						if (ex.right != null){
							finish = label_new('^finish');
							var passinit = label_new('^passinit');
							label_jumpFalse(perfinit, prg.ops, t);
							label_jump(passinit, prg.ops);
							label_declare(doneinit, prg.ops);
							var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lr.lv, -1,
								pr.vlc, true);
							if (pe.type == PER_ERROR)
								return pgr_error(pe.flp, pe.msg);
							label_jump(finish, prg.ops);
							label_declare(passinit, prg.ops);
						}

						var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lr.lv, -1, t, true);
						if (pe.type == PER_ERROR)
							return pgr_error(pe.flp, pe.msg);

						if (ex.right != null)
							label_declare(finish, prg.ops);
					}
					else if (i == stmt.lvalues.length - 1 && ex.type == EXPR_PREFIX &&
						ex.k == KS_PERIOD3){
						var lr = lval_addVars(sym, ex.ex);
						if (lr.type == LVP_ERROR)
							return pgr_error(lr.flp, lr.msg);
						//assert(lr.lv.type == LVR_VAR)
						ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return pgr_error(stmt.flp, ts.msg);
						var t2 = ts.vlc;
						op_num(prg.ops, t, i);
						op_nil(prg.ops, t2);
						op_slice(prg.ops, lr.lv.vlc, args, t, t2);
						symtbl_clearTemp(sym, t2);
					}
					else
						throw new Error('Unknown lvalue type in def (this shouldn\'t happen)');
				}
				symtbl_clearTemp(sym, t);
			}
			return pgr_push(skip);
		} break;

		case AST_DEF2: {
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt.flp, ts.msg);
			var nil = ts.vlc;
			op_nil(prg.ops, nil);
			op_return(prg.ops, nil);
			symtbl_clearTemp(sym, nil);

			symtbl_popFrame(sym);
			var skip = pst;
			label_declare(skip, prg.ops);
			return pgr_pop();
		} break;

		case AST_DOWHILE1: {
			var top    = label_new('^dowhile_top');
			var cond   = label_new('^dowhile_cond');
			var finish = label_new('^dowhile_finish');

			symtbl_pushScope(sym);
			sym.sc.lblBreak = finish;
			sym.sc.lblContinue = cond;

			label_declare(top, prg.ops);
			return pgr_push(pgs_dowhile_new(top, cond, finish));
		} break;

		case AST_DOWHILE2: {
			label_declare(pst.cond, prg.ops);

			if (stmt.cond !== null){
				// do while end
				var pe = program_eval(prg, sym, PEM_CREATE, null, stmt.cond);
				if (pe.type == PER_ERROR)
					return pgr_error(pe.flp, pe.msg);
				label_jumpFalse(pst.finish, prg.ops, pe.vlc);
				symtbl_clearTemp(sym, pe.vlc);
				sym.sc.lblContinue = pst.top;
				return pgr_ok();
			}
			else{
				// do end
				pst.top = null;
				return pgr_ok();
			}
		} break;

		case AST_DOWHILE3: {
			if (pst.top !== null)
				label_jump(pst.top, prg.ops);
			label_declare(pst.finish, prg.ops);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_FOR1: {
			var pe = program_eval(prg, sym, PEM_CREATE, null, stmt.ex);
			if (pe.type == PER_ERROR)
				return pgr_error(pe.flp, pe.msg);

			symtbl_pushScope(sym);

			var exp_vlc = pe.vlc;
			var val_vlc;
			var idx_vlc;

			// load VLC's for the value and index
			if (stmt.forVar){
				var sr = symtbl_addVar(sym, stmt.names1);
				if (sr.type == STA_ERROR)
					return pgr_error(stmt.flp, sr.msg);
				val_vlc = sr.vlc;

				if (stmt.names2 == null){
					var ts = symtbl_addTemp(sym);
					if (ts.type == STA_ERROR)
						return pgr_error(stmt.flp, ts.msg);
					idx_vlc = ts.vlc;
				}
				else{
					sr = symtbl_addVar(sym, stmt.names2);
					if (sr.type == STA_ERROR)
						return pgr_error(stmt.flp, sr.msg);
					idx_vlc = sr.vlc;
				}
			}
			else{
				var sl = symtbl_lookup(sym, stmt.names1);
				if (sl.type == STL_ERROR)
					return pgr_error(stmt.flp, sl.msg);
				if (sl.nsn.type != NSN_VAR)
					return pgr_error(stmt.flp, 'Cannot use non-variable in for loop');
				val_vlc = varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index);

				if (stmt.names2 == null){
					var ts = symtbl_addTemp(sym);
					if (ts.type == STA_ERROR)
						return pgr_error(stmt.flp, ts.msg);
					idx_vlc = ts.vlc;
				}
				else{
					sl = symtbl_lookup(sym, stmt.names2);
					if (sl.type == STL_ERROR)
						return pgr_error(stmt.flp, sl.msg);
					if (sl.nsn.type != NSN_VAR)
						return pgr_error(stmt.flp, 'Cannot use non-variable in for loop');
					idx_vlc = varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index);
				}
			}

			// clear the index
			op_num(prg.ops, idx_vlc, 0);

			var top    = label_new('^for_top');
			var inc    = label_new('^for_inc');
			var finish = label_new('^for_finish');

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt.flp, ts.msg);
			var t = ts.vlc;

			label_declare(top, prg.ops);

			op_unop(prg.ops, OP_SIZE, t, exp_vlc);
			op_binop(prg.ops, OP_LT, t, idx_vlc, t);
			label_jumpFalse(finish, prg.ops, t);

			op_getat(prg.ops, val_vlc, exp_vlc, idx_vlc);
			sym.sc.lblBreak = finish;
			sym.sc.lblContinue = inc;

			return pgr_push(pgs_for_new(t, exp_vlc, val_vlc, idx_vlc, top, inc, finish));
		} break;

		case AST_FOR2: {
			label_declare(pst.inc, prg.ops);
			op_inc(prg.ops, pst.idx_vlc);
			label_jump(pst.top, prg.ops);

			label_declare(pst.finish, prg.ops);
			symtbl_clearTemp(sym, pst.t);
			symtbl_clearTemp(sym, pst.val_vlc);
			symtbl_clearTemp(sym, pst.idx_vlc);
			symtbl_clearTemp(sym, pst.exp_vlc);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_LOOP1: {
			symtbl_pushScope(sym);
			var lcont = label_new('^loop_continue');
			var lbrk = label_new('^loop_break');
			sym.sc.lblContinue = lcont;
			sym.sc.lblBreak = lbrk;
			label_declare(lcont, prg.ops);
			return pgr_push(pgs_loop_new(lcont, lbrk));
		} break;

		case AST_LOOP2: {
			label_jump(pst.lcont, prg.ops);
			label_declare(pst.lbrk, prg.ops);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_GOTO: {
			for (var i = 0; i < sym.fr.lbls.length; i++){
				var lbl = sym.fr.lbls[i];
				if (lbl.name == stmt.ident){
					label_jump(lbl, prg.ops);
					return pgr_ok();
				}
			}
			// label doesn't exist yet, so we'll need to create it
			var lbl = label_new(stmt.ident);
			label_jump(lbl, prg.ops);
			sym.fr.lbls.push(lbl);
			return pgr_ok();
		} break;

		case AST_IF1: {
			return pgr_push(pgs_if_new(null, label_new('^ifdone')));
		} break;

		case AST_IF2: {
			if (pst.nextcond !== null){
				symtbl_popScope(sym);
				label_jump(pst.ifdone, prg.ops);

				label_declare(pst.nextcond, prg.ops);
			}
			pst.nextcond = label_new('^nextcond');
			var pr = program_eval(prg, sym, PEM_CREATE, null, stmt.cond);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.flp, pr.msg);
			label_jumpFalse(pst.nextcond, prg.ops, pr.vlc);
			symtbl_clearTemp(sym, pr.vlc);

			symtbl_pushScope(sym);
			return pgr_ok();
		} break;

		case AST_IF3: {
			symtbl_popScope(sym);
			label_jump(pst.ifdone, prg.ops);

			label_declare(pst.nextcond, prg.ops);
			symtbl_pushScope(sym);
			return pgr_ok();
		} break;

		case AST_IF4: {
			symtbl_popScope(sym);
			label_declare(pst.ifdone, prg.ops);
			return pgr_pop();
		} break;

		case AST_INCLUDE:
			throw new Error('Cannot generate code for include (this shouldn\'t happen)');

		case AST_NAMESPACE1: {
			var sr = symtbl_pushNamespace(sym, stmt.names);
			if (sr.type == SPN_ERROR)
				return pgr_error(stmt.flp, sr.msg);
			return pgr_push(null);
		} break;

		case AST_NAMESPACE2: {
			symtbl_popNamespace(sym);
			return pgr_pop();
		} break;

		case AST_RETURN: {
			var nsn = null;
			var params = null;
			var ex = stmt.ex;

			// check for tail call
			if (ex.type == EXPR_CALL){
				if (ex.cmd.type != EXPR_NAMES)
					return pgr_error(ex.flp, 'Invalid call');
				var sl = symtbl_lookup(sym, ex.cmd.names);
				if (sl.type == STL_ERROR)
					return pgr_error(ex.flp, sl.msg);
				nsn = sl.nsn;
				params = ex.params;
			}
			else if (stmt.ex.type == EXPR_NAMES){
				var sl = symtbl_lookup(sym, ex.names);
				if (sl.type == STL_ERROR)
					return pgr_error(ex.flp, sl.msg);
				nsn = sl.nsn;
			}

			// can only tail call local commands at the same lexical level
			if (nsn != null && nsn.type == NSN_CMD_LOCAL && frame_diff(nsn.fr, sym.fr) == 1){
				var pe = program_eval(prg, sym, PEM_CREATE, null, expr_list(ex.flp, params));
				if (pe.type == PER_ERROR)
					return pgr_error(pe.flp, pe.msg);
				label_returntail(nsn.lbl, prg.ops, pe.vlc);
				symtbl_clearTemp(sym, pe.vlc);
				return pgr_ok();
			}

			var pr = program_eval(prg, sym, PEM_CREATE, null, ex);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.flp, pr.msg);
			symtbl_clearTemp(sym, pr.vlc);
			op_return(prg.ops, pr.vlc);
			return pgr_ok();
		} break;

		case AST_USING: {
			var sl = symtbl_lookup(sym, stmt.names);
			if (sl.type == STL_ERROR)
				return pgr_error(stmt.flp, sl.msg);
			if (sl.nsn.type != NSN_NAMESPACE)
				return pgr_error(stmt.flp, 'Expecting namespace');
			if (sym.sc.ns.usings.indexOf(sl.nsn.ns) < 0)
				sym.sc.ns.usings.push(sl.nsn.ns);
			return pgr_ok();
		} break;

		case AST_VAR: {
			for (var i = 0; i < stmt.lvalues.length; i++){
				var ex = stmt.lvalues[i];
				if (ex.type != EXPR_INFIX)
					throw new Error('Var expression should be EXPR_INFIX (this shouldn\'t happen)');
				var pr = null;
				if (ex.right != null){
					pr = program_eval(prg, sym, PEM_CREATE, null, ex.right);
					if (pr.type == PER_ERROR)
						return pgr_error(pr.flp, pr.msg);
				}
				var lr = lval_addVars(sym, ex.left);
				if (lr.type == LVP_ERROR)
					return pgr_error(lr.flp, lr.msg);
				if (ex.right != null){
					var pe = program_evalLval(prg, sym, PEM_EMPTY, null, lr.lv, -1, pr.vlc, true);
					if (pe.type == PER_ERROR)
						return pgr_error(pe.flp, pe.msg);
					symtbl_clearTemp(sym, pr.vlc);
				}
			}
			return pgr_ok();
		} break;

		case AST_EVAL: {
			if (sayexpr){
				var pr = program_eval(prg, sym, PEM_CREATE, null, stmt.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.flp, pr.msg);
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return pgr_error(stmt.flp, ts.msg);
				var t = ts.vlc;
				op_list(prg.ops, t, 1);
				op_param2(prg.ops, OP_LIST_PUSH, t, t, pr.vlc);
				op_param1(prg.ops, OP_SAY, t, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, pr.vlc);
			}
			else{
				var pr = program_eval(prg, sym, PEM_EMPTY, null, stmt.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.flp, pr.msg);
			}
			return pgr_ok();
		} break;

		case AST_LABEL: {
			var lbl;
			var found = false;
			for (var i = 0; i < sym.fr.lbls.length; i++){
				lbl = sym.fr.lbls[i];
				if (lbl.name == stmt.ident){
					if (lbl.pos >= 0)
						return pgr_error(stmt.flp, 'Cannot redeclare label "' + stmt.ident + '"');
					found = true;
					break;
				}
			}
			if (!found){
				lbl = label_new(stmt.ident);
				sym.fr.lbls.push(lbl);
			}
			label_declare(lbl, prg.ops);
			return pgr_ok();
		} break;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//
// runtime
//
////////////////////////////////////////////////////////////////////////////////////////////////////

var SINK_RUN_PASS     = 'SINK_RUN_PASS';
var SINK_RUN_FAIL     = 'SINK_RUN_FAIL';
var SINK_RUN_ASYNC    = 'SINK_RUN_ASYNC';
var SINK_RUN_TIMEOUT  = 'SINK_RUN_TIMEOUT';
var SINK_RUN_REPLMORE = 'SINK_RUN_REPLMORE';
var SINK_RUN_INVALID  = 'SINK_RUN_INVALID';

//
// context
//

function ccs_new(pc, fdiff, index, lex_index){
	return { pc: pc, fdiff: fdiff, index: index, lex_index: lex_index };
}

function lxs_new(args, next){
	var v = [args];
	for (var i = 1; i < 256; i++)
		v.push(null);
	return { vals: v, next: next };
}

function native_new(hash, f_native){
	return { hash: hash, f_native: f_native };
}

function context_new(prg, say, warn, ask, natives, maxticks){
	var ctx = {
		natives: natives,
		prg: prg,
		failed: false,
		passed: false,
		invalid: false,
		say: say,
		warn: warn,
		ask: ask,
		call_stk: [],
		lex_stk: [lxs_new(null, null)],
		lex_index: 0,
		pc: 0,
		timeout: 0,
		timeout_left: 0,
		rand_seed: 0,
		rand_i: 0,
		maxticks: maxticks,
		ticks: 0
	};
	opi_rand_seedauto(ctx);
	return ctx;
}

function context_done(ctx){
	return ctx.passed || ctx.failed || ctx.invalid;
}

function context_timeout(ctx, timeout){
	ctx.timeout = timeout;
	ctx.timeout_left = timeout;
}

function crr_exitpass(ctx){
	ctx.passed = true;
	return SINK_RUN_PASS;
}

function crr_exitfail(ctx){
	if (ctx.prg.repl){
		ctx.failed = false;
		ctx.pc = ctx.prg.ops.length;
		return SINK_RUN_REPLMORE;
	}
	ctx.failed = true;
	return SINK_RUN_FAIL;
}

function crr_async(){
	return SINK_RUN_ASYNC;
}

function crr_timeout(){
	return SINK_RUN_TIMEOUT;
}

function crr_replmore(){
	return SINK_RUN_REPLMORE;
}

function crr_invalid(ctx){
	return SINK_RUN_INVALID;
}

function var_get(ctx, fdiff, index){
	return ctx.lex_stk[ctx.lex_index - fdiff].vals[index];
}

function var_set(ctx, fdiff, index, val){
	ctx.lex_stk[ctx.lex_index - fdiff].vals[index] = val;
}

function sink_isnum(val){
	return typeof val == 'number';
}

function sink_isstr(val){
	return typeof val == 'string';
}

function sink_islist(val){
	return Object.prototype.toString.call(val) == '[object Array]';
}

function sink_bool(b){
	return b ? 1 : null;
}

function sink_istrue(v){
	return v !== null;
}

function sink_isfalse(v){
	return v === null;
}

var sink_tostr_marker = 0;
function sink_tostr(v){
	var m = sink_tostr_marker++;
	function tos(v, first){
		if (v == null)
			return 'nil';
		else if (sink_isnum(v)){
			if (v == Infinity)
				return 'inf';
			else if (v == -Infinity)
				return '-inf';
			return '' + v;
		}
		else if (sink_isstr(v))
			return first ? v : '\'' + v.replace(/([\'\\])/g, '\\$1') + '\'';
		// otherwise, list
		if (v.tostr_marker == m)
			return '{circular}';
		v.tostr_marker = m;
		var out = [];
		for (var i = 0; i < v.length; i++)
			out.push(tos(v[i], false));
		return '{' + out.join(', ') + '}';
	}
	return tos(v, true);
}

function sink_list_join(ls, sep){
	var out = [];
	for (var i = 0; i < ls.length; i++)
		out.push(sink_tostr(ls[i]));
	return out.join(sep);
}

function arget(ar, index){
	if (sink_islist(ar))
		return index >= ar.length ? 0 : ar[index];
	return ar;
}

function arsize(ar){
	if (sink_islist(ar))
		return ar.length;
	return 1;
}

function oper_isnum(a){
	if (sink_islist(a)){
		for (var i = 0; i < a.length; i++){
			if (!sink_isnum(a[i]))
				return false;
		}
		return true;
	}
	return sink_isnum(a);
}

function oper_isnilnumstr(a){
	if (sink_islist(a)){
		for (var i = 0; i < a.length; i++){
			if (a[i] != null && !sink_isnum(a[i]) && !sink_isstr(a[i]))
				return false;
		}
		return true;
	}
	return a == null || sink_isnum(a) || sink_isstr(a);
}

function oper_un(a, func){
	if (sink_islist(a)){
		var ret = [];
		for (var i = 0; i < a.length; i++)
			ret.push(func(a[i]));
		return ret;
	}
	return func(a);
}

function oper_bin(a, b, func){
	if (sink_islist(a) || sink_islist(b)){
		var ret = [];
		var m = Math.max(arsize(a), arsize(b));
		for (var i = 0; i < m; i++)
			ret.push(func(arget(a, i), arget(b, i)));
		return ret;
	}
	return func(a, b);
}

function oper_tri(a, b, c, func){
	if (sink_islist(a) || sink_islist(b) || sink_islist(c)){
		var ret = [];
		var m = Math.max(arsize(a), arsize(b), arsize(c));
		for (var i = 0; i < m; i++)
			ret.push(func(arget(a, i), arget(b, i), arget(c, i)));
		return ret;
	}
	return func(a, b, c);
}

function str_cmp(a, b){
	var m = Math.min(a.length, b.length);
	for (var i = 0; i < m; i++){
		var c1 = a.charCodeAt(i);
		var c2 = b.charCodeAt(i);
		if (c1 < c2)
			return -1;
		else if (c2 < c1)
			return 1;
	}
	if (a.length < b.length)
		return -1;
	else if (b.length < a.length)
		return 1;
	return 0;
}

// shitty polyfills mostly for internet explorer
var polyfill = (function(){
	function Math_sign(x){
		x = +x; // convert to a number
		if (x === 0 || isNaN(x))
			return x;
		return x > 0 ? 1 : -1;
	}

	function Math_trunc(x){
		return ~~x;
	}

	function Math_log2(x){
		return Math.log(x) / Math.LN2;
	}

	function Math_log10(x){
		return Math.log(x) / Math.LN10;
	}

	function Math_imul(a, b){
		var ah = (a >>> 16) & 0xFFFF;
		var al = a & 0xFFFF;
		var bh = (b >>> 16) & 0xFFFF;
		var bl = b & 0xFFFF;
		return (al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0;
	}

	var clz32tbl = [
		32, 31,  0, 16,  0, 30,  3,  0, 15,  0,  0,  0, 29, 10,  2,  0,
		 0,  0, 12, 14, 21,  0, 19,  0,  0, 28,  0, 25,  0,  9,  1,  0,
		17,  0,  4,   ,  0,  0, 11,  0, 13, 22, 20,  0, 26,  0,  0, 18,
		 5,  0,  0, 23,  0, 27,  0,  6,  0, 24,  7,  0,  8,  0,  0,  0
	];
	function Math_clz32(a){
		var v = Number(x) >>> 0;
		v |= v >>> 1;
		v |= v >>> 2;
		v |= v >>> 4;
		v |= v >>> 8;
		v |= v >>> 16;
		v = clz32tbl[Math_imul(v, 0x06EB14F9) >>> 26];
		return v;
	}

	return {
		Math_sign : typeof Math.sign  == 'function' ? Math.sign  : Math_sign ,
		Math_trunc: typeof Math.trunc == 'function' ? Math.trunc : Math_trunc,
		Math_log2 : typeof Math.log2  == 'function' ? Math.log2  : Math_log2 ,
		Math_log10: typeof Math.log10 == 'function' ? Math.log10 : Math_log10,
		Math_imul : typeof Math.imul  == 'function' ? Math.imul  : Math_imul ,
		Math_clz32: typeof Math.clz32 == 'function' ? Math.clz32 : Math_clz32
	};
})();

var opi_num_max_marker = 0;
function opi_num_max(v){
	var m = opi_num_max_marker++;
	function mx(v){
		if (v.opi_num_max_marker == m)
			return null;
		v.opi_num_max_marker = m;
		var max = null;
		for (var i = 0; i < v.length; i++){
			if (sink_isnum(v[i])){
				if (max == null || v[i] > max)
					max = v[i];
			}
			else if (sink_islist(v[i])){
				var lm = mx(v[i]);
				if (lm != null && (max == null || lm > max))
					max = lm;
			}
		}
		return max;
	}
	return mx(v);
}

var opi_num_min_marker = 0;
function opi_num_min(v){
	var m = opi_num_min_marker++;
	function mn(v){
		if (v.opi_num_min_marker == m)
			return null;
		v.opi_num_min_marker = m;
		var min = null;
		for (var i = 0; i < v.length; i++){
			if (sink_isnum(v[i])){
				if (min == null || v[i] < min)
					min = v[i];
			}
			else if (sink_islist(v[i])){
				var lm = mn(v[i]);
				if (lm != null && (min == null || lm < min))
					min = lm;
			}
		}
		return min;
	}
	return mn(v);
}

function opi_num_base(num, len, base){
	if (len > 256)
		len = 256;
	var digits = '0123456789ABCDEF';
	var neg = '';
	if (num < 0){
		neg = '-'
		num = -num;
	}
	var body = '';
	var nint = Math.floor(num);
	var nfra = num - nint;
	while (nint > 0){
		body = digits.charAt(nint % base) + body;
		nint = Math.floor(nint / base);
	}
	while (body.length < len)
		body = '0' + body;
	if (body == '')
		body = '0';
	if (nfra != 0){
		body += '.';
		var i = 0;
		while (nfra > 0.00001 && i < 16){
			nfra *= base;
			nint = Math.floor(nfra);
			body += digits.charAt(nint);
			nfra -= nint;
			i++;
		}
	}
	return neg + (base == 16 ? '0x' : (base == 8 ? '0c' : '0b')) + body;
}

function opi_rand_seedauto(ctx){
	ctx.rand_seed = (new Date()).getTime() | 0;
	ctx.rand_i = (Math.random() * 0xFFFFFFFF) | 0;
	for (var i = 0; i < 1000; i++)
		opi_rand_int(ctx);
	ctx.rand_i = 0;
}

function opi_rand_seed(ctx, n){
	ctx.rand_seed = n | 0;
	ctx.rand_i = 0;
}

function opi_rand_int(ctx){
	var m = 0x5bd1e995;
	var k = polyfill.Math_imul(ctx.rand_i,  m);
	ctx.rand_i = (ctx.rand_i + 1) | 0;
	ctx.rand_seed = polyfill.Math_imul(k ^ (k >>> 24) ^ polyfill.Math_imul(ctx.rand_seed, m), m);
	var res = (ctx.rand_seed ^ (ctx.rand_seed >>> 13)) | 0;
	if (res < 0)
		return res + 0x100000000;
	return res;
}

function opi_rand_num(ctx){
	var M1 = opi_rand_int(ctx);
	var M2 = opi_rand_int(ctx);
	var view = new DataView(new ArrayBuffer(8));
	view.setInt32(0, (M1 << 20) | (M2 >> 12), true);
	view.setInt32(4, 0x3FF00000 | (M1 >>> 12), true);
	return view.getFloat64(0, true) - 1;
}

function opi_rand_getstate(ctx){
	// slight goofy logic to convert int32 to uint32
	if (ctx.rand_i < 0){
		if (ctx.rand_seed < 0)
			return [ctx.rand_seed + 0x100000000, ctx.rand_i + 0x100000000];
		return [ctx.rand_seed, ctx.rand_i + 0x100000000];
	}
	else if (ctx.rand_seed < 0)
		return [ctx.rand_seed + 0x100000000, ctx.rand_i];
	return [ctx.rand_seed, ctx.rand_i];
}

function opi_rand_setstate(ctx, a, b){
	ctx.rand_seed = a | 0;
	ctx.rand_i = b | 0;
}

function opi_rand_pick(ctx, ls){
	if (ls.length <= 0)
		return null;
	return ls[Math.floor(opi_rand_num(ctx) * ls.length)];
}

function opi_rand_shuffle(ctx, ls){
	var m = ls.length;
	while (m > 1){
		var i = Math.floor(opi_rand_num(ctx) * m);
		m--;
		if (m != i){
			var t = ls[m];
			ls[m] = ls[i];
			ls[i] = t;
		}
	}
}

// operators
function unop_num_neg(a){
	return -a;
}

function unop_tonum(a){
	if (sink_isnum(a))
		return a;
	throw 'TODO: parse number';
}

var unop_num_abs   = Math.abs;
var unop_num_sign  = polyfill.Math_sign;
var unop_num_floor = Math.floor;
var unop_num_ceil  = Math.ceil;
var unop_num_round = Math.round;
var unop_num_trunc = polyfill.Math_trunc;
var unop_num_sin   = Math.sin;
var unop_num_cos   = Math.cos;
var unop_num_tan   = Math.tan;
var unop_num_asin  = Math.asin;
var unop_num_acos  = Math.acos;
var unop_num_atan  = Math.atan;
var unop_num_log   = Math.log;
var unop_num_log2  = polyfill.Math_log2;
var unop_num_log10 = polyfill.Math_log10;
var unop_num_exp   = Math.exp;

function binop_num_add(a, b){
	return a + b;
}

function binop_num_sub(a, b){
	return a - b;
}

function binop_num_mul(a, b){
	return a * b;
}

function binop_num_div(a, b){
	return a / b;
}

function binop_num_mod(a, b){
	return a % b;
}

var binop_num_pow   = Math.pow;
var binop_num_atan2 = Math.atan2;

function binop_num_hex(a, b){
	return opi_num_base(a, b, 16);
}

function binop_num_oct(a, b){
	return opi_num_base(a, b, 8);
}

function binop_num_bin(a, b){
	return opi_num_base(a, b, 2);
}

function triop_num_clamp(a, b, c){
	return a < b ? b : (a > c ? c : a);
}

function triop_num_lerp(a, b, c){
	return a + (b - a) * c;
}

function opi_say(ctx, args, fdiff, index){
	var r = ctx.say(sink_list_join(args, ' '));
	if (isPromise(r))
		throw 'TODO: deal with async say';
	var_set(ctx, fdiff, index, null);
	return false;
}

function opi_warn(ctx, args, fdiff, index){
	var r = ctx.warn(sink_list_join(args, ' '));
	if (isPromise(r))
		throw 'TODO: deal with async warn';
	var_set(ctx, fdiff, index, null);
	return false;
}

function opi_ask(ctx, args, fdiff, index){
	var r = ctx.ask(sink_list_join(args, ' '));
	if (isPromise(r))
		throw 'TODO: deal with async ask';
	var_set(ctx, fdiff, index, r);
	return false;
}

function opi_exit(ctx, args){
	if (args.length > 0){
		var r = ctx.say(sink_list_join(args, ' '));
		if (isPromise(r))
			throw 'TODO: deal with async say';
	}
	return crr_exitpass(ctx);
}

function opi_abort(ctx, args, force){
	if (args.length > 0){
		var r = ctx.warn(sink_list_join(args, ' '));
		if (isPromise(r))
			throw 'TODO: deal with async warn';
	}
	if (force){
		ctx.failed = true;
		return SINK_RUN_FAIL;
	}
	return crr_exitfail(ctx);
}

function opi_abortstr(ctx, str){
	// TODO: maybe save previous PC's, and map them back to line numbers? then return the actual
	// error message with the flp?
	var r = ctx.warn(str);
	if (isPromise(r))
		throw 'TODO: deal with async warn2';
	return crr_exitfail(ctx);
}

function opi_range(start, stop, step){
	var count = Math.ceil((stop - start) / step);
	if (count > 10000000)
		return false;
	var ret = [];
	for (var i = 0; i < count; i++)
		ret.push(start + i * step);
	return ret;
}

function fix_slice(start, len, objsize){
	start = Math.round(start);
	if (len === null){
		if (start < 0)
			start += objsize;
		if (start < 0)
			start = 0;
		if (start >= objsize)
			return [0, 0];
		return [start, objsize - start];
	}
	else{
		len = Math.round(len);
		var wasneg = start < 0;
		if (len < 0){
			wasneg = start <= 0;
			start += len;
			len = -len;
		}
		if (wasneg)
			start += objsize;
		if (start < 0){
			len += start;
			start = 0;
		}
		if (len <= 0)
			return [0, 0];
		if (start + len > objsize)
			len = objsize - start;
		return [start, len];
	}
}

function context_run(ctx){
	if (ctx.passed)
		return crr_exitpass(ctx);
	if (ctx.failed)
		return crr_exitfail(ctx);
	if (ctx.invalid)
		return crr_invalid(ctx);

	var A, B, C, D, E, F, G, H, I; // ints
	var X, Y, Z, W; // values

	var ops = ctx.prg.ops;

	function LOAD_ab(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
	}

	function LOAD_abcd(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
	}

	function LOAD_abc(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++];
	}

	function LOAD_abcdef(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		E = ops[ctx.pc++]; F = ops[ctx.pc++];
	}

	function LOAD_abcdefgh(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		E = ops[ctx.pc++]; F = ops[ctx.pc++];
		G = ops[ctx.pc++]; H = ops[ctx.pc++];
	}

	function LOAD_abcdefghi(){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		E = ops[ctx.pc++]; F = ops[ctx.pc++];
		G = ops[ctx.pc++]; H = ops[ctx.pc++];
		I = ops[ctx.pc++];
	}

	function INLINE_UNOP(func, erop){
		LOAD_abcd();
		if (A > ctx.lex_index || C > ctx.lex_index)
			return crr_invalid(ctx);
		X = var_get(ctx, C, D);
		if (X == null)
			X = 0;
		if (!oper_isnum(X))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		var_set(ctx, A, B, oper_un(X, func));
		return false;
	}

	function INLINE_BINOP(func, erop){
		LOAD_abcdef();
		if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
			return crr_invalid(ctx);
		X = var_get(ctx, C, D);
		if (X == null)
			X = 0;
		if (!oper_isnum(X))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		Y = var_get(ctx, E, F);
		if (Y == null)
			Y = 0;
		if (!oper_isnum(Y))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		var_set(ctx, A, B, oper_bin(X, Y, func));
		return false;
	}

	function INLINE_TRIOP(func, erop){
		LOAD_abcdefgh();
		if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
			return crr_invalid(ctx);
		X = var_get(ctx, C, D);
		if (X == null)
			X = 0;
		if (!oper_isnum(X))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		Y = var_get(ctx, E, F);
		if (Y == null)
			Y = 0;
		if (!oper_isnum(Y))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		Z = var_get(ctx, G, H);
		if (Z == null)
			Z = 0;
		if (!oper_isnum(Z))
			return opi_abortstr(ctx, 'Expecting number or list of numbers when ' + erop);
		var_set(ctx, A, B, oper_tri(X, Y, Z, func));
		return false;
	}

	while (ctx.pc < ops.length){
		switch (ops[ctx.pc]){
			case OP_NOP            : { //
				ctx.pc++;
			} break;

			case OP_ABORTERR       : { // ERRNO
				ctx.pc++;
				A = ops[ctx.pc++];
				ctx.failed = true;
				var errmsg = 'Unknown error';
				if (A == ABORT_LISTFUNC)
					errmsg = 'Expecting list when calling function';
				return opi_abortstr(ctx, errmsg);
			} break;

			case OP_MOVE           : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, var_get(ctx, C, D));
			} break;

			case OP_INC            : { // [TGT/SRC]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, A, B);
				if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number when incrementing');
				var_set(ctx, A, B, X + 1);
			} break;

			case OP_NIL            : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, null);
			} break;

			case OP_NUMPOS         : { // [TGT], [VALUE]
				LOAD_abcd();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, C | (D << 8));
			} break;

			case OP_NUMNEG         : { // [TGT], [VALUE]
				LOAD_abcd();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, (C | (D << 8)) - 65536);
			} break;

			case OP_NUMTBL         : { // [TGT], [INDEX]
				LOAD_abcd();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				C = C | (D << 8);
				if (C >= ctx.prg.numTable.length)
					return crr_invalid(ctx);
				var_set(ctx, A, B, ctx.prg.numTable[C]);
			} break;

			case OP_STR            : { // [TGT], [INDEX]
				LOAD_abcd();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				C = C | (D << 8);
				if (C >= ctx.prg.strTable.length)
					return crr_invalid(ctx);
				var_set(ctx, A, B, ctx.prg.strTable[C]);
			} break;

			case OP_LIST           : { // [TGT], HINT
				LOAD_abc();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, []);
			} break;

			case OP_ISNUM          : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isnum(X)));
			} break;

			case OP_ISSTR          : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isstr(X)));
			} break;

			case OP_ISLIST         : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_islist(X)));
			} break;

			case OP_NOT            : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isfalse(X)));
			} break;

			case OP_SIZE           : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X) && !sink_isstr(X))
					return opi_abortstr(ctx, 'Expecting string or list for size');
				var_set(ctx, A, B, X.length);
			} break;

			case OP_TONUM          : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!oper_isnilnumstr(X))
					return opi_abortstr(ctx, 'Expecting string when converting to number');
				var_set(ctx, A, B, oper_un(X, unop_tonum));
			} break;

			case OP_CAT            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_islist(X) && sink_islist(Y))
					var_set(ctx, A, B, X.concat(Y));
				else
					var_set(ctx, A, B, sink_tostr(X) + sink_tostr(Y));
			} break;

			case OP_LT             : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X < Y));
				else if (sink_isstr(X) && sink_isstr(Y))
					var_set(ctx, A, B, sink_bool(str_cmp(X, Y) < 0));
				else
					return opi_abortstr(ctx, 'Expecting numbers or strings');
			} break;

			case OP_LTE            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X <= Y));
				else if (sink_isstr(X) && sink_isstr(Y))
					var_set(ctx, A, B, sink_bool(str_cmp(X, Y) <= 0));
				else
					return opi_abortstr(ctx, 'Expecting numbers or strings');
			} break;

			case OP_NEQ            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(X !== Y));
			} break;

			case OP_EQU            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(X === Y));
			} break;

			case OP_GETAT          : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (sink_islist(X)){
					Y = var_get(ctx, E, F);
					if (!sink_isnum(Y))
						return opi_abortstr(ctx, 'Expecting index to be number');
					if (Y < 0)
						Y += X.length;
					if (Y < 0 || Y >= X.length)
						var_set(ctx, A, B, null);
					else
						var_set(ctx, A, B, X[Y]);
				}
				else if (sink_isstr(X)){
					Y = var_get(ctx, E, F);
					if (!sink_isnum(Y))
						return opi_abortstr(ctx, 'Expecting index to be number');
					if (Y < 0)
						Y += X.length;
					if (Y < 0 || Y >= X.length)
						var_set(ctx, A, B, null);
					else
						var_set(ctx, A, B, X.charAt(Y));
				}
				else
					return opi_abortstr(ctx, 'Expecting list or string when indexing');
			} break;

			case OP_SLICE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index ||
					G > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X) && !sink_isstr(X))
					return opi_abortstr(ctx, 'Expecting list or string when slicing');
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnum(Y) || (Z !== null && !sink_isnum(Z)))
					return opi_abortstr(ctx, 'Expecting slice values to be numbers');
				if (sink_islist(X)){
					var sl = fix_slice(Y, Z, X.length);
					var_set(ctx, A, B, X.slice(sl[0], sl[0] + sl[1]));
				}
				else{
					var sl = fix_slice(Y, Z, X.length);
					var_set(ctx, A, B, X.substr(sl[0], sl[1]));
				}
			} break;

			case OP_SETAT          : { // [SRC1], [SRC2], [SRC3]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, A, B);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when setting index');
				Y = var_get(ctx, C, D);
				if (!sink_isnum(Y))
					return opi_abortstr(ctx, 'Expecting index to be number');
				if (Y < 0)
					Y += X.length;
				while (Y >= X.length)
					X.push(null);
				if (Y >= 0 && Y < X.length)
					X[Y] = var_get(ctx, E, F);
			} break;

			case OP_SPLICE         : { // [SRC1], [SRC2], [SRC3], [SRC4]
				LOAD_abcdefgh();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index ||
					G > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, A, B);
				if (!sink_islist(X) && !sink_isstr(X))
					return opi_abortstr(ctx, 'Expecting list or string when splicing');
				Y = var_get(ctx, C, D);
				Z = var_get(ctx, E, F);
				if (!sink_isnum(Y) || (Z !== null && !sink_isnum(Z)))
					return opi_abortstr(ctx, 'Expecting splice values to be numbers');
				W = var_get(ctx, G, H);
				if (sink_islist(X)){
					var sl = fix_slice(Y, Z, X.length);
					if (W == null)
						X.splice(sl[0], sl[1]);
					else if (sink_islist(W)){
						var args = W.concat();
						args.unshift(sl[1]);
						args.unshift(sl[0]);
						X.splice.apply(X, args);
					}
					else
						return opi_abortstr(ctx, 'Expecting spliced value to be a list');
				}
				else{
					var sl = fix_slice(Y, Z, X.length);
					if (W == null)
						var_set(ctx, A, B, X.substr(0, sl[0]) + X.substr(sl[0] + sl[1]));
					else if (sink_isstr(W))
						var_set(ctx, A, B, X.substr(0, sl[0]) + W + X.substr(sl[0] + sl[1]));
					else
						return opi_abortstr(ctx, 'Expecting spliced value to be a string');
				}
			} break;

			case OP_JUMP           : { // [[LOCATION]]
				LOAD_abcd();
				A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
				if (ctx.prg.repl && A == 0xFFFFFFFF){
					ctx.pc -= 5;
					return crr_replmore();
				}
				ctx.pc = A;
			} break;

			case OP_JUMPTRUE       : { // [SRC], [[LOCATION]]
				LOAD_abcdef();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (var_get(ctx, A, B) != null){
					if (ctx.prg.repl && C == 0xFFFFFFFF){
						ctx.pc -= 7;
						return crr_replmore();
					}
					ctx.pc = C;
				}
			} break;

			case OP_JUMPFALSE      : { // [SRC], [[LOCATION]]
				LOAD_abcdef();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (var_get(ctx, A, B) == null){
					if (ctx.prg.repl && C == 0xFFFFFFFF){
						ctx.pc -= 7;
						return crr_replmore();
					}
					ctx.pc = C;
				}
			} break;

			case OP_CALL           : { // [TGT], [SRC], LEVEL, [[LOCATION]]
				LOAD_abcdefghi();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				F = F + (G << 8) + (H << 16) + ((I << 23) * 2);
				if (ctx.prg.repl && F == 0xFFFFFFFF){
					ctx.pc -= 10;
					return crr_replmore();
				}
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling function');
				ctx.call_stk.push(ccs_new(ctx.pc, A, B, ctx.lex_index));
				ctx.lex_index = ctx.lex_index - E + 1;
				while (ctx.lex_index >= ctx.lex_stk.length)
					ctx.lex_stk.push(null);
				ctx.lex_stk[ctx.lex_index] = lxs_new(X, ctx.lex_stk[ctx.lex_index]);
				ctx.pc = F;
			} break;

			case OP_NATIVE         : { // [TGT], [SRC], [INDEX]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling function');
				E = E | (F << 8);
				if (E < 0 || E >= ctx.prg.keyTable.length)
					return opi_abortstr(ctx, 'Invalid native call');
				E = ctx.prg.keyTable[E];
				if (!ctx.natives.hasOwnProperty(E))
					return opi_abortstr(ctx, 'Invalid native call');
				try{
					X = ctx.natives[E].apply(void 0, X);
				}
				catch (e){
					return opi_abortstr(ctx, '' + e);
				}
				if (isPromise(X))
					throw new Error('TODO: handle async results from native call');
				if (typeof X === 'undefined')
					X = null;
				if (X === true || X === false)
					X = sink_bool(X);
				if (X !== null && !sink_isnum(X) && !sink_isstr(X) && !sink_islist(X))
					return opi_abortstr(ctx, 'Invalid return value from native call');
				var_set(ctx, A, B, X);
			} break;

			case OP_RETURN         : { // [SRC]
				if (ctx.call_stk.length <= 0)
					return crr_exitpass(ctx);
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, A, B);
				var s = ctx.call_stk.pop();
				ctx.lex_stk[ctx.lex_index] = ctx.lex_stk[ctx.lex_index].next;
				ctx.lex_index = s.lex_index;
				var_set(ctx, s.fdiff, s.index, X);
				ctx.pc = s.pc;
			} break;

			case OP_RETURNTAIL     : { // [SRC], [[LOCATION]]
				LOAD_abcdef();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (ctx.prg.repl && C == 0xFFFFFFFF){
					ctx.pc -= 7;
					return crr_replmore();
				}
				X = var_get(ctx, A, B);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling function');
				ctx.lex_stk[ctx.lex_index] = ctx.lex_stk[ctx.lex_index].next;
				ctx.lex_stk[ctx.lex_index] = lxs_new(X, ctx.lex_stk[ctx.lex_index]);
				ctx.pc = C;
			} break;

			case OP_RANGE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index ||
					G > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number for range');
				if (sink_isnum(Y)){
					if (Z === null)
						Z = 1;
					if (!sink_isnum(Z))
						return opi_abortstr(ctx, 'Expecting number for range step');
					X = opi_range(X, Y, Z);
				}
				else if (Y === null){
					if (Z !== null)
						return opi_abortstr(ctx, 'Expecting number for range stop');
					X = opi_range(0, X, 1);
				}
				else
					return opi_abortstr(ctx, 'Expecting number for range stop');
				if (X === false)
					return opi_abortstr(ctx, 'Range too large (over 10000000)');
				var_set(ctx, A, B, X);
			} break;

			case OP_SAY            : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling say');
				var r = opi_say(ctx, X, A, B);
				if (r !== false)
					return r;
			} break;

			case OP_WARN           : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling warn');
				var r = opi_warn(ctx, X, A, B);
				if (r !== false)
					return r;
			} break;

			case OP_ASK            : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling ask');
				var r = opi_ask(ctx, X, A, B);
				if (r !== false)
					return r;
			} break;

			case OP_EXIT           : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling exit');
				return opi_exit(ctx, X);
			} break;

			case OP_ABORT          : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when calling abort');
				return opi_abort(ctx, X, true);
			} break;

			case OP_NUM_NEG        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_neg, 'negating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ADD        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_add, 'adding');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_SUB        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_sub, 'subtracting');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_MUL        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_mul, 'multiplying');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_DIV        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_div, 'dividing');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_MOD        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_mod, 'taking modular');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_POW        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_pow, 'exponentiating');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_ABS        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_abs, 'taking absolute value');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_SIGN       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_sign, 'taking sign');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_MAX        : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling num.max']);
				}
				var_set(ctx, A, B, opi_num_max(X));
			} break;

			case OP_NUM_MIN        : { // [TGT], [SRC...]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling num.max']);
				}
				var_set(ctx, A, B, opi_num_min(X));
			} break;

			case OP_NUM_CLAMP      : { // [TGT], [SRC1], [SRC2], [SRC3]
				var it = INLINE_TRIOP(triop_num_clamp, 'clamping');
				if (it !== false)
					return it;
			} break;

			case OP_NUM_FLOOR      : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_floor, 'taking floor');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_CEIL       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_ceil, 'taking ceil');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ROUND      : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_round, 'rounding');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_TRUNC      : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_truc, 'truncating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_NAN        : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, NaN);
			} break;

			case OP_NUM_INF        : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, Infinity);
			} break;

			case OP_NUM_ISNAN      : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number');
				var_set(ctx, A, B, sink_bool(isNaN(X)));
			} break;

			case OP_NUM_ISFINITE   : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number');
				var_set(ctx, A, B, sink_bool(isFinite(X)));
			} break;

			case OP_NUM_E          : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, Math.E);
			} break;

			case OP_NUM_PI         : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, Math.PI);
			} break;

			case OP_NUM_TAU        : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, Math.PI * 2);
			} break;

			case OP_NUM_SIN        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_sin, 'taking sin');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_COS        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_cos, 'taking cos');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_TAN        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_tan, 'taking tan');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ASIN       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_asin, 'taking arc-sin');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ACOS       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_acos, 'taking arc-cos');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ATAN       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_atan, 'taking arc-tan');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ATAN2      : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_atan2, 'taking arc-tan');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_LOG        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_log, 'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LOG2       : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_log2, 'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LOG10      : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_log10, 'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_EXP        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(unop_num_exp, 'exponentiating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LERP       : { // [TGT], [SRC1], [SRC2], [SRC3]
				var it = INLINE_TRIOP(triop_num_lerp, 'lerping');
				if (it !== false)
					return it;
			} break;

			case OP_NUM_HEX        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_hex, 'converting to hex');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_OCT        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_oct, 'converting to oct');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_BIN        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(binop_num_bin, 'converting to bin');
				if (ib !== false)
					return ib;
			} break;

			// TODO: rewrite these to use unop_int_new, binop_int_add, etc
			case OP_INT_NEW        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(function(a){ return a | 0; }, 'casting to int');
				if (iu !== false)
					return iu;
			} break;

			case OP_INT_NOT        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(function(a){ return ~a; }, 'NOTing');
				if (iu !== false)
					return iu;
			} break;

			case OP_INT_AND        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a & b; }, 'ANDing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_OR         : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a | b; }, 'ORing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_XOR        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a ^ b; }, 'XORing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SHL        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a << b; }, 'shifting left');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SHR        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a >>> b; }, 'shifting right');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SAR        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return a >> b; }, 'shifting right');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_ADD        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return ((a|0) + (b|0)) | 0; }, 'adding');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SUB        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return ((a|0) - (b|0)) | 0; }, 'subtracting');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_MUL        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return polyfill.Math_imul(a, b); },
					'multiplying');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_DIV        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return ((a|0) / (b|0)) | 0; }, 'dividing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_MOD        : { // [TGT], [SRC1], [SRC2]
				var ib = INLINE_BINOP(function(a, b){ return ((a|0) % (b|0)) | 0; },
					'taking modular');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_CLZ        : { // [TGT], [SRC]
				var iu = INLINE_UNOP(function(a){ return polyfill.Math_clz32(a); },
					'counting leading zeros');
				if (iu !== false)
					return iu;
			} break;

			case OP_RAND_SEED      : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number');
				opi_rand_seed(ctx, X);
				var_set(ctx, A, B, null);
			} break;

			case OP_RAND_SEEDAUTO  : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				opi_rand_seedauto(ctx);
				var_set(ctx, A, B, null);
			} break;

			case OP_RAND_INT       : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, opi_rand_int(ctx));
			} break;

			case OP_RAND_NUM       : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, opi_rand_num(ctx));
			} break;

			case OP_RAND_GETSTATE  : { // [TGT]
				LOAD_ab();
				if (A > ctx.lex_index)
					return crr_invalid(ctx);
				var_set(ctx, A, B, opi_rand_getstate(ctx));
			} break;

			case OP_RAND_SETSTATE  : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X) || X.length < 2 || !sink_isnum(X[0]) || !sink_isnum(X[1]))
					return opi_abortstr(ctx, 'Expecting list of two integers');
				opi_rand_setstate(ctx, X[0], X[1]);
				var_set(ctx, A, B, null);
			} break;

			case OP_RAND_PICK      : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list');
				var_set(ctx, A, B, opi_rand_pick(ctx, X));
			} break;

			case OP_RAND_SHUFFLE   : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list');
				opi_rand_shuffle(ctx, X)
				var_set(ctx, A, B, X);
			} break;

			case OP_STR_NEW        : { // [TGT], [SRC...]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_SPLIT      : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_REPLACE    : { // [TGT], [SRC1], [SRC2], [SRC3]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_BEGINS     : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_ENDS       : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_PAD        : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_FIND       : { // [TGT], [SRC1], [SRC2], [SRC3]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_RFIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_LOWER      : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_UPPER      : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_TRIM       : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_REV        : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_REP        : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_LIST       : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_BYTE       : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_HASH       : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_UTF8_VALID     : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_UTF8_LIST      : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_UTF8_STR       : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STRUCT_SIZE    : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STRUCT_STR     : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STRUCT_LIST    : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_LIST_NEW       : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (X == null)
					X = 0;
				else if (!sink_isnum(X))
					return opi_abortstr(ctx, 'Expecting number for list.new');
				Y = var_get(ctx, E, F);
				var r = [];
				for (var i = 0; i < X; i++)
					r.push(Y);
				var_set(ctx, A, B, r);
			} break;

			case OP_LIST_SHIFT     : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when shifting');
				if (X.length <= 0)
					var_set(ctx, A, B, null);
				else
					var_set(ctx, A, B, X.shift());
			} break;

			case OP_LIST_POP       : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when popping');
				if (X.length <= 0)
					var_set(ctx, A, B, null);
				else
					var_set(ctx, A, B, X.pop());
			} break;

			case OP_LIST_PUSH      : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when pushing');
				Y = var_get(ctx, E, F);
				X.push(Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_LIST_UNSHIFT   : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list when unshifting');
				Y = var_get(ctx, E, F);
				X.unshift(Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_LIST_APPEND    : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					return opi_abortstr(ctx, 'Expecting list when appending');
				X.push.apply(X, Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_LIST_PREPEND   : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					return opi_abortstr(ctx, 'Expecting list when prepending');
				X.unshift.apply(X, Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_LIST_FIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index ||
					G > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list for list.find');
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (Z == null)
					Z = 0;
				else if (!sink_isnum(Z))
					return opi_abortstr(ctx, 'Expecting number for list.find');
				if (Z < 0 || isNaN(Z))
					Z = 0;
				var found = false;
				for (var i = Z; i < X.length; i++){
					if (X[i] == Y){
						var_set(ctx, A, B, i);
						found = true;
						break;
					}
				}
				if (!found)
					var_set(ctx, A, B, null);
			} break;

			case OP_LIST_RFIND     : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index ||
					G > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list for list.rfind');
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (Z == null)
					Z = X.length - 1;
				else if (!sink_isnum(Z))
					return opi_abortstr(ctx, 'Expecting number for list.rfind');
				if (Z < 0 || isNaN(Z))
					Z = X.length - 1;
				var found = false;
				for (var i = Z; i >= 0; i--){
					if (X[i] == Y){
						var_set(ctx, A, B, i);
						found = true;
						break;
					}
				}
				if (!found)
					var_set(ctx, A, B, null);
			} break;

			case OP_LIST_JOIN      : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				if (A > ctx.lex_index || C > ctx.lex_index || E > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list for list.join');
				Y = var_get(ctx, E, F);
				if (Y == null)
					Y = '';
				var out = [];
				for (var i = 0; i < X.length; i++)
					out.push(sink_tostr(X[i]));
				var_set(ctx, A, B, out.join(sink_tostr(Y)));
			} break;

			case OP_LIST_REV       : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list for list.rev');
				X.reverse();
				var_set(ctx, A, B, X);
			} break;

			case OP_LIST_STR       : { // [TGT], [SRC]
				LOAD_abcd();
				if (A > ctx.lex_index || C > ctx.lex_index)
					return crr_invalid(ctx);
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					return opi_abortstr(ctx, 'Expecting list for list.str');
				var out = '';
				for (var i = 0; i < X.length; i++){
					if (!sink_isnum(X[i]))
						return opi_abortstr(ctx, 'Expecting list of integers for list.str');
					var ch = Math.round(X[i]);
					if (ch < 0)
						ch = 0;
					if (ch > 255)
						ch = 255;
					out += String.fromCharCode(ch);
				}
				var_set(ctx, A, B, out);
			} break;

			case OP_LIST_SORT      : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_LIST_RSORT     : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_LIST_SORTCMP   : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_PICKLE_VALID   : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_PICKLE_STR     : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_PICKLE_VAL     : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_GC_GET         : { // [TGT]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_GC_SET         : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_GC_RUN         : { // [TGT]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			default:
				return crr_invalid(ctx);
		}
		ctx.ticks++;
		if ((ctx.ticks % 1000) == 0){
			if ((typeof ctx.maxticks === 'number' && ctx.ticks >= ctx.maxticks) ||
				(typeof ctx.maxticks === 'function' && ctx.maxticks(ctx.ticks)))
				return opi_abortstr(ctx, 'Maximum ticks');
		}
	}
	if (ctx.prg.repl)
		return crr_replmore();
	return crr_exitpass(ctx);
}

//
// compiler
//

function tkflp_new(tks, flp){
	return { tks: tks, flp: filepos_copy(flp) };
}

function flpn_new(file, next){
	return {
		flp: filepos_new(file, 1, 1),
		lx: lex_new(),
		tkflps: [],
		pgstate: [],
		next: next
	};
}

function compiler_new(prg, file, fstype, fsread, includes, paths){
	var sym = symtbl_new(prg.repl);
	symtbl_loadStdlib(sym);
	return {
		pr: parser_new(),
		prg: prg,
		sym: sym,
		flpn: flpn_new(file, null),
		fstype: fstype,
		fsread: fsread,
		includes: includes,
		paths: paths
	};
}

function compiler_reset(cmp){
	lex_reset(cmp.flpn.lx);
	cmp.pr = parser_new();
	cmp.flpn.tkflps = [];
	cmp.flpn.pgstate = [];
}

function compiler_begininc(cmp, names, file){
	cmp.flpn = flpn_new(file, cmp.flpn);
	if (names){
		// TODO: symtbl_pushNamespace can return an error!
		symtbl_pushNamespace(cmp.sym, names);
	}
}

function compiler_endinc(cmp, ns){
	if (ns)
		symtbl_popNamespace(cmp.sym);
	cmp.flpn = cmp.flpn.next;
}

var CMA_OK      = 'CMA_OK';
var CMA_ERROR   = 'CMA_ERROR';

function cma_ok(){
	return { type: CMA_OK };
}

function cma_error(msg){
	return { type: CMA_ERROR, msg: msg };
}

function compiler_staticinc(cmp, names, file, body){
	compiler_begininc(cmp, names, file);
	var res = compiler_write(cmp, body);
	if (res.type == CMA_ERROR){
		compiler_endinc(cmp, names !== null);
		return res;
	}
	res = compiler_closeLexer(cmp);
	compiler_endinc(cmp, names !== null);
	return res;
}

function pathjoin(a, b){
	var ret = [];
	function proc(ar){
		if (ar === null)
			return;
		ar.split(/\//g).forEach(function(part){
			if (part.length <= 0 || part === '.')
				return;
			if (part === '..'){
				if (ret.length > 0)
					ret.pop();
				return;
			}
			ret.push(part);
		});
	}
	proc(a);
	proc(b);
	return '/' + ret.join('/');
}

function compiler_tryinc(cmp, names, file, first){
	var fst = cmp.fstype(file);
	if (fst !== 'file'){
		if (first){
			if (fst === 'none'){
				// try adding a .sink extension
				if (file.substr(-5) !== '.sink')
					return compiler_tryinc(cmp, names, file + '.sink', false);
				else // already has .sink extension, so abort
					return false;
			}
			else if (fst === 'dir') // try looking for index.sink inside the directory
				return compiler_tryinc(cmp, names, pathjoin(file, 'index.sink'), false);
			else{
				throw new Error('Invalid return value from fstype ' +
					'(must be \'file\', \'dir\', or \'none\'): "' + fst + '"');
			}
		}
		else
			return false;
	}

	compiler_begininc(cmp, names, file);

	var data = cmp.fsread(file);
	if (isPromise(data))
		throw new Error('TODO: figure out how to deal with a Promise returned from fsread');
	var res = compiler_write(cmp, UTF8.encode(data));
	if (res.type == CMA_ERROR){
		compiler_endinc(cmp, names !== null);
		return res;
	}

	res = compiler_closeLexer(cmp);
	compiler_endinc(cmp, names !== null);
	return res;
}

function compiler_dynamicinc(cmp, names, file, from){
	if (file.charAt(0) === '/'){
		// if an absolute path, there is no searching, so just try to include it directly
		return compiler_tryinc(cmp, names, file, true);
	}
	// otherwise, we have a relative path, so we need to go through our search list
	for (var i = 0; i < cmp.paths.length; i++){
		var path = cmp.paths[i];
		var join;
		if (path.charAt(0) === '/') // search path is absolute
			join = pathjoin(path, file);
		else{ // search path is relative
			if (from === null)
				continue;
			join = pathjoin(pathjoin(pathjoin(from, '..'), path), file);
		}
		var found = compiler_tryinc(cmp, names, join, true);
		if (found !== false)
			return found;
	}
	return false;
}

function compiler_process(cmp){
	var stmts = [];
	var tkflps = cmp.flpn.tkflps;
	while (tkflps.length > 0){
		var found_include = false;
		while (tkflps.length > 0){
			var tf = tkflps[0];
			var tks = tf.tks;
			var flp = tf.flp;
			while (tks.length > 0){
				var tk = tks.shift();
				if (tk.type == TOK_ERROR)
					return cma_error(filepos_err(flp, tk.msg));
				var pp = parser_add(cmp.pr, tk, flp, stmts);
				if (pp.type == PRR_ERROR)
					return cma_error(filepos_err(flp, pp.msg));
				if (stmts.length > 0 && stmts[stmts.length - 1].type == AST_INCLUDE){
					found_include = true;
					break;
				}
			}
			if (found_include)
				break;
			tkflps.shift();
		}

		// process statements
		while (stmts.length > 0){
			var stmt = stmts.shift();
			if (stmt.type == AST_INCLUDE){
				for (var i = 0; i < stmt.incls.length; i++){
					var inc = stmt.incls[i];
					if (cmp.includes.hasOwnProperty(inc.file)){
						var res = compiler_staticinc(cmp, inc.names, inc.file,
							cmp.includes[inc.file]);
						if (res.type == CMA_ERROR)
							return res;
					}
					else{
						var res = compiler_dynamicinc(cmp, inc.names, inc.file, stmt.flp.file);
						if (res === false)
							return cma_error('Failed to include: ' + inc.file);
						if (res.type == CMA_ERROR)
							return res;
					}
				}
			}
			else{
				var pr = program_gen(cmp.prg, cmp.sym, stmt,
					cmp.flpn.pgstate.length <= 0 ? null :
					cmp.flpn.pgstate[cmp.flpn.pgstate.length - 1],
					cmp.prg.repl && cmp.flpn.next == null && cmp.flpn.pgstate.length == 0);
				switch (pr.type){
					case PGR_OK:
						break;
					case PGR_PUSH:
						cmp.flpn.pgstate.push(pr.state);
						break;
					case PGR_POP:
						cmp.flpn.pgstate.pop();
						break;
					case PGR_ERROR:
						return cma_error(filepos_err(stmt.flp, pr.msg));
				}
			}
		}
	}
	return cma_ok();
}

var CMF_OK    = 'CMF_OK';
var CMF_ERROR = 'CMF_ERROR';

function cmf_ok(){
	return { type: CMF_OK };
}

function cmf_error(msg){
	return { type: CMF_ERROR, msg: msg };
}

function compiler_write(cmp, bytes){
	var flpn = cmp.flpn;
	for (var i = 0; i < bytes.length; i++){
		var ch = String.fromCharCode(bytes[i]);
		var tks = [];
		lex_add(flpn.lx, ch, tks);
		if (tks.length > 0)
			flpn.tkflps.push(tkflp_new(tks, flpn.flp));

		if (ch == '\n'){
			if (!flpn.wascr){
				flpn.flp.line++;
				flpn.flp.chr = 1;
			}
			flpn.wascr = false;
		}
		else if (ch == '\r'){
			flpn.flp.line++;
			flpn.flp.chr = 1;
			flpn.wascr = true;
		}
		else
			flpn.wascr = false;
	}
	return compiler_process(cmp);
}

function compiler_closeLexer(cmp){
	var tks = [];
	lex_close(cmp.flpn.lx, tks);
	if (tks.length > 0)
		cmp.flpn.tkflps.push(tkflp_new(tks, cmp.flpn.flp));
	return compiler_process(cmp);
}

function compiler_close(cmp){
	var res = compiler_closeLexer(cmp);
	if (res.type == CMA_ERROR)
		return res;

	var pr = parser_close(cmp.pr);
	if (pr.type == PRR_ERROR)
		return cma_error(filepos_err(cmp.flpn.flp, pr.msg));
	return cma_ok();
}

function compiler_level(cmp){
	return cmp.pr.level;
}

//
// JavaScript API
//

var UTF8;
if (typeof window === 'undefined')
	UTF8 = require('./utf8');
else
	UTF8 = window.UTF8;

function libs_getIncludes(libs){
	var out = {};
	libs.forEach(function(lib){
		for (var k in lib.includes){
			if (!lib.includes.hasOwnProperty(k))
				continue;
			if (out.hasOwnProperty(k))
				throw new Error('Cannot have multiple static includes for name: "' + k + '"');
			out[k] = UTF8.encode(lib.includes[k]);
		}
	});
	return out;
}

function libs_getNatives(libs){
	var out = {};
	libs.forEach(function(lib){
		for (var k in lib.natives){
			if (!lib.natives.hasOwnProperty(k))
				continue;
			if (out.hasOwnProperty(k))
				throw new Error('Cannot have multiple native functions for key: "' + k + '"');
			out[k] = lib.natives[k];
		}
	});
	return out;
}

var Sink = {
	repl: function(prompt, fstype, fsread, say, warn, ask, libs, paths, maxticks){
		var prg = program_new(true);
		var cmp = compiler_new(prg, null, fstype, fsread, libs_getIncludes(libs), paths);
		var ctx = context_new(prg, say, warn, ask, libs_getNatives(libs), maxticks);

		function process(data){
			var cm = compiler_write(cmp, UTF8.encode(data));
			if (cm.type == CMA_OK){
				if (compiler_level(cmp) <= 0){
					var cr = context_run(ctx);
					if (cr == SINK_RUN_REPLMORE)
						/* do nothing */;
					else if (cr == SINK_RUN_PASS || cr == SINK_RUN_FAIL)
						return cr == SINK_RUN_PASS; // true/false means script finished
					else{
						// SINK_RUN_ASYNC, SINK_RUN_TIMEOUT, SINK_RUN_INVALID
						console.log('cr', cr);
						throw 'TODO: deal with a different cr';
					}
				}
			}
			else if (cm.type == CMA_ERROR){
				warn('Error: ' + cm.msg);
				compiler_reset(cmp);
			}
			return null; // null means read more
		}

		function read(){
			var p = prompt(compiler_level(cmp));
			if (isPromise(p)){
				return p.then(function(data){
					var pp = process(data);
					if (pp === null)
						return read();
					return pp;
				});
			}
			process(p);
			return read();
		}
		return read();
	},
	run: function(startFile, fstype, fsread, say, warn, ask, libs, paths, error, maxticks){
		var prg = program_new(false);
		var cmp = compiler_new(prg, startFile, fstype, fsread, libs_getIncludes(libs), paths);

		var data = fsread(startFile);
		if (isPromise(data))
			throw new Error('TODO: fsread returns promise');
		var cm = compiler_write(cmp, UTF8.encode(data));
		if (cm.type == CMA_ERROR){
			error(cm.msg);
			return false;
		}
		cm = compiler_close(cmp);
		if (cm.type == CMA_ERROR){
			error(cm.msg);
			return false;
		}

		// run the finished program
		var ctx = context_new(prg, say, warn, ask, libs_getNatives(libs), maxticks);
		while (true){
			var cr = context_run(ctx);
			if (cr == SINK_RUN_PASS || cr == SINK_RUN_FAIL)
				return cr == SINK_RUN_PASS;
			else{
				console.log('cr', cr);
				throw 'TODO: deal with a different cr';
			}
		}
	}
};

if (typeof window === 'object')
	window.Sink = Sink;
else
	module.exports = Sink;

})();
