
Pickle Self-Refrencing
======================

Pickling lists is complicated because they can contain the same list multiple times, or even have
recursive lists:

```
var a = {'hello'}
var b = {a, a}
say b  # {{'hello'}, {'hello'}}

var c = {'world'}
list.push c, c
say c  # {{'world'}, {circular}}
```

List `a` is flat and doesn't contain duplicate references.

List `b` contains a sibling reference.  Sibling references are when there exists multiple
non-circular references to the same object.

Sibling references can be serialized using JSON, but upon deserializing, the fact that
`b[0] == b[1]` will be lost:

```
var b2 = b | pickle.json | pickle.val
say b[0] == b[1]    # 1 (true)
say b2[0] == b2[1]  # nil (false)
```

List `c` contains a circular reference -- this is when a list contains itself somewhere inside of
it.  Circular references cannot be serialized using JSON and will cause the sink script to abort in
failure.

The `pickle.sibling` and `pickle.circular` commands can test whether an object has sibling or
circular references.  To avoid this problem completely, it's recommended to use the binary format
(via `pickle.bin`) in lieu of the JSON format, since it correctly handles restoring references
(both sibling and circular).
