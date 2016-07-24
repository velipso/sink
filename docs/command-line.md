
Command-Line Options
====================

`./sink`

Enter interactive mode (REPL).

`./sink <file> [arguments]`

Execute `<file>` with optional `arguments`, outputting results to stdout.  The input `<file>` can be
a text script or bytecode.

`./sink -e '<code>' [arguments]`

Execute `<code>` with optional `arguments`, outputting results to stdout.

`./sink -c file.sink`

Compile `file.sink`, outputting bytecode to stdout.

`./sink -v`

Print version information.
