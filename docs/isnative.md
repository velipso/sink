
isnative
========

You can use `isnative` to test for command implementation in the host environment.

For example:

```
declare circle 'company.product.shape.circle'

if isnative circle
  # save to use circle
  var c = circle 0, 0, 50
  #...
else
  # can't use circle, maybe use something else
end
```

This might be useful for detecting if certain features are available without aborting the script.
