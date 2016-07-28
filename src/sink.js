// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

//
// opcodes
//

function varloc_new(fdiff, index){
	return { fdiff: fdiff, index: index };
}

var OP_NOP            = 0x00; //
var OP_MOVE           = 0x01; // [TGT], [SRC]
var OP_INC            = 0x02; // [TGT/SRC]
var OP_NIL            = 0x03; // [TGT]
var OP_NUMPOS         = 0x04; // [TGT], [VALUE]
var OP_NUMNEG         = 0x05; // [TGT], [VALUE]
var OP_NUMTBL         = 0x06; // [TGT], [INDEX]
var OP_STR            = 0x07; // [TGT], [INDEX]
var OP_LIST           = 0x08; // [TGT], HINT
var OP_NEG            = 0x09; // [TGT], [SRC]
var OP_NOT            = 0x0A; // [TGT], [SRC]
var OP_SIZE           = 0x0B; // [TGT], [SRC]
var OP_TONUM          = 0x0C; // [TGT], [SRC]
var OP_SHIFT          = 0x0D; // [TGT], [SRC]
var OP_POP            = 0x0E; // [TGT], [SRC]
var OP_ISNUM          = 0x0F; // [TGT], [SRC]
var OP_ISSTR          = 0x10; // [TGT], [SRC]
var OP_ISLIST         = 0x11; // [TGT], [SRC]
var OP_ADD            = 0x12; // [TGT], [SRC1], [SRC2]
var OP_SUB            = 0x13; // [TGT], [SRC1], [SRC2]
var OP_MUL            = 0x14; // [TGT], [SRC1], [SRC2]
var OP_DIV            = 0x15; // [TGT], [SRC1], [SRC2]
var OP_MOD            = 0x16; // [TGT], [SRC1], [SRC2]
var OP_POW            = 0x17; // [TGT], [SRC1], [SRC2]
var OP_CAT            = 0x18; // [TGT], [SRC1], [SRC2]
var OP_PUSH           = 0x19; // [TGT], [SRC1], [SRC2]
var OP_UNSHIFT        = 0x1A; // [TGT], [SRC1], [SRC2]
var OP_APPEND         = 0x1B; // [TGT], [SRC1], [SRC2]
var OP_PREPEND        = 0x1C; // [TGT], [SRC1], [SRC2]
var OP_LT             = 0x1D; // [TGT], [SRC1], [SRC2]
var OP_LTE            = 0x1E; // [TGT], [SRC1], [SRC2]
var OP_NEQ            = 0x1F; // [TGT], [SRC1], [SRC2]
var OP_EQU            = 0x20; // [TGT], [SRC1], [SRC2]
var OP_GETAT          = 0x21; // [TGT], [SRC1], [SRC2]
var OP_SLICE          = 0x22; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_SETAT          = 0x23; // [SRC1], [SRC2], [SRC3]
var OP_SPLICE         = 0x24; // [SRC1], [SRC2], [SRC3], [SRC4]
var OP_JUMP           = 0x25; // [[LOCATION]]
var OP_JUMPTRUE       = 0x26; // [SRC], [[LOCATION]]
var OP_JUMPFALSE      = 0x27; // [SRC], [[LOCATION]]
var OP_CALL           = 0x28; // [TGT], [SRC], [[LOCATION]]
var OP_NATIVE         = 0x29; // [TGT], [SRC], [INDEX]
var OP_RETURN         = 0x2A; // [SRC]
var OP_SAY            = 0x2B; // [TGT], [SRC...]
var OP_ASK            = 0x2C; // [TGT], [SRC...]
var OP_WARN           = 0x2D; // [TGT], [SRC...]
var OP_DIE            = 0x2E; // [TGT], [SRC...]
var OP_NUM_ABS        = 0x2F; // [TGT], [SRC]
var OP_NUM_SIGN       = 0x30; // [TGT], [SRC]
var OP_NUM_MAX        = 0x31; // [TGT], [SRC...]
var OP_NUM_MIN        = 0x32; // [TGT], [SRC...]
var OP_NUM_CLAMP      = 0x33; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_NUM_FLOOR      = 0x34; // [TGT], [SRC]
var OP_NUM_CEIL       = 0x35; // [TGT], [SRC]
var OP_NUM_ROUND      = 0x36; // [TGT], [SRC]
var OP_NUM_TRUNC      = 0x37; // [TGT], [SRC]
var OP_NUM_NAN        = 0x38; // [TGT]
var OP_NUM_ISNAN      = 0x39; // [TGT], [SRC]
var OP_NUM_ISFINITE   = 0x3A; // [TGT], [SRC]
var OP_NUM_E          = 0x3B; // [TGT]
var OP_NUM_PI         = 0x3C; // [TGT]
var OP_NUM_TAU        = 0x3D; // [TGT]
var OP_NUM_SIN        = 0x3E; // [TGT], [SRC]
var OP_NUM_COS        = 0x3F; // [TGT], [SRC]
var OP_NUM_TAN        = 0x40; // [TGT], [SRC]
var OP_NUM_ASIN       = 0x41; // [TGT], [SRC]
var OP_NUM_ACOS       = 0x42; // [TGT], [SRC]
var OP_NUM_ATAN       = 0x43; // [TGT], [SRC]
var OP_NUM_ATAN2      = 0x44; // [TGT], [SRC1], [SRC2]
var OP_NUM_LOG        = 0x45; // [TGT], [SRC]
var OP_NUM_LOG2       = 0x46; // [TGT], [SRC]
var OP_NUM_LOG10      = 0x47; // [TGT], [SRC]
var OP_NUM_EXP        = 0x48; // [TGT], [SRC]
var OP_NUM_LERP       = 0x49; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_NUM_HEX        = 0x4A; // [TGT], [SRC1], [SRC2]
var OP_NUM_OCT        = 0x4B; // [TGT], [SRC1], [SRC2]
var OP_NUM_BIN        = 0x4C; // [TGT], [SRC1], [SRC2]
var OP_INT_CAST       = 0x4D; // [TGT], [SRC]
var OP_INT_NOT        = 0x4E; // [TGT], [SRC]
var OP_INT_AND        = 0x4F; // [TGT], [SRC1], [SRC2]
var OP_INT_OR         = 0x50; // [TGT], [SRC1], [SRC2]
var OP_INT_XOR        = 0x51; // [TGT], [SRC1], [SRC2]
var OP_INT_SHL        = 0x52; // [TGT], [SRC1], [SRC2]
var OP_INT_SHR        = 0x53; // [TGT], [SRC1], [SRC2]
var OP_INT_SAR        = 0x54; // [TGT], [SRC1], [SRC2]
var OP_INT_ADD        = 0x55; // [TGT], [SRC1], [SRC2]
var OP_INT_SUB        = 0x56; // [TGT], [SRC1], [SRC2]
var OP_INT_MUL        = 0x57; // [TGT], [SRC1], [SRC2]
var OP_INT_DIV        = 0x58; // [TGT], [SRC1], [SRC2]
var OP_INT_MOD        = 0x59; // [TGT], [SRC1], [SRC2]
var OP_INT_CLZ        = 0x5A; // [TGT], [SRC]
var OP_RAND_SEED      = 0x5B; // [TGT], [SRC]
var OP_RAND_SEEDAUTO  = 0x5C; // [TGT]
var OP_RAND_INT       = 0x5D; // [TGT]
var OP_RAND_NUM       = 0x5E; // [TGT]
var OP_RAND_GETSTATE  = 0x5F; // [TGT]
var OP_RAND_SETSTATE  = 0x60; // [TGT], [SRC]
var OP_RAND_PICK      = 0x61; // [TGT], [SRC]
var OP_RAND_SHUFFLE   = 0x62; // [TGT], [SRC]
var OP_STR_NEW        = 0x63; // [TGT], [SRC1], [SRC2]
var OP_STR_SPLIT      = 0x64; // [TGT], [SRC1], [SRC2]
var OP_STR_REPLACE    = 0x65; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_STARTSWITH = 0x66; // [TGT], [SRC1], [SRC2]
var OP_STR_ENDSWITH   = 0x67; // [TGT], [SRC1], [SRC2]
var OP_STR_PAD        = 0x68; // [TGT], [SRC1], [SRC2]
var OP_STR_FIND       = 0x69; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_FINDREV    = 0x6A; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_STR_LOWER      = 0x6B; // [TGT], [SRC]
var OP_STR_UPPER      = 0x6C; // [TGT], [SRC]
var OP_STR_TRIM       = 0x6D; // [TGT], [SRC]
var OP_STR_REV        = 0x6E; // [TGT], [SRC]
var OP_STR_LIST       = 0x6F; // [TGT], [SRC]
var OP_STR_BYTE       = 0x70; // [TGT], [SRC1], [SRC2]
var OP_UTF8_VALID     = 0x71; // [TGT], [SRC]
var OP_UTF8_LIST      = 0x72; // [TGT], [SRC]
var OP_UTF8_STR       = 0x73; // [TGT], [SRC]
var OP_STRUCT_SIZE    = 0x74; // [TGT], [SRC]
var OP_STRUCT_STR     = 0x75; // [TGT], [SRC1], [SRC2]
var OP_STRUCT_LIST    = 0x76; // [TGT], [SRC1], [SRC2]
var OP_LIST_NEW       = 0x77; // [TGT], [SRC1], [SRC2]
var OP_LIST_EMPTY     = 0x78; // [TGT], [SRC]
var OP_LIST_FIND      = 0x79; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_FINDREV   = 0x7A; // [TGT], [SRC1], [SRC2], [SRC3]
var OP_LIST_JOIN      = 0x7B; // [TGT], [SRC1], [SRC2]
var OP_LIST_REV       = 0x7C; // [TGT], [SRC]
var OP_LIST_STR       = 0x7D; // [TGT], [SRC]
var OP_LIST_SORT      = 0x7E; // [TGT], [SRC]
var OP_LIST_SORTREV   = 0x7F; // [TGT], [SRC]
var OP_LIST_SORTCMP   = 0x80; // [TGT], [SRC1], [SRC2]
var OP_JSON_VALID     = 0x81; // [TGT], [SRC]
var OP_JSON_STR       = 0x82; // [TGT], [SRC]
var OP_JSON_VAL       = 0x83; // [TGT], [SRC]

function op_nop(b){
	console.log('> NOP');
	b.push(OP_NOP);
}

function op_move(b, tgt, src){
	if (tgt.fdiff == src.fdiff && tgt.index == src.index)
		return;
	console.log('> MOVE ' + tgt.fdiff + ':' + tgt.index + ', ' + src.fdiff + ':' + src.index);
	b.push(OP_MOVE, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_inc(b, src){
	console.log('> INC ' + src.fdiff + ':' + src.index);
	b.push(OP_INC, src.fdiff, src.index);
}

function op_nil(b, tgt){
	console.log('> NIL ' + tgt.fdiff + ':' + tgt.index);
	b.push(OP_NIL, tgt.fdiff, tgt.index);
}

function op_num(b, tgt, num){
	console.log('> NUM ' + tgt.fdiff + ':' + tgt.index + ', ' + num);
	if (num >= 0)
		b.push(OP_NUMPOS, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	else{
		num += 65536;
		b.push(OP_NUMNEG, tgt.fdiff, tgt.index, num % 256, Math.floor(num / 256));
	}
}

function op_num_tbl(b, tgt, index){
	console.log('> NUMTBL ' + tgt.fdiff + ':' + tgt.index + ', numTable[' + index + ']');
	b.push(OP_NUMTBL, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_str(b, tgt, index){
	console.log('> STR ' + tgt.fdiff + ':' + tgt.index + ', strTable[' + index + ']');
	b.push(OP_STR, tgt.fdiff, tgt.index, index % 256, Math.floor(index / 256));
}

function op_list(b, tgt, hint){
	if (hint > 255)
		hint = 255;
	console.log('> LIST ' + tgt.fdiff + ':' + tgt.index + ', ' + hint);
	b.push(OP_LIST, tgt.fdiff, tgt.index, hint);
}

function op_unop(b, opcode, tgt, src){
	var opstr = '???';
	if      (opcode == OP_NEG   ) opstr = 'NEG';
	else if (opcode == OP_NOT   ) opstr = 'NOT';
	else if (opcode == OP_SIZE  ) opstr = 'SIZE';
	else if (opcode == OP_TONUM ) opstr = 'TONUM';
	else if (opcode == OP_SHIFT ) opstr = 'SHIFT';
	else if (opcode == OP_POP   ) opstr = 'POP';
	else if (opcode == OP_ISNUM ) opstr = 'ISNUM';
	else if (opcode == OP_ISSTR ) opstr = 'ISSTR';
	else if (opcode == OP_ISLIST) opstr = 'ISLIST';
	console.log('> ' + opstr + ' ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src.fdiff + ':' + src.index);
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
	if      (opcode == OP_ADD    ) opstr = 'ADD';
	else if (opcode == OP_SUB    ) opstr = 'SUB';
	else if (opcode == OP_MUL    ) opstr = 'MUL';
	else if (opcode == OP_DIV    ) opstr = 'DIV';
	else if (opcode == OP_MOD    ) opstr = 'MOD';
	else if (opcode == OP_POW    ) opstr = 'POW';
	else if (opcode == OP_CAT    ) opstr = 'CAT';
	else if (opcode == OP_PUSH   ) opstr = 'PUSH';
	else if (opcode == OP_UNSHIFT) opstr = 'UNSHIFT';
	else if (opcode == OP_APPEND ) opstr = 'APPEND';
	else if (opcode == OP_PREPEND) opstr = 'PREPEND';
	else if (opcode == OP_LT     ) opstr = 'LT';
	else if (opcode == OP_LTE    ) opstr = 'LTE';
	else if (opcode == OP_NEQ    ) opstr = 'NEQ';
	else if (opcode == OP_EQU    ) opstr = 'EQU';
	console.log('> ' + opstr + ' ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_getat(b, tgt, src1, src2){
	console.log('> GETAT ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index);
	b.push(OP_GETAT, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_slice(b, tgt, src1, src2, src3){
	console.log('> SLICE ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index + ', ' +
		src3.fdiff + ':' + src3.index);
	b.push(OP_SLICE, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

function op_setat(b, src1, src2, src3){
	console.log('> SETAT ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index + ', ' +
		src3.fdiff + ':' + src3.index);
	b.push(OP_GETAT, src1.fdiff, src1.index, src2.fdiff, src2.index, src3.fdiff, src3.index);
}

function op_splice(b, src1, src2, src3, src4){
	console.log('> SPLICE ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index + ', ' +
		src3.fdiff + ':' + src3.index + ', ' +
		src4.fdiff + ':' + src4.index);
	b.push(OP_SPLICE,
		src1.fdiff, src1.index,
		src2.fdiff, src2.index,
		src3.fdiff, src3.index,
		src4.fdiff, src4.index);
}

function op_jump(b, index){
	console.log('> JUMP 0x' + index.toString(16));
	b.push(OP_JUMP,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_jumpTrue(b, src, index){
	console.log('> JUMPTRUE ' + src.fdiff + ':' + src.index + ', 0x' + index.toString(16));
	b.push(OP_JUMPTRUE, src.fdiff, src.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_jumpFalse(b, src, index){
	console.log('> JUMPFALSE ' + src.fdiff + ':' + src.index + ', 0x' + index.toString(16));
	b.push(OP_JUMPFALSE, src.fdiff, src.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_call(b, ret, arg, index){
	console.log('> CALL ' +
		ret.fdiff + ':' + ret.index + ', ' +
		arg.fdiff + ':' + arg.index + ', ' +
		'0x' + index.toString(16));
	b.push(OP_CALL, ret.fdiff, ret.index, arg.fdiff, arg.index,
		index % 256,
		Math.floor(index /      256) % 256,
		Math.floor(index /    65536) % 256,
		Math.floor(index / 16777216) % 256);
}

function op_native(b, ret, arg, index){
	console.log('> NATIVE ' +
		ret.fdiff + ':' + ret.index + ', ' +
		arg.fdiff + ':' + arg.index + ', ' +
		'keyTable[' + index + ']');
	b.push(OP_NATIVE, ret.fdiff, ret.index, arg.fdiff, arg.index,
		index % 256, Math.floor(index / 256) % 256);
}

function op_return(b, src){
	console.log('> RETURN ' + src.fdiff + ':' + src.index);
	b.push(OP_RETURN, src.fdiff, src.index);
}

function op_param0(b, opcode, tgt){
	console.log('> 0x' + opcode.toString(16) + ' ' +
		tgt.fdiff + ':' + tgt.index);
	b.push(opcode, tgt.fdiff, tgt.index);
}

function op_param1(b, opcode, tgt, src){
	console.log('> 0x' + opcode.toString(16) + ' ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src.fdiff + ':' + src.index);
	b.push(opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

function op_param2(b, opcode, tgt, src1, src2){
	console.log('> 0x' + opcode.toString(16) + ' ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index);
}

function op_param3(b, opcode, tgt, src1, src2, src3){
	console.log('> 0x' + opcode.toString(16) + ' ' +
		tgt.fdiff + ':' + tgt.index + ', ' +
		src1.fdiff + ':' + src1.index + ', ' +
		src2.fdiff + ':' + src2.index + ', ' +
		src3.fdiff + ':' + src3.index);
	b.push(opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

//
// file position
//

function filepos_new(file, line, chr){
	return { file: file, line: line, chr: chr };
}

function filepos_newCopy(flp){
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

function ks_toUnaryOp(k){
	if      (k == KS_PLUS      ) return OP_TONUM;
	else if (k == KS_UNPLUS    ) return OP_TONUM;
	else if (k == KS_MINUS     ) return OP_NEG;
	else if (k == KS_UNMINUS   ) return OP_NEG;
	else if (k == KS_AMP       ) return OP_SIZE;
	else if (k == KS_BANG      ) return OP_NOT;
	else if (k == KS_MINUSTILDE) return OP_SHIFT;
	else if (k == KS_TILDEMINUS) return OP_POP;
	else if (k == KS_TYPENUM   ) return OP_ISNUM;
	else if (k == KS_TYPESTR   ) return OP_ISSTR;
	else if (k == KS_TYPELIST  ) return OP_ISLIST;
	return -1;
}

function ks_toBinaryOp(k){
	if      (k == KS_PLUS   ) return OP_ADD;
	else if (k == KS_MINUS  ) return OP_SUB;
	else if (k == KS_PERCENT) return OP_MOD;
	else if (k == KS_STAR   ) return OP_MUL;
	else if (k == KS_SLASH  ) return OP_DIV;
	else if (k == KS_CARET  ) return OP_POW;
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
	if      (k == KS_TILDEPLUS ) return OP_PUSH;
	else if (k == KS_PLUSTILDE ) return OP_UNSHIFT;
	else if (k == KS_TILDE2PLUS) return OP_APPEND;
	else if (k == KS_PLUSTILDE2) return OP_PREPEND;
	else if (k == KS_PLUSEQU   ) return OP_ADD;
	else if (k == KS_PERCENTEQU) return OP_MOD;
	else if (k == KS_MINUSEQU  ) return OP_SUB;
	else if (k == KS_STAREQU   ) return OP_MUL;
	else if (k == KS_SLASHEQU  ) return OP_DIV;
	else if (k == KS_CARETEQU  ) return OP_POW;
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

function tok_isPre(tk){
	if (tk.type != TOK_KS)
		return false;
	return false ||
		tk.k == KS_PLUS       ||
		tk.k == KS_UNPLUS     ||
		tk.k == KS_MINUS      ||
		tk.k == KS_UNMINUS    ||
		tk.k == KS_AMP        ||
		tk.k == KS_BANG       ||
		tk.k == KS_PERIOD3    ||
		tk.k == KS_MINUSTILDE ||
		tk.k == KS_TILDEMINUS ||
		tk.k == KS_TYPENUM    ||
		tk.k == KS_TYPESTR    ||
		tk.k == KS_TYPELIST;
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
		tk.k == KS_TILDEPLUS  ||
		tk.k == KS_PLUSTILDE  ||
		tk.k == KS_TILDE2PLUS ||
		tk.k == KS_PLUSTILDE2 ||
		tk.k == KS_AMP2       ||
		tk.k == KS_PIPE2      ||
		tk.k == KS_AMP2EQU    ||
		tk.k == KS_PIPE2EQU   ||
		(allowComma && tk.k == KS_COMMA) ||
		(allowPipe  && tk.k == KS_PIPE );
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
	else if (k == KS_TILDEPLUS ) return  4;
	else if (k == KS_PLUSTILDE ) return  4;
	else if (k == KS_TILDE2PLUS) return  5;
	else if (k == KS_PLUSTILDE2) return  5;
	else if (k == KS_TILDE     ) return  6;
	else if (k == KS_AT        ) return  7;
	else if (k == KS_LTEQU     ) return  8;
	else if (k == KS_LT        ) return  8;
	else if (k == KS_GTEQU     ) return  8;
	else if (k == KS_GT        ) return  8;
	else if (k == KS_BANGEQU   ) return  9;
	else if (k == KS_EQU2      ) return  9;
	else if (k == KS_AMP2      ) return 10;
	else if (k == KS_PIPE2     ) return 11;
	else if (k == KS_EQU       ) return 20;
	else if (k == KS_PLUSEQU   ) return 20;
	else if (k == KS_PERCENTEQU) return 20;
	else if (k == KS_MINUSEQU  ) return 20;
	else if (k == KS_STAREQU   ) return 20;
	else if (k == KS_SLASHEQU  ) return 20;
	else if (k == KS_CARETEQU  ) return 20;
	else if (k == KS_TILDEEQU  ) return 20;
	else if (k == KS_COMMA     ) return 30;
	else if (k == KS_PIPE      ) return 40;
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
		ch4: 0,
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
				if (ch1 == '}' && lx.str_depth > 0){
					lx.str_depth--;
					lx.str = [];
					lx.state = LEX_STR_INTERP;
					tks.push(tok_ks(KS_RPAREN));
					tks.push(tok_ks(KS_TILDE));
				}
				else
					lx.state = LEX_SPECIAL1;
			}
			else if (isIdentStart(ch1)){
				lx.ident = ch1;
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
				lx.str = [];
				lx.state = LEX_STR_BASIC;
			}
			else if (ch1 == '"'){
				lx.str = [];
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
					tks.push(tok_error('Unexpected characters: ' + lx.ch2 + ch1));
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
						tks.push(tok_error('Unexpected characters: ' + lx.ch3 + lx.ch2 + ch1));
				}
			}
		} break;

		case LEX_IDENT:
			if (!isIdentBody(ch1)){
				var ksk = ks_str(lx.ident);
				if (ksk != KS_INVALID)
					tks.push(tok_ks(ksk));
				else
					tks.push(tok_ident(lx.ident));
				lx.state = LEX_START;
				lex_process(lx, tks);
			}
			else{
				lx.ident += ch1;
				if (lx.ident.length > 1024)
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
			else
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
			else if (!isIdentStart(ch1)){
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
			else if (!isIdentStart(ch1)){
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
			else if (!isIdentStart(ch1)){
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
			else if (ch1 == '\''){
				lx.state = LEX_START;
				tks.push(tok_ks(KS_LPAREN));
				tks.push(tok_str(lx.str));
				tks.push(tok_ks(KS_RPAREN));
			}
			else if (ch1 == '\\')
				lx.state = LEX_STR_BASIC_ESC;
			else
				lx.str.push(ch1.charCodeAt(0));
			break;

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\\' || ch1 == '\''){
				lx.str.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_BASIC;
			}
			else
				tks.push(tok_error('Invalid escape sequence: \\' + ch1));
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
			else
				lx.str.push(ch1.charCodeAt(0));
			break;

		case LEX_STR_INTERP_DLR:
			if (ch1 == '{'){
				lx.str_depth++;
				lx.state = LEX_START;
				tks.push(tok_ks(KS_LPAREN));
			}
			else if (isIdentStart(ch1)){
				lx.ident = ch1;
				lx.state = LEX_STR_INTERP_DLR_ID;
			}
			else
				tks.push(tok_error('Invalid substitution'));
			break;

		case LEX_STR_INTERP_DLR_ID:
			if (!isIdentBody(ch1)){
				if (ks_str(lx.ident) != KS_INVALID)
					tks.push(tok_error('Invalid substitution'));
				else{
					tks.push(tok_ident(lx.ident));
					if (ch1 == '"'){
						lx.state = LEX_START;
						tks.push(tok_ks(KS_RPAREN));
					}
					else{
						lx.str = [];
						lx.state = LEX_STR_INTERP;
						tks.push(tok_ks(KS_TILDE));
						lex_process(lx, tks);
					}
				}
			}
			else{
				lx.ident += ch1;
				if (lx.ident.length > 1024)
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
				lx.str.push(0);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'b'){
				lx.str.push(8);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 't'){
				lx.str.push(9);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'n'){
				lx.str.push(10);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'v'){
				lx.str.push(11);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'f'){
				lx.str.push(12);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == 'r'){
				lx.str.push(13);
				lx.state = LEX_STR_INTERP;
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				lx.str.push(ch1.charCodeAt(0));
				lx.state = LEX_STR_INTERP;
			}
			else
				tks.push(tok_error('Invalid escape sequence: \\' + ch1));
			break;

		case LEX_STR_INTERP_ESC_HEX:
			if (isHex(ch1)){
				lx.str_hexval = (str_hexval * 16) + toHex(ch1);
				lx.str_hexleft--;
				if (lx.str_hexleft <= 0){
					lx.str.push(lx.str_hexval);
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
	if (lx.str_depth > 0){
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
				tks.push(tok_ks(ks2))
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
			var ksk = ks_str(lx.ident);
			if (ksk != KS_INVALID)
				tks.push(tok_ks(ksk));
			else
				tks.push(tok_ident(lx.ident));
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

var AST_BREAK     = 'AST_BREAK';
var AST_CONTINUE  = 'AST_CONTINUE';
var AST_DECLARE   = 'AST_DECLARE';
var AST_DEF       = 'AST_DEF';
var AST_DO_END    = 'AST_DO_END';
var AST_DO_WHILE  = 'AST_DO_WHILE';
var AST_FOR       = 'AST_FOR';
var AST_LOOP      = 'AST_LOOP';
var AST_GOTO      = 'AST_GOTO';
var AST_IF        = 'AST_IF';
var AST_INCLUDE   = 'AST_INCLUDE';
var AST_NAMESPACE = 'AST_NAMESPACE';
var AST_RETURN    = 'AST_RETURN';
var AST_USING     = 'AST_USING';
var AST_VAR       = 'AST_VAR';
var AST_EVAL      = 'AST_EVAL';
var AST_LABEL     = 'AST_LABEL';

function ast_break(flp){
	return { flp: flp, type: AST_BREAK };
}

function ast_continue(flp){
	return { flp: flp, type: AST_CONTINUE };
}

function ast_declare(flp, decls){
	return { flp: flp, type: AST_DECLARE, decls: decls };
}

function ast_def(flp, names, lvalues, body){
	return { flp: flp, type: AST_DEF, names: names, lvalues: lvalues, body: body };
}

function ast_doEnd(flp, body){
	return { flp: flp, type: AST_DO_END, body: body };
}

function ast_doWhile(flp, doBody, cond, whileBody){
	return { flp: flp, type: AST_DO_WHILE, doBody: doBody, cond: cond, whileBody: whileBody };
}

function ast_for(flp, forVar, names1, names2, ex, body){
	return {
		flp: flp,
		type: AST_FOR,
		forVar: forVar,
		names1: names1,
		names2: names2,
		ex: ex,
		body: body
	};
}

function ast_loop(flp, body){
	return { flp: flp, type: AST_LOOP, body: body };
}

function ast_goto(flp, ident){
	return { flp: flp, type: AST_GOTO, ident: ident };
}

function ast_if(flp, conds, elseBody){
	return { flp: flp, type: AST_IF, conds: conds, elseBody: elseBody };
}

function ast_include(flp, incls){
	return { flp: flp, type: AST_INCLUDE, incls: incls };
}

function ast_namespace(flp, names, body){
	return { flp: flp, type: AST_NAMESPACE, names: names, body: body };
}

function ast_return(flp, ex){
	return { flp: flp, type: AST_RETURN, ex: ex };
}

function ast_using(flp, namesList){
	return { flp: flp, type: AST_USING, namesList: namesList };
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

function cond_new(ex, body){ // conds
	return { ex: ex, body: body };
}

var DECL_LOCAL  = 'DECL_LOCAL';
var DECL_NATIVE = 'DECL_NATIVE';

function decl_local(flp, names){ // decls
	return { flp: flp, type: DECL_LOCAL, names: names };
}

function decl_native(flp, names, key){ // decls
	return { flp: flp, type: DECL_NATIVE, names: names, key: key };
}

function incl_new(flp, names, file){ // incls
	return { flp: flp, names: names, file: file };
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

var PRS_START                         = 'PRS_START';
var PRS_START_STATEMENT               = 'PRS_START_STATEMENT';
var PRS_STATEMENT                     = 'PRS_STATEMENT';
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
var PRS_DECLARE2                      = 'PRS_DECLARE2';
var PRS_DECLARE_LOOKUP                = 'PRS_DECLARE_LOOKUP';
var PRS_DECLARE_STR                   = 'PRS_DECLARE_STR';
var PRS_DECLARE_STR2                  = 'PRS_DECLARE_STR2';
var PRS_DECLARE_STR3                  = 'PRS_DECLARE_STR3';
var PRS_DEF                           = 'PRS_DEF';
var PRS_DEF_LOOKUP                    = 'PRS_DEF_LOOKUP';
var PRS_DEF_LVALUES                   = 'PRS_DEF_LVALUES';
var PRS_DEF_BODY                      = 'PRS_DEF_BODY';
var PRS_DEF_DONE                      = 'PRS_DEF_DONE';
var PRS_DO                            = 'PRS_DO';
var PRS_DO_BODY                       = 'PRS_DO_BODY';
var PRS_DO_DONE                       = 'PRS_DO_DONE';
var PRS_DO_WHILE_EXPR                 = 'PRS_DO_WHILE_EXPR';
var PRS_DO_WHILE_BODY                 = 'PRS_DO_WHILE_BODY';
var PRS_DO_WHILE_DONE                 = 'PRS_DO_WHILE_DONE';
var PRS_FOR                           = 'PRS_FOR';
var PRS_LOOP_BODY                     = 'PRS_LOOP_BODY';
var PRS_LOOP_DONE                     = 'PRS_LOOP_DONE';
var PRS_FOR_VARS                      = 'PRS_FOR_VARS';
var PRS_FOR_VARS_LOOKUP               = 'PRS_FOR_VARS_LOOKUP';
var PRS_FOR_VARS2                     = 'PRS_FOR_VARS2';
var PRS_FOR_VARS2_LOOKUP              = 'PRS_FOR_VARS2_LOOKUP';
var PRS_FOR_VARS_DONE                 = 'PRS_FOR_VARS_DONE';
var PRS_FOR_EXPR                      = 'PRS_FOR_EXPR';
var PRS_FOR_BODY                      = 'PRS_FOR_BODY';
var PRS_FOR_DONE                      = 'PRS_FOR_DONE';
var PRS_GOTO                          = 'PRS_GOTO';
var PRS_GOTO_DONE                     = 'PRS_GOTO_DONE';
var PRS_IF                            = 'PRS_IF';
var PRS_IF_EXPR                       = 'PRS_IF_EXPR';
var PRS_IF_BODY                       = 'PRS_IF_BODY';
var PRS_ELSEIF                        = 'PRS_ELSEIF';
var PRS_IF_DONE                       = 'PRS_IF_DONE';
var PRS_ELSE_BODY                     = 'PRS_ELSE_BODY';
var PRS_ELSE_DONE                     = 'PRS_ELSE_DONE';
var PRS_INCLUDE                       = 'PRS_INCLUDE';
var PRS_INCLUDE2                      = 'PRS_INCLUDE2';
var PRS_INCLUDE_LOOKUP                = 'PRS_INCLUDE_LOOKUP';
var PRS_INCLUDE_STR                   = 'PRS_INCLUDE_STR';
var PRS_INCLUDE_STR2                  = 'PRS_INCLUDE_STR2';
var PRS_INCLUDE_STR3                  = 'PRS_INCLUDE_STR3';
var PRS_NAMESPACE                     = 'PRS_NAMESPACE';
var PRS_NAMESPACE_LOOKUP              = 'PRS_NAMESPACE_LOOKUP';
var PRS_NAMESPACE_BODY                = 'PRS_NAMESPACE_BODY';
var PRS_NAMESPACE_DONE                = 'PRS_NAMESPACE_DONE';
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
var PRS_EXPR_TERM_ISNIL               = 'PRS_EXPR_TERM_ISNIL';
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
		stmt: null,                 // single ast_*
		body: null,                 // list of ast_*'s
		body2: null,                // list of ast_*'s
		conds: null,                // list of cond_new's
		decls: null,                // list of decl_*'s
		incls: null,                // list of incl_new's
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
		namesList: null,            // list of list of strings
		next: next
	};
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
	return parser_process(pr, stmt.flp);
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

function parser_start(pr, state){
	pr.level++;
	pr.state.state = state;
	return prr_more();
}

function parser_process(pr, flp){
	var tk1 = pr.tk1;
	var st = pr.state;
	switch (st.state){
		case PRS_START:
			st.state = PRS_START_STATEMENT;
			st.stmt = null;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr, flp);

		case PRS_START_STATEMENT:
			if (st.stmt == null)
				return prr_error('Invalid statement');
			// all statements require a newline to terminate it... except labels
			if (st.stmt.type != AST_LABEL && tk1.type != TOK_NEWLINE)
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
			else if (tok_isKS(tk1, KS_INCLUDE  )) return parser_start(pr, PRS_INCLUDE  );
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
				pr.level++;
				st.state = PRS_EVAL;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_END) || tok_isKS(tk1, KS_ELSE) || tok_isKS(tk1, KS_ELSEIF) ||
				tok_isKS(tk1, KS_WHILE)){
				// stmt is already null, so don't touch it, so we return null
				pr.state = st.next;
				return parser_process(pr, flp);
			}
			return prr_error('Invalid statement');

		case PRS_LOOKUP:
			if (!tok_isKS(tk1, KS_PERIOD)){
				st.next.names = st.names;
				pr.state = st.next;
				return parser_process(pr, flp);
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
			return parser_process(pr, flp);

		case PRS_BODY_STATEMENT:
			if (st.stmt == null){
				st.next.body = st.body;
				pr.state = st.next;
				return parser_process(pr, flp);
			}
			st.body.push(st.stmt);
			st.stmt = null;
			parser_push(pr, PRS_STATEMENT);
			return prr_more();

		case PRS_LVALUES:
			if (tk1.type == TOK_NEWLINE && !tk1.soft){
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp);
			}
			st.state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr.state.lvaluesPeriods = st.lvaluesPeriods;
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM:
			if (tk1.type == TOK_IDENT){
				st.state = PRS_LVALUES_TERM_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr.state.names = [tk1.ident];
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LBRACE)){
				st.state = PRS_LVALUES_TERM_LIST_DONE;
				parser_push(pr, PRS_LVALUES_TERM_LIST);
				return prr_more();
			}
			else if (st.lvaluesPeriods > 0 && tok_isKS(tk1, KS_PERIOD3)){
				if (st.lvaluesPeriods == 1)
					st.state = PRS_LVALUES_DEF_TAIL;
				else
					st.state = PRS_LVALUES_TERM_LIST_TAIL;
				return prr_more();
			}
			return prr_error('Expecting variable');

		case PRS_LVALUES_TERM_LOOKUP:
			st.next.exprTerm = expr_names(flp, st.names);
			pr.state = st.next;
			return parser_process(pr, flp);

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
			return parser_process(pr, flp);

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
			st.state = PRS_LVALUES_TERM_LIST_TAIL_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_LVALUES_TERM_LIST_TAIL_LOOKUP:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			st.state = PRS_LVALUES_TERM_LIST_TAIL_DONE;
			if (tok_isKS(tk1, KS_COMMA))
				return prr_more();
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST_TAIL_DONE:
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error('Missing end of list');
			st.next.exprTerm = expr_prefix(flp, KS_PERIOD3, expr_names(flp, st.names));
			pr.state = st.next;
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST_DONE:
			st.next.exprTerm = expr_list(flp, st.exprTerm);
			pr.state = st.next;
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_DONE:
			if (tk1.type == TOK_NEWLINE){
				st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm, null));
				st.exprTerm = null;
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_EQU)){
				st.exprTerm2 = st.exprTerm;
				st.exprTerm = null;
				st.state = PRS_LVALUES_TERM_EXPR;
				parser_push(pr, PRS_EXPR);
				pr.state.exprAllowComma = false;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm, null));
				st.exprTerm = null;
				st.state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error('Invalid declaration');

		case PRS_LVALUES_TERM_EXPR:
			st.lvalues.push(expr_infix(flp, KS_EQU, st.exprTerm2, st.exprTerm));
			st.exprTerm2 = null;
			st.exprTerm = null;
			if (tk1.type == TOK_NEWLINE){
				st.next.lvalues = st.lvalues;
				pr.state = st.next;
				return parser_process(pr, flp);
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
			return parser_process(pr, flp);

		case PRS_LVALUES_DEF_TAIL:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_LVALUES_DEF_TAIL_DONE;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_LVALUES_DEF_TAIL_DONE:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st = st.next; // pop *twice*
			st.lvalues.push(expr_prefix(flp, KS_PERIOD3, expr_names(flp, st.names)));
			st.next.lvalues = st.lvalues;
			pr.state = st.next;
			return parser_process(pr, flp);

		case PRS_BREAK:
			return parser_statement(pr, ast_break(flp));

		case PRS_CONTINUE:
			return parser_statement(pr, ast_continue(flp));

		case PRS_DECLARE:
			st.decls = [];
			st.state = PRS_DECLARE2;
			return parser_process(pr, flp);

		case PRS_DECLARE2:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
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
				st.decls.push(decl_local(flp, st.names));
				st.state = PRS_DECLARE2;
				return prr_more();
			}
			st.decls.push(decl_local(flp, st.names));
			return parser_statement(pr, ast_declare(flp, st.decls));

		case PRS_DECLARE_STR:
			if (tk1.type != TOK_STR)
				return prr_error('Expecting string constant');
			st.decls.push(decl_native(flp, st.names, tk1.str));
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
			return parser_statement(pr, ast_declare(flp, st.decls));

		case PRS_DEF:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_DEF_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_DEF_LOOKUP:
			st.state = PRS_DEF_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr.state.lvalues = [];
			pr.state.lvaluesPeriods = 1;
			return parser_process(pr, flp);

		case PRS_DEF_LVALUES:
			st.state = PRS_DEF_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return parser_process(pr, flp);

		case PRS_DEF_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of def block');
			st.state = PRS_DEF_DONE;
			return prr_more();

		case PRS_DEF_DONE:
			return parser_statement(pr, ast_def(flp, st.names, st.lvalues, st.body));

		case PRS_DO:
			st.state = PRS_DO_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return parser_process(pr, flp);

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
			return parser_statement(pr, ast_doEnd(flp, st.body));

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
			return parser_statement(pr, ast_doWhile(flp, st.body2, st.exprTerm, st.body));

		case PRS_FOR:
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_LOOP_BODY;
				parser_push(pr, PRS_BODY);
				pr.state.body = [];
				return prr_more();
			}
			st.state = PRS_FOR_VARS;
			if (tok_isKS(tk1, KS_VAR)){
				st.forVar = true;
				return prr_more();
			}
			return parser_process(pr, flp);

		case PRS_LOOP_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of for block');
			st.state = PRS_LOOP_DONE;
			return prr_more();

		case PRS_LOOP_DONE:
			return parser_statement(pr, ast_loop(flp, st.body));

		case PRS_FOR_VARS:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_FOR_VARS_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

		case PRS_FOR_VARS_LOOKUP:
			st.names2 = st.names;
			st.names = null;
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_FOR_VARS2;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COLON)){
				st.state = PRS_FOR_VARS2_LOOKUP;
				return parser_process(pr, flp);
			}
			return prr_error('Invalid for loop');

		case PRS_FOR_VARS2:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_FOR_VARS2_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr.state.names = [tk1.ident];
			return prr_more();

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
			return parser_process(pr, flp);

		case PRS_FOR_EXPR:
			if (tk1.type != TOK_NEWLINE)
				return prr_error('Missing newline or semicolon');
			st.state = PRS_FOR_BODY;
			parser_push(pr, PRS_BODY);
			pr.state.body = [];
			return prr_more();

		case PRS_FOR_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of for block');
			st.state = PRS_FOR_DONE;
			return prr_more();

		case PRS_FOR_DONE:
			return parser_statement(pr,
				ast_for(flp, st.forVar, st.names2, st.names, st.exprTerm, st.body));

		case PRS_GOTO:
			if (tk1.type != TOK_IDENT)
				return prr_error('Expecting identifier');
			st.state = PRS_GOTO_DONE;
			return prr_more();

		case PRS_GOTO_DONE:
			return parser_statement(pr, ast_goto(flp, pr.tk2.ident));

		case PRS_IF:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Missing conditional expression');
			st.state = PRS_IF_EXPR;
			st.conds = [];
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

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
				st.state = PRS_ELSEIF;
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

		case PRS_ELSEIF:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Missing conditional expression');
			st.state = PRS_IF_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_IF_DONE:
			return parser_statement(pr, ast_if(flp, st.conds, []));

		case PRS_ELSE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error('Missing `end` of if block');
			st.state = PRS_ELSE_DONE;
			return prr_more();

		case PRS_ELSE_DONE:
			return parser_statement(pr, ast_if(flp, st.conds, st.body));

		case PRS_INCLUDE:
			st.incls = [];
			st.state = PRS_INCLUDE2;
			return parser_process(pr, flp);

		case PRS_INCLUDE2:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			else if (tk1.type == TOK_IDENT){
				st.state = PRS_INCLUDE_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr.state.names = [tk1.ident];
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LPAREN)){
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
			st.incls.push(incl_new(flp, st.names, st.str));
			if (tok_isKS(tk1, KS_COMMA)){
				st.state = PRS_INCLUDE2;
				return prr_more();
			}
			return parser_statement(pr, ast_include(flp, st.incls));

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
			return parser_statement(pr, ast_namespace(flp, st.names, st.body));

		case PRS_RETURN:
			if (tk1.type == TOK_NEWLINE)
				return parser_statement(pr, ast_return(flp, expr_nil(flp)));
			st.state = PRS_RETURN_DONE;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_RETURN_DONE:
			return parser_statement(pr, ast_return(flp, st.exprTerm));

		case PRS_USING:
			if (tk1.type == TOK_NEWLINE)
				return prr_error('Expecting identifier');
			st.namesList = [];
			st.state = PRS_USING2;
			return parser_process(pr, flp);

		case PRS_USING2:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
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
			return parser_statement(pr, ast_using(flp, st.namesList));

		case PRS_VAR:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			st.state = PRS_VAR_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr.state.lvalues = [];
			return parser_process(pr, flp);

		case PRS_VAR_LVALUES:
			if (st.lvalues.length <= 0)
				return prr_error('Invalid variable declaration');
			return parser_statement(pr, ast_var(flp, st.lvalues));

		case PRS_IDENTS:
			if (st.names.length == 1 && tok_isKS(tk1, KS_COLON))
				return parser_statement(pr, ast_label(flp, st.names[0]));
			pr.level++;
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR_POST);
			pr.state.exprTerm = expr_names(flp, st.names);
			return parser_process(pr, flp);

		case PRS_EVAL:
			st.state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_EVAL_EXPR:
			return parser_statement(pr, ast_eval(flp, st.exprTerm));

		case PRS_EXPR:
			if (tok_isPre(tk1)){
				st.exprPreStack = ets_new(tk1, st.exprPreStack);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM;
			return parser_process(pr, flp);

		case PRS_EXPR_TERM:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
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
				st.state = PRS_EXPR_TERM_ISNIL;
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
			return parser_process(pr, flp);

		case PRS_EXPR_TERM_CLOSEBRACE:
			if (tk1.type == TOK_NEWLINE && !tk1.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error('Expecting close brace');
			st.exprTerm = expr_list(flp, st.exprTerm);
			st.state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_ISNIL:
			if (tok_isKS(tk1, KS_RPAREN)){
				st.state = PRS_EXPR_POST;
				st.exprTerm = expr_nil(flp);
				return prr_more();
			}
			st.state = PRS_EXPR_TERM_CLOSEPAREN;
			parser_push(pr, PRS_EXPR);
			pr.state.exprAllowTrailComma = true;
			return parser_process(pr, flp);

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
			return parser_process(pr, flp);

		case PRS_EXPR_POST:
			if (tk1.type == TOK_NEWLINE){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_LBRACKET)){
				st.state = PRS_EXPR_INDEX_CHECK;
				return prr_more();
			}
			else if (tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)){
				if (st.exprAllowTrailComma && tok_isKS(pr, KS_COMMA)){
					st.state = PRS_EXPR_COMMA;
					return prr_more();
				}
				st.state = PRS_EXPR_MID;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_RBRACE) || tok_isKS(tk1, KS_RBRACKET) ||
				tok_isKS(tk1, KS_RPAREN) || tok_isKS(tk1, KS_COLON) || tok_isKS(tk1, KS_COMMA) ||
				tok_isKS(tk1, KS_PIPE)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
			}
			// otherwise, this should be a call
			st.exprTerm2 = st.exprTerm;
			st.exprTerm = null;
			st.state = PRS_EXPR_POST_CALL;
			parser_push(pr, PRS_EXPR);
			pr.state.exprAllowPipe = false;
			return parser_process(pr, flp);

		case PRS_EXPR_POST_CALL:
			st.exprTerm = expr_call(flp, st.exprTerm2, st.exprTerm);
			st.exprTerm2 = null;
			st.state = PRS_EXPR_POST;
			return parser_process(pr, flp);

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
			return parser_process(pr, flp);

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
			return parser_process(pr, flp);

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
			return parser_process(pr, flp);

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
				parser_process(pr, flp);
				parser_fwd(pr, pr.tkR);
				return parser_process(pr, flp);
			}
			// found a trailing comma
			st.state = PRS_EXPR_FINISH;
			return parser_process(pr, flp);

		case PRS_EXPR_MID:
			if (!tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)){
				st.state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
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
					// apply the previous mMid
					var pri = parser_infix(flp, st.exprMidStack.tk.k, st.exprStack.ex, st.exprTerm)
					if (pri.type == PRI_ERROR)
						return prr_error(pri.msg);
					st.exprTerm = pri.ex;
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
			return parser_process(pr, flp);
	}
}

function parser_add(pr, tk, flp){
	parser_fwd(pr, tk);
	return parser_process(pr, flp);
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
	op_jump(ops, 0xFFFFFFFF);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_jumpTrue(lbl, ops, src){
	op_jumpTrue(ops, src, 0xFFFFFFFF);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_jumpFalse(lbl, ops, src){
	op_jumpFalse(ops, src, 0xFFFFFFFF);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_call(lbl, ops, ret, arg){
	op_call(ops, ret, arg, 0xFFFFFFFF);
	lbl.rewrites.push(ops.length - 4);
	if (lbl.pos >= 0)
		label_refresh(lbl, ops, lbl.rewrites.length - 1);
}

function label_declare(lbl, ops){
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
		vars: [FVR_VAR], // first frame variable reserved for arguments
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

function nsname_cmdLocal(name, lbl){
	return {
		name: name,
		type: NSN_CMD_LOCAL,
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

function symtbl_new(overwrite){
	var fr = frame_new(null);
	var sc = scope_new(fr, null, null, null);
	return {
		overwrite: overwrite, // allow definitions to be overwritten?
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
					if (!sym.overwrite)
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

var STLN_FOUND    = 'STLN_FOUND';
var STLN_NOTFOUND = 'STLN_NOTFOUND';

function stln_found(nsn){
	return { type: STLN_FOUND, nsn: nsn };
}

function stln_notfound(){
	return { type: STLN_NOTFOUND };
}

function symtbl_lookupNsSingle(sym, ns, names){
	for (var ni = 0; ni < names.length; ni++){
		var found = false;
		for (var nsni = 0; nsni < ns.names.length; nsni++){
			var nsn = ns.names[nsni];
			if (nsn.name == names[ni]){
				if (nsn.type == NSN_NAMESPACE){
					ns = nsn.ns;
					found = true;
					break;
				}
				else if (ni == names.length - 1)
					return stln_found(nsn);
				else
					break;
			}
		}
		if (!found)
			break;
	}
	return stln_notfound();
}

function symtbl_lookupNs(sym, ns, names, tried){
	if (tried.indexOf(ns) >= 0)
		return stln_notfound();
	tried.push(ns);
	var st = symtbl_lookupNsSingle(sym, ns, names);
	if (st.type == STLN_FOUND)
		return st;
	for (var i = 0; i < ns.usings.length; i++){
		st = symtbl_lookupNs(sym, ns.usings[i], names, tried);
		if (st.type == STLN_FOUND)
			return st;
	}
	return stln_notfound();
}

function symtbl_lookup(sym, names){
	var tried = [];
	var trysc = sym.sc;
	while (trysc != null){
		for (var trynsi = trysc.nsStack.length - 1; trynsi >= 0; trynsi--){
			var tryns = trysc.nsStack[trynsi];
			var st = symtbl_lookupNs(sym, tryns, names, tried);
			if (st.type == STLN_FOUND)
				return stl_ok(st.nsn);
		}
		trysc = trysc.parent;
	}
	return stl_error('Not found: ' + names.join('.'));
}

function symtbl_addTemp(sym){
	for (var i = 0; i < sym.fr.vars.length; i++){
		if (sym.fr.vars[i] == FVR_TEMP_AVAIL){
			sym.fr.vars[i] = FVR_TEMP_INUSE;
			return varloc_new(0, i);
		}
	}
	sym.fr.vars.push(FVR_TEMP_INUSE);
	return varloc_new(0, sym.fr.vars.length - 1);
}

function symtbl_clearTemp(sym, vlc){
	if (vlc.fdiff == 0 && sym.fr.vars[vlc.index] == FVR_TEMP_INUSE)
		sym.fr.vars[vlc.index] = FVR_TEMP_AVAIL;
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

function symtbl_addVar(sym, names){
	var nsr = symtbl_findNamespace(sym, names, names.length - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.msg);
	var ns = nsr.ns;
	for (var i = 0; i < ns.names.length; i++){
		var nsn = ns.names[i];
		if (nsn.name == names[names.length - 1]){
			if (!sym.overwrite)
				return sta_error('Cannot redefine "' + nsn.name + '"');
			if (nsn.type == NSN_VAR)
				return sta_var(varloc_new(frame_diff(nsn.fr, sym.fr), nsn.index));
			sym.fr.vars.push(FVR_VAR);
			ns.names[i] = nsname_var(nsn.name, sym.fr, sym.fr.vars.length - 1);
			return sta_var(varloc_new(0, sym.fr.vars.length - 1));
		}
	}
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
			if (!sym.overwrite)
				return sta_error('Cannot redefine "' + nsn.name + '"');
			ns.names[i] = nsname_cmdLocal(nsn.name, lbl);
			return sta_ok();
		}
	}
	ns.names.push(nsname_cmdLocal(names[names.length - 1], lbl));
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
			if (!sym.overwrite)
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
	SAC(sym, 'ask'           , OP_ASK           , -1);
	SAC(sym, 'warn'          , OP_WARN          , -1);
	SAC(sym, 'die'           , OP_DIE           , -1);
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
		SAC(sym, 'NaN'       , OP_NUM_NAN       ,  0);
		SAC(sym, 'isNaN'     , OP_NUM_ISNAN     ,  1);
		SAC(sym, 'isFinite'  , OP_NUM_ISFINITE  ,  1);
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
		SAC(sym, 'cast'      , OP_INT_CAST      ,  1);
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
		SAC(sym, 'new'       , OP_STR_NEW       ,  2);
		SAC(sym, 'split'     , OP_STR_SPLIT     ,  2);
		SAC(sym, 'replace'   , OP_STR_REPLACE   ,  3);
		SAC(sym, 'startsWith', OP_STR_STARTSWITH,  2);
		SAC(sym, 'endsWith'  , OP_STR_ENDSWITH  ,  2);
		SAC(sym, 'pad'       , OP_STR_PAD       ,  2);
		SAC(sym, 'find'      , OP_STR_FIND      ,  3);
		SAC(sym, 'findRev'   , OP_STR_FINDREV   ,  3);
		SAC(sym, 'lower'     , OP_STR_LOWER     ,  1);
		SAC(sym, 'upper'     , OP_STR_UPPER     ,  1);
		SAC(sym, 'trim'      , OP_STR_TRIM      ,  1);
		SAC(sym, 'rev'       , OP_STR_REV       ,  1);
		SAC(sym, 'list'      , OP_STR_LIST      ,  1);
		SAC(sym, 'byte'      , OP_STR_BYTE      ,  2);
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
		SAC(sym, 'empty'     , OP_LIST_EMPTY    ,  1);
		SAC(sym, 'find'      , OP_LIST_FIND     ,  3);
		SAC(sym, 'findRev'   , OP_LIST_FINDREV  ,  3);
		SAC(sym, 'join'      , OP_LIST_JOIN     ,  2);
		SAC(sym, 'rev'       , OP_LIST_REV      ,  1);
		SAC(sym, 'str'       , OP_LIST_STR      ,  1);
		SAC(sym, 'sort'      , OP_LIST_SORT     ,  1);
		SAC(sym, 'sortRev'   , OP_LIST_SORTREV  ,  1);
		SAC(sym, 'sortCmp'   , OP_LIST_SORTCMP  ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['json']);
		SAC(sym, 'valid'     , OP_JSON_VALID    ,  1);
		SAC(sym, 'str'       , OP_JSON_STR      ,  1);
		SAC(sym, 'val'       , OP_JSON_VAL      ,  1);
	symtbl_popNamespace(sym);
}

//
// program
//

function program_new(){
	return {
		initFrameSize: 0,
		strTable: [],
		numTable: [],
		keyTable: [],
		ops: []
	};
}

var SER_OK    = 'SEP_OK';
var SER_ERROR = 'SEP_ERROR';

function ser_ok(obj, start, len){
	return { type: SER_OK, obj: obj, start: start, len: len };
}

function ser_error(flp, msg){
	return { type: SER_ERROR, flp: flp, msg: msg };
}

function program_sliceEval(prg, sym, ex){
	var oe = program_eval(prg, sym, ex.obj, false);
	if (oe.type == PER_ERROR)
		return ser_error(oe.flp, oe.msg);
	var le;
	var iszero = false;
	if (ex.start == null){
		le = program_eval(prg, sym, expr_num(ex.flp, 0), false);
		iszero = true;
	}
	else{
		iszero = ex.start.type == EXPR_NUM && ex.start.num == 0;
		le = program_eval(prg, sym, ex.start, false);
	}
	if (le.type == PER_ERROR)
		return sep_error(le.msg);
	var re;
	if (ex.len == null){
		if (iszero){
			re = program_eval(prg, sym,
				expr_prefix(ex.flp, KS_AMP, expr_var(ex.flp, oe.vlc)));
		}
		else{
			re = program_eval(prg, sym,
				expr_infix(ex.flp, KS_MINUS,
					expr_prefix(ex.flp, KS_AMP, expr_var(ex.flp, oe.vlc)),
					expr_var(ex.flp, le.vlc)
				),
				false);
		}
	}
	else
		re = program_eval(prg, sym, ex.len, false);
	if (re.type == PER_ERROR)
		return ser_error(re.flp, re.msg);
	return ser_ok(oe.vlc, le.vlc, re.vlc);
}

var PCE_OK    = 'PCE_OK';
var PCE_ERROR = 'PCE_ERROR';

function pce_ok(){
	return { type: PCE_OK };
}

function pce_error(flp, msg){
	return { type: PCE_ERROR, flp: flp, msg: msg };
}

function program_callEval(prg, sym, vlc, nsn, params, atvlc, flp){
	// params can be null to indicate emptiness
	if (nsn.type == NSN_CMD_OPCODE && nsn.opcode == -1){ // short-circuit `pick`
		if (params == null || params.type != EXPR_GROUP || params.group.length != 3)
			return pce_error(flp, 'Using `pick` requires exactly three arguments');
		var cr = program_eval(prg, sym, params.group[0], false);
		if (cr.type == PER_ERROR)
			return pce_error(cr.flp, cr.msg);
		var pickfalse = label_new('%pickfalse');
		label_jumpFalse(pickfalse, prg.ops, cr.vlc);
		var pe = program_evalInto(prg, sym, vlc, params.group[1]);
		if (pe.type == PIR_ERROR)
			return pce_error(pe.flp, pe.msg);
		var finish = label_new('%pickfinish');
		label_jump(finish, prg.ops);
		label_declare(pickfalse, prg.ops);
		pe = program_evalInto(prg, sym, vlc, params.group[2]);
		if (pe.type == PIR_ERROR)
			return pce_error(pe.flp, pe.msg);
		label_declare(finish, prg.ops);
		return pce_ok();
	}

	switch (nsn.type){
		case NSN_CMD_LOCAL: {
			if (atvlc == null){
				var pr = program_eval(prg, sym, expr_list(flp, params), false);
				if (pr.type == PER_ERROR)
					return pce_error(pr.flp, pr.msg);
				symtbl_clearTemp(sym, pr.vlc);
				atvlc = pr.vlc;
			}
			label_call(nsn.lbl, prg.ops, vlc, atvlc);
			return pce_ok();
		} break;

		case NSN_CMD_NATIVE: {
			if (atvlc == null){
				var pr = program_eval(prg, sym, expr_list(flp, params), false);
				if (pr.type == PER_ERROR)
					return pce_error(pr.flp, pr.msg);
				symtbl_clearTemp(sym, pr.vlc);
				atvlc = pr.vlc;
			}
			op_native(prg.ops, vlc, atvlc, nsn.index);
			return pce_ok();
		} break;

		case NSN_CMD_OPCODE:
			if (nsn.params == -1){ // variable arguments
				if (atvlc == null){
					var pr = program_eval(prg, sym, expr_list(flp, params), false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					symtbl_clearTemp(sym, pr.vlc);
					atvlc = pr.vlc;
				}
				op_param1(prg.ops, nsn.opcode, vlc, atvlc);
				return pce_ok();
			}
			else if (nsn.params == 0){
				if (params != null){
					var pr = program_evalEmpty(prg, sym, params);
					if (pr.type == PEM_ERROR)
						return pce_error(pr.flp, pr.msg);
				}
				op_param0(prg.ops, nsn.opcode, vlc);
				return pce_ok();
			}
			else if (nsn.params == 1){
				var p1;
				if (params == null){
					if (atvlc == null){
						p1 = symtbl_addTemp(sym);
						symtbl_clearTemp(sym, p1);
						op_nil(prg.ops, p1);
					}
					else{
						p1 = symtbl_addTemp(sym);
						symtbl_clearTemp(sym, p1);
						op_num(prg.ops, p1, 0);
						op_getat(prg.ops, p1, atvlc, p1);
					}
				}
				else{
					var pr = program_eval(prg, sym, params, false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					symtbl_clearTemp(sym, pr.vlc);
					p1 = pr.vlc;
				}
				op_param1(prg.ops, nsn.opcode, vlc, p1);
				return pce_ok();
			}
			else if (nsn.params == 2){
				var p1, p2;
				if (params == null){
					if (atvlc == null){
						p1 = symtbl_addTemp(sym);
						op_nil(prg.ops, p1);
						p2 = p1;
					}
					else{
						p1 = symtbl_addTemp(sym);
						p2 = symtbl_addTemp(sym);
						op_num(prg.ops, p1, 0);
						op_getat(prg.ops, p1, atvlc, p1);
						op_num(prg.ops, p2, 1);
						op_getat(prg.ops, p2, atvlc, p2);
					}
				}
				else if (params.type == EXPR_GROUP){
					var pr = program_eval(prg, sym, params.group[0], false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p1 = pr.vlc;
					pr = program_eval(prg, sym, params.group[1], false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p2 = pr.vlc;
					for (var i = 2; i < params.group.length; i++){
						var er = program_evalEmpty(prg, sym, params.group[i]);
						if (er.type == PEM_ERROR)
							return pce_error(er.flp, er.msg);
					}
				}
				else{
					var pr = program_eval(prg, sym, params, false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p1 = pr.vlc;
					p2 = symtbl_addTemp(sym);
					op_nil(prg.ops, p2);
				}
				symtbl_clearTemp(sym, p1);
				symtbl_clearTemp(sym, p2);
				op_param2(prg.ops, nsn.opcode, vlc, p1, p2);
				return pce_ok();
			}
			else if (nsn.params == 3){
				var p1, p2, p3;
				if (params == null){
					if (atvlc == null){
						p1 = symtbl_addTemp(sym);
						op_nil(prg.ops, p1);
						p2 = p3 = p1;
					}
					else{
						p1 = symtbl_addTemp(sym);
						p2 = symtbl_addTemp(sym);
						p3 = symtbl_addTemp(sym);
						op_num(prg.ops, p1, 0);
						op_getat(prg.ops, p1, atvlc, p1);
						op_num(prg.ops, p2, 1);
						op_getat(prg.ops, p2, atvlc, p2);
						op_num(prg.ops, p3, 2);
						op_getat(prg.ops, p3, atvlc, p3);
					}
				}
				else if (params.type == EXPR_GROUP){
					var pr = program_eval(prg, sym, params.group[0], false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p1 = pr.vlc;
					pr = program_eval(prg, sym, params.group[1], false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p2 = pr.vlc;
					if (params.group.length <= 2){
						p3 = symtbl_addTemp(sym);
						op_nil(prg.ops, p3);
					}
					else{
						pr = program_eval(prg, sym, params.group[2], false);
						if (pr.type == PER_ERROR)
							return pce_error(pr.flp, pr.msg);
						p3 = pr.vlc;
					}
					for (var i = 3; i < params.group.length; i++){
						var er = program_evalEmpty(prg, sym, params.group[i]);
						if (er.type == PEM_ERROR)
							return pce_error(er.flp, er.msg);
					}
				}
				else{
					var pr = program_eval(prg, sym, params, false);
					if (pr.type == PER_ERROR)
						return pce_error(pr.flp, pr.msg);
					p1 = pr.vlc;
					p2 = symtbl_addTemp(sym);
					op_nil(prg.ops, p2);
					p3 = p2;
				}
				symtbl_clearTemp(sym, p1);
				symtbl_clearTemp(sym, p2);
				symtbl_clearTemp(sym, p3);
				op_param3(prg.ops, nsn.opcode, vlc, p1, p2, p3);
				return pce_ok();
			}
			throw new Error('Unknown opcode param count (this shouldn\'t happen)');
	}
	return pce_error(flp, 'Invalid call');
}

function program_evalLvalueSlice(prg, sym, lv, exvlc, mutop, vlc){
	if (mutop < 0)
		op_splice(prg.ops, lv.obj, lv.start, lv.len, exvlc);
	else{
		var idx = symtbl_addTemp(sym);
		var len = symtbl_addTemp(sym);
		var tm1 = symtbl_addTemp(sym);
		var tm2 = symtbl_addTemp(sym);

		var top = label_new('%mutslicetop');
		var finish = label_new('%mutslicefinish');

		op_move(prg.ops, idx, lv.start);
		op_num(prg.ops, len, 0);
		label_declare(top, prg.ops);
		op_binop(prg.ops, OP_LT, tm1, len, lv.len);
		label_jumpFalse(finish, prg.ops, tm1);
		op_getat(prg.ops, tm1, lv.obj, idx);
		op_getat(prg.ops, tm2, exvlc, idx);
		op_binop(prg.ops, mutop, tm1, tm1, tm2);
		op_setat(prg.ops, lv.obj, idx, tm1);
		op_inc(prg.ops, idx);
		op_inc(prg.ops, len);
		label_jump(top, prg.ops);
		label_declare(finish, prg.ops);

		symtbl_clearTemp(sym, idx);
		symtbl_clearTemp(sym, len);
		symtbl_clearTemp(sym, tm1);
		symtbl_clearTemp(sym, tm2);
	}
	if (vlc != null)
		op_move(prg.ops, vlc, lv.obj);
	symtbl_clearTemp(sym, exvlc);
	symtbl_clearTemp(sym, lv.start);
	symtbl_clearTemp(sym, lv.len);
	return lv.obj;
}

var PIR_OK    = 'PIR_OK';
var PIR_ERROR = 'PIR_ERROR';

function pir_ok(){
	return { type: PIR_OK };
}

function pir_error(flp, msg){
	return { type: PIR_ERROR, flp: flp, msg: msg };
}

function str_equ(s1, s2){
	if (s1.length != s2.length)
		return false;
	for (var i = 0; i < s1.length; i++){
		if (s1[i] != s2[i])
			return false;
	}
	return true;
}

function program_evalLvalueInto(prg, sym, vlc, lv, mutop, exvlc){
	switch (lv.type){
		case LVR_VAR: {
			if (mutop < 0)
				op_move(prg.ops, lv.vlc, exvlc);
			else
				op_binop(prg.ops, mutop, lv.vlc, lv.vlc, exvlc);
			op_move(prg.ops, vlc, lv.vlc);
			symtbl_clearTemp(sym, exvlc);
			return pir_ok();
		} break;

		case LVR_INDEX: {
			if (mutop < 0){
				op_setat(prg.ops, lv.obj, lv.key, exvlc);
				op_move(prg.ops, vlc, exvlc);
			}
			else{
				var t = symtbl_addTemp(sym);
				op_getat(prg.ops, t, lv.obj, lv.key);
				op_binop(prg.ops, mutop, t, t, exvlc);
				op_setat(prg.ops, lv.obj, lv.key, t);
				op_move(prg.ops, vlc, t);
				symtbl_clearTemp(sym, t);
			}
			symtbl_clearTemp(sym, exvlc);
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.key);
			return pir_ok();
		} break;

		case LVR_SLICE: {
			var ovlc = program_evalLvalueSlice(prg, sym, lv, exvlc, mutop, vlc);
			symtbl_clearTemp(sym, ovlc);
			return pir_ok();
		} break;

		case LVR_LIST: {
			throw 'TODO: LVR_LIST in program_evalLvalueInto';
			symtbl_clearTemp(sym, exvlc);
			return pir_ok();
		} break;
	}
}

function program_evalInto(prg, sym, vlc, ex){
	switch (ex.type){
		case EXPR_NIL:
			op_nil(prg.ops, vlc);
			return pir_ok();

		case EXPR_NUM: {
			if (Math.floor(ex.num) == ex.num && ex.num >= -65536 && ex.num < 65536){
				op_num(prg.ops, vlc, ex.num);
				return pir_ok();
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
					return pir_error(ex.flp, 'Too many number constants');
				prg.numTable.push(ex.num);
			}
			op_num_tbl(prg.ops, vlc, index);
			return pir_ok();
		} break;

		case EXPR_STR: {
			var found = false;
			var index;
			for (index = 0; index < prg.strTable.length; index++){
				found = str_equ(ex.str, prg.strTable[index]);
				if (found)
					break;
			}
			if (!found){
				if (index >= 65536)
					return pir_error(ex.flp, 'Too many string constants');
				prg.strTable.push(ex.str);
			}
			op_str(prg.ops, vlc, index);
			return pir_ok();
		} break;

		case EXPR_LIST: {
			if (ex.ex != null){
				if (ex.ex.type == EXPR_GROUP){
					op_list(prg.ops, vlc, ex.ex.group.length);
					for (var i = 0; i < ex.ex.group.length; i++){
						var pr = program_eval(prg, sym, ex.ex.group[i], false);
						if (pr.type == PER_ERROR)
							return pir_error(pr.flp, pr.msg);
						symtbl_clearTemp(sym, pr.vlc);
						op_binop(prg.ops, OP_PUSH, vlc, vlc, pr.vlc);
					}
				}
				else{
					op_list(prg.ops, vlc, 1);
					var pr = program_eval(prg, sym, ex.ex, false);
					if (pr.type == PER_ERROR)
						return pir_error(pr.flp, pr.msg);
					symtbl_clearTemp(sym, pr.vlc);
					op_binop(prg.ops, OP_PUSH, vlc, vlc, pr.vlc);
				}
			}
			else
				op_list(prg.ops, vlc, 0);
			return pir_ok();
		} break;

		case EXPR_NAMES: {
			var sl = symtbl_lookup(sym, ex.names);
			if (sl.type == STL_ERROR)
				return pir_error(ex.flp, sl.msg);
			switch (sl.nsn.type){
				case NSN_VAR: {
					var fdiff = frame_diff(sl.nsn.fr, sym.fr);
					op_move(prg.ops, vlc, varloc_new(fdiff, sl.nsn.index));
					return pir_ok();
				} break;
				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
				case NSN_CMD_OPCODE: {
					var pe = program_callEval(prg, sym, vlc, sl.nsn, null, null, ex.flp);
					if (pe.type == PCE_ERROR)
						return pir_error(pe.flp, pe.msg);
					return pir_ok();
				} break;
				case NSN_NAMESPACE:
					return pir_error(ex.flp, 'Invalid expression');
			}
			throw new Error('Unknown NSN type: ' + sl.nsn.type);
		} break;

		case EXPR_VAR: {
			op_move(prg.ops, vlc, ex.vlc);
			return pir_ok();
		} break;

		case EXPR_PAREN:
			return program_evalInto(prg, sym, vlc, ex.ex);

		case EXPR_GROUP:
			for (var i = 0; i < ex.group.length; i++){
				if (i == ex.group.length - 1)
					return program_evalInto(prg, sym, vlc, ex.group[i]);
				var pr = program_evalEmpty(prg, sym, ex.group[i]);
				if (pr.type == PEM_ERROR)
					return pir_error(pr.flp, pr.msg);
			}
			break;

		case EXPR_PREFIX: {
			var unop = ks_toUnaryOp(ex.k);
			if (unop < 0)
				return pir_error(ex.flp, 'Invalid unary operator');
			var ee = program_eval(prg, sym, ex.ex, false);
			if (ee.type == PER_ERROR)
				return pir_error(ee.flp, ee.msg);
			op_unop(prg.ops, unop, vlc, ee.vlc);
			symtbl_clearTemp(sym, ee.vlc);
			return pir_ok();
		} break;

		case EXPR_INFIX: {
			var binop = ks_toBinaryOp(ex.k);
			if (binop >= 0){
				var le = program_eval(prg, sym, ex.left, false);
				if (le.type == PER_ERROR)
					return pir_error(le.flp, le.msg);
				var re = program_eval(prg, sym, ex.right, false);
				if (re.type == PER_ERROR)
					return pir_error(re.flp, re.msg);
				op_binop(prg.ops, binop, vlc, le.vlc, re.vlc);
				symtbl_clearTemp(sym, le.vlc);
				symtbl_clearTemp(sym, re.vlc);
				return pir_ok();
			}

			var mutop = ks_toMutateOp(ex.k);
			if (ex.k == KS_EQU || mutop >= 0){
				var lp = lval_prepare(prg, sym, ex.left);
				if (lp.type == LVP_ERROR)
					return pir_error(lp.flp, lp.msg);
				var lv = lp.lv;
				if (lv.type == LVR_VAR && ex.k == KS_EQU){
					// special case for basic assignment to remove the need for a temp
					var pr = program_evalInto(prg, sym, lv.vlc, ex.right);
					if (pr.type == PIR_ERROR)
						return pr;
					op_move(prg.ops, vlc, lv.vlc);
					return pir_ok();
				}
				else{
					var pr = program_eval(prg, sym, ex.right, false);
					if (pr.type == PER_ERROR)
						return pir_error(pr.flp, pr.msg);
					return program_evalLvalueInto(prg, sym, vlc, lv, mutop, pr.vlc);
				}
			}
			else if (ex.k == KS_AT){
				if (ex.left.type != EXPR_NAMES)
					return pir_error(ex.flp, 'Invalid call');
				var sl = symtbl_lookup(sym, ex.left.names);
				if (sl.type == STL_ERROR)
					return pir_error(ex.flp, sl.msg);
				var pr = program_eval(prg, sym, ex.right, false);
				if (pr.type == PER_ERROR)
					return pir_error(pr.flp, pr.msg);
				var pe = program_callEval(prg, sym, vlc, sl.nsn, null, pr.vlc, ex.flp);
				if (pe.type == PCE_ERROR)
					return pir_error(pe.flp, pe.msg);
				symtbl_clearTemp(sym, pr.vlc);
				return pir_ok();
			}
			else if (ex.k == KS_AMP2){
				var pr = program_evalInto(prg, sym, vlc, ex.left);
				if (pr.type == PIR_ERROR)
					return pr;
				var finish = label_new('%andfinish');
				label_jumpFalse(finish, prg.ops, vlc);
				pr = program_evalInto(prg, sym, vlc, ex.right);
				if (pr.type == PIR_ERROR)
					return pr;
				label_declare(finish, prg.ops);
				return pir_ok();
			}
			else if (ex.k == KS_PIPE2){
				var pr = program_evalInto(prg, sym, vlc, ex.left);
				if (pr.type == PIR_ERROR)
					return pr;
				var finish = label_new('%orfinish');
				label_jumpTrue(finish, prg.ops, vlc);
				pr = program_evalInto(prg, sym, vlc, ex.right);
				if (pr.type == PIR_ERROR)
					return pr;
				label_declare(finish, prg.ops);
				return pir_ok();
			}
			else if (ex.k == KS_AMP2EQU){
				throw 'TODO: AND equal';
			}
			else if (ex.k == KS_PIPE2EQU){
				throw 'TODO: PIPE equal';
			}

			return pir_error(ex.flp, 'Invalid operation');
		} break;

		case EXPR_CALL: {
			if (ex.cmd.type != EXPR_NAMES)
				return pir_error(ex.flp, 'Invalid call');
			var sl = symtbl_lookup(sym, ex.cmd.names);
			if (sl.type == STL_ERROR)
				return pir_error(ex.flp, sl.msg);
			var pe = program_callEval(prg, sym, vlc, sl.nsn, ex.params, null, ex.flp);
			if (pe.type == PCE_ERROR)
				return pir_error(pe.flp, pe.msg);
			return pir_ok();
		} break;

		case EXPR_INDEX: {
			var oe = program_eval(prg, sym, ex.obj, false);
			if (oe.type == PER_ERROR)
				return pir_error(oe.flp, oe.msg);
			var ke = program_eval(prg, sym, ex.key, false);
			if (ke.type == PER_ERROR)
				return pir_error(ke.flp, ke.msg);
			op_getat(prg.ops, vlc, oe.vlc, ke.vlc);
			symtbl_clearTemp(sym, oe.vlc);
			symtbl_clearTemp(sym, ke.vlc);
			return pir_ok();
		} break;

		case EXPR_SLICE: {
			var se = program_sliceEval(prg, sym, ex);
			if (se.type == SER_ERROR)
				return pir_error(se.flp, se.msg);
			op_slice(prg.ops, vlc, se.obj, se.start, se.len);
			symtbl_clearTemp(sym, se.obj);
			symtbl_clearTemp(sym, se.start);
			symtbl_clearTemp(sym, se.len);
			return pir_ok();
		} break;
	}
	throw new Error('Failed to return value for program_evalInto (this shouldn\'t happen)');
}

var PER_OK    = 'PER_OK';
var PER_ERROR = 'PER_ERROR';

function per_ok(vlc){
	return { type: PER_OK, vlc: vlc };
}

function per_error(flp, msg){
	return { type: PER_ERROR, flp: flp, msg: msg };
}

var LVR_VAR    = 'LVR_VAR';
var LVR_INDEX  = 'LVR_INDEX';
var LVR_SLICE  = 'LVR_SLICE';
var LVR_LIST   = 'LVR_LIST';

function lvr_var(flp, vlc){
	return { type: LVR_VAR, flp: flp, vlc: vlc };
}

function lvr_index(flp, obj, key){
	return { type: LVR_INDEX, flp: flp, obj: obj, key: key };
}

function lvr_slice(flp, obj, start, len){
	return { type: LVR_SLICE, flp: flp, obj: obj, start: start, len: len };
}

function lvr_list(flp, body, rest){
	return { type: LVR_LIST, flp: flp, body: body, rest: rest };
}

var LVP_OK    = 'LVP_OK';
var LVP_ERROR = 'LVP_ERROR';

function lvp_ok(lv){
	return { type: LVP_OK, lv: lv };
}

function lvp_error(flp, msg){
	return { type: LVP_ERROR, flp: flp, msg: msg };
}

function lval_prepare(prg, sym, ex){
	switch (ex.type){
		case EXPR_NAMES: {
			var sl = symtbl_lookup(sym, ex.names);
			if (sl.type == STL_ERROR)
				return lvp_error(ex.flp, sl.msg);
			if (sl.nsn.type != NSN_VAR)
				return lvp_error(ex.flp, 'Invalid assignment');
			return lvp_ok(lvr_var(ex.flp, varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index)));
		} break;

		case EXPR_INDEX: {
			var oe = program_eval(prg, sym, ex.obj, false);
			if (oe.type == PER_ERROR)
				return lvp_error(oe.flp, oe.msg);
			var ke = program_eval(prg, sym, ex.key, false);
			if (ke.type == PER_ERROR)
				return lvp_error(ke.flp, ke.msg);
			return lvp_ok(lvr_index(ex.flp, oe.vlc, ke.vlc));
		} break;

		case EXPR_SLICE: {
			var se = program_sliceEval(prg, sym, ex);
			if (se.type == SER_ERROR)
				return lvp_error(se.flp, se.msg);
			return lvp_ok(lvr_slice(ex.flp, se.obj, se.start, se.len));
		} break;

		case EXPR_LIST: {
			if (ex.ex == null)
				return lvp_error(ex.flp, 'Invalid assignment');
			var body = [];
			var rest = null;
			if (ex.ex.type == EXPR_GROUP){
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
		} break;

		default:
			throw new Error('Invalid lval_prepare type');
	}
	return lvp_error(ex.flp, 'Invalid assignment');
}

var PLR_OK    = 'PLR_OK';
var PLR_ERROR = 'PLR_ERROR';

function plr_ok(){
	return { type: PLR_OK };
}

function plr_error(flp, msg){
	return { type: PLR_ERROR, flp: flp, msg: msg };
}

function program_evalLvalue(prg, sym, lv, vlc){
	switch (lv.type){
		case LVR_VAR:
			op_move(prg.ops, lv.vlc, vlc);
			return plr_ok();

		case LVR_INDEX: {
			op_setat(prg.ops, lv.obj, lv.key, vlc);
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.key);
			return plr_ok();
		} break;

		case LVR_SLICE: {
			op_splice(prg.ops, lv.obj, lv.start, lv.len, vlc);
			symtbl_clearTemp(sym, lv.obj);
			symtbl_clearTemp(sym, lv.start);
			symtbl_clearTemp(sym, lv.len);
			return plr_ok();
		} break;

		case LVR_LIST: {
			if (lv.body.length > 256)
				return plr_error(lv.flp, 'Cannot decompose list over 256 elements');
			for (var i = 0; i < lv.body.length; i++){
				var t = symtbl_addTemp(sym);
				op_num(prg.ops, t, i);
				op_getat(prg.ops, t, vlc, t);
				var lr = program_evalLvalue(prg, sym, lv.body[i], t);
				symtbl_clearTemp(sym, t);
				if (lr.type == PLR_ERROR)
					return lr;
			}
			if (lv.rest != null){
				var t1 = symtbl_addTemp(sym);
				var t2 = symtbl_addTemp(sym);
				op_num(prg.ops, t1, lv.body.length);
				op_unop(prg.ops, OP_SIZE, t2, vlc);
				op_binop(prg.ops, OP_SUB, t2, t2, t1);
				op_slice(prg.ops, t1, vlc, t1, t2);
				symtbl_clearTemp(sym, t2);
				var lr = program_evalLvalue(prg, sym, lv.rest, t1);
				symtbl_clearTemp(sym, t1);
				if (lr.type == PLR_ERROR)
					return lr;
			}
			return plr_ok();
		} break;
	}
	throw new Error('Bad lvalue type (this shouldn\'t happen)');
}

function program_eval(prg, sym, ex, autoclear){
	if (ex.type == EXPR_INFIX){
		var mutop = ks_toMutateOp(ex.k);
		if (ex.k == KS_EQU || (mutop >= 0 && ex.left.type != EXPR_LIST)){
			var lp = lval_prepare(prg, sym, ex.left);
			if (lp.type == LVP_ERROR)
				return per_error(lp.flp, lp.msg);
			var lv = lp.lv;
			switch (lv.type){
				case LVR_VAR: {
					if (ex.k == KS_EQU){
						var pr = program_evalInto(prg, sym, lv.vlc, ex.right);
						if (pr.type == PIR_ERROR)
							return per_error(pr.flp, pr.msg);
						return per_ok(lv.vlc);
					}
					var pr = program_eval(prg, sym, ex.right, false);
					if (pr.type == PER_ERROR)
						return pr;
					symtbl_clearTemp(sym, pr.vlc);
					op_binop(prg.ops, mutop, lv.vlc, lv.vlc, pr.vlc);
					return per_ok(lv.vlc);
				} break;

				case LVR_INDEX: {
					var pr = program_eval(prg, sym, ex.right, false);
					var out;
					if (pr.type == PER_ERROR)
						return pr;
					if (ex.k == KS_EQU){
						op_setat(prg.ops, lv.obj, lv.key, pr.vlc);
						out = pr.vlc;
					}
					else{
						out = symtbl_addTemp(sym);
						op_getat(prg.ops, out, lv.obj, lv.key);
						op_binop(prg.ops, mutop, out, out, pr.vlc);
						op_setat(prg.ops, lv.obj, lv.key, out);
						symtbl_clearTemp(sym, pr.vlc);
					}
					symtbl_clearTemp(sym, lv.obj);
					symtbl_clearTemp(sym, lv.key);
					if (autoclear)
						symtbl_clearTemp(sym, out);
					return per_ok(out);
				} break;

				case LVR_SLICE: {
					var pr = program_eval(prg, sym, ex.right, false);
					if (pr.type == PER_ERROR)
						return pr;
					var ovlc = program_evalLvalueSlice(prg, sym, lv, pr.vlc, mutop, null);
					if (autoclear)
						symtbl_clearTemp(sym, ovlc);
					return per_ok(ovlc);
				} break;

				case LVR_LIST: {
					// if we're here, then we know we're doing assignment, based on the `if` above
					var pr = program_eval(prg, sym, ex.right, false);
					if (pr.type == PER_ERROR)
						return pr;
					var lr = program_evalLvalue(prg, sym, lv, pr.vlc);
					if (lr.type == PLR_ERROR)
						return per_error(lr.flp, lr.msg);
					if (autoclear)
						symtbl_clearTemp(sym, pr.vlc);
					return per_ok(pr.vlc);
				} break;
			}
		}
		else if (ex.k == KS_AMP2EQU){
			throw 'TODO: program_eval AND equal';
		}
		else if (ex.k == KS_PIPE2EQU){
			throw 'TODO: program_Eval PIPE equal';
		}
	}
	else if (ex.type == EXPR_NAMES){
		var sl = symtbl_lookup(sym, ex.names);
		if (sl.type == STL_ERROR)
			return per_error(ex.flp, sl.msg);
		if (sl.nsn.type == NSN_VAR)
			return per_ok(varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index));
		// otherwise, fall through and evaluate the results into a temp
	}
	else if (ex.type == EXPR_VAR)
		return per_ok(ex.vlc);
	var tmp = symtbl_addTemp(sym);
	if (autoclear)
		symtbl_clearTemp(sym, tmp);
	var pr = program_evalInto(prg, sym, tmp, ex);
	if (pr.type == PIR_ERROR)
		return per_error(pr.flp, pr.msg);
	return per_ok(tmp);
}

var PEM_OK    = 'PEM_OK';
var PEM_ERROR = 'PEM_ERROR';

function pem_ok(){
	return { type: PEM_OK };
}

function pem_error(flp, msg){
	return { type: PEM_ERROR, flp: flp, msg: msg };
}

function program_evalEmpty(prg, sym, ex){
	if (ex.type == EXPR_NIL || ex.type == EXPR_NUM || ex.type == EXPR_STR || ex.type == EXPR_VAR)
		return pem_ok();
	else if (ex.type == EXPR_NAMES){
		var sl = symtbl_lookup(sym, ex.names);
		if (sl.type == STL_ERROR)
			return pem_error(ex.flp, sl.msg);
		switch (sl.nsn.type){
			case NSN_VAR:
				return pem_ok();

			case NSN_CMD_LOCAL:
			case NSN_CMD_NATIVE:
			case NSN_CMD_OPCODE: {
				var t = symtbl_addTemp(sym);
				symtbl_clearTemp(sym, t);
				var pr = program_callEval(prg, sym, t, sl.nsn, null, null, ex.flp);
				if (pr.type == PCE_ERROR)
					return pem_error(pr.flp, pr.msg);
				return pem_ok();
			} break;

			case NSN_NAMESPACE:
				return pem_error(ex.flp, 'Cannot evaluate namespace');
		}
		throw new Error('Bad NSN type (this shouldn\'t happen)');
	}
	// TODO: else if we are doing a list mutation, then we can generate better code because we
	// won't need to create the temporary that has the final result, i.e.,
	//   {x, y} += {1, 2}
	// we don't need to generate the returned list of {x+1, y+2}, we can just increment x and y
	// and be done with it (if we don't catch that here, then we'll generate the list, and throw it
	// away immediately)
	var pr = program_eval(prg, sym, ex, true);
	if (pr.type == PER_ERROR)
		return pem_error(pr.flp, pr.msg);
	return pem_ok();
}

function lval_addVars(sym, ex){
	switch (ex.type){
		case EXPR_NAMES: {
			var sr = symtbl_addVar(sym, ex.names);
			if (sr.type == STA_ERROR)
				return lva_error(ex.flp, sr.msg);
			return lvp_ok(lvr_var(ex.flp, sr.vlc));
		} break;
		case EXPR_LIST: {
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
		} break;
	}
	return lvp_error(ex.flp, 'Invalid assignment');
}

var PGR_OK    = 'PGR_OK';
var PGR_ERROR = 'PGR_ERROR';

function pgr_ok(){
	return { type: PGR_OK };
}

function pgr_error(flp, msg){
	return { type: PGR_ERROR, flp: flp, msg: msg };
}

function program_genBody(prg, sym, body){
	for (var i = 0; i < body.length; i++){
		var pr = program_gen(prg, sym, body[i]);
		if (pr.type == PGR_ERROR)
			return pr;
	}
	return pgr_ok();
}

function program_gen(prg, sym, stmt){
	switch (stmt.type){
		case AST_BREAK:
			if (sym.sc.lblBreak == null)
				return pgr_error(stmt.flp, 'Invalid `break`');
			label_jump(sym.sc.lblBreak, prg.ops);
			return pgr_ok();

		case AST_CONTINUE:
			if (sym.sc.lblContinue == null)
				return pgr_error(stmt.flp, 'Invalid `continue`');
			label_jump(sym.sc.lblContinue, prg.ops);
			return pgr_ok();

		case AST_DECLARE:
			for (var i = 0; i < stmt.decls.length; i++){
				var dc = stmt.decls[i];
				switch (dc.type){
					case DECL_LOCAL: {
						var lbl = label_new('%def');
						sym.sc.fr.lbls.push(lbl);
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
			}
			return pgr_ok();

		case AST_DEF: {
			var lr = symtbl_lookup(sym, stmt.names);
			var lbl;
			if (lr.type == STL_OK && lr.nsn.type != NSN_CMD_LOCAL){
				lbl = lr.nsn.lbl;
				if (!sym.overwrite && lbl.pos >= 0) // if already defined, error
					return pgr_error(stmt.flp, 'Cannot redefine "' + stmt.names.join('.') + '"');
			}
			else{
				lbl = label_new('%def');
				var sr = symtbl_addCmdLocal(sym, stmt.names, lbl);
				if (sr.type == STA_ERROR)
					return pgr_error(stmt.flp, sr.msg);
			}

			var skip = label_new('%after_def');
			label_jump(skip, prg.ops);

			label_declare(lbl, prg.ops);
			symtbl_pushFrame(sym);

			if (stmt.lvalues.length > 0){
				var t = symtbl_addTemp(sym);
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
							perfinit = label_new('%perfinit');
							doneinit = label_new('%doneinit');
							var skipinit = label_new('%skipinit');
							label_jump(skipinit, prg.ops);
							label_declare(perfinit, prg.ops);
							pr = program_eval(prg, sym, ex.right, false);
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
						op_getat(prg.ops, t, varloc_new(0, 0), t); // 0:0 are passed in arguments

						var finish = null;
						if (ex.right != null){
							finish = label_new('%finish');
							var passinit = label_new('%passinit');
							label_jumpFalse(perfinit, prg.ops, t);
							label_jump(passinit, prg.ops);
							label_declare(doneinit, prg.ops);
							var pe = program_evalLvalue(prg, sym, lr.lv, pr.vlc);
							if (pe.type == PLR_ERROR)
								return pgr_error(pe.flp, pe.msg);
							label_jump(finish, prg.ops);
							label_declare(passinit, prg.ops);
						}

						var pe = program_evalLvalue(prg, sym, lr.lv, t);
						if (pe.type == PLR_ERROR)
							return pgr_error(pe.flp, pe.msg);

						if (ex.right != null)
							label_declare(finish, prg.ops);
					}
					else if (i == stmt.lvalues.length - 1 && ex.type == EXPR_PREFIX &&
						ex.k == KS_PERIOD3){
						throw 'TODO: def lvalue KS_PERIOD3';
						// TODO: some sort of slice with 0:0
					}
					else
						throw new Error('Unknown lvalue type in def (this shouldn\'t happen)');
				}
				symtbl_clearTemp(sym, t);
			}

			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;

			if (stmt.body.length <= 0 || stmt.body[stmt.body.length - 1].type != AST_RETURN){
				var nil = symtbl_addTemp(sym);
				op_nil(prg.ops, nil);
				op_return(prg.ops, nil);
				symtbl_clearTemp(sym, nil);
			}

			symtbl_popFrame(sym);
			label_declare(skip, prg.ops);

			return pgr_ok();
		} break;

		case AST_DO_END: {
			symtbl_pushScope(sym);
			sym.sc.lblBreak = label_new('%do_break');
			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;
			label_declare(sym.sc.lblBreak, prg.ops);
			symtbl_popScope(sym);
			return pgr_ok();
		} break;

		case AST_DO_WHILE: {
			var top    = label_new('%dowhile_top');
			var cond   = label_new('%dowhile_cond');
			var finish = label_new('%dowhile_finish');

			symtbl_pushScope(sym);
			sym.sc.lblBreak = finish;
			sym.sc.lblContinue = cond;

			label_declare(top, prg.ops);

			var pr = program_genBody(prg, sym, stmt.doBody);
			if (pr.type == PGR_ERROR)
				return pr;

			label_declare(cond, prg.ops);
			var pe = program_eval(prg, sym, stmt.cond, false);
			if (pe.type == PER_ERROR)
				return pgr_error(pe.flp, pe.msg);
			label_jumpFalse(finish, prg.ops, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);

			sym.sc.lblContinue = top;

			pr = program_genBody(prg, sym, stmt.whileBody);
			if (pr.type == PGR_ERROR)
				return pr;

			label_jump(top, prg.ops);

			label_declare(finish, prg.ops);
			symtbl_popScope(sym);
			return pgr_ok();
		} break;

		case AST_FOR: {
			var pe = program_eval(prg, sym, stmt.ex, false);
			if (pe.type == PER_ERROR)
				return pgr_error(pe.flp, pe.msg);

			symtbl_pushScope(sym);

			var val_vlc;
			var idx_vlc;

			// load VLC's for the value and index
			if (stmt.forVar){
				var sr = symtbl_addVar(sym, stmt.names1);
				if (sr.type == STA_ERROR)
					return pgr_error(stmt.flp, sr.msg);
				val_vlc = sr.vlc;

				if (stmt.names2 == null)
					idx_vlc = symtbl_addTemp(sym);
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

				if (stmt.names2 == null)
					idx_vlc = symtbl_addTemp(sym);
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

			var top    = label_new('%for_top');
			var inc    = label_new('%for_inc');
			var finish = label_new('%for_finish');

			var t = symtbl_addTemp(sym);

			label_declare(top, prg.ops);

			op_unop(prg.ops, OP_SIZE, t, pe.vlc);
			op_binop(prg.ops, OP_LT, t, idx_vlc, t);
			label_jumpFalse(finish, prg.ops, t);

			op_getat(prg.ops, val_vlc, pe.vlc, idx_vlc);
			sym.sc.lblBreak = finish;
			sym.sc.lblContinue = inc;

			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;

			label_declare(inc, prg.ops);
			op_inc(prg.ops, idx_vlc);
			label_jump(top, prg.ops);

			label_declare(finish, prg.ops);
			symtbl_clearTemp(sym, t);
			symtbl_clearTemp(sym, idx_vlc);
			symtbl_clearTemp(sym, pe.vlc);
			symtbl_popScope(sym);
			return pgr_ok();
		} break;

		case AST_LOOP: {
			symtbl_pushScope(sym);
			sym.sc.lblContinue = label_new('%loop_continue');
			sym.sc.lblBreak = label_new('%loop_break');
			label_declare(sym.sc.lblContinue, prg.ops);
			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;
			label_jump(sym.sc.lblContinue, prg.ops);
			label_declare(sym.sc.lblBreak, prg.ops);
			symtbl_popScope(sym);
			return pgr_ok();
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

		case AST_IF: {
			var nextcond = null;
			var ifdone = label_new('%ifdone');
			for (var i = 0; i < stmt.conds.length; i++){
				if (i > 0)
					label_declare(nextcond, prg.ops);
				nextcond = label_new('%nextcond');
				var pr = program_eval(prg, sym, stmt.conds[i].ex, false);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.flp, pr.msg);
				label_jumpFalse(nextcond, prg.ops, pr.vlc);
				symtbl_clearTemp(sym, pr.vlc);

				symtbl_pushScope(sym);
				var pg = program_genBody(prg, sym, stmt.conds[i].body);
				if (pg.type == PGR_ERROR)
					return pg;
				symtbl_popScope(sym);
				label_jump(ifdone, prg.ops);
			}
			label_declare(nextcond, prg.ops);
			symtbl_pushScope(sym);
			var pg = program_genBody(prg, sym, stmt.elseBody);
			if (pg.type == PGR_ERROR)
				return pg;
			symtbl_popScope(sym);
			label_declare(ifdone, prg.ops);
			return pgr_ok();
		} break;

		case AST_INCLUDE:
			throw new Error('Cannot generate code for include (this shouldn\'t happen)');

		case AST_NAMESPACE: {
			var sr = symtbl_pushNamespace(sym, stmt.names);
			if (sr.type == SPN_ERROR)
				return pgr_error(stmt.flp, sr.msg);
			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;
			symtbl_popNamespace(sym);
			return pgr_ok();
		} break;

		case AST_RETURN: {
			var pr = program_eval(prg, sym, stmt.ex, false);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.flp, pr.msg);
			symtbl_clearTemp(sym, pr.vlc);
			op_return(prg.ops, pr.vlc);
			return pgr_ok();
		} break;

		case AST_USING: {
			for (var i = 0; i < stmt.namesList.length; i++){
				var sr = symtbl_findNamespace(sym, stmt.namesList[i], stmt.namesList[i].length);
				if (sr.type == SFN_ERROR)
					return pgr_error(stmt.flp, sr.msg);
				var found = false;
				for (var j = 0; j < sym.sc.ns.usings.length && !found; j++);
					found = sym.sc.ns.usings[j] == sr.ns;
				if (!found)
					sym.sc.ns.usings.push(sr.ns);
			}
			return pgr_ok();
		} break;

		case AST_VAR:
			for (var i = 0; i < stmt.lvalues.length; i++){
				var ex = stmt.lvalues[i];
				if (ex.type != EXPR_INFIX)
					throw new Error('Var expression should be EXPR_INFIX (this shouldn\'t happen)');
				var pr = null;
				if (ex.right != null){
					pr = program_eval(prg, sym, ex.right, false);
					if (pr.type == PER_ERROR)
						return pgr_error(pr.flp, pr.msg);
				}
				var lr = lval_addVars(sym, ex.left);
				if (lr.type == LVP_ERROR)
					return pgr_error(lr.flp, lr.msg);
				if (ex.right != null){
					var pe = program_evalLvalue(prg, sym, lr.lv, pr.vlc);
					if (pe.type == PLR_ERROR)
						return pgr_error(pe.flp, pe.msg);
					symtbl_clearTemp(sym, pr.vlc);
				}
			}
			return pgr_ok();

		case AST_EVAL: {
			var pr = program_evalEmpty(prg, sym, stmt.ex);
			if (pr.type == PEM_ERROR)
				return pgr_error(pr.flp, pr.msg);
			return pgr_ok();
		} break;

		case AST_LABEL: {
			for (var i = 0; i < sym.fr.lbls.length; i++){
				var lbl = sym.fr.lbls[i];
				if (lbl.name == stmt.ident)
					return pgr_error(stmt.flp, 'Cannot redclare label "' + stmt.ident + '"');
			}
			var lbl = label_new(stmt.ident);
			label_declare(lbl, prg.ops);
			sym.fr.lbls.push(lbl);
			return pgr_ok();
		} break;
	}
}

//
// context
//

function context_new(prg){
	return {
		prg: prg,
		callStack: [],
		lexStack: [new Array(prg.initFrameSize)],
		lexIndex: 0,
		pc: 0
	};
}

var CRR_DONE   = 'CRR_DONE';
var CRR_PAUSED = 'CRR_PAUSED';
var CRR_ERROR  = 'CRR_ERROR';

function context_run(ctx){
	throw 'TODO: execute';
}

//
// compiler
//

/*

Example Usage:

	Note: the API user is in charge of file locating and reading

	var cmp = compiler_new(false);

	function process(){
		while (true){
			var cm = compiler_process(cmp);
			if (cm.type == CMA_OK)
				break;
			else if (cm.type == CMA_ERROR)
				throw new Error(cm.msg);
			else if (cm.type == CMA_INCLUDE)
				processFile(cm.file);
		}
	}

	function processFile(file){
		var cf = compiler_pushFile(cmp, file);
		if (cf.type == CMF_ERROR)
			throw new Error(cf.msg);
		while (fileHasData){
			compiler_add(cmp, "someFileDataAsString");
			// and/or:
			compiler_addBytes(cmp, [some, file, data, as, bytes]);

			// incremental processing (optional):
			process();
		}
		compiler_popFile(cmp);
		process();
	}

	processFile('./start-file');

If doing a REPL, pass `true` into `compiler_new`, and push your first file as `null` for the name

*/

var UTF8 = require('./utf8');

function comppr_new(flp, tks){
	return { flp: flp, tks: tks };
}

function compiler_new(repl){
	var sym = symtbl_new(repl);
	symtbl_loadStdlib(sym);
	return {
		pr: parser_new(),
		file: null,
		repl: repl,
		prg: program_new(),
		sym: sym
	};
}

var CMA_OK      = 'CMA_OK';
var CMA_INCLUDE = 'CMA_INCLUDE';
var CMA_ERROR   = 'CMA_ERROR';

function cma_ok(){
	return { type: CMA_OK };
}

function cma_include(file){
	return { type: CMA_INCLUDE, file: file };
}

function cma_error(msg){
	return { type: CMA_ERROR, msg: msg };
}

function compiler_process(cmp){
	if (cmp.file.incls.length > 0)
		return cma_include(cmp.file.incls[0].file);
	var cmprs = cmp.file.cmprs;
	for (var c = 0; c < cmprs.length; c++){
		var flp = cmprs[c].flp;
		var tks = cmprs[c].tks;
		for (var i = 0; i < tks.length; i++){
			var tk = tks[i];
			if (tk.type == TOK_ERROR){
				cmprs.splice(0, c);
				tks.splice(0, i + 1);
				return cma_error(filepos_err(flp, tk.msg));
			}
			var res = parser_add(cmp.pr, tk, flp);
			if (res.type == PRR_MORE)
				continue;
			else if (res.type == PRR_ERROR){
				cmprs.splice(0, c);
				tks.splice(0, i + 1);
				cmp.pr = parser_new(); // reset the parser
				return cma_error(filepos_err(flp, res.msg));
			}

			if (res.stmt.type == AST_INCLUDE){
				// cmp.file.incls is guaranteed to be empty, so just overwrite it
				cmp.file.incls = res.stmt.incls;
				cmprs.splice(0, c);
				tks.splice(0, i + 1);
				return cma_include(cmp.file.incls[0].file);
			}
			else{
				var pr = program_gen(cmp.prg, cmp.sym, res.stmt);
				if (pr.type == PGR_ERROR){
					cmprs.splice(0, c);
					tks.splice(0, i + 1);
					return cma_error(filepos_err(pr.flp, pr.msg));
				}
			}
		}
	}

	cmp.file.cmprs = [];

	if (cmp.file.popped){
		cmp.file = cmp.file.next;
		if (cmp.file != null && cmp.file.incls.length > 0){
			// assume user is finished with the next included file
			if (cmp.file.incls[0].names != null)
				symtbl_popNamespace(cmp.sym);
			cmp.file.incls.shift();
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

function compiler_pushFile(cmp, file){
	if (cmp.file != null && cmp.file.incls.length > 0){
		// assume user is pushing the next included file
		if (cmp.file.incls[0].names != null){
			var sr = symtbl_pushNamespace(cmp.sym, cmp.file.incls[0].names);
			if (sr.type == SPN_ERROR)
				return cmf_error(filepos_err(cmp.file.incls[0].flp, sr.msg));
		}
	}
	cmp.file = {
		flp: filepos_new(file, 1, 1),
		lastret: false,
		lx: lex_new(),
		incls: [],
		cmprs: [],
		popped: false,
		next: cmp.file
	};
	return cmf_ok();
}

function compiler_popFile(cmp){
	var tks = [];
	lex_close(cmp.file.lx, tks);
	cmp.file.cmprs.push(comppr_new(cmp.file.flp, tks));
	cmp.file.popped = true;
}

function compiler_add(cmp, str){
	compiler_addBytes(cmp, UTF8.encode(str));
}

function compiler_addBytes(cmp, bytes){
	for (var i = 0; i < bytes.length; i++){
		var flp = filepos_newCopy(cmp.file.flp);

		var ch = String.fromCharCode(bytes[i]);

		// calculate future line/chr
		if (ch == '\r'){
			cmp.file.lastret = true;
			cmp.file.flp.line++;
			cmp.file.flp.chr = 1;
		}
		else{
			if (ch == '\n'){
				if (!cmp.file.lastret){
					cmp.file.flp.line++;
					cmp.file.flp.chr = 1;
				}
			}
			else
				cmp.file.flp.chr++;
			cmp.file.lastret = false;
		}

		var tks = [];
		lex_add(cmp.file.lx, ch, tks);
		if (tks.length > 0)
			cmp.file.cmprs.push(comppr_new(flp, tks));
	}
}

function compiler_level(cmp){
	return cmp.pr.level;
}

//
// JavaScript API
//

function isPromise(obj){
	return !!obj && (typeof obj === 'object' || typeof obj === 'function') &&
		typeof obj.then === 'function';
}

module.exports = {
	repl: function(prompt, fileResolve, fileRead){
		var cmp = compiler_new(true);
		compiler_pushFile(cmp, null);
		var depth = 0;

		function process(){
			while (true){
				var cm = compiler_process(cmp);
				if (cm.type == CMA_OK){
					if (depth > 0){
						depth--;
						continue;
					}
					prompt(compiler_level(cmp), function(data){
						compiler_add(cmp, data);
						process();
					});
					break;
				}
				else if (cm.type == CMA_ERROR)
					console.log('Error:', cm.msg);
				else if (cm.type == CMA_INCLUDE){
					depth++;
					var f = '';
					for (var i = 0; i < cm.file.length; i++)
						f += String.fromCharCode(cm.file[i]);
					var r = fileResolve(f, cmp.file.flp.file);
					if (isPromise(r))
						r.then(fileResolved).catch(incError);
					else
						fileResolved(r);
					break;
				}
			}
		}

		function fileResolved(file){
			var r = fileRead(file);
			if (isPromise(r))
				r.then(function(data){ fileLoaded(file, data); }).catch(incError);
			else
				fileLoaded(file, r);
		}

		function fileLoaded(file, data){
			var cf = compiler_pushFile(cmp, file);
			if (cf.type == CMF_ERROR)
				throw new Error(cf.msg);
			compiler_add(cmp, data);
			compiler_popFile(cmp);
			process();
		}

		function incError(err){
			console.log(err.toString());
			compiler_pushFile(cmp, 'failure');
			compiler_popFile(cmp);
			process();
		}

		process();
	}
};
