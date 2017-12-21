
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
| [`scr_loadfile`](#scr_loadfile) | Load a file through the include system                    |
| [`scr_write`](#scr_write)       | Write file contents into the Script object                |
| [`scr_level`](#scr_level)       | Get the level of nesting for REPLs                        |
| [`scr_dump`](#scr_dump)         | Dump the compiled bytecode                                |
| [`scr_free`](#scr_free)         | Free a Script object                                      |

The Script API is used for loading a program into memory.  It can load a script and compile it into
bytecode, or load bytecode directly.  It does not *execute* any code.

scr_new
-------

Create a new Script object.

```c
sink_scr sink_scr_new(sink_inc_st inc, const char *curdir, bool repl);
```

```typescript
function sink.scr_new(inc: sink.inc_st, curdir: string | null, repl: boolean): sink.scr;
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

Output debug information.

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

Note this will also free any [`scr_cleanup`](#scr_cleanup) pointers that have been associated with
the Script object before freeing the Script object itself.

### `scr`

The Script object.
