
Range
=====

```
range 5     # {0, 1, 2, 3, 4}
range -1    # {}
range 3.4   # {0, 1, 2, 3}

range 2, 5    # {2, 3, 4}
range -1, 5   # {-1, 0, 1, 2, 3, 4}
range 1.5, 3  # {1.5, 2.5}

range 0, 10, 3       # {0, 3, 6, 9}
range -1, -2, -0.25  # {-1, -1.25, -1.5, -1.75}
range 0, 0.5, 0.1    # {0, 0.1, 0.2, 0.3, 0.4}
```

Note that special optimizations are performed when using `range` in a for loop, as long as 1-3
arguments are specified:

```
# temporary list not actually created because `range` is called with 1-3
# arguments:
var start = 10, stop = 10000, step = 0.001
for var v, i: range stop * 3  # does *not* create a list of 30000 items!
  say v, i
end

for var v, i: range start + 5, stop / 2
  say v, i
end

for var v, i: range start, stop, step * 3
  say v, i
end

# temporary list is created because the expression is too complicated:
for var v, i: 5 * range 5
  say v, i
end

for var v, i: (range 5) + (range 6)
  say v, i
end
```
