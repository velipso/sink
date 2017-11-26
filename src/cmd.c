// (c) Copyright 2016-2017, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"
#include "sink_shell.h"
#include <string.h>
#include <stdio.h>

#ifdef SINK_WIN
#	include <direct.h> // _getcwd
#	define getcwd _getcwd
#else
#	include <unistd.h> // getcwd
#endif

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

static volatile bool done = false;

#if defined(SINK_POSIX) || defined(SINK_MAC)

#include <signal.h>

static void catchdone(int dummy){
	fclose(stdin);
	done = true;
}

static inline void catchint(){
	signal(SIGINT, catchdone);
	signal(SIGSTOP, catchdone);
}

#else
#	error Don't know how to catch Ctrl+C for other platforms
#endif

#if defined(SINK_POSIX) || defined(SINK_MAC)

#include <dirent.h>
#include <sys/stat.h>

static bool isdir(const char *dir){
	struct stat buf;
	if (stat(dir, &buf) != 0)
		return 0;
	return S_ISDIR(buf.st_mode);
}

static bool isfile(const char *file){
	FILE *fp = fopen(file, "rb");
	if (fp == NULL)
		return false;
	fclose(fp);
	return true;
}

static bool fsread(sink_scr scr, const char *file, void *user){
	FILE *fp = fopen(file, "rb");
	if (fp == NULL)
		return false; // `false` indicates that the file couldn't be read
	char buf[5000];
	while (!feof(fp)){
		size_t sz = fread(buf, 1, sizeof(buf), fp);
		if (!sink_scr_write(scr, sz, (const uint8_t *)buf))
			break;
	}
	fclose(fp);
	return true; // `true` indicates that the file was read
}

#else
#	error Don't know how to perform includes for other platforms
#endif

static sink_fstype fstype(const char *file, void *user){
	if (isdir(file))
		return SINK_FSTYPE_DIR;
	else if (isfile(file))
		return SINK_FSTYPE_FILE;
	return SINK_FSTYPE_NONE;
}

static sink_inc_st inc = {
	.f_fstype = fstype,
	.f_fsread = fsread,
	.user = NULL
};

static inline sink_ctx newctx(sink_scr scr, int argc, char **argv){
	// create the context with the standard I/O
	sink_ctx ctx = sink_ctx_new(scr, sink_stdio);

	// add any libraries
	sink_shell_ctx(ctx, argc, argv);

	return ctx;
}

static inline void printline(int line, int level){
	printf("%2d", line);
	if (level <= 0)
		printf(": ");
	else{
		printf(".");
		for (int i = 0; i < level; i++)
			printf("..");
		printf(" ");
	}
}

static inline void printscrerr(sink_scr scr){
	const char *err = sink_scr_geterr(scr);
	fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
}

static inline void printctxerr(sink_ctx ctx){
	const char *err = sink_ctx_geterr(ctx);
	fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
}

static int main_repl(sink_scr scr, int argc, char **argv){
	int res = 0;
	sink_ctx ctx = newctx(scr, argc, argv);
	int line = 1;
	int bufsize = 0;
	int bufcount = 200;
	char *buf = malloc(sizeof(char) * bufcount);
	if (buf == NULL){
		sink_ctx_free(ctx);
		sink_scr_free(scr);
		fprintf(stderr, "Out of memory!\n");
		return 1;
	}
	catchint();
	printline(line, sink_scr_level(scr));
	while (!done){
		int ch = getchar();
		if (ch == EOF){
			ch = '\n';
			done = true;
		}
		if (bufsize >= bufcount - 1){ // make sure there is always room for two chars
			bufcount += 200;
			buf = realloc(buf, sizeof(char) * bufcount);
			if (buf == NULL){
				sink_ctx_free(ctx);
				sink_scr_free(scr);
				fprintf(stderr, "Out of memory!\n");
				return 1;
			}
		}
		buf[bufsize++] = ch;
		if (ch == '\n'){
			if (!sink_scr_write(scr, bufsize, (uint8_t *)buf))
				printscrerr(scr);
			if (sink_scr_level(scr) <= 0){
				switch (sink_ctx_run(ctx)){
					case SINK_RUN_PASS:
						done = true;
						res = 0;
						break;
					case SINK_RUN_FAIL:
						printctxerr(ctx);
						break;
					case SINK_RUN_ASYNC:
						fprintf(stderr, "TODO: REPL invoked async function\n");
						done = true;
						break;
					case SINK_RUN_TIMEOUT:
						fprintf(stderr, "REPL returned timeout (impossible)\n");
						done = true;
						break;
					case SINK_RUN_REPLMORE:
						// do nothing
						break;
				}
			}
			if (!done)
				printline(++line, sink_scr_level(scr));
			bufsize = 0;
		}
	}
	free(buf);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	return res;
}

int main_run(sink_scr scr, const char *file, int argc, char **argv){
	if (!sink_scr_loadfile(scr, file)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_ctx ctx = newctx(scr, argc, argv);
	sink_run res = sink_ctx_run(ctx);
	if (res == SINK_RUN_FAIL)
		printctxerr(ctx);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	return res == SINK_RUN_PASS ? 0 : 1;
}

int main_eval(sink_scr scr, const char *eval, int argc, char **argv){
	if (!sink_scr_write(scr, strlen(eval), (const uint8_t *)eval)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_ctx ctx = newctx(scr, argc, argv);
	sink_run res = sink_ctx_run(ctx);
	if (res == SINK_RUN_FAIL)
		printctxerr(ctx);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	return res == SINK_RUN_PASS ? 0 : 1;
}

int main_compile_file(sink_scr scr, const char *file, bool debug){
	if (!sink_scr_loadfile(scr, file)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_scr_dump(scr, debug, (void *)stdout, (sink_dump_f)fwrite);
	sink_scr_free(scr);
	return 0;
}

int main_compile_eval(sink_scr scr, const char *eval, bool debug){
	if (!sink_scr_write(scr, strlen(eval), (const uint8_t *)eval)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_scr_dump(scr, debug, (void *)stdout, (sink_dump_f)fwrite);
	sink_scr_free(scr);
	return 0;
}

void print_version(){
	printf(
		"Sink v1.0\n"
		"Copyright (c) 2016-2017 Sean Connelly (@voidqk), MIT License\n"
		"https://github.com/voidqk/sink  http://syntheti.cc\n");
}

void print_help(){
	print_version();
	printf(
		"\nUsage:\n"
		"  sink [options] [ -e '<code>' | <file> ] [arguments]\n"
		"\n"
		"With no arguments, sink will enter interactive mode (REPL).\n"
		"\n"
		"Option           Description\n"
		"  -v               Display version information and exit\n"
		"  -h, --help       Display help information and exit\n"
		"  -I <path>        Add <path> to the include search path\n"
		"  -c               Compile input and output bytecode to stdout\n"
		"  -d               If compiling, output bytecode with debug info\n"
		"  -D <key> <file>  If compiling, add <file> declarations when including <key>\n"
		"\n"
		"  The -D option is useful for providing declarations so that compilation can\n"
		"  succeed for other host environments.\n"
		"\n"
		"  For example, a host might provide declarations for native commands via:\n"
		"\n"
		"    include 'shapes'\n"
		"\n"
		"  The host could provide a declaration file, which can be used during\n"
		"  compilation using a `-D shapes shapes_decl.sink` option.  This means when the\n"
		"  script executes `include 'shapes'`, the compiler will load `shapes_decl.sink`.\n"
		"  Even though the compiler doesn't know how to execute the host commands, it can\n"
		"  still compile the file for use in the host environment.\n");
}

int main(int argc, char **argv){
	bool compile = false;
	bool compile_debug = false;
	enum {
		INPUT_REPL,
		INPUT_FILE,
		INPUT_EVAL
	} input_type = INPUT_REPL;
	char *input_content = NULL;

	// first pass, just figure out what we're doing and validate arguments
	int i;
	for (i = 1; i < argc; i++){
		if (strcmp(argv[i], "-v") == 0){
			if (i + 1 < argc){
				print_help();
				return 1;
			}
			print_version();
			return 0;
		}
		else if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0){
			print_help();
			return i + 1 < argc ? 1 : 0;
		}
		else if (strcmp(argv[i], "-I") == 0){
			if (i + 1 >= argc){
				print_help();
				return 1;
			}
			i++; // skip include path
		}
		else if (strcmp(argv[i], "-c") == 0)
			compile = true;
		else if (strcmp(argv[i], "-d") == 0)
			compile_debug = true;
		else if (strcmp(argv[i], "-D") == 0){
			if (i + 2 >= argc){
				print_help();
				return 1;
			}
			i += 2; // skip declaration key/file
		}
		else if (strcmp(argv[i], "-e") == 0){
			if (i + 1 >= argc){
				print_help();
				return 1;
			}
			input_content = argv[i + 1];
			i += 2; // skip over script
			input_type = INPUT_EVAL;
			break;
		}
		else{
			if (argv[i][0] == '-'){
				// some unknown option
				print_help();
				return 1;
			}
			input_content = argv[i];
			i++; // skip over file
			input_type = INPUT_FILE;
			break;
		}
	}

	if (compile && input_type == INPUT_REPL){
		print_help();
		return 1;
	}

	// grab sink arguments
	int s_argc = argc - i;
	char **s_argv = &argv[i];

	// create the script with the current working directory
	char *cwd = getcwd(NULL, 0);
	sink_scr scr = sink_scr_new(inc, cwd, input_type == INPUT_REPL);
	free(cwd);

	// add the appropriate paths
	const char *sp = getenv("SINK_PATH");
	if (sp == NULL){
		// if no environment variable, then add a default path of the current directory
		sink_scr_addpath(scr, ".");
	}
	else{
		fprintf(stderr, "TODO: process SINK_PATH\n");
		abort();
	}

	// add any libraries
	sink_shell_scr(scr);

	// load include paths and declaration key/files
	for (i = 1; argv[i] != input_content; i++){
		if (strcmp(argv[i], "-I") == 0){
			sink_scr_addpath(scr, argv[i + 1]);
			i++;
		}
		else if (strcmp(argv[i], "-D") == 0){
			sink_scr_incfile(scr, argv[i + 1], argv[i + 2]);
			i += 2;
		}
	}

	switch (input_type){
		case INPUT_FILE:
			if (compile)
				return main_compile_file(scr, input_content, compile_debug);
			return main_run(scr, input_content, s_argc, s_argv);

		case INPUT_REPL:
			return main_repl(scr, s_argc, s_argv);

		case INPUT_EVAL:
			if (compile)
				return main_compile_eval(scr, input_content, compile_debug);
			return main_eval(scr, input_content, s_argc, s_argv);
	}
	// shouldn't happen
	return 1;
}
