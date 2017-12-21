
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

The current directory (or `null`/`NULL`).

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

