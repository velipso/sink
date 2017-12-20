
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

1. Script API (loading a program into memory, compiling if necessary)
2. Context API (executing a program)
3. Sink Commands API (executing commands from the [standard library](https://github.com/voidqk/sink/blob/master/docs/lib.md))
4. Helper Functions (things to make your life a little easier)

Script API
----------

TODO
