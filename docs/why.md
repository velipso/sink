
Why Another Language
====================

Why bother creating sink?

### It's Fun!

Creating languages is *fun*.  Once you know the different techniques that go into making a
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
  * Semantics is a mess

