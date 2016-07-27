
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

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `num.abs a`             | Absolute value of `a`                                                 |
| `num.sign a`            | Sign of `a` (-1, 0, or 1)                                             |
| `num.max ls`            | Returns the maximum number in the list `ls`                           |
| `num.min ls`            | Returns the minimum number in the list `ls`                           |
| `num.floor a`           | Round `a` down to the nearest integer                                 |
| `num.ceil a`            | Round `a` up to the nearest integer                                   |
| `num.round a`           | Round `a` to the nearest integer, `0.5` and above rounds up           |
| `num.trunc a`           | Round `a` towards 0                                                   |
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
| `num.log1p a`           | Natural log of `a + 1`                                                |
| `num.exp a`             | *e*<sup>`a`</sup>                                                     |
| `num.expm1 a`           | *e*<sup>`a`</sup>` - 1`                                               |
| `num.seed a`            | Seeds the random number generator with `a`                            |
| `num.rand`              | Random number between [0, 1)                                          |
| `num.lerp a, b, t`      | Linear interpolation from `a` to `b`, by amount `t`                   |

### Random Numbers

Note that the random number generator is the same on all host environments, defined by the function:

```c
static uint32_t seed = 0, i = 0;
uint32_t num_rand(){
  const uint32_t m = 0x5bd1e995;
  const uint32_t k = i++ * m;
  seed = (k ^ (k >> 24) ^ (seed * m)) * m;
  return seed ^ (seed >> 13);
}

void num_seed(uint32_t s){
  seed = s;
  i = 0;
}
```

On startup, the random number generator is seeded with the current time in milliseconds.

Interger
--------

Sink only operates on 64-bit floating point numbers, but it's possible to simulate operations on 32
bit integers (signed and unsigned) using the `int` namespace, with appropriate two's-complement
wrapping.

Note that integer functions will operate on lists by performing the operation on each element, just
like the built-in unary and binary operators.

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `int.cast a`            | Cast `a` (floating point) to a signed integer                         |
| `int.ucast a`           | Cast `a` (floating point) to an unsigned integer                      |
| `int.not a`             | Bitwise NOT of `a`                                                    |
| `int.and a, b`          | Bitwise AND between `a` and `b`                                       |
| `int.or a, b`           | Bitwise OR between `a` and `b`                                        |
| `int.xor a, b`          | Bitwise XOR between `a` and `b`                                       |
| `int.shl a, b`          | Bit-shift left `a` by `b` bits                                        |
| `int.shr a, b`          | Bit-shift right `a` by `b` bits (`a` is unsigned)                     |
| `int.sar a, b`          | Bit-shift right `a` by `b` bits (`a` is signed)                       |
| `int.add a, b`          | `a + b`                                                               |
| `int.sub a, b`          | `a - b`                                                               |
| `int.mul a, b`          | `a * b`                                                               |
| `int.div a, b`          | `a / b`                                                               |
| `int.mod a, b`          | `a % b`                                                               |
| `int.pow a, b`          | `a^b` (`b` is treated as unsigned)                                    |
| `int.sqrt a`            | Square root of `a` (`result * result <= a`; `a` is unsigned)          |
| `int.cbrt a`            | Cube root of `a` (`result * result * result <= a`; `a` is unsigned)   |
| `int.bswap a`           | Byte-swap `a` (`0x12345678` becomes `0x78563412`)                     |
| `int.parity a`          | Returns 0 for even parity, 1 for odd                                  |
| `int.popcount a`        | Population count of `a` (i.e., count of number of bits set)           |
| `int.clz a`             | Count leading zeros of `a` (0-32)                                     |
| `int.ctz a`             | Count trailing zeros of `a` (0-32)                                    |
| `int.clrsb a`           | Count leading redundant sign bits of `a` (0-31)                       |
| `int.ffs a`             | Find first bit set, bits numbered starting at 1, 0 means no bits set  |
| `int.fls a`             | Find last bit set, bits numbered starting at 1, 0 means no bits set   |

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
