
Standard Library
================

The standard library is available to all sink scripts, and is native to sink itself for basic
execution.  These functions are available in all host environments.

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `say a, ...`            | Output arguments to stdout (returns nil)                              |
| `ask a, ...`            | Prompt the user for input from stdin; returns the inputted string     |
| `pick cond, a, b`       | If `cond` is true, return `a`, otherwise return `b` (short-circuited) |

Number
------

Note that number functions will operate on lists by performing the operation on each element, just
like the built-in unary and binary operators.

| Function            | Description                                                               |
|---------------------|---------------------------------------------------------------------------|
| `num.abs a`         | Absolute value of `a`                                                     |
| `num.sign a`        | Sign of `a` (-1, 0, or 1)                                                 |
| `num.max a, b, ...` | Returns the maximum number from all arguments                             |
| `num.min a, b, ...` | Returns the minimum number from all arguments                             |
| `num.clamp a, b, c` | Clamp `a` to be between `b` and `c`                                       |
| `num.floor a`       | Round `a` down to the nearest integer                                     |
| `num.ceil a`        | Round `a` up to the nearest integer                                       |
| `num.round a`       | Round `a` to the nearest integer, 0.5 and above rounds up                 |
| `num.trunc a`       | Round `a` towards 0                                                       |
| `num.pi`            | Pi (3.141592...)                                                          |
| `num.tau`           | Tau (2 * Pi = 6.283185...)                                                |
| `num.sin a`         | Sine of `a` (radians)                                                     |
| `num.cos a`         | Cosine of `a` (radians)                                                   |
| `num.tan a`         | Tangent of `a` (radians)                                                  |
| `num.asin a`        | Arc-sine of `a`, returns radians                                          |
| `num.acos a`        | Arc-cosine of `a`, returns radians                                        |
| `num.atan a`        | Arc-tangent of `a`, returns radians                                       |
| `num.atan2 a, b`    | Arc-tangent of `a / b`, returns radians                                   |
| `num.log a`         | Natural log of `a`                                                        |
| `num.log1p a`       | Natural log of `a` + 1                                                    |
| `num.log2 a`        | Log base 2 of `a`                                                         |
| `num.log10 a`       | Log base 10 of `a`                                                        |
| `num.exp a`         | *e*<sup>`a`</sup>                                                         |
| `num.expm1 a`       | *e*<sup>`a`</sup> - 1                                                     |
| `num.seed a`        | Seeds the random number generator with `a` (treated as 32-bit uint)       |
| `num.rand`          | Random number between [0, 1)                                              |
| `num.lerp a, b, t`  | Linear interpolation from `a` to `b`, by amount `t`                       |
| `num.now`           | Current time in milliseconds since epoch                                  |

### Random Numbers

The random number generator is the same on all host environments, defined below.  It is fast,
simple, and
[passes many statistical tests](https://gist.github.com/voidqk/d112165a26b45244a65298933c0349a4).
On startup, it is seeded with the current time in milliseconds.

Note that the state is shared between `num.seed`, `num.rand`, and `int.rand`.

```c
static uint32_t seed = 0, i = 0;
uint32_t int_rand(){
  const uint32_t m = 0x5bd1e995;
  const uint32_t k = i++ * m;
  seed = (k ^ (k >> 24) ^ (seed * m)) * m;
  return seed ^ (seed >> 13);
}

void num_seed(uint32_t s){
  seed = s;
  i = 0;
}

double num_rand(){
  return (double)int_rand() / 4294967296.0;
}
```

Integer
-------

Sink only operates on 64-bit floating point numbers, but it's possible to simulate operations on
32-bit integers (signed and unsigned) using the `int` namespace, with appropriate two's-complement
wrapping.

Note that integer functions will operate on lists by performing the operation on each element, just
like the built-in unary and binary operators.

| Function          | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `int.cast a`      | Cast `a` (floating point) to a signed integer                               |
| `int.ucast a`     | Cast `a` (floating point) to an unsigned integer                            |
| `int.not a`       | Bitwise NOT of `a`                                                          |
| `int.and a, b`    | Bitwise AND between `a` and `b`                                             |
| `int.or a, b`     | Bitwise OR between `a` and `b`                                              |
| `int.xor a, b`    | Bitwise XOR between `a` and `b`                                             |
| `int.shl a, b`    | Bit-shift left `a` by `b` bits                                              |
| `int.shr a, b`    | Bit-shift right `a` by `b` bits (`a` is unsigned)                           |
| `int.sar a, b`    | Bit-shift right `a` by `b` bits (`a` is signed)                             |
| `int.rotl a, b`   | Bit-rotate left `a` by `b` bits                                             |
| `int.rotr a, b`   | Bit-rotate right `a` by `b` bits                                            |
| `int.add a, b`    | `a + b`                                                                     |
| `int.sub a, b`    | `a - b`                                                                     |
| `int.mul a, b`    | `a * b`                                                                     |
| `int.div a, b`    | `a / b`                                                                     |
| `int.mod a, b`    | `a % b`                                                                     |
| `int.pow a, b`    | `a^b` (`b` is treated as unsigned)                                          |
| `int.sqrt a`      | Square root of `a` (`result * result <= a`; `a` is unsigned)                |
| `int.cbrt a`      | Cube root of `a` (`result * result * result <= a`; `a` is unsigned)         |
| `int.rand`        | Random unsigned integer (shared state with `num.seed` and `num.rand`)       |
| `int.bswap a`     | Byte-swap `a` (`0x12345678` becomes `0x78563412`)                           |
| `int.parity a`    | Returns 0 for even parity, 1 for odd                                        |
| `int.popcount a`  | Population count of `a` (i.e., count of number of bits set)                 |
| `int.clz a`       | Count leading zeros of `a` (0-32)                                           |
| `int.ctz a`       | Count trailing zeros of `a` (0-32)                                          |
| `int.clrsb a`     | Count leading redundant sign bits of `a` (0-31)                             |
| `int.nextpow2 a`  | Round `a` up to the next closest power of 2                                 |
| `int.ffs a`       | Find first bit set, bits numbered starting at 1, 0 means no bits set        |
| `int.fls a`       | Find last bit set, bits numbered starting at 1, 0 means no bits set         |

String
------

Strings are 8-bit clean, and interpretted as binary data.  In cases where character meaning matters
(for example, `str.lower`), the algorithms interpret bytes 0-127 as defined by Unicode codepage 0,
and ignore bytes 128-255.

| Function               | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| `str.new a, b`         | Create a new string by repeating string `a` `b` times                  |
| `str.split a, b`       | Split `a` into an array of strings based on separator `b`              |
| `str.replace a, b, c`  | Replace all occurrences of `b` in string `a` with `c`                  |
| `str.startsWith a, b`  | True if string `a` starts with string `b`; false otherwise             |
| `str.endsWith a, b`    | True if string `a` ends with string `b`; false otherwise               |
| `str.find a, b, c`     | Find `b` in string `a` starting at `c`; returns nil if not found       |
| `str.findRev a, b, c`  | Find `b` in string `a` starting at `c` and searching in reverse        |
| `str.lower a`          | Convert `a` to lowercase, ignoring bytes >= 128                        |
| `str.upper a`          | Convert `a` to uppercase, ignoring bytes >= 128                        |
| `str.trim a`           | Trim surrounding whitespace from `a`; bytes >= 128 considered non-white|
| `str.rev a`            | Reverse `a`                                                            |
| `str.list a`           | Convert a string to a list of bytes                                    |
| `str.newByte a`        | New string from byte `a`                                               |
| `str.newSbyte a`       | New string from signed byte `a`                                        |
| `str.newInt16 a`       | New two-byte string from signed 16-bit integer `a` (little endian)     |
| `str.newInt16BE a`     | New two-byte string from signed 16-bit integer `a` (big endian)        |
| `str.newUint16 a`      | New two-byte string from unsigned 16-bit integer `a` (little endian)   |
| `str.newUint16BE a`    | New two-byte string from unsigned 16-bit integer `a` (big endian)      |
| `str.newInt32 a`       | New four-byte string from signed 32-bit integer `a` (little endian)    |
| `str.newInt32BE a`     | New four-byte string from signed 32-bit integer `a` (big endian)       |
| `str.newUint32 a`      | New four-byte string from unsigned 32-bit integer `a` (little endian)  |
| `str.newUint32BE a`    | New four-byte string from unsigned 32-bit integer `a` (big endian)     |
| `str.newFloat32 a`     | New four-byte string from 32-bit float `a` (little endian)             |
| `str.newFloat32BE a`   | New four-byte string from 32-bit float `a` (big endian)                |
| `str.newFloat64 a`     | New eight-byte string from 64-bit float `a` (little endian)            |
| `str.newFloat64BE a`   | New eight-byte string from 64-bit float `a` (big endian)               |
| `str.sbyte a, b`       | Signed byte from string `a` at index `b`                               |
| `str.byte a, b`        | Unsigned byte from string `a` at index `b`                             |
| `str.int16 a, b`       | Signed 16-bit integer from `a` starting at index `b` (little endian)   |
| `str.int16BE a, b`     | Signed 16-bit integer from `a` starting at index `b` (big endian)      |
| `str.uint16 a, b`      | Unsigned 16-bit integer from `a` starting at index `b` (little endian) |
| `str.uint16BE a, b`    | Unsigned 16-bit integer from `a` starting at index `b` (big endian)    |
| `str.int32 a, b`       | Signed 32-bit integer from `a` starting at index `b` (little endian)   |
| `str.int32BE a, b`     | Signed 32-bit integer from `a` starting at index `b` (big endian)      |
| `str.uint32 a, b`      | Unsigned 32-bit integer from `a` starting at index `b` (little endian) |
| `str.uint32BE a, b`    | Unsigned 32-bit integer from `a` starting at index `b` (big endian)    |
| `str.float32 a, b`     | 32-bit float from `a` starting at index `b` (little endian)            |
| `str.float32BE a, b`   | 32-bit float from `a` starting at index `b` (big endian)               |
| `str.float64 a, b`     | 64-bit float from `a` starting at index `b` (little endian)            |
| `str.float64BE a, b`   | 64-bit float from `a` starting at index `b` (big endian)               |

UTF-8
-----

The `utf8` library operates on strings (bytes), and only provides some basic functions for encoding
and decoding.

| Function               | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| `utf8.valid a`         | Checks whether the string `a` is strictly valid UTF-8                  |
| `utf8.list a`          | Converts string `a` (UTF-8 bytes) to a list of codepoints (integers)   |
| `utf8.str a`           | Converts a list of codepoints (integers) `a` to a string (UTF-8 bytes) |

List
----

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `list.new a, b`         | Create a new list of size `a`, with each element set to `b`           |
| `list.find ls, a, b`    | Find `a` in list `ls` starting at `b`; returns nil if not found       |
| `list.findRev ls, a, b` | Find `a` in list `ls` starting at `b` and searching in reverse        |
| `list.join ls, a`       | Convert list `ls` to a string by joining elements with string `a`     |
| `list.rev ls`           | Reverse list `ls`; returns `ls`                                       |
| `list.str ls`           | Convert a list of bytes to a string                                   |
| `list.sort ls`          | Sorts the list `ls`                                                   |
| `list.sortRev ls`       | Sorts the list `ls` in reverse                                        |

### Sorting

Sorting precedence:

1. Nil
2. Numbers (negative infinity to positive infinity)
3. Strings (byte-by-byte comparison; if equal, shorter strings first)
4. Lists (item by item comparison; if equal, shorter lists first)

Shell Library
=============

The shell library is an extension available to sink scripts using the command line program.  This
allows sink to behave as a more fully featured language in a shell environment.

These extensions might not be available when sink is embedded in other environments, depending on
the host application.

TODO: this
