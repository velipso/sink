
Shell Library Extension
=======================

`include 'shell'`

The shell library is an extension available to sink scripts running inside the command-line tool's
environment.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `version`      | Verifies a minimum version of the sink executable; returns the current version |
| `args`         | Returns the arguments passed into the script from the command line             |

```
version
exec, which
file: read, copy, write, delete, temp, head, tail, permissions?, touch?
dir: create, delete, change, current, list
path: join, dirname, basename, stat
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
__filename, __dirname
```
