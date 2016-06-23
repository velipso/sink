
JavaScript
==========

* Handle a variety of functions returning a `Promise`
* Transpiler
* Command line stuff
* Handle circular objects in memory when converting to string or marshalling

C
==

* Compiler
* Transpiler
* Migrate `sink.c` from other projects for interpreter
* Command line stuff
* Handle circular objects in memory when converting to string or marshalling

Standard Library
================

Need to design split standard library into ops in the VM vs. native functions.

List, math, str, date, etc, stuff should be ops in the VM, and supported across all sink programs.

File system, operating system, process, network (?), etc, should be (optional) native functions.
