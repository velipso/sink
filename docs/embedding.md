
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

The API is very similar across the implementations.  The TypeScript API is accessed via
`sink.some_function`, whereas the C99 API is `sink_some_function`.  See the appropriate header files
([`sink.h`](https://github.com/voidqk/sink/blob/master/src/sink.h) and
[`sink.d.ts`](https://github.com/voidqk/sink/blob/master/dist/sink.d.ts)) for the exact
declarations.

The API is in four basic sections:

| Section                     | Description                                           |
|-----------------------------|-------------------------------------------------------|
| [Script API](#script-api)   | Loading a program into memory, compiling if necessary |
| [Context API](#context-api) | Executing a program, pausing/resuming execution       |
| [Standard Library API](#standard-library-api) | Executing commands from the [standard library](https://github.com/voidqk/sink/blob/master/docs/lib.md) inside a context |
| [Misc/Helper Functions](#mischelper-functions) | Assorted functions to make life easier |

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
sink_scr sink_scr_new(sink_inc_st inc, const char *curdir, bool posix, bool repl);
```

```typescript
function sink.scr_new(inc: sink.inc_st, curdir: string | null, posix: boolean, repl: boolean):
  sink.scr;
```

### `inc`

An object that provides functions for the compiler to read files from the filesystem.

When a script uses `include` or `embed`, the compiler will query these functions (using the
[search path](#scr_addpath)) to figure out how to resolve to the correct file, and read the file.

```c
typedef enum {
  SINK_FSTYPE_NONE,
  SINK_FSTYPE_FILE,
  SINK_FSTYPE_DIR
} sink_fstype;

typedef sink_fstype (*sink_fstype_f)(sink_scr scr, const char *file, void *incuser);
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

type sink.fstype_f = (scr: sink.scr, file: string, incuser: any) => Promise<sink.fstype>;
type sink.fsread_f = (scr: sink.scr, file: string, incuser: any) => Promise<boolean>;

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
functions.  Note that the TypeScript/JavaScript version must return a Promise.

The `user` field is passed through to the `incuser` argument in the functions, at your discretion.

### `curdir`

The current working directory (or `null`/`NULL`).  This must be an absolute path.

This is used when a script includes or embeds a relative path, in order to construct an absolute
path.

### `posix`

If true, then path routines will use POSIX logic.  It will treat `/` as a path seperator, and any
path starting with `/` will be considered an aboslute path.

If false, then path routines will use Windows logic.  It will treat `/` and `\` as path seperators,
join paths using `\`, and paths starting with a drive letter or network name will be considered
absolute (i.e., `c:\foo` or `\\host\computer\foo`).

### `repl`

Flag indicating whether the script is a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop).

REPL scripts have slightly different rules during compilation, centered around allowing the user to
re-define symbols.

For example, the following script will result in a compile-time error, but works fine in a REPL
entered one line at a time:

```
var test = 1
var test = 2
say test # => outputs 2 in a REPL
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
function sink.scr_loadfile(scr: sink.scr, file: string): Promise<boolean>;
```

A script can be loaded directly via [`scr_write`](#scr_write), but the compiler won't have any
filename information.  Instead, using `scr_loadfile` will kick off loading the data using the
include system, so that any errors are correctly identified as coming from the source file.

This will query for the file using [`f_fstype`](#inc), and load the file using [`f_fsread`](#inc),
which should call `scr_write`.

Note that the TypeScript/JavaScript version returns a Promise.

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
function sink.scr_write(scr: sink.scr, bytes: string): Promise<boolean>;
```

Loading source code into the Script object is done with `scr_write`.  The function can be called
directly after creating a Script object, or it can be called indirectly through
[`scr_loadfile`](#scr_loadfile) -- which will eventually call [`f_fsread`](#inc) which should call
`scr_write` to write the data.

Note that the TypeScript/JavaScript version returns a Promise.

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
| [`ctx_cleanup`](#ctx_cleanup)           | Add user-defined objects to be freed when Context is freed (C only) |
| [`ctx_setuser`](#ctx_setuser)           | Set a user-defined value associated with the Context  |
| [`ctx_getuser`](#ctx_getuser)           | Get a previously set user-defined value               |
| [`ctx_addusertype`](#ctx_addusertype)   | Add a new usertype, for use with list's user data     |
| [`ctx_getuserfree`](#ctx_getuserfree)   | Get a usertype's free function (C only)               |
| [`ctx_getuserhint`](#ctx_getuserhint)   | Get a usertype's hint string                          |
| [`ctx_settimeout`](#ctx_settimeout)     | Set a timeout so the machine pauses itself            |
| [`ctx_gettimeout`](#ctx_gettimeout)     | Get the current timeout value                         |
| [`ctx_consumeticks`](#ctx_consumeticks) | Decrease the current tick counter by an amount        |
| [`ctx_forcetimeout`](#ctx_forcetimeout) | Force a timeout to occur immediately                  |
| [`ctx_run`](#ctx_run)                   | Run the virtual machine                               |
| [`ctx_free`](#ctx_free)                 | Free a Context object (C only)                        |
| [`waiter`](#waiter)                     | Create a Wait object (C only)                         |
| [`done`](#done)                         | Create a Wait object that already has a result (C only) |
| [`then`](#then)                         | Attach a handler to a Wait object (C only)            |
| [`result`](#result)                     | Provide a result for a Wait object (C only)           |

ctx_new
-------

Create a new Context object.

```c
typedef sink_wait (*sink_io_f)(sink_ctx ctx, sink_str str, void *iouser);

typedef struct {
  sink_io_f f_say;
  sink_io_f f_warn;
  sink_io_f f_ask;
  void *user;
} sink_io_st;

sink_ctx sink_ctx_new(sink_scr scr, sink_io_st io);
```

```typescript
type sink.io_f = (ctx: sink.ctx, str: sink.str, iouser: any) => Promise<sink.val>;

interface sink.io_st {
    f_say?: sink.io_f;
    f_warn?: sink.io_f;
    f_ask?: sink.io_f;
    user?: any;
}

function sink.ctx_new(scr: sink.scr, io: sink.io_st): sink.ctx;
```

### `scr`

The Script object to execute in the Context.

### `io`

The input/output functions for the machine.

The `f_say`, `f_warn`, and `f_ask` functions are called when the associated `say`, `warn`, and `ask`
commands are executed in the script.

The C versions use the [`sink_wait`](#waiter) system to deal with asynchronous operations.

The TypeScript versions must return a Promise.

It's recommended that `f_say` and `f_warn` always return `NIL`, but not required.

The `user` field is mapped to `iouser`, and can be used for anything.

ctx_getstatus
-------------

Get the status of the Context's virtual machine.

```c
typedef enum {
  SINK_READY,
  SINK_WAITING,
  SINK_PASSED,
  SINK_FAILED
} sink_status;

sink_status sink_ctx_getstatus(sink_ctx ctx);
```

```typescript
enum sink.status {
  READY,
  WAITING,
  PASSED,
  FAILED
}

function sink.ctx_getstatus(ctx: sink.ctx): sink.status;
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
typedef sink_wait (*sink_native_f)(sink_ctx ctx, int size, sink_val *args, void *natuser);

void sink_ctx_native(sink_ctx ctx, const char *name, void *natuser, sink_native_f f_native);
```

```typescript
type sink.native_f = (ctx: sink.ctx, args: sink.val[], natuser: any) => Promise<sink.val>;

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
sink_wait my_foo(sink_ctx ctx, int size, sink_val *args, void *natuser){
  // implementation here
}

...

sink_ctx_native(ctx, "company.product.foo", NULL, my_foo);
```

```typescript
function my_foo(ctx: sink.ctx, args: sink.val[], natuser: any): Promise<sink.val> {
  // implementation here
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

The native function implementation.  This function returns a [sink_wait](#waiter) object in C, and
a Promise in TypeScript.

ctx_nativehash
--------------

Add a native command implementation to the virtual machine using a specific hash value.

```c
typedef sink_wait (*sink_native_f)(sink_ctx ctx, int size, sink_val *args, void *natuser);

void sink_ctx_nativehash(sink_ctx ctx, uint64_t hash, void *natuser, sink_native_f f_native);
```

```typescript
type sink.u64 = [number, number];
type sink.native_f = (ctx: sink.ctx, args: sink.val[], natuser: any) => Promise<sink.val>;

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

The native function implementation.  This function returns a [sink_wait](#waiter) object in C, and
a Promise in TypeScript.

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
// register the type (once)
sink_user sprite_type = sink_ctx_addusertype(ctx, "sprite", sprite_free);

// creating a list with the_sprite attached to it
sprite the_sprite = sprite_new();
sink_val s = sink_user_new(ctx, sprite_type, the_sprite);
// `s` can be returned to sink scripts
// it will look like {'sprite'} to them, but have `the_sprite` attached to it

// extract a sprite from a list
if (sink_list_hasuser(ctx, s, sprite_type)){
  sprite the_sprite = sink_list_getuser(ctx, s);
  // use the_sprite
}
```

```typescript
// register the type (once)
let sprite_type: sink.user = sink.ctx_addusertype(ctx, 'sprite');

// creating a list with the_sprite attached to it
let the_sprite: sprite = new sprite();
let s: sink.val = sink.user_new(ctx, sprite_type, the_sprite);
// `s` can be returned to sink scripts
// it will look like {'sprite'} to them, but have `the_sprite` attached to it

// extract a sprite from a list
if (sink.list_hasuser(ctx, s, sprite_type)){
  let the_sprite: sprite = sink.list_getuser(ctx, s) as sprite;
  // use the_sprite
}
```

### `ctx`

The Context object.

### `hint`

The string used inside the list when building a user object.

Note that this doesn't have any real meaning -- it simply exists so that when the end-user prints
out the object, it says something useful.

This should never be used for type checking.  Instead, a host should provide a native function
like `issprite` that will use [`list_hasuser`](#list_hasuser) to query the actual underlying type.

### `f_free`

The function used to free the object, or `NULL` (C only).

This function will be called when the garbage collector determines that the list container is
unreachable and should be collected.  It will also be called if the user value is ever overwritten
via [`list_setuser`](#list_setuser).

ctx_getuserfree
---------------

Get the `f_free` function associated with a user type (C only).  See:
[`ctx_addusertype`](#ctx_addusertype).

```c
typedef int sink_user;

sink_free_f sink_ctx_getuserfree(sink_ctx ctx, sink_user usertype);
```

### `ctx`

The Context object.

### `usertype`

The user type returned from `ctx_addusertype`.

ctx_getuserhint
---------------

Get the `hint` associated with a user type.  See: [`ctx_addusertype`](#ctx_addusertype).

```c
typedef int sink_user;

const char *sink_ctx_getuserhint(sink_ctx ctx, sink_user usertype);
```

```typescript
type sink.user = number;

function sink.ctx_getuserhint(ctx: sink.ctx, usertype: sink.user): string;
```

### `ctx`

The Context object.

### `usertype`

The user type returned from `ctx_addusertype`.

ctx_settimeout
--------------

Set a timeout so that the virtual machine will only execute a certain number of operations before
returning from [`ctx_run`](#ctx_run).

```c
void sink_ctx_settimeout(sink_ctx ctx, int timeout);
```

```typescript
function sink.ctx_settimeout(ctx: sink.ctx, timeout: number): void;
```

For example, if the timeout is 1000, then the VM will run 1000 ticks before timing out.  Each
machine instruction counts as 1 tick, and a garbage collection cycle counts as 100 ticks (defined by
`SINK_GC_TICKS`).  Native functions can consume ticks via [`ctx_consumeticks`](#ctx_consumeticks),
or empty the available ticks to 0 via [`ctx_forcetimeout`](#ctx_forcetimeout).

When there are no ticks left, `ctx_run` returns `TIMEOUT` and resets the available ticks to
`timeout`.  The machine is resumed with another call to `ctx_run`, and the process repeats.

### `ctx`

The Context object.

### `timeout`

Roughly the number of operations to execute before returning from `ctx_run` with a `TIMEOUT` result.
Use `0` to disable a timeout entirely, which is the default state.

ctx_gettimeout
--------------

Get the current timeout setting from the virtual machine.  See: [`ctx_settimeout`](#ctx_settimeout).

```c
int sink_ctx_gettimeout(sink_ctx ctx);
```

```typescript
function sink.ctx_gettimeout(ctx: sink.ctx): number;
```

The return value will be `0` if timing out is disabled.

### `ctx`

The Context object.

ctx_consumeticks
---------------

Decrease the current tick counter by `amount`.

```c
void sink_ctx_consumeticks(sink_ctx ctx, int amount);
```

```typescript
function sink.ctx_consumeticks(ctx: sink.ctx, amount: number): void
```

Use this function to inform the virtual machine that an operation has taken a long time, so the
value used to track when a timeout happens reflects this delay.

For example, if a native command takes a long time, it could inform the machine to decrease the
internal timer by 50 ticks via `sink.ctx_consumeticks(ctx, 50)`.

### `ctx`

The Context object.

### `amount`

The amount of ticks to decrease the tick counter.  This value should be positive.

ctx_forcetimeout
----------------

Force a timeout to occur immediately.  Timeouts must be enabled via
[`ctx_settimeout`](#ctx_settimeout) for this to have an effect.

```c
void sink_ctx_forcetimeout(sink_ctx ctx);
```

```typescript
function sink.ctx_forcetimeout(ctx: sink.ctx): void;
```

This will immediately expire the internal timer, so that when control returns to
[`ctx_run`](#ctx_run), it will immediately return `TIMEOUT`.

### `ctx`

The Context object.

ctx_run
-------

Run the virtual machine.  This is the main function used to execute a script.

```c
typedef enum {
  SINK_RUN_PASS,
  SINK_RUN_FAIL,
  SINK_RUN_ASYNC,
  SINK_RUN_TIMEOUT,
  SINK_RUN_REPLMORE
} sink_run;

sink_wait sink_ctx_run(sink_ctx ctx);
```

```typescript
enum sink.run {
  PASS,
  FAIL,
  ASYNC,
  TIMEOUT,
  REPLMORE
}

function sink.ctx_run(ctx: sink.ctx): Promise<sink.run>;
```

This function will execute the bytecode and dispatch [I/O](#ctx_new) and [native](#ctx_native)
functions as needed.

It will return one of the following values:

* `PASS` - Execution has finished and the script exited successfully.
* `FAIL` - Execution has finished and the script exited in failure.  Use [`ctx_geterr`](#ctx_geterr)
  to get the run-time error message, if it exists.
* `ASYNC` - Machine is waiting for an asynchronous result to continue.
* `TIMEOUT` - The machine's [timeout](#ctx_settimeout) has triggered.  Run `ctx_run` to resume.
* `REPLMORE` - The machine has detected it has executed as much as it could before needing more
  source code entered from the REPL.  This only happens if the Script is in [REPL mode](#scr_new).

The TypeScript version will return a Promise.

The C version will return a [`sink_wait`](#waiter) object, that will resolve to a number that
corresponds to the `sink_run` result, i.e.:

```c
void run_finished(sink_ctx ctx, sink_val statusv, void *thenuser){
  sink_run status = (sink_run)sink_castnum(statusv);
  switch (status){
    case SINK_RUN_PASS:     // ... etc ...
    case SINK_RUN_FAIL:     // ... etc ...
    case SINK_RUN_ASYNC:    // ... etc ...
    case SINK_RUN_TIMEOUT:  // ... etc ...
    case SINK_RUN_REPLMORE: // ... etc ...
  }
}

// somewhere else:
sink_then(
  sink_ctx_run(ctx),
  (sink_then_st){
    .f_then = run_finished,
    .f_cancel = NULL,
    .user = NULL
  }
);
```

### `ctx`

The Context object.

ctx_free
--------

Free the Context object (C only).

```c
void sink_ctx_free(sink_ctx ctx);
```

Note this will also free any [`ctx_setuser`](#ctx_setuser) value, and any
[`ctx_cleanup`](#ctx_cleanup) pointers that have been associated with the Context object, before
freeing the Context object itself.

### `ctx`

The Context object.

waiter
------

Create a Wait object that will eventually be resolved with a result and handler (C only).

```c
sink_wait sink_waiter(sink_ctx ctx);
```

Wait objects are used to implement asynchronous operations within the Context.  A Wait object
becomes resolved when two things are provided: a handler (via [`sink_then`](#then)), and a result
(via [`sink_result`](#result)).  When both items are provided, the handler's `f_then` function is
immediately called with the result.

Once a Wait object is resolved, it is automatically freed.  If a Wait object never resolves (for
example, if [`ctx_free`](#ctx_free) is called on the Context with an outstanding Wait object), it is
cancelled in order to free any dangling user data.

Wait objects are used in [I/O](#ctx_new) and [native](#ctx_native) functions.  These functions can
return a Wait object, or `NULL` to indicate the result is `NIL` (in order to avoid allocating a new
Wait object).

### `ctx`

The Context object.

done
----

Create a Wait object that already has a result (C only).

```c
sink_wait sink_done(sink_ctx ctx, sink_val result);
```

Many functions will not be asynchronous, and can just return a result directly.  Use `sink_done`
for convenience.  It is equivalent to:

```c
sink_wait w = sink_waiter(ctx);
sink_result(w, result);
return w;
```

### `ctx`

The Context object.

### `result`

The result to provide to the Wait object.

then
----

Attach a handler to a Wait object (C only).

```c
typedef void (*sink_then_f)(sink_ctx ctx, sink_val result, void *thenuser);
typedef void (*sink_cancel_f)(void *thenuser);

typedef struct {
  sink_then_f f_then;
  sink_cancel_f f_cancel;
  void *user;
} sink_then_st;

void sink_then(sink_wait w, sink_then_st then);
```

If the Wait object already has a result, the `f_then` function will be called immediately with the
result.

### `w`

The Wait object.

### `then`

The handler for the Wait object.

The `f_then` function is what will be called when both the handler and result are provided to a Wait
object.

The `f_cancel` function will be called if an outstanding Wait object is cancelled.  This can happen
if the Context is freed in the middle of an asynchronous operation.  The `f_cancel` function should
free any data inside the `user` field.

The `user` field is passed through to the `thenuser` argument in the functions, at your discretion.

result
------

Provide a result for a Wait object (C only).

```c
void sink_result(sink_wait w, sink_val result);
```

If the Wait object already has a handler, its `f_then` function will be called immediately with the
result.

### `w`

The Wait object.

### `result`

The final result for the operation.

Standard Library API
====================

The entire [standard library](https://github.com/voidqk/sink/blob/master/docs/lib.md) is available
from the host environment.

In C, the host function is prefixed with `sink_`, and in TypeScript/JavaScript, the host function
is prefixed with `sink.`.

See the [C header file](https://github.com/voidqk/sink/blob/master/src/sink.h) and the
[TypeScript declaration file](https://github.com/voidqk/sink/blob/master/dist/sink.d.ts) for
function parameters.  It should be straight-forward.

Note: the following commands are not available at run-time because they only work at compile-time:

* `pick` - this is compiled into an equivalent `if` statement, in order to implement
  [short-circuit evaluation](https://en.wikipedia.org/wiki/Short-circuit_evaluation)
* `embed` - this loads files strictly at compile-time as strings
* `include` - this loads files strictly at compile-time as code

| Sink Command      | Host Function     |
|-------------------|-------------------|
| `+x`              | `tonum`           |
| `'' ~ x`          | `tostr`           |
| `&x`              | `size`            |
| `say`             | `say`             |
| `warn`            | `warn`            |
| `ask`             | `ask`             |
| `exit`            | `exit`            |
| `abort`           | `abort`           |
| `isnum`           | `isnum`           |
| `isstr`           | `isstr`           |
| `islist`          | `islist`          |
| `range`           | `range`           |
| `order`           | `order`           |
| `stacktrace`      | `stacktrace`      |
| `-x`              | `num_neg`         |
| `x + y`           | `num_add`         |
| `x - y`           | `num_sub`         |
| `x * y`           | `num_mul`         |
| `x / y`           | `num_div`         |
| `x % y`           | `num_mod`         |
| `x ^ y`           | `num_pow`         |
| `num.abs`         | `num_abs`         |
| `num.sign`        | `num_sign`        |
| `num.max`         | `num_max`         |
| `num.min`         | `num_min`         |
| `num.clamp`       | `num_clamp`       |
| `num.floor`       | `num_floor`       |
| `num.ceil`        | `num_ceil`        |
| `num.trunc`       | `num_trunc`       |
| `num.nan`         | `num_nan`         |
| `num.inf`         | `num_inf`         |
| `num.isnan`       | `num_isnan`       |
| `num.isfinite`    | `num_isfinite`    |
| `num.e`           | `num_e`           |
| `num.pi`          | `num_pi`          |
| `num.tau`         | `num_tau`         |
| `num.sin`         | `num_sin`         |
| `num.cos`         | `num_cos`         |
| `num.tan`         | `num_tan`         |
| `num.asin`        | `num_asin`        |
| `num.acos`        | `num_acos`        |
| `num.atan`        | `num_atan`        |
| `num.atan2`       | `num_atan2`       |
| `num.log`         | `num_log`         |
| `num.log2`        | `num_log2`        |
| `num.log10`       | `num_log10`       |
| `num.exp`         | `num_exp`         |
| `num.lerp`        | `num_lerp`        |
| `num.hex`         | `num_hex`         |
| `num.oct`         | `num_oct`         |
| `num.bin`         | `num_bin`         |
| `int.new`         | `int_new`         |
| `int.not`         | `int_not`         |
| `int.and`         | `int_and`         |
| `int.or`          | `int_or`          |
| `int.xor`         | `int_xor`         |
| `int.shl`         | `int_shl`         |
| `int.shr`         | `int_shr`         |
| `int.sar`         | `int_sar`         |
| `int.add`         | `int_add`         |
| `int.sub`         | `int_sub`         |
| `int.mul`         | `int_mul`         |
| `int.div`         | `int_div`         |
| `int.mod`         | `int_mod`         |
| `int.clz`         | `int_clz`         |
| `int.pop`         | `int_pop`         |
| `int.bswap`       | `int_bswap`       |
| `rand.seed`       | `rand_seed`       |
| `rand.seedauto`   | `rand_seedauto`   |
| `rand.int`        | `rand_int`        |
| `rand.num`        | `rand_num`        |
| `rand.getstate`   | `rand_getstate`   |
| `rand.setstate`   | `rand_setstate`   |
| `rand.pick`       | `rand_pick`       |
| `rand.shuffle`    | `rand_shuffle`    |
| `str.new`         | `str_new`         |
| `x ~ y`           | `str_cat`         |
| `x[y:z]`          | `str_slice`       |
| `x[y:z] = w`      | `str_splice`      |
| `str.split`       | `str_split`       |
| `str.replace`     | `str_replace`     |
| `str.begins`      | `str_begins`      |
| `str.ends`        | `str_ends`        |
| `str.pad`         | `str_pad`         |
| `str.find`        | `str_find`        |
| `str.rfind`       | `str_rfind`       |
| `str.lower`       | `str_lower`       |
| `str.upper`       | `str_upper`       |
| `str.trim`        | `str_trim`        |
| `str.rev`         | `str_rev`         |
| `str.list`        | `str_list`        |
| `str.byte`        | `str_byte`        |
| `str.hash`        | `str_hash`        |
| `utf8.valid`      | `utf8_valid`      |
| `utf8.list`       | `utf8_list`       |
| `utf8.str`        | `utf8_str`        |
| `struct.size`     | `struct_size`     |
| `struct.str`      | `struct_str`      |
| `struct.list`     | `struct_list`     |
| `struct.isLE`     | `struct_isLE`     |
| `list.new`        | `list_new`        |
| `x ~ y`           | `list_cat`        |
| `x[y:z]`          | `list_slice`      |
| `x[y:z] = w`      | `list_splice`     |
| `list.shift`      | `list_shift`      |
| `list.pop`        | `list_pop`        |
| `list.push`       | `list_push`       |
| `list.unshift`    | `list_unshift`    |
| `list.append`     | `list_append`     |
| `list.prepend`    | `list_prepend`    |
| `list.find`       | `list_find`       |
| `list.rfind`      | `list_rfind`      |
| `list.join`       | `list_join`       |
| `list.rev`        | `list_rev`        |
| `list.str`        | `list_str`        |
| `list.sort`       | `list_sort`       |
| `list.rsort`      | `list_rsort`      |
| `pickle.json`     | `pickle_json`     |
| `pickle.bin`      | `pickle_bin`      |
| `pickle.val`      | `pickle_val`      |
| `pickle.valid`    | `pickle_valid`    |
| `pickle.sibling`  | `pickle_sibling`  |
| `pickle.circular` | `pickle_circular` |
| `pickle.copy`     | `pickle_copy`     |
| `gc.getlevel`     | `gc_getlevel`     |
| `gc.setlevel`     | `gc_setlevel`     |
| `gc.run`          | `gc_run`          |

Misc/Helper Functions
=====================

| Function/Value                          | Description                                           |
|-----------------------------------------|-------------------------------------------------------|
| [`NIL`](#NIL)                           | The literal `nil` value                               |
| [`bool`](#bool)                         | Convert a boolean to a sink value                     |
| [`isnil`](#isnil)                       | Test if a sink value is `nil`                         |
| [`isfalse`](#isfalse)                   | Test if a sink value is false (`nil`)                 |
| [`istrue`](#istrue)                     | Test if a sink value is true (non-`nil`)              |
| [`typeof`](#typeof)                     | Get the type of a sink value                          |
| [`castnum`](#castnum)                   | Reinterpret a sink value as a number (C only)         |
| [`num`](#num)                           | Convert a number to a sink value (C only)             |
| [`caststr`](#caststr)                   | Reinterpret a sink value as a string (C only)         |
| [`str_newcstr`](#str_newcstr)           | Create sink string by copying a C string (C only)     |
| [`str_newcstrgive`](#str_newcstrgive)   | Create sink string from a C string, giving memory ownership to sink (C only) |
| [`str_newblob`](#str_newblob)           | Create sink string by copying a blob of data (C only) |
| [`str_newblobgive`](#str_newblobgive)   | Create sink string from a blob of data, giving memory ownership to sink (C only) |
| [`str_newempty`](#str_newempty)         | Create an empty string (C only)                       |
| [`str_newformat`](#str_newformat)       | Create a string from a `printf`-formatted expression (C only) |
| [`str_hashplain`](#str_hashplain)       | Hash a string directly                                |
| [`castlist`](#castlist)                 | Reinterpret a sink value as a list (C only)           |
| [`list_newblob`](#list_newblob)         | Create sink list by copying a list of values (C only) |
| [`list_newblobgive`](#list_newblobgive) | Create sink list from a list of values, giving memory ownership to sink (C only) |
| [`list_newempty`](#list_newempty)       | Create an empty list (C only)                         |
| [`list_setuser`](#list_setuser)         | Set the user-defined data associated with a list      |
| [`list_hasuser`](#list_hasuser)         | Check if a list has a certain type of user-defined data |
| [`list_getuser`](#list_getuser)         | Get the user-defined data associated with a list      |
| [`list_joinplain`](#list_joinplain)     | Join a list directly                                  |
| [`user_new`](#user_new)                 | Create a list with user-defined data attached to it   |
| [`pickle_binstr`](#pickle_binstr)       | Pickle a sink value into binary data for marshalling  |
| [`pickle_binstrfree`](#pickle_binstrfree)| Free the results of `pickle_binstr` (C only)         |
| [`pickle_valstr`](#pickle_valstr)       | Convert a marshalled string into a sink value         |
| [`gc_pin`](#gc_pin)                     | Pin a value to prevent it from being garbage-collected (C only) |
| [`gc_unpin`](#gc_unpin)                 | Unpin a previously pinned value, allowing it to be garbage-collected (C only) |
| [`abortstr`](#abortstr)                 | Abort with a formatted string (C only)                |
| [`arg_bool`](#arg_bool)                 | Convert a native argument to a boolean                |
| [`arg_num`](#arg_num)                   | Convert a native argument to a number, if possible    |
| [`arg_str`](#arg_str)                   | Convert a native argument to a string, if possible    |
| [`arg_list`](#arg_list)                 | Convert a native argument to a list, if possible      |
| [`arg_user`](#arg_user)                 | Convert a native argument to a user-defined value, if possible |
| [`seedauto_src`](#seedauto_src)         | The function that provides the source random data for `rand.seedauto` |
| [`malloc`](#malloc)                     | The function that provides all memory allocation (C only) |
| [`realloc`](#realloc)                   | The function that provides all memory reallocation (C only) |
| [`free`](#free)                         | The function that provides all memory freeing (C only)|

NIL
---

The literal `nil` value.

```c
const sink_val SINK_NIL;
```

```typescript
const sink.NIL: null;
```

bool
----

Convert a boolean to a sink value.

```c
sink_val sink_bool(bool f);
```

```typescript
function sink.bool(f: boolean): sink.val;
```

This is a convenience function that will return `nil` for `false`, and `1` for `true`.

### `f`

The boolean flag to convert.

isnil
-----

Test if a sink value is `nil`.

```c
bool sink_isnil(sink_val v);
```

```typescript
function sink.isnil(v: sink.val): boolean;
```

### `v`

The value to test.

isfalse
-------

Test if a sink value is false (`nil`).

```c
bool sink_isfalse(sink_val v);
```

```typescript
function sink.isfalse(v: sink.val): boolean;
```

### `v`

The value to test.

istrue
------

Test if a sink value is true (non-`nil`).

```c
bool sink_istrue(sink_val v);
```

```typescript
function sink.istrue(v: sink.val): boolean;
```

### `v`

The value to test.

typeof
------

Get the type of a sink value.

```c
typedef enum {
  SINK_TYPE_NIL,
  SINK_TYPE_NUM,
  SINK_TYPE_STR,
  SINK_TYPE_LIST
} sink_type;

sink_type sink_typeof(sink_val v);
```

```typescript
enum sink.type {
  NIL,
  NUM,
  STR,
  LIST
}

function sink.sink_typeof(v: sink.val): sink.type;
```

Note that the TypeScript version is `sink.sink_typeof` instead of `sink.typeof` because `typeof` is
a reserved keyword in TypeScript/JavaScript.

### `v`

The value that should be type checked.

castnum
-------

Reinterpret a sink value as a number (C only).

```c
double sink_castnum(sink_val v);
```

Note that this function does not perform type checking.  If a non-number is cast to a number, the
results are undefined.

### `v`

The value to be reinterpretted.

num
---

Convert a number to a sink value (C only).

```c
sink_val sink_num(double v);
```

### `v`

The value to be converted.

caststr
-------

Reinterpret a sink value as a string (C only).

```c
typedef struct {
  const uint8_t *bytes;
  const int size;
} sink_str_st, *sink_str;

sink_str sink_caststr(sink_ctx ctx, sink_val str);
```

Note that this function does not perform type checking.  If a non-string is cast to a string, the
results are undefined.

In order to *convert* a value to a string, use `sink_tostr`.

The return value is a `sink_str` object, where the application can access the raw bytes and size of
the array.  The `bytes` value can be `NULL` for an empty string, otherwise it is guaranteed to be
`NULL`-terminated (i.e., `result->bytes[result->size] == 0`).

The application should not change the data in any way.

### `ctx`

The Context object.

### `str`

The value to be reinterpretted.

str_newcstr
-----------

Create a sink string by copying a C string (C only).

```c
sink_val sink_str_newcstr(sink_ctx ctx, const char *str);
```

### `ctx`

The Context object.

### `str`

The `NULL`-terminated C string.

str_newblob
-----------

Create sink string by copying a blob of data (C only).

```c
sink_val sink_str_newblob(sink_ctx ctx, int size, const uint8_t *bytes);
```

### `ctx`

The Context object.

### `size`

The size of the `bytes` array, or `0` for an empty string.

### `bytes`

The raw bytes to copy, or `NULL` for an empty string.

str_newblobgive
---------------

Create sink string from a blob of data, giving memory ownership to sink (C only).

```c
sink_val sink_str_newblobgive(sink_ctx ctx, int size, uint8_t *bytes);
```

**Note:** non-empty strings *must* have `bytes` allocated to store `size + 1` bytes, where
`bytes[size]` is set to `0`, guaranteeing that the string is `NULL`-terminated.

**Note:** non-empty strings *must* use [`sink_malloc`](#malloc) to allocate the `bytes` array.  It
will be freed by the garbage collector using [`sink_free`](#free) automatically.

### `ctx`

The Context object.

### `size`

The size of the `bytes` array, or `0` for an empty string.

### `bytes`

The raw bytes to use as the string, or `NULL` for an empty string.

str_newempty
------------

Create an empty string (C only).

```c
sink_val sink_str_newempty(sink_ctx ctx);
```

### `ctx`

The Context object.

str_newformat
-------------

Create a string from a `printf`-formatted expression (C only).

```c
sink_val sink_str_newformat(sink_ctx ctx, const char *fmt, ...);
```

### `ctx`

The Context object.

### `fmt`

The `printf`-style format string.

### `...`

The arguments to feed to the formatter.

str_hashplain
-------------

Hash a string directly.

```c
void sink_str_hashplain(int size, const uint8_t *bytes, uint32_t seed, uint32_t *out);
```

```typescript
function sink.str_hashplain(bytes: string, seed: number): [number, number, number, number];
```

This function is useful because it can calculate hashes without a Context object.  It doesn't
require any parameters other than the string and seed.

### `size`

The size of the `bytes` array (C only).

### `bytes`

The raw bytes.  Note: in TypeScript/JavaScript, the string is interpretted as
[`'binary'` encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings).

### `seed`

The seed (see: [`str.hash`](https://github.com/voidqk/sink/blob/master/docs/hash.md)).

### `out`

An array of `uint32_t` values that must have space for the 4 `uint32_t` results.  I.e., `out[0]`,
`out[1]`, `out[2]`, and `out[3]` will have the hash result (C only).

castlist
--------

Reinterpret a sink value as a list (C only).

```c
typedef int sink_user;
typedef struct {
  sink_val *vals;
  int size;
  int count;
  void *user;
  sink_user usertype;
} sink_list_st, *sink_list;

sink_list sink_castlist(sink_ctx ctx, sink_val ls);
```

Note that this function does not perform type checking.  If a non-list is cast to a list, the
results are undefined.

The return value is a `sink_list` object, where the application can access the values and size of
the array.

The `vals` element is the array of sink values in the list.

The `size` element is the size of the list.

The `count` element is how much space is allocated in `vals`.  This will always be greater than or
equal to `size`.

The `user` element is the raw user pointer associated with the list.

The `usertype` element is the user type of the `user` pointer, or `-1` for no user data.

The application can modify this data, if it chooses to -- but in most situations, it should only
read `vals` and `size`.

To modify a list, the application should normally just use the `sink_list_*` standard library
functions against the sink value.  To access user data, the application should use the appropriate
helper functions ([`list_hasuser`](#list_hasuser) and [`list_getuser`](#list_getuser)).

These are just recommendations though -- it might be better to modify everything directly.  Just be
sure to use the sink memory allocation functions for `vals` ([`sink_malloc`](#malloc),
[`sink_realloc`](#realloc), and [`sink_free`](#free)), and ensure `count >= size`.

### `ctx`

The Context object.

### `ls`

The value to be reinterpretted.

TODO
----

```
sink_val sink_list_newblob(sink_ctx ctx, int size, const sink_val *vals);
sink_val sink_list_newblobgive(sink_ctx ctx, int size, int count, sink_val *vals);
sink_val sink_list_newempty(sink_ctx ctx);

void sink_list_setuser(sink_ctx ctx, sink_val ls, sink_user usertype, void *user);
function sink.list_setuser(ctx: sink.ctx, ls: sink.val, usertype: sink.user, user: any): void;

bool sink_list_hasuser(sink_ctx ctx, sink_val ls, sink_user usertype);
function sink.list_hasuser(ctx: sink.ctx, ls: sink.val, usertype: sink.user): boolean;

void *sink_list_getuser(sink_ctx ctx, sink_val ls);
function sink.list_getuser(ctx: sink.ctx, ls: sink.val): any;

sink_val sink_list_joinplain(sink_ctx ctx, int size, sink_val *vals, int sepz, const uint8_t *sep);
function sink.list_joinplain(vals: list | val[], sep: string): val;

sink_val sink_user_new(sink_ctx ctx, sink_user usertype, void *user);
function sink.user_new(ctx: sink.ctx, usertype: sink.user, user: any): sink.val;

bool sink_pickle_binstr(sink_ctx ctx, sink_val a, sink_str_st *out);
function sink.pickle_binstr(a: val): string;

void sink_pickle_binstrfree(sink_str_st str);

bool sink_pickle_valstr(sink_ctx ctx, sink_str_st str, sink_val *out);
function sink.pickle_valstr(s: sink.str): sink.val | false;

void sink_gc_pin(sink_ctx ctx, sink_val v);
void sink_gc_unpin(sink_ctx ctx, sink_val v);

// always returns NIL
sink_wait sink_abortstr(sink_ctx ctx, const char *fmt, ...);
function sink.abortstr(ctx: sink.ctx, str: string): Promise<sink.val>;

bool sink_arg_bool(int size, sink_val *args, int index);
function sink.arg_bool(args: sink.val[], index: number): boolean;

bool sink_arg_num(sink_ctx ctx, int size, sink_val *args, int index, double *num);
function sink.arg_num(ctx: ctx, args: sink.val[], index: number): number;

bool sink_arg_str(sink_ctx ctx, int size, sink_val *args, int index, sink_str *str);
function sink.arg_str(ctx: ctx, args: sink.val[], index: number): string;

bool sink_arg_list(sink_ctx ctx, int size, sink_val *args, int index, sink_list *ls);
function sink.arg_list(ctx: ctx, args: sink.val[], index: number): sink.list;

bool sink_arg_user(sink_ctx ctx, int size, sink_val *args, int index, sink_user usertype,
  void **user);
function sink.arg_user(ctx: ctx, args: sink.val[], index: number, usertype: sink.user): any;

sink_seedauto_src_f sink_seedauto_src;
let seedauto_src: () => number;

sink_malloc_f  sink_malloc;
sink_realloc_f sink_realloc;
sink_free_f    sink_free;
```
