// (c) Copyright 2016-2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink_shell.h"
#include <stdio.h>

#if defined(SINK_WIN)
#	include <direct.h> // _getcwd
#	define getcwd _getcwd
#else
#	include <unistd.h> // getcwd
#endif

#define VERSION_MAJ  1
#define VERSION_MIN  0
#define VERSION_PAT  0

typedef struct {
	char **args;
	int size;
} uargs_st, *uargs;

static sink_val L_version(sink_ctx ctx, int size, sink_val *args, void *nuser){
	int reqmaj = 0, reqmin = 0, reqpat = 0;
	if (size >= 1){
		if (!sink_isnum(args[0]))
			return sink_abortstr(ctx, "Expecting number");
		reqmaj = sink_castnum(args[0]);
	}
	if (size >= 2){
		if (!sink_isnum(args[1]))
			return sink_abortstr(ctx, "Expecting number");
		reqmin = sink_castnum(args[1]);
	}
	if (size >= 3){
		if (!sink_isnum(args[2]))
			return sink_abortstr(ctx, "Expecting number");
		reqpat = sink_castnum(args[2]);
	}

	if (reqmaj > VERSION_MAJ)
		goto fail;
	else if (reqmaj == VERSION_MAJ){
		if (reqmin > VERSION_MIN)
			goto fail;
		else if (reqmin == VERSION_MIN){
			if (reqpat > VERSION_PAT)
				goto fail;
		}
	}

	sink_val ls[3] = { sink_num(VERSION_MAJ), sink_num(VERSION_MIN), sink_num(VERSION_PAT) };
	return sink_list_newblob(ctx, 3, ls);

	fail:
	return sink_abortstr(ctx, "Script requires version %d.%d.%d, but sink is version %d.%d.%d",
		reqmaj, reqmin, reqpat, VERSION_MAJ, VERSION_MIN, VERSION_PAT);
}

static sink_val L_args(sink_ctx ctx, int size, sink_val *args, uargs a){
	sink_val ar = sink_list_newblob(ctx, 0, NULL);
	for (int i = 0; i < a->size; i++){
		sink_val s = sink_str_newcstr(ctx, a->args[i]);
		sink_list_push(ctx, ar, s);
	}
	return ar;
}

static sink_val L_pwd(sink_ctx ctx, int size, sink_val *args, void *nuser){
	char *cwd = getcwd(NULL, 0);
	if (cwd == NULL)
		return sink_abortstr(ctx, "Failed to get current directory");
	sink_val a = sink_str_newcstr(ctx, cwd);
	free(cwd);
	return a;
}

void sink_shell_scr(sink_scr scr){
	sink_scr_incbody(scr, "shell",
		"declare version 'sink.shell.version';"
		"declare args    'sink.shell.args'   ;"
	);
}

void sink_shell_ctx(sink_ctx ctx, int argc, char **argv){
	uargs a = malloc(sizeof(uargs_st));
	if (a == NULL){
		fprintf(stderr, "Error: Out of Memory!\n");
		exit(1);
		return;
	}
	a->args = argv;
	a->size = argc;
	sink_ctx_cleanup(ctx, a, free);
	sink_ctx_native(ctx, "sink.shell.version", NULL, (sink_native_f)L_version);
	sink_ctx_native(ctx, "sink.shell.args", a, (sink_native_f)L_args);
}
