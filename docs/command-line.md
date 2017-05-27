
Command-Line Options
====================

Usage: `sink [options] [ -e '<code>' | <file> ] [arguments]`

With no arguments, sink will enter interactive mode (REPL).

| Option            | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `-v`              | Display version information and exit                                        |
| `-h`, `--help`    | Display help information and exit                                           |
| `-I <path>`       | Add `<path>` to the include search path                                     |
| `-c`              | Compile input and output bytecode to stdout                                 |
| `-d`              | If compiling, output bytecode with debug info                               |
| `-D <key> <file>` | If compiling, add `<file>` declarations when including `<key>`              |

The `-D` option is useful for providing declarations so that compilation can succeed for other host
environments.

For example, a host might provide declarations for native commands via `include 'shapes'`.  The host
could provide a declaration file, which can be used during compilation using a
`-D shapes shapes_decl.sink` option.  This means when the script executes `include 'shapes'`, the
compiler will load `shapes_decl.sink`.  Even though the compiler doesn't know how to execute the
host commands, it can still compile the file for use in the host environment.
