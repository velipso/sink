// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var readline = require('readline');
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
var Sink = require('./sink');
var c = Sink.repl();
var line = 1;

function nextLine(levels){
	var p = ': ';
	if (levels > 0)
		p = (new Array(levels + 2)).join('..') + ' ';
	if (line < 10)
		p = ' ' + line + p;
	else
		p = line + p;
	rl.question(p, function(ans){
		var res = c.add(ans + '\n');
		if (res !== false)
			console.log('Error:', res);
		line++;
		nextLine(c.level());
	});
}
nextLine(0);
