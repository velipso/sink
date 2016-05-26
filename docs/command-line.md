
Command-Line Options
--------------------

`./sink [options] [-e 'script' | script.sink | script.sb] [arguments]`

| Option      | Description                                  |
+-------------+----------------------------------------------+
| `-v`        | Print verison information                    |
| `-e script` | Script specified by command line             |
| `-c`        | Compile script to bytecode                   |
| `-j`        | Transpile script to JavaScript               |
| `-o output` | Output file for compilation (default stdout) |

If `-c` or `-j` isn't specified, then the script will run immediately with `[arguments]`.
