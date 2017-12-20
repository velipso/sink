
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
----------

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

### scr_new

Create a new Script object.

```c
sink_scr sink_scr_new(sink_inc_st inc, const char *curdir, bool repl);
```

```typescript
function sink.scr_new(inc: sink.inc_st, curdir: string | null, repl: boolean): sink.scr;
```

#### `inc`

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

The `f_fstype` function should query the filesystem, and return one of the results: `NONE` for a
file that doesn't exist, `FILE` for a file, and `DIR` for a directory.

The `f_fsread` function should attempt to open the provided file, and write it to the Script object
using [`scr_write`](#scr_write).  It should return `true` if the file was read successfully, and
`false` if the file failed to be read.

Please see [cmd.c](https://github.com/voidqk/sink/blob/master/src/cmd.c) or
[cmd.ts](https://github.com/voidqk/sink/blob/master/src/cmd.ts) for example implementations of these
functions.  Note that the TypeScript/JavaScript version must deal with Promises correctly, and can
return a Promise if the operations are asynchronous.

The `user` field is passed through to the `incuser` argument in the functions, at your discretion.

#### `curdir`

The current directory (or `null`/`NULL`).

This is used when a script includes or embeds a relative path, in order to construct an aboslute
path.

#### `repl`

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
