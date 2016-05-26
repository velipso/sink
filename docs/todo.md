
JavaScript
==========

* Handle a variety of functions returning a `Promise`
* Transpiler
* Command line stuff

C
==

* Compiler
* Transpiler
* Migrate `sink.c` from other projects for interpreter
* Command line stuff

Sink
====

Namespaces
----------

I think I'd like something like this:

```
namespace foo
	def bar a, b
		say 'hi', a, b
	end
end

foo.bar 1, 2   # => hi 1 2
```

Call?
-----

Should I have a `call` function?  Something like this?

```
def &foo a, b, c
	say a + b + c
end

var n = "foo"
call n, {1, 2, 3}  # => 6
```

Structures?
-----------

Should I have structures of some sort that overlay on top of lists?  Something like this?

```
struct foo: a, b, c

var x:foo = {1, 2, 3}
say x.a  # ==> 1
say x.b  # ==> 2
say x[0] # ==> 1
```

(Probably not but maybe something like this..?!)

Standard Library
----------------

Need to design split standard library into ops in the VM vs. native functions.

List, math, str, date, etc, stuff should be ops in the VM, and supported across all sink programs.

File system, operating system, process, network (?), etc, should be (optional) native functions.
