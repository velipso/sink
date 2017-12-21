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

typedef struct {
	char **args;
	int size;
} uargs_st, *uargs;

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
		"declare args  'sink.shell.args' ;"
		"declare cat   'sink.shell.cat'  ;"
		"declare cd    'sink.shell.cd'   ;"
		"declare cp    'sink.shell.cp'   ;"
		"declare env   'sink.shell.env'  ;"
		"declare exec  'sink.shell.exec' ;"
		"declare glob  'sink.shell.glob' ;"
		"declare head  'sink.shell.head' ;"
		"declare ls    'sink.shell.ls'   ;"
		"declare mv    'sink.shell.mv'   ;"
		"declare mkdir 'sink.shell.mkdir';"
		"declare pushd 'sink.shell.pushd';"
		"declare popd  'sink.shell.popd' ;"
		"declare pwd   'sink.shell.pwd'  ;"
		"declare rm    'sink.shell.rm'   ;"
		"declare tail  'sink.shell.tail' ;"
		"declare test  'sink.shell.test' ;"
		"declare which 'sink.shell.which';"
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
	sink_ctx_native(ctx, "sink.shell.args", a, (sink_native_f)L_args);
	sink_ctx_native(ctx, "sink.shell.pwd", NULL, L_pwd);
}
