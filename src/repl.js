// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var fs = require('fs');
var path = require('path');
var readline = require('readline');
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
var line = 1;
var Sink = require('./sink');
Sink.repl(
	// prompt for new line, call `result` with the data
	function(levels, result){
		var p = ': ';
		if (levels > 0)
			p = (new Array(levels + 1)).join('..') + '. ';
		if (line < 10)
			p = ' ' + line + p;
		else
			p = line + p;
		rl.question(p, function(ans){
			line++;
			result(ans + '\n');
		});
	},
	// resolve `file` relative to `fromFile`, return the full file
	function(file, fromFile){
		return path.resolve(process.cwd(), fromFile == null ? '' : path.dirname(fromFile), file);
	},
	// return the contents of `file` (which is a full file from above)
	function(file){
		return new Promise(function(resolve, reject){
			fs.readFile(file, 'utf8', function(err, data){
				if (err)
					return reject(err);
				resolve(data);
			});
		});
	}
);
