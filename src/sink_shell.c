// (c) Copyright 2016-2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

#include "sink_shell.h"
#include <stdio.h>
#include <string.h>

#if defined(SINK_WIN)
#	include <direct.h>     // _getcwd
#	define getcwd _getcwd
#	include <windows.h>    // GetFileAttributes, GetLastError
#	include <tchar.h>      // TCHAR
#	include <strsafe.h>    // StringCchLength, StringCchCopy, StringCchCat
#else
#	include <sys/stat.h>   // stat
#	include <sys/types.h>  // necessary for read
#	include <sys/uio.h>    // necessary for read
#	include <fcntl.h>      // O_CLOEXEC
#	include <unistd.h>     // getcwd, fork, pipe, dup2, close, read, write, execv, _exit, access
#	include <sys/wait.h>   // waitpid
#	include <poll.h>       // poll
#	include <string.h>     // strerror
#	include <errno.h>      // errno
#	include <dirent.h>     // opendir, readdir, closedir
#	define vsprintf_s(a, b, c, d) vsprintf(a, c, d)
#endif

#define VERSION_MAJ  1
#define VERSION_MIN  0
#define VERSION_PAT  0

typedef struct {
	char **args;
	int size;
} uargs_st, *uargs;

// allocate memory using sink_malloc
static inline void *sink_malloc_safe(size_t s){
	void *p = sink_malloc(s);
	if (p == NULL){
		fprintf(stderr, "Out of memory!\n");
		exit(1);
	}
	return p;
}

static inline void *sink_realloc_safe(void *p, size_t s){
	p = sink_realloc(p, s);
	if (p == NULL){
		fprintf(stderr, "Out of memory!\n");
		exit(1);
	}
	return p;
}

// string formatter using sink_malloc_safe
static char *format(const char *fmt, ...){
	va_list args, args2;
	va_start(args, fmt);
	va_copy(args2, args);
	size_t s = vsnprintf(NULL, 0, fmt, args);
	char *buf = sink_malloc_safe(s + 1);
	vsprintf_s(buf, s + 1, fmt, args2);
	va_end(args);
	va_end(args2);
	return buf;
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

static inline bool isabs(const char *file){
#if defined(SINK_WIN)
	return file[0] != 0 && (file[1] == ':' || (file[0] == '\\' && file[1] == '\\'));
#else
	return file[0] == '/';
#endif
}

static inline bool isabs_s(int sz, const char *file){
#if defined(SINK_WIN)
	return sz >= 2 && (file[1] == ':' || (file[0] == '\\' && file[1] == '\\'));
#else
	return sz >= 1 && file[0] == '/';
#endif
}

static inline char *Li_which_testexe(char *p){
#if defined(SINK_WIN)
	DWORD type;
	if (GetBinaryType(p, &type))
		return p;
	sink_free(p);
	return NULL;
#else
	// returns p if it's executable, or NULL if not (and must free p using sink_free)
	struct stat sb;
	if (stat(p, &sb) == 0 && sb.st_mode & S_IXUSR)
		return p;
	sink_free(p);
	return NULL;
#endif
}

#if defined(SINK_WIN)
static inline const char *getenv_i(const char *name){
	char *buf;
	_dupenv_s(&buf, NULL, name);
	return buf;
}

static inline void freeenv_i(const char *ptr){
	free((char *)ptr);
}
#else
#	define getenv_i(s) getenv(s)
#	define freeenv_i(s)
#endif

static char *Li_which(const char *cmd){
	// returns an aboslute path string owned by sink_malloc if an executable was found
	// otherwise, returns NULL

	// filter out "." and ".."
	if (cmd[0] == '.' && (cmd[1] == 0 || (cmd[1] == '.' && cmd[2] == 0)))
		return NULL;

	// return absolute paths
	if (isabs(cmd))
		return Li_which_testexe(format("%s", cmd));

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
	const char *path = getenv_i("PATH");
	if (path == NULL)
		return NULL;
	char curpath[2001];
	int curpathi = 0;
	for (int i = 0; path[i] != 0; i++){
		if (ispathdiv(path[i])){
			if (curpathi == 0 || curpathi >= 2000)
				continue;
			// we have a path to test
			curpath[curpathi] = 0;
			char *join = pathjoin(curpath, cmd);
			if (Li_which_testexe(join)){
				freeenv_i(path);
				return join;
			}
			// nope, not executable
			curpathi = 0;
		}
		else{
			if (curpathi < 2000)
				curpath[curpathi++] = path[i];
		}
	}
	freeenv_i(path);
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

// rundata (RD) implementation
// stores the arguments/environment variables of a call to `run`
#if defined(SINK_WIN)

typedef struct {
	char *app;
	int cmd_max;
	int cmd_size;
	char *cmd;
	int env_max;
	int env_size;
	char *env;
} rundata_st, *rundata;

static int RD_quote_size(const char *str){
	// return the size of a string that has been Windows-quoted (not including NULL terminator)
	int sz = strlen(str);

	// only quote arguments that contain space, tab, newline, vertical tab, or quote
	bool found = false;
	for (int i = 0; i < sz && !found; i++){
		char ch = str[i];
		found = ch == ' ' || ch == '\t' || ch == '\n' || ch == '\v' || ch == '"';
	}
	if (!found)
		return sz;

	int res = 2; // start quote + end quote
	for (int i = 0; i < sz; i++){
		int bs = 0;
		while (str[i] == '\\'){
			i++;
			bs++;
		}
		if (str[i] == 0)
			res += 2 * bs; // escape each backslash
		else if (str[i] == '"')
			res += 2 * bs + 2; // escape each backslash, escape the quote
		else
			res += bs + 1; // unescaped backslash, unescaped literal
	}
	return res;
}

static void RD_quote(const char *str, char *into){
	// quote a string using Windows logic, where `into` is a buffer of length `RD_quote_size(str)+1`
	int sz = strlen(str);

	// only quote arguments that contain space, tab, newline, vertical tab, or quote
	bool found = false;
	for (int i = 0; i < sz && !found; i++){
		char ch = str[i];
		found = ch == ' ' || ch == '\t' || ch == '\n' || ch == '\v' || ch == '"';
	}
	if (!found){
		// just copy directly, don't need to quote it
		for (int i = 0; i <= sz; i++) // copy string + NULL
			into[i] = str[i];
		return;
	}

	int idx = 0;
	into[idx++] = '"';
	for (int i = 0; i < sz; i++){
		int bs = 0;
		while (str[i] == '\\'){
			i++;
			bs++;
		}
		if (str[i] == 0){
			// escape each backslash
			for (int j = 0; j < bs; j++){
				into[idx++] = '\\';
				into[idx++] = '\\';
			}
		}
		else if (str[i] == '"'){
			// escape each backslash, escape the quote
			for (int j = 0; j < bs; j++){
				into[idx++] = '\\';
				into[idx++] = '\\';
			}
			into[idx++] = '\\';
			into[idx++] = '"';
		}
		else{
			// unescaped backslash, unescaped literal
			for (int j = 0; j < bs; j++)
				into[idx++] = '\\';
			into[idx++] = str[i];
		}
	}
	into[idx++] = '"';
	into[idx] = 0;
}

static inline void RD_make(rundata rd, char *abs_cmd){
	int qs = RD_quote_size(abs_cmd);
	rd->app = sink_malloc_safe(sizeof(char) * (qs + 1));
	RD_quote(abs_cmd, rd->app);
	rd->cmd = format("%s", rd->app);
	rd->cmd_max = qs + 1;
	rd->cmd_size = qs;
	rd->env_max = 0;
	rd->env_size = 0;
	rd->env = NULL;
	sink_free(abs_cmd); // don't need it anymore
}

static inline void RD_add_arg(rundata rd, sink_str str){
	int qs = RD_quote_size((const char *)str->bytes);
	if (rd->cmd_size + qs + 2 > rd->cmd_max){
		rd->cmd_max = rd->cmd_size + qs + 2 + 30;
		rd->cmd = sink_realloc_safe(rd->cmd, sizeof(char) * rd->cmd_max);
	}
	rd->cmd[rd->cmd_size++] = ' ';
	RD_quote((const char *)str->bytes, &rd->cmd[rd->cmd_size]);
	rd->cmd_size += qs;
}

static inline void RD_add_env(rundata rd, sink_str key, sink_str val){
	// TODO: test this with keys that have equals inside of them, empty keys, empty vals
	if (rd->env_size + key->size + 1 + val->size + 2 > rd->env_max){
		rd->env_max = rd->env_size + key->size + 1 + val->size + 2 + 30;
		rd->env = sink_realloc_safe(rd->env, sizeof(char) * rd->env_max);
	}
	for (int i = 0; i < key->size && key->bytes[i] != 0; i++)
		rd->env[rd->env_size++] = key->bytes[i];
	rd->env[rd->env_size++] = '=';
	for (int i = 0; i < val->size && val->bytes[i] != 0; i++)
		rd->env[rd->env_size++] = val->bytes[i];
	// double NULL terminate
	rd->env[rd->env_size] = 0;
	rd->env[rd->env_size + 1] = 0;
}

static inline void RD_finish(rundata rd, bool hasargs, bool hasenvs){
}

static inline void RD_destroy(rundata rd){
	sink_free(rd->app);
	sink_free(rd->cmd);
	if (rd->env)
		sink_free(rd->env);
}

#else

typedef struct {
	int args_max;
	int args_size;
	char **args;
	int envs_max;
	int envs_size;
	char **envs;
} rundata_st, *rundata;

static inline void RD_make(rundata rd, char *abs_cmd){
	rd->args_max = 50;
	rd->args_size = 0;
	rd->args = sink_malloc_safe(sizeof(char *) * rd->args_max);
	rd->args[rd->args_size++] = abs_cmd;
	rd->envs_max = 0;
	rd->envs_size = 0;
	rd->envs = NULL;
}

static inline void RD_push_arg(rundata rd, char *ptr){
	if (rd->args_size + 1 > rd->args_max){
		rd->args_max = rd->args_size + 10;
		rd->args = sink_realloc_safe(rd->args, sizeof(char *) * rd->args_max);
	}
	rd->args[rd->args_size++] = ptr;
}

static inline void RD_add_arg(rundata rd, sink_str str){
	RD_push_arg(rd, (char *)str->bytes);
}

static inline void RD_push_env(rundata rd, char *ptr){
	if (rd->envs_size + 1 > rd->envs_max){
		rd->envs_max = rd->envs_size + 10;
		rd->envs = sink_realloc_safe(rd->envs, sizeof(char *) * rd->envs_max);
	}
	rd->envs[rd->envs_size++] = ptr;
}

static inline void RD_add_env(rundata rd, sink_str key, sink_str val){
	// TODO: test this with keys that have equals inside of them, empty keys, empty vals
	RD_push_env(rd, format("%s=%s", (char *)key->bytes, (char *)val->bytes));
}

static inline void RD_finish(rundata rd, bool hasargs, bool hasenvs){
	RD_push_arg(rd, NULL);
	if (hasenvs)
		RD_push_env(rd, NULL);
}

static inline void RD_destroy(rundata rd){
	sink_free(rd->args[0]); // free abs_cmd
	sink_free(rd->args);
	if (rd->envs){
		for (int i = 0; i < rd->envs_size; i++)
			sink_free(rd->envs[i]);
		sink_free(rd->envs);
	}
}

#endif

#if defined(SINK_WIN)
static inline sink_val win_abortstr(sink_ctx ctx, DWORD err, const char *fmt){
	LPVOID msg;
	FormatMessage(
		FORMAT_MESSAGE_ALLOCATE_BUFFER |
		FORMAT_MESSAGE_FROM_SYSTEM |
		FORMAT_MESSAGE_IGNORE_INSERTS,
		NULL, err,
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		(LPTSTR)&msg, 0, NULL);
	sink_abortstr(ctx, fmt, msg);
	LocalFree(msg);
	return SINK_NIL;
}
#endif

static sink_val L_run(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str file;
	if (!sink_arg_str(ctx, size, args, 0, &file))
		return SINK_NIL;
	if (file->bytes == NULL)
		return sink_abortstr(ctx, "Invalid command");
	char *abs_cmd = Li_which((const char *)file->bytes);
	if (abs_cmd == NULL)
		return sink_abortstr(ctx, "Command not found: %.*s", file->size, file->bytes);

	rundata_st rd;
	RD_make(&rd, abs_cmd);

	bool hasargs = false;
	bool hasenvs = false;
	int writein_size = 0;
	const uint8_t *writein = NULL;
	const char *emptystr = "";
	bool capture = false;

	if (size >= 2 && !sink_isnil(args[1])){
		hasargs = true;

		// validate args list
		sink_list args_ls;
		if (!sink_arg_list(ctx, size, args, 1, &args_ls)){
			RD_destroy(&rd);
			return SINK_NIL;
		}
		for (int i = 0; i < args_ls->size; i++){
			if (!sink_isstr(args_ls->vals[i]) && !sink_isnum(args_ls->vals[i])){
				RD_destroy(&rd);
				return sink_abortstr(ctx, "Argument list must be a list of strings");
			}
		}

		// load args list into rd
		for (int i = 0; i < args_ls->size; i++){
			sink_str args_s = sink_caststr(ctx, sink_tostr(ctx, args_ls->vals[i]));
			RD_add_arg(&rd, args_s);
		}
	}

	if (size >= 3 && !sink_isnil(args[2])){
		hasenvs = true;

		// validate env list
		sink_list env_ls;
		if (!sink_arg_list(ctx, size, args, 2, &env_ls)){
			RD_destroy(&rd);
			return SINK_NIL;
		}
		for (int i = 0; i < env_ls->size; i++){
			if (!sink_islist(env_ls->vals[i])){
				RD_destroy(&rd);
				return sink_abortstr(ctx, "Environment list must be list of {'KEY', 'VALUE'}");
			}
			sink_list kv = sink_castlist(ctx, env_ls->vals[i]);
			if (kv->size != 2 ||
				!sink_isstr(kv->vals[0]) ||
				(!sink_isstr(kv->vals[1]) && !sink_isnum(kv->vals[1]))){
				RD_destroy(&rd);
				return sink_abortstr(ctx, "Environment list must be list of {'KEY', 'VALUE'}");
			}
		}

		// load env list into rd
		for (int i = 0; i < env_ls->size; i++){
			sink_list kv = sink_castlist(ctx, env_ls->vals[i]);
			sink_str key = sink_caststr(ctx, kv->vals[0]);
			sink_str val = sink_caststr(ctx, sink_tostr(ctx, kv->vals[1]));
			RD_add_env(&rd, key, val);
		}
	}

	if (size >= 4 && !sink_isnil(args[3])){
		sink_str inp_s;
		if (!sink_arg_str(ctx, size, args, 3, &inp_s))
			return SINK_NIL;
		if (inp_s->bytes == NULL)
			writein = (const uint8_t *)emptystr;
		else{
			writein = inp_s->bytes;
			writein_size = inp_s->size;
		}
	}

	if (size >= 5)
		capture = sink_istrue(args[4]);

	RD_finish(&rd, hasargs, hasenvs);

	//
	// gathered args/envs inside rd, stdin with writein, and capture flag -- now spawn the process
	//

#if defined(SINK_WIN)

	sink_val res = SINK_NIL;
	HANDLE fd_in_R  = NULL, fd_in_W  = NULL;
	HANDLE fd_out_R = NULL, fd_out_W = NULL;
	HANDLE fd_err_R = NULL, fd_err_W = NULL;
	PROCESS_INFORMATION pri;
	STARTUPINFO si;
	ZeroMemory(&pri, sizeof(PROCESS_INFORMATION));
	ZeroMemory(&si, sizeof(STARTUPINFO));
	SECURITY_ATTRIBUTES sec;
	sec.nLength = sizeof(SECURITY_ATTRIBUTES);
	sec.bInheritHandle = TRUE;
	sec.lpSecurityDescriptor = NULL;

	if (writein){
		if (!CreatePipe(&fd_in_R, &fd_in_W, &sec, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to create pipe: %s");
			goto cleanup;
		}
		if (!SetHandleInformation(fd_in_W, HANDLE_FLAG_INHERIT, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to set handle information: %s");
			goto cleanup;
		}
	}

	if (capture){
		if (!CreatePipe(&fd_out_R, &fd_out_W, &sec, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to create pipe: %s");
			goto cleanup;
		}
		if (!SetHandleInformation(fd_out_R, HANDLE_FLAG_INHERIT, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to set handle information: %s");
			goto cleanup;
		}

		if (!CreatePipe(&fd_err_R, &fd_err_W, &sec, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to create pipe: %s");
			goto cleanup;
		}
		if (!SetHandleInformation(fd_err_R, HANDLE_FLAG_INHERIT, 0)){
			win_abortstr(ctx, GetLastError(), "Failed to set handle information: %s");
			goto cleanup;
		}
	}

	si.cb = sizeof(STARTUPINFO);
	si.hStdInput  = writein ? fd_in_R  : GetStdHandle(STD_INPUT_HANDLE );
	si.hStdOutput = capture ? fd_out_W : GetStdHandle(STD_OUTPUT_HANDLE);
	si.hStdError  = capture ? fd_err_W : GetStdHandle(STD_ERROR_HANDLE );
	si.dwFlags |= STARTF_USESTDHANDLES;

	if (!CreateProcess(rd.app, rd.cmd, NULL, NULL, TRUE, 0, rd.env, NULL, &si, &pri)){
		win_abortstr(ctx, GetLastError(), "Failed to create process: %s");
		goto cleanup;
	}

	if (writein){
		CloseHandle(fd_in_R);
		fd_in_R = NULL;
		WriteFile(fd_in_W, writein, writein_size, NULL, NULL);
		CloseHandle(fd_in_W);
		fd_in_W = NULL;
	}

	WaitForSingleObject(pri.hProcess, INFINITE);
	DWORD exitcode = 0;
	GetExitCodeProcess(pri.hProcess, &exitcode);
	if (capture){
		CloseHandle(fd_out_W);
		fd_out_W = NULL;
		CloseHandle(fd_err_W);
		fd_err_W = NULL;
		sink_val capout = sink_list_newempty(ctx);
		sink_val caperr = sink_list_newempty(ctx);
		char buf[2000];
		DWORD bytes;
		while (true){
			if (!ReadFile(fd_out_R, buf, sizeof(buf), &bytes, NULL) || bytes == 0)
				break;
			sink_list_push(ctx, capout, sink_str_newblob(ctx, bytes, (const uint8_t *)buf));
		}
		while (true){
			if (!ReadFile(fd_err_R, buf, sizeof(buf), &bytes, NULL) || bytes == 0)
				break;
			sink_list_push(ctx, caperr, sink_str_newblob(ctx, bytes, (const uint8_t *)buf));
		}
		capout = sink_list_join(ctx, capout, sink_str_newempty(ctx));
		caperr = sink_list_join(ctx, caperr, sink_str_newempty(ctx));
		sink_val rv[3] = { sink_num(exitcode), capout, caperr };
		res = sink_list_newblob(ctx, 3, rv);
	}
	else
		res = sink_num(exitcode);

cleanup:
	if (fd_in_R ) CloseHandle(fd_in_R );
	if (fd_in_W ) CloseHandle(fd_in_W );
	if (fd_out_R) CloseHandle(fd_out_R);
	if (fd_out_W) CloseHandle(fd_out_W);
	if (fd_err_R) CloseHandle(fd_err_R);
	if (fd_err_W) CloseHandle(fd_err_W);
	if (pri.hProcess) CloseHandle(pri.hProcess);
	if (pri.hThread ) CloseHandle(pri.hThread );
	RD_destroy(&rd);
	return res;

#else

	const int R = 0, W = 1; // indicies into pipes for read/write
	int fd_exe[2], fd_in[2], fd_out[2], fd_err[2];

#if defined(SINK_POSIX)
	// the O_CLOEXEC is necessary to make it so the fd_exe file descriptors will automatically be
	// closed when an execve happens; this flag must also be set during pipe2 (instead of fcntl)
	// to prevent a race condition -- see `man 2 open`
	if (pipe2(fd_exe, O_CLOEXEC) != 0){
		RD_destroy(&rd);
		return sink_abortstr(ctx, "Failed to create pipe: %s", strerror(errno));
	}
#else
	// it looks like Mac OSX doesn't implement pipe2, so this code is a race condition in multi-
	// threaded programs that use fork -- it could leak a file descriptor.  See `man 2 open`
	//
	// there is no fix for this (that I know of) other than putting locks around *every* fork in the
	// entire program, and around the following code, so that the FD_CLOEXEC flags can be set
	// atomically

	//GlobalForkLock();
	if (pipe(fd_exe) != 0){
		//GlobalForkUnlock();
		RD_destroy(&rd);
		return sink_abortstr(ctx, "Failed to create pipe: %s", strerror(errno));
	}
	fcntl(fd_exe[0], F_SETFD, FD_CLOEXEC);
	fcntl(fd_exe[1], F_SETFD, FD_CLOEXEC);
	//GlobalForkUnlock();
#endif

	if (writein){
		if (pipe(fd_in) != 0){
			RD_destroy(&rd);
			close(fd_exe[R]);
			close(fd_exe[W]);
			return sink_abortstr(ctx, "Failed to create pipe: %s", strerror(errno));
		}
	}
	if (capture){
		if (pipe(fd_out) != 0){
			RD_destroy(&rd);
			close(fd_exe[R]);
			close(fd_exe[W]);
			if (writein){
				close(fd_in[R]);
				close(fd_in[W]);
			}
			return sink_abortstr(ctx, "Failed to create pipe: %s", strerror(errno));
		}
		if (pipe(fd_err) != 0){
			RD_destroy(&rd);
			close(fd_exe[R]);
			close(fd_exe[W]);
			if (writein){
				close(fd_in[R]);
				close(fd_in[W]);
			}
			close(fd_out[R]);
			close(fd_out[W]);
			return sink_abortstr(ctx, "Failed to create pipe: %s", strerror(errno));
		}
	}

	// spawn the child
	//GlobalForkLock(); // see notes above for Mac OSX
	pid_t chpid = fork();
	//GlobalForkUnlock();

	if (chpid == 0){
		// inside child

		// setup stdfiles to point to the correct pipes
		close(fd_exe[R]);
		if (writein){
			dup2(fd_in[R], STDIN_FILENO);
			close(fd_in[R]);
			close(fd_in[W]);
		}
		if (capture){
			dup2(fd_out[W], STDOUT_FILENO);
			close(fd_out[R]);
			close(fd_out[W]);
			dup2(fd_err[W], STDERR_FILENO);
			close(fd_err[R]);
			close(fd_err[W]);
		}

		if (hasenvs)
			execve(abs_cmd, rd.args, rd.envs);
		else
			execv(abs_cmd, rd.args);

		// execve failed, so write failure to fd_exe[W]
		char buf[200];
		int sz = snprintf(buf, sizeof(buf), "Failed to launch process: %s", strerror(errno));
		write(fd_exe[W], buf, sz);
		close(fd_exe[W]);
		_exit(1);
	}

	// inside parent
	RD_destroy(&rd);

	// setup files to be polled
	struct pollfd pfds[3];
	int pfds_size = 0;
	pfds[pfds_size++] = (struct pollfd){ .fd = fd_exe[R], .events = POLLIN, .revents = 0 };
	close(fd_exe[W]);
	if (writein){
		close(fd_in[R]);
		write(fd_in[W], writein, writein_size);
		close(fd_in[W]);
	}
	if (capture){
		pfds[pfds_size++] = (struct pollfd){ .fd = fd_out[R], .events = POLLIN, .revents = 0 };
		close(fd_out[W]);
		pfds[pfds_size++] = (struct pollfd){ .fd = fd_err[R], .events = POLLIN, .revents = 0 };
		close(fd_err[W]);
	}

	// buffers for captured data
	int capexe_size = 0;
	char capexe[202];
	int capout_size = 0;
	int capout_max = 0;
	uint8_t *capout = NULL;
	int caperr_size = 0;
	int caperr_max = 0;
	uint8_t *caperr = NULL;

	// poll the files to see which ones can be read from
	while (pfds_size > 0){
		int r = poll(pfds, pfds_size, -1);
		if (r == -1){
			for (int i = 0; i < pfds_size; i++)
				close(pfds[i].fd);
			if (capout)
				sink_free(capout);
			if (caperr)
				sink_free(caperr);
			return sink_abortstr(ctx, "Poll error: %s", strerror(errno));
		}
		else if (r == 0)
			continue;
		for (int i = 0; i < pfds_size; i++){
			if (pfds[i].revents == 0)
				continue;
			// process read
			pfds[i].revents = 0;
			char buf[1000];
			ssize_t sz = read(pfds[i].fd, buf, sizeof(buf));
			if (sz == -1){
				for (int j = 0; j < pfds_size; j++)
					close(pfds[j].fd);
				if (capout)
					sink_free(capout);
				if (caperr)
					sink_free(caperr);
				return sink_abortstr(ctx, "Read error: %s", strerror(errno));
			}
			else if (sz == 0){
				// fd eof
				close(pfds[i].fd);
				for (int j = i + 1; j < pfds_size; j++)
					pfds[j - 1] = pfds[j];
				pfds_size--;
			}
			else{
				if (pfds[i].fd == fd_exe[R]){
					// append to capexe
					if (capexe_size + sz < 200){
						memcpy(&capexe[capexe_size], buf, sz);
						capexe_size += sz;
					}
				}
				else if (pfds[i].fd == fd_out[R]){
					// append to capout
					if (capout_size + sz + 1 > capout_max){ // always leave room for an extra byte
						capout_max = capout_size + sz + 1000;
						capout = sink_realloc_safe(capout, capout_max);
					}
					memcpy(&capout[capout_size], buf, sz);
					capout_size += sz;
				}
				else if (pfds[i].fd == fd_err[R]){
					// append to caperr
					if (caperr_size + sz + 1 > caperr_max){ // always leave room for an extra byte
						caperr_max = caperr_size + sz + 1000;
						caperr = sink_realloc_safe(caperr, caperr_max);
					}
					memcpy(&caperr[caperr_size], buf, sz);
					caperr_size += sz;
				}
			}
		}
	}

	// check if the child failed at execve
	if (capexe_size > 0){
		if (capout)
			sink_free(capout);
		if (caperr)
			sink_free(caperr);
		return sink_abortstr(ctx, "%.*s", capexe_size, capexe);
	}

	// wait for the process to exit and get exit status
	int wstatus = 0;
	sink_val xstatus = SINK_NIL;
	pid_t wpid = waitpid(chpid, &wstatus, 0);
	if (wpid != chpid){
		if (capout)
			sink_free(capout);
		if (caperr)
			sink_free(caperr);
		return sink_abortstr(ctx, "Failed to wait for child: %s", strerror(errno));
	}
	if (WIFEXITED(wstatus))
		xstatus = sink_num(WEXITSTATUS(wstatus));
	else if (WIFSIGNALED(wstatus))
		xstatus = sink_num(-WTERMSIG(wstatus));
	else if (WIFSTOPPED(wstatus))
		xstatus = sink_num(-WSTOPSIG(wstatus));

	if (capture){
		sink_val capout_s, caperr_s;
		if (capout){
			capout[capout_size] = 0; // null terminate
			capout_s = sink_str_newblobgive(ctx, capout_size, capout);
		}
		else
			capout_s = sink_str_newempty(ctx);
		if (caperr){
			caperr[caperr_size] = 0; // null terminate
			caperr_s = sink_str_newblobgive(ctx, caperr_size, caperr);
		}
		else
			caperr_s = sink_str_newempty(ctx);
		sink_val res[3] = { xstatus, capout_s, caperr_s };
		return sink_list_newblob(ctx, 3, res);
	}
	return xstatus;
#endif
}

static sink_val L_dir_work(sink_ctx ctx, int size, sink_val *args, void *nuser){
	char *cwd = getcwd(NULL, 0);
	if (cwd == NULL)
		return sink_abortstr(ctx, "Failed to get current directory");
	sink_val a = sink_str_newcstr(ctx, cwd);
	free(cwd);
	return a;
}

static sink_val L_dir_list(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str dir;
	if (!sink_arg_str(ctx, size, args, 0, &dir))
		return SINK_NIL;

	sink_val res = sink_list_newempty(ctx);

#if defined(SINK_WIN)

	LARGE_INTEGER filesize;
	DWORD dwError = 0;

	// Check that the input path plus 3 is not longer than MAX_PATH.
	// Three characters are for the "\*" plus NULL appended below.
	size_t dirlen;
	StringCchLength((const char *)dir->bytes, MAX_PATH, &dirlen);
	if (dirlen > (MAX_PATH - 3))
		return sink_abortstr(ctx, "Directory path is too long: %.*s", dir->size, dir->bytes);

	// Prepare string for use with FindFile functions.  First, copy the
	// string to a buffer, then append '\*' to the directory name.
	TCHAR wdir[MAX_PATH];
	StringCchCopy(wdir, MAX_PATH, (const char *)dir->bytes);
	StringCchCat(wdir, MAX_PATH, TEXT("\\*"));

	// Find the first file in the directory.
	WIN32_FIND_DATA ffd;
	HANDLE find = FindFirstFile(wdir, &ffd);
	if (find == INVALID_HANDLE_VALUE)
		return win_abortstr(ctx, GetLastError(), "Failed to list directory: %s");

	// List all the files in the directory with some info about them.
	do {
		if (ffd.cFileName[0] == '.' &&
			(ffd.cFileName[1] == 0 || (ffd.cFileName[1] == '.' && ffd.cFileName[2] == 0)))
			continue;
		sink_list_push(ctx, res, sink_str_newcstr(ctx, ffd.cFileName));
	} while (FindNextFile(find, &ffd) != 0);

	DWORD err = GetLastError();
	if (err != ERROR_NO_MORE_FILES)
		return win_abortstr(ctx, err, "Failed to list directory: %s");

	FindClose(find);

#else

	struct dirent *ep;
	DIR *dp = opendir((const char *)dir->bytes);
	if (dp == NULL)
		return sink_abortstr(ctx, "Failed to read directory: %.*s", dir->size, dir->bytes);
	while (true){
		ep = readdir(dp);
		if (ep == NULL)
			break;
		if ((ep->d_namlen == 1 && ep->d_name[0] == '.') ||
			(ep->d_namlen == 2 && ep->d_name[0] == '.' && ep->d_name[1] == '.'))
			continue;
		sink_list_push(ctx, res, sink_str_newblob(ctx, ep->d_namlen, (const uint8_t *)ep->d_name));
	}
	closedir(dp);

#endif

	sink_list_sort(ctx, res);
	return res;
}

#if defined(SINK_WIN)
static inline FILE *fopen_i(const char *file, const char *mode){
	// remove annoying warnings about using "deprecated" (ugh) fopen
	FILE *fp;
	errno_t err = fopen_s(&fp, file, mode);
	if (err == 0)
		return fp;
	if (fp){
		fclose(fp);
		fp = NULL;
	}
	return fp;
}
#else
#	define fopen_i(a, b) fopen(a, b)
#endif

static sink_val L_file_canread(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str file;
	if (!sink_arg_str(ctx, size, args, 0, &file))
		return SINK_NIL;
	FILE *fp = fopen_i((const char *)file->bytes, "rb");
	if (fp){
		fclose(fp);
		return sink_bool(true);
	}
	return SINK_NIL;
}

static sink_val L_file_exists(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str file;
	if (!sink_arg_str(ctx, size, args, 0, &file))
		return SINK_NIL;
#if defined(SINK_WIN)
	// TODO: test this with network paths that are *just* \\host\computer
	// I think `file.exists` should return true
	DWORD a = GetFileAttributes((const char *)file->bytes);
	if (a == INVALID_FILE_ATTRIBUTES)
		return sink_bool(GetLastError() == ERROR_BAD_NETPATH);
	return sink_bool(true);
#else
	return sink_bool(access((const char *)file->bytes, F_OK) != -1);
#endif
}

static sink_val L_file_read(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str file;
	if (!sink_arg_str(ctx, size, args, 0, &file))
		return SINK_NIL;
	FILE *fp = fopen_i((const char *)file->bytes, "rb");
	if (fp == NULL)
		return sink_abortstr(ctx, "Could not read file: %.*s", file->size, file->bytes);
	fseek(fp, 0L, SEEK_END);
	long sz = ftell(fp);
	fseek(fp, 0L, SEEK_SET);
	uint8_t *buf = sink_malloc_safe(sz + 1);
	fread(buf, sz, 1, fp);
	fclose(fp);
	buf[sz] = 0;
	return sink_str_newblobgive(ctx, sz, buf);
}

static sink_val L_file_sink(sink_ctx ctx, int size, sink_val *args, const char *sink_exe){
	return sink_str_newcstr(ctx, sink_exe);
}

static sink_val L_file_script(sink_ctx ctx, int size, sink_val *args, const char *script){
	if (script == NULL)
		return SINK_NIL;
	return sink_str_newcstr(ctx, script);
}

static sink_val L_file_write(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str file;
	if (!sink_arg_str(ctx, size, args, 0, &file))
		return SINK_NIL;
	FILE *fp = fopen_i((const char *)file->bytes, "wb");
	if (fp == NULL)
		return sink_abortstr(ctx, "Could not write to file: %.*s", file->size, file->bytes);
	if (size >= 2){
		sink_str data;
		if (size == 2)
			data = sink_caststr(ctx, sink_tostr(ctx, args[1]));
		else
			data = sink_caststr(ctx, sink_str_new(ctx, size - 1, &args[1]));
		if (data->size > 0)
			fwrite(data->bytes, data->size, 1, fp);
	}
	fclose(fp);
	return SINK_NIL;
}

static sink_val L_path_joinp(sink_ctx ctx, int size, sink_val *args, void *nuser){
	sink_str start;
	if (!sink_arg_str(ctx, size, args, 0, &start))
		return SINK_NIL;
	if (size == 1)
		return args[0];
	for (int i = 1; i < size; i++){
		if (!sink_isstr(args[i]))
			return sink_abortstr(ctx, "Expecting string for argument %d", i + 1);
	}

	bool abs = start->size > 0 && start->bytes[0] == '/';

	sink_val comp_v = sink_list_newempty(ctx);
	sink_list comp = sink_castlist(ctx, comp_v);

	// TODO: this

	return SINK_NIL;
}

static sink_val L_path_joinw(sink_ctx ctx, int size, sink_val *args, void *nuser){
	// TODO: this
	return SINK_NIL;
}

void sink_shell_scr(sink_scr scr){
	sink_scr_incbody(scr, "shell",
		"declare version      'sink.shell.version'     ;"
		"declare args         'sink.shell.args'        ;"
		"declare run          'sink.shell.run'         ;"
		"declare which        'sink.shell.which'       ;"
		"declare file.canread 'sink.shell.file.canread';"
		"declare file.exists  'sink.shell.file.exists' ;"
		"declare file.read    'sink.shell.file.read'   ;"
		"declare file.sink    'sink.shell.file.sink'   ;"
		"declare file.script  'sink.shell.file.script' ;"
		"declare file.write   'sink.shell.file.write'  ;"
		"declare dir.work     'sink.shell.dir.work'    ;"
		"declare dir.list     'sink.shell.dir.list'    ;"
		"declare path.join    'sink.shell.path.join'   ;"
		"declare path.joinp   'sink.shell.path.joinp'  ;"
		"declare path.joinw   'sink.shell.path.joinw'  ;"
	);
}

void sink_shell_ctx(sink_ctx ctx, int argc, char **argv, const char *sink_exe, const char *script){
	uargs a = sink_malloc_safe(sizeof(uargs_st));
	a->args = argv;
	a->size = argc;
	sink_ctx_cleanup(ctx, a, sink_free);

	char *cwd = NULL;
	if (!isabs(sink_exe) || (script && !isabs(script))){
		cwd = getcwd(NULL, 0);
		if (cwd == NULL){
			fprintf(stderr, "Failed to get current directory when initializing sink_shell\n");
			exit(1);
			return;
		}
	}

	char *si;
	if (isabs(sink_exe))
		si = format("%s", sink_exe);
	else
		si = pathjoin(cwd, sink_exe);
	sink_ctx_cleanup(ctx, si, sink_free);

	char *sc = NULL;
	if (script){
		if (isabs(script))
			sc = format("%s", script);
		else
			sc = pathjoin(cwd, script);
		sink_ctx_cleanup(ctx, sc, sink_free);
	}

	if (cwd)
		free(cwd);

	sink_ctx_native(ctx, "sink.shell.version"     , NULL     , (sink_native_f)L_version     );
	sink_ctx_native(ctx, "sink.shell.args"        , a        , (sink_native_f)L_args        );
	sink_ctx_native(ctx, "sink.shell.run"         , NULL     , (sink_native_f)L_run         );
	sink_ctx_native(ctx, "sink.shell.which"       , NULL     , (sink_native_f)L_which       );
	sink_ctx_native(ctx, "sink.shell.file.canread", NULL     , (sink_native_f)L_file_canread);
	sink_ctx_native(ctx, "sink.shell.file.exists" , NULL     , (sink_native_f)L_file_exists );
	sink_ctx_native(ctx, "sink.shell.file.read"   , NULL     , (sink_native_f)L_file_read   );
	sink_ctx_native(ctx, "sink.shell.file.sink"   , si       , (sink_native_f)L_file_sink   );
	sink_ctx_native(ctx, "sink.shell.file.script" , sc       , (sink_native_f)L_file_script );
	sink_ctx_native(ctx, "sink.shell.file.write"  , NULL     , (sink_native_f)L_file_write  );
	sink_ctx_native(ctx, "sink.shell.dir.work"    , NULL     , (sink_native_f)L_dir_work    );
	sink_ctx_native(ctx, "sink.shell.dir.list"    , NULL     , (sink_native_f)L_dir_list    );
#if defined(SINK_WIN)
	sink_ctx_native(ctx, "sink.shell.path.join"   , NULL     , (sink_native_f)L_path_joinw  );
#else
	sink_ctx_native(ctx, "sink.shell.path.join"   , NULL     , (sink_native_f)L_path_joinp  );
#endif
	sink_ctx_native(ctx, "sink.shell.path.joinp"  , NULL     , (sink_native_f)L_path_joinp  );
	sink_ctx_native(ctx, "sink.shell.path.joinw"  , NULL     , (sink_native_f)L_path_joinw  );
}
