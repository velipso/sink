
How to Release
--------------

Build everything and make sure it passes all tests.

`./build dist`

Edit `./dist/README.md` and change warning at the top to say:

"Official v1.2.3.4 Release." (or something)

Commit all changes.

`git tag 1.2.3.4`

`git push`

`git push 1.2.3.4`
