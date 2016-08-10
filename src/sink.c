// (c) Cyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdio.h>
#include <math.h>

#ifdef SINK_MACOSX
#	include <strings.h>  // ffsll
#	define BITSCAN_FFSLL
#else
#	error Unknown platform
	// if windows, looks like you'll want:
	// _BitScanForward64 from intrin.h
#endif

#ifdef SINK_DEBUG
#	undef NDEBUG
#	include <assert.h>
#	define debug(msg)       printf("> %s: %s\n", __func__, msg)
#	define debugf(msg, ...) printf("> %s: " msg "\n", __func__, __VA_ARGS__)
#else
#	define NDEBUG
#	include <assert.h>
#	define debug(msg)
#	define debugf(msg, ...)
#endif

static inline void *mem_prod_alloc(size_t s){
	void *p = SINK_ALLOC(s);
	if (p == NULL){
		SINK_PANIC("Out of memory!");
	}
	return p;
}

static inline void *mem_prod_realloc(void *p, size_t s){
	p = SINK_REALLOC(p, s);
	if (p == NULL){
		SINK_PANIC("Out of memory!");
	}
	return p;
}

static inline void mem_prod_free(void *p){
	SINK_FREE(p);
}

#ifdef SINK_DEBUG

//
// memory leak detector for debug build
//

typedef struct m_debug_memlist_struct {
	void *p;
	const char *file;
	int line;
	struct m_debug_memlist_struct *next;
} m_debug_memlist_st, *m_debug_memlist;

static m_debug_memlist memlist = NULL;

static void *mem_debug_alloc(size_t s, const char *file, int line){
	void *p = mem_prod_alloc(s);
	m_debug_memlist m = mem_prod_alloc(sizeof(m_debug_memlist_st));
	m->p = p;
	m->file = file;
	m->line = line;
	m->next = memlist;
	memlist = m;
	return p;
}

static void *mem_debug_realloc(void *p, size_t s, const char *file, int line){
	void *new_p;
	if (p == NULL){
		m_debug_memlist m = mem_prod_alloc(sizeof(m_debug_memlist_st));
		m->p = new_p = mem_prod_realloc(p, size);
		m->file = file;
		m->line = line;
		m->next = memlist;
		memlist = m;
	}
	else{
		m_debug_memlist m = memlist;
		bool found = false;
		while (m){
			if (m->p == p){
				found = true;
				m->p = new_p = mem_prod_realloc(p, size);
				m->file = file;
				m->line = line;
				break;
			}
			m = m->next;
		}
		if (!found){
			debugf("Reallocated a pointer that wasn't originally allocated\n"
				"File: %s\nLine: %d\n", file, line);
		}
	}
	return new_p;
}

static void mem_debug_free(void *p, const char *file, int line){
	if (p == NULL)
		return;
	m_debug_memlist *m = &memlist;
	bool found = false;
	while (*m){
		if ((*m)->p == p){
			found = true;
			mem_prod_free(p);
			void *f = *m;
			*m = (*m)->next;
			mem_prod_free(f);
			break;
		}
		m = &(*m)->next;
	}
	if (!found){
		debugf("Freeing a pointer that wasn't originally allocated\n"
			"File: %s\nLine: %d\n", file, line);
	}
}

static void mem_debug_done(){
	m_debug_memlist m = memlist;
	if (m){
		debug("Failed to free memory allocated on:\n");
		while (m){
			debugf("%s:%d\n", m->file, m->line);
			void *f = m;
			m = m->next;
			mem_prod_free(f->p);
			mem_prod_free(f);
		}
		memlist = NULL;
	}
	else
		debug("No memory leaks! :-)\n");
}

static void mem_free_func(void *p){
	mem_debug_free(p, "<indirect>", 0);
}

#	define mem_alloc(s)       mem_debug_alloc(s, __FILE__, __LINE__)
#	define mem_realloc(p, s)  mem_debug_realloc(p, s, __FILE__, __LINE__)
#	define mem_free(p)        mem_debug_free(p, __FILE__, __LINE__)
#	define mem_done()         mem_debug_done()
#else
#	define mem_alloc(s)       mem_prod_alloc(s)
#	define mem_realloc(p, s)  mem_prod_realloc(p, s)
#	define mem_free(p)        mem_prod_free(p)
#	define mem_free_func      mem_prod_free
#	define mem_done()
#endif

//
// string creation
//

static char *format(char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = mem_alloc(s + 1);
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	return buf;
}

//
// variable length list implementations
//

typedef struct {
	uint8_t *bytes;
	int size;
	int count;
} list_byte_st, *list_byte;

const static int list_byte_grow = 200;

static list_byte list_byte_new(){
	list_byte b = mem_alloc(sizeof(list_byte_st));
	b->size = 0;
	b->count = list_byte_grow;
	b->bytes = mem_alloc(sizeof(uint8_t) * b->count);
	return b;
}

static inline void list_byte_push(list_byte b, int v){
	if (b->size + 1 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v;
}

static inline void list_byte_push2(list_byte b, int v1, int v2){
	if (b->size + 2 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
}

static inline void list_byte_push3(list_byte b, int v1, int v2, int v3){
	if (b->size + 3 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
}

static inline void list_byte_push4(list_byte b, int v1, int v2, int v3, int v4){
	if (b->size + 4 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
	b->bytes[b->size++] = (uint8_t)v4;
}

static inline void list_byte_push5(list_byte b, int v1, int v2, int v3, int v4, int v5){
	if (b->size + 5 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
	b->bytes[b->size++] = (uint8_t)v4;
	b->bytes[b->size++] = (uint8_t)v5;
}

static inline void list_byte_push7(list_byte b, int v1, int v2, int v3, int v4, int v5, int v6,
	int v7){
	if (b->size + 7 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
	b->bytes[b->size++] = (uint8_t)v4;
	b->bytes[b->size++] = (uint8_t)v5;
	b->bytes[b->size++] = (uint8_t)v6;
	b->bytes[b->size++] = (uint8_t)v7;
}

static inline void list_byte_push9(list_byte b, int v1, int v2, int v3, int v4, int v5, int v6,
	int v7, int v8, int v9){
	if (b->size + 9 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
	b->bytes[b->size++] = (uint8_t)v4;
	b->bytes[b->size++] = (uint8_t)v5;
	b->bytes[b->size++] = (uint8_t)v6;
	b->bytes[b->size++] = (uint8_t)v7;
	b->bytes[b->size++] = (uint8_t)v8;
	b->bytes[b->size++] = (uint8_t)v9;
}

static inline void list_byte_push10(list_byte b, int v1, int v2, int v3, int v4, int v5, int v6,
	int v7, int v8, int v9, int v10){
	if (b->size + 10 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = (uint8_t)v1;
	b->bytes[b->size++] = (uint8_t)v2;
	b->bytes[b->size++] = (uint8_t)v3;
	b->bytes[b->size++] = (uint8_t)v4;
	b->bytes[b->size++] = (uint8_t)v5;
	b->bytes[b->size++] = (uint8_t)v6;
	b->bytes[b->size++] = (uint8_t)v7;
	b->bytes[b->size++] = (uint8_t)v8;
	b->bytes[b->size++] = (uint8_t)v9;
	b->bytes[b->size++] = (uint8_t)v10;
}

static inline void list_byte_free(list_byte b){
	mem_free(b->bytes);
	mem_free(b);
}

static bool byteequ(list_byte b, const char *str){
	int i;
	for (i = 0; str[i] != 0; i++){
		if (b->size <= i)
			return false;
		if (b->bytes[i] != (uint8_t)str[i])
			return false;
	}
	return b->size == i;
}

typedef void (*free_func)(void *p);

typedef struct {
	void **ptrs;
	free_func f_free;
	int size;
	int count;
} list_ptr_st, *list_ptr;

const static int list_ptr_grow = 200;

static list_ptr list_ptr_new(free_func f_free){
	list_ptr ls = mem_alloc(sizeof(list_ptr_st));
	ls->size = 0;
	ls->count = list_ptr_grow;
	ls->ptrs = mem_alloc(sizeof(void *) * ls->count);
	ls->f_free = f_free;
	return ls;
}

static void list_ptr_append(list_ptr ls, list_ptr data){
	if (data->size <= 0)
		return;
	if (ls->size + data->size >= ls->count){
		ls->count = ls->size + data->size + list_ptr_grow;
		ls->ptrs = mem_realloc(ls->ptrs, sizeof(void *) * ls->count);
	}
	memcpy(&ls->ptrs[ls->size], data->ptrs, sizeof(void *) * data->size);
	ls->size += data->size;
}

static void list_ptr_push(list_ptr ls, void *p){
	if (ls->size >= ls->count){
		ls->count += list_ptr_grow;
		ls->ptrs = mem_realloc(ls->ptrs, sizeof(void *) * ls->count);
	}
	ls->ptrs[ls->size++] = p;
}

static inline void *list_ptr_pop(list_ptr ls){
	return ls->ptrs[--ls->size];
}

static void list_ptr_free(list_ptr ls){
	if (ls->f_free){
		while (ls->size > 0)
			ls->f_free(ls->ptrs[--ls->size]);
	}
	mem_free(ls->ptrs);
	mem_free(ls);
}

// Values are jammed into NaNs, like so:
//
// NaN (64 bit):
// 01111111 11111000 00000000 TTTTTTTT  0FFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF
//
// QNAN:  T = 0, F = 0
// NIL :  T = 1, F = 0
// STR :  T = 2, F = table index
// LIST:  T = 3, F = table index

const sink_val SINK_QNAN       = { .u = UINT64_C(0x7FF8000000000000) };
const sink_val SINK_NIL        = { .u = UINT64_C(0x7FF8000100000000) };
static const uint64_t TAG_STR  = UINT64_C(0x7FF8000200000000);
static const uint64_t TAG_LIST = UINT64_C(0x7FF8000300000000);
static const uint64_t TAG_MASK = UINT64_C(0xFFFFFFFF00000000);

static inline bool is_nil(sink_val v){
	return v.u != SINK_NIL.u;
}

static inline bool is_str(sink_val v){
	return (v.u & TAG_MASK) == TAG_STR;
}

static inline bool is_list(sink_val v){
	return (v.u & TAG_MASK) == TAG_LIST;
}

static inline bool is_num(sink_val v){
	return !is_nil(v) && !is_list(v) && !is_str(v);
}

static inline int_least32_t val_index(sink_val v){
	return (int_least32_t)(v.u & UINT64_C(0x000000007FFFFFFF));
}

static inline sink_val val_bool(bool x){
	return x ? (sink_val){ .f = 1 } : SINK_NIL;
}

typedef struct {
	int fdiff;
	int index;
} varloc_st;

static inline varloc_st varloc_new(int fdiff, int index){
	return (varloc_st){ .fdiff = fdiff, .index = index };
}

//
// opcodes
//

typedef enum {
	OP_NOP            = 0x00, //
	OP_EXIT           = 0x01, // [SRC...]
	OP_ABORT          = 0x02, // [SRC...]
	OP_ABORTERR       = 0x03, // ERRNO
	OP_MOVE           = 0x04, // [TGT], [SRC]
	OP_INC            = 0x05, // [TGT/SRC]
	OP_NIL            = 0x06, // [TGT]
	OP_NUMPOS         = 0x07, // [TGT], [VALUE]
	OP_NUMNEG         = 0x08, // [TGT], [VALUE]
	OP_NUMTBL         = 0x09, // [TGT], [INDEX]
	OP_STR            = 0x0A, // [TGT], [INDEX]
	OP_LIST           = 0x0B, // [TGT], HINT
	OP_REST           = 0x0C, // [TGT], [SRC1], [SRC2]
	OP_NEG            = 0x0D, // [TGT], [SRC]
	OP_NOT            = 0x0E, // [TGT], [SRC]
	OP_SIZE           = 0x0F, // [TGT], [SRC]
	OP_TONUM          = 0x10, // [TGT], [SRC]
	OP_SHIFT          = 0x11, // [TGT], [SRC]
	OP_POP            = 0x12, // [TGT], [SRC]
	OP_ISNUM          = 0x13, // [TGT], [SRC]
	OP_ISSTR          = 0x14, // [TGT], [SRC]
	OP_ISLIST         = 0x15, // [TGT], [SRC]
	OP_ADD            = 0x16, // [TGT], [SRC1], [SRC2]
	OP_SUB            = 0x17, // [TGT], [SRC1], [SRC2]
	OP_MUL            = 0x18, // [TGT], [SRC1], [SRC2]
	OP_DIV            = 0x19, // [TGT], [SRC1], [SRC2]
	OP_MOD            = 0x1A, // [TGT], [SRC1], [SRC2]
	OP_POW            = 0x1B, // [TGT], [SRC1], [SRC2]
	OP_CAT            = 0x1C, // [TGT], [SRC1], [SRC2]
	OP_PUSH           = 0x1D, // [TGT], [SRC1], [SRC2]
	OP_UNSHIFT        = 0x1E, // [TGT], [SRC1], [SRC2]
	OP_APPEND         = 0x1F, // [TGT], [SRC1], [SRC2]
	OP_PREPEND        = 0x20, // [TGT], [SRC1], [SRC2]
	OP_LT             = 0x21, // [TGT], [SRC1], [SRC2]
	OP_LTE            = 0x22, // [TGT], [SRC1], [SRC2]
	OP_NEQ            = 0x23, // [TGT], [SRC1], [SRC2]
	OP_EQU            = 0x24, // [TGT], [SRC1], [SRC2]
	OP_GETAT          = 0x25, // [TGT], [SRC1], [SRC2]
	OP_SLICE          = 0x26, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_SETAT          = 0x27, // [SRC1], [SRC2], [SRC3]
	OP_SPLICE         = 0x28, // [SRC1], [SRC2], [SRC3], [SRC4]
	OP_JUMP           = 0x29, // [[LOCATION]]
	OP_JUMPTRUE       = 0x2A, // [SRC], [[LOCATION]]
	OP_JUMPFALSE      = 0x2B, // [SRC], [[LOCATION]]
	OP_CALL           = 0x2C, // [TGT], [SRC], LEVEL, [[LOCATION]]
	OP_NATIVE         = 0x2D, // [TGT], [SRC], [INDEX]
	OP_RETURN         = 0x2E, // [SRC]
	OP_SAY            = 0x2F, // [TGT], [SRC...]
	OP_WARN           = 0x30, // [TGT], [SRC...]
	OP_ASK            = 0x31, // [TGT], [SRC...]
	OP_NUM_ABS        = 0x32, // [TGT], [SRC]
	OP_NUM_SIGN       = 0x33, // [TGT], [SRC]
	OP_NUM_MAX        = 0x34, // [TGT], [SRC...]
	OP_NUM_MIN        = 0x35, // [TGT], [SRC...]
	OP_NUM_CLAMP      = 0x36, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_FLOOR      = 0x37, // [TGT], [SRC]
	OP_NUM_CEIL       = 0x38, // [TGT], [SRC]
	OP_NUM_ROUND      = 0x39, // [TGT], [SRC]
	OP_NUM_TRUNC      = 0x3A, // [TGT], [SRC]
	OP_NUM_NAN        = 0x3B, // [TGT]
	OP_NUM_INF        = 0x3C, // [TGT]
	OP_NUM_ISNAN      = 0x3D, // [TGT], [SRC]
	OP_NUM_ISFINITE   = 0x3E, // [TGT], [SRC]
	OP_NUM_E          = 0x3F, // [TGT]
	OP_NUM_PI         = 0x40, // [TGT]
	OP_NUM_TAU        = 0x41, // [TGT]
	OP_NUM_SIN        = 0x42, // [TGT], [SRC]
	OP_NUM_COS        = 0x43, // [TGT], [SRC]
	OP_NUM_TAN        = 0x44, // [TGT], [SRC]
	OP_NUM_ASIN       = 0x45, // [TGT], [SRC]
	OP_NUM_ACOS       = 0x46, // [TGT], [SRC]
	OP_NUM_ATAN       = 0x47, // [TGT], [SRC]
	OP_NUM_ATAN2      = 0x48, // [TGT], [SRC1], [SRC2]
	OP_NUM_LOG        = 0x49, // [TGT], [SRC]
	OP_NUM_LOG2       = 0x4A, // [TGT], [SRC]
	OP_NUM_LOG10      = 0x4B, // [TGT], [SRC]
	OP_NUM_EXP        = 0x4C, // [TGT], [SRC]
	OP_NUM_LERP       = 0x4D, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_HEX        = 0x4E, // [TGT], [SRC1], [SRC2]
	OP_NUM_OCT        = 0x4F, // [TGT], [SRC1], [SRC2]
	OP_NUM_BIN        = 0x50, // [TGT], [SRC1], [SRC2]
	OP_INT_CAST       = 0x51, // [TGT], [SRC]
	OP_INT_NOT        = 0x52, // [TGT], [SRC]
	OP_INT_AND        = 0x53, // [TGT], [SRC1], [SRC2]
	OP_INT_OR         = 0x54, // [TGT], [SRC1], [SRC2]
	OP_INT_XOR        = 0x55, // [TGT], [SRC1], [SRC2]
	OP_INT_SHL        = 0x56, // [TGT], [SRC1], [SRC2]
	OP_INT_SHR        = 0x57, // [TGT], [SRC1], [SRC2]
	OP_INT_SAR        = 0x58, // [TGT], [SRC1], [SRC2]
	OP_INT_ADD        = 0x59, // [TGT], [SRC1], [SRC2]
	OP_INT_SUB        = 0x5A, // [TGT], [SRC1], [SRC2]
	OP_INT_MUL        = 0x5B, // [TGT], [SRC1], [SRC2]
	OP_INT_DIV        = 0x5C, // [TGT], [SRC1], [SRC2]
	OP_INT_MOD        = 0x5D, // [TGT], [SRC1], [SRC2]
	OP_INT_CLZ        = 0x5E, // [TGT], [SRC]
	OP_RAND_SEED      = 0x5F, // [TGT], [SRC]
	OP_RAND_SEEDAUTO  = 0x60, // [TGT]
	OP_RAND_INT       = 0x61, // [TGT]
	OP_RAND_NUM       = 0x62, // [TGT]
	OP_RAND_GETSTATE  = 0x63, // [TGT]
	OP_RAND_SETSTATE  = 0x64, // [TGT], [SRC]
	OP_RAND_PICK      = 0x65, // [TGT], [SRC]
	OP_RAND_SHUFFLE   = 0x66, // [TGT], [SRC]
	OP_STR_NEW        = 0x67, // [TGT], [SRC1], [SRC2]
	OP_STR_SPLIT      = 0x68, // [TGT], [SRC1], [SRC2]
	OP_STR_REPLACE    = 0x69, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_STARTSWITH = 0x6A, // [TGT], [SRC1], [SRC2]
	OP_STR_ENDSWITH   = 0x6B, // [TGT], [SRC1], [SRC2]
	OP_STR_PAD        = 0x6C, // [TGT], [SRC1], [SRC2]
	OP_STR_FIND       = 0x6D, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_FINDREV    = 0x6E, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_LOWER      = 0x6F, // [TGT], [SRC]
	OP_STR_UPPER      = 0x70, // [TGT], [SRC]
	OP_STR_TRIM       = 0x71, // [TGT], [SRC]
	OP_STR_REV        = 0x72, // [TGT], [SRC]
	OP_STR_LIST       = 0x73, // [TGT], [SRC]
	OP_STR_BYTE       = 0x74, // [TGT], [SRC1], [SRC2]
	OP_STR_HASH       = 0x75, // [TGT], [SRC1], [SRC2]
	OP_UTF8_VALID     = 0x76, // [TGT], [SRC]
	OP_UTF8_LIST      = 0x77, // [TGT], [SRC]
	OP_UTF8_STR       = 0x78, // [TGT], [SRC]
	OP_STRUCT_SIZE    = 0x79, // [TGT], [SRC]
	OP_STRUCT_STR     = 0x7A, // [TGT], [SRC1], [SRC2]
	OP_STRUCT_LIST    = 0x7B, // [TGT], [SRC1], [SRC2]
	OP_LIST_NEW       = 0x7C, // [TGT], [SRC1], [SRC2]
	OP_LIST_FIND      = 0x7D, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_FINDREV   = 0x7E, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_JOIN      = 0x7F, // [TGT], [SRC1], [SRC2]
	OP_LIST_REV       = 0x80, // [TGT], [SRC]
	OP_LIST_STR       = 0x81, // [TGT], [SRC]
	OP_LIST_SORT      = 0x82, // [TGT], [SRC]
	OP_LIST_SORTREV   = 0x83, // [TGT], [SRC]
	OP_LIST_SORTCMP   = 0x84, // [TGT], [SRC1], [SRC2]
	OP_PICKLE_VALID   = 0x85, // [TGT], [SRC]
	OP_PICKLE_STR     = 0x86, // [TGT], [SRC]
	OP_PICKLE_VAL     = 0x87, // [TGT], [SRC]

	// fake ops
	OP_GT             = 0x1F0,
	OP_GTE            = 0x1F1,
	OP_INVALID        = 0x1F2
} op_enum;

static inline void op_nop(list_byte b){
	debug("> NOP\n");
	list_byte_push(b, OP_NOP);
}

static inline void op_exit(list_byte b, varloc_st src){
	debugf("> EXIT %d:%d\n", src.fdiff, src.index);
	list_byte_push3(b, OP_EXIT, src.fdiff, src.index);
}

static inline void op_abort(list_byte b, varloc_st src){
	debugf("> ABORT %d:%d\n", src.fdiff, src.index);
	list_byte_push3(b, OP_ABORT, src.fdiff, src.index);
}

static inline void op_aborterr(list_byte b, int errno){
	debugf("> ABORTERR %d\n", errno);
	list_byte_push2(b, OP_ABORTERR, errno);
}

static inline void op_move(list_byte b, varloc_st tgt, varloc_st src){
	if (tgt.fdiff == src.fdiff && tgt.index == src.index)
		return;
	debugf("> MOVE %d:%d, %d:%d\n", tgt.fdiff, tgt.index, src.fdiff, src.index);
	list_byte_push5(b, OP_MOVE, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

static inline void op_inc(list_byte b, varloc_st src){
	debugf("> INC %d:%d\n", src.fdiff, src.index);
	list_byte_push3(b, OP_INC, src.fdiff, src.index);
}

static inline void op_nil(list_byte b, varloc_st tgt){
	debugf("> NIL %d:%d\n", tgt.fdiff, tgt.index);
	list_byte_push3(b, OP_NIL, tgt.fdiff, tgt.index);
}

static inline void op_num(list_byte b, varloc_st tgt, int num){
	debugf("> NUM %d:%d, %d\n", tgt.fdiff, tgt.index, num);
	if (num >= 0)
		list_byte_push5(b, OP_NUMPOS, tgt.fdiff, tgt.index, num % 256, num >> 8);
	else{
		num += 65536;
		list_byte_push5(b, OP_NUMNEG, tgt.fdiff, tgt.index, num % 256, num >> 8);
	}
}

static inline void op_num_tbl(list_byte b, varloc_st tgt, int index){
	debugf("> NUMTBL %d:%d, %d\n", tgt.fdiff, tgt.index, index);
	list_byte_push5(b, OP_NUMTBL, tgt.fdiff, tgt.index, index % 256, index >> 8);
}

static inline void op_str(list_byte b, varloc_st tgt, int index){
	debugf("> STR %d:%d, %d\n", tgt.fdiff, tgt.index, index);
	list_byte_push5(b, OP_STR, tgt.fdiff, tgt.index, index % 256, index >> 8);
}

static inline void op_list(list_byte b, varloc_st tgt, int hint){
	if (hint > 255)
		hint = 255;
	debugf("> LIST %d:%d, %d\n", tgt.fdiff, tgt.index, hint);
	list_byte_push4(b, OP_LIST, tgt.fdiff, tgt.index, hint);
}

static inline void op_rest(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2){
	debugf("> REST %d:%d, %d:%d, %d:%d\n", tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	list_byte_push7(b, OP_REST, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_unop(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src){
	#ifdef SINK_DEBUG
	const char *opstr = "???";
	if      (opcode == OP_NEG   ) opstr = "NEG";
	else if (opcode == OP_NOT   ) opstr = "NOT";
	else if (opcode == OP_SIZE  ) opstr = "SIZE";
	else if (opcode == OP_TONUM ) opstr = "TONUM";
	else if (opcode == OP_SHIFT ) opstr = "SHIFT";
	else if (opcode == OP_POP   ) opstr = "POP";
	else if (opcode == OP_ISNUM ) opstr = "ISNUM";
	else if (opcode == OP_ISSTR ) opstr = "ISSTR";
	else if (opcode == OP_ISLIST) opstr = "ISLIST";
	debugf("> %s %d:%d, %d:%d\n", opstr, tgt.fdiff, tgt.index, src.fdiff, src.index);
	#endif
	list_byte_push5(b, opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

static inline void op_binop(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2){
	// rewire GT to LT and GTE to LTE
	if (opcode == OP_GT){ // GT
		opcode = OP_LT;
		varloc_st t = src1;
		src1 = src2;
		src2 = t;
	}
	else if (opcode == OP_GTE){ // GTE
		opcode = OP_LTE;
		varloc_st t = src1;
		src1 = src2;
		src2 = t;
	}

	#ifdef SINK_DEBUG
	const char *opstr = "???";
	if      (opcode == OP_ADD    ) opstr = "ADD";
	else if (opcode == OP_SUB    ) opstr = "SUB";
	else if (opcode == OP_MUL    ) opstr = "MUL";
	else if (opcode == OP_DIV    ) opstr = "DIV";
	else if (opcode == OP_MOD    ) opstr = "MOD";
	else if (opcode == OP_POW    ) opstr = "POW";
	else if (opcode == OP_CAT    ) opstr = "CAT";
	else if (opcode == OP_PUSH   ) opstr = "PUSH";
	else if (opcode == OP_UNSHIFT) opstr = "UNSHIFT";
	else if (opcode == OP_APPEND ) opstr = "APPEND";
	else if (opcode == OP_PREPEND) opstr = "PREPEND";
	else if (opcode == OP_LT     ) opstr = "LT";
	else if (opcode == OP_LTE    ) opstr = "LTE";
	else if (opcode == OP_NEQ    ) opstr = "NEQ";
	else if (opcode == OP_EQU    ) opstr = "EQU";
	debugf("> %s %d:%d, %d:%d, %d:%d\n", opstr, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	#endif
	list_byte_push7(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_getat(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2){
	debugf("> GETAT %d:%d, %d:%d, %d:%d\n", tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	list_byte_push7(b, OP_GETAT, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_slice(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2,
	varloc_st src3){
	debugf("> SLICE %d:%d, %d:%d, %d:%d, %d:%d\n", tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
	list_byte_push9(b, OP_SLICE, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
}

static inline void op_setat(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3){
	debugf("> SETAT %d:%d, %d:%d, %d:%d\n", src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
	list_byte_push7(b, OP_SETAT, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

static inline void op_splice(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3,
	varloc_st src4){
	debugf("> SPLICE %d:%d, %d:%d, %d:%d, %d:%d\n", src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index, src4.fdiff, src4.index);
	list_byte_push9(b, OP_SPLICE, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index, src4.fdiff, src4.index);
}

static inline void op_jump(list_byte b, uint32_t index, const char *hint){
	debugf("> JUMP %s\n", hint);
	list_byte_push5(b, OP_JUMP,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_jumpTrue(list_byte b, varloc_st src, uint32_t index, const char *hint){
	debugf("> JUMPTRUE %d:%d, %s\n", src.fdiff, src.index, hint);
	list_byte_push7(b, OP_JUMPTRUE, src.fdiff, src.index,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_jumpFalse(list_byte b, varloc_st src, uint32_t index, const char *hint){
	debugf("> JUMPFALSE %d:%d, %s\n", src.fdiff, src.index, hint);
	list_byte_push7(b, OP_JUMPFALSE, src.fdiff, src.index,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_call(list_byte b, varloc_st ret, varloc_st arg, int level, uint32_t index,
	const char *hint){
	debugf("> CALL %d:%d, %d:%d, %d, %s\n", ret.fdiff, ret.index, arg.fdiff, arg.index, level, hint);
	list_byte_push10(b, OP_CALL, ret.fdiff, ret.index, arg.fdiff, arg.index, level,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_native(list_byte b, varloc_st ret, varloc_st arg, int index){
	debugf("> NATIVE %d:%d, %d:%d, %d\n", ret.fdiff, ret.index, arg.fdiff, arg.index, index);
	list_byte_push7(b, OP_NATIVE, ret.fdiff, ret.index, arg.fdiff, arg.index,
		index % 256, index >> 8);
}

static inline void op_return(list_byte b, varloc_st src){
	debugf("> RETURN %d:%d\n", src.fdiff, src.index);
	list_byte_push3(b, OP_RETURN, src.fdiff, src.index);
}

static inline void op_param0(list_byte b, op_enum opcode, varloc_st tgt){
	debugf("> 0x%02X %d:%d\n", opcode, tgt.fdiff, tgt.index);
	list_byte_push3(b, opcode, tgt.fdiff, tgt.index);
}

static inline void op_param1(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src){
	debugf("> 0x%02X %d:%d, %d:%d\n", opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
	list_byte_push5(b, opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

static inline void op_param2(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2){
	debugf("> 0x%02X %d:%d, %d:%d, %d:%d\n", opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	list_byte_push7(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_param3(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2, varloc_st src3){
	debugf("> 0x%02X %d:%d, %d:%d, %d:%d, %d:%d\n", opcode, tgt.fdiff, tgt.index,
		src1.fdiff, src1.index, src2.fdiff, src2.index, src3.fdiff, src3.index);
	list_byte_push9(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
}

//
// file position
//

typedef struct {
	const char *file;
	int line;
	int chr;
} filepos_st;

static inline filepos_st filepos_new(const char *file, int line, int chr){
	return (filepos_st){ .file = file, .line = line, .chr = chr };
}

static char *filepos_err(filepos_st flp, char *msg){
	if (flp.file == NULL)
		return format("%d:%d: %s", flp.line, flp.chr, msg);
	return format("%s:%d:%d: %s", flp.file, flp.line, flp.chr, msg);
}

//
// keywords/specials
//

typedef enum {
	KS_INVALID,
	KS_PLUS,
	KS_UNPLUS,
	KS_MINUS,
	KS_UNMINUS,
	KS_PERCENT,
	KS_STAR,
	KS_SLASH,
	KS_CARET,
	KS_AT,
	KS_AMP,
	KS_LT,
	KS_GT,
	KS_BANG,
	KS_EQU,
	KS_TILDE,
	KS_COLON,
	KS_COMMA,
	KS_PERIOD,
	KS_PIPE,
	KS_LPAREN,
	KS_LBRACKET,
	KS_LBRACE,
	KS_RPAREN,
	KS_RBRACKET,
	KS_RBRACE,
	KS_PLUSEQU,
	KS_MINUSEQU,
	KS_PERCENTEQU,
	KS_STAREQU,
	KS_SLASHEQU,
	KS_CARETEQU,
	KS_LTEQU,
	KS_GTEQU,
	KS_BANGEQU,
	KS_EQU2,
	KS_TILDEEQU,
	KS_TILDEPLUS,
	KS_PLUSTILDE,
	KS_TILDEMINUS,
	KS_MINUSTILDE,
	KS_AMP2,
	KS_PIPE2,
	KS_PERIOD3,
	KS_TILDE2PLUS,
	KS_PLUSTILDE2,
	KS_PIPE2EQU,
	KS_AMP2EQU,
	KS_BREAK,
	KS_CONTINUE,
	KS_DECLARE,
	KS_DEF,
	KS_DO,
	KS_ELSE,
	KS_ELSEIF,
	KS_END,
	KS_FOR,
	KS_GOTO,
	KS_IF,
	KS_INCLUDE,
	KS_NAMESPACE,
	KS_NIL,
	KS_RETURN,
	KS_TYPENUM,
	KS_TYPESTR,
	KS_TYPELIST,
	KS_USING,
	KS_VAR,
	KS_WHILE
} ks_enum;

static inline ks_enum ks_char(char c){
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

static inline ks_enum ks_char2(char c1, char c2){
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

static inline ks_enum ks_char3(char c1, char c2, char c3){
	if      (c1 == '.' && c2 == '.' && c3 == '.') return KS_PERIOD3;
	else if (c1 == '~' && c2 == '~' && c3 == '+') return KS_TILDE2PLUS;
	else if (c1 == '+' && c2 == '~' && c3 == '~') return KS_PLUSTILDE2;
	else if (c1 == '|' && c2 == '|' && c3 == '=') return KS_PIPE2EQU;
	else if (c1 == '&' && c2 == '&' && c3 == '=') return KS_AMP2EQU;
	return KS_INVALID;
}

static inline ks_enum ks_str(list_byte s){
	if      (byteequ(s, "break"    )) return KS_BREAK;
	else if (byteequ(s, "continue" )) return KS_CONTINUE;
	else if (byteequ(s, "declare"  )) return KS_DECLARE;
	else if (byteequ(s, "def"      )) return KS_DEF;
	else if (byteequ(s, "do"       )) return KS_DO;
	else if (byteequ(s, "else"     )) return KS_ELSE;
	else if (byteequ(s, "elseif"   )) return KS_ELSEIF;
	else if (byteequ(s, "end"      )) return KS_END;
	else if (byteequ(s, "for"      )) return KS_FOR;
	else if (byteequ(s, "goto"     )) return KS_GOTO;
	else if (byteequ(s, "if"       )) return KS_IF;
	else if (byteequ(s, "include"  )) return KS_INCLUDE;
	else if (byteequ(s, "namespace")) return KS_NAMESPACE;
	else if (byteequ(s, "nil"      )) return KS_NIL;
	else if (byteequ(s, "return"   )) return KS_RETURN;
	else if (byteequ(s, "typenum"  )) return KS_TYPENUM;
	else if (byteequ(s, "typestr"  )) return KS_TYPESTR;
	else if (byteequ(s, "typelist" )) return KS_TYPELIST;
	else if (byteequ(s, "using"    )) return KS_USING;
	else if (byteequ(s, "var"      )) return KS_VAR;
	else if (byteequ(s, "while"    )) return KS_WHILE;
	return KS_INVALID;
}

static inline op_enum ks_toUnaryOp(ks_enum k){
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
	return OP_INVALID;
}

static inline op_enum ks_toBinaryOp(ks_enum k){
	if      (k == KS_PLUS      ) return OP_ADD;
	else if (k == KS_MINUS     ) return OP_SUB;
	else if (k == KS_PERCENT   ) return OP_MOD;
	else if (k == KS_STAR      ) return OP_MUL;
	else if (k == KS_SLASH     ) return OP_DIV;
	else if (k == KS_CARET     ) return OP_POW;
	else if (k == KS_LT        ) return OP_LT;
	else if (k == KS_GT        ) return OP_GT;
	else if (k == KS_TILDE     ) return OP_CAT;
	else if (k == KS_LTEQU     ) return OP_LTE;
	else if (k == KS_GTEQU     ) return OP_GTE;
	else if (k == KS_BANGEQU   ) return OP_NEQ;
	else if (k == KS_EQU2      ) return OP_EQU;
	else if (k == KS_TILDEPLUS ) return OP_PUSH;
	else if (k == KS_PLUSTILDE ) return OP_UNSHIFT;
	else if (k == KS_TILDE2PLUS) return OP_APPEND;
	else if (k == KS_PLUSTILDE2) return OP_PREPEND;
	return OP_INVALID;
}

static inline op_enum ks_toMutateOp(ks_enum k){
	if      (k == KS_PLUSEQU   ) return OP_ADD;
	else if (k == KS_PERCENTEQU) return OP_MOD;
	else if (k == KS_MINUSEQU  ) return OP_SUB;
	else if (k == KS_STAREQU   ) return OP_MUL;
	else if (k == KS_SLASHEQU  ) return OP_DIV;
	else if (k == KS_CARETEQU  ) return OP_POW;
	else if (k == KS_TILDEEQU  ) return OP_CAT;
	return OP_INVALID;
}

//
// tokens
//

typedef enum {
	TOK_NEWLINE,
	TOK_KS,
	TOK_IDENT,
	TOK_NUM,
	TOK_STR,
	TOK_ERROR
} tok_enum;

typedef struct {
	tok_enum type;
	union {
		bool soft;
		ks_enum k;
		list_byte ident;
		double num;
		list_byte str;
		char *msg;
	} u;
} tok_st, *tok;

static void tok_free(tok tk){
	switch (tk->type){
		case TOK_NEWLINE:
		case TOK_KS:
			break;
		case TOK_IDENT:
			if (tk->u.ident)
				list_byte_free(tk->u.ident);
			break;
		case TOK_NUM:
			break;
		case TOK_STR:
			if (tk->u.str)
				list_byte_free(tk->u.str);
			break;
		case TOK_ERROR:
			if (tk->u.msg)
				mem_free(tk->u.msg);
			break;
	}
	mem_free(tk);
}

static inline tok tok_newline(bool soft){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_NEWLINE;
	tk->u.soft = soft;
	return tk;
}

static inline tok tok_ks(ks_enum k){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_KS;
	tk->u.k = k;
	return tk;
}

static inline tok tok_ident(list_byte ident){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_IDENT;
	tk->u.ident = ident;
	return tk;
}

static inline tok tok_num(double num){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_NUM;
	tk->u.num = num;
	return tk;
}

static inline tok tok_str(list_byte str){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_STR;
	tk->u.str = str;
	return tk;
}

static inline tok tok_error(char *msg){
	tok tk = mem_alloc(sizeof(tok_st));
	tk->type = TOK_ERROR;
	tk->u.msg = msg;
	return tk;
}

static inline bool tok_isKS(tok tk, ks_enum k){
	return tk->type == TOK_KS && tk->u.k == k;
}

static inline bool tok_isPre(tok tk){
	if (tk->type != TOK_KS)
		return false;
	ks_enum k = tk->u.k;
	return false ||
		k == KS_PLUS       ||
		k == KS_UNPLUS     ||
		k == KS_MINUS      ||
		k == KS_UNMINUS    ||
		k == KS_AMP        ||
		k == KS_BANG       ||
		k == KS_PERIOD3    ||
		k == KS_MINUSTILDE ||
		k == KS_TILDEMINUS ||
		k == KS_TYPENUM    ||
		k == KS_TYPESTR    ||
		k == KS_TYPELIST;
}

static inline bool tok_isMid(tok tk, bool allowComma, bool allowPipe){
	if (tk->type != TOK_KS)
		return false;
	ks_enum k = tk->u.k;
	return false ||
		k == KS_PLUS       ||
		k == KS_PLUSEQU    ||
		k == KS_MINUS      ||
		k == KS_MINUSEQU   ||
		k == KS_PERCENT    ||
		k == KS_PERCENTEQU ||
		k == KS_STAR       ||
		k == KS_STAREQU    ||
		k == KS_SLASH      ||
		k == KS_SLASHEQU   ||
		k == KS_CARET      ||
		k == KS_CARETEQU   ||
		k == KS_AT         ||
		k == KS_LT         ||
		k == KS_LTEQU      ||
		k == KS_GT         ||
		k == KS_GTEQU      ||
		k == KS_BANGEQU    ||
		k == KS_EQU        ||
		k == KS_EQU2       ||
		k == KS_TILDE      ||
		k == KS_TILDEEQU   ||
		k == KS_TILDEPLUS  ||
		k == KS_PLUSTILDE  ||
		k == KS_TILDE2PLUS ||
		k == KS_PLUSTILDE2 ||
		k == KS_AMP2       ||
		k == KS_PIPE2      ||
		k == KS_AMP2EQU    ||
		k == KS_PIPE2EQU   ||
		(allowComma && k == KS_COMMA) ||
		(allowPipe  && k == KS_PIPE );
}

static inline bool tok_isTerm(tok tk){
	return false ||
		(tk->type == TOK_KS &&
			(tk->u.k == KS_NIL || tk->u.k == KS_LPAREN || tk->u.k == KS_LBRACE)) ||
		tk->type == TOK_IDENT ||
		tk->type == TOK_NUM   ||
		tk->type == TOK_STR;
}

static inline bool tok_isPreBeforeMid(tok pre, tok mid){
	//assert(pre.type == TOK_KS);
	//assert(mid.type == TOK_KS);
	// -5^2 is -25, not 25
	if ((pre->u.k == KS_MINUS || pre->u.k == KS_UNMINUS) && mid->u.k == KS_CARET)
		return false;
	// otherwise, apply the Pre first
	return true;
}

static inline int tok_midPrecedence(tok tk){
	//assert(tk.type == TOK_KS);
	ks_enum k = tk->u.k;
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

static inline bool tok_isMidBeforeMid(tok lmid, tok rmid){
	//assert(lmid.type == TOK_KS);
	//assert(rmid.type == TOK_KS);
	int lp = tok_midPrecedence(lmid);
	int rp = tok_midPrecedence(rmid);
	if (lp < rp)
		return true;
	else if (lp > rp)
		return false;
	// otherwise, same precedence...
	if (lp == 20 || lp == 1) // mutation and pow are right to left
		return false;
	return true;
}

//
// lexer helper functions
//

static inline bool isSpace(char c){
	return c == ' ' || c == '\n' || c == '\r' || c == '\t';
}

static inline bool isAlpha(char c){
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

static inline bool isNum(char c){
	return c >= '0' && c <= '9';
}

static inline bool isIdentStart(char c){
	return isAlpha(c) || c == '_';
}

static inline bool isIdentBody(char c){
	return isIdentStart(c) || isNum(c);
}

static inline bool isHex(char c){
	return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

static inline int toHex(char c){
	if (isNum(c))
		return c - 48;
	else if (c >= 'a')
		return c - 87;
	return c - 55;
}

//
// lexer
//

typedef enum {
	LEX_START,
	LEX_COMMENT_LINE,
	LEX_BACKSLASH,
	LEX_RETURN,
	LEX_COMMENT_BLOCK,
	LEX_SPECIAL1,
	LEX_SPECIAL2,
	LEX_IDENT,
	LEX_NUM_0,
	LEX_NUM_2,
	LEX_NUM,
	LEX_NUM_FRAC,
	LEX_NUM_EXP,
	LEX_NUM_EXP_BODY,
	LEX_STR_BASIC,
	LEX_STR_BASIC_ESC,
	LEX_STR_INTERP,
	LEX_STR_INTERP_DLR,
	LEX_STR_INTERP_DLR_ID,
	LEX_STR_INTERP_ESC,
	LEX_STR_INTERP_ESC_HEX
} lex_enum;

typedef struct {
	lex_enum state;
	char chR;
	char ch1;
	char ch2;
	char ch3;
	char ch4;
	list_byte str;
	double num_val;
	double num_base;
	double num_frac;
	double num_flen;
	double num_esign;
	double num_eval;
	double num_elen;
	int str_depth;
	int str_hexval;
	int str_hexleft;
} lex_st, *lex;

static inline void lex_free(lex lx){
	if (lx->str)
		list_byte_free(lx->str);
	mem_free(lx);
}

static lex lex_new(){
	lex lx = mem_alloc(sizeof(lex_st));
	lx->state = LEX_START;
	lx->chR = 0;
	lx->ch1 = 0;
	lx->ch2 = 0;
	lx->ch3 = 0;
	lx->ch4 = 0;
	lx->str = NULL;
	lx->num_val = 0;
	lx->num_base = 0;
	lx->num_frac = 0;
	lx->num_flen = 0;
	lx->num_esign = 0;
	lx->num_eval = 0;
	lx->num_elen = 0;
	lx->str_depth = 0;
	lx->str_hexval = 0;
	lx->str_hexleft = 0;
	return lx;
}

static void lex_fwd(lex lx, char ch){
	lx->ch4 = lx->ch3;
	lx->ch3 = lx->ch2;
	lx->ch2 = lx->ch1;
	lx->ch1 = ch;
}

static void lex_rev(lex lx){
	lx->chR = lx->ch1;
	lx->ch1 = lx->ch2;
	lx->ch2 = lx->ch3;
	lx->ch3 = lx->ch4;
	lx->ch4 = 0;
}

static void lex_process(lex lx, list_ptr tks){
	char ch1 = lx->ch1;

	switch (lx->state){
		case LEX_START:
			if (ch1 == '#'){
				lx->state = LEX_COMMENT_LINE;
				list_ptr_push(tks, tok_newline(false));
			}
			else if (ks_char(ch1) != KS_INVALID){
				if (ch1 == '}' && lx->str_depth > 0){
					lx->str_depth--;
					lx->str = list_byte_new();
					lx->state = LEX_STR_INTERP;
					list_ptr_push(tks, tok_ks(KS_RPAREN));
					list_ptr_push(tks, tok_ks(KS_TILDE));
				}
				else
					lx->state = LEX_SPECIAL1;
			}
			else if (isIdentStart(ch1)){
				lx->str = list_byte_new();
				list_byte_push(lx->str, ch1);
				lx->state = LEX_IDENT;
			}
			else if (isNum(ch1)){
				lx->num_val = toHex(ch1);
				lx->num_base = 10;
				if (lx->num_val == 0)
					lx->state = LEX_NUM_0;
				else
					lx->state = LEX_NUM;
			}
			else if (ch1 == '\''){
				lx->str = list_byte_new();
				lx->state = LEX_STR_BASIC;
			}
			else if (ch1 == '"'){
				lx->str = list_byte_new();
				lx->state = LEX_STR_INTERP;
				list_ptr_push(tks, tok_ks(KS_LPAREN));
			}
			else if (ch1 == '\\')
				lx->state = LEX_BACKSLASH;
			else if (ch1 == '\r'){
				lx->state = LEX_RETURN;
				list_ptr_push(tks, tok_newline(false));
			}
			else if (ch1 == '\n' || ch1 == ';')
				list_ptr_push(tks, tok_newline(ch1 == ';'));
			else if (isSpace(ch1))
				/* do nothing */;
			else
				list_ptr_push(tks, tok_error(format("Unexpected character: %c", ch1)));
			break;

		case LEX_COMMENT_LINE:
			if (ch1 == '\r')
				lx->state = LEX_RETURN;
			else if (ch1 == '\n')
				lx->state = LEX_START;
			break;

		case LEX_BACKSLASH:
			if (ch1 == '#')
				lx->state = LEX_COMMENT_LINE;
			else if (ch1 == '\r')
				lx->state = LEX_RETURN;
			else if (ch1 == '\n')
				lx->state = LEX_START;
			else if (!isSpace(ch1))
				list_ptr_push(tks, tok_error(format("Invalid character after backslash")));
			break;

		case LEX_RETURN:
			lx->state = LEX_START;
			if (ch1 != '\n')
				lex_process(lx, tks);
			break;

		case LEX_COMMENT_BLOCK:
			if (lx->ch2 == '*' && ch1 == '/')
				lx->state = LEX_START;
			break;

		case LEX_SPECIAL1:
			if (ks_char(ch1) != KS_INVALID){
				if (lx->ch2 == '/' && ch1 == '*')
					lx->state = LEX_COMMENT_BLOCK;
				else
					lx->state = LEX_SPECIAL2;
			}
			else{
				ks_enum ks1 = ks_char(lx->ch2);
				if (ks1 != KS_INVALID){
					// hack to detect difference between binary and unary +/-
					if (ks1 == KS_PLUS){
						if (!isSpace(ch1) && isSpace(lx->ch3))
							ks1 = KS_UNPLUS;
					}
					else if (ks1 == KS_MINUS){
						if (!isSpace(ch1) && isSpace(lx->ch3))
							ks1 = KS_UNMINUS;
					}
					list_ptr_push(tks, tok_ks(ks1));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
				else
					list_ptr_push(tks, tok_error(format("Unexpected character: %c", lx->ch2)));
			}
			break;

		case LEX_SPECIAL2: {
			ks_enum ks3 = ks_char3(lx->ch3, lx->ch2, ch1);
			if (ks3 != KS_INVALID){
				lx->state = LEX_START;
				list_ptr_push(tks, tok_ks(ks3));
			}
			else{
				ks_enum ks2 = ks_char2(lx->ch3, lx->ch2);
				if (ks2 != KS_INVALID){
					list_ptr_push(tks, tok_ks(ks2));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
				else{
					ks_enum ks1 = ks_char(lx->ch3);
					if (ks1 != KS_INVALID){
						// hack to detect difference between binary and unary +/-
						if (ks1 == KS_PLUS){
							if (!isSpace(lx->ch2) && isSpace(lx->ch4))
								ks1 = KS_UNPLUS;
						}
						else if (ks1 == KS_MINUS){
							if (!isSpace(lx->ch2) && isSpace(lx->ch4))
								ks1 = KS_UNMINUS;
						}
						list_ptr_push(tks, tok_ks(ks1));
						lx->state = LEX_START;
						lex_rev(lx);
						lex_process(lx, tks);
						lex_fwd(lx, lx->chR);
						lex_process(lx, tks);
					}
					else
						list_ptr_push(tks, tok_error(format("Unexpected character: %c", lx->ch3)));
				}
			}
		} break;

		case LEX_IDENT:
			if (!isIdentBody(ch1)){
				ks_enum ksk = ks_str(lx->str);
				if (ksk != KS_INVALID){
					list_ptr_push(tks, tok_ks(ksk));
					list_byte_free(lx->str);
				}
				else
					list_ptr_push(tks, tok_ident(lx->str));
				lx->str = NULL;
				lx->state = LEX_START;
				lex_process(lx, tks);
			}
			else{
				list_byte_push(lx->str, ch1);
				if (lx->str->size > 1024)
					list_ptr_push(tks, tok_error(format("Identifier too long")));
			}
			break;

		case LEX_NUM_0:
			if (ch1 == 'b'){
				lx->num_base = 2;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == 'c'){
				lx->num_base = 8;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == 'x'){
				lx->num_base = 16;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == '_')
				lx->state = LEX_NUM;
			else if (ch1 == '.'){
				lx->num_frac = 0;
				lx->num_flen = 0;
				lx->state = LEX_NUM_FRAC;
			}
			else if (ch1 == 'e' || ch1 == 'E'){
				lx->num_frac = 0;
				lx->num_flen = 0;
				lx->num_esign = 0;
				lx->num_eval = 0;
				lx->num_elen = 0;
				lx->state = LEX_NUM_EXP;
			}
			else if (!isIdentStart(ch1)){
				list_ptr_push(tks, tok_num(0));
				lx->state = LEX_START;
				lex_process(lx, tks);
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM_2:
			if (isHex(ch1)){
				lx->num_val = toHex(ch1);
				if (lx->num_val > lx->num_base)
					list_ptr_push(tks, tok_error(format("Invalid number")));
				else
					lx->state = LEX_NUM;
			}
			else if (ch1 != '_')
				list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM:
			if (ch1 == '_')
				/* do nothing */;
			else if (ch1 == '.'){
				lx->num_frac = 0;
				lx->num_flen = 0;
				lx->state = LEX_NUM_FRAC;
			}
			else if ((lx->num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx->num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx->num_frac = 0;
				lx->num_flen = 0;
				lx->num_esign = 0;
				lx->num_eval = 0;
				lx->num_elen = 0;
				lx->state = LEX_NUM_EXP;
			}
			else if (isHex(ch1)){
				int v = toHex(ch1);
				if (v > lx->num_base)
					list_ptr_push(tks, tok_error(format("Invalid number")));
				else
					lx->num_val = lx->num_val * lx->num_base + v;
			}
			else if (!isAlpha(ch1)){
				list_ptr_push(tks, tok_num(lx->num_val));
				lx->state = LEX_START;
				lex_process(lx, tks);
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM_FRAC:
			if (ch1 == '_')
				/* do nothing */;
			else if ((lx->num_base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx->num_base != 10 && (ch1 == 'p' || ch1 == 'P'))){
				lx->num_esign = 0;
				lx->num_eval = 0;
				lx->num_elen = 0;
				lx->state = LEX_NUM_EXP;
			}
			else if (isHex(ch1)){
				int v = toHex(ch1);
				if (v > lx->num_base)
					list_ptr_push(tks, tok_error(format("Invalid number")));
				else{
					lx->num_frac = lx->num_frac * lx->num_base + v;
					lx->num_flen++;
				}
			}
			else if (!isAlpha(ch1)){
				if (lx->num_flen <= 0)
					list_ptr_push(tks, tok_error(format("Invalid number")));
				else{
					double d = pow(lx->num_base, lx->num_flen);
					lx->num_val = (lx->num_val * d + lx->num_frac) / d;
					list_ptr_push(tks, tok_num(lx->num_val));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM_EXP:
			if (ch1 != '_'){
				lx->num_esign = ch1 == '-' ? -1 : 1;
				lx->state = LEX_NUM_EXP_BODY;
				if (ch1 != '+' && ch1 != '-')
					lex_process(lx, tks);
			}
			break;

		case LEX_NUM_EXP_BODY:
			if (ch1 == '_')
				/* do nothing */;
			else if (isNum(ch1)){
				lx->num_eval = lx->num_eval * 10.0 + toHex(ch1);
				lx->num_elen++;
			}
			else if (!isAlpha(ch1)){
				if (lx->num_elen <= 0)
					list_ptr_push(tks, tok_error(format("Invalid number")));
				else{
					double e = pow(lx->num_base == 10.0 ? 10.0 : 2.0, lx->num_esign * lx->num_eval);
					lx->num_val *= e;
					if (lx->num_flen > 0){
						double d = pow(lx->num_base, lx->num_flen);
						lx->num_val = (lx->num_val * d + lx->num_frac * e) / d;
					}
					list_ptr_push(tks, tok_num(lx->num_val));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_STR_BASIC:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(format("Missing end of string")));
			else if (ch1 == '\''){
				lx->state = LEX_START;
				list_ptr_push(tks, tok_ks(KS_LPAREN));
				list_ptr_push(tks, tok_str(lx->str));
				list_ptr_push(tks, tok_ks(KS_RPAREN));
				lx->str = NULL;
			}
			else if (ch1 == '\\')
				lx->state = LEX_STR_BASIC_ESC;
			else
				list_byte_push(lx->str, ch1);
			break;

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\\' || ch1 == '\''){
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_BASIC;
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid escape sequence: \\%c", ch1)));
			break;

		case LEX_STR_INTERP:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(format("Missing end of string")));
			else if (ch1 == '"'){
				lx->state = LEX_START;
				list_ptr_push(tks, tok_str(lx->str));
				list_ptr_push(tks, tok_ks(KS_RPAREN));
				lx->str = NULL;
			}
			else if (ch1 == '$'){
				lx->state = LEX_STR_INTERP_DLR;
				if (lx->str->size > 0){
					list_ptr_push(tks, tok_str(lx->str));
					list_ptr_push(tks, tok_ks(KS_TILDE));
				}
				else
					list_byte_free(lx->str);
				lx->str = NULL;
			}
			else if (ch1 == '\\')
				lx->state = LEX_STR_INTERP_ESC;
			else
				list_byte_push(lx->str, ch1);
			break;

		case LEX_STR_INTERP_DLR:
			if (ch1 == '{'){
				lx->str_depth++;
				lx->state = LEX_START;
				list_ptr_push(tks, tok_ks(KS_LPAREN));
			}
			else if (isIdentStart(ch1)){
				lx->str = list_byte_new();
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_INTERP_DLR_ID;
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid substitution")));
			break;

		case LEX_STR_INTERP_DLR_ID:
			if (!isIdentBody(ch1)){
				if (ks_str(lx->str) != KS_INVALID)
					list_ptr_push(tks, tok_error(format("Invalid substitution")));
				else{
					list_ptr_push(tks, tok_ident(lx->str));
					if (ch1 == '"'){
						lx->state = LEX_START;
						lx->str = NULL;
						list_ptr_push(tks, tok_ks(KS_RPAREN));
					}
					else{
						lx->str = list_byte_new();
						lx->state = LEX_STR_INTERP;
						list_ptr_push(tks, tok_ks(KS_TILDE));
						lex_process(lx, tks);
					}
				}
			}
			else{
				list_byte_push(lx->str, ch1);
				if (lx->str->size > 1024)
					list_ptr_push(tks, tok_error(format("Identifier too long")));
			}
			break;

		case LEX_STR_INTERP_ESC:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(format("Missing end of string")));
			else if (ch1 == 'x'){
				lx->str_hexval = 0;
				lx->str_hexleft = 2;
				lx->state = LEX_STR_INTERP_ESC_HEX;
			}
			else if (ch1 == '0'){
				list_byte_push(lx->str, 0);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 'b'){
				list_byte_push(lx->str, 8);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 't'){
				list_byte_push(lx->str, 9);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 'n'){
				list_byte_push(lx->str, 10);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 'v'){
				list_byte_push(lx->str, 11);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 'f'){
				list_byte_push(lx->str, 12);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == 'r'){
				list_byte_push(lx->str, 13);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_INTERP;
			}
			else
				list_ptr_push(tks, tok_error(format("Invalid escape sequence: \\%c", ch1)));
			break;

		case LEX_STR_INTERP_ESC_HEX:
			if (isHex(ch1)){
				lx->str_hexval = (lx->str_hexval << 4) + toHex(ch1);
				lx->str_hexleft--;
				if (lx->str_hexleft <= 0){
					list_byte_push(lx->str, lx->str_hexval);
					lx->state = LEX_STR_INTERP;
				}
			}
			else{
				list_ptr_push(tks,
					tok_error(format("Invalid escape sequence; expecting hex value")));
			}
			break;
	}
}

static inline void lex_add(lex lx, char ch, list_ptr tks){
	lex_fwd(lx, ch);
	lex_process(lx, tks);
}

static void lex_close(lex lx, list_ptr tks){
	if (lx->str_depth > 0){
		list_ptr_push(tks, tok_error(format("Missing end of string")));
		return;
	}
	switch (lx->state){
		case LEX_START:
		case LEX_COMMENT_LINE:
		case LEX_BACKSLASH:
		case LEX_RETURN:
			break;

		case LEX_COMMENT_BLOCK:
			list_ptr_push(tks, tok_error(format("Missing end of block comment")));
			return;

		case LEX_SPECIAL1: {
			ks_enum ks1 = ks_char(lx->ch1);
			if (ks1 != KS_INVALID)
				list_ptr_push(tks, tok_ks(ks1));
			else
				list_ptr_push(tks, tok_error(format("Unexpected character: %c", lx->ch1)));
		} break;

		case LEX_SPECIAL2: {
			ks_enum ks2 = ks_char2(lx->ch2, lx->ch1);
			if (ks2 != KS_INVALID)
				list_ptr_push(tks, tok_ks(ks2));
			else{
				ks_enum ks1 = ks_char(lx->ch2);
				ks2 = ks_char(lx->ch1);
				if (ks1 != KS_INVALID){
					list_ptr_push(tks, tok_ks(ks1));
					if (ks2 != KS_INVALID)
						list_ptr_push(tks, tok_ks(ks2));
					else
						list_ptr_push(tks, tok_error(format("Unexpected character: %c", lx->ch1)));
				}
				else
					list_ptr_push(tks, tok_error(format("Unexpected character: %c", lx->ch2)));
			}
		} break;

		case LEX_IDENT: {
			ks_enum ksk = ks_str(lx->str);
			if (ksk != KS_INVALID){
				list_ptr_push(tks, tok_ks(ksk));
				list_byte_free(lx->str);
			}
			else
				list_ptr_push(tks, tok_ident(lx->str));
			lx->str = NULL;
		} break;

		case LEX_NUM_0:
			list_ptr_push(tks, tok_num(0));
			break;

		case LEX_NUM_2:
			list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM:
			list_ptr_push(tks, tok_num(lx->num_val));
			break;

		case LEX_NUM_FRAC:
			if (lx->num_flen <= 0)
				list_ptr_push(tks, tok_error(format("Invalid number")));
			else{
				double d = pow(lx->num_base, lx->num_flen);
				lx->num_val = (lx->num_val * d + lx->num_frac) / d;
				list_ptr_push(tks, tok_num(lx->num_val));
			}
			break;

		case LEX_NUM_EXP:
			list_ptr_push(tks, tok_error(format("Invalid number")));
			break;

		case LEX_NUM_EXP_BODY:
			if (lx->num_elen <= 0)
				list_ptr_push(tks, tok_error(format("Invalid number")));
			else{
				double e = pow(lx->num_base == 10.0 ? 10.0 : 2.0, lx->num_esign * lx->num_eval);
				lx->num_val *= e;
				if (lx->num_flen > 0){
					double d = pow(lx->num_base, lx->num_flen);
					lx->num_val = (lx->num_val * d + lx->num_frac * e) / d;
				}
				list_ptr_push(tks, tok_num(lx->num_val));
			}
			break;

		case LEX_STR_BASIC:
		case LEX_STR_BASIC_ESC:
		case LEX_STR_INTERP:
		case LEX_STR_INTERP_DLR:
		case LEX_STR_INTERP_DLR_ID:
		case LEX_STR_INTERP_ESC:
		case LEX_STR_INTERP_ESC_HEX:
			list_ptr_push(tks, tok_error(format("Missing end of string")));
			break;
	}
	list_ptr_push(tks, tok_newline(false));
}

//
// expr
//

typedef enum {
	EXPR_NIL,
	EXPR_NUM,
	EXPR_STR,
	EXPR_LIST,
	EXPR_NAMES,
	EXPR_VAR,
	EXPR_PAREN,
	EXPR_GROUP,
	EXPR_PREFIX,
	EXPR_INFIX,
	EXPR_CALL,
	EXPR_INDEX,
	EXPR_SLICE
} expr_enum;

typedef struct expr_struct expr_st, *expr;
struct expr_struct {
	filepos_st flp;
	expr_enum type;
	union {
		double num;
		list_byte str;
		expr ex;
		list_ptr names;
		varloc_st vlc;
		list_ptr group;
		struct {
			expr ex;
			ks_enum k;
		} prefix;
		struct {
			expr left;
			expr right;
			ks_enum k;
		} infix;
		struct {
			expr cmd;
			expr params;
		} call;
		struct {
			expr obj;
			expr key;
		} index;
		struct {
			expr obj;
			expr start;
			expr len;
		} slice;
	} u;
};

static void expr_free(expr ex){
	switch (ex->type){
		case EXPR_NIL:
		case EXPR_NUM:
			break;

		case EXPR_STR:
			if (ex->u.str)
				list_byte_free(ex->u.str);
			break;

		case EXPR_LIST:
			if (ex->u.ex)
				expr_free(ex->u.ex);
			break;

		case EXPR_NAMES:
			if (ex->u.names)
				list_ptr_free(ex->u.names);
			break;

		case EXPR_VAR:
			break;

		case EXPR_PAREN:
			if (ex->u.ex)
				expr_free(ex->u.ex);
			break;

		case EXPR_GROUP:
			if (ex->u.group)
				list_ptr_free(ex->u.group);
			break;

		case EXPR_PREFIX:
			if (ex->u.prefix.ex)
				expr_free(ex->u.prefix.ex);
			break;

		case EXPR_INFIX:
			if (ex->u.infix.left)
				expr_free(ex->u.infix.left);
			if (ex->u.infix.right)
				expr_free(ex->u.infix.right);
			break;

		case EXPR_CALL:
			if (ex->u.call.cmd)
				expr_free(ex->u.call.cmd);
			if (ex->u.call.params)
				expr_free(ex->u.call.params);
			break;

		case EXPR_INDEX:
			if (ex->u.index.obj)
				expr_free(ex->u.index.obj);
			if (ex->u.index.key)
				expr_free(ex->u.index.key);
			break;

		case EXPR_SLICE:
			if (ex->u.slice.obj)
				expr_free(ex->u.slice.obj);
			if (ex->u.slice.start)
				expr_free(ex->u.slice.start);
			if (ex->u.slice.len)
				expr_free(ex->u.slice.len);
			break;
	}
	mem_free(ex);
}

static inline expr expr_nil(filepos_st flp){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_NIL;
	return ex;
}

static inline expr expr_num(filepos_st flp, double num){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_NUM;
	ex->u.num = num;
	return ex;
}

static inline expr expr_str(filepos_st flp, list_byte str){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_STR;
	ex->u.str = str;
	return ex;
}

static inline expr expr_list(filepos_st flp, expr ex){
	expr ex2 = mem_alloc(sizeof(expr_st));
	ex2->flp = flp;
	ex2->type = EXPR_LIST;
	ex2->u.ex = ex;
	return ex2;
}

static inline expr expr_names(filepos_st flp, list_ptr names){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_NAMES;
	ex->u.names = names;
	return ex;
}

static inline expr expr_var(filepos_st flp, varloc_st vlc){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_VAR;
	ex->u.vlc = vlc;
	return ex;
}

static inline expr expr_paren(filepos_st flp, expr ex){
	expr ex2 = mem_alloc(sizeof(expr_st));
	ex2->flp = flp;
	ex2->type = EXPR_PAREN;
	ex2->u.ex = ex;
	return ex2;
}

static inline expr expr_group(filepos_st flp, expr left, expr right){
	list_ptr g = list_ptr_new((free_func)expr_free);
	if (left->type == EXPR_GROUP)
		list_ptr_append(g, left->u.group);
	else
		list_ptr_push(g, left);
	if (right->type == EXPR_GROUP)
		list_ptr_append(g, right->u.group);
	else
		list_ptr_push(g, right);
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_GROUP;
	ex->u.group = g;
	return ex;
}

static inline expr expr_prefix(filepos_st flp, ks_enum k, expr ex){
	if ((k == KS_MINUS || k == KS_UNMINUS) && ex->type == EXPR_NUM){
		ex->u.num = -ex->u.num;
		return ex;
	}
	else if ((k == KS_PLUS || k == KS_UNPLUS) && ex->type == EXPR_NUM)
		return ex;
	expr ex2 = mem_alloc(sizeof(expr_st));
	ex2->flp = flp;
	ex2->type = EXPR_PREFIX;
	ex2->u.prefix.k = k;
	ex2->u.prefix.ex = ex;
	return ex2;
}

static inline expr expr_infix(filepos_st flp, ks_enum k, expr left, expr right){
	if (k == KS_COMMA)
		return expr_group(flp, left, right);
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_INFIX;
	ex->u.infix.k = k;
	ex->u.infix.left = left;
	ex->u.infix.right = right;
	return ex;
}

static inline expr expr_call(filepos_st flp, expr cmd, expr params){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_CALL;
	ex->u.call.cmd = cmd;
	ex->u.call.params = params;
	return ex;
}

static inline expr expr_index(filepos_st flp, expr obj, expr key){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_INDEX;
	ex->u.index.obj = obj;
	ex->u.index.key = key;
	return ex;
}

static inline expr expr_slice(filepos_st flp, expr obj, expr start, expr len){
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_SLICE;
	ex->u.slice.obj = obj;
	ex->u.slice.start = start;
	ex->u.slice.len = len;
	return ex;
}

//
// ast
//

typedef enum {
	AST_BREAK,
	AST_CONTINUE,
	AST_DECLARE,
	AST_DEF,
	AST_DO_END,
	AST_DO_WHILE,
	AST_FOR,
	AST_LOOP,
	AST_GOTO,
	AST_IF,
	AST_INCLUDE,
	AST_NAMESPACE,
	AST_RETURN,
	AST_USING,
	AST_VAR,
	AST_EVAL,
	AST_LABEL
} ast_enum;

typedef struct {
	filepos_st flp;
	ast_enum type;
	union {
		list_ptr decls;
		struct {
			list_ptr names;
			list_ptr lvalues;
			list_ptr body;
		} def;
		list_ptr body;
		struct {
			list_ptr doBody;
			expr cond;
			list_ptr whileBody;
		} doWhile;
		struct {
			list_ptr names1;
			list_ptr names2;
			expr ex;
			list_ptr body;
			bool forVar;
		} afor;
		list_byte ident;
		struct {
			list_ptr conds;
			list_ptr elseBody;
		} aif;
		list_ptr incls;
		struct {
			list_ptr names;
			list_ptr body;
		} namespace;
		expr ex;
		list_ptr namesList;
		list_ptr lvalues;
	} u;
} ast_st, *ast;

static void ast_free(ast stmt){
	switch (stmt->type){
		case AST_BREAK:
		case AST_CONTINUE:
			break;

		case AST_DECLARE:
			if (stmt->u.decls)
				list_ptr_free(stmt->u.decls);
			break;

		case AST_DEF:
			if (stmt->u.def.names)
				list_ptr_free(stmt->u.def.names);
			if (stmt->u.def.lvalues)
				list_ptr_free(stmt->u.def.lvalues);
			if (stmt->u.def.body)
				list_ptr_free(stmt->u.def.body);
			break;

		case AST_DO_END:
			if (stmt->u.body)
				list_ptr_free(stmt->u.body);
			break;

		case AST_DO_WHILE:
			if (stmt->u.doWhile.doBody)
				list_ptr_free(stmt->u.doWhile.doBody);
			if (stmt->u.doWhile.cond)
				expr_free(stmt->u.doWhile.cond);
			if (stmt->u.doWhile.whileBody)
				list_ptr_free(stmt->u.doWhile.whileBody);
			break;

		case AST_FOR:
			if (stmt->u.afor.names1)
				list_ptr_free(stmt->u.afor.names1);
			if (stmt->u.afor.names2)
				list_ptr_free(stmt->u.afor.names2);
			if (stmt->u.afor.ex)
				expr_free(stmt->u.afor.ex);
			if (stmt->u.afor.body)
				list_ptr_free(stmt->u.afor.body);
			break;

		case AST_LOOP:
			if (stmt->u.body)
				list_ptr_free(stmt->u.body);
			break;

		case AST_GOTO:
			if (stmt->u.ident)
				list_byte_free(stmt->u.ident);
			break;

		case AST_IF:
			if (stmt->u.aif.conds)
				list_ptr_free(stmt->u.aif.conds);
			if (stmt->u.aif.elseBody)
				list_ptr_free(stmt->u.aif.elseBody);
			break;

		case AST_INCLUDE:
			if (stmt->u.incls)
				list_ptr_free(stmt->u.incls);
			break;

		case AST_NAMESPACE:
			if (stmt->u.namespace.names)
				list_ptr_free(stmt->u.namespace.names);
			if (stmt->u.namespace.body)
				list_ptr_free(stmt->u.namespace.body);
			break;

		case AST_RETURN:
			if (stmt->u.ex)
				expr_free(stmt->u.ex);
			break;

		case AST_USING:
			if (stmt->u.namesList)
				list_ptr_free(stmt->u.namesList);
			break;

		case AST_VAR:
			if (stmt->u.lvalues)
				list_ptr_free(stmt->u.lvalues);
			break;

		case AST_EVAL:
			if (stmt->u.ex)
				expr_free(stmt->u.ex);
			break;

		case AST_LABEL:
			if (stmt->u.ident)
				list_byte_free(stmt->u.ident);
			break;
	}
	mem_free(stmt);
}

static inline ast ast_break(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_BREAK;
	return stmt;
}

static inline ast ast_continue(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_CONTINUE;
	return stmt;
}

static inline ast ast_declare(filepos_st flp, list_ptr decls){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DECLARE;
	stmt->u.decls = decls;
	return stmt;
}

static inline ast ast_def(filepos_st flp, list_ptr names, list_ptr lvalues, list_ptr body){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DEF;
	stmt->u.def.names = names;
	stmt->u.def.lvalues = lvalues;
	stmt->u.def.body = body;
	return stmt;
}

static inline ast ast_doEnd(filepos_st flp, list_ptr body){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DO_END;
	stmt->u.body = body;
	return stmt;
}

static inline ast ast_doWhile(filepos_st flp, list_ptr doBody, expr cond, list_ptr whileBody){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DO_WHILE;
	stmt->u.doWhile.doBody = doBody;
	stmt->u.doWhile.cond = cond;
	stmt->u.doWhile.whileBody = whileBody;
	return stmt;
}

static inline ast ast_for(filepos_st flp, bool forVar, list_ptr names1, list_ptr names2, expr ex,
	list_ptr body){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_FOR;
	stmt->u.afor.forVar = forVar;
	stmt->u.afor.names1 = names1;
	stmt->u.afor.names2 = names2;
	stmt->u.afor.ex = ex;
	stmt->u.afor.body = body;
	return stmt;
}

static inline ast ast_loop(filepos_st flp, list_ptr body){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_LOOP;
	stmt->u.body = body;
	return stmt;
}

static inline ast ast_goto(filepos_st flp, list_byte ident){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_GOTO;
	stmt->u.ident = ident;
	return stmt;
}

static inline ast ast_if(filepos_st flp, list_ptr conds, list_ptr elseBody){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_IF;
	stmt->u.aif.conds = conds;
	stmt->u.aif.elseBody = elseBody;
	return stmt;
}

static inline ast ast_include(filepos_st flp, list_ptr incls){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_INCLUDE;
	stmt->u.incls = incls;
	return stmt;
}

static inline ast ast_namespace(filepos_st flp, list_ptr names, list_ptr body){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_NAMESPACE;
	stmt->u.namespace.names = names;
	stmt->u.namespace.body = body;
	return stmt;
}

static inline ast ast_return(filepos_st flp, expr ex){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_RETURN;
	stmt->u.ex = ex;
	return stmt;
}

static inline ast ast_using(filepos_st flp, list_ptr namesList){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_USING;
	stmt->u.namesList = namesList;
	return stmt;
}

static inline ast ast_var(filepos_st flp, list_ptr lvalues){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_VAR;
	stmt->u.lvalues = lvalues;
	return stmt;
}

static inline ast ast_eval(filepos_st flp, expr ex){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_EVAL;
	stmt->u.ex = ex;
	return stmt;
}

static inline ast ast_label(filepos_st flp, list_byte ident){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_LABEL;
	stmt->u.ident = ident;
	return stmt;
}

//
// parser state helpers
//

typedef struct {
	expr ex;
	list_ptr body;
} cond_st, *cond;

static inline void cond_free(cond c){
	if (c->ex)
		expr_free(c->ex);
	if (c->body)
		list_ptr_free(c->body);
	mem_free(c);
}

static inline cond cond_new(expr ex, list_ptr body){ // conds
	cond c = mem_alloc(sizeof(cond_st));
	c->ex = ex;
	c->body = body;
	return c;
}

typedef enum {
	DECL_LOCAL,
	DECL_NATIVE
} decl_enum;

typedef struct {
	filepos_st flp;
	decl_enum type;
	list_ptr names;
	list_byte key;
} decl_st, *decl;

static inline void decl_free(decl dc){
	if (dc->names)
		list_ptr_free(dc->names);
	if (dc->type == DECL_NATIVE && dc->key)
		list_byte_free(dc->key);
	mem_free(dc);
}

static inline decl decl_local(filepos_st flp, list_ptr names){ // decls
	decl dc = mem_alloc(sizeof(decl_st));
	dc->flp = flp;
	dc->type = DECL_LOCAL;
	dc->names = names;
	return dc;
}

static inline decl decl_native(filepos_st flp, list_ptr names, list_byte key){ // decls
	decl dc = mem_alloc(sizeof(decl_st));
	dc->flp = flp;
	dc->type = DECL_NATIVE;
	dc->names = names;
	dc->key = key;
	return dc;
}

typedef struct {
	filepos_st flp;
	list_ptr names;
	list_byte file;
} incl_st, *incl;

static inline void incl_free(incl ic){
	if (ic->names)
		list_ptr_free(ic->names);
	if (ic->file)
		list_byte_free(ic->file);
	mem_free(ic);
}

static inline incl incl_new(filepos_st flp, list_ptr names, list_byte file){ // incls
	incl ic = mem_alloc(sizeof(incl_st));
	ic->flp = flp;
	ic->names = names;
	ic->file = file;
	return ic;
}

typedef struct ets_struct ets_st, *ets;
struct ets_struct {
	tok tk;
	ets next;
};

static inline void ets_free(ets e){
	if (e->tk)
		tok_free(e->tk);
	mem_free(e);
}

static inline ets ets_new(tok tk, ets next){ // exprPreStack, exprMidStack
	ets e = mem_alloc(sizeof(ets_st));
	e->tk = tk;
	e->next = next;
	return e;
}

typedef struct exs_struct exs_st, *exs;
struct exs_struct {
	expr ex;
	exs next;
};

static inline void exs_free(exs e){
	if (e->ex)
		expr_free(e->ex);
	mem_free(e);
}

static inline exs exs_new(expr ex, exs next){ // exprStack
	exs e = mem_alloc(sizeof(exs_st));
	e->ex = ex;
	e->next = next;
	return e;
}

typedef struct eps_struct eps_st, *eps;
struct eps_struct {
	ets e;
	eps next;
};

static inline void eps_free(eps e){
	ets here = e->e;
	while (here){
		ets del = here;
		here = here->next;
		ets_free(del);
	}
	mem_free(e);
}

static inline eps eps_new(ets e, eps next){ // exprPreStackStack
	eps e2 = mem_alloc(sizeof(eps_st));
	e2->e = e;
	e2->next = next;
	return e2;
}

//
// parser state
//

typedef enum {
	PRS_START,
	PRS_START_STATEMENT,
	PRS_STATEMENT,
	PRS_LOOKUP,
	PRS_LOOKUP_IDENT,
	PRS_BODY,
	PRS_BODY_STATEMENT,
	PRS_LVALUES,
	PRS_LVALUES_TERM,
	PRS_LVALUES_TERM_LOOKUP,
	PRS_LVALUES_TERM_LIST,
	PRS_LVALUES_TERM_LIST_TERM_DONE,
	PRS_LVALUES_TERM_LIST_TAIL,
	PRS_LVALUES_TERM_LIST_TAIL_LOOKUP,
	PRS_LVALUES_TERM_LIST_TAIL_DONE,
	PRS_LVALUES_TERM_LIST_DONE,
	PRS_LVALUES_TERM_DONE,
	PRS_LVALUES_TERM_EXPR,
	PRS_LVALUES_MORE,
	PRS_LVALUES_DEF_TAIL,
	PRS_LVALUES_DEF_TAIL_DONE,
	PRS_BREAK,
	PRS_CONTINUE,
	PRS_DECLARE,
	PRS_DECLARE2,
	PRS_DECLARE_LOOKUP,
	PRS_DECLARE_STR,
	PRS_DECLARE_STR2,
	PRS_DECLARE_STR3,
	PRS_DEF,
	PRS_DEF_LOOKUP,
	PRS_DEF_LVALUES,
	PRS_DEF_BODY,
	PRS_DEF_DONE,
	PRS_DO,
	PRS_DO_BODY,
	PRS_DO_DONE,
	PRS_DO_WHILE_EXPR,
	PRS_DO_WHILE_BODY,
	PRS_DO_WHILE_DONE,
	PRS_FOR,
	PRS_LOOP_BODY,
	PRS_LOOP_DONE,
	PRS_FOR_VARS,
	PRS_FOR_VARS_LOOKUP,
	PRS_FOR_VARS2,
	PRS_FOR_VARS2_LOOKUP,
	PRS_FOR_VARS_DONE,
	PRS_FOR_EXPR,
	PRS_FOR_BODY,
	PRS_FOR_DONE,
	PRS_GOTO,
	PRS_GOTO_DONE,
	PRS_IF,
	PRS_IF_EXPR,
	PRS_IF_BODY,
	PRS_ELSEIF,
	PRS_IF_DONE,
	PRS_ELSE_BODY,
	PRS_ELSE_DONE,
	PRS_INCLUDE,
	PRS_INCLUDE2,
	PRS_INCLUDE_LOOKUP,
	PRS_INCLUDE_STR,
	PRS_INCLUDE_STR2,
	PRS_INCLUDE_STR3,
	PRS_NAMESPACE,
	PRS_NAMESPACE_LOOKUP,
	PRS_NAMESPACE_BODY,
	PRS_NAMESPACE_DONE,
	PRS_RETURN,
	PRS_RETURN_DONE,
	PRS_USING,
	PRS_USING2,
	PRS_USING_LOOKUP,
	PRS_VAR,
	PRS_VAR_LVALUES,
	PRS_IDENTS,
	PRS_EVAL,
	PRS_EVAL_EXPR,
	PRS_EXPR,
	PRS_EXPR_TERM,
	PRS_EXPR_TERM_ISEMPTYLIST,
	PRS_EXPR_TERM_CLOSEBRACE,
	PRS_EXPR_TERM_CLOSEPAREN,
	PRS_EXPR_TERM_LOOKUP,
	PRS_EXPR_POST,
	PRS_EXPR_POST_CALL,
	PRS_EXPR_INDEX_CHECK,
	PRS_EXPR_INDEX_COLON_CHECK,
	PRS_EXPR_INDEX_COLON_EXPR,
	PRS_EXPR_INDEX_EXPR_CHECK,
	PRS_EXPR_INDEX_EXPR_COLON_CHECK,
	PRS_EXPR_INDEX_EXPR_COLON_EXPR,
	PRS_EXPR_COMMA,
	PRS_EXPR_MID,
	PRS_EXPR_FINISH
} prs_enum;

typedef struct prs_struct prs_st, *prs;
struct prs_struct {
	prs_enum state;
	ast stmt;
	list_ptr body;
	list_ptr body2;
	list_ptr conds;
	list_ptr decls;
	list_ptr incls;
	list_ptr lvalues;
	int lvaluesPeriods;
	bool forVar;
	list_byte str;
	bool exprAllowComma;
	bool exprAllowPipe;
	bool exprAllowTrailComma;
	eps exprPreStackStack;
	ets exprPreStack;
	ets exprMidStack;
	exs exprStack;
	expr exprTerm;
	expr exprTerm2;
	expr exprTerm3;
	list_ptr names;
	list_ptr names2;
	list_ptr namesList;
	prs next;
};

static void prs_free(prs pr){
	if (pr->stmt)
		ast_free(pr->stmt);
	if (pr->body)
		list_ptr_free(pr->body);
	if (pr->body2)
		list_ptr_free(pr->body2);
	if (pr->conds)
		list_ptr_free(pr->conds);
	if (pr->decls)
		list_ptr_free(pr->decls);
	if (pr->incls)
		list_ptr_free(pr->incls);
	if (pr->lvalues)
		list_ptr_free(pr->lvalues);
	if (pr->str)
		list_byte_free(pr->str);
	if (pr->exprPreStackStack){
		eps here = pr->exprPreStackStack;
		while (here){
			eps del = here;
			here = here->next;
			eps_free(del);
		}
	}
	if (pr->exprPreStack){
		ets here = pr->exprPreStack;
		while (here){
			ets del = here;
			here = here->next;
			ets_free(del);
		}
	}
	if (pr->exprMidStack){
		ets here = pr->exprMidStack;
		while (here){
			ets del = here;
			here = here->next;
			ets_free(del);
		}
	}
	if (pr->exprStack){
		exs here = pr->exprStack;
		while (here){
			exs del = here;
			here = here->next;
			exs_free(del);
		}
	}
	if (pr->exprTerm)
		expr_free(pr->exprTerm);
	if (pr->exprTerm2)
		expr_free(pr->exprTerm2);
	if (pr->exprTerm3)
		expr_free(pr->exprTerm3);
	if (pr->names)
		list_ptr_free(pr->names);
	if (pr->names2)
		list_ptr_free(pr->names2);
	if (pr->namesList)
		list_ptr_free(pr->namesList);
	mem_free(pr);
}

static prs prs_new(prs_enum state, prs next){
	prs pr = mem_alloc(sizeof(prs_st));
	pr->state = state;
	pr->stmt = NULL;                 // single ast_*
	pr->body = NULL;                 // list of ast_*'s
	pr->body2 = NULL;                // list of ast_*'s
	pr->conds = NULL;                // list of cond_new's
	pr->decls = NULL;                // list of decl_*'s
	pr->incls = NULL;                // list of incl_new's
	pr->lvalues = NULL;              // list of expr
	pr->lvaluesPeriods = 0;          // 0 off, 1 def, 2 nested list
	pr->forVar = false;
	pr->str = NULL;
	pr->exprAllowComma = true;
	pr->exprAllowPipe = true;
	pr->exprAllowTrailComma = false;
	pr->exprPreStackStack = NULL;    // linked list of eps_new's
	pr->exprPreStack = NULL;         // linked list of ets_new's
	pr->exprMidStack = NULL;         // linked list of ets_new's
	pr->exprStack = NULL;            // linked list of exs_new's
	pr->exprTerm = NULL;             // expr
	pr->exprTerm2 = NULL;            // expr
	pr->exprTerm3 = NULL;            // expr
	pr->names = NULL;                // list of strings
	pr->names2 = NULL;               // list of strings
	pr->namesList = NULL;            // list of list of strings
	pr->next = next;
	return pr;
}

//
// parser
//

typedef struct {
	prs state;
	tok tkR;
	tok tk1;
	tok tk2;
	int level;
} parser_st, *parser;

static inline void parser_free(parser pr){
	prs here = pr->state;
	while (here){
		prs del = here;
		here = here->next;
		prs_free(del);
	}
	tok_free(pr->tk1);
	tok_free(pr->tk2);
	tok_free(pr->tkR);
	mem_free(pr);
}

static inline parser parser_new(){
	parser pr = mem_alloc(sizeof(parser_st));
	pr->state = prs_new(PRS_START, NULL);
	pr->tkR = NULL;
	pr->tk1 = NULL;
	pr->tk2 = NULL;
	pr->level = 0;
	return pr;
}

static inline void parser_fwd(parser pr, tok tk){
	if (pr->tk2)
		tok_free(pr->tk2);
	pr->tk2 = pr->tk1;
	pr->tk1 = tk;
	pr->tkR = NULL;
}

static inline void parser_rev(parser pr){
	if (pr->tkR)
		tok_free(pr->tkR);
	pr->tkR = pr->tk1;
	pr->tk1 = pr->tk2;
	pr->tk2 = NULL;
}

typedef enum {
	PRR_MORE,
	PRR_STATEMENT,
	PRR_ERROR
} prr_enum;

typedef struct {
	prr_enum type;
	union {
		ast stmt;
		char *msg;
	} u;
} prr_st;

static inline prr_st prr_more(){
	return (prr_st){ .type = PRR_MORE };
}

static inline prr_st prr_statement(ast stmt){
	return (prr_st){ .type = PRR_STATEMENT, .u.stmt = stmt };
}

static inline prr_st prr_error(char *msg){
	return (prr_st){ .type = PRR_ERROR, .u.msg = msg };
}

static inline prr_st parser_process(parser pr, filepos_st flp);

static inline prr_st parser_statement(parser pr, ast stmt){
	pr->level--;
	prs next = pr->state->next;
	prs_free(pr->state);
	pr->state = next;
	pr->state->stmt = stmt;
	return parser_process(pr, stmt->flp);
}

static inline void parser_push(parser pr, prs_enum state){
	pr->state = prs_new(state, pr->state);
}

typedef enum {
	PRI_OK,
	PRI_ERROR
} pri_enum;

typedef struct {
	pri_enum type;
	union {
		expr ex;
		char *msg;
	} u;
} pri_st;

static inline pri_st pri_ok(expr ex){
	return (pri_st){ .type = PRI_OK, .u.ex = ex };
}

static inline pri_st pri_error(char *msg){
	return (pri_st){ .type = PRI_ERROR, .u.msg = msg };
}

static inline pri_st parser_infix(filepos_st flp, ks_enum k, expr left, expr right){
	if (k == KS_PIPE){
		if (right->type == EXPR_CALL){
			right->u.call.params = expr_infix(flp, KS_COMMA, expr_paren(flp, left),
				right->u.call.params);
			return pri_ok(right);
		}
		else if (right->type == EXPR_NAMES)
			return pri_ok(expr_call(flp, right, left));
		return pri_error(format("Invalid pipe"));
	}
	return pri_ok(expr_infix(flp, k, left, right));
}

static inline prr_st parser_start(parser pr, prs_enum state){
	pr->level++;
	pr->state->state = state;
	return prr_more();
}

static prr_st parser_process(parser pr, filepos_st flp){
	tok tk1 = pr->tk1;
	prs st = pr->state;
	ast stmt;
	switch (st->state){
		case PRS_START:
			st->state = PRS_START_STATEMENT;
			st->stmt = NULL;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr, flp);

		case PRS_START_STATEMENT:
			if (st->stmt == NULL)
				return prr_error(format("Invalid statement"));
			// all statements require a newline to terminate it... except labels
			if (st->stmt->type != AST_LABEL && tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->state = PRS_START;
			return prr_statement(st->stmt);

		case PRS_STATEMENT:
			if      (tk1->type == TOK_NEWLINE   ) return prr_more();
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
			else if (tk1->type == TOK_IDENT){
				st->state = PRS_IDENTS;
				parser_push(pr, PRS_LOOKUP);
				pr->state->names = list_ptr_new(mem_free_func);
				list_ptr_push(pr->state->names, tk1->u.ident);
				tk1->u.ident = NULL;
				return prr_more();
			}
			else if (tok_isPre(tk1) || tok_isTerm(tk1)){
				pr->level++;
				st->state = PRS_EVAL;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_END) || tok_isKS(tk1, KS_ELSE) || tok_isKS(tk1, KS_ELSEIF) ||
				tok_isKS(tk1, KS_WHILE)){
				// stmt is already NULL, so don't touch it, so we return NULL
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			return prr_error(format("Invalid statement"));

		case PRS_LOOKUP:
			if (!tok_isKS(tk1, KS_PERIOD)){
				st->next->names = st->names;
				st->names = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			st->state = PRS_LOOKUP_IDENT;
			return prr_more();

		case PRS_LOOKUP_IDENT:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			list_ptr_push(st->names, tk1->u.ident);
			tk1->u.ident = NULL;
			st->state = PRS_LOOKUP;
			return prr_more();

		case PRS_BODY:
			st->state = PRS_BODY_STATEMENT;
			st->stmt = NULL;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr, flp);

		case PRS_BODY_STATEMENT:
			if (st->stmt == NULL){
				st->next->body = st->body;
				st->body = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			list_ptr_push(st->body, st->stmt);
			st->stmt = NULL;
			parser_push(pr, PRS_STATEMENT);
			return prr_more();

		case PRS_LVALUES:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft){
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			st->state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr->state->lvaluesPeriods = st->lvaluesPeriods;
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM:
			if (tk1->type == TOK_IDENT){
				st->state = PRS_LVALUES_TERM_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr->state->names = list_ptr_new(mem_free_func);
				list_ptr_push(pr->state->names, tk1->u.ident);
				tk1->u.ident = NULL;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LBRACE)){
				st->state = PRS_LVALUES_TERM_LIST_DONE;
				parser_push(pr, PRS_LVALUES_TERM_LIST);
				return prr_more();
			}
			else if (st->lvaluesPeriods > 0 && tok_isKS(tk1, KS_PERIOD3)){
				if (st->lvaluesPeriods == 1) // specifying end of a def
					st->state = PRS_LVALUES_DEF_TAIL;
				else // otherwise, specifying end of a list
					st->state = PRS_LVALUES_TERM_LIST_TAIL;
				return prr_more();
			}
			return prr_error(format("Expecting variable"));

		case PRS_LVALUES_TERM_LOOKUP:
			st->next->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_RBRACE)){
				st->next->exprTerm = st->exprTerm;
				st->exprTerm = NULL;
				pr->state = st->next;
				prs_free(st);
				return prr_more();
			}
			st->state = PRS_LVALUES_TERM_LIST_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr->state->lvaluesPeriods = 2;
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST_TERM_DONE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (st->exprTerm2 == NULL){
				st->exprTerm2 = st->exprTerm;
				st->exprTerm = NULL;
			}
			else{
				st->exprTerm2 = expr_infix(flp, KS_COMMA, st->exprTerm2, st->exprTerm);
				st->exprTerm = NULL;
			}
			if (tok_isKS(tk1, KS_RBRACE)){
				st->next->exprTerm = st->exprTerm2;
				st->exprTerm2 = NULL;
				pr->state = st->next;
				prs_free(st);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				parser_push(pr, PRS_LVALUES_TERM);
				pr->state->lvaluesPeriods = 2;
				return prr_more();
			}
			return prr_error(format("Invalid list"));

		case PRS_LVALUES_TERM_LIST_TAIL:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_LVALUES_TERM_LIST_TAIL_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_LVALUES_TERM_LIST_TAIL_LOOKUP:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_LVALUES_TERM_LIST_TAIL_DONE;
			if (tok_isKS(tk1, KS_COMMA))
				return prr_more();
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST_TAIL_DONE:
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error(format("Missing end of list"));
			st->next->exprTerm = expr_prefix(flp, KS_PERIOD3, expr_names(flp, st->names));
			st->names = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_LIST_DONE:
			st->next->exprTerm = expr_list(flp, st->exprTerm);
			st->exprTerm = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp);

		case PRS_LVALUES_TERM_DONE:
			if (tk1->type == TOK_NEWLINE){
				list_ptr_push(st->lvalues, expr_infix(flp, KS_EQU, st->exprTerm, NULL));
				st->exprTerm = NULL;
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_EQU)){
				st->exprTerm2 = st->exprTerm;
				st->exprTerm = NULL;
				st->state = PRS_LVALUES_TERM_EXPR;
				parser_push(pr, PRS_EXPR);
				pr->state->exprAllowComma = false;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				list_ptr_push(st->lvalues, expr_infix(flp, KS_EQU, st->exprTerm, NULL));
				st->exprTerm = NULL;
				st->state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error(format("Invalid declaration"));

		case PRS_LVALUES_TERM_EXPR:
			list_ptr_push(st->lvalues, expr_infix(flp, KS_EQU, st->exprTerm2, st->exprTerm));
			st->exprTerm2 = NULL;
			st->exprTerm = NULL;
			if (tk1->type == TOK_NEWLINE){
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error(format("Invalid declaration"));

		case PRS_LVALUES_MORE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr->state->lvaluesPeriods = st->lvaluesPeriods;
			return parser_process(pr, flp);

		case PRS_LVALUES_DEF_TAIL:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_LVALUES_DEF_TAIL_DONE;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_LVALUES_DEF_TAIL_DONE:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->next->names = st->names;
			pr->state = st->next;
			prs_free(st);
			st = pr->state;
			list_ptr_push(st->lvalues, expr_prefix(flp, KS_PERIOD3, expr_names(flp, st->names)));
			st->next->lvalues = st->lvalues;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp);

		case PRS_BREAK:
			return parser_statement(pr, ast_break(flp));

		case PRS_CONTINUE:
			return parser_statement(pr, ast_continue(flp));

		case PRS_DECLARE:
			st->decls = list_ptr_new((free_func)decl_free);
			st->state = PRS_DECLARE2;
			return parser_process(pr, flp);

		case PRS_DECLARE2:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_DECLARE_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_DECLARE_LOOKUP:
			if (tok_isKS(tk1, KS_LPAREN)){
				st->state = PRS_DECLARE_STR;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				list_ptr_push(st->decls, decl_local(flp, st->names));
				st->names = NULL;
				st->state = PRS_DECLARE2;
				return prr_more();
			}
			list_ptr_push(st->decls, decl_local(flp, st->names));
			stmt = ast_declare(flp, st->decls);
			st->decls = NULL;
			return parser_statement(pr, stmt);

		case PRS_DECLARE_STR:
			if (tk1->type != TOK_STR)
				return prr_error(format("Expecting string constant"));
			list_ptr_push(st->decls, decl_native(flp, st->names, tk1->u.str));
			st->names = NULL;
			tk1->u.str = NULL;
			st->state = PRS_DECLARE_STR2;
			return prr_more();

		case PRS_DECLARE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(format("Expecting string constant"));
			st->state = PRS_DECLARE_STR3;
			return prr_more();

		case PRS_DECLARE_STR3:
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_DECLARE2;
				return prr_more();
			}
			stmt = ast_declare(flp, st->decls);
			st->decls = NULL;
			return parser_statement(pr, stmt);

		case PRS_DEF:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_DEF_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_DEF_LOOKUP:
			st->state = PRS_DEF_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr->state->lvalues = list_ptr_new((free_func)expr_free);
			pr->state->lvaluesPeriods = 1;
			return parser_process(pr, flp);

		case PRS_DEF_LVALUES:
			st->state = PRS_DEF_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return parser_process(pr, flp);

		case PRS_DEF_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of def block"));
			st->state = PRS_DEF_DONE;
			return prr_more();

		case PRS_DEF_DONE:
			stmt = ast_def(flp, st->names, st->lvalues, st->body);
			st->names = NULL;
			st->lvalues = NULL;
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_DO:
			st->state = PRS_DO_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return parser_process(pr, flp);

		case PRS_DO_BODY:
			if (tok_isKS(tk1, KS_WHILE)){
				st->body2 = st->body;
				st->body = NULL;
				st->state = PRS_DO_WHILE_EXPR;
				parser_push(pr, PRS_EXPR);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				st->state = PRS_DO_DONE;
				return prr_more();
			}
			return prr_error(format("Missing `while` or `end` of do block"));

		case PRS_DO_DONE:
			stmt = ast_doEnd(flp, st->body);
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_DO_WHILE_EXPR:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->state = PRS_DO_WHILE_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return prr_more();

		case PRS_DO_WHILE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of do-while block"));
			st->state = PRS_DO_WHILE_DONE;
			return prr_more();

		case PRS_DO_WHILE_DONE:
			stmt = ast_doWhile(flp, st->body2, st->exprTerm, st->body);
			st->body2 = NULL;
			st->exprTerm = NULL;
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_FOR:
			if (tk1->type == TOK_NEWLINE){
				st->state = PRS_LOOP_BODY;
				parser_push(pr, PRS_BODY);
				pr->state->body = list_ptr_new((free_func)ast_free);
				return prr_more();
			}
			st->state = PRS_FOR_VARS;
			if (tok_isKS(tk1, KS_VAR)){
				st->forVar = true;
				return prr_more();
			}
			return parser_process(pr, flp);

		case PRS_LOOP_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of for block"));
			st->state = PRS_LOOP_DONE;
			return prr_more();

		case PRS_LOOP_DONE:
			stmt = ast_loop(flp, st->body);
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_FOR_VARS:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_FOR_VARS_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_FOR_VARS_LOOKUP:
			st->names2 = st->names;
			st->names = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_FOR_VARS2;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COLON)){
				st->state = PRS_FOR_VARS2_LOOKUP;
				return parser_process(pr, flp);
			}
			return prr_error(format("Invalid for loop"));

		case PRS_FOR_VARS2:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_FOR_VARS2_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_FOR_VARS2_LOOKUP:
			if (!tok_isKS(tk1, KS_COLON))
				return prr_error(format("Expecting `:`"));
			st->state = PRS_FOR_VARS_DONE;
			return prr_more();

		case PRS_FOR_VARS_DONE:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(format("Expecting expression in for statement"));
			st->state = PRS_FOR_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_FOR_EXPR:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->state = PRS_FOR_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return prr_more();

		case PRS_FOR_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of for block"));
			st->state = PRS_FOR_DONE;
			return prr_more();

		case PRS_FOR_DONE:
			stmt = ast_for(flp, st->forVar, st->names2, st->names, st->exprTerm, st->body);
			st->names2 = NULL;
			st->names = NULL;
			st->exprTerm = NULL;
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_GOTO:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_GOTO_DONE;
			return prr_more();

		case PRS_GOTO_DONE:
			stmt = ast_goto(flp, pr->tk2->u.ident);
			pr->tk2->u.ident = NULL;
			return parser_statement(pr, stmt);

		case PRS_IF:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(format("Missing conditional expression"));
			st->state = PRS_IF_EXPR;
			st->conds = list_ptr_new((free_func)cond_free);
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_IF_EXPR:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->state = PRS_IF_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return prr_more();

		case PRS_IF_BODY:
			list_ptr_push(st->conds, cond_new(st->exprTerm, st->body));
			st->exprTerm = NULL;
			st->body = NULL;
			if (tok_isKS(tk1, KS_ELSEIF)){
				st->state = PRS_ELSEIF;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_ELSE)){
				st->state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				pr->state->body = list_ptr_new((free_func)ast_free);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				st->state = PRS_IF_DONE;
				return prr_more();
			}
			return prr_error(format("Missing `elseif`, `else`, or `end` of if block"));

		case PRS_ELSEIF:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(format("Missing conditional expression"));
			st->state = PRS_IF_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_IF_DONE:
			stmt = ast_if(flp, st->conds, list_ptr_new((free_func)ast_free));
			st->conds = NULL;
			return parser_statement(pr, stmt);

		case PRS_ELSE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of if block"));
			st->state = PRS_ELSE_DONE;
			return prr_more();

		case PRS_ELSE_DONE:
			stmt = ast_if(flp, st->conds, st->body);
			st->conds = NULL;
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_INCLUDE:
			st->incls = list_ptr_new((free_func)incl_free);
			st->state = PRS_INCLUDE2;
			return parser_process(pr, flp);

		case PRS_INCLUDE2:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			else if (tk1->type == TOK_IDENT){
				st->state = PRS_INCLUDE_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr->state->names = list_ptr_new(mem_free_func);
				list_ptr_push(pr->state->names, tk1->u.ident);
				tk1->u.ident = NULL;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LPAREN)){
				st->state = PRS_INCLUDE_STR;
				return prr_more();
			}
			return prr_error(format("Expecting file as constant string literal"));

		case PRS_INCLUDE_LOOKUP:
			if (!tok_isKS(tk1, KS_LPAREN))
				return prr_error(format("Expecting file as constant string literal"));
			st->state = PRS_INCLUDE_STR;
			return prr_more();

		case PRS_INCLUDE_STR:
			if (tk1->type != TOK_STR)
				return prr_error(format("Expecting file as constant string literal"));
			st->str = tk1->u.str;
			tk1->u.str = NULL;
			st->state = PRS_INCLUDE_STR2;
			return prr_more();

		case PRS_INCLUDE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(format("Expecting file as constant string literal"));
			st->state = PRS_INCLUDE_STR3;
			return prr_more();

		case PRS_INCLUDE_STR3:
			list_ptr_push(st->incls, incl_new(flp, st->names, st->str));
			st->names = NULL;
			st->str = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_INCLUDE2;
				return prr_more();
			}
			stmt = ast_include(flp, st->incls);
			st->incls = NULL;
			return parser_statement(pr, stmt);

		case PRS_NAMESPACE:
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_NAMESPACE_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_NAMESPACE_LOOKUP:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(format("Missing newline or semicolon"));
			st->state = PRS_NAMESPACE_BODY;
			parser_push(pr, PRS_BODY);
			pr->state->body = list_ptr_new((free_func)ast_free);
			return prr_more();

		case PRS_NAMESPACE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(format("Missing `end` of namespace block"));
			st->state = PRS_NAMESPACE_DONE;
			return prr_more();

		case PRS_NAMESPACE_DONE:
			stmt = ast_namespace(flp, st->names, st->body);
			st->names = NULL;
			st->body = NULL;
			return parser_statement(pr, stmt);

		case PRS_RETURN:
			if (tk1->type == TOK_NEWLINE)
				return parser_statement(pr, ast_return(flp, expr_nil(flp)));
			st->state = PRS_RETURN_DONE;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_RETURN_DONE:
			stmt = ast_return(flp, st->exprTerm);
			st->exprTerm = NULL;
			return parser_statement(pr, stmt);

		case PRS_USING:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(format("Expecting identifier"));
			st->namesList = list_ptr_new((free_func)list_ptr_free);
			st->state = PRS_USING2;
			return parser_process(pr, flp);

		case PRS_USING2:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tk1->type != TOK_IDENT)
				return prr_error(format("Expecting identifier"));
			st->state = PRS_USING_LOOKUP;
			parser_push(pr, PRS_LOOKUP);
			pr->state->names = list_ptr_new(mem_free_func);
			list_ptr_push(pr->state->names, tk1->u.ident);
			tk1->u.ident = NULL;
			return prr_more();

		case PRS_USING_LOOKUP:
			list_ptr_push(st->namesList, st->names);
			st->names = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_USING2;
				return prr_more();
			}
			stmt = ast_using(flp, st->namesList);
			st->namesList = NULL;
			return parser_statement(pr, stmt);

		case PRS_VAR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_VAR_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr->state->lvalues = list_ptr_new((free_func)expr_free);
			return parser_process(pr, flp);

		case PRS_VAR_LVALUES:
			if (st->lvalues->size <= 0)
				return prr_error(format("Invalid variable declaration"));
			stmt = ast_var(flp, st->lvalues);
			st->lvalues = NULL;
			return parser_statement(pr, stmt);

		case PRS_IDENTS:
			if (st->names->size == 1 && tok_isKS(tk1, KS_COLON))
				return parser_statement(pr, ast_label(flp, list_ptr_pop(st->names)));
			pr->level++;
			st->state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR_POST);
			pr->state->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			return parser_process(pr, flp);

		case PRS_EVAL:
			st->state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_EVAL_EXPR:
			stmt = ast_eval(flp, st->exprTerm);
			st->exprTerm = NULL;
			return parser_statement(pr, stmt);

		case PRS_EXPR:
			if (tok_isPre(tk1)){
				st->exprPreStack = ets_new(tk1, st->exprPreStack);
				return prr_more();
			}
			st->state = PRS_EXPR_TERM;
			return parser_process(pr, flp);

		case PRS_EXPR_TERM:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_NIL)){
				st->state = PRS_EXPR_POST;
				st->exprTerm = expr_nil(flp);
				return prr_more();
			}
			else if (tk1->type == TOK_NUM){
				st->state = PRS_EXPR_POST;
				st->exprTerm = expr_num(flp, tk1->u.num);
				return prr_more();
			}
			else if (tk1->type == TOK_STR){
				st->state = PRS_EXPR_POST;
				st->exprTerm = expr_str(flp, tk1->u.str);
				tk1->u.str = NULL;
				return prr_more();
			}
			else if (tk1->type == TOK_IDENT){
				st->state = PRS_EXPR_TERM_LOOKUP;
				parser_push(pr, PRS_LOOKUP);
				pr->state->names = list_ptr_new(mem_free_func);
				list_ptr_push(pr->state->names, tk1->u.ident);
				tk1->u.ident = NULL;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LBRACE)){
				st->state = PRS_EXPR_TERM_ISEMPTYLIST;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_LPAREN)){
				st->state = PRS_EXPR_TERM_CLOSEPAREN;
				parser_push(pr, PRS_EXPR);
				pr->state->exprAllowTrailComma = true;
				return prr_more();
			}
			return prr_error(format("Invalid expression"));

		case PRS_EXPR_TERM_ISEMPTYLIST:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			else if (tok_isKS(tk1, KS_RBRACE)){
				st->state = PRS_EXPR_POST;
				st->exprTerm = expr_list(flp, NULL);
				return prr_more();
			}
			st->state = PRS_EXPR_TERM_CLOSEBRACE;
			parser_push(pr, PRS_EXPR);
			pr->state->exprAllowTrailComma = true;
			return parser_process(pr, flp);

		case PRS_EXPR_TERM_CLOSEBRACE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error(format("Expecting close brace"));
			st->exprTerm = expr_list(flp, st->exprTerm);
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_CLOSEPAREN:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(format("Expecting close parenthesis"));
			st->exprTerm = expr_paren(flp, st->exprTerm);
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_LOOKUP:
			st->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			st->state = PRS_EXPR_POST;
			return parser_process(pr, flp);

		case PRS_EXPR_POST:
			if (tk1->type == TOK_NEWLINE){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_LBRACKET)){
				st->state = PRS_EXPR_INDEX_CHECK;
				return prr_more();
			}
			else if (tok_isMid(tk1, st->exprAllowComma, st->exprAllowPipe)){
				if (st->exprAllowTrailComma && tok_isKS(tk1, KS_COMMA)){
					st->state = PRS_EXPR_COMMA;
					return prr_more();
				}
				st->state = PRS_EXPR_MID;
				return parser_process(pr, flp);
			}
			else if (tok_isKS(tk1, KS_RBRACE) || tok_isKS(tk1, KS_RBRACKET) ||
				tok_isKS(tk1, KS_RPAREN) || tok_isKS(tk1, KS_COLON) || tok_isKS(tk1, KS_COMMA) ||
				tok_isKS(tk1, KS_PIPE)){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
			}
			// otherwise, this should be a call
			st->exprTerm2 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_POST_CALL;
			parser_push(pr, PRS_EXPR);
			pr->state->exprAllowPipe = false;
			return parser_process(pr, flp);

		case PRS_EXPR_POST_CALL:
			st->exprTerm = expr_call(flp, st->exprTerm2, st->exprTerm);
			st->exprTerm2 = NULL;
			st->state = PRS_EXPR_POST;
			return parser_process(pr, flp);

		case PRS_EXPR_INDEX_CHECK:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st->state = PRS_EXPR_INDEX_COLON_CHECK;
				return prr_more();
			}
			st->exprTerm2 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_INDEX_EXPR_CHECK;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_EXPR_INDEX_COLON_CHECK:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st->exprTerm = expr_slice(flp, st->exprTerm, NULL, NULL);
				st->state = PRS_EXPR_POST;
				return prr_more();
			}
			st->exprTerm2 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_INDEX_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_EXPR_INDEX_COLON_EXPR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error(format("Missing close bracket"));
			st->exprTerm = expr_slice(flp, st->exprTerm2, NULL, st->exprTerm);
			st->exprTerm2 = NULL;
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_CHECK:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_COLON)){
				st->state = PRS_EXPR_INDEX_EXPR_COLON_CHECK;
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error(format("Missing close bracket"));
			st->exprTerm = expr_index(flp, st->exprTerm2, st->exprTerm);
			st->exprTerm2 = NULL;
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_COLON_CHECK:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st->exprTerm = expr_slice(flp, st->exprTerm2, st->exprTerm, NULL);
				st->state = PRS_EXPR_POST;
				return prr_more();
			}
			st->exprTerm3 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_INDEX_EXPR_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp);

		case PRS_EXPR_INDEX_EXPR_COLON_EXPR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error(format("Missing close bracket"));
			st->exprTerm = expr_slice(flp, st->exprTerm2, st->exprTerm3, st->exprTerm);
			st->exprTerm2 = NULL;
			st->exprTerm3 = NULL;
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_COMMA:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft){
				parser_rev(pr); // keep the comma in tk1
				return prr_more();
			}
			if (!tok_isKS(tk1, KS_RPAREN) && !tok_isKS(tk1, KS_RBRACE)){
				st->state = PRS_EXPR_MID;
				parser_rev(pr);
				parser_process(pr, flp);
				parser_fwd(pr, pr->tkR);
				return parser_process(pr, flp);
			}
			// found a trailing comma
			st->state = PRS_EXPR_FINISH;
			return parser_process(pr, flp);

		case PRS_EXPR_MID:
			if (!tok_isMid(tk1, st->exprAllowComma, st->exprAllowPipe)){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp);
			}
			while (true){
				// fight between the Pre and the Mid
				while (st->exprPreStack != NULL && tok_isPreBeforeMid(st->exprPreStack->tk, tk1)){
					// apply the Pre
					st->exprTerm = expr_prefix(flp, st->exprPreStack->tk->u.k, st->exprTerm);
					ets next = st->exprPreStack->next;
					ets_free(st->exprPreStack);
					st->exprPreStack = next;
				}

				// if we've exhaused the exprPreStack, then check against the exprMidStack
				if (st->exprPreStack == NULL && st->exprMidStack != NULL &&
					tok_isMidBeforeMid(st->exprMidStack->tk, tk1)){
					// apply the previous Mid
					pri_st pri = parser_infix(flp, st->exprMidStack->tk->u.k, st->exprStack->ex,
						st->exprTerm);
					if (pri.type == PRI_ERROR)
						return prr_error(pri.u.msg);
					st->exprTerm = pri.u.ex;
					st->exprPreStack = st->exprPreStackStack->e;
					st->exprPreStackStack->e = NULL;
					eps next = st->exprPreStackStack->next;
					eps_free(st->exprPreStackStack);
					st->exprPreStackStack = next;
					ets next2 = st->exprMidStack->next;
					ets_free(st->exprMidStack);
					st->exprMidStack = next2;
				}
				else // otherwise, the current Mid wins
					break;
			}
			// finally, we're safe to apply the Mid...
			// except instead of applying it, we need to schedule to apply it, in case another
			// operator takes precedence over this one
			st->exprPreStackStack = eps_new(st->exprPreStack, st->exprPreStackStack);
			st->exprPreStack = NULL;
			st->exprStack = exs_new(st->exprTerm, st->exprStack);
			st->exprTerm = NULL;
			st->exprMidStack = ets_new(tk1, st->exprMidStack);
			pr->tk1 = NULL;
			st->state = PRS_EXPR;
			return prr_more();

		case PRS_EXPR_FINISH:
			while (true){
				// fight between the Pre and the Mid
				while (st->exprPreStack != NULL &&
					(st->exprMidStack == NULL ||
						tok_isPreBeforeMid(st->exprPreStack->tk, st->exprMidStack->tk))){
					// apply the Pre
					st->exprTerm = expr_prefix(flp, st->exprPreStack->tk->u.k, st->exprTerm);
					ets next = st->exprPreStack->next;
					ets_free(st->exprPreStack);
					st->exprPreStack = next;
				}

				if (st->exprMidStack == NULL)
					break;

				// apply the Mid
				pri_st pri = parser_infix(flp, st->exprMidStack->tk->u.k, st->exprStack->ex,
					st->exprTerm);

				if (pri.type == PRI_ERROR)
					return prr_error(pri.u.msg);
				st->exprTerm = pri.u.ex;
				st->exprStack->ex = NULL;
				exs next = st->exprStack->next;
				exs_free(st->exprStack);
				st->exprStack = next;
				st->exprPreStack = st->exprPreStackStack->e;
				st->exprPreStackStack->e = NULL;
				eps next2 = st->exprPreStackStack->next;
				eps_free(st->exprPreStackStack);
				st->exprPreStackStack = next2;
				ets next3 = st->exprMidStack->next;
				ets_free(st->exprMidStack);
				st->exprMidStack = next3;
			}
			// everything has been applied, and exprTerm has been set!
			st->next->exprTerm = st->exprTerm;
			st->exprTerm = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp);
	}
}

#if 0

function parser_add(pr, tk, flp){
	parser_fwd(pr, tk);
	return parser_process(pr, flp);
}

function parser_close(pr){
	if (pr.state.state != PRS_STATEMENT ||
		pr.state.next == NULL ||
		pr.state.next.state != PRS_START_STATEMENT)
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
		vars: [FVR_VAR], // first frame variable reserved for arguments
		lbls: [],
		parent: parent
	};
}

function frame_diff(parent, child){
	var fdiff = 0;
	while (child != parent && child != NULL){
		child = child.parent;
		fdiff++;
	}
	if (child == NULL)
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
	var fr = frame_new(NULL);
	var sc = scope_new(fr, NULL, NULL, NULL);
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
	sym.sc = scope_new(sym.fr, NULL, NULL, sym.sc);
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
	while (trysc != NULL){
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
		SAC(sym, 'inf'       , OP_NUM_INF       ,  0);
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
		SAC(sym, 'find'      , OP_LIST_FIND     ,  3);
		SAC(sym, 'findRev'   , OP_LIST_FINDREV  ,  3);
		SAC(sym, 'join'      , OP_LIST_JOIN     ,  2);
		SAC(sym, 'rev'       , OP_LIST_REV      ,  1);
		SAC(sym, 'str'       , OP_LIST_STR      ,  1);
		SAC(sym, 'sort'      , OP_LIST_SORT     ,  1);
		SAC(sym, 'sortRev'   , OP_LIST_SORTREV  ,  1);
		SAC(sym, 'sortCmp'   , OP_LIST_SORTCMP  ,  2);
	symtbl_popNamespace(sym);
	symtbl_pushNamespace(sym, ['pickle']);
		SAC(sym, 'valid'     , OP_PICKLE_VALID  ,  1);
		SAC(sym, 'str'       , OP_PICKLE_STR    ,  1);
		SAC(sym, 'val'       , OP_PICKLE_VAL    ,  1);
	symtbl_popNamespace(sym);
}

//
// program
//

function program_new(repl){
	return {
		repl: repl,
		initFrameSize: 0,
		strTable: [],
		numTable: [],
		keyTable: [],
		ops: []
	};
}

var LVR_VAR    = 'LVR_VAR';
var LVR_INDEX  = 'LVR_INDEX';
var LVR_SLICE  = 'LVR_SLICE';
var LVR_LIST   = 'LVR_LIST';

function lvr_var(flp, vlc){
	return { flp: flp, vlc: vlc, type: LVR_VAR };
}

function lvr_index(flp, obj, key){
	return { flp: flp, vlc: NULL, type: LVR_INDEX, obj: obj, key: key };
}

function lvr_slice(flp, obj, start, len){
	return { flp: flp, vlc: NULL, type: LVR_SLICE, obj: obj, start: start, len: len };
}

function lvr_list(flp, body, rest){
	return { flp: flp, vlc: NULL, type: LVR_LIST, body: body, rest: rest };
}

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
		if (ex.ex == NULL)
			return lvp_error(ex.flp, 'Invalid assignment');
		var body = [];
		var rest = NULL;
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
			var le = lval_prepare(prg, sym, ex.obj);
			if (le.type == LVP_ERROR)
				return le;
			var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.key);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.flp, pe.msg);
			return lvp_ok(lvr_index(ex.flp, le.lv, pe.vlc));
		} break;

		case EXPR_SLICE: {
			var le = lval_prepare(prg, sym, ex.obj);
			if (le.type == LVP_ERROR)
				return le;

			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, le.lv);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.flp, pe.msg);

			var sr = program_slice(prg, sym, pe.vlc, ex);
			if (sr.type == PSR_ERROR)
				return lvp_error(sr.flp, sr.msg);

			return lvp_ok(lvr_slice(ex.flp, le.lv, sr.start, sr.len));
		} break;

		case EXPR_LIST: {
			var body = [];
			var rest = NULL;
			if (ex === NULL)
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
		} break;

		default:
			throw new Error('Invalid lval_prepare type');
	}
	return lvp_error(ex.flp, 'Invalid assignment');
}

function lval_clearTemps(lv, sym){
	if (lv.type != LVR_VAR && lv.vlc != NULL){
		symtbl_clearTemp(sym, lv.vlc);
		lv.vlc = NULL;
	}
	switch (lv.type){
		case LVR_VAR:
			return;
		case LVR_INDEX:
			lval_clearTemps(lv.obj, sym);
			symtbl_clearTemp(sym, lv.key);
			return;
		case LVR_SLICE:
			lval_clearTemps(lv.obj, sym);
			symtbl_clearTemp(sym, lv.start);
			symtbl_clearTemp(sym, lv.len);
			return;
		case LVR_LIST:
			for (var i = 0; i < lv.body.length; i++)
				lval_clearTemps(lv.body[i], sym);
			if (lv.rest != NULL)
				lval_clearTemps(lv.rest, sym);
			return;
	}
	throw new Error('Invalid LVR in lval_clearTemps');
}

function program_evalLval(prg, sym, mode, intoVlc, lv, mutop, valueVlc){
	// first, perform the assignment of valueVlc into lv
	switch (lv.type){
		case LVR_VAR:
			if (mutop < 0)
				op_move(prg.ops, lv.vlc, valueVlc);
			else
				op_binop(prg.ops, mutop, lv.vlc, lv.vlc, valueVlc);
			break;

		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			if (mutop < 0)
				op_setat(prg.ops, pe.vlc, lv.key, valueVlc);
			else{
				pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, mutop, pe.vlc, pe.vlc, valueVlc);
				op_setat(prg.ops, lv.obj.vlc, lv.key, pe.vlc);
			}
		} break;

		case LVR_SLICE: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			if (mutop < 0)
				op_splice(prg.ops, pe.vlc, lv.start, lv.len, valueVlc);
			else{
				pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_evalLval(prg, sym, PEM_EMPTY, NULL,
					lvr_var(lv.flp, lv.vlc), mutop, valueVlc);
				if (pe.type == PER_ERROR)
					return pe;
				op_splice(prg.ops, lv.obj.vlc, lv.start, lv.len, lv.vlc);
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
				var pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lv.body[i], mutop, t);
				if (pe.type == PER_ERROR)
					return pe;
			}

			if (lv.rest != NULL){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv.flp, ts.msg);
				var t2 = ts.vlc;

				op_num(prg.ops, t, lv.body.length);
				op_rest(prg.ops, t2, valueVlc, t);
				op_slice(prg.ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lv.rest, mutop, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			symtbl_clearTemp(sym, t);
		} break;
	}

	// now, see if we need to put the result into anything
	if (mode == PEM_EMPTY){
		lval_clearTemps(lv, sym);
		return per_ok(NULL);
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
	lval_clearTemps(lv, sym);
	return per_ok(intoVlc);
}

var PSR_OK    = 'PSR_OK';
var PSR_ERROR = 'PSR_ERROR';

function psr_ok(start, len){
	return { type: PSR_OK, start: start, len: len };
}

function psr_error(flp, msg){
	return { type: PSR_ERROR, flp: flp, msg: msg };
}

function program_slice(prg, sym, obj, ex){
	var start;
	if (ex.start == NULL){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex.flp, ts.msg);
		start = ts.vlc;
		op_num(prg.ops, start, 0);
	}
	else{
		pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.start);
		if (pe.type == PER_ERROR)
			return psr_error(pe.flp, pe.msg);
		start = pe.vlc;
	}

	var len;
	if (ex.len == NULL){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex.flp, ts.msg);
		len = ts.vlc;
		op_rest(prg.ops, len, obj, start);
	}
	else{
		pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.len);
		if (pe.type == PER_ERROR)
			return psr_error(pe.flp, pe.msg);
		len = pe.vlc;
	}

	return psr_ok(start, len);
}

var PER_OK    = 'PER_OK';
var PER_ERROR = 'PER_ERROR';

function per_ok(vlc){
	return { type: PER_OK, vlc: vlc };
}

function per_error(flp, msg){
	return { type: PER_ERROR, flp: flp, msg: msg };
}

var PLM_CREATE = 'PLM_CREATE';
var PLM_INTO   = 'PLM_INTO';

function program_lvalGet(prg, sym, mode, intoVlc, lv){
	if (lv.vlc != NULL){
		if (mode == PLM_CREATE)
			return per_ok(lv.vlc);
		op_move(prg.ops, intoVlc, lv.vlc);
		return per_ok(intoVlc);
	}

	if (mode == PLM_CREATE){
		var ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return lvp_error(lv.flp, ts.msg);
		intoVlc = lv.vlc = ts.vlc;
	}

	switch (lv.type){
		case LVR_VAR:
			throw new Error('LVR_VAR doesn\'t have vlc set');

		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			op_getat(prg.ops, intoVlc, pe.vlc, lv.key);
		} break;

		case LVR_SLICE: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			op_slice(prg.ops, intoVlc, pe.vlc, lv.start, lv.len);
		} break;

		case LVR_LIST: {
			op_list(prg.ops, intoVlc, lv.body.length);

			for (var i = 0; i < lv.body.length; i++){
				var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.body[i]);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, OP_PUSH, intoVlc, intoVlc, pe.vlc);
			}

			if (lv.rest != NULL){
				var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.rest);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, OP_APPEND, intoVlc, intoVlc, pe.vlc);
			}
		} break;
	}

	return per_ok(intoVlc);
}

var PEM_EMPTY  = 'PEM_EMPTY';
var PEM_CREATE = 'PEM_CREATE';
var PEM_INTO   = 'PEM_INTO';

function program_evalCall_checkList(prg, sym, flp, vlc){
	var ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR)
		return per_error(flp, ts.msg);
	var t = ts.vlc;
	var skip = label_new('%skip');
	op_unop(prg.ops, OP_ISLIST, t, vlc);
	label_jumpTrue(skip, prg.ops, t);
	op_aborterr(prg.ops, 0x01);
	label_declare(skip, prg.ops);
	symtbl_clearTemp(sym, t);
	return per_ok(NULL);
}

function program_evalCall(prg, sym, mode, intoVlc, flp, nsn, paramsAt, params){
	// params can be NULL to indicate emptiness
	if (nsn.type == NSN_CMD_OPCODE && nsn.opcode == -1){ // short-circuit `pick`
		if (paramsAt || params == NULL || params.type != EXPR_GROUP || params.group.length != 3)
			return per_error(flp, 'Using `pick` requires exactly three arguments');

		var pe = program_eval(prg, sym, PEM_CREATE, NULL, params.group[0]);
		if (pe.type == PER_ERROR)
			return pe;
		if (mode == PEM_CREATE){
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			intoVlc = ts.vlc;
		}

		var pickfalse = label_new('%pickfalse');
		var finish = label_new('%pickfinish');

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

	if (nsn.type == NSN_CMD_OPCODE && (nsn.opcode == OP_EXIT || nsn.opcode == OP_ABORT) &&
		params == NULL){
		// if empty exit/abort, then just call it with nil
		if (mode == PEM_EMPTY || mode == PEM_CREATE){
			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			intoVlc = ts.vlc;
		}
		op_nil(prg.ops, intoVlc);
		if (nsn.opcode == OP_EXIT)
			op_exit(prg.ops, intoVlc);
		else
			op_abort(prg.ops, intoVlc);
		if (mode == PEM_EMPTY){
			symtbl_clearTemp(sym, intoVlc);
			return per_ok(NULL);
		}
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
		var pe = program_eval(prg, sym, PEM_CREATE, NULL, params);
		if (pe.type == PER_ERROR)
			return pe;
		args = pe.vlc;

		if (nsn.type == NSN_CMD_LOCAL)
			label_call(nsn.lbl, prg.ops, intoVlc, args, frame_diff(nsn.fr, sym.fr));
		else if (nsn.type == NSN_CMD_NATIVE)
			op_native(prg.ops, intoVlc, args, nsn.index);
		else{ // variable argument NSN_CMD_OPCODE
			if (nsn.opcode == OP_EXIT)
				op_exit(prg.ops, args);
			else if (nsn.opcode == OP_ABORT)
				op_abort(prg.ops, args);
			else
				op_param1(prg.ops, nsn.opcode, intoVlc, args);
		}

		symtbl_clearTemp(sym, args);
	}
	else if (nsn.type == NSN_CMD_OPCODE){
		if (nsn.params == 0){
			if (params != NULL){
				if (paramsAt){
					// this needs to fail: `var x = 1; num.tau @ x;`
					// even though `num.tau` takes zero parameters
					var pe = program_eval(prg, sym, PEM_CREATE, NULL, params);
					if (pe.type == PER_ERROR)
						return pe;
					var args = pe.vlc;
					pe = program_evalCall_checkList(prg, sym, flp, args);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, args);
				}
				else{
					var pe = program_eval(prg, sym, PEM_EMPTY, NULL, params);
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
				var pe = program_eval(prg, sym, PEM_CREATE, NULL, params);
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
			else if (params == NULL){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.msg);
				p1 = p2 = p3 = ts.vlc;
				op_nil(prg.ops, p1);
			}
			else{
				if (params.type == EXPR_GROUP){
					var pe = program_eval(prg, sym, PEM_CREATE, NULL, params.group[0]);
					if (pe.type == PER_ERROR)
						return pe;
					p1 = pe.vlc;

					if (nsn.params > 1)
						pe = program_eval(prg, sym, PEM_CREATE, NULL, params.group[1]);
					else
						pe = program_eval(prg, sym, PEM_EMPTY, NULL, params.group[1]);
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
							pe = program_eval(prg, sym, PEM_CREATE, NULL, params.group[2]);
							if (pe.type == PER_ERROR)
								return pe;
							p3 = pe.vlc;
						}
					}

					for (var i = rest; i < params.group.length; i++){
						pe = program_eval(prg, sym, PEM_EMPTY, NULL, params.group[i]);
						if (pe.type == PER_ERROR)
							return pe;
					}
				}
				else{
					var pe = program_eval(prg, sym, PEM_CREATE, NULL, params);
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
		throw new Error('Invalid gevalCall');

	if (mode == PEM_EMPTY){
		symtbl_clearTemp(sym, intoVlc);
		return per_ok(NULL);
	}
	return per_ok(intoVlc);
}

function program_lvalCheckNil(prg, sym, lv, jumpFalse, inverted, skip){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv);
			if (pe.type == PER_ERROR)
				return pe;
			if (jumpFalse == !inverted)
				label_jumpFalse(skip, prg.ops, pe.vlc);
			else
				label_jumpTrue(skip, prg.ops, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);
		} break;

		case LVR_SLICE: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			var idx = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			var t = ts.vlc;

			op_num(prg.ops, idx, 0);

			var next = label_new('%condslicenext');
			label_declare(next, prg.ops);

			op_binop(prg.ops, OP_LT, t, idx, lv.len);

			var keep = label_new('%condslicekeep');
			label_jumpFalse(inverted ? keep : skip, prg.ops, t);

			op_binop(prg.ops, OP_ADD, t, idx, lv.start);
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
			var keep = label_new('%condkeep');
			for (var i = 0; i < lv.body.length; i++)
				program_lvalCheckNil(prg, sym, lv.body[i], jumpFalse, true, inverted ? skip : keep);
			if (lv.rest != NULL)
				program_lvalCheckNil(prg, sym, lv.rest, jumpFalse, true, inverted ? skip : keep);
			if (!inverted)
				label_jump(skip, prg.ops);
			label_declare(keep, prg.ops);
		} break;
	}
	return per_ok(NULL);
}

function program_lvalCondAssignPart(prg, sym, lv, jumpFalse, valueVlc){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv);
			if (pe.type == PER_ERROR)
				return pe;
			var skip = label_new('%condskippart');
			if (jumpFalse)
				label_jumpFalse(skip, prg.ops, pe.vlc);
			else
				label_jumpTrue(skip, prg.ops, pe.vlc);
			symtbl_clearTemp(sym, pe.vlc);
			pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lv, -1, valueVlc);
			if (pe.type == PER_ERROR)
				return pe;
			label_declare(skip, prg.ops);
		} break;

		case LVR_SLICE: {
			var pe = program_lvalGet(prg, sym, PLM_CREATE, NULL, lv.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			var idx = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			var t = ts.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.msg);
			var t2 = ts.vlc;

			op_num(prg.ops, idx, 0);

			var next = label_new('%condpartslicenext');
			label_declare(next, prg.ops);

			op_binop(prg.ops, OP_LT, t, idx, lv.len);

			var done = label_new('%condpartslicedone');
			label_jumpFalse(done, prg.ops, t);

			var inc = label_new('%condpartsliceinc');
			op_binop(prg.ops, OP_ADD, t, idx, lv.start);
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
				return per_error(ex.flp, ts.msg);
			var t = ts.vlc;
			for (var i = 0; i < lv.body.length; i++){
				op_num(prg.ops, t, i);
				op_getat(prg.ops, t, valueVlc, t);
				var pe = program_lvalCondAssignPart(prg, sym, lv.body[i], jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			if (lv.rest != NULL){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				var t2 = ts.vlc;
				op_num(prg.ops, t, lv.body.length);
				op_rest(prg.ops, t2, valueVlc, t);
				op_slice(prg.ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				var pe = program_lvalCondAssignPart(prg, sym, lv.rest, jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			symtbl_clearTemp(sym, t);
		} break;
	}
	return per_ok(NULL);
}

function program_lvalCondAssign(prg, sym, lv, jumpFalse, valueVlc){
	switch (lv.type){
		case LVR_VAR:
		case LVR_INDEX: {
			var pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lv, -1, valueVlc);
			if (pe.type == PER_ERROR)
				return pe;
		} break;

		case LVR_SLICE:
		case LVR_LIST:
			return program_lvalCondAssignPart(prg, sym, lv, jumpFalse, valueVlc);
	}
	symtbl_clearTemp(sym, valueVlc);
	return per_ok(NULL);
}

function program_eval(prg, sym, mode, intoVlc, ex){
	switch (ex.type){
		case EXPR_NIL: {
			if (mode == PEM_EMPTY)
				return per_ok(NULL);
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
				return per_ok(NULL);
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
			op_num_tbl(prg.ops, intoVlc, index);
			return per_ok(intoVlc);
		} break;

		case EXPR_STR: {
			if (mode == PEM_EMPTY)
				return per_ok(NULL);
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
				if (ex.ex != NULL)
					return program_eval(prg, sym, PEM_EMPTY, NULL, ex.ex);
				return per_ok(NULL);
			}
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}
			if (ex.ex != NULL){
				if (ex.ex.type == EXPR_GROUP){
					op_list(prg.ops, intoVlc, ex.ex.group.length);
					for (var i = 0; i < ex.ex.group.length; i++){
						var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.ex.group[i]);
						if (pe.type == PER_ERROR)
							return pe;
						symtbl_clearTemp(sym, pe.vlc);
						op_binop(prg.ops, OP_PUSH, intoVlc, intoVlc, pe.vlc);
					}
				}
				else{
					op_list(prg.ops, intoVlc, 1);
					var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.ex);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, pe.vlc);
					op_binop(prg.ops, OP_PUSH, intoVlc, intoVlc, pe.vlc);
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
						return per_ok(NULL);
					var varVlc = varloc_new(frame_diff(sl.nsn.fr, sym.fr), sl.nsn.index);
					if (mode == PEM_CREATE)
						return per_ok(varVlc);
					op_move(prg.ops, intoVlc, varVlc);
					return per_ok(intoVlc);
				} break;

				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
				case NSN_CMD_OPCODE:
					return program_evalCall(prg, sym, mode, intoVlc, ex.flp, sl.nsn, false, NULL);

				case NSN_NAMESPACE:
					return per_error(ex.flp, 'Invalid expression');
			}
			throw new Error('Unknown NSN type');
		} break;

		case EXPR_VAR: {
			if (mode == PEM_EMPTY)
				return per_ok(NULL);
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
				var pe = program_eval(prg, sym, PEM_EMPTY, NULL, ex.group[i]);
				if (pe.type == PER_ERROR)
					return pe;
			}
			break;

		case EXPR_PREFIX: {
			var unop = ks_toUnaryOp(ex.k);
			if (unop < 0)
				return per_error(ex.flp, 'Invalid unary operator');
			var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.ex);
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
				return per_ok(NULL);
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
					var skip = label_new('%condsetskip');

					var pe = program_lvalCheckNil(prg, sym, lp.lv, ex.k == KS_AMP2EQU, false, skip);
					if (pe.type == PER_ERROR)
						return pe;

					pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.right);
					if (pe.type == PER_ERROR)
						return pe;

					pe = program_lvalCondAssign(prg, sym, lp.lv, ex.k == KS_AMP2EQU, pe.vlc);
					if (pe.type == PER_ERROR)
						return pe;

					if (mode == PEM_EMPTY){
						label_declare(skip, prg.ops);
						lval_clearTemps(lp.lv, sym);
						return per_ok(NULL);
					}

					var done = label_new('%condsetdone');
					label_jump(done, prg.ops);
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

					label_declare(done, prg.ops);
					lval_clearTemps(lp.lv, sym);
					return per_ok(intoVlc);
				}

				// special handling for basic variable assignment to avoid a temporary
				if (ex.k == KS_EQU && lp.lv.type == LVR_VAR){
					var pe = program_eval(prg, sym, PEM_INTO, lp.lv.vlc, ex.right);
					if (pe.type == PER_ERROR)
						return pe;
					if (mode == PEM_EMPTY)
						return per_ok(NULL);
					else if (mode == PEM_CREATE){
						var ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex.flp, ts.msg);
						intoVlc = ts.vlc;
					}
					op_move(prg.ops, intoVlc, lp.lv.vlc);
					return per_ok(intoVlc);
				}

				var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				return program_evalLval(prg, sym, mode, intoVlc, lp.lv, mutop, pe.vlc);
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}

			var binop = ks_toBinaryOp(ex.k);
			if (binop >= 0){
				var pe = program_eval(prg, sym, PEM_INTO, intoVlc, ex.left);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg.ops, binop, intoVlc, intoVlc, pe.vlc);
				symtbl_clearTemp(sym, pe.vlc);
			}
			else if (ex.k == KS_AT){
				if (ex.left.type != EXPR_NAMES)
					return per_error(ex.flp, 'Invalid call');
				var sl = symtbl_lookup(sym, ex.left.names);
				if (sl.type == STL_ERROR)
					return per_error(ex.flp, sl.msg);
				pe = program_evalCall(prg, sym, mode, intoVlc, ex.flp, sl.nsn, true, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
			}
			else if (ex.k == KS_AMP2 || ex.k == KS_PIPE2){
				var pe = program_eval(prg, sym, PEM_INTO, intoVlc, ex.left);
				if (pe.type == PER_ERROR)
					return pe;
				var finish = label_new('%finish');
				if (ex.k == KS_AMP2)
					label_jumpFalse(finish, prg.ops, intoVlc);
				else
					label_jumpTrue(finish, prg.ops, intoVlc);
				pe = program_eval(prg, sym, PEM_INTO, intoVlc, ex.right);
				if (pe.type == PER_ERROR)
					return pe;
				label_declare(finish, prg.ops);
			}
			else
				return per_error(ex.flp, 'Invalid operation');

			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(NULL);
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
				var pe = program_eval(prg, sym, PEM_EMPTY, NULL, ex.obj);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_eval(prg, sym, PEM_EMPTY, NULL, ex.key);
				if (pe.type == PER_ERROR)
					return pe;
				return per_ok(NULL);
			}
			else if (mode == PEM_CREATE){
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex.flp, ts.msg);
				intoVlc = ts.vlc;
			}

			var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.key);
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

			var pe = program_eval(prg, sym, PEM_CREATE, NULL, ex.obj);
			if (pe.type == PER_ERROR)
				return pe;
			var obj = pe.vlc;

			var sr = program_slice(prg, sym, obj, ex);
			if (sr.type == PSR_ERROR)
				return per_error(sr.flp, sr.msg);

			op_slice(prg.ops, intoVlc, obj, sr.start, sr.len);
			symtbl_clearTemp(sym, obj);
			symtbl_clearTemp(sym, sr.start);
			symtbl_clearTemp(sym, sr.len);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(NULL);
			}
			return per_ok(intoVlc);
		} break;
	}
}

var PGR_OK    = 'PGR_OK';
var PGR_ERROR = 'PGR_ERROR';

function pgr_ok(sym){
	return { type: PGR_OK };
}

function pgr_error(flp, msg){
	return { type: PGR_ERROR, flp: flp, msg: msg };
}

function program_genBody(prg, sym, body){
	var repl = prg.repl;
	prg.repl = false;
	for (var i = 0; i < body.length; i++){
		var pr = program_gen(prg, sym, body[i]);
		if (pr.type == PGR_ERROR)
			return pr;
	}
	prg.repl = repl;
	return pgr_ok(sym);
}

function program_gen(prg, sym, stmt){
	switch (stmt.type){
		case AST_BREAK:
			if (sym.sc.lblBreak == NULL)
				return pgr_error(stmt.flp, 'Invalid `break`');
			label_jump(sym.sc.lblBreak, prg.ops);
			return pgr_ok(sym);

		case AST_CONTINUE:
			if (sym.sc.lblContinue == NULL)
				return pgr_error(stmt.flp, 'Invalid `continue`');
			label_jump(sym.sc.lblContinue, prg.ops);
			return pgr_ok(sym);

		case AST_DECLARE:
			for (var i = 0; i < stmt.decls.length; i++){
				var dc = stmt.decls[i];
				switch (dc.type){
					case DECL_LOCAL: {
						var lbl = label_new('%def');
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
			}
			return pgr_ok(sym);

		case AST_DEF: {
			var lr = symtbl_lookup(sym, stmt.names);
			var lbl;
			if (lr.type == STL_OK && lr.nsn.type == NSN_CMD_LOCAL){
				lbl = lr.nsn.lbl;
				if (!sym.repl && lbl.pos >= 0) // if already defined, error
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
						var pr = NULL;
						var perfinit = NULL;
						var doneinit = NULL;
						if (ex.right != NULL){
							perfinit = label_new('%perfinit');
							doneinit = label_new('%doneinit');
							var skipinit = label_new('%skipinit');
							label_jump(skipinit, prg.ops);
							label_declare(perfinit, prg.ops);
							pr = program_eval(prg, sym, PEM_CREATE, NULL, ex.right);
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

						var finish = NULL;
						if (ex.right != NULL){
							finish = label_new('%finish');
							var passinit = label_new('%passinit');
							label_jumpFalse(perfinit, prg.ops, t);
							label_jump(passinit, prg.ops);
							label_declare(doneinit, prg.ops);
							var pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lr.lv, -1,
								pr.vlc);
							if (pe.type == PER_ERROR)
								return pgr_error(pe.flp, pe.msg);
							label_jump(finish, prg.ops);
							label_declare(passinit, prg.ops);
						}

						var pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lr.lv, -1, t)
						if (pe.type == PER_ERROR)
							return pgr_error(pe.flp, pe.msg);

						if (ex.right != NULL)
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
						op_rest(prg.ops, t2, args, t);
						op_slice(prg.ops, lr.lv.vlc, args, t, t2);
						symtbl_clearTemp(sym, t2);
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
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return pgr_error(stmt.flp, ts.msg);
				var nil = ts.vlc;
				op_nil(prg.ops, nil);
				op_return(prg.ops, nil);
				symtbl_clearTemp(sym, nil);
			}

			symtbl_popFrame(sym);
			label_declare(skip, prg.ops);

			return pgr_ok(sym);
		} break;

		case AST_DO_END: {
			symtbl_pushScope(sym);
			sym.sc.lblBreak = label_new('%do_break');
			var pr = program_genBody(prg, sym, stmt.body);
			if (pr.type == PGR_ERROR)
				return pr;
			label_declare(sym.sc.lblBreak, prg.ops);
			symtbl_popScope(sym);
			return pgr_ok(sym);
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
			var pe = program_eval(prg, sym, PEM_CREATE, NULL, stmt.cond);
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
			return pgr_ok(sym);
		} break;

		case AST_FOR: {
			var pe = program_eval(prg, sym, PEM_CREATE, NULL, stmt.ex);
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

				if (stmt.names2 == NULL){
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

				if (stmt.names2 == NULL){
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

			var top    = label_new('%for_top');
			var inc    = label_new('%for_inc');
			var finish = label_new('%for_finish');

			var ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt.flp, ts.msg);
			var t = ts.vlc;

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
			return pgr_ok(sym);
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
			return pgr_ok(sym);
		} break;

		case AST_GOTO: {
			for (var i = 0; i < sym.fr.lbls.length; i++){
				var lbl = sym.fr.lbls[i];
				if (lbl.name == stmt.ident){
					label_jump(lbl, prg.ops);
					return pgr_ok(sym);
				}
			}
			// label doesn't exist yet, so we'll need to create it
			var lbl = label_new(stmt.ident);
			label_jump(lbl, prg.ops);
			sym.fr.lbls.push(lbl);
			return pgr_ok(sym);
		} break;

		case AST_IF: {
			var nextcond = NULL;
			var ifdone = label_new('%ifdone');
			for (var i = 0; i < stmt.conds.length; i++){
				if (i > 0)
					label_declare(nextcond, prg.ops);
				nextcond = label_new('%nextcond');
				var pr = program_eval(prg, sym, PEM_CREATE, NULL, stmt.conds[i].ex);
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
			return pgr_ok(sym);
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
			return pgr_ok(sym);
		} break;

		case AST_RETURN: {
			var pr = program_eval(prg, sym, PEM_CREATE, NULL, stmt.ex);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.flp, pr.msg);
			symtbl_clearTemp(sym, pr.vlc);
			op_return(prg.ops, pr.vlc);
			return pgr_ok(sym);
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
			return pgr_ok(sym);
		} break;

		case AST_VAR:
			for (var i = 0; i < stmt.lvalues.length; i++){
				var ex = stmt.lvalues[i];
				if (ex.type != EXPR_INFIX)
					throw new Error('Var expression should be EXPR_INFIX (this shouldn\'t happen)');
				var pr = NULL;
				if (ex.right != NULL){
					pr = program_eval(prg, sym, PEM_CREATE, NULL, ex.right);
					if (pr.type == PER_ERROR)
						return pgr_error(pr.flp, pr.msg);
				}
				var lr = lval_addVars(sym, ex.left);
				if (lr.type == LVP_ERROR)
					return pgr_error(lr.flp, lr.msg);
				if (ex.right != NULL){
					var pe = program_evalLval(prg, sym, PEM_EMPTY, NULL, lr.lv, -1, pr.vlc);
					if (pe.type == PER_ERROR)
						return pgr_error(pe.flp, pe.msg);
					symtbl_clearTemp(sym, pr.vlc);
				}
			}
			return pgr_ok(sym);

		case AST_EVAL: {
			if (prg.repl){
				var pr = program_eval(prg, sym, PEM_CREATE, NULL, stmt.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.flp, pr.msg);
				var ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return pgr_error(stmt.flp, ts.msg);
				var t = ts.vlc;
				op_list(prg.ops, t, 1);
				op_binop(prg.ops, OP_PUSH, t, t, pr.vlc);
				op_param1(prg.ops, OP_SAY, t, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, pr.vlc);
			}
			else{
				var pr = program_eval(prg, sym, PEM_EMPTY, NULL, stmt.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.flp, pr.msg);
			}
			return pgr_ok(sym);
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
			return pgr_ok(sym);
		} break;
	}
}

//
// context
//

function ccs_new(pc, fdiff, index, lexIndex){
	return { pc: pc, fdiff: fdiff, index: index, lexIndex: lexIndex };
}

function lxs_new(args, next){
	var v = [args];
	for (var i = 1; i < 256; i++)
		v.push(NULL);
	return {
		vals: v,
		next: next
	};
}

function context_new(prg){
	var ctx = {
		prg: prg,
		failed: false,
		passed: false,
		callStack: [],
		lexStack: [lxs_new(NULL, NULL)],
		lexIndex: 0,
		pc: 0,
		randSeed: 0,
		randI: 0
	};
	lib_rand_seedauto(ctx);
	return ctx;
}

var CRR_EXITPASS = 'CRR_EXITPASS';
var CRR_EXITFAIL = 'CRR_EXITFAIL';
var CRR_SAY      = 'CRR_SAY';
var CRR_WARN     = 'CRR_WARN';
var CRR_ASK      = 'CRR_ASK';
var CRR_REPL     = 'CRR_REPL';
var CRR_INVALID  = 'CRR_INVALID';

function crr_exitpass(){
	return { type: CRR_EXITPASS };
}

function crr_exitfail(){
	return { type: CRR_EXITFAIL };
}

function crr_say(args){
	return { type: CRR_SAY, args: args };
}

function crr_warn(args){
	return { type: CRR_WARN, args: args };
}

function crr_ask(args, fdiff, index){
	return { type: CRR_ASK, args: args, fdiff: fdiff, index: index };
}

function crr_repl(){
	return { type: CRR_REPL };
}

function crr_invalid(){
	throw new Error('invalid!?'); // TODO: remove
	return { type: CRR_INVALID };
}

function var_get(ctx, fdiff, index){
	return ctx.lexStack[ctx.lexIndex - fdiff].vals[index];
}

function var_set(ctx, fdiff, index, val){
	ctx.lexStack[ctx.lexIndex - fdiff].vals[index] = val;
}

function var_isnum(val){
	return typeof val == 'number';
}

function var_isstr(val){
	return typeof val == 'string';
}

function var_islist(val){
	return Object.prototype.toString.call(val) == '[object Array]';
}

var var_tostr_marker = 0;
function var_tostr(v){
	var m = var_tostr_marker++;
	function tos(v, first){
		if (v == NULL)
			return 'nil';
		else if (var_isnum(v)){
			if (v == Infinity)
				return 'inf';
			else if (v == -Infinity)
				return '-inf';
			return '' + v;
		}
		else if (var_isstr(v))
			return first ? v : '\'' + v + '\'';
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

function arget(ar, index){
	if (var_islist(ar))
		return index >= ar.length ? 0 : ar[index];
	return ar;
}

function arsize(ar){
	if (var_islist(ar))
		return ar.length;
	return 1;
}

function oper_isnum(a){
	if (var_islist(a)){
		for (var i = 0; i < a.length; i++){
			if (!var_isnum(a[i]))
				return false;
		}
		return true;
	}
	return var_isnum(a);
}

function oper_isnilnumstr(a){
	if (var_islist(a)){
		for (var i = 0; i < a.length; i++){
			if (a[i] != NULL && !var_isnum(a[i]) && !var_isstr(a[i]))
				return false;
		}
		return true;
	}
	return a == NULL || var_isnum(a) || var_isstr(a);
}

function oper_un(a, func){
	if (var_islist(a)){
		var ret = [];
		for (var i = 0; i < a.length; i++)
			ret.push(func(a[i]));
		return ret;
	}
	return func(a);
}

function oper_bin(a, b, func){
	if (var_islist(a) || var_islist(b)){
		var ret = [];
		var m = Math.max(arsize(a), arsize(b));
		for (var i = 0; i < m; i++)
			ret.push(func(arget(a, i), arget(b, i)));
		return ret;
	}
	return func(a, b);
}

function oper_tri(a, b, c, func){
	if (var_islist(a) || var_islist(b) || var_islist(c)){
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

function context_result(ctx, cr, val){
	var_set(ctx, cr.fdiff, cr.index, val);
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

var lib_num_max_marker = 0;
function lib_num_max(v){
	var m = lib_num_max_marker++;
	function mx(v){
		if (v.lib_num_max_marker == m)
			return NULL;
		v.lib_num_max_marker = m;
		var max = NULL;
		for (var i = 0; i < v.length; i++){
			if (var_isnum(v[i])){
				if (max == NULL || v[i] > max)
					max = v[i];
			}
			else if (var_islist(v[i])){
				var lm = mx(v[i]);
				if (lm != NULL && (max == NULL || lm > max))
					max = lm;
			}
		}
		return max;
	}
	return mx(v);
}

var lib_num_min_marker = 0;
function lib_num_min(v){
	var m = lib_num_min_marker++;
	function mn(v){
		if (v.lib_num_min_marker == m)
			return NULL;
		v.lib_num_min_marker = m;
		var min = NULL;
		for (var i = 0; i < v.length; i++){
			if (var_isnum(v[i])){
				if (min == NULL || v[i] < min)
					min = v[i];
			}
			else if (var_islist(v[i])){
				var lm = mn(v[i]);
				if (lm != NULL && (min == NULL || lm < min))
					min = lm;
			}
		}
		return min;
	}
	return mn(v);
}

function lib_num_base(num, len, base){
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

function lib_rand_seedauto(ctx){
	ctx.randSeed = (new Date()).getTime() | 0;
	ctx.randI = (Math.random() * 0xFFFFFFFF) | 0;
	for (var i = 0; i < 1000; i++)
		lib_rand_int(ctx);
	ctx.randI = 0;
}

function lib_rand_seed(ctx, n){
	ctx.randSeed = n | 0;
	ctx.randI = 0;
}

function lib_rand_int(ctx){
	var m = 0x5bd1e995;
	var k = polyfill.Math_imul(ctx.randI,  m);
	ctx.randI = (ctx.randI + 1) | 0;
	ctx.randSeed = polyfill.Math_imul(k ^ (k >>> 24) ^ polyfill.Math_imul(ctx.randSeed, m), m);
	var res = (ctx.randSeed ^ (ctx.randSeed >>> 13)) | 0;
	if (res < 0)
		return res + 0x100000000;
	return res;
}

function lib_rand_num(ctx){
	var M1 = lib_rand_int(ctx);
	var M2 = lib_rand_int(ctx);
	var view = new DataView(new ArrayBuffer(8));
	view.setInt32(0, (M1 << 20) | (M2 >> 12), true);
	view.setInt32(4, 0x3FF00000 | (M1 >>> 12), true);
	return view.getFloat64(0, true) - 1;
}

function lib_rand_getstate(ctx){
	// slight goofy logic to convert int32 to uint32
	if (ctx.randI < 0){
		if (ctx.randSeed < 0)
			return [ctx.randSeed + 0x100000000, ctx.randI + 0x100000000];
		return [ctx.randSeed, ctx.randI + 0x100000000];
	}
	else if (ctx.randSeed < 0)
		return [ctx.randSeed + 0x100000000, ctx.randI];
	return [ctx.randSeed, ctx.randI];
}

function lib_rand_setstate(ctx, a, b){
	ctx.randSeed = a | 0;
	ctx.randI = b | 0;
}

function lib_rand_pick(ctx, ls){
	if (ls.length <= 0)
		return NULL;
	return ls[Math.floor(lib_rand_num(ctx) * ls.length)];
}

function lib_rand_shuffle(ctx, ls){
	var m = ls.length;
	while (m > 1){
		var i = Math.floor(lib_rand_num(ctx) * m);
		m--;
		if (m != i){
			var t = ls[m];
			ls[m] = ls[i];
			ls[i] = t;
		}
	}
}

function context_run(ctx){
	if (ctx.failed)
		return crr_exitfail();
	if (ctx.passed)
		return crr_exitpass();

	var A, B, C, D, E, F, G, H, I; // ints
	var X, Y, Z, W; // values

	var ops = ctx.prg.ops;

	function inline_unop(func, erop){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		if (A > ctx.lexIndex || C > ctx.lexIndex)
			return crr_invalid();
		X = var_get(ctx, C, D);
		if (X == NULL)
			X = 0;
		if (!oper_isnum(X)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		var_set(ctx, A, B, oper_un(X, func));
		return false;
	}

	function inline_binop(func, erop){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		E = ops[ctx.pc++]; F = ops[ctx.pc++];
		if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
			return crr_invalid();
		X = var_get(ctx, C, D);
		if (X == NULL)
			X = 0;
		if (!oper_isnum(X)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		Y = var_get(ctx, E, F);
		if (Y == NULL)
			Y = 0;
		if (!oper_isnum(Y)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		var_set(ctx, A, B, oper_bin(X, Y, func));
		return false;
	}

	function inline_triop(func, erop){
		ctx.pc++;
		A = ops[ctx.pc++]; B = ops[ctx.pc++];
		C = ops[ctx.pc++]; D = ops[ctx.pc++];
		E = ops[ctx.pc++]; F = ops[ctx.pc++];
		G = ops[ctx.pc++]; H = ops[ctx.pc++];
		if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
			return crr_invalid();
		X = var_get(ctx, C, D);
		if (X == NULL)
			X = 0;
		if (!oper_isnum(X)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		Y = var_get(ctx, E, F);
		if (Y == NULL)
			Y = 0;
		if (!oper_isnum(Y)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		Z = var_get(ctx, G, H);
		if (Z == NULL)
			Z = 0;
		if (!oper_isnum(Z)){
			ctx.failed = true;
			return crr_warn(['Expecting number or list of numbers when ' + erop]);
		}
		var_set(ctx, A, B, oper_tri(X, Y, Z, func));
		return false;
	}

	while (ctx.pc < ops.length){
		switch (ops[ctx.pc]){
			case OP_NOP            : { //
				ctx.pc++;
			} break;

			case OP_EXIT           : { // [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, A, B);
				if (X == NULL){
					ctx.passed = true;
					return crr_exitpass();
				}
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling exit']);
				}
				ctx.passed = true;
				return crr_say(X);
			} break;

			case OP_ABORT          : { // [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, A, B);
				if (X == NULL){
					ctx.failed = true;
					return crr_exitfail();
				}
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling abort']);
				}
				ctx.failed = true;
				return crr_warn(X);
			} break;

			case OP_ABORTERR       : { // ERRNO
				ctx.pc++;
				A = ops[ctx.pc++];
				ctx.failed = true;
				var errmsg = 'Unknown error';
				if (A == 1)
					errmsg = 'Expecting list when calling function';
				return crr_warn([errmsg]);
			} break;

			case OP_MOVE           : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, var_get(ctx, C, D));
			} break;

			case OP_INC            : { // [TGT/SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, A, B);
				if (!var_isnum(X)){
					ctx.failed = true;
					return crr_warn(['Expecting number when incrementing']);
				}
				var_set(ctx, A, B, X + 1);
			} break;

			case OP_NIL            : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, NULL);
			} break;

			case OP_NUMPOS         : { // [TGT], [VALUE]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, C | (D << 8));
			} break;

			case OP_NUMNEG         : { // [TGT], [VALUE]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, (C | (D << 8)) - 65536);
			} break;

			case OP_NUMTBL         : { // [TGT], [INDEX]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				C = C | (D << 8);
				if (C >= ctx.prg.numTable.length)
					return crr_invalid();
				var_set(ctx, A, B, ctx.prg.numTable[C]);
			} break;

			case OP_STR            : { // [TGT], [INDEX]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				C = C | (D << 8);
				if (C >= ctx.prg.strTable.length)
					return crr_invalid();
				var_set(ctx, A, B, ctx.prg.strTable[C]);
			} break;

			case OP_LIST           : { // [TGT], HINT
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, []);
			} break;

			case OP_REST           : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calculating rest']);
				}
				Y = var_get(ctx, E, F);
				if (!var_isnum(Y)){
					ctx.failed = true;
					return crr_warn(['Expecting number when calculating rest']);
				}
				if (Y < 0)
					Y += X.length;
				if (Y <= 0)
					var_set(ctx, A, B, X.length);
				else if (Y >= X.length)
					var_set(ctx, A, B, 0);
				else
					var_set(ctx, A, B, X.length - Y);
			} break;

			case OP_NEG            : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return -a; }, 'negating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NOT            : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, X == NULL ? 1 : NULL);
			} break;

			case OP_SIZE           : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X) && !var_isstr(X)){
					ctx.failed = true;
					return crr_warn(['Expecting string or list for size']);
				}
				var_set(ctx, A, B, X.length);
			} break;

			case OP_TONUM          : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!oper_isnilnumstr(X)){
					ctx.failed = true;
					return crr_warn(['Expecting string when converting to number']);
				}
				var_set(ctx, A, B, oper_un(X,
					function(a){
						if (var_isnum(a))
							return a;
						throw 'TODO: parse string `a` according to sink number rules';
					}));
			} break;

			case OP_SHIFT          : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when shifting']);
				}
				if (X.length <= 0)
					var_set(ctx, A, B, NULL)
				else
					var_set(ctx, A, B, X.shift());
			} break;

			case OP_POP            : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when popping']);
				}
				if (X.length <= 0)
					var_set(ctx, A, B, NULL)
				else
					var_set(ctx, A, B, X.pop());
			} break;

			case OP_ISNUM          : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, var_isnum(X) ? 1 : NULL);
			} break;

			case OP_ISSTR          : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, var_isstr(X) ? 1 : NULL);
			} break;

			case OP_ISLIST         : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, var_islist(X) ? 1 : NULL);
			} break;

			case OP_ADD            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a + b; }, 'adding');
				if (ib !== false)
					return ib;
			} break;

			case OP_SUB            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a - b; }, 'subtracting');
				if (ib !== false)
					return ib;
			} break;

			case OP_MUL            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a * b; }, 'multiplying');
				if (ib !== false)
					return ib;
			} break;

			case OP_DIV            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a / b; }, 'dividing');
				if (ib !== false)
					return ib;
			} break;

			case OP_MOD            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a % b; }, 'taking modular');
				if (ib !== false)
					return ib;
			} break;

			case OP_POW            : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return Math.pow(a, b); }, 'exponentiating');
				if (ib !== false)
					return ib;
			} break;

			case OP_CAT            : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (var_islist(X) && var_islist(Y))
					var_set(ctx, A, B, X.concat(Y));
				else
					var_set(ctx, A, B, var_tostr(X) + var_tostr(Y));
			} break;

			case OP_PUSH           : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when pushing']);
				}
				Y = var_get(ctx, E, F);
				X.push(Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_UNSHIFT        : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when unshifting']);
				}
				Y = var_get(ctx, E, F);
				X.unshift(Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_APPEND         : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!var_islist(X) || !var_islist(Y)){
					ctx.failed = true;
					return crr_warn(['Expecting list when appending']);
				}
				X.push.apply(X, Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_PREPEND        : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!var_islist(X) || !var_islist(Y)){
					ctx.failed = true;
					return crr_warn(['Expecting list when prepending']);
				}
				X.unshift.apply(X, Y);
				if (A != C || B != D)
					var_set(ctx, A, B, X);
			} break;

			case OP_LT             : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (var_isnum(X) && var_isnum(Y))
					var_set(ctx, A, B, X < Y ? 1 : NULL);
				else if (var_isstr(X) && var_isstr(Y))
					var_set(ctx, A, B, str_cmp(X, Y) < 0 ? 1 : NULL);
				else{
					ctx.failed = true;
					return crr_warn(['Expecting numbers or strings']);
				}
			} break;

			case OP_LTE            : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (var_isnum(X) && var_isnum(Y))
					var_set(ctx, A, B, X <= Y ? 1 : NULL);
				else if (var_isstr(X) && var_isstr(Y))
					var_set(ctx, A, B, str_cmp(X, Y) <= 0 ? 1 : NULL);
				else{
					ctx.failed = true;
					return crr_warn(['Expecting numbers or strings']);
				}
			} break;

			case OP_NEQ            : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (X == NULL && Y == NULL)
					var_set(ctx, A, B, NULL);
				else if (var_isnum(X) && var_isnum(Y))
					var_set(ctx, A, B, X == Y ? NULL : 1);
				else if (var_isstr(X) && var_isstr(Y))
					var_set(ctx, A, B, str_cmp(X, Y) == 0 ? NULL : 1);
				else if (var_islist(X) && var_islist(Y))
					var_set(ctx, A, B, X === Y ? NULL : 1);
				else
					var_set(ctx, A, B, 1);
			} break;

			case OP_EQU            : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (X == NULL && Y == NULL)
					var_set(ctx, A, B, 1);
				else if (var_isnum(X) && var_isnum(Y))
					var_set(ctx, A, B, X == Y ? 1 : NULL);
				else if (var_isstr(X) && var_isstr(Y))
					var_set(ctx, A, B, str_cmp(X, Y) == 0 ? 1 : NULL);
				else if (var_islist(X) && var_islist(Y))
					var_set(ctx, A, B, X === Y ? 1 : NULL);
				else
					var_set(ctx, A, B, NULL);
			} break;

			case OP_GETAT          : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (var_islist(X)){
					Y = var_get(ctx, E, F);
					if (var_isnum(Y)){
						if (Y < 0)
							Y += X.length;
						if (Y < 0 || Y >= X.length)
							var_set(ctx, A, B, NULL);
						else
							var_set(ctx, A, B, X[Y]);
					}
					else{
						ctx.failed = true;
						return crr_warn(['Expecting index to be number']);
					}
				}
				else if (var_isstr(X)){
					Y = var_get(ctx, E, F);
					if (var_isnum(Y)){
						if (Y < 0)
							Y += X.length;
						if (Y < 0 || Y >= X.length)
							var_set(ctx, A, B, NULL);
						else
							var_set(ctx, A, B, X.charAt(Y));
					}
					else{
						ctx.failed = true;
						return crr_warn(['Expecting index to be number']);
					}
				}
				else{
					ctx.failed = true;
					return crr_warn(['Expecting list or string when indexing']);
				}
			} break;

			case OP_SLICE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				G = ops[ctx.pc++]; H = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex || G > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (var_islist(X)){
					Y = var_get(ctx, E, F);
					Z = var_get(ctx, G, H);
					if (!var_isnum(Y) || !var_isnum(Z)){
						ctx.failed = true;
						return crr_warn(['Expecting slice values to be numbers']);
					}
					if (X.length <= 0)
						var_set(ctx, A, B, []);
					else{
						if (Y < 0)
							Y += X.length;
						if (Y >= X.length)
							Y = X.length - 1;
						if (Y < 0)
							Y = 0;
						if (Y + Z > X.length)
							Z = X.length - Y;
						var_set(ctx, A, B, X.slice(Y, Y + Z));
					}
				}
				else if (var_isstr(X)){
					Y = var_get(ctx, E, F);
					Z = var_get(ctx, G, H);
					if (!var_isnum(Y) || !var_isnum(Z)){
						ctx.failed = true;
						return crr_warn(['Expecting slice values to be numbers']);
					}
					if (X.length <= 0)
						var_set(ctx, A, B, '');
					else{
						if (Y < 0)
							Y += X.length;
						if (Y >= X.length)
							Y = X.length - 1;
						if (Y < 0)
							Y = 0;
						if (Y + Z > X.length)
							Z = X.length - Y;
						var_set(ctx, A, B, X.substr(Y, Z));
					}
				}
				else{
					ctx.failed = true;
					return crr_warn(['Expecting list or string when slicing']);
				}
			} break;

			case OP_SETAT          : { // [SRC1], [SRC2], [SRC3]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();

				X = var_get(ctx, A, B);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when setting index']);
				}

				Y = var_get(ctx, C, D);
				if (!var_isnum(Y)){
					ctx.failed = true;
					return crr_warn(['Expecting index to be number']);
				}
				if (Y < 0)
					Y += X.length;
				while (Y >= X.length)
					X.push(NULL);
				if (Y >= 0 && Y < X.length)
					X[Y] = var_get(ctx, E, F);
			} break;

			case OP_SPLICE         : { // [SRC1], [SRC2], [SRC3], [SRC4]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				G = ops[ctx.pc++]; H = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex || G > ctx.lexIndex)
					return crr_invalid();

				X = var_get(ctx, A, B);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when splicing']);
				}

				Y = var_get(ctx, C, D);
				Z = var_get(ctx, E, F);
				if (!var_isnum(Y) || !var_isnum(Z)){
					ctx.failed = true;
					return crr_warn(['Expecting splice values to be numbers']);
				}
				if (Y < 0)
					Y += X.length;
				if (Y + Z > X.length)
					Z = X.length - Y;

				W = var_get(ctx, G, H);
				if (W == NULL){
					if (Y >= 0 && Y < X.length)
						X.splice(Y, Z);
				}
				else if (var_islist(W)){
					if (Y >= 0 && Y < X.length){
						var args = W.concat();
						args.unshift(Z);
						args.unshift(Y);
						X.splice.apply(X, args);
					}
				}
				else{
					ctx.failed = true;
					return crr_warn(['Expecting spliced value to be a list']);
				}
			} break;

			case OP_JUMP           : { // [[LOCATION]]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
				if (ctx.prg.repl && A == 0xFFFFFFFF){
					ctx.pc -= 5;
					return crr_repl();
				}
				ctx.pc = A;
			} break;

			case OP_JUMPTRUE       : { // [SRC], [[LOCATION]]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (var_get(ctx, A, B) != NULL){
					if (ctx.prg.repl && C == 0xFFFFFFFF){
						ctx.pc -= 7;
						return crr_repl();
					}
					ctx.pc = C;
				}
			} break;

			case OP_JUMPFALSE      : { // [SRC], [[LOCATION]]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (var_get(ctx, A, B) == NULL){
					if (ctx.prg.repl && C == 0xFFFFFFFF){
						ctx.pc -= 7;
						return crr_repl();
					}
					ctx.pc = C;
				}
			} break;

			case OP_CALL           : { // [TGT], [SRC], LEVEL, [[LOCATION]]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++];
				F = ops[ctx.pc++]; G = ops[ctx.pc++];
				H = ops[ctx.pc++]; I = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				F = F + (G << 8) + (H << 16) + ((I << 23) * 2);
				if (ctx.prg.repl && F == 0xFFFFFFFF){
					ctx.pc -= 10;
					return crr_repl();
				}
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling function']);
				}
				ctx.callStack.push(ccs_new(ctx.pc, A, B, ctx.lexIndex));
				ctx.lexIndex = ctx.lexIndex - E + 1;
				while (ctx.lexIndex >= ctx.lexStack.length)
					ctx.lexStack.push(NULL);
				ctx.lexStack[ctx.lexIndex] = lxs_new(X, ctx.lexStack[ctx.lexIndex]);
				ctx.pc = F;
			} break;

			case OP_NATIVE         : { // [TGT], [SRC], [INDEX]
				throw 'TODO: deal with OP_NATIVE';
			} break;

			case OP_RETURN         : { // [SRC]
				if (ctx.callStack.length <= 0)
					return crr_exitpass();
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, A, B);
				var s = ctx.callStack.pop();
				ctx.lexStack[ctx.lexIndex] = ctx.lexStack[ctx.lexIndex].next;
				ctx.lexIndex = s.lexIndex;
				var_set(ctx, s.fdiff, s.index, X);
				ctx.pc = s.pc;
			} break;

			case OP_SAY            : { // [TGT], [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling say']);
				}
				var_set(ctx, A, B, NULL);
				return crr_say(X);
			} break;

			case OP_WARN           : { // [TGT], [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling warn']);
				}
				var_set(ctx, A, B, NULL);
				return crr_warn(X);
			} break;

			case OP_ASK            : { // [TGT], [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling ask']);
				}
				return crr_ask(X, A, B);
			} break;

			case OP_NUM_ABS        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.abs(a); }, 'taking absolute value');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_SIGN       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return polyfill.Math_sign(a); }, 'taking sign');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_MAX        : { // [TGT], [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling num.max']);
				}
				var_set(ctx, A, B, lib_num_max(X));
			} break;

			case OP_NUM_MIN        : { // [TGT], [SRC...]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list when calling num.max']);
				}
				var_set(ctx, A, B, lib_num_min(X));
			} break;

			case OP_NUM_CLAMP      : { // [TGT], [SRC1], [SRC2], [SRC3]
				var it = inline_triop(function(a, b, c){ return a < b ? b : (a > c ? c : a); },
					'clamping');
				if (it !== false)
					return it;
			} break;

			case OP_NUM_FLOOR      : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.floor(a); }, 'taking floor');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_CEIL       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.ceil(a); }, 'taking ceil');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ROUND      : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.round(a); }, 'rounding');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_TRUNC      : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return polyfill.Math_trunc(a); }, 'truncating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_NAN        : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, NaN);
			} break;

			case OP_NUM_INF        : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, Infinity);
			} break;

			case OP_NUM_ISNAN      : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_isnum(X)){
					ctx.failed = true;
					return crr_warn(['Expecting number']);
				}
				var_set(ctx, A, B, isNaN(X) ? 1 : NULL);
			} break;

			case OP_NUM_ISFINITE   : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_isnum(X)){
					ctx.failed = true;
					return crr_warn(['Expecting number']);
				}
				var_set(ctx, A, B, isFinite(X) ? 1 : NULL);
			} break;

			case OP_NUM_E          : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, Math.E);
			} break;

			case OP_NUM_PI         : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, Math.PI);
			} break;

			case OP_NUM_TAU        : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, Math.PI * 2);
			} break;

			case OP_NUM_SIN        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.sin(a); }, 'taking sin');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_COS        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.cos(a); }, 'taking cos');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_TAN        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.tan(a); }, 'taking tan');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ASIN       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.asin(a); }, 'taking arc-sin');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ACOS       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.acos(a); }, 'taking arc-cos');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ATAN       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.atan(a); }, 'taking arc-tan');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_ATAN2      : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return Math.atan2(a, b); }, 'taking arc-tan');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_LOG        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.log(a); }, 'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LOG2       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return polyfill.Math_log2(a); },
					'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LOG10      : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return polyfill.Math_log10(a); },
					'taking logarithm');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_EXP        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return Math.exp(a); }, 'exponentiating');
				if (iu !== false)
					return iu;
			} break;

			case OP_NUM_LERP       : { // [TGT], [SRC1], [SRC2], [SRC3]
				var it = inline_triop(function(a, b, c){ return a + (b - a) * c; }, 'lerping');
				if (it !== false)
					return it;
			} break;

			case OP_NUM_HEX        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return lib_num_base(a, b, 16); },
					'converting to hex');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_OCT        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return lib_num_base(a, b, 8); },
					'converting to hex');
				if (ib !== false)
					return ib;
			} break;

			case OP_NUM_BIN        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return lib_num_base(a, b, 2); },
					'converting to hex');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_CAST       : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return a | 0; }, 'casting to int');
				if (iu !== false)
					return iu;
			} break;

			case OP_INT_NOT        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return ~a; }, 'NOTing');
				if (iu !== false)
					return iu;
			} break;

			case OP_INT_AND        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a & b; }, 'ANDing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_OR         : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a | b; }, 'ORing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_XOR        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a ^ b; }, 'XORing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SHL        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a << b; }, 'shifting left');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SHR        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a >>> b; }, 'shifting right');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SAR        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return a >> b; }, 'shifting right');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_ADD        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return ((a|0) + (b|0)) | 0; }, 'adding');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_SUB        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return ((a|0) - (b|0)) | 0; }, 'subtracting');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_MUL        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return polyfill.Math_imul(a, b); },
					'multiplying');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_DIV        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return ((a|0) / (b|0)) | 0; }, 'dividing');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_MOD        : { // [TGT], [SRC1], [SRC2]
				var ib = inline_binop(function(a, b){ return ((a|0) % (b|0)) | 0; },
					'taking modular');
				if (ib !== false)
					return ib;
			} break;

			case OP_INT_CLZ        : { // [TGT], [SRC]
				var iu = inline_unop(function(a){ return polyfill.Math_clz32(a); },
					'counting leading zeros');
				if (iu !== false)
					return iu;
			} break;

			case OP_RAND_SEED      : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_isnum(X)){
					ctx.failed = true;
					return crr_warn(['Expecting number']);
				}
				lib_rand_seed(ctx, X);
				var_set(ctx, A, B, NULL);
			} break;

			case OP_RAND_SEEDAUTO  : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				lib_rand_seedauto(ctx);
				var_set(ctx, A, B, NULL);
			} break;

			case OP_RAND_INT       : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, lib_rand_int(ctx));
			} break;

			case OP_RAND_NUM       : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, lib_rand_num(ctx));
			} break;

			case OP_RAND_GETSTATE  : { // [TGT]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				if (A > ctx.lexIndex)
					return crr_invalid();
				var_set(ctx, A, B, lib_rand_getstate(ctx));
			} break;

			case OP_RAND_SETSTATE  : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X) || X.length < 2 || !var_isnum(X[0]) || !var_isnum(X[1])){
					ctx.failed = true;
					return crr_warn(['Expecting list of two integers']);
				}
				lib_rand_setstate(ctx, X[0], X[1]);
				var_set(ctx, A, B, NULL);
			} break;

			case OP_RAND_PICK      : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list']);
				}
				var_set(ctx, A, B, lib_rand_pick(ctx, X));
			} break;

			case OP_RAND_SHUFFLE   : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list']);
				}
				lib_rand_shuffle(ctx, X)
				var_set(ctx, A, B, X);
			} break;

			case OP_STR_NEW        : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_SPLIT      : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_REPLACE    : { // [TGT], [SRC1], [SRC2], [SRC3]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_STARTSWITH : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_ENDSWITH   : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_PAD        : { // [TGT], [SRC1], [SRC2]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_FIND       : { // [TGT], [SRC1], [SRC2], [SRC3]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_STR_FINDREV    : { // [TGT], [SRC1], [SRC2], [SRC3]
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
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (X == NULL)
					X = 0;
				else if (!var_isnum(X)){
					ctx.failed = true;
					return crr_warn(['Expecting number for list.new']);
				}
				Y = var_get(ctx, E, F);
				var r = [];
				for (var i = 0; i < X; i++)
					r.push(Y);
				var_set(ctx, A, B, r);
			} break;

			case OP_LIST_FIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				G = ops[ctx.pc++]; H = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex || G > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list for list.find']);
				}
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (Z == NULL)
					Z = 0;
				else if (!var_isnum(Z)){
					ctx.failed = true;
					return crr_warn(['Expecting number for list.find']);
				}
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
					var_set(ctx, A, B, NULL);
			} break;

			case OP_LIST_FINDREV   : { // [TGT], [SRC1], [SRC2], [SRC3]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				G = ops[ctx.pc++]; H = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex || G > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list for list.find']);
				}
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (Z == NULL)
					Z = X.length - 1;
				else if (!var_isnum(Z)){
					ctx.failed = true;
					return crr_warn(['Expecting number for list.find']);
				}
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
					var_set(ctx, A, B, NULL);
			} break;

			case OP_LIST_JOIN      : { // [TGT], [SRC1], [SRC2]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				E = ops[ctx.pc++]; F = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex || E > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list for list.find']);
				}
				Y = var_get(ctx, E, F);
				if (Y == NULL)
					Y = '';
				var out = [];
				for (var i = 0; i < X.length; i++)
					out.push(var_tostr(X[i]));
				var_set(ctx, A, B, out.join(var_tostr(Y)));
			} break;

			case OP_LIST_REV       : { // [TGT], [SRC]
				ctx.pc++;
				A = ops[ctx.pc++]; B = ops[ctx.pc++];
				C = ops[ctx.pc++]; D = ops[ctx.pc++];
				if (A > ctx.lexIndex || C > ctx.lexIndex)
					return crr_invalid();
				X = var_get(ctx, C, D);
				if (!var_islist(X)){
					ctx.failed = true;
					return crr_warn(['Expecting list for list.find']);
				}
				X.reverse();
				var_set(ctx, A, B, X);
			} break;

			case OP_LIST_STR       : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_LIST_SORT      : { // [TGT], [SRC]
				throw 'TODO: context_run op ' + ops[ctx.pc].toString(16);
			} break;

			case OP_LIST_SORTREV   : { // [TGT], [SRC]
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

			default:
				return crr_invalid();
		}
	}
	if (ctx.prg.repl)
		return crr_repl();
	return crr_exitpass();
}

//
// compiler
//

/*

Example Usage:

	Note: the API user is in charge of file locating and reading

	var cmp = compiler_new(program_new(false));

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

If doing a REPL, pass `true` into `compiler_new`, and push your first file as `NULL` for the name

*/

var UTF8;
if (typeof window === 'undefined')
	UTF8 = require('./utf8');
else
	UTF8 = window.UTF8;

function comppr_new(flp, tks){
	return { flp: flp, tks: tks };
}

function compiler_new(prg){
	var sym = symtbl_new(prg.repl);
	symtbl_loadStdlib(sym);
	return {
		pr: parser_new(),
		file: NULL,
		prg: prg,
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
		if (cmprs[c] == NULL){ // end of file
			var res = parser_close(cmp.pr);
			if (res.type == PRR_ERROR)
				return cma_error(filepos_err(cmp.file.flp, res.msg));

			// actually pop the file
			cmp.file.cmprs = [];
			cmp.file = cmp.file.next;
			if (cmp.file != NULL && cmp.file.incls.length > 0){
				// assume user is finished with the next included file
				if (cmp.file.incls[0].names != NULL)
					symtbl_popNamespace(cmp.sym);
				cmp.file.incls.shift();
			}
			return cma_ok();
		}
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
	if (cmp.file != NULL && cmp.file.incls.length > 0){
		// assume user is pushing the next included file
		if (cmp.file.incls[0].names != NULL){
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
		next: cmp.file
	};
	return cmf_ok();
}

function compiler_popFile(cmp){
	var tks = [];
	lex_close(cmp.file.lx, tks);
	cmp.file.cmprs.push(comppr_new(cmp.file.flp, tks));
	cmp.file.cmprs.push(NULL); // signify EOF
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

var Sink = {
	valToStr: function(){
		var out = [];
		for (var i = 0; i < arguments.length; i++)
			out.push(var_tostr(arguments[i]));
		return out.join(' ');
	},
	repl: function(prompt, die, fileResolve, fileRead, say, warn){
		var prg = program_new(true);
		var cmp = compiler_new(prg);
		var ctx = context_new(prg);
		compiler_pushFile(cmp, NULL);
		var depth = 0;

		function process(){
			while (true){
				var cm = compiler_process(cmp);
				if (cm.type == CMA_OK){
					if (depth > 0){
						depth--;
						continue;
					}
					while (true){
						var cr = context_run(ctx);
						if (cr.type == CRR_REPL)
							break;
						else if (cr.type == CRR_EXITPASS || cr.type == CRR_EXITFAIL)
							return die(cr.type == CRR_EXITPASS);
						else if (cr.type == CRR_SAY)
							say(cr.args);
						else if (cr.type == CRR_WARN)
							warn(cr.args);
						else{
							console.log('cr', cr);
							throw 'TODO: deal with a different cr';
						}
					}
					prompt(compiler_level(cmp), function(data){
						compiler_add(cmp, data);
						process();
					});
					break;
				}
				else if (cm.type == CMA_ERROR)
					warn(['Error: ' + cm.msg]);
				else if (cm.type == CMA_INCLUDE){
					depth++;
					var r = fileResolve(cm.file, cmp.file.flp.file);
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
			if (err.stack)
				warn(['' + err.stack ]);
			else
				warn(['' + err ]);
			compiler_pushFile(cmp, 'failure');
			compiler_popFile(cmp);
			process();
		}

		process();
	},
	run: function(startFile, die, fileResolve, fileRead){
		var prg = program_new(false);
		var cmp = compiler_new(prg);
		var depth = 0;

		function processFile(file, fromFile){
			var r = fileResolve(file, fromFile);
			if (isPromise(r))
				r.then(fileResolved).catch(incError);
			else
				fileResolved(r);
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
				return incError(cf.msg);
			compiler_add(cmp, data);
			compiler_popFile(cmp);
			while (true){
				var cm = compiler_process(cmp);
				if (cm.type == CMA_OK){
					if (depth > 0){
						depth--;
						continue;
					}

					// run the finished program
					var ctx = context_new(prg);
					while (true){
						var cr = context_run(ctx);
						if (cr.type == CRR_EXITPASS || cr.type == CRR_EXITFAIL)
							return die(cr.type == CRR_EXITPASS);
						else if (cr.type == CRR_SAY){
							var out = [];
							for (var i = 0; i < cr.args.length; i++)
								out.push(var_tostr(cr.args[i]));
							console.log(out.join(' '));
						}
						else if (cr.type == CRR_WARN){
							var out = [];
							for (var i = 0; i < cr.args.length; i++)
								out.push(var_tostr(cr.args[i]));
							console.error(out.join(' '));
						}
						else{
							console.log('cr', cr);
							throw 'TODO: deal with a different cr';
						}
					}
					return die(true);
				}
				else if (cm.type == CMA_ERROR)
					return incError(cm.msg);
				else if (cm.type == CMA_INCLUDE){
					depth++;
					processFile(cm.file, file);
					break;
				}
			}
		}

		function incError(err){
			if (err.stack)
				console.error(err.stack);
			else
				console.error(err.toString());
			die(false);
		}

		processFile(startFile, NULL);
	}
};

if (typeof window === 'object')
	window.Sink = Sink;
else
	module.exports = Sink;

})();

#endif // block comment
