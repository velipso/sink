
Pickle Binary Format
====================

The pickle binary format is specified explicitly and can be used for interchange with programs that
support the format.

Variable length integers (V-Int) are used multiple times in the format.  They can either represent a
value from 0 to 127 using one byte (with the most significant byte cleared), or 0 to
2<sup>31</sup> - 1 using four bytes (little-endian encoded, with the most significant bit set on the
first byte).  This is the basis for the hard limits of the format.

| Value(s)                                    | Description                                     |
|---------------------------------------------|-------------------------------------------------|
| `0xxxxxxx`                                  | 7-bit V-Int for values 0 to 127                 |
| `1xxxxxxx` `xxxxxxxx` `xxxxxxxx` `xxxxxxxx` | 31-bit V-Int for values 0 to 2<sup>31</sup> - 1 |

The format has the following basic sequence:

| Value  | Description                                                            |
|--------|------------------------------------------------------------------------|
| `0x01` | Single non-printable byte at the start to distinguish from JSON format |
| V-Int  | Number of strings in the string table                                  |
|        | (For each string...)                                                   |
| V-Int  | Number of bytes in the string                                          |
| Bytes  | Raw bytes of the string                                                |
|        | (...end string table)                                                  |
| S-Val  | Single sink value, described below                                     |

A sink value (S-Val) can be one of the four basic sink types:

### Nil

| Value  | Description                     |
|--------|---------------------------------|
| `0xF0` | A single byte to indicate `nil` |

### Number

| Value   | Description                                    |
|---------|------------------------------------------------|
| `0xF1`  | A single byte to indicate a number             |
| 8 bytes | 64-bit `double` raw bytes, little-endian       |

### String

| Value   | Description                            |
|---------|----------------------------------------|
| `0xF2`  | A single byte to indicate a string     |
| V-Int   | String table index                     |

### New List

Lists are the only compound type.  Each new list is assigned an index internally, starting with 0
and increasing by 1, in case it must be referenced later.

| Value  | Description                                                        |
|--------|--------------------------------------------------------------------|
| `0xF3` | A single byte to begin new list and assign it an internal index    |
| S-Val* | Variable number of S-Val's to be pushed on the end of the new list |
| `0xF4` | A single byte to end the list                                      |

### Referenced List

Circular references are handled by referencing a previously provided new list, using its internal
index.  Note that referenced lists are not indexed since it's unnecessary.

| Value  | Description                                          |
|--------|------------------------------------------------------|
| `0xF5` | A single byte to indicate a previously provided list |
| V-Int  | The internal index of the list                       |

## Examples

Encoding `nil`:

```
0x01   Header
0x00   String table size
0xF0   Nil
```

Encoding a list of strings `{'a', 'abcd', 'a'}`:

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
0xF3   New list (index 0)
0xF2   String
0x00   String[0]
0xF2   String
0x01   String[1]
0xF2   String
0x00   String[0]
0xF4   End of list (index 0)
```

Encoding of circular list `var a = {{}}; list.push a, a`:

```
0x01   Header
0x00   String table size
0xF3   New list (index 0)
0xF3   New list (index 1)
0xF4   End of list (index 1)
0xF5   Reference list
0x00   Index 0
0xF4   End of list (index 0)
```
