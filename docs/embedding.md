
Guide to Embedding
==================

(in progress... TODO)

Grabbing the Correct Files
==========================

Embedding starts with dropping in the correct files:

### C99

Copy the files into your project:

* `src/sink.h`
* `src/sink.c`

Their location doesn't matter, as long as they're in the same directory.  Add `sink.c` to your
build so it's compiled.

### TypeScript

Copy the files into your project:

* `dist/sink.ts`
* `dist/sink.d.ts` (declaration file, optional)

Import using:

```typescript
import sink = require('./sink.js');
```

### JavaScript

Copy the file into your project:

* `dist/sink.js`

Use in node via:

```js
var sink = require('./sink');
```

Or the browser via [RequireJS](http://requirejs.org/):

```html
<script src="require.js"></script>
<script>
requirejs(['sink'], function(sink){
  ... your code here ...
});
</script>
```

API
===

The API is very similar across the implementations.  The TypeScript API will be access via
`sink.some_function`, whereas the C99 API is `sink_some_function`.  See the appropriate header files
([`sink.h`](https://github.com/voidqk/sink/blob/master/src/sink.h) and
[`sink.d.ts`](https://github.com/voidqk/sink/blob/master/dist/sink.d.ts)) for the exact
declarations.

The API is in four basic sections:

| Section                     | Description                                           |
|-----------------------------|-------------------------------------------------------|
| [Script API](#script-api)   | Loading a program into memory, compiling if necessary |
| [Context API](#context-api) | Executing a program, pausing/resuming execution       |
| [Sink Commands API](#sink-commands-api) | Executing commands from the [standard library](https://github.com/voidqk/sink/blob/master/docs/lib.md) inside a context |
| [Helper Functions](#helper-functions) | Things to make your life a little easier    |

Script API
==========

The Script API is used for loading a program into memory.  It can load a script and compile it into
bytecode, or load bytecode directly.  It does not *execute* any code.

| Functions                       | Description                                               |
|---------------------------------|-----------------------------------------------------------|
| [`scr_new`](#scr_new)           | Create a new Script object                                |
| [`scr_addpath`](#scr_addpath)   | Add a search path for including/embedding files           |
| [`scr_incbody`](#scr_incbody)   | Provide a string to be included for a special filename    |
| [`scr_incfile`](#scr_incfile)   | Provide a file to be included for a special filename      |
| [`scr_getfile`](#scr_getfile)   | Get the fully resolved filename of the script             |
| [`scr_getcwd`](#scr_getcwd)     | Get the current working directory of the script           |
| [`scr_geterr`](#scr_geterr)     | Get any error message associated with the script          |
| [`scr_cleanup`](#scr_cleanup)   | Add user-defined objects to be freed when Script is freed |
| [`scr_setuser`](#scr_setuser)   | Set a user-defined value associated with the Script       |
| [`scr_getuser`](#scr_getuser)   | Get a previously set user-defined value                   |
| [`scr_loadfile`](#scr_loadfile) | Load a file through the include system                    |
| [`scr_write`](#scr_write)       | Write file contents into the Script object                |
| [`scr_level`](#scr_level)       | Get the level of nesting for REPLs                        |
| [`scr_dump`](#scr_dump)         | Dump the compiled bytecode                                |
| [`scr_free`](#scr_free)         | Free a Script object                                      |

scr_new
-------

Create a new Script object.

```c
sink_scr sink_scr_new(sink_inc_st inc, const char *curdir, const char *pathsep, bool repl);
```

```typescript
function sink.scr_new(inc: sink.inc_st, curdir: string | null, posix: boolean, repl: boolean):
  sink.scr;
```

### `inc`

An object that provides functions for the compiler to read files from the filesystem.

When a script uses `include` or `embed`, the compiler will query these functions (using the search
path) to figure out how to resolve to the correct file, and read the file.

```c
typedef enum {
  SINK_FSTYPE_NONE,
  SINK_FSTYPE_FILE,
  SINK_FSTYPE_DIR
} sink_fstype;

typedef sink_fstype (*sink_fstype_f)(const char *file, void *incuser);
typedef bool (*sink_fsread_f)(sink_scr scr, const char *file, void *incuser);

typedef struct {
  sink_fstype_f f_fstype;
  sink_fsread_f f_fsread;
  void *user;
} sink_inc_st;
```

```typescript
enum sink.fstype {
  NONE,
  FILE,
  DIR
}

type sink.fstype_f = (file: string, incuser: any) => sink.fstype | Promise<sink.fstype>;
type sink.fsread_f = (scr: sink.scr, file: string, incuser: any) => boolean | Promise<boolean>;

interface sink.inc_st {
  f_fstype: sink.fstype_f;
  f_fsread: sink.fsread_f;
  user?: any;
}
```

The `f_fstype` function should query the filesystem, and return one of the results: `NONE`
(i.e., `SINK_FSTYPE_NONE` in C, and `sink.fstype.NONE` in TypeScript) for a file that doesn't exist,
`FILE` for a file, and `DIR` for a directory.

The `f_fsread` function should attempt to open the provided file, and write it to the Script object
using [`scr_write`](#scr_write).  It should return `true` if the file was read successfully, and
`false` if the file failed to be read.

See [cmd.c](https://github.com/voidqk/sink/blob/master/src/cmd.c) or
[cmd.ts](https://github.com/voidqk/sink/blob/master/src/cmd.ts) for example implementations of these
functions.  Note that the TypeScript/JavaScript version must deal with Promises correctly, and can
return a Promise if the operations are asynchronous.

The `user` field is passed through to the `incuser` argument in the functions, at your discretion.

### `curdir`

The current working directory (or `null`/`NULL`).

This is used when a script includes or embeds a relative path, in order to construct an aboslute
path.

### `posix`

If true, then path routines will use POSIX logic.  It will treat `/` as a path seperator, and any
path starting with `/` will be considered an aboslute path.

If false, then path routines will use Windows logic.  It will treat `/` and `\` as path seperators,
join paths using `\`, and paths starting with a drive letter or network name will be considered
absolute (i.e., `c:\foo` or `//host/computer/foo`).

### `repl`

Flag indicating whether the script is a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop).

REPL scripts have slightly different rules during compilation, centered around allowing the user to
re-define symbols.

For example, the following script will result in a compile-time error, but works fine in a REPL
entered one line at a time:

```
def test
  say 1
end

def test
  say 2
end

test # => outputs 2 in a REPL
```

Normally, defining something twice will result in a compile-time error (`Cannot redefine "test"`).
In a REPL, re-definitions are allowed.

scr_addpath
-----------

Add a path to the list of search paths during an `include` or `embed` statement.

```c
void sink_scr_addpath(sink_scr scr, const char *path);
```

```typescript
function sink.scr_addpath(scr: sink.scr, path: string): void;
```

If a file with a relative path is included or embedded, sink will iterate over the search paths.
If a search path is relative, it will be combined with the [current working directory](#curdir),
along with the target file, to create an absolute path.

It's recommended to at least add `"."` as a search path so that the current directory will be
searched when including/embedding a file.

### `scr`

The Script object.

### `path`

The path to add to the list of search paths.

scr_incbody
-----------

Define a module in-memory, so that if the end-user performs an `include 'name'`, the provided
source code (`body`) is used as the content.

```c
void sink_scr_incbody(sink_scr scr, const char *name, const char *body);
```

```typescript
function sink.scr_incbody(scr: sink.scr, name: string, body: string): void;
```

This function is used for native libraries to provide a short name that end-users can use to include
the necessary definitions.

For example, suppose you want to build a `shapes` library, that included commands for drawing
circles and rectangles.  You would do:

```typescript
sink.scr_incbody(scr, 'shapes',
  'declare circle     "company.shapes.circle"     \n' +
  'declare rectangle  "company.shapes.rectangle"  \n');
```

Then when the end-user runs `include 'shapes'`, instead of searching for a `'shapes'` file in the
filesystem, it will pull the contents directly from memory.

### `src`

The Script object.

### `name`

The literal name the user must type in the `include` statement to pull in the content.

### `body`

The content of the included library.

scr_incfile
-----------

Define a module that references a file, so that if the end-user performs an `include 'name'`, the
file searched for in the include system is `file`.

```c
void sink_scr_incfile(sink_scr scr, const char *name, const char *file);
```

```typescript
function sink.scr_incfile(scr: sink.scr, name: string, file: string): void;
```

This function has the same basic usage as [`scr_incbody`](#scr_incbody), except instead of providing
the contents directly, the file contents are stored inside an actual file.

This is useful if a library wants to make the definitions available as an external file, and simply
wants to reference the file instead of having the contents directly in memory.

### `scr`

The Script object.

### `name`

The literal name the user must type in the `include` statement to search for the file.

### `file`

The file to actually search for during the include.

scr_getfile
-----------

Get the fully resolved filename of the current script.

```c
const char *sink_scr_getfile(sink_scr scr);
```

```typescript
function sink.scr_getfile(scr: sink.scr): string | null;
```

If you kick-off loading the script via an [`scr_loadfile`](#scr_loadfile) call with a relative file,
then this function will return the fully resolved (absolute path) of the filename that was found and
loaded.

### `scr`

The Script object.

scr_getcwd
----------

Returns the current working directory, as specified earlier from the [`scr_new`](#scr_new) call.

```c
const char *sink_scr_getcwd(sink_scr scr);
```

```typescript
function sink.scr_getcwd(scr: sink.scr): string | null;
```

scr_geterr
----------

Returns the current error message of the script (compile-time error, or `null`/`NULL` for no error).
Only needs to be checked if [`scr_write`](#scr_write) returns `false`.

```c
const char *sink_scr_geterr(sink_scr scr);
```

```typescript
function sink.scr_geterr(scr: sink.scr): string | null;
```

### `scr`

The Script object.

scr_cleanup
-----------

Provide a pointer and free function to be executed when the Script object is freed (C only).

```c
typedef void (*sink_free_f)(void *ptr);

void sink_scr_cleanup(sink_scr scr, void *cuser, sink_free_f f_free);
```

This is useful for libraries that allocate their own objects when loading into a sink Script object.
They can ensure the objects are cleaned up when the Script object is freed.

### `scr`

The Script object.

### `cuser`

The pointer to be freed when the Script object is freed.

### `f_free`

The function used to free `cuser`.

scr_setuser
-----------

Set a user-defined value associated with the Script object.  The value can be retrieved by
[`scr_getuser`](#scr_getuser).

```c
typedef void (*sink_free_f)(void *ptr);

void sink_scr_setuser(sink_scr scr, void *user, sink_free_f f_free);
```

```typescript
function sink.scr_setuser(scr: sink.scr, user: any): void;
```

### `scr`

The Script object.

### `user`

The user-defined value.

### `f_free`

The function used to free the object (C only).  If the user-defined value is overwritten by another
call to `scr_setuser`, or if the Script object is freed, then the current `user` value is freed via
`f_free`.

scr_getuser
-----------

Get the user-defined value associated with the Script object, previously set with
[`scr_setuser`](#scr_setuser).

```c
void *sink_scr_getuser(sink_scr scr);
```

```typescript
function sink.scr_getuser(scr: sink.scr): any;
```

### `scr`

The Script object.

scr_loadfile
------------

Load the script's file from the include filesystem.  Returns `true` if the file was loaded without
error, or `false` if there was an error.  The error is accessible via [`scr_geterr`](#scr_geterr).

```c
bool sink_scr_loadfile(sink_scr scr, const char *file);
```

```typescript
function sink.scr_loadfile(scr: sink.scr, file: string): boolean | Promise<boolean>;
```

A script can be loaded directly via [`scr_write`](#scr_write), but the compiler won't have any
filename information.  Instead, using `scr_loadfile` will kick off loading the data using the
include system, so that any errors are correctly identified as coming from the source file.

This will query for the file using [`f_fstype`](#inc), and load the file using [`f_fsread`](#inc),
which should call `scr_write`.

Note that the TypeScript/JavaScript version must deal with the possibility of receiving a Promise.

### `scr`

The Script object.

### `file`

The file to load using the include system.

scr_write
---------

Write the contents of a file or buffer into the Script object.  This is how all data is loaded into
the Script.  Returns `true` if the data was processed without error, or `false` if a compile-time
error occurred.  The error can be retrieved via [`scr_geterr`](#scr_geterr).

```c
bool sink_scr_write(sink_scr scr, int size, const uint8_t *bytes);
```

```typescript
function sink.scr_write(scr: sink.scr, bytes: string): boolean | Promise<boolean>;
```

Loading source code into the Script object is done with `scr_write`.  The function can be called
directly after creating a Script object, or it can be called indirectly through
[`scr_loadfile`](#scr_loadfile) -- which will eventually call [`f_fsread`](#inc) which should call
`scr_write` to write the data.

Note that the TypeScript/JavaScript version must deal with the possibility of receiving a Promise.

### `scr`

The Script object.

### `size`

The size of the `bytes` array (C only).

### `bytes`

The raw bytes to load.  Note: in TypeScript/JavaScript, the string is interpretted as
[`'binary'` encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings).

scr_level
---------

Returns the current nesting level for a REPL.  A value of `0` indicates no nesting.

```c
int sink_scr_level(sink_scr scr);
```

```typescript
function sink.scr_level(scr: sink.scr): number;
```

When typing in a series of lines in a REPL, the nesting level is how many indentations should be
shown in the prompt.  For example, a session might look like this:

```
 1: if rand.num < 0.5     # nesting level 0
 2... for var v: range 5  # nesting level 1
 3..... say v + 100       # nesting level 2
 4..... end               # nesting level 2
 5... end                 # nesting level 1
100
101
102
103
104
 6:                       # nesting level 0
 ```

The nesting level determines how many periods to draw to indent the line, and when the nesting
level hits `0`, it's known that a full statement has been entered, so the context is ran to catch
up to what's been entered.

### `scr`

The Script object.

scr_dump
--------

Output the compiled bytecode using the supplied `f_dump` function.

```c
typedef size_t (*sink_dump_f)(const void *restrict ptr, size_t size, size_t nitems,
  void *restrict dumpuser);

void sink_scr_dump(sink_scr scr, bool debug, void *user, sink_dump_f f_dump);
```

```typescript
type dump_f = (data: string, dumpuser: any) => void;

function sink.scr_dump(scr: sink.scr, debug: boolean, user: any, f_dump: sink.dump_f): void;
```

### `scr`

The Script object.

### `debug`

Flag whether to output debug information.

Debug information allows for stacktraces to be populated for run-time errors, but increases the size
of the bytecode, and exposes filenames and line numbers to the end-user.

### `user`

User-supplied value that is passed directly to `f_dump` as parameter `dumpuser`.

### `f_dump`

The function called to dump the bytecode.

Note that this function has the same signature as `fwrite` in the C implementation, so that the
file pointer can be passed in as `user`, and `fwrite` can be passed in as `f_dump`, for convenience.
The `size_t` return value is ignored.

The TypeScript implementation is passed string `data` in
[`'binary'` encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings).

scr_free
--------

Free the Script object (C only).

```c
void sink_scr_free(sink_scr scr);
```

Note this will also free any [`scr_setuser`](#scr_setuser) value, and any
[`scr_cleanup`](#scr_cleanup) pointers that have been associated with the Script object, before
freeing the Script object itself.

### `scr`

The Script object.

Context API
===========

The Context API is used for executing a Script.  It controls how and when to run the bytecode on the
virtual machine.

| Functions                               | Description                                           |
|-----------------------------------------|-------------------------------------------------------|
| [`ctx_new`](#ctx_new)                   | Create a new Context object                           |
| [`ctx_getstatus`](#ctx_getstatus)       | Get the status of the Context's virtual machine       |
| [`ctx_geterr`](#ctx_geterr)             | Get any error message associated with the run-time    |
| [`ctx_native`](#ctx_native)             | Add a native command using a string                   |
| [`ctx_nativehash`](#ctx_nativehash)     | Add a native command using a 64-bit hash              |
| [`ctx_cleanup`](#ctx_cleanup)           | Add user-defined objects to be freed when Context is freed |
| [`ctx_setuser`](#ctx_setuser)           | Set a user-defined value associated with the Context  |
| [`ctx_getuser`](#ctx_getuser)           | Get a previously set user-defined value               |
| [`ctx_addusertype`](#ctx_addusertype)   | Add a new usertype, for use with list's user data     |
| [`ctx_getuserfree`](#ctx_getuserfree)   | Get a usertype's free function                        |
| [`ctx_getuserhint`](#ctx_getuserhint)   | Get a usertype's hint string                          |
| [`ctx_asyncresult`](#ctx_asyncresult)   | Provide a result to an asynchronous operation         |
| [`ctx_settimeout`](#ctx_settimeout)     | Set a timeout so the machine pauses itself            |
| [`ctx_gettimeout`](#ctx_gettimeout)     | Get the current timeout value                         |
| [`ctx_forcetimeout`](#ctx_forcetimeout) | Force a timeout to occur immediately                  |
| [`ctx_run`](#ctx_run)                   | Run the virtual machine                               |
| [`ctx_free`](#ctx_free)                 | Free a Context object                                 |

ctx_new
-------

Create a new Context object.

```c
typedef void (*sink_output_f)(sink_ctx ctx, sink_str str, void *iouser);
typedef sink_val (*sink_input_f)(sink_ctx ctx, sink_str str, void *iouser);

typedef struct {
  sink_output_f f_say;
  sink_output_f f_warn;
  sink_input_f f_ask;
  void *user;
} sink_io_st;

sink_ctx sink_ctx_new(sink_scr scr, sink_io_st io);
```

```typescript
type sink.output_f = (ctx: sink.ctx, str: sink.str, iouser: any) => void | Promise<void>;
type sink.input_f = (ctx: sink.ctx, str: sink.str, iouser: any) => sink.val | Promise<sink.val>;

interface sink.io_st {
    f_say?: sink.output_f;
    f_warn?: sink.output_f;
    f_ask?: sink.input_f;
    user?: any;
}

function sink.ctx_new(scr: sink.scr, io: sink.io_st): sink.ctx;
```

### `scr`

The Script object to execute in the Context.

### `io`

The input/output functions for the machine.

The `f_say`, `f_warn`, and `f_ask` functions are called when the associated `say`, `warn`, and `ask`
commands are executed in the script.  The C versions must be synchronous, but the TypeScript
versions can return a Promise if needed.

The `f_ask` function should also return the value that the end-user input.  Return `NIL` for any
cancelled or end-of-file situation, and a string for any binary input.

The `user` field is mapped to `iouser`, and can be used for anything.

ctx_getstatus
-------------

Get the status of the Context's virtual machine.

```c
typedef enum {
  SINK_CTX_READY,
  SINK_CTX_WAITING,
  SINK_CTX_PASSED,
  SINK_CTX_FAILED
} sink_ctx_status;

sink_ctx_status sink_ctx_getstatus(sink_ctx ctx);
```

```typescript
enum sink.ctx_status {
  READY,
  WAITING,
  PASSED,
  FAILED
}

function sink.ctx_getstatus(ctx: sink.ctx): sink.ctx_status;
```

Returns one of the following values:

* `READY` - The virtual machine is ready for execution via [`ctx_run`](#ctx_run).
* `WAITING` - The virtual machine is waiting for an asynchronous operation to finish.
* `PASSED` - The virtual machine finished executing the script and exited successfully.
* `FAILED` - The virtual machine finished executing the script and exited in failure.

### `ctx`

The Context object.

ctx_geterr
----------

Returns the current run-time error message of the virtual machine, or `null`/`NULL` for no message.

```c
const char *sink_ctx_geterr(sink_ctx ctx);
```

```typescript
function sink.ctx_geterr(ctx: sink.ctx): string | null;
```

Note: This function will return `null` if the script calls `abort` without any parameters, so this
function cannot be used to check the error status of the VM.  Use [`ctx_getstatus`](#ctx_getstatus)
instead.

### `ctx`

The Context object.

ctx_native
----------

Add a native command implementation to the virtual machine using a string identifier.

```c
typedef sink_val (*sink_native_f)(sink_ctx ctx, int size, sink_val *args, void *natuser);

void sink_ctx_native(sink_ctx ctx, const char *name, void *natuser, sink_native_f f_native);
```

```typescript
type sink.native_f = (ctx: sink.ctx, args: sink.val[], natuser: any) =>
  sink.val | Promise<sink.val>;

function sink.ctx_native(ctx: sink.ctx, name: string, natuser: any, f_native: sink.native_f): void;
```

Native commands are stored using 64-bit hashes of string keys.  This function will perform the hash
on `name`, then call [`ctx_nativehash`](#ctx_nativehash) to add the native function to the run-time.

Native commands are accessed in sink via the `declare` statement:

```
# somewhere in sink
declare foo 'company.product.foo'
```

This is wired to a host function via:

```c
sink_val my_foo(sink_ctx ctx, int size, sink_val *args, void *natuser){
  // implementation here
  // return SINK_ASYNC for an asynchronous result
}

...

sink_ctx_native(ctx, "company.product.foo", NULL, my_foo);
```

```typescript
function my_foo(ctx: sink.ctx, args: sink.val[], natuser: any): sink.val | Promise<sink.val> {
  // implementation here
  // return a Promise<sink.val> for an asynchronous result
}

...

sink.ctx_native(ctx, 'company.product.foo', null, my_foo);
```

Notice that the `name` parameter matches the declaration in sink.

### `ctx`

The Context object.

### `name`

The string to be hashed for eventual lookup.

### `natuser`

User-defined value passed to `f_native`.

### `f_native`

The native function implementation.

ctx_nativehash
--------------

Add a native command implementation to the virtual machine using a specific hash value.

```c
typedef sink_val (*sink_native_f)(sink_ctx ctx, int size, sink_val *args, void *natuser);

void sink_ctx_nativehash(sink_ctx ctx, uint64_t hash, void *natuser, sink_native_f f_native);
```

```typescript
type sink.u64 = [number, number];
type sink.native_f = (ctx: sink.ctx, args: sink.val[], natuser: any) =>
  sink.val | Promise<sink.val>;

function sink.ctx_nativehash(ctx: sink.ctx, hash: sink.u64, natuser: any,
  f_native: sink.native_f): void;
```

See [`ctx_native`](#ctx_native) for documentation on native functions.

The hash value can be calculated using the algorithm below (written in sink):

```
# calculate the uint64_t C hash value
def native_c_hash name
  var h = str.hash name, 0 | num.hex 8
  return h[1] ~ h[0][2:]
end

# calculate the sink.u64 TypeScript hash value
def native_ts_hash name
  var h = str.hash name, 0 | num.hex 8
  return "[ ${h[0]}, ${h[1]} ]"
end
```

### `ctx`

The Context object.

### `hash`

The 64-bit hash.  In TypeScript this is stored as an array with two elements, each an unsigned
32-bit number.

### `natuser`

User-defined value passed to `f_native`.

### `f_native`

The native function implementation.

ctx_cleanup
-----------

Provide a pointer and free function to be executed when the Context object is freed (C only).

```c
typedef void (*sink_free_f)(void *ptr);

void sink_ctx_cleanup(sink_ctx ctx, void *cuser, sink_free_f f_free);
```

This is useful for libraries that allocate their own objects when loading into a sink Context
object.  They can ensure the objects are cleaned up when the Context object is freed.

### `ctx`

The Context object.

### `cuser`

The pointer to be freed when the Context object is freed.

### `f_free`

The function used to free `cuser`.

ctx_setuser
-----------

Set a user-defined value associated with the Context object.  The value can be retrieved by
[`ctx_getuser`](#ctx_getuser).

```c
typedef void (*sink_free_f)(void *ptr);

void sink_ctx_setuser(sink_ctx ctx, void *user, sink_free_f f_free);
```

```typescript
function sink.ctx_setuser(ctx: sink.ctx, user: any): void;
```

### `ctx`

The Context object.

### `user`

The user-defined value.

### `f_free`

The function used to free the object (C only).  If the user-defined value is overwritten by another
call to `ctx_setuser`, or if the Context object is freed, then the current `user` value is freed via
`f_free`.

ctx_getuser
-----------

Get the user-defined value associated with the Context object, previously set with
[`ctx_setuser`](#ctx_setuser).

```c
void *sink_ctx_getuser(sink_ctx ctx);
```

```typescript
function sink.ctx_getuser(ctx: sink.ctx): any;
```

### `ctx`

The Context object.

ctx_addusertype
---------------

Add a new user type to be associated with hidden data attached to lists.

```c
typedef int sink_user;
typedef void (*sink_free_f)(void *ptr);

sink_user sink_ctx_addusertype(sink_ctx ctx, const char *hint, sink_free_f f_free);
```

```typescript
type sink.user = number;

function sink.ctx_addusertype(ctx: sink.ctx, hint: string): sink.user;
```

User types are ways for a host to attach custom data to lists.

For example, suppose you want a sprite object:

```c
sprite the_sprite = sprite_new();
sink_user sprite_type = sink_ctx_addusertype(ctx, "sprite", sprite_free);
sink_val s = sink_user_new(ctx, sprite_type, the_sprite);
// `s` can be returned to sink scripts
// it will look like {'sprite'} to them, but have `the_sprite` attached to it

...

TODO more
```

# TODO

```
sink_free_f sink_ctx_getuserfree(sink_ctx ctx, sink_user usertype);
const char *sink_ctx_getuserhint(sink_ctx ctx, sink_user usertype);
void sink_ctx_asyncresult(sink_ctx ctx, sink_val v);
void sink_ctx_settimeout(sink_ctx ctx, int timeout);
int sink_ctx_gettimeout(sink_ctx ctx);
void sink_ctx_forcetimeout(sink_ctx ctx);
sink_run sink_ctx_run(sink_ctx ctx);
void sink_ctx_free(sink_ctx ctx);
```
