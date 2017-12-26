
Shell Library Extension
=======================

`include 'shell'`

The shell library is an extension available to sink scripts running inside the command-line tool's
environment.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| [`version`](#version) | Verifies a minimum version of the sink executable; returns the current version |
| [`args`](#args)| Returns the arguments passed into the script from the command line             |
| [`run`](#run)  | Executes a child process and waits for it to finish; returns output and status |
| [`which`](#which) | Search the `PATH` environment variable for the location of an executable    |

```
run, which
file: read, canread, copy, write, canwrite, exists, delete, temp, head, tail, permissions?, touch?, script?, sink?
dir: create, delete, change, working, list
path: join, basename, stat
symlink: create, delete, resolve
date
sleep
env: get, set
args
process: pid, list, kill
user: whoami, id, who
host: hostname, uname
net: ping, listen, wget/curl
glob, find
```

version
-------

```
version [major], [minor], [patch]
```

If parameters are specified, it will verify that the host is at least the version specified.  If
the host doesn't meet the requirement, it will abort the script with an error.

Returns the current version in the format of `{ major, minor, patch }`.

args
----

```
args
```

Returns a list of strings of the arguments listed *after* the script name.

Note: the zeroth element *is not* the location of sink or the location of the script.  These
locations are stored in [`file.sink`](#file.sink) and [`file.script`](#file.script) respectively.

run
---

```
run file, [args], [env], [stdin], [capture]
```

`file` is the executable to run.  If the file is simply a command name, the `PATH` environment
variable will be searched to locate the executable.  If the executable isn't found, then the script
will abort in failure.

`[args]`, if provided, is a list of strings used as the command-line arguments.

`[env]`, if provided, is a list of environment variables, in the format of: `{{ 'ENV1', 'VALUE1'},
{'ENV2', 'VALUE2'}, ... }` (default: copy current environment).

`[stdin]`, if provided, is a string that will be fed as standard input.

`[capture]`, if provided, is a flag that determines if stdout and stderr are captured (default:
false).

If capture mode is disabled, then the return value is the exit status of the process.

If capture mode is enabled, then the return value is a list: `{ <status>, <stdout>, <stderr> }`.

Where `<status>` is the exit status of the process, and `<stdout>` and `<stderr>` are the captured
output (strings).

which
-----

```
which file
```

`file` is the command name to search in the `PATH` environment variable.

Returns a string of the aboslute path if an executable was found, or `nil` if nothing was found.
