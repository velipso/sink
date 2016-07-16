// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

module.exports = {
	NOP         : 0x00, //
	NIL         : 0x01, // [TGT]
	MOVE        : 0x02, // [TGT], [SRC]
	NUM_POS     : 0x03, // [TGT], [VALUE]
	NUM_NEG     : 0x04, // [TGT], [VALUE]
	NUM_TBL     : 0x05, // [TGT], [INDEX]
	CAT         : 0x06, // [TGT], [SRC1], [SRC2]

	SAY         : 0x30, // [TGT], [SRC]
	ASK         : 0x31, // [TGT], [SRC]
	NUM_FLOOR   : 0x32, // [TGT], [SRC]
	NUM_CEIL    : 0x33, // [TGT], [SRC]
	NUM_ROUND   : 0x34, // [TGT], [SRC]
	NUM_SIN     : 0x35, // [TGT], [SRC]
	NUM_COS     : 0x36, // [TGT], [SRC]
	NUM_TAN     : 0x37, // [TGT], [SRC]
	NUM_ASIN    : 0x38, // [TGT], [SRC]
	NUM_ACOS    : 0x39, // [TGT], [SRC]
	NUM_ATAN    : 0x3A, // [TGT], [SRC]
	NUM_ATAN2   : 0x3B, // [TGT], [SRC1], [SRC2]
	NUM_LOG     : 0x3C, // [TGT], [SRC]
	NUM_LOG2    : 0x3D, // [TGT], [SRC]
	NUM_LOG10   : 0x3E, // [TGT], [SRC]
	NUM_ABS     : 0x3F, // [TGT], [SRC]
	NUM_PI      : 0x40, // [TGT]
	NUM_TAU     : 0x41, // [TGT]
	NUM_LERP    : 0x42, // [TGT], [SRC1], [SRC2], [SRC3]
	NUM_MAX     : 0x43, // [TGT], [SRC]
	NUM_MIN     : 0x44, // [TGT], [SRC]
	LIST_NEW    : 0x45, // [TGT], [SRC1], [SRC2]
	LIST_FIND   : 0x46, // [TGT], [SRC1], [SRC2], [SRC3]
	LIST_FINDREV: 0x47, // [TGT], [SRC1], [SRC2], [SRC3]
	LIST_REV    : 0x48, // [SRC]
	LIST_JOIN   : 0x49, // [TGT], [SRC1], [SRC2]
};