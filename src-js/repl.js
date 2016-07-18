// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var readline = require('readline');
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
var Compiler = require('./compiler');
var c = Compiler(true);
c.pushFile(null);

function nextLine(levels){
	var p = '> ';
	if (levels > 0)
		p = (new Array(levels + 2)).join('..') + ' ';
	rl.question(p, function(ans){
		var res = c.add(ans + '\n');
		if (res.type == 'error'){
			console.log('Error: ' + res.msg);
			res = c.reset();
		}
		nextLine(res.levels);
	});
}
nextLine(0);
