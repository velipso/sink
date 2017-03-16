
Pickle Binary Format
====================

The pickle binary format is specified explicitly and can be used for interchange with programs that
support the format.

Variable length integers (V-Int) are used multiple times in the format.  They can either represent a
value from 0 to 127 using one byte (with the most significant bit cleared), or 0 to
2<sup>31</sup> - 1 using four bytes (little-endian encoded, with the most significant bit set on the
first byte).  This is the basis for the hard limits of the format.

| Value(s)                                    | Description                                     |
|---------------------------------------------|-------------------------------------------------|
| `0xxxxxxx`                                  | 7-bit V-Int for values 0 to 127                 |
| `1xxxxxxx` `xxxxxxxx` `xxxxxxxx` `xxxxxxxx` | 31-bit V-Int for values 0 to 2<sup>31</sup> - 1 |

The format has the following basic sequence:

| Value  | Description                                                              |
|--------|--------------------------------------------------------------------------|
| `0x01` | A single non-printable byte at the start to distinguish from JSON format |
| V-Int  | Number of strings in the string table                                    |
|        | (For each string...)                                                     |
| V-Int  | Number of bytes in the string                                            |
| Bytes  | Raw bytes of the string                                                  |
|        | (...end string table)                                                    |
| S-Val  | The pickled sink value, described below                                  |

A sink value (S-Val) can be one of the four basic sink types:

### `0xF0` Nil

| Value  | Description                     |
|--------|---------------------------------|
| `0xF0` | A single byte to indicate `nil` |

### `0xF1` Positive 8-bit Number (0 to 255)

| Value  | Description                                       |
|--------|---------------------------------------------------|
| `0xF1` | A single byte to indicate a positive 8-bit number |
| Number | The number (1 byte)                               |

### `0xF2` Negative 8-bit Number (-256 to -1)

| Value  | Description                                       |
|--------|---------------------------------------------------|
| `0xF2` | A single byte to indicate a negative 8-bit number |
| Number | The number + 256 (1 byte)                         |

### `0xF3` Positive 16-bit Number (0 to 65535)

| Value  | Description                                        |
|--------|----------------------------------------------------|
| `0xF3` | A single byte to indicate a positive 16-bit number |
| Number | The number in little-endian (2 bytes)              |

### `0xF4` Negative 16-bit Number (-65536 to -1)

| Value  | Description                                        |
|--------|----------------------------------------------------|
| `0xF4` | A single byte to indicate a negative 16-bit number |
| Number | The number + 65536 in little-endian (2 bytes)      |

### `0xF5` Positive 32-bit Number (0 to 4294967295)

| Value  | Description                                        |
|--------|----------------------------------------------------|
| `0xF1` | A single byte to indicate a positive 32-bit number |
| Number | The number (4 bytes)                               |

### `0xF6` Negative 32-bit Number (-4294967296 to -1)

| Value  | Description                                        |
|--------|----------------------------------------------------|
| `0xF2` | A single byte to indicate a negative 8-bit number  |
| Number | The number + 4294967296 in little-endian (4 bytes) |

### `0xF7` 64-bit Floating-point Number

| Value   | Description                                        |
|---------|----------------------------------------------------|
| `0xF7`  | A single byte to indicate a number                 |
| Number  | The raw 64-bit `double` in little-endian (8 bytes) |

### `0xF8` String

| Value   | Description                            |
|---------|----------------------------------------|
| `0xF8`  | A single byte to indicate a string     |
| V-Int   | String table index                     |

### `0xF9` New List

Lists are the only compound type.  Each new list is assigned an index internally, starting with 0
and increasing by 1, in case it must be referenced later.

| Value  | Description                                                        |
|--------|--------------------------------------------------------------------|
| `0xF9` | A single byte to begin new list and assign it an internal index    |
| V-Int  | Number of values in the list                                       |
| S-Val* | An S-Val for each of the values in the list                        |

### `0xFA` Referenced List

Sibling or circular references are handled by referencing a previously provided new list, using its
internal index.

| Value  | Description                                          |
|--------|------------------------------------------------------|
| `0xFA` | A single byte to indicate a previously provided list |
| V-Int  | The internal index of the list                       |

## Examples

Encoding `nil`:

```
0x01   Header
0x00   String table size
0xF0   Nil
```

Encoding a list of strings `{'a', {0}, 'abcd', 'a'}`:

```
0x01   Header
0x02   String table size
0x01   String[0] length
0x61   'a'
0x04   String[1] length
0x61   'a'
0x62   'b'
0x63   'c'
0x64   'd'
0xF9   New list (index 0)
0x04   List size (index 0)
0xF8   String
0x00   String[0]
0xF9   New list (index 1)
0x01   List size (index 1)
0xF1   Positive 8-bit number
0x00   Zero
0xF8   String
0x01   String[1]
0xF8   String
0x00   String[0]
```

Encoding of circular list `var a = {{}}; list.push a, a`:

```
0x01   Header
0x00   String table size
0xF9   New list (index 0)
0x02   List size (index 0)
0xF9   New list (index 1)
0x00   List size (index 1)
0xFA   Reference list
0x00   Index 0
```
