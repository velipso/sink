Technical Information
=====================

Sink development started in March of 2016.

Language design:

* Imperative/procedural
* Dynamically typed
* Garbage collected
* Lexical scoping
* Static binding with robust namespacing
* A mixture between shell scripts, Lua, and a bit of Lisp

Both implementations:

* Virtual machine with a big `switch` statement
* Register based VM with 256 registers per stack frame
* Lexer, parser, code generator, and VM are stackless and can be paused at any moment
* Tail call optimization supported
* REPL supported
* All I/O is governed by the host
* Designed for asynchronous use, with ability to pause execution at any time
* Almost identical [embedding API](https://github.com/velipso/sink/blob/master/docs/embedding.md) between implementations

C99 implementation:

* Values are stored via [NaN-boxing](https://sean.fun/a/nan-boxing)
* Simple stop-the-world mark sweep garbage collector
* Easy to build, just two files: `sink.h` and `sink.c`
* Asynchronous commands via simplified Promise-like objects `sink_wait`

TypeScript implementation:

* Values are stored as JavaScript values `null`, numbers, strings, and arrays
* Relies on the native JavaScript garbage collector
* Asynchronous commands and I/O via JavaScript Promises
