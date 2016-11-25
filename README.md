
sink
====

Minimal programming language for embedding small scripts in larger programs, with JavaScript and C99
implementations.

**Note: Development in progress, use at your own risk**

### Documents

* [Crash Course](https://github.com/voidqk/sink/blob/master/docs/crash-course.md) (Tutorial)
  &larr; Read This
* [Online Demo](https://rawgit.com/voidqk/sink/master/src/repl.html) (REPL)
* [Standard Library](https://github.com/voidqk/sink/blob/master/docs/lib.md)
* [Example Code](https://github.com/voidqk/sink/blob/master/tests/0.sanity/sanity.sink)
* [Why Another Language](https://github.com/voidqk/sink/blob/master/docs/why.md)

### Technical Information

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
* Tail recursion supported
* REPL supported
* All I/O is governed by the host

C99 implementation:

* Values are stored via NaN-boxing
* Simple stop-the-world mark sweep garbage collector
* Easy to build, just two files: `sink.h` and `sink.c`
* Asynchronous commands via special value `SINK_ASYNC`

JavaScript implementation:

* Values are stored as JavaScript values `null`, numbers, strings, and arrays
* Relies on the native JavaScript garbage collector
* Asynchronous commands via JavaScript Promises
