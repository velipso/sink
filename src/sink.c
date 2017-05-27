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
#	ifdef NDEBUG
#		undef NDEBUG
#	endif
#	include <assert.h>
#	define debug(msg)         fprintf(stderr, "> %-10s: %s\n", __func__, msg)
#	define debugf(msg, ...)   fprintf(stderr, "> %-10s: " msg "\n", __func__, __VA_ARGS__)
#	define oplog(msg)         fprintf(stderr, "%% %s\n", msg)
#	define oplogf(msg, ...)   fprintf(stderr, "%% " msg "\n", __VA_ARGS__)
#else
#	ifndef NDEBUG
#		define NDEBUG
#	endif
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
			printf("%s:%d (%p)\n", m->file, m->line, m->p);
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

static inline sink_str_st list_byte_freetostr(list_byte b){
	if (b->size <= 0){
		list_byte_free(b);
		return (sink_str_st){ .size = 0, .bytes = NULL };
	}
	sink_str_st res = { .size = b->size, .bytes = b->bytes };
	mem_free(b);
	return res;
}

static inline list_byte list_byte_new(){
	list_byte b = mem_alloc(sizeof(list_byte_st));
	b->size = 0;
	b->count = list_byte_grow;
	b->bytes = mem_alloc(sizeof(uint8_t) * b->count);
	return b;
}

static inline list_byte list_byte_newcopy(list_byte b){
	list_byte b2 = mem_alloc(sizeof(list_byte_st));
	b2->size = b->size;
	b2->count = b->size;
	b2->bytes = mem_alloc(sizeof(uint8_t) * b2->count);
	if (b->size > 0)
		memcpy(b2->bytes, b->bytes, sizeof(uint8_t) * b->size);
	return b2;
}

static inline list_byte list_byte_newstr(const char *data){
	list_byte b = mem_alloc(sizeof(list_byte_st));
	b->size = (int)strlen(data);
	b->count = b->size;
	b->bytes = mem_alloc(sizeof(uint8_t) * b->count);
	memcpy(b->bytes, data, sizeof(uint8_t) * b->count);
	return b;
}

static inline void list_byte_push(list_byte b, uint8_t v){
	if (b->size + 1 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v;
}

static inline void list_byte_push2(list_byte b, uint8_t v1, uint8_t v2){
	if (b->size + 2 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
}

static inline void list_byte_push3(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3){
	if (b->size + 3 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
}

static inline void list_byte_push4(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4){
	if (b->size + 4 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
}

static inline void list_byte_push5(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5){
	if (b->size + 5 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
}

static inline void list_byte_push6(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5, uint8_t v6){
	if (b->size + 6 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
	b->bytes[b->size++] = v6;
}

static inline void list_byte_push7(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5, uint8_t v6, uint8_t v7){
	if (b->size + 7 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
	b->bytes[b->size++] = v6;
	b->bytes[b->size++] = v7;
}

static inline void list_byte_push8(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5, uint8_t v6, uint8_t v7, uint8_t v8){
	if (b->size + 8 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
	b->bytes[b->size++] = v6;
	b->bytes[b->size++] = v7;
	b->bytes[b->size++] = v8;
}

static inline void list_byte_push9(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5, uint8_t v6, uint8_t v7, uint8_t v8, uint8_t v9){
	if (b->size + 9 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
	b->bytes[b->size++] = v6;
	b->bytes[b->size++] = v7;
	b->bytes[b->size++] = v8;
	b->bytes[b->size++] = v9;
}

static inline void list_byte_push11(list_byte b, uint8_t v1, uint8_t v2, uint8_t v3, uint8_t v4,
	uint8_t v5, uint8_t v6, uint8_t v7, uint8_t v8, uint8_t v9, uint8_t v10, uint8_t v11){
	if (b->size + 11 > b->count){
		b->count += list_byte_grow;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	b->bytes[b->size++] = v1;
	b->bytes[b->size++] = v2;
	b->bytes[b->size++] = v3;
	b->bytes[b->size++] = v4;
	b->bytes[b->size++] = v5;
	b->bytes[b->size++] = v6;
	b->bytes[b->size++] = v7;
	b->bytes[b->size++] = v8;
	b->bytes[b->size++] = v9;
	b->bytes[b->size++] = v10;
	b->bytes[b->size++] = v11;
}

static inline void list_byte_append(list_byte b, int size, uint8_t *bytes){
	if (size <= 0)
		return;
	if (b->size + size > b->count){
		b->count = b->size + size;
		b->bytes = mem_realloc(b->bytes, sizeof(uint8_t) * b->count);
	}
	memcpy(&b->bytes[b->size], bytes, sizeof(uint8_t) * size);
	b->size += size;
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
	int *vals;
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
	ls->vals = mem_alloc(sizeof(int) * ls->count);
	return ls;
}

static inline void list_int_push(list_int ls, int v){
	if (ls->size >= ls->count){
		ls->count += list_int_grow;
		ls->vals = mem_realloc(ls->vals, sizeof(int) * ls->count);
	}
	ls->vals[ls->size++] = v;
}

static inline int list_int_pop(list_int ls){
	ls->size--;
	return ls->vals[ls->size];
}

static inline int list_int_at(list_int ls, int v){
	for (int i = 0; i < ls->size; i++){
		if (ls->vals[i] == v)
			return i;
	}
	return -1;
}

static inline bool list_int_has(list_int ls, int v){
	return list_int_at(ls, v) != -1;
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

static inline list_ptr list_ptr_newsingle(free_func f_free, void *p){
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
	int frame;
	int index;
} varloc_st;

static inline varloc_st varloc_new(int frame, int index){
	return (varloc_st){ .frame = frame, .index = index };
}

static const varloc_st VARLOC_NULL = (varloc_st){ .frame = -1 };

static inline bool varloc_isnull(varloc_st vlc){
	return vlc.frame < 0;
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

// key: SINGLEBYTE  [TWOBYTES]  [[FOURBYTES]]  [[[EIGHTBYTES]]]
typedef enum {
	OP_NOP             = 0x00, //
	OP_MOVE            = 0x01, // [TGT], [SRC]
	OP_INC             = 0x02, // [TGT/SRC]
	OP_NIL             = 0x03, // [TGT]
	OP_NUMP8           = 0x04, // [TGT], VALUE
	OP_NUMN8           = 0x05, // [TGT], VALUE
	OP_NUMP16          = 0x06, // [TGT], [VALUE]
	OP_NUMN16          = 0x07, // [TGT], [VALUE]
	OP_NUMP32          = 0x08, // [TGT], [[VALUE]]
	OP_NUMN32          = 0x09, // [TGT], [[VALUE]]
	OP_NUMDBL          = 0x0A, // [TGT], [[[VALUE]]]
	OP_STR             = 0x0B, // [TGT], [INDEX]
	OP_LIST            = 0x0C, // [TGT], HINT
	OP_ISNUM           = 0x0D, // [TGT], [SRC]
	OP_ISSTR           = 0x0E, // [TGT], [SRC]
	OP_ISLIST          = 0x0F, // [TGT], [SRC]
	OP_NOT             = 0x10, // [TGT], [SRC]
	OP_SIZE            = 0x11, // [TGT], [SRC]
	OP_TONUM           = 0x12, // [TGT], [SRC]
	OP_CAT             = 0x13, // [TGT], ARGCOUNT, [ARGS]...
	OP_LT              = 0x14, // [TGT], [SRC1], [SRC2]
	OP_LTE             = 0x15, // [TGT], [SRC1], [SRC2]
	OP_NEQ             = 0x16, // [TGT], [SRC1], [SRC2]
	OP_EQU             = 0x17, // [TGT], [SRC1], [SRC2]
	OP_GETAT           = 0x18, // [TGT], [SRC1], [SRC2]
	OP_SLICE           = 0x19, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_SETAT           = 0x1A, // [SRC1], [SRC2], [SRC3]
	OP_SPLICE          = 0x1B, // [SRC1], [SRC2], [SRC3], [SRC4]
	OP_JUMP            = 0x1C, // [[LOCATION]]
	OP_JUMPTRUE        = 0x1D, // [SRC], [[LOCATION]]
	OP_JUMPFALSE       = 0x1E, // [SRC], [[LOCATION]]
	OP_CMDHEAD         = 0x1F, // LEVEL, RESTPOS
	OP_CMDTAIL         = 0x20, //
	OP_CALL            = 0x21, // [TGT], [[LOCATION]], ARGCOUNT, [ARGS]...
	OP_NATIVE          = 0x22, // [TGT], [INDEX], ARGCOUNT, [ARGS]...
	OP_RETURN          = 0x23, // [SRC]
	OP_RETURNTAIL      = 0x24, // [[LOCATION]], ARGCOUNT, [ARGS]...
	OP_RANGE           = 0x25, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_ORDER           = 0x26, // [TGT], [SRC1], [SRC2]
	OP_SAY             = 0x27, // [TGT], ARGCOUNT, [ARGS]...
	OP_WARN            = 0x28, // [TGT], ARGCOUNT, [ARGS]...
	OP_ASK             = 0x29, // [TGT], ARGCOUNT, [ARGS]...
	OP_EXIT            = 0x2A, // [TGT], ARGCOUNT, [ARGS]...
	OP_ABORT           = 0x2B, // [TGT], ARGCOUNT, [ARGS]...
	OP_NUM_NEG         = 0x2C, // [TGT], [SRC]
	OP_NUM_ADD         = 0x2D, // [TGT], [SRC1], [SRC2]
	OP_NUM_SUB         = 0x2E, // [TGT], [SRC1], [SRC2]
	OP_NUM_MUL         = 0x2F, // [TGT], [SRC1], [SRC2]
	OP_NUM_DIV         = 0x30, // [TGT], [SRC1], [SRC2]
	OP_NUM_MOD         = 0x31, // [TGT], [SRC1], [SRC2]
	OP_NUM_POW         = 0x32, // [TGT], [SRC1], [SRC2]
	OP_NUM_ABS         = 0x33, // [TGT], [SRC]
	OP_NUM_SIGN        = 0x34, // [TGT], [SRC]
	OP_NUM_MAX         = 0x35, // [TGT], ARGCOUNT, [ARGS]...
	OP_NUM_MIN         = 0x36, // [TGT], ARGCOUNT, [ARGS]...
	OP_NUM_CLAMP       = 0x37, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_FLOOR       = 0x38, // [TGT], [SRC]
	OP_NUM_CEIL        = 0x39, // [TGT], [SRC]
	OP_NUM_ROUND       = 0x3A, // [TGT], [SRC]
	OP_NUM_TRUNC       = 0x3B, // [TGT], [SRC]
	OP_NUM_NAN         = 0x3C, // [TGT]
	OP_NUM_INF         = 0x3D, // [TGT]
	OP_NUM_ISNAN       = 0x3E, // [TGT], [SRC]
	OP_NUM_ISFINITE    = 0x3F, // [TGT], [SRC]
	OP_NUM_SIN         = 0x40, // [TGT], [SRC]
	OP_NUM_COS         = 0x41, // [TGT], [SRC]
	OP_NUM_TAN         = 0x42, // [TGT], [SRC]
	OP_NUM_ASIN        = 0x43, // [TGT], [SRC]
	OP_NUM_ACOS        = 0x44, // [TGT], [SRC]
	OP_NUM_ATAN        = 0x45, // [TGT], [SRC]
	OP_NUM_ATAN2       = 0x46, // [TGT], [SRC1], [SRC2]
	OP_NUM_LOG         = 0x47, // [TGT], [SRC]
	OP_NUM_LOG2        = 0x48, // [TGT], [SRC]
	OP_NUM_LOG10       = 0x49, // [TGT], [SRC]
	OP_NUM_EXP         = 0x4A, // [TGT], [SRC]
	OP_NUM_LERP        = 0x4B, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_NUM_HEX         = 0x4C, // [TGT], [SRC1], [SRC2]
	OP_NUM_OCT         = 0x4D, // [TGT], [SRC1], [SRC2]
	OP_NUM_BIN         = 0x4E, // [TGT], [SRC1], [SRC2]
	OP_INT_NEW         = 0x4F, // [TGT], [SRC]
	OP_INT_NOT         = 0x50, // [TGT], [SRC]
	OP_INT_AND         = 0x51, // [TGT], ARGCOUNT, [ARGS]...
	OP_INT_OR          = 0x52, // [TGT], ARGCOUNT, [ARGS]...
	OP_INT_XOR         = 0x53, // [TGT], ARGCOUNT, [ARGS]...
	OP_INT_SHL         = 0x54, // [TGT], [SRC1], [SRC2]
	OP_INT_SHR         = 0x55, // [TGT], [SRC1], [SRC2]
	OP_INT_SAR         = 0x56, // [TGT], [SRC1], [SRC2]
	OP_INT_ADD         = 0x57, // [TGT], [SRC1], [SRC2]
	OP_INT_SUB         = 0x58, // [TGT], [SRC1], [SRC2]
	OP_INT_MUL         = 0x59, // [TGT], [SRC1], [SRC2]
	OP_INT_DIV         = 0x5A, // [TGT], [SRC1], [SRC2]
	OP_INT_MOD         = 0x5B, // [TGT], [SRC1], [SRC2]
	OP_INT_CLZ         = 0x5C, // [TGT], [SRC]
	OP_RAND_SEED       = 0x5D, // [TGT], [SRC]
	OP_RAND_SEEDAUTO   = 0x5E, // [TGT]
	OP_RAND_INT        = 0x5F, // [TGT]
	OP_RAND_NUM        = 0x60, // [TGT]
	OP_RAND_GETSTATE   = 0x61, // [TGT]
	OP_RAND_SETSTATE   = 0x62, // [TGT], [SRC]
	OP_RAND_PICK       = 0x63, // [TGT], [SRC]
	OP_RAND_SHUFFLE    = 0x64, // [TGT], [SRC]
	OP_STR_NEW         = 0x65, // [TGT], ARGCOUNT, [ARGS]...
	OP_STR_SPLIT       = 0x66, // [TGT], [SRC1], [SRC2]
	OP_STR_REPLACE     = 0x67, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_BEGINS      = 0x68, // [TGT], [SRC1], [SRC2]
	OP_STR_ENDS        = 0x69, // [TGT], [SRC1], [SRC2]
	OP_STR_PAD         = 0x6A, // [TGT], [SRC1], [SRC2]
	OP_STR_FIND        = 0x6B, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_RFIND       = 0x6C, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_STR_LOWER       = 0x6D, // [TGT], [SRC]
	OP_STR_UPPER       = 0x6E, // [TGT], [SRC]
	OP_STR_TRIM        = 0x6F, // [TGT], [SRC]
	OP_STR_REV         = 0x70, // [TGT], [SRC]
	OP_STR_REP         = 0x71, // [TGT], [SRC1], [SRC2]
	OP_STR_LIST        = 0x72, // [TGT], [SRC]
	OP_STR_BYTE        = 0x73, // [TGT], [SRC1], [SRC2]
	OP_STR_HASH        = 0x74, // [TGT], [SRC1], [SRC2]
	OP_UTF8_VALID      = 0x75, // [TGT], [SRC]
	OP_UTF8_LIST       = 0x76, // [TGT], [SRC]
	OP_UTF8_STR        = 0x77, // [TGT], [SRC]
	OP_STRUCT_SIZE     = 0x78, // [TGT], [SRC]
	OP_STRUCT_STR      = 0x79, // [TGT], [SRC1], [SRC2]
	OP_STRUCT_LIST     = 0x7A, // [TGT], [SRC1], [SRC2]
	OP_LIST_NEW        = 0x7B, // [TGT], [SRC1], [SRC2]
	OP_LIST_SHIFT      = 0x7C, // [TGT], [SRC]
	OP_LIST_POP        = 0x7D, // [TGT], [SRC]
	OP_LIST_PUSH       = 0x7E, // [TGT], [SRC1], [SRC2]
	OP_LIST_UNSHIFT    = 0x7F, // [TGT], [SRC1], [SRC2]
	OP_LIST_APPEND     = 0x80, // [TGT], [SRC1], [SRC2]
	OP_LIST_PREPEND    = 0x81, // [TGT], [SRC1], [SRC2]
	OP_LIST_FIND       = 0x82, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_RFIND      = 0x83, // [TGT], [SRC1], [SRC2], [SRC3]
	OP_LIST_JOIN       = 0x84, // [TGT], [SRC1], [SRC2]
	OP_LIST_REV        = 0x85, // [TGT], [SRC]
	OP_LIST_STR        = 0x86, // [TGT], [SRC]
	OP_LIST_SORT       = 0x87, // [TGT], [SRC]
	OP_LIST_RSORT      = 0x88, // [TGT], [SRC]
	OP_PICKLE_JSON     = 0x89, // [TGT], [SRC]
	OP_PICKLE_BIN      = 0x8A, // [TGT], [SRC]
	OP_PICKLE_VAL      = 0x8B, // [TGT], [SRC]
	OP_PICKLE_VALID    = 0x8C, // [TGT], [SRC]
	OP_PICKLE_SIBLING  = 0x8D, // [TGT], [SRC]
	OP_PICKLE_CIRCULAR = 0x8E, // [TGT], [SRC]
	OP_PICKLE_COPY     = 0x8F, // [TGT], [SRC]
	OP_GC_GETLEVEL     = 0x90, // [TGT]
	OP_GC_SETLEVEL     = 0x91, // [TGT], [SRC]
	OP_GC_RUN          = 0x92, // [TGT]
	// RESERVED        = 0xFD,
	// fake ops
	OP_GT              = 0x1F0,
	OP_GTE             = 0x1F1,
	OP_PICK            = 0x1F2,
	OP_INVALID         = 0x1F3
} op_enum;

typedef enum {
	OPPC_INVALID,
	OPPC_STR,        // [VAR], [INDEX]
	OPPC_CMDHEAD,    // LEVEL, RESTPOS
	OPPC_CMDTAIL,    //
	OPPC_JUMP,       // [[LOCATION]]
	OPPC_VJUMP,      // [VAR], [[LOCATION]]
	OPPC_CALL,       // [VAR], [[LOCATION]], ARGCOUNT, [VARS]...
	OPPC_NATIVE,     // [VAR], [INDEX], ARGCOUNT, [VARS]...
	OPPC_RETURNTAIL, // [[LOCATION]], ARGCOUNT, [VARS]...
	OPPC_VVVV,       // [VAR], [VAR], [VAR], [VAR]
	OPPC_VVV,        // [VAR], [VAR], [VAR]
	OPPC_VV,         // [VAR], [VAR]
	OPPC_V,          // [VAR]
	OPPC_EMPTY,      // nothing
	OPPC_VA,         // [VAR], ARGCOUNT, [VARS]...
	OPPC_VN,         // [VAR], DATA
	OPPC_VNN,        // [VAR], [DATA]
	OPPC_VNNNN,      // [VAR], [[DATA]]
	OPPC_VNNNNNNNN   // [VAR], [[[DATA]]]
} op_pcat;

// lookup table for categorizing the operator types
static inline op_pcat op_paramcat(op_enum op){
	switch (op){
		case OP_NOP            : return OPPC_EMPTY;
		case OP_MOVE           : return OPPC_VV;
		case OP_INC            : return OPPC_V;
		case OP_NIL            : return OPPC_V;
		case OP_NUMP8          : return OPPC_VN;
		case OP_NUMN8          : return OPPC_VN;
		case OP_NUMP16         : return OPPC_VNN;
		case OP_NUMN16         : return OPPC_VNN;
		case OP_NUMP32         : return OPPC_VNNNN;
		case OP_NUMN32         : return OPPC_VNNNN;
		case OP_NUMDBL         : return OPPC_VNNNNNNNN;
		case OP_STR            : return OPPC_STR;
		case OP_LIST           : return OPPC_VN;
		case OP_ISNUM          : return OPPC_VV;
		case OP_ISSTR          : return OPPC_VV;
		case OP_ISLIST         : return OPPC_VV;
		case OP_NOT            : return OPPC_VV;
		case OP_SIZE           : return OPPC_VV;
		case OP_TONUM          : return OPPC_VV;
		case OP_CAT            : return OPPC_VA;
		case OP_LT             : return OPPC_VVV;
		case OP_LTE            : return OPPC_VVV;
		case OP_NEQ            : return OPPC_VVV;
		case OP_EQU            : return OPPC_VVV;
		case OP_GETAT          : return OPPC_VVV;
		case OP_SLICE          : return OPPC_VVVV;
		case OP_SETAT          : return OPPC_VVV;
		case OP_SPLICE         : return OPPC_VVVV;
		case OP_JUMP           : return OPPC_JUMP;
		case OP_JUMPTRUE       : return OPPC_VJUMP;
		case OP_JUMPFALSE      : return OPPC_VJUMP;
		case OP_CMDHEAD        : return OPPC_CMDHEAD;
		case OP_CMDTAIL        : return OPPC_CMDTAIL;
		case OP_CALL           : return OPPC_CALL;
		case OP_NATIVE         : return OPPC_NATIVE;
		case OP_RETURN         : return OPPC_V;
		case OP_RETURNTAIL     : return OPPC_RETURNTAIL;
		case OP_RANGE          : return OPPC_VVVV;
		case OP_ORDER          : return OPPC_VVV;
		case OP_SAY            : return OPPC_VA;
		case OP_WARN           : return OPPC_VA;
		case OP_ASK            : return OPPC_VA;
		case OP_EXIT           : return OPPC_VA;
		case OP_ABORT          : return OPPC_VA;
		case OP_NUM_NEG        : return OPPC_VV;
		case OP_NUM_ADD        : return OPPC_VVV;
		case OP_NUM_SUB        : return OPPC_VVV;
		case OP_NUM_MUL        : return OPPC_VVV;
		case OP_NUM_DIV        : return OPPC_VVV;
		case OP_NUM_MOD        : return OPPC_VVV;
		case OP_NUM_POW        : return OPPC_VVV;
		case OP_NUM_ABS        : return OPPC_VV;
		case OP_NUM_SIGN       : return OPPC_VV;
		case OP_NUM_MAX        : return OPPC_VA;
		case OP_NUM_MIN        : return OPPC_VA;
		case OP_NUM_CLAMP      : return OPPC_VVVV;
		case OP_NUM_FLOOR      : return OPPC_VV;
		case OP_NUM_CEIL       : return OPPC_VV;
		case OP_NUM_ROUND      : return OPPC_VV;
		case OP_NUM_TRUNC      : return OPPC_VV;
		case OP_NUM_NAN        : return OPPC_V;
		case OP_NUM_INF        : return OPPC_V;
		case OP_NUM_ISNAN      : return OPPC_VV;
		case OP_NUM_ISFINITE   : return OPPC_VV;
		case OP_NUM_SIN        : return OPPC_VV;
		case OP_NUM_COS        : return OPPC_VV;
		case OP_NUM_TAN        : return OPPC_VV;
		case OP_NUM_ASIN       : return OPPC_VV;
		case OP_NUM_ACOS       : return OPPC_VV;
		case OP_NUM_ATAN       : return OPPC_VV;
		case OP_NUM_ATAN2      : return OPPC_VVV;
		case OP_NUM_LOG        : return OPPC_VV;
		case OP_NUM_LOG2       : return OPPC_VV;
		case OP_NUM_LOG10      : return OPPC_VV;
		case OP_NUM_EXP        : return OPPC_VV;
		case OP_NUM_LERP       : return OPPC_VVVV;
		case OP_NUM_HEX        : return OPPC_VVV;
		case OP_NUM_OCT        : return OPPC_VVV;
		case OP_NUM_BIN        : return OPPC_VVV;
		case OP_INT_NEW        : return OPPC_VV;
		case OP_INT_NOT        : return OPPC_VV;
		case OP_INT_AND        : return OPPC_VA;
		case OP_INT_OR         : return OPPC_VA;
		case OP_INT_XOR        : return OPPC_VA;
		case OP_INT_SHL        : return OPPC_VVV;
		case OP_INT_SHR        : return OPPC_VVV;
		case OP_INT_SAR        : return OPPC_VVV;
		case OP_INT_ADD        : return OPPC_VVV;
		case OP_INT_SUB        : return OPPC_VVV;
		case OP_INT_MUL        : return OPPC_VVV;
		case OP_INT_DIV        : return OPPC_VVV;
		case OP_INT_MOD        : return OPPC_VVV;
		case OP_INT_CLZ        : return OPPC_VV;
		case OP_RAND_SEED      : return OPPC_VV;
		case OP_RAND_SEEDAUTO  : return OPPC_V;
		case OP_RAND_INT       : return OPPC_V;
		case OP_RAND_NUM       : return OPPC_V;
		case OP_RAND_GETSTATE  : return OPPC_V;
		case OP_RAND_SETSTATE  : return OPPC_VV;
		case OP_RAND_PICK      : return OPPC_VV;
		case OP_RAND_SHUFFLE   : return OPPC_VV;
		case OP_STR_NEW        : return OPPC_VA;
		case OP_STR_SPLIT      : return OPPC_VVV;
		case OP_STR_REPLACE    : return OPPC_VVVV;
		case OP_STR_BEGINS     : return OPPC_VVV;
		case OP_STR_ENDS       : return OPPC_VVV;
		case OP_STR_PAD        : return OPPC_VVV;
		case OP_STR_FIND       : return OPPC_VVVV;
		case OP_STR_RFIND      : return OPPC_VVVV;
		case OP_STR_LOWER      : return OPPC_VV;
		case OP_STR_UPPER      : return OPPC_VV;
		case OP_STR_TRIM       : return OPPC_VV;
		case OP_STR_REV        : return OPPC_VV;
		case OP_STR_REP        : return OPPC_VVV;
		case OP_STR_LIST       : return OPPC_VV;
		case OP_STR_BYTE       : return OPPC_VVV;
		case OP_STR_HASH       : return OPPC_VVV;
		case OP_UTF8_VALID     : return OPPC_VV;
		case OP_UTF8_LIST      : return OPPC_VV;
		case OP_UTF8_STR       : return OPPC_VV;
		case OP_STRUCT_SIZE    : return OPPC_VV;
		case OP_STRUCT_STR     : return OPPC_VVV;
		case OP_STRUCT_LIST    : return OPPC_VVV;
		case OP_LIST_NEW       : return OPPC_VVV;
		case OP_LIST_SHIFT     : return OPPC_VV;
		case OP_LIST_POP       : return OPPC_VV;
		case OP_LIST_PUSH      : return OPPC_VVV;
		case OP_LIST_UNSHIFT   : return OPPC_VVV;
		case OP_LIST_APPEND    : return OPPC_VVV;
		case OP_LIST_PREPEND   : return OPPC_VVV;
		case OP_LIST_FIND      : return OPPC_VVVV;
		case OP_LIST_RFIND     : return OPPC_VVVV;
		case OP_LIST_JOIN      : return OPPC_VVV;
		case OP_LIST_REV       : return OPPC_VV;
		case OP_LIST_STR       : return OPPC_VV;
		case OP_LIST_SORT      : return OPPC_VV;
		case OP_LIST_RSORT     : return OPPC_VV;
		case OP_PICKLE_JSON    : return OPPC_VV;
		case OP_PICKLE_BIN     : return OPPC_VV;
		case OP_PICKLE_VAL     : return OPPC_VV;
		case OP_PICKLE_VALID   : return OPPC_VV;
		case OP_PICKLE_SIBLING : return OPPC_VV;
		case OP_PICKLE_CIRCULAR: return OPPC_VV;
		case OP_PICKLE_COPY    : return OPPC_VV;
		case OP_GC_GETLEVEL    : return OPPC_V;
		case OP_GC_SETLEVEL    : return OPPC_VV;
		case OP_GC_RUN         : return OPPC_V;
		case OP_GT             : return OPPC_INVALID;
		case OP_GTE            : return OPPC_INVALID;
		case OP_PICK           : return OPPC_INVALID;
		case OP_INVALID        : return OPPC_INVALID;
	}
	return OPPC_INVALID;
}

#ifdef SINK_DEBUG
static const char *op_pcat_name(op_pcat opc){
	switch (opc){
		case OPPC_INVALID   : return "OPPC_INVALID";
		case OPPC_STR       : return "OPPC_STR";
		case OPPC_CMDHEAD   : return "OPPC_CMDHEAD";
		case OPPC_CMDTAIL   : return "OPPC_CMDTAIL";
		case OPPC_JUMP      : return "OPPC_JUMP";
		case OPPC_VJUMP     : return "OPPC_VJUMP";
		case OPPC_CALL      : return "OPPC_CALL";
		case OPPC_NATIVE    : return "OPPC_NATIVE";
		case OPPC_RETURNTAIL: return "OPPC_RETURNTAIL";
		case OPPC_VVVV      : return "OPPC_VVVV";
		case OPPC_VVV       : return "OPPC_VVV";
		case OPPC_VV        : return "OPPC_VV";
		case OPPC_V         : return "OPPC_V";
		case OPPC_EMPTY     : return "OPPC_EMPTY";
		case OPPC_VA        : return "OPPC_VA";
		case OPPC_VN        : return "OPPC_VN";
		case OPPC_VNN       : return "OPPC_VNN";
		case OPPC_VNNNN     : return "OPPC_VNNNN";
		case OPPC_VNNNNNNNN : return "OPPC_VNNNNNNNN";
	}
	return "Unknown";
}
#endif

static inline void op_move(list_byte b, varloc_st tgt, varloc_st src){
	if (tgt.frame == src.frame && tgt.index == src.index)
		return;
	oplogf("MOVE %d:%d, %d:%d", tgt.frame, tgt.index, src.frame, src.index);
	list_byte_push5(b, OP_MOVE, tgt.frame, tgt.index, src.frame, src.index);
}

static inline void op_inc(list_byte b, varloc_st src){
	oplogf("INC %d:%d", src.frame, src.index);
	list_byte_push3(b, OP_INC, src.frame, src.index);
}

static inline void op_nil(list_byte b, varloc_st tgt){
	oplogf("NIL %d:%d", tgt.frame, tgt.index);
	list_byte_push3(b, OP_NIL, tgt.frame, tgt.index);
}

static inline void op_numint(list_byte b, varloc_st tgt, int64_t num){
	if (num < 0){
		if (num >= -256){
			oplogf("NUMN8 %d:%d, %lld", tgt.frame, tgt.index, num);
			num += 256;
			list_byte_push4(b, OP_NUMN8, tgt.frame, tgt.index, num & 0xFF);
		}
		else if (num >= -65536){
			oplogf("NUMN16 %d:%d, %lld", tgt.frame, tgt.index, num);
			num += 65536;
			list_byte_push5(b, OP_NUMN16, tgt.frame, tgt.index, num & 0xFF, num >> 8);
		}
		else{
			oplogf("NUMN32 %d:%d, %lld", tgt.frame, tgt.index, num);
			num += 4294967296;
			list_byte_push7(b, OP_NUMN32, tgt.frame, tgt.index,
				num & 0xFF, (num >> 8) & 0xFF, (num >> 16) & 0xFF, (num >> 24) & 0xFF);
		}
	}
	else{
		if (num < 256){
			oplogf("NUMP8 %d:%d, %lld", tgt.frame, tgt.index, num);
			list_byte_push4(b, OP_NUMP8, tgt.frame, tgt.index, num & 0xFF);
		}
		else if (num < 65536){
			oplogf("NUMP16 %d:%d, %lld", tgt.frame, tgt.index, num);
			list_byte_push5(b, OP_NUMP16, tgt.frame, tgt.index, num & 0xFF, num >> 8);
		}
		else{
			oplogf("NUMP32 %d:%d, %lld", tgt.frame, tgt.index, num);
			list_byte_push7(b, OP_NUMP32, tgt.frame, tgt.index,
				num & 0xFF, (num >> 8) & 0xFF, (num >> 16) & 0xFF, (num >> 24) & 0xFF);
		}
	}
}

static inline void op_numdbl(list_byte b, varloc_st tgt, sink_val num){
	oplogf("NUMDBL %d:%d, %g", tgt.frame, tgt.index, num.f);
	list_byte_push11(b, OP_NUMDBL, tgt.frame, tgt.index,
		num.u & 0xFF, (num.u >> 8) & 0xFF, (num.u >> 16) & 0xFF, (num.u >> 24) & 0xFF,
		(num.u >> 32) & 0xFF, (num.u >> 40) & 0xFF, (num.u >> 48) & 0xFF, (num.u >> 56) & 0xFF);
}

static inline void op_num(list_byte b, varloc_st tgt, double num){
	if (floor(num) == num && num >= -4294967296.0 && num < 4294967296.0)
		op_numint(b, tgt, (int64_t)num);
	else
		op_numdbl(b, tgt, (sink_val){ .f = num });
}

static inline void op_str(list_byte b, varloc_st tgt, int index){
	oplogf("STR %d:%d, %d", tgt.frame, tgt.index, index);
	list_byte_push5(b, OP_STR, tgt.frame, tgt.index, index & 0xFF, index >> 8);
}

static inline void op_list(list_byte b, varloc_st tgt, int hint){
	if (hint > 255)
		hint = 255;
	oplogf("LIST %d:%d, %d", tgt.frame, tgt.index, hint);
	list_byte_push4(b, OP_LIST, tgt.frame, tgt.index, hint);
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
	oplogf("%s %d:%d, %d:%d", opstr, tgt.frame, tgt.index, src.frame, src.index);
	#endif
	list_byte_push5(b, opcode, tgt.frame, tgt.index, src.frame, src.index);
}

static inline void op_cat(list_byte b, varloc_st tgt, int argcount){
	oplogf("CAT %d:%d, %d", tgt.frame, tgt.index, argcount);
	list_byte_push4(b, OP_CAT, tgt.frame, tgt.index, argcount);
}

static inline void op_arg(list_byte b, varloc_st arg){
	oplogf("  ARG: %d:%d", arg.frame, arg.index);
	list_byte_push2(b, arg.frame, arg.index);
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

	// intercept cat
	if (opcode == OP_CAT){
		op_cat(b, tgt, 2);
		op_arg(b, src1);
		op_arg(b, src2);
		return;
	}

	#ifdef SINK_DEBUG
	const char *opstr = "???";
	if      (opcode == OP_LT     ) opstr = "LT";
	else if (opcode == OP_LTE    ) opstr = "LTE";
	else if (opcode == OP_NEQ    ) opstr = "NEQ";
	else if (opcode == OP_EQU    ) opstr = "EQU";
	else if (opcode == OP_NUM_ADD) opstr = "NUM_ADD";
	else if (opcode == OP_NUM_SUB) opstr = "NUM_SUB";
	else if (opcode == OP_NUM_MUL) opstr = "NUM_MUL";
	else if (opcode == OP_NUM_DIV) opstr = "NUM_DIV";
	else if (opcode == OP_NUM_MOD) opstr = "NUM_MOD";
	else if (opcode == OP_NUM_POW) opstr = "NUM_POW";
	oplogf("%s %d:%d, %d:%d, %d:%d", opstr, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
	#endif
	list_byte_push7(b, opcode, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
}

static inline void op_getat(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2){
	oplogf("GETAT %d:%d, %d:%d, %d:%d", tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
	list_byte_push7(b, OP_GETAT, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
}

static inline void op_slice(list_byte b, varloc_st tgt, varloc_st src1, varloc_st src2,
	varloc_st src3){
	oplogf("SLICE %d:%d, %d:%d, %d:%d, %d:%d", tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index, src3.frame, src3.index);
	list_byte_push9(b, OP_SLICE, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index, src3.frame, src3.index);
}

static inline void op_setat(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3){
	oplogf("SETAT %d:%d, %d:%d, %d:%d", src1.frame, src1.index, src2.frame, src2.index,
		src3.frame, src3.index);
	list_byte_push7(b, OP_SETAT, src1.frame, src1.index, src2.frame, src2.index,
		src3.frame, src3.index);
}

static inline void op_splice(list_byte b, varloc_st src1, varloc_st src2, varloc_st src3,
	varloc_st src4){
	oplogf("SPLICE %d:%d, %d:%d, %d:%d, %d:%d", src1.frame, src1.index, src2.frame, src2.index,
		src3.frame, src3.index, src4.frame, src4.index);
	list_byte_push9(b, OP_SPLICE, src1.frame, src1.index, src2.frame, src2.index,
		src3.frame, src3.index, src4.frame, src4.index);
}

static inline void op_jump(list_byte b, uint32_t index, list_byte hint){
	oplogf("JUMP %.*s", hint->size, hint->bytes);
	list_byte_push5(b, OP_JUMP,
		index % 256, (index >> 8) % 256, (index >> 16) % 256, (index >> 24) % 256);
}

static inline void op_jumptrue(list_byte b, varloc_st src, uint32_t index, list_byte hint){
	oplogf("JUMPTRUE %d:%d, %.*s", src.frame, src.index, hint->size, hint->bytes);
	list_byte_push7(b, OP_JUMPTRUE, src.frame, src.index,
		index % 256, (index >> 8) % 256, (index >> 16) % 256, (index >> 24) % 256);
}

static inline void op_jumpfalse(list_byte b, varloc_st src, uint32_t index, list_byte hint){
	oplogf("JUMPFALSE %d:%d, %.*s", src.frame, src.index, hint->size, hint->bytes);
	list_byte_push7(b, OP_JUMPFALSE, src.frame, src.index,
		index % 256, (index >> 8) % 256, (index >> 16) % 256, (index >> 24) % 256);
}

static inline void op_cmdhead(list_byte b, int level, int restpos){
	oplogf("CMDHEAD %d, %d", level, restpos);
	list_byte_push3(b, OP_CMDHEAD, level, restpos);
}

static inline void op_cmdtail(list_byte b){
	oplog("CMDTAIL");
	list_byte_push(b, OP_CMDTAIL);
}

static inline void op_call(list_byte b, varloc_st ret, uint32_t index, int argcount,
	list_byte hint){
	oplogf("CALL %d:%d, %.*s, %d", ret.frame, ret.index, hint->size, hint->bytes, argcount);
	list_byte_push8(b, OP_CALL, ret.frame, ret.index,
		index % 256, (index >> 8) % 256, (index >> 16) % 256, (index >> 24) % 256,
		argcount);
}

static inline void op_native(list_byte b, varloc_st ret, int index, int argcount){
	oplogf("NATIVE %d:%d, %d, %d", ret.frame, ret.index, index, argcount);
	list_byte_push6(b, OP_NATIVE, ret.frame, ret.index, index % 256, index >> 8, argcount);
}

static inline void op_return(list_byte b, varloc_st src){
	oplogf("RETURN %d:%d", src.frame, src.index);
	list_byte_push3(b, OP_RETURN, src.frame, src.index);
}

static inline void op_returntail(list_byte b, uint32_t index, int argcount, list_byte hint){
	oplogf("RETURNTAIL %.*s, %d", hint->size, hint->bytes, argcount);
	list_byte_push6(b, OP_RETURNTAIL,
		index % 256, (index >> 8) % 256, (index >> 16) % 256, (index >> 24) % 256, argcount);
}

static inline void op_parama(list_byte b, op_enum opcode, varloc_st tgt, int argcount){
	oplogf("0x%02X %d:%d, %d", opcode, tgt.frame, tgt.index, argcount);
	list_byte_push4(b, opcode, tgt.frame, tgt.index, argcount);
}

static inline void op_param0(list_byte b, op_enum opcode, varloc_st tgt){
	oplogf("0x%02X %d:%d", opcode, tgt.frame, tgt.index);
	list_byte_push3(b, opcode, tgt.frame, tgt.index);
}

static inline void op_param1(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src){
	oplogf("0x%02X %d:%d, %d:%d", opcode, tgt.frame, tgt.index, src.frame, src.index);
	list_byte_push5(b, opcode, tgt.frame, tgt.index, src.frame, src.index);
}

static inline void op_param2(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2){
	oplogf("0x%02X %d:%d, %d:%d, %d:%d", opcode, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
	list_byte_push7(b, opcode, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index);
}

static inline void op_param3(list_byte b, op_enum opcode, varloc_st tgt, varloc_st src1,
	varloc_st src2, varloc_st src3){
	oplogf("0x%02X %d:%d, %d:%d, %d:%d, %d:%d", opcode, tgt.frame, tgt.index,
		src1.frame, src1.index, src2.frame, src2.index, src3.frame, src3.index);
	list_byte_push9(b, opcode, tgt.frame, tgt.index, src1.frame, src1.index,
		src2.frame, src2.index, src3.frame, src3.index);
}

//
// file position
//

typedef struct {
	char *file;
	int line;
	int chr;
} filepos_st;

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
	KS_ENUM,
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

#ifdef SINK_DEBUG
static const char *ks_name(ks_enum k){
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
		case KS_ENUM:       return "KS_ENUM";
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
}
#endif

static inline ks_enum ks_char(char c){
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
	else if (byteequ(s, "enum"     )) return KS_ENUM;
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
	return tk->type == TOK_KS &&
		(tk->u.k == KS_END || tk->u.k == KS_ELSE || tk->u.k == KS_ELSEIF || tk->u.k == KS_WHILE);
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
	else if (k == KS_LTEQU     ) return  5;
	else if (k == KS_LT        ) return  5;
	else if (k == KS_GTEQU     ) return  5;
	else if (k == KS_GT        ) return  5;
	else if (k == KS_BANGEQU   ) return  6;
	else if (k == KS_EQU2      ) return  6;
	else if (k == KS_AMP2      ) return  7;
	else if (k == KS_PIPE2     ) return  8;
	else if (k == KS_COMMA     ) return  9;
	else if (k == KS_PIPE      ) return 10;
	else if (k == KS_EQU       ) return 20;
	else if (k == KS_PLUSEQU   ) return 20;
	else if (k == KS_PERCENTEQU) return 20;
	else if (k == KS_MINUSEQU  ) return 20;
	else if (k == KS_STAREQU   ) return 20;
	else if (k == KS_SLASHEQU  ) return 20;
	else if (k == KS_CARETEQU  ) return 20;
	else if (k == KS_TILDEEQU  ) return 20;
	else if (k == KS_AMP2EQU   ) return 20;
	else if (k == KS_PIPE2EQU  ) return 20;
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

static inline char toNibble(int n){
	if (n >= 0 && n <= 9)
		return '0' + n;
	else if (n < 16)
		return 'A' + (n - 10);
	return '0';
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
	LEX_NUM_BODY,
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
	int    sign;  // value sign -1 or 1
	double val;   // integer part
	int    base;  // number base 2, 8, 10, or 16
	double frac;  // fractional part >= 0
	int    flen;  // number of fractional digits
	int    esign; // exponent sign -1 or 1
	int    eval;  // exponent value >= 0
} numpart_info;

static inline void numpart_new(numpart_info *info){
	info->sign = 1;
	info->val = 0;
	info->base = 10;
	info->frac = 0;
	info->flen = 0;
	info->esign = 1;
	info->eval = 0;
}

static inline double numpart_calc(numpart_info info){
	double val = info.val;
	double e = 1;
	if (info.eval > 0){
		e = pow(info.base == 10 ? 10.0 : 2.0, info.esign * info.eval);
		val *= e;
	}
	if (info.flen > 0){
		double d = pow(info.base, info.flen);
		val = (val * d + info.frac * e) / d;
	}
	return info.sign * val;
}

typedef struct {
	list_byte str;
	list_int braces;
	lex_enum state;
	numpart_info npi;
	char chR;
	char ch1;
	char ch2;
	char ch3;
	char ch4;
	int str_hexval;
	int str_hexleft;
	bool numexp;
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
				numpart_new(&lx->npi);
				lx->npi.val = toHex(ch1);
				lx->npi.base = 10;
				if (lx->npi.val == 0)
					lx->state = LEX_NUM_0;
				else
					lx->state = LEX_NUM_BODY;
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
				lx->npi.base = 2;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == 'c'){
				lx->npi.base = 8;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == 'x'){
				lx->npi.base = 16;
				lx->state = LEX_NUM_2;
			}
			else if (ch1 == '_')
				lx->state = LEX_NUM_BODY;
			else if (ch1 == '.')
				lx->state = LEX_NUM_FRAC;
			else if (ch1 == 'e' || ch1 == 'E')
				lx->state = LEX_NUM_EXP;
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
				lx->npi.val = toHex(ch1);
				if (lx->npi.val >= lx->npi.base)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else
					lx->state = LEX_NUM_BODY;
			}
			else if (ch1 != '_')
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_BODY:
			if (ch1 == '_')
				/* do nothing */;
			else if (ch1 == '.')
				lx->state = LEX_NUM_FRAC;
			else if ((lx->npi.base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx->npi.base != 10 && (ch1 == 'p' || ch1 == 'P')))
				lx->state = LEX_NUM_EXP;
			else if (isHex(ch1)){
				int v = toHex(ch1);
				if (v >= lx->npi.base)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else
					lx->npi.val = lx->npi.val * lx->npi.base + v;
			}
			else if (!isAlpha(ch1)){
				list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
				lx->state = LEX_START;
				lex_process(lx, tks);
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_FRAC:
			if (ch1 == '_')
				/* do nothing */;
			else if ((lx->npi.base == 10 && (ch1 == 'e' || ch1 == 'E')) ||
				(lx->npi.base != 10 && (ch1 == 'p' || ch1 == 'P')))
				lx->state = LEX_NUM_EXP;
			else if (isHex(ch1)){
				int v = toHex(ch1);
				if (v >= lx->npi.base)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else{
					lx->npi.frac = lx->npi.frac * lx->npi.base + v;
					lx->npi.flen++;
				}
			}
			else if (!isAlpha(ch1)){
				if (lx->npi.flen <= 0)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else{
					list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
					lx->state = LEX_START;
					lex_process(lx, tks);
				}
			}
			else
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_EXP:
			if (ch1 != '_'){
				lx->npi.esign = ch1 == '-' ? -1 : 1;
				lx->state = LEX_NUM_EXP_BODY;
				lx->numexp = false;
				if (ch1 != '+' && ch1 != '-')
					lex_process(lx, tks);
			}
			break;

		case LEX_NUM_EXP_BODY:
			if (ch1 == '_')
				/* do nothing */;
			else if (isNum(ch1)){
				lx->npi.eval = lx->npi.eval * 10.0 + toHex(ch1);
				lx->numexp = true;
			}
			else if (!isAlpha(ch1)){
				if (!lx->numexp)
					list_ptr_push(tks, tok_error(sink_format("Invalid number")));
				else{
					list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
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
				list_ptr_push(tks, tok_str(lx->str));
				list_ptr_push(tks, tok_ks(KS_TILDE));
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

		case LEX_NUM_BODY:
			list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
			break;

		case LEX_NUM_FRAC:
			if (lx->npi.flen <= 0)
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			else
				list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
			break;

		case LEX_NUM_EXP:
			list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			break;

		case LEX_NUM_EXP_BODY:
			if (!lx->numexp)
				list_ptr_push(tks, tok_error(sink_format("Invalid number")));
			else
				list_ptr_push(tks, tok_num(numpart_calc(lx->npi)));
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
	EXPR_PAREN,
	EXPR_GROUP,
	EXPR_CAT,
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
		list_ptr cat;
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

		case EXPR_PAREN:
			if (ex->u.ex)
				expr_free(ex->u.ex);
			break;

		case EXPR_GROUP:
			if (ex->u.group)
				list_ptr_free(ex->u.group);
			break;

		case EXPR_CAT:
			if (ex->u.cat)
				list_ptr_free(ex->u.cat);
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

#ifdef SINK_DEBUG
static void expr_print(expr ex, int depth){
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

		case EXPR_CAT:
			if (ex->u.cat){
				debugf("%sEXPR_CAT:", tab);
				for (int i = 0; i < ex->u.cat->size; i++)
					expr_print(ex->u.cat->ptrs[i], depth + 1);
			}
			else
				debugf("%sEXPR_CAT NULL", tab);
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
}
#endif

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

static inline expr expr_cat(filepos_st flp, expr left, expr right){
	// unwrap any parens
	while (left->type == EXPR_PAREN){
		expr lf = left->u.ex;
		left->u.ex = NULL;
		expr_free(left);
		left = lf;
	}
	while (right->type == EXPR_PAREN){
		expr rt = right->u.ex;
		right->u.ex = NULL;
		expr_free(right);
		right = rt;
	}

	list_ptr c = list_ptr_new((free_func)expr_free);
	if (left->type == EXPR_CAT){
		list_ptr_append(c, left->u.cat);
		left->u.cat->size = 0;
		expr_free(left);
	}
	else
		list_ptr_push(c, left);
	if (right->type == EXPR_CAT){
		list_ptr_append(c, right->u.cat);
		right->u.cat->size = 0;
		expr_free(right);
	}
	else
		list_ptr_push(c, right);
	expr ex = mem_alloc(sizeof(expr_st));
	ex->flp = flp;
	ex->type = EXPR_CAT;
	ex->u.cat = c;
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
	else if (k == KS_TILDE)
		return expr_cat(flp, left, right);
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
	AST_ENUM,
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
} ast_enumt;

typedef struct {
	filepos_st flp;
	ast_enumt type;
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
			list_ptr lvalues;
		} enm;
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

		case AST_ENUM:
			if (stmt->u.enm.lvalues)
				list_ptr_free(stmt->u.enm.lvalues);
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

		case AST_ENUM:
			debug("AST_ENUM");
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

static inline ast ast_enum(filepos_st flp, list_ptr lvalues){
	ast stmt = mem_alloc(sizeof(ast_st));
	stmt->flp = flp;
	stmt->type = AST_ENUM;
	stmt->u.enm.lvalues = lvalues;
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
	PRS_ENUM,
	PRS_ENUM_LVALUES,
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
	bool lvaluesEnum;
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
	pr->lvaluesEnum = false;         // reading an enum
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
	switch (st->state){
		case PRS_STATEMENT:
			if      (tk1->type == TOK_NEWLINE   ) return prr_more();
			else if (tok_isKS(tk1, KS_BREAK    )) return parser_start(pr, PRS_BREAK    );
			else if (tok_isKS(tk1, KS_CONTINUE )) return parser_start(pr, PRS_CONTINUE );
			else if (tok_isKS(tk1, KS_DECLARE  )) return parser_start(pr, PRS_DECLARE  );
			else if (tok_isKS(tk1, KS_DEF      )) return parser_start(pr, PRS_DEF      );
			else if (tok_isKS(tk1, KS_DO       )) return parser_start(pr, PRS_DO       );
			else if (tok_isKS(tk1, KS_ENUM     )) return parser_start(pr, PRS_ENUM     );
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
			pr->state->lvaluesEnum = st->lvaluesEnum;
			return parser_process(pr, flp, stmts);

		case PRS_LVALUES_TERM:
			if (tk1->type == TOK_IDENT)
				return parser_lookup(pr, PRS_LVALUES_TERM_LOOKUP);
			if (st->lvaluesEnum)
				return prr_error(sink_format("Expecting enumerator name"));
			if (tok_isKS(tk1, KS_LBRACE)){
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
			else if (tok_isKS(tk1, KS_COLON)){
				st->state = PRS_FOR_VARS_DONE;
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

		case PRS_ENUM:
			if (tk1->type == TOK_NEWLINE && !tk1->u.soft)
				return prr_more();
			st->state = PRS_ENUM_LVALUES;
			parser_push(pr, PRS_LVALUES);
			pr->state->lvalues = list_ptr_new((free_func)expr_free);
			pr->state->lvaluesEnum = true;
			return parser_process(pr, flp, stmts);

		case PRS_ENUM_LVALUES:
			if (st->lvalues->size <= 0)
				return prr_error(sink_format("Invalid enumerator declaration"));
			list_ptr_push(stmts, ast_enum(flp, st->lvalues));
			st->lvalues = NULL;
			return parser_statement(pr, flp, stmts, false);

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
				tok_free(pr->tkR); // free the newline
				pr->tkR = NULL;
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
				// apply any outstanding Pre's
				while (st->exprPreStack != NULL){
					st->exprTerm = expr_prefix(flp, st->exprPreStack->tk->u.k, st->exprTerm);
					ets next = st->exprPreStack->next;
					ets_free(st->exprPreStack);
					st->exprPreStack = next;
				}

				// grab left side's Pre's
				if (st->exprPreStackStack != NULL){
					st->exprPreStack = st->exprPreStackStack->e;
					st->exprPreStackStack->e = NULL;
					eps next2 = st->exprPreStackStack->next;
					eps_free(st->exprPreStackStack);
					st->exprPreStackStack = next2;
				}

				// fight between the left Pre and the Mid
				while (st->exprPreStack != NULL &&
					(st->exprMidStack == NULL ||
						tok_isPreBeforeMid(st->exprPreStack->tk, st->exprMidStack->tk))){
					// apply the Pre to the left side
					st->exprStack->ex = expr_prefix(flp, st->exprPreStack->tk->u.k,
						st->exprStack->ex);
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
	int pos;
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
	return label_new(list_byte_newstr(str));
}

static void label_refresh(label lbl, list_byte ops, int start){
	for (int i = start; i < lbl->rewrites->size; i++){
		int index = lbl->rewrites->vals[i];
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

static inline void label_jumptrue(label lbl, list_byte ops, varloc_st src){
	op_jumptrue(ops, src, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_jumpfalse(label lbl, list_byte ops, varloc_st src){
	op_jumpfalse(ops, src, 0xFFFFFFFF, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 4);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_call(label lbl, list_byte ops, varloc_st ret, int argcount){
	op_call(ops, ret, 0xFFFFFFFF, argcount, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 5);
	if (lbl->pos >= 0)
		label_refresh(lbl, ops, lbl->rewrites->size - 1);
}

static inline void label_returntail(label lbl, list_byte ops, int argcount){
	op_returntail(ops, 0xFFFFFFFF, argcount, lbl->name);
	list_int_push(lbl->rewrites, ops->size - 5);
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
	int level;
};

static inline void frame_free(frame fr){
	list_int_free(fr->vars);
	list_ptr_free(fr->lbls);
	mem_free(fr);
}

#ifdef SINK_DEBUG
static void frame_print(frame fr){
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
}
#endif

static inline frame frame_new(frame parent){
	frame fr = mem_alloc(sizeof(frame_st));
	fr->vars = list_int_new();
	fr->lbls = list_ptr_new((free_func)label_free);
	fr->parent = parent;
	fr->level = parent ? fr->parent->level + 1 : 0;
	return fr;
}

typedef struct namespace_struct namespace_st, *namespace;
static inline void namespace_free(namespace ns);

typedef enum {
	NSN_VAR,
	NSN_ENUM,
	NSN_CMD_LOCAL,
	NSN_CMD_NATIVE,
	NSN_CMD_OPCODE,
	NSN_NAMESPACE
} nsname_enumt;

typedef struct {
	list_byte name;
	nsname_enumt type;
	union {
		struct {
			frame fr; // not freed by nsname_free
			int index;
		} var;
		double val;
		struct {
			frame fr; // not freed by nsname_free
			label lbl; // not feed by nsname_free
		} cmdLocal;
		uint64_t hash;
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
		case NSN_ENUM:
		case NSN_CMD_LOCAL:
		case NSN_CMD_NATIVE:
		case NSN_CMD_OPCODE:
			break;
		case NSN_NAMESPACE:
			if (nsn->u.ns)
				namespace_free(nsn->u.ns);
			break;
	}
	mem_free(nsn);
}

#ifdef SINK_DEBUG
static void nsname_print(nsname nsn){
	switch (nsn->type){
		case NSN_VAR:
			debugf("%.*s NSN_VAR %d", nsn->name->size, nsn->name->bytes, nsn->u.var.index);
			break;
		case NSN_ENUM:
			debugf("%.*s NSN_ENUM %g", nsn->name->size, nsn->name->bytes, nsn->u.val);
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
}
#endif

static inline nsname nsname_var(list_byte name, frame fr, int index){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newcopy(name);
	nsn->type = NSN_VAR;
	nsn->u.var.fr = fr;
	nsn->u.var.index = index;
	return nsn;
}

static inline nsname nsname_enum(list_byte name, double val, bool own){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = own ? name : list_byte_newcopy(name);
	nsn->type = NSN_ENUM;
	nsn->u.val = val;
	return nsn;
}

static inline nsname nsname_cmdLocal(list_byte name, frame fr, label lbl){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newcopy(name);
	nsn->type = NSN_CMD_LOCAL;
	nsn->u.cmdLocal.fr = fr;
	nsn->u.cmdLocal.lbl = lbl;
	return nsn;
}

static inline nsname nsname_cmdNative(list_byte name, uint64_t hash){
	nsname nsn = mem_alloc(sizeof(nsname_st));
	nsn->name = list_byte_newcopy(name);
	nsn->type = NSN_CMD_NATIVE;
	nsn->u.hash = hash;
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
	nsn->name = list_byte_newcopy(name);
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

#ifdef SINK_DEBUG
static void namespace_print(namespace ns){
	debug("NAMESPACE:");
	for (int i = 0; i < ns->names->size; i++)
		nsname_print(ns->names->ptrs[i]);
}
#endif

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

#ifdef SINK_DEBUG
static void scope_print(scope sc){
	for (int i = 0; i < sc->nsStack->size; i++)
		namespace_print(sc->nsStack->ptrs[i]);
}
#endif

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
			return sta_var(varloc_new(sym->fr->level, i));
		}
	}
	if (sym->fr->vars->size >= 256)
		return sta_error(sink_format("Too many variables in frame"));
	list_int_push(sym->fr->vars, FVR_TEMP_INUSE);
	return sta_var(varloc_new(sym->fr->level, sym->fr->vars->size - 1));
}

static inline void symtbl_clearTemp(symtbl sym, varloc_st vlc){
	assert(!varloc_isnull(vlc));
	if (vlc.frame == sym->fr->level && sym->fr->vars->vals[vlc.index] == FVR_TEMP_INUSE)
		sym->fr->vars->vals[vlc.index] = FVR_TEMP_AVAIL;
}

static inline int symtbl_tempAvail(symtbl sym){
	int cnt = 256 - sym->fr->vars->size;
	for (int i = 0; i < sym->fr->vars->size; i++){
		if (sym->fr->vars->vals[i] == FVR_TEMP_AVAIL)
			cnt++;
	}
	return cnt;
}

static sta_st symtbl_addVar(symtbl sym, list_ptr names, int slot){
	// set `slot` to negative to add variable at next available location
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
				return sta_var(varloc_new(nsn->u.var.fr->level, nsn->u.var.index));
			if (slot < 0){
				slot = sym->fr->vars->size;
				list_int_push(sym->fr->vars, FVR_VAR);
			}
			if (slot >= 256)
				return sta_error(sink_format("Too many variables in frame"));
			nsname_free(ns->names->ptrs[i]);
			ns->names->ptrs[i] = nsname_var(names->ptrs[names->size - 1], sym->fr, slot);
			return sta_var(varloc_new(sym->fr->level, slot));
		}
	}
	if (slot < 0){
		slot = sym->fr->vars->size;
		list_int_push(sym->fr->vars, FVR_VAR);
	}
	if (slot >= 256)
		return sta_error(sink_format("Too many variables in frame"));
	list_ptr_push(ns->names, nsname_var(names->ptrs[names->size - 1], sym->fr, slot));
	return sta_var(varloc_new(sym->fr->level, slot));
}

static sta_st symtbl_addEnum(symtbl sym, list_ptr names, double val){
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
			ns->names->ptrs[i] = nsname_enum(names->ptrs[names->size - 1], val, false);
			return sta_ok();
		}
	}
	list_ptr_push(ns->names, nsname_enum(names->ptrs[names->size - 1], val, false));
	return sta_ok();
}

static void symtbl_reserveVars(symtbl sym, int count){
	// reserves the slots 0 to count-1 for arguments to be passed in for commands
	for (int i = 0; i < count; i++)
		list_int_push(sym->fr->vars, FVR_VAR);
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

static sta_st symtbl_addCmdNative(symtbl sym, list_ptr names, uint64_t hash){
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
			ns->names->ptrs[i] = nsname_cmdNative(names->ptrs[names->size - 1], hash);
			return sta_ok();
		}
	}
	list_ptr_push(ns->names, nsname_cmdNative(names->ptrs[names->size - 1], hash));
	return sta_ok();
}

// symtbl_addCmdOpcode
// can simplify this function because it is only called internally
static inline void SAC(symtbl sym, const char *name, op_enum opcode, int params){
	list_ptr_push(sym->sc->ns->names, nsname_cmdOpcode(list_byte_newstr(name), opcode, params));
}

static inline void SAE(symtbl sym, const char *name, double val){
	list_ptr_push(sym->sc->ns->names, nsname_enum(list_byte_newstr(name), val, true));
}

static inline list_ptr NSS(const char *str){
	return list_ptr_newsingle((free_func)list_byte_free, list_byte_newstr(str));
}

static inline void symtbl_loadStdlib(symtbl sym){
	list_ptr nss;
	SAC(sym, "pick"          , OP_PICK           ,  3);
	SAC(sym, "say"           , OP_SAY            , -1);
	SAC(sym, "warn"          , OP_WARN           , -1);
	SAC(sym, "ask"           , OP_ASK            , -1);
	SAC(sym, "exit"          , OP_EXIT           , -1);
	SAC(sym, "abort"         , OP_ABORT          , -1);
	SAC(sym, "isnum"         , OP_ISNUM          ,  1);
	SAC(sym, "isstr"         , OP_ISSTR          ,  1);
	SAC(sym, "islist"        , OP_ISLIST         ,  1);
	SAC(sym, "range"         , OP_RANGE          ,  3);
	SAC(sym, "order"         , OP_ORDER          ,  2);
	nss = NSS("num"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "abs"       , OP_NUM_ABS        ,  1);
		SAC(sym, "sign"      , OP_NUM_SIGN       ,  1);
		SAC(sym, "max"       , OP_NUM_MAX        , -1);
		SAC(sym, "min"       , OP_NUM_MIN        , -1);
		SAC(sym, "clamp"     , OP_NUM_CLAMP      ,  3);
		SAC(sym, "floor"     , OP_NUM_FLOOR      ,  1);
		SAC(sym, "ceil"      , OP_NUM_CEIL       ,  1);
		SAC(sym, "round"     , OP_NUM_ROUND      ,  1);
		SAC(sym, "trunc"     , OP_NUM_TRUNC      ,  1);
		SAC(sym, "nan"       , OP_NUM_NAN        ,  0);
		SAC(sym, "inf"       , OP_NUM_INF        ,  0);
		SAC(sym, "isnan"     , OP_NUM_ISNAN      ,  1);
		SAC(sym, "isfinite"  , OP_NUM_ISFINITE   ,  1);
		SAE(sym, "e"         , sink_num_e().f        );
		SAE(sym, "pi"        , sink_num_pi().f       );
		SAE(sym, "tau"       , sink_num_tau().f      );
		SAC(sym, "sin"       , OP_NUM_SIN        ,  1);
		SAC(sym, "cos"       , OP_NUM_COS        ,  1);
		SAC(sym, "tan"       , OP_NUM_TAN        ,  1);
		SAC(sym, "asin"      , OP_NUM_ASIN       ,  1);
		SAC(sym, "acos"      , OP_NUM_ACOS       ,  1);
		SAC(sym, "atan"      , OP_NUM_ATAN       ,  1);
		SAC(sym, "atan2"     , OP_NUM_ATAN2      ,  2);
		SAC(sym, "log"       , OP_NUM_LOG        ,  1);
		SAC(sym, "log2"      , OP_NUM_LOG2       ,  1);
		SAC(sym, "log10"     , OP_NUM_LOG10      ,  1);
		SAC(sym, "exp"       , OP_NUM_EXP        ,  1);
		SAC(sym, "lerp"      , OP_NUM_LERP       ,  3);
		SAC(sym, "hex"       , OP_NUM_HEX        ,  2);
		SAC(sym, "oct"       , OP_NUM_OCT        ,  2);
		SAC(sym, "bin"       , OP_NUM_BIN        ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("int"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_INT_NEW        ,  1);
		SAC(sym, "not"       , OP_INT_NOT        ,  1);
		SAC(sym, "and"       , OP_INT_AND        , -1);
		SAC(sym, "or"        , OP_INT_OR         , -1);
		SAC(sym, "xor"       , OP_INT_XOR        , -1);
		SAC(sym, "shl"       , OP_INT_SHL        ,  2);
		SAC(sym, "shr"       , OP_INT_SHR        ,  2);
		SAC(sym, "sar"       , OP_INT_SAR        ,  2);
		SAC(sym, "add"       , OP_INT_ADD        ,  2);
		SAC(sym, "sub"       , OP_INT_SUB        ,  2);
		SAC(sym, "mul"       , OP_INT_MUL        ,  2);
		SAC(sym, "div"       , OP_INT_DIV        ,  2);
		SAC(sym, "mod"       , OP_INT_MOD        ,  2);
		SAC(sym, "clz"       , OP_INT_CLZ        ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("rand"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "seed"      , OP_RAND_SEED      ,  1);
		SAC(sym, "seedauto"  , OP_RAND_SEEDAUTO  ,  0);
		SAC(sym, "int"       , OP_RAND_INT       ,  0);
		SAC(sym, "num"       , OP_RAND_NUM       ,  0);
		SAC(sym, "getstate"  , OP_RAND_GETSTATE  ,  0);
		SAC(sym, "setstate"  , OP_RAND_SETSTATE  ,  1);
		SAC(sym, "pick"      , OP_RAND_PICK      ,  1);
		SAC(sym, "shuffle"   , OP_RAND_SHUFFLE   ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("str"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_STR_NEW        , -1);
		SAC(sym, "split"     , OP_STR_SPLIT      ,  2);
		SAC(sym, "replace"   , OP_STR_REPLACE    ,  3);
		SAC(sym, "begins"    , OP_STR_BEGINS     ,  2);
		SAC(sym, "ends"      , OP_STR_ENDS       ,  2);
		SAC(sym, "pad"       , OP_STR_PAD        ,  2);
		SAC(sym, "find"      , OP_STR_FIND       ,  3);
		SAC(sym, "rfind"     , OP_STR_RFIND      ,  3);
		SAC(sym, "lower"     , OP_STR_LOWER      ,  1);
		SAC(sym, "upper"     , OP_STR_UPPER      ,  1);
		SAC(sym, "trim"      , OP_STR_TRIM       ,  1);
		SAC(sym, "rev"       , OP_STR_REV        ,  1);
		SAC(sym, "rep"       , OP_STR_REP        ,  2);
		SAC(sym, "list"      , OP_STR_LIST       ,  1);
		SAC(sym, "byte"      , OP_STR_BYTE       ,  2);
		SAC(sym, "hash"      , OP_STR_HASH       ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("utf8"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "valid"     , OP_UTF8_VALID     ,  1);
		SAC(sym, "list"      , OP_UTF8_LIST      ,  1);
		SAC(sym, "str"       , OP_UTF8_STR       ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("struct"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "size"      , OP_STRUCT_SIZE    ,  1);
		SAC(sym, "str"       , OP_STRUCT_STR     ,  2);
		SAC(sym, "list"      , OP_STRUCT_LIST    ,  2);
	symtbl_popNamespace(sym);
	nss = NSS("list"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "new"       , OP_LIST_NEW       ,  2);
		SAC(sym, "shift"     , OP_LIST_SHIFT     ,  1);
		SAC(sym, "pop"       , OP_LIST_POP       ,  1);
		SAC(sym, "push"      , OP_LIST_PUSH      ,  2);
		SAC(sym, "unshift"   , OP_LIST_UNSHIFT   ,  2);
		SAC(sym, "append"    , OP_LIST_APPEND    ,  2);
		SAC(sym, "prepend"   , OP_LIST_PREPEND   ,  2);
		SAC(sym, "find"      , OP_LIST_FIND      ,  3);
		SAC(sym, "rfind"     , OP_LIST_RFIND     ,  3);
		SAC(sym, "join"      , OP_LIST_JOIN      ,  2);
		SAC(sym, "rev"       , OP_LIST_REV       ,  1);
		SAC(sym, "str"       , OP_LIST_STR       ,  1);
		SAC(sym, "sort"      , OP_LIST_SORT      ,  1);
		SAC(sym, "rsort"     , OP_LIST_RSORT     ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("pickle"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "json"      , OP_PICKLE_JSON    ,  1);
		SAC(sym, "bin"       , OP_PICKLE_BIN     ,  1);
		SAC(sym, "val"       , OP_PICKLE_VAL     ,  1);
		SAC(sym, "valid"     , OP_PICKLE_VALID   ,  1);
		SAC(sym, "sibling"   , OP_PICKLE_SIBLING ,  1);
		SAC(sym, "circular"  , OP_PICKLE_CIRCULAR,  1);
		SAC(sym, "copy"      , OP_PICKLE_COPY    ,  1);
	symtbl_popNamespace(sym);
	nss = NSS("gc"); symtbl_pushNamespace(sym, nss); list_ptr_free(nss);
		SAC(sym, "getlevel"  , OP_GC_GETLEVEL    ,  0);
		SAC(sym, "setlevel"  , OP_GC_SETLEVEL    ,  1);
		SAC(sym, "run"       , OP_GC_RUN         ,  0);
	symtbl_popNamespace(sym);
}

//
// program
//

typedef struct {
	list_ptr strTable;
	list_u64 keyTable;
	list_ptr flpTable;
	list_byte ops;
	bool repl;
} program_st, *program;

static inline void program_free(program prg){
	list_ptr_free(prg->strTable);
	list_u64_free(prg->keyTable);
	list_ptr_free(prg->flpTable);
	list_byte_free(prg->ops);
	mem_free(prg);
}

static inline program program_new(bool repl){
	program prg = mem_alloc(sizeof(program_st));
	prg->strTable = list_ptr_new((free_func)list_byte_free);
	prg->keyTable = list_u64_new();
	prg->flpTable = list_ptr_new(mem_free_func);
	prg->ops = list_byte_new();
	prg->repl = repl;
	return prg;
}

static bool program_validate(program prg){
	int pc = 0;
	int level = 0;
	bool wasjump = false;
	uint32_t jumploc;
	uint32_t jumplocs[256];
	list_byte ops = prg->ops;
	int A, B, C, D;

	// holds alignment information
	// op_actual: the actual alignment of each byte
	//   0 = invalid target, 1 = valid jump target, 2 = valid call target
	uint8_t *op_actual = mem_alloc(sizeof(uint8_t) * ops->size);
	memset(op_actual, 0, sizeof(uint8_t) * ops->size);
	// op_need: the required alignment of each byte
	//   0 = don't care, 1 = valid jump target, 2 = valid call target
	uint8_t *op_need = mem_alloc(sizeof(uint8_t) * ops->size);
	memset(op_need, 0, sizeof(uint8_t) * ops->size);

	#define READVAR() do{                                              \
			if (pc + 2 > ops->size)                                    \
				goto fail;                                             \
			A = ops->bytes[pc++];                                      \
			B = ops->bytes[pc++];                                      \
			if (A > level)                                             \
				goto fail;                                             \
		} while (false)

	#define READLOC(L) do{                                             \
			if (pc + 4 > ops->size)                                    \
				goto fail;                                             \
			A = ops->bytes[pc++];                                      \
			B = ops->bytes[pc++];                                      \
			C = ops->bytes[pc++];                                      \
			D = ops->bytes[pc++];                                      \
			jumploc = A + (B << 8) + (C << 16) + ((D << 23) * 2);      \
			if (jumploc < 0)                                           \
				goto fail;                                             \
			if (jumploc < ops->size)                                   \
				op_need[jumploc] = L;                                  \
		} while (false)

	#define READDATA(S) do{                                            \
			if (pc + S > ops->size)                                    \
				goto fail;                                             \
			pc += S;                                                   \
		} while (false)

	#define READCNT() do{                                              \
			if (pc + 1 > ops->size)                                    \
				goto fail;                                             \
			C = ops->bytes[pc++];                                      \
			for (D = 0; D < C; D++)                                    \
				READVAR();                                             \
		} while (false)

	#define READINDEX() do{                                            \
			if (pc + 2 > ops->size)                                    \
				goto fail;                                             \
			A = ops->bytes[pc++];                                      \
			B = ops->bytes[pc++];                                      \
			A = A | (B << 8);                                          \
		} while (false)

	while (pc < ops->size){
		op_actual[pc] = 1;
		op_pcat opc = op_paramcat((op_enum)ops->bytes[pc++]);
		debug(op_pcat_name(opc));
		switch (opc){
			case OPPC_INVALID    : goto fail;

			case OPPC_STR        : { // [VAR], [INDEX]
				READVAR();
				READINDEX();
				if (A < 0 || A >= prg->strTable->size)
					goto fail;
			} break;

			case OPPC_CMDHEAD    : { // LEVEL, RESTPOS
				if (!wasjump)
					goto fail;
				if (pc + 2 > ops->size)
					goto fail;
				op_actual[pc - 1] = 2; // valid call target
				if (level > 255)
					goto fail;
				jumplocs[level++] = jumploc; // save previous jump target
				A = ops->bytes[pc++];
				B = ops->bytes[pc++];
				if (A != level)
					goto fail;
			} break;

			case OPPC_CMDTAIL    : { //
				if (level <= 0)
					goto fail;
				if (jumplocs[--level] != pc) // force jump target to jump over command body
					goto fail;
			} break;

			case OPPC_JUMP       : { // [[LOCATION]]
				READLOC(1); // need valid jump target
			} break;

			case OPPC_VJUMP      : { // [VAR], [[LOCATION]]
				READVAR();
				READLOC(1); // need valid jump target
			} break;

			case OPPC_CALL       : { // [VAR], [[LOCATION]], ARGCOUNT, [VARS]...
				READVAR();
				READLOC(2); // need valid call target
				READCNT();
			} break;

			case OPPC_NATIVE     : { // [VAR], [INDEX], ARGCOUNT, [VARS]...
				READVAR();
				READINDEX();
				if (A < 0 || A >= prg->keyTable->size)
					goto fail;
				READCNT();
			} break;

			case OPPC_RETURNTAIL : { // [[LOCATION]], ARGCOUNT, [VARS]...
				READLOC(2); // need valid call target
				READCNT();
			} break;

			case OPPC_VVVV       :   // [VAR], [VAR], [VAR], [VAR]
				READVAR();
			case OPPC_VVV        :   // [VAR], [VAR], [VAR]
				READVAR();
			case OPPC_VV         :   // [VAR], [VAR]
				READVAR();
			case OPPC_V          :   // [VAR]
				READVAR();
			case OPPC_EMPTY      :   // nothing
				break;

			case OPPC_VA         : { // [VAR], ARGCOUNT, [VARS]...
				READVAR();
				READCNT();
			} break;

			case OPPC_VN         : { // [VAR], DATA
				READVAR();
				READDATA(1);
			} break;

			case OPPC_VNN        : { // [VAR], [DATA]
				READVAR();
				READDATA(2);
			} break;

			case OPPC_VNNNN      : { // [VAR], [[DATA]]
				READVAR();
				READDATA(4);
			} break;

			case OPPC_VNNNNNNNN  : { // [VAR], [[[DATA]]]
				READVAR();
				READDATA(8);
			} break;
		}
		wasjump = opc == OPPC_JUMP;
	}

	#undef READVAR
	#undef READLOC
	#undef READDATA
	#undef READCNT
	#undef READINDEX

	// validate op_need alignments matches op_actual alignments
	for (int i = 0; i < ops->size; i++){
		if (op_need[i] != 0 && op_need[i] != op_actual[i])
			goto fail;
	}

	mem_free(op_actual);
	mem_free(op_need);
	return true;

	fail:
	mem_free(op_actual);
	mem_free(op_need);
	return false;
}

typedef struct {
	int pc;
	filepos_st flp;
} prgflp_st, *prgflp;

static inline void program_flp(program prg, filepos_st flp){
	int i = prg->flpTable->size - 1;
	if (i >= 0){
		prgflp p = prg->flpTable->ptrs[i];
		if (p->pc == prg->ops->size){
			p->flp = flp;
			return;
		}
	}
	prgflp p = mem_alloc(sizeof(prgflp_st));
	p->pc = prg->ops->size;
	p->flp = flp;
	list_ptr_push(prg->flpTable, p);
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
	PEM_EMPTY,  // I don't need the value
	PEM_CREATE, // I need to read the value
	PEM_INTO    // I need to own the register
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

static lvp_st lval_addVars(symtbl sym, expr ex, int slot){
	if (ex->type == EXPR_NAMES){
		sta_st sr = symtbl_addVar(sym, ex->u.names, slot);
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
					lvp_st lp = lval_addVars(sym, gex->u.prefix.ex, -1);
					if (lp.type == LVP_ERROR)
						return lp;
					rest = lp.u.lv;
				}
				else{
					lvp_st lp = lval_addVars(sym, gex, -1);
					if (lp.type == LVP_ERROR)
						return lp;
					list_ptr_push(body, lp.u.lv);
				}
			}
		}
		else if (ex->u.ex->type == EXPR_PREFIX && ex->u.ex->u.prefix.k == KS_PERIOD3){
			lvp_st lp = lval_addVars(sym, ex->u.ex->u.ex, -1);
			if (lp.type == LVP_ERROR)
				return lp;
			rest = lp.u.lv;
		}
		else{
			lvp_st lp = lval_addVars(sym, ex->u.ex, -1);
			if (lp.type == LVP_ERROR)
				return lp;
			list_ptr_push(body, lp.u.lv);
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
			varloc_new(sl.u.nsn->u.var.fr->level, sl.u.nsn->u.var.index)));
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
				op_numint(prg->ops, t, 0);
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
				op_numint(prg->ops, t, 0);
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
				op_numint(prg->ops, t, i);
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

				op_numint(prg->ops, t, lv->u.list.body->size);
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
		op_numint(prg->ops, start, 0);
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

static inline bool program_evalCallArgcount(program prg, symtbl sym, expr params, int *argcount,
	per_st *pe, varloc_st *p){
	// `p` is an array of 255 varloc_st's, which get filled with `argcount` arguments
	// returns false on error, with error inside of `pe`
	*argcount = 0;
	if (params){
		if (params->type == EXPR_GROUP){
			*argcount = params->u.group->size;
			if (*argcount > 254)
				*argcount = 254;
			for (int i = 0; i < params->u.group->size; i++){
				*pe = program_eval(prg, sym, i < *argcount ? PEM_CREATE : PEM_EMPTY, VARLOC_NULL,
					params->u.group->ptrs[i]);
				if (pe->type == PER_ERROR)
					return false;
				if (i < *argcount)
					p[i] = pe->u.vlc;
			}
		}
		else{
			*argcount = 1;
			*pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, params);
			if (pe->type == PER_ERROR)
				return false;
			p[0] = pe->u.vlc;
		}
	}
	return true;
}

static per_st program_evalCall(program prg, symtbl sym, pem_enum mode, varloc_st intoVlc,
	filepos_st flp, nsname nsn, expr params){
	if (nsn->type != NSN_CMD_LOCAL && nsn->type != NSN_CMD_NATIVE && nsn->type != NSN_CMD_OPCODE)
		return per_error(flp, sink_format("Invalid call - not a command"));
	// params can be NULL to indicate emptiness
	if (nsn->type == NSN_CMD_OPCODE && nsn->u.cmdOpcode.opcode == OP_PICK){
		if (params == NULL || params->type != EXPR_GROUP ||
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

		label_jumpfalse(pickfalse, prg->ops, pe.u.vlc);
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

	if (mode == PEM_EMPTY || mode == PEM_CREATE){
		sta_st ts = symtbl_addTemp(sym);
		if (ts.type == STA_ERROR)
			return per_error(flp, ts.u.msg);
		intoVlc = ts.u.vlc;
	}

	varloc_st p[256];
	int argcount;
	per_st pe;
	if (!program_evalCallArgcount(prg, sym, params, &argcount, &pe, p))
		return pe;

	bool oarg = true;
	if (nsn->type == NSN_CMD_LOCAL)
		label_call(nsn->u.cmdLocal.lbl, prg->ops, intoVlc, argcount);
	else if (nsn->type == NSN_CMD_NATIVE){
		// search for the hash
		int index;
		bool found = false;
		for (index = 0; index < prg->keyTable->size; index++){
			if (prg->keyTable->vals[index] == nsn->u.hash){
				found = true;
				break;
			}
		}
		if (!found){
			if (prg->keyTable->size >= 65536) // using too many native calls?
				return per_error(flp, sink_format("Too many native commands"));
			index = prg->keyTable->size;
			list_u64_push(prg->keyTable, nsn->u.hash);
		}
		op_native(prg->ops, intoVlc, index, argcount);
	}
	else{ // NSN_CMD_OPCODE
		if (nsn->u.cmdOpcode.params < 0)
			op_parama(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, argcount);
		else{
			oarg = false;
			if (nsn->u.cmdOpcode.params > argcount){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(flp, ts.u.msg);
				p[argcount + 0] = p[argcount + 1] = p[argcount + 2] = ts.u.vlc;
				op_nil(prg->ops, p[argcount]);
				argcount++;
			}
			if (nsn->u.cmdOpcode.params == 0)
				op_param0(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc);
			else if (nsn->u.cmdOpcode.params == 1)
				op_param1(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p[0]);
			else if (nsn->u.cmdOpcode.params == 2)
				op_param2(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p[0], p[1]);
			else // nsn.params == 3
				op_param3(prg->ops, nsn->u.cmdOpcode.opcode, intoVlc, p[0], p[1], p[2]);
		}
	}

	for (int i = 0; i < argcount; i++){
		if (oarg)
			op_arg(prg->ops, p[i]);
		symtbl_clearTemp(sym, p[i]);
	}

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
				label_jumpfalse(skip, prg->ops, pe.u.vlc);
			else
				label_jumptrue(skip, prg->ops, pe.u.vlc);
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

			op_numint(prg->ops, idx, 0);

			label next = label_newStr("^condslicenext");

			op_nil(prg->ops, t);
			op_binop(prg->ops, OP_EQU, t, t, len);
			label_jumpfalse(next, prg->ops, t);
			op_unop(prg->ops, OP_SIZE, t, obj);
			op_binop(prg->ops, OP_NUM_SUB, len, t, start);

			label_declare(next, prg->ops);

			op_binop(prg->ops, OP_LT, t, idx, len);

			label keep = label_newStr("^condslicekeep");
			label_jumpfalse(inverted ? keep : skip, prg->ops, t);

			op_binop(prg->ops, OP_NUM_ADD, t, idx, start);
			op_getat(prg->ops, t, obj, t);
			if (jumpFalse)
				label_jumptrue(inverted ? skip : keep, prg->ops, t);
			else
				label_jumpfalse(inverted ? skip : keep, prg->ops, t);

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
				label_jumpfalse(skip, prg->ops, pe.u.vlc);
			else
				label_jumptrue(skip, prg->ops, pe.u.vlc);
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

			op_numint(prg->ops, idx, 0);

			label next = label_newStr("^condpartslicenext");

			op_nil(prg->ops, t);
			op_binop(prg->ops, OP_EQU, t, t, len);
			label_jumpfalse(next, prg->ops, t);
			op_unop(prg->ops, OP_SIZE, t, obj);
			op_binop(prg->ops, OP_NUM_SUB, len, t, start);

			label_declare(next, prg->ops);

			op_binop(prg->ops, OP_LT, t, idx, len);

			label done = label_newStr("^condpartslicedone");
			label_jumpfalse(done, prg->ops, t);

			label inc = label_newStr("^condpartsliceinc");
			op_binop(prg->ops, OP_NUM_ADD, t, idx, start);
			op_getat(prg->ops, t2, obj, t);
			if (jumpFalse)
				label_jumpfalse(inc, prg->ops, t2);
			else
				label_jumptrue(inc, prg->ops, t2);

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
				op_numint(prg->ops, t, i);
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
				op_numint(prg->ops, t, lv->u.list.body->size);
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
	program_flp(prg, ex->flp);
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
			op_num(prg->ops, intoVlc, ex->u.num);
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
					varloc_st ls = intoVlc;
					if (mode == PEM_INTO){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex->flp, ts.u.msg);
						ls = ts.u.vlc;
					}
					op_list(prg->ops, ls, ex->u.ex->u.group->size);
					for (int i = 0; i < ex->u.ex->u.group->size; i++){
						per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
							ex->u.ex->u.group->ptrs[i]);
						if (pe.type == PER_ERROR)
							return pe;
						symtbl_clearTemp(sym, pe.u.vlc);
						op_param2(prg->ops, OP_LIST_PUSH, ls, ls, pe.u.vlc);
					}
					if (mode == PEM_INTO){
						symtbl_clearTemp(sym, ls);
						op_move(prg->ops, intoVlc, ls);
					}
				}
				else{
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.ex);
					if (pe.type == PER_ERROR)
						return pe;
					// check for `a = {a}`
					if (intoVlc.frame == pe.u.vlc.frame && intoVlc.index == pe.u.vlc.index){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex->flp, ts.u.msg);
						symtbl_clearTemp(sym, ts.u.vlc);
						symtbl_clearTemp(sym, pe.u.vlc);
						op_list(prg->ops, ts.u.vlc, 1);
						op_param2(prg->ops, OP_LIST_PUSH, ts.u.vlc, ts.u.vlc, pe.u.vlc);
						op_move(prg->ops, intoVlc, ts.u.vlc);
					}
					else{
						symtbl_clearTemp(sym, pe.u.vlc);
						op_list(prg->ops, intoVlc, 1);
						op_param2(prg->ops, OP_LIST_PUSH, intoVlc, intoVlc, pe.u.vlc);
					}
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
					varloc_st varVlc = varloc_new(sl.u.nsn->u.var.fr->level, sl.u.nsn->u.var.index);
					if (mode == PEM_CREATE)
						return per_ok(varVlc);
					op_move(prg->ops, intoVlc, varVlc);
					return per_ok(intoVlc);
				} break;

				case NSN_ENUM: {
					if (mode == PEM_EMPTY)
						return per_ok(VARLOC_NULL);
					if (mode == PEM_CREATE){
						sta_st ts = symtbl_addTemp(sym);
						if (ts.type == STA_ERROR)
							return per_error(ex->flp, ts.u.msg);
						intoVlc = ts.u.vlc;
					}
					op_num(prg->ops, intoVlc, sl.u.nsn->u.val);
					return per_ok(intoVlc);
				} break;

				case NSN_CMD_LOCAL:
				case NSN_CMD_NATIVE:
				case NSN_CMD_OPCODE:
					return program_evalCall(prg, sym, mode, intoVlc, ex->flp, sl.u.nsn, NULL);

				case NSN_NAMESPACE:
					return per_error(ex->flp, sink_format("Invalid expression"));
			}
			assert(false);
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

		case EXPR_CAT: {
			if (mode == PEM_EMPTY || mode == PEM_CREATE){
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				intoVlc = ts.u.vlc;
			}
			varloc_st t = VARLOC_NULL;
			int tmax = symtbl_tempAvail(sym) - 128;
			if (tmax < 16)
				tmax = 16;
			if (ex->u.cat->size > tmax){
				tmax--;
				sta_st ts = symtbl_addTemp(sym);
				if (ts.type == STA_ERROR)
					return per_error(ex->flp, ts.u.msg);
				t = ts.u.vlc;
			}
			varloc_st p[256];
			for (int ci = 0; ci < ex->u.cat->size; ci += tmax){
				int len = ex->u.cat->size - ci;
				if (len > tmax)
					len = tmax;
				for (int i = 0; i < len; i++){
					per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL,
						ex->u.cat->ptrs[ci + i]);
					if (pe.type == PER_ERROR)
						return pe;
					p[i] = pe.u.vlc;
				}
				op_cat(prg->ops, ci > 0 ? t : intoVlc, len);
				for (int i = 0; i < len; i++){
					symtbl_clearTemp(sym, p[i]);
					op_arg(prg->ops, p[i]);
				}
				if (ci > 0){
					op_cat(prg->ops, intoVlc, 2);
					op_arg(prg->ops, intoVlc);
					op_arg(prg->ops, t);
				}
			}
			if (!varloc_isnull(t))
				symtbl_clearTemp(sym, t);
			if (mode == PEM_EMPTY){
				symtbl_clearTemp(sym, intoVlc);
				return per_ok(VARLOC_NULL);
			}
			return per_ok(intoVlc);
		} break;

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
			else if (ex->u.infix.k == KS_AMP2 || ex->u.infix.k == KS_PIPE2){
				per_st pe = program_eval(prg, sym, PEM_CREATE, VARLOC_NULL, ex->u.infix.left);
				if (pe.type == PER_ERROR)
					return pe;
				varloc_st left = pe.u.vlc;
				label useleft = label_newStr("^useleft");
				if (ex->u.infix.k == KS_AMP2)
					label_jumpfalse(useleft, prg->ops, left);
				else
					label_jumptrue(useleft, prg->ops, left);
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
			return program_evalCall(prg, sym, mode, intoVlc, ex->flp, sl.u.nsn, ex->u.call.params);
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
	varloc_st val_vlc;
	varloc_st idx_vlc;
} pgs_for_st, *pgs_for;

static inline void pgs_for_free(pgs_for pst){
	label_free(pst->top);
	label_free(pst->inc);
	label_free(pst->finish);
	mem_free(pst);
}

static inline pgs_for pgs_for_new(varloc_st t1, varloc_st t2, varloc_st t3, varloc_st t4,
	varloc_st val_vlc, varloc_st idx_vlc, label top, label inc, label finish){
	pgs_for pst = mem_alloc(sizeof(pgs_for_st));
	pst->t1 = t1;
	pst->t2 = t2;
	pst->t3 = t3;
	pst->t4 = t4;
	pst->val_vlc = val_vlc;
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

typedef struct {
	varloc_st vlc;
	char *err;
} pfvs_res_st;

static inline pfvs_res_st program_forVarsSingle(symtbl sym, bool forVar, list_ptr names){
	if (names == NULL || forVar){
		sta_st ts = names == NULL ? symtbl_addTemp(sym) : symtbl_addVar(sym, names, -1);
		if (ts.type == STA_ERROR)
			return (pfvs_res_st){ .vlc = VARLOC_NULL, .err = ts.u.msg };
		return (pfvs_res_st){ .vlc = ts.u.vlc, .err = NULL };
	}
	else{
		stl_st sl = symtbl_lookup(sym, names);
		if (sl.type == STL_ERROR)
			return (pfvs_res_st){ .vlc = VARLOC_NULL, .err = sl.u.msg };
		if (sl.u.nsn->type != NSN_VAR){
			return (pfvs_res_st){
				.vlc = VARLOC_NULL,
				.err = sink_format("Cannot use non-variable in for loop")
			};
		}
		return (pfvs_res_st){
			.vlc = varloc_new(sl.u.nsn->u.var.fr->level, sl.u.nsn->u.var.index),
			.err = NULL
		};
	}
}

static pgr_st program_forVars(symtbl sym, ast stmt){
	pfvs_res_st pf1 = { .vlc = VARLOC_NULL };
	if (stmt->u.for1.names1 != NULL){
		pf1 = program_forVarsSingle(sym, stmt->u.for1.forVar, stmt->u.for1.names1);
		if (pf1.err)
			return pgr_error(stmt->flp, pf1.err);
	}
	pfvs_res_st pf2 = program_forVarsSingle(sym, stmt->u.for1.forVar, stmt->u.for1.names2);
	if (pf2.err)
		return pgr_error(stmt->flp, pf2.err);
	return pgr_forvars(pf1.vlc, pf2.vlc);
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
		op_numint(prg->ops, p1, 0);
	}

	symtbl_pushScope(sym);
	pgr_st pgi = program_forVars(sym, stmt);
	if (pgi.type != PGR_FORVARS)
		return pgi;
	varloc_st val_vlc = pgi.u.forvars.val_vlc;
	varloc_st idx_vlc = pgi.u.forvars.idx_vlc;

	// clear the index
	op_numint(prg->ops, idx_vlc, 0);

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
	label_jumpfalse(finish, prg->ops, t);

	if (!varloc_isnull(val_vlc)){
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
	}

	sym->sc->lblBreak = finish;
	sym->sc->lblContinue = inc;

	return pgr_push(pgs_for_new(p1, p2, p3, t, val_vlc, idx_vlc, top, inc, finish),
		(free_func)pgs_for_free);
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
	op_numint(prg->ops, idx_vlc, 0);

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
	label_jumpfalse(finish, prg->ops, t);

	if (!varloc_isnull(val_vlc))
		op_getat(prg->ops, val_vlc, exp_vlc, idx_vlc);
	sym->sc->lblBreak = finish;
	sym->sc->lblContinue = inc;

	return pgr_push(
		pgs_for_new(t, exp_vlc, VARLOC_NULL, VARLOC_NULL, val_vlc, idx_vlc, top, inc, finish),
		(free_func)pgs_for_free);
}

static inline pgr_st program_gen(program prg, symtbl sym, ast stmt, void *state, bool sayexpr){
	program_flp(prg, stmt->flp);
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
					sta_st sr = symtbl_addCmdNative(sym, dc->names,
						native_hash(dc->key->size, dc->key->bytes));
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

			int level = sym->fr->level + 1;
			if (level > 255)
				return pgr_error(stmt->flp, sink_format("Too many nested commands"));
			int rest = 0xFF;
			int lvs = stmt->u.def1.lvalues->size;
			if (lvs > 255)
				return pgr_error(stmt->flp, sink_format("Too many parameters"));
			if (lvs > 0){
				expr last_ex = stmt->u.def1.lvalues->ptrs[lvs - 1];
				// is the last expression a `...rest`?
				if (last_ex->type == EXPR_PREFIX && last_ex->u.prefix.k == KS_PERIOD3)
					rest = lvs - 1;
			}

			label skip = label_newStr("^after_def");
			label_jump(skip, prg->ops);

			label_declare(lbl, prg->ops);
			symtbl_pushFrame(sym);

			op_cmdhead(prg->ops, level, rest);

			// reserve our argument registers as explicit registers 0 to lvs-1
			symtbl_reserveVars(sym, lvs);

			// initialize our arguments as needed
			for (int i = 0; i < lvs; i++){
				expr ex = stmt->u.def1.lvalues->ptrs[i];
				if (ex->type == EXPR_INFIX){
					// the argument is the i-th register
					varloc_st arg = varloc_new(level, i);

					// check for initialization -- must happen before the symbols are added so that
					// `def a x = x` binds the seconds `x` to the outer scope
					if (ex->u.infix.right != NULL){
						label argset = label_newStr("^argset");
						label_jumptrue(argset, prg->ops, arg);
						per_st pr = program_eval(prg, sym, PEM_INTO, arg, ex->u.infix.right);
						if (pr.type == PER_ERROR){
							label_free(skip);
							label_free(argset);
							return pgr_error(pr.u.error.flp, pr.u.error.msg);
						}
						label_declare(argset, prg->ops);
						label_free(argset);
					}

					// now we can add the param symbols
					lvp_st lr = lval_addVars(sym, ex->u.infix.left, i);
					if (lr.type == LVP_ERROR){
						label_free(skip);
						return pgr_error(lr.u.error.flp, lr.u.error.msg);
					}

					// move argument into lval(s)
					per_st pe = program_evalLval(prg, sym, PEM_EMPTY, VARLOC_NULL, lr.u.lv,
						OP_INVALID, arg, true);
					lvr_free(lr.u.lv);
					if (pe.type == PER_ERROR){
						label_free(skip);
						return pgr_error(pe.u.error.flp, pe.u.error.msg);
					}
				}
				else if (i == lvs - 1 && ex->type == EXPR_PREFIX && ex->u.prefix.k == KS_PERIOD3){
					lvp_st lr = lval_addVars(sym, ex->u.prefix.ex, i);
					if (lr.type == LVP_ERROR){
						label_free(skip);
						return pgr_error(lr.u.error.flp, lr.u.error.msg);
					}
					assert(lr.u.lv->type == LVR_VAR);
					lvr_free(lr.u.lv);
				}
				else
					assert(false);
			}
			return pgr_push(skip, (free_func)label_free);
		} break;

		case AST_DEF2: {
			op_cmdtail(prg->ops);
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
				label_jumpfalse(pst->finish, prg->ops, pe.u.vlc);
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

		case AST_ENUM: {
			double last_val = -1;
			for (int i = 0; i < stmt->u.var.lvalues->size; i++){
				expr ex = stmt->u.var.lvalues->ptrs[i];
				assert(ex->type == EXPR_INFIX);
				double v = last_val + 1;
				if (ex->u.infix.right != NULL){
					expr ex2 = ex->u.infix.right;
					while (ex2->type == EXPR_PAREN)
						ex2 = ex2->u.ex;
					if (ex2->type != EXPR_NUM)
						return pgr_error(stmt->flp, sink_format("Enums must be a constant number"));
					v = ex2->u.num;
				}
				if (ex->u.infix.left->type != EXPR_NAMES){
					return pgr_error(stmt->flp,
						sink_format("Enum name must only consist of identifiers"));
				}
				last_val = v;
				sta_st st = symtbl_addEnum(sym, ex->u.infix.left->u.names, v);
				if (st.type == STA_ERROR)
					return pgr_error(stmt->flp, st.u.msg);
			}
			return pgr_ok();
		} break;

		case AST_FOR1: {
			if (stmt->u.for1.ex->type == EXPR_CALL){
				expr c = stmt->u.for1.ex;
				if (c->u.call.cmd->type == EXPR_NAMES){
					expr n = c->u.call.cmd;
					stl_st sl = symtbl_lookup(sym, n->u.names);
					if (sl.type == STL_ERROR)
						return pgr_error(stmt->flp, sl.u.msg);
					nsname nsn = sl.u.nsn;
					if (nsn->type == NSN_CMD_OPCODE && nsn->u.cmdOpcode.opcode == OP_RANGE){
						expr p = c->u.call.params;
						varloc_st rp[3] = { VARLOC_NULL, VARLOC_NULL, VARLOC_NULL };
						if (p->type != EXPR_GROUP){
							sta_st ts = symtbl_addTemp(sym);
							if (ts.type == STA_ERROR)
								return pgr_error(stmt->flp, ts.u.msg);
							rp[0] = ts.u.vlc;
							per_st pe = program_eval(prg, sym, PEM_INTO, rp[0], p);
							if (pe.type == PER_ERROR)
								return pgr_error(pe.u.error.flp, pe.u.error.msg);
						}
						else{
							for (int i = 0; i < p->u.group->size; i++){
								if (i < 3){
									sta_st ts = symtbl_addTemp(sym);
									if (ts.type == STA_ERROR)
										return pgr_error(stmt->flp, ts.u.msg);
									rp[i] = ts.u.vlc;
								}
								per_st pe = program_eval(prg, sym,
									i < 3 ? PEM_INTO : PEM_EMPTY,
									i < 3 ? rp[i] : VARLOC_NULL,
									p->u.group->ptrs[i]);
								if (pe.type == PER_ERROR)
									return pgr_error(pe.u.error.flp, pe.u.error.msg);
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
			if (!varloc_isnull(pst->val_vlc))
				symtbl_clearTemp(sym, pst->val_vlc);
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

			label_jumpfalse(pst->nextcond, prg->ops, pr.u.vlc);
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
				nsn->u.cmdLocal.fr->level == sym->fr->level + 1){
				int argcount;
				per_st pe;
				varloc_st p[256];
				if (!program_evalCallArgcount(prg, sym, params, &argcount, &pe, p))
					return pgr_error(pe.u.error.flp, pe.u.error.msg);
				label_returntail(nsn->u.cmdLocal.lbl, prg->ops, argcount);
				for (int i = 0; i < argcount; i++){
					op_arg(prg->ops, p[i]);
					symtbl_clearTemp(sym, p[i]);
				}
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
				lvp_st lr = lval_addVars(sym, ex->u.infix.left, -1);
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
				op_parama(prg->ops, OP_SAY, ts.u.vlc, 1);
				op_arg(prg->ops, pr.u.vlc);
				symtbl_clearTemp(sym, pr.u.vlc);
				symtbl_clearTemp(sym, ts.u.vlc);
			}
			else{
				per_st pr = program_eval(prg, sym, PEM_EMPTY, VARLOC_NULL, stmt->u.eval.ex);
				if (pr.type == PER_ERROR)
					return pgr_error(pr.u.error.flp, pr.u.error.msg);
			}
			return pgr_ok();
		} break;

		case AST_LABEL: {
			label lbl = NULL;
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

static int bmp_reserve(void **tbl, int *size, uint64_t **aloc, uint64_t **ref, size_t st_size){
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
	*size = new_count;
	(*aloc)[new_count / 128] |= 1;
	return new_count / 2;
}

//
// context
//

typedef struct {
	int pc;
	int frame;
	int index;
	int lex_index;
} ccs_st, *ccs;

static inline void ccs_free(ccs c){
	mem_free(c);
}

static inline ccs ccs_new(int pc, int frame, int index, int lex_index){
	ccs c = mem_alloc(sizeof(ccs_st));
	c->pc = pc;
	c->frame = frame;
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

static inline lxs lxs_new(int argcount, sink_val *args, lxs next){
	if (argcount > 256)
		argcount = 256;
	lxs ls = mem_alloc(sizeof(lxs_st));
	if (argcount > 0)
		memcpy(ls->vals, args, sizeof(sink_val) * argcount);
	for (int i = argcount; i < 256; i++)
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
	list_ptr ccs_avail;
	list_ptr lxs_avail;

	sink_io_st io;

	sink_str_st *str_tbl;
	sink_list_st *list_tbl;

	uint64_t *str_aloc;
	uint64_t *list_aloc;

	uint64_t *str_ref;
	uint64_t *list_ref;

	sink_list_st pinned;

	int lex_index;
	int pc;
	int lastpc;
	int str_size;
	int list_size;
	int str_prealloc_size;
	int str_prealloc_memset;
	uint64_t str_prealloc_lastmask;
	int timeout;
	int timeout_left;
	int async_frame;
	int async_index;
	int gc_left;
	sink_gc_level gc_level;

	uint32_t rand_seed;
	uint32_t rand_i;

	char *err;
	bool passed;
	bool failed;
	bool async;
} context_st, *context;

static inline lxs lxs_get(context ctx, int argcount, sink_val *args, lxs next){
	if (ctx->lxs_avail->size > 0){
		lxs ls = ctx->lxs_avail->ptrs[--ctx->lxs_avail->size];
		if (argcount > 0)
			memcpy(ls->vals, args, sizeof(sink_val) * argcount);
		for (int i = argcount; i < 256; i++)
			ls->vals[i] = SINK_NIL;
		ls->next = next;
		return ls;
	}
	return lxs_new(argcount, args, next);
}

static inline void lxs_release(context ctx, lxs ls){
	list_ptr_push(ctx->lxs_avail, ls);
}

static inline ccs ccs_get(context ctx, int pc, int frame, int index, int lex_index){
	if (ctx->ccs_avail->size > 0){
		ccs c = ctx->ccs_avail->ptrs[--ctx->ccs_avail->size];
		c->pc = pc;
		c->frame = frame;
		c->index = index;
		c->lex_index = lex_index;
		return c;
	}
	return ccs_new(pc, frame, index, lex_index);
}

static inline void ccs_release(context ctx, ccs c){
	list_ptr_push(ctx->ccs_avail, c);
}

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

static inline void context_sweephelp(context ctx, int size, uint64_t *aloc, uint64_t *ref,
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

static inline int var_index(sink_val v){
	return (int)(v.u & UINT64_C(0x000000007FFFFFFF));
}

static void context_markvals(context ctx, int size, sink_val *vals){
	for (int i = 0; i < size; i++){
		if (sink_isstr(vals[i])){
			int idx = var_index(vals[i]);
			bmp_setbit(ctx->str_ref, idx);
		}
		else if (sink_islist(vals[i])){
			int idx = var_index(vals[i]);
			if (!bmp_hasbit(ctx->list_ref, idx)){
				bmp_setbit(ctx->list_ref, idx);
				sink_list ls = &ctx->list_tbl[idx];
				context_markvals(ctx, ls->size, ls->vals);
			}
		}
	}
}

static inline void context_clearref(context ctx){
	memset(ctx->str_ref, 0, sizeof(uint64_t) * (ctx->str_size / 64));
	memset(ctx->list_ref, 0, sizeof(uint64_t) * (ctx->list_size / 64));
}

static inline void context_mark(context ctx){
	// mark the string table
	if (ctx->str_prealloc_memset > 0)
		memset(ctx->str_ref, 0xFF, sizeof(uint64_t) * ctx->str_prealloc_memset);
	ctx->str_ref[ctx->str_prealloc_memset] = ctx->str_prealloc_lastmask;
	context_markvals(ctx, ctx->pinned.size, ctx->pinned.vals);
	for (int i = 0; i < ctx->lex_stk->size; i++){
		lxs here = ctx->lex_stk->ptrs[i];
		while (here){
			context_markvals(ctx, 256, here->vals);
			here = here->next;
		}
	}
}

static inline void context_gcleft(context ctx, bool set){
	if (set){
		if (ctx->gc_level == SINK_GC_DEFAULT)
			ctx->gc_left = 10000;
		else if (ctx->gc_level == SINK_GC_LOWMEM)
			ctx->gc_left = 1000;
	}
	else{
		if (ctx->gc_level == SINK_GC_DEFAULT){
			if (ctx->gc_left > 10000)
				ctx->gc_left = 10000;
		}
		else if (ctx->gc_level == SINK_GC_LOWMEM){
			if (ctx->gc_left > 1000)
				ctx->gc_left = 1000;
		}
	}
}

static inline void context_gc(context ctx){
	context_clearref(ctx);
	context_mark(ctx);
	context_sweep(ctx);
	context_gcleft(ctx, true);
	ctx->timeout_left -= 100; // GC counts as 100 "ticks" I suppose
}

static const int sink_pin_grow = 50;
static inline void context_gcpin(context ctx, sink_val v){
	if (!sink_isstr(v) && !sink_islist(v))
		return;
	if (ctx->pinned.size >= ctx->pinned.count){
		ctx->pinned.count += sink_pin_grow;
		ctx->pinned.vals = mem_realloc(ctx->pinned.vals, sizeof(sink_val) * ctx->pinned.count);
	}
	ctx->pinned.vals[ctx->pinned.size++] = v;
}

static inline void context_gcunpin(context ctx, sink_val v){
	if (!sink_isstr(v) && !sink_islist(v))
		return;
	// only remove the value once, even if it appears multiple times, so that the user can use
	// pin/unpin as a stack-like operation
	for (int i = 0; i < ctx->pinned.size; i++){
		if (ctx->pinned.vals[i].u == v.u){
			if (i < ctx->pinned.size - 1){
				memmove(&ctx->pinned.vals[i], &ctx->pinned.vals[i + 1],
					sizeof(sink_val) * (ctx->pinned.size - 1 - i));
			}
			ctx->pinned.size--;
			return;
		}
	}
}

static inline void context_free(context ctx){
	cleanup_free(ctx->cup);
	if (ctx->user && ctx->f_freeuser)
		ctx->f_freeuser(ctx->user);
	list_ptr_free(ctx->natives);
	context_clearref(ctx);
	context_sweep(ctx);
	list_ptr_free(ctx->ccs_avail);
	list_ptr_free(ctx->lxs_avail);
	list_ptr_free(ctx->call_stk);
	list_ptr_free(ctx->lex_stk);
	list_ptr_free(ctx->f_finalize);
	list_ptr_free(ctx->user_hint);
	if (ctx->err)
		mem_free(ctx->err);
	mem_free(ctx->list_tbl);
	mem_free(ctx->str_tbl);
	mem_free(ctx->list_aloc);
	mem_free(ctx->str_aloc);
	mem_free(ctx->list_ref);
	mem_free(ctx->str_ref);
	mem_free(ctx->pinned.vals);
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
	list_ptr_push(ctx->lex_stk, lxs_new(0, NULL, NULL));
	ctx->ccs_avail = list_ptr_new((free_func)ccs_free);
	ctx->lxs_avail = list_ptr_new((free_func)lxs_free);
	ctx->prg = prg;
	ctx->f_finalize = list_ptr_new(NULL);
	ctx->user_hint = list_ptr_new(NULL);

	ctx->io = io;

	if (prg->repl){
		ctx->str_prealloc_size = 0;
		ctx->str_size = 64;
	}
	else{
		ctx->str_prealloc_size = ctx->prg->strTable->size;
		ctx->str_size = ctx->str_prealloc_size + 64;
		ctx->str_size += 64 - (ctx->str_size % 64); // round up to number divisible by 64
	}
	ctx->list_size = 64;

	ctx->str_tbl = mem_alloc(sizeof(sink_str_st) * ctx->str_size);
	ctx->list_tbl = mem_alloc(sizeof(sink_list_st) * ctx->list_size);

	ctx->str_aloc = mem_alloc(sizeof(uint64_t) * (ctx->str_size / 64));
	memset(ctx->str_aloc, 0, sizeof(uint64_t) * (ctx->str_size / 64));
	ctx->list_aloc = mem_alloc(sizeof(uint64_t) * (ctx->list_size / 64));
	memset(ctx->list_aloc, 0, sizeof(uint64_t) * (ctx->list_size / 64));

	ctx->str_ref = mem_alloc(sizeof(uint64_t) * (ctx->str_size / 64));
	ctx->list_ref = mem_alloc(sizeof(uint64_t) * (ctx->list_size / 64));

	ctx->pinned.size = 0;
	ctx->pinned.count = 50;
	ctx->pinned.vals = mem_alloc(sizeof(sink_val) * ctx->pinned.count);

	ctx->lex_index = 0;
	ctx->pc = 0;
	ctx->timeout = 0;
	ctx->timeout_left = 0;
	ctx->gc_level = SINK_GC_DEFAULT;
	ctx->rand_seed = 0;
	ctx->rand_i = 0;

	ctx->err = NULL;
	ctx->passed = false;
	ctx->failed = false;
	ctx->async = false;

	if (prg->repl){
		ctx->str_prealloc_memset = 0;
		ctx->str_prealloc_lastmask = 0;
	}
	else{
		// reserve locations for the string table, such that string table index == var_index
		for (int i = 0; i < ctx->prg->strTable->size; i++){
			list_byte s = ctx->prg->strTable->ptrs[i];
			sink_str_newblob(ctx, s->size, s->bytes);
		}

		// precalculate the values needed to mark the prealloc'ed string table quickly
		ctx->str_prealloc_memset = ctx->str_prealloc_size / 64;
		int str_left = ctx->str_prealloc_size % 64;
		ctx->str_prealloc_lastmask = 0;
		while (str_left > 0){
			ctx->str_prealloc_lastmask = (ctx->str_prealloc_lastmask << 1) | 1;
			str_left--;
		}
	}

	context_gcleft(ctx, true);
	opi_rand_seedauto(ctx);
	return ctx;
}

static inline void context_reset(context ctx){
	// return to the top level
	while (ctx->call_stk->size > 0){
		ccs s = list_ptr_pop(ctx->call_stk);
		lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
		ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
		lxs_release(ctx, lx);
		ctx->lex_index = s->lex_index;
		ctx->pc = s->pc;
		ccs_release(ctx, s);
	}
	// reset variables and fast-forward to the end of the current program
	ctx->passed = false;
	ctx->failed = false;
	ctx->pc = ctx->prg->ops->size;
	ctx->timeout_left = ctx->timeout;
}

static inline sink_val var_get(context ctx, int frame, int index){
	return ((lxs)ctx->lex_stk->ptrs[frame])->vals[index];
}

static inline void var_set(context ctx, int frame, int index, sink_val val){
	((lxs)ctx->lex_stk->ptrs[frame])->vals[index] = val;
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

static const int LT_ALLOWNIL  = 1;
static const int LT_ALLOWNUM  = 2;
static const int LT_ALLOWSTR  = 4;
static const int LT_ALLOWLIST = 8;

static inline bool oper_typemask(sink_val a, int mask){
	switch (sink_typeof(a)){
		case SINK_TYPE_NIL   : return (mask & LT_ALLOWNIL ) != 0;
		case SINK_TYPE_NUM   : return (mask & LT_ALLOWNUM ) != 0;
		case SINK_TYPE_STR   : return (mask & LT_ALLOWSTR ) != 0;
		case SINK_TYPE_LIST  : return (mask & LT_ALLOWLIST) != 0;
		case SINK_TYPE_ASYNC : return false;
	}
}

static inline bool oper_typelist(context ctx, sink_val a, int mask){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		for (int i = 0; i < ls->size; i++){
			if (!oper_typemask(ls->vals[i], mask))
				return false;
		}
		return true;
	}
	return oper_typemask(a, mask);
}

typedef sink_val (*unary_func)(context ctx, sink_val v);

static sink_val oper_un(context ctx, sink_val a, unary_func f_unary){
	if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		if (ls->size <= 0)
			return sink_list_newblob(ctx, 0, NULL);
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
		if (m <= 0)
			return sink_list_newblob(ctx, 0, NULL);
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
		if (m <= 0)
			return sink_list_newblob(ctx, 0, NULL);
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

static sink_val opihelp_num_max(context ctx, int size, sink_val *vals, list_int li){
	sink_val max = SINK_NIL;
	for (int i = 0; i < size; i++){
		if (sink_isnum(vals[i])){
			if (sink_isnil(max) || vals[i].f > max.f)
				max = vals[i];
		}
		else if (sink_islist(vals[i])){
			int idx = var_index(vals[i]);
			if (list_int_has(li, idx))
				return SINK_NIL;
			list_int_push(li, idx);

			sink_list ls = var_castlist(ctx, vals[i]);
			sink_val lm = opihelp_num_max(ctx, ls->size, ls->vals, li);
			if (!sink_isnil(lm) && (sink_isnil(max) || lm.f > max.f))
				max = lm;

			list_int_pop(li);
		}
	}
	return max;
}

static inline sink_val opi_num_max(context ctx, int size, sink_val *vals){
	list_int li = list_int_new();
	sink_val res = opihelp_num_max(ctx, size, vals, li);
	list_int_free(li);
	return res;
}

static sink_val opihelp_num_min(context ctx, int size, sink_val *vals, list_int li){
	sink_val min = SINK_NIL;
	for (int i = 0; i < size; i++){
		if (sink_isnum(vals[i])){
			if (sink_isnil(min) || vals[i].f < min.f)
				min = vals[i];
		}
		else if (sink_islist(vals[i])){
			int idx = var_index(vals[i]);
			if (list_int_has(li, idx))
				return SINK_NIL;
			list_int_push(li, idx);

			sink_list ls = var_castlist(ctx, vals[i]);
			sink_val lm = opihelp_num_min(ctx, ls->size, ls->vals, li);
			if (!sink_isnil(lm) && (sink_isnil(min) || lm.f < min.f))
				min = lm;

			list_int_pop(li);
		}
	}
	return min;
}

static inline sink_val opi_num_min(context ctx, int size, sink_val *vals){
	list_int li = list_int_new();
	sink_val res = opihelp_num_min(ctx, size, vals, li);
	list_int_free(li);
	return res;
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

static inline sink_val opi_str_new(context ctx, int size, sink_val *vals){
	return sink_list_joinplain(ctx, size, vals, 1, (const uint8_t *)" ");
}

static inline sink_val opi_list_push(context ctx, sink_val a, sink_val b);
static inline sink_val opi_str_split(context ctx, sink_val a, sink_val b){
	a = sink_tostr(ctx, a);
	b = sink_tostr(ctx, b);
	sink_str haystack = var_caststr(ctx, a);
	sink_str needle = var_caststr(ctx, b);
	sink_val result = sink_list_newblob(ctx, 0, NULL);

	int nlen = needle->size;
	int hlen = haystack->size;
	if (nlen <= 0){
		// split on every character
		for (int i = 0; i < hlen; i++)
			opi_list_push(ctx, result, sink_str_newblob(ctx, 1, &haystack->bytes[i]));
		return result;
	}

	int delta[256];
	for (int i = 0; i < 256; i++)
		delta[i] = nlen + 1;
	for (int i = 0; i < nlen; i++)
		delta[needle->bytes[i]] = nlen - i;
	int hx = 0;
	int lastmatch = 0;
	while (hx + nlen <= hlen){
		if (memcmp(needle->bytes, &haystack->bytes[hx], sizeof(uint8_t) * nlen) == 0){
			opi_list_push(ctx, result,
				sink_str_newblob(ctx, hx - lastmatch, &haystack->bytes[lastmatch]));
			lastmatch = hx + needle->size;
			hx += needle->size;
		}
		else{
			// note: in all these search string functions we use the same basic algorithm, and we
			// are allowed to access hx+nlen because all sink strings are guaranteed to be NULL
			// terminated
			hx += delta[haystack->bytes[hx + nlen]];
		}
	}
	opi_list_push(ctx, result,
		sink_str_newblob(ctx, haystack->size - lastmatch, &haystack->bytes[lastmatch]));
	return result;
}

static inline sink_val opi_list_join(context ctx, sink_val a, sink_val b);
static inline sink_val opi_str_replace(context ctx, sink_val a, sink_val b, sink_val c){
	sink_val ls = opi_str_split(ctx, a, b);
	return opi_list_join(ctx, ls, c);
}

static inline sink_val opi_str_find(context ctx, sink_val a, sink_val b, int hx){
	a = sink_tostr(ctx, a);
	b = sink_tostr(ctx, b);
	sink_str haystack = var_caststr(ctx, a);
	sink_str needle = var_caststr(ctx, b);

	int nlen = needle->size;
	if (nlen <= 0)
		return sink_num(0);

	int hlen = haystack->size;
	int delta[256];
	for (int i = 0; i < 256; i++)
		delta[i] = nlen + 1;
	for (int i = 0; i < nlen; i++)
		delta[needle->bytes[i]] = nlen - i;
	if (hx < 0)
		hx += hlen;
	if (hx < 0)
		hx = 0;
	while (hx + nlen <= hlen){
		if (memcmp(needle->bytes, &haystack->bytes[hx], sizeof(uint8_t) * nlen) == 0)
			return sink_num(hx);
		hx += delta[haystack->bytes[hx + nlen]];
	}
	return SINK_NIL;
}

static inline sink_val opi_str_rfind(context ctx, sink_val a, sink_val b, sink_val c){
	a = sink_tostr(ctx, a);
	b = sink_tostr(ctx, b);
	sink_str haystack = var_caststr(ctx, a);
	sink_str needle = var_caststr(ctx, b);

	int nlen = needle->size;
	int hlen = haystack->size;
	if (nlen <= 0)
		return sink_num(hlen);

	int delta[256];
	for (int i = 0; i < 256; i++)
		delta[i] = nlen + 1;
	for (int i = nlen - 1; i >= 0; i--)
		delta[needle->bytes[i]] = i + 1;
	int hx;
	if (sink_isnil(c))
		hx = hlen - nlen;
	else
		hx = c.f;
	if (hx < 0)
		hx += hlen;
	if (hx > hlen - nlen)
		hx = hlen - nlen;
	while (hx >= 0){
		if (memcmp(needle->bytes, &haystack->bytes[hx], sizeof(uint8_t) * nlen) == 0)
			return sink_num(hx);
		if (hx <= 0){
			// searching backwards we can't access bytes[-1] because we aren't "reverse" NULL
			// terminated... we would just crash
			return SINK_NIL;
		}
		hx -= delta[haystack->bytes[hx - 1]];
	}
	return SINK_NIL;
}

static inline sink_val opi_str_begins(context ctx, sink_val a, sink_val b){
	sink_str s1 = var_caststr(ctx, sink_tostr(ctx, a));
	sink_str s2 = var_caststr(ctx, sink_tostr(ctx, b));
	return sink_bool(s1->size >= s2->size &&
		memcmp(s1->bytes, s2->bytes, sizeof(uint8_t) * s2->size) == 0);
}

static inline sink_val opi_str_ends(context ctx, sink_val a, sink_val b){
	sink_str s1 = var_caststr(ctx, sink_tostr(ctx, a));
	sink_str s2 = var_caststr(ctx, sink_tostr(ctx, b));
	return sink_bool(s1->size >= s2->size &&
		memcmp(&s1->bytes[s1->size - s2->size], s2->bytes, sizeof(uint8_t) * s2->size) == 0);
}

static inline sink_val opi_str_pad(context ctx, sink_val a, int b){
	a = sink_tostr(ctx, a);
	sink_str s = var_caststr(ctx, a);
	if (b < 0){ // left pad
		b = -b;
		if (s->size >= b)
			return a;
		uint8_t *ns = mem_alloc(sizeof(uint8_t) * (b + 1));
		memset(ns, 32, sizeof(uint8_t) * (b - s->size));
		if (s->size > 0)
			memcpy(&ns[b - s->size], s->bytes, sizeof(uint8_t) * s->size);
		ns[b] = 0;
		return sink_str_newblobgive(ctx, b, ns);
	}
	else{ // right pad
		if (s->size >= b)
			return a;
		uint8_t *ns = mem_alloc(sizeof(uint8_t) * (b + 1));
		if (s->size > 0)
			memcpy(ns, s->bytes, sizeof(uint8_t) * s->size);
		memset(&ns[s->size], 32, sizeof(uint8_t) * (b - s->size));
		ns[b] = 0;
		return sink_str_newblobgive(ctx, b, ns);
	}
}

static inline sink_val opi_str_lower(context ctx, sink_val a){
	sink_str s = var_caststr(ctx, sink_tostr(ctx, a));
	uint8_t *b = mem_alloc(sizeof(uint8_t) * (s->size + 1));
	for (int i = 0; i <= s->size; i++){
		int ch = s->bytes[i];
		if (ch >= 'A' && ch <= 'Z')
			ch = ch - 'A' + 'a';
		b[i] = ch;
	}
	return sink_str_newblobgive(ctx, s->size, b);
}

static inline sink_val opi_str_upper(context ctx, sink_val a){
	sink_str s = var_caststr(ctx, sink_tostr(ctx, a));
	uint8_t *b = mem_alloc(sizeof(uint8_t) * (s->size + 1));
	for (int i = 0; i <= s->size; i++){
		int ch = s->bytes[i];
		if (ch >= 'a' && ch <= 'z')
			ch = ch - 'a' + 'A';
		b[i] = ch;
	}
	return sink_str_newblobgive(ctx, s->size, b);
}

static inline bool shouldtrim(uint8_t c){
	return (c >= 9 && c <= 13) || c == 32;
}

static inline sink_val opi_str_trim(context ctx, sink_val a){
	a = sink_tostr(ctx, a);
	sink_str s = var_caststr(ctx, a);
	int len1 = 0;
	int len2 = 0;
	while (len1 < s->size && shouldtrim(s->bytes[len1]))
		len1++;
	while (len2 < s->size && shouldtrim(s->bytes[s->size - 1 - len2]))
		len2++;
	if (len1 == 0 && len2 == 0)
		return a;
	int size = s->size - len1 - len2;
	uint8_t *b = mem_alloc(sizeof(uint8_t) * (size + 1));
	if (size > 0)
		memcpy(b, &s->bytes[len1], sizeof(uint8_t) * size);
	b[size] = 0;
	return sink_str_newblobgive(ctx, size, b);
}

static inline sink_val opi_str_rev(context ctx, sink_val a){
	a = sink_tostr(ctx, a);
	sink_str s = var_caststr(ctx, a);
	if (s->size <= 0)
		return a;
	uint8_t *b = mem_alloc(sizeof(uint8_t) * (s->size + 1));
	for (int i = 0; i < s->size; i++)
		b[s->size - i - 1] = s->bytes[i];
	b[s->size] = 0;
	return sink_str_newblobgive(ctx, s->size, b);
}

static inline sink_val opi_str_rep(context ctx, sink_val a, int rep){
	if (rep <= 0)
		return sink_str_newblobgive(ctx, 0, NULL);
	a = sink_tostr(ctx, a);
	if (rep == 1)
		return a;
	sink_str s = var_caststr(ctx, a);
	if (s->size <= 0)
		return a;
	int size = s->size * rep;
	// TODO: max length?
	uint8_t *b = mem_alloc(sizeof(uint8_t) * (size + 1));
	for (int i = 0; i < rep; i++)
		memcpy(&b[i * s->size], s->bytes, sizeof(uint8_t) * s->size);
	b[size] = 0;
	return sink_str_newblobgive(ctx, size, b);
}

static inline sink_val opi_str_list(context ctx, sink_val a){
	sink_str s = var_caststr(ctx, sink_tostr(ctx, a));
	sink_val r = sink_list_newblob(ctx, 0, NULL);
	for (int i = 0; i < s->size; i++)
		opi_list_push(ctx, r, sink_num(s->bytes[i]));
	return r;
}

static inline sink_val opi_str_byte(context ctx, sink_val a, int b){
	sink_str s = var_caststr(ctx, sink_tostr(ctx, a));
	if (b < 0)
		b += s->size;
	if (b < 0 || b >= s->size)
		return SINK_NIL;
	return sink_num(s->bytes[b]);
}

static inline sink_val opi_str_hash(context ctx, sink_val a, uint32_t seed){
	sink_str s = var_caststr(ctx, sink_tostr(ctx, a));
	uint32_t out[4];
	sink_str_hashplain(s->size, s->bytes, seed, out);
	sink_val outv[4];
	outv[0] = sink_num(out[0]);
	outv[1] = sink_num(out[1]);
	outv[2] = sink_num(out[2]);
	outv[3] = sink_num(out[3]);
	return sink_list_newblob(ctx, 4, outv);
}

// 1   7  U+00000  U+00007F  0xxxxxxx
// 2  11  U+00080  U+0007FF  110xxxxx  10xxxxxx
// 3  16  U+00800  U+00FFFF  1110xxxx  10xxxxxx  10xxxxxx
// 4  21  U+10000  U+10FFFF  11110xxx  10xxxxxx  10xxxxxx  10xxxxxx

static inline bool opihelp_codepoint(sink_val b){
	return sink_isnum(b) && // must be a number
		floorf(b.f) == b.f && // must be an integer
		b.f >= 0 && b.f < 0x110000 && // must be within total range
		(b.f < 0xD800 || b.f >= 0xE000); // must not be a surrogate
}

static inline sink_val opi_utf8_valid(context ctx, sink_val a){
	if (sink_isstr(a)){
		sink_str s = var_caststr(ctx, a);
		int state = 0;
		int codepoint = 0;
		int min = 0;
		for (int i = 0; i < s->size; i++){
			uint8_t b = s->bytes[i];
			if (state == 0){
				if (b < 0x80) // 0x00 to 0x7F
					continue;
				else if (b < 0xC0) // 0x80 to 0xBF
					return sink_bool(false);
				else if (b < 0xE0){ // 0xC0 to 0xDF
					codepoint = b & 0x1F;
					min = 0x80;
					state = 1;
				}
				else if (b < 0xF0){ // 0xE0 to 0xEF
					codepoint = b & 0x0F;
					min = 0x800;
					state = 2;
				}
				else if (b < 0xF8){ // 0xF0 to 0xF7
					codepoint = b & 0x07;
					min = 0x10000;
					state = 3;
				}
				else
					return sink_bool(false);
			}
			else{
				if (b < 0x80 || b >= 0xC0)
					return sink_bool(false);
				codepoint = (codepoint << 6) | (b & 0x3F);
				state--;
				if (state == 0){ // codepoint finished, check if invalid
					if (codepoint < min || // no overlong
						codepoint >= 0x110000 || // no huge
						(codepoint >= 0xD800 && codepoint < 0xE000)) // no surrogates
						return sink_bool(false);
				}
			}
		}
		return sink_bool(state == 0);
	}
	else if (sink_islist(a)){
		sink_list ls = var_castlist(ctx, a);
		for (int i = 0; i < ls->size; i++){
			if (!opihelp_codepoint(ls->vals[i]))
				return sink_bool(false);
		}
		return sink_bool(true);
	}
	return sink_bool(false);
}

static inline sink_val opi_utf8_list(context ctx, sink_val a){
	sink_str s = var_caststr(ctx, a);
	sink_val res = sink_list_newblob(ctx, 0, NULL);
	int state = 0;
	int codepoint = 0;
	int min = 0;
	for (int i = 0; i < s->size; i++){
		uint8_t b = s->bytes[i];
		if (state == 0){
			if (b < 0x80) // 0x00 to 0x7F
				opi_list_push(ctx, res, sink_num(b));
			else if (b < 0xC0) // 0x80 to 0xBF
				return SINK_NIL;
			else if (b < 0xE0){ // 0xC0 to 0xDF
				codepoint = b & 0x1F;
				min = 0x80;
				state = 1;
			}
			else if (b < 0xF0){ // 0xE0 to 0xEF
				codepoint = b & 0x0F;
				min = 0x800;
				state = 2;
			}
			else if (b < 0xF8){ // 0xF0 to 0xF7
				codepoint = b & 0x07;
				min = 0x10000;
				state = 3;
			}
			else
				return SINK_NIL;
		}
		else{
			if (b < 0x80 || b >= 0xC0)
				return SINK_NIL;
			codepoint = (codepoint << 6) | (b & 0x3F);
			state--;
			if (state == 0){ // codepoint finished, check if invalid
				if (codepoint < min || // no overlong
					codepoint >= 0x110000 || // no huge
					(codepoint >= 0xD800 && codepoint < 0xE000)) // no surrogates
					return SINK_NIL;
				opi_list_push(ctx, res, sink_num(codepoint));
			}
		}
	}
	return res;
}

static inline sink_val opi_utf8_str(context ctx, sink_val a){
	sink_list ls = var_castlist(ctx, a);
	int tot = 0;
	for (int i = 0; i < ls->size; i++){
		sink_val b = ls->vals[i];
		if (!opihelp_codepoint(b))
			return SINK_NIL;
		if (b.f < 0x80)
			tot++;
		else if (b.f < 0x800)
			tot += 2;
		else if (b.f < 0x10000)
			tot += 3;
		else
			tot += 4;
	}
	uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
	int pos = 0;
	for (int i = 0; i < ls->size; i++){
		int b = ls->vals[i].f;
		if (b < 0x80)
			bytes[pos++] = b;
		else if (b < 0x800){
			bytes[pos++] = 0xC0 | (b >> 6);
			bytes[pos++] = 0x80 | (b & 0x3F);
		}
		else if (b < 0x10000){
			bytes[pos++] = 0xE0 | (b >> 12);
			bytes[pos++] = 0x80 | ((b >> 6) & 0x3F);
			bytes[pos++] = 0x80 | (b & 0x3F);
		}
		else{
			bytes[pos++] = 0xF0 | (b >> 18);
			bytes[pos++] = 0x80 | ((b >> 12) & 0x3F);
			bytes[pos++] = 0x80 | ((b >> 6) & 0x3F);
			bytes[pos++] = 0x80 | (b & 0x3F);
		}
	}
	bytes[tot] = 0;
	return sink_str_newblobgive(ctx, tot, bytes);
}

static inline sink_val opi_struct_size(context ctx, sink_val a){
	if (!sink_islist(a))
		return SINK_NIL;
	sink_list ls = var_castlist(ctx, a);
	int tot = 0;
	for (int i = 0; i < ls->size; i++){
		sink_val b = ls->vals[i];
		if (!sink_isstr(b))
			return SINK_NIL;
		sink_str t = var_caststr(ctx, b);
		if (t->size == 2){
			if      (strcmp((const char *)t->bytes, "U8"  ) == 0) tot += 1;
			else if (strcmp((const char *)t->bytes, "S8"  ) == 0) tot += 1;
			else
				return SINK_NIL;
		}
		else if (t->size == 3){
			if      (strcmp((const char *)t->bytes, "U16" ) == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "U32" ) == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "S16" ) == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "S32" ) == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "F32" ) == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "F64" ) == 0) tot += 8;
			else
				return SINK_NIL;
		}
		else if (t->size == 4){
			if      (strcmp((const char *)t->bytes, "UL16") == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "UB16") == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "UL32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "UB32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "SL16") == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "SB16") == 0) tot += 2;
			else if (strcmp((const char *)t->bytes, "SL32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "SB32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "FL32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "FB32") == 0) tot += 4;
			else if (strcmp((const char *)t->bytes, "FL64") == 0) tot += 8;
			else if (strcmp((const char *)t->bytes, "FB64") == 0) tot += 8;
			else
				return SINK_NIL;
		}
		else
			return SINK_NIL;
	}
	return tot <= 0 ? SINK_NIL : sink_num(tot);
}

static inline sink_val opi_struct_str(context ctx, sink_val a, sink_val b){
	sink_list data = var_castlist(ctx, a);
	sink_list type = var_castlist(ctx, b);
	if (type->size <= 0)
		return SINK_NIL;
	if (data->size % type->size != 0)
		return SINK_NIL;
	for (int i = 0; i < data->size; i++){
		if (!sink_isnum(data->vals[i]))
			return SINK_NIL;
	}
	sink_val sizev = opi_struct_size(ctx, b);
	if (sink_isnil(sizev))
		return SINK_NIL;
	int arsize = data->size / type->size;
	int size = sizev.f * arsize;
	uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (size + 1));
	int pos = 0;
	for (int ar = 0; ar < arsize; ar++){
		for (int i = 0; i < type->size; i++){
			sink_val d = data->vals[i + ar * type->size];
			sink_str t = var_caststr(ctx, type->vals[i]);
			if (t->size == 2){
				// U8 or S8
				uint8_t v = d.f;
				bytes[pos++] = v;
			}
			else if (t->size == 3){
				if (strcmp((const char *)t->bytes, "U16") == 0 ||
					strcmp((const char *)t->bytes, "S16") == 0){
					uint16_t v = d.f;
					uint8_t *vp = (uint8_t *)&v;
					bytes[pos++] = vp[0]; bytes[pos++] = vp[1];
				}
				else if (strcmp((const char *)t->bytes, "U32") == 0 ||
					strcmp((const char *)t->bytes, "S32") == 0){
					uint32_t v = d.f;
					uint8_t *vp = (uint8_t *)&v;
					bytes[pos++] = vp[0]; bytes[pos++] = vp[1];
					bytes[pos++] = vp[2]; bytes[pos++] = vp[3];
				}
				else if (strcmp((const char *)t->bytes, "F32") == 0){
					float v = d.f;
					uint8_t *vp = (uint8_t *)&v;
					bytes[pos++] = vp[0]; bytes[pos++] = vp[1];
					bytes[pos++] = vp[2]; bytes[pos++] = vp[3];
				}
				else{ // F64
					double v = d.f;
					uint8_t *vp = (uint8_t *)&v;
					bytes[pos++] = vp[0]; bytes[pos++] = vp[1];
					bytes[pos++] = vp[2]; bytes[pos++] = vp[3];
					bytes[pos++] = vp[4]; bytes[pos++] = vp[5];
					bytes[pos++] = vp[6]; bytes[pos++] = vp[7];
				}
			}
			else{ // t->size == 4
				if (strcmp((const char *)t->bytes, "UL16") == 0 ||
					strcmp((const char *)t->bytes, "SL16") == 0){
					uint16_t v = d.f;
					bytes[pos++] = (v      ) & 0xFF; bytes[pos++] = (v >>  8) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "UB16") == 0 ||
					strcmp((const char *)t->bytes, "SB16") == 0){
					uint16_t v = d.f;
					bytes[pos++] = (v >>  8) & 0xFF; bytes[pos++] = (v      ) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "UL32") == 0 ||
					strcmp((const char *)t->bytes, "SL32") == 0){
					uint32_t v = d.f;
					bytes[pos++] = (v      ) & 0xFF; bytes[pos++] = (v >>  8) & 0xFF;
					bytes[pos++] = (v >> 16) & 0xFF; bytes[pos++] = (v >> 24) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "UB32") == 0 ||
					strcmp((const char *)t->bytes, "SB32") == 0){
					uint32_t v = d.f;
					bytes[pos++] = (v >> 24) & 0xFF; bytes[pos++] = (v >> 16) & 0xFF;
					bytes[pos++] = (v >>  8) & 0xFF; bytes[pos++] = (v      ) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "FL32") == 0){
					union { float f; uint32_t u; } v = { .f = d.f };
					bytes[pos++] = (v.u      ) & 0xFF; bytes[pos++] = (v.u >>  8) & 0xFF;
					bytes[pos++] = (v.u >> 16) & 0xFF; bytes[pos++] = (v.u >> 24) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "FB32") == 0){
					union { float f; uint32_t u; } v = { .f = d.f };
					bytes[pos++] = (v.u >> 24) & 0xFF; bytes[pos++] = (v.u >> 16) & 0xFF;
					bytes[pos++] = (v.u >>  8) & 0xFF; bytes[pos++] = (v.u      ) & 0xFF;
				}
				else if (strcmp((const char *)t->bytes, "FL64") == 0){
					union { double f; uint64_t u; } v = { .f = d.f };
					bytes[pos++] = (v.u      ) & 0xFF; bytes[pos++] = (v.u >>  8) & 0xFF;
					bytes[pos++] = (v.u >> 16) & 0xFF; bytes[pos++] = (v.u >> 24) & 0xFF;
					bytes[pos++] = (v.u >> 32) & 0xFF; bytes[pos++] = (v.u >> 40) & 0xFF;
					bytes[pos++] = (v.u >> 48) & 0xFF; bytes[pos++] = (v.u >> 56) & 0xFF;
				}
				else{ // FB64
					union { double f; uint64_t u; } v = { .f = d.f };
					bytes[pos++] = (v.u >> 56) & 0xFF; bytes[pos++] = (v.u >> 48) & 0xFF;
					bytes[pos++] = (v.u >> 40) & 0xFF; bytes[pos++] = (v.u >> 32) & 0xFF;
					bytes[pos++] = (v.u >> 24) & 0xFF; bytes[pos++] = (v.u >> 16) & 0xFF;
					bytes[pos++] = (v.u >>  8) & 0xFF; bytes[pos++] = (v.u      ) & 0xFF;
				}
			}
		}
	}
	bytes[size] = 0;
	return sink_str_newblobgive(ctx, size, bytes);
}

static inline sink_val opi_struct_list(context ctx, sink_val a, sink_val b){
	sink_str s = var_caststr(ctx, a);
	sink_val stsizev = opi_struct_size(ctx, b);
	if (sink_isnil(stsizev))
		return SINK_NIL;
	int stsize = stsizev.f;
	if (s->size % stsize != 0)
		return SINK_NIL;
	sink_list type = var_castlist(ctx, b);
	sink_val res = sink_list_newblob(ctx, 0, NULL);
	int pos = 0;
	while (pos < s->size){
		for (int i = 0; i < type->size; i++){
			sink_str t = var_caststr(ctx, type->vals[i]);
			if (t->size == 2){
				if (strcmp((const char *)t->bytes, "U8") == 0)
					sink_list_push(ctx, res, sink_num(s->bytes[pos++]));
				else // S8
					sink_list_push(ctx, res, sink_num((int8_t)s->bytes[pos++]));
			}
			else if (t->size == 3){
				if (strcmp((const char *)t->bytes, "U16") == 0){
					uint16_t *v = (uint16_t *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 2;
				}
				else if (strcmp((const char *)t->bytes, "U32") == 0){
					uint32_t *v = (uint32_t *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 4;
				}
				else if (strcmp((const char *)t->bytes, "S16") == 0){
					int16_t *v = (int16_t *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 2;
				}
				else if (strcmp((const char *)t->bytes, "S32") == 0){
					int32_t *v = (int32_t *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 4;
				}
				else if (strcmp((const char *)t->bytes, "F32") == 0){
					float *v = (float *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 4;
				}
				else{ // F64
					double *v = (double *)&s->bytes[pos];
					sink_list_push(ctx, res, sink_num(*v));
					pos += 8;
				}
			}
			else{ // t->size == 4
				if (strcmp((const char *)t->bytes, "UL16") == 0){
					uint16_t v = 0;
					v |= s->bytes[pos++];
					v |= ((uint16_t)s->bytes[pos++]) << 8;
					sink_list_push(ctx, res, sink_num(v));
				}
				else if (strcmp((const char *)t->bytes, "UB16") == 0){
					uint16_t v = 0;
					v |= ((uint16_t)s->bytes[pos++]) << 8;
					v |= s->bytes[pos++];
					sink_list_push(ctx, res, sink_num(v));
				}
				else if (strcmp((const char *)t->bytes, "UL32") == 0){
					uint32_t v = 0;
					v |= s->bytes[pos++];
					v |= ((uint32_t)s->bytes[pos++]) <<  8;
					v |= ((uint32_t)s->bytes[pos++]) << 16;
					v |= ((uint32_t)s->bytes[pos++]) << 24;
					sink_list_push(ctx, res, sink_num(v));
				}
				else if (strcmp((const char *)t->bytes, "UB32") == 0){
					uint32_t v = 0;
					v |= ((uint32_t)s->bytes[pos++]) << 24;
					v |= ((uint32_t)s->bytes[pos++]) << 16;
					v |= ((uint32_t)s->bytes[pos++]) <<  8;
					v |= s->bytes[pos++];
					sink_list_push(ctx, res, sink_num(v));
				}
				else if (strcmp((const char *)t->bytes, "SL16") == 0){
					uint16_t v = 0;
					v |= s->bytes[pos++];
					v |= ((uint16_t)s->bytes[pos++]) << 8;
					sink_list_push(ctx, res, sink_num((int16_t)v));
				}
				else if (strcmp((const char *)t->bytes, "SB16") == 0){
					uint16_t v = 0;
					v |= ((uint16_t)s->bytes[pos++]) << 8;
					v |= s->bytes[pos++];
					sink_list_push(ctx, res, sink_num((int16_t)v));
				}
				else if (strcmp((const char *)t->bytes, "SL32") == 0){
					uint32_t v = 0;
					v |= s->bytes[pos++];
					v |= ((uint32_t)s->bytes[pos++]) <<  8;
					v |= ((uint32_t)s->bytes[pos++]) << 16;
					v |= ((uint32_t)s->bytes[pos++]) << 24;
					sink_list_push(ctx, res, sink_num((int32_t)v));
				}
				else if (strcmp((const char *)t->bytes, "SB32") == 0){
					uint32_t v = 0;
					v |= ((uint32_t)s->bytes[pos++]) << 24;
					v |= ((uint32_t)s->bytes[pos++]) << 16;
					v |= ((uint32_t)s->bytes[pos++]) <<  8;
					v |= s->bytes[pos++];
					sink_list_push(ctx, res, sink_num((int32_t)v));
				}
				else if (strcmp((const char *)t->bytes, "FL32") == 0){
					union { float f; uint32_t u; } v = { .u = 0 };
					v.u |= s->bytes[pos++];
					v.u |= ((uint32_t)s->bytes[pos++]) <<  8;
					v.u |= ((uint32_t)s->bytes[pos++]) << 16;
					v.u |= ((uint32_t)s->bytes[pos++]) << 24;
					if (isnan(v.f))
						sink_list_push(ctx, res, sink_num_nan());
					else
						sink_list_push(ctx, res, sink_num(v.f));
				}
				else if (strcmp((const char *)t->bytes, "FB32") == 0){
					union { float f; uint32_t u; } v = { .u = 0 };
					v.u |= ((uint32_t)s->bytes[pos++]) << 24;
					v.u |= ((uint32_t)s->bytes[pos++]) << 16;
					v.u |= ((uint32_t)s->bytes[pos++]) <<  8;
					v.u |= s->bytes[pos++];
					if (isnan(v.f))
						sink_list_push(ctx, res, sink_num_nan());
					else
						sink_list_push(ctx, res, sink_num(v.f));
				}
				else if (strcmp((const char *)t->bytes, "FL64") == 0){
					union { double f; uint64_t u; } v = { .u = 0 };
					v.u |= s->bytes[pos++];
					v.u |= ((uint64_t)s->bytes[pos++]) <<  8;
					v.u |= ((uint64_t)s->bytes[pos++]) << 16;
					v.u |= ((uint64_t)s->bytes[pos++]) << 24;
					v.u |= ((uint64_t)s->bytes[pos++]) << 32;
					v.u |= ((uint64_t)s->bytes[pos++]) << 40;
					v.u |= ((uint64_t)s->bytes[pos++]) << 48;
					v.u |= ((uint64_t)s->bytes[pos++]) << 56;
					if (isnan(v.f))
						sink_list_push(ctx, res, sink_num_nan());
					else
						sink_list_push(ctx, res, sink_num(v.f));
				}
				else{ // FB64
					union { double f; uint64_t u; } v = { .u = 0 };
					v.u |= ((uint64_t)s->bytes[pos++]) << 56;
					v.u |= ((uint64_t)s->bytes[pos++]) << 48;
					v.u |= ((uint64_t)s->bytes[pos++]) << 40;
					v.u |= ((uint64_t)s->bytes[pos++]) << 32;
					v.u |= ((uint64_t)s->bytes[pos++]) << 24;
					v.u |= ((uint64_t)s->bytes[pos++]) << 16;
					v.u |= ((uint64_t)s->bytes[pos++]) <<  8;
					v.u |= s->bytes[pos++];
					if (isnan(v.f))
						sink_list_push(ctx, res, sink_num_nan());
					else
						sink_list_push(ctx, res, sink_num(v.f));
				}
			}
		}
	}
	return res;
}

// operators
static sink_val unop_num_neg(context ctx, sink_val a){
	return sink_num(-a.f);
}

static sink_val unop_tonum(context ctx, sink_val a){
	if (sink_isnum(a))
		return a;
	if (!sink_isstr(a))
		return SINK_NIL;
	sink_str s = var_caststr(ctx, a);

	numpart_info npi;
	numpart_new(&npi);
	enum {
		TONUM_START,
		TONUM_NEG,
		TONUM_0,
		TONUM_2,
		TONUM_BODY,
		TONUM_FRAC,
		TONUM_EXP,
		TONUM_EXP_BODY
	} state = TONUM_START;
	bool hasval = false;
	for (int i = 0; i < s->size; i++){
		char ch = (char)s->bytes[i];
		switch (state){
			case TONUM_START:
				if (isNum(ch)){
					hasval = true;
					npi.val = toHex(ch);
					if (npi.val == 0)
						state = TONUM_0;
					else
						state = TONUM_BODY;
				}
				else if (ch == '-'){
					npi.sign = -1;
					state = TONUM_NEG;
				}
				else if (ch == '.')
					state = TONUM_FRAC;
				else if (!isSpace(ch))
					return SINK_NIL;
				break;

			case TONUM_NEG:
				if (isNum(ch)){
					hasval = true;
					npi.val = toHex(ch);
					if (npi.val == 0)
						state = TONUM_0;
					else
						state = TONUM_BODY;
				}
				else if (ch == '.')
					state = TONUM_FRAC;
				else
					return SINK_NIL;
				break;

			case TONUM_0:
				if (ch == 'b'){
					npi.base = 2;
					state = TONUM_2;
				}
				else if (ch == 'c'){
					npi.base = 8;
					state = TONUM_2;
				}
				else if (ch == 'x'){
					npi.base = 16;
					state = TONUM_2;
				}
				else if (ch == '_')
					state = TONUM_BODY;
				else if (ch == '.')
					state = TONUM_FRAC;
				else if (ch == 'e' || ch == 'E')
					state = TONUM_EXP;
				else if (isNum(ch)){
					// number has a leading zero, so just ignore it
					// (not valid in sink, but valid at runtime for flexibility)
					npi.val = toHex(ch);
					state = TONUM_BODY;
				}
				else
					return sink_num(0);
				break;

			case TONUM_2:
				if (isHex(ch)){
					npi.val = toHex(ch);
					if (npi.val >= npi.base)
						return sink_num(0);
					state = TONUM_BODY;
				}
				else if (ch != '_')
					return sink_num(0);
				break;

			case TONUM_BODY:
				if (ch == '_')
					/* do nothing */;
				else if (ch == '.')
					state = TONUM_FRAC;
				else if ((npi.base == 10 && (ch == 'e' || ch == 'E')) ||
					(npi.base != 10 && (ch == 'p' || ch == 'P')))
					state = TONUM_EXP;
				else if (isHex(ch)){
					int v = toHex(ch);
					if (v >= npi.base)
						return sink_num(numpart_calc(npi));
					else
						npi.val = npi.val * npi.base + v;
				}
				else
					return sink_num(numpart_calc(npi));
				break;

			case TONUM_FRAC:
				if (ch == '_')
					/* do nothing */;
				else if (hasval && ((npi.base == 10 && (ch == 'e' || ch == 'E')) ||
					(npi.base != 10 && (ch == 'p' || ch == 'P'))))
					state = TONUM_EXP;
				else if (isHex(ch)){
					hasval = true;
					int v = toHex(ch);
					if (v >= npi.base)
						return sink_num(numpart_calc(npi));
					npi.frac = npi.frac * npi.base + v;
					npi.flen++;
				}
				else
					return sink_num(numpart_calc(npi));
				break;

			case TONUM_EXP:
				if (ch != '_'){
					npi.esign = ch == '-' ? -1 : 1;
					state = TONUM_EXP_BODY;
					if (ch != '+' && ch != '-')
						i--;
				}
				break;

			case TONUM_EXP_BODY:
				if (ch == '_')
					/* do nothing */;
				else if (isNum(ch))
					npi.eval = npi.eval * 10.0 + toHex(ch);
				else
					return sink_num(numpart_calc(npi));
				break;
		}
	}
	if (state == TONUM_START || state == TONUM_NEG || (state == TONUM_FRAC && !hasval))
		return SINK_NIL;
	return sink_num(numpart_calc(npi));
}

static sink_val unop_num_abs(context ctx, sink_val a){
	return sink_num(fabs(a.f));
}

static sink_val unop_num_sign(context ctx, sink_val a){
	return isnan(a.f) ? SINK_NAN : sink_num(a.f < 0 ? -1 : (a.f > 0 ? 1 : 0));
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

static sink_val unop_num_isnan(context ctx, sink_val a){
	return sink_bool(sink_num_isnan(a));
}

static sink_val unop_num_isfinite(context ctx, sink_val a){
	return sink_bool(sink_num_isfinite(a));
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
	return isnan(a.f) ? SINK_NAN : opi_num_base(ctx, a.f, sink_isnil(b) ? 0 : b.f, 16);
}

static sink_val binop_num_oct(context ctx, sink_val a, sink_val b){
	return isnan(a.f) ? SINK_NAN : opi_num_base(ctx, a.f, sink_isnil(b) ? 0 : b.f, 8);
}

static sink_val binop_num_bin(context ctx, sink_val a, sink_val b){
	return isnan(a.f) ? SINK_NAN : opi_num_base(ctx, a.f, sink_isnil(b) ? 0 : b.f, 2);
}

static sink_val triop_num_clamp(context ctx, sink_val a, sink_val b, sink_val c){
	return isnan(a.f) || isnan(b.f) || isnan(c.f) ? SINK_NAN :
		sink_num(a.f < b.f ? b.f : (a.f > c.f ? c.f : a.f));
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
	if (a.u == b.u){
		if (sink_isnum(a))
			return a.f == b.f;
		return true;
	}
	if (sink_isstr(a) && sink_isstr(b))
		return str_cmp(var_caststr(ctx, a), var_caststr(ctx, b)) == 0;
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
	if (!oper_typelist(ctx, a, LT_ALLOWNIL | LT_ALLOWNUM | LT_ALLOWSTR)){
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

static inline sink_run opi_exit(context ctx){
	ctx->passed = true;
	return SINK_RUN_PASS;
}

static inline sink_run opi_abort(context ctx, char *err){
	if (err){
		filepos_st flp = (filepos_st){ .line = -1 };
		for (int i = 0; i < ctx->prg->flpTable->size; i++){
			prgflp p = ctx->prg->flpTable->ptrs[i];
			if (p->pc > ctx->lastpc)
				break;
			flp = p->flp;
		}
		if (flp.line >= 0){
			char *err2 = filepos_err(flp, err);
			mem_free(err);
			err = err2;
		}
		if (ctx->err)
			mem_free(ctx->err);
		ctx->err = sink_format("Error: %s", err);
		mem_free(err);
	}
	ctx->failed = true;
	return SINK_RUN_FAIL;
}

static inline void opi_abortcstr(context ctx, const char *msg){
	opi_abort(ctx, sink_format("%s", msg));
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
	opi_abort(ctx, buf);
	return SINK_NIL;
}

static inline sink_val opi_unop(context ctx, sink_val a, unary_func f_unary, const char *erop){
	if (!oper_typelist(ctx, a, LT_ALLOWNUM))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_un(ctx, a, f_unary);
}

static inline sink_val opi_binop(context ctx, sink_val a, sink_val b, binary_func f_binary,
	const char *erop, int t1, int t2){
	if (!oper_typelist(ctx, a, t1))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (!oper_typelist(ctx, b, t2))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_bin(ctx, a, b, f_binary);
}

static inline sink_val opi_triop(context ctx, sink_val a, sink_val b, sink_val c,
	trinary_func f_trinary, const char *erop){
	if (!oper_typelist(ctx, a, LT_ALLOWNUM))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (!oper_typelist(ctx, b, LT_ALLOWNUM))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	if (!oper_typelist(ctx, c, LT_ALLOWNUM))
		return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
	return oper_tri(ctx, a, b, c, f_trinary);
}

static inline sink_val opi_combop(context ctx, int size, sink_val *vals, binary_func f_binary,
	const char *erop){
	if (size <= 0)
		goto badtype;
	int listsize = -1;
	for (int i = 0; i < size; i++){
		if (sink_islist(vals[i])){
			sink_list ls = var_castlist(ctx, vals[i]);
			if (ls->size > listsize)
				listsize = ls->size;
			for (int j = 0; j < size; j++){
				if (!sink_isnum(ls->vals[j]))
					goto badtype;
			}
		}
		else if (!sink_isnum(vals[i]))
			goto badtype;
	}

	if (listsize < 0){
		// no lists, so just combine
		for (int i = 1; i < size; i++)
			vals[0] = f_binary(ctx, vals[0], vals[i]);
		return vals[0];
	}
	else if (listsize > 0){
		sink_val *ret = mem_alloc(sizeof(sink_val) * listsize);
		for (int j = 0; j < listsize; j++)
			ret[j] = arget(ctx, vals[0], j);
		for (int i = 1; i < size; i++){
			for (int j = 0; j < listsize; j++)
				ret[j] = f_binary(ctx, ret[j], arget(ctx, vals[i], j));
		}
		return sink_list_newblobgive(ctx, listsize, listsize, ret);
	}
	// otherwise, listsize == 0
	return sink_list_newblob(ctx, 0, NULL);

	badtype:
	return opi_abortformat(ctx, "Expecting number or list of numbers when %s", erop);
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

static inline sink_val opi_str_cat(context ctx, int argcount, sink_val *args){
	return sink_list_joinplain(ctx, argcount, args, 0, NULL);
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

static inline sink_val opi_list_cat(context ctx, int argcount, sink_val *args){
	int ns = 0;
	for (int i = 0; i < argcount; i++)
		ns += var_castlist(ctx, args[i])->size;
	if (ns <= 0)
		return sink_list_newblob(ctx, 0, NULL);
	sink_val *vals = mem_alloc(sizeof(sink_val) * ns);
	ns = 0;
	for (int i = 0; i < argcount; i++){
		sink_list ls = var_castlist(ctx, args[i]);
		if (ls->size > 0){
			memcpy(&vals[ns], ls->vals, sizeof(sink_val) * ls->size);
			ns += ls->size;
		}
	}
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
	if (sink_isnil(b))
		b = sink_str_newblobgive(ctx, 0, NULL);
	else
		b = sink_tostr(ctx, b);
	sink_str str = var_caststr(ctx, b);
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

static inline int sortboth(context ctx, list_int li, const sink_val *a, const sink_val *b, int mul){
	sink_type atype = sink_typeof(*a);
	sink_type btype = sink_typeof(*b);

	if (atype == SINK_TYPE_ASYNC || btype == SINK_TYPE_ASYNC){
		opi_abortcstr(ctx, "Invalid value inside list during sort");
		return -1;
	}

	if (a->u == b->u)
		return 0;

	if (atype != btype){
		if (atype == SINK_TYPE_NIL)
			return -mul;
		else if (atype == SINK_TYPE_NUM)
			return btype == SINK_TYPE_NIL ? mul : -mul;
		else if (atype == SINK_TYPE_STR)
			return btype == SINK_TYPE_LIST ? -mul : mul;
		return mul;
	}

	if (atype == SINK_TYPE_NUM){
		if (sink_num_isnan(*a)){
			if (sink_num_isnan(*b))
				return 0;
			return -mul;
		}
		else if (sink_num_isnan(*b))
			return mul;
		return sink_castnum(*a) < sink_castnum(*b) ? -mul : mul;
	}
	else if (atype == SINK_TYPE_STR){
		sink_str s1 = var_caststr(ctx, *a);
		sink_str s2 = var_caststr(ctx, *b);
		if (s1->size == 0){
			if (s2->size == 0)
				return 0;
			return -mul;
		}
		else if (s2->size == 0)
			return mul;
		int res = memcmp(s1->bytes, s2->bytes,
			sizeof(uint8_t) * (s1->size < s2->size ? s1->size : s2->size));
		if (res == 0)
			return s1->size == s2->size ? 0 : (s1->size < s2->size ? -mul : mul);
		return res < 0 ? -mul : mul;
	}
	// otherwise, comparing two lists
	int idx1 = var_index(*a);
	int idx2 = var_index(*b);
	if (list_int_has(li, idx1) || list_int_has(li, idx2)){
		opi_abortcstr(ctx, "Cannot sort circular lists");
		return -1;
	}
	sink_list ls1 = var_castlist(ctx, *a);
	sink_list ls2 = var_castlist(ctx, *b);
	if (ls1->size == 0){
		if (ls2->size == 0)
			return 0;
		return -mul;
	}
	else if (ls2->size == 0)
		return mul;
	int minsize = ls1->size < ls2->size ? ls1->size : ls2->size;
	list_int_push(li, idx1);
	list_int_push(li, idx2);
	for (int i = 0; i < minsize; i++){
		int res = sortboth(ctx, li, &ls1->vals[i], &ls2->vals[i], 1);
		if (res < 0){
			list_int_pop(li);
			list_int_pop(li);
			return -mul;
		}
		else if (res > 0){
			list_int_pop(li);
			list_int_pop(li);
			return mul;
		}
	}
	list_int_pop(li);
	list_int_pop(li);
	if (ls1->size < ls2->size)
		return -mul;
	else if (ls1->size > ls2->size)
		return mul;
	return 0;
}

typedef struct {
	context ctx;
	list_int li;
} sortu_st, *sortu;

static int sortfwd(sortu u, const sink_val *a, const sink_val *b){
	return sortboth(u->ctx, u->li, a, b, 1);
}

static int sortrev(sortu u, const sink_val *a, const sink_val *b){
	return sortboth(u->ctx, u->li, a, b, -1);
}

static inline void opi_list_sort(context ctx, sink_val a){
	sortu_st u = { .ctx = ctx, .li = list_int_new() };
	sink_list ls = var_castlist(ctx, a);
	qsort_r(ls->vals, ls->size, sizeof(sink_val), &u,
		(int (*)(void *, const void *, const void *))sortfwd);
	list_int_free(u.li);
}

static inline void opi_list_rsort(context ctx, sink_val a){
	sortu_st u = { .ctx = ctx, .li = list_int_new() };
	sink_list ls = var_castlist(ctx, a);
	qsort_r(ls->vals, ls->size, sizeof(sink_val), &u,
		(int (*)(void *, const void *, const void *))sortrev);
	list_int_free(u.li);
}

static inline int opi_order(context ctx, sink_val a, sink_val b){
	list_int li = list_int_new();
	int res = sortboth(ctx, li, &a, &b, 1);
	list_int_free(li);
	return res;
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

static inline void numtostr(double num, char *buf, size_t bufsize, int *outsize){
	*outsize = snprintf(buf, bufsize, "%.16g", num);
	if (buf[0] == '-' && buf[1] == '0' && buf[2] == 0){ // fix negative zero silliness
		buf[0] = '0';
		buf[1] = 0;
		*outsize = 1;
	}
}

static inline bool pk_isjson(sink_str s){
	enum {
		PKV_START,
		PKV_NULL1,
		PKV_NULL2,
		PKV_NULL3,
		PKV_NUM_0,
		PKV_NUM_NEG,
		PKV_NUM_INT,
		PKV_NUM_FRAC,
		PKV_NUM_FRACE,
		PKV_NUM_FRACE2,
		PKV_NUM_EXP,
		PKV_STR,
		PKV_STR_ESC,
		PKV_STR_U1,
		PKV_STR_U2,
		PKV_STR_U3,
		PKV_STR_U4,
		PKV_ARRAY,
		PKV_ENDVAL
	} state = PKV_START;
	int arrays = 0;
	for (int i = 0; i < s->size; i++){
		uint8_t b = s->bytes[i];
		uint8_t nb = i < s->size - 1 ? s->bytes[i + 1] : 0;
		switch (state){
			case PKV_START: // start state
				if (b == 'n'){
					if (nb != 'u')
						return 0;
					state = PKV_NULL1;
				}
				else if (b == '0'){
					if (nb == '.' || nb == 'e' || nb == 'E')
						state = PKV_NUM_0;
					else
						state = PKV_ENDVAL;
				}
				else if (b == '-')
					state = PKV_NUM_NEG;
				else if (isNum((char)b)){
					if (isNum((char)nb))
						state = PKV_NUM_INT;
					else if (nb == '.' || nb == 'e' || nb == 'E')
						state = PKV_NUM_0;
					else
						state = PKV_ENDVAL;
				}
				else if (b == '"')
					state = PKV_STR;
				else if (b == '['){
					arrays++;
					if (isSpace((char)nb) || nb == ']')
						state = PKV_ARRAY;
				}
				else if (!isSpace((char)b))
					return 0;
				break;
			case PKV_NULL1:
				if (nb != 'l')
					return 0;
				state = PKV_NULL2;
				break;
			case PKV_NULL2:
				if (nb != 'l')
					return 0;
				state = PKV_NULL3;
				break;
			case PKV_NULL3:
				state = PKV_ENDVAL;
				break;
			case PKV_NUM_0:
				if (b == '.')
					state = PKV_NUM_FRAC;
				else if (b == 'e' || b == 'E'){
					if (nb == '+' || nb == '-')
						i++;
					state = PKV_NUM_EXP;
				}
				else
					return 0;
				break;
			case PKV_NUM_NEG:
				if (b == '0'){
					if (nb == '.' || nb == 'e' || nb == 'E')
						state = PKV_NUM_0;
					else
						state = PKV_ENDVAL;
				}
				else if (isNum((char)b)){
					if (isNum((char)nb))
						state = PKV_NUM_INT;
					else if (nb == '.' || nb == 'e' || nb == 'E')
						state = PKV_NUM_0;
					else
						state = PKV_ENDVAL;
				}
				else
					return 0;
				break;
			case PKV_NUM_INT:
				if (!isNum((char)b))
					return 0;
				if (nb == '.' || nb == 'e' || nb == 'E')
					state = PKV_NUM_0;
				else if (!isNum((char)nb))
					state = PKV_ENDVAL;
				break;
			case PKV_NUM_FRAC:
				if (!isNum((char)b))
					return 0;
				if (nb == 'e' || nb == 'E')
					state = PKV_NUM_FRACE;
				else if (!isNum((char)nb))
					state = PKV_ENDVAL;
				break;
			case PKV_NUM_FRACE:
				state = PKV_NUM_FRACE2;
				break;
			case PKV_NUM_FRACE2:
				if (isNum((char)b)){
					if (isNum((char)nb))
						state = PKV_NUM_EXP;
					else
						state = PKV_ENDVAL;
				}
				else if (b == '+' || b == '-')
					state = PKV_NUM_EXP;
				else
					return 0;
				break;
			case PKV_NUM_EXP:
				if (!isNum((char)b))
					return 0;
				if (!isNum((char)nb))
					state = PKV_ENDVAL;
				break;
			case PKV_STR:
				if (b == '\\')
					state = PKV_STR_ESC;
				else if (b == '"')
					state = PKV_ENDVAL;
				else if (b < 0x20)
					return 0;
				break;
			case PKV_STR_ESC:
				if (b == '"' || b == '\\' || b == '/' || b == 'b' ||
					b == 'f' || b == 'n' || b == 'r' || b == 't')
					state = PKV_STR;
				else if (b == 'u'){
					if (nb != '0')
						return 0;
					state = PKV_STR_U1;
				}
				else
					return 0;
				break;
			case PKV_STR_U1:
				if (nb != '0')
					return 0;
				state = PKV_STR_U2;
				break;
			case PKV_STR_U2:
				if (!isHex((char)nb))
					return 0;
				state = PKV_STR_U3;
				break;
			case PKV_STR_U3:
				if (!isHex((char)nb))
					return 0;
				state = PKV_STR_U4;
				break;
			case PKV_STR_U4:
				state = PKV_STR;
				break;
			case PKV_ARRAY:
				if (b == ']')
					state = PKV_ENDVAL;
				else if (!isSpace((char)nb) && nb != ']')
					state = PKV_START;
				break;
			case PKV_ENDVAL:
				if (arrays > 0){
					if (b == ',')
						state = PKV_START;
					else if (b == ']')
						arrays--;
					else if (!isSpace((char)b))
						return 0;
				}
				else if (!isSpace((char)b))
					return 0;
				break;
		}
	}
	return state == PKV_ENDVAL;
}

static bool pk_tojson(context ctx, sink_val a, list_int li, sink_str s){
	switch (sink_typeof(a)){
		case SINK_TYPE_NIL:
			set_null:
			s->size = 4;
			s->bytes = mem_alloc(sizeof(uint8_t) * 5);
			s->bytes[0] = 'n';
			s->bytes[1] = 'u';
			s->bytes[2] = 'l';
			s->bytes[3] = 'l';
			s->bytes[4] = 0;
			return true;
		case SINK_TYPE_NUM: {
			char buf[64];
			int sz;
			numtostr(sink_castnum(a), buf, sizeof(buf), &sz);
			sink_str_st s2 = { .size = sz, .bytes = (uint8_t *)buf };
			if (pk_isjson(&s2)){
				s->size = sz;
				s->bytes = mem_alloc(sizeof(uint8_t) * (sz + 1));
				memcpy(s->bytes, buf, sizeof(uint8_t) * (sz + 1));
				return true;
			}
			// if C's rendering of the number is not valid JSON, then we have a goofy number, so
			// just set it to null
			goto set_null;
		} break;
		case SINK_TYPE_STR: {
			int tot = 2;
			sink_str src = var_caststr(ctx, a);
			// calculate total size first
			for (int i = 0; i < src->size; i++){
				uint8_t b = src->bytes[i];
				if (b == '"' || b == '\\' || b == '\b' || b == '\f' || b == '\n' || b == '\r' ||
					b == '\t')
					tot += 2;
				else if (b < 0x20 || b >= 0x80) // \u00XX
					tot += 6;
				else
					tot++;
			}
			s->size = tot;
			s->bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
			// render string
			int pos = 0;
			s->bytes[pos++] = '"';
			for (int i = 0; i < src->size; i++){
				uint8_t b = src->bytes[i];
				if (b == '"' || b == '\\'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = b;
				}
				else if (b == '\b'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 'b';
				}
				else if (b == '\f'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 'f';
				}
				else if (b == '\n'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 'n';
				}
				else if (b == '\r'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 'r';
				}
				else if (b == '\t'){
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 't';
				}
				else if (b < 0x20 || b >= 0x80){ // \u00XX
					s->bytes[pos++] = '\\';
					s->bytes[pos++] = 'u';
					s->bytes[pos++] = '0';
					s->bytes[pos++] = '0';
					s->bytes[pos++] = toNibble((b >> 4) & 0x0F);
					s->bytes[pos++] = toNibble(b & 0x0F);
				}
				else
					s->bytes[pos++] = b;
			}
			s->bytes[pos++] = '"';
			s->bytes[pos] = 0;
			return true;
		} break;
		case SINK_TYPE_LIST: {
			int idx = var_index(a);
			if (list_int_has(li, idx))
				return false; // circular
			list_int_push(li, idx);
			sink_list ls = var_castlist(ctx, a);
			int tot = 2;
			sink_str_st *strs = mem_alloc(sizeof(sink_str_st) * ls->size);
			for (int i = 0; i < ls->size; i++){
				sink_str_st s2;
				if (!pk_tojson(ctx, ls->vals[i], li, &s2)){
					for (int j = 0; j < i; j++)
						mem_free(strs[j].bytes);
					mem_free(strs);
					return false;
				}
				strs[i] = s2;
				tot += (i == 0 ? 0 : 1) + s2.size;
			}
			list_int_pop(li);
			uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
			bytes[0] = '[';
			int p = 1;
			for (int i = 0; i < ls->size; i++){
				if (i > 0)
					bytes[p++] = ',';
				memcpy(&bytes[p], strs[i].bytes, sizeof(uint8_t) * strs[i].size);
				mem_free(strs[i].bytes);
				p += strs[i].size;
			}
			mem_free(strs);
			bytes[p] = ']';
			bytes[tot] = 0;
			s->size = tot;
			s->bytes = bytes;
			return true;
		} break;
		case SINK_TYPE_ASYNC:
			opi_abortcstr(ctx, "Cannot pickle invalid value (SINK_ASYNC)");
			return false;
	}
}

static inline sink_val opi_pickle_json(context ctx, sink_val a){
	list_int li = NULL;
	if (sink_islist(a))
		li = list_int_new();
	sink_str_st s = { .size = 0, .bytes = NULL};
	bool suc = pk_tojson(ctx, a, li, &s);
	if (li)
		list_int_free(li);
	if (!suc){
		if (s.bytes)
			mem_free(s.bytes);
		if (!ctx->failed)
			opi_abortcstr(ctx, "Cannot pickle circular structure to JSON format");
		return SINK_NIL;
	}
	return sink_str_newblobgive(ctx, s.size, s.bytes);
}

static inline void pk_tobin_vint(list_byte body, uint32_t i){
	if (i < 128)
		list_byte_push(body, i);
	else{
		list_byte_push4(body,
			0x80 | (i >> 24),
			(i >> 16) & 0xFF,
			(i >>  8) & 0xFF,
			 i        & 0xFF);
	}
}

static void pk_tobin(context ctx, sink_val a, list_int li, uint32_t *str_table_size, list_byte strs,
	list_byte body){
	switch (sink_typeof(a)){
		case SINK_TYPE_NIL:
			list_byte_push(body, 0xF7);
			break;
		case SINK_TYPE_NUM: {
			if (floor(a.f) == a.f && a.f >= -4294967296.0 && a.f < 4294967296.0){
				int64_t num = a.f;
				if (num < 0){
					if (num >= -256){
						num += 256;
						list_byte_push2(body, 0xF1, num & 0xFF);
					}
					else if (num >= -65536){
						num += 65536;
						list_byte_push3(body, 0xF3, num & 0xFF, num >> 8);
					}
					else{
						num += 4294967296;
						list_byte_push5(body, 0xF5, num & 0xFF, (num >> 8) & 0xFF,
							(num >> 16) & 0xFF, (num >> 24) & 0xFF);
					}
				}
				else{
					if (num < 256)
						list_byte_push2(body, 0xF0, num & 0xFF);
					else if (num < 65536)
						list_byte_push3(body, 0xF2, num & 0xFF, num >> 8);
					else{
						list_byte_push5(body, 0xF4, num & 0xFF, (num >> 8) & 0xFF,
							(num >> 16) & 0xFF, (num >> 24) & 0xFF);
					}
				}
			}
			else{
				list_byte_push9(body, 0xF6,
					a.u & 0xFF, (a.u >> 8) & 0xFF, (a.u >> 16) & 0xFF, (a.u >> 24) & 0xFF,
					(a.u >> 32) & 0xFF, (a.u >> 40) & 0xFF, (a.u >> 48) & 0xFF, (a.u >> 56) & 0xFF);
			}
		} break;
		case SINK_TYPE_STR: {
			// search for a previous string
			sink_str s = var_caststr(ctx, a);
			int spos = 0;
			uint32_t sidx = 0;
			bool found = false;
			while (!found && sidx < *str_table_size){
				uint32_t vi = strs->bytes[spos++];
				if (vi >= 128){
					vi = ((vi ^ 0x80) << 24) |
						((uint32_t)strs->bytes[spos    ] << 16) |
						((uint32_t)strs->bytes[spos + 1] <<  8) |
						((uint32_t)strs->bytes[spos + 2]      );
					spos += 3;
				}
				if (vi == s->size){
					found = vi == 0 ||
						memcmp(&strs->bytes[spos], s->bytes, sizeof(uint8_t) * vi) == 0;
				}
				if (!found){
					spos += vi;
					sidx++;
				}
			}
			if (!found){
				pk_tobin_vint(strs, s->size);
				list_byte_append(strs, s->size, s->bytes);
				sidx = *str_table_size;
				(*str_table_size)++;
			}
			list_byte_push(body, 0xF8);
			pk_tobin_vint(body, sidx);
		} break;
		case SINK_TYPE_LIST: {
			int idx = var_index(a);
			int idxat = list_int_at(li, idx);
			if (idxat < 0){
				list_int_push(li, idx);
				sink_list ls = var_castlist(ctx, a);
				list_byte_push(body, 0xF9);
				pk_tobin_vint(body, ls->size);
				for (int i = 0; i < ls->size; i++)
					pk_tobin(ctx, ls->vals[i], li, str_table_size, strs, body);
			}
			else{
				list_byte_push(body, 0xFA);
				pk_tobin_vint(body, idxat);
			}
		} break;
		case SINK_TYPE_ASYNC:
			opi_abortcstr(ctx, "Cannot pickle invalid value (SINK_ASYNC)");
			break;
	}
}

static inline bool opi_pickle_binstr(context ctx, sink_val a, sink_str_st *out){
	list_int li = NULL;
	if (sink_islist(a))
		li = list_int_new();
	uint32_t str_table_size = 0;
	list_byte strs = list_byte_new();
	list_byte body = list_byte_new();
	pk_tobin(ctx, a, li, &str_table_size, strs, body);
	if (li)
		list_int_free(li);
	if (ctx->failed){
		list_byte_free(strs);
		list_byte_free(body);
		return false;
	}
	int tot = 1 + (str_table_size < 128 ? 1 : 4) + strs->size + body->size;
	uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (tot + 1));
	int pos = 0;
	bytes[pos++] = 0x01;
	if (str_table_size < 128)
		bytes[pos++] = str_table_size;
	else{
		bytes[pos++] = 0x80 | (str_table_size >> 24);
		bytes[pos++] = (str_table_size >> 16) & 0xFF;
		bytes[pos++] = (str_table_size >>  8) & 0xFF;
		bytes[pos++] =  str_table_size        & 0xFF;
	}
	if (strs->size > 0){
		memcpy(&bytes[pos], strs->bytes, sizeof(uint8_t) * strs->size);
		pos += strs->size;
	}
	memcpy(&bytes[pos], body->bytes, sizeof(uint8_t) * body->size);
	bytes[tot] = 0;
	list_byte_free(strs);
	list_byte_free(body);
	*out = (sink_str_st){ .size = tot, .bytes = bytes };
	return true;
}

static inline sink_val opi_pickle_bin(context ctx, sink_val a){
	sink_str_st str;
	if (!opi_pickle_binstr(ctx, a, &str))
		return SINK_NIL;
	return sink_str_newblobgive(ctx, str.size, str.bytes);
}

static inline bool pk_fmbin_vint(sink_str s, uint64_t *pos, uint32_t *res){
	if (s->size <= *pos)
		return false;
	uint32_t v = s->bytes[*pos];
	(*pos)++;
	if (v < 128){
		*res = v;
		return true;
	}
	if (s->size <= *pos + 2)
		return false;
	*res = ((v ^ 0x80) << 24) |
		((uint32_t)s->bytes[*pos    ] << 16) |
		((uint32_t)s->bytes[*pos + 1] <<  8) |
		((uint32_t)s->bytes[*pos + 2]      );
	(*pos) += 3;
	return true;
}

static bool pk_fmbin(context ctx, sink_str s, uint64_t *pos, uint32_t str_table_size,
	sink_val *strs, list_int li, sink_val *res){
	if (*pos >= s->size)
		return false;
	uint8_t cmd = s->bytes[*pos];
	(*pos)++;
	switch (cmd){
		case 0xF0: {
			if (*pos >= s->size)
				return false;
			*res = sink_num(s->bytes[*pos]);
			(*pos)++;
			return true;
		} break;
		case 0xF1: {
			if (*pos >= s->size)
				return false;
			*res = sink_num((int)s->bytes[*pos] - 256);
			(*pos)++;
			return true;
		} break;
		case 0xF2: {
			if (*pos + 1 >= s->size)
				return false;
			*res = sink_num(
				(int)s->bytes[*pos] |
				((int)s->bytes[*pos + 1] << 8));
			(*pos) += 2;
			return true;
		} break;
		case 0xF3: {
			if (*pos + 1 >= s->size)
				return false;
			*res = sink_num(
				((int)s->bytes[*pos] |
				((int)s->bytes[*pos + 1] << 8)) - 65536);
			(*pos) += 2;
			return true;
		} break;
		case 0xF4: {
			if (*pos + 3 >= s->size)
				return false;
			*res = sink_num(
				(int)s->bytes[*pos] |
				((int)s->bytes[*pos + 1] <<  8) |
				((int)s->bytes[*pos + 2] << 16) |
				((int)s->bytes[*pos + 3] << 24));
			(*pos) += 4;
			return true;
		} break;
		case 0xF5: {
			if (*pos + 3 >= s->size)
				return false;
			*res = sink_num(
				((double)((uint32_t)s->bytes[*pos] |
				((uint32_t)s->bytes[*pos + 1] <<  8) |
				((uint32_t)s->bytes[*pos + 2] << 16) |
				((uint32_t)s->bytes[*pos + 3] << 24))) - 4294967296.0);
			(*pos) += 4;
			return true;
		} break;
		case 0xF6: {
			if (*pos + 7 >= s->size)
				return false;
			res->u = ((uint64_t)s->bytes[*pos]) |
				(((uint64_t)s->bytes[*pos + 1]) <<  8) |
				(((uint64_t)s->bytes[*pos + 2]) << 16) |
				(((uint64_t)s->bytes[*pos + 3]) << 24) |
				(((uint64_t)s->bytes[*pos + 4]) << 32) |
				(((uint64_t)s->bytes[*pos + 5]) << 40) |
				(((uint64_t)s->bytes[*pos + 6]) << 48) |
				(((uint64_t)s->bytes[*pos + 7]) << 56);
			if (isnan(res->f)) // make sure no screwy NaN's come in
				*res = sink_num_nan();
			(*pos) += 8;
			return true;
		} break;
		case 0xF7: {
			*res = SINK_NIL;
			return true;
		} break;
		case 0xF8: {
			uint32_t id;
			if (!pk_fmbin_vint(s, pos, &id) || id >= str_table_size)
				return false;
			*res = strs[id];
			return true;
		} break;
		case 0xF9: {
			uint32_t sz;
			if (!pk_fmbin_vint(s, pos, &sz))
				return false;
			if (sz <= 0){
				*res = sink_list_newblob(ctx, 0, NULL);
				list_int_push(li, var_index(*res));
			}
			else{
				sink_val *vals = mem_alloc(sizeof(sink_val) * sz);
				memset(vals, 0, sizeof(sink_val) * sz);
				*res = sink_list_newblobgive(ctx, sz, sz, vals);
				list_int_push(li, var_index(*res));
				for (uint32_t i = 0; i < sz; i++){
					if (!pk_fmbin(ctx, s, pos, str_table_size, strs, li, &vals[i]))
						return false;
				}
			}
			return true;
		} break;
		case 0xFA: {
			uint32_t id;
			if (!pk_fmbin_vint(s, pos, &id) || id >= li->size)
				return false;
			*res = (sink_val){ .u = SINK_TAG_LIST | li->vals[id] };
			return true;
		} break;
	}
	return false;
}

static bool pk_fmjson(context ctx, sink_str s, int *pos, sink_val *res){
	while (*pos < s->size && isSpace((char)s->bytes[*pos]))
		(*pos)++;
	if (*pos >= s->size)
		return false;
	uint8_t b = s->bytes[*pos];
	(*pos)++;
	if (b == 'n'){
		if (*pos + 2 >= s->size)
			return false;
		if (s->bytes[*pos] != 'u' ||
			s->bytes[*pos + 1] != 'l' ||
			s->bytes[*pos + 2] != 'l')
			return false;
		(*pos) += 3;
		*res = SINK_NIL;
		return true;
	}
	else if (isNum((char)b) || b == '-'){
		numpart_info npi;
		numpart_new(&npi);
		if (b == '-'){
			if (*pos >= s->size)
				return false;
			npi.sign = -1;
			b = s->bytes[*pos];
			(*pos)++;
			if (!isNum((char)b))
				return false;
		}
		if (b >= '1' && b <= '9'){
			npi.val = b - '0';
			while (*pos < s->size && isNum((char)s->bytes[*pos])){
				npi.val = 10 * npi.val + (s->bytes[*pos] - '0');
				(*pos)++;
			}
		}
		if (s->bytes[*pos] == '.'){
			(*pos)++;
			if (*pos >= s->size || !isNum((char)s->bytes[*pos]))
				return false;
			while (*pos < s->size && isNum((char)s->bytes[*pos])){
				npi.frac = npi.frac * 10 + s->bytes[*pos] - '0';
				npi.flen++;
				(*pos)++;
			}
		}
		if (s->bytes[*pos] == 'e' || s->bytes[*pos] == 'E'){
			(*pos)++;
			if (*pos >= s->size)
				return false;
			if (s->bytes[*pos] == '-' || s->bytes[*pos] == '+'){
				npi.esign = s->bytes[*pos] == '-' ? -1 : 1;
				(*pos)++;
				if (*pos >= s->size)
					return false;
			}
			if (!isNum((char)s->bytes[*pos]))
				return false;
			while (*pos < s->size && isNum((char)s->bytes[*pos])){
				npi.eval = npi.eval * 10 + s->bytes[*pos] - '0';
				(*pos)++;
			}
		}
		*res = sink_num(numpart_calc(npi));
		return true;
	}
	else if (b == '"'){
		list_byte str = list_byte_new();
		while (*pos < s->size){
			b = s->bytes[*pos];
			if (b == '"'){
				(*pos)++;
				list_byte_push(str, 0);
				sink_str_st bstr = list_byte_freetostr(str);
				*res = sink_str_newblobgive(ctx, bstr.size - 1, bstr.bytes);
				return true;
			}
			else if (b == '\\'){
				(*pos)++;
				if (*pos >= s->size){
					list_byte_free(str);
					return false;
				}
				b = s->bytes[*pos];
				if (b == '"' || b == '\\')
					list_byte_push(str, b);
				else if (b == 'b')
					list_byte_push(str, '\b');
				else if (b == 'f')
					list_byte_push(str, '\f');
				else if (b == 'n')
					list_byte_push(str, '\n');
				else if (b == 'r')
					list_byte_push(str, '\r');
				else if (b == 't')
					list_byte_push(str, '\t');
				else if (b == 'u'){
					if (*pos + 4 >= s->size ||
						s->bytes[*pos + 1] != '0' || s->bytes[*pos + 2] != '0' ||
						!isHex(s->bytes[*pos + 3]) || !isHex(s->bytes[*pos + 4])){
						list_byte_free(str);
						return false;
					}
					list_byte_push(str,
						(toHex(s->bytes[*pos + 3]) << 4) | toHex(s->bytes[*pos + 4]));
					(*pos) += 4;
				}
				else{
					list_byte_free(str);
					return false;
				}
			}
			else if (b < 0x20){
				list_byte_free(str);
				return false;
			}
			else
				list_byte_push(str, b);
			(*pos)++;
		}
		list_byte_free(str);
		return false;
	}
	else if (b == '['){
		while (*pos < s->size && isSpace((char)s->bytes[*pos]))
			(*pos)++;
		if (*pos >= s->size)
			return false;
		if (s->bytes[*pos] == ']'){
			(*pos)++;
			*res = sink_list_newblob(ctx, 0, NULL);
			return true;
		}
		*res = sink_list_newblob(ctx, 0, NULL);
		while (true){
			sink_val item;
			if (!pk_fmjson(ctx, s, pos, &item))
				return false;
			sink_list_push(ctx, *res, item);
			while (*pos < s->size && isSpace((char)s->bytes[*pos]))
				(*pos)++;
			if (*pos >= s->size)
				return false;
			if (s->bytes[*pos] == ']'){
				(*pos)++;
				return true;
			}
			else if (s->bytes[*pos] == ',')
				(*pos)++;
			else
				return false;
		}
	}
	return false;
}

static inline bool opi_pickle_valstr(context ctx, sink_str s, sink_val *res){
	if (s->size < 1 || s->bytes[0] != 0x01)
		return false;
	uint64_t pos = 1;
	uint32_t str_table_size;
	if (!pk_fmbin_vint(s, &pos, &str_table_size))
		return false;
	sink_val *strs = NULL;
	if (str_table_size > 0)
		strs = mem_alloc(sizeof(sink_val) * str_table_size);
	for (uint32_t i = 0; i < str_table_size; i++){
		uint32_t str_size;
		if (!pk_fmbin_vint(s, &pos, &str_size) || pos + str_size > s->size){
			mem_free(strs);
			return false;
		}
		strs[i] = sink_str_newblob(ctx, str_size, &s->bytes[pos]);
		pos += str_size;
	}
	list_int li = list_int_new();
	if (!pk_fmbin(ctx, s, &pos, str_table_size, strs, li, res)){
		mem_free(strs);
		list_int_free(li);
		return false;
	}
	mem_free(strs);
	list_int_free(li);
	return true;
}

static inline sink_val opi_pickle_val(context ctx, sink_val a){
	if (!sink_isstr(a)){
		opi_abortcstr(ctx, "Invalid pickle data");
		return SINK_NIL;
	}
	sink_str s = var_caststr(ctx, a);
	if (s->size < 1){
		opi_abortcstr(ctx, "Invalid pickle data");
		return SINK_NIL;
	}
	if (s->bytes[0] == 0x01){ // binary decode
		sink_val res;
		if (!opi_pickle_valstr(ctx, s, &res)){
			opi_abortcstr(ctx, "Invalid pickle data");
			return SINK_NIL;
		}
		return res;
	}
	// otherwise, json decode
	int pos = 0;
	sink_val res;
	if (!pk_fmjson(ctx, s, &pos, &res)){
		opi_abortcstr(ctx, "Invalid pickle data");
		return SINK_NIL;
	}
	while (pos < s->size){
		if (!isSpace(s->bytes[pos])){
			opi_abortcstr(ctx, "Invalid pickle data");
			return SINK_NIL;
		}
		pos++;
	}
	return res;
}

static inline bool pk_isbin_adv(sink_str s, uint64_t *pos, uint32_t amt){
	(*pos) += amt;
	return *pos <= s->size;
}

static bool pk_isbin(sink_str s, uint64_t *pos, uint32_t *index, uint32_t str_table_size){
	if (s->size <= *pos)
		return false;
	uint8_t cmd = s->bytes[*pos];
	(*pos)++;
	switch (cmd){
		case 0xF0: return pk_isbin_adv(s, pos, 1);
		case 0xF1: return pk_isbin_adv(s, pos, 1);
		case 0xF2: return pk_isbin_adv(s, pos, 2);
		case 0xF3: return pk_isbin_adv(s, pos, 2);
		case 0xF4: return pk_isbin_adv(s, pos, 4);
		case 0xF5: return pk_isbin_adv(s, pos, 4);
		case 0xF6: return pk_isbin_adv(s, pos, 8);
		case 0xF7: return true;
		case 0xF8: {
			uint32_t str_id;
			if (!pk_fmbin_vint(s, pos, &str_id))
				return false;
			if (str_id >= str_table_size)
				return false;
			return true;
		} break;
		case 0xF9: {
			(*index)++;
			uint32_t list_size;
			if (!pk_fmbin_vint(s, pos, &list_size))
				return false;
			for (uint32_t i = 0; i < list_size; i++){
				if (!pk_isbin(s, pos, index, str_table_size))
					return false;
			}
			return true;
		} break;
		case 0xFA: {
			uint32_t ref;
			if (!pk_fmbin_vint(s, pos, &ref))
				return false;
			if (ref >= *index)
				return false;
			return true;
		} break;
	}
	return false;
}

static inline int opi_pickle_valid(context ctx, sink_val a){
	if (!sink_isstr(a))
		return 0;
	sink_str s = var_caststr(ctx, a);
	if (s->bytes == NULL)
		return 0;
	if (s->bytes[0] == 0x01){ // binary validation
		uint64_t pos = 1;
		uint32_t str_table_size;
		if (!pk_fmbin_vint(s, &pos, &str_table_size))
			return 0;
		for (uint32_t i = 0; i < str_table_size; i++){
			uint32_t str_size;
			if (!pk_fmbin_vint(s, &pos, &str_size))
				return 0;
			pos += str_size; // skip over string's raw bytes
		}
		uint32_t index = 0;
		if (!pk_isbin(s, &pos, &index, str_table_size))
			return 0;
		if (pos != s->size)
			return 0;
		return 2;
	}
	// otherwise, json validation
	return pk_isjson(s) ? 1 : 0;
}

static bool pk_sib(context ctx, sink_val a, list_int all, list_int parents){
	int idx = var_index(a);
	if (list_int_has(parents, idx))
		return false;
	if (list_int_has(all, idx))
		return true;
	list_int_push(all, idx);
	list_int_push(parents, idx);
	sink_list ls = var_castlist(ctx, a);
	for (int i = 0; i < ls->size; i++){
		sink_val b = ls->vals[i];
		if (!sink_islist(b))
			continue;
		if (pk_sib(ctx, b, all, parents))
			return true;
	}
	list_int_pop(parents);
	return false;
}

static inline bool opi_pickle_sibling(context ctx, sink_val a){
	if (!sink_islist(a))
		return false;
	list_int all = list_int_new();
	list_int parents = list_int_new();
	bool res = pk_sib(ctx, a, all, parents);
	list_int_free(all);
	list_int_free(parents);
	return res;
}

static bool pk_cir(context ctx, sink_val a, list_int li){
	int idx = var_index(a);
	if (list_int_has(li, idx))
		return true;
	list_int_push(li, idx);
	sink_list ls = var_castlist(ctx, a);
	for (int i = 0; i < ls->size; i++){
		sink_val b = ls->vals[i];
		if (!sink_islist(b))
			continue;
		if (pk_cir(ctx, b, li))
			return true;
	}
	list_int_pop(li);
	return false;
}

static inline bool opi_pickle_circular(context ctx, sink_val a){
	if (!sink_islist(a))
		return false;
	list_int ls = list_int_new();
	bool res = pk_cir(ctx, a, ls);
	list_int_free(ls);
	return res;
}

static sink_val pk_copy(context ctx, sink_val a, list_int li_src, list_int li_tgt){
	switch (sink_typeof(a)){
		case SINK_TYPE_NIL:
		case SINK_TYPE_NUM:
		case SINK_TYPE_STR:
			return a;
		case SINK_TYPE_LIST: {
			int idx = var_index(a);
			int idxat = list_int_at(li_src, idx);
			if (idxat < 0){
				sink_list ls = var_castlist(ctx, a);
				if (ls->size <= 0){
					sink_val b = sink_list_newblob(ctx, 0, NULL);
					list_int_push(li_src, idx);
					list_int_push(li_tgt, var_index(b));
					return b;
				}
				else{
					sink_val *m = mem_alloc(sizeof(sink_val) * ls->size);
					memset(m, 0, sizeof(sink_val) * ls->size);
					sink_val b = sink_list_newblobgive(ctx, ls->size, ls->size, m);
					list_int_push(li_src, idx);
					list_int_push(li_tgt, var_index(b));
					for (int i = 0; i < ls->size; i++)
						m[i] = pk_copy(ctx, ls->vals[i], li_src, li_tgt);
					return b;
				}
			}
			// otherwise, use the last generated list
			return (sink_val){ .u = SINK_TAG_LIST | li_tgt->vals[idxat] };
		} break;
		case SINK_TYPE_ASYNC:
			opi_abortcstr(ctx, "Cannot pickle invalid value (SINK_ASYNC)");
			return SINK_NIL;
	}
}

static inline sink_val opi_pickle_copy(context ctx, sink_val a){
	list_int li_src = NULL, li_tgt = NULL;
	if (sink_islist(a)){
		li_src = list_int_new();
		li_tgt = list_int_new();
	}
	a = pk_copy(ctx, a, li_src, li_tgt);
	if (li_src){
		list_int_free(li_src);
		list_int_free(li_tgt);
	}
	return a;
}

static inline uint8_t *opi_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz,
	const uint8_t *sep, int *totv);

static sink_run context_run(context ctx){
	#ifdef SINK_DEBUG
	if (!program_validate(ctx->prg)){
		debug("Program failed to validate");
		return SINK_RUN_FAIL;
	}
	#endif
	if (ctx->passed) return SINK_RUN_PASS;
	if (ctx->failed) return SINK_RUN_FAIL;
	if (ctx->async ) return SINK_RUN_ASYNC;

	if (ctx->timeout > 0 && ctx->timeout_left <= 0){
		ctx->timeout_left = ctx->timeout;
		return SINK_RUN_TIMEOUT;
	}

	int A, B, C, D, E, F, G, H, I, J;
	sink_val X, Y, Z, W;
	sink_list ls;
	sink_str str;
	sink_val p[256];

	list_byte ops = ctx->prg->ops;

	#define LOAD_ab()                                                                      \
		ctx->pc++;                                                                         \
		A = ops->bytes[ctx->pc++]; B = ops->bytes[ctx->pc++];

	#define LOAD_abc()                                                                     \
		LOAD_ab();                                                                         \
		C = ops->bytes[ctx->pc++];

	#define LOAD_abcd()                                                                    \
		LOAD_ab();                                                                         \
		C = ops->bytes[ctx->pc++]; D = ops->bytes[ctx->pc++];

	#define LOAD_abcde()                                                                   \
		LOAD_abcd();                                                                       \
		E = ops->bytes[ctx->pc++];                                                         \

	#define LOAD_abcdef()                                                                  \
		LOAD_abcd();                                                                       \
		E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];

	#define LOAD_abcdefg()                                                                 \
		LOAD_abcdef();                                                                     \
		G = ops->bytes[ctx->pc++];

	#define LOAD_abcdefgh()                                                                \
		LOAD_abcdef();                                                                     \
		G = ops->bytes[ctx->pc++]; H = ops->bytes[ctx->pc++];

	#define LOAD_abcdefghi()                                                               \
		LOAD_abcdefgh();                                                                   \
		I = ops->bytes[ctx->pc++];

	#define LOAD_abcdefghij()                                                              \
		LOAD_abcdefgh();                                                                   \
		I = ops->bytes[ctx->pc++]; J = ops->bytes[ctx->pc++];

	#define INLINE_UNOP(func, erop)                                                        \
		LOAD_abcd();                                                                       \
		var_set(ctx, A, B, opi_unop(ctx, var_get(ctx, C, D), func, erop));                 \
		if (ctx->failed)                                                                   \
			return SINK_RUN_FAIL;

	#define INLINE_BINOP_T(func, erop, t1, t2)                                             \
		LOAD_abcdef();                                                                     \
		var_set(ctx, A, B,                                                                 \
			opi_binop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), func, erop, t1, t2));   \
		if (ctx->failed)                                                                   \
			return SINK_RUN_FAIL;

	#define INLINE_BINOP(func, erop) INLINE_BINOP_T(func, erop, LT_ALLOWNUM, LT_ALLOWNUM)

	#define INLINE_TRIOP(func, erop)                                                       \
		LOAD_abcdefgh();                                                                   \
		var_set(ctx, A, B,                                                                 \
			opi_triop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), var_get(ctx, G, H),     \
				func, erop));                                                              \
		if (ctx->failed)                                                                   \
			return SINK_RUN_FAIL;

	#define RETURN_FAIL(msg)   do{           \
			opi_abortcstr(ctx, msg);         \
			return SINK_RUN_FAIL;            \
		} while(false)

	while (ctx->pc < ops->size){
		ctx->lastpc = ctx->pc;
		switch ((op_enum)ops->bytes[ctx->pc]){
			case OP_NOP            : { //
				ctx->pc++;
			} break;

			case OP_MOVE           : { // [TGT], [SRC]
				LOAD_abcd();
				var_set(ctx, A, B, var_get(ctx, C, D));
			} break;

			case OP_INC            : { // [TGT/SRC]
				LOAD_ab();
				X = var_get(ctx, A, B);
				if (!sink_isnum(X))
					RETURN_FAIL("Expecting number when incrementing");
				var_set(ctx, A, B, sink_num(X.f + 1));
			} break;

			case OP_NIL            : { // [TGT]
				LOAD_ab();
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_NUMP8          : { // [TGT], VALUE
				LOAD_abc();
				var_set(ctx, A, B, sink_num(C));
			} break;

			case OP_NUMN8          : { // [TGT], VALUE
				LOAD_abc();
				var_set(ctx, A, B, sink_num(C - 256));
			} break;

			case OP_NUMP16         : { // [TGT], [VALUE]
				LOAD_abcd();
				var_set(ctx, A, B, sink_num(C | (D << 8)));
			} break;

			case OP_NUMN16         : { // [TGT], [VALUE]
				LOAD_abcd();
				var_set(ctx, A, B, sink_num((C | (D << 8)) - 65536));
			} break;

			case OP_NUMP32         : { // [TGT], [[VALUE]]
				LOAD_abcdef();
				var_set(ctx, A, B, sink_num(
					((uint32_t)C) | (((uint32_t)D) << 8) |
					(((uint32_t)E) << 16) | (((uint32_t)F) << 24)
				));
			} break;

			case OP_NUMN32         : { // [TGT], [[VALUE]]
				LOAD_abcdef();
				var_set(ctx, A, B, sink_num(
					(double)(((uint32_t)C) | (((uint32_t)D) << 8) |
					(((uint32_t)E) << 16) | (((uint32_t)F) << 24)) - 4294967296.0
				));
			} break;

			case OP_NUMDBL         : { // [TGT], [[[VALUE]]]
				LOAD_abcdefghij();
				X.u = ((uint64_t)C) |
					(((uint64_t)D) << 8) |
					(((uint64_t)E) << 16) |
					(((uint64_t)F) << 24) |
					(((uint64_t)G) << 32) |
					(((uint64_t)H) << 40) |
					(((uint64_t)I) << 48) |
					(((uint64_t)J) << 56);
				if (isnan(X.f)) // make sure no screwy NaN's come in
					X = sink_num_nan();
				var_set(ctx, A, B, X);
			} break;

			case OP_STR            : { // [TGT], [INDEX]
				LOAD_abcd();
				C = C | (D << 8);
				if (ctx->prg->repl){
					list_byte s = ctx->prg->strTable->ptrs[C];
					var_set(ctx, A, B, sink_str_newblob(ctx, s->size, s->bytes));
				}
				else
					var_set(ctx, A, B, (sink_val){ .u = SINK_TAG_STR | C });
			} break;

			case OP_LIST           : { // [TGT], HINT
				LOAD_abc();
				if (C <= 0)
					var_set(ctx, A, B, sink_list_newblob(ctx, 0, NULL));
				else{
					var_set(ctx, A, B,
						sink_list_newblobgive(ctx, 0, C, mem_alloc(sizeof(sink_val) * C)));
				}
			} break;

			case OP_ISNUM          : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isnum(X)));
			} break;

			case OP_ISSTR          : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isstr(X)));
			} break;

			case OP_ISLIST         : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_islist(X)));
			} break;

			case OP_NOT            : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, sink_bool(sink_isfalse(X)));
			} break;

			case OP_SIZE           : { // [TGT], [SRC]
				LOAD_abcd();
				var_set(ctx, A, B, sink_num(opi_size(ctx, var_get(ctx, C, D))));
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_TONUM          : { // [TGT], [SRC]
				LOAD_abcd();
				var_set(ctx, A, B, opi_tonum(ctx, var_get(ctx, C, D)));
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_CAT            : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				bool listcat = C > 0;
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
					if (!sink_islist(p[D]))
						listcat = false;
				}
				if (listcat)
					var_set(ctx, A, B, opi_list_cat(ctx, C, p));
				else{
					var_set(ctx, A, B, opi_str_cat(ctx, C, p));
					if (ctx->failed)
						return SINK_RUN_FAIL;
				}
			} break;

			case OP_LT             : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isstr(X) && sink_isstr(Y)){
					if (X.u == Y.u)
						var_set(ctx, A, B, sink_bool(false));
					else{
						var_set(ctx, A, B,
							sink_bool(str_cmp(var_caststr(ctx, X), var_caststr(ctx, Y)) < 0));
					}
				}
				else if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X.f < Y.f));
				else
					RETURN_FAIL("Expecting numbers or strings");
			} break;

			case OP_LTE            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isstr(X) && sink_isstr(Y)){
					if (X.u == Y.u)
						var_set(ctx, A, B, sink_bool(true));
					else{
						var_set(ctx, A, B,
							sink_bool(str_cmp(var_caststr(ctx, X), var_caststr(ctx, Y)) <= 0));
					}
				}
				else if (sink_isnum(X) && sink_isnum(Y))
					var_set(ctx, A, B, sink_bool(X.f <= Y.f));
				else
					RETURN_FAIL("Expecting numbers or strings");
			} break;

			case OP_NEQ            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(!opi_equ(ctx, X, Y)));
			} break;

			case OP_EQU            : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_bool(opi_equ(ctx, X, Y)));
			} break;

			case OP_GETAT          : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
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
				LOAD_abcdefgh();
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
				LOAD_abcdef();
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
				LOAD_abcdefgh();
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
					return SINK_RUN_REPLMORE;
				}
				ctx->pc = A;
			} break;

			case OP_JUMPTRUE       : { // [SRC], [[LOCATION]]
				LOAD_abcdef();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (!sink_isnil(var_get(ctx, A, B))){
					if (ctx->prg->repl && C == -1){
						ctx->pc -= 7;
						return SINK_RUN_REPLMORE;
					}
					ctx->pc = C;
				}
			} break;

			case OP_JUMPFALSE      : { // [SRC], [[LOCATION]]
				LOAD_abcdef();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (sink_isnil(var_get(ctx, A, B))){
					if (ctx->prg->repl && C == -1){
						ctx->pc -= 7;
						return SINK_RUN_REPLMORE;
					}
					ctx->pc = C;
				}
			} break;

			case OP_CMDTAIL        : { //
				ccs s = list_ptr_pop(ctx->call_stk);
				lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
				ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
				lxs_release(ctx, lx);
				ctx->lex_index = s->lex_index;
				var_set(ctx, s->frame, s->index, SINK_NIL);
				ctx->pc = s->pc;
				ccs_release(ctx, s);
			} break;

			case OP_CALL           : { // [TGT], [[LOCATION]], ARGCOUNT, [ARGS]...
				LOAD_abcdefg();
				C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
				if (C == -1){
					ctx->pc -= 8;
					return SINK_RUN_REPLMORE;
				}
				for (I = 0; I < G; I++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[I] = var_get(ctx, E, F);
				}
				list_ptr_push(ctx->call_stk, ccs_get(ctx, ctx->pc, A, B, ctx->lex_index));
				ctx->pc = C - 1;
				LOAD_abc();
				// A is OP_CMDHEAD
				if (C != 0xFF){
					if (G <= C){
						while (G < C)
							p[G++] = SINK_NIL;
						p[G] = sink_list_newblob(ctx, 0, NULL);
					}
					else
						p[C] = sink_list_newblob(ctx, G - C, &p[C]);
					G = C + 1;
				}
				ctx->lex_index = B;
				while (ctx->lex_index >= ctx->lex_stk->size)
					list_ptr_push(ctx->lex_stk, NULL);
				ctx->lex_stk->ptrs[ctx->lex_index] =
					lxs_get(ctx, G, p, ctx->lex_stk->ptrs[ctx->lex_index]);
			} break;

			case OP_NATIVE         : { // [TGT], [INDEX], ARGCOUNT, [ARGS]...
				LOAD_abcde();
				for (I = 0; I < E; I++){
					G = ops->bytes[ctx->pc++]; H = ops->bytes[ctx->pc++];
					p[I] = var_get(ctx, G, H);
				}
				C = C | (D << 8);
				uint64_t hash = ctx->prg->keyTable->vals[C];
				for (int i = 0; i < ctx->natives->size; i++){
					native nat = ctx->natives->ptrs[i];
					if (nat->hash == hash){
						X = nat->f_native(ctx, E, p, nat->natuser);
						if (ctx->failed)
							return SINK_RUN_FAIL;
						if (sink_isasync(X)){
							ctx->async_frame = A;
							ctx->async_index = B;
							ctx->timeout_left = ctx->timeout;
							ctx->async = true;
							return SINK_RUN_ASYNC;
						}
						else{
							var_set(ctx, A, B, X);
							break;
						}
					}
				}
			} break;

			case OP_RETURN         : { // [SRC]
				if (ctx->call_stk->size <= 0)
					return opi_exit(ctx);
				LOAD_ab();
				X = var_get(ctx, A, B);
				ccs s = list_ptr_pop(ctx->call_stk);
				lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
				ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
				lxs_release(ctx, lx);
				ctx->lex_index = s->lex_index;
				var_set(ctx, s->frame, s->index, X);
				ctx->pc = s->pc;
				ccs_release(ctx, s);
			} break;

			case OP_RETURNTAIL     : { // [[LOCATION]], ARGCOUNT, [ARGS]...
				LOAD_abcde();
				A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
				if (A == -1){
					ctx->pc -= 6;
					return SINK_RUN_REPLMORE;
				}
				for (I = 0; I < E; I++){
					G = ops->bytes[ctx->pc++]; H = ops->bytes[ctx->pc++];
					p[I] = var_get(ctx, G, H);
				}
				ctx->pc = A - 1;
				LOAD_abc();
				if (C != 0xFF){
					if (E <= C){
						while (E < C)
							p[E++] = SINK_NIL;
						p[E] = sink_list_newblob(ctx, 0, NULL);
					}
					else
						p[C] = sink_list_newblob(ctx, E - C, &p[C]);
					E = C + 1;
				}
				lxs lx = ctx->lex_stk->ptrs[ctx->lex_index];
				ctx->lex_stk->ptrs[ctx->lex_index] = lx->next;
				lxs_release(ctx, lx);
				ctx->lex_stk->ptrs[ctx->lex_index] =
					lxs_get(ctx, E, p, ctx->lex_stk->ptrs[ctx->lex_index]);
			} break;

			case OP_RANGE          : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
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

			case OP_ORDER          : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, sink_num(opi_order(ctx, X, Y)));
			} break;

			case OP_SAY            : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				opi_say(ctx, C, p);
				var_set(ctx, A, B, SINK_NIL);
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_WARN           : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				opi_warn(ctx, C, p);
				var_set(ctx, A, B, SINK_NIL);
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_ASK            : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				var_set(ctx, A, B, opi_ask(ctx, C, p));
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_EXIT           : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				if (C > 0){
					opi_say(ctx, C, p);
					if (ctx->failed)
						return SINK_RUN_FAIL;
				}
				return opi_exit(ctx);
			} break;

			case OP_ABORT          : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				char *err = NULL;
				if (C > 0)
					err = (char *)opi_list_joinplain(ctx, C, p, 1, (const uint8_t *)" ", &A);
				return opi_abort(ctx, err);
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

			case OP_NUM_MAX        : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				var_set(ctx, A, B, opi_num_max(ctx, C, p));
			} break;

			case OP_NUM_MIN        : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				var_set(ctx, A, B, opi_num_min(ctx, C, p));
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
				LOAD_ab();
				var_set(ctx, A, B, sink_num_nan());
			} break;

			case OP_NUM_INF        : { // [TGT]
				LOAD_ab();
				var_set(ctx, A, B, sink_num_inf());
			} break;

			case OP_NUM_ISNAN      : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_isnan, "testing if NaN")
			} break;

			case OP_NUM_ISFINITE   : { // [TGT], [SRC]
				INLINE_UNOP(unop_num_isfinite, "testing if finite")
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
				INLINE_BINOP_T(binop_num_hex, "converting to hex", LT_ALLOWNUM,
					LT_ALLOWNUM | LT_ALLOWNIL)
			} break;

			case OP_NUM_OCT        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP_T(binop_num_oct, "converting to oct", LT_ALLOWNUM,
					LT_ALLOWNUM | LT_ALLOWNIL)
			} break;

			case OP_NUM_BIN        : { // [TGT], [SRC1], [SRC2]
				INLINE_BINOP_T(binop_num_bin, "converting to bin", LT_ALLOWNUM,
					LT_ALLOWNUM | LT_ALLOWNIL)
			} break;

			case OP_INT_NEW        : { // [TGT], [SRC]
				INLINE_UNOP(unop_int_new, "casting to int")
			} break;

			case OP_INT_NOT        : { // [TGT], [SRC]
				INLINE_UNOP(unop_int_not, "NOTing")
			} break;

			case OP_INT_AND        : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				X = opi_combop(ctx, C, p, binop_int_and, "ANDing");
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_INT_OR         : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				X = opi_combop(ctx, C, p, binop_int_or, "ORing");
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_INT_XOR        : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				X = opi_combop(ctx, C, p, binop_int_xor, "XORing");
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
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
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (sink_isnil(X))
					X.f = 0;
				else if (!sink_isnum(X))
					RETURN_FAIL("Expecting number");
				opi_rand_seed(ctx, X.f);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_RAND_SEEDAUTO  : { // [TGT]
				LOAD_ab();
				opi_rand_seedauto(ctx);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_RAND_INT       : { // [TGT]
				LOAD_ab();
				var_set(ctx, A, B, sink_num(opi_rand_int(ctx)));
			} break;

			case OP_RAND_NUM       : { // [TGT]
				LOAD_ab();
				var_set(ctx, A, B, sink_num(opi_rand_num(ctx)));
			} break;

			case OP_RAND_GETSTATE  : { // [TGT]
				LOAD_ab();
				var_set(ctx, A, B, opi_rand_getstate(ctx));
			} break;

			case OP_RAND_SETSTATE  : { // [TGT], [SRC]
				LOAD_abcd();
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
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list");
				var_set(ctx, A, B, opi_rand_pick(ctx, X));
			} break;

			case OP_RAND_SHUFFLE   : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list");
				opi_rand_shuffle(ctx, X);
				var_set(ctx, A, B, X);
			} break;

			case OP_STR_NEW        : { // [TGT], ARGCOUNT, [ARGS]...
				LOAD_abc();
				for (D = 0; D < C; D++){
					E = ops->bytes[ctx->pc++]; F = ops->bytes[ctx->pc++];
					p[D] = var_get(ctx, E, F);
				}
				var_set(ctx, A, B, opi_str_new(ctx, C, p));
			} break;

			case OP_STR_SPLIT      : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_str_split(ctx, X, Y));
			} break;

			case OP_STR_REPLACE    : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				var_set(ctx, A, B, opi_str_replace(ctx, X, Y, Z));
			} break;

			case OP_STR_BEGINS     : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_str_begins(ctx, X, Y));
			} break;

			case OP_STR_ENDS       : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_str_ends(ctx, X, Y));
			} break;

			case OP_STR_PAD        : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnil(Y))
					Y.f = 0;
				else if (!sink_isnum(Y))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_pad(ctx, X, Y.f));
			} break;

			case OP_STR_FIND       : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (sink_isnil(Z))
					Z.f = 0;
				else if (!sink_isnum(Z))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_find(ctx, X, Y, Z.f));
			} break;

			case OP_STR_RFIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnil(Z) && !sink_isnum(Z))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_rfind(ctx, X, Y, Z));
			} break;

			case OP_STR_LOWER      : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_str_lower(ctx, X));
			} break;

			case OP_STR_UPPER      : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_str_upper(ctx, X));
			} break;

			case OP_STR_TRIM       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_str_trim(ctx, X));
			} break;

			case OP_STR_REV        : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_str_rev(ctx, X));
			} break;

			case OP_STR_REP        : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnil(Y))
					Y.f = 0;
				else if (!sink_isnum(Y))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_rep(ctx, X, Y.f));
			} break;

			case OP_STR_LIST       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_str_list(ctx, X));
			} break;

			case OP_STR_BYTE       : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnil(Y))
					Y.f = 0;
				else if (!sink_isnum(Y))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_byte(ctx, X, Y.f));
			} break;

			case OP_STR_HASH       : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (sink_isnil(Y))
					Y.f = 0;
				else if (!sink_isnum(Y))
					RETURN_FAIL("Expecting number");
				var_set(ctx, A, B, opi_str_hash(ctx, X, Y.f));
			} break;

			case OP_UTF8_VALID     : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_utf8_valid(ctx, X));
			} break;

			case OP_UTF8_LIST      : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_isstr(X))
					RETURN_FAIL("Expecting string");
				X = opi_utf8_list(ctx, X);
				if (sink_isnil(X))
					RETURN_FAIL("Invalid UTF-8 string");
				var_set(ctx, A, B, X);
			} break;

			case OP_UTF8_STR       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list");
				X = opi_utf8_str(ctx, X);
				if (sink_isnil(X))
					RETURN_FAIL("Invalid list of codepoints");
				var_set(ctx, A, B, X);
			} break;

			case OP_STRUCT_SIZE    : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				var_set(ctx, A, B, opi_struct_size(ctx, X));
			} break;

			case OP_STRUCT_STR     : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					RETURN_FAIL("Expecting list");
				X = opi_struct_str(ctx, X, Y);
				if (sink_isnil(X))
					RETURN_FAIL("Invalid conversion");
				var_set(ctx, A, B, X);
			} break;

			case OP_STRUCT_LIST    : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_isstr(X))
					RETURN_FAIL("Expecting string");
				if (!sink_islist(Y))
					RETURN_FAIL("Expecting list");
				X = opi_struct_list(ctx, X, Y);
				if (sink_isnil(X))
					RETURN_FAIL("Invalid conversion");
				var_set(ctx, A, B, X);
			} break;

			case OP_LIST_NEW       : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				if (!sink_isnil(X) && !sink_isnum(X))
					RETURN_FAIL("Expecting number for list.new");
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_list_new(ctx, X, Y));
			} break;

			case OP_LIST_SHIFT     : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when shifting");
				var_set(ctx, A, B, opi_list_shift(ctx, X));
			} break;

			case OP_LIST_POP       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when popping");
				var_set(ctx, A, B, opi_list_pop(ctx, X));
			} break;

			case OP_LIST_PUSH      : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when pushing");
				var_set(ctx, A, B, opi_list_push(ctx, X, var_get(ctx, E, F)));
			} break;

			case OP_LIST_UNSHIFT   : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list when unshifting");
				var_set(ctx, A, B, opi_list_unshift(ctx, X, var_get(ctx, E, F)));
			} break;

			case OP_LIST_APPEND    : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					RETURN_FAIL("Expecting list when appending");
				var_set(ctx, A, B, opi_list_append(ctx, X, Y));
			} break;

			case OP_LIST_PREPEND   : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				Y = var_get(ctx, E, F);
				if (!sink_islist(X) || !sink_islist(Y))
					RETURN_FAIL("Expecting list when prepending");
				var_set(ctx, A, B, opi_list_prepend(ctx, X, Y));
			} break;

			case OP_LIST_FIND      : { // [TGT], [SRC1], [SRC2], [SRC3]
				LOAD_abcdefgh();
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
				LOAD_abcdefgh();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.rfind");
				Y = var_get(ctx, E, F);
				Z = var_get(ctx, G, H);
				if (!sink_isnil(Z) && !sink_isnum(Z))
					RETURN_FAIL("Expecting number for list.rfind");
				var_set(ctx, A, B, opi_list_rfind(ctx, X, Y, Z));
			} break;

			case OP_LIST_JOIN      : { // [TGT], [SRC1], [SRC2]
				LOAD_abcdef();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.join");
				Y = var_get(ctx, E, F);
				var_set(ctx, A, B, opi_list_join(ctx, X, Y));
				if (ctx->failed)
					return SINK_RUN_FAIL;
			} break;

			case OP_LIST_REV       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.rev");
				var_set(ctx, A, B, opi_list_rev(ctx, X));
			} break;

			case OP_LIST_STR       : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.str");
				ls = var_castlist(ctx, X);
				uint8_t *bytes = mem_alloc(sizeof(uint8_t) * (ls->size + 1));
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
				bytes[ls->size] = 0;
				var_set(ctx, A, B, sink_str_newblobgive(ctx, ls->size, bytes));
			} break;

			case OP_LIST_SORT      : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.sort");
				opi_list_sort(ctx, X);
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_LIST_RSORT     : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_islist(X))
					RETURN_FAIL("Expecting list for list.sort");
				opi_list_rsort(ctx, X);
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_PICKLE_JSON    : { // [TGT], [SRC]
				LOAD_abcd();
				X = opi_pickle_json(ctx, var_get(ctx, C, D));
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_PICKLE_BIN     : { // [TGT], [SRC]
				LOAD_abcd();
				X = opi_pickle_bin(ctx, var_get(ctx, C, D));
				if (ctx->failed) // can fail in C impl because of SINK_TYPE_ASYNC
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_PICKLE_VAL     : { // [TGT], [SRC]
				LOAD_abcd();
				X = opi_pickle_val(ctx, var_get(ctx, C, D));
				if (ctx->failed)
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_PICKLE_VALID   : { // [TGT], [SRC]
				LOAD_abcd();
				E = opi_pickle_valid(ctx, var_get(ctx, C, D));
				var_set(ctx, A, B, E == 0 ? SINK_NIL : sink_num(E));
			} break;

			case OP_PICKLE_SIBLING : { // [TGT], [SRC]
				LOAD_abcd();
				var_set(ctx, A, B, sink_bool(opi_pickle_sibling(ctx, var_get(ctx, C, D))));
			} break;

			case OP_PICKLE_CIRCULAR: { // [TGT], [SRC]
				LOAD_abcd();
				var_set(ctx, A, B, sink_bool(opi_pickle_circular(ctx, var_get(ctx, C, D))));
			} break;

			case OP_PICKLE_COPY    : { // [TGT], [SRC]
				LOAD_abcd();
				X = opi_pickle_copy(ctx, var_get(ctx, C, D));
				if (ctx->failed) // can fail in C impl because of SINK_TYPE_ASYNC
					return SINK_RUN_FAIL;
				var_set(ctx, A, B, X);
			} break;

			case OP_GC_GETLEVEL    : { // [TGT]
				LOAD_ab();
				switch (ctx->gc_level){
					case SINK_GC_NONE:
						var_set(ctx, A, B, sink_str_newcstr(ctx, "none"));
						break;
					case SINK_GC_DEFAULT:
						var_set(ctx, A, B, sink_str_newcstr(ctx, "default"));
						break;
					case SINK_GC_LOWMEM:
						var_set(ctx, A, B, sink_str_newcstr(ctx, "lowmem"));
						break;
				}
			} break;

			case OP_GC_SETLEVEL    : { // [TGT], [SRC]
				LOAD_abcd();
				X = var_get(ctx, C, D);
				if (!sink_isstr(X))
					RETURN_FAIL("Expecting one of 'none', 'default', or 'lowmem'");
				str = var_caststr(ctx, X);
				if (strcmp((const char *)str->bytes, "none") == 0)
					ctx->gc_level = SINK_GC_NONE;
				else if (strcmp((const char *)str->bytes, "default") == 0){
					ctx->gc_level = SINK_GC_DEFAULT;
					context_gcleft(ctx, false);
				}
				else if (strcmp((const char *)str->bytes, "lowmem") == 0){
					ctx->gc_level = SINK_GC_LOWMEM;
					context_gcleft(ctx, false);
				}
				else
					RETURN_FAIL("Expecting one of 'none', 'default', or 'lowmem'");
				var_set(ctx, A, B, SINK_NIL);
			} break;

			case OP_GC_RUN         : { // [TGT]
				LOAD_ab();
				context_gc(ctx);
				var_set(ctx, A, B, SINK_NIL);
			} break;

			default: break;
		}
		if (ctx->gc_level != SINK_GC_NONE){
			ctx->gc_left--;
			if (ctx->gc_left <= 0)
				context_gc(ctx);
		}
		if (ctx->timeout > 0){
			ctx->timeout_left--;
			if (ctx->timeout_left <= 0){
				ctx->timeout_left = ctx->timeout;
				return SINK_RUN_TIMEOUT;
			}
		}
	}

	#undef LOAD_ab
	#undef LOAD_abc
	#undef LOAD_abcd
	#undef LOAD_abcde
	#undef LOAD_abcdef
	#undef LOAD_abcdefg
	#undef LOAD_abcdefgh
	#undef LOAD_abcdefghi
	#undef LOAD_abcdefghij
	#undef INLINE_UNOP
	#undef INLINE_BINOP
	#undef INLINE_TRIOP
	#undef RETURN_FAIL

	if (ctx->prg->repl)
		return SINK_RUN_REPLMORE;
	return opi_exit(ctx);
}

//
// file resolver
//

typedef bool (*f_fileres_begin_func)(const char *file, void *fuser);
typedef void (*f_fileres_end_func)(bool success, const char *file, void *fuser);

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
	int prev_len = (int)strlen(prev);
	int next_len = (int)strlen(next);
	int len = prev_len + next_len + 2;
	char *res = mem_alloc(sizeof(char) * len);
	int r = 0;
	pathjoin_helper(res, &r, prev_len, prev);
	pathjoin_helper(res, &r, next_len, next);
	res[r++] = 0;
	return res;
}

static bool fileres_try(sink_scr scr, sink_inc_st inc, const char *file, bool first,
	f_fileres_begin_func f_begin, f_fileres_end_func f_end, void *fuser){
	char *fix = (char *)file;
	bool freefix = false;
	if (inc.f_fixpath){
		fix = inc.f_fixpath(file, inc.user);
		freefix = true;
	}
	if (fix == NULL)
		return false;
	sink_fstype fst = inc.f_fstype(fix, inc.user);
	bool result = false;
	switch (fst){
		case SINK_FSTYPE_FILE: {
			result = true;
			if (f_begin(fix, fuser))
				f_end(inc.f_fsread(scr, fix, inc.user), fix, fuser);
		} break;
		case SINK_FSTYPE_NONE: {
			if (!first)
				break;
			// try adding a .sink extension
			int len = (int)strlen(file);
			if (len < 5 || strcmp(&file[len - 5], ".sink") != 0){
				char *cat = mem_alloc(sizeof(char) * (len + 6));
				memcpy(cat, file, sizeof(char) * len);
				cat[len + 0] = '.';
				cat[len + 1] = 's';
				cat[len + 2] = 'i';
				cat[len + 3] = 'n';
				cat[len + 4] = 'k';
				cat[len + 5] = 0;
				result = fileres_try(scr, inc, cat, false, f_begin, f_end, fuser);
				mem_free(cat);
			}
		} break;
		case SINK_FSTYPE_DIR: {
			if (!first)
				break;
			// try looking for index.sink inside the directory
			char *join = pathjoin(file, "index.sink");
			result = fileres_try(scr, inc, join, false, f_begin, f_end, fuser);
			mem_free(join);
		} break;
	}
	if (freefix)
		mem_free(fix);
	return result;
}

static bool fileres_read(sink_scr scr, sink_inc_st inc, const char *file, const char *cwd,
	list_ptr paths, f_fileres_begin_func f_begin, f_fileres_end_func f_end, void *fuser){
	// if an absolute path, there is no searching, so just try to read it directly
	if (file[0] == '/')
		return fileres_try(scr, inc, file, true, f_begin, f_end, fuser);
	// otherwise, we have a relative path, so we need to go through our search list
	for (int i = 0; i < paths->size; i++){
		char *path = paths->ptrs[i];
		char *join;
		if (path[0] == '/') // search path is absolute
			join = pathjoin(path, file);
		else{ // search path is relative
			if (cwd == NULL)
				continue;
			char *tmp = pathjoin(cwd, path);
			join = pathjoin(tmp, file);
			mem_free(tmp);
		}
		bool found = fileres_try(scr, inc, join, true, f_begin, f_end, fuser);
		mem_free(join);
		if (found)
			return true;
	}
	return false;
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
	list_byte type; // 0 = body, 1 = file
	list_ptr content;
} staticinc_st, *staticinc;

static inline staticinc staticinc_new(){
	staticinc sinc = mem_alloc(sizeof(staticinc_st));
	sinc->name = list_ptr_new(NULL);
	sinc->type = list_byte_new();
	sinc->content = list_ptr_new(NULL);
	return sinc;
}

static inline void staticinc_addbody(staticinc sinc, const char *name, const char *body){
	list_ptr_push(sinc->name, (void *)name);
	list_byte_push(sinc->type, 0);
	list_ptr_push(sinc->content, (void *)body);
}

static inline void staticinc_addfile(staticinc sinc, const char *name, const char *file){
	list_ptr_push(sinc->name, (void *)name);
	list_byte_push(sinc->type, 1);
	list_ptr_push(sinc->content, (void *)file);
}

static inline void staticinc_free(staticinc sinc){
	list_ptr_free(sinc->name);
	list_byte_free(sinc->type);
	list_ptr_free(sinc->content);
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

static inline void compiler_setmsg(compiler cmp, char *msg){
	if (cmp->msg)
		mem_free(cmp->msg);
	cmp->msg = msg;
}

static void compiler_reset(compiler cmp){
	compiler_setmsg(cmp, NULL);
	lex_reset(cmp->flpn->lx);
	parser_free(cmp->pr);
	cmp->pr = parser_new();

	list_ptr_free(cmp->flpn->tkflps);
	cmp->flpn->tkflps = list_ptr_new((free_func)tkflp_free);

	list_ptr_free(cmp->flpn->pgstate);
	cmp->flpn->pgstate = list_ptr_new((free_func)pgst_free);
}

static char *compiler_write(compiler cmp, int size, const uint8_t *bytes);
static char *compiler_closeLexer(compiler cmp);

static bool compiler_begininc(compiler cmp, list_ptr names, char *file){
	cmp->flpn = flpn_new(file, cmp->flpn);
	if (names){
		spn_st st = symtbl_pushNamespace(cmp->sym, names);
		if (st.type == SPN_ERROR){
			filepos_node del = cmp->flpn;
			cmp->flpn = cmp->flpn->next;
			flpn_free(del);
			compiler_setmsg(cmp, st.msg);
			return false;
		}
	}
	return true;
}

typedef struct {
	compiler cmp;
	list_ptr names;
} compiler_fileres_user_st, *compiler_fileres_user;

static bool compiler_begininc_cfu(const char *file, compiler_fileres_user cfu){
	return compiler_begininc(cfu->cmp, cfu->names, sink_format("%s", file));
}

static void compiler_endinc(compiler cmp, bool ns){
	if (ns)
		symtbl_popNamespace(cmp->sym);
	filepos_node del = cmp->flpn;
	cmp->flpn = cmp->flpn->next;
	flpn_free(del);
}

static void compiler_endinc_cfu(bool success, const char *file, compiler_fileres_user cfu){
	if (success)
		compiler_closeLexer(cfu->cmp);
	compiler_endinc(cfu->cmp, cfu->names != NULL);
	if (!success && cfu->cmp->msg == NULL)
		compiler_setmsg(cfu->cmp, sink_format("Failed to read file: %s", file));
}

static bool compiler_staticinc(compiler cmp, list_ptr names, const char *file, const char *body){
	if (!compiler_begininc(cmp, names, sink_format("%s", file)))
		return false;
	char *err = compiler_write(cmp, (int)strlen(body), (const uint8_t *)body);
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

static bool compiler_dynamicinc(compiler cmp, list_ptr names, const char *file, const char *from){
	compiler_fileres_user_st cfu;
	cfu.cmp = cmp;
	cfu.names = names;
	char *cwd = NULL;
	if (from)
		cwd = pathjoin(from, "..");
	bool res = fileres_read(cmp->scr, cmp->inc, file, cwd, cmp->paths,
		(f_fileres_begin_func)compiler_begininc_cfu, (f_fileres_end_func)compiler_endinc_cfu, &cfu);
	if (cwd)
		mem_free(cwd);
	return res;
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
					compiler_setmsg(cmp, filepos_err(tf->flp, tk->u.msg));
					tok_free(tk);
					list_ptr_free(stmts);
					return cmp->msg;
				}
				prr_st pp = parser_add(cmp->pr, tk, tf->flp, stmts);
				if (pp.type == PRR_ERROR){
					compiler_setmsg(cmp, filepos_err(tf->flp, pp.msg));
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
						if (strcmp(file, sinc_name) == 0){
							internal = true;
							const char *sinc_content = cmp->sinc->content->ptrs[i];
							bool is_body = cmp->sinc->type->bytes[i] == 0;
							bool success;
							if (is_body)
								success = compiler_staticinc(cmp, inc->names, file, sinc_content);
							else{
								success = compiler_dynamicinc(cmp, inc->names, sinc_content,
									stmt->flp.file);
								if (!success){
									compiler_setmsg(cmp,
										sink_format("Failed to include: %s", file));
								}
							}
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
							compiler_setmsg(cmp, sink_format("Failed to include: %s", file));
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
						compiler_setmsg(cmp, filepos_err(stmt->flp, pg.u.error.msg));
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
		compiler_setmsg(cmp, filepos_err(cmp->flpn->flp, pr.msg));
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
	char *curdir;
	char *file;
	char *err;
	sink_scr_type type;
	enum {
		SCM_UNKNOWN,
		SCM_BINARY,
		SCM_TEXT
	} mode;
};

sink_scr sink_scr_new(sink_inc_st inc, const char *curdir, sink_scr_type type){
	if (curdir != NULL && curdir[0] != '/')
		fprintf(stderr, "Warning: sink current directory \"%s\" is not an absolute path\n", curdir);
	script sc = mem_alloc(sizeof(script_st));
	sc->prg = program_new(type == SINK_SCR_REPL);
	sc->cmp = NULL;
	sc->sinc = staticinc_new();
	sc->cup = cleanup_new();
	sc->paths = list_ptr_new(mem_free_func);
	sc->inc = inc;
	sc->curdir = curdir ? sink_format("%s", curdir) : NULL;
	sc->file = NULL;
	sc->err = NULL;
	sc->type = type;
	sc->mode = SCM_UNKNOWN;
	return sc;

}

void sink_scr_addpath(sink_scr scr, const char *path){
	list_ptr_push(((script)scr)->paths, sink_format("%s", path));
}

void sink_scr_incbody(sink_scr scr, const char *name, const char *body){
	staticinc_addbody(((script)scr)->sinc, name, body);
}

void sink_scr_incfile(sink_scr scr, const char *name, const char *file){
	staticinc_addfile(((script)scr)->sinc, name, file);
}

int sink_scr_getinctype(sink_scr scr, const char *name){
	staticinc si = ((script)scr)->sinc;
	for (int i = 0; i < si->name->size; i++){
		if (strcmp(name, si->name->ptrs[i]) == 0)
			return si->type->bytes[i];
	}
	return -1;
}

const char *sink_scr_getinccontent(sink_scr scr, const char *name){
	staticinc si = ((script)scr)->sinc;
	for (int i = 0; i < si->name->size; i++){
		if (strcmp(name, si->name->ptrs[i]) == 0)
			return si->content->ptrs[i];
	}
	return NULL;
}

void sink_scr_cleanup(sink_scr scr, void *cuser, sink_free_func f_free){
	cleanup_add(((script)scr)->cup, cuser, f_free);
}

static bool sfr_begin(const char *file, script sc){
	if (sc->file){
		mem_free(sc->file);
		sc->file = NULL;
	}
	if (file)
		sc->file = sink_format("%s", file);
	return true;
}

static void sfr_end(bool success, const char *file, script sc){
	if (!success){
		if (sc->err)
			mem_free(sc->err);
		sc->err = sink_format("Error: %s", sc->cmp->msg);
	}
	else{
		char *err = compiler_close(sc->cmp);
		if (err){
			if (sc->err)
				mem_free(sc->err);
			sc->err = sink_format("Error: %s", err);
		}
	}
}

bool sink_scr_loadfile(sink_scr scr, const char *file){
	script sc = scr;
	if (sc->err){
		mem_free(sc->err);
		sc->err = NULL;
	}
	bool read = fileres_read(scr, sc->inc, file, sc->curdir, sc->paths,
		(f_fileres_begin_func)sfr_begin, (f_fileres_end_func)sfr_end, sc);
	if (!read && sc->err == NULL)
		sc->err = sink_format("Error: Failed to read file: %s", file);
	return sc->err == NULL;
}

const char *sink_scr_getfile(sink_scr scr){
	return ((script)scr)->file;
}

const char *sink_scr_getcwd(sink_scr scr){
	return ((script)scr)->curdir;
}

bool sink_scr_write(sink_scr scr, int size, const uint8_t *bytes){
	if (size <= 0)
		return true;
	script sc = scr;

	// sink binary files start with 0xFC (invalid UTF8 start byte), so we can tell if we're binary
	// just by looking at the first byte
	if (sc->mode == SCM_UNKNOWN){
		if (bytes[0] == 0xFC)
			sc->mode = SCM_BINARY;
		else{
			sc->mode = SCM_TEXT;
			sc->cmp = compiler_new(sc, sc->prg, sc->sinc, sc->inc,
				sc->file ? sink_format("%s", sc->file) : NULL, sc->paths);
		}
	}

	if (sc->mode == SCM_BINARY){
		fprintf(stderr, "TODO: read/write binary sink file\n");
		abort();
		return false;
	}
	else{
		if (sc->err){
			mem_free(sc->err);
			sc->err = NULL;
		}
		char *err = compiler_write(sc->cmp, size, bytes);
		if (err)
			sc->err = sink_format("Error: %s", err);
		if (err && sc->prg->repl)
			compiler_reset(sc->cmp);
		if (sc->type == SINK_SCR_EVAL){
			char *err2 = compiler_close(sc->cmp);
			if (err2){
				if (sc->err)
					mem_free(sc->err);
				sc->err = sink_format("Error: %s", err2);
			}
		}
		return sc->err == NULL;
	}
}

const char *sink_scr_err(sink_scr scr){
	return ((script)scr)->err;
}

void sink_scr_setpos(sink_scr scr, int line, int chr){
	script sc = scr;
	if (sc->mode != 2)
		return;
	sc->cmp->flpn->flp.line = line;
	sc->cmp->flpn->flp.chr = chr;
}

int sink_scr_level(sink_scr scr){
	if (((script)scr)->mode != 2)
		return 0;
	return ((script)scr)->cmp->pr->level;
}

void sink_scr_dump(sink_scr scr, bool debug, void *user, sink_dump_func f_dump){
	// all integer values are little endian

	// output header
	// 4 bytes: header: 0xFC, 'S', 'k', file format version (always 0x01)
	// 2 bytes: string table size
	// 2 bytes: key table size
	// 4 bytes: unique filename table size
	// 4 bytes: flp table size
	uint8_t header[16] = { 0xFC, 0x53, 0x6B, 0x01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
	list_int flpmap = NULL;
	program prg = ((script)scr)->prg;
	header[4] = (prg->strTable->size     ) & 0xFF;
	header[5] = (prg->strTable->size >> 8) & 0xFF;
	header[6] = (prg->keyTable->size     ) & 0xFF;
	header[7] = (prg->keyTable->size >> 8) & 0xFF;
	if (debug){
		// calculate unique filenames
		flpmap = list_int_new();
		for (int i = 0; i < prg->flpTable->size; i++){
			prgflp p = prg->flpTable->ptrs[i];
			bool found = false;
			int j;
			for (j = 0; j < flpmap->size && !found; j++){
				prgflp p2 = prg->flpTable->ptrs[j];
				found = strcmp(p->flp.file, p2->flp.file) == 0;
			}
			if (!found)
				list_int_push(flpmap, i); // maps i'th flpTable entry to the j'th unique file
		}
		header[ 8] = (flpmap->size      ) & 0xFF;
		header[ 9] = (flpmap->size >>  8) & 0xFF;
		header[10] = (flpmap->size >> 16) & 0xFF;
		header[11] = (flpmap->size >> 24) & 0xFF;
		header[12] = (prg->flpTable->size      ) & 0xFF;
		header[13] = (prg->flpTable->size >>  8) & 0xFF;
		header[14] = (prg->flpTable->size >> 16) & 0xFF;
		header[15] = (prg->flpTable->size >> 24) & 0xFF;
	}
	f_dump(header, 1, 16, user);

	// output strTable
	// 4 bytes: string size
	// N bytes: raw string bytes
	for (int i = 0; i < prg->strTable->size; i++){
		list_byte str = prg->strTable->ptrs[i];
		uint8_t sizeb[4] = {
			(str->size      ) & 0xFF,
			(str->size >>  8) & 0xFF,
			(str->size >> 16) & 0xFF,
			(str->size >> 24) & 0xFF
		};
		f_dump(sizeb, 1, 4, user);
		if (str->size > 0)
			f_dump(str->bytes, 1, str->size, user);
	}

	// output keyTable
	// 8 bytes: hash identifier
	for (int i = 0; i < prg->keyTable->size; i++){
		uint64_t id = prg->keyTable->vals[i];
		uint8_t idb[8] = {
			(id      ) & 0xFF,
			(id >>  8) & 0xFF,
			(id >> 16) & 0xFF,
			(id >> 24) & 0xFF,
			(id >> 32) & 0xFF,
			(id >> 40) & 0xFF,
			(id >> 48) & 0xFF,
			(id >> 56) & 0xFF
		};
		f_dump(idb, 1, 8, user);
	}

	if (debug){
		// output unique filenames
		// 4 bytes: filename length
		// N bytes: filename raw bytes
		for (int i = 0; i < flpmap->size; i++){
			prgflp p = prg->flpTable->ptrs[flpmap->vals[i]];
			size_t flen = p->flp.file == NULL ? 4 : strlen(p->flp.file);
			uint8_t flenb[4] = {
				(flen      ) & 0xFF,
				(flen >>  8) & 0xFF,
				(flen >> 16) & 0xFF,
				(flen >> 24) & 0xFF
			};
			f_dump(flenb, 1, 4, user);
			if (p->flp.file == NULL)
				f_dump("eval", 1, 4, user);
			else if (flen > 0)
				f_dump(p->flp.file, 1, flen, user);
		}

		// output flpTable
		// 4 bytes: start PC
		// 4 bytes: line number
		// 4 bytes: character number
		// 4 bytes: filename index
		for (int i = 0; i < prg->flpTable->size; i++){
			prgflp p = prg->flpTable->ptrs[i];
			// find unique filename entry
			int j;
			for (j = 0; j < flpmap->size; j++){
				prgflp p2 = prg->flpTable->ptrs[flpmap->vals[j]];
				if (p->flp.file == p2->flp.file ||
					(p->flp.file != NULL && p2->flp.file != NULL &&
						strcmp(p->flp.file, p2->flp.file) == 0))
					break;
			}
			uint8_t plcb[16] = {
				(p->pc            ) & 0xFF,
				(p->pc       >>  8) & 0xFF,
				(p->pc       >> 16) & 0xFF,
				(p->pc       >> 24) & 0xFF,
				(p->flp.line      ) & 0xFF,
				(p->flp.line >>  8) & 0xFF,
				(p->flp.line >> 16) & 0xFF,
				(p->flp.line >> 24) & 0xFF,
				(p->flp.chr       ) & 0xFF,
				(p->flp.chr  >>  8) & 0xFF,
				(p->flp.chr  >> 16) & 0xFF,
				(p->flp.chr  >> 24) & 0xFF,
				(j                ) & 0xFF,
				(j           >>  8) & 0xFF,
				(j           >> 16) & 0xFF,
				(j           >> 24) & 0xFF
			};
			f_dump(plcb, 1, 16, user);
		}
	}

	// output ops
	// just the raw bytecode
	if (prg->ops->size > 0)
		f_dump(prg->ops->bytes, 1, prg->ops->size, user);

	// output end
	// single 0xFD byte which is an invalid op
	uint8_t end = 0xFD;
	f_dump(&end, 1, 1, user);

	if (flpmap)
		list_int_free(flpmap);
}

void sink_scr_free(sink_scr scr){
	script sc = scr;
	list_ptr_free(sc->paths);
	program_free(sc->prg);
	staticinc_free(sc->sinc);
	cleanup_free(sc->cup);
	if (sc->cmp)
		compiler_free(sc->cmp);
	if (sc->curdir)
		mem_free(sc->curdir);
	if (sc->file)
		mem_free(sc->file);
	if (sc->err)
		mem_free(sc->err);
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

sink_ctx_status sink_ctx_getstatus(sink_ctx ctx){
	context ctx2 = ctx;
	if (ctx2->passed)
		return SINK_CTX_PASSED;
	else if (ctx2->failed)
		return SINK_CTX_FAILED;
	else if (ctx2->async)
		return SINK_CTX_WAITING;
	return SINK_CTX_READY;
}

void sink_ctx_native(sink_ctx ctx, const char *name, void *natuser, sink_native_func f_native){
	context_native(ctx, native_hash((int)strlen(name), (const uint8_t *)name), natuser, f_native);
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
	var_set(ctx2, ctx2->async_frame, ctx2->async_index, v);
	ctx2->async = false;
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
	context ctx2 = ctx;
	if (ctx2->prg->repl && ctx2->err){
		mem_free(ctx2->err);
		ctx2->err = NULL;
	}
	sink_run r = context_run(ctx2);
	if (r == SINK_RUN_PASS || r == SINK_RUN_FAIL)
		context_reset(ctx2);
	return r;
}

const char *sink_ctx_err(sink_ctx ctx){
	return ((context)ctx)->err;
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
	*str = var_caststr(ctx, args[index]);
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

static sink_str_st sinkhelp_tostr(context ctx, list_int li, sink_val v){
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
			char buf[64];
			int size;
			numtostr(v.f, buf, sizeof(buf), &size);
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
			int idx = var_index(v);
			if (list_int_has(li, idx)){
				uint8_t *bytes = mem_alloc(sizeof(uint8_t) * 11);
				bytes[0] = '{'; bytes[1] = 'c'; bytes[2] = 'i'; bytes[3] = 'r'; bytes[4] = 'c';
				bytes[5] = 'u'; bytes[6] = 'l'; bytes[7] = 'a'; bytes[8] = 'r'; bytes[9] = '}';
				bytes[10] = 0;
				return (sink_str_st){ .bytes = bytes, .size = 10 };
			}
			list_int_push(li, idx);
			sink_list ls = var_castlist(ctx, v);
			int tot = 2;
			sink_str_st *strs = mem_alloc(sizeof(sink_str_st) * ls->size);
			for (int i = 0; i < ls->size; i++){
				sink_str_st s = sinkhelp_tostr(ctx, li, ls->vals[i]);
				strs[i] = s;
				tot += (i == 0 ? 0 : 2) + s.size;
			}
			list_int_pop(li);
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
	list_int li = NULL;
	if (sink_islist(v))
		li = list_int_new();
	sink_str_st s = sinkhelp_tostr(ctx, li, v);
	if (li)
		list_int_free(li);
	return sink_str_newblobgive(ctx, s.size, s.bytes);
}

void sink_say(sink_ctx ctx, int size, sink_val *vals){
	opi_say(ctx, size, vals);
}

void sink_warn(sink_ctx ctx, int size, sink_val *vals){
	opi_warn(ctx, size, vals);
}

sink_val sink_ask(sink_ctx ctx, int size, sink_val *vals){
	return opi_ask(ctx, size, vals);
}

void sink_exit(sink_ctx ctx, int size, sink_val *vals){
	if (size > 0)
		sink_say(ctx, size, vals);
	opi_exit(ctx);
}

void sink_abort(sink_ctx ctx, int size, sink_val *vals){
	uint8_t *bytes = NULL;
	if (size > 0){
		int tot;
		bytes = opi_list_joinplain(ctx, size, vals, 1, (const uint8_t *)" ", &tot);
	}
	opi_abort(ctx, (char *)bytes);
}

sink_val sink_range(sink_ctx ctx, double start, double stop, double step){
	return opi_range(ctx, start, stop, step);
}

int sink_order(sink_ctx ctx, sink_val a, sink_val b){
	return opi_order(ctx, a, b);
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
	return sink_str_newblob(ctx, (int)strlen(str), (const uint8_t *)str);
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
		&ctx2->str_ref, sizeof(sink_str_st));
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
	return sink_str_newblobgive(ctx, (int)s, (uint8_t *)buf);
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

static inline void hash_le(int size, const uint8_t *str, uint32_t seed, uint32_t *out){
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

static inline void hash_be(int size, const uint8_t *str, uint32_t seed, uint32_t *out){
	// big-endian version of hash_le... annoyed I can't detect this with a macro at compile-time,
	// but oh well
	uint64_t nblocks = size >> 4;
	uint64_t h1 = seed;
	uint64_t h2 = seed;
	uint64_t c1 = UINT64_C(0x87C37B91114253D5);
	uint64_t c2 = UINT64_C(0x4CF5AD432745937F);

	for (uint64_t i = 0; i < nblocks; i++){
		uint64_t ki = i * 16;
		uint64_t k1 =
			((uint64_t)str[ki +  0]      ) |
			((uint64_t)str[ki +  1] <<  8) |
			((uint64_t)str[ki +  2] << 16) |
			((uint64_t)str[ki +  3] << 24) |
			((uint64_t)str[ki +  4] << 32) |
			((uint64_t)str[ki +  5] << 40) |
			((uint64_t)str[ki +  6] << 48) |
			((uint64_t)str[ki +  7] << 56);
		uint64_t k2 =
			((uint64_t)str[ki +  8]      ) |
			((uint64_t)str[ki +  9] <<  8) |
			((uint64_t)str[ki + 10] << 16) |
			((uint64_t)str[ki + 11] << 24) |
			((uint64_t)str[ki + 12] << 32) |
			((uint64_t)str[ki + 13] << 40) |
			((uint64_t)str[ki + 14] << 48) |
			((uint64_t)str[ki + 15] << 56);

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

void sink_str_hashplain(int size, const uint8_t *str, uint32_t seed, uint32_t *out){
	const uint_least16_t v = 1;
	const uint8_t *vp = (const uint8_t *)&v;
	if (*vp) // is this machine little-endian?
		hash_le(size, str, seed, out);
	else
		hash_be(size, str, seed, out);
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
	if (vals == NULL || count == 0){
		sink_abortcstr(ctx,
			"Native run-time error: sink_list_newblobgive() must be given a buffer with some "
			"positive count");
		if (vals)
			mem_free(vals);
		return SINK_NIL;
	}
	context ctx2 = ctx;
	int index = bmp_reserve((void **)&ctx2->list_tbl, &ctx2->list_size, &ctx2->list_aloc,
		&ctx2->list_ref, sizeof(sink_list_st));
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
static inline uint8_t *opi_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz,
	const uint8_t *sep, int *totv){
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
	*totv = tot;
	return bytes;
}

sink_val sink_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz, const uint8_t *sep){
	int tot;
	uint8_t *bytes = opi_list_joinplain(ctx, size, vals, sepz, sep, &tot);
	return sink_str_newblobgive(ctx, tot, bytes);
}
/*
void      sink_list_rev(sink_ctx ctx, sink_val ls);
sink_val  sink_list_str(sink_ctx ctx, sink_val ls);
void      sink_list_sort(sink_ctx ctx, sink_val ls);
void      sink_list_rsort(sink_ctx ctx, sink_val ls);
*/

// pickle
sink_val sink_pickle_json(sink_ctx ctx, sink_val a){
	return opi_pickle_json(ctx, a);
}

sink_val sink_pickle_bin(sink_ctx ctx, sink_val a){
	return opi_pickle_bin(ctx, a);
}

sink_val sink_pickle_val(sink_ctx ctx, sink_val a){
	return opi_pickle_val(ctx, a);
}

int sink_pickle_valid(sink_ctx ctx, sink_val a){
	return opi_pickle_valid(ctx, a);
}

bool sink_pickle_sibling(sink_ctx ctx, sink_val a){
	return opi_pickle_sibling(ctx, a);
}

bool sink_pickle_circular(sink_ctx ctx, sink_val a){
	return opi_pickle_circular(ctx, a);
}

sink_val sink_pickle_copy(sink_ctx ctx, sink_val a){
	return opi_pickle_copy(ctx, a);
}

bool sink_pickle_binstr(sink_ctx ctx, sink_val a, sink_str_st *out){
	return opi_pickle_binstr(ctx, a, out);
}

void sink_pickle_binstrfree(sink_str_st str){
	if (str.size >= 0 && str.bytes)
		mem_free(str.bytes);
}

bool sink_pickle_valstr(sink_ctx ctx, sink_str_st str, sink_val *out){
	return opi_pickle_valstr(ctx, &str, out);
}

void sink_gc_pin(sink_ctx ctx, sink_val v){
	context_gcpin((context)ctx, v);
}

void sink_gc_unpin(sink_ctx ctx, sink_val v){
	context_gcunpin((context)ctx, v);
}

sink_gc_level sink_gc_getlevel(sink_ctx ctx){
	return ((context)ctx)->gc_level;
}

void sink_gc_setlevel(sink_ctx ctx, sink_gc_level level){
	((context)ctx)->gc_level = level;
}

void sink_gc_run(sink_ctx ctx){
	context_gc((context)ctx);
}

sink_val sink_abortformat(sink_ctx ctx, const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = mem_alloc(s + 1);
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	opi_abort(ctx, buf);
	return SINK_NIL;
}
