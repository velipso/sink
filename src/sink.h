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

typedef enum {
	SINK_FSTYPE_NONE,
	SINK_FSTYPE_FILE,
	SINK_FSTYPE_DIR
} sink_fstype;

typedef enum {
	SINK_GC_NONE,
	SINK_GC_DEFAULT,
	SINK_GC_LOWMEM
} sink_gc_level;

typedef void (*sink_output_func)(sink_ctx ctx, sink_str str, void *iouser);
typedef sink_val (*sink_input_func)(sink_ctx ctx, sink_str str, void *iouser);
typedef void (*sink_free_func)(void *user);
typedef sink_val (*sink_native_func)(sink_ctx ctx, int size, sink_val *args, void *natuser);
typedef sink_val (*sink_resume_func)(sink_ctx ctx);
typedef char *(*sink_fixpath_func)(const char *file, void *incuser);
typedef sink_fstype (*sink_fstype_func)(const char *file, void *incuser);
typedef bool (*sink_fsread_func)(sink_scr scr, const char *file, void *incuser);
typedef size_t (*sink_dump_func)(const void *restrict ptr, size_t size, size_t nitems,
	void *restrict user);

typedef struct {
	sink_output_func f_say;
	sink_output_func f_warn;
	sink_input_func f_ask;
	void *user; // passed as iouser to functions
} sink_io_st;

typedef struct {
	sink_fixpath_func f_fixpath;
	sink_fstype_func f_fstype;
	sink_fsread_func f_fsread;
	void *user; // passed as incuser to functions
} sink_inc_st;

typedef enum {
	SINK_RUN_PASS,
	SINK_RUN_FAIL,
	SINK_RUN_ASYNC,
	SINK_RUN_TIMEOUT,
	SINK_RUN_REPLMORE
} sink_run;

typedef enum {
	SINK_SCR_FILE,
	SINK_SCR_REPL,
	SINK_SCR_EVAL
} sink_scr_type;

typedef enum {
	SINK_CTX_READY,
	SINK_CTX_WAITING, // waiting for an async result
	SINK_CTX_PASSED,
	SINK_CTX_FAILED,
} sink_ctx_status;

// Values are jammed into sNaNs, like so:
//
// NaN (64 bit):
//  01111111 1111Q000 00000000 TTTTTTTT  0FFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF
//
// NAN  :  Q = 1, T = 0, F = 0
// NIL  :  Q = 0, T = 1, F = 0
// ASYNC:  Q = 0, T = 2, F = 0
// STR  :  Q = 0, T = 3, F = table index (31 bits)
// LIST :  Q = 0, T = 4, F = table index (31 bits)

static const sink_val SINK_NAN        = { .u = UINT64_C(0x7FF8000000000000) };
static const sink_val SINK_NIL        = { .u = UINT64_C(0x7FF0000100000000) };
static const sink_val SINK_ASYNC      = { .u = UINT64_C(0x7FF0000200000000) };
static const uint64_t SINK_TAG_STR    =        UINT64_C(0x7FF0000300000000);
static const uint64_t SINK_TAG_LIST   =        UINT64_C(0x7FF0000400000000);
static const uint64_t SINK_TAG_MASK   =        UINT64_C(0xFFFFFFFF80000000);
static const uint64_t SINK_NAN_MASK   =        UINT64_C(0x7FF8000000000000);

// script
// three kinds of scripts, each with different expectations:
//
// 1. SINK_SCR_FILE: script loaded from a file via the include system
//     sink_scr scr = sink_scr_new(inc, currentAbsoluteWorkingDirectory, SINK_SCR_FILE);
//     // intialize using `sink_scr_addpath`, `sink_scr_inc`, and `sink_scr_cleanup`
//     // note: `sink_scr_loadfile` will end up calling the file functions provided by `inc`, which
//     //   means the `f_fsread` function should call `sink_scr_write` with the file contents and
//     //   check for error at that point too
//     if (!sink_scr_loadfile(scr, "thefile")){
//         // the file failed to load
//         const char *err = sink_scr_err(scr);
//         fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
//         sink_scr_free(scr);
//         return;
//     }
//     // the resolved filename can be used via `sink_scr_getfile(scr)`
//     // if desired, use `sink_scr_dump` here to output the bytecode to a buffer
//     // or you can use `sink_ctx_run` to run the context associated with this scr
//     sink_scr_free(scr);
//
// 2. SINK_SCR_REPL: script is interactively entered via a REPL
//     sink_scr scr = sink_scr_new(inc, currentAbsoluteWorkingDirectory, SINK_SCR_REPL);
//     // intialize using `sink_scr_addpath`, `sink_scr_inc`, and `sink_scr_cleanup`
//     while (replLinesBeingEntered){
//         char buf[1000];
//         readinput(buf, sink_scr_level(scr)); // use `sink_scr_level` to detect nesting level
//         if (!sink_scr_write(scr, strlen(buf), (const uint8_t *)buf)){
//             // the line failed to compile
//             const char *err = sink_scr_err(scr);
//             fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
//             // don't worry, you can keep entering more REPL lines, the compiler fixes itself
//         }
//         if (sink_scr_level(scr) <= 0){
//             // if the level is <= 0 that means there is no nesting and an entire statement has
//             // been entered... so it's a good time to run the context via `sink_ctx_run` to
//             // advance the machine to the latest point
//         }
//     }
//     // it's not recommended to call `sink_scr_dump` to get the bytecode; this is REPL afterall
//     sink_scr_free(scr);
//
// 3. SINK_SCR_EVAL: script loaded via a buffer
//     sink_scr scr = sink_scr_new(inc, currentAbsoluteWorkingDirectory, SINK_SCR_EVAL);
//     // intialize using `sink_scr_addpath`, `sink_scr_inc`, and `sink_scr_cleanup`
//     if (!sink_scr_write(scr, rawBufferSize, rawBuffer)){
//         // the buffer failed to compile
//         const char *err = sink_scr_err(scr);
//         fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
//         sink_scr_free(scr);
//         return;
//     }
//     // if desired, use `sink_scr_dump` here to output the bytecode to a buffer
//     // or you can use `sink_ctx_run` to run the context associated with this scr
//     sink_scr_free(scr);
sink_scr    sink_scr_new(sink_inc_st inc, const char *curdir, sink_scr_type type);
void        sink_scr_addpath(sink_scr scr, const char *path);
void        sink_scr_incbody(sink_scr scr, const char *name, const char *body);
void        sink_scr_incfile(sink_scr scr, const char *name, const char *file);
int         sink_scr_getinctype(sink_scr scr, const char *name); // -1 not found, 0 body, 1 file
const char *sink_scr_getinccontent(sink_scr scr, const char *name);
void        sink_scr_cleanup(sink_scr scr, void *cuser, sink_free_func f_free);
bool        sink_scr_loadfile(sink_scr scr, const char *file);
const char *sink_scr_getfile(sink_scr scr);
const char *sink_scr_getcwd(sink_scr scr);
bool        sink_scr_write(sink_scr scr, int size, const uint8_t *bytes);
const char *sink_scr_err(sink_scr scr);
void        sink_scr_setpos(sink_scr scr, int line, int chr);
int         sink_scr_level(sink_scr scr);
void        sink_scr_dump(sink_scr scr, bool debug, void *user, sink_dump_func f_dump);
void        sink_scr_free(sink_scr scr);

// context
sink_ctx        sink_ctx_new(sink_scr scr, sink_io_st io);
sink_ctx_status sink_ctx_getstatus(sink_ctx ctx);
void            sink_ctx_native(sink_ctx ctx, const char *name, void *natuser,
	sink_native_func f_native);
void            sink_ctx_nativehash(sink_ctx ctx, uint64_t hash, void *natuser,
	sink_native_func f_native);
void            sink_ctx_cleanup(sink_ctx ctx, void *cuser, sink_free_func f_cleanup);
void            sink_ctx_setuser(sink_ctx ctx, void *user, sink_free_func f_free);
void *          sink_ctx_getuser(sink_ctx ctx);
sink_user       sink_ctx_addusertype(sink_ctx ctx, const char *hint, sink_free_func f_free);
sink_free_func  sink_ctx_getuserfree(sink_ctx ctx, sink_user usertype);
const char *    sink_ctx_getuserhint(sink_ctx ctx, sink_user usertype);
void            sink_ctx_asyncresult(sink_ctx ctx, sink_val v);
void            sink_ctx_settimeout(sink_ctx ctx, int timeout);
int             sink_ctx_gettimeout(sink_ctx ctx);
void            sink_ctx_forcetimeout(sink_ctx ctx);
sink_run        sink_ctx_run(sink_ctx ctx);
const char *    sink_ctx_err(sink_ctx ctx);
void            sink_ctx_free(sink_ctx ctx);

// value
static inline sink_val sink_bool(bool f){ return f ? (sink_val){ .f = 1 } : SINK_NIL; }
static inline bool sink_istrue(sink_val v){ return v.u != SINK_NIL.u; }
static inline bool sink_isfalse(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_isnil(sink_val v){ return v.u == SINK_NIL.u; }
static inline bool sink_isasync(sink_val v){ return v.u == SINK_ASYNC.u; }
static inline bool sink_isstr(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_STR; }
static inline bool sink_islist(sink_val v){ return (v.u & SINK_TAG_MASK) == SINK_TAG_LIST; }
static inline bool sink_isnum(sink_val v){
	return !sink_isnil(v) && !sink_isasync(v) && !sink_isstr(v) && !sink_islist(v); }
static inline sink_type sink_typeof(sink_val v){
	if      (sink_isnil  (v)) return SINK_TYPE_NIL;
	else if (sink_isasync(v)) return SINK_TYPE_ASYNC;
	else if (sink_isstr  (v)) return SINK_TYPE_STR;
	else if (sink_islist (v)) return SINK_TYPE_LIST;
	else                      return SINK_TYPE_NUM;
}
static inline double sink_castnum(sink_val v){ return v.f; }
sink_str  sink_caststr(sink_ctx ctx, sink_val str);
sink_list sink_castlist(sink_ctx ctx, sink_val ls);

// argument helpers
bool sink_arg_bool(int size, sink_val *args, int index);
bool sink_arg_num(sink_ctx ctx, int size, sink_val *args, int index, double *num);
bool sink_arg_str(sink_ctx ctx, int size, sink_val *args, int index, sink_str *str);
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
sink_val sink_range(sink_ctx ctx, double start, double stop, double step);
int      sink_order(sink_ctx ctx, sink_val a, sink_val b);

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
static inline sink_val sink_num_nan(){ return SINK_NAN; }
static inline sink_val sink_num_inf(){ return sink_num(INFINITY); }
static inline bool     sink_num_isnan(sink_val v){ return (v.u & SINK_NAN_MASK) == SINK_NAN_MASK; }
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

// user helper
static inline sink_val sink_user_new(sink_ctx ctx, sink_user usertype, void *user){
	sink_val hint = sink_str_newcstr(ctx, sink_ctx_getuserhint(ctx, usertype));
	sink_val ls = sink_list_newblob(ctx, 1, &hint);
	sink_list_setuser(ctx, ls, usertype, user);
	return ls;
}

static inline bool sink_isuser(sink_ctx ctx, sink_val v, sink_user usertype, void **user){
	if (!sink_islist(v))
		return false;
	sink_list ls = sink_castlist(ctx, v);
	if (ls->usertype != usertype)
		return false;
	if (user)
		*user = ls->user;
	return true;
}

// pickle
sink_val sink_pickle_json(sink_ctx ctx, sink_val a);
sink_val sink_pickle_bin(sink_ctx ctx, sink_val a);
sink_val sink_pickle_val(sink_ctx ctx, sink_val a);
int      sink_pickle_valid(sink_ctx ctx, sink_val a); // 0 for invalid, 1 for JSON, 2 for binary
bool     sink_pickle_sibling(sink_ctx ctx, sink_val a);
bool     sink_pickle_circular(sink_ctx ctx, sink_val a);
sink_val sink_pickle_copy(sink_ctx ctx, sink_val a);
// the following pickle functions can be used to marshal sink values between sink contexts, ex:
//   sink_str_st str;
//   // convert value into independant serialized buffer that exists without a sink context
//   if (!sink_pickle_binstr(ctx1, v1, &str)){
//     failed to pickle value; should never happen under normal use
//     abort();
//   }
//   // ...
//   // use str.size/str.bytes however you want, save to file, load from file, send across net, etc
//   // ...
//   // deserialize buffer into a value that can be passed around inside a different context
//   sink_val v2;
//   if (!sink_pickle_valstr(ctx2, str, &v2)){
//     failed to unpickle value; the buffer was corrupted..?
//   }
//   // don't forget to free the serialized buffer produced by sink_pickle_binstr once done
//   sink_pickle_binstrfree(str);
bool     sink_pickle_binstr(sink_ctx ctx, sink_val a, sink_str_st *out);
void     sink_pickle_binstrfree(sink_str_st str);
bool     sink_pickle_valstr(sink_ctx ctx, sink_str_st str, sink_val *out);

// gc
void          sink_gc_pin(sink_ctx ctx, sink_val v);   // prevent a value from being GC'ed
void          sink_gc_unpin(sink_ctx ctx, sink_val v); // remove a previous pin
sink_gc_level sink_gc_getlevel(sink_ctx ctx);
void          sink_gc_setlevel(sink_ctx ctx, sink_gc_level level);
void          sink_gc_run(sink_ctx ctx);

// helpers
char *sink_format(const char *fmt, ...);
sink_val sink_abortformat(sink_ctx ctx, const char *fmt, ...); // always returns SINK_NIL

static inline sink_val sink_abortcstr(sink_ctx ctx, const char *msg){
	sink_val a = sink_str_newcstr(ctx, msg);
	sink_abort(ctx, 1, &a);
	return SINK_NIL;
}

static void sink_stdio_say(sink_ctx ctx, sink_str str, void *iouser){
	printf("%.*s\n", str->size, str->bytes);
}

static void sink_stdio_warn(sink_ctx ctx, sink_str str, void *iouser){
	fprintf(stderr, "%.*s\n", str->size, str->bytes);
}

static sink_val sink_stdio_ask(sink_ctx ctx, sink_str str, void *iouser){
	printf("%.*s", str->size, str->bytes);
	char buf[1000];
	if (fgets(buf, sizeof(buf), stdin) == NULL)
		return SINK_NIL;
	int sz = strlen(buf);
	if (sz <= 0)
		return sink_str_newcstr(ctx, "");
	if (buf[sz - 1] == '\n')
		buf[--sz] = 0; // TODO: do I need to check for \r as well..? test on windows
	return sink_str_newblob(ctx, sz, (const uint8_t *)buf);
}

static sink_io_st sink_stdio = (sink_io_st){
	.f_say = sink_stdio_say,
	.f_warn = sink_stdio_warn,
	.f_ask = sink_stdio_ask,
	.user = NULL
};

static char *sink_win32_fixpath(const char *file, void *user){
	// Converts POSIX-style paths (exclusively used by sink during includes) into Windows paths
	//
	// Best docs I could find: https://msdn.microsoft.com/en-us/library/aa365247(v=vs.85).aspx
	//
	// The basic strategy is pretty simple:
	//   1. Prefix \\? to the string to force Windows to use extended-length paths
	//   2. Convert all forward slashes to back slashes
	//   3. Convert top level paths to drive letters (if single character letter)
	//
	// Examples:
	//   /c/test                  =>   \\?\c:\test
	//   /UNC/server/share/file   =>   \\?\UNC\server\share\file
	//   /foo/bar/baz             =>   \\?\foo\bar\baz
	//   /f/oo/bar/baz            =>   \\?\f:\oo\bar\baz
	//
	// Must return a string allocated with SINK_ALLOC, because caller will free via SINK_FREE

	int len = strlen(file);
	char *out = SINK_ALLOC(sizeof(char) * (len + 5));
	if (out == NULL){
		SINK_PANIC("Out of memory!");
		return NULL;
	}
	int j = 0;
	out[j++] = '\\';
	out[j++] = '\\';
	out[j++] = '?';
	for (int i = 0; i < len; i++){
		if (i == 2 && file[2] == '/' &&
			((file[1] >= 'a' && file[1] <= 'z') || (file[1] >= 'A' && file[1] <= 'Z')))
			out[j++] = ':';
		out[j++] = file[i] == '/' ? '\\' : file[i];
	}
	out[j++] = 0;
	return out;
}

static char *sink_win32_unfixpath(const char *file){
	// Converts a Windows path to a POSIX-style path (i.e., the reverse of `sink_win32_fixpath`)
	fprintf(stderr, "TODO: sink_win32_sinkpath\n");
	abort();
	return NULL;
}

#endif // SINK__H
