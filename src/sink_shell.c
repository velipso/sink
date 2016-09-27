// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink_shell.h"

static sink_val L_pwd(sink_ctx ctx, void *nuser, int size, sink_val *args){
	char *cwd = getcwd(NULL, 0); // cross-platform getcwd is provided by sink.h
	if (cwd == NULL)
		return sink_abortcstr(ctx, "Failed to get current directory");
	sink_val a = sink_str_newcstr(ctx, cwd);
	free(cwd);
	return a;
}

void sink_shell_scr(sink_scr scr){
	sink_scr_inc(scr, "shell",
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

void sink_shell_ctx(sink_ctx ctx){
	sink_ctx_native(ctx, "sink.shell.pwd", NULL, L_pwd);
}
