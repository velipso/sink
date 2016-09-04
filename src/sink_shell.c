// (c) Cyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink_shell.h"

static sink_val L_pwd(sink_ctx ctx, sink_val *args, int size){
	char *cwd = getcwd(NULL, 0); // cross-platform getcwd is provided by sink.h
	if (cwd == NULL)
		return sink_abortcstr(ctx, "Failed to get current directory");
	sink_val a = sink_str_newcstr(ctx, cwd);
	free(cwd);
	return a;
}

sink_lib sink_shell_get(){
	sink_lib lib = sink_lib_new();
	sink_lib_inc(lib, "shell",
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
	sink_lib_add(lib, "sink.shell.pwd", L_pwd);
	return lib;
}
