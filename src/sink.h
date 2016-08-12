// (c) Cyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#ifndef SINK__H
#define SINK__H

#include <stdint.h>
#include <stdbool.h>

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
#	include <stdlib.h>
#	define SINK_ALLOC(s)      malloc(s)
#   define SINK_REALLOC(p, s) realloc(p, s)
#	define SINK_FREE(s)       free(s)
#endif

#ifndef SINK_PANIC
#	include <stdlib.h>
#	include <stdio.h>
#	define SINK_PANIC(msg)    do{ fprintf(stderr, "Panic: %s\n", msg); abort(); }while(false)
#endif

#if defined(SINK_INTDBG) && !defined(SINK_DEBUG)
#	define SINK_DEBUG
#endif

typedef union {
	uint64_t u;
	double f;
} sink_val;

typedef struct {
	sink_val *vals;
	int size;
	int count;
} sink_list_st, *sink_list;

typedef struct {
	uint8_t *bytes;
	int size;
} sink_str_st, *sink_str;

typedef uintptr_t sink_ctx;

extern const sink_val SINK_QNAN;
extern const sink_val SINK_NIL;

sink_val sink_valToStr(sink_ctx ctx, sink_val v);
sink_val sink_strNewBlobGive(sink_ctx ctx, uint8_t *bytes, int size);

#endif // SINK__H
