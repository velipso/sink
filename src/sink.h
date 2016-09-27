// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#ifndef SINK__H
#define SINK__H

#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

// platform detection
#if !defined(SINK_WIN32) && !defined(SINK_IOS) && !defined(SINK_MACOSX) && !defined(SINK_POSIX)
#	ifdef _WIN32
#		define SINK_WIN32
#	elif __APPLE__
#		include "TargetConditionals.h"
#		if TARGET_IPHONE_SIMULATOR
#			define SINK_IOS
#		elif TARGET_OS_IPHONE
#			define SINK_IOS
#		elif TARGET_OS_MAC
#			define SINK_MACOSX
#		else
#			error "Unknown Apple platform"
#		endif
#	elif __linux__
#		define SINK_POSIX
#	elif __unix__
#		define SINK_POSIX
#	elif defined(_POSIX_VERSION)
#		define SINK_POSIX
#	else
#		error "Unknown compiler"
#	endif
#endif

#ifdef SINK_WIN32
#	define SINK_FILESEP      '\\'
#	define SINK_ISFILESEP(x) ((x) == '\\' || (x) == '/')
#	include <direct.h> // _getcwd
#	define getcwd _getcwd
#else
#	define SINK_FILESEP      '/'
#	define SINK_ISFILESEP(x) ((x) == '/')
#	include <unistd.h> // getcwd
#endif

#ifndef SINK_ALLOC
#	define SINK_ALLOC    malloc
#   define SINK_REALLOC  realloc
#	define SINK_FREE     free
#else
	void *SINK_ALLOC(size_t sz);
	void *SINK_REALLOC(void *ptr, size_t sz);
	void SINK_FREE(void *ptr);
#endif

#ifndef SINK_PANIC
#	define SINK_PANIC(msg)    do{ fprintf(stderr, "Panic: " msg "\n"); abort(); }while(false)
#endif

#if defined(SINK_INTDBG) && !defined(SINK_DEBUG)
#	define SINK_DEBUG
#endif

typedef enum {
	SINK_TYPE_NIL,
	SINK_TYPE_NUM,
	SINK_TYPE_STR,
	SINK_TYPE_LIST,
	SINK_TYPE_ASYNC // not used within sink; used for native functions to signal async results
} sink_type;

typedef union {
	uint64_t u;
	double f;
} sink_val;

typedef int sink_user;
typedef struct {
	sink_val *vals;
	void *user;
	int size; // how many elements are in the list
	int count; // how much total room is in *vals
	sink_user usertype;
} sink_list_st, *sink_list;

typedef struct {
	// `bytes` can be NULL for a size 0 string
	// otherwise, `bytes[size]` is guaranteed to be 0
	uint8_t *bytes;
	int size;
} sink_str_st, *sink_str;

typedef void *sink_scr;
typedef void *sink_ctx;

typedef void (*sink_output_func)(sink_ctx ctx, sink_str str);
typedef sink_val (*sink_input_func)(sink_ctx ctx, sink_str str);
typedef void (*sink_free_func)(void *user);
typedef sink_val (*sink_native_func)(sink_ctx ctx, void *nuser, int size, sink_val *args);
typedef sink_val (*sink_resume_func)(sink_ctx ctx);
typedef char *(*sink_resolve_func)(const char *file, const char *fromfile, void *user);
typedef bool (*sink_include_func)(sink_scr scr, const char *fullfile, void *user);
typedef size_t (*sink_dump_func)(const void *restrict ptr, size_t size, size_t nitems,
	void *restrict user);

typedef struct {
	sink_output_func f_say;
	sink_output_func f_warn;
	sink_input_func f_ask;
} sink_io_st;

typedef struct {
	sink_resolve_func f_resolve;
	sink_include_func f_include;
	void *user;
} sink_inc_st;

typedef enum {
	SINK_RUN_PASS,
	SINK_RUN_FAIL,
	SINK_RUN_ASYNC,
	SINK_RUN_TIMEOUT,
	SINK_RUN_REPLMORE,
	SINK_RUN_INVALID
} sink_run;

// Values are jammed into NaNs, like so:
//
// NaN (64 bit):
// 01111111 11111000 00000000 TTTTTTTT  0FFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF
//
// QNAN :  T = 0, F = 0
// NIL  :  T = 1, F = 0
// ASYNC:  T = 2, F = 0
// STR  :  T = 3, F = table index
// LIST :  T = 4, F = table index

static const sink_val SINK_QNAN       = { .u = UINT64_C(0x7FF8000000000000) };
static const sink_val SINK_NIL        = { .u = UINT64_C(0x7FF8000100000000) };
static const sink_val SINK_ASYNC      = { .u = UINT64_C(0x7FF8000200000000) };
static const uint64_t SINK_TAG_STR    =        UINT64_C(0x7FF8000300000000);
static const uint64_t SINK_TAG_LIST   =        UINT64_C(0x7FF8000400000000);
static const uint64_t SINK_TAG_MASK   =        UINT64_C(0xFFFFFFFF80000000);

// script
sink_scr    sink_scr_new(sink_inc_st inc, const char *fullfile, bool repl);
void        sink_scr_inc(sink_scr scr, const char *name, const char *body);
void        sink_scr_cleanup(sink_scr scr, void *cuser, sink_free_func f_free);
const char *sink_scr_write(sink_scr scr, int size, const uint8_t *bytes);
void        sink_scr_resetpos(sink_scr scr);
int         sink_scr_level(sink_scr scr);
const char *sink_scr_close(sink_scr scr);
void        sink_scr_dump(sink_scr scr, void *user, sink_dump_func f_dump);
void        sink_scr_free(sink_scr scr);

// context
sink_ctx       sink_ctx_new(sink_scr scr, sink_io_st io);
void           sink_ctx_native(sink_ctx ctx, const char *name, void *nuser,
	sink_native_func f_native);
void           sink_ctx_nativehash(sink_ctx ctx, uint64_t hash, void *nuser,
	sink_native_func f_native);
void           sink_ctx_cleanup(sink_ctx ctx, void *cuser, sink_free_func f_cleanup);
void           sink_ctx_setuser(sink_ctx ctx, void *user, sink_free_func f_free);
void *         sink_ctx_getuser(sink_ctx ctx);
sink_user      sink_ctx_addusertype(sink_ctx ctx, const char *hint, sink_free_func f_free);
sink_free_func sink_ctx_getuserfree(sink_ctx ctx, sink_user usertype);
const char *   sink_ctx_getuserhint(sink_ctx ctx, sink_user usertype);
void           sink_ctx_asyncresult(sink_ctx ctx, sink_val v);
bool           sink_ctx_ready(sink_ctx ctx);
void           sink_ctx_settimeout(sink_ctx ctx, int timeout);
int            sink_ctx_gettimeout(sink_ctx ctx);
void           sink_ctx_forcetimeout(sink_ctx ctx);
sink_run       sink_ctx_run(sink_ctx ctx);
void           sink_ctx_free(sink_ctx ctx);

// value
static inline sink_val sink_bool(bool f){ return f ? (sink_val){ .f = 1 } : SINK_NIL; }
static inline bool sink_istrue(sink_val v){ return v.u != SINK_NIL.u; }
static inline bool sink_isfalse(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_isnil(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_isasync(sink_val v){ return v.u == SINK_ASYNC.u; }
static inline bool sink_typestr(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_STR; }
static inline bool sink_typelist(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_LIST; }
static inline bool sink_typenum(sink_val v){
	return !sink_isnil(v) && !sink_isasync(v) && !sink_typestr(v) && !sink_typelist(v); }
static inline sink_type sink_typeof(sink_val v){
	if      (sink_isnil   (v)) return SINK_TYPE_NIL;
	else if (sink_isasync (v)) return SINK_TYPE_ASYNC;
	else if (sink_typestr (v)) return SINK_TYPE_STR;
	else if (sink_typelist(v)) return SINK_TYPE_LIST;
	else                       return SINK_TYPE_NUM;
}
static inline double sink_castnum(sink_val v){ return v.f; }
sink_str  sink_caststr(sink_ctx ctx, sink_val str);
sink_list sink_castlist(sink_ctx ctx, sink_val ls);

// argument helpers
bool sink_arg_bool(int size, sink_val *args, int index);
bool sink_arg_num(sink_ctx ctx, int size, sink_val *args, int index, double *num);
void sink_arg_str(sink_ctx ctx, int size, sink_val *args, int index, sink_str *str);
bool sink_arg_list(sink_ctx ctx, int size, sink_val *args, int index, sink_list *ls);
bool sink_arg_user(sink_ctx ctx, int size, sink_val *args, int index, sink_user usertype,
	void **user);

// globals
sink_val sink_tostr(sink_ctx ctx, sink_val v);
int      sink_size(sink_ctx ctx, sink_val v);
void     sink_say(sink_ctx ctx, int size, sink_val *vals);
void     sink_warn(sink_ctx ctx, int size, sink_val *vals);
sink_val sink_ask(sink_ctx ctx, int size, sink_val *vals);
void     sink_exit(sink_ctx ctx, int size, sink_val *vals);
void     sink_abort(sink_ctx ctx, int size, sink_val *vals);

// nil
static inline sink_val sink_nil(){ return SINK_NIL; }

// numbers
static inline sink_val sink_num(double v){ return (sink_val){ .f = v }; }
sink_val sink_num_neg(sink_ctx ctx, sink_val a);
sink_val sink_num_add(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_sub(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_mul(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_div(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_mod(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_pow(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_abs(sink_ctx ctx, sink_val a);
sink_val sink_num_sign(sink_ctx ctx, sink_val a);
sink_val sink_num_max(sink_ctx ctx, int size, sink_val *vals);
sink_val sink_num_min(sink_ctx ctx, int size, sink_val *vals);
sink_val sink_num_clamp(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val sink_num_floor(sink_ctx ctx, sink_val a);
sink_val sink_num_ceil(sink_ctx ctx, sink_val a);
sink_val sink_num_round(sink_ctx ctx, sink_val a);
sink_val sink_num_trunc(sink_ctx ctx, sink_val a);
static inline sink_val sink_num_nan(){ return SINK_QNAN; }
static inline sink_val sink_num_inf(){ return sink_num(INFINITY); }
static inline bool     sink_num_isnan(sink_val v){ return v.u == SINK_QNAN.u; }
static inline bool     sink_num_isfinite(sink_val v){ return isfinite(v.f); }
static inline sink_val sink_num_e(){ return sink_num(M_E); }
static inline sink_val sink_num_pi(){ return sink_num(M_PI); }
static inline sink_val sink_num_tau(){ return sink_num(M_PI * 2.0); }
sink_val sink_num_sin(sink_ctx ctx, sink_val a);
sink_val sink_num_cos(sink_ctx ctx, sink_val a);
sink_val sink_num_tan(sink_ctx ctx, sink_val a);
sink_val sink_num_asin(sink_ctx ctx, sink_val a);
sink_val sink_num_acos(sink_ctx ctx, sink_val a);
sink_val sink_num_atan(sink_ctx ctx, sink_val a);
sink_val sink_num_atan2(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_log(sink_ctx ctx, sink_val a);
sink_val sink_num_log2(sink_ctx ctx, sink_val a);
sink_val sink_num_log10(sink_ctx ctx, sink_val a);
sink_val sink_num_exp(sink_ctx ctx, sink_val a);
sink_val sink_num_lerp(sink_ctx ctx, sink_val a, sink_val b, sink_val t);
sink_val sink_num_hex(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_oct(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_num_bin(sink_ctx ctx, sink_val a, sink_val b);

// integers
sink_val sink_int_new(sink_ctx ctx, sink_val a);
sink_val sink_int_not(sink_ctx ctx, sink_val a);
sink_val sink_int_and(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_or(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_xor(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_shl(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_shr(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_sar(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_add(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_sub(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_mul(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_div(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_mod(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_int_clz(sink_ctx ctx, sink_val a);

// random
void     sink_rand_seed(sink_ctx ctx, sink_val a);
void     sink_rand_seedauto(sink_ctx ctx);
uint32_t sink_rand_int(sink_ctx ctx);
double   sink_rand_num(sink_ctx ctx);
sink_val sink_rand_getstate(sink_ctx ctx);
void     sink_rand_setstate(sink_ctx ctx, sink_val a);
sink_val sink_rand_pick(sink_ctx ctx, sink_val ls);
void     sink_rand_shuffle(sink_ctx ctx, sink_val ls);

// strings
sink_val sink_str_newcstr(sink_ctx ctx, const char *str);
sink_val sink_str_newblob(sink_ctx ctx, int size, const uint8_t *bytes);
sink_val sink_str_newblobgive(sink_ctx ctx, int size, uint8_t *bytes);
sink_val sink_str_newformat(sink_ctx ctx, const char *fmt, ...);
sink_val sink_str_new(sink_ctx ctx, int size, sink_val *vals);
sink_val sink_str_at(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_cat(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_tonum(sink_ctx ctx, sink_val a);
sink_val sink_str_slice(sink_ctx ctx, sink_val a, sink_val start, sink_val len);
sink_val sink_str_splice(sink_ctx ctx, sink_val a, sink_val start, sink_val len, sink_val d);
sink_val sink_str_split(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_replace(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
bool     sink_str_begins(sink_ctx ctx, sink_val a, sink_val b);
bool     sink_str_ends(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_pad(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_find(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val sink_str_rfind(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val sink_str_lower(sink_ctx ctx, sink_val a);
sink_val sink_str_upper(sink_ctx ctx, sink_val a);
sink_val sink_str_trim(sink_ctx ctx, sink_val a);
sink_val sink_str_rev(sink_ctx ctx, sink_val a);
sink_val sink_str_rep(sink_ctx ctx, sink_val a);
sink_val sink_str_list(sink_ctx ctx, sink_val a);
sink_val sink_str_byte(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_str_hash(sink_ctx ctx, sink_val a, sink_val b);
void     sink_str_hashplain(int size, const uint8_t *bytes, uint32_t seed, uint32_t *out);

// utf8
bool     sink_utf8_valid(sink_ctx ctx, sink_val a);
sink_val sink_utf8_list(sink_ctx ctx, sink_val a);
sink_val sink_utf8_str(sink_ctx ctx, sink_val a);

// structs
sink_val sink_struct_size(sink_ctx ctx, sink_val tpl);
sink_val sink_struct_str(sink_ctx ctx, sink_val ls, sink_val tpl);
sink_val sink_struct_list(sink_ctx ctx, sink_val a, sink_val tpl);

// lists
void     sink_list_setuser(sink_ctx ctx, sink_val ls, sink_user usertype, void *user);
void *   sink_list_getuser(sink_ctx ctx, sink_val ls, sink_user usertype);
sink_val sink_list_newblob(sink_ctx ctx, int size, const sink_val *vals);
sink_val sink_list_newblobgive(sink_ctx ctx, int size, int count, sink_val *vals);
sink_val sink_list_new(sink_ctx ctx, sink_val a, sink_val b);
sink_val sink_list_at(sink_ctx ctx, sink_val ls, sink_val b);
sink_val sink_list_cat(sink_ctx ctx, sink_val ls1, sink_val ls2);
sink_val sink_list_slice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len);
void     sink_list_splice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len, sink_val ls2);
sink_val sink_list_shift(sink_ctx ctx, sink_val ls);
sink_val sink_list_pop(sink_ctx ctx, sink_val ls);
void     sink_list_push(sink_ctx ctx, sink_val ls, sink_val a);
void     sink_list_unshift(sink_ctx ctx, sink_val ls, sink_val a);
void     sink_list_append(sink_ctx ctx, sink_val ls, sink_val ls2);
void     sink_list_prepend(sink_ctx ctx, sink_val ls, sink_val ls2);
sink_val sink_list_find(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val sink_list_rfind(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val sink_list_join(sink_ctx ctx, sink_val ls, sink_val a);
sink_val sink_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz, const uint8_t *sep);
void     sink_list_rev(sink_ctx ctx, sink_val ls);
sink_val sink_list_str(sink_ctx ctx, sink_val ls);
void     sink_list_sort(sink_ctx ctx, sink_val ls);
void     sink_list_rsort(sink_ctx ctx, sink_val ls);
sink_val sink_list_sortcmp(sink_ctx ctx, sink_val a, sink_val b);

// pickle
bool     sink_pickle_valid(sink_ctx ctx, sink_val a);
sink_val sink_pickle_str(sink_ctx ctx, sink_val a);
sink_val sink_pickle_val(sink_ctx ctx, sink_val a);

// gc
double sink_gc_get(sink_ctx ctx);
void   sink_gc_set(sink_ctx ctx, sink_val a);
void   sink_gc_run(sink_ctx ctx);

// helpers
char *sink_format(const char *fmt, ...);
sink_val sink_abortformat(sink_ctx ctx, const char *fmt, ...);

static inline sink_val sink_abortcstr(sink_ctx ctx, const char *msg){
	sink_val a = sink_str_newcstr(ctx, msg);
	sink_abort(ctx, 1, &a);
	return SINK_NIL;
}

static void sink_stdio_say(sink_ctx ctx, sink_str str){
	printf("%.*s\n", str->size, str->bytes);
}

static void sink_stdio_warn(sink_ctx ctx, sink_str str){
	fprintf(stderr, "%.*s\n", str->size, str->bytes);
}

static sink_val sink_stdio_ask(sink_ctx ctx, sink_str str){
	printf("%.*s", str->size, str->bytes);
	// TODO: implement default ask
	abort();
	return SINK_NIL;
}

static sink_io_st sink_stdio = (sink_io_st){
	.f_say = sink_stdio_say,
	.f_warn = sink_stdio_warn,
	.f_ask = sink_stdio_ask
};

static char *sink_stdinc_resolve(const char *file, const char *fromfile, void *user){
	// check for an absolute path
	#ifdef SINK_WIN32
		if (file[0] != 0 && (file[0] == '\\' || file[0] == '/' || file[1] == ':'))
			return sink_format("%s", file);
	#else
		if (file[0] == '/')
			return sink_format("%s", file);
	#endif

	char *cwd;
	int cwdlen;
	if (fromfile == NULL){
		char *cwd2 = getcwd(NULL, 0);
		if (cwd2 == NULL)
			return NULL;
		// make sure last character is a slash
		cwdlen = strlen(cwd2);
		if (cwdlen > 0 && SINK_ISFILESEP(cwd2[cwdlen - 1]))
			cwd = cwd2;
		else{
			cwd = malloc(sizeof(char) * (cwdlen + 2));
			if (cwd == NULL){
				free(cwd2);
				return NULL;
			}
			memcpy(cwd, cwd2, sizeof(char) * (cwdlen + 1));
			cwd[cwdlen++] = SINK_FILESEP;
			cwd[cwdlen] = 0;
			free(cwd2);
		}
	}
	else{
		cwdlen = strlen(fromfile);
		cwd = malloc(sizeof(char) * (cwdlen + 1));
		if (cwd == NULL)
			return NULL;
		memcpy(cwd, fromfile, sizeof(char) * (cwdlen + 1));
		// trim trailinig filename, making sure last character is a slash
		for (int i = cwdlen - 1; i >= 0; i--){
			if (SINK_ISFILESEP(cwd[i])){
				cwd[i + 1] = 0;
				cwdlen = i + 1;
				break;
			}
		}
	}

	int flen = strlen(file);
	int tot = cwdlen + flen;
	char *out = malloc(sizeof(char) * (tot + 1));
	memcpy(out, cwd, sizeof(char) * cwdlen);
	free(cwd);

	for (int i = 0; i < flen; i++){
		// check for './' and '../'
		if (file[i] == '.'){
			if (i < flen - 1){
				if (SINK_ISFILESEP(file[i + 1])){
					// './'
					i++;
					continue;
				}
				else if (file[i + 1] == '.' && i < flen - 2 && SINK_ISFILESEP(file[i + 2])){
					// '../'
					int j;
					for (j = cwdlen - 1; j >= 0; j--){
						if (!SINK_ISFILESEP(out[j]))
							break;
					}
					if (j < 0){
						i += 2;
						continue;
					}
					int prej = j;
					for (; j >= 0; j--){
						if (SINK_ISFILESEP(out[j]))
							break;
					}
					if (j < 0)
						cwdlen = prej + 2;
					else
						cwdlen = j + 1;
					i += 2;
					continue;
				}
			}
		}
		// otherwise, copy until we hit a slash
		while (!SINK_ISFILESEP(file[i]) && i < flen){
			out[cwdlen] = file[i];
			cwdlen++;
			i++;
		}
		if (i >= flen)
			break;
		out[cwdlen++] = SINK_FILESEP;
	}

	out[cwdlen] = 0;
	char *ret = sink_format("%s", out); // `f_resolve` must return a string created via sink_format
	free(out);
	return ret;
}

static bool sink_stdinc_include(sink_scr scr, const char *fullfile, void *user){
	abort();
	// TODO: this
	return false;
}

static sink_inc_st sink_stdinc = (sink_inc_st){
	.f_resolve = sink_stdinc_resolve,
	.f_include = sink_stdinc_include,
	.user = NULL
};

#endif // SINK__H
