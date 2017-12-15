
Order
=====

The `order` command performs a deep comparison of two values.  This is used for sorting, but can
also be used for equality.

Sorting precedence:

1. Nil
2. Numbers (NaN, negative infinity to positive infinity)
3. Strings (byte-by-byte comparison; if equal, shorter strings first)
4. Lists (item by item comparison; if equal, shorter lists first)

```
order nil, 1            # => -1
order 55, 5             # =>  1
order 'a', 'ab'         # => -1
order {}, ''            # =>  1
order {1}, {1}          # =>  0
order num.nan, num.nan  # =>  0

list.sort {3, 2, nil, 4}   # => {nil, 2, 3, 4}
list.rsort {3, 2, nil, 4}  # => {4, 3, 2, nil}
```
