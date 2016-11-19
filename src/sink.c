// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"

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
#	define debug(msg)         printf("> %-10s: %s\n", __func__, msg)
#	define debugf(msg, ...)   printf("> %-10s: " msg "\n", __func__, __VA_ARGS__)
#	define oplog(msg)         printf("%% %s\n", msg)
#	define oplogf(msg, ...)   printf("%% " msg "\n", __VA_ARGS__)
#else
#	define NDEBUG
#	include <assert.h>
#	define debug(msg)
#	define debugf(msg, ...)
#	define oplog(msg)
#	define oplogf(msg, ...)
#endif

//
// cross-platform function for getting the current time in milliseconds
//

#ifdef SINK_MACOSX
#	include <sys/time.h>

static uint64_t current_ms(){
	struct timeval now;
	int rv = gettimeofday(&now, NULL);
	if (rv){
		SINK_PANIC("Failed to query Mac OSX for time of day");
	}
	uint64_t ret = now.tv_sec;
	ret *= 1000;
	ret += now.tv_usec / 1000;
	return ret;
}

#else
#	error Unknown platform
	// POSIX you'll want clock_gettime(CLOCK_REALTIME, ts)
	// windows you'll want GetSystemTime(&st)
	// others, who knows
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

#if defined(SINK_DEBUG) || defined(SINK_MEMTEST)

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
		m->p = new_p = mem_prod_realloc(p, s);
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
				m->p = new_p = mem_prod_realloc(p, s);
				m->file = file;
				m->line = line;
				break;
			}
			m = m->next;
		}
		if (!found){
			printf("Reallocated a pointer that wasn't originally allocated\n"
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
		printf("Freeing a pointer that wasn't originally allocated\n"
			"File: %s\nLine: %d\n", file, line);
	}
}

static void mem_debug_done(){
	m_debug_memlist m = memlist;
	if (m){
		printf("Failed to free memory allocated on:\n");
		while (m){
			printf("%s:%d\n", m->file, m->line);
			m_debug_memlist f = m;
			m = m->next;
			mem_prod_free(f->p);
			mem_prod_free(f);
		}
		memlist = NULL;
	}
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

char *sink_format(const char *fmt, ...){
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

static inline void list_byte_free(list_byte b){
	mem_free(b->bytes);
	mem_free(b);
}

static inline list_byte list_byte_new(){
	list_byte b = mem_alloc(sizeof(list_byte_st));
	b->size = 0;
	b->count = list_byte_grow;
	b->bytes = mem_alloc(sizeof(uint8_t) * b->count);
	return b;
}

static inline list_byte list_byte_newCopy(list_byte b){
	list_byte b2 = mem_alloc(sizeof(list_byte_st));
	b2->size = b->size;
	b2->count = b->size;
	b2->bytes = mem_alloc(sizeof(uint8_t) * b2->count);
	if (b->size > 0)
		memcpy(b2->bytes, b->bytes, sizeof(uint8_t) * b->size);
	return b2;
}

static inline list_byte list_byte_newStr(const char *data){
	list_byte b = mem_alloc(sizeof(list_byte_st));
	b->size = strlen(data);
	b->count = b->size;
	b->bytes = mem_alloc(sizeof(uint8_t) * b->count);
	memcpy(b->bytes, data, sizeof(uint8_t) * b->count);
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

static inline bool byteequ(list_byte b, const char *str){
	int i;
	for (i = 0; str[i] != 0; i++){
		if (b->size <= i)
			return false;
		if (b->bytes[i] != (uint8_t)str[i])
			return false;
	}
	return b->size == i;
}

static inline bool list_byte_equ(list_byte b1, list_byte b2){
	if (b1->size != b2->size)
		return false;
	return memcmp(b1->bytes, b2->bytes, sizeof(uint8_t) * b1->size) == 0;
}

typedef struct {
	int_fast32_t *vals;
	int size;
	int count;
} list_int_st, *list_int;

const int list_int_grow = 200;

static inline void list_int_free(list_int ls){
	mem_free(ls->vals);
	mem_free(ls);
}

static inline list_int list_int_new(){
	list_int ls = mem_alloc(sizeof(list_int_st));
	ls->size = 0;
	ls->count = list_int_grow;
	ls->vals = mem_alloc(sizeof(int_fast32_t) * ls->count);
	return ls;
}

static inline void list_int_push(list_int ls, int_fast32_t v){
	if (ls->size >= ls->count){
		ls->count += list_int_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(int_fast32_t) * ls->count);
	}
	ls->vals[ls->size++] = v;
}

static inline int list_int_pop(list_int ls){
	ls->size--;
	return ls->vals[ls->size];
}

typedef struct {
	uint64_t *vals;
	int size;
	int count;
} list_u64_st, *list_u64;

const int list_u64_grow = 200;

static inline void list_u64_free(list_u64 ls){
	mem_free(ls->vals);
	mem_free(ls);
}

static inline list_u64 list_u64_new(){
	list_u64 ls = mem_alloc(sizeof(list_u64_st));
	ls->size = 0;
	ls->count = list_u64_grow;
	ls->vals = mem_alloc(sizeof(uint64_t) * ls->count);
	return ls;
}

static inline void list_u64_push(list_u64 ls, uint64_t v){
	if (ls->size >= ls->count){
		ls->count += list_u64_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(uint64_t) * ls->count);
	}
	ls->vals[ls->size++] = v;
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

static inline list_ptr list_ptr_newSingle(free_func f_free, void *p){
	list_ptr ls = mem_alloc(sizeof(list_ptr_st));
	ls->size = 1;
	ls->count = 1;
	ls->ptrs = mem_alloc(sizeof(void *) * ls->count);
	ls->f_free = f_free;
	ls->ptrs[0] = p;
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

static inline void *list_ptr_shift(list_ptr ls){
	void *ret = ls->ptrs[0];
	ls->size--;
	if (ls->size > 0)
		memmove(ls->ptrs, &ls->ptrs[1], sizeof(void *) * ls->size);
	return ret;
}

static inline bool list_ptr_has(list_ptr ls, void *p){
	for (int i = 0; i < ls->size; i++){
		if (ls->ptrs[i] == p)
			return true;
	}
	return false;
}

static void list_ptr_free(list_ptr ls){
	if (ls->f_free){
		while (ls->size > 0)
			ls->f_free(ls->ptrs[--ls->size]);
	}
	mem_free(ls->ptrs);
	mem_free(ls);
}

typedef struct {
	double *vals;
	int size;
	int count;
} list_double_st, *list_double;

static const int list_double_grow = 200;

static inline void list_double_free(list_double ls){
	mem_free(ls->vals);
	mem_free(ls);
}

static inline list_double list_double_new(){
	list_double ls = mem_alloc(sizeof(list_double_st));
	ls->size = 0;
	ls->count = list_double_grow;
	ls->vals = mem_alloc(sizeof(double) * ls->count);
	return ls;
}

static inline void list_double_push(list_double ls, double v){
	if (ls->size >= ls->count){
		ls->count += list_double_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(double) * ls->count);
	}
	ls->vals[ls->size++] = v;
}

// cleanup helper
typedef struct {
	list_ptr cuser;
	list_ptr f_free;
} cleanup_st, *cleanup;

static inline cleanup cleanup_new(){
	cleanup cup = mem_alloc(sizeof(cleanup_st));
	cup->cuser = list_ptr_new(NULL);
	cup->f_free = list_ptr_new(NULL);
	return cup;
}

static inline void cleanup_add(cleanup cup, void *cuser, sink_free_func f_free){
	list_ptr_push(cup->cuser, cuser);
	list_ptr_push(cup->f_free, f_free);
}

static inline void cleanup_free(cleanup cup){
	for (int i = 0; i < cup->cuser->size; i++){
		sink_free_func f_free = cup->f_free->ptrs[i];
		f_free(cup->cuser->ptrs[i]);
	}
	list_ptr_free(cup->cuser);
	list_ptr_free(cup->f_free);
	mem_free(cup);
}

typedef struct {
	int fdiff;
	int index;
} varloc_st;

static inline varloc_st varloc_new(int fdiff, int index){
	return (varloc_st){ .fdiff = fdiff, .index = index };
}

static const varloc_st VARLOC_NULL = (varloc_st){ .fdiff = -1 };

static inline bool varloc_isnull(varloc_st vlc){
	return vlc.fdiff < 0;
}

static inline uint64_t native_hash(int size, const uint8_t *bytes){
	uint32_t hash[4];
	sink_str_hashplain(size, bytes, 0, hash);
	return ((uint64_t)hash[1] << 32) | hash[0];
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//
// compiler
//
////////////////////////////////////////////////////////////////////////////////////////////////////


//
// opcodes
//

typedef enum {
	OP_NOP           = 0x00, //
	OP_ABORTERR      = 0x01, // ERRNO
	OP_MOVE          = 0x02, // [TGT], [SRC]
	OP_INC           = 0x03, // [TGT/SRC]
	OP_NIL           = 0x04, // [TGT]
	OP_NUMPOS        = 0x05, // [TGT], [VALUE]
	OP_NUMNEG        = 0x06, // [TGT], [VALUE]
	OP_NUMTBL        = 0x07, // [TGT], [INDEX]
	OP_STR           = 0x08, // [TGT], [INDEX]
	OP_LIST          = 0x09, // [TGT], HINT
	OP_ISNUM         = 0x0A, // [TGT], [SRC]
	OP_ISSTR         = 0x0B, // [TGT], [SRC]
	OP_ISLIST        = 0x0C, // [TGT], [SRC]
	OP_NOT           = 0x0D, // [TGT], [SRC]
	OP_SIZE          = 0x0E, // [TGT], [SRC]
	OP_TONUM         = 0x0F, // [TGT], [SRC]
	OP_CAT           = 0x10, // [TGT], [SRC1], [SRC2]
	OP_LT            = 0x11, // [TGT], [SRC1], [SRC2]
	OP_LTE           = 0x12, // [TGT], [SRC1], [SRC2]
	OP_NEQ           = 0x13, // [TGT], [SRC1], [SRC2]
	OP_EQU           = 0x14, // [TGT], [SRC1], [SRC2]
	OP_GETAT         = 0x15, // [TGT], [SRC1], [SRC2]
	OP_SLICE         = 0x16, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_SETAT         = 0x17, // [SRC1], [SRC2], [SRC3]
	OP_SPLICE        = 0x18, // [SRC1], [SRC2], [SRC3], [SRC4]
	OP_JUMP          = 0x19, // [[LOCATION]]
	OP_JUMPTRUE      = 0x1A, // [SRC], [[LOCATION]]
	OP_JUMPFALSE     = 0x1B, // [SRC], [[LOCATION]]
	OP_CALL          = 0x1C, // [TGT], [SRC], LEVEL, [[LOCATION]]
	OP_NATIVE        = 0x1D, // [TGT], [SRC], [INDEX]
	OP_RETURN        = 0x1E, // [SRC]
	OP_RETURNTAIL    = 0x1F, // [SRC], [[LOCATION]]
	OP_RANGE         = 0x20, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_SAY           = 0x21, // [TGT], [SRC...]
	OP_WARN          = 0x22, // [TGT], [SRC...]
	OP_ASK           = 0x23, // [TGT], [SRC...]
	OP_EXIT          = 0x24, // [TGT], [SRC...]
	OP_ABORT         = 0x25, // [TGT], [SRC...]
	OP_NUM_NEG       = 0x26, // [TGT], [SRC]
	OP_NUM_ADD       = 0x27, // [TGT], [SRC1], [SRC2]
	OP_NUM_SUB       = 0x28, // [TGT], [SRC1], [SRC2]
	OP_NUM_MUL       = 0x29, // [TGT], [SRC1], [SRC2]
	OP_NUM_DIV       = 0x2A, // [TGT], [SRC1], [SRC2]
	OP_NUM_MOD       = 0x2B, // [TGT], [SRC1], [SRC2]
	OP_NUM_POW       = 0x2C, // [TGT], [SRC1], [SRC2]
	OP_NUM_ABS       = 0x2D, // [TGT], [SRC]
	OP_NUM_SIGN      = 0x2E, // [TGT], [SRC]
	OP_NUM_MAX       = 0x2F, // [TGT], [SRC...]
	OP_NUM_MIN       = 0x30, // [TGT], [SRC...]
	OP_NUM_CLAMP     = 0x31, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_FLOOR     = 0x32, // [TGT], [SRC]
	OP_NUM_CEIL      = 0x33, // [TGT], [SRC]
	OP_NUM_ROUND     = 0x34, // [TGT], [SRC]
	OP_NUM_TRUNC     = 0x35, // [TGT], [SRC]
	OP_NUM_NAN       = 0x36, // [TGT]
	OP_NUM_INF       = 0x37, // [TGT]
	OP_NUM_ISNAN     = 0x38, // [TGT], [SRC]
	OP_NUM_ISFINITE  = 0x39, // [TGT], [SRC]
	OP_NUM_E         = 0x3A, // [TGT]
	OP_NUM_PI        = 0x3B, // [TGT]
	OP_NUM_TAU       = 0x3C, // [TGT]
	OP_NUM_SIN       = 0x3D, // [TGT], [SRC]
	OP_NUM_COS       = 0x3E, // [TGT], [SRC]
	OP_NUM_TAN       = 0x3F, // [TGT], [SRC]
	OP_NUM_ASIN      = 0x40, // [TGT], [SRC]
	OP_NUM_ACOS      = 0x41, // [TGT], [SRC]
	OP_NUM_ATAN      = 0x42, // [TGT], [SRC]
	OP_NUM_ATAN2     = 0x43, // [TGT], [SRC1], [SRC2]
	OP_NUM_LOG       = 0x44, // [TGT], [SRC]
	OP_NUM_LOG2      = 0x45, // [TGT], [SRC]
	OP_NUM_LOG10     = 0x46, // [TGT], [SRC]
	OP_NUM_EXP       = 0x47, // [TGT], [SRC]
	OP_NUM_LERP      = 0x48, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_HEX       = 0x49, // [TGT], [SRC1], [SRC2]
	OP_NUM_OCT       = 0x4A, // [TGT], [SRC1], [SRC2]
	OP_NUM_BIN       = 0x4B, // [TGT], [SRC1], [SRC2]
	OP_INT_NEW       = 0x4C, // [TGT], [SRC]
	OP_INT_NOT       = 0x4D, // [TGT], [SRC]
	OP_INT_AND       = 0x4E, // [TGT], [SRC1], [SRC2]
	OP_INT_OR        = 0x4F, // [TGT], [SRC1], [SRC2]
	OP_INT_XOR       = 0x50, // [TGT], [SRC1], [SRC2]
	OP_INT_SHL       = 0x51, // [TGT], [SRC1], [SRC2]
	OP_INT_SHR       = 0x52, // [TGT], [SRC1], [SRC2]
	OP_INT_SAR       = 0x53, // [TGT], [SRC1], [SRC2]
	OP_INT_ADD       = 0x54, // [TGT], [SRC1], [SRC2]
	OP_INT_SUB       = 0x55, // [TGT], [SRC1], [SRC2]
	OP_INT_MUL       = 0x56, // [TGT], [SRC1], [SRC2]
	OP_INT_DIV       = 0x57, // [TGT], [SRC1], [SRC2]
	OP_INT_MOD       = 0x58, // [TGT], [SRC1], [SRC2]
	OP_INT_CLZ       = 0x59, // [TGT], [SRC]
	OP_RAND_SEED     = 0x5A, // [TGT], [SRC]
	OP_RAND_SEEDAUTO = 0x5B, // [TGT]
	OP_RAND_INT      = 0x5C, // [TGT]
	OP_RAND_NUM      = 0x5D, // [TGT]
	OP_RAND_GETSTATE = 0x5E, // [TGT]
	OP_RAND_SETSTATE = 0x5F, // [TGT], [SRC]
	OP_RAND_PICK     = 0x60, // [TGT], [SRC]
	OP_RAND_SHUFFLE  = 0x61, // [TGT], [SRC]
	OP_STR_NEW       = 0x62, // [TGT], [SRC...]
	OP_STR_SPLIT     = 0x63, // [TGT], [SRC1], [SRC2]
	OP_STR_REPLACE   = 0x64, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_BEGINS    = 0x65, // [TGT], [SRC1], [SRC2]
	OP_STR_ENDS      = 0x66, // [TGT], [SRC1], [SRC2]
	OP_STR_PAD       = 0x67, // [TGT], [SRC1], [SRC2]
	OP_STR_FIND      = 0x68, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_RFIND     = 0x69, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_LOWER     = 0x6A, // [TGT], [SRC]
	OP_STR_UPPER     = 0x6B, // [TGT], [SRC]
	OP_STR_TRIM      = 0x6C, // [TGT], [SRC]
	OP_STR_REV       = 0x6D, // [TGT], [SRC]
	OP_STR_REP       = 0x6E, // [TGT], [SRC]
	OP_STR_LIST      = 0x6F, // [TGT], [SRC]
	OP_STR_BYTE      = 0x70, // [TGT], [SRC1], [SRC2]
	OP_STR_HASH      = 0x71, // [TGT], [SRC1], [SRC2]
	OP_UTF8_VALID    = 0x72, // [TGT], [SRC]
	OP_UTF8_LIST     = 0x73, // [TGT], [SRC]
	OP_UTF8_STR      = 0x74, // [TGT], [SRC]
	OP_STRUCT_SIZE   = 0x75, // [TGT], [SRC]
	OP_STRUCT_STR    = 0x76, // [TGT], [SRC1], [SRC2]
	OP_STRUCT_LIST   = 0x77, // [TGT], [SRC1], [SRC2]
	OP_LIST_NEW      = 0x78, // [TGT], [SRC1], [SRC2]
	OP_LIST_SHIFT    = 0x79, // [TGT], [SRC]
	OP_LIST_POP      = 0x7A, // [TGT], [SRC]
	OP_LIST_PUSH     = 0x7B, // [TGT], [SRC1], [SRC2]
	OP_LIST_UNSHIFT  = 0x7C, // [TGT], [SRC1], [SRC2]
	OP_LIST_APPEND   = 0x7D, // [TGT], [SRC1], [SRC2]
	OP_LIST_PREPEND  = 0x7E, // [TGT], [SRC1], [SRC2]
	OP_LIST_FIND     = 0x7F, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_RFIND    = 0x80, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_JOIN     = 0x81, // [TGT], [SRC1], [SRC2]
	OP_LIST_REV      = 0x82, // [TGT], [SRC]
	OP_LIST_STR      = 0x83, // [TGT], [SRC]
	OP_LIST_SORT     = 0x84, // [TGT], [SRC]
	OP_LIST_RSORT    = 0x85, // [TGT], [SRC]
	OP_LIST_SORTCMP  = 0x86, // [TGT], [SRC1], [SRC2]
	OP_PICKLE_VALID  = 0x87, // [TGT], [SRC]
	OP_PICKLE_STR    = 0x88, // [TGT], [SRC]
	OP_PICKLE_VAL    = 0x89, // [TGT], [SRC]
	OP_GC_LEVEL      = 0x8A, // [TGT]
	OP_GC_RUN        = 0x8B, // [TGT]

	// fake ops
	OP_GT            = 0x1F0,
	OP_GTE           = 0x1F1,
	OP_PICK          = 0x1F2,
	OP_INVALID       = 0x1F3
} op_enum;

typedef enum {
	ABORT_LISTFUNC = 0x01
} abort_enum;

static inline void op_aborterr(list_byte b, int errno){
	oplogf("ABORTERR %d", errno);
	list_byte_push2(b, OP_ABORTERR, errno);
}

static inline void op_move(list_byte b, varloc_st tgt, varloc_st src){
	if (tgt.fdiff == src.fdiff && tgt.index == src.index)
		return;
	oplogf("MOVE %d:%d, %d:%d", tgt.fdiff, tgt.index, src.fdiff, src.index);
	list_byte_push5(b, OP_MOVE, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

static inline void op_inc(list_byte b, varloc_st src){
	oplogf("INC %d:%d", src.fdiff, src.index);
	list_byte_push3(b, OP_INC, src.fdiff, src.index);
}

static inline void op_nil(list_byte b, varloc_st tgt){
	oplogf("NIL %d:%d", tgt.fdiff, tgt.index);
	list_byte_push3(b, OP_NIL, tgt.fdiff, tgt.index);
}

static inline void op_num(list_byte b, varloc_st tgt, int num){
	oplogf("NUM %d:%d, %d", tgt.fdiff, tgt.index, num);
	if (num >= 0)
		list_byte_push5(b, OP_NUMPOS, tgt.fdiff, tgt.index, num % 256, num >> 8);
	else{
		num += 65536;
		list_byte_push5(b, OP_NUMNEG, tgt.fdiff, tgt.index, num % 256, num >> 8);
	}
}

static inline void op_numtbl(list_byte b, varloc_st tgt, int index){
	oplogf("NUMTBL %d:%d, %d", tgt.fdiff, tgt.index, index);
	list_byte_push5(b, OP_NUMTBL, tgt.fdiff, tgt.index, index % 256, index >> 8);
}

static inline void op_str(list_byte b, varloc_st tgt, int index){
	oplogf("STR %d:%d, %d", tgt.fdiff, tgt.index, index);
	list_byte_push5(b, OP_STR, tgt.fdiff, tgt.index, index % 256, index >> 8);
}

static inline void op_list(list_byte b, varloc_st tgt, int hint){
	if (hint > 255)
		hint = 255;
	oplogf("LIST %d:%d, %d", tgt.fdiff, tgt.index, hint);
	list_byte_push4(b, OP_LIST, tgt.fdiff, tgt.index, hint);
}

static inline void op_unop(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src){
	#ifdef SINK_DEBUG
	const char *opstr = "???";
	if      (opcode == OP_ISNUM     ) opstr = "ISNUM";
	else if (opcode == OP_ISSTR     ) opstr = "ISSTR";
	else if (opcode == OP_ISLIST    ) opstr = "ISLIST";
	else if (opcode == OP_NOT       ) opstr = "NOT";
	else if (opcode == OP_SIZE      ) opstr = "SIZE";
	else if (opcode == OP_TONUM     ) opstr = "TONUM";
	else if (opcode == OP_NUM_NEG   ) opstr = "NUM_NEG";
	else if (opcode == OP_LIST_SHIFT) opstr = "LIST_SHIFT";
	else if (opcode == OP_LIST_POP  ) opstr = "LIST_POP";
	oplogf("%s %d:%d, %d:%d", opstr, tgt.fdiff, tgt.index, src.fdiff, src.index);
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
	if      (opcode == OP_CAT    ) opstr = "CAT";
	else if (opcode == OP_LT     ) opstr = "LT";
	else if (opcode == OP_LTE    ) opstr = "LTE";
	else if (opcode == OP_NEQ    ) opstr = "NEQ";
	else if (opcode == OP_EQU    ) opstr = "EQU";
	else if (opcode == OP_NUM_ADD) opstr = "NUM_ADD";
	else if (opcode == OP_NUM_SUB) opstr = "NUM_SUB";
	else if (opcode == OP_NUM_MUL) opstr = "NUM_MUL";
	else if (opcode == OP_NUM_DIV) opstr = "NUM_DIV";
	else if (opcode == OP_NUM_MOD) opstr = "NUM_MOD";
	else if (opcode == OP_NUM_POW) opstr = "NUM_POW";
	oplogf("%s %d:%d, %d:%d, %d:%d", opstr, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	#endif
	list_byte_push7(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_getat(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2){
	oplogf("GETAT %d:%d, %d:%d, %d:%d", tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	list_byte_push7(b, OP_GETAT, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_slice(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2,
	varloc_st src3){
	oplogf("SLICE %d:%d, %d:%d, %d:%d, %d:%d", tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
	list_byte_push9(b, OP_SLICE, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
}

static inline void op_setat(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3){
	oplogf("SETAT %d:%d, %d:%d, %d:%d", src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
	list_byte_push7(b, OP_SETAT, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index);
}

static inline void op_splice(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3,
	varloc_st src4){
	oplogf("SPLICE %d:%d, %d:%d, %d:%d, %d:%d", src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index, src4.fdiff, src4.index);
	list_byte_push9(b, OP_SPLICE, src1.fdiff, src1.index, src2.fdiff, src2.index,
		src3.fdiff, src3.index, src4.fdiff, src4.index);
}

static inline void op_jump(list_byte b, uint32_t index, list_byte hint){
	oplogf("JUMP %.*s", hint->size, hint->bytes);
	list_byte_push5(b, OP_JUMP,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_jumpTrue(list_byte b, varloc_st src, uint32_t index, list_byte hint){
	oplogf("JUMPTRUE %d:%d, %.*s", src.fdiff, src.index, hint->size, hint->bytes);
	list_byte_push7(b, OP_JUMPTRUE, src.fdiff, src.index,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_jumpFalse(list_byte b, varloc_st src, uint32_t index, list_byte hint){
	oplogf("JUMPFALSE %d:%d, %.*s", src.fdiff, src.index, hint->size, hint->bytes);
	list_byte_push7(b, OP_JUMPFALSE, src.fdiff, src.index,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_call(list_byte b, varloc_st ret, varloc_st arg, int level, uint32_t index,
	list_byte hint){
	oplogf("CALL %d:%d, %d:%d, %d, %.*s", ret.fdiff, ret.index, arg.fdiff, arg.index, level,
		hint->size, hint->bytes);
	list_byte_push10(b, OP_CALL, ret.fdiff, ret.index, arg.fdiff, arg.index, level,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_native(list_byte b, varloc_st ret, varloc_st arg, int index){
	oplogf("NATIVE %d:%d, %d:%d, %d", ret.fdiff, ret.index, arg.fdiff, arg.index, index);
	list_byte_push7(b, OP_NATIVE, ret.fdiff, ret.index, arg.fdiff, arg.index,
		index % 256, index >> 8);
}

static inline void op_return(list_byte b, varloc_st src){
	oplogf("RETURN %d:%d", src.fdiff, src.index);
	list_byte_push3(b, OP_RETURN, src.fdiff, src.index);
}

static inline void op_returntail(list_byte b, varloc_st arg, uint32_t index,
	list_byte hint){
	oplogf("RETURNTAIL %d:%d, %.*s", arg.fdiff, arg.index, hint->size, hint->bytes);
	list_byte_push7(b, OP_RETURNTAIL, arg.fdiff, arg.index,
		index % 256,
		(index >> 8) % 256,
		(index >> 16) % 256,
		(index >> 24) % 256);
}

static inline void op_param0(list_byte b, op_enum opcode, varloc_st tgt){
	oplogf("0x%02X %d:%d", opcode, tgt.fdiff, tgt.index);
	list_byte_push3(b, opcode, tgt.fdiff, tgt.index);
}

static inline void op_param1(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src){
	oplogf("0x%02X %d:%d, %d:%d", opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
	list_byte_push5(b, opcode, tgt.fdiff, tgt.index, src.fdiff, src.index);
}

static inline void op_param2(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2){
	oplogf("0x%02X %d:%d, %d:%d, %d:%d", opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
	list_byte_push7(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index);
}

static inline void op_param3(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2, varloc_st src3){
	oplogf("0x%02X %d:%d, %d:%d, %d:%d, %d:%d", opcode, tgt.fdiff, tgt.index,
		src1.fdiff, src1.index, src2.fdiff, src2.index, src3.fdiff, src3.index);
	list_byte_push9(b, opcode, tgt.fdiff, tgt.index, src1.fdiff, src1.index,
		src2.fdiff, src2.index, src3.fdiff, src3.index);
}

//
// file position
//

typedef struct {
	char *file;
	int line;
	int chr;
} filepos_st;

static inline filepos_st filepos_new(char *file, int line, int chr){
	return (filepos_st){ .file = file, .line = line, .chr = chr };
}

static char *filepos_err(filepos_st flp, char *msg){
	if (flp.file == NULL)
		return sink_format("%d:%d: %s", flp.line, flp.chr, msg);
	return sink_format("%s:%d:%d: %s", flp.file, flp.line, flp.chr, msg);
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
	KS_AMP2,
	KS_PIPE2,
	KS_PERIOD3,
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
	KS_USING,
	KS_VAR,
	KS_WHILE
} ks_enum;

static const char *ks_name(ks_enum k){
	#ifdef SINK_DEBUG
	switch (k){
		case KS_INVALID:    return "KS_INVALID";
		case KS_PLUS:       return "KS_PLUS";
		case KS_UNPLUS:     return "KS_UNPLUS";
		case KS_MINUS:      return "KS_MINUS";
		case KS_UNMINUS:    return "KS_UNMINUS";
		case KS_PERCENT:    return "KS_PERCENT";
		case KS_STAR:       return "KS_STAR";
		case KS_SLASH:      return "KS_SLASH";
		case KS_CARET:      return "KS_CARET";
		case KS_AT:         return "KS_AT";
		case KS_AMP:        return "KS_AMP";
		case KS_LT:         return "KS_LT";
		case KS_GT:         return "KS_GT";
		case KS_BANG:       return "KS_BANG";
		case KS_EQU:        return "KS_EQU";
		case KS_TILDE:      return "KS_TILDE";
		case KS_COLON:      return "KS_COLON";
		case KS_COMMA:      return "KS_COMMA";
		case KS_PERIOD:     return "KS_PERIOD";
		case KS_PIPE:       return "KS_PIPE";
		case KS_LPAREN:     return "KS_LPAREN";
		case KS_LBRACKET:   return "KS_LBRACKET";
		case KS_LBRACE:     return "KS_LBRACE";
		case KS_RPAREN:     return "KS_RPAREN";
		case KS_RBRACKET:   return "KS_RBRACKET";
		case KS_RBRACE:     return "KS_RBRACE";
		case KS_PLUSEQU:    return "KS_PLUSEQU";
		case KS_MINUSEQU:   return "KS_MINUSEQU";
		case KS_PERCENTEQU: return "KS_PERCENTEQU";
		case KS_STAREQU:    return "KS_STAREQU";
		case KS_SLASHEQU:   return "KS_SLASHEQU";
		case KS_CARETEQU:   return "KS_CARETEQU";
		case KS_LTEQU:      return "KS_LTEQU";
		case KS_GTEQU:      return "KS_GTEQU";
		case KS_BANGEQU:    return "KS_BANGEQU";
		case KS_EQU2:       return "KS_EQU2";
		case KS_TILDEEQU:   return "KS_TILDEEQU";
		case KS_AMP2:       return "KS_AMP2";
		case KS_PIPE2:      return "KS_PIPE2";
		case KS_PERIOD3:    return "KS_PERIOD3";
		case KS_PIPE2EQU:   return "KS_PIPE2EQU";
		case KS_AMP2EQU:    return "KS_AMP2EQU";
		case KS_BREAK:      return "KS_BREAK";
		case KS_CONTINUE:   return "KS_CONTINUE";
		case KS_DECLARE:    return "KS_DECLARE";
		case KS_DEF:        return "KS_DEF";
		case KS_DO:         return "KS_DO";
		case KS_ELSE:       return "KS_ELSE";
		case KS_ELSEIF:     return "KS_ELSEIF";
		case KS_END:        return "KS_END";
		case KS_FOR:        return "KS_FOR";
		case KS_GOTO:       return "KS_GOTO";
		case KS_IF:         return "KS_IF";
		case KS_INCLUDE:    return "KS_INCLUDE";
		case KS_NAMESPACE:  return "KS_NAMESPACE";
		case KS_NIL:        return "KS_NIL";
		case KS_RETURN:     return "KS_RETURN";
		case KS_USING:      return "KS_USING";
		case KS_VAR:        return "KS_VAR";
		case KS_WHILE:      return "KS_WHILE";
	}
	#else
	return "";
	#endif
}

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
	else if (c1 == '&' && c2 == '&') return KS_AMP2;
	else if (c1 == '|' && c2 == '|') return KS_PIPE2;
	return KS_INVALID;
}

static inline ks_enum ks_char3(char c1, char c2, char c3){
	if      (c1 == '.' && c2 == '.' && c3 == '.') return KS_PERIOD3;
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
	else if (byteequ(s, "using"    )) return KS_USING;
	else if (byteequ(s, "var"      )) return KS_VAR;
	else if (byteequ(s, "while"    )) return KS_WHILE;
	return KS_INVALID;
}

static inline op_enum ks_toUnaryOp(ks_enum k){
	if      (k == KS_PLUS   ) return OP_TONUM;
	else if (k == KS_UNPLUS ) return OP_TONUM;
	else if (k == KS_MINUS  ) return OP_NUM_NEG;
	else if (k == KS_UNMINUS) return OP_NUM_NEG;
	else if (k == KS_AMP    ) return OP_SIZE;
	else if (k == KS_BANG   ) return OP_NOT;
	return OP_INVALID;
}

static inline op_enum ks_toBinaryOp(ks_enum k){
	if      (k == KS_PLUS   ) return OP_NUM_ADD;
	else if (k == KS_MINUS  ) return OP_NUM_SUB;
	else if (k == KS_PERCENT) return OP_NUM_MOD;
	else if (k == KS_STAR   ) return OP_NUM_MUL;
	else if (k == KS_SLASH  ) return OP_NUM_DIV;
	else if (k == KS_CARET  ) return OP_NUM_POW;
	else if (k == KS_LT     ) return OP_LT;
	else if (k == KS_GT     ) return OP_GT;
	else if (k == KS_TILDE  ) return OP_CAT;
	else if (k == KS_LTEQU  ) return OP_LTE;
	else if (k == KS_GTEQU  ) return OP_GTE;
	else if (k == KS_BANGEQU) return OP_NEQ;
	else if (k == KS_EQU2   ) return OP_EQU;
	return OP_INVALID;
}

static inline op_enum ks_toMutateOp(ks_enum k){
	if      (k == KS_PLUSEQU   ) return OP_NUM_ADD;
	else if (k == KS_PERCENTEQU) return OP_NUM_MOD;
	else if (k == KS_MINUSEQU  ) return OP_NUM_SUB;
	else if (k == KS_STAREQU   ) return OP_NUM_MUL;
	else if (k == KS_SLASHEQU  ) return OP_NUM_DIV;
	else if (k == KS_CARETEQU  ) return OP_NUM_POW;
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

static void tok_print(tok tk){
	#ifdef SINK_DEBUG
	switch (tk->type){
		case TOK_NEWLINE:
			debug("TOK_NEWLINE");
			break;
		case TOK_KS:
			debugf("TOK_KS %s", ks_name(tk->u.k));
			break;
		case TOK_IDENT:
			if (tk->u.ident)
				debugf("TOK_IDENT \"%.*s\"", tk->u.ident->size, tk->u.ident->bytes);
			else
				debug("TOK_IDENT NULL");
			break;
		case TOK_NUM:
			debugf("TOK_NUM %g", tk->u.num);
			break;
		case TOK_STR:
			if (tk->u.str)
				debugf("TOK_STR \"%.*s\"", tk->u.str->size, tk->u.str->bytes);
			else
				debug("TOK_STR NULL");
			break;
		case TOK_ERROR:
			if (tk->u.msg)
				debugf("TOK_ERROR \"%s\"", tk->u.msg);
			else
				debug("TOK_ERROR NULL");
			break;
	}
	#endif
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

static inline bool tok_isMidStmt(tok tk){
	return tok_isKS(tk, KS_END) || tok_isKS(tk, KS_ELSE) || tok_isKS(tk, KS_ELSEIF) ||
		tok_isKS(tk, KS_WHILE);
}

static inline bool tok_isPre(tok tk){
	if (tk->type != TOK_KS)
		return false;
	ks_enum k = tk->u.k;
	return false ||
		k == KS_PLUS    ||
		k == KS_UNPLUS  ||
		k == KS_MINUS   ||
		k == KS_UNMINUS ||
		k == KS_AMP     ||
		k == KS_BANG    ||
		k == KS_PERIOD3;
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
	assert(pre->type == TOK_KS);
	assert(mid->type == TOK_KS);
	// -5^2 is -25, not 25
	if ((pre->u.k == KS_MINUS || pre->u.k == KS_UNMINUS) && mid->u.k == KS_CARET)
		return false;
	// otherwise, apply the Pre first
	return true;
}

static inline int tok_midPrecedence(tok tk){
	assert(tk->type == TOK_KS);
	ks_enum k = tk->u.k;
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
	assert(false);
	return -1;
}

static inline bool tok_isMidBeforeMid(tok lmid, tok rmid){
	assert(lmid->type == TOK_KS);
	assert(rmid->type == TOK_KS);
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
	list_byte str;
	list_int braces;
	lex_enum state;
	char chR;
	char ch1;
	char ch2;
	char ch3;
	char ch4;
	double num_val;
	double num_base;
	double num_frac;
	double num_flen;
	double num_esign;
	double num_eval;
	double num_elen;
	int str_hexval;
	int str_hexleft;
} lex_st, *lex;

static inline void lex_free(lex lx){
	if (lx->str)
		list_byte_free(lx->str);
	list_int_free(lx->braces);
	mem_free(lx);
}

static void lex_reset(lex lx){
	lx->state = LEX_START;
	lx->chR = 0;
	lx->ch1 = 0;
	lx->ch2 = 0;
	lx->ch3 = 0;
	lx->ch4 = 0;
	if (lx->str)
		list_byte_free(lx->str);
	lx->str = NULL;
	lx->num_val = 0;
	lx->num_base = 0;
	lx->num_frac = 0;
	lx->num_flen = 0;
	lx->num_esign = 0;
	lx->num_eval = 0;
	lx->num_elen = 0;
	if (lx->braces)
		list_int_free(lx->braces);
	lx->braces = list_int_new();
	list_int_push(lx->braces, 0);
	lx->str_hexval = 0;
	lx->str_hexleft = 0;
}

static lex lex_new(){
	lex lx = mem_alloc(sizeof(lex_st));
	lx->str = NULL;
	lx->braces = NULL;
	lex_reset(lx);
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
				if (ch1 == '{')
					lx->braces->vals[lx->braces->size - 1]++;
				else if (ch1 == '}'){
					if (lx->braces->vals[lx->braces->size - 1] > 0)
						lx->braces->vals[lx->braces->size - 1]--;
					else if (lx->braces->size > 1){
						list_int_pop(lx->braces);
						lx->str = list_byte_new();
						lx->state = LEX_STR_INTERP;
						list_ptr_push(tks, tok_ks(KS_RPAREN));
						list_ptr_push(tks, tok_ks(KS_TILDE));
						break;
					}
					else
						list_ptr_push(tks, tok_error(sink_format("Mismatched brace")));
				}
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
				list_ptr_push(tks, tok_error(sink_format("Unexpected character: %c", ch1)));
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
				list_ptr_push(tks, tok_error(sink_format("Invalid character after backslash")));
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
					list_ptr_push(tks, tok_error(sink_format("Unexpected character: %c", lx->ch2)));
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
					else{
						list_ptr_push(tks,
							tok_error(sink_format("Unexpected character: %c", lx->ch3)));
					}
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
					list_ptr_push(tks, tok_error(sink_format("Identifier too long")));
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
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_2:
			if (isHex(ch1)){
				lx->num_val = toHex(ch1);
				if (lx->num_val > lx->num_base)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else
					lx->state = LEX_NUM;
			}
			else if (ch1 != '_')
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
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
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else
					lx->num_val = lx->num_val * lx->num_base + v;
			}
			else if (!isAlpha(ch1)){
				list_ptr_push(tks, tok_num(lx->num_val));
				lx->state = LEX_START;
				lex_process(lx, tks);
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
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
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else{
					lx->num_frac = lx->num_frac * lx->num_base + v;
					lx->num_flen++;
				}
			}
			else if (!isAlpha(ch1)){
				if (lx->num_flen <= 0)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else{
					double d = pow(lx->num_base, lx->num_flen);
					lx->num_val = (lx->num_val * d + lx->num_frac) / d;
					list_ptr_push(tks, tok_num(lx->num_val));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
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
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
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
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_STR_BASIC:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(sink_format("Missing end of string")));
			else if (ch1 == '\'')
				lx->state = LEX_STR_BASIC_ESC;
			else
				list_byte_push(lx->str, ch1);
			break;

		case LEX_STR_BASIC_ESC:
			if (ch1 == '\'' || ch1 == '\''){
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_BASIC;
			}
			else{
				lx->state = LEX_START;
				list_ptr_push(tks, tok_ks(KS_LPAREN));
				list_ptr_push(tks, tok_str(lx->str));
				list_ptr_push(tks, tok_ks(KS_RPAREN));
				lx->str = NULL;
				lex_process(lx, tks);
			}
			break;

		case LEX_STR_INTERP:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(sink_format("Missing end of string")));
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
				list_int_push(lx->braces, 0);
				lx->state = LEX_START;
				list_ptr_push(tks, tok_ks(KS_LPAREN));
			}
			else if (isIdentStart(ch1)){
				lx->str = list_byte_new();
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_INTERP_DLR_ID;
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid substitution")));
			break;

		case LEX_STR_INTERP_DLR_ID:
			if (!isIdentBody(ch1)){
				if (ks_str(lx->str) != KS_INVALID)
					list_ptr_push(tks, tok_error(sink_format("Invalid substitution")));
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
					list_ptr_push(tks, tok_error(sink_format("Identifier too long")));
			}
			break;

		case LEX_STR_INTERP_ESC:
			if (ch1 == '\r' || ch1 == '\n')
				list_ptr_push(tks, tok_error(sink_format("Missing end of string")));
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
			else if (ch1 == 'e'){
				list_byte_push(lx->str, 27);
				lx->state = LEX_STR_INTERP;
			}
			else if (ch1 == '\\' || ch1 == '\'' || ch1 == '"' || ch1 == '$'){
				list_byte_push(lx->str, ch1);
				lx->state = LEX_STR_INTERP;
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid escape sequence: \\%c", ch1)));
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
					tok_error(sink_format("Invalid escape sequence; expecting hex value")));
			}
			break;
	}
}

static inline void lex_add(lex lx, char ch, list_ptr tks){
	lex_fwd(lx, ch);
	lex_process(lx, tks);
}

static void lex_close(lex lx, list_ptr tks){
	if (lx->braces->size > 1){
		list_ptr_push(tks, tok_error(sink_format("Missing end of string")));
		return;
	}
	switch (lx->state){
		case LEX_START:
		case LEX_COMMENT_LINE:
		case LEX_BACKSLASH:
		case LEX_RETURN:
			break;

		case LEX_COMMENT_BLOCK:
			list_ptr_push(tks, tok_error(sink_format("Missing end of block comment")));
			return;

		case LEX_SPECIAL1: {
			ks_enum ks1 = ks_char(lx->ch1);
			if (ks1 != KS_INVALID)
				list_ptr_push(tks, tok_ks(ks1));
			else
				list_ptr_push(tks, tok_error(sink_format("Unexpected character: %c", lx->ch1)));
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
					else{
						list_ptr_push(tks,
							tok_error(sink_format("Unexpected character: %c", lx->ch1)));
					}
				}
				else{
					list_ptr_push(tks,
						tok_error(sink_format("Unexpected character: %c", lx->ch2)));
				}
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
			list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM:
			list_ptr_push(tks, tok_num(lx->num_val));
			break;

		case LEX_NUM_FRAC:
			if (lx->num_flen <= 0)
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			else{
				double d = pow(lx->num_base, lx->num_flen);
				lx->num_val = (lx->num_val * d + lx->num_frac) / d;
				list_ptr_push(tks, tok_num(lx->num_val));
			}
			break;

		case LEX_NUM_EXP:
			list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_EXP_BODY:
			if (lx->num_elen <= 0)
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
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

		case LEX_STR_BASIC_ESC:
			list_ptr_push(tks, tok_ks(KS_LPAREN));
			list_ptr_push(tks, tok_str(lx->str));
			list_ptr_push(tks, tok_ks(KS_RPAREN));
			lx->str = NULL;
			break;

		case LEX_STR_BASIC:
		case LEX_STR_INTERP:
		case LEX_STR_INTERP_DLR:
		case LEX_STR_INTERP_DLR_ID:
		case LEX_STR_INTERP_ESC:
		case LEX_STR_INTERP_ESC_HEX:
			list_ptr_push(tks, tok_error(sink_format("Missing end of string")));
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

static void expr_print(expr ex, int depth){
	#ifdef SINK_DEBUG
	char *tab = mem_alloc(sizeof(char) * (depth * 2 + 1));
	for (int i = 0; i < depth * 2; i++)
		tab[i] = ' ';
	tab[depth * 2] = 0;
	switch (ex->type){
		case EXPR_NIL:
			debugf("%sEXPR_NIL", tab);
			break;

		case EXPR_NUM:
			debugf("%sEXPR_NUM %g", tab, ex->u.num);
			break;

		case EXPR_STR:
			if (ex->u.str)
				debugf("%sEXPR_STR \"%.*s\"", tab, ex->u.str->size, ex->u.str->bytes);
			else
				debugf("%sEXPR_STR NULL", tab);
			break;

		case EXPR_LIST:
			if (ex->u.ex){
				debugf("%sEXPR_LIST:", tab);
				expr_print(ex->u.ex, depth + 1);
			}
			else
				debugf("%sEXPR_LIST NULL", tab);
			break;

		case EXPR_NAMES:
			if (ex->u.names){
				debugf("%sEXPR_NAMES:", tab);
				for (int i = 0; i < ex->u.names->size; i++){
					list_byte b = ex->u.names->ptrs[i];
					debugf("%s  \"%.*s\"", tab, b->size, b->bytes);
				}
			}
			else
				debugf("%sEXPR_NAMES NULL", tab);
			break;

		case EXPR_VAR:
			debugf("%sEXPR_VAR", tab);
			break;

		case EXPR_PAREN:
			if (ex->u.ex){
				debugf("%sEXPR_PAREN:", tab);
				expr_print(ex->u.ex, depth + 1);
			}
			else
				debugf("%sEXPR_PAREN NULL", tab);
			break;

		case EXPR_GROUP:
			if (ex->u.group){
				debugf("%sEXPR_GROUP:", tab);
				for (int i = 0; i < ex->u.group->size; i++)
					expr_print(ex->u.group->ptrs[i], depth + 1);
			}
			else
				debugf("%sEXPR_GROUP NULL", tab);
			break;

		case EXPR_PREFIX:
			if (ex->u.prefix.ex){
				debugf("%sEXPR_PREFIX %s:", tab, ks_name(ex->u.prefix.k));
				expr_print(ex->u.prefix.ex, depth + 1);
			}
			else
				debugf("%sEXPR_PREFIX %s NULL", tab, ks_name(ex->u.prefix.k));
			break;

		case EXPR_INFIX:
			debugf("%sEXPR_INFIX:", tab);
			if (ex->u.infix.left)
				expr_print(ex->u.infix.left, depth + 1);
			else
				debugf("%s  NULL", tab);
			debugf("%s->%s", tab, ks_name(ex->u.infix.k));
			if (ex->u.infix.right)
				expr_print(ex->u.infix.right, depth + 1);
			else
				debugf("%s  NULL", tab);
			break;

		case EXPR_CALL:
			debugf("%sEXPR_CALL:", tab);
			if (ex->u.call.cmd)
				expr_print(ex->u.call.cmd, depth + 1);
			else
				debugf("%s  NULL", tab);
			debugf("%s->", tab);
			if (ex->u.call.params)
				expr_print(ex->u.call.params, depth + 1);
			else
				debugf("%s  NULL", tab);
			break;

		case EXPR_INDEX:
			debugf("%sEXPR_INDEX:", tab);
			if (ex->u.index.obj)
				expr_print(ex->u.index.obj, depth + 1);
			else
				debugf("%s  NULL", tab);
			debugf("%s->", tab);
			if (ex->u.index.key)
				expr_print(ex->u.index.key, depth + 1);
			else
				debugf("%s  NULL", tab);
			break;

		case EXPR_SLICE:
			debugf("%sEXPR_SLICE:", tab);
			if (ex->u.slice.obj)
				expr_print(ex->u.slice.obj, depth + 1);
			else
				debugf("%s  NULL", tab);
			debugf("%s->", tab);
			if (ex->u.slice.start)
				expr_print(ex->u.slice.start, depth + 1);
			else
				debugf("%s  NULL", tab);
			debugf("%s->", tab);
			if (ex->u.slice.len)
				expr_print(ex->u.slice.len, depth + 1);
			else
				debugf("%s  NULL", tab);
			break;
	}
	mem_free(tab);
	#endif
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
	if (left->type == EXPR_GROUP){
		list_ptr_append(g, left->u.group);
		left->u.group->size = 0;
		expr_free(left);
	}
	else
		list_ptr_push(g, left);
	if (right->type == EXPR_GROUP){
		list_ptr_append(g, right->u.group);
		right->u.group->size = 0;
		expr_free(right);
	}
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
	DECL_LOCAL,
	DECL_NATIVE
} decl_enum;

typedef struct {
	decl_enum type;
	list_ptr names;
	list_byte key;
} decl_st, *decl;

static inline void decl_free(decl dc){
	if (dc->names)
		list_ptr_free(dc->names);
	if (dc->key)
		list_byte_free(dc->key);
	mem_free(dc);
}

static inline decl decl_local(list_ptr names){
	decl dc = mem_alloc(sizeof(decl_st));
	dc->type = DECL_LOCAL;
	dc->names = names;
	dc->key = NULL;
	return dc;
}

static inline decl decl_native(list_ptr names, list_byte key){
	decl dc = mem_alloc(sizeof(decl_st));
	dc->type = DECL_NATIVE;
	dc->names = names;
	dc->key = key;
	return dc;
}

typedef enum {
	AST_BREAK,
	AST_CONTINUE,
	AST_DECLARE,
	AST_DEF1,
	AST_DEF2,
	AST_DOWHILE1,
	AST_DOWHILE2,
	AST_DOWHILE3,
	AST_FOR1,
	AST_FOR2,
	AST_LOOP1,
	AST_LOOP2,
	AST_GOTO,
	AST_IF1,
	AST_IF2,
	AST_IF3,
	AST_IF4,
	AST_INCLUDE,
	AST_NAMESPACE1,
	AST_NAMESPACE2,
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
		struct {
			decl dc;
		} declare;
		struct {
			list_ptr names;
			list_ptr lvalues;
		} def1;
		struct {
			expr cond;
		} dowhile2;
		struct {
			list_ptr names1;
			list_ptr names2;
			expr ex;
			bool forVar;
		} for1;
		struct {
			list_byte ident;
		} agoto;
		struct {
			expr cond;
		} if2;
		struct {
			list_ptr incls;
		} include;
		struct {
			list_ptr names;
		} namespace1;
		struct {
			expr ex;
		} areturn;
		struct {
			list_ptr names;
		} using;
		struct {
			list_ptr lvalues;
		} var;
		struct {
			expr ex;
		} eval;
		struct {
			list_byte ident;
		} label;
	} u;
} ast_st, *ast;

static void ast_free(ast stmt){
	switch (stmt->type){
		case AST_BREAK:
		case AST_CONTINUE:
			break;

		case AST_DECLARE:
			if (stmt->u.declare.dc)
				decl_free(stmt->u.declare.dc);
			break;

		case AST_DEF1:
			if (stmt->u.def1.names)
				list_ptr_free(stmt->u.def1.names);
			if (stmt->u.def1.lvalues)
				list_ptr_free(stmt->u.def1.lvalues);
			break;

		case AST_DEF2:
			break;

		case AST_DOWHILE1:
			break;

		case AST_DOWHILE2:
			if (stmt->u.dowhile2.cond)
				expr_free(stmt->u.dowhile2.cond);
			break;

		case AST_DOWHILE3:
			break;

		case AST_FOR1:
			if (stmt->u.for1.names1)
				list_ptr_free(stmt->u.for1.names1);
			if (stmt->u.for1.names2)
				list_ptr_free(stmt->u.for1.names2);
			if (stmt->u.for1.ex)
				expr_free(stmt->u.for1.ex);
			break;

		case AST_FOR2:
		case AST_LOOP1:
		case AST_LOOP2:
			break;

		case AST_GOTO:
			if (stmt->u.agoto.ident)
				list_byte_free(stmt->u.agoto.ident);
			break;

		case AST_IF1:
			break;

		case AST_IF2:
			if (stmt->u.if2.cond)
				expr_free(stmt->u.if2.cond);
			break;

		case AST_IF3:
		case AST_IF4:
			break;

		case AST_INCLUDE:
			if (stmt->u.include.incls)
				list_ptr_free(stmt->u.include.incls);
			break;

		case AST_NAMESPACE1:
			if (stmt->u.namespace1.names)
				list_ptr_free(stmt->u.namespace1.names);
			break;

		case AST_NAMESPACE2:
			break;

		case AST_RETURN:
			if (stmt->u.areturn.ex)
				expr_free(stmt->u.areturn.ex);
			break;

		case AST_USING:
			if (stmt->u.using.names)
				list_ptr_free(stmt->u.using.names);
			break;

		case AST_VAR:
			if (stmt->u.var.lvalues)
				list_ptr_free(stmt->u.var.lvalues);
			break;

		case AST_EVAL:
			if (stmt->u.eval.ex)
				expr_free(stmt->u.eval.ex);
			break;

		case AST_LABEL:
			if (stmt->u.label.ident)
				list_byte_free(stmt->u.label.ident);
			break;
	}
	mem_free(stmt);
}

static void ast_print(ast stmt){
	#ifdef SINK_DEBUG
	switch (stmt->type){
		case AST_BREAK:
			debug("AST_BREAK");
			break;

		case AST_CONTINUE:
			debug("AST_CONTINUE");
			break;

		case AST_DECLARE:
			//if (stmt->u.declare.dc)
			debug("AST_DECLARE");
			break;

		case AST_DEF1:
			//if (stmt->u.def1.names)
			//if (stmt->u.def1.lvalues)
			debug("AST_DEF1");
			break;

		case AST_DEF2:
			debug("AST_DEF2");
			break;

		case AST_DOWHILE1:
			debug("AST_DOWHILE1");
			break;

		case AST_DOWHILE2:
			debug("AST_DOWHILE2:");
			if (stmt->u.dowhile2.cond)
				expr_print(stmt->u.dowhile2.cond, 1);
			else
				debug("  NULL");
			break;

		case AST_DOWHILE3:
			debug("AST_DOWHILE3");
			break;

		case AST_FOR1:
			//if (stmt->u.afor.names1)
			//if (stmt->u.afor.names2)
			debug("AST_FOR:");
			if (stmt->u.for1.ex)
				expr_print(stmt->u.for1.ex, 1);
			else
				debug("  NULL");
			break;

		case AST_FOR2:
			debug("AST_FOR2");
			break;

		case AST_LOOP1:
			debug("AST_LOOP1");
			break;

		case AST_LOOP2:
			debug("AST_LOOP2");
			break;

		case AST_GOTO:
			if (stmt->u.agoto.ident)
				debugf("AST_GOTO \"%.*s\"", stmt->u.agoto.ident->size, stmt->u.agoto.ident->bytes);
			else
				debug("AST_GOTO NULL");
			break;

		case AST_IF1:
			debug("AST_IF1");
			break;

		case AST_IF2:
			//if (stmt->u.aif.conds)
			debug("AST_IF2:");
			if (stmt->u.if2.cond)
				expr_print(stmt->u.if2.cond, 1);
			else
				debug("  NULL");
			break;

		case AST_IF3:
			debug("AST_IF3");
			break;

		case AST_IF4:
			debug("AST_IF4");
			break;

		case AST_INCLUDE:
			//if (stmt->u.include.incls)
			debug("AST_INCLUDE");
			break;

		case AST_NAMESPACE1:
			//if (stmt->u.namespace1.names)
			debug("AST_NAMESPACE1");
			break;

		case AST_NAMESPACE2:
			debug("AST_NAMESPACE2");
			break;

		case AST_RETURN:
			debug("AST_RETURN:");
			if (stmt->u.areturn.ex)
				expr_print(stmt->u.areturn.ex, 1);
			else
				debug("  NULL");
			break;

		case AST_USING:
			//if (stmt->u.using.names)
			debug("AST_USING");
			break;

		case AST_VAR:
			debug("AST_VAR:");
			if (stmt->u.var.lvalues){
				for (int i = 0 ;i < stmt->u.var.lvalues->size; i++)
					expr_print(stmt->u.var.lvalues->ptrs[i], 1);
			}
			else
				debug("  NULL");
			break;

		case AST_EVAL:
			debug("AST_EVAL:");
			if (stmt->u.eval.ex)
				expr_print(stmt->u.eval.ex, 1);
			else
				debug("  NULL");
			break;

		case AST_LABEL:
			if (stmt->u.label.ident)
				debugf("AST_LABEL \"%.*s\"", stmt->u.label.ident->size, stmt->u.label.ident->bytes);
			else
				debug("AST_LABEL NULL");
			break;
	}
	#endif
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

static inline ast ast_declare(filepos_st flp, decl dc){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DECLARE;
	stmt->u.declare.dc = dc;
	return stmt;
}

static inline ast ast_def1(filepos_st flp, list_ptr names, list_ptr lvalues){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DEF1;
	stmt->u.def1.names = names;
	stmt->u.def1.lvalues = lvalues;
	return stmt;
}

static inline ast ast_def2(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DEF2;
	return stmt;
}

static inline ast ast_dowhile1(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DOWHILE1;
	return stmt;
}

static inline ast ast_dowhile2(filepos_st flp, expr cond){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DOWHILE2;
	stmt->u.dowhile2.cond = cond;
	return stmt;
}

static inline ast ast_dowhile3(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_DOWHILE3;
	return stmt;
}

static inline ast ast_for1(filepos_st flp, bool forVar, list_ptr names1, list_ptr names2, expr ex){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_FOR1;
	stmt->u.for1.forVar = forVar;
	stmt->u.for1.names1 = names1;
	stmt->u.for1.names2 = names2;
	stmt->u.for1.ex = ex;
	return stmt;
}

static inline ast ast_for2(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_FOR2;
	return stmt;
}

static inline ast ast_loop1(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_LOOP1;
	return stmt;
}

static inline ast ast_loop2(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_LOOP2;
	return stmt;
}

static inline ast ast_goto(filepos_st flp, list_byte ident){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_GOTO;
	stmt->u.agoto.ident = ident;
	return stmt;
}

static inline ast ast_if1(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_IF1;
	return stmt;
}

static inline ast ast_if2(filepos_st flp, expr cond){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_IF2;
	stmt->u.if2.cond = cond;
	return stmt;
}

static inline ast ast_if3(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_IF3;
	return stmt;
}

static inline ast ast_if4(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_IF4;
	return stmt;
}

typedef struct {
	list_ptr names;
	list_byte file;
} incl_st, *incl;

static void incl_free(incl inc){
	if (inc->names)
		list_ptr_free(inc->names);
	if (inc->file)
		list_byte_free(inc->file);
	mem_free(inc);
}

static inline incl incl_new(list_ptr names, list_byte file){
	incl inc = mem_alloc(sizeof(incl_st));
	inc->names = names;
	inc->file = file;
	return inc;
}

static inline ast ast_include(filepos_st flp, list_ptr incls){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_INCLUDE;
	stmt->u.include.incls = incls;
	return stmt;
}

static inline ast ast_namespace1(filepos_st flp, list_ptr names){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_NAMESPACE1;
	stmt->u.namespace1.names = names;
	return stmt;
}

static inline ast ast_namespace2(filepos_st flp){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_NAMESPACE2;
	return stmt;
}

static inline ast ast_return(filepos_st flp, expr ex){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_RETURN;
	stmt->u.areturn.ex = ex;
	return stmt;
}

static inline ast ast_using(filepos_st flp, list_ptr names){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_USING;
	stmt->u.using.names = names;
	return stmt;
}

static inline ast ast_var(filepos_st flp, list_ptr lvalues){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_VAR;
	stmt->u.var.lvalues = lvalues;
	return stmt;
}

static inline ast ast_eval(filepos_st flp, expr ex){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_EVAL;
	stmt->u.eval.ex = ex;
	return stmt;
}

static inline ast ast_label(filepos_st flp, list_byte ident){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_LABEL;
	stmt->u.label.ident = ident;
	return stmt;
}

//
// parser state helpers
//

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
	PRS_STATEMENT,
	PRS_STATEMENT_END,
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
	PRS_DECLARE_LOOKUP,
	PRS_DECLARE_STR,
	PRS_DECLARE_STR2,
	PRS_DECLARE_STR3,
	PRS_DEF,
	PRS_DEF_LOOKUP,
	PRS_DEF_LVALUES,
	PRS_DEF_BODY,
	PRS_DO,
	PRS_DO_BODY,
	PRS_DO_WHILE_EXPR,
	PRS_DO_WHILE_BODY,
	PRS_FOR,
	PRS_LOOP_BODY,
	PRS_FOR_VARS,
	PRS_FOR_VARS_LOOKUP,
	PRS_FOR_VARS2,
	PRS_FOR_VARS2_LOOKUP,
	PRS_FOR_VARS_DONE,
	PRS_FOR_EXPR,
	PRS_FOR_BODY,
	PRS_GOTO,
	PRS_IF,
	PRS_IF2,
	PRS_IF_EXPR,
	PRS_IF_BODY,
	PRS_ELSE_BODY,
	PRS_INCLUDE,
	PRS_INCLUDE_LOOKUP,
	PRS_INCLUDE_STR,
	PRS_INCLUDE_STR2,
	PRS_INCLUDE_STR3,
	PRS_NAMESPACE,
	PRS_NAMESPACE_LOOKUP,
	PRS_NAMESPACE_BODY,
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
	list_ptr incls;
	prs next;
};

static void prs_free(prs pr){
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
	if (pr->incls)
		list_ptr_free(pr->incls);
	mem_free(pr);
}

static prs prs_new(prs_enum state, prs next){
	prs pr = mem_alloc(sizeof(prs_st));
	pr->state = state;
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
	pr->incls = NULL;                // list of incl's
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
	if (pr->tk1)
		tok_free(pr->tk1);
	if (pr->tk2)
		tok_free(pr->tk2);
	if (pr->tkR)
		tok_free(pr->tkR);
	mem_free(pr);
}

static inline parser parser_new(){
	parser pr = mem_alloc(sizeof(parser_st));
	pr->state = prs_new(PRS_STATEMENT, NULL);
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
	PRR_ERROR
} prr_enum;

typedef struct {
	prr_enum type;
	char *msg;
} prr_st;

static inline prr_st prr_more(){
	return (prr_st){ .type = PRR_MORE };
}

static inline prr_st prr_error(char *msg){
	return (prr_st){ .type = PRR_ERROR, .msg = msg };
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
		return pri_error(sink_format("Invalid pipe"));
	}
	return pri_ok(expr_infix(flp, k, left, right));
}

static inline prr_st parser_start(parser pr, prs_enum state){
	pr->level++;
	pr->state->state = state;
	return prr_more();
}

static prr_st parser_process(parser pr, filepos_st flp, list_ptr stmts);

static inline prr_st parser_statement(parser pr, filepos_st flp, list_ptr stmts, bool more){
	pr->level--;
	pr->state->state = PRS_STATEMENT_END;
	return more ? prr_more() : parser_process(pr, flp, stmts);
}

static inline prr_st parser_lookup(parser pr, prs_enum retstate){
	pr->state->state = retstate;
	parser_push(pr, PRS_LOOKUP);
	pr->state->names = list_ptr_new((free_func)list_byte_free);
	list_ptr_push(pr->state->names, pr->tk1->u.ident);
	pr->tk1->u.ident = NULL;
	return prr_more();
}

static prr_st parser_process(parser pr, filepos_st flp, list_ptr stmts){
	tok tk1 = pr->tk1;
	prs st = pr->state;
	ast stmt;
	switch (st->state){
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
			else if (tk1->type == TOK_IDENT)
				return parser_lookup(pr, PRS_IDENTS);
			else if (tok_isPre(tk1) || tok_isTerm(tk1)){
				pr->level++;
				st->state = PRS_EVAL;
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isMidStmt(tk1)){
				if (st->next == NULL)
					return prr_error(sink_format("Invalid statement"));
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
			}
			return prr_error(sink_format("Invalid statement"));

		case PRS_STATEMENT_END:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(sink_format("Missing newline or semicolon"));
			st->state = PRS_STATEMENT;
			return prr_more();

		case PRS_LOOKUP:
			if (!tok_isKS(tk1, KS_PERIOD)){
				st->next->names = st->names;
				st->names = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
			}
			st->state = PRS_LOOKUP_IDENT;
			return prr_more();

		case PRS_LOOKUP_IDENT:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			list_ptr_push(st->names, tk1->u.ident);
			tk1->u.ident = NULL;
			st->state = PRS_LOOKUP;
			return prr_more();

		case PRS_BODY:
			st->state = PRS_BODY_STATEMENT;
			parser_push(pr, PRS_STATEMENT);
			return parser_process(pr, flp, stmts);

		case PRS_BODY_STATEMENT:
			if (tok_isMidStmt(tk1)){
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
			}
			parser_push(pr, PRS_STATEMENT);
			return prr_more();

		case PRS_LVALUES:
			if (tk1->type == TOK_NEWLINE){
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
			}
			st->state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr->state->lvaluesPeriods = st->lvaluesPeriods;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM:
			if (tk1->type == TOK_IDENT)
				return parser_lookup(pr, PRS_LVALUES_TERM_LOOKUP);
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
			return prr_error(sink_format("Expecting variable"));

		case PRS_LVALUES_TERM_LOOKUP:
			st->next->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp, stmts);

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
			return parser_process(pr, flp, stmts);

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
			return prr_error(sink_format("Invalid list"));

		case PRS_LVALUES_TERM_LIST_TAIL:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_LVALUES_TERM_LIST_TAIL_LOOKUP);

		case PRS_LVALUES_TERM_LIST_TAIL_LOOKUP:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_LVALUES_TERM_LIST_TAIL_DONE;
			if (tok_isKS(tk1, KS_COMMA))
				return prr_more();
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST_TAIL_DONE:
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error(sink_format("Missing end of list"));
			st->next->exprTerm = expr_prefix(flp, KS_PERIOD3, expr_names(flp, st->names));
			st->names = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_LIST_DONE:
			st->next->exprTerm = expr_list(flp, st->exprTerm);
			st->exprTerm = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM_DONE:
			if (tk1->type == TOK_NEWLINE){
				list_ptr_push(st->lvalues, expr_infix(flp, KS_EQU, st->exprTerm, NULL));
				st->exprTerm = NULL;
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
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
			return prr_error(sink_format("Invalid declaration"));

		case PRS_LVALUES_TERM_EXPR:
			list_ptr_push(st->lvalues, expr_infix(flp, KS_EQU, st->exprTerm2, st->exprTerm));
			st->exprTerm2 = NULL;
			st->exprTerm = NULL;
			if (tk1->type == TOK_NEWLINE){
				st->next->lvalues = st->lvalues;
				st->lvalues = NULL;
				pr->state = st->next;
				prs_free(st);
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_LVALUES_MORE;
				return prr_more();
			}
			return prr_error(sink_format("Invalid declaration"));

		case PRS_LVALUES_MORE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_LVALUES_TERM_DONE;
			parser_push(pr, PRS_LVALUES_TERM);
			pr->state->lvaluesPeriods = st->lvaluesPeriods;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_DEF_TAIL:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_LVALUES_DEF_TAIL_DONE);

		case PRS_LVALUES_DEF_TAIL_DONE:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(sink_format("Missing newline or semicolon"));
			st->next->names = st->names;
			st->names = NULL;
			pr->state = st->next;
			prs_free(st);
			st = pr->state;
			list_ptr_push(st->lvalues, expr_prefix(flp, KS_PERIOD3, expr_names(flp, st->names)));
			st->names = NULL;
			st->next->lvalues = st->lvalues;
			st->lvalues = NULL;
			pr->state = st->next;
			prs_free(st);
			return parser_process(pr, flp, stmts);

		case PRS_BREAK:
			list_ptr_push(stmts, ast_break(flp));
			return parser_statement(pr, flp, stmts, false);

		case PRS_CONTINUE:
			list_ptr_push(stmts, ast_continue(flp));
			return parser_statement(pr, flp, stmts, false);

		case PRS_DECLARE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_DECLARE_LOOKUP);

		case PRS_DECLARE_LOOKUP:
			if (tok_isKS(tk1, KS_LPAREN)){
				st->state = PRS_DECLARE_STR;
				return prr_more();
			}
			list_ptr_push(stmts, ast_declare(flp, decl_local(st->names)));
			st->names = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_DECLARE;
				return prr_more();
			}
			return parser_statement(pr, flp, stmts, false);

		case PRS_DECLARE_STR:
			if (tk1->type != TOK_STR)
				return prr_error(sink_format("Expecting string constant"));
			list_ptr_push(stmts, ast_declare(flp, decl_native(st->names, tk1->u.str)));
			st->names = NULL;
			tk1->u.str = NULL;
			st->state = PRS_DECLARE_STR2;
			return prr_more();

		case PRS_DECLARE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(sink_format("Expecting string constant"));
			st->state = PRS_DECLARE_STR3;
			return prr_more();

		case PRS_DECLARE_STR3:
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_DECLARE;
				return prr_more();
			}
			return parser_statement(pr, flp, stmts, false);

		case PRS_DEF:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_DEF_LOOKUP);

		case PRS_DEF_LOOKUP:
			st->state = PRS_DEF_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr->state->lvalues = list_ptr_new((free_func)expr_free);
			pr->state->lvaluesPeriods = 1;
			return parser_process(pr, flp, stmts);

		case PRS_DEF_LVALUES:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(sink_format("Missing newline or semicolon"));
			list_ptr_push(stmts, ast_def1(flp, st->names, st->lvalues));
			st->names = NULL;
			st->lvalues = NULL;
			st->state = PRS_DEF_BODY;
			parser_push(pr, PRS_BODY);
			return prr_more();

		case PRS_DEF_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of def block"));
			list_ptr_push(stmts, ast_def2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_DO:
			list_ptr_push(stmts, ast_dowhile1(flp));
			st->state = PRS_DO_BODY;
			parser_push(pr, PRS_BODY);
			return parser_process(pr, flp, stmts);

		case PRS_DO_BODY:
			if (tok_isKS(tk1, KS_WHILE)){
				st->state = PRS_DO_WHILE_EXPR;
				parser_push(pr, PRS_EXPR);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				list_ptr_push(stmts, ast_dowhile2(flp, NULL));
				list_ptr_push(stmts, ast_dowhile3(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error(sink_format("Missing `while` or `end` of do block"));

		case PRS_DO_WHILE_EXPR:
			list_ptr_push(stmts, ast_dowhile2(flp, st->exprTerm));
			st->exprTerm = NULL;
			if (tk1->type == TOK_NEWLINE){
				st->state = PRS_DO_WHILE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				list_ptr_push(stmts, ast_dowhile3(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error(sink_format("Missing newline or semicolon"));

		case PRS_DO_WHILE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of do-while block"));
			list_ptr_push(stmts, ast_dowhile3(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_FOR:
			if (tk1->type == TOK_NEWLINE){
				list_ptr_push(stmts, ast_loop1(flp));
				st->state = PRS_LOOP_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			st->state = PRS_FOR_VARS;
			if (tok_isKS(tk1, KS_VAR)){
				st->forVar = true;
				return prr_more();
			}
			return parser_process(pr, flp, stmts);

		case PRS_LOOP_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of for block"));
			list_ptr_push(stmts, ast_loop2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_FOR_VARS:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_FOR_VARS_LOOKUP);

		case PRS_FOR_VARS_LOOKUP:
			st->names2 = st->names;
			st->names = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_FOR_VARS2;
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_COLON)){
				st->state = PRS_FOR_VARS_DONE;
				return prr_more();
			}
			return prr_error(sink_format("Invalid for loop"));

		case PRS_FOR_VARS2:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_FOR_VARS2_LOOKUP);

		case PRS_FOR_VARS2_LOOKUP:
			if (!tok_isKS(tk1, KS_COLON))
				return prr_error(sink_format("Expecting `:`"));
			st->state = PRS_FOR_VARS_DONE;
			return prr_more();

		case PRS_FOR_VARS_DONE:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(sink_format("Expecting expression in for statement"));
			st->state = PRS_FOR_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_FOR_EXPR:
			list_ptr_push(stmts, ast_for1(flp, st->forVar, st->names2, st->names, st->exprTerm));
			st->names2 = NULL;
			st->names = NULL;
			st->exprTerm = NULL;
			if (tk1->type == TOK_NEWLINE){
				st->state = PRS_FOR_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				list_ptr_push(stmts, ast_for2(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error(sink_format("Missing newline or semicolon"));

		case PRS_FOR_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of for block"));
			list_ptr_push(stmts, ast_for2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_GOTO:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			list_ptr_push(stmts, ast_goto(flp, tk1->u.ident));
			tk1->u.ident = NULL;
			return parser_statement(pr, flp, stmts, true);

		case PRS_IF:
			list_ptr_push(stmts, ast_if1(flp));
			st->state = PRS_IF2;
			return parser_process(pr, flp, stmts);

		case PRS_IF2:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(sink_format("Missing conditional expression"));
			st->state = PRS_IF_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_IF_EXPR:
			list_ptr_push(stmts, ast_if2(flp, st->exprTerm));
			st->exprTerm = NULL;
			if (tk1->type == TOK_NEWLINE){
				st->state = PRS_IF_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_ELSEIF)){
				st->state = PRS_IF2;
				return prr_more();
			}
			list_ptr_push(stmts, ast_if3(flp));
			if (tok_isKS(tk1, KS_ELSE)){
				st->state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				list_ptr_push(stmts, ast_if4(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error(sink_format("Missing newline or semicolon"));

		case PRS_IF_BODY:
			if (tok_isKS(tk1, KS_ELSEIF)){
				st->state = PRS_IF2;
				return prr_more();
			}
			list_ptr_push(stmts, ast_if3(flp));
			if (tok_isKS(tk1, KS_ELSE)){
				st->state = PRS_ELSE_BODY;
				parser_push(pr, PRS_BODY);
				return prr_more();
			}
			else if (tok_isKS(tk1, KS_END)){
				list_ptr_push(stmts, ast_if4(flp));
				return parser_statement(pr, flp, stmts, true);
			}
			return prr_error(sink_format("Missing `elseif`, `else`, or `end` of if block"));

		case PRS_ELSE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of if block"));
			list_ptr_push(stmts, ast_if4(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_INCLUDE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			else if (tk1->type == TOK_IDENT)
				return parser_lookup(pr, PRS_INCLUDE_LOOKUP);
			else if (tok_isKS(tk1, KS_LPAREN)){
				st->state = PRS_INCLUDE_STR;
				return prr_more();
			}
			return prr_error(sink_format("Expecting file as constant string literal"));

		case PRS_INCLUDE_LOOKUP:
			if (!tok_isKS(tk1, KS_LPAREN))
				return prr_error(sink_format("Expecting file as constant string literal"));
			st->state = PRS_INCLUDE_STR;
			return prr_more();

		case PRS_INCLUDE_STR:
			if (tk1->type != TOK_STR)
				return prr_error(sink_format("Expecting file as constant string literal"));
			st->str = tk1->u.str;
			tk1->u.str = NULL;
			st->state = PRS_INCLUDE_STR2;
			return prr_more();

		case PRS_INCLUDE_STR2:
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(sink_format("Expecting file as constant string literal"));
			st->state = PRS_INCLUDE_STR3;
			return prr_more();

		case PRS_INCLUDE_STR3:
			if (st->incls == NULL)
				st->incls = list_ptr_new((free_func)incl_free);
			list_byte_push(st->str, 0); // NULL-terminate the filename
			list_ptr_push(st->incls, incl_new(st->names, st->str));
			st->names = NULL;
			st->str = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_INCLUDE;
				return prr_more();
			}
			list_ptr_push(stmts, ast_include(flp, st->incls));
			st->incls = NULL;
			return parser_statement(pr, flp, stmts, false);

		case PRS_NAMESPACE:
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_NAMESPACE_LOOKUP);

		case PRS_NAMESPACE_LOOKUP:
			if (tk1->type != TOK_NEWLINE)
				return prr_error(sink_format("Missing newline or semicolon"));
			list_ptr_push(stmts, ast_namespace1(flp, st->names));
			st->names = NULL;
			st->state = PRS_NAMESPACE_BODY;
			parser_push(pr, PRS_BODY);
			return prr_more();

		case PRS_NAMESPACE_BODY:
			if (!tok_isKS(tk1, KS_END))
				return prr_error(sink_format("Missing `end` of namespace block"));
			list_ptr_push(stmts, ast_namespace2(flp));
			return parser_statement(pr, flp, stmts, true);

		case PRS_RETURN:
			if (tk1->type == TOK_NEWLINE){
				list_ptr_push(stmts, ast_return(flp, expr_nil(flp)));
				return parser_statement(pr, flp, stmts, false);
			}
			st->state = PRS_RETURN_DONE;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_RETURN_DONE:
			list_ptr_push(stmts, ast_return(flp, st->exprTerm));
			st->exprTerm = NULL;
			return parser_statement(pr, flp, stmts, false);

		case PRS_USING:
			if (tk1->type == TOK_NEWLINE)
				return prr_error(sink_format("Expecting identifier"));
			st->state = PRS_USING2;
			return parser_process(pr, flp, stmts);

		case PRS_USING2:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tk1->type != TOK_IDENT)
				return prr_error(sink_format("Expecting identifier"));
			return parser_lookup(pr, PRS_USING_LOOKUP);

		case PRS_USING_LOOKUP:
			list_ptr_push(stmts, ast_using(flp, st->names));
			st->names = NULL;
			if (tok_isKS(tk1, KS_COMMA)){
				st->state = PRS_USING2;
				return prr_more();
			}
			return parser_statement(pr, flp, stmts, false);

		case PRS_VAR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_VAR_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr->state->lvalues = list_ptr_new((free_func)expr_free);
			return parser_process(pr, flp, stmts);

		case PRS_VAR_LVALUES:
			if (st->lvalues->size <= 0)
				return prr_error(sink_format("Invalid variable declaration"));
			list_ptr_push(stmts, ast_var(flp, st->lvalues));
			st->lvalues = NULL;
			return parser_statement(pr, flp, stmts, false);

		case PRS_IDENTS:
			if (st->names->size == 1 && tok_isKS(tk1, KS_COLON)){
				list_ptr_push(stmts, ast_label(flp, list_ptr_pop(st->names)));
				list_ptr_free(st->names);
				st->names = NULL;
				st->state = PRS_STATEMENT;
				return prr_more();
			}
			pr->level++;
			st->state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR_POST);
			pr->state->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			return parser_process(pr, flp, stmts);

		case PRS_EVAL:
			st->state = PRS_EVAL_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EVAL_EXPR:
			list_ptr_push(stmts, ast_eval(flp, st->exprTerm));
			st->exprTerm = NULL;
			return parser_statement(pr, flp, stmts, false);

		case PRS_EXPR:
			if (tok_isPre(tk1)){
				st->exprPreStack = ets_new(tk1, st->exprPreStack);
				pr->tk1 = NULL;
				return prr_more();
			}
			st->state = PRS_EXPR_TERM;
			return parser_process(pr, flp, stmts);

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
			else if (tk1->type == TOK_IDENT)
				return parser_lookup(pr, PRS_EXPR_TERM_LOOKUP);
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
			return prr_error(sink_format("Invalid expression"));

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
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_TERM_CLOSEBRACE:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACE))
				return prr_error(sink_format("Expecting close brace"));
			st->exprTerm = expr_list(flp, st->exprTerm);
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_CLOSEPAREN:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RPAREN))
				return prr_error(sink_format("Expecting close parenthesis"));
			st->exprTerm = expr_paren(flp, st->exprTerm);
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_TERM_LOOKUP:
			st->exprTerm = expr_names(flp, st->names);
			st->names = NULL;
			st->state = PRS_EXPR_POST;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_POST:
			if (tk1->type == TOK_NEWLINE ||
				tok_isKS(tk1, KS_END) || tok_isKS(tk1, KS_ELSE) || tok_isKS(tk1, KS_ELSEIF)){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
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
				return parser_process(pr, flp, stmts);
			}
			else if (tok_isKS(tk1, KS_RBRACE) || tok_isKS(tk1, KS_RBRACKET) ||
				tok_isKS(tk1, KS_RPAREN) || tok_isKS(tk1, KS_COLON) || tok_isKS(tk1, KS_COMMA) ||
				tok_isKS(tk1, KS_PIPE)){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
			}
			// otherwise, this should be a call
			st->exprTerm2 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_POST_CALL;
			parser_push(pr, PRS_EXPR);
			pr->state->exprAllowPipe = false;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_POST_CALL:
			st->exprTerm = expr_call(flp, st->exprTerm2, st->exprTerm);
			st->exprTerm2 = NULL;
			st->state = PRS_EXPR_POST;
			return parser_process(pr, flp, stmts);

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
			return parser_process(pr, flp, stmts);

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
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_COLON_EXPR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error(sink_format("Missing close bracket"));
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
				return prr_error(sink_format("Missing close bracket"));
			st->exprTerm = expr_index(flp, st->exprTerm2, st->exprTerm);
			st->exprTerm2 = NULL;
			st->state = PRS_EXPR_POST;
			return prr_more();

		case PRS_EXPR_INDEX_EXPR_COLON_CHECK:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (tok_isKS(tk1, KS_RBRACKET)){
				st->exprTerm = expr_slice(flp, st->exprTerm2, st->exprTerm, NULL);
				st->exprTerm2 = NULL;
				st->state = PRS_EXPR_POST;
				return prr_more();
			}
			st->exprTerm3 = st->exprTerm;
			st->exprTerm = NULL;
			st->state = PRS_EXPR_INDEX_EXPR_COLON_EXPR;
			parser_push(pr, PRS_EXPR);
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_INDEX_EXPR_COLON_EXPR:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			if (!tok_isKS(tk1, KS_RBRACKET))
				return prr_error(sink_format("Missing close bracket"));
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
				parser_process(pr, flp, stmts);
				parser_fwd(pr, pr->tkR);
				return parser_process(pr, flp, stmts);
			}
			// found a trailing comma
			st->state = PRS_EXPR_FINISH;
			return parser_process(pr, flp, stmts);

		case PRS_EXPR_MID:
			if (!tok_isMid(tk1, st->exprAllowComma, st->exprAllowPipe)){
				st->state = PRS_EXPR_FINISH;
				return parser_process(pr, flp, stmts);
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
			return parser_process(pr, flp, stmts);
	}
}

static inline prr_st parser_add(parser pr, tok tk, filepos_st flp, list_ptr stmts){
	parser_fwd(pr, tk);
	return parser_process(pr, flp, stmts);
}

static inline prr_st parser_close(parser pr){
	if (pr->state->next != NULL)
		return prr_error(sink_format("Invalid end of file"));
	return prr_more();
}

//
// labels
//

typedef struct {
	list_byte name;
	int_fast32_t pos;
	list_int rewrites;
} label_st, *label;

static inline void label_free(label lbl){
	list_byte_free(lbl->name);
	list_int_free(lbl->rewrites);
	mem_free(lbl);
}

static inline label label_new(list_byte name){
	label lbl = mem_alloc(sizeof(label_st));
	lbl->name = name;
	lbl->pos = -1;
	lbl->rewrites = list_int_new();
	return lbl;
}

static inline label label_newStr(const char *str){
	return label_new(list_byte_newStr(str));
}

static void label_refresh(label lbl, list_byte ops, int start){
	for (int i = start; i < lbl->rewrites->size; i++){
		int_fast32_t index = lbl->rewrites->vals[i];
		ops->bytes[index + 0] = lbl->pos % 256;
		ops->bytes[index + 1] = (lbl->pos >> 8) % 256;
		ops->bytes[index + 2] = (lbl->pos >> 16) % 256;
		ops->bytes[index + 3] = (lbl->pos >> 24) % 256;
	}
}

static inline void label_jump(label lbl, list_byte ops){
	op_jump(ops, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_jumpTrue(label lbl, list_byte ops, varloc_st src){
	op_jumpTrue(ops, src, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_jumpFalse(label lbl, list_byte ops, varloc_st src){
	op_jumpFalse(ops, src, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_call(label lbl, list_byte ops, varloc_st ret, varloc_st arg, int level){
	op_call(ops, ret, arg, level, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_returntail(label lbl, list_byte ops, varloc_st arg){
	op_returntail(ops, arg, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_declare(label lbl, list_byte ops){
	debugf("%.*s:", lbl->name->size, lbl->name->bytes);
	lbl->pos = ops->size;
	label_refresh(lbl, ops, 0);
}

//
// symbol table
//

typedef enum {
	FVR_VAR,
	FVR_TEMP_INUSE,
	FVR_TEMP_AVAIL
} frame_enum;

typedef struct frame_struct frame_st, *frame;
struct frame_struct {
	list_int vars;
	list_ptr lbls;
	frame parent;
};

static inline void frame_free(frame fr){
	list_int_free(fr->vars);
	list_ptr_free(fr->lbls);
	mem_free(fr);
}

static void frame_print(frame fr){
	#ifdef SINK_DEBUG
	debug("FRAME:");
	for (int i = 0; i < fr->vars->size; i++){
		debugf("  %d. %s", i, fr->vars->vals[i] == FVR_VAR ? "VAR" :
			(fr->vars->vals[i] == FVR_TEMP_INUSE ? "TMP (Used)" : "TMP (Avlb)"));
	}
	if (fr->lbls->size > 0){
		debug("  -> LABELS:");
		for (int i = 0; i < fr->lbls->size; i++){
			list_byte b = ((label)fr->lbls->ptrs[i])->name;
			debugf("  %.*s", b->size, b->bytes);
		}
	}
	#endif
}

static inline frame frame_new(frame parent){
	frame fr = mem_alloc(sizeof(frame_st));
	fr->vars = list_int_new();
	if (parent) // frames with parents have a reserved argument
		list_int_push(fr->vars, FVR_VAR);
	fr->lbls = list_ptr_new((free_func)label_free);
	fr->parent = parent;
	return fr;
}

static inline int frame_diff(frame parent, frame child){
	int fdiff = 0;
	while (child != parent && child != NULL){
		child = child->parent;
		fdiff++;
	}
	if (child == NULL)
		return -1;
	return fdiff;
}

typedef struct namespace_struct namespace_st, *namespace;
static inline void namespace_free(namespace ns);

typedef enum {
	NSN_VAR,
	NSN_CMD_LOCAL,
	NSN_CMD_NATIVE,
	NSN_CMD_OPCODE,
	NSN_NAMESPACE
} nsname_enum;

typedef struct {
	list_byte name;
	nsname_enum type;
	union {
		struct {
			frame fr; // not freed by nsname_free
			int index;
		} var;
		struct {
			frame fr; // not freed by nsname_free
			label lbl; // not feed by nsname_free
		} cmdLocal;
		int index;
		struct {
			op_enum opcode;
			int params;
		} cmdOpcode;
		namespace ns;
	} u;
} nsname_st, *nsname;

static void nsname_free(nsname nsn){
	list_byte_free(nsn->name);
	switch (nsn->type){
		case NSN_VAR:
			break;
		case NSN_CMD_LOCAL:
			break;
		case NSN_CMD_NATIVE:
			break;
		case NSN_CMD_OPCODE:
			break;
		case NSN_NAMESPACE:
			if (nsn->u.ns)
				namespace_free(nsn->u.ns);
			break;
	}
	mem_free(nsn);
}

static void nsname_print(nsname nsn){
	#ifdef SINK_DEBUG
	switch (nsn->type){
		case NSN_VAR:
			debugf("%.*s NSN_VAR %d", nsn->name->size, nsn->name->bytes, nsn->u.var.index);
			break;
		case NSN_CMD_LOCAL:
			debugf("%.*s NSN_CMD_LOCAL", nsn->name->size, nsn->name->bytes);
			break;
		case NSN_CMD_NATIVE:
			debugf("%.*s NSN_CMD_NATIVE", nsn->name->size, nsn->name->bytes);
			break;
		case NSN_CMD_OPCODE:
			debugf("%.*s NSN_CMD_OPCODE 0x%02X", nsn->name->size, nsn->name->bytes,
				nsn->u.cmdOpcode.opcode);
			break;
		case NSN_NAMESPACE:
			debugf("%.*s NSN_NAMESPACE", nsn->name->size, nsn->name->bytes);
			break;
	}
	#endif
}

static inline nsname nsname_var(list_byte name, frame fr, int index){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newCopy(name);
	nsn->type = NSN_VAR;
	nsn->u.var.fr = fr;
	nsn->u.var.index = index;
	return nsn;
}

static inline nsname nsname_cmdLocal(list_byte name, frame fr, label lbl){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newCopy(name);
	nsn->type = NSN_CMD_LOCAL;
	nsn->u.cmdLocal.fr = fr;
	nsn->u.cmdLocal.lbl = lbl;
	return nsn;
}

static inline nsname nsname_cmdNative(list_byte name, int index){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newCopy(name);
	nsn->type = NSN_CMD_NATIVE;
	nsn->u.index = index;
	return nsn;
}

static inline nsname nsname_cmdOpcode(list_byte name, op_enum opcode, int params){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = name; // don't copy because the only caller gives `name` to nsn
	nsn->type = NSN_CMD_OPCODE;
	nsn->u.cmdOpcode.opcode = opcode;
	nsn->u.cmdOpcode.params = params;
	return nsn;
}

static inline nsname nsname_namespace(list_byte name, namespace ns){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newCopy(name);
	nsn->type = NSN_NAMESPACE;
	nsn->u.ns = ns;
	return nsn;
}

struct namespace_struct {
	frame fr; // not freed by namespace_free
	list_ptr usings; // namespace entries not feed by namespace_free
	list_ptr names;
};

static inline void namespace_free(namespace ns){
	list_ptr_free(ns->usings);
	list_ptr_free(ns->names);
	mem_free(ns);
}

static void namespace_print(namespace ns){
	#ifdef SINK_DEBUG
	debug("NAMESPACE:");
	for (int i = 0; i < ns->names->size; i++)
		nsname_print(ns->names->ptrs[i]);
	#endif
}

static inline namespace namespace_new(frame fr){
	namespace ns = mem_alloc(sizeof(namespace_st));
	ns->fr = fr;
	ns->usings = list_ptr_new(NULL);
	ns->names = list_ptr_new((free_func)nsname_free);
	return ns;
}

typedef enum {
	NL_FOUND,
	NL_NOTFOUND
} nl_enum;

typedef struct {
	nl_enum type;
	nsname nsn;
} nl_st;

static inline nl_st nl_found(nsname nsn){
	return (nl_st){ .type = NL_FOUND, .nsn = nsn };
}

static inline nl_st nl_notfound(){
	return (nl_st){ .type = NL_NOTFOUND };
}

static nl_st namespace_lookup(namespace ns, list_ptr names, int start, list_ptr tried);

static nl_st namespace_lookupLevel(namespace ns, list_ptr names, int start, list_ptr tried){
	for (int nsni = 0; nsni < ns->names->size; nsni++){
		nsname nsn = ns->names->ptrs[nsni];
		if (list_byte_equ(nsn->name, names->ptrs[start])){
			if (start == names->size - 1) // if we're at the end of names, then report the find
				return nl_found(nsn);
			// otherwise, we need to traverse
			if (nsn->type == NSN_NAMESPACE)
				return namespace_lookup(nsn->u.ns, names, start + 1, tried);
			return nl_notfound();
		}
	}
	return nl_notfound();
}

static void namespace_getSiblings(namespace ns, list_ptr res, list_ptr tried){
	if (list_ptr_has(res, ns))
		return;
	list_ptr_push(res, ns);
	for (int i = 0; i < ns->usings->size; i++){
		namespace uns = ns->usings->ptrs[i];
		if (list_ptr_has(tried, uns))
			continue;
		namespace_getSiblings(uns, res, tried);
	}
}

static nl_st namespace_lookup(namespace ns, list_ptr names, int start, list_ptr tried){
	if (list_ptr_has(tried, ns))
		return nl_notfound();
	list_ptr_push(tried, ns);

	list_ptr allns = list_ptr_new(NULL);
	namespace_getSiblings(ns, allns, tried);
	for (int i = 0; i < allns->size; i++){
		namespace hns = allns->ptrs[i];
		nl_st n = namespace_lookupLevel(hns, names, start, tried);
		if (n.type == NL_FOUND){
			list_ptr_free(allns);
			return n;
		}
	}
	list_ptr_free(allns);
	return nl_notfound();
}

static inline nl_st namespace_lookupImmediate(namespace ns, list_ptr names){
	// should perform the most ideal lookup... if it fails, then there is room to add a symbol
	for (int ni = 0; ni < names->size; ni++){
		list_byte name = names->ptrs[ni];
		for (int nsni = 0; nsni < ns->names->size; nsni++){
			nsname nsn = ns->names->ptrs[nsni];
			if (list_byte_equ(nsn->name, name)){
				if (ni == names->size - 1)
					return nl_found(nsn);
				if (nsn->type != NSN_NAMESPACE)
					return nl_notfound();
				ns = nsn->u.ns;
				break;
			}
		}
	}
	return nl_notfound();
}

typedef struct scope_struct scope_st, *scope;
struct scope_struct {
	namespace ns;
	list_ptr nsStack;
	label lblBreak; // not freed by scope_free
	label lblContinue; // not freed by scope_free
	scope parent;
};

static inline void scope_free(scope sc){
	// only free the first namespace...
	// this is because the first namespace will have all the child namespaces under it inside
	// the ns->names field, which will be freed via nsname_free
	namespace_free(sc->nsStack->ptrs[0]);
	list_ptr_free(sc->nsStack);
	mem_free(sc);
}

static void scope_print(scope sc){
	#ifdef SINK_DEBUG
	for (int i = 0; i < sc->nsStack->size; i++)
		namespace_print(sc->nsStack->ptrs[i]);
	#endif
}

static inline scope scope_new(frame fr, label lblBreak, label lblContinue, scope parent){
	scope sc = mem_alloc(sizeof(scope_st));
	sc->ns = namespace_new(fr);
	sc->nsStack = list_ptr_new(NULL);
	list_ptr_push(sc->nsStack, sc->ns);
	sc->lblBreak = lblBreak;
	sc->lblContinue = lblContinue;
	sc->parent = parent;
	return sc;
}

typedef struct {
	frame fr;
	scope sc;
	bool repl;
} symtbl_st, *symtbl;

static inline void symtbl_free(symtbl sym){
	frame here = sym->fr;
	while (here){
		frame del = here;
		here = here->parent;
		frame_free(del);
	}
	scope here2 = sym->sc;
	while (here2){
		scope del = here2;
		here2 = here2->parent;
		scope_free(del);
	}
	mem_free(sym);
}

static void symtbl_print(symtbl sym){
	#ifdef SINK_DEBUG
	frame_print(sym->fr);
	scope_print(sym->sc);
	#endif
}

static inline symtbl symtbl_new(bool repl){
	symtbl sym = mem_alloc(sizeof(symtbl_st));
	sym->fr = frame_new(NULL);
	sym->sc = scope_new(sym->fr, NULL, NULL, NULL);
	sym->repl = repl;
	return sym;
}

typedef enum {
	SFN_OK,
	SFN_ERROR
} sfn_enum;

typedef struct {
	sfn_enum type;
	union {
		namespace ns;
		char *msg;
	} u;
} sfn_st;

static inline sfn_st sfn_ok(namespace ns){
	return (sfn_st){ .type = SFN_OK, .u.ns = ns };
}

static inline sfn_st sfn_error(char *msg){
	return (sfn_st){ .type = SFN_ERROR, .u.msg = msg };
}

static sfn_st symtbl_findNamespace(symtbl sym, list_ptr names, int max){
	namespace ns = sym->sc->ns;
	for (int ni = 0; ni < max; ni++){
		list_byte name = names->ptrs[ni];
		bool found = false;
		for (int i = 0; i < ns->names->size; i++){
			nsname nsn = ns->names->ptrs[i];
			if (list_byte_equ(nsn->name, name)){
				if (nsn->type != NSN_NAMESPACE){
					if (!sym->repl){
						return sfn_error(sink_format(
							"Not a namespace: \"%.*s\"", nsn->name->size, nsn->name->bytes));
					}
					nsname_free(ns->names->ptrs[i]);
					nsn = ns->names->ptrs[i] = nsname_namespace(nsn->name, namespace_new(ns->fr));
				}
				ns = nsn->u.ns;
				found = true;
				break;
			}
		}
		if (!found){
			namespace nns = namespace_new(ns->fr);
			list_ptr_push(ns->names, nsname_namespace(name, nns));
			ns = nns;
		}
	}
	return sfn_ok(ns);
}

typedef enum {
	SPN_OK,
	SPN_ERROR
} spn_enum;

typedef struct {
	spn_enum type;
	char *msg;
} spn_st;

static inline spn_st spn_ok(){
	return (spn_st){ .type = SPN_OK };
}

static inline spn_st spn_error(char *msg){
	return (spn_st){ .type = SPN_ERROR, .msg = msg };
}

static inline spn_st symtbl_pushNamespace(symtbl sym, list_ptr names){
	sfn_st nsr = symtbl_findNamespace(sym, names, names->size);
	if (nsr.type == SFN_ERROR)
		return spn_error(nsr.u.msg);
	list_ptr_push(sym->sc->nsStack, nsr.u.ns);
	sym->sc->ns = nsr.u.ns;
	return spn_ok();
}

static inline void symtbl_popNamespace(symtbl sym){
	sym->sc->nsStack->size--;
	sym->sc->ns = sym->sc->nsStack->ptrs[sym->sc->nsStack->size - 1];
}

static inline void symtbl_pushScope(symtbl sym){
	sym->sc = scope_new(sym->fr, sym->sc->lblBreak, sym->sc->lblContinue, sym->sc);
}

static inline void symtbl_popScope(symtbl sym){
	scope del = sym->sc;
	sym->sc = sym->sc->parent;
	scope_free(del);
}

static inline void symtbl_pushFrame(symtbl sym){
	sym->fr = frame_new(sym->fr);
	sym->sc = scope_new(sym->fr, NULL, NULL, sym->sc);
}

static inline bool symtbl_frameOpenLabels(symtbl sym){
	for (int i = 0; i < sym->fr->lbls->size; i++){
		label lbl = sym->fr->lbls->ptrs[i];
		if (lbl->pos < 0)
			return true;
	}
	return false;
}

static inline void symtbl_popFrame(symtbl sym){
	scope del = sym->sc;
	frame del2 = sym->fr;
	sym->sc = sym->sc->parent;
	sym->fr = sym->fr->parent;
	scope_free(del);
	frame_free(del2);
}

typedef enum {
	STL_OK,
	STL_ERROR
} stl_enum;

typedef struct {
	stl_enum type;
	union {
		nsname nsn;
		char *msg;
	} u;
} stl_st;

static inline stl_st stl_ok(nsname nsn){
	return (stl_st){ .type = STL_OK, .u.nsn = nsn };
}

static inline stl_st stl_error(char *msg){
	return (stl_st){ .type = STL_ERROR, .u.msg = msg };
}

static stl_st symtbl_lookup(symtbl sym, list_ptr names){
	list_ptr tried = list_ptr_new(NULL);
	scope trysc = sym->sc;
	while (trysc != NULL){
		for (int trynsi = trysc->nsStack->size - 1; trynsi >= 0; trynsi--){
			namespace tryns = trysc->nsStack->ptrs[trynsi];
			nl_st n = namespace_lookup(tryns, names, 0, tried);
			if (n.type == NL_FOUND){
				list_ptr_free(tried);
				return stl_ok(n.nsn);
			}
		}
		trysc = trysc->parent;
	}
	list_ptr_free(tried);
	list_byte lb = names->ptrs[0];
	char *join = sink_format("Not found: %.*s", lb->size, lb->bytes);
	for (int i = 1; i < names->size; i++){
		lb = names->ptrs[i];
		char *join2 = sink_format("%s.%.*s", join, lb->size, lb->bytes);
		mem_free(join);
		join = join2;
	}
	return stl_error(join);
}

typedef enum {
	STA_OK,
	STA_VAR,
	STA_ERROR
} sta_enum;

typedef struct {
	sta_enum type;
	union {
		varloc_st vlc;
		char *msg;
	} u;
} sta_st;

static inline sta_st sta_ok(){
	return (sta_st){ .type = STA_OK };
}

static inline sta_st sta_var(varloc_st vlc){
	return (sta_st){ .type = STA_VAR, .u.vlc = vlc };
}

static inline sta_st sta_error(char *msg){
	return (sta_st){ .type = STA_ERROR, .u.msg = msg };
}

static sta_st symtbl_addTemp(symtbl sym){
	for (int i = 0; i < sym->fr->vars->size; i++){
		if (sym->fr->vars->vals[i] == FVR_TEMP_AVAIL){
			sym->fr->vars->vals[i] = FVR_TEMP_INUSE;
			return sta_var(varloc_new(0, i));
		}
	}
	if (sym->fr->vars->size >= 256)
		return sta_error(sink_format("Too many variables in frame"));
	list_int_push(sym->fr->vars, FVR_TEMP_INUSE);
	return sta_var(varloc_new(0, sym->fr->vars->size - 1));
}

static inline void symtbl_clearTemp(symtbl sym, varloc_st vlc){
	if (vlc.fdiff == 0 && sym->fr->vars->vals[vlc.index] == FVR_TEMP_INUSE)
		sym->fr->vars->vals[vlc.index] = FVR_TEMP_AVAIL;
}

static sta_st symtbl_addVar(symtbl sym, list_ptr names){
	sfn_st nsr = symtbl_findNamespace(sym, names, names->size - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.u.msg);
	namespace ns = nsr.u.ns;
	for (int i = 0; i < ns->names->size; i++){
		nsname nsn = ns->names->ptrs[i];
		if (list_byte_equ(nsn->name, names->ptrs[names->size - 1])){
			if (!sym->repl){
				return sta_error(
					sink_format("Cannot redefine \"%.*s\"", nsn->name->size, nsn->name->bytes));
			}
			if (nsn->type == NSN_VAR)
				return sta_var(varloc_new(frame_diff(nsn->u.var.fr, sym->fr), nsn->u.var.index));
			list_int_push(sym->fr->vars, FVR_VAR);
			nsname_free(ns->names->ptrs[i]);
			ns->names->ptrs[i] =
				nsname_var(names->ptrs[names->size - 1], sym->fr, sym->fr->vars->size - 1);
			return sta_var(varloc_new(0, sym->fr->vars->size - 1));
		}
	}
	if (sym->fr->vars->size >= 256)
		return sta_error(sink_format("Too many variables in frame"));
	list_int_push(sym->fr->vars, FVR_VAR);
	list_ptr_push(ns->names,
		nsname_var(names->ptrs[names->size - 1], sym->fr, sym->fr->vars->size - 1));
	return sta_var(varloc_new(0, sym->fr->vars->size - 1));
}

static sta_st symtbl_addCmdLocal(symtbl sym, list_ptr names, label lbl){
	sfn_st nsr = symtbl_findNamespace(sym, names, names->size - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.u.msg);
	namespace ns = nsr.u.ns;
	for (int i = 0; i < ns->names->size; i++){
		nsname nsn = ns->names->ptrs[i];
		if (list_byte_equ(nsn->name, names->ptrs[names->size - 1])){
			if (!sym->repl){
				return sta_error(
					sink_format("Cannot redefine \"%.*s\"", nsn->name->size, nsn->name->bytes));
			}
			nsname_free(ns->names->ptrs[i]);
			ns->names->ptrs[i] = nsname_cmdLocal(names->ptrs[names->size - 1], sym->fr, lbl);
			return sta_ok();
		}
	}
	list_ptr_push(ns->names, nsname_cmdLocal(names->ptrs[names->size - 1], sym->fr, lbl));
	return sta_ok();
}

static sta_st symtbl_addCmdNative(symtbl sym, list_ptr names, int index){
	sfn_st nsr = symtbl_findNamespace(sym, names, names->size - 1);
	if (nsr.type == SFN_ERROR)
		return sta_error(nsr.u.msg);
	namespace ns = nsr.u.ns;
	for (int i = 0; i < ns->names->size; i++){
		nsname nsn = ns->names->ptrs[i];
		if (list_byte_equ(nsn->name, names->ptrs[names->size - 1])){
			if (!sym->repl){
				return sta_error(
					sink_format("Cannot redefine \"%.*s\"", nsn->name->size, nsn->name->bytes));
			}
			nsname_free(ns->names->ptrs[i]);
			ns->names->ptrs[i] = nsname_cmdNative(names->ptrs[names->size - 1], index);
			return sta_ok();
		}
	}
	list_ptr_push(ns->names, nsname_cmdNative(names->ptrs[names->size - 1], index));
	return sta_ok();
}

// symtbl_addCmdOpcode
// can simplify this function because it is only called internally
static inline void SAC(symtbl sym, const char *name, op_enum opcode, int params){
	list_ptr_push(sym->sc->ns->names, nsname_cmdOpcode(list_byte_newStr(name), opcode, params));
}

static inline list_ptr NSS(const char *str){
	return list_ptr_newSingle((free_func)list_byte_free, list_byte_newStr(str));
}

static inline void symtbl_loadStdlib(symtbl sym){
	list_ptr nss;
	SAC(sym, "pick"          , OP_PICK          ,  3);
	SAC(sym, "say"           , OP_SAY           , -1);
	SAC(sym, "warn"          , OP_WARN          , -1);
	SAC(sym, "ask"           , OP_ASK           , -1);
	SAC(sym, "exit"          , OP_EXIT          , -1);
	SAC(sym, "abort"         , OP_ABORT         , -1);
	SAC(sym, "isnum"         , OP_ISNUM         ,  1);
	SAC(sym, "isstr"         , OP_ISSTR         ,  1);
	SAC(sym, "islist"        , OP_ISLIST        ,  1);
	SAC(sym, "range"         , OP_RANGE         ,  3);
	nss = NSS("num"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "abs"       , OP_NUM_ABS       ,  1);
		SAC(sym, "sign"      , OP_NUM_SIGN      ,  1);
		SAC(sym, "max"       , OP_NUM_MAX       , -1);
		SAC(sym, "min"       , OP_NUM_MIN       , -1);
		SAC(sym, "clamp"     , OP_NUM_CLAMP     ,  3);
		SAC(sym, "floor"     , OP_NUM_FLOOR     ,  1);
		SAC(sym, "ceil"      , OP_NUM_CEIL      ,  1);
		SAC(sym, "round"     , OP_NUM_ROUND     ,  1);
		SAC(sym, "trunc"     , OP_NUM_TRUNC     ,  1);
		SAC(sym, "nan"       , OP_NUM_NAN       ,  0);
		SAC(sym, "inf"       , OP_NUM_INF       ,  0);
		SAC(sym, "isnan"     , OP_NUM_ISNAN     ,  1);
		SAC(sym, "isfinite"  , OP_NUM_ISFINITE  ,  1);
		SAC(sym, "e"         , OP_NUM_E         ,  0);
		SAC(sym, "pi"        , OP_NUM_PI        ,  0);
		SAC(sym, "tau"       , OP_NUM_TAU       ,  0);
		SAC(sym, "sin"       , OP_NUM_SIN       ,  1);
		SAC(sym, "cos"       , OP_NUM_COS       ,  1);
		SAC(sym, "tan"       , OP_NUM_TAN       ,  1);
		SAC(sym, "asin"      , OP_NUM_ASIN      ,  1);
		SAC(sym, "acos"      , OP_NUM_ACOS      ,  1);
		SAC(sym, "atan"      , OP_NUM_ATAN      ,  1);
		SAC(sym, "atan2"     , OP_NUM_ATAN2     ,  2);
		SAC(sym, "log"       , OP_NUM_LOG       ,  1);
		SAC(sym, "log2"      , OP_NUM_LOG2      ,  1);
		SAC(sym, "log10"     , OP_NUM_LOG10     ,  1);
		SAC(sym, "exp"       , OP_NUM_EXP       ,  1);
		SAC(sym, "lerp"      , OP_NUM_LERP      ,  3);
		SAC(sym, "hex"       , OP_NUM_HEX       ,  2);
		SAC(sym, "oct"       , OP_NUM_OCT       ,  2);
		SAC(sym, "bin"       , OP_NUM_BIN       ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("int"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_INT_NEW       ,  1);
		SAC(sym, "not"       , OP_INT_NOT       ,  1);
		SAC(sym, "and"       , OP_INT_AND       ,  2);
		SAC(sym, "or"        , OP_INT_OR        ,  2);
		SAC(sym, "xor"       , OP_INT_XOR       ,  2);
		SAC(sym, "shl"       , OP_INT_SHL       ,  2);
		SAC(sym, "shr"       , OP_INT_SHR       ,  2);
		SAC(sym, "sar"       , OP_INT_SAR       ,  2);
		SAC(sym, "add"       , OP_INT_ADD       ,  2);
		SAC(sym, "sub"       , OP_INT_SUB       ,  2);
		SAC(sym, "mul"       , OP_INT_MUL       ,  2);
		SAC(sym, "div"       , OP_INT_DIV       ,  2);
		SAC(sym, "mod"       , OP_INT_MOD       ,  2);
		SAC(sym, "clz"       , OP_INT_CLZ       ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("rand"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "seed"      , OP_RAND_SEED     ,  1);
		SAC(sym, "seedauto"  , OP_RAND_SEEDAUTO ,  0);
		SAC(sym, "int"       , OP_RAND_INT      ,  0);
		SAC(sym, "num"       , OP_RAND_NUM      ,  0);
		SAC(sym, "getstate"  , OP_RAND_GETSTATE ,  0);
		SAC(sym, "setstate"  , OP_RAND_SETSTATE ,  1);
		SAC(sym, "pick"      , OP_RAND_PICK     ,  1);
		SAC(sym, "shuffle"   , OP_RAND_SHUFFLE  ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("str"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_STR_NEW       , -1);
		SAC(sym, "split"     , OP_STR_SPLIT     ,  2);
		SAC(sym, "replace"   , OP_STR_REPLACE   ,  3);
		SAC(sym, "begins"    , OP_STR_BEGINS    ,  2);
		SAC(sym, "ends"      , OP_STR_ENDS      ,  2);
		SAC(sym, "pad"       , OP_STR_PAD       ,  2);
		SAC(sym, "find"      , OP_STR_FIND      ,  3);
		SAC(sym, "rfind"     , OP_STR_RFIND     ,  3);
		SAC(sym, "lower"     , OP_STR_LOWER     ,  1);
		SAC(sym, "upper"     , OP_STR_UPPER     ,  1);
		SAC(sym, "trim"      , OP_STR_TRIM      ,  1);
		SAC(sym, "rev"       , OP_STR_REV       ,  1);
		SAC(sym, "rep"       , OP_STR_REV       ,  2);
		SAC(sym, "list"      , OP_STR_LIST      ,  1);
		SAC(sym, "byte"      , OP_STR_BYTE      ,  2);
		SAC(sym, "hash"      , OP_STR_HASH      ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("utf8"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "valid"     , OP_UTF8_VALID    ,  1);
		SAC(sym, "list"      , OP_UTF8_LIST     ,  1);
		SAC(sym, "str"       , OP_UTF8_STR      ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("struct"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "size"      , OP_STRUCT_SIZE   ,  1);
		SAC(sym, "str"       , OP_STRUCT_STR    ,  2);
		SAC(sym, "list"      , OP_STRUCT_LIST   ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("list"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_LIST_NEW      ,  2);
		SAC(sym, "shift"     , OP_LIST_SHIFT    ,  1);
		SAC(sym, "pop"       , OP_LIST_POP      ,  1);
		SAC(sym, "push"      , OP_LIST_PUSH     ,  2);
		SAC(sym, "unshift"   , OP_LIST_UNSHIFT  ,  2);
		SAC(sym, "append"    , OP_LIST_APPEND   ,  2);
		SAC(sym, "prepend"   , OP_LIST_PREPEND  ,  2);
		SAC(sym, "find"      , OP_LIST_FIND     ,  3);
		SAC(sym, "rfind"     , OP_LIST_RFIND    ,  3);
		SAC(sym, "join"      , OP_LIST_JOIN     ,  2);
		SAC(sym, "rev"       , OP_LIST_REV      ,  1);
		SAC(sym, "str"       , OP_LIST_STR      ,  1);
		SAC(sym, "sort"      , OP_LIST_SORT     ,  1);
		SAC(sym, "rsort"     , OP_LIST_RSORT    ,  1);
		SAC(sym, "sortcmp"   , OP_LIST_SORTCMP  ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("pickle"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "valid"     , OP_PICKLE_VALID  ,  1);
		SAC(sym, "str"       , OP_PICKLE_STR    ,  1);
		SAC(sym, "val"       , OP_PICKLE_VAL    ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("gc"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "level"     , OP_GC_LEVEL      ,  1);
		SAC(sym, "run"       , OP_GC_RUN        ,  0);
	symtbl_popNamespace(sym);
}

//
// program
//

typedef struct {
	list_ptr strTable;
	list_double numTable;
	list_u64 keyTable;
	list_byte ops;
	bool repl;
} program_st, *program;

static inline void program_free(program prg){
	list_ptr_free(prg->strTable);
	list_double_free(prg->numTable);
	list_u64_free(prg->keyTable);
	list_byte_free(prg->ops);
	mem_free(prg);
}

static inline program program_new(bool repl){
	program prg = mem_alloc(sizeof(program_st));
	prg->strTable = list_ptr_new((free_func)list_byte_free);
	prg->numTable = list_double_new();
	prg->keyTable = list_u64_new();
	prg->ops = list_byte_new();
	prg->repl = repl;
	return prg;
}

typedef enum {
	PER_OK,
	PER_ERROR
} per_enum;

typedef struct {
	per_enum type;
	union {
		varloc_st vlc;
		struct {
			filepos_st flp;
			char *msg;
		} error;
	} u;
} per_st;

static inline per_st per_ok(varloc_st vlc){
	return (per_st){ .type = PER_OK, .u.vlc = vlc };
}

static inline per_st per_error(filepos_st flp, char *msg){
	return (per_st){ .type = PER_ERROR, .u.error.flp = flp, .u.error.msg = msg };
}

typedef enum {
	PEM_EMPTY,
	PEM_CREATE,
	PEM_INTO
} pem_enum;

static per_st program_eval(program prg, symtbl sym, pem_enum mode, varloc_st intoVlc, expr ex);

typedef enum {
	PSR_OK,
	PSR_ERROR
} psr_enum;

typedef struct {
	psr_enum type;
	union {
		struct {
			varloc_st start;
			varloc_st len;
		} ok;
		struct {
			filepos_st flp;
			char *msg;
		} error;
	} u;
} psr_st;

static inline psr_st psr_ok(varloc_st start, varloc_st len){
	return (psr_st){ .type = PSR_OK, .u.ok.start = start, .u.ok.len = len };
}

static inline psr_st psr_error(filepos_st flp, char *msg){
	return (psr_st){ .type = PSR_ERROR, .u.error.flp = flp, .u.error.msg = msg };
}

static psr_st program_slice(program prg, symtbl sym, expr ex);

typedef enum {
	LVR_VAR,
	LVR_INDEX,
	LVR_SLICE,
	LVR_SLICEINDEX,
	LVR_LIST
} lvr_enum;

typedef struct lvr_struct lvr_st, *lvr;
struct lvr_struct {
	filepos_st flp;
	varloc_st vlc;
	lvr_enum type;
	union {
		struct {
			varloc_st obj;
			varloc_st key;
		} index;
		struct {
			varloc_st obj;
			varloc_st start;
			varloc_st len;
		} slice;
		struct {
			varloc_st indexvlc;
			varloc_st obj;
			varloc_st key;
			varloc_st start;
			varloc_st len;
		} sliceindex;
		struct {
			list_ptr body;
			lvr rest;
		} list;
	} u;
};

static inline void lvr_free(lvr lv){
	switch (lv->type){
		case LVR_VAR:
		case LVR_INDEX:
		case LVR_SLICE:
		case LVR_SLICEINDEX:
			break;
		case LVR_LIST:
			list_ptr_free(lv->u.list.body);
			if (lv->u.list.rest)
				lvr_free(lv->u.list.rest);
			break;
	}
	mem_free(lv);
}

static inline lvr lvr_var(filepos_st flp, varloc_st vlc){
	lvr lv = mem_alloc(sizeof(lvr_st));
	lv->flp = flp;
	lv->vlc = vlc;
	lv->type = LVR_VAR;
	return lv;
}

static inline lvr lvr_index(filepos_st flp, varloc_st obj, varloc_st key){
	lvr lv = mem_alloc(sizeof(lvr_st));
	lv->flp = flp;
	lv->vlc = VARLOC_NULL;
	lv->type = LVR_INDEX;
	lv->u.index.obj = obj;
	lv->u.index.key = key;
	return lv;
}

static inline lvr lvr_slice(filepos_st flp, varloc_st obj, varloc_st start, varloc_st len){
	lvr lv = mem_alloc(sizeof(lvr_st));
	lv->flp = flp;
	lv->vlc = VARLOC_NULL;
	lv->type = LVR_SLICE;
	lv->u.slice.obj = obj;
	lv->u.slice.start = start;
	lv->u.slice.len = len;
	return lv;
}

static inline lvr lvr_sliceindex(filepos_st flp, varloc_st obj, varloc_st key, varloc_st start,
	varloc_st len){
	lvr lv = mem_alloc(sizeof(lvr_st));
	lv->flp = flp;
	lv->vlc = VARLOC_NULL;
	lv->type = LVR_SLICEINDEX;
	lv->u.sliceindex.indexvlc = VARLOC_NULL;
	lv->u.sliceindex.obj = obj;
	lv->u.sliceindex.key = key;
	lv->u.sliceindex.start = start;
	lv->u.sliceindex.len = len;
	return lv;
}

static inline lvr lvr_list(filepos_st flp, list_ptr body, lvr rest){
	lvr lv = mem_alloc(sizeof(lvr_st));
	lv->flp = flp;
	lv->vlc = VARLOC_NULL;
	lv->type = LVR_LIST;
	lv->u.list.body = body;
	lv->u.list.rest = rest;
	return lv;
}

typedef enum {
	PLM_CREATE,
	PLM_INTO
} plm_enum;

static per_st program_lvalGet(program prg, symtbl sym, plm_enum mode, varloc_st intoVlc, lvr lv);
static per_st program_lvalGetIndex(program prg, symtbl sym, lvr lv);

typedef enum {
	LVP_OK,
	LVP_ERROR
} lvp_enum;

typedef struct {
	lvp_enum type;
	union {
		lvr lv;
		struct {
			filepos_st flp;
			char *msg;
		} error;
	} u;
} lvp_st;

static inline lvp_st lvp_ok(lvr lv){
	return (lvp_st){ .type = LVP_OK, .u.lv = lv };
}

static inline lvp_st lvp_error(filepos_st flp, char *msg){
	return (lvp_st){ .type = LVP_ERROR, .u.error.flp = flp, .u.error.msg = msg };
}

static lvp_st lval_addVars(symtbl sym, expr ex){
	if (ex->type == EXPR_NAMES){
		sta_st sr = symtbl_addVar(sym, ex->u.names);
		if (sr.type == STA_ERROR)
			return lvp_error(ex->flp, sr.u.msg);
		return lvp_ok(lvr_var(ex->flp, sr.u.vlc));
	}
	else if (ex->type == EXPR_LIST){
		if (ex->u.ex == NULL)
			return lvp_error(ex->flp, sink_format("Invalid assignment"));
		list_ptr body = list_ptr_new((free_func)lvr_free);
		lvr rest = NULL;
		if (ex->u.ex->type == EXPR_GROUP){
			for (int i = 0; i < ex->u.ex->u.group->size; i++){
				expr gex = ex->u.ex->u.group->ptrs[i];
				if (i == ex->u.ex->u.group->size - 1 && gex->type == EXPR_PREFIX &&
					gex->u.prefix.k == KS_PERIOD3){
					lvp_st lp = lval_addVars(sym, gex->u.prefix.ex);
					if (lp.type == LVP_ERROR)
						return lp;
					rest = lp.u.lv;
				}
				else{
					lvp_st lp = lval_addVars(sym, gex);
					if (lp.type == LVP_ERROR)
						return lp;
					list_ptr_push(body, lp.u.lv);
				}
			}
		}
		else{
			if (ex->u.ex->type == EXPR_PREFIX && ex->u.ex->u.prefix.k == KS_PERIOD3){
				lvp_st lp = lval_addVars(sym, ex->u.ex->u.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				rest = lp.u.lv;
			}
			else{
				lvp_st lp = lval_addVars(sym, ex->u.ex);
				if (lp.type == LVP_ERROR)
					return lp;
				list_ptr_push(body, lp.u.lv);
			}
		}
		return lvp_ok(lvr_list(ex->flp, body, rest));
	}
	return lvp_error(ex->flp, sink_format("Invalid assignment"));
}

static lvp_st lval_prepare(program prg, symtbl sym, expr ex){
	if (ex->type == EXPR_NAMES){
		stl_st sl = symtbl_lookup(sym, ex->u.names);
		if (sl.type == STL_ERROR)
			return lvp_error(ex->flp, sl.u.msg);
		if (sl.u.nsn->type != NSN_VAR)
			return lvp_error(ex->flp, sink_format("Invalid assignment"));
		return lvp_ok(lvr_var(ex->flp,
			varloc_new(frame_diff(sl.u.nsn->u.var.fr, sym->fr), sl.u.nsn->u.var.index)));
	}
	else if (ex->type == EXPR_INDEX){
		per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.index.obj);
		if (pe.type == PER_ERROR)
			return lvp_error(pe.u.error.flp, pe.u.error.msg);
		varloc_st obj = pe.u.vlc;
		pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.index.key);
		if (pe.type == PER_ERROR)
			return lvp_error(pe.u.error.flp, pe.u.error.msg);
		return lvp_ok(lvr_index(ex->flp, obj, pe.u.vlc));
	}
	else if (ex->type == EXPR_SLICE){
		if (ex->u.slice.obj->type == EXPR_INDEX){
			// we have a slice of an index `foo[1][2:3]`
			per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
				ex->u.slice.obj->u.index.obj);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.u.error.flp, pe.u.error.msg);
			varloc_st obj = pe.u.vlc;
			pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.slice.obj->u.index.key);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.u.error.flp, pe.u.error.msg);
			varloc_st key = pe.u.vlc;
			psr_st sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return lvp_error(sr.u.error.flp, sr.u.error.msg);
			return lvp_ok(lvr_sliceindex(ex->flp, obj, key, sr.u.ok.start, sr.u.ok.len));
		}
		else{
			per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.slice.obj);
			if (pe.type == PER_ERROR)
				return lvp_error(pe.u.error.flp, pe.u.error.msg);
			varloc_st obj = pe.u.vlc;
			psr_st sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return lvp_error(sr.u.error.flp, sr.u.error.msg);
			return lvp_ok(lvr_slice(ex->flp, obj, sr.u.ok.start, sr.u.ok.len));
		}
	}
	else if (ex->type == EXPR_LIST){
		list_ptr body = list_ptr_new((free_func)lvr_free);
		lvr rest = NULL;
		if (ex->u.ex == NULL)
			/* do nothing */;
		else if (ex->u.ex->type == EXPR_GROUP){
			for (int i = 0; i < ex->u.ex->u.group->size; i++){
				expr gex = ex->u.ex->u.group->ptrs[i];
				if (i == ex->u.ex->u.group->size - 1 && gex->type == EXPR_PREFIX &&
					gex->u.prefix.k == KS_PERIOD3){
					lvp_st lp = lval_prepare(prg, sym, gex->u.ex);
					if (lp.type == LVP_ERROR){
						list_ptr_free(body);
						return lp;
					}
					rest = lp.u.lv;
				}
				else{
					lvp_st lp = lval_prepare(prg, sym, gex);
					if (lp.type == LVP_ERROR){
						list_ptr_free(body);
						return lp;
					}
					list_ptr_push(body, lp.u.lv);
				}
			}
		}
		else{
			if (ex->u.ex->type == EXPR_PREFIX && ex->u.ex->u.prefix.k == KS_PERIOD3){
				lvp_st lp = lval_prepare(prg, sym, ex->u.ex->u.ex);
				if (lp.type == LVP_ERROR){
					list_ptr_free(body);
					return lp;
				}
				rest = lp.u.lv;
			}
			else{
				lvp_st lp = lval_prepare(prg, sym, ex->u.ex);
				if (lp.type == LVP_ERROR){
					list_ptr_free(body);
					return lp;
				}
				list_ptr_push(body, lp.u.lv);
			}
		}
		return lvp_ok(lvr_list(ex->flp, body, rest));
	}
	return lvp_error(ex->flp, sink_format("Invalid assignment"));
}

static void lval_clearTemps(lvr lv, symtbl sym){
	if (lv->type != LVR_VAR && !varloc_isnull(lv->vlc)){
		symtbl_clearTemp(sym, lv->vlc);
		lv->vlc = VARLOC_NULL;
	}
	switch (lv->type){
		case LVR_VAR:
			return;
		case LVR_INDEX:
			symtbl_clearTemp(sym, lv->u.index.obj);
			symtbl_clearTemp(sym, lv->u.index.key);
			return;
		case LVR_SLICE:
			symtbl_clearTemp(sym, lv->u.slice.obj);
			symtbl_clearTemp(sym, lv->u.slice.start);
			symtbl_clearTemp(sym, lv->u.slice.len);
			return;
		case LVR_SLICEINDEX:
			if (!varloc_isnull(lv->u.sliceindex.indexvlc)){
				symtbl_clearTemp(sym, lv->u.sliceindex.indexvlc);
				lv->u.sliceindex.indexvlc = VARLOC_NULL;
			}
			symtbl_clearTemp(sym, lv->u.sliceindex.obj);
			symtbl_clearTemp(sym, lv->u.sliceindex.key);
			symtbl_clearTemp(sym, lv->u.sliceindex.start);
			symtbl_clearTemp(sym, lv->u.sliceindex.len);
			return;
		case LVR_LIST:
			for (int i = 0; i < lv->u.list.body->size; i++)
				lval_clearTemps(lv->u.list.body->ptrs[i], sym);
			if (lv->u.list.rest != NULL)
				lval_clearTemps(lv->u.list.rest, sym);
			return;
	}
}

static per_st program_evalLval(program prg, symtbl sym, pem_enum mode, varloc_st intoVlc, lvr lv,
	op_enum mutop, varloc_st valueVlc, bool clearTemps){
	// first, perform the assignment of valueVlc into lv
	switch (lv->type){
		case LVR_VAR:
			if (mutop == OP_INVALID)
				op_move(prg->ops, lv->vlc, valueVlc);
			else
				op_binop(prg->ops, mutop, lv->vlc, lv->vlc, valueVlc);
			break;

		case LVR_INDEX: {
			if (mutop == OP_INVALID)
				op_setat(prg->ops, lv->u.index.obj, lv->u.index.key, valueVlc);
			else{
				per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg->ops, mutop, pe.u.vlc, pe.u.vlc, valueVlc);
				op_setat(prg->ops, lv->u.index.obj, lv->u.index.key, pe.u.vlc);
			}
		} break;

		case LVR_SLICE: {
			if (mutop == OP_INVALID)
				op_splice(prg->ops, lv->u.slice.obj, lv->u.slice.start, lv->u.slice.len, valueVlc);
			else{
				per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv);
				if (pe.type == PER_ERROR)
					return pe;
				lvr lv2 = lvr_var(lv->flp, lv->vlc);
				pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lv2, mutop, valueVlc, true);
				lvr_free(lv2);
				if (pe.type == PER_ERROR)
					return pe;
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv->flp, ts.u.msg);
				varloc_st t = ts.u.vlc;
				op_num(prg->ops, t, 0);
				op_slice(prg->ops, t, lv->vlc, t, lv->u.slice.len);
				op_splice(prg->ops, lv->u.slice.obj, lv->u.slice.start, lv->u.slice.len, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, lv->vlc);
				lv->vlc = VARLOC_NULL;
			}
		} break;

		case LVR_SLICEINDEX: {
			if (mutop == OP_INVALID){
				per_st pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				op_splice(prg->ops, pe.u.vlc, lv->u.sliceindex.start, lv->u.sliceindex.len,
					valueVlc);
				op_setat(prg->ops, lv->u.sliceindex.obj, lv->u.sliceindex.key, pe.u.vlc);
			}
			else{
				per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv);
				if (pe.type == PER_ERROR)
					return pe;
				lvr lv2 = lvr_var(lv->flp, lv->vlc);
				pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lv2, mutop, valueVlc, true);
				lvr_free(lv2);
				if (pe.type == PER_ERROR)
					return pe;
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv->flp, ts.u.msg);
				varloc_st t = ts.u.vlc;
				op_num(prg->ops, t, 0);
				op_slice(prg->ops, t, lv->vlc, t, lv->u.sliceindex.len);
				op_splice(prg->ops, lv->u.sliceindex.indexvlc, lv->u.sliceindex.start,
					lv->u.sliceindex.len, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, lv->u.sliceindex.indexvlc);
				symtbl_clearTemp(sym, lv->vlc);
				lv->u.sliceindex.indexvlc = VARLOC_NULL;
				lv->vlc = VARLOC_NULL;
			}
		} break;

		case LVR_LIST: {
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st t = ts.u.vlc;

			for (int i = 0; i < lv->u.list.body->size; i++){
				op_num(prg->ops, t, i);
				op_getat(prg->ops, t, valueVlc, t);
				per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL,
					lv->u.list.body->ptrs[i], mutop, t, false);
				if (pe.type == PER_ERROR)
					return pe;
			}

			if (lv->u.list.rest != NULL){
				ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv->flp, ts.u.msg);
				varloc_st t2 = ts.u.vlc;

				op_num(prg->ops, t, lv->u.list.body->size);
				op_nil(prg->ops, t2);
				op_slice(prg->ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lv->u.list.rest,
					mutop, t, false);
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
		return per_ok(VARLOC_NULL);
	}
	else if (mode == PEM_CREATE){
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return per_error(lv->flp, ts.u.msg);
		intoVlc = ts.u.vlc;
	}

	per_st pe = program_lvalGet(prg, sym, PLM_INTO, intoVlc, lv);
	if (pe.type == PER_ERROR)
		return pe;
	if (clearTemps)
		lval_clearTemps(lv, sym);
	return per_ok(intoVlc);
}

static psr_st program_slice(program prg, symtbl sym, expr ex){
	varloc_st start;
	if (ex->u.slice.start == NULL){
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex->flp, ts.u.msg);
		start = ts.u.vlc;
		op_num(prg->ops, start, 0);
	}
	else{
		per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.slice.start);
		if (pe.type == PER_ERROR)
			return psr_error(pe.u.error.flp, pe.u.error.msg);
		start = pe.u.vlc;
	}

	varloc_st len;
	if (ex->u.slice.len == NULL){
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return psr_error(ex->flp, ts.u.msg);
		len = ts.u.vlc;
		op_nil(prg->ops, len);
	}
	else{
		per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.slice.len);
		if (pe.type == PER_ERROR)
			return psr_error(pe.u.error.flp, pe.u.error.msg);
		len = pe.u.vlc;
	}

	return psr_ok(start, len);
}

static per_st program_lvalGetIndex(program prg, symtbl sym, lvr lv){
	// specifically for LVR_SLICEINDEX in order to fill lv.indexvlc
	if (!varloc_isnull(lv->u.sliceindex.indexvlc))
		return per_ok(lv->u.sliceindex.indexvlc);

	sta_st ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR)
		return per_error(lv->flp, ts.u.msg);
	lv->u.sliceindex.indexvlc = ts.u.vlc;

	op_getat(prg->ops, lv->u.sliceindex.indexvlc, lv->u.sliceindex.obj, lv->u.sliceindex.key);
	return per_ok(lv->u.sliceindex.indexvlc);
}

static per_st program_lvalGet(program prg, symtbl sym, plm_enum mode, varloc_st intoVlc, lvr lv){
	if (!varloc_isnull(lv->vlc)){
		if (mode == PLM_CREATE)
			return per_ok(lv->vlc);
		op_move(prg->ops, intoVlc, lv->vlc);
		return per_ok(intoVlc);
	}

	if (mode == PLM_CREATE){
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return per_error(lv->flp, ts.u.msg);
		intoVlc = lv->vlc = ts.u.vlc;
	}

	switch (lv->type){
		case LVR_VAR:
			assert(false);
			break;

		case LVR_INDEX:
			op_getat(prg->ops, intoVlc, lv->u.index.obj, lv->u.index.key);
			break;

		case LVR_SLICE:
			op_slice(prg->ops, intoVlc, lv->u.slice.obj, lv->u.slice.start, lv->u.slice.len);
			break;

		case LVR_SLICEINDEX: {
			per_st pe = program_lvalGetIndex(prg, sym, lv);
			if (pe.type == PER_ERROR)
				return pe;
			op_slice(prg->ops, intoVlc, pe.u.vlc, lv->u.sliceindex.start, lv->u.sliceindex.len);
		} break;

		case LVR_LIST: {
			op_list(prg->ops, intoVlc, lv->u.list.body->size);

			for (int i = 0; i < lv->u.list.body->size; i++){
				per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL,
					lv->u.list.body->ptrs[i]);
				if (pe.type == PER_ERROR)
					return pe;
				op_param2(prg->ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.u.vlc);
			}

			if (lv->u.list.rest != NULL){
				per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv->u.list.rest);
				if (pe.type == PER_ERROR)
					return pe;
				op_param2(prg->ops, OP_LIST_APPEND, intoVlc, intoVlc, pe.u.vlc);
			}
		} break;
	}

	return per_ok(intoVlc);
}

static per_st program_evalCall_checkList(program prg, symtbl sym, filepos_st flp, varloc_st vlc){
	sta_st ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR)
		return per_error(flp, ts.u.msg);
	varloc_st t = ts.u.vlc;
	label skip = label_newStr("^skip");
	op_unop(prg->ops, OP_ISLIST, t, vlc);
	label_jumpTrue(skip, prg->ops, t);
	op_aborterr(prg->ops, ABORT_LISTFUNC);
	label_declare(skip, prg->ops);
	label_free(skip);
	symtbl_clearTemp(sym, t);
	return per_ok(VARLOC_NULL);
}

static per_st program_evalCall(program prg, symtbl sym, pem_enum mode, varloc_st intoVlc,
	filepos_st flp, nsname nsn, bool paramsAt, expr params){
	// params can be NULL to indicate emptiness
	if (nsn->type == NSN_CMD_OPCODE && nsn->u.cmdOpcode.opcode == OP_PICK){
		if (paramsAt || params == NULL || params->type != EXPR_GROUP ||
			params->u.group->size != 3)
			return per_error(flp, sink_format("Using `pick` requires exactly three arguments"));

		per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params->u.group->ptrs[0]);
		if (pe.type == PER_ERROR)
			return pe;
		if (mode == PEM_CREATE){
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.u.msg);
			intoVlc = ts.u.vlc;
		}

		label pickfalse = label_newStr("^pickfalse");
		label finish = label_newStr("^pickfinish");

		label_jumpFalse(pickfalse, prg->ops, pe.u.vlc);
		symtbl_clearTemp(sym, pe.u.vlc);

		if (mode == PEM_EMPTY)
			pe = program_eval(prg, sym, PEM_EMPTY, intoVlc, params->u.group->ptrs[1]);
		else
			pe = program_eval(prg, sym, PEM_INTO, intoVlc, params->u.group->ptrs[1]);
		if (pe.type == PER_ERROR){
			label_free(pickfalse);
			label_free(finish);
			return pe;
		}
		label_jump(finish, prg->ops);

		label_declare(pickfalse, prg->ops);
		if (mode == PEM_EMPTY)
			pe = program_eval(prg, sym, PEM_EMPTY, intoVlc, params->u.group->ptrs[2]);
		else
			pe = program_eval(prg, sym, PEM_INTO, intoVlc, params->u.group->ptrs[2]);
		if (pe.type == PER_ERROR){
			label_free(pickfalse);
			label_free(finish);
			return pe;
		}

		label_declare(finish, prg->ops);
		label_free(pickfalse);
		label_free(finish);
		return per_ok(intoVlc);
	}

	if (nsn->type == NSN_CMD_LOCAL || nsn->type == NSN_CMD_NATIVE ||
		(nsn->type == NSN_CMD_OPCODE && nsn->u.cmdOpcode.params == -1)){
		if (mode == PEM_EMPTY || mode == PEM_CREATE){
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(flp, ts.u.msg);
			intoVlc = ts.u.vlc;
		}

		varloc_st args;
		per_st pe;
		if (!paramsAt){
			expr x = expr_list(flp, params);
			pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, x);
			x->u.ex = NULL;
			expr_free(x);
		}
		else
			pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params);
		if (pe.type == PER_ERROR)
			return pe;
		args = pe.u.vlc;

		if (nsn->type == NSN_CMD_LOCAL){
			label_call(nsn->u.cmdLocal.lbl, prg->ops, intoVlc, args,
				frame_diff(nsn->u.cmdLocal.fr, sym->fr));
		}
		else if (nsn->type == NSN_CMD_NATIVE)
			op_native(prg->ops, intoVlc, args, nsn->u.index);
		else // variable argument NSN_CMD_OPCODE
			op_param1(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, args);

		symtbl_clearTemp(sym, args);
	}
	else if (nsn->type == NSN_CMD_OPCODE){
		if (nsn->u.cmdOpcode.params == 0){
			if (params != NULL){
				if (paramsAt){
					// this needs to fail: `var x = 1; num.tau @ x;`
					// even though `num.tau` takes zero parameters
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params);
					if (pe.type == PER_ERROR)
						return pe;
					varloc_st args = pe.u.vlc;
					pe = program_evalCall_checkList(prg, sym, flp, args);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, args);
				}
				else{
					per_st pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, params);
					if (pe.type == PER_ERROR)
						return pe;
				}
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			op_param0(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc);
		}
		else if (nsn->u.cmdOpcode.params == 1 || nsn->u.cmdOpcode.params == 2
			|| nsn->u.cmdOpcode.params == 3){
			varloc_st p1, p2, p3;

			if (paramsAt){
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params);
				if (pe.type == PER_ERROR)
					return pe;
				varloc_st args = pe.u.vlc;
				pe = program_evalCall_checkList(prg, sym, flp, args);
				if (pe.type == PER_ERROR)
					return pe;

				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.u.msg);
				p1 = ts.u.vlc;
				op_num(prg->ops, p1, 0);
				op_getat(prg->ops, p1, args, p1);

				if (nsn->u.cmdOpcode.params >= 2){
					ts = symtbl_addTemp(sym);
					if (ts.type == STA_ERROR)
						return per_error(flp, ts.u.msg);
					p2 = ts.u.vlc;
					op_num(prg->ops, p2, 1);
					op_getat(prg->ops, p2, args, p2);

					if (nsn->u.cmdOpcode.params >= 3){
						ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(flp, ts.u.msg);
						p3 = ts.u.vlc;
						op_num(prg->ops, p3, 2);
						op_getat(prg->ops, p3, args, p3);
					}
				}

				symtbl_clearTemp(sym, args);
			}
			else if (params == NULL){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.u.msg);
				p1 = p2 = p3 = ts.u.vlc;
				op_nil(prg->ops, p1);
			}
			else{
				if (params->type == EXPR_GROUP){
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
						params->u.group->ptrs[0]);
					if (pe.type == PER_ERROR)
						return pe;
					p1 = pe.u.vlc;

					if (nsn->u.cmdOpcode.params > 1){
						pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
							params->u.group->ptrs[1]);
					}
					else{
						pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL,
							params->u.group->ptrs[1]);
					}
					if (pe.type == PER_ERROR)
						return pe;
					if (nsn->u.cmdOpcode.params > 1)
						p2 = pe.u.vlc;

					int rest = 2;
					if (nsn->u.cmdOpcode.params >= 3){
						if (params->u.group->size <= 2){
							sta_st ts = symtbl_addTemp(sym);
							if (ts.type == STA_ERROR)
								return per_error(params->flp, ts.u.msg);
							p3 = ts.u.vlc;
							op_nil(prg->ops, p3);
						}
						else{
							rest = 3;
							pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
								params->u.group->ptrs[2]);
							if (pe.type == PER_ERROR)
								return pe;
							p3 = pe.u.vlc;
						}
					}

					for (int i = rest; i < params->u.group->size; i++){
						pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL,
							params->u.group->ptrs[i]);
						if (pe.type == PER_ERROR)
							return pe;
					}
				}
				else{
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params);
					if (pe.type == PER_ERROR)
						return pe;
					p1 = pe.u.vlc;
					if (nsn->u.cmdOpcode.params > 1){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(params->flp, ts.u.msg);
						p2 = p3 = ts.u.vlc;
						op_nil(prg->ops, p2);
					}
				}
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			if (nsn->u.cmdOpcode.params == 1)
				op_param1(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p1);
			else if (nsn->u.cmdOpcode.params == 2)
				op_param2(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p1, p2);
			else // nsn.params == 3
				op_param3(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p1, p2, p3);

			symtbl_clearTemp(sym, p1);
			if (nsn->u.cmdOpcode.params >= 2){
				symtbl_clearTemp(sym, p2);
				if (nsn->u.cmdOpcode.params >= 3)
					symtbl_clearTemp(sym, p3);
			}
		}
		else
			assert(false);
	}
	else
		return per_error(flp, sink_format("Invalid call"));

	if (mode == PEM_EMPTY){
		symtbl_clearTemp(sym, intoVlc);
		return per_ok(VARLOC_NULL);
	}
	return per_ok(intoVlc);
}

static per_st program_lvalCheckNil(program prg, symtbl sym, lvr lv, bool jumpFalse, bool inverted,
	label skip){
	switch (lv->type){
		case LVR_VAR:
		case LVR_INDEX: {
			per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv);
			if (pe.type == PER_ERROR)
				return pe;
			if (jumpFalse == !inverted)
				label_jumpFalse(skip, prg->ops, pe.u.vlc);
			else
				label_jumpTrue(skip, prg->ops, pe.u.vlc);
			symtbl_clearTemp(sym, pe.u.vlc);
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX: {
			varloc_st obj;
			varloc_st start;
			varloc_st len;
			if (lv->type == LVR_SLICE){
				obj = lv->u.slice.obj;
				start = lv->u.slice.start;
				len = lv->u.slice.len;
			}
			else{
				per_st pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				obj = pe.u.vlc;
				start = lv->u.sliceindex.start;
				len = lv->u.sliceindex.len;
			}

			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st idx = ts.u.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st t = ts.u.vlc;

			op_num(prg->ops, idx, 0);

			label next = label_newStr("^condslicenext");

			op_nil(prg->ops, t);
			op_binop(prg->ops, OP_EQU, t, t, len);
			label_jumpFalse(next, prg->ops, t);
			op_unop(prg->ops, OP_SIZE, t, obj);
			op_binop(prg->ops, OP_NUM_SUB, len, t, start);

			label_declare(next, prg->ops);

			op_binop(prg->ops, OP_LT, t, idx, len);

			label keep = label_newStr("^condslicekeep");
			label_jumpFalse(inverted ? keep : skip, prg->ops, t);

			op_binop(prg->ops, OP_NUM_ADD, t, idx, start);
			op_getat(prg->ops, t, obj, t);
			if (jumpFalse)
				label_jumpTrue(inverted ? skip : keep, prg->ops, t);
			else
				label_jumpFalse(inverted ? skip : keep, prg->ops, t);

			op_inc(prg->ops, idx);
			label_jump(next, prg->ops);
			label_declare(keep, prg->ops);

			symtbl_clearTemp(sym, idx);
			symtbl_clearTemp(sym, t);
			label_free(next);
			label_free(keep);
		} break;

		case LVR_LIST: {
			label keep = label_newStr("^condkeep");
			for (int i = 0; i < lv->u.list.body->size; i++){
				program_lvalCheckNil(prg, sym, lv->u.list.body->ptrs[i], jumpFalse, true,
					inverted ? skip : keep);
			}
			if (lv->u.list.rest != NULL){
				program_lvalCheckNil(prg, sym, lv->u.list.rest, jumpFalse, true,
					inverted ? skip : keep);
			}
			if (!inverted)
				label_jump(skip, prg->ops);
			label_declare(keep, prg->ops);
			label_free(keep);
		} break;
	}
	return per_ok(VARLOC_NULL);
}

static per_st program_lvalCondAssignPart(program prg, symtbl sym, lvr lv, bool jumpFalse,
	varloc_st valueVlc){
	switch (lv->type){
		case LVR_VAR:
		case LVR_INDEX: {
			per_st pe = program_lvalGet(prg, sym, PLM_CREATE, VARLOC_NULL, lv);
			if (pe.type == PER_ERROR)
				return pe;
			label skip = label_newStr("^condskippart");
			if (jumpFalse)
				label_jumpFalse(skip, prg->ops, pe.u.vlc);
			else
				label_jumpTrue(skip, prg->ops, pe.u.vlc);
			symtbl_clearTemp(sym, pe.u.vlc);
			pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lv, OP_INVALID, valueVlc, true);
			if (pe.type == PER_ERROR){
				label_free(skip);
				return pe;
			}
			label_declare(skip, prg->ops);
			label_free(skip);
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX: {
			varloc_st obj;
			varloc_st start;
			varloc_st len;
			if (lv->type == LVR_SLICE){
				obj = lv->u.slice.obj;
				start = lv->u.slice.start;
				len = lv->u.slice.len;
			}
			else{
				per_st pe = program_lvalGetIndex(prg, sym, lv);
				if (pe.type == PER_ERROR)
					return pe;
				obj = pe.u.vlc;
				start = lv->u.sliceindex.start;
				len = lv->u.sliceindex.len;
			}

			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st idx = ts.u.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st t = ts.u.vlc;

			ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st t2 = ts.u.vlc;

			op_num(prg->ops, idx, 0);

			label next = label_newStr("^condpartslicenext");

			op_nil(prg->ops, t);
			op_binop(prg->ops, OP_EQU, t, t, len);
			label_jumpFalse(next, prg->ops, t);
			op_unop(prg->ops, OP_SIZE, t, obj);
			op_binop(prg->ops, OP_NUM_SUB, len, t, start);

			label_declare(next, prg->ops);

			op_binop(prg->ops, OP_LT, t, idx, len);

			label done = label_newStr("^condpartslicedone");
			label_jumpFalse(done, prg->ops, t);

			label inc = label_newStr("^condpartsliceinc");
			op_binop(prg->ops, OP_NUM_ADD, t, idx, start);
			op_getat(prg->ops, t2, obj, t);
			if (jumpFalse)
				label_jumpFalse(inc, prg->ops, t2);
			else
				label_jumpTrue(inc, prg->ops, t2);

			op_getat(prg->ops, t2, valueVlc, idx);
			op_setat(prg->ops, obj, t, t2);

			label_declare(inc, prg->ops);
			op_inc(prg->ops, idx);
			label_jump(next, prg->ops);
			label_declare(done, prg->ops);

			symtbl_clearTemp(sym, idx);
			symtbl_clearTemp(sym, t);
			symtbl_clearTemp(sym, t2);
			label_free(next);
			label_free(done);
			label_free(inc);
		} break;

		case LVR_LIST: {
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return per_error(lv->flp, ts.u.msg);
			varloc_st t = ts.u.vlc;
			for (int i = 0; i < lv->u.list.body->size; i++){
				op_num(prg->ops, t, i);
				op_getat(prg->ops, t, valueVlc, t);
				per_st pe = program_lvalCondAssignPart(prg, sym, lv->u.list.body->ptrs[i],
					jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			if (lv->u.list.rest != NULL){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(lv->flp, ts.u.msg);
				varloc_st t2 = ts.u.vlc;
				op_num(prg->ops, t, lv->u.list.body->size);
				op_nil(prg->ops, t2);
				op_slice(prg->ops, t, valueVlc, t, t2);
				symtbl_clearTemp(sym, t2);
				per_st pe = program_lvalCondAssignPart(prg, sym, lv->u.list.rest, jumpFalse, t);
				if (pe.type == PER_ERROR)
					return pe;
			}
			symtbl_clearTemp(sym, t);
		} break;
	}
	return per_ok(VARLOC_NULL);
}

static per_st program_lvalCondAssign(program prg, symtbl sym, lvr lv, bool jumpFalse,
	varloc_st valueVlc){
	switch (lv->type){
		case LVR_VAR:
		case LVR_INDEX: {
			per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lv, OP_INVALID,
				valueVlc, true);
			if (pe.type == PER_ERROR)
				return pe;
		} break;

		case LVR_SLICE:
		case LVR_SLICEINDEX:
		case LVR_LIST:
			return program_lvalCondAssignPart(prg, sym, lv, jumpFalse, valueVlc);
	}
	symtbl_clearTemp(sym, valueVlc);
	return per_ok(VARLOC_NULL);
}

static per_st program_eval(program prg, symtbl sym, pem_enum mode, varloc_st intoVlc, expr ex){
	switch (ex->type){
		case EXPR_NIL: {
			if (mode == PEM_EMPTY)
				return per_ok(VARLOC_NULL);
			else if (mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			op_nil(prg->ops, intoVlc);
			return per_ok(intoVlc);
		} break;

		case EXPR_NUM: {
			if (mode == PEM_EMPTY)
				return per_ok(VARLOC_NULL);
			else if (mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			if (floor(ex->u.num) == ex->u.num && ex->u.num >= -65536 && ex->u.num < 65536){
				op_num(prg->ops, intoVlc, ex->u.num);
				return per_ok(intoVlc);
			}
			bool found = false;
			int index;
			for (index = 0; index < prg->numTable->size; index++){
				found = prg->numTable->vals[index] == ex->u.num;
				if (found)
					break;
			}
			if (!found){
				if (index >= 65536)
					return per_error(ex->flp, sink_format("Too many number constants"));
				list_double_push(prg->numTable, ex->u.num);
			}
			op_numtbl(prg->ops, intoVlc, index);
			return per_ok(intoVlc);
		} break;

		case EXPR_STR: {
			if (mode == PEM_EMPTY)
				return per_ok(VARLOC_NULL);
			else if (mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			bool found = false;
			int index;
			for (index = 0; index < prg->strTable->size; index++){
				found = list_byte_equ(ex->u.str, prg->strTable->ptrs[index]);
				if (found)
					break;
			}
			if (!found){
				if (index >= 65536)
					return per_error(ex->flp, sink_format("Too many string constants"));
				list_ptr_push(prg->strTable, ex->u.str);
				ex->u.str = NULL;
			}
			op_str(prg->ops, intoVlc, index);
			return per_ok(intoVlc);
		} break;

		case EXPR_LIST: {
			if (mode == PEM_EMPTY){
				if (ex->u.ex != NULL)
					return program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, ex->u.ex);
				return per_ok(VARLOC_NULL);
			}
			else if (mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			if (ex->u.ex != NULL){
				if (ex->u.ex->type == EXPR_GROUP){
					op_list(prg->ops, intoVlc, ex->u.ex->u.group->size);
					for (int i = 0; i < ex->u.ex->u.group->size; i++){
						per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
							ex->u.ex->u.group->ptrs[i]);
						if (pe.type == PER_ERROR)
							return pe;
						symtbl_clearTemp(sym, pe.u.vlc);
						op_param2(prg->ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.u.vlc);
					}
				}
				else{
					op_list(prg->ops, intoVlc, 1);
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.ex);
					if (pe.type == PER_ERROR)
						return pe;
					symtbl_clearTemp(sym, pe.u.vlc);
					op_param2(prg->ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.u.vlc);
				}
			}
			else
				op_list(prg->ops, intoVlc, 0);
			return per_ok(intoVlc);
		} break;

		case EXPR_NAMES: {
			stl_st sl = symtbl_lookup(sym, ex->u.names);
			if (sl.type == STL_ERROR)
				return per_error(ex->flp, sl.u.msg);
			switch (sl.u.nsn->type){
				case NSN_VAR: {
					if (mode == PEM_EMPTY)
						return per_ok(VARLOC_NULL);
					varloc_st varVlc = varloc_new(frame_diff(sl.u.nsn->u.var.fr, sym->fr),
						sl.u.nsn->u.var.index);
					if (mode == PEM_CREATE)
						return per_ok(varVlc);
					op_move(prg->ops, intoVlc, varVlc);
					return per_ok(intoVlc);
				} break;

				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
				case NSN_CMD_OPCODE:
					return program_evalCall(prg, sym, mode, intoVlc, ex->flp, sl.u.nsn, false,
						NULL);

				case NSN_NAMESPACE:
					return per_error(ex->flp, sink_format("Invalid expression"));
			}
			assert(false);
		} break;

		case EXPR_VAR: {
			if (mode == PEM_EMPTY)
				return per_ok(VARLOC_NULL);
			else if (mode == PEM_CREATE)
				return per_ok(ex->u.vlc);
			op_move(prg->ops, intoVlc, ex->u.vlc);
			return per_ok(intoVlc);
		} break;

		case EXPR_PAREN:
			return program_eval(prg, sym, mode, intoVlc, ex->u.ex);

		case EXPR_GROUP:
			for (int i = 0; i < ex->u.group->size; i++){
				if (i == ex->u.group->size - 1)
					return program_eval(prg, sym, mode, intoVlc, ex->u.group->ptrs[i]);
				per_st pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, ex->u.group->ptrs[i]);
				if (pe.type == PER_ERROR)
					return pe;
			}
			break;

		case EXPR_PREFIX: {
			op_enum unop = ks_toUnaryOp(ex->u.prefix.k);
			if (unop == OP_INVALID)
				return per_error(ex->flp, sink_format("Invalid unary operator"));
			per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.prefix.ex);
			if (pe.type == PER_ERROR)
				return pe;
			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			op_unop(prg->ops, unop, intoVlc, pe.u.vlc);
			symtbl_clearTemp(sym, pe.u.vlc);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(VARLOC_NULL);
			}
			return per_ok(intoVlc);
		} break;

		case EXPR_INFIX: {
			op_enum mutop = ks_toMutateOp(ex->u.infix.k);
			if (ex->u.infix.k == KS_EQU || ex->u.infix.k == KS_AMP2EQU ||
				ex->u.infix.k == KS_PIPE2EQU || mutop != OP_INVALID){
				lvp_st lp = lval_prepare(prg, sym, ex->u.infix.left);
				if (lp.type == LVP_ERROR)
					return per_error(lp.u.error.flp, lp.u.error.msg);

				if (ex->u.infix.k == KS_AMP2EQU || ex->u.infix.k == KS_PIPE2EQU){
					label skip = label_newStr("^condsetskip");

					per_st pe = program_lvalCheckNil(prg, sym, lp.u.lv, ex->u.infix.k == KS_AMP2EQU,
						false, skip);
					if (pe.type == PER_ERROR){
						lvr_free(lp.u.lv);
						label_free(skip);
						return pe;
					}

					pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.right);
					if (pe.type == PER_ERROR){
						lvr_free(lp.u.lv);
						label_free(skip);
						return pe;
					}

					pe = program_lvalCondAssign(prg, sym, lp.u.lv, ex->u.infix.k == KS_AMP2EQU,
						pe.u.vlc);
					if (pe.type == PER_ERROR){
						lvr_free(lp.u.lv);
						label_free(skip);
						return pe;
					}

					if (mode == PEM_EMPTY){
						label_declare(skip, prg->ops);
						lval_clearTemps(lp.u.lv, sym);
						lvr_free(lp.u.lv);
						label_free(skip);
						return per_ok(VARLOC_NULL);
					}

					label_declare(skip, prg->ops);

					if (mode == PEM_CREATE){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR){
							lvr_free(lp.u.lv);
							label_free(skip);
							return per_error(ex->flp, ts.u.msg);
						}
						intoVlc = ts.u.vlc;
					}

					per_st ple = program_lvalGet(prg, sym, PLM_INTO, intoVlc, lp.u.lv);
					if (ple.type == PER_ERROR){
						lvr_free(lp.u.lv);
						label_free(skip);
						return ple;
					}

					lval_clearTemps(lp.u.lv, sym);
					lvr_free(lp.u.lv);
					label_free(skip);
					return per_ok(intoVlc);
				}

				// special handling for basic variable assignment to avoid a temporary
				if (ex->u.infix.k == KS_EQU && lp.u.lv->type == LVR_VAR){
					per_st pe = program_eval(prg, sym, PEM_INTO, lp.u.lv->vlc, ex->u.infix.right);
					if (pe.type == PER_ERROR){
						lvr_free(lp.u.lv);
						return pe;
					}
					if (mode == PEM_EMPTY){
						lvr_free(lp.u.lv);
						return per_ok(VARLOC_NULL);
					}
					else if (mode == PEM_CREATE){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR){
							lvr_free(lp.u.lv);
							return per_error(ex->flp, ts.u.msg);
						}
						intoVlc = ts.u.vlc;
					}
					op_move(prg->ops, intoVlc, lp.u.lv->vlc);
					lvr_free(lp.u.lv);
					return per_ok(intoVlc);
				}

				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.right);
				if (pe.type == PER_ERROR){
					lvr_free(lp.u.lv);
					return pe;
				}
				pe = program_evalLval(prg, sym, mode, intoVlc, lp.u.lv, mutop, pe.u.vlc, true);
				lvr_free(lp.u.lv);
				return pe;
			}

			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}

			op_enum binop = ks_toBinaryOp(ex->u.infix.k);
			if (binop != OP_INVALID){
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.left);
				if (pe.type == PER_ERROR)
					return pe;
				varloc_st left = pe.u.vlc;
				pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.right);
				if (pe.type == PER_ERROR)
					return pe;
				op_binop(prg->ops, binop, intoVlc, left, pe.u.vlc);
				symtbl_clearTemp(sym, left);
				symtbl_clearTemp(sym, pe.u.vlc);
			}
			else if (ex->u.infix.k == KS_AT){
				if (ex->u.infix.left->type != EXPR_NAMES)
					return per_error(ex->flp, sink_format("Invalid call"));
				stl_st sl = symtbl_lookup(sym, ex->u.infix.left->u.names);
				if (sl.type == STL_ERROR)
					return per_error(ex->flp, sl.u.msg);
				per_st pe = program_evalCall(prg, sym, PEM_INTO, intoVlc, ex->flp, sl.u.nsn, true,
					ex->u.infix.right);
				if (pe.type == PER_ERROR)
					return pe;
			}
			else if (ex->u.infix.k == KS_AMP2 || ex->u.infix.k == KS_PIPE2){
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.left);
				if (pe.type == PER_ERROR)
					return pe;
				varloc_st left = pe.u.vlc;
				label useleft = label_newStr("^useleft");
				if (ex->u.infix.k == KS_AMP2)
					label_jumpFalse(useleft, prg->ops, left);
				else
					label_jumpTrue(useleft, prg->ops, left);
				pe = program_eval(prg, sym, PEM_INTO, intoVlc, ex->u.infix.right);
				if (pe.type == PER_ERROR){
					label_free(useleft);
					return pe;
				}
				label finish = label_newStr("^finish");
				label_jump(finish, prg->ops);
				label_declare(useleft, prg->ops);
				op_move(prg->ops, intoVlc, left);
				label_declare(finish, prg->ops);
				symtbl_clearTemp(sym, left);
				label_free(useleft);
				label_free(finish);
			}
			else
				return per_error(ex->flp, sink_format("Invalid operation"));

			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(VARLOC_NULL);
			}
			return per_ok(intoVlc);
		} break;

		case EXPR_CALL: {
			if (ex->u.call.cmd->type != EXPR_NAMES)
				return per_error(ex->flp, sink_format("Invalid call"));
			stl_st sl = symtbl_lookup(sym, ex->u.call.cmd->u.names);
			if (sl.type == STL_ERROR)
				return per_error(ex->flp, sl.u.msg);
			return program_evalCall(prg, sym, mode, intoVlc, ex->flp, sl.u.nsn, false,
				ex->u.call.params);
		} break;

		case EXPR_INDEX: {
			if (mode == PEM_EMPTY){
				per_st pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, ex->u.index.obj);
				if (pe.type == PER_ERROR)
					return pe;
				pe = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, ex->u.index.key);
				if (pe.type == PER_ERROR)
					return pe;
				return per_ok(VARLOC_NULL);
			}
			else if (mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}

			per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.index.obj);
			if (pe.type == PER_ERROR)
				return pe;
			varloc_st obj = pe.u.vlc;

			pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.index.key);
			if (pe.type == PER_ERROR)
				return pe;
			varloc_st key = pe.u.vlc;

			op_getat(prg->ops, intoVlc, obj, key);
			symtbl_clearTemp(sym, obj);
			symtbl_clearTemp(sym, key);
			return per_ok(intoVlc);
		} break;

		case EXPR_SLICE: {
			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}

			per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.slice.obj);
			if (pe.type == PER_ERROR)
				return pe;
			varloc_st obj = pe.u.vlc;

			psr_st sr = program_slice(prg, sym, ex);
			if (sr.type == PSR_ERROR)
				return per_error(sr.u.error.flp, sr.u.error.msg);

			op_slice(prg->ops, intoVlc, obj, sr.u.ok.start, sr.u.ok.len);
			symtbl_clearTemp(sym, obj);
			symtbl_clearTemp(sym, sr.u.ok.start);
			symtbl_clearTemp(sym, sr.u.ok.len);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(VARLOC_NULL);
			}
			return per_ok(intoVlc);
		} break;
	}
	assert(false);
	return per_ok(VARLOC_NULL);
}

typedef struct {
	void *state;
	free_func f_free;
} pgst_st, *pgst;

static inline void pgst_free(pgst pgs){
	if (pgs->f_free)
		pgs->f_free(pgs->state);
	mem_free(pgs);
}

static inline pgst pgst_new(void *state, free_func f_free){
	pgst pgs = mem_alloc(sizeof(pgst_st));
	pgs->state = state;
	pgs->f_free = f_free;
	return pgs;
}

typedef enum {
	PGR_OK,
	PGR_PUSH,
	PGR_POP,
	PGR_ERROR,
	PGR_FORVARS
} pgr_enum;

typedef struct {
	pgr_enum type;
	union {
		struct {
			pgst pgs;
		} push;
		struct {
			filepos_st flp;
			char *msg;
		} error;
		struct {
			varloc_st val_vlc;
			varloc_st idx_vlc;
		} forvars;
	} u;
} pgr_st;

static inline pgr_st pgr_ok(){
	return (pgr_st){ .type = PGR_OK };
}

static inline pgr_st pgr_push(void *state, free_func f_free){
	return (pgr_st){ .type = PGR_PUSH, .u.push.pgs = pgst_new(state, f_free) };
}

static inline pgr_st pgr_pop(){
	return (pgr_st){ .type = PGR_POP };
}

static inline pgr_st pgr_error(filepos_st flp, char *msg){
	return (pgr_st){ .type = PGR_ERROR, .u.error.flp = flp, .u.error.msg = msg };
}

static inline pgr_st pgr_forvars(varloc_st val_vlc, varloc_st idx_vlc){
	return (pgr_st){ .type = PGR_FORVARS, .u.forvars.val_vlc = val_vlc,
		.u.forvars.idx_vlc = idx_vlc };
}

typedef struct {
	label top;
	label cond;
	label finish;
} pgs_dowhile_st, *pgs_dowhile;

static inline void pgs_dowhile_free(pgs_dowhile pst){
	if (pst->top)
		label_free(pst->top);
	label_free(pst->cond);
	label_free(pst->finish);
	mem_free(pst);
}

static inline pgs_dowhile pgs_dowhile_new(label top, label cond, label finish){
	pgs_dowhile pst = mem_alloc(sizeof(pgs_dowhile_st));
	pst->top = top;
	pst->cond = cond;
	pst->finish = finish;
	return pst;
}

typedef struct {
	label top;
	label inc;
	label finish;
	varloc_st t1;
	varloc_st t2;
	varloc_st t3;
	varloc_st t4;
	varloc_st idx_vlc;
} pgs_for_st, *pgs_for;

static inline void pgs_for_free(pgs_for pst){
	label_free(pst->top);
	label_free(pst->inc);
	label_free(pst->finish);
	mem_free(pst);
}

static inline pgs_for pgs_for_new(varloc_st t1, varloc_st t2, varloc_st t3, varloc_st t4,
	varloc_st idx_vlc, label top, label inc, label finish){
	pgs_for pst = mem_alloc(sizeof(pgs_for_st));
	pst->t1 = t1;
	pst->t2 = t2;
	pst->t3 = t3;
	pst->t4 = t4;
	pst->idx_vlc = idx_vlc;
	pst->top = top;
	pst->inc = inc;
	pst->finish = finish;
	return pst;
}

typedef struct {
	label lcont;
	label lbrk;
} pgs_loop_st, *pgs_loop;

static inline void pgs_loop_free(pgs_loop pst){
	label_free(pst->lcont);
	label_free(pst->lbrk);
	mem_free(pst);
}

static inline pgs_loop pgs_loop_new(label lcont, label lbrk){
	pgs_loop pst = mem_alloc(sizeof(pgs_loop_st));
	pst->lcont = lcont;
	pst->lbrk = lbrk;
	return pst;
}

typedef struct {
	label nextcond;
	label ifdone;
} pgs_if_st, *pgs_if;

static inline void pgs_if_free(pgs_if pst){
	if (pst->nextcond)
		label_free(pst->nextcond);
	label_free(pst->ifdone);
	mem_free(pst);
}

static inline pgs_if pgs_if_new(label nextcond, label ifdone){
	pgs_if pst = mem_alloc(sizeof(pgs_if_st));
	pst->nextcond = nextcond;
	pst->ifdone = ifdone;
	return pst;
}

static pgr_st program_forVars(symtbl sym, ast stmt){
	varloc_st val_vlc;
	varloc_st idx_vlc;

	// load VLC's for the value and index
	if (stmt->u.for1.forVar){
		sta_st sr = symtbl_addVar(sym, stmt->u.for1.names1);
		if (sr.type == STA_ERROR)
			return pgr_error(stmt->flp, sr.u.msg);
		val_vlc = sr.u.vlc;

		if (stmt->u.for1.names2 == NULL){
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt->flp, ts.u.msg);
			idx_vlc = ts.u.vlc;
		}
		else{
			sr = symtbl_addVar(sym, stmt->u.for1.names2);
			if (sr.type == STA_ERROR)
				return pgr_error(stmt->flp, sr.u.msg);
			idx_vlc = sr.u.vlc;
		}
	}
	else{
		stl_st sl = symtbl_lookup(sym, stmt->u.for1.names1);
		if (sl.type == STL_ERROR)
			return pgr_error(stmt->flp, sl.u.msg);
		if (sl.u.nsn->type != NSN_VAR)
			return pgr_error(stmt->flp, sink_format("Cannot use non-variable in for loop"));
		val_vlc = varloc_new(frame_diff(sl.u.nsn->u.var.fr, sym->fr), sl.u.nsn->u.var.index);

		if (stmt->u.for1.names2 == NULL){
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt->flp, ts.u.msg);
			idx_vlc = ts.u.vlc;
		}
		else{
			sl = symtbl_lookup(sym, stmt->u.for1.names2);
			if (sl.type == STL_ERROR)
				return pgr_error(stmt->flp, sl.u.msg);
			if (sl.u.nsn->type != NSN_VAR){
				return pgr_error(stmt->flp,
					sink_format("Cannot use non-variable in for loop"));
			}
			idx_vlc = varloc_new(frame_diff(sl.u.nsn->u.var.fr, sym->fr), sl.u.nsn->u.var.index);
		}
	}
	return pgr_forvars(val_vlc, idx_vlc);
}

static pgr_st program_genForRange(program prg, symtbl sym, ast stmt, varloc_st p1, varloc_st p2,
	varloc_st p3){
	bool zerostart = false;
	if (varloc_isnull(p2)){
		zerostart = true;
		p2 = p1;
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return pgr_error(stmt->flp, ts.u.msg);
		p1 = ts.u.vlc;
		op_num(prg->ops, p1, 0);
	}

	symtbl_pushScope(sym);
	pgr_st pgi = program_forVars(sym, stmt);
	if (pgi.type != PGR_FORVARS)
		return pgi;
	varloc_st val_vlc = pgi.u.forvars.val_vlc;
	varloc_st idx_vlc = pgi.u.forvars.idx_vlc;

	// clear the index
	op_num(prg->ops, idx_vlc, 0);

	// calculate count
	if (!zerostart)
		op_binop(prg->ops, OP_NUM_SUB, p2, p2, p1);
	if (!varloc_isnull(p3))
		op_binop(prg->ops, OP_NUM_DIV, p2, p2, p3);

	label top    = label_newStr("^forR_top");
	label inc    = label_newStr("^forR_inc");
	label finish = label_newStr("^forR_finish");

	sta_st ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR){
		label_free(top);
		label_free(inc);
		label_free(finish);
		return pgr_error(stmt->flp, ts.u.msg);
	}
	varloc_st t = ts.u.vlc;

	label_declare(top, prg->ops);

	op_binop(prg->ops, OP_LT, t, idx_vlc, p2);
	label_jumpFalse(finish, prg->ops, t);

	if (varloc_isnull(p3)){
		if (!zerostart)
			op_binop(prg->ops, OP_NUM_ADD, val_vlc, p1, idx_vlc);
		else
			op_move(prg->ops, val_vlc, idx_vlc);
	}
	else{
		op_binop(prg->ops, OP_NUM_MUL, val_vlc, idx_vlc, p3);
		if (!zerostart)
			op_binop(prg->ops, OP_NUM_ADD, val_vlc, p1, val_vlc);
	}

	sym->sc->lblBreak = finish;
	sym->sc->lblContinue = inc;

	return pgr_push(pgs_for_new(p1, p2, p3, t, idx_vlc, top, inc, finish), (free_func)pgs_for_free);
}

static pgr_st program_genForGeneric(program prg, symtbl sym, ast stmt){
	per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, stmt->u.for1.ex);
	if (pe.type == PER_ERROR)
		return pgr_error(pe.u.error.flp, pe.u.error.msg);

	symtbl_pushScope(sym);

	varloc_st exp_vlc = pe.u.vlc;

	pgr_st pgi = program_forVars(sym, stmt);
	if (pgi.type != PGR_FORVARS)
		return pgi;
	varloc_st val_vlc = pgi.u.forvars.val_vlc;
	varloc_st idx_vlc = pgi.u.forvars.idx_vlc;

	// clear the index
	op_num(prg->ops, idx_vlc, 0);

	label top    = label_newStr("^forG_top");
	label inc    = label_newStr("^forG_inc");
	label finish = label_newStr("^forG_finish");

	sta_st ts = symtbl_addTemp(sym);
	if (ts.type == STA_ERROR){
		label_free(top);
		label_free(inc);
		label_free(finish);
		return pgr_error(stmt->flp, ts.u.msg);
	}
	varloc_st t = ts.u.vlc;

	label_declare(top, prg->ops);

	op_unop(prg->ops, OP_SIZE, t, exp_vlc);
	op_binop(prg->ops, OP_LT, t, idx_vlc, t);
	label_jumpFalse(finish, prg->ops, t);

	op_getat(prg->ops, val_vlc, exp_vlc, idx_vlc);
	sym->sc->lblBreak = finish;
	sym->sc->lblContinue = inc;

	return pgr_push(pgs_for_new(t, exp_vlc, val_vlc, VARLOC_NULL, idx_vlc, top, inc, finish),
		(free_func)pgs_for_free);
}

static inline pgr_st program_gen(program prg, symtbl sym, ast stmt, void *state, bool sayexpr){
	switch (stmt->type){
		case AST_BREAK: {
			if (sym->sc->lblBreak == NULL)
				return pgr_error(stmt->flp, sink_format("Invalid `break`"));
			label_jump(sym->sc->lblBreak, prg->ops);
			return pgr_ok();
		} break;

		case AST_CONTINUE: {
			if (sym->sc->lblContinue == NULL)
				return pgr_error(stmt->flp, sink_format("Invalid `continue`"));
			label_jump(sym->sc->lblContinue, prg->ops);
			return pgr_ok();
		} break;

		case AST_DECLARE: {
			decl dc = stmt->u.declare.dc;
			switch (dc->type){
				case DECL_LOCAL: {
					label lbl = label_newStr("^def");
					list_ptr_push(sym->fr->lbls, lbl);
					sta_st sr = symtbl_addCmdLocal(sym, dc->names, lbl);
					if (sr.type == STA_ERROR)
						return pgr_error(stmt->flp, sr.u.msg);
				} break;
				case DECL_NATIVE: {
					bool found = false;
					uint64_t hash = native_hash(dc->key->size, dc->key->bytes);
					int index;
					for (index = 0; index < prg->keyTable->size; index++){
						found = prg->keyTable->vals[index] == hash;
						if (found)
							break;
					}
					if (!found){
						if (index >= 65536)
							return pgr_error(stmt->flp, sink_format("Too many native functions"));
						list_u64_push(prg->keyTable, hash);
					}
					sta_st sr = symtbl_addCmdNative(sym, dc->names, index);
					if (sr.type == STA_ERROR)
						return pgr_error(stmt->flp, sr.u.msg);
				} break;
			}
			return pgr_ok();
		} break;

		case AST_DEF1: {
			nl_st n = namespace_lookupImmediate(sym->sc->ns, stmt->u.def1.names);
			label lbl;
			if (n.type == NL_FOUND && n.nsn->type == NSN_CMD_LOCAL){
				lbl = n.nsn->u.cmdLocal.lbl;
				if (!sym->repl && lbl->pos >= 0){ // if already defined, error
					list_byte b = stmt->u.def1.names->ptrs[0];
					char *join = sink_format("Cannot redefine: %.*s", b->size, b->bytes);
					for (int i = 1; i < stmt->u.def1.names->size; i++){
						b = stmt->u.def1.names->ptrs[i];
						char *join2 = sink_format("%s.%.*s", join, b->size, b->bytes);
						mem_free(join);
						join = join2;
					}
					return pgr_error(stmt->flp, join);
				}
			}
			else{
				lbl = label_newStr("^def");
				list_ptr_push(sym->fr->lbls, lbl);
				sta_st sr = symtbl_addCmdLocal(sym, stmt->u.def1.names, lbl);
				if (sr.type == STA_ERROR)
					return pgr_error(stmt->flp, sr.u.msg);
			}

			label skip = label_newStr("^after_def");
			label_jump(skip, prg->ops);

			label_declare(lbl, prg->ops);
			symtbl_pushFrame(sym);

			if (stmt->u.def1.lvalues->size > 0){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR){
					label_free(skip);
					return pgr_error(stmt->flp, ts.u.msg);
				}
				varloc_st t = ts.u.vlc;
				varloc_st args = varloc_new(0, 0);
				for (int i = 0; i < stmt->u.def1.lvalues->size; i++){
					expr ex = stmt->u.def1.lvalues->ptrs[i];
					if (ex->type == EXPR_INFIX){
						// init code has to happen first, because we want name resolution to be
						// as though these variables haven't been defined yet... so a bit of goofy
						// jumping, but not bad
						per_st pr;
						label perfinit = NULL;
						label doneinit = NULL;
						if (ex->u.infix.right != NULL){
							perfinit = label_newStr("^perfinit");
							doneinit = label_newStr("^doneinit");
							label skipinit = label_newStr("^skipinit");
							label_jump(skipinit, prg->ops);
							label_declare(perfinit, prg->ops);
							pr = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.right);
							if (pr.type == PER_ERROR){
								label_free(skip);
								label_free(perfinit);
								label_free(doneinit);
								label_free(skipinit);
								return pgr_error(pr.u.error.flp, pr.u.error.msg);
							}
							label_jump(doneinit, prg->ops);
							label_declare(skipinit, prg->ops);
							label_free(skipinit);
						}

						// now we can add the param symbols
						lvp_st lr = lval_addVars(sym, ex->u.infix.left);
						if (lr.type == LVP_ERROR){
							label_free(skip);
							if (perfinit)
								label_free(perfinit);
							if (doneinit)
								label_free(doneinit);
							return pgr_error(lr.u.error.flp, lr.u.error.msg);
						}

						// and grab the appropriate value from the args
						op_num(prg->ops, t, i);
						op_getat(prg->ops, t, args, t); // 0:0 are passed in arguments

						label finish = NULL;
						if (ex->u.infix.right != NULL){
							finish = label_newStr("^finish");
							label passinit = label_newStr("^passinit");
							label_jumpFalse(perfinit, prg->ops, t);
							label_jump(passinit, prg->ops);
							label_declare(doneinit, prg->ops);
							per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lr.u.lv,
								OP_INVALID, pr.u.vlc, true);
							if (pe.type == PER_ERROR){
								lvr_free(lr.u.lv);
								label_free(skip);
								label_free(perfinit);
								label_free(doneinit);
								label_free(finish);
								label_free(passinit);
								return pgr_error(pe.u.error.flp, pe.u.error.msg);
							}
							label_jump(finish, prg->ops);
							label_declare(passinit, prg->ops);
							label_free(perfinit);
							label_free(doneinit);
							label_free(passinit);
						}

						per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lr.u.lv,
							OP_INVALID, t, true);
						lvr_free(lr.u.lv);
						if (pe.type == PER_ERROR){
							label_free(skip);
							if (finish)
								label_free(finish);
							return pgr_error(pe.u.error.flp, pe.u.error.msg);
						}
						if (ex->u.infix.right != NULL){
							label_declare(finish, prg->ops);
							label_free(finish);
						}
					}
					else if (i == stmt->u.def1.lvalues->size - 1 && ex->type == EXPR_PREFIX &&
						ex->u.prefix.k == KS_PERIOD3){
						lvp_st lr = lval_addVars(sym, ex->u.prefix.ex);
						if (lr.type == LVP_ERROR){
							label_free(skip);
							return pgr_error(lr.u.error.flp, lr.u.error.msg);
						}
						assert(lr.u.lv->type == LVR_VAR);
						ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR){
							label_free(skip);
							return pgr_error(stmt->flp, ts.u.msg);
						}
						varloc_st t2 = ts.u.vlc;
						op_num(prg->ops, t, i);
						op_nil(prg->ops, t2);
						op_slice(prg->ops, lr.u.lv->vlc, args, t, t2);
						lvr_free(lr.u.lv);
						symtbl_clearTemp(sym, t2);
					}
					else
						assert(false);
				}
				symtbl_clearTemp(sym, t);
			}
			return pgr_push(skip, (free_func)label_free);
		} break;

		case AST_DEF2: {
			sta_st ts = symtbl_addTemp(sym);
			if (ts.type == STA_ERROR)
				return pgr_error(stmt->flp, ts.u.msg);
			varloc_st nil = ts.u.vlc;
			op_nil(prg->ops, nil);
			op_return(prg->ops, nil);
			symtbl_clearTemp(sym, nil);

			symtbl_popFrame(sym);
			label skip = state;
			label_declare(skip, prg->ops);
			return pgr_pop();
		} break;

		case AST_DOWHILE1: {
			label top    = label_newStr("^dowhile_top");
			label cond   = label_newStr("^dowhile_cond");
			label finish = label_newStr("^dowhile_finish");

			symtbl_pushScope(sym);
			sym->sc->lblBreak = finish;
			sym->sc->lblContinue = cond;

			label_declare(top, prg->ops);
			return pgr_push(pgs_dowhile_new(top, cond, finish), (free_func)pgs_dowhile_free);
		} break;

		case AST_DOWHILE2: {
			pgs_dowhile pst = state;

			label_declare(pst->cond, prg->ops);
			if (stmt->u.dowhile2.cond){
				// do while end
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, stmt->u.dowhile2.cond);
				if (pe.type == PER_ERROR)
					return pgr_error(pe.u.error.flp, pe.u.error.msg);
				label_jumpFalse(pst->finish, prg->ops, pe.u.vlc);
				symtbl_clearTemp(sym, pe.u.vlc);
				sym->sc->lblContinue = pst->top;
				return pgr_ok();
			}
			else{
				// do end
				label_free(pst->top);
				pst->top = NULL;
				return pgr_ok();
			}
		} break;

		case AST_DOWHILE3: {
			pgs_dowhile pst = state;

			if (pst->top)
				label_jump(pst->top, prg->ops);
			label_declare(pst->finish, prg->ops);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_FOR1: {
			if (stmt->u.for1.ex->type == EXPR_CALL){
				expr c = stmt->u.for1.ex;
				if (c->u.call.cmd->type == EXPR_NAMES){
					expr n = c->u.call.cmd;
					if (n->u.names->size == 1 && byteequ(n->u.names->ptrs[0], "range")){
						expr p = c->u.call.params;
						varloc_st rp[3] = { VARLOC_NULL, VARLOC_NULL, VARLOC_NULL };
						if (p->type != EXPR_GROUP){
							per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, p);
							if (pe.type == PER_ERROR)
								return pgr_error(pe.u.error.flp, pe.u.error.msg);
							rp[0] = pe.u.vlc;
						}
						else{
							for (int i = 0; i < p->u.group->size; i++){
								per_st pe = program_eval(prg, sym,
									i < 3 ? PEM_CREATE : PEM_EMPTY,
									VARLOC_NULL, p->u.group->ptrs[i]);
								if (pe.type == PER_ERROR)
									return pgr_error(pe.u.error.flp, pe.u.error.msg);
								if (i < 3)
									rp[i] = pe.u.vlc;
							}
						}
						return program_genForRange(prg, sym, stmt, rp[0], rp[1], rp[2]);
					}
				}
			}
			return program_genForGeneric(prg, sym, stmt);
		} break;

		case AST_FOR2: {
			pgs_for pst = state;

			label_declare(pst->inc, prg->ops);
			op_inc(prg->ops, pst->idx_vlc);
			label_jump(pst->top, prg->ops);

			label_declare(pst->finish, prg->ops);
			symtbl_clearTemp(sym, pst->t1);
			symtbl_clearTemp(sym, pst->t2);
			if (!varloc_isnull(pst->t3))
				symtbl_clearTemp(sym, pst->t3);
			if (!varloc_isnull(pst->t4))
				symtbl_clearTemp(sym, pst->t4);
			symtbl_clearTemp(sym, pst->idx_vlc);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_LOOP1: {
			symtbl_pushScope(sym);
			label lcont = label_newStr("^loop_continue");
			label lbrk = label_newStr("^loop_break");
			sym->sc->lblContinue = lcont;
			sym->sc->lblBreak = lbrk;
			label_declare(lcont, prg->ops);
			return pgr_push(pgs_loop_new(lcont, lbrk), (free_func)pgs_loop_free);
		} break;

		case AST_LOOP2: {
			pgs_loop pst = state;

			label_jump(pst->lcont, prg->ops);
			label_declare(pst->lbrk, prg->ops);
			symtbl_popScope(sym);
			return pgr_pop();
		} break;

		case AST_GOTO: {
			for (int i = 0; i < sym->fr->lbls->size; i++){
				label lbl = sym->fr->lbls->ptrs[i];
				if (list_byte_equ(lbl->name, stmt->u.agoto.ident)){
					label_jump(lbl, prg->ops);
					return pgr_ok();
				}
			}
			// label doesn't exist yet, so we'll need to create it
			label lbl = label_new(stmt->u.agoto.ident);
			stmt->u.agoto.ident = NULL;
			label_jump(lbl, prg->ops);
			list_ptr_push(sym->fr->lbls, lbl);
			return pgr_ok();
		} break;

		case AST_IF1: {
			return pgr_push(pgs_if_new(NULL, label_newStr("^ifdone")), (free_func)pgs_if_free);
		} break;

		case AST_IF2: {
			pgs_if pst = state;

			if (pst->nextcond){
				symtbl_popScope(sym);
				label_jump(pst->ifdone, prg->ops);

				label_declare(pst->nextcond, prg->ops);
				label_free(pst->nextcond);
			}
			pst->nextcond = label_newStr("^nextcond");
			per_st pr = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, stmt->u.if2.cond);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.u.error.flp, pr.u.error.msg);

			label_jumpFalse(pst->nextcond, prg->ops, pr.u.vlc);
			symtbl_clearTemp(sym, pr.u.vlc);

			symtbl_pushScope(sym);
			return pgr_ok();
		} break;

		case AST_IF3: {
			pgs_if pst = state;

			symtbl_popScope(sym);
			label_jump(pst->ifdone, prg->ops);

			label_declare(pst->nextcond, prg->ops);
			symtbl_pushScope(sym);
			return pgr_ok();
		} break;

		case AST_IF4: {
			pgs_if pst = state;

			symtbl_popScope(sym);
			label_declare(pst->ifdone, prg->ops);
			return pgr_pop();
		} break;

		case AST_INCLUDE: {
			assert(false);
		} break;

		case AST_NAMESPACE1: {
			spn_st sr = symtbl_pushNamespace(sym, stmt->u.namespace1.names);
			if (sr.type == SPN_ERROR)
				return pgr_error(stmt->flp, sr.msg);
			return pgr_push(NULL, NULL);
		} break;

		case AST_NAMESPACE2: {
			symtbl_popNamespace(sym);
			return pgr_pop();
		} break;

		case AST_RETURN: {
			nsname nsn = NULL;
			expr params = NULL;
			expr ex = stmt->u.areturn.ex;

			// check for tail call
			if (ex->type == EXPR_CALL){
				if (ex->u.call.cmd->type != EXPR_NAMES)
					return pgr_error(ex->flp, sink_format("Invalid call"));
				stl_st sl = symtbl_lookup(sym, ex->u.call.cmd->u.names);
				if (sl.type == STL_ERROR)
					return pgr_error(ex->flp, sl.u.msg);
				nsn = sl.u.nsn;
				params = ex->u.call.params;
			}
			else if (ex->type == EXPR_NAMES){
				stl_st sl = symtbl_lookup(sym, ex->u.names);
				if (sl.type == STL_ERROR)
					return pgr_error(ex->flp, sl.u.msg);
				nsn = sl.u.nsn;
			}

			// can only tail call local commands at the same lexical level
			if (nsn != NULL && nsn->type == NSN_CMD_LOCAL &&
				frame_diff(nsn->u.cmdLocal.fr, sym->fr) == 1){
				expr x = expr_list(ex->flp, params);
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, x);
				x->u.ex = NULL;
				expr_free(x);
				if (pe.type == PER_ERROR)
					return pgr_error(pe.u.error.flp, pe.u.error.msg);
				label_returntail(nsn->u.cmdLocal.lbl, prg->ops, pe.u.vlc);
				symtbl_clearTemp(sym, pe.u.vlc);
				return pgr_ok();
			}

			per_st pr = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex);
			if (pr.type == PER_ERROR)
				return pgr_error(pr.u.error.flp, pr.u.error.msg);
			symtbl_clearTemp(sym, pr.u.vlc);
			op_return(prg->ops, pr.u.vlc);
			return pgr_ok();
		} break;

		case AST_USING: {
			stl_st sl = symtbl_lookup(sym, stmt->u.using.names);
			if (sl.type == STL_ERROR)
				return pgr_error(stmt->flp, sl.u.msg);
			if (sl.u.nsn->type != NSN_NAMESPACE)
				return pgr_error(stmt->flp, sink_format("Expecting namespace"));
			if (!list_ptr_has(sym->sc->ns->usings, sl.u.nsn->u.ns))
				list_ptr_push(sym->sc->ns->usings, sl.u.nsn->u.ns);
			return pgr_ok();
		} break;

		case AST_VAR: {
			for (int i = 0; i < stmt->u.var.lvalues->size; i++){
				expr ex = stmt->u.var.lvalues->ptrs[i];
				assert(ex->type == EXPR_INFIX);
				per_st pr;
				if (ex->u.infix.right != NULL){
					pr = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.right);
					if (pr.type == PER_ERROR)
						return pgr_error(pr.u.error.flp, pr.u.error.msg);
				}
				lvp_st lr = lval_addVars(sym, ex->u.infix.left);
				if (lr.type == LVP_ERROR)
					return pgr_error(lr.u.error.flp, lr.u.error.msg);
				if (ex->u.infix.right != NULL){
					per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lr.u.lv,
						OP_INVALID, pr.u.vlc, true);
					lvr_free(lr.u.lv);
					if (pe.type == PER_ERROR)
						return pgr_error(pe.u.error.flp, pe.u.error.msg);
					symtbl_clearTemp(sym, pr.u.vlc);
				}
				else
					lvr_free(lr.u.lv);
			}
			return pgr_ok();
		} break;

		case AST_EVAL: {
			if (sayexpr){
				per_st pr = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, stmt->u.eval.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.u.error.flp, pr.u.error.msg);
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return pgr_error(stmt->flp, ts.u.msg);
				varloc_st t = ts.u.vlc;
				op_list(prg->ops, t, 1);
				op_param2(prg->ops, OP_LIST_PUSH, t, t, pr.u.vlc);
				op_param1(prg->ops, OP_SAY, t, t);
				symtbl_clearTemp(sym, t);
				symtbl_clearTemp(sym, pr.u.vlc);
			}
			else{
				per_st pr = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, stmt->u.eval.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.u.error.flp, pr.u.error.msg);
			}
			return pgr_ok();
		} break;

		case AST_LABEL: {
			label lbl;
			bool found = false;
			for (int i = 0; i < sym->fr->lbls->size; i++){
				lbl = sym->fr->lbls->ptrs[i];
				if (list_byte_equ(lbl->name, stmt->u.label.ident)){
					if (lbl->pos >= 0){
						return pgr_error(stmt->flp, sink_format("Cannot redeclare label \"%.*s\"",
							stmt->u.label.ident->size, stmt->u.label.ident->bytes));
					}
					found = true;
					break;
				}
			}
			if (!found){
				lbl = label_new(stmt->u.label.ident);
				stmt->u.label.ident = NULL;
				list_ptr_push(sym->fr->lbls, lbl);
			}
			label_declare(lbl, prg->ops);
			return pgr_ok();
		} break;
	}
	assert(false);
	return pgr_ok();
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//
// runtime
//
////////////////////////////////////////////////////////////////////////////////////////////////////

//
// values
//

static inline void bmp_setbit(uint64_t *bmp, int index){
	((bmp)[(index) / 64] |= (UINT64_C(1) << ((index) % 64)));
}

static inline bool bmp_hasbit(uint64_t *bmp, int index){
	return ((bmp)[(index) / 64] & (UINT64_C(1) << ((index) % 64)));
}

static inline int bmp_alloc(uint64_t *bmp, int count){
	// search for the first 0 bit, flip it to 1, then return the position
	// return -1 if nothing found
	int loop = 0;
	while (count > 0){
		if (*bmp == UINT64_C(0xFFFFFFFFFFFFFFFF)){
			loop++;
			count -= 64;
			bmp++;
			continue;
		}

	#ifdef BITSCAN_FFSLL
		int pos = ffsll(~*bmp) - 1;
		*bmp |= 1LL << pos;
		return loop * 64 + pos;
	#else
	#	error Don't know how to implement bmp_alloc
	#endif

	}
	return -1;
}

static int bmp_reserve(void **tbl, int *size, uint64_t **aloc, uint64_t **ref, uint64_t **tick,
	size_t st_size){
	int index = bmp_alloc(*aloc, *size);
	if (index >= 0)
		return index;
	if (*size >= 0x3FFFFFFF){
		SINK_PANIC("Out of memory!");
		return -1;
	}
	int new_count = *size * 2;
	*tbl = mem_realloc(*tbl, st_size * new_count);
	*aloc = mem_realloc(*aloc, sizeof(uint64_t) * (new_count / 64));
	memset(&(*aloc)[*size / 64], 0, sizeof(uint64_t) * (*size / 64));
	*ref = mem_realloc(*ref, sizeof(uint64_t) * (new_count / 64));
	memset(&(*ref)[*size / 64], 0, sizeof(uint64_t) * *size / 64);
	if (tick){
		*tick = mem_realloc(*tick, sizeof(uint64_t) * (new_count / 64));
		memset(&(*tick)[*size / 64], 0, sizeof(uint64_t) * (*size / 64));
	}
	*size = new_count;
	(*aloc)[new_count / 128] |= 1;
	return new_count / 2;
}

//
// context
//

typedef struct {
	int pc;
	int fdiff;
	int index;
	int lex_index;
} ccs_st, *ccs;

static inline void ccs_free(ccs c){
	mem_free(c);
}

static inline ccs ccs_new(int pc, int fdiff, int index, int lex_index){
	ccs c = mem_alloc(sizeof(ccs_st));
	c->pc = pc;
	c->fdiff = fdiff;
	c->index = index;
	c->lex_index = lex_index;
	return c;
}

typedef struct lxs_struct lxs_st, *lxs;
struct lxs_struct {
	sink_val vals[256];
	lxs next;
};

static inline void lxs_free(lxs ls){
	mem_free(ls);
}

static void lxs_freeAll(lxs ls){
	lxs here = ls;
	while (here){
		lxs del = here;
		here = here->next;
		lxs_free(del);
	}
}

static inline lxs lxs_new(sink_val args, lxs next){
	lxs ls = mem_alloc(sizeof(lxs_st));
	ls->vals[0] = args;
	for (int i = 1; i < 256; i++)
		ls->vals[i] = SINK_NIL;
	ls->next = next;
	return ls;
}

typedef struct {
	void *natuser;
	sink_native_func f_native;
	uint64_t hash;
} native_st, *native;

static inline native native_new(uint64_t hash, void *natuser, sink_native_func f_native){
	native nat = mem_alloc(sizeof(native_st));
	nat->hash = hash;
	nat->natuser = natuser;
	nat->f_native = f_native;
	return nat;
}

typedef struct {
	void *user;
	sink_free_func f_freeuser;
	cleanup cup;
	list_ptr natives;

	program prg; // not freed by context_free
	list_ptr call_stk;
	list_ptr lex_stk;
	list_ptr f_finalize;
	list_ptr user_hint;

	sink_io_st io;

	sink_str_st *str_tbl;
	sink_list_st *list_tbl;

	uint64_t *str_aloc;
	uint64_t *list_aloc;

	uint64_t *str_ref;
	uint64_t *list_ref;

	uint64_t *list_tick;

	int lex_index;
	int pc;
	int str_size;
	int list_size;
	int timeout;
	int timeout_left;
	int async_fdiff;
	int async_index;

	uint32_t rand_seed;
	uint32_t rand_i;

	bool passed;
	bool failed;
	bool invalid;
	bool async;
} context_st, *context;

static inline void context_cleanup(context ctx, void *cuser, sink_free_func f_free){
	cleanup_add(ctx->cup, cuser, f_free);
}

static inline void context_native(context ctx, uint64_t hash, void *natuser,
	sink_native_func f_native){
	list_ptr_push(ctx->natives, native_new(hash, natuser, f_native));
}

typedef void (*sweepfree_func)(context ctx, int index);

static void context_sweepfree_str(context ctx, int index){
	if (ctx->str_tbl[index].bytes)
		mem_free(ctx->str_tbl[index].bytes);
}

static void context_sweepfree_list(context ctx, int index){
	sink_list ls = &ctx->list_tbl[index];
	if (ls->usertype >= 0){
		sink_free_func f_free = ctx->f_finalize->ptrs[ls->usertype];
		if (f_free)
			f_free(ls->user);
	}
	if (ls->vals)
		mem_free(ls->vals);
}

static void context_sweephelp(context ctx, int size, uint64_t *aloc, uint64_t *ref,
	sweepfree_func f_free){
	int ms = size / 64;
	for (int i = 0; i < ms; i++){
		if (aloc[i] == ref[i])
			continue;
		int bi = 0;
		for (uint64_t bit = 1; bit != 0; bit <<= 1, bi++){
			// if we're not allocated, or we are referenced, then skip
			if ((aloc[i] & bit) == 0 || (ref[i] & bit) != 0)
				continue;
			// otherwise, free
			aloc[i] ^= bit;
			f_free(ctx, i * 64 + bi);
		}
	}
}

static inline void context_sweep(context ctx){
	context_sweephelp(ctx, ctx->str_size, ctx->str_aloc, ctx->str_ref, context_sweepfree_str);
	context_sweephelp(ctx, ctx->list_size, ctx->list_aloc, ctx->list_ref, context_sweepfree_list);
}

static inline void context_free(context ctx){
	cleanup_free(ctx->cup);
	if (ctx->user && ctx->f_freeuser)
		ctx->f_freeuser(ctx->user);
	list_ptr_free(ctx->natives);
	memset(ctx->str_ref, 0, sizeof(uint64_t) * (ctx->str_size / 64));
	memset(ctx->list_ref, 0, sizeof(uint64_t) * (ctx->list_size / 64));
	context_sweep(ctx);
	list_ptr_free(ctx->call_stk);
	list_ptr_free(ctx->lex_stk);
	list_ptr_free(ctx->f_finalize);
	list_ptr_free(ctx->user_hint);
	mem_free(ctx->list_tbl);
	mem_free(ctx->str_tbl);
	mem_free(ctx->list_aloc);
	mem_free(ctx->str_aloc);
	mem_free(ctx->list_ref);
	mem_free(ctx->str_ref);
	mem_free(ctx->list_tick);
	mem_free(ctx);
}

static void opi_rand_seedauto(context ctx);

static inline context context_new(program prg, sink_io_st io){
	context ctx = mem_alloc(sizeof(context_st));
	ctx->user = NULL;
	ctx->f_freeuser = NULL;
	ctx->cup = cleanup_new();
	ctx->natives = list_ptr_new(mem_free_func);
	ctx->call_stk = list_ptr_new((free_func)ccs_free);
	ctx->lex_stk = list_ptr_new((free_func)lxs_freeAll);
	list_ptr_push(ctx->lex_stk, lxs_new(SINK_NIL, NULL));
	ctx->prg = prg;
	ctx->f_finalize = list_ptr_new(NULL);
	ctx->user_hint = list_ptr_new(NULL);

	ctx->io = io;

	ctx->str_size = 64;
	ctx->list_size = 64;

	ctx->str_tbl = mem_alloc(sizeof(sink_str_st) * ctx->str_size);
	ctx->list_tbl = mem_alloc(sizeof(sink_list_st) * ctx->list_size);

	ctx->str_aloc = mem_alloc(sizeof(uint64_t) * (ctx->str_size / 64));
	memset(ctx->str_aloc, 0, sizeof(uint64_t) * (ctx->str_size / 64));
	ctx->list_aloc = mem_alloc(sizeof(uint64_t) * (ctx->list_size / 64));
	memset(ctx->list_aloc, 0, sizeof(uint64_t) * (ctx->list_size / 64));

	ctx->str_ref = mem_alloc(sizeof(uint64_t) * (ctx->str_size / 64));
	ctx->list_ref = mem_alloc(sizeof(uint64_t) * (ctx->list_size / 64));

	ctx->list_tick = mem_alloc(sizeof(uint64_t) * (ctx->list_size / 64));

	ctx->lex_index = 0;
	ctx->pc = 0;
	ctx->timeout = 0;
	ctx->timeout_left = 0;
	ctx->rand_seed = 0;
	ctx->rand_i = 0;

	ctx->passed = false;
	ctx->failed = false;
	ctx->invalid = false;
	ctx->async = false;

	opi_rand_seedauto(ctx);
	return ctx;
}

static inline bool context_done(context ctx){
	return ctx->passed || ctx->failed || ctx->invalid;
}

static inline sink_run crr_exitpass(context ctx){
	ctx->passed = true;
	return SINK_RUN_PASS;
}

static inline sink_run crr_exitfail(context ctx){
	if (ctx->prg->repl){
		ctx->failed = false;
		ctx->pc = ctx->prg->ops->size;
		return SINK_RUN_REPLMORE;
	}
	ctx->failed = true;
	return SINK_RUN_FAIL;
}

static inline sink_run crr_async(context ctx){
	ctx->async = true;
	return SINK_RUN_ASYNC;
}

static inline sink_run crr_timeout(){
	return SINK_RUN_TIMEOUT;
}

static inline sink_run crr_replmore(){
	return SINK_RUN_REPLMORE;
}

static inline sink_run crr_invalid(context ctx){
	ctx->invalid = true;
	return SINK_RUN_INVALID;
}

static inline void list_cleartick(context ctx){
	memset(ctx->list_tick, 0, sizeof(uint64_t) * (ctx->list_size / 64));
}

static inline bool list_hastick(context ctx, int index){
	if (bmp_hasbit(ctx->list_tick, index))
		return true;
	bmp_setbit(ctx->list_tick, index);
	return false;
}

static inline sink_val var_get(context ctx, int fdiff, int index){
	return ((lxs)ctx->lex_stk->ptrs[ctx->lex_index - fdiff])->vals[index];
}

static inline void var_set(context ctx, int fdiff, int index, sink_val val){
	((lxs)ctx->lex_stk->ptrs[ctx->lex_index - fdiff])->vals[index] = val;
}

static inline int var_index(sink_val v){
	return (int)(v.u & UINT64_C(0x000000007FFFFFFF));
}

static inline sink_str var_caststr(context ctx, sink_val a){
	return &ctx->str_tbl[var_index(a)];
}

static inline sink_list var_castlist(context ctx, sink_val a){
	return &ctx->list_tbl[var_index(a)];
}

static inline sink_val arget(context ctx, sink_val ar, int index){
	if (sink_islist(ar)){
		sink_list ls = var_castlist(ctx, ar);
		return index >= ls->size ? (sink_val){ .f = 0 } : ls->vals[index];
	}
	return ar;
}

static inline int arsize(context ctx, sink_val ar){
	if (sink_islist(ar)){
		sink_list ls = var_castlist(ctx, ar);
		return ls->size;
	}
	return 1;
}

static inline bool oper_isnum(context ctx, sink_val a){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		for (int i = 0; i < ls->size; i++){
			if (!sink_isnum(ls->vals[i]))
				return false;
		}
		return true;
	}
	return sink_isnum(a);
}

static inline bool oper_isnilnumstr(context ctx, sink_val a){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		for (int i = 0; i < ls->size; i++){
			if (sink_islist(ls->vals[i]))
				return false;
		}
	}
	return true;
}

typedef sink_val (*unary_func)(context ctx, sink_val v);

static sink_val oper_un(context ctx, sink_val a, unary_func f_unary){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		sink_val *ret = mem_alloc(sizeof(sink_val) * ls->size);
		for (int i = 0; i < ls->size; i++)
			ret[i] = f_unary(ctx, ls->vals[i]);
		return sink_list_newblobgive(ctx, ls->size, ls->size, ret);
	}
	return f_unary(ctx, a);
}

typedef sink_val (*binary_func)(context ctx, sink_val a, sink_val b);

static sink_val oper_bin(context ctx, sink_val a, sink_val b, binary_func f_binary){
	if (sink_islist(a) || sink_islist(b)){
		int ma = arsize(ctx, a);
		int mb = arsize(ctx, b);
		int m = ma > mb ? ma : mb;
		sink_val *ret = mem_alloc(sizeof(sink_val) * m);
		for (int i = 0; i < m; i++)
			ret[i] = f_binary(ctx, arget(ctx, a, i), arget(ctx, b, i));
		return sink_list_newblobgive(ctx, m, m, ret);
	}
	return f_binary(ctx, a, b);
}

typedef sink_val (*trinary_func)(context ctx, sink_val a, sink_val b, sink_val c);

static sink_val oper_tri(context ctx, sink_val a, sink_val b, sink_val c, trinary_func f_trinary){
	if (sink_islist(a) || sink_islist(b) || sink_islist(c)){
		int ma = arsize(ctx, a);
		int mb = arsize(ctx, b);
		int mc = arsize(ctx, c);
		int m = ma > mb ? (ma > mc ? ma : mc) : (mb > mc ? mb : mc);
		sink_val *ret = mem_alloc(sizeof(sink_val) * m);
		for (int i = 0; i < m; i++)
			ret[i] = f_trinary(ctx, arget(ctx, a, i), arget(ctx, b, i), arget(ctx, c, i));
		return sink_list_newblobgive(ctx, m, m, ret);
	}
	return f_trinary(ctx, a, b, c);
}

static int str_cmp(sink_str a, sink_str b){
	int m = a->size > b->size ? b->size : a->size;
	for (int i = 0; i < m; i++){
		uint8_t c1 = a->bytes[i];
		uint8_t c2 = b->bytes[i];
		if (c1 < c2)
			return -1;
		else if (c2 < c1)
			return 1;
	}
	if (a->size < b->size)
		return -1;
	else if (b->size < a->size)
		return 1;
	return 0;
}

static sink_val opihelp_num_max(context ctx, sink_val v){
	if (list_hastick(ctx, var_index(v)))
		return SINK_NIL;
	sink_list ls = var_castlist(ctx, v);
	sink_val max = SINK_NIL;
	for (int i = 0; i < ls->size; i++){
		if (sink_isnum(ls->vals[i])){
			if (sink_isnil(max) || ls->vals[i].f > max.f)
				max = ls->vals[i];
		}
		else if (sink_islist(ls->vals[i])){
			sink_val lm = opihelp_num_max(ctx, ls->vals[i]);
			if (!sink_isnil(lm) && (sink_isnil(max) || lm.f > max.f))
				max = lm;
		}
	}
	return max;
}

static inline sink_val opi_num_max(context ctx, sink_val v){
	list_cleartick(ctx);
	return opihelp_num_max(ctx, v);
}

static sink_val opihelp_num_min(context ctx, sink_val v){
	if (list_hastick(ctx, var_index(v)))
		return SINK_NIL;
	sink_list ls = var_castlist(ctx, v);
	sink_val min = SINK_NIL;
	for (int i = 0; i < ls->size; i++){
		if (sink_isnum(ls->vals[i])){
			if (sink_isnil(min) || ls->vals[i].f < min.f)
				min = ls->vals[i];
		}
		else if (sink_islist(ls->vals[i])){
			sink_val lm = opihelp_num_min(ctx, ls->vals[i]);
			if (!sink_isnil(lm) && (sink_isnil(min) || lm.f < min.f))
				min = lm;
		}
	}
	return min;
}

static inline sink_val opi_num_min(context ctx, sink_val v){
	list_cleartick(ctx);
	return opihelp_num_min(ctx, v);
}

static sink_val opi_num_base(context ctx, double num, int len, int base){
	if (len > 256)
		len = 256;
	const char *digits = "0123456789ABCDEF";
	char buf[100];
	int p = 0;

	if (num < 0){
		buf[p++] = '-';
		num = -num;
	}

	buf[p++] = '0';
	if (base == 16)
		buf[p++] = 'x';
	else if (base == 8)
		buf[p++] = 'c';
	else if (base == 2)
		buf[p++] = 'b';
	else
		assert(false);

	char buf2[100];
	int bodysize = 0;
	double nint = floor(num);
	double nfra = num - nint;
	while (nint > 0 && bodysize < 50){
		buf2[bodysize++] = digits[(int)fmod(nint, base)];
		nint = floor(nint / base);
	}
	int bi = 0;
	while (bodysize + bi < len && bodysize + bi < 32 && p < 50){
		buf[p++] = '0';
		bi++;
	}
	if (bodysize > 0){
		for (int i = 0; i < bodysize; i++)
			buf[p++] = buf2[bodysize - 1 - i];
	}
	else if (len <= 0)
		buf[p++] = '0';

	if (nfra > 0.00001){
		buf[p++] = '.';
		int i = 0;
		while (nfra > 0.00001 && i < 16){
			nfra *= base;
			nint = floor(nfra);
			buf[p++] = digits[(int)nint];
			nfra -= nint;
			i++;
		}
	}

	buf[p++] = 0;
	return sink_str_newcstr(ctx, buf);
}

static inline uint32_t opi_rand_int(context ctx);

static inline void opi_rand_seedauto(context ctx){
	ctx->rand_seed = (uint32_t)current_ms();
	ctx->rand_i = (uint32_t)current_ms();
	for (int i = 0; i < 1000; i++)
		opi_rand_int(ctx);
	ctx->rand_i = 0;
}

static inline void opi_rand_seed(context ctx, uint32_t n){
	ctx->rand_seed = n;
	ctx->rand_i = 0;
}

static inline uint32_t opi_rand_int(context ctx){
	uint32_t m = 0x5bd1e995;
	uint32_t k = ctx->rand_i++ * m;
	ctx->rand_seed = (k ^ (k >> 24) ^ (ctx->rand_seed * m)) * m;
	return ctx->rand_seed ^ (ctx->rand_seed >> 13);
}

static inline double opi_rand_num(context ctx){
	uint64_t M1 = opi_rand_int(ctx);
	uint64_t M2 = opi_rand_int(ctx);
	uint64_t M = (M1 << 20) | (M2 >> 12); // 52 bit random number
	union { uint64_t i; double d; } u = {
		.i = UINT64_C(0x3FF) << 52 | M
	};
	return u.d - 1.0;
}

static inline sink_val opi_rand_getstate(context ctx){
	double vals[2] = { ctx->rand_seed, ctx->rand_i };
	return sink_list_newblob(ctx, 2, (sink_val *)vals);
}

static inline void opi_rand_setstate(context ctx, double a, double b){
	ctx->rand_seed = (uint32_t)a;
	ctx->rand_i = (uint32_t)b;
}

static inline sink_val opi_rand_pick(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	if (ls->size <= 0)
		return SINK_NIL;
	return ls->vals[(int)(opi_rand_num(ctx) * ls->size)];
}

static inline void opi_rand_shuffle(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	int m = ls->size;
	while (m > 1){
		int i = (int)(opi_rand_num(ctx) * m);
		m--;
		if (m != i){
			sink_val t = ls->vals[m];
			ls->vals[m] = ls->vals[i];
			ls->vals[i] = t;
		}
	}
}

static inline sink_val opi_str_new(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	return sink_list_joinplain(ctx, ls->size, ls->vals, 1, (const uint8_t *)" ");
}

static inline sink_val opi_list_push(context ctx, sink_val a, sink_val b);
static inline sink_val opi_str_split(context ctx, sink_val a, sink_val b){
	sink_str haystack = sink_caststr(ctx, a);
	sink_str needle = sink_caststr(ctx, b);
	sink_val result = sink_list_newblob(ctx, 0, NULL);

	int delta[256];
	int nlen = needle->size;
	for (int i = 0; i < 256; i++)
		delta[i] = nlen + 1;
	for (int i = 0; i < nlen; i++)
		delta[needle->bytes[i]] = nlen - i;
	int hx = 0;
	int lastmatch = 0;
	int hlen = haystack->size;
	while (hx + nlen <= hlen){
		if (memcmp(needle->bytes, &haystack->bytes[hx], sizeof(uint8_t) * needle->size) == 0){
			opi_list_push(ctx, result,
				sink_str_newblob(ctx, hx - lastmatch, &haystack->bytes[lastmatch]));
			lastmatch = hx + needle->size;
		}
		hx += delta[haystack->bytes[hx + nlen]];
	}
	opi_list_push(ctx, result,
		sink_str_newblob(ctx, haystack->size - lastmatch, &haystack->bytes[lastmatch]));
	return result;
}

// operators
static sink_val unop_num_neg(context ctx, sink_val a){
	return sink_num(-a.f);
}

static sink_val unop_tonum(context ctx, sink_val a){
	if (sink_isnum(a))
		return a;
	fprintf(stderr, "TODO: unop_tonum; parse `a` into a number\n");
	abort();
	return SINK_NIL;
}

static sink_val unop_num_abs(context ctx, sink_val a){
	return sink_num(fabs(a.f));
}

static sink_val unop_num_sign(context ctx, sink_val a){
	return sink_num(a.f < 0 ? -1 : (a.f > 0 ? 1 : 0));
}

static sink_val unop_num_floor(context ctx, sink_val a){
	return sink_num(floor(a.f));
}

static sink_val unop_num_ceil(context ctx, sink_val a){
	return sink_num(ceil(a.f));
}

static sink_val unop_num_round(context ctx, sink_val a){
	return sink_num(round(a.f));
}

static sink_val unop_num_trunc(context ctx, sink_val a){
	return sink_num(trunc(a.f));
}

static sink_val unop_num_sin(context ctx, sink_val a){
	return sink_num(sin(a.f));
}

static sink_val unop_num_cos(context ctx, sink_val a){
	return sink_num(cos(a.f));
}

static sink_val unop_num_tan(context ctx, sink_val a){
	return sink_num(tan(a.f));
}

static sink_val unop_num_asin(context ctx, sink_val a){
	return sink_num(asin(a.f));
}

static sink_val unop_num_acos(context ctx, sink_val a){
	return sink_num(acos(a.f));
}

static sink_val unop_num_atan(context ctx, sink_val a){
	return sink_num(atan(a.f));
}

static sink_val unop_num_log(context ctx, sink_val a){
	return sink_num(log(a.f));
}

static sink_val unop_num_log2(context ctx, sink_val a){
	return sink_num(log2(a.f));
}

static sink_val unop_num_log10(context ctx, sink_val a){
	return sink_num(log10(a.f));
}

static sink_val unop_num_exp(context ctx, sink_val a){
	return sink_num(exp(a.f));
}

static sink_val binop_num_add(context ctx, sink_val a, sink_val b){
	return sink_num(a.f + b.f);
}

static sink_val binop_num_sub(context ctx, sink_val a, sink_val b){
	return sink_num(a.f - b.f);
}

static sink_val binop_num_mul(context ctx, sink_val a, sink_val b){
	return sink_num(a.f * b.f);
}

static sink_val binop_num_div(context ctx, sink_val a, sink_val b){
	return sink_num(a.f / b.f);
}

static sink_val binop_num_mod(context ctx, sink_val a, sink_val b){
	return sink_num(fmod(a.f, b.f));
}

static sink_val binop_num_pow(context ctx, sink_val a, sink_val b){
	return sink_num(pow(a.f, b.f));
}

static sink_val binop_num_atan2(context ctx, sink_val a, sink_val b){
	return sink_num(atan2(a.f, b.f));
}

static sink_val binop_num_hex(context ctx, sink_val a, sink_val b){
	return opi_num_base(ctx, a.f, b.f, 16);
}

static sink_val binop_num_oct(context ctx, sink_val a, sink_val b){
	return opi_num_base(ctx, a.f, b.f, 8);
}

static sink_val binop_num_bin(context ctx, sink_val a, sink_val b){
	return opi_num_base(ctx, a.f, b.f, 2);
}

static sink_val triop_num_clamp(context ctx, sink_val a, sink_val b, sink_val c){
	return sink_num(a.f < b.f ? b.f : (a.f > c.f ? c.f : a.f));
}

static sink_val triop_num_lerp(context ctx, sink_val a, sink_val b, sink_val c){
	return sink_num(a.f + (b.f - a.f) * c.f);
}

static inline int32_t toint(sink_val v){
	return (int32_t)(uint32_t)sink_castnum(v);
}

static inline sink_val intnum(int32_t v){
	return sink_num(v);
}

static sink_val unop_int_new(context ctx, sink_val a){
	return intnum(toint(a));
}

static sink_val unop_int_not(context ctx, sink_val a){
	return intnum(~toint(a));
}

static sink_val unop_int_clz(context ctx, sink_val a){
	#ifdef BITSCAN_FFSLL
		return sink_num(32 - fls(toint(a)));
	#else
	#	error Don't know how to implement bmp_alloc
	#endif
}

static sink_val binop_int_and(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) & toint(b));
}

static sink_val binop_int_or(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) | toint(b));
}

static sink_val binop_int_xor(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) ^ toint(b));
}

static sink_val binop_int_shl(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) << toint(b));
}

static sink_val binop_int_shr(context ctx, sink_val a, sink_val b){
	return intnum(((uint32_t)toint(a)) >> toint(b));
}

static sink_val binop_int_sar(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) >> toint(b));
}

static sink_val binop_int_add(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) + toint(b));
}

static sink_val binop_int_sub(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) - toint(b));
}

static sink_val binop_int_mul(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) * toint(b));
}

static sink_val binop_int_div(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) / toint(b));
}

static sink_val binop_int_mod(context ctx, sink_val a, sink_val b){
	return intnum(toint(a) % toint(b));
}

// inline operators
static inline void opi_abortcstr(context ctx, const char *msg);

static inline bool opi_equ(context ctx, sink_val a, sink_val b){
	if (sink_isnil(a) && sink_isnil(b))
		return true;
	else if (sink_isstr(a) && sink_isstr(b))
		return str_cmp(var_caststr(ctx, a), var_caststr(ctx, b)) == 0;
	else if (sink_islist(a) && sink_islist(b))
		return a.u == b.u;
	else if (sink_isnum(a) && sink_isnum(b))
		return a.f == b.f;
	return false;
}

static inline int opi_size(context ctx, sink_val a){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		return ls->size;
	}
	else if (sink_isstr(a)){
		sink_str str = var_caststr(ctx, a);
		return str->size;
	}
	opi_abortcstr(ctx, "Expecting string or list for size");
	return 0;
}

static inline sink_val opi_tonum(context ctx, sink_val a){
	if (!oper_isnilnumstr(ctx, a)){
		opi_abortcstr(ctx, "Expecting string when converting to number");
		return SINK_NIL;
	}
	return oper_un(ctx, a, unop_tonum);
}

static inline void opi_say(context ctx, int size, sink_val *vals){
	if (ctx->io.f_say){
		ctx->io.f_say(
			ctx,
			var_caststr(ctx, sink_list_joinplain(ctx, size, vals, 1, (const uint8_t *)" ")),
			ctx->io.user
		);
	}
}

static inline void opi_warn(context ctx, int size, sink_val *vals){
	if (ctx->io.f_warn){
		ctx->io.f_warn(
			ctx,
			var_caststr(ctx, sink_list_joinplain(ctx, size, vals, 1, (const uint8_t *)" ")),
			ctx->io.user
		);
	}
}

static inline sink_val opi_ask(context ctx, int size, sink_val *vals){
	if (ctx->io.f_ask){
		return ctx->io.f_ask(
			ctx,
			var_caststr(ctx, sink_list_joinplain(ctx, size, vals, 1, (const uint8_t *)" ")),
			ctx->io.user
		);
	}
	return SINK_NIL;
}

static inline void opi_exit(context ctx, int size, sink_val *vals){
	if (size > 0)
		opi_say(ctx, size, vals);
	ctx->passed = true;
}

static inline void opi_abort(context ctx, int size, sink_val *vals){
	if (size > 0)
		opi_warn(ctx, size, vals);
	ctx->failed = true;
}

static inline void opi_abortcstr(context ctx, const char *msg){
	sink_val a = sink_str_newcstr(ctx, msg);
	opi_warn(ctx, 1, &a);
	ctx->failed = true;
}

static inline sink_val opi_abortformat(context ctx, const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = mem_alloc(s + 1);
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	sink_val a = sink_str_newblobgive(ctx, s, (uint8_t *)buf);
	opi_warn(ctx, 1, &a);
	ctx->failed = true;
	return SINK_NIL;
}

static inline sink_val opi_unop(context ctx, sink_val a, unary_func f_unary, const char *erop){
	if (sink_isnil(a))
		a.f = 0;
	if (!oper_isnum(ctx, a))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_un(ctx, a, f_unary);
}

static inline sink_val opi_binop(context ctx, sink_val a, sink_val b, binary_func f_binary,
	const char *erop){
	if (sink_isnil(a))
		a.f = 0;
	if (!oper_isnum(ctx, a))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (sink_isnil(b))
		b.f = 0;
	if (!oper_isnum(ctx, b))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_bin(ctx, a, b, f_binary);
}

static inline sink_val opi_triop(context ctx, sink_val a, sink_val b, sink_val c,
	trinary_func f_trinary, const char *erop){
	if (sink_isnil(a))
		a.f = 0;
	if (!oper_isnum(ctx, a))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (sink_isnil(b))
		b.f = 0;
	if (!oper_isnum(ctx, b))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (sink_isnil(c))
		c.f = 0;
	if (!oper_isnum(ctx, c))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_tri(ctx, a, b, c, f_trinary);
}

static inline sink_val opi_str_at(context ctx, sink_val a, sink_val b){
	sink_str s = var_caststr(ctx, a);
	int idx = b.f;
	if (idx < 0)
		idx += s->size;
	if (idx < 0 || idx >= s->size)
		return SINK_NIL;
	return sink_str_newblob(ctx, 1, &s->bytes[idx]);
}

static inline sink_val opi_str_cat(context ctx, sink_val a, sink_val b){
	a = sink_tostr(ctx, a);
	b = sink_tostr(ctx, b);
	sink_str str = var_caststr(ctx, a);
	sink_str str2 = var_caststr(ctx, b);
	int ns = str->size + str2->size;
	if (ns <= 0)
		return sink_str_newblob(ctx, 0, NULL);
	uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (ns + 1));
	if (str->size > 0)
		memcpy(&bytes[0], str->bytes, sizeof(uint8_t) * str->size);
	if (str2->size > 0)
		memcpy(&bytes[str->size], str2->bytes, sizeof(uint8_t) * str2->size);
	bytes[ns] = 0;
	return sink_str_newblobgive(ctx, ns, bytes);
}

typedef struct {
	int start;
	int len;
} fix_slice_st;

static inline fix_slice_st fix_slice(sink_val startv, sink_val lenv, int objsize){
	int start = (int)round(startv.f);
	if (sink_isnil(lenv)){
		if (start < 0)
			start += objsize;
		if (start < 0)
			start = 0;
		if (start >= objsize)
			return (fix_slice_st){ 0, 0 };
		return (fix_slice_st){ start, objsize - start };
	}
	else{
		int len = (int)round(lenv.f);
		bool wasneg = start < 0;
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
			return (fix_slice_st){ 0, 0 };
		if (start + len > objsize)
			len = objsize - start;
		return (fix_slice_st){ start, len };
	}
}

static inline sink_val opi_str_slice(context ctx, sink_val a, sink_val b, sink_val c){
	sink_str s = var_caststr(ctx, a);
	if (s->size <= 0)
		return a;
	fix_slice_st sl = fix_slice(b, c, s->size);
	if (sl.len <= 0)
		return sink_str_newblob(ctx, 0, NULL);
	return sink_str_newblob(ctx, sl.len, &s->bytes[sl.start]);
}

static inline sink_val opi_str_splice(context ctx, sink_val a, sink_val b, sink_val c, sink_val d){
	sink_str s = var_caststr(ctx, a);
	fix_slice_st sl = fix_slice(b, c, s->size);
	if (sink_isnil(d)){
		if (sl.len <= 0)
			return a;
		int tot = s->size - sl.len;
		if (tot <= 0)
			return sink_str_newblob(ctx, 0, NULL);
		uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
		if (sl.start > 0)
			memcpy(bytes, s->bytes, sizeof(uint8_t) * sl.start);
		if (s->size > sl.start + sl.len){
			memcpy(&bytes[sl.start], &s->bytes[sl.start + sl.len],
				sizeof(uint8_t) * (s->size - sl.start - sl.len));
		}
		bytes[tot] = 0;
		return sink_str_newblobgive(ctx, tot, bytes);
	}
	else{
		sink_str s2 = var_caststr(ctx, d);
		int tot = s->size - sl.len + s2->size;
		if (tot <= 0)
			return sink_str_newblob(ctx, 0, NULL);
		uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
		if (sl.start > 0)
			memcpy(bytes, s->bytes, sizeof(uint8_t) * sl.start);
		if (s2->size > 0)
			memcpy(&bytes[sl.start], s2->bytes, sizeof(uint8_t) * s2->size);
		if (s->size > sl.start + sl.len){
			memcpy(&bytes[sl.start + s2->size], &s->bytes[sl.start + sl.len],
				sizeof(uint8_t) * (s->size - sl.start - sl.len));
		}
		bytes[tot] = 0;
		return sink_str_newblobgive(ctx, tot, bytes);
	}
}

static inline sink_val opi_list_new(context ctx, sink_val a, sink_val b){
	int size = sink_isnil(a) ? 0 : a.f;
	if (size <= 0)
		return sink_list_newblob(ctx, 0, NULL);
	sink_val *vals = mem_alloc(sizeof(sink_val) * size);
	for (int i = 0; i < size; i++)
		vals[i] = b;
	return sink_list_newblobgive(ctx, size, size, vals);
}

static inline sink_val opi_list_at(context ctx, sink_val a, sink_val b){
	sink_list ls = var_castlist(ctx, a);
	int idx = b.f;
	if (idx < 0)
		idx += ls->size;
	if (idx < 0 || idx >= ls->size)
		return SINK_NIL;
	return ls->vals[idx];
}

static inline sink_val opi_list_cat(context ctx, sink_val a, sink_val b){
	sink_list ls = var_castlist(ctx, a);
	sink_list ls2 = var_castlist(ctx, b);
	int ns = ls->size + ls2->size;
	if (ns <= 0)
		return sink_list_newblob(ctx, 0, NULL);
	sink_val *vals = mem_alloc(sizeof(sink_val) * ns);
	if (ls->size > 0)
		memcpy(&vals[0], ls->vals, sizeof(sink_val) * ls->size);
	if (ls2->size > 0)
		memcpy(&vals[ls->size], ls2->vals, sizeof(sink_val) * ls2->size);
	return sink_list_newblobgive(ctx, ns, ns, vals);
}

static inline sink_val opi_list_slice(context ctx, sink_val a, sink_val b, sink_val c){
	sink_list ls = var_castlist(ctx, a);
	fix_slice_st sl = fix_slice(b, c, ls->size);
	if (ls->size <= 0 || sl.len <= 0)
		return sink_list_newblob(ctx, 0, NULL);
	return sink_list_newblob(ctx, sl.len, &ls->vals[sl.start]);
}

static inline void opi_list_splice(context ctx, sink_val a, sink_val b, sink_val c, sink_val d){
	sink_list ls = var_castlist(ctx, a);
	fix_slice_st sl = fix_slice(b, c, ls->size);
	if (sink_isnil(d)){
		if (sl.len <= 0)
			return;
		if (ls->size > sl.start + sl.len){
			memmove(&ls->vals[sl.start], &ls->vals[sl.start + sl.len],
				sizeof(sink_val) * (ls->size - sl.start - sl.len));
		}
		ls->size -= sl.len;
	}
	else{
		sink_list ls2 = var_castlist(ctx, d);
		if (sl.len <= 0 && ls2->size <= 0)
			return;
		int tot = ls->size - sl.len + ls2->size;
		if (tot > ls->count){
			ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * tot);
			ls->count = tot;
		}
		if (ls->size > sl.start + sl.len){
			memmove(&ls->vals[sl.start + ls2->size], &ls->vals[sl.start + sl.len],
				sizeof(sink_val) * (ls->size - sl.start - sl.len));
		}
		if (ls2->size > 0)
			memcpy(&ls->vals[sl.start], ls2->vals, sizeof(sink_val) * ls2->size);
		ls->size = tot;
	}
}

static inline sink_val opi_list_shift(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	if (ls->size <= 0)
		return SINK_NIL;
	sink_val ret = ls->vals[0];
	if (ls->size <= 1)
		ls->size = 0;
	else{
		ls->size--;
		memcpy(&ls->vals[0], &ls->vals[1], sizeof(sink_val) * ls->size);
	}
	return ret;
}

static inline sink_val opi_list_pop(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	if (ls->size <= 0)
		return SINK_NIL;
	ls->size--;
	return ls->vals[ls->size];
}

static const int sink_list_grow = 200;
static inline sink_val opi_list_push(context ctx, sink_val a, sink_val b){
	sink_list ls = var_castlist(ctx, a);
	if (ls->size >= ls->count){
		ls->count += sink_list_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * ls->count);
	}
	ls->vals[ls->size++] = b;
	return a;
}

static inline void opi_list_pushnils(context ctx, sink_list ls, int totalsize){
	if (ls->size >= totalsize)
		return;
	if (totalsize > ls->count){
		ls->count = totalsize + sink_list_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * ls->count);
	}
	while (ls->size < totalsize)
		ls->vals[ls->size++] = SINK_NIL;
}

static inline sink_val opi_list_unshift(context ctx, sink_val a, sink_val b){
	sink_list ls = var_castlist(ctx, a);
	if (ls->size >= ls->count){
		ls->count += sink_list_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * ls->count);
	}
	if (ls->size > 0)
		memmove(&ls->vals[1], ls->vals, sizeof(sink_val) * ls->size);
	ls->vals[0] = b;
	ls->size++;
	return a;
}

static inline sink_val opi_list_append(context ctx, sink_val a, sink_val b){
	sink_list ls2 = var_castlist(ctx, b);
	if (ls2->size > 0){
		sink_list ls = var_castlist(ctx, a);
		if (ls->size + ls2->size >= ls->count){
			ls->count = ls->size + ls2->size + sink_list_grow;
			ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * ls->count);
		}
		memcpy(&ls->vals[ls->size], ls2->vals, sizeof(sink_val) * ls2->size);
		ls->size += ls2->size;
	}
	return a;
}

static inline sink_val opi_list_prepend(context ctx, sink_val a, sink_val b){
	sink_list ls2 = var_castlist(ctx, b);
	if (ls2->size > 0){
		sink_list ls = var_castlist(ctx, a);
		if (ls->size + ls2->size >= ls->count){
			ls->count = ls->size + ls2->size + sink_list_grow;
			ls->vals = mem_realloc(ls->vals, sizeof(sink_val) * ls->count);
		}
		if (ls->size > 0)
			memmove(&ls->vals[ls2->size], ls->vals, sizeof(sink_val) * ls->size);
		memcpy(ls->vals, ls2->vals, sizeof(sink_val) * ls2->size);
		ls->size += ls2->size;
	}
	return a;
}

static inline sink_val opi_list_find(context ctx, sink_val a, sink_val b, sink_val c){
	sink_list ls = var_castlist(ctx, a);
	int pos = (sink_isnil(c) || sink_num_isnan(c)) ? 0 : c.f;
	if (pos < 0)
		pos = 0;
	for (; pos < ls->size; pos++){
		if (opi_equ(ctx, ls->vals[pos], b))
			return sink_num(pos);
	}
	return SINK_NIL;
}

static inline sink_val opi_list_rfind(context ctx, sink_val a, sink_val b, sink_val c){
	sink_list ls = var_castlist(ctx, a);
	int pos = (sink_isnil(c) || sink_num_isnan(c)) ? ls->size - 1 : c.f;
	if (pos < 0 || pos >= ls->size)
		pos = ls->size - 1;
	for (; pos >= 0; pos--){
		if (opi_equ(ctx, ls->vals[pos], b))
			return sink_num(pos);
	}
	return SINK_NIL;
}

static inline sink_val opi_list_join(context ctx, sink_val a, sink_val b){
	sink_list ls = var_castlist(ctx, a);
	sink_str str = var_caststr(ctx, sink_tostr(ctx, b));
	return sink_list_joinplain(ctx, ls->size, ls->vals, str->size, str->bytes);
}

static inline sink_val opi_list_rev(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	int max = ls->size / 2;
	for (int i = 0, ri = ls->size - 1; i < max; i++, ri--){
		sink_val temp = ls->vals[i];
		ls->vals[i] = ls->vals[ri];
		ls->vals[ri] = temp;
	}
	return a;
}

static inline sink_val opi_range(context ctx, double start, double stop, double step){
	int count = ceil((stop - start) / step);
	if (count > 10000000)
		return SINK_NIL;
	if (count <= 0)
		return sink_list_newblob(ctx, 0, NULL);
	sink_val *ret = mem_alloc(sizeof(sink_val) * count);
	for (int i = 0; i < count; i++)
		ret[i] = sink_num(start + (double)i * step);
	return sink_list_newblobgive(ctx, count, count, ret);
}

static sink_run context_run(context ctx){
	if (ctx->passed)
		return crr_exitpass(ctx);
	if (ctx->failed)
		return crr_exitfail(ctx);
	if (ctx->invalid)
		return crr_invalid(ctx);
	if (ctx->async)
		return crr_async(ctx);

	int A, B, C, D, E, F, G, H, I;
	sink_val X, Y, Z, W;
	sink_list ls, ls2;
	sink_str str, str2;

	list_byte ops = ctx->prg->ops;

	#define LOAD_ab()                                                                      \
		ctx->pc++;                                                                         \
		A = ops->bytes[ctx->pc++]; B = ops->bytes[ctx->pc++];

	#define LOAD_AB()                                                                      \
		LOAD_ab();                                                                         \
		if (A > ctx->lex_index)                                                            \
			return crr_invalid(ctx);

	#define LOAD_ABc()                                                                     \
		LOAD_ab();                                                                         \
		C = ops->bytes[ctx->pc++];                                                         \
		if (A > ctx->lex_index)                                                            \
			return crr_invalid(ctx);

	#define LOAD_abcd()                                                                    \
		LOAD_ab();                                                                         \
		C = ops->bytes[ctx->pc++]; D = ops->bytes[ctx->pc++];

	#define LOAD_ABcd()                                                                    \
		LOAD_abcd();                                                                       \
		if (A > ctx->lex_index)                                                            \
			return crr_invalid(ctx);

	#define LOAD_ABCD()                                                                    \
		LOAD_abcd();                                                                       \
		if (A > ctx->lex_index || C > ctx->lex_index)                                      \
			return crr_invalid(ctx);

	#define LOAD_abcdef()                                                                  \
		LOAD_abcd();                                                                       \
		E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];

	#define LOAD_ABcdef()                                                                  \
		LOAD_abcdef();                                                                     \
		if (A > ctx->lex_index)                                                            \
			return crr_invalid(ctx);

	#define LOAD_ABCDef()                                                                  \
		LOAD_abcdef();                                                                     \
		if (A > ctx->lex_index || C > ctx->lex_index)                                      \
			return crr_invalid(ctx);

	#define LOAD_ABCDEF()                                                                  \
		LOAD_abcdef();                                                                     \
		if (A > ctx->lex_index || C > ctx->lex_index || E > ctx->lex_index)                \
			return crr_invalid(ctx);

	#define LOAD_abcdefgh()                                                                \
		LOAD_abcdef();                                                                     \
		G = ops->bytes[ctx->pc++]; H = ops->bytes[ctx->pc++];

	#define LOAD_ABCDEFGH()                                                                \
		LOAD_abcdefgh();                                                                   \
		if (A > ctx->lex_index || C > ctx->lex_index || E > ctx->lex_index ||              \
			G > ctx->lex_index)                                                            \
			return crr_invalid(ctx);                                                       \

	#define LOAD_ABCDefghi()                                                               \
		LOAD_abcdefgh();                                                                   \
		I = ops->bytes[ctx->pc++];                                                         \
		if (A > ctx->lex_index || C > ctx->lex_index || E > ctx->lex_index)                \
			return crr_invalid(ctx);

	#define INLINE_UNOP(func, erop)                                                        \
		LOAD_ABCD();                                                                       \
		var_set(ctx, A, B, opi_unop(ctx, var_get(ctx, C, D), func, erop));                 \
		if (ctx->failed)                                                                   \
			return crr_exitfail(ctx);

	#define INLINE_BINOP(func, erop)                                                       \
		LOAD_ABCDEF();                                                                     \
		var_set(ctx, A, B,                                                                 \
			opi_binop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), func, erop));           \
		if (ctx->failed)                                                                   \
			return crr_exitfail(ctx);

	#define INLINE_TRIOP(func, erop)                                                       \
		LOAD_ABCDEFGH();                                                                   \
		var_set(ctx, A, B,                                                                 \
			opi_triop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), var_get(ctx, G, H),     \
				func, erop));                                                              \
		if (ctx->failed)                                                                   \
			return crr_exitfail(ctx);

	#define RETURN_FAIL(msg)   do{           \
			opi_abortcstr(ctx, msg);         \
			return crr_exitfail(ctx);        \
		} while(false)

	// TODO: remove
	#define THROW(str)  do{ fprintf(stderr, "TODO: %s\n", str); abort(); } while(false)

	while (ctx->pc < ops->size){
		switch ((op_enum)ops->bytes[ctx->pc]){
			case OP_NOP            : { //
				ctx->pc++;
			} break;

			case OP_ABORTERR       : { // ERRNO
				ctx->pc++;
				A = ops->bytes[ctx->pc++];
				const char *errmsg = "Unknown error";
				if (A == 1)
					errmsg = "Expecting list when calling function";
				X = sink_str_newcstr(ctx, errmsg);
				opi_abort(ctx, 1, &X);
				return crr_exitfail(ctx);
			} break;

			case OP_MOVE           : { // [TGT], [SRC]
				LOAD_ABCD();
				var_set(ctx, A, B, var_get(ctx, C, D));
			} break;

			case OP_INC            : { // [TGT/SRC]
				LOAD_AB();
				X = var_get(ctx, A, B);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number when incrementing");
				var_set(ctx, A, B, sink_num(X.f + 1));
			} break;

			case OP_NIL            : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_NUMPOS         : { // [TGT], [VALUE]
				LOAD_ABcd();
				var_set(ctx, A, B, sink_num(C | (D << 8)));
			} break;

			case OP_NUMNEG         : { // [TGT], [VALUE]
				LOAD_ABcd();
				var_set(ctx, A, B, sink_num((C | (D << 8)) - 65536));
			} break;

			case OP_NUMTBL         : { // [TGT], [INDEX]
				LOAD_ABcd();
				C = C | (D << 8);
				if (C >= ctx->prg->numTable->size)
					return crr_invalid(ctx);
				var_set(ctx, A, B, sink_num(ctx->prg->numTable->vals[C]));
			} break;

			case OP_STR            : { // [TGT], [INDEX]
				LOAD_ABcd();
				C = C | (D << 8);
				if (C >= ctx->prg->strTable->size)
					return crr_invalid(ctx);
				list_byte s = ctx->prg->strTable->ptrs[C];
				var_set(ctx, A, B, sink_str_newblob(ctx, s->size, s->bytes));
			} break;

			case OP_LIST           : { // [TGT], HINT
				LOAD_ABc();
				sink_val *vals = NULL;
				if (C > 0)
					vals = mem_alloc(sizeof(sink_val) * C);
				var_set(ctx, A, B, sink_list_newblobgive(ctx, 0, C, vals));
			} break;

			case OP_ISNUM          : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isnum(X)));
			} break;

			case OP_ISSTR          : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isstr(X)));
			} break;

			case OP_ISLIST         : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_islist(X)));
			} break;

			case OP_NOT            : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isfalse(X)));
			} break;

			case OP_SIZE           : { // [TGT], [SRC]
				LOAD_ABCD();
				var_set(ctx, A, B, sink_num(opi_size(ctx, var_get(ctx, C, D))));
				if (ctx->failed)
					return crr_exitfail(ctx);
			} break;

			case OP_TONUM          : { // [TGT], [SRC]
				LOAD_ABCD();
				var_set(ctx, A, B, opi_tonum(ctx, var_get(ctx, C, D)));
			} break;

			case OP_CAT            : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_islist(X) && sink_islist(Y))
					var_set(ctx, A, B, opi_list_cat(ctx, X, Y));
				else{
					var_set(ctx, A, B, opi_str_cat(ctx, X, Y));
					if (ctx->failed)
						return crr_exitfail(ctx);
				}
			} break;

			case OP_LT             : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isstr(X) && sink_isstr(Y)){
					var_set(ctx, A, B,
						sink_bool(str_cmp(var_caststr(ctx, X), var_caststr(ctx, Y)) < 0));
				}
				else if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X.f < Y.f));
				else
					RETURN_FAIL("Expecting numbers or strings");
			} break;

			case OP_LTE            : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isstr(X) && sink_isstr(Y)){
					var_set(ctx, A, B,
						sink_bool(str_cmp(var_caststr(ctx, X), var_caststr(ctx, Y)) <= 0));
				}
				else if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X.f <= Y.f));
				else
					RETURN_FAIL("Expecting numbers or strings");
			} break;

			case OP_NEQ            : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(!opi_equ(ctx, X, Y)));
			} break;

			case OP_EQU            : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(opi_equ(ctx, X, Y)));
			} break;

			case OP_GETAT          : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				if (!sink_islist(X) && !sink_isstr(X))
					RETURN_FAIL("Expecting list or string when indexing");
				Y = var_get(ctx, E, F);
				if (!sink_isnum(Y))
					RETURN_FAIL("Expecting index to be number");
				if (sink_islist(X))
					var_set(ctx, A, B, opi_list_at(ctx, X, Y));
				else
					var_set(ctx, A, B, opi_str_at(ctx, X, Y));
			} break;

			case OP_SLICE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_ABCDEFGH();
				X = var_get(ctx, C, D);
				if (!sink_islist(X) && !sink_isstr(X))
					RETURN_FAIL("Expecting list or string when slicing");
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnum(Y) || (!sink_isnil(Z) && !sink_isnum(Z)))
					RETURN_FAIL("Expecting slice values to be numbers");
				if (sink_islist(X))
					var_set(ctx, A, B, opi_list_slice(ctx, X, Y, Z));
				else
					var_set(ctx, A, B, opi_str_slice(ctx, X, Y, Z));
			} break;

			case OP_SETAT          : { // [SRC1], [SRC2], [SRC3]
				LOAD_ABCDEF();
				X = var_get(ctx, A, B);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when setting index");
				Y = var_get(ctx, C, D);
				if (!sink_isnum(Y))
					RETURN_FAIL("Expecting index to be number");
				ls = var_castlist(ctx, X);
				A = (int)Y.f;
				if (A < 0)
					A += ls->size;
				opi_list_pushnils(ctx, ls, A + 1);
				if (A >= 0 && A < ls->size)
					ls->vals[A] = var_get(ctx, E, F);
			} break;

			case OP_SPLICE         : { // [SRC1], [SRC2], [SRC3], [SRC4]
				LOAD_ABCDEFGH();
				X = var_get(ctx, A, B);
				if (!sink_islist(X) && !sink_isstr(X))
					RETURN_FAIL("Expecting list or string when splicing");
				Y = var_get(ctx, C, D);
				Z = var_get(ctx, E, F);
				if (!sink_isnum(Y) || (!sink_isnil(Z) && !sink_isnum(Z)))
					RETURN_FAIL("Expecting splice values to be numbers");
				W = var_get(ctx, G, H);
				if (sink_islist(X)){
					if (!sink_isnil(W) && !sink_islist(W))
						RETURN_FAIL("Expecting spliced value to be a list");
					opi_list_splice(ctx, X, Y, Z, W);
				}
				else if (sink_isstr(X)){
					if (!sink_isnil(W) && !sink_isstr(W))
						RETURN_FAIL("Expecting spliced value to be a string");
					var_set(ctx, A, B, opi_str_splice(ctx, X, Y, Z, W));
				}
				else
					RETURN_FAIL("Expecting list or string when splicing");
			} break;

			case OP_JUMP           : { // [[LOCATION]]
				LOAD_abcd();
				A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
				if (ctx->prg->repl && A == -1){
					ctx->pc -= 5;
					return crr_replmore();
				}
				ctx->pc = A;
			} break;

			case OP_JUMPTRUE       : { // [SRC], [[LOCATION]]
				LOAD_ABcdef();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (!sink_isnil(var_get(ctx, A, B))){
					if (ctx->prg->repl && C == -1){
						ctx->pc -= 7;
						return crr_replmore();
					}
					ctx->pc = C;
				}
			} break;

			case OP_JUMPFALSE      : { // [SRC], [[LOCATION]]
				LOAD_ABcdef();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (sink_isnil(var_get(ctx, A, B))){
					if (ctx->prg->repl && C == -1){
						ctx->pc -= 7;
						return crr_replmore();
					}
					ctx->pc = C;
				}
			} break;

			case OP_CALL           : { // [TGT], [SRC], LEVEL, [[LOCATION]]
				LOAD_ABCDefghi();
				if (E > ctx->lex_index)
					return crr_invalid(ctx);
				F = F + (G << 8) + (H << 16) + ((I << 23) * 2);
				if (ctx->prg->repl && F == -1){
					ctx->pc -= 10;
					return crr_replmore();
				}
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling function");
				list_ptr_push(ctx->call_stk, ccs_new(ctx->pc, A, B, ctx->lex_index));
				ctx->lex_index = ctx->lex_index - E + 1;
				while (ctx->lex_index >= ctx->lex_stk->size)
					list_ptr_push(ctx->lex_stk, NULL);
				ctx->lex_stk->ptrs[ctx->lex_index] = lxs_new(X, ctx->lex_stk->ptrs[ctx->lex_index]);
				ctx->pc = F;
			} break;

			case OP_NATIVE         : { // [TGT], [SRC], [INDEX]
				LOAD_ABCDef();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling function");
				E = E | (F << 8);
				if (E < 0 || E >= ctx->prg->keyTable->size)
					RETURN_FAIL("Invalid native call");
				uint64_t hash = ctx->prg->keyTable->vals[E];
				bool found = false;
				for (int i = 0; i < ctx->natives->size; i++){
					native nat = ctx->natives->ptrs[i];
					if (nat->hash == hash){
						found = true;
						ls = var_castlist(ctx, X);
						X = nat->f_native(ctx, ls->size, ls->vals, nat->natuser);
						if (ctx->failed)
							return crr_exitfail(ctx);
						if (sink_isasync(X)){
							ctx->async_fdiff = A;
							ctx->async_index = B;
							ctx->timeout_left = ctx->timeout;
							return crr_async(ctx);
						}
						else{
							var_set(ctx, A, B, X);
							break;
						}
					}
				}
				if (!found)
					RETURN_FAIL("Invalid native call");
			} break;

			case OP_RETURN         : { // [SRC]
				if (ctx->call_stk->size <= 0)
					return crr_exitpass(ctx);
				LOAD_AB();
				X = var_get(ctx, A, B);
				ccs s = list_ptr_pop(ctx->call_stk);
				lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
				ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
				lxs_free(lx);
				ctx->lex_index = s->lex_index;
				var_set(ctx, s->fdiff, s->index, X);
				ctx->pc = s->pc;
				ccs_free(s);
			} break;

			case OP_RETURNTAIL     : { // [SRC], [[LOCATION]]
				LOAD_ABcdef();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (ctx->prg->repl && C == -1){
					ctx->pc -= 7;
					return crr_replmore();
				}
				X = var_get(ctx, A, B);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling function");
				lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
				ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
				lxs_free(lx);
				ctx->lex_stk->ptrs[ctx->lex_index] = lxs_new(X, ctx->lex_stk->ptrs[ctx->lex_index]);
				ctx->pc = C;
			} break;

			case OP_RANGE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_ABCDEFGH();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number for range");
				if (sink_isnum(Y)){
					if (sink_isnil(Z))
						Z = sink_num(1);
					if (!sink_isnum(Z))
						RETURN_FAIL("Expecting number for range step");
					X = opi_range(ctx, sink_castnum(X), sink_castnum(Y), sink_castnum(Z));
				}
				else if (sink_isnil(Y)){
					if (!sink_isnil(Z))
						RETURN_FAIL("Expecting number for range stop");
					X = opi_range(ctx, 0, sink_castnum(X), 1);
				}
				else
					RETURN_FAIL("Expecting number for range stop");
				if (sink_isnil(X))
					RETURN_FAIL("Range too large (over 10000000)");
				var_set(ctx, A, B, X);
			} break;

			case OP_SAY            : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling say");
				ls = var_castlist(ctx, X);
				opi_say(ctx, ls->size, ls->vals);
				var_set(ctx, A, B, SINK_NIL);
				if (ctx->failed)
					return crr_exitfail(ctx);
			} break;

			case OP_WARN           : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling warn");
				ls = var_castlist(ctx, X);
				opi_warn(ctx, ls->size, ls->vals);
				var_set(ctx, A, B, SINK_NIL);
				if (ctx->failed)
					return crr_exitfail(ctx);
			} break;

			case OP_ASK            : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling ask");
				ls = var_castlist(ctx, X);
				var_set(ctx, A, B, opi_ask(ctx, ls->size, ls->vals));
				if (ctx->failed)
					return crr_exitfail(ctx);
			} break;

			case OP_EXIT           : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling exit");
				ls = var_castlist(ctx, X);
				opi_exit(ctx, ls->size, ls->vals);
				return crr_exitpass(ctx);
			} break;

			case OP_ABORT          : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling abort");
				ls = var_castlist(ctx, X);
				opi_abort(ctx, ls->size, ls->vals);
				return SINK_RUN_FAIL; // return this directly so REPL's are affected by `abort`
			} break;

			case OP_NUM_NEG        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_neg, "negating")
			} break;

			case OP_NUM_ADD        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_add, "adding")
			} break;

			case OP_NUM_SUB        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_sub, "subtracting")
			} break;

			case OP_NUM_MUL        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_mul, "multiplying")
			} break;

			case OP_NUM_DIV        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_div, "dividing")
			} break;

			case OP_NUM_MOD        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_mod, "taking modular")
			} break;

			case OP_NUM_POW        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_pow, "exponentiating")
			} break;

			case OP_NUM_ABS        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_abs, "taking absolute value")
			} break;

			case OP_NUM_SIGN       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_sign, "taking sign")
			} break;

			case OP_NUM_MAX        : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling num.max");
				var_set(ctx, A, B, opi_num_max(ctx, X));
			} break;

			case OP_NUM_MIN        : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling num.max");
				var_set(ctx, A, B, opi_num_min(ctx, X));
			} break;

			case OP_NUM_CLAMP      : { // [TGT], [SRC1], [SRC2], [SRC3]
				INLINE_TRIOP(triop_num_clamp, "clamping")
			} break;

			case OP_NUM_FLOOR      : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_floor, "taking floor")
			} break;

			case OP_NUM_CEIL       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_ceil, "taking ceil")
			} break;

			case OP_NUM_ROUND      : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_round, "rounding")
			} break;

			case OP_NUM_TRUNC      : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_trunc, "truncating")
			} break;

			case OP_NUM_NAN        : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num_nan());
			} break;

			case OP_NUM_INF        : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num_inf());
			} break;

			case OP_NUM_ISNAN      : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, sink_bool(sink_num_isnan(X)));
			} break;

			case OP_NUM_ISFINITE   : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, sink_bool(sink_num_isfinite(X)));
			} break;

			case OP_NUM_E          : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num_e());
			} break;

			case OP_NUM_PI         : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num_pi());
			} break;

			case OP_NUM_TAU        : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num_tau());
			} break;

			case OP_NUM_SIN        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_sin, "taking sin")
			} break;

			case OP_NUM_COS        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_cos, "taking cos")
			} break;

			case OP_NUM_TAN        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_tan, "taking tan")
			} break;

			case OP_NUM_ASIN       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_asin, "taking arc-sin")
			} break;

			case OP_NUM_ACOS       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_acos, "taking arc-cos")
			} break;

			case OP_NUM_ATAN       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_atan, "taking arc-tan")
			} break;

			case OP_NUM_ATAN2      : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_atan2, "taking arc-tan")
			} break;

			case OP_NUM_LOG        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_log, "taking logarithm")
			} break;

			case OP_NUM_LOG2       : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_log2, "taking logarithm")
			} break;

			case OP_NUM_LOG10      : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_log10, "taking logarithm")
			} break;

			case OP_NUM_EXP        : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_exp, "exponentiating")
			} break;

			case OP_NUM_LERP       : { // [TGT], [SRC1], [SRC2], [SRC3]
				INLINE_TRIOP(triop_num_lerp, "lerping")
			} break;

			case OP_NUM_HEX        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_hex, "converting to hex")
			} break;

			case OP_NUM_OCT        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_oct, "converting to oct")
			} break;

			case OP_NUM_BIN        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_num_bin, "converting to bin")
			} break;

			case OP_INT_NEW        : { // [TGT], [SRC]
				INLINE_UNOP(unop_int_new, "casting to int")
			} break;

			case OP_INT_NOT        : { // [TGT], [SRC]
				INLINE_UNOP(unop_int_not, "NOTing")
			} break;

			case OP_INT_AND        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_and, "ANDing")
			} break;

			case OP_INT_OR         : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_or, "ORing")
			} break;

			case OP_INT_XOR        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_xor, "XORing")
			} break;

			case OP_INT_SHL        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_shl, "shifting left")
			} break;

			case OP_INT_SHR        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_shr, "shifting right")
			} break;

			case OP_INT_SAR        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_sar, "shifting right")
			} break;

			case OP_INT_ADD        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_add, "adding")
			} break;

			case OP_INT_SUB        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_sub, "subtracting");
			} break;

			case OP_INT_MUL        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_mul, "multiplying")
			} break;

			case OP_INT_DIV        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_div, "dividing")
			} break;

			case OP_INT_MOD        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP(binop_int_mod, "taking modular")
			} break;

			case OP_INT_CLZ        : { // [TGT], [SRC]
				INLINE_UNOP(unop_int_clz, "counting leading zeros")
			} break;

			case OP_RAND_SEED      : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number");
				opi_rand_seed(ctx, X.f);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_RAND_SEEDAUTO  : { // [TGT]
				LOAD_AB();
				opi_rand_seedauto(ctx);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_RAND_INT       : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num(opi_rand_int(ctx)));
			} break;

			case OP_RAND_NUM       : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, sink_num(opi_rand_num(ctx)));
			} break;

			case OP_RAND_GETSTATE  : { // [TGT]
				LOAD_AB();
				var_set(ctx, A, B, opi_rand_getstate(ctx));
			} break;

			case OP_RAND_SETSTATE  : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list of two integers");
				ls = var_castlist(ctx, X);
				 if (ls->size < 2 || !sink_isnum(ls->vals[0]) || !sink_isnum(ls->vals[1]))
				 	RETURN_FAIL("Expecting list of two integers");
				opi_rand_setstate(ctx, ls->vals[0].f, ls->vals[1].f);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_RAND_PICK      : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list");
				var_set(ctx, A, B, opi_rand_pick(ctx, X));
			} break;

			case OP_RAND_SHUFFLE   : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list");
				opi_rand_shuffle(ctx, X);
				var_set(ctx, A, B, X);
			} break;

			case OP_STR_NEW        : { // [TGT], [SRC...]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when calling say");
				var_set(ctx, A, B, opi_str_new(ctx, X));
			} break;

			case OP_STR_SPLIT      : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = sink_tostr(ctx, var_get(ctx, C, D));
				Y = sink_tostr(ctx, var_get(ctx, E, F));
				var_set(ctx, A, B, opi_str_split(ctx, X, Y));
			} break;

			case OP_STR_REPLACE    : { // [TGT], [SRC1], [SRC2], [SRC3]
				THROW("OP_STR_REPLACE");
			} break;

			case OP_STR_BEGINS     : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_BEGINS");
			} break;

			case OP_STR_ENDS       : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_ENDS");
			} break;

			case OP_STR_PAD        : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_PAD");
			} break;

			case OP_STR_FIND       : { // [TGT], [SRC1], [SRC2], [SRC3]
				THROW("OP_STR_FIND");
			} break;

			case OP_STR_RFIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				THROW("OP_STR_RFIND");
			} break;

			case OP_STR_LOWER      : { // [TGT], [SRC]
				THROW("OP_STR_LOWER");
			} break;

			case OP_STR_UPPER      : { // [TGT], [SRC]
				THROW("OP_STR_UPPER");
			} break;

			case OP_STR_TRIM       : { // [TGT], [SRC]
				THROW("OP_STR_TRIM");
			} break;

			case OP_STR_REV        : { // [TGT], [SRC]
				THROW("OP_STR_REV");
			} break;

			case OP_STR_REP        : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_REP");
			} break;

			case OP_STR_LIST       : { // [TGT], [SRC]
				THROW("OP_STR_LIST");
			} break;

			case OP_STR_BYTE       : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_BYTE");
			} break;

			case OP_STR_HASH       : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STR_HASH");
			} break;

			case OP_UTF8_VALID     : { // [TGT], [SRC]
				THROW("OP_UTF8_VALID");
			} break;

			case OP_UTF8_LIST      : { // [TGT], [SRC]
				THROW("OP_UTF8_LIST");
			} break;

			case OP_UTF8_STR       : { // [TGT], [SRC]
				THROW("OP_UTF8_STR");
			} break;

			case OP_STRUCT_SIZE    : { // [TGT], [SRC]
				THROW("OP_STRUCT_SIZE");
			} break;

			case OP_STRUCT_STR     : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STRUCT_STR");
			} break;

			case OP_STRUCT_LIST    : { // [TGT], [SRC1], [SRC2]
				THROW("OP_STRUCT_LIST");
			} break;

			case OP_LIST_NEW       : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				if (!sink_isnil(X) && !sink_isnum(X))
					RETURN_FAIL("Expecting number for list.new");
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_list_new(ctx, X, Y));
			} break;

			case OP_LIST_SHIFT     : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when shifting");
				var_set(ctx, A, B, opi_list_shift(ctx, X));
			} break;

			case OP_LIST_POP       : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when popping");
				var_set(ctx, A, B, opi_list_pop(ctx, X));
			} break;

			case OP_LIST_PUSH      : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when pushing");
				var_set(ctx, A, B, opi_list_push(ctx, X, var_get(ctx, E, F)));
			} break;

			case OP_LIST_UNSHIFT   : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when unshifting");
				var_set(ctx, A, B, opi_list_unshift(ctx, X, var_get(ctx, E, F)));
			} break;

			case OP_LIST_APPEND    : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					RETURN_FAIL("Expecting list when appending");
				var_set(ctx, A, B, opi_list_append(ctx, X, Y));
			} break;

			case OP_LIST_PREPEND   : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					RETURN_FAIL("Expecting list when prepending");
				var_set(ctx, A, B, opi_list_prepend(ctx, X, Y));
			} break;

			case OP_LIST_FIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_ABCDEFGH();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.find");
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnil(Z) && !sink_isnum(Z))
					RETURN_FAIL("Expecting number for list.find");
				var_set(ctx, A, B, opi_list_find(ctx, X, Y, Z));
			} break;

			case OP_LIST_RFIND     : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_ABCDEFGH();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.rfind");
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnil(Z) && !sink_isnum(Z))
					RETURN_FAIL("Expecting number for list.rfind");
				var_set(ctx, A, B, opi_list_find(ctx, X, Y, Z));
			} break;

			case OP_LIST_JOIN      : { // [TGT], [SRC1], [SRC2]
				LOAD_ABCDEF();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.join");
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_list_join(ctx, X, Y));
				if (ctx->failed)
					return crr_exitfail(ctx);
			} break;

			case OP_LIST_REV       : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.rev");
				var_set(ctx, A, B, opi_list_rev(ctx, X));
			} break;

			case OP_LIST_STR       : { // [TGT], [SRC]
				LOAD_ABCD();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.str");
				// TODO: move this to opi_list_str
				ls = sink_castlist(ctx, X);
				uint8_t *bytes = mem_alloc(sizeof(uint8_t) * ls->size);
				for (I = 0; I < ls->size; I++){
					X = ls->vals[I];
					if (!sink_isnum(X)){
						mem_free(bytes);
						RETURN_FAIL("Expecting list of integers for list.str");
					}
					H = (int)sink_castnum(X);
					if (H < 0)
						H = 0;
					if (H > 255)
						H = 255;
					bytes[I] = H;
				}
				var_set(ctx, A, B, sink_str_newblobgive(ctx, ls->size, bytes));
			} break;

			case OP_LIST_SORT      : { // [TGT], [SRC]
				THROW("OP_LIST_SORT");
			} break;

			case OP_LIST_RSORT     : { // [TGT], [SRC]
				THROW("OP_LIST_RSORT");
			} break;

			case OP_LIST_SORTCMP   : { // [TGT], [SRC1], [SRC2]
				THROW("OP_LIST_SORTCMP");
			} break;

			case OP_PICKLE_VALID   : { // [TGT], [SRC]
				THROW("OP_PICKLE_VALID");
			} break;

			case OP_PICKLE_STR     : { // [TGT], [SRC]
				THROW("OP_PICKLE_STR");
			} break;

			case OP_PICKLE_VAL     : { // [TGT], [SRC]
				THROW("OP_PICKLE_VAL");
			} break;

			case OP_GC_LEVEL       : { // [TGT]
				THROW("OP_GC_LEVEL");
			} break;

			case OP_GC_RUN         : { // [TGT]
				THROW("OP_GC_RUN");
			} break;

			default:
				debugf("invalid opcode %02X", ops->bytes[ctx->pc]);
				return crr_invalid(ctx);
		}
		if (ctx->timeout > 0){
			ctx->timeout_left--;
			if (ctx->timeout_left <= 0){
				ctx->timeout_left = ctx->timeout;
				return crr_timeout();
			}
		}
	}

	#undef LOAD_ab
	#undef LOAD_AB
	#undef LOAD_ABc
	#undef LOAD_abcd
	#undef LOAD_ABcd
	#undef LOAD_ABCD
	#undef LOAD_abcdef
	#undef LOAD_ABcdef
	#undef LOAD_ABCDef
	#undef LOAD_ABCDEF
	#undef LOAD_abcdefgh
	#undef LOAD_ABCDEFGH
	#undef LOAD_ABCDefghi
	#undef INLINE_UNOP
	#undef INLINE_BINOP
	#undef INLINE_TRIOP
	#undef RETURN_FAIL

	if (ctx->prg->repl)
		return crr_replmore();
	return crr_exitpass(ctx);
}

//
// compiler
//

typedef struct {
	list_ptr tks;
	filepos_st flp;
} tkflp_st, *tkflp;

static void tkflp_free(tkflp tf){
	list_ptr_free(tf->tks);
	mem_free(tf);
}

static tkflp tkflp_new(list_ptr tks, filepos_st flp){
	tkflp tf = mem_alloc(sizeof(tkflp_st));
	tf->tks = tks;
	tf->flp = flp;
	return tf;
}

typedef struct filepos_node_struct filepos_node_st, *filepos_node;
struct filepos_node_struct {
	lex lx;
	list_ptr tkflps;
	list_ptr stmts;
	list_ptr pgstate;
	filepos_node next;
	filepos_st flp;
	bool wascr;
};

static filepos_node flpn_new(char *file, filepos_node next){
	filepos_node flpn = mem_alloc(sizeof(filepos_node_st));
	flpn->lx = lex_new();
	flpn->tkflps = list_ptr_new((free_func)tkflp_free);
	flpn->pgstate = list_ptr_new((free_func)pgst_free);
	flpn->flp.file = file;
	flpn->flp.line = 1;
	flpn->flp.chr = 1;
	flpn->wascr = false;
	flpn->next = next;
	return flpn;
}

static void flpn_free(filepos_node flpn){
	lex_free(flpn->lx);
	list_ptr_free(flpn->tkflps);
	list_ptr_free(flpn->pgstate);
	if (flpn->flp.file)
		mem_free(flpn->flp.file);
	mem_free(flpn);
}

typedef struct {
	list_ptr name;
	list_ptr body;
} staticinc_st, *staticinc;

static inline staticinc staticinc_new(){
	staticinc sinc = mem_alloc(sizeof(staticinc_st));
	sinc->name = list_ptr_new(NULL);
	sinc->body = list_ptr_new(NULL);
	return sinc;
}

static inline void staticinc_add(staticinc sinc, const char *name, const char *body){
	list_ptr_push(sinc->name, (void *)name);
	list_ptr_push(sinc->body, (void *)body);
}

static inline void staticinc_free(staticinc sinc){
	list_ptr_free(sinc->name);
	list_ptr_free(sinc->body);
	mem_free(sinc);
}

typedef struct script_struct script_st, *script;

typedef struct {
	staticinc sinc;
	parser pr;
	script scr; // not freed by compiler_free
	program prg; // not freed by compiler_free
	list_ptr paths; // not freed by compiler_free
	symtbl sym;
	filepos_node flpn;
	sink_inc_st inc;
	char *msg;
} compiler_st, *compiler;

static compiler compiler_new(script scr, program prg, staticinc sinc, sink_inc_st inc, char *file,
	list_ptr paths){
	compiler cmp = mem_alloc(sizeof(compiler_st));
	cmp->sinc = sinc;
	cmp->pr = parser_new();
	cmp->scr = scr;
	cmp->prg = prg;
	cmp->paths = paths;
	cmp->sym = symtbl_new(prg->repl);
	symtbl_loadStdlib(cmp->sym);
	cmp->flpn = flpn_new(file, NULL);
	cmp->inc = inc;
	cmp->msg = NULL;
	return cmp;
}

static void compiler_reset(compiler cmp){
	if (cmp->msg){
		mem_free(cmp->msg);
		cmp->msg = NULL;
	}

	lex_reset(cmp->flpn->lx);
	parser_free(cmp->pr);
	cmp->pr = parser_new();

	list_ptr_free(cmp->flpn->tkflps);
	cmp->flpn->tkflps = list_ptr_new((free_func)tkflp_free);

	list_ptr_free(cmp->flpn->pgstate);
	cmp->flpn->pgstate = list_ptr_new((free_func)pgst_free);
}

static void compiler_begininc(compiler cmp, list_ptr names, char *file){
	cmp->flpn = flpn_new(file, cmp->flpn);
	if (names){
		// TODO: symtbl_pushNamespace can return an error!
		symtbl_pushNamespace(cmp->sym, names);
	}
}

static void compiler_endinc(compiler cmp, bool ns){
	if (ns)
		symtbl_popNamespace(cmp->sym);
	filepos_node del = cmp->flpn;
	cmp->flpn = cmp->flpn->next;
	flpn_free(del);
}

static char *compiler_write(compiler cmp, int size, const uint8_t *bytes);
static char *compiler_closeLexer(compiler cmp);

static bool compiler_staticinc(compiler cmp, list_ptr names, const char *file, const char *body){
	compiler_begininc(cmp, names, sink_format("%s", file));
	char *err = compiler_write(cmp, strlen(body), (const uint8_t *)body);
	if (err){
		compiler_endinc(cmp, names != NULL);
		return false;
	}
	err = compiler_closeLexer(cmp);
	compiler_endinc(cmp, names != NULL);
	if (err)
		return false;
	return true;
}

static void pathjoin_apply(char *res, int *r, int len, const char *buf){
	if (len <= 0 || (len == 1 && buf[0] == '.'))
		return;
	if (len == 2 && buf[0] == '.' && buf[1] == '.'){
		for (int i = *r - 1; i >= 0; i--){
			if (res[i] == '/'){
				*r = i;
				return;
			}
		}
		return;
	}
	res[(*r)++] = '/';
	for (int i = 0; i < len; i++)
		res[(*r)++] = buf[i];
}

static void pathjoin_helper(char *res, int *r, int len, const char *buf){
	for (int i = 0; i < len; i++){
		if (buf[i] == '/')
			continue;
		int start = i;
		while (i < len && buf[i] != '/')
			i++;
		pathjoin_apply(res, r, i - start, &buf[start]);
	}
}

static char *pathjoin(const char *prev, const char *next){
	int prev_len = strlen(prev);
	int next_len = strlen(next);
	int len = prev_len + next_len + 2;
	char *res = mem_alloc(sizeof(char) * len);
	int r = 0;
	pathjoin_helper(res, &r, prev_len, prev);
	pathjoin_helper(res, &r, next_len, next);
	res[r++] = 0;
	return res;
}

static bool compiler_tryinc(compiler cmp, list_ptr names, const char *file, bool first){
	char *fix = (char *)file;
	bool freefix = false;
	if (cmp->inc.f_fixpath){
		fix = cmp->inc.f_fixpath(file, cmp->inc.user);
		freefix = true;
	}
	if (fix == NULL)
		return false;

	sink_fstype fst = cmp->inc.f_fstype(fix, cmp->inc.user);
	if (fst != SINK_FSTYPE_FILE){
		if (first){
			if (fst == SINK_FSTYPE_NONE){
				// try adding a .sink extension
				int len = strlen(file);
				if (len < 5 || strcmp(&file[len - 5], ".sink") != 0){
					char *cat = mem_alloc(sizeof(char) * (len + 6));
					memcpy(cat, file, sizeof(char) * len);
					cat[len + 0] = '.';
					cat[len + 1] = 's';
					cat[len + 2] = 'i';
					cat[len + 3] = 'n';
					cat[len + 4] = 'k';
					cat[len + 5] = 0;
					bool res = compiler_tryinc(cmp, names, cat, false);
					mem_free(cat);
					if (freefix)
						mem_free(fix);
					return res;
				}
				else{
					// already has .sink extension, so abort
					if (freefix)
						mem_free(fix);
					return false;
				}
			}
			else{ // fst == SINK_FSTYPE_DIR
				// try looking for index.sink inside the directory
				char *join = pathjoin(file, "index.sink");
				bool res = compiler_tryinc(cmp, names, join, false);
				mem_free(join);
				if (freefix)
					mem_free(fix);
				return res;
			}
		}
		else{
			if (freefix)
				mem_free(fix);
			return false;
		}
	}

	compiler_begininc(cmp, names, sink_format("%s", fix));

	bool success = cmp->inc.f_fsread(cmp->scr, fix, cmp->inc.user);

	if (freefix)
		mem_free(fix);

	if (!success){
		compiler_endinc(cmp, names != NULL);
		if (cmp->msg == NULL)
			cmp->msg = sink_format("Failed to read file: %s", fix);
		return true;
	}

	compiler_closeLexer(cmp);
	compiler_endinc(cmp, names != NULL);
	return true;
}

static bool compiler_dynamicinc(compiler cmp, list_ptr names, const char *file, const char *from){
	if (file[0] == '/'){
		// if an absolute path, there is no searching, so just try to include it directly
		return compiler_tryinc(cmp, names, file, true);
	}
	// otherwise, we have a relative path, so we need to go through our search list
	char *cwd = NULL;
	for (int i = 0; i < cmp->paths->size; i++){
		char *path = cmp->paths->ptrs[i];
		char *join;
		if (path[0] == '/') // search path is absolute
			join = pathjoin(path, file);
		else{ // search path is relative
			if (from == NULL)
				continue;
			if (cwd == NULL)
				cwd = pathjoin(from, ".."); // remove trailing filename
			char *tmp = pathjoin(cwd, path);
			join = pathjoin(tmp, file);
			mem_free(tmp);
		}
		bool found = compiler_tryinc(cmp, names, join, true);
		mem_free(join);
		if (found || cmp->msg){
			if (cwd)
				mem_free(cwd);
			return true;
		}
	}
	if (cwd)
		mem_free(cwd);
	return false;
}

static char *compiler_process(compiler cmp){
	// generate statements
	list_ptr stmts = list_ptr_new((free_func)ast_free);
	while (cmp->flpn->tkflps->size > 0){
		bool found_include = false;
		while (cmp->flpn->tkflps->size > 0){
			tkflp tf = cmp->flpn->tkflps->ptrs[0];
			while (tf->tks->size > 0){
				tok tk = list_ptr_shift(tf->tks);
				tok_print(tk);
				if (tk->type == TOK_ERROR){
					cmp->msg = filepos_err(tf->flp, tk->u.msg);
					tok_free(tk);
					list_ptr_free(stmts);
					return cmp->msg;
				}
				prr_st pp = parser_add(cmp->pr, tk, tf->flp, stmts);
				if (pp.type == PRR_ERROR){
					cmp->msg = filepos_err(tf->flp, pp.msg);
					mem_free(pp.msg);
					list_ptr_free(stmts);
					return cmp->msg;
				}
				if (stmts->size > 0 && ((ast)stmts->ptrs[stmts->size - 1])->type == AST_INCLUDE){
					found_include = true;
					break;
				}
			}
			if (found_include)
				break;
			tkflp_free(list_ptr_shift(cmp->flpn->tkflps));
		}

		// process statements
		while (stmts->size > 0){
			ast stmt = list_ptr_shift(stmts);
			ast_print(stmt);

			if (stmt->type == AST_INCLUDE){
				// intercept include statements to process by the compiler
				for (int ii = 0; ii < stmt->u.include.incls->size; ii++){
					incl inc = stmt->u.include.incls->ptrs[ii];
					const char *file = (const char *)inc->file->bytes;

					// look if file matches a static include pseudo-file
					bool internal = false;
					for (int i = 0; i < cmp->sinc->name->size; i++){
						const char *sinc_name = cmp->sinc->name->ptrs[i];
						const char *sinc_body = cmp->sinc->body->ptrs[i];
						if (strcmp(file, sinc_name) == 0){
							internal = true;
							bool success = compiler_staticinc(cmp, inc->names, file, sinc_body);
							if (!success){
								ast_free(stmt);
								list_ptr_free(stmts);
								return cmp->msg;
							}
							break;
						}
					}

					if (!internal){
						bool found = compiler_dynamicinc(cmp, inc->names, file, stmt->flp.file);
						if (!found && cmp->msg == NULL)
							cmp->msg = sink_format("Failed to include: %s", file);
						if (cmp->msg){
							ast_free(stmt);
							list_ptr_free(stmts);
							return cmp->msg;
						}
					}
				}
			}
			else{
				list_ptr pgsl = cmp->flpn->pgstate;
				pgr_st pg = program_gen(cmp->prg, cmp->sym, stmt,
					pgsl->size <= 0 ? NULL : ((pgst)pgsl->ptrs[pgsl->size - 1])->state,
					cmp->prg->repl && cmp->flpn->next == NULL && pgsl->size <= 0);
				symtbl_print(cmp->sym);
				switch (pg.type){
					case PGR_OK:
						break;
					case PGR_PUSH:
						list_ptr_push(pgsl, pg.u.push.pgs);
						break;
					case PGR_POP:
						pgst_free(list_ptr_pop(pgsl));
						break;
					case PGR_ERROR:
						cmp->msg = filepos_err(stmt->flp, pg.u.error.msg);
						ast_free(stmt);
						mem_free(pg.u.error.msg);
						list_ptr_free(stmts);
						return cmp->msg;
					case PGR_FORVARS:
						// impossible
						break;
				}
			}
			ast_free(stmt);
		}
	}
	list_ptr_free(stmts);
	return NULL;
}

static char *compiler_write(compiler cmp, int size, const uint8_t *bytes){
	list_ptr tks = NULL;
	filepos_node flpn = cmp->flpn;
	for (int i = 0; i < size; i++){
		if (tks == NULL)
			tks = list_ptr_new((free_func)tok_free);
		lex_add(flpn->lx, bytes[i], tks);

		if (tks->size > 0){
			list_ptr_push(flpn->tkflps, tkflp_new(tks, flpn->flp));
			tks = NULL;
		}

		if (bytes[i] == '\n'){
			if (!flpn->wascr){
				flpn->flp.line++;
				flpn->flp.chr = 1;
			}
			flpn->wascr = false;
		}
		else if (bytes[i] == '\r'){
			flpn->flp.line++;
			flpn->flp.chr = 1;
			flpn->wascr = true;
		}
		else
			flpn->wascr = false;
	}
	if (tks != NULL)
		list_ptr_free(tks);

	return compiler_process(cmp);
}

static char *compiler_closeLexer(compiler cmp){
	list_ptr tks = list_ptr_new((free_func)tok_free);
	lex_close(cmp->flpn->lx, tks);
	if (tks->size > 0)
		list_ptr_push(cmp->flpn->tkflps, tkflp_new(tks, cmp->flpn->flp));
	else
		list_ptr_free(tks);
	return compiler_process(cmp);
}

static char *compiler_close(compiler cmp){
	char *err = compiler_closeLexer(cmp);
	if (err)
		return err;

	prr_st pr = parser_close(cmp->pr);
	if (pr.type == PRR_ERROR){
		cmp->msg = filepos_err(cmp->flpn->flp, pr.msg);
		mem_free(pr.msg);
		return cmp->msg;
	}

	return NULL;
}

static void compiler_free(compiler cmp){
	if (cmp->msg)
		mem_free(cmp->msg);
	parser_free(cmp->pr);
	symtbl_free(cmp->sym);
	filepos_node flpn = cmp->flpn;
	while (flpn){
		filepos_node del = flpn;
		flpn = flpn->next;
		flpn_free(del);
	}
	mem_free(cmp);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//
// API
//
////////////////////////////////////////////////////////////////////////////////////////////////////

//
// script API
//

struct script_struct {
	program prg;
	compiler cmp;
	staticinc sinc;
	cleanup cup;
	list_ptr paths;
	sink_inc_st inc;
	char *fullfile;
	char *msg;
	int mode; // 0 = unsure, 1 = load binary, 2 = compile text
};

sink_scr sink_scr_new(sink_inc_st inc, const char *fullfile, bool repl){
	if (fullfile != NULL && fullfile[0] != '/')
		fprintf(stderr, "Warning: sink script \"%s\" is not an absolute path\n", fullfile);
	script sc = mem_alloc(sizeof(script_st));
	sc->prg = program_new(repl);
	sc->cmp = NULL;
	sc->sinc = staticinc_new();
	sc->cup = cleanup_new();
	sc->paths = list_ptr_new(mem_free_func);
	sc->inc = inc;
	sc->fullfile = fullfile ? sink_format("%s", fullfile) : NULL;
	sc->msg = NULL;
	sc->mode = 0;
	return sc;
}

void sink_scr_addpath(sink_scr scr, const char *path){
	list_ptr_push(((script)scr)->paths, sink_format("%s", path));
}

void sink_scr_inc(sink_scr scr, const char *name, const char *body){
	staticinc_add(((script)scr)->sinc, name, body);
}

void sink_scr_cleanup(sink_scr scr, void *cuser, sink_free_func f_free){
	cleanup_add(((script)scr)->cup, cuser, f_free);
}

const char *sink_scr_write(sink_scr scr, int size, const uint8_t *bytes){
	if (size <= 0)
		return NULL;
	script sc = scr;

	// sink binary files start with 0xFC (invalid UTF8 start byte), so we can tell if we're binary
	// just by looking at the first byte
	if (sc->mode == 0){
		if (bytes[0] == 0xFC)
			sc->mode = 1;
		else{
			sc->mode = 2;
			sc->cmp = compiler_new(sc, sc->prg, sc->sinc, sc->inc, sc->fullfile, sc->paths);
			sc->fullfile = NULL; // ownership passes to compiler
		}
	}

	if (sc->mode == 1){
		fprintf(stderr, "TODO: read/write binary sink file\n");
		abort();
		return NULL;
	}
	else{
		char *err = compiler_write(sc->cmp, size, bytes);
		if (err && sc->prg->repl){
			// move ownership of error over to sc
			if (sc->msg)
				mem_free(sc->msg);
			sc->msg = err;
			sc->cmp->msg = NULL;
			// reset compiler
			compiler_reset(sc->cmp);
		}
		return err;
	}
}

void sink_scr_resetpos(sink_scr scr){
	script sc = scr;
	if (sc->mode != 2)
		return;
	sc->cmp->flpn->flp.line = 1;
	sc->cmp->flpn->flp.chr = 1;
}

int sink_scr_level(sink_scr scr){
	if (((script)scr)->mode != 2)
		return 0;
	return ((script)scr)->cmp->pr->level;
}

const char *sink_scr_close(sink_scr scr){
	script sc = scr;
	if (sc->mode == 0)
		return NULL;
	else if (sc->mode == 1){
		fprintf(stderr, "TODO: close binary sink file\n");
		abort();
		return NULL;
	}
	else
		return compiler_close(sc->cmp);
}

void sink_scr_dump(sink_scr scr, void *user, sink_dump_func f_dump){
	fprintf(stderr, "TODO: write sc->prg to f_dump\n");
	abort();
}

void sink_scr_free(sink_scr scr){
	script sc = scr;
	list_ptr_free(sc->paths);
	program_free(sc->prg);
	staticinc_free(sc->sinc);
	cleanup_free(sc->cup);
	if (sc->cmp)
		compiler_free(sc->cmp);
	if (sc->fullfile)
		mem_free(sc->fullfile);
	if (sc->msg)
		mem_free(sc->msg);
	mem_free(sc);
	#ifdef SINK_MEMTEST
	mem_done();
	#endif
}

//
// context API
//

sink_ctx sink_ctx_new(sink_scr scr, sink_io_st io){
	return context_new(((script)scr)->prg, io);
}

void sink_ctx_native(sink_ctx ctx, const char *name, void *natuser, sink_native_func f_native){
	context_native(ctx, native_hash(strlen(name), (const uint8_t *)name), natuser, f_native);
}

void sink_ctx_nativehash(sink_ctx ctx, uint64_t hash, void *natuser, sink_native_func f_native){
	context_native(ctx, hash, natuser, f_native);
}

void sink_ctx_cleanup(sink_ctx ctx, void *cuser, sink_free_func f_cleanup){
	context_cleanup(ctx, cuser, f_cleanup);
}

void sink_ctx_setuser(sink_ctx ctx, void *user, sink_free_func f_freeuser){
	context ctx2 = ctx;
	if (ctx2->f_freeuser)
		ctx2->f_freeuser(ctx2->user);
	ctx2->user = user;
	ctx2->f_freeuser = f_freeuser;
}

void *sink_ctx_getuser(sink_ctx ctx){
	return ((context)ctx)->user;
}

sink_user sink_ctx_addusertype(sink_ctx ctx, const char *hint, sink_free_func f_free){
	context ctx2 = ctx;
	list_ptr_push(ctx2->f_finalize, f_free);
	list_ptr_push(ctx2->user_hint, (void *)hint);
	return ctx2->f_finalize->size - 1;
}

sink_free_func sink_ctx_getuserfree(sink_ctx ctx, sink_user usertype){
	return ((context)ctx)->f_finalize->ptrs[usertype];
}

const char *sink_ctx_getuserhint(sink_ctx ctx, sink_user usertype){
	return ((context)ctx)->user_hint->ptrs[usertype];
}

void sink_ctx_asyncresult(sink_ctx ctx, sink_val v){
	context ctx2 = ctx;
	if (!ctx2->async){
		assert(false);
		return;
	}
	var_set(ctx2, ctx2->async_fdiff, ctx2->async_index, v);
	ctx2->async = false;
}

bool sink_ctx_ready(sink_ctx ctx){
	context ctx2 = ctx;
	return !(ctx2->passed || ctx2->failed || ctx2->invalid || ctx2->async);
}

void sink_ctx_settimeout(sink_ctx ctx, int timeout){
	context ctx2 = ctx;
	ctx2->timeout = timeout;
	ctx2->timeout_left = timeout;
}

int sink_ctx_gettimeout(sink_ctx ctx){
	return ((context)ctx)->timeout;
}

void sink_ctx_forcetimeout(sink_ctx ctx){
	((context)ctx)->timeout_left = 0;
}

sink_run sink_ctx_run(sink_ctx ctx){
	return context_run(ctx);
}

void sink_ctx_free(sink_ctx ctx){
	context_free(ctx);
}

sink_str sink_caststr(sink_ctx ctx, sink_val str){
	return var_caststr(ctx, str);
}

sink_list sink_castlist(sink_ctx ctx, sink_val ls){
	return var_castlist(ctx, ls);
}

bool sink_arg_bool(int size, sink_val *args, int index){
	if (index < 0 || index >= size)
		return false;
	return sink_istrue(args[index]);
}

bool sink_arg_num(sink_ctx ctx, int size, sink_val *args, int index, double *num){
	if (index < 0 || index >= size){
		*num = 0;
		return true;
	}
	if (sink_isnum(args[index])){
		*num = sink_castnum(args[index]);
		return true;
	}
	sink_abortformat(ctx, "Expecting number for argument %d", index + 1);
	return false;
}

bool sink_arg_str(sink_ctx ctx, int size, sink_val *args, int index, sink_str *str){
	if (index < 0 || index >= size || !sink_isstr(args[index])){
		sink_abortformat(ctx, "Expecting string for argument %d", index + 1);
		return false;
	}
	*str = sink_caststr(ctx, args[index]);
	return true;
}

bool sink_arg_list(sink_ctx ctx, int size, sink_val *args, int index, sink_list *ls){
	if (index < 0 || index >= size || !sink_islist(args[index])){
		sink_abortformat(ctx, "Expecting list for argument %d", index + 1);
		*ls = NULL;
		return false;
	}
	*ls = sink_castlist(ctx, args[index]);
	return true;
}

bool sink_arg_user(sink_ctx ctx, int size, sink_val *args, int index, sink_user usertype,
	void **user){
	context ctx2 = ctx;
	const char *hint = ctx2->user_hint->ptrs[usertype];

	#define ABORT() \
		sink_abortformat(ctx, "Expecting user type%s%s for argument %d", \
			hint == NULL ? "" : " ", hint == NULL ? "" : hint, index + 1)

	if (index < 0 || index >= size || !sink_islist(args[index])){
		ABORT();
		return false;
	}
	*user = sink_list_getuser(ctx, args[index], usertype);
	if (user == NULL){
		ABORT();
		return false;
	}

	#undef ABORT

	return true;
}

static sink_str_st sinkhelp_tostr(context ctx, sink_val v){
	switch (sink_typeof(v)){
		case SINK_TYPE_NIL: {
			uint8_t *bytes = mem_alloc(sizeof(uint8_t) * 4);
			bytes[0] = 'n'; bytes[1] = 'i'; bytes[2] = 'l'; bytes[3] = 0;
			return (sink_str_st){ .bytes = bytes, .size = 3 };
		} break;

		case SINK_TYPE_NUM: {
			if (isinf(v.f)){
				if (v.f < 0){
					uint8_t *bytes = mem_alloc(sizeof(uint8_t) * 5);
					bytes[0] = '-'; bytes[1] = 'i'; bytes[2] = 'n'; bytes[3] = 'f'; bytes[4] = 0;
					return (sink_str_st){ .bytes = bytes, .size = 4 };
				}
				uint8_t *bytes = mem_alloc(sizeof(uint8_t) * 4);
				bytes[0] = 'i'; bytes[1] = 'n'; bytes[2] = 'f'; bytes[3] = 0;
				return (sink_str_st){ .bytes = bytes, .size = 3 };
			}
			char buf[100];
			int size = snprintf(buf, sizeof(buf), "%.16g", v.f);
			if (buf[0] == '-' && buf[1] == '0' && buf[2] == 0){ // fix negative zero silliness
				buf[0] = '0';
				buf[1] = 0;
				size = 1;
			}
			uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (size + 1));
			memcpy(bytes, buf, sizeof(uint8_t) * (size + 1));
			return (sink_str_st){ .bytes = bytes, .size = size };
		} break;

		case SINK_TYPE_STR: {
			sink_str s = var_caststr(ctx, v);
			int tot = 2;
			for (int i = 0; i < s->size; i++){
				if (s->bytes[i] == '\'' || s->bytes[i] == '\\')
					tot++;
				tot++;
			}
			uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
			bytes[0] = '\'';
			int p = 1;
			for (int i = 0; i < s->size; i++){
				if (s->bytes[i] == '\'' || s->bytes[i] == '\\')
					bytes[p++] = '\\';
				bytes[p++] = s->bytes[i];
			}
			bytes[p++] = '\'';
			bytes[tot] = 0;
			return (sink_str_st){ .bytes = bytes, .size = tot };
		} break;

		case SINK_TYPE_LIST: {
			if (list_hastick(ctx, var_index(v))){
				uint8_t *bytes = mem_alloc(sizeof(uint8_t) * 11);
				bytes[0] = '{'; bytes[1] = 'c'; bytes[2] = 'i'; bytes[3] = 'r'; bytes[4] = 'c';
				bytes[5] = 'u'; bytes[6] = 'l'; bytes[7] = 'a'; bytes[8] = 'r'; bytes[9] = '}';
				bytes[10] = 0;
				return (sink_str_st){ .bytes = bytes, .size = 10 };
			}
			sink_list ls = var_castlist(ctx, v);
			int tot = 2;
			sink_str_st *strs = mem_alloc(sizeof(sink_str_st) * ls->size);
			for (int i = 0; i < ls->size; i++){
				sink_str_st s = sinkhelp_tostr(ctx, ls->vals[i]);
				strs[i] = s;
				tot += (i == 0 ? 0 : 2) + s.size;
			}
			uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
			bytes[0] = '{';
			int p = 1;
			for (int i = 0; i < ls->size; i++){
				if (i > 0){
					bytes[p++] = ',';
					bytes[p++] = ' ';
				}
				if (strs[i].bytes){
					memcpy(&bytes[p], strs[i].bytes, sizeof(uint8_t) * strs[i].size);
					mem_free(strs[i].bytes);
				}
				p += strs[i].size;
			}
			mem_free(strs);
			bytes[p] = '}';
			bytes[tot] = 0;
			return (sink_str_st){ .bytes = bytes, .size = tot };
		} break;

		case SINK_TYPE_ASYNC: {
			opi_abortcstr(ctx, "Cannot convert invalid value (SINK_ASYNC) to string");
			return (sink_str_st){ .bytes = NULL, .size = 0 };
		} break;
	}
}

sink_val sink_tostr(sink_ctx ctx, sink_val v){
	if (sink_isstr(v))
		return v;
	if (sink_islist(v))
		list_cleartick(ctx);
	sink_str_st s = sinkhelp_tostr(ctx, v);
	return sink_str_newblobgive(ctx, s.size, s.bytes);
}

/*
void     sink_say(sink_ctx ctx, int size, sink_val *vals);
void     sink_warn(sink_ctx ctx, int size, sink_val *vals);
sink_val sink_ask(sink_ctx ctx, int size, sink_val *vals);
*/
void sink_exit(sink_ctx ctx, int size, sink_val *vals){
	opi_exit(ctx, size, vals);
}

void sink_abort(sink_ctx ctx, int size, sink_val *vals){
	opi_abort(ctx, size, vals);
}
/*
// numbers
sink_val  sink_num_neg(sink_ctx ctx, sink_val a);
sink_val  sink_num_add(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_sub(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_mul(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_div(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_mod(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_pow(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_abs(sink_ctx ctx, sink_val a);
sink_val  sink_num_sign(sink_ctx ctx, sink_val a);
sink_val  sink_num_max(sink_ctx ctx, int size, sink_val *vals);
sink_val  sink_num_min(sink_ctx ctx, int size, sink_val *vals);
sink_val  sink_num_clamp(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val  sink_num_floor(sink_ctx ctx, sink_val a);
sink_val  sink_num_ceil(sink_ctx ctx, sink_val a);
sink_val  sink_num_round(sink_ctx ctx, sink_val a);
sink_val  sink_num_trunc(sink_ctx ctx, sink_val a);
sink_val  sink_num_sin(sink_ctx ctx, sink_val a);
sink_val  sink_num_cos(sink_ctx ctx, sink_val a);
sink_val  sink_num_tan(sink_ctx ctx, sink_val a);
sink_val  sink_num_asin(sink_ctx ctx, sink_val a);
sink_val  sink_num_acos(sink_ctx ctx, sink_val a);
sink_val  sink_num_atan(sink_ctx ctx, sink_val a);
sink_val  sink_num_atan2(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_log(sink_ctx ctx, sink_val a);
sink_val  sink_num_log2(sink_ctx ctx, sink_val a);
sink_val  sink_num_log10(sink_ctx ctx, sink_val a);
sink_val  sink_num_exp(sink_ctx ctx, sink_val a);
sink_val  sink_num_lerp(sink_ctx ctx, sink_val a, sink_val b, sink_val t);
sink_val  sink_num_hex(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_oct(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_bin(sink_ctx ctx, sink_val a, sink_val b);

// integers
sink_val  sink_int_cast(sink_ctx ctx, sink_val a);
sink_val  sink_int_not(sink_ctx ctx, sink_val a);
sink_val  sink_int_and(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_or(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_xor(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_shl(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_shr(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_sar(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_add(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_sub(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_mul(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_div(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_mod(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_int_clz(sink_ctx ctx, sink_val a);

// random
void      sink_rand_seed(sink_ctx ctx, sink_val a);
void      sink_rand_seedauto(sink_ctx ctx);
uint32_t  sink_rand_int(sink_ctx ctx);
double    sink_rand_num(sink_ctx ctx);
sink_val  sink_rand_getstate(sink_ctx ctx);
void      sink_rand_setstate(sink_ctx ctx, sink_val a);
sink_val  sink_rand_pick(sink_ctx ctx, sink_val ls);
void      sink_rand_shuffle(sink_ctx ctx, sink_val ls);
*/
// strings
sink_val sink_str_newcstr(sink_ctx ctx, const char *str){
	return sink_str_newblob(ctx, strlen(str), (const uint8_t *)str);
}

sink_val sink_str_newblob(sink_ctx ctx, int size, const uint8_t *bytes){
	uint8_t *copy = NULL;
	if (size > 0){
		copy = mem_alloc(sizeof(uint8_t) * (size + 1));
		memcpy(copy, bytes, sizeof(uint8_t) * size);
		copy[size] = 0;
	}
	return sink_str_newblobgive(ctx, size, copy);
}

sink_val sink_str_newblobgive(sink_ctx ctx, int size, uint8_t *bytes){
	if (!((bytes == NULL && size == 0) || bytes[size] == 0)){
		opi_abortcstr(ctx,
			"Native run-time error: sink_str_newblobgive() must either be given a NULL buffer of "
			"size 0, or the buffer must terminate with a 0");
		if (bytes)
			mem_free(bytes);
		return SINK_NIL;
	}
	context ctx2 = ctx;
	int index = bmp_reserve((void **)&ctx2->str_tbl, &ctx2->str_size, &ctx2->str_aloc,
		&ctx2->str_ref, NULL, sizeof(sink_str_st));
	sink_str s = &ctx2->str_tbl[index];
	s->bytes = bytes;
	s->size = size;
	return (sink_val){ .u = SINK_TAG_STR | index };
}

sink_val sink_str_newformat(sink_ctx ctx, const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = mem_alloc(s + 1);
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	return sink_str_newblobgive(ctx, s, (uint8_t *)buf);
}
/*
sink_val  sink_str_new(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_cat(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_tonum(sink_ctx ctx, sink_val a);
int       sink_str_size(sink_ctx ctx, sink_val a);
sink_val  sink_str_split(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_replace(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
bool      sink_str_begins(sink_ctx ctx, sink_val a, sink_val b);
bool      sink_str_ends(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_pad(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_find(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val  sink_str_rfind(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val  sink_str_lower(sink_ctx ctx, sink_val a);
sink_val  sink_str_upper(sink_ctx ctx, sink_val a);
sink_val  sink_str_trim(sink_ctx ctx, sink_val a);
sink_val  sink_str_rev(sink_ctx ctx, sink_val a);
sink_val  sink_str_list(sink_ctx ctx, sink_val a);
sink_val  sink_str_byte(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_hash(sink_ctx ctx, sink_val a, sink_val b);
*/
static inline uint64_t rotl64(uint64_t x, int8_t r){
	return (x << r) | (x >> (64 - r));
}

static inline uint64_t fmix64(uint64_t k){
	k ^= k >> 33;
	k *= UINT64_C(0xFF51AFD7ED558CCD);
	k ^= k >> 33;
	k *= UINT64_C(0xC4CEB9FE1A85EC53);
	k ^= k >> 33;
	return k;
}

void sink_str_hashplain(int size, const uint8_t *str, uint32_t seed, uint32_t *out){
	// MurmurHash3 was written by Austin Appleby, and is placed in the public
	// domain. The author hereby disclaims copyright to this source code.
	// https://github.com/aappleby/smhasher
	uint64_t nblocks = size >> 4;
	uint64_t h1 = seed;
	uint64_t h2 = seed;
	uint64_t c1 = UINT64_C(0x87C37B91114253D5);
	uint64_t c2 = UINT64_C(0x4CF5AD432745937F);

	const uint64_t *blocks = (const uint64_t *)str;

	for (uint64_t i = 0; i < nblocks; i++){
		uint64_t k1 = blocks[i * 2 + 0];
		uint64_t k2 = blocks[i * 2 + 1];

		k1 *= c1;
		k1 = rotl64(k1, 31);
		k1 *= c2;
		h1 ^= k1;

		h1 = rotl64(h1, 27);
		h1 += h2;
		h1 = h1 * 5 + 0x52DCE729;

		k2 *= c2;
		k2 = rotl64(k2, 33);
		k2 *= c1;
		h2 ^= k2;

		h2 = rotl64(h2, 31);
		h2 += h1;
		h2 = h2 * 5 + 0x38495AB5;
	}

	const uint8_t *tail = &str[nblocks << 4];

	uint64_t k1 = 0;
	uint64_t k2 = 0;

	switch(size & 15) {
		case 15: k2 ^= (uint64_t)(tail[14]) << 48;
		case 14: k2 ^= (uint64_t)(tail[13]) << 40;
		case 13: k2 ^= (uint64_t)(tail[12]) << 32;
		case 12: k2 ^= (uint64_t)(tail[11]) << 24;
		case 11: k2 ^= (uint64_t)(tail[10]) << 16;
		case 10: k2 ^= (uint64_t)(tail[ 9]) << 8;
		case  9: k2 ^= (uint64_t)(tail[ 8]) << 0;

			k2 *= c2;
			k2 = rotl64(k2, 33);
			k2 *= c1;
			h2 ^= k2;

		case  8: k1 ^= (uint64_t)(tail[ 7]) << 56;
		case  7: k1 ^= (uint64_t)(tail[ 6]) << 48;
		case  6: k1 ^= (uint64_t)(tail[ 5]) << 40;
		case  5: k1 ^= (uint64_t)(tail[ 4]) << 32;
		case  4: k1 ^= (uint64_t)(tail[ 3]) << 24;
		case  3: k1 ^= (uint64_t)(tail[ 2]) << 16;
		case  2: k1 ^= (uint64_t)(tail[ 1]) << 8;
		case  1: k1 ^= (uint64_t)(tail[ 0]) << 0;

			k1 *= c1;
			k1 = rotl64(k1, 31);
			k1 *= c2;
			h1 ^= k1;
	}

	h1 ^= size;
	h2 ^= size;

	h1 += h2;
	h2 += h1;

	h1 = fmix64(h1);
	h2 = fmix64(h2);

	h1 += h2;
	h2 += h1;

	out[0] = h1 & 0xFFFFFFFF;
	out[1] = h1 >> 32;
	out[2] = h2 & 0xFFFFFFFF;
	out[3] = h2 >> 32;
}
/*
// utf8
bool      sink_utf8_valid(sink_ctx ctx, sink_val a);
sink_val  sink_utf8_list(sink_ctx ctx, sink_val a);
sink_val  sink_utf8_str(sink_ctx ctx, sink_val a);

// structs
sink_val  sink_struct_size(sink_ctx ctx, sink_val tpl);
sink_val  sink_struct_str(sink_ctx ctx, sink_val ls, sink_val tpl);
sink_val  sink_struct_list(sink_ctx ctx, sink_val a, sink_val tpl);
*/

// lists
void sink_list_setuser(sink_ctx ctx, sink_val ls, sink_user usertype, void *user){
	sink_list ls2 = var_castlist(ctx, ls);
	if (ls2->usertype >= 0){
		sink_free_func f_free = ((context)ctx)->f_finalize->ptrs[ls2->usertype];
		if (f_free)
			f_free(ls2->user);
	}
	ls2->usertype = usertype;
	ls2->user = user;
}

void *sink_list_getuser(sink_ctx ctx, sink_val ls, sink_user usertype){
	sink_list ls2 = var_castlist(ctx, ls);
	if (ls2->usertype != usertype)
		return NULL;
	return ls2->user;
}

sink_val sink_list_newblob(sink_ctx ctx, int size, const sink_val *vals){
	int count = size + sink_list_grow;
	sink_val *copy = mem_alloc(sizeof(sink_val) * count);
	if (size > 0)
		memcpy(copy, vals, sizeof(sink_val) * size);
	return sink_list_newblobgive(ctx, size, count, copy);
}

sink_val sink_list_newblobgive(sink_ctx ctx, int size, int count, sink_val *vals){
	context ctx2 = ctx;
	int index = bmp_reserve((void **)&ctx2->list_tbl, &ctx2->list_size, &ctx2->list_aloc,
		&ctx2->list_ref, &ctx2->list_tick, sizeof(sink_list_st));
	sink_list ls = &ctx2->list_tbl[index];
	ls->vals = vals;
	ls->size = size;
	ls->count = count;
	ls->user = NULL;
	ls->usertype = -1;
	return (sink_val){ .u = SINK_TAG_LIST | index };
}

sink_val sink_list_new(sink_ctx ctx, sink_val a, sink_val b){
	if (!sink_isnum(a))
		return sink_abortformat(ctx, "Expecting number");
	int size = (int)sink_castnum(a);
	if (size < 0)
		size = 0;
	int count = size < sink_list_grow ? sink_list_grow : size;
	sink_val *vals = mem_alloc(sizeof(sink_val) * count);
	for (int i = 0; i < size; i++)
		vals[i] = b;
	return sink_list_newblobgive(ctx, size, count, vals);
}

/*
sink_val  sink_list_cat(sink_ctx ctx, sink_val ls1, sink_val ls2);
int       sink_list_size(sink_ctx ctx, sink_val ls);
sink_val  sink_list_slice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len);
void      sink_list_splice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len, sink_val ls2);
sink_val  sink_list_shift(sink_ctx ctx, sink_val ls);
sink_val  sink_list_pop(sink_ctx ctx, sink_val ls);
*/
void sink_list_push(sink_ctx ctx, sink_val ls, sink_val a){
	if (!sink_islist(ls)){
		sink_abortcstr(ctx, "Expecting list");
		return;
	}
	opi_list_push(ctx, ls, a);
}
/*
void      sink_list_unshift(sink_ctx ctx, sink_val ls, sink_val a);
void      sink_list_append(sink_ctx ctx, sink_val ls, sink_val ls2);
void      sink_list_prepend(sink_ctx ctx, sink_val ls, sink_val ls2);
sink_val  sink_list_find(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val  sink_list_rfind(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val  sink_list_join(sink_ctx ctx, sink_val ls, sink_val a);
*/
sink_val sink_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz, const uint8_t *sep){
	sink_val *strs = mem_alloc(sizeof(sink_val) * size);
	int tot = 0;
	for (int i = 0; i < size; i++){
		if (i > 0)
			tot += sepz;
		strs[i] = sink_tostr(ctx, vals[i]);
		sink_str s = var_caststr(ctx, strs[i]);
		tot += s->size;
	}
	uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
	int nb = 0;
	for (int i = 0; i < size; i++){
		if (i > 0 && sepz > 0){
			memcpy(&bytes[nb], sep, sizeof(uint8_t) * sepz);
			nb += sepz;
		}
		sink_str s = var_caststr(ctx, strs[i]);
		if (s->size > 0){
			memcpy(&bytes[nb], s->bytes, sizeof(uint8_t) * s->size);
			nb += s->size;
		}
	}
	mem_free(strs);
	bytes[tot] = 0;
	return sink_str_newblobgive(ctx, tot, bytes);
}
/*
void      sink_list_rev(sink_ctx ctx, sink_val ls);
sink_val  sink_list_str(sink_ctx ctx, sink_val ls);
void      sink_list_sort(sink_ctx ctx, sink_val ls);
void      sink_list_rsort(sink_ctx ctx, sink_val ls);
sink_val  sink_list_sortcmp(sink_ctx ctx, sink_val a, sink_val b);

// pickle
bool      sink_pickle_valid(sink_ctx ctx, sink_val a);
sink_val  sink_pickle_str(sink_ctx ctx, sink_val a);
sink_val  sink_pickle_val(sink_ctx ctx, sink_val a);
*/

sink_val sink_abortformat(sink_ctx ctx, const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = mem_alloc(s + 1);
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	sink_val a = sink_str_newblobgive(ctx, s, (uint8_t *)buf);
	opi_abort(ctx, 1, &a);
	return SINK_NIL;
}
