
Shell Library Extension
=======================

`include 'shell'`

The shell library is an extension available to sink scripts running inside the command-line tool's
environment.

Some commands have options as their first parameter (`opt`) -- see the notes below for a breakdown
of each command's options.

The commands that take files or paths as input can usually accept a list of files too.  For example,
`cat 'foo.txt'` returns a string, but `cat glob '*.txt'` will return a list of strings.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `args`         | Returns the arguments passed into the script from the command line             |
| `cat a`        | Returns the contents of file `a`                                               |
| `cd a`         | Change directory to `a` (home directory if `a` is nil)                         |
| `cp opt, a, b` | Copy files `a` to directory `b`                                                |
| `env a`        | Read an environment variable `a`                                               |
| `exec a, args` | Execute command `a`, using `args` as a list of arguments                       |
| `glob a`       | Converts a glob pattern to a list of files                                     |
| `head a, b`    | Returns the first `a` lines of file `b`                                        |
| `ls opt, a`    | Returns list of files in path `a`                                              |
| `mv opt, a, b` | Move files `a` to `b`                                                          |
| `mkdir opt, a` | Make directory `a`                                                             |
| `pushd a`      | Change directory to `a`, saving previous directory on directory stack          |
| `popd`         | Restore a previous directory from the directory stack                          |
| `pwd`          | Returns current directory                                                      |
| `rm opt, a`    | Remove file `a`                                                                |
| `tail a, b`    | Returns the last `a` lines of file `b`                                         |
| `test a, b`    | Perform test `a` on path `b`                                                   |
| `which a`      | Searches for `a` in system paths; returns full path if found, otherwise nil    |

TODO: more

date, time, sed, grep, touch, set, mktemp, chmod, ln, hostname, rmdir, curl, nc, dirname,
basename, find, whoami, printf, readlink, sort, stat, uniq, uname, sleep

### Options

TODO: this
