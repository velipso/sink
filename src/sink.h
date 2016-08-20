// (c) Cyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
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
#	define SINK_ALLOC(s)      malloc(s)
#   define SINK_REALLOC(p, s) realloc(p, s)
#	define SINK_FREE(s)       free(s)
#endif

#ifndef SINK_PANIC
#	define SINK_PANIC(msg)    do{ fprintf(stderr, "Panic: " msg "\n"); abort(); }while(false)
#endif

#if defined(SINK_INTDBG) && !defined(SINK_DEBUG)
#	define SINK_DEBUG
#endif

typedef int sink_user;

typedef union {
	uint64_t u;
	double f;
} sink_val;

typedef struct {
	sink_val *vals;
	void *user;
	int size;
	int count;
	sink_user usertype;
} sink_list_st, *sink_list;

typedef struct {
	uint8_t *bytes;
	int size;
} sink_str_st, *sink_str, sink_bin_st, *sink_bin;

typedef void *sink_lib;
typedef void *sink_repl;
typedef void *sink_cmp;
typedef void *sink_prg;
typedef void *sink_ctx;

typedef void (*sink_output_func)(sink_ctx ctx, sink_str str);
typedef sink_val (*sink_input_func)(sink_ctx ctx, sink_str str);
typedef void (*sink_finalize_func)(void *user);
typedef sink_val (*sink_native_func)(sink_ctx ctx, sink_val args);
typedef char *(*sink_resolve_func)(const char *file, const char *fromfile);
typedef void (*sink_include_func)(sink_cmp cmp, const char *fullfile);

typedef struct {
	sink_output_func f_say;
	sink_output_func f_warn;
	sink_input_func f_ask;
} sink_io_st;

typedef struct {
	sink_resolve_func f_resolve;
	sink_include_func f_include;
} sink_inc_st;

// Values are jammed into NaNs, like so:
//
// NaN (64 bit):
// 01111111 11111000 00000000 TTTTTTTT  0FFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF
//
// QNAN:  T = 0, F = 0
// NIL :  T = 1, F = 0
// STR :  T = 2, F = table index
// LIST:  T = 3, F = table index

static const sink_val SINK_QNAN       = { .u = UINT64_C(0x7FF8000000000000) };
static const sink_val SINK_NIL        = { .u = UINT64_C(0x7FF8000100000000) };
static const uint64_t SINK_TAG_STR    =        UINT64_C(0x7FF8000200000000);
static const uint64_t SINK_TAG_LIST   =        UINT64_C(0x7FF8000300000000);
static const uint64_t SINK_TAG_MASK   =        UINT64_C(0xFFFFFFFF80000000);

// native library
sink_lib  sink_lib_new();
void      sink_lib_add(sink_lib lib, const char *name, sink_native_func f_native);
void      sink_lib_addhash(sink_lib lib, uint64_t hash, sink_native_func f_native);
void      sink_lib_addlib(sink_lib lib, sink_lib src);
void      sink_lib_free(sink_lib lib);

// repl
sink_repl sink_repl_new(sink_lib lib, sink_io_st io, sink_inc_st inc);
char *    sink_repl_write(sink_repl repl, uint8_t *bytes, int size);
int       sink_repl_level(sink_repl repl);
void      sink_repl_reset(sink_repl repl);
void      sink_repl_free(sink_repl repl);

// compiler
sink_cmp  sink_cmp_new(const char *file, sink_inc_st inc);
char *    sink_cmp_write(sink_cmp cmp, uint8_t *bytes, int size);
char *    sink_cmp_close(sink_cmp cmp);
sink_bin  sink_cmp_getbin(sink_cmp cmp);
sink_prg  sink_cmp_getprg(sink_cmp cmp);
void      sink_cmp_free(sink_cmp cmp);

// program
sink_prg  sink_prg_load(uint8_t *bytes, int size);
void      sink_prg_free(sink_prg prg);

// binary
void      sink_bin_free(sink_bin bin);

// context
sink_ctx  sink_ctx_new(sink_lib lib, sink_prg prg, sink_io_st io);
sink_user sink_ctx_usertype(sink_ctx ctx, sink_finalize_func f_finalize);
bool      sink_ctx_run(sink_ctx ctx);
void      sink_ctx_gc(sink_ctx ctx);
void      sink_ctx_say(sink_ctx ctx, sink_val *vals, int size);
void      sink_ctx_warn(sink_ctx ctx, sink_val *vals, int size);
sink_val  sink_ctx_ask(sink_ctx ctx, sink_val *vals, int size);
void      sink_ctx_exit(sink_ctx ctx, sink_val *vals, int size);
void      sink_ctx_abort(sink_ctx ctx, sink_val *vals, int size);
void      sink_ctx_free(sink_ctx ctx);

// value
static inline sink_val sink_bool(bool f){ return f ? (sink_val){ .f = 1 } : SINK_NIL; }
static inline bool sink_istrue(sink_val v){ return v.u != SINK_NIL.u; }
static inline bool sink_isfalse(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_isnil(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_typestr(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_STR; }
static inline bool sink_typelist(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_LIST; }
static inline bool sink_typenum(sink_val v){
	return !sink_isnil(v) && !sink_typelist(v) && !sink_typestr(v); }
sink_val  sink_tostr(sink_ctx ctx, sink_val v);
static inline double sink_castnum(sink_val v){ return v.f; }
sink_str  sink_caststr(sink_ctx ctx, sink_val str);
sink_list sink_castlist(sink_ctx ctx, sink_val ls);

// nil
static inline sink_val sink_nil(){ return SINK_NIL; }

// numbers
static inline sink_val sink_num(double v){ return ((sink_val){ .f = v }); }
sink_val  sink_num_neg(sink_ctx ctx, sink_val a);
sink_val  sink_num_add(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_sub(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_mul(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_div(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_mod(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_pow(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_num_abs(sink_ctx ctx, sink_val a);
sink_val  sink_num_sign(sink_ctx ctx, sink_val a);
sink_val  sink_num_max(sink_ctx ctx, sink_val *vals, int size);
sink_val  sink_num_min(sink_ctx ctx, sink_val *vals, int size);
sink_val  sink_num_clamp(sink_ctx ctx, sink_val a, sink_val b, sink_val c);
sink_val  sink_num_floor(sink_ctx ctx, sink_val a);
sink_val  sink_num_ceil(sink_ctx ctx, sink_val a);
sink_val  sink_num_round(sink_ctx ctx, sink_val a);
sink_val  sink_num_trunc(sink_ctx ctx, sink_val a);
static inline sink_val sink_num_nan(){ return SINK_QNAN; }
static inline sink_val sink_num_inf(){ return sink_num(INFINITY); }
static inline bool     sink_num_isnan(sink_val v){ return v.u == SINK_QNAN.u; }
static inline bool     sink_num_isfinite(sink_val v){ return isfinite(v.f); }
static inline sink_val sink_num_e(){ return sink_num(M_E); }
static inline sink_val sink_num_pi(){ return sink_num(M_PI); }
static inline sink_val sink_num_tau(){ return sink_num(M_PI * 2.0); }
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

// strings
sink_val  sink_str_newcstr(sink_ctx ctx, const char *str);
sink_val  sink_str_newblob(sink_ctx ctx, const uint8_t *bytes, int size);
sink_val  sink_str_newblobgive(sink_ctx ctx, uint8_t *bytes, int size);
sink_val  sink_str_new(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_cat(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_str_tonum(sink_ctx ctx, sink_val a);
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
void      sink_str_hashplain(const uint8_t *bytes, int size, uint32_t seed, uint32_t *out);

// utf8
bool      sink_utf8_valid(sink_ctx ctx, sink_val a);
sink_val  sink_utf8_list(sink_ctx ctx, sink_val a);
sink_val  sink_utf8_str(sink_ctx ctx, sink_val a);

// structs
sink_val  sink_struct_size(sink_ctx ctx, sink_val tpl);
sink_val  sink_struct_str(sink_ctx ctx, sink_val ls, sink_val tpl);
sink_val  sink_struct_list(sink_ctx ctx, sink_val a, sink_val tpl);

// lists
void      sink_list_setuser(sink_ctx ctx, sink_val ls, sink_user usertype, void *user);
void *    sink_list_getuser(sink_ctx ctx, sink_val ls, sink_user usertype);
sink_val  sink_list_newblob(sink_ctx ctx, const sink_val *vals, int size);
sink_val  sink_list_newblobgive(sink_ctx ctx, sink_val *vals, int size, int count);
sink_val  sink_list_new(sink_ctx ctx, sink_val a, sink_val b);
sink_val  sink_list_cat(sink_ctx ctx, sink_val ls1, sink_val ls2);
sink_val  sink_list_slice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len);
void      sink_list_splice(sink_ctx ctx, sink_val ls, sink_val start, sink_val len, sink_val ls2);
sink_val  sink_list_shift(sink_ctx ctx, sink_val ls);
sink_val  sink_list_pop(sink_ctx ctx, sink_val ls);
void      sink_list_push(sink_ctx ctx, sink_val ls, sink_val a);
void      sink_list_unshift(sink_ctx ctx, sink_val ls, sink_val a);
void      sink_list_append(sink_ctx ctx, sink_val ls, sink_val ls2);
void      sink_list_prepend(sink_ctx ctx, sink_val ls, sink_val ls2);
sink_val  sink_list_find(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val  sink_list_rfind(sink_ctx ctx, sink_val ls, sink_val a, sink_val b);
sink_val  sink_list_join(sink_ctx ctx, sink_val ls, sink_val a);
void      sink_list_rev(sink_ctx ctx, sink_val ls);
sink_val  sink_list_str(sink_ctx ctx, sink_val ls);
void      sink_list_sort(sink_ctx ctx, sink_val ls);
void      sink_list_rsort(sink_ctx ctx, sink_val ls);
sink_val  sink_list_sortcmp(sink_ctx ctx, sink_val a, sink_val b);

// pickle
bool      sink_pickle_valid(sink_ctx ctx, sink_val a);
sink_val  sink_pickle_str(sink_ctx ctx, sink_val a);
sink_val  sink_pickle_val(sink_ctx ctx, sink_val a);

// helpers
char *sink_format(const char *fmt, ...);

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

static char *sink_stdinc_resolve(const char *file, const char *fromfile){
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
	memcpy(out, cwd, sizeof(char) * (cwdlen + 1));
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
		while (!SINK_ISFILESEP(file[i])){
			out[cwdlen] = file[i];
			cwdlen++;
			i++;
		}
		out[cwdlen++] = SINK_FILESEP;
	}

	out[cwdlen] = 0;
	char *ret = sink_format("%s", out); // `f_resolve` must return a string created via sink_format
	free(out);
	return ret;
}

static void sink_stdinc_include(sink_cmp cmp, const char *fullfile){
	abort();
	// TODO: this
}

static sink_inc_st sink_stdinc = (sink_inc_st){
	.f_resolve = sink_stdinc_resolve,
	.f_include = sink_stdinc_include
};

#endif // SINK__H
