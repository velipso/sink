Syntax Highlighter for CodeMirror
=================================

Sink syntax highlighter for the [CodeMirror](http://codemirror.net) editor.

Install Instructions
====================

After loading the CodeMirror code, include the `sink.js` file somehow on the page, for example:

```html
<script src="codemirror.js"></script>
<script src="sink.js"></script>
```

This will install the `'sink'` mode and the `'text/x-sink'` MIME.

To create a sink editor on a page, something like this will work:

```javascript
var myCodeMirror = CodeMirror(document.body, {
	value: 'say "hello, world"\n',
	mode: 'sink'
});
```
