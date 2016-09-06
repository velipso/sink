// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"
#include "sink_shell.h"

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

static int main_repl(){
	int res = 0;
	sink_scr scr = sink_scr_new(sink_stdinc, NULL, true);
	sink_shell_scr(scr);
	sink_ctx ctx = sink_ctx_new(scr, sink_stdio);
	sink_shell_ctx(ctx);
	int line = 1;
	int bufsize = 0;
	int bufcount = 200;
	char *buf = malloc(sizeof(char) * bufcount);
	if (buf == NULL){
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
				fprintf(stderr, "Out of memory!\n");
				return 1;
			}
		}
		buf[bufsize++] = ch;
		if (ch == '\n'){
			if (bufsize > 1){
				char *err = sink_scr_write(scr, (uint8_t *)buf, bufsize);
				if (err)
					printf("Error: %s\n", err);
				switch (sink_ctx_run(ctx)){
					case SINK_RUN_PASS:
						done = true;
						res = 0;
						break;
					case SINK_RUN_FAIL:
						done = true;
						res = 1;
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
					case SINK_RUN_INVALID:
						fprintf(stderr, "Invalid code generation\n");
						done = true;
						break;
				}
				if (!done)
					printline(++line, sink_scr_level(scr));
			}
			bufsize = 0;
		}
	}
	free(buf);
	sink_scr_free(scr);
	return res;
}

int main_run(const char *inFile, char *const *argv, int argc){
	FILE *fp = fopen(inFile, "rb");
	if (fp == NULL){
		fprintf(stderr, "Failed to open file: %s\n", inFile);
		return 1;
	}

	sink_scr scr = sink_scr_new(sink_stdinc, inFile, false);
	sink_shell_scr(scr);

	char buf[1000];
	while (!feof(fp)){
		int sz = fread(buf, 1, sizeof(buf), fp);
		char *err = sink_scr_write(scr, (uint8_t *)buf, sz);
		if (err){
			fclose(fp);
			fprintf(stderr, "Error: %s\n", err);
			sink_scr_free(scr);
			return 1;
		}
	}
	fclose(fp);

	char *err = sink_scr_close(scr);
	if (err){
		fprintf(stderr, "Error: %s\n", err);
		sink_scr_free(scr);
		return 1;
	}

	sink_ctx ctx = sink_ctx_new(scr, sink_stdio);
	sink_shell_ctx(ctx);
	sink_run res = sink_ctx_run(ctx);
	sink_ctx_free(ctx);
	sink_scr_free(scr);
	switch (res){
		case SINK_RUN_PASS:
			return 0;
		case SINK_RUN_FAIL:
			return 1;
		case SINK_RUN_ASYNC:
		case SINK_RUN_TIMEOUT:
		case SINK_RUN_REPLMORE:
			fprintf(stderr, "Invalid return value from running context\n");
			return 1;
		case SINK_RUN_INVALID:
			fprintf(stderr, "Invalid file\n");
			return 1;
	}
}

void printVersion(){
	printf(
		"Sink v1.0\n"
		"Copyright (c) 2016 Sean Connelly (@voidqk), MIT License\n"
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
			printf("TODO: eval\n");
			abort();
			return 1;
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
