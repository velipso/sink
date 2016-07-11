
Standard Library
================

The standard library is available to all sink scripts, and is native to sink itself for basic
execution.  These functions are available in all host environments.

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `say a, ...`            | Output arguments to stdout; returns outputted string                  |
| `ask a, ...`            | Prompt the user for input from stdin; returns the inputted string     |
| `pick cond, a, b`       | If `cond` is true, return `a`, otherwise return `b` (short-circuited) |

Number
------

Note that number functions will operate on lists by performing the operation on each element, just
like the built-in unary and binary operators.

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `num.abs a`             | Absolute value of `a`                                                 |
| `num.lerp a, b, t`      | Linear interpolation from `a` to `b`, by amount `t`                   |
| `num.max ls`            | Returns the maximum number in the list `ls`                           |
| `num.min ls`            | Returns the minimum number in the list `ls`                           |
| `num.floor a`           | Round `a` down to the nearest integer                                 |
| `num.ceil a`            | Round `a` up to the nearest integer                                   |
| `num.round a`           | Round `a` to the nearest integer, `0.5` and above rounds up           |
| `num.pi`                | Pi (3.141592...)                                                      |
| `num.tau`               | Tau (6.283185...)                                                     |
| `num.sin a`             | Sine of `a` (radians)                                                 |
| `num.cos a`             | Cosine of `a` (radians)                                               |
| `num.tan a`             | Tangent of `a` (radians)                                              |
| `num.asin a`            | Arc-sine of `a`, returns radians                                      |
| `num.acos a`            | Arc-cosine of `a`, returns radians                                    |
| `num.atan a`            | Arc-tangent of `a`, returns radians                                   |
| `num.atan2 a, b`        | Arc-tangent of `a / b`, returns radians                               |
| `num.log a`             | Natural log of `a`                                                    |
| `num.log2 a`            | Log base 2 of `a`                                                     |
| `num.log10 a`           | Log base 10 of `a`                                                    |

List
----

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `list.new a, b`         | Create a new list of size `a`, with each element set to `b`           |
| `list.find ls, a, b`    | Find `a` in list `ls` starting at `b`; returns nil if not found       |
| `list.findRev ls, a, b` | Find `a` in list `ls` starting at `b` and searching in reverse        |
| `list.join ls, a`       | Convert list `ls` to a string by joining elements with string `a`     |
| `list.rev ls`           | Reverse list `ls`; returns `ls`                                       |


Shell Library
=============

The shell library is an extension available to sink scripts using the command line program.  This
allows sink to behave as a more fully featured language in a shell environment.

These extentions might not be available when sink is embedded in other environments, depending on
the host application.

TODO: this
