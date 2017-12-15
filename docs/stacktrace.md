
Stacktrace
==========

Note that `stacktrace` always returns a list of strings, but the list could be empty, or the format
of each string could change.  The `stacktrace` command should only be used for logging, and its
contents should not be relied upon or parsed.

If a sink script is compiled without debug information, `stacktrace` will simply return an empty
list `{}`.
