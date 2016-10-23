Sink Crash Course
=================

Sink is a minimal programming language specifically designed to be embedded in larger programs,
similar in spirit to Lua (but more simple).

It has JavaScript and C99 implementations, which compile and execute the same source code with
exactly the same results.  Sink can also be compiled to bytecode.

The API allows the host environment to define native functions, and includes support for a REPL,
which is great for embedding debug consoles.

Examples
--------

```
# hashes signify end-of-line comments, like shell languages
/* C-style block comments are supported */

# outputs 'hello, world' to stdout, automatically inserting newline
say 'hello, world'

say 1 + 2  # 3
say 1 ~ 2  # 12 (tilde is string concat)
say 5^2    # 25 (caret is power)
say 25^0.5 # 5

# commands are defined via `def`
def add a, b
  # string substitution on double-quoted strings using dollar sign
  say "adding $a + $b is ${a + b}"
  return a + b
end

say add 1, 2                 # 3
say add (add 1, 2), add 4, 5 # 12

# commands can be declared ahead of time
declare factorial

say factorial 10 # 3628800

def factorial a
  if a <= 1
    return 1
  end
  return a * factorial a - 1
end
```

What Sink Isn't
---------------

In many ways, Sink is defined by the features it *doesn't* have:

1. No classes, inheritence, mixins, interfaces, prototypes, etc
2. No tables, objects, hashes, dictionaries, etc
3. No anonymous functions, closures, lambdas, function pointers, etc
4. No threads, coroutines, generators, iterators, etc
5. No booleans
6. No unicode
7. No exceptions, protected calls, long jumps, etc
8. No massive standard library
9. No module system (just simple includes)
10. No regular expressions
11. No operator overloading
12. No unique and clever (and therefore annoying) design decisions
13. No intention to keep updating the language and make it bigger and bigger

These are *intentionally* left out in order to drastically simplify the language.  You can get by
without them, believe it or not.  I promise it isn't too painful.

Sink is *not* a fully-featured scripting language, like Python or Ruby.  It is specifically
designed for making small scripts that can be easily embedded in a larger host environment.

Whitespace
----------

Sink syntax is a mixture between a shell and a normal language.  Newlines matter, and they help
define the end of statements.  At any point a backslash `\` can be used to ignore a newline, and a
semicolon `;` can be used to separate statements on a single line.

```
1      # single statement, 1
+ 2    # single statement, + 2

1 \    # awaiting end of statement...
+ 2    # statement processed is 1 + 2

1; + 2 # two statements
```

Note that `+` and `-` have special sensitivity to whitespace in order to determine whether you mean
a unary operator or binary operator:

```
x-1     # subtract
x - 1   # subtract
x- 1    # subtract
x -1    # call `x` with a single argument, -1
```

Types
-----

Sink is dynamically typed (which means any variable can contain any type) and has exactly four
types:

| Type   | Description                    | Example(s)                            |
|--------|--------------------------------|---------------------------------------|
| Nil    | Nothingness, false             | `nil`                                 |
| Number | 64-bit floating point          | `5`, `0xFF`, `0b1011`, `6.28e+10`     |
| String | Binary-safe array of bytes     | `'hello'`, `"world"`                  |
| List   | Variable length list of values | `{}`, `{1, 2, 3}`, `{nil, 1, {'hi'}}` |

All values are considered true except `nil`.  That means `0` is true, `''` is true, `{}` is true,
etc.

Nil
---

The value `nil` is a special value that signifies nothingness.  It is the only value considered
false.

Missing arguments to commands default to `nil`, and accessing a list outside of its range returns
`nil`.  Many commands in the standard library return `nil` to indicate normal failure (for example,
`str.find` will return `nil` if the substring isn't found).

Since only `nil` is false, you can do things like this:

```
x = x || 5  # set x to 5 only if x is nil
x ||= 5     # or, more compactly
```

Checking if a value is `nil` is done via `x == nil`.

Number
------

Numbers are 64-bit floating point values.  They can be expressed in decimal, binary, octal, and
hexadecimal, including fractions:

```
x = 1
x = 123.456
x = 123.456e19
x = 123.456e-19
x = 0xAB
x = 0xAB.CD
x = 0xAB.CDp19
x = 0xAB.CDp-19
x = 0b1011
x = 0b1011.1101
x = 0b1011.1101p19
x = 0b1011.1101p-19
x = 0c777
x = 0c777.123
x = 0c777.123p19
x = 0c777.123p-19

say num.hex 255  # 0xFF
say num.bin 15   # 0b1111
say num.oct 511  # 0c777
```

Numbers can also be not-a-number, or infinity:

```
x = num.nan
x = num.inf
x = -num.inf

if num.isnan x
  say 'x is nan'
elseif num.isfinite x
  say 'x is finite'
end
```

Numbers can also be treated as 32-bit signed or unsigned integers in the standard library, depending
on the library call.  This is no problem because a 64-bit floating point number can store a 52-bit
integer losslessly.

Testing for a number is done via `typenum`:

```
if typenum x
  say 'x is a number'
else
  say 'x isn\'t a number'
end
```

Note that `typenum` is a unary operator, not a command.  Therefore:

```
say typenum x, y
```

is processed:

```
say (typenum x), y
```

Not like a command would be:

```
say (typenum x, y)
```

Strings
-------

Strings are binary-safe arrays of bytes, that can be any length, and include any value from 0 to
255.  Strings have no concept of unicode (though there are basic helper functions in the standard
library for dealing specifically with UTF-8 strings).

Strings can be specified with single quotes `'` or double quotes `"`.  Single quoted strings do not
perform any substitution, and only have `'\\'` and `'\''` escape sequences.

Double quoted strings perform substitution via `$`, and have the escape sequences:

| Escape   | Description                           |
|----------|---------------------------------------|
| `"\xFF"` | Any byte specified by two hex numbers |
| `"\0"`   | Byte 0                                |
| `"\b"`   | Bell (byte 8)                         |
| `"\t"`   | Tab (byte 9)                          |
| `"\n"`   | Newline (byte 10)                     |
| `"\v"`   | Vertical tab (byte 11)                |
| `"\f"`   | Form feed (byte 12)                   |
| `"\r"`   | Carriage return (byte 13)             |
| `"\\"`   | Backslash                             |
| `"\'"`   | Single quote                          |
| `"\""`   | Double quote                          |
| `"\$"`   | Dollar sign                           |

Subtitution is either a single identifier, or an expression:

```
say "a is $a"                # simple substitution
say "foo.bar is ${foo.bar}"  # expression subtitution
say "a + b is ${a + b}"      # expression subtitution
say "hi: ${str.lower "HI"}"  # nested strings are valid
```

Concatenation is via `~` (not `+`):

```
say "a" ~ 'b'  # ab
say 1 ~ 2      # 12
```

Strings are detected via `typestr`, in the same vein as `typenum` described above.

Lists
-----

Lists are the only compound data structure in Sink.  They are created with curly braces
`{ <contents> }`.  Elements are accessed using `ls[0]`, `ls[1]`, etc.  Negative indicies will wrap
around the end.  Indicies outside the range will return `nil`.

Most operations on numbers also work on lists, by performing the operation across all elements
(defaulting values to `0` if outside the range):

```
say {1, 2, 3} * 2         # {2, 4, 6}
say {1, 2, 3} + {4, 5, 6} # {5, 7, 9}
say {1} + {2, 5}          # {3, 5}
say {1} * {2, 5}          # {2, 0}
say num.abs {-1, -2}      # {1, 2}
```

Lists are modified using the commands:

| Command                   | Description                                            |
|---------------------------|--------------------------------------------------------|
| `list.push ls, 5`         | Push `5` at end of list                                |
| `list.unshift ls, 5`      | Unshift `5` at beginning of list                       |
| `list.pop ls`             | Pop the last element off the end of the list           |
| `list.shift ls`           | Shift the first element off the start of the list      |
| `list.append ls, {1, 2}`  | Append the second list on the end of the first list    |
| `list.prepend ls, {1, 2}` | Prepend the second list at the start of the first list |

Concatenation also works, but this *creates a new list*:

```
var x = {1}, y = {2}
say x ~ y  # {1, 2}
say x      # {1}
say y      # {2}
```

Slicing
-------

Lists support slicing, in the format of `ls[start:length]`:

```
var x = {1, 2, 3, 4}
say x[1:2] # {2, 3}
```

Slicing can also be used for assignment:

```
x[1:2] = {5, 6, 7}
say x  # {1, 5, 6, 7, 4}
```

TODO:

```
x[1:2] = {5, 6, 7} returns the wrong value
```

```
x = 'hello'
x[1:2] = 'yoyo'
this should work
```
