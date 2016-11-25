
Why Another Language
====================

Why bother creating sink?

(Warning: Rant ahead)

### It's Fun!

Creating a language is *fun*.  Once you know the different techniques that go into making a
language (lexer, parser, code generator, virtual machine, garbage collector), it's pretty damn
fun to create new ones.

### Competition is Slim for Embeddable Languages

Most languages are created to solve every problem in the world, which causes the language to become
a beast in one form or another.

Languages designed for embedding into host programs are a little more slim:

1. [Lua](http://lua.org) - Overall excellent and one I've used quite a lot, but a few annoyances
  * Starts counting from one
  * Everything is a hash table
  * Variables can be used without declaring them
  * No `continue` statement
  * API is stack based
  * Syntax is sometimes a bit goofy for my taste
  * They keep adding more crap... I wish they would just stop
2. [Squirrel](http://squirrel-lang.org/) - Popular, haven't really used it
  * Object-oriented
  * Similar hash table to Lua
  * Very C++ like syntax
3. [Tcl](http://wiki.tcl.tk/) - Older popular embedding language
  * Syntax is a mess
  * Semantics are a mess

Surely someone could make a lot of complaints about sink too.  No language is perfect.

But sink was created to scratch my particular itch.

### Need JavaScript + C Implementation

Embedding languages typically think of JavaScript as an afterthought, perhaps accomplished via
Emscripten or a third-party port.

Having a JavaScript implementation is really nice because I can build web applications that use the
same language, with the same standard library.  That means I can create cross-platform tools for
creating resources for my games.

### Compile-Time Symbol Table

The idea that a simple variable lookup results in a hash table search is a bit sickening to me.

Sink's symbols (variables and commands) only exist at compile-time.  All name resolution happens at
compile-time.

Even native commands are stored as 64-bit hashes, so all symbols can be stripped out of the final
bytecode.

### No Feature Creep

The most annoying thing about other languages is that *they keep changing*.

Programming languages are foundational technology.  Adding a new feature *creates a new language*.
I really wish people would stop changing languages so much.

Once sink hits 1.0, I won't be changing it, with the exception of bug fixes and security issues.  If
I feel like creating a new language, I will do just that -- and leave sink alone.
