Sink Crash Course
=================

Sink is a minimal programming language specifically designed to be embedded in larger programs,
similar in spirit to Lua (but more simple).

It has JavaScript and C99 implementations, which compile and execute the same source code with
exactly the same results.  Sink can also be compiled to bytecode.

The API includes support for a REPL, which is great for embedding debug consoles, and defining
native functions, for talking between Sink and the host enviroment.

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
+--------+--------------------------------+---------------------------------------+
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
x ||= 5  # set x to 5 only if x is nil
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
x = num.NaN
x = num.inf
x = -num.inf

if num.isNaN x
  say 'x is NaN'
elseif num.isFinite x
  say 'x is finite'
end
```

Numbers can also be treated as 32-bit signed or unsigned integers in the standard library, depending
on the library call.  This is no problem because a 64-bit floating point number can store a 52-bit
integer losslessly.

Strings
-------

TODO: write more


