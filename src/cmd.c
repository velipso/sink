// (c) Cyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink.h"

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

int main(int argc, char **argv){
	sink_repl repl = sink_repl_new(NULL, sink_stdio, sink_stdinc);
	int line = 1;
	int bufsize = 0;
	int bufcount = 200;
	char *buf = malloc(sizeof(char) * bufcount);
	if (buf == NULL){
		fprintf(stderr, "Out of memory!\n");
		return 1;
	}
	catchint();
	printline(line, sink_repl_level(repl));
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
				char *err = sink_repl_write(repl, (uint8_t *)buf, bufsize);
				if (err){
					printf("Error: %s\n", err);
					sink_repl_reset(repl);
				}
				printline(++line, sink_repl_level(repl));
			}
			bufsize = 0;
		}
	}
	free(buf);
	sink_repl_free(repl);
	return 0;
}
