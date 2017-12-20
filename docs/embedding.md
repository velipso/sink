
General Guide to Embedding
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

API Layout
==========

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

#### `curdir`

The current directory (or `null`/`NULL`).

#### `repl`

Flag indicating whether the script is a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop)

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
