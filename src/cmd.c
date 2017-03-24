// (c) Copyright 2016-2017, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"
#include "sink_shell.h"
#include <string.h>

#ifdef SINK_WIN32
#	include <direct.h> // _getcwd
#	define getcwd _getcwd
#else
#	include <unistd.h> // getcwd
#endif

static volatile bool done = false;

#if defined(SINK_POSIX) || defined(SINK_MACOSX)

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

#if defined(SINK_POSIX) || defined(SINK_MACOSX)

#include <dirent.h>
#include <sys/stat.h>

#define FIXPATH NULL

static bool isdir(const char *dir){
	struct stat buf;
	if (stat(dir, &buf) != 0)
		return 0;
	return S_ISDIR(buf.st_mode);
}

#else
#	error Don't know how to perform includes for other platforms
#endif

static bool isfile(const char *file){
	FILE *fp = fopen(file, "rb");
	if (fp == NULL)
		return false;
	fclose(fp);
	return true;
}

static sink_fstype fstype(const char *file, void *user){
	if (isdir(file))
		return SINK_FSTYPE_DIR;
	else if (isfile(file))
		return SINK_FSTYPE_FILE;
	return SINK_FSTYPE_NONE;
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

static sink_inc_st inc = {
	.f_fixpath = FIXPATH,
	.f_fstype = fstype,
	.f_fsread = fsread,
	.user = NULL
};

static inline sink_scr newscr(sink_scr_type type){
	// create the script with the current working directory
	char *cwd = getcwd(NULL, 0);
	sink_scr scr = sink_scr_new(inc, cwd, type);
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

	return scr;
}

static inline sink_ctx newctx(sink_scr scr){
	// create the context with the standard I/O
	sink_ctx ctx = sink_ctx_new(scr, sink_stdio);

	// add any libraries
	sink_shell_ctx(ctx, 0, NULL);

	return ctx;
}

static inline void printline(int line, int level){
	if (line < 10)
		printf(" %d", line);
	else
		printf("%d", line);
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
	const char *err = sink_scr_err(scr);
	fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
}

static inline void printctxerr(sink_ctx ctx){
	const char *err = sink_ctx_err(ctx);
	fprintf(stderr, "%s\n", err ? err : "Error: Unknown");
}

static int main_repl(){
	int res = 0;
	sink_scr scr = newscr(SINK_SCR_REPL);
	sink_ctx ctx = newctx(scr);
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
		int ch = fgetc(stdin);
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

static char *format(const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = malloc(s + 1);
	if (buf == NULL)
		return NULL;
	vsprintf(buf, fmt, args2);
	va_end(args);
	va_end(args2);
	return buf;
}

int main_run(const char *file, char *const *argv, int argc){
	sink_scr scr = newscr(SINK_SCR_FILE);
	if (!sink_scr_loadfile(scr, file)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_ctx ctx = newctx(scr);
	sink_run res = sink_ctx_run(ctx);
	if (res == SINK_RUN_FAIL)
		printctxerr(ctx);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	return res == SINK_RUN_PASS ? 0 : 1;
}

int main_eval(const char *eval, char *const *argv, int argc){
	sink_scr scr = newscr(SINK_SCR_EVAL);
	if (!sink_scr_write(scr, strlen(eval), (const uint8_t *)eval)){
		printscrerr(scr);
		sink_scr_free(scr);
		return 1;
	}
	sink_ctx ctx = newctx(scr);
	sink_run res = sink_ctx_run(ctx);
	if (res == SINK_RUN_FAIL)
		printctxerr(ctx);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	return res == SINK_RUN_PASS ? 0 : 1;
}

void printVersion(){
	printf(
		"Sink v1.0\n"
		"Copyright (c) 2016-2017 Sean Connelly (@voidqk), MIT License\n"
		"https://github.com/voidqk/sink  http://syntheti.cc\n");
}

void printHelp(){
	printVersion();
	printf(
		"\nUsage:\n"
		"  sink                           Read-eval-print loop\n"
		"  sink <file> [arguments]        Run file with arguments\n"
		"  sink -e '<code>' [arguments]   Run '<code>' with arguments\n"
		"  sink -c <file>                 Compile file to bytecode\n"
		"  sink -v                        Print version information\n");
}

int main(int argc, char **argv){
	int mode = 0;
	char *evalLine = NULL;
	char *inFile = NULL;
	char **args = NULL;
	int argsSize = 0;

	for (int i = 1; i < argc; i++){
		switch (mode){
			case 0: // unknown
				if (strcmp(argv[i], "-v") == 0)
					mode = 1;
				else if (strcmp(argv[i], "-c") == 0)
					mode = 2;
				else if (strcmp(argv[i], "-e") == 0)
					mode = 3;
				else if (strcmp(argv[i], "--") == 0)
					mode = 4;
				else if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0){
					printHelp();
					return 0;
				}
				else{
					mode = 5;
					inFile = argv[i];
				}
				break;

			case 1: // version
				printHelp();
				return 1;

			case 2: // compile
				if (inFile == NULL)
					inFile = argv[i];
				else{
					printHelp();
					return 1;
				}
				break;

			case 3: // eval
				if (evalLine == NULL)
					evalLine = argv[i];
				else{
					if (args == NULL){
						args = malloc(sizeof(char *) * (argc - i));
						if (args == NULL){
							fprintf(stderr, "Out of memory!\n");
							return 1;
						}
					}
					args[argsSize++] = argv[i];
				}
				break;

			case 4: // rest
				inFile = argv[i];
				mode = 5;
				break;

			case 5: // run
				if (args == NULL){
					args = malloc(sizeof(char *) * (argc - i));
					if (args == NULL){
						fprintf(stderr, "Out of memory!\n");
						return 1;
					}
				}
				args[argsSize++] = argv[i];
				break;
		}
	}

	switch (mode){
		case 0: // unknown
			return main_repl();
		case 1: // version
			printVersion();
			return 0;
		case 2: // compile
			printf("TODO: compile\n");
			abort();
			return 1;
		case 3: // eval
			if (evalLine == NULL){
				printHelp();
				return 1;
			}
			int res = main_eval(evalLine, args, argsSize);
			if (args)
				free(args);
			return res;
		case 4: // rest
			return main_repl();
		case 5: { // run
			int res = main_run(inFile, args, argsSize);
			if (args)
				free(args);
			return res;
		}
	}

	return 0;
}
