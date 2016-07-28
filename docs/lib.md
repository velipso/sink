
Standard Library
================

The standard library is available to all sink scripts, and is native to sink itself for basic
execution.  These functions are available in all host environments, and always produce the same
results.

| Function          | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `say a, ...`      | Output arguments to stdout (returns nil)                                    |
| `ask a, ...`      | Prompt the user for input from stdin; returns the inputted string           |
| `warn a, ...`     | Output arguments to stderr (returns nil)                                    |
| `die a, ...`      | Output arguments to stderr and stop all execution                           |
| `pick cond, a, b` | If `cond` is true, return `a`, otherwise return `b` (short-circuited)       |

Number
------

Number functions will operate on lists by performing the operation on each element, just like the
built-in unary and binary operators.

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
| `num.NaN`           | Not-a-number value                                                        |
| `num.isNaN a`       | Tests whether `a` is a NaN value                                          |
| `num.isFinite a`    | Tests whether `a` is a finite value (i.e., not NaN or infinite)           |
| `num.e`             | *e*  (2.718282...)                                                        |
| `num.pi`            | *pi* (3.141592...)                                                        |
| `num.tau`           | *tau* (2 * *pi* = 6.283185...)                                            |
| `num.sin a`         | Sine of `a` (radians)                                                     |
| `num.cos a`         | Cosine of `a` (radians)                                                   |
| `num.tan a`         | Tangent of `a` (radians)                                                  |
| `num.asin a`        | Arc-sine of `a`, returns radians                                          |
| `num.acos a`        | Arc-cosine of `a`, returns radians                                        |
| `num.atan a`        | Arc-tangent of `a`, returns radians                                       |
| `num.atan2 a, b`    | Arc-tangent of `a / b`, returns radians                                   |
| `num.log a`         | Natural log of `a`                                                        |
| `num.log2 a`        | Log base 2 of `a`                                                         |
| `num.log10 a`       | Log base 10 of `a`                                                        |
| `num.exp a`         | *e*<sup>`a`</sup>                                                         |
| `num.lerp a, b, t`  | Linear interpolation from `a` to `b`, by amount `t`                       |
| `num.hex a, b`      | Convert `a` to a hexadecimal string, 0-padded to length `b`               |
| `num.oct a, b`      | Convert `a` to an octal string, 0-padded to length `b`                    |
| `num.bin a, b`      | Convert `a` to a binary string, 0-padded to length `b`                    |

Integer
-------

Sink only operates on 64-bit floating point numbers, but it's possible to simulate operations on
signed 32-bit integers using the `int` namespace, with appropriate two's-complement wrapping.

Integer functions will operate on lists by performing the operation on each element, just like the
built-in unary and binary operators.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `int.cast a`   | Cast `a` to an integer                                                         |
| `int.not a`    | Bitwise NOT of `a`                                                             |
| `int.and a, b` | Bitwise AND between `a` and `b`                                                |
| `int.or a, b`  | Bitwise OR between `a` and `b`                                                 |
| `int.xor a, b` | Bitwise XOR between `a` and `b`                                                |
| `int.shl a, b` | Bit-shift left `a` by `b` bits                                                 |
| `int.shr a, b` | Bit-shift right `a` by `b` bits (zero-fill shift)                              |
| `int.sar a, b` | Bit-shift right `a` by `b` bits (sign-extended shift)                          |
| `int.add a, b` | `a + b`                                                                        |
| `int.sub a, b` | `a - b`                                                                        |
| `int.mul a, b` | `a * b`                                                                        |
| `int.div a, b` | `a / b`                                                                        |
| `int.mod a, b` | `a % b`                                                                        |
| `int.clz a`    | Count leading zeros                                                            |

Random
------

| Function          | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `rand.seed a`     | Set the seed of the RNG to `a` (interpreted as a 32-bit unsigned integer)   |
| `rand.seedauto`   | Set the seed of the RNG automatically (likely based on current time)        |
| `rand.int`        | Random 32-bit unsigned integer ranging [0, 2<sup>32</sup> - 1]              |
| `rand.num`        | Random number ranging [0, 1) (contains 52 bits of randomness)               |
| `rand.getstate`   | Returns an 8 byte string that is the entire RNG state                       |
| `rand.setstate a` | Restores a previous state (`a` should be an 8 byte string)                  |
| `rand.pick ls`    | Pick a random item out of the list `ls`                                     |
| `rand.shuffle ls` | Shuffle the contents of list `ls` in place                                  |

The random number generator is the same on all host environments, defined below.  It is fast,
simple, and
[passes many statistical tests](https://gist.github.com/voidqk/d112165a26b45244a65298933c0349a4).
On startup, it is automatically seeded via `rand.seedauto`.

```c
// RNG has 64-bit state
static uint32_t seed, i;

void rand_seed(uint32_t s){
  seed = s;
  i = 0;
}

uint32_t rand_int(){
  const uint32_t m = 0x5bd1e995;
  const uint32_t k = i++ * m;
  seed = (k ^ (k >> 24) ^ (seed * m)) * m;
  return seed ^ (seed >> 13);
}

double rand_num(){
  uint64_t M1 = rand_int();
  uint64_t M2 = rand_int();
  uint64_t M = (M1 << 20) | (M2 >> 12); // 52 bit random number
  const union { uint64_t i; double d; } u = {
    .i = UINT64_C(0x3FF) << 52 | M
  };
  return u.d - 1.0;
}

void rand_getstate(uint8_t *state){
  state[0] =  seed        % 256;
  state[1] = (seed >>  8) % 256;
  state[2] = (seed >> 16) % 256;
  state[3] = (seed >> 24) % 256;
  state[4] =  i           % 256;
  state[5] = (i    >>  8) % 256;
  state[6] = (i    >> 16) % 256;
  state[7] = (i    >> 24) % 256;
}

void rand_setstate(uint8_t *state){
  seed =
     state[0]        |
    (state[1] <<  8) |
    (state[2] << 16) |
    (state[3] << 24);
  i =
     state[4]        |
    (state[5] <<  8) |
    (state[6] << 16) |
    (state[7] << 24);
}
```

String
------

Strings are 8-bit clean, and interpreted as binary data.  In cases where character meaning matters
(for example, `str.lower`), the algorithms interpret bytes 0-127 as defined by Unicode codepage 0,
and ignore bytes 128-255.

| Function              | Description                                                             |
|-----------------------|-------------------------------------------------------------------------|
| `str.new a, b`        | Create a new string by repeating string `a` `b` times                   |
| `str.split a, b`      | Split `a` into an array of strings based on separator `b`               |
| `str.replace a, b, c` | Replace all occurrences of `b` in string `a` with `c`                   |
| `str.startsWith a, b` | True if string `a` starts with string `b`; false otherwise              |
| `str.endsWith a, b`   | True if string `a` ends with string `b`; false otherwise                |
| `str.pad a, b`        | Pads string `a` with space until it is length `b` (`-b` to pad left)    |
| `str.find a, b, c`    | Find `b` in string `a` starting at `c`; returns nil if not found        |
| `str.findRev a, b, c` | Find `b` in string `a` starting at `c` and searching in reverse         |
| `str.lower a`         | Convert `a` to lowercase, ignoring bytes >= 128                         |
| `str.upper a`         | Convert `a` to uppercase, ignoring bytes >= 128                         |
| `str.trim a`          | Trim surrounding whitespace from `a`; bytes >= 128 considered non-white |
| `str.rev a`           | Reverse `a`                                                             |
| `str.list a`          | Convert a string to a list of bytes                                     |
| `str.byte a, b`       | Unsigned byte from string `a` at index `b` (nil if out of range)        |

UTF-8
-----

The `utf8` library operates on strings (bytes), and only provides some basic functions for encoding
and decoding.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `utf8.valid a` | Checks whether `a` is valid UTF-8 (`a` is string or list of codepoints)        |
| `utf8.list a`  | Converts string `a` (UTF-8 bytes) to a list of codepoints (integers)           |
| `utf8.str a`   | Converts a list of codepoints (integers) `a` to a string (UTF-8 bytes)         |

Structured Data
---------------

| Function             | Description                                                              |
|----------------------|--------------------------------------------------------------------------|
| `struct.size tpl`    | Calculate the length of string the template specifies (nil for invalid)  |
| `struct.str ls, tpl` | Convert data in list `ls` to a string using `tpl` as the template        |
| `struct.list a, tpl` | Convert string `a` to a list of data using `tpl` as the template         |

### Structure Templates

Template strings are case-insensitive, ignore whitespace, and can have the following pieces:

| Code     | Size | Signed?  | Endian | C Type     |
|----------|------|----------|--------|------------|
| `'U8'`   |    1 | Unsigned | N/A    | `uint8_t`  |
| `'S8'`   |    1 | Signed   | N/A    | `int16_t`  |
| `'U16'`  |    2 | Unsigned | Native | `uint16_t` |
| `'S16'`  |    2 | Signed   | Native | `int16_t`  |
| `'UL16'` |    2 | Unsigned | Little | `uint16_t` |
| `'SL16'` |    2 | Signed   | Little | `int16_t`  |
| `'UB16'` |    2 | Unsigned | Big    | `uint16_t` |
| `'SB16'` |    2 | Signed   | Big    | `int16_t`  |
| `'U32'`  |    4 | Unsigned | Native | `uint32_t` |
| `'S32'`  |    4 | Signed   | Native | `int32_t`  |
| `'UL32'` |    4 | Unsigned | Little | `uint32_t` |
| `'SL32'` |    4 | Signed   | Little | `int32_t`  |
| `'UB32'` |    4 | Unsigned | Big    | `uint32_t` |
| `'SB32'` |    4 | Signed   | Big    | `int32_t`  |
| `'F32'`  |    4 | N/A      | Native | `float`    |
| `'F64'`  |    8 | N/A      | Native | `double`   |
| `'FL32'` |    4 | N/A      | Little | `float`    |
| `'FL64'` |    8 | N/A      | Little | `double`   |
| `'FB32'` |    4 | N/A      | Big    | `float`    |
| `'FB64'` |    8 | N/A      | Big    | `double`   |

```
struct.str {0x41, 0x42}, 'U8 U8'  # => 'AB'
struct.list 'AAAB', 'UL32'        # => { 0x42414141 }
struct.list 'AAAB', 'UB32'        # => { 0x41414142 }
struct.size 'F32 U8 S16'          # => 56
struct.size 'hello'               # => () because template is invalid
```

List
----

| Function                | Description                                                           |
|-------------------------|-----------------------------------------------------------------------|
| `list.new a, b`         | Create a new list of size `a`, with each element set to `b`           |
| `list.empty ls`         | Empty list `ls`                                                       |
| `list.find ls, a, b`    | Find `a` in list `ls` starting at `b`; returns nil if not found       |
| `list.findRev ls, a, b` | Find `a` in list `ls` starting at `b` and searching in reverse        |
| `list.join ls, a`       | Convert list `ls` to a string by joining elements with string `a`     |
| `list.rev ls`           | Reverse list `ls`; returns `ls`                                       |
| `list.str ls`           | Convert a list of bytes to a string                                   |
| `list.sort ls`          | Sorts the list `ls` in place, and returns the list                    |
| `list.sortRev ls`       | Reverse sorts the list `ls` in place, and returns the list            |
| `list.sortCmp a, b`     | Compare `a` with `b` according to the sorting precedence (-1, 0, 1)   |

### Sorting

Sorting precedence:

1. Nil
2. Numbers (negative infinity to positive infinity)
3. Strings (byte-by-byte comparison; if equal, shorter strings first)
4. Lists (item by item comparison; if equal, shorter lists first)

```
list.sortCmp (), 1      # => -1
list.sortCmp 55, 5      # =>  1
list.sortCmp 'a', 'ab'  # => -1
list.sortCmp {}, ''     # =>  1
list.sortCmp {1}, {1}   # =>  0

list.sort {3, 2, (), 4}     # => {(), 2, 3, 4}
list.sortRev {3, 2, (), 4}  # => {4, 3, 2, ()}
```

JSON
----

The JSON library is not general purpose, and specifically works on a subset of JSON that only allows
numbers, strings, null, and lists -- which means it can convert losslessly between JSON and sink
values.

| Function       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `json.valid a` | Checks whether `a` is a valid JSON string that can be converted to sink        |
| `json.str a`   | Converts any sink value `a` to a JSON string                                   |
| `json.val a`   | Converts a JSON string `a` to a sink value                                     |

```
json.str [1, ()]   # => '[1,null]'
json.valid 'true'  # => nil even though this is valid JSON -- it cannot be converted to sink
json.valid 'null'  # => 1, it is valid JSON, and can be converted to sink
```
