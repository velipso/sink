// (c) Copyright 2016-2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink_shell.h"
#include <stdio.h>
#include <string.h>

#if defined(SINK_WIN)
#	include <direct.h> // _getcwd
#	define getcwd _getcwd
#else
#	include <unistd.h>   // getcwd
#	include <sys/stat.h> // stat
#endif

#define VERSION_MAJ  1
#define VERSION_MIN  0
#define VERSION_PAT  0

typedef struct {
	char **args;
	int size;
} uargs_st, *uargs;

static inline void *sink_malloc_safe(size_t s){
	void *p = sink_malloc(s);
	if (p == NULL){
		fprintf(stderr, "Out of memory!\n");
		exit(1);
	}
	return p;
}

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

static inline bool issep(char ch){
#if defined(SINK_WIN)
	return ch == '/' || ch == '\\';
#else
	return ch == '/';
#endif
}

static inline void pathjoin_apply(char *res, int *r, int len, const char *buf){
	if (len <= 0 || (len == 1 && buf[0] == '.'))
		return;
	if (len == 2 && buf[0] == '.' && buf[1] == '.'){
		for (int i = *r - 1; i >= 0; i--){
			if (issep(res[i])){
				*r = i;
				return;
			}
		}
		return;
	}
#if defined(SINK_WIN)
	if (*r) // if in middle of windows path
		res[(*r)++] = '\\'; // just join with backslash
	else if (len < 2 || buf[1] != ':'){ // otherwise, if we're starting a \\host path
		// add the initial double backslashes
		res[(*r)++] = '\\';
		res[(*r)++] = '\\';
	}
	// otherwise, we're starting a drive path, so don't prefix the drive with anything
#else
	res[(*r)++] = '/';
#endif
	for (int i = 0; i < len; i++)
		res[(*r)++] = buf[i];
}

static inline void pathjoin_helper(char *res, int *r, int len, const char *buf){
	for (int i = 0; i < len; i++){
		if (issep(buf[i]))
			continue;
		int start = i;
		while (i < len && !issep(buf[i]))
			i++;
		pathjoin_apply(res, r, i - start, &buf[start]);
	}
}

static char *pathjoin(const char *prev, const char *next){
	int prev_len = (int)strlen(prev);
	int next_len = (int)strlen(next);
	int len = prev_len + next_len + 4;
	char *res = sink_malloc_safe(sizeof(char) * len);
	int r = 0;
	pathjoin_helper(res, &r, prev_len, prev);
	pathjoin_helper(res, &r, next_len, next);
	res[r++] = 0;
	return res;
}

static inline bool isdelim(char ch){
#if defined(SINK_WIN)
	return ch == '/' || ch == '\\' || ch == ':';
#else
	return ch == '/';
#endif
}

static inline bool ispathdiv(char ch){
#if defined(SINK_WIN)
	return ch == ';';
#else
	return ch == ':';
#endif
}

static inline char *Li_which_testexe(char *p){
#if defined(SINK_WIN)
#	error Implement Li_which_testexe for Windows (use GetBinaryType I think)
#else
	// returns p if it's executable, or NULL if not (and must free p using sink_free)
	struct stat sb;
	if (stat(p, &sb) == 0 && sb.st_mode & S_IXUSR)
		return p;
	sink_free(p);
	return NULL;
#endif
}

static inline char *Li_which(const char *cmd){
	// filter out "." and ".."
	if (cmd[0] == '.' && (cmd[1] == 0 || (cmd[1] == '.' && cmd[2] == 0)))
		return NULL;

	// search for a path delimeter
	for (int i = 0; cmd[i] != 0; i++){
		if (isdelim(cmd[i])){
			char *cwd = getcwd(NULL, 0);
			if (cwd == NULL){
				fprintf(stderr, "Failed to get current directory\n");
				exit(1);
			}
			char *join = pathjoin(cwd, cmd);
			free(cwd);
			return Li_which_testexe(join);
		}
	}

	// no path delimeter, so search PATH environment variable
	const char *path = getenv("PATH");
	char curpath[2001];
	int curpathi = 0;
	for (int i = 0; path[i] != 0; i++){
		if (ispathdiv(path[i])){
			if (curpathi == 0 || curpathi >= 2000)
				continue;
			// we have a path to test
			curpath[curpathi] = 0;
			char *join = pathjoin(curpath, cmd);
			if (Li_which_testexe(join))
				return join;
			// nope, not executable
			curpathi = 0;
		}
		else{
			if (curpathi < 2000)
				curpath[curpathi++] = path[i];
		}
	}
	return NULL;
}

static sink_val L_which(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str str;
	if (!sink_arg_str(ctx, size, args, 0, &str))
		return SINK_NIL;
	if (str->bytes == NULL) // empty string
		return SINK_NIL;
	char *res = Li_which((const char *)str->bytes);
	if (res == NULL)
		return SINK_NIL;
	return sink_str_newblobgive(ctx, strlen(res), (uint8_t *)res);
}

static sink_val L_run(sink_ctx ctx, int size, sink_val *args, void *nuser){
#if defined(SINK_WIN)
#	error Implement sink.shell.run in Windows
#else
/*
#include <stdio.h>
#include <stdbool.h>

#include <sys/types.h>  // necessary for read
#include <sys/uio.h>    // necessary for read
#include <unistd.h>     // vfork, _exit, sleep, pipe, dup, dup2, close, read, STDOUT_FILENO, STDERR_FILENO, STDIN_FILENO, execv
#include <sys/wait.h>   // waitpid
#include <poll.h>       // poll
#include <string.h>     // strerror
#include <errno.h>      // errno

#define READ_END 0
#define WRITE_END 1

// Do I need this?
//   The call ``fcntl(d, F_SETFD, 1)'' is provided, which arranges that a descriptor will
//   be closed after a successful execve; the call ``fcntl(d, F_SETFD, 0)'' restores the
//   default, which is to not close the descriptor.

static void transfer_fd(int from, int to){
	dup2(from, to);
	close(from);
}

static void print_fds(const char *head){
	printf("%s\n", head);
	for (int i = 0; i < FD_SETSIZE; i++){
		int fd_dup = dup(i);
		if (fd_dup == -1)
			continue;
		close(fd_dup);
		printf("%4i\n", i);
	}
}

static void stdflush(){
	fflush(stdout);
	fsync(STDOUT_FILENO);
	fflush(stderr);
	fsync(STDERR_FILENO);
}

int main(int argc, char **argv){
	int fd_stdin[2];
	int fd_stdout[2];
	int fd_stderr[2];
	if (pipe(fd_stdin) != 0){
		fprintf(stderr, "failed to create pipe: %s\n", strerror(errno));
		return 1;
	}
	if (pipe(fd_stdout) != 0){
		close(fd_stdin[0]);
		close(fd_stdin[1]);
		fprintf(stderr, "failed to create pipe: %s\n", strerror(errno));
		return 1;
	}
	if (pipe(fd_stderr) != 0){
		close(fd_stdin[0]);
		close(fd_stdin[1]);
		close(fd_stdout[0]);
		close(fd_stdout[1]);
		fprintf(stderr, "failed to create pipe: %s\n", strerror(errno));
		return 1;
	}
	pid_t chpid = fork();
	printf("pid: %d\n", chpid);
	if (chpid == 0){
		// child
		close(fd_stdin[WRITE_END]);
		transfer_fd(fd_stdin[READ_END], STDIN_FILENO);
		close(fd_stdout[READ_END]);
		transfer_fd(fd_stdout[WRITE_END], STDOUT_FILENO);
		close(fd_stderr[READ_END]);
		transfer_fd(fd_stderr[WRITE_END], STDERR_FILENO);

		const char *args[] = {
			"/Users/sean/proj/temp/forkpipe/test",
			"-l",
			"-a",
			NULL
		};
		execv("/Users/sean/proj/temp/forkpipe/test", args);

	}
	else{
		// parent
		printf("closing extraneous fds\n");
		close(fd_stdin[READ_END]);
		close(fd_stdout[WRITE_END]);
		close(fd_stderr[WRITE_END]);
		//const char *writebuf = "hello from stdin\n";
		//write(fd_stdin[WRITE_END], writebuf, strlen(writebuf));
		close(fd_stdin[WRITE_END]);
		print_fds("parent_fds");
		char buf[1000];

		// poll for stdout/stderr
		struct pollfd p_fds[2];
		int p_fds_size = 2;
		p_fds[0] = (struct pollfd){ .fd = fd_stdout[READ_END], .events = POLLIN, .revents = 0 };
		p_fds[1] = (struct pollfd){ .fd = fd_stderr[READ_END], .events = POLLIN, .revents = 0 };

		while (true){
			printf("polling...\n");
			int r = poll(p_fds, p_fds_size, -1);
			if (r == -1){
				fprintf(stderr, "poll error: %s\n", strerror(errno));
				break;
			}
			else if (r == 0)
				continue;
			for (int i = 0; i < p_fds_size; i++){
				if (p_fds[i].revents != 0){
					// process events
					p_fds[i].revents = 0;
					char buf[1000];
					ssize_t sz = read(p_fds[i].fd, buf, sizeof(buf));
					if (sz == -1)
						fprintf(stderr, "read error: %s\n", strerror(errno));
					else if (sz == 0){
						// file closed
						if (p_fds[i].fd == fd_stdout[READ_END]){
							printf("stdout closed\n");
							if (p_fds_size == 2){
								// stderr is still open, so move it to the first entry
								p_fds[0] = p_fds[1];
								i--;
							}
						}
						else
							printf("stderr closed\n");
						p_fds_size--;
						if (p_fds_size == 0)
							goto no_more_data;
					}
					else{
						printf("read %s data: <%.*s>\n",
							p_fds[i].fd == fd_stdout[READ_END] ? "stdout" : "stderr",
							(int)sz, buf);
					}
				}
			}
		}
		no_more_data:;

		int status = 0;
		pid_t wpid = waitpid(chpid, &status, 0);
		if (wpid == chpid){
			printf("waitpid returned %d status %d\n", wpid, status);
			if (WIFEXITED(status))
				printf("exited normally with exit status %d\n", WEXITSTATUS(status));
			else if (WIFSIGNALED(status))
				printf("exited due to signal %d\n", WTERMSIG(status));
			else if (WIFSTOPPED(status))
				printf("exited due to stop %d\n", WSTOPSIG(status));
			else
				printf("unknown reason for exit\n");
		}
		else{
			fprintf(stderr, "failed to wait for child: %s\n", strerror(errno));
			return 1;
		}
		close(fd_stdout[READ_END]);
		close(fd_stderr[READ_END]);
	}
	return 0;
}
*/
	return SINK_NIL;
#endif
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
		"declare run     'sink.shell.run'    ;"
		"declare which   'sink.shell.which'  ;"
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
	sink_ctx_native(ctx, "sink.shell.args"   , a   , (sink_native_f)L_args   );
	sink_ctx_native(ctx, "sink.shell.run"    , NULL, (sink_native_f)L_run    );
	sink_ctx_native(ctx, "sink.shell.which"  , NULL, (sink_native_f)L_which  );
}
